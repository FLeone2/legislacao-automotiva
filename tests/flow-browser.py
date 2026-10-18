import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import launch_options

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"
OUT = ROOT / "tests/artifacts"
OUT.mkdir(exist_ok=True)


async def ready(page):
    await page.locator(".homologation-step").first.wait_for()


async def stage(page, id):
    await page.locator("#flowStagePicker").select_option(id)
    await page.locator("#flowDetailPanel").wait_for()
    assert await page.locator("#flowExplorer h2").first.inner_text()


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**launch_options())
        page = await b.new_page(
            viewport={"width": 1440, "height": 1100}, reduced_motion="reduce"
        )
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE + "#flow")
        await ready(page)
        assert await page.locator(".homologation-step").count() == 12
        assert await page.locator(".flow-card").count() == 0
        assert not await page.locator("#aiPanel").is_visible()
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.screenshot(path=str(OUT / "flow-overview.png"))
        # Every stage expands a real activity-to-law tree.
        for id in await page.locator(".homologation-step").evaluate_all(
            "(els)=>els.map(e=>e.dataset.flowStage)"
        ):
            await stage(page, id)
            assert await page.evaluate("treeModels.flow.root.children.length>0")
            assert (
                await page.locator(".homologation-step.selected").get_attribute(
                    "data-flow-stage"
                )
                == id
            )
        # Actual graphic click and activity expansion, including evidence and amendments.
        await page.locator("[data-flow-overview]").click()
        await page.locator('[data-flow-stage="coastdown"]').click()
        await page.locator("#flowDetailPanel").wait_for()
        await page.locator('.node-main[data-tree-node="flow:coastdown:metodo"]').click()
        assert (
            await page.locator(
                '.node-main[data-tree-node="flow:coastdown:metodo:law:inmetro-169-2023"]'
            ).count()
            == 1
        )
        assert (
            "NBR 10312" in await page.locator("#flowDetailPanel").inner_text()
            or await page.locator(".graph-node").count() > 4
        )
        await page.screenshot(path=str(OUT / "flow-activity.png"))
        toggle = page.locator('[data-tree-toggle="flow:coastdown:metodo"]')
        await toggle.click()
        assert (
            await page.locator(
                '.node-main[data-tree-node*="flow:coastdown:metodo:law:"]'
            ).count()
            == 0
        )
        await toggle.click()
        await page.locator(
            '.node-main[data-tree-node="flow:coastdown:metodo:law:inmetro-169-2023"]'
        ).click()
        saved = page.url
        await page.reload()
        await page.locator("#flowDetailPanel").wait_for()
        assert page.url == saved
        await page.locator("#flowDetailPanel .tree-detail-footer [data-open]").click()
        await page.locator("#normDialog").wait_for()
        assert "169/2023" in await page.locator("#normDialog").inner_text()
        await page.locator("#normDialog [data-contran-open]").click()
        await page.locator(".contran-record").first.wait_for()
        assert "#inmetro?" in page.url
        await page.go_back()
        await page.locator("#flowDetailPanel").wait_for()
        assert page.url == saved
        # Missing methods remain visible as gaps with no substitute regulations.
        await stage(page, "preparacao")
        await page.locator(
            '.node-main[data-tree-node="flow:preparacao:amaciamento"]'
        ).click()
        assert "0" in await page.locator("#flowDetailPanel .detail-tabs").inner_text()
        assert await page.locator("#flowDetailPanel .tree-doc").count() == 0
        await page.locator(
            '.node-main[data-tree-node="flow:preparacao:amaciamento:gap:0"]'
        ).click()
        assert "Nenhum valor" in await page.locator("#flowDetailPanel").inner_text()
        # BEV is a consultation recut, not an automatic environmental licensing rule.
        await stage(page, "laboratorio")
        await page.locator("#flowPowertrain").select_option("eletrico")
        await page.locator("#flowDetailPanel").wait_for()
        ids = await page.evaluate("Object.keys(treeModels.flow.nodes)")
        assert "flow:laboratorio:eletrico" in ids
        assert "flow:laboratorio:combustao" not in ids
        await stage(page, "aprovacoes")
        assert not await page.evaluate(
            "Boolean(treeModels.flow.nodes['flow:aprovacoes:lcvm'])"
        )
        await stage(page, "coastdown")
        assert not await page.evaluate(
            "Object.values(treeModels.flow.nodes).some(n=>n.recordIds.some(id=>catalog.records.find(r=>r.id===id)?.regulatoryId==='ibama-in-11-2014'))"
        )
        await page.locator("#flowPowertrain").select_option("todos")
        await stage(page, "cop")
        await page.locator('.node-main[data-tree-node="flow:cop:uso"]').click()
        assert (
            "não foram apresentados como o mesmo"
            in await page.locator("#flowDetailPanel").inner_text()
        )
        await stage(page, "cat")
        await page.locator('.node-main[data-tree-node="flow:cat:concessao"]').click()
        await page.locator(
            '.node-main[data-tree-node="flow:cat:concessao:law:senatran-095"]'
        ).click()
        await page.locator("#flowDetailPanel .tree-detail-footer [data-open]").click()
        assert "Portaria9902022R.pdf" in await page.locator(
            "#normDialog .actions a"
        ).first.get_attribute("href")
        await page.locator("#closeDialog").click()
        # Separate zoom controls for the map and for the activity tree.
        await page.locator("[data-flow-overview]").click()
        await page.locator("[data-flow-map-size]").click()
        assert await page.locator("#flowMapZoom").inner_text() == "100%"
        await page.locator("[data-flow-map-fit]").click()
        assert int((await page.locator("#flowMapZoom").inner_text()).rstrip("%")) <= 100
        await page.locator('[data-flow-stage="construcao"]').focus()
        await page.keyboard.press("Enter")
        await page.locator("#flowDetailPanel").wait_for()
        assert "stage=construcao" in page.url
        before = await page.locator("#flowMapZoom").inner_text()
        await page.locator('[data-graph-action="in"]').click()
        assert await page.locator("#flowMapZoom").inner_text() == before
        # Mobile uses pan and an equivalent stage picker; no document overflow.
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(BASE + "#flow")
        await ready(page)
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.screenshot(path=str(OUT / "flow-mobile-map.png"))
        await stage(page, "laboratorio")
        await page.locator(
            '.node-main[data-tree-node="flow:laboratorio:hibrido"]'
        ).focus()
        await page.keyboard.press("Enter")
        assert "NBR 16567" in await page.locator("#flowDetailPanel").inner_text()
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.locator("#flowDetailPanel").scroll_into_view_if_needed()
        await page.screenshot(path=str(OUT / "flow-mobile-activity.png"))
        # Missing records / invalid links remain recoverable, with honest empty states.
        await page.evaluate("catalog.records=[];renderFlow()")
        assert await page.locator("#flowDetailPanel .tree-doc").count() == 0
        assert await page.evaluate(
            "Object.values(treeModels.flow.nodes).some(n=>n.text?.includes('não estão disponíveis'))"
        )
        await page.goto(BASE + "#flow?stage=not-a-stage&node=invalid")
        await ready(page)
        assert "Etapa não encontrada" in await page.locator("#main").inner_text()
        await page.reload()
        await ready(page)
        # The shared tree engine still works when leaving the new view.
        await page.goto(BASE + "#tree")
        await page.locator("#graphViewport").wait_for()
        assert await page.locator("#aiPanel").is_visible()
        assert not await page.evaluate(
            "document.querySelector('#app').classList.contains('homologation-flow-mode')"
        )
        assert not errors, errors
        await b.close()
        print(
            "PASS: 12 stages, activity/law expansion and collapse, amendments, sources/CAT, powertrain recut, honest method gaps, URL/reload/back, separate zooms, keyboard/mobile, unavailable data and shared-tree return; no JavaScript errors."
        )


asyncio.run(main())
