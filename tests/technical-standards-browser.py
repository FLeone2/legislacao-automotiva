"""Search resolves citations; hybrid consultation opens the exact provision."""

import asyncio
from playwright.async_api import async_playwright, expect
from browser_support import TestServer, launch_options, wait_for_route


async def main(base):
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        for query in ["16567", "NBR 16567", "ABNT NBR 16567:2020", "NBR 16.567"]:
            await page.goto(base + "#library?q=" + query)
            await wait_for_route(page)
            assert await page.locator(".document").count() > 0, query
            await expect(page.locator("#documents")).to_contain_text("16567")
        await page.locator("#agencyFilter").select_option("IBAMA")
        await page.locator("#librarySearch").fill("NBR 16567:2020")
        await expect(page.locator("#agencyFilter")).to_have_value("IBAMA")
        await page.locator(".document [data-open]").first.click()
        await expect(page.locator("#normDialog .technical-citations")).to_be_visible()
        await page.locator("#normDialog .technical-citations summary").click()
        await expect(page.locator("#normDialog .technical-citations")).to_contain_text(
            "não confirma a edição vigente"
        )
        await page.keyboard.press("Escape")

        for activity in ["hev", "phev", "hibrido"]:
            await page.goto(
                base
                + "#flow?stage=laboratorio&node=flow:laboratorio:"
                + activity
                + "&powertrain="
                + activity
            )
            await wait_for_route(page)
            method = page.locator(
                '.flow-context-panel [data-requirement="ibama-in-3-2023:req:02"]'
            )
            await expect(method).to_be_visible()
            assert await page.evaluate(
                """()=>Object.values(treeModels.flow.nodes)
                .filter(n=>n.id.startsWith('flow:laboratorio:'+flowUI.powertrain+':law:ibama-in-3-2023:requirement:'))
                .every(n=>n.requirementId==='ibama-in-3-2023:req:02')"""
            )
            await method.click()
            requirement = page.locator('[id="requirement-ibama-in-3-2023:req:02"]')
            await expect(requirement).to_be_in_viewport()
            await expect(requirement).to_contain_text("Art. 2º")
            await expect(page.locator("#normDialog")).to_contain_text(
                "famílias evaporativas"
            )
            await page.keyboard.press("Escape")

        await page.locator("#searchTrigger").click()
        await page.locator("#globalSearch").fill("NBR 16567")
        await expect(page.locator("#searchResults")).to_contain_text("16567")
        await page.keyboard.press("Escape")

        # A citation fetch failure is visible and recoverable, not an empty result.
        await page.route(
            "**/data/site/technical-standards.json",
            lambda route: route.fulfill(status=503, body="unavailable"),
        )
        await page.goto(base + "#library?q=16567")
        await page.reload()
        await wait_for_route(page)
        await expect(page.locator("[data-standards-retry]")).to_be_visible()
        await page.unroute("**/data/site/technical-standards.json")
        await page.locator("[data-standards-retry]").click()
        await expect(page.locator("[data-standards-retry]")).to_have_count(0)
        assert await page.locator(".document").count() > 0
        assert not errors, errors
        await browser.close()
    print(
        "PASS: NBR aliases/editions, preserved filter, hybrid clause targets and recoverable index"
    )


with TestServer() as base:
    asyncio.run(main(base))
