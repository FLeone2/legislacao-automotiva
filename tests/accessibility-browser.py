"""Run real axe checks and keyboard/mobile navigation regression checks."""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_support import launch_options, TestServer

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts"
OUT.mkdir(exist_ok=True)


async def main(base):
    findings = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1440, "height": 1000}, reduced_motion="reduce"
        )
        routes = [
            ("vehicle", "#vehicleDrawing"),
            ("vehicle?component=tanque", ".component-graph"),
            ("vehicle?component=bancos", ".component-graph"),
            ("tree", ".graph-node"),
            ("mover", ".graph-node"),
            ("flow", ".homologation-step"),
            ("contran", ".contran-record"),
            ("proconve", ".contran-record"),
            ("anatel", ".contran-record"),
            ("updates", ".update-card"),
            ("flow?stage=coastdown", "#flowDetailPanel"),
            ("library", ".document"),
            ("inmetro?record=inmetro-145-2022", ".contran-record"),
            ("markings", "#markings-vin"),
        ]
        for route, ready in routes:
            await page.goto(base + "#" + route)
            await page.locator(ready).first.wait_for()
            await page.add_script_tag(
                path=str(ROOT / "node_modules/axe-core/axe.min.js")
            )
            result = await page.evaluate(
                "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
            )
            for violation in result["violations"]:
                findings.append(
                    {
                        "route": route,
                        "id": violation["id"],
                        "impact": violation["impact"],
                        "nodes": [
                            {"target": n["target"], "summary": n["failureSummary"]}
                            for n in violation["nodes"]
                        ],
                    }
                )
        await page.goto(base + "#vehicle")
        await page.locator("#vehicleDrawing").wait_for()
        await page.keyboard.press("Tab")
        assert await page.locator(".skip-link").evaluate(
            "e=>e===document.activeElement"
        )
        await page.keyboard.press("Enter")
        assert await page.locator("#main").evaluate("e=>e===document.activeElement")
        assert "#vehicle" in page.url
        await page.set_viewport_size({"width": 390, "height": 844})
        toggle = page.locator("#navigationToggle")
        await toggle.focus()
        await page.keyboard.press("Enter")
        assert await toggle.get_attribute("aria-expanded") == "true"
        await page.locator('.main-nav [data-nav="flow"]').click()
        await page.locator(".homologation-step").first.wait_for()
        assert await toggle.get_attribute("aria-expanded") == "false"
        assert (
            await page.locator('[data-nav="flow"]').get_attribute("aria-current")
            == "page"
        )
        assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        await toggle.click()
        await page.keyboard.press("Escape")
        assert await toggle.get_attribute("aria-expanded") == "false"
        await page.add_script_tag(path=str(ROOT / "node_modules/axe-core/axe.min.js"))
        result = await page.evaluate(
            "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
        )
        findings.extend(
            {
                "route": "flow-mobile",
                "id": v["id"],
                "impact": v["impact"],
                "nodes": v["nodes"],
            }
            for v in result["violations"]
        )
        await browser.close()
    (OUT / "accessibility.json").write_text(
        json.dumps(findings, ensure_ascii=False, indent=2)
    )
    assert not findings, json.dumps(findings, ensure_ascii=False)[:14000]
    print(
        "PASS: axe WCAG A/AA, skip link, keyboard, grouped mobile navigation, Escape and active route"
    )


with TestServer() as base:
    asyncio.run(main(base))
