"""Regressions for neutral selection, unobstructed zoom and aligned system names."""

import asyncio
from browser_support import reference_vehicle_url
import json
from pathlib import Path

from playwright.async_api import async_playwright, expect
from browser_support import TestServer, launch_options, wait_for_route, select_theme

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/vehicle-controls"
OUT.mkdir(parents=True, exist_ok=True)


async def empty_selection(page):
    await expect(page.locator("#vehicleDrawing .aurora-selected")).to_have_count(0)
    await expect(
        page.locator('.aurora-system-card[aria-current="true"]')
    ).to_have_count(0)
    await expect(page.locator(".vehicle-selection-label")).to_have_count(0)
    await expect(page.locator("#vehiclePartSelect")).to_have_value("")
    await expect(page.locator(".aurora-explorer")).to_contain_text(
        "Nenhum sistema selecionado"
    )


async def main(base):
    errors, findings = [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(reduced_motion="reduce")
        page.on("pageerror", lambda error: errors.append(str(error)))
        for width in (1600, 1440, 1024, 768, 430, 390, 375):
            await page.set_viewport_size(
                {"width": width, "height": 1122 if width > 650 else 932}
            )
            for all_systems in (False, True):
                await page.goto(
                    reference_vehicle_url(
                        base + ("#vehicle?all=1" if all_systems else "#vehicle")
                    )
                )
                await wait_for_route(page)
                await empty_selection(page)
                bounds = await page.evaluate("""()=>{
                    const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
                    return {image:box('#vehicleDrawing'),tools:box('.vehicle-drawing-tools'),rail:box('.vehicle-drawing-bar')};
                }""")
                assert bounds["tools"]["top"] >= bounds["image"]["bottom"], (
                    width,
                    bounds,
                )
                assert bounds["tools"]["width"] <= (150 if width <= 650 else 130), (
                    width,
                    bounds,
                )
                assert bounds["tools"]["height"] <= (52 if width <= 650 else 40), (
                    width,
                    bounds,
                )
                assert await page.evaluate(
                    "document.documentElement.scrollWidth<=innerWidth+1"
                )
                cards = await page.locator(".aurora-system-card").evaluate_all("""els=>els.map(e=>{
                    const r=e.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);const t=range.getBoundingClientRect();
                    return {x:r.x,y:r.y,w:r.width,h:r.height,textCenter:t.x+t.width/2,center:r.x+r.width/2};
                })""")
                assert len(cards) == (14 if all_systems else 6)
                assert max(c["w"] for c in cards) - min(c["w"] for c in cards) < 1, (
                    width,
                    cards,
                )
                for c in cards:
                    assert abs(c["textCenter"] - c["center"]) < 1.5, (width, c)
                    assert c["h"] >= 44
                for row in {round(c["y"]) for c in cards}:
                    heights = [c["h"] for c in cards if round(c["y"]) == row]
                    assert max(heights) - min(heights) < 1
                if width <= 650:
                    for r in await page.locator(
                        ".vehicle-drawing-tools button"
                    ).evaluate_all(
                        "els=>els.map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height}})"
                    ):
                        assert r["w"] >= 44 and r["h"] >= 44
                if width in (1600, 390):
                    await page.screenshot(
                        path=str(
                            OUT / f"{'all' if all_systems else 'neutral'}-{width}.png"
                        ),
                        full_page=True,
                    )

        await page.set_viewport_size({"width": 1440, "height": 1000})
        await page.goto(reference_vehicle_url(base + "#vehicle"))
        await wait_for_route(page)
        for part_id in ("peca_08_banco_traseiro", "peca_30_tanque_tubo_combustivel"):
            point = await page.evaluate(
                """id=>{const svg=document.querySelector('#vehicleDrawing'),part=VehicleVector.parts.find(p=>p.id===id),p=svg.createSVGPoint();[p.x,p.y]=part.testPoint;const q=p.matrixTransform(svg.querySelector('#vehicleLayer').getScreenCTM());return {x:q.x,y:q.y}}""",
                part_id,
            )
            await page.mouse.click(**point)
            await wait_for_route(page)
            await expect(page.locator("#vehiclePartSelect")).to_have_value(part_id)
            await expect(
                page.locator('#vehicleDrawing [aria-current="true"]')
            ).to_have_attribute("data-map-part", part_id)
        await expect(page.locator(".vehicle-selection-label")).not_to_contain_text(
            "Banco"
        )
        await page.locator('[data-vehicle-zoom="in"]').click()
        await expect(page.locator("#vehicleImageZoom")).to_have_text("120%")
        await page.locator('[data-vehicle-zoom="reset"]').click()
        await expect(page.locator("#vehicleImageZoom")).to_have_text("100%")
        await page.locator("#vehiclePartSelect").select_option("")
        await wait_for_route(page)
        await empty_selection(page)
        await page.reload()
        await wait_for_route(page)
        await empty_selection(page)
        await page.go_back()
        await wait_for_route(page)
        await expect(page.locator("#vehiclePartSelect")).to_have_value(
            "peca_30_tanque_tubo_combustivel"
        )
        await page.goto(reference_vehicle_url(base + "#vehicle"))
        await wait_for_route(page)
        await page.locator(".aurora-system-card").first.focus()
        await page.keyboard.press("Enter")
        await wait_for_route(page)
        await expect(page.locator(".aurora-explorer h2")).to_have_text(
            "Motor e transmissão"
        )
        for theme in ("dark", "light", "aurora"):
            await page.goto(reference_vehicle_url(base + "#vehicle"))
            await wait_for_route(page)
            await select_theme(page, theme)
            await page.add_script_tag(
                path=str(ROOT / "node_modules/axe-core/axe.min.js")
            )
            result = await page.evaluate(
                "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
            )
            findings.extend(
                {"theme": theme, "violation": v} for v in result["violations"]
            )
        assert not findings, json.dumps(findings, ensure_ascii=False)[:10000]
        assert not errors, errors
        await browser.close()
    (OUT / "verification.json").write_text(
        json.dumps(
            {
                "widths": [1600, 1440, 1024, 768, 430, 390, 375],
                "systems": 14,
                "errors": errors,
                "axeFindings": findings,
            },
            indent=2,
        )
        + "\n"
    )
    print(
        "PASS: no implicit seat selection, click/change/clear/reload/back, zoom outside drawing, equal aligned system columns and accessible controls"
    )


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(main(base))
