"""Flow navigation keeps document context, focus and route state in sync."""

import asyncio
from urllib.parse import parse_qs, urlsplit
from playwright.async_api import async_playwright, expect
from browser_support import TestServer, launch_options, wait_for_route


async def open_reference(page, base):
    await page.goto(base + "#library?agency=INMETRO&q=145")
    await wait_for_route(page)
    await page.locator(".document [data-open]").click()
    await expect(page.locator("#normDialog")).to_be_visible()
    await expect(page.locator("#normDialog .regulatory-state-grid")).to_contain_text(
        "Referência e orientação oficiais"
    )
    await page.locator("#normDialog .requirement-context summary").first.click()


async def map_position(page):
    return await page.locator(".homologation-map-viewport").evaluate(
        "(viewport)=>({left:viewport.scrollLeft,top:viewport.scrollTop})"
    )


async def main(base):
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1440, "height": 1050}, reduced_motion="reduce"
        )
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))

        # Both requirement shortcuts leave the modal and expose their destination.
        for destination in ["flow", "vehicle"]:
            await open_reference(page, base)
            link = page.locator(
                f'#normDialog .requirement-context-links a[href^="#{destination}?"]'
            ).first
            href = await link.get_attribute("href")
            await link.click()
            await expect(page.locator("#normDialog")).not_to_be_visible()
            await wait_for_route(page)
            expected_route, _, expected_query = urlsplit(href).fragment.partition("?")
            actual_route, _, actual_query = urlsplit(page.url).fragment.partition("?")
            assert actual_route == expected_route
            actual_params = parse_qs(actual_query)
            for key, value in parse_qs(expected_query).items():
                assert actual_params.get(key) == value, (key, page.url, href)
            if destination == "flow":
                await expect(page.locator("#flowDetailPanel")).to_be_visible()
                await expect(
                    page.locator("#flowDetailPanel .tree-detail-footer")
                ).not_to_contain_text("revisão dirigida")
            else:
                await expect(page.locator(".component-graph")).to_be_visible()

        # Keyboard activation enters the expanded stage rather than losing focus.
        await page.goto(base + "#flow")
        await wait_for_route(page)
        await page.locator('[data-flow-stage="construcao"]').focus()
        await page.keyboard.press("Enter")
        await wait_for_route(page)
        await expect(page.locator("#flowExplorer")).to_be_focused()
        assert "stage=construcao" in page.url

        # The equivalent picker and powertrain controls also survive rerenders.
        await page.locator("#flowStagePicker").focus()
        await page.locator("#flowStagePicker").select_option("seguranca")
        await wait_for_route(page)
        await expect(page.locator("#flowExplorer")).to_be_focused()
        await page.locator("#flowPowertrain").select_option("eletrico")
        await wait_for_route(page)
        await expect(page.locator("#flowPowertrain")).to_be_focused()

        # Map zoom and pan survive activity expansion and the return to the map.
        await page.locator("[data-flow-map-size]").click()
        await page.locator(".homologation-map-viewport").evaluate(
            "(viewport)=>viewport.scrollLeft=140"
        )
        map_before = await map_position(page)
        assert map_before["left"] > 0
        await page.locator('.node-main[data-tree-node="flow:seguranca:freios"]').click()
        await wait_for_route(page)
        assert "node=flow%3Aseguranca%3Afreios" in page.url
        await expect(page.locator("#flowMapZoom")).to_have_text("100%")
        assert await map_position(page) == map_before

        await page.locator("[data-flow-overview]").focus()
        await page.keyboard.press("Enter")
        await expect(page.locator('[data-flow-stage="seguranca"]')).to_be_focused()
        await expect(page.locator("#flowMapZoom")).to_have_text("100%")
        assert await map_position(page) == map_before

        # A narrow map can pan vertically as well as horizontally.
        await page.set_viewport_size({"width": 390, "height": 844})
        await expect(page.locator("#flowMapZoom")).to_have_text("95%")
        await page.locator("[data-flow-map-size]").click()
        await page.locator(".homologation-map-viewport").evaluate(
            "(viewport)=>viewport.scrollTo(420,170)"
        )
        map_before = await map_position(page)
        assert map_before["left"] > 0 and map_before["top"] > 0
        await page.locator(
            '.node-main[data-tree-node="flow:seguranca:eletrica"]'
        ).click()
        await wait_for_route(page)
        await expect(page.locator("#flowMapZoom")).to_have_text("100%")
        assert await map_position(page) == map_before
        await page.locator("[data-flow-overview]").focus()
        await page.keyboard.press("Enter")
        await expect(page.locator('[data-flow-stage="seguranca"]')).to_be_focused()
        assert await map_position(page) == map_before
        assert not errors, errors
        await browser.close()
        print(
            "PASS: requirement modal navigation, stage/powertrain focus, retained map zoom/pan, route markers and neutral review wording."
        )


with TestServer() as base:
    asyncio.run(main(base))
