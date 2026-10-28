"""Verify initial payload, lazy cache, fail-closed records and canonical joins."""

import asyncio
from browser_support import reference_vehicle_url
import os
from playwright.async_api import async_playwright
from browser_support import launch_options, wait_for_route

BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page()
        requests = []
        errors = []
        page.on("request", lambda r: requests.append(r.url))
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(reference_vehicle_url(BASE + "#vehicle"))
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
        await page.goto(reference_vehicle_url(BASE + "#anatel"))
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
        await page.goto(reference_vehicle_url(BASE + "#anatel?record=" + act))
        await page.locator("[data-canonical-requirement]").first.wait_for()
        assert sum("/" + act + ".json" in url for url in requests) == count
        # A delayed older record must not replace the current screen or steal focus.
        delayed = asyncio.get_running_loop().create_future()
        slow_id = "anatel-ato4088-2020"
        slow_url = "**/data/site/records/anatel/" + slow_id + ".json"
        await page.route(slow_url, lambda route: delayed.set_result(route))
        await page.goto(reference_vehicle_url(BASE + "#anatel?record=" + slow_id))
        held = await asyncio.wait_for(delayed, timeout=10)
        await page.goto(reference_vehicle_url(BASE + "#anatel?record=" + act))
        await wait_for_route(page)
        summary = page.locator(".contran-evidence > summary")
        await summary.focus()
        focused = await summary.element_handle()
        await held.continue_()
        await page.evaluate("id=>loadRegulationRecord('anatel',id)", slow_id)
        assert await focused.evaluate("e=>e.isConnected && e===document.activeElement")
        assert await page.locator("#main").get_attribute("aria-busy") == "false"
        await page.unroute(slow_url)
        await page.goto(
            reference_vehicle_url(
                BASE + "#vehicle?component=eletrica&subsystem=eletronica%2Fimagens"
            )
        )
        await page.locator(".component-graph").wait_for()
        assert await page.evaluate(
            "id=>Object.values(treeModels.vehicle.nodes).some(n=>n.requirementId===id)",
            requirement_id,
        )
        await page.goto(reference_vehicle_url(BASE + "#flow?stage=componentes"))
        await page.locator("#flowDetailPanel").wait_for()
        assert await page.evaluate(
            "id=>Object.values(treeModels.flow.nodes).some(n=>n.requirementId===id)",
            requirement_id,
        )
        # A queued graph animation must be harmless after a fast route change.
        await page.goto(reference_vehicle_url(BASE + "#vehicle?component=bancos"))
        await page.locator(".component-graph").wait_for()
        await page.evaluate("""()=>{
            const original=window.requestAnimationFrame;
            const queued=[];
            try {
                window.requestAnimationFrame=fn=>{queued.push(fn);return queued.length;};
                renderVehicleFlow();
                location.hash='library';
                render();
            } finally { window.requestAnimationFrame=original; }
            for(const fn of queued) fn(performance.now());
        }""")
        await page.locator(".document").first.wait_for()
        await page.goto(
            reference_vehicle_url(BASE + "#contran?record=contran-248-2007")
        )
        await page.locator(".contran-records .empty").wait_for()
        assert not any("contran-248-2007.json" in url for url in requests)
        # Initial-data failure publishes no fallback catalog or unverified originals.
        other = await browser.new_page()
        await other.route(
            "**/data/site/index.json",
            lambda r: r.fulfill(status=503, body="unavailable"),
        )
        await other.goto(reference_vehicle_url(BASE + "#vehicle"))
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
