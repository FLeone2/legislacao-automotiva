import asyncio
from browser_support import reference_vehicle_url
import os
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect
from browser_support import launch_options, wait_for_route

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"
ARTIFACTS = ROOT / "tests/artifacts"
ARTIFACTS.mkdir(exist_ok=True)


async def ready(page):
    await wait_for_route(page)
    await page.locator(".contran-record").first.wait_for()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1440, "height": 1050}, reduced_motion="reduce"
        )
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        m = json.loads((ROOT / "data/contran/active.json").read_text())["metadata"]
        environmental = json.loads((ROOT / "data/proconve/active.json").read_text())
        await page.goto(reference_vehicle_url(BASE + "#contran"))
        await ready(page)
        assert (
            str(m["activeCount"])
            in await page.locator("#contranResultCount").inner_text()
        )
        assert await page.locator(".contran-record").count() == 25
        assert "06/10/2026" in await page.locator(".contran-source").inner_text()
        await page.screenshot(path=str(ARTIFACTS / "contran-desktop-verified.png"))
        await page.locator('[data-contran-page="2"]').click()
        await ready(page)
        assert "página 2 de" in await page.locator("#contranResultCount").inner_text()
        await page.locator("#contranSearch").fill("951/2022")
        await page.locator("#contranFilters button[type=submit]").click()
        await ready(page)
        assert await page.locator(".contran-record").count() == 1
        card = page.locator('[data-contran-record="contran-951-2022"]')
        await card.locator("summary").click()
        await page.locator(
            '[data-contran-record="contran-951-2022"] .contran-evidence:not([data-lazy-record])'
        ).wait_for()
        assert (
            "997/2023" in await card.inner_text() or "997/23" in await card.inner_text()
        )
        source = card.locator(".contran-actions a").first
        assert "/Resolucao9512022.pdf" in await source.get_attribute("href")
        await page.reload()
        await ready(page)
        assert "951/2022" == await page.locator("#contranSearch").input_value()
        await page.goto(reference_vehicle_url(BASE + "#contran?system=ocupantes"))
        await ready(page)
        assert (
            await page.locator('[data-contran-record="contran-951-2022"]').count() == 1
        )
        # Historical scope parameters cannot reveal an inactive record.
        for key in [
            "contran-1029-2026",
            "contran-248-2007",
            "contran-827-1997",
            "contran-412-2012",
        ]:
            await page.goto(
                reference_vehicle_url(BASE + "#contran?scope=all&record=" + key)
            )
            await page.locator(".contran-records .empty").wait_for()
            assert await page.locator(".contran-record").count() == 0
        await page.goto(
            reference_vehicle_url(BASE + "#contran?record=contran-220-2007")
        )
        await wait_for_route(page)
        # The source route can finish before its hash redirect has rendered the
        # historical record. Wait for the destination content, not just the route marker.
        await expect(page.locator("#main .regulatory-history")).to_contain_text(
            "Fora da consulta atual"
        )
        assert "#history?agency=contran&record=contran-220-2007" in page.url
        assert await page.locator(".contran-record").count() == 0
        await page.goto(
            reference_vehicle_url(
                BASE + "#contran?scope=current&q=termo-sem-correspondencia-xyz"
            )
        )
        await page.locator(".contran-records .empty").wait_for()
        await page.locator(".empty [data-contran-clear]").click()
        await ready(page)
        assert (
            str(m["recordCount"])
            in await page.locator("#contranResultCount").inner_text()
        )
        async with page.expect_download() as pending:
            await page.locator('a[download][href$="active.csv"]').click()
        download = await pending.value
        assert download.suggested_filename == "active.csv"
        assert (
            "Acervo completo"
            in await page.locator('a[download][href$="active.csv"]').inner_text()
        )
        # Real navigation from a vehicle system and from an existing catalogue reference.
        await page.goto(reference_vehicle_url(BASE + "#vehicle?component=bancos"))
        await page.locator(".component-graph").wait_for()
        await page.locator(".contran-component-link a").first.click()
        await ready(page)
        assert "component=bancos" in page.url
        await page.goto(reference_vehicle_url(BASE + "#library"))
        await page.locator("#librarySearch").fill("951")
        await page.locator('[data-open="senatran-061"]').first.click()
        await page.locator("#normDialog").wait_for()
        await page.locator("#normDialog [data-contran-open]").click()
        await ready(page)
        assert not await page.locator("#normDialog").is_visible()
        assert (
            await page.locator('[data-contran-record="contran-951-2022"]').count() == 1
        )
        # Transverse categories never force a physical system association.
        await page.goto(reference_vehicle_url(BASE + "#contran?category=homologacao"))
        await ready(page)
        assert (
            await page.locator('[data-contran-record="contran-922-2022"]').count() == 1
        )
        await page.goto(reference_vehicle_url(BASE + "#proconve?phase=L8"))
        await ready(page)
        assert (
            f"{environmental['metadata']['phaseCounts']['L8']} resultados"
            in await page.locator("#contranResultCount").inner_text()
        )
        assert (
            await page.locator('[data-contran-record="ibama-in-20-2025"]').count() == 1
        )
        assert (
            await page.locator('[data-contran-record="ibama-in-20-2020"]').count() == 0
        )
        await page.goto(reference_vehicle_url(BASE + "#proconve?phase=P8"))
        await ready(page)
        assert (
            f"{environmental['metadata']['phaseCounts']['P8']} resultados"
            in await page.locator("#contranResultCount").inner_text()
        )
        assert (
            await page.locator('[data-contran-record="ibama-in-20-2020"]').count() == 1
        )
        assert (
            await page.locator('[data-contran-record="ibama-in-20-2021"]').count() == 0
        )
        await page.goto(
            reference_vehicle_url(BASE + "#proconve?category=emissoes-corporativas")
        )
        await ready(page)
        assert await page.locator(".contran-record").count() == 2
        assert (
            await page.locator('.regulatory-system-links a[href^="#vehicle"]').count()
            == 0
        )
        await page.goto(reference_vehicle_url(BASE + "#proconve?component=tanque"))
        await ready(page)
        tank_count = sum(
            any(link["componentId"] == "tanque" for link in record["vehicleLinks"])
            for record in environmental["records"]
        )
        assert (
            f"{tank_count} resultados"
            in await page.locator("#contranResultCount").inner_text()
        )
        assert (
            await page.locator('[data-contran-record="ibama-in-26-2020"]').count() == 1
        )
        await page.locator('.regulatory-context a[href^="#vehicle"]').click()
        await page.locator(".component-graph").wait_for()
        assert "component=tanque" in page.url
        await page.goto(
            reference_vehicle_url(BASE + "#vehicle?component=motor&lane=ambiental")
        )
        await page.locator(".component-graph").wait_for()
        refs = await page.evaluate(
            "Object.values(treeModels.vehicle.nodes).filter(n=>n.recordIds?.some(id=>catalog.records.find(r=>r.id===id)?.regulatoryId==='ibama-in-20-2025')).length"
        )
        assert refs > 0
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(reference_vehicle_url(BASE + "#contran"))
        await ready(page)
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.screenshot(path=str(ARTIFACTS / "contran-mobile-verified.png"))
        await page.locator("#contranSearch").fill("970/2022")
        await page.locator("#contranFilters button[type=submit]").focus()
        await page.keyboard.press("Enter")
        await ready(page)
        assert (
            await page.locator('[data-contran-record="contran-970-2022"]').count() == 1
        )
        await page.locator(".contran-record summary").focus()
        await page.keyboard.press("Enter")
        assert await page.locator(".contran-evidence").get_attribute("open") is not None
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        # Failure is explicit and a retry can recover without reloading the application.
        other = await browser.new_page(viewport={"width": 1000, "height": 900})
        other.on("pageerror", lambda e: errors.append(str(e)))
        await other.route(
            "**/data/site/records/contran/contran-951-2022.json",
            lambda r: r.fulfill(status=503, body="unavailable"),
        )
        await other.goto(
            reference_vehicle_url(BASE + "#contran?record=contran-951-2022")
        )
        await other.locator("[data-contran-retry]").wait_for()
        await other.unroute("**/data/site/records/contran/contran-951-2022.json")
        await other.locator("[data-contran-retry]").click()
        await ready(other)
        await page.goto(reference_vehicle_url(BASE + "#proconve"))
        await ready(page)
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.screenshot(
            path=str(ARTIFACTS / "proconve-mobile-verified.png"), full_page=True
        )
        assert not errors, errors
        await browser.close()
        print(
            "PASS: active-only CONTRAN/PROCONVE, inactive URL exclusion, L8/P8 separation, corporate categories, sources, pagination, CSV, vehicle/catalogue links, new flow references, mobile, keyboard, empty/error/retry. No JavaScript errors."
        )


asyncio.run(main())
