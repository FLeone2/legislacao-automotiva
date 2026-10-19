import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import TestServer, launch_options

ARTIFACTS = Path(__file__).resolve().parent / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)


async def point(page, xy):
    return await page.locator("#vehicleDrawing").evaluate(
        '(svg,p)=>{const pt=svg.createSVGPoint();pt.x=p[0];pt.y=p[1];const s=pt.matrixTransform(svg.querySelector("#vehicleLayer").getScreenCTM());return {x:s.x,y:s.y}}',
        list(xy),
    )


async def overview(page):
    await page.goto(BASE + "#vehicle?all=1")
    await page.locator("#vehicleDrawing").wait_for()
    await page.evaluate("document.fonts.ready")
    await page.wait_for_timeout(150)


async def flow(page):
    # The approved Aurora overview selects a system before opening its flow.
    if "component=" not in page.url:
        await page.wait_for_function("""()=>{
            const q=new URLSearchParams(location.hash.split('?')[1]||'');
            const expected=ComponentFlow.component(q.get('focus')||'bancos');
            return !document.documentElement.classList.contains('transitioning') &&
              document.querySelector('.aurora-explorer h2')?.textContent===expected?.label;
        }""")
        await page.locator(".aurora-primary").click()
    await page.locator(".component-graph").wait_for()
    await page.wait_for_timeout(300)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1440, "height": 1100}, reduced_motion="reduce"
        )
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await overview(page)
        points = await page.evaluate("""()=>Object.fromEntries(
            vehicleComponents.filter(c=>c.mapParts.length).map(c=>[c.id,c.mapParts[0].testPoint])
        )""")
        assert await page.locator(".aurora-system-card").count() == 14
        # Hit-testing actual transformed SVG geometry: each physical point must land on its own region.
        for name, xy in points.items():
            pos = await point(page, xy)
            actual = await page.evaluate(
                '(p)=>document.elementFromPoint(p.x,p.y)?.closest("[data-component-link]")?.dataset.componentLink',
                pos,
            )
            assert actual == name, (name, actual)
        # Both supplied wheel silhouettes are interactive; nearby blank canvas is not.
        rear_wheel = await page.evaluate(
            'VehicleVector.parts.find(p=>p.id==="peca_36_roda_traseira").testPoint'
        )
        wheel_samples = [
            (points["pneus-rodas"], True),
            (rear_wheel, True),
            ((20, 800), False),
            ((200, 980), False),
            ((1480, 980), False),
        ]

        async def wheel_boundaries(samples):
            for xy, inside in samples:
                pos = await point(page, xy)
                actual = await page.evaluate(
                    '(p)=>document.elementFromPoint(p.x,p.y)?.closest("[data-component-link]")?.dataset.componentLink',
                    pos,
                )
                assert (actual == "pneus-rodas") == inside, (xy, inside, actual)

        await wheel_boundaries(wheel_samples)
        pseat = await point(page, points["bancos"])
        await page.mouse.move(**pseat)
        assert "Banco" in await page.locator("#componentHover").inner_text()
        await page.locator('[data-vehicle-zoom="in"]').click()
        assert await page.locator("#vehicleImageZoom").inner_text() == "120%"
        pseat = await point(page, points["bancos"])
        assert (
            await page.evaluate(
                '(p)=>document.elementFromPoint(p.x,p.y)?.closest("[data-component-link]")?.dataset.componentLink',
                pseat,
            )
            == "bancos"
        )
        await page.locator('[data-vehicle-zoom="reset"]').click()
        assert await page.locator("#vehicleImageZoom").inner_text() == "100%"
        await page.mouse.move(0, 0)
        await page.screenshot(
            path=str(ARTIFACTS / "veiculo-desktop.png"), full_page=True
        )
        pseat = await point(page, points["bancos"])
        await page.mouse.click(**pseat)
        await flow(page)
        assert await page.locator("#main h1").inner_text() == "Banco traseiro"
        assert "part=peca_08_banco_traseiro" in page.url
        assert (
            await page.locator('[data-tree-node$=":record:senatran-118"]').count() == 0
        )
        assert (
            await page.locator(
                '[data-tree-node="component:bancos:seguranca:component:bancos-ancoragem:record:senatran-061"]'
            ).count()
            == 1
        )
        await page.locator(
            '[data-tree-node="component:bancos:seguranca:component:materiais"]'
        ).click()
        await flow(page)
        assert (
            "NBR" in await page.locator("#aiPanel").inner_text()
            or await page.locator('[data-tree-node$=":gap:0"]').count() == 1
        )
        await page.locator(
            '[data-tree-node="component:bancos:seguranca:component:materiais:gap:0"]'
        ).click()
        assert "NBR" in await page.locator("#aiPanel").inner_text()
        assert await page.locator("#aiPanel .tree-doc").count() == 0
        await page.locator(
            '[data-tree-node="component:bancos:seguranca:component:materiais:record:senatran-092"]'
        ).click()
        await page.locator("#aiPanel .tree-detail-footer [data-open]").click()
        await page.locator("#normDialog").wait_for()
        assert await page.locator("#normDialog").is_visible()
        await page.locator("#closeDialog").click()
        await page.locator(
            '[data-tree-node="component:bancos:seguranca:component:bancos-ancoragem"]'
        ).click()
        await flow(page)
        await page.screenshot(
            path=str(ARTIFACTS / "bancos-fluxograma.png"), full_page=True
        )
        # URL preserves branch/node and context on reload and across navigation.
        saved = page.url
        await page.reload()
        await flow(page)
        assert page.url == saved
        await page.locator("[data-vehicle-back]").click()
        await page.locator("#vehicleDrawing").wait_for()
        await page.go_back()
        await flow(page)
        assert "component=bancos" in page.url
        await overview(page)
        await page.locator('.aurora-system-card[data-aurora-component="motor"]').click()
        await flow(page)
        assert await page.locator(".component-lanes a").count() == 2
        await page.locator(".component-lanes a", has_text="Ambiental").click()
        await flow(page)
        assert (
            "Ambiental" in await page.locator(".component-lanes .active").inner_text()
        )
        assert (
            await page.locator(
                '[data-tree-node="component:motor:ambiental:gases:record:ibama-042"]'
            ).count()
            == 1
        )
        await page.screenshot(
            path=str(ARTIFACTS / "motor-ambiental.png"), full_page=True
        )
        await page.locator(".component-lanes a", has_text="Segurança").click()
        await flow(page)
        assert (
            await page.locator('[data-tree-node$=":record:inmetro-045"]').count() == 1
        )
        await overview(page)
        tank = await point(page, points["tanque"])
        await page.mouse.click(**tank)
        await flow(page)
        assert (
            await page.locator("#main h1").inner_text()
            == "Tanque e tubo de combustível"
        )
        await page.locator(
            '[data-tree-node="component:tanque:seguranca:component:tanques-multiplos"]'
        ).click()
        await flow(page)
        assert (
            await page.locator('[data-tree-node$=":record:senatran-118"]').count() == 1
        )
        await page.locator(".component-lanes a", has_text="Ambiental").click()
        await flow(page)
        assert await page.locator('[data-tree-node$=":record:ibama-020"]').count() == 1
        assert await page.locator('[data-tree-node$=":record:ibama-031"]').count() == 0
        await page.locator(
            '.node-main[data-tree-node="component:tanque:ambiental:vehicle:evaporativas-reabastecimento"]'
        ).click()
        assert await page.locator("#aiPanel .tree-doc").count() == 2
        # Graph zoom is independent of hero image; reset and fit are usable.
        art = await page.locator(".component-hero-art").evaluate(
            "(e)=>({width:e.offsetWidth,height:e.offsetHeight})"
        )
        await page.locator('[data-graph-action="in"]').click()
        assert (
            await page.locator(".component-hero-art").evaluate(
                "(e)=>({width:e.offsetWidth,height:e.offsetHeight})"
            )
            == art
        )
        await page.locator('[data-graph-action="fit"]').click()
        await page.locator('[data-graph-action="reset"]').click()
        for component in points:
            await page.goto(BASE + "#vehicle?component=" + component)
            await flow(page)
            assert await page.locator("#main h1").inner_text()
        # Keyboard alternative and real clicks on mobile (no document overflow).
        await page.set_viewport_size({"width": 390, "height": 844})
        await overview(page)
        await wheel_boundaries(wheel_samples)
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.screenshot(
            path=str(ARTIFACTS / "veiculo-mobile.png"), full_page=True
        )
        seat = await point(page, points["bancos"])
        await page.mouse.click(**seat)
        await flow(page)
        assert await page.locator("#main h1").inner_text() == "Banco traseiro"
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.screenshot(path=str(ARTIFACTS / "bancos-mobile.png"), full_page=True)
        await overview(page)
        link = page.locator('.aurora-system-card[data-aurora-component="motor"]')
        await link.focus()
        await page.keyboard.press("Enter")
        await flow(page)
        assert "Motor" in await page.locator("#main h1").inner_text()
        await page.locator(".component-lanes a", has_text="Ambiental").focus()
        await page.keyboard.press("Enter")
        await flow(page)
        assert vehicle_url_has(page, "lane=ambiental")
        await page.goto(BASE + "#vehicle?component=missing")
        await page.locator("#vehicleDrawing").wait_for()
        assert (
            "Componente não encontrado"
            in await page.locator("#main [role=status]").inner_text()
        )
        await page.goto(BASE + "#vehicle?component=motor")
        await flow(page)
        await page.evaluate("catalog.records=[];renderVehicle()")
        assert await page.locator("#aiPanel .tree-doc").count() == 0
        assert (
            "pendente"
            in (await page.locator(".graph-node strong").all_inner_texts())[-1].lower()
        )
        motor_asset = "**/" + await page.evaluate(
            'ComponentFlow.component("motor").overviewAsset'
        )
        await page.route(motor_asset, lambda route: route.abort())
        await page.reload()
        await flow(page)
        await page.locator(".image-unavailable").first.wait_for()
        await page.unroute(motor_asset)
        # Existing application views remain intact.
        for view in ["tree", "mover", "library", "flow", "updates", "ai"]:
            await page.goto(BASE + "#" + view)
            await page.locator("#main h1").wait_for()
            assert await page.locator("#main h1").inner_text()
        # Real touch-capable browser context and motion-enabled transition smoke.
        touch = await browser.new_page(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
            reduced_motion="reduce",
        )
        touch.on("pageerror", lambda e: errors.append(str(e)))
        await overview(touch)
        pos = await point(touch, points["bancos"])
        await touch.touchscreen.tap(pos["x"], pos["y"])
        await flow(touch)
        assert await touch.locator("#main h1").inner_text() == "Banco traseiro"
        viewport = touch.locator("#graphViewport")
        await viewport.evaluate("(v)=>v.scrollLeft=120")
        assert await viewport.evaluate("(v)=>v.scrollLeft") == 120
        await touch.close()
        await page.set_viewport_size({"width": 1440, "height": 1100})
        await page.emulate_media(reduced_motion="no-preference")
        await overview(page)
        await page.locator('.aurora-system-card[data-aurora-component="motor"]').click()
        await flow(page)
        await page.wait_for_function(
            '!document.documentElement.classList.contains("transitioning")'
        )
        assert "Motor" in await page.locator("#main h1").inner_text()
        assert not errors, errors
        print(
            "PASS: legacy vehicle entry points and 14 system entries, image zoom/reset, bank/engine/tank flows, reference/gap provenance, source dialog, graph controls, URL/reload/back, keyboard, mobile clicks/layout, missing image/data and 6 existing views. No JavaScript errors."
        )
        await browser.close()


def vehicle_url_has(page, value):
    return value in page.url


with TestServer() as BASE:
    asyncio.run(main())
