"""Consultation journeys preserve context and offer source-backed navigation."""

import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright, expect
from browser_support import launch_options

BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"
ROOT = Path(__file__).resolve().parents[1]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        context = await browser.new_context(
            viewport={"width": 1440, "height": 1050},
            permissions=["clipboard-read", "clipboard-write"],
        )
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(
            BASE
            + "#vehicle?focus=bancos&all=1&type=Comercial+leve&powertrain=El%C3%A9trico"
        )
        await expect(page.locator(".aurora-system-card")).to_have_count(14)
        await expect(page.locator(".aurora-subsystem")).to_have_count(4)
        await page.locator('[data-aurora-component="motor"]').click()
        await expect(page.locator(".aurora-system-card")).to_have_count(14)
        await page.locator(".aurora-primary").click()
        await page.locator(".component-graph").wait_for()
        await page.locator("[data-vehicle-back]").click()
        await expect(page.locator(".aurora-explorer h2")).to_have_text(
            "Motor e transmissão"
        )
        await expect(page.locator(".aurora-system-card")).to_have_count(14)
        await expect(page.locator("#vehicleType")).to_have_value("Comercial leve")
        await expect(page.locator("#powertrain")).to_have_value("Elétrico")
        await page.locator(".aurora-directory header>a").click()
        await expect(page.locator(".aurora-system-card")).to_have_count(6)
        await page.goto(BASE + "#vehicle?focus=bancos")
        await page.locator(".aurora-library-link").click()
        await expect(page.locator("#componentFilter")).to_have_value("ocupantes")
        await expect(page.locator(".document")).not_to_have_count(0)
        await page.goto(BASE + "#library?agency=INMETRO&review=reference&q=145")
        await expect(page.locator("#agencyFilter")).to_have_value("INMETRO")
        await expect(page.locator("#reviewFilter")).to_have_value("reference")
        await expect(page.locator("#librarySearch")).to_have_value("145")
        await expect(page.locator(".document")).to_have_count(1)
        await page.reload()
        await expect(page.locator(".document")).to_have_count(1)
        await page.locator("#copyLibraryLink").click()
        await expect(page.locator("#libraryCopyStatus")).to_have_text("Link copiado.")
        assert await page.evaluate(
            "navigator.clipboard.readText()"
        ) == await page.locator("#libraryPermalink").evaluate("e=>e.href")
        await page.locator(".document [data-open]").click()
        await page.locator(".regulatory-state-grid").wait_for()
        await expect(page.locator("#normDialog")).to_contain_text(
            "Não confirmada integralmente"
        )
        await page.locator("#normDialog [data-close-reference]").first.click()
        await expect(page.locator("#normDialog")).not_to_be_visible()
        await page.locator(".component-graph").wait_for()
        await page.go_back()
        await expect(page.locator("#reviewFilter")).to_have_value("reference")
        await page.locator("#reviewFilter").select_option("directed")
        await expect(page.locator(".empty")).to_be_visible()
        await page.go_back()
        await expect(page.locator("#reviewFilter")).to_have_value("reference")
        await expect(page.locator(".document")).to_have_count(1)
        await page.locator("#librarySearch").fill("termo-sem-resultados-xyz")
        await expect(page.locator(".empty")).to_be_visible()
        await page.locator("#clearEmpty").click()
        await expect(page.locator("#librarySearch")).to_have_value("")
        await expect(page.locator("#reviewFilter")).to_have_value("")
        await expect(page.locator(".document")).to_have_count(30)
        first = await page.locator(".document h3").first.inner_text()
        await page.locator("#libraryPagination a").last.click()
        await expect(page.locator("#libraryPagination")).to_contain_text("Página 2")
        assert "page=2" in page.url
        assert first != await page.locator(".document h3").first.inner_text()
        await page.reload()
        await expect(page.locator("#libraryPagination")).to_contain_text("Página 2")
        await expect(page.locator("#aiPanel")).to_contain_text("Como consultar")
        await expect(page.locator("#aiPanel")).not_to_contain_text("Pergunte à IA")
        for width in [1440, 1024, 768, 390]:
            await page.set_viewport_size({"width": width, "height": 900})
            assert await page.evaluate(
                "document.documentElement.scrollWidth<=innerWidth"
            ), width
        await page.screenshot(
            path=str(ROOT / "tests/artifacts/consultation-library-mobile.png"),
            full_page=True,
        )
        assert not errors, errors
        await browser.close()
    print(
        "PASS: complete subsystem directory, return context, shareable/reloadable filters, clipboard, history, legal caveats, modal navigation, empty states and responsive library."
    )


asyncio.run(main())
