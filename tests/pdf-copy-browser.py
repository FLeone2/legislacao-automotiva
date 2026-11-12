"""An act opened by a legacy catalog ID still offers its official PDF copy."""

import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright, expect

from browser_support import TestServer, launch_options, wait_for_route

ROOT = Path(__file__).resolve().parents[1]


async def main(base):
    manifest = json.loads((ROOT / "pdfs/manifest.json").read_text())
    if "contran-949-2022" not in manifest.get("items", {}):
        print("SKIP: no official copy of contran-949-2022 in pdfs/manifest.json")
        return
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(base + "#library")
        await wait_for_route(page)
        # The library lists Resolution 949/2022 under its legacy ID.
        await page.evaluate("openNorm('senatran-072')")
        copy = page.locator("#dialogContent [data-pdf-copy]")
        await expect(copy).to_have_attribute("data-pdf-copy", "contran-949-2022")
        href = await copy.get_attribute("href")
        assert href == "pdfs/contran/contran-949-2022.pdf", href
        response = await page.request.get(base + href)
        assert response.ok and (await response.body())[:5] == b"%PDF-"
        # An act without a copy keeps the official source as the main action.
        missing = next(
            act for act in ("mover-001", "senatran-124") if act not in manifest["items"]
        )
        await page.evaluate("id => openNorm(id)", missing)
        await expect(page.locator("#normDialogTitle")).not_to_have_text(
            "Resolução CONTRAN nº 949/2022"
        )
        assert await page.locator("#dialogContent [data-pdf-copy]").count() == 0
        assert not errors, errors
        await browser.close()
    print("PASS: official PDF copy offered by canonical ID; absent copy stays absent")


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(main(base))
