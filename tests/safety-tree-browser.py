"""The safety stage shows the whole requirement tree expanded: CAT levels,
optional technologies, MOVER groups and identification (VIN, labels), each item
with its acts linked to the article in the full text."""

import asyncio

from playwright.async_api import async_playwright, expect

from browser_support import TestServer, launch_options


async def main(base):
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))

        await page.goto(base + "#flow?stage=seguranca")
        tree = page.locator("#safetyTree")
        await expect(tree).to_be_visible()
        await expect(tree.locator(".st-item")).to_have_count(87)
        assert await tree.locator("details:not([open])").count() == 0
        for label in [
            "Nível 1 — Declaração de conformidade",
            "Nível 2 — Ensaios de segurança ativa",
            "Nível 3 — Ensaios de segurança passiva",
            "Opcionais e tecnologias inovadoras",
            "Grupo C — substitutos dos itens do Grupo B",
            "Identificação: VIN, placa e etiquetas",
        ]:
            await expect(tree).to_contain_text(label)
        await expect(tree.locator(".st-law-flag")).to_have_count(0)

        # Collapse and expand everything.
        await tree.locator('[data-safety-open="none"]').click()
        assert await tree.locator("details[open]").count() == 0
        await tree.locator('[data-safety-open="all"]').click()
        assert await tree.locator("details:not([open])").count() == 0

        # Filter by act; only matching items stay visible.
        await tree.locator("#safetyTreeFilter").fill("968/2022")
        await expect(page.locator("#safetyTreeStatus")).to_contain_text("encontrados")
        visible = tree.locator(".st-item:visible")
        assert 4 <= await visible.count() <= 10
        await expect(visible.first).to_contain_text("968/2022")
        await tree.locator("#safetyTreeFilter").fill("")
        await expect(tree.locator(".st-item:visible")).to_have_count(87)

        # The graph gets the same groups as branches.
        toggle = page.locator('[data-tree-toggle="flow:seguranca:st:nivel-2"]')
        await toggle.click()
        await expect(
            page.locator('[data-tree-node="flow:seguranca:st:nivel-2:ENS-2-01"]').first
        ).to_be_visible()

        # The jump button reaches the tree; a law link opens the article.
        await page.locator("[data-safety-jump]").click()
        await expect(tree).to_be_focused()
        link = tree.locator(
            '.st-item:has-text("Etiquetas autoadesivas") .st-laws a'
        ).first
        await link.click()
        await expect(page.locator("#lei-art-8")).to_have_class("law-target")
        await expect(page.locator("#main h1")).to_contain_text("968/2022")

        # Phone width: no horizontal scroll.
        phone = await browser.new_page(viewport={"width": 390, "height": 844})
        await phone.goto(base + "#flow?stage=seguranca")
        await expect(phone.locator("#safetyTree .st-item")).to_have_count(87)
        overflow = await phone.evaluate(
            "document.documentElement.scrollWidth - document.documentElement.clientWidth"
        )
        assert overflow <= 1, overflow
        assert not errors, errors
        await browser.close()
    print(
        "PASS: expanded safety tree, collapse/expand, filter, graph branches, "
        "article link and phone width"
    )


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(main(base))
