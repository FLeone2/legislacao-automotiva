import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, expect
from browser_support import open_preferences, TestServer, launch_options

ROOT = Path(__file__).resolve().parents[1]


async def main(base):
    async with async_playwright() as p:
        b = await p.chromium.launch(**launch_options())
        page = await b.new_page(
            viewport={"width": 1440, "height": 1000}, reduced_motion="reduce"
        )
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(
            base + "#vehicle?focus=motor&type=Comercial+leve&powertrain=El%C3%A9trico"
        )
        await page.locator(".aurora-explorer").wait_for()
        await expect(page.locator("#vehicleType")).to_have_value("Comercial leve")
        await expect(page.locator("#powertrain")).to_have_value("Elétrico")
        await page.reload()
        await expect(page.locator("#vehicleType")).to_have_value("Comercial leve")
        await expect(page.locator("#powertrain")).to_have_value("Elétrico")
        await page.goto(base + "#vehicle")
        await page.locator(".aurora-explorer").wait_for()
        assert (
            await page.locator(".aurora-explorer h2").inner_text()
            == "Bancos e ocupantes"
        )
        assert (
            await page.locator("#vehicleDrawing .aurora-selected").first.get_attribute(
                "data-component-link"
            )
            == "bancos"
        )
        await page.locator("[data-vehicle-zoom=in]").click()
        assert await page.locator("#vehicleImageZoom").inner_text() == "120%"
        await page.locator("[data-vehicle-zoom=reset]").click()
        # The wheel's exported interior point follows the rendered SVG transform.
        point = await page.locator("#vehicleDrawing").evaluate(
            """svg=>{
                const part=VehicleVector.parts.find(part=>part.id==='peca_34_roda_dianteira');
                const path=svg.querySelector('#'+part.contourId);
                const p=svg.createSVGPoint();[p.x,p.y]=part.testPoint;
                const t=p.matrixTransform(path.getScreenCTM());
                return{x:t.x,y:t.y};
            }"""
        )
        await page.mouse.click(**point)
        await expect(page.locator(".aurora-explorer h2")).to_have_text("Pneus e rodas")
        assert (
            await page.locator("#vehicleDrawing .aurora-selected").first.get_attribute(
                "data-component-link"
            )
            == "pneus-rodas"
        )
        await page.locator(".aurora-directory header>a").click()
        await expect(page.locator(".aurora-system-card")).to_have_count(14)
        systems = await page.locator(".aurora-system-card").evaluate_all(
            "(els)=>els.map(e=>e.href)"
        )
        for url in systems:
            await page.goto(url)
            await page.locator(".aurora-explorer h2").wait_for()
            await expect(page.locator(".aurora-primary")).to_have_attribute(
                "href", __import__("re").compile("component=")
            )
            assert await page.locator(".aurora-subsystem").count() > 0, url
        await page.goto(base + "#vehicle?focus=bancos")
        await page.locator(".aurora-subsystem").first.click()
        await page.locator(".component-graph").wait_for()
        assert "subsystem=ocupantes%2Fcintos" in page.url
        await page.goto(base + "#vehicle?focus=bancos")
        await page.locator(".aurora-primary").click()
        await page.locator(".component-graph").wait_for()
        for route, ready in [
            ("flow", ".homologation-step"),
            ("library", ".document"),
            ("contran", ".contran-record"),
            ("proconve", ".contran-record"),
            ("inmetro", ".contran-record"),
            ("anatel", ".contran-record"),
            ("markings", "#markings-vin"),
            ("mover", ".graph-node"),
            ("updates", ".update-card"),
        ]:
            await page.goto(base + "#" + route)
            await page.locator(ready).first.wait_for()
            assert not await page.evaluate(
                "document.documentElement.scrollWidth>innerWidth"
            ), route
        await page.goto(base + "#vehicle")
        await page.locator(".aurora-explorer").wait_for()
        await expect(page.locator("html")).to_have_attribute("data-theme", "dark")
        await open_preferences(page)
        await expect(page.get_by_label("Tema", exact=True)).to_be_visible()
        await page.locator("#navigationToggle").click()
        await page.locator("#searchTrigger").click()
        await page.locator("#globalSearch").fill("951")
        await page.locator("#searchAllResults").click()
        await page.locator(".document").first.wait_for()
        assert "951" in await page.locator("#main").inner_text()
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(base + "#vehicle")
        await page.locator(".aurora-explorer").wait_for()
        assert not await page.evaluate(
            "document.documentElement.scrollWidth>innerWidth"
        )
        await page.locator("#navigationToggle").click()
        await page.locator("[data-nav=flow]").click()
        await page.locator(".homologation-step").first.wait_for()
        assert (
            await page.locator("#navigationToggle").get_attribute("aria-expanded")
            == "false"
        )
        await page.goto(base + "#vehicle")
        await page.locator(".aurora-system-card").first.focus()
        await page.keyboard.press("Enter")
        await expect(page.locator(".aurora-explorer h2")).to_have_text(
            "Motor e transmissão"
        )
        await page.screenshot(
            path=str(ROOT / "tests/artifacts/aurora-mobile.png"), full_page=True
        )
        assert not errors, errors
        await b.close()
    print(
        "PASS: wheel click, zoom, 14 systems, subsystems, real references, original route screens, search, glass controls, keyboard/mobile, no JavaScript errors."
    )


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(main(base))
