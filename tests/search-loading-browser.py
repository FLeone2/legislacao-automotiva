"""A pending citation index must not block catalog search or reset keyboard choice."""

import asyncio
from browser_support import reference_vehicle_url
from playwright.async_api import async_playwright, expect
from browser_support import TestServer, launch_options, wait_for_route


async def main(base):
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        held = asyncio.get_running_loop().create_future()
        await page.route(
            "**/data/site/technical-standards.json",
            lambda route: held.set_result(route),
        )
        await page.goto(reference_vehicle_url(base + "#vehicle"))
        await wait_for_route(page)
        origin = page.url
        await page.locator("#searchTrigger").click()
        request = await asyncio.wait_for(held, timeout=10)

        # Keep the actual request held until a catalog-only query works.
        await page.locator("#globalSearch").fill("951")
        await expect(page.locator("#searchResults")).to_contain_text("951/2022")
        assert await page.locator("[data-search-result]").count() > 1
        await page.keyboard.press("ArrowDown")
        selected = await page.evaluate(
            "catalogSearchUI.entries[catalogSearchUI.selected]"
        )
        assert page.url == origin
        await request.continue_()
        await page.wait_for_function(
            "technicalStandardsIndex.length > 0 && !catalogSearchUI.loadingStandards"
        )
        assert (
            await page.evaluate("catalogSearchUI.entries[catalogSearchUI.selected].id")
            == selected["id"]
        )
        await page.keyboard.press("Enter")
        await expect(page.locator("#normDialogTitle")).to_have_text(selected["title"])
        assert page.url == origin
        await page.keyboard.press("Escape")

        # A citation-only query reports pending enrichment until it can resolve.
        await page.reload()
        await wait_for_route(page)
        held = asyncio.get_running_loop().create_future()
        await page.locator("#searchTrigger").click()
        request = await asyncio.wait_for(held, timeout=10)
        await page.locator("#globalSearch").fill("ABNT NBR 16.567:2020")
        await expect(page.locator("#searchStatus")).to_contain_text(
            "Carregando citações"
        )
        await request.continue_()
        await expect(page.locator("#searchResults")).to_contain_text("16567")
        await page.keyboard.press("Escape")
        await expect(page.locator("#searchTrigger")).to_be_focused()
        assert not errors, errors
        await browser.close()
    print(
        "PASS: held citation request, live catalog search, retained keyboard choice and NBR enrichment"
    )


with TestServer() as base:
    asyncio.run(main(base))
