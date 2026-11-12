"""The law page shows the full text, reaches a device by link and stays honest
when an act has no full text."""

import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright, expect

from browser_support import TestServer, launch_options, wait_for_route

ROOT = Path(__file__).resolve().parents[1]


async def main(base):
    index = {
        act["id"]: act
        for act in json.loads((ROOT / "texts/index.json").read_text())["acts"]
    }
    assert index["contran-949-2022"]["fullTextAvailable"]
    missing = next(act for act in index.values() if not act["fullTextAvailable"])["id"]
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))

        # A link to an article opens the act on that article.
        await page.goto(base + "#lei?id=contran-949-2022&trecho=art-2")
        target = page.locator("#lei-art-2")
        await expect(target).to_have_class("law-target")
        await expect(page.locator("#main h1")).to_contain_text("949/2022")
        await expect(target).to_contain_text("choque lateral")
        assert await page.locator(".law-contents a").count() >= 8
        await expect(page.locator("#lei-anexo-iii")).to_contain_text("Anexo III")
        await expect(page.locator(".law-provenance")).to_contain_text("SHA-256")
        await expect(page.locator(".law-context")).to_contain_text(
            "Situação registrada"
        )
        pdf = page.locator(".law-actions [data-pdf-copy]")
        await expect(pdf).to_have_attribute("href", "pdfs/contran/contran-949-2022.pdf")

        # The contents and a requirement lead to devices without rebuilding the page.
        await page.evaluate("document.querySelector('.law-page').dataset.kept = '1'")
        await page.locator('.law-contents [data-law-link="art-3"]').click()
        await expect(page.locator("#lei-art-3")).to_have_class("law-target")
        await expect(target).not_to_have_class("law-target")
        assert "trecho=art-3" in page.url
        assert await page.locator(".law-page").get_attribute("data-kept") == "1"
        requirement = page.locator('.law-requirements [data-law-link="art-2"]').first
        await requirement.click()
        await expect(target).to_have_class("law-target")
        await page.go_back()
        await expect(page.locator("#lei-art-3")).to_have_class("law-target")

        # Search inside the act.
        await page.locator("#lawSearch").fill("poste")
        await expect(page.locator("[data-law-search-status]")).to_contain_text("trecho")
        assert await page.locator(".law-text .law-hit").count() > 3

        # An unknown device opens the act from the start and says so.
        await page.goto(base + "#lei?id=contran-949-2022&trecho=art-999")
        await expect(page.locator(".law-text")).to_contain_text("não foi localizado")

        # An act without full text says so and keeps the official source.
        await page.goto(base + f"#lei?id={missing}")
        await expect(page.locator(".law-page")).to_have_attribute(
            "data-full-text", "false"
        )
        await expect(page.locator(".law-text")).to_contain_text(
            "Texto completo ainda não disponível"
        )
        assert await page.locator(".law-files a[href^='http']").count() >= 1
        await page.goto(base + "#lei?id=nao-existe")
        await expect(page.locator("#main")).to_contain_text("Lei não encontrada")

        # The act card opens the full text by the canonical ID.
        await page.goto(base + "#library")
        await wait_for_route(page)
        await page.evaluate("openNorm('senatran-072')")
        link = page.locator('#dialogContent [data-law-text="contran-949-2022"]')
        await expect(link).to_have_text("Texto completo")
        await link.click()
        await expect(page.locator("#main h1")).to_contain_text("949/2022")
        assert not await page.locator("#normDialog").evaluate("d => d.open")
        await expect(page.locator('[data-nav="library"]').first).to_have_attribute(
            "aria-current", "page"
        )

        # Phone width: one column, no horizontal scroll.
        phone = await browser.new_page(viewport={"width": 390, "height": 844})
        await phone.goto(base + "#lei?id=contran-970-2022&trecho=anexo-xiv")
        await expect(phone.locator("#lei-anexo-xiv")).to_have_class(
            "law-annex law-target"
        )
        overflow = await phone.evaluate(
            "document.documentElement.scrollWidth - document.documentElement.clientWidth"
        )
        assert overflow <= 1, overflow
        assert not errors, errors
        await browser.close()
    print(
        "PASS: full text by article and annex link, contents, in-act search, missing "
        "text, canonical ID from the act card and phone width"
    )


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(main(base))
