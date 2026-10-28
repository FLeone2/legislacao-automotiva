import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import launch_options, reference_vehicle_url

BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"
OUT = Path(__file__).parent / "artifacts"
OUT.mkdir(exist_ok=True)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1440, "height": 1100}, reduced_motion="reduce"
        )
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(reference_vehicle_url(BASE + "#vehicle"))
        await page.locator("#vehicleDrawing").wait_for()
        cases = await page.evaluate(
            """()=>catalog.metadata.hierarchy.filter(g=>g.physical).flatMap(g=>g.children.map(s=>{const c=vehicleComponents.find(c=>ComponentFlow.subsystems(c,catalog.metadata.hierarchy).some(x=>x.id===s.id));return {component:c.id,id:s.id,label:s.label,asset:ComponentFlow.art({...s,system:g.id},catalog.metadata.hierarchy).asset}}))"""
        )
        assert len(cases) == 30
        for asset in set(c["asset"] for c in cases):
            response = await page.request.get(BASE + asset)
            assert response.status == 200, (asset, response.status)
            assert response.headers.get("content-type", "").startswith("image/"), asset
        for case in cases:
            await page.goto(
                reference_vehicle_url(
                    BASE
                    + "#vehicle?component="
                    + case["component"]
                    + "&subsystem="
                    + case["id"]
                )
            )
            await page.locator(".component-graph").wait_for()
            assert await page.locator("#main h1").inner_text() == case["label"], case
            assert (
                await page.locator(".subsystem-card.active").get_attribute(
                    "data-subsystem-link"
                )
                == case["id"]
            )
            actual = await page.evaluate(
                "treeModels.vehicle.nodes[treeUI.vehicle.selected].recordIds"
            )
            expected = await page.evaluate(
                """()=>{const c=ComponentFlow.component(vehicleUI.component),s=ComponentFlow.subsystems(c,catalog.metadata.hierarchy).find(s=>s.id===vehicleUI.subsystem);return ComponentFlow.records(ComponentFlow.subsystemLanes(c,s)[0].topics[0],catalog.records).map(r=>r.id)}"""
            )
            assert actual == expected, (case, actual, expected)
        # Real region click and return, preserving selected subsystem through refresh.
        await page.goto(reference_vehicle_url(BASE + "#vehicle?component=freios"))
        await page.locator(".subsystem-board").wait_for()
        board = page.locator(".subsystem-board")
        await board.scroll_into_view_if_needed()
        xy = await board.evaluate(
            "(s)=>{let p=s.createSVGPoint();p.x=768;p.y=512;let a=p.matrixTransform(s.getScreenCTM());return {x:a.x,y:a.y}}"
        )
        await page.mouse.click(**xy)
        await page.locator(".component-graph").wait_for()
        assert "subsystem=freios%2Festabilidade" in page.url
        await page.reload()
        await page.locator(".component-graph").wait_for()
        assert await page.locator("#main h1").inner_text() == "Controle de estabilidade"
        await page.screenshot(
            path=str(OUT / "subsistema-estabilidade.png"), full_page=True
        )
        await page.locator(".subsystem-parent").click()
        await page.locator(".subsystem-board").wait_for()
        assert "subsystem=" not in page.url
        await page.screenshot(
            path=str(OUT / "sistema-freios-completo.png"), full_page=True
        )
        # All four occupant-protection subsystems are separate graphical entries.
        await page.goto(reference_vehicle_url(BASE + "#vehicle?component=bancos"))
        await page.locator(".subsystem-board").wait_for()
        assert await page.locator(".subsystem-card").count() == 4
        await page.locator(
            '.subsystem-card[data-subsystem-link="ocupantes/airbag"]'
        ).focus()
        await page.keyboard.press("Enter")
        await page.locator(".component-graph").wait_for()
        assert await page.locator("#main h1").inner_text() == "Airbags"
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.screenshot(
            path=str(OUT / "subsistema-airbag-mobile.png"), full_page=True
        )
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.locator(".subsystem-explorer summary").click()
        await page.locator(
            '.subsystem-card[data-subsystem-link="ocupantes/criancas"]'
        ).click()
        await page.locator(".component-graph").wait_for()
        assert await page.locator("#main h1").inner_text() == "Retenção infantil"
        assert not errors, errors
        print(
            "PASS: all 30 subsystems across 11 physical systems, every referenced illustration, exact reference IDs, actual SVG subsystem click, reload/return, keyboard and mobile. No JavaScript errors."
        )
        await browser.close()


asyncio.run(main())
