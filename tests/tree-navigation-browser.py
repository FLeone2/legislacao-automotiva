"""Audit UX-01/02/03: readable branches, equivalent list and durable routes."""

import asyncio
import json
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright, expect

from browser_support import TestServer, launch_options, wait_for_route


async def check(base):
    artifacts = Path("tests/artifacts")
    artifacts.mkdir(exist_ok=True)
    report = {"status": "running", "viewports": [], "errors": []}
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(**launch_options())
        for width, height in [(1165, 747), (390, 844)]:
            page = await browser.new_page(viewport={"width": width, "height": height})
            page.on("pageerror", lambda error: report["errors"].append(str(error)))

            async def route(fragment):
                await page.goto(base + fragment)
                await wait_for_route(page)

            await route("#tree?node=seg-freios&tab=documents")
            await expect(page.locator("#aiPanel h2")).to_have_text("Freios")
            await expect(
                page.locator("#aiPanel .detail-tabs [data-tree-tab=documents]")
            ).to_have_attribute("aria-selected", "true")
            assert await page.locator(
                "#main .tree-breadcrumb button"
            ).all_inner_texts() == ["Homologação veicular", "Segurança", "Freios"]
            assert await page.evaluate("treeUI.tree.zoom") >= 0.9
            size = await page.locator(".graph-node.selected strong").evaluate(
                "element=>parseFloat(getComputedStyle(element).fontSize)*treeUI.tree.zoom"
            )
            assert size >= 12.5, size
            assert await page.locator(".graph-node").count() == 5
            await page.locator('[data-graph-action="in"]').click()
            zoom = await page.evaluate("treeUI.tree.zoom")
            await page.locator('.node-main[data-tree-node="seg-freios-normas"]').click()
            assert await page.evaluate("treeUI.tree.zoom") == zoom
            await page.locator(
                "#aiPanel .detail-tabs [data-tree-tab=documents]"
            ).click()
            permalink = await page.locator(".tree-permalink").get_attribute("href")
            assert parse_qs(urlsplit(permalink).fragment.partition("?")[2])["node"] == [
                "seg-freios-normas"
            ]
            assert "tab=documents" in permalink
            second = await browser.new_page(viewport={"width": width, "height": height})
            await second.goto(base + permalink)
            await wait_for_route(second)
            await expect(second.locator("#aiPanel h2")).to_have_text("Normas")
            await expect(
                second.locator("#aiPanel .detail-tabs [data-tree-tab=documents]")
            ).to_have_attribute("aria-selected", "true")
            await second.reload()
            await wait_for_route(second)
            await expect(second.locator("#aiPanel h2")).to_have_text("Normas")
            await second.close()
            await page.locator('.node-main[data-tree-node="seg-freios-normas"]').focus()
            await page.keyboard.press("ArrowLeft")
            assert await page.evaluate("treeUI.tree.selected") == "seg-freios"
            await page.go_back()
            await wait_for_route(page)
            assert await page.evaluate("treeUI.tree.selected") == "seg-freios-normas"
            assert await page.evaluate("treeUI.tree.tab") == "documents"
            await page.locator('[data-tree-presentation="list"]').click()
            assert "presentation=list" in page.url
            await expect(page.locator("#graphViewport")).to_have_count(0)
            await expect(page.locator("[data-tree-list]")).to_be_visible()
            listed = await page.locator(
                ".tree-list-documents [data-open]"
            ).evaluate_all("elements=>elements.map(element=>element.dataset.open)")
            detailed = await page.locator("#aiPanel [data-open]").evaluate_all(
                "elements=>elements.map(element=>element.dataset.open)"
            )
            assert listed and set(listed).issubset(set(detailed))
            await page.locator(".tree-list-documents [data-open]").first.click()
            await expect(page.locator("#normDialog")).to_be_visible()
            await page.locator("#closeDialog").click()
            await page.locator("[data-tree-list] header [data-tree-node]").click()
            await page.locator(
                '.tree-text-list li [data-tree-node="seg-freios-normas"]'
            ).focus()
            await page.keyboard.press("Home")
            assert (
                await page.evaluate("treeUI.tree.selected")
                == "seg-freios-aplicabilidade"
            )
            await expect(page.locator(".tree-list-current")).to_be_focused()
            await page.screenshot(
                path=str(artifacts / f"tree-list-{width}.png"), full_page=True
            )
            await page.reload()
            await wait_for_route(page)
            await expect(page.locator(".tree-text-list")).to_be_visible()
            await expect(page.locator(".tree-list-current")).to_contain_text(
                "Aplicabilidade"
            )
            await route(
                "#mover?node=mover%2Frequisitos&tab=documents&presentation=list"
            )
            await expect(page.locator(".tree-list-current")).to_be_visible()
            assert await page.evaluate("treeUI.mover.selected") == "mover/requisitos"
            await page.reload()
            await wait_for_route(page)
            assert await page.evaluate("treeUI.mover.tab") == "documents"
            await route("#tree?node=constructor")
            await expect(page.locator("#main [role=status]")).to_contain_text(
                "Ramo não encontrado"
            )
            assert await page.evaluate("treeUI.tree.selected") == "root"
            await route("#library?q=freios")
            await expect(page.locator("#globalSearch")).to_have_value("freios")
            await page.evaluate("location.hash='#flow'")
            await wait_for_route(page)
            await expect(page.locator("#globalSearch")).to_have_value("")
            await page.go_back()
            await wait_for_route(page)
            await expect(page.locator("#globalSearch")).to_have_value("freios")
            await expect(page.locator("#librarySearch")).to_have_value("freios")
            report["viewports"].append(
                {"width": width, "height": height, "scaledTextPx": size}
            )
            await page.close()
        await browser.close()
    assert not report["errors"], report["errors"]
    report["status"] = "passed"
    (artifacts / "tree-navigation-browser.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        "Tree navigation: readable branch, shared routes, list and search restoration passed."
    )


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(check(base))
