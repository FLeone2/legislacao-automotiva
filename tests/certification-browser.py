import asyncio, os, json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import (
    click_navigation,
    launch_options,
    wait_for_route,
    reference_vehicle_url,
)

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"
OUT = ROOT / "tests/artifacts"
OUT.mkdir(exist_ok=True)


async def ready(p):
    try:
        await wait_for_route(p)
    except Exception:
        print(
            await p.evaluate(
                """()=>({url:location.href,route:document.querySelector('#main')?.dataset.renderedRoute,busy:document.querySelector('#main')?.getAttribute('aria-busy'),heading:document.querySelector('#main h1')?.textContent,text:document.querySelector('#main')?.innerText.slice(0,600)})"""
            ),
            flush=True,
        )
        raise
    await p.locator(".contran-record").first.wait_for()


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**launch_options())
        page = await b.new_page(
            viewport={"width": 1440, "height": 1000}, reduced_motion="reduce"
        )
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        for name in ["inmetro", "anatel"]:
            d = json.loads((ROOT / f"data/{name}/active.json").read_text())
            await page.goto(reference_vehicle_url(BASE + "#" + name))
            await ready(page)
            assert (
                f"{d['metadata']['activeCount']} resultados"
                in await page.locator("#contranResultCount").inner_text()
            )
            assert await page.locator(".regulatory-requirements").count() == 0
            await page.locator(".contran-evidence summary").first.click()
            await page.locator(
                ".contran-evidence:not([data-lazy-record])"
            ).first.wait_for()
        await page.goto(
            reference_vehicle_url(BASE + "#inmetro?record=inmetro-145-2022")
        )
        await ready(page)
        assert "íntegra pendente" in await page.locator(".contran-record").inner_text()
        assert (
            "Amortecedor" in await page.locator(".regulatory-requirements").inner_text()
        )
        await (
            page.locator(".regulatory-requirements details")
            .first.locator("summary")
            .focus()
        )
        await page.keyboard.press("Enter")
        assert (
            await page.locator(".regulatory-requirements details").first.get_attribute(
                "open"
            )
            is not None
        )
        await page.screenshot(path=str(OUT / "inmetro-requisitos-desktop.png"))
        await page.goto(reference_vehicle_url(BASE + "#inmetro?record=inmetro-33-2021"))
        await ready(page)
        assert "Declaração" in await page.locator(".regulatory-mechanism").inner_text()
        await page.goto(
            reference_vehicle_url(BASE + "#anatel?record=anatel-ato5155-2024")
        )
        await ready(page)
        assert (
            "ExcluiUSB integrado"
            in await page.locator(".regulatory-requirements").inner_text()
        )
        await page.goto(
            reference_vehicle_url(BASE + "#anatel?record=anatel-ato4088-2020")
        )
        await ready(page)
        assert "E-label" in await page.locator(".regulatory-requirements").inner_text()
        await page.locator('.regulatory-system-links a[href*="identificacao"]').click()
        await page.locator(".component-graph").wait_for()
        assert "subsystem=identificacao%2Frotulagem" in page.url
        assert (
            await page.locator('.contran-component-link a[href^="#inmetro"]').count()
            == 1
        )
        assert (
            await page.locator('.contran-component-link a[href^="#anatel"]').count()
            == 1
        )
        await page.goto(
            reference_vehicle_url(
                BASE + "#vehicle?component=eletrica&subsystem=eletronica%2Fimagens"
            )
        )
        await page.locator(".component-graph").wait_for()
        ids = await page.evaluate(
            "Object.values(treeModels.vehicle.nodes).flatMap(n=>n.recordIds||[]).map(id=>catalog.records.find(r=>r.id===id)?.regulatoryId)"
        )
        assert "anatel-res715" in ids
        # New sources keep the same document-detail path from the visual flow.
        node = await page.evaluate(
            "Object.values(treeModels.vehicle.nodes).find(n=>n.recordId&&catalog.records.find(r=>r.id===n.recordId)?.regulatoryId==='anatel-res715').id"
        )
        await page.evaluate(
            "node=>{const q=new URLSearchParams(location.hash.split('?')[1]);q.set('node',node);location.hash='vehicle?'+q}",
            node,
        )
        await page.locator("#aiPanel .tree-detail-footer [data-open]").click()
        await page.locator("#normDialog").wait_for()
        assert "Homologação antes" in await page.locator("#normDialog").inner_text()
        await page.locator("#normDialog [data-contran-open]").click()
        await ready(page)
        assert "record=anatel-res715" in page.url
        # Unified identification view distinguishes PIV, VIN/ETA, ENCE and Anatel.
        await page.goto(reference_vehicle_url(BASE + "#markings"))
        await page.locator("#markings-etiquetas").wait_for()
        text = await page.locator("#main").inner_text()
        for term in [
            "PIV",
            "VIN",
            "ETA",
            "23/10/2026",
            "E-label",
            "INMPAM",
            "01/01/2025",
        ]:
            assert term in text, term
        assert (
            await page.locator('[data-marking-record="inmetro-169-2023"]').count() == 1
        )
        assert (
            await page.locator('[data-marking-record="anatel-ato4088-2020"]').count()
            == 1
        )
        await page.screenshot(path=str(OUT / "etiquetas-vin-desktop.png"))
        await page.locator('[data-markings-section="vin"]').click()
        await page.screenshot(path=str(OUT / "vin-requisitos-desktop.png"))
        for name in ["anatel", "inmetro", "markings"]:
            await page.set_viewport_size({"width": 390, "height": 844})
            await page.goto(reference_vehicle_url(BASE + "#" + name))
            if name == "markings":
                await page.locator("#markings-etiquetas").wait_for()
            else:
                await ready(page)
            assert await page.evaluate(
                "document.documentElement.scrollWidth<=innerWidth"
            ), name
            await page.screenshot(path=str(OUT / (name + "-mobile.png")))
        await page.goto(reference_vehicle_url(BASE + "#library"))
        await page.locator("#agencyFilter").select_option("ANATEL")
        await page.locator(".document").first.wait_for()
        assert await page.locator(".document").count() == 22
        # Extra navigation entries stay reachable in short desktop and narrow mobile.
        await page.set_viewport_size({"width": 1024, "height": 700})
        await page.goto(reference_vehicle_url(BASE + "#vehicle"))
        await page.locator("#vehicleDrawing").wait_for()
        await click_navigation(page, "markings")
        await page.locator("#markings-vin").wait_for()
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.locator("#navigationToggle").click()
        if await page.locator(".nav-source-group").get_attribute("open") is None:
            await page.locator(".nav-source-group summary").click()
        await click_navigation(page, "anatel")
        await ready(page)
        assert "#anatel" in page.url
        # Sources that fail do not restore unverified original Inmetro entries.
        other = await b.new_page()
        other.on("pageerror", lambda e: errors.append(str(e)))
        await other.route(
            "**/data/site/records/anatel/anatel-ato4088-2020.json",
            lambda r: r.fulfill(status=503, body="unavailable"),
        )
        await other.goto(reference_vehicle_url(BASE + "#markings"))
        await other.locator("[data-markings-retry]").wait_for()
        assert (
            await other.locator('[data-marking-record="anatel-ato4088-2020"]').count()
            == 0
        )
        await other.unroute("**/data/site/records/anatel/anatel-ato4088-2020.json")
        await other.locator("[data-markings-retry]").click()
        await other.locator('[data-marking-record="anatel-ato4088-2020"]').wait_for()
        assert not errors, errors
        await b.close()
        print(
            "PASS: Inmetro/Anatel requirements and mechanisms, evidence/keyboard, multimedia-to-source flow, labels/VIN/PIV/ENCE/e-label, dates, mobile, agency search and partial-load retry; no JavaScript errors."
        )


asyncio.run(main())
