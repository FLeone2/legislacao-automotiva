"""Approved Obsidian shell, context-preserving search and complete tree access."""

import asyncio
from browser_support import reference_vehicle_url
import json
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright, expect

from browser_support import (
    TestServer,
    click_navigation,
    launch_options,
    open_preferences,
    select_theme,
    wait_for_route,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/obsidian"
OUT.mkdir(parents=True, exist_ok=True)


async def visit(page, base, route):
    if await page.locator("#searchDialog[open]").count():
        await page.keyboard.press("Escape")
    await page.goto(reference_vehicle_url(base + route))
    await wait_for_route(page)


async def no_page_overflow(page):
    assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), (
        page.url
    )


async def main(base):
    errors = []
    report = {"viewports": [], "errors": errors}
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1600, "height": 1050}, reduced_motion="reduce"
        )
        page.on("pageerror", lambda error: errors.append(str(error)))

        for width in (1600, 1440, 1024, 768, 430, 390, 375):
            await page.set_viewport_size(
                {"width": width, "height": 1050 if width > 650 else 932}
            )
            for name, route in (
                ("vehicle", "#vehicle?focus=bancos&part=peca_08_banco_traseiro"),
                ("flow", "#flow"),
                ("activity", "#flow?stage=componentes"),
            ):
                await visit(page, base, route)
                await no_page_overflow(page)
                if name == "vehicle":
                    await expect(page.locator("#vehicleDrawing")).to_have_attribute(
                        "viewBox", "0 0 1536 1024"
                    )
                    await expect(page.locator("[data-map-part]")).to_have_count(37)
                    await expect(
                        page.locator(".vehicle-reference-group")
                    ).not_to_have_count(0)
                    await expect(page.locator(".aurora-primary")).to_have_attribute(
                        "href", __import__("re").compile("part=peca_08_banco_traseiro")
                    )
                    if width <= 650:
                        assert await page.locator(".aurora-explorer").evaluate(
                            "e=>e.scrollHeight<=e.clientHeight+1"
                        ), "The mobile inspector must grow with its complete content"
                        for selector in (
                            "#searchTrigger",
                            "#navigationToggle",
                            ".primary-nav a",
                            ".vehicle-drawing-tools button",
                            ".aurora-primary",
                        ):
                            for bounds in await page.locator(selector).evaluate_all(
                                "els=>els.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))"
                            ):
                                assert bounds["w"] >= 43.5 and bounds["h"] >= 43.5, (
                                    selector,
                                    bounds,
                                )
                else:
                    await expect(page.locator("[data-flow-stage]")).to_have_count(12)
                    if name == "activity":
                        await expect(
                            page.locator(".flow-context-panel")
                        ).to_be_visible()
                        await expect(page.locator(".node-main")).not_to_have_count(0)
                        await expect(page.locator("#flowDetailPanel")).to_be_visible()
                if width in (1600, 390):
                    await page.screenshot(
                        path=str(OUT / f"{name}-{width}.png"), full_page=True
                    )
                    if width == 390 and name == "vehicle":
                        await page.screenshot(
                            path=str(OUT / "vehicle-mobile-viewport.png")
                        )
            report["viewports"].append(width)

        await page.set_viewport_size({"width": 1600, "height": 1050})
        await visit(page, base, "#vehicle?focus=bancos&part=peca_08_banco_traseiro")
        await page.locator("#searchTrigger").focus()
        origin = page.url
        await page.keyboard.press("Control+k")
        await expect(page.locator("#searchDialog")).to_be_visible()
        await expect(page.locator("#globalSearch")).to_be_focused()
        assert (
            await page.locator("#searchDialog").get_attribute("data-keyboard") == "true"
        )
        await page.locator("#globalSearch").fill("951")
        assert page.url == origin
        selected = await page.evaluate(
            "catalogSearchUI.entries.findIndex(entry=>entry.kind==='record'&&catalogIdentity(catalogRecord(catalog,entry.id))==='contran-951-2022')"
        )
        assert selected >= 0
        for _ in range(selected):
            await page.keyboard.press("ArrowDown")
        await page.keyboard.press("Enter")
        await expect(page.locator("#searchDialog")).not_to_be_visible()
        await expect(page.locator("#normDialogTitle")).to_contain_text("951/2022")
        assert page.url == origin
        await page.locator("#closeDialog").click()
        await expect(page.locator("#searchTrigger")).to_be_focused()
        await expect(page.locator("#vehiclePartSelect")).to_have_value(
            "peca_08_banco_traseiro"
        )

        await page.locator("#searchTrigger").click()
        await page.locator("#globalSearch").fill("unknown-query-with-no-match-xyz")
        await expect(page.locator("#searchStatus")).to_contain_text(
            "Nenhuma referência encontrada"
        )
        await expect(page.locator("[data-search-result]")).to_have_count(0)
        await page.keyboard.press("Enter")
        assert page.url == origin
        await page.keyboard.press("Escape")
        await expect(page.locator("#searchTrigger")).to_be_focused()

        await page.locator("#searchTrigger").click()
        await page.locator("#globalSearch").fill("radiador")
        part_index = await page.evaluate(
            "catalogSearchUI.entries.findIndex(entry=>entry.kind==='part'&&entry.id==='peca_29_radiador')"
        )
        assert part_index >= 0
        await page.locator(f'[data-search-result="{part_index}"]').click()
        await wait_for_route(page)
        await expect(page.locator("#vehiclePartSelect")).to_have_value(
            "peca_29_radiador"
        )
        await expect(page.locator(".vehicle-reference-count")).to_contain_text(
            "Sem referência"
        )

        await page.locator("#searchTrigger").click()
        await page.locator("#globalSearch").fill("identificação")
        await page.screenshot(path=str(OUT / "search-desktop.png"), full_page=True)
        expected_count = await page.evaluate(
            "catalogSearchResults('identificação').records"
        )
        await page.locator("#searchAllResults").click()
        await wait_for_route(page)
        assert parse_qs(urlsplit(page.url).fragment.partition("?")[2])["q"] == [
            "identificação"
        ]
        assert await page.evaluate("filters().length") == expected_count
        assert await page.evaluate("catalogRecords(catalog).length") == 294
        await page.go_back()
        await wait_for_route(page)
        await expect(page.locator("#vehiclePartSelect")).to_have_value(
            "peca_29_radiador"
        )
        report["search"] = (
            "canonical catalog, empty state, keyboard, focus, part selection, library and browser return"
        )

        await visit(page, base, "#flow")
        stage_button = page.locator('[data-flow-stage="componentes"]')
        await stage_button.scroll_into_view_if_needed()
        map_scroll = await page.evaluate("scrollY")
        await stage_button.click()
        await wait_for_route(page)
        assert abs(await page.evaluate("scrollY") - map_scroll) < 1, (
            "Selecting a stage must retain the map context"
        )
        activity = await page.locator("[data-flow-activity]").first.get_attribute(
            "data-flow-activity"
        )
        await page.locator(f'[data-flow-activity="{activity}"]').click()
        await wait_for_route(page)
        await expect(
            page.locator(f'[data-flow-activity="{activity}"]')
        ).to_have_attribute("aria-current", "true")
        assert await page.evaluate("treeUI.flow.selected") == activity
        await expect(
            page.locator(f'.node-main[data-tree-node^="{activity}:law:"]')
        ).not_to_have_count(0)
        await page.locator(f'[data-flow-activity="{activity}"]').click()
        await wait_for_route(page)
        assert await page.evaluate("treeUI.flow.selected") == "flow:componentes"
        await page.locator("[data-flow-tree]").click()
        await expect(page.locator("#flowTreeExplorer")).to_be_focused()
        await page.locator("[data-flow-overview]").click()
        await expect(page.locator('[data-flow-stage="componentes"]')).to_be_focused()
        await page.locator('[aria-label="Fechar painel da etapa"]').click()
        await wait_for_route(page)
        await expect(page.locator(".flow-context-panel")).to_have_count(0)
        await expect(page.locator("[data-flow-stage]")).to_have_count(12)
        report["flow"] = (
            "contextual stage panel, reversible activity selection and original expandable tree"
        )

        # Every existing entry remains reachable through the actual new navigation.
        for view in (
            "vehicle",
            "flow",
            "library",
            "tree",
            "markings",
            "contran",
            "proconve",
            "inmetro",
            "anatel",
            "mover",
            "updates",
        ):
            await click_navigation(page, view)
            await wait_for_route(page)
            assert (
                await page.locator("#navigationToggle").get_attribute("aria-expanded")
                == "false"
            )
        report["routes"] = 11

        await page.set_viewport_size({"width": 390, "height": 932})
        await visit(page, base, "#vehicle")
        await open_preferences(page)
        await page.locator("#vehicleType").select_option("Comercial leve")
        await page.locator("#navigationToggle").click()
        await page.set_viewport_size({"width": 1600, "height": 1050})
        await expect(page.locator("#vehicleType")).to_be_visible()
        await expect(page.locator("#vehicleType")).to_have_value("Comercial leve")
        await page.emulate_media(reduced_motion="no-preference")
        await page.keyboard.press("Control+k")
        assert (
            await page.locator("#searchDialog").evaluate(
                "e=>getComputedStyle(e).animationName"
            )
            == "none"
        )
        await page.keyboard.press("Escape")
        await page.locator("#searchTrigger").click()
        assert (
            await page.locator("#searchDialog").evaluate(
                "e=>getComputedStyle(e).animationName"
            )
            == "search-arrive"
        )
        await page.keyboard.press("Escape")
        await page.emulate_media(reduced_motion="reduce")
        await page.locator("#searchTrigger").click()
        assert (
            await page.locator("#searchDialog").evaluate(
                "e=>getComputedStyle(e).animationName"
            )
            == "none"
        )
        await page.keyboard.press("Escape")
        await page.locator("[data-assistant]").click()
        await page.wait_for_url("**/#ia")
        await expect(page.locator("#askInput")).to_be_visible()
        report["preferences"] = (
            "mobile category, reduced motion, keyboard-instant palette and honest unavailable assistant"
        )
        findings = []
        for theme in ("dark", "light", "aurora"):
            await visit(page, base, "#flow?stage=componentes")
            await select_theme(page, theme)
            await page.add_script_tag(
                path=str(ROOT / "node_modules/axe-core/axe.min.js")
            )
            for surface in ("stage", "search"):
                if surface == "search":
                    await page.locator("#searchTrigger").click()
                    await page.locator("#globalSearch").fill("identificação")
                result = await page.evaluate(
                    "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
                )
                findings.extend(
                    {"theme": theme, "surface": surface, "violation": item}
                    for item in result["violations"]
                )
            await page.keyboard.press("Escape")
        assert not findings, json.dumps(findings, ensure_ascii=False)[:14000]
        report["accessibility"] = (
            "six WCAG A/AA checks: stage inspector and search in three palettes"
        )
        assert not errors, errors
        await browser.close()
    (OUT / "verification.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        "PASS: Obsidian responsive matrix, shared catalog search, focus and original expandable flow",
        flush=True,
    )


with TestServer() as base:
    asyncio.run(main(base))
