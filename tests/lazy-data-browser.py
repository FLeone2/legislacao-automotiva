"""Verify initial payload, lazy cache, fail-closed records and canonical joins."""

import asyncio
import os
from playwright.async_api import async_playwright
from browser_support import launch_options

BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page()
        requests = []
        errors = []
        page.on("request", lambda r: requests.append(r.url))
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE + "#vehicle")
        await page.locator("#vehicleDrawing").wait_for()
        data_requests = [
            url for url in requests if "/data/" in url or url.endswith("catalog.json")
        ]
        assert len(data_requests) == 1 and data_requests[0].endswith(
            "/data/site/index.json"
        ), data_requests
        size = await page.evaluate(
            "performance.getEntriesByType('resource').find(r=>r.name.endsWith('/data/site/index.json')).decodedBodySize"
        )
        assert 0 < size <= 450_000, size
        await page.goto(BASE + "#anatel")
        await page.locator(".contran-record").first.wait_for()
        assert not any("/records/" in url for url in requests)
        act = "anatel-res715"
        url = "**/data/site/records/anatel/" + act + ".json"
        await page.route(url, lambda r: r.fulfill(status=503, body="unavailable"))
        await page.locator(f'[data-contran-record="{act}"] summary').click()
        await page.locator("[data-record-retry]").wait_for()
        assert not await page.locator(".regulatory-requirements").count()
        await page.unroute(url)
        await page.locator("[data-record-retry]").click()
        await page.locator("[data-canonical-requirement]").first.wait_for()
        requirement_id = await page.locator(
            "[data-canonical-requirement]"
        ).first.get_attribute("data-canonical-requirement")
        count = sum("/" + act + ".json" in url for url in requests)
        await page.goto(BASE + "#anatel?record=" + act)
        await page.locator("[data-canonical-requirement]").first.wait_for()
        assert sum("/" + act + ".json" in url for url in requests) == count
        await page.goto(
            BASE + "#vehicle?component=eletrica&subsystem=eletronica%2Fimagens"
        )
        await page.locator(".component-graph").wait_for()
        assert await page.evaluate(
            "id=>Object.values(treeModels.vehicle.nodes).some(n=>n.requirementId===id)",
            requirement_id,
        )
        await page.goto(BASE + "#flow?stage=componentes")
        await page.locator("#flowDetailPanel").wait_for()
        assert await page.evaluate(
            "id=>Object.values(treeModels.flow.nodes).some(n=>n.requirementId===id)",
            requirement_id,
        )
        await page.goto(BASE + "#contran?record=contran-248-2007")
        await page.locator(".contran-records .empty").wait_for()
        assert not any("contran-248-2007.json" in url for url in requests)
        # Initial-data failure publishes no fallback catalog or unverified originals.
        other = await browser.new_page()
        await other.route(
            "**/data/site/index.json",
            lambda r: r.fulfill(status=503, body="unavailable"),
        )
        await other.goto(BASE + "#vehicle")
        await other.locator("#main [role=alert]").wait_for()
        assert not await other.locator("#vehicleDrawing").count()
        await other.unroute("**/data/site/index.json")
        await other.locator("#main button").click()
        await other.locator("#vehicleDrawing").wait_for()
        assert not errors, errors
        await browser.close()
        print(
            f"PASS: {size} initial JSON bytes, no eager details, per-act retry/cache, same canonical ID in vehicle/flow, excluded act blocked, initial failure/reload"
        )


asyncio.run(main())
