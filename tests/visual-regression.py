"""Deterministic Chromium screenshots with reviewed baselines and pixel diff artifacts."""

import asyncio
import base64
import io
import json
import os
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageStat
from playwright.async_api import async_playwright
from browser_support import launch_options, TestServer

ROOT = Path(__file__).resolve().parents[1]
BASELINES = ROOT / "tests/visual-baselines"
OUT = ROOT / "tests/artifacts/visual"
OUT.mkdir(parents=True, exist_ok=True)


def mismatch(expected, actual):
    if expected.size != actual.size:
        return 1.0
    # Blur subpixel text antialiasing; retain misplaced contours and layout shifts.
    delta = ImageChops.difference(
        expected.convert("RGB").filter(ImageFilter.GaussianBlur(1)),
        actual.convert("RGB").filter(ImageFilter.GaussianBlur(1)),
    )
    pixels = list(delta.get_flattened_data())
    return sum(max(p) > 30 for p in pixels) / len(pixels)


async def main(base):
    update = os.environ.get("UPDATE_VISUAL_BASELINES") == "1"
    assert not (update and os.environ.get("CI")), "CI cannot update visual baselines"
    BASELINES.mkdir(exist_ok=True)
    # Ensure this comparator actually rejects a visible geometry regression.
    sample = Image.new("RGB", (100, 100), "white")
    changed = sample.copy()
    changed.paste("red", (20, 20, 80, 80))
    assert mismatch(sample, changed) > 0.01
    cases = [
        ("vehicle-wheel", "vehicle", (1440, 1000), "#vehicleDrawing"),
        ("vehicle-tank", "vehicle", (1440, 1000), "#vehicleDrawing"),
        ("vehicle-batteries", "vehicle", (1440, 1000), "#vehicleDrawing"),
        ("flow-overview", "flow", (1440, 1050), ".homologation-map"),
        ("vehicle-mobile", "vehicle", (390, 844), "#main"),
    ]
    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        for name, route, viewport, selector in cases:
            page = await browser.new_page(
                viewport={"width": viewport[0], "height": viewport[1]},
                reduced_motion="reduce",
                device_scale_factor=1,
            )
            await page.goto(base + "#" + route)
            await page.locator(
                "#vehicleDrawing"
                if route.startswith("vehicle")
                else ".homologation-step"
            ).first.wait_for()
            # Pin OFL-licensed font bytes to avoid platform font substitution.
            faces = []
            for weight, face_name in [(400, "Regular"), (700, "Bold")]:
                font = base64.b64encode(
                    (ROOT / f"tests/fonts/LiberationSans-{face_name}.ttf").read_bytes()
                ).decode()
                faces.append(
                    f"@font-face{{font-family:VisualRegressionSans;font-style:normal;font-weight:{weight};src:url(data:font/ttf;base64,{font}) format('truetype');}}"
                )
            await page.add_style_tag(
                content="".join(faces)
                + "body,button,input,select,svg text {font-family:VisualRegressionSans,sans-serif !important;}"
            )
            await page.evaluate("""async()=>{
                await document.fonts.ready;
                await Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{})}));
                await Promise.all([...document.querySelectorAll('svg image')].map(e=>{
                    const i=new Image();i.src=e.getAttribute('href');return i.decode().catch(()=>{});
                }));
            }""")
            await page.wait_for_load_state("networkidle")
            geometry = {
                "vehicle-wheel": ([131, 860], [40, 760, 220, 980]),
                "vehicle-tank": ([1225, 703], [1110, 500, 1490, 800]),
                "vehicle-batteries": ([932, 549], [570, 500, 1095, 830]),
            }
            target = page.locator(selector)
            await target.wait_for()
            if name in geometry:
                hover, bounds = geometry[name]
                pos = await page.locator("#vehicleDrawing").evaluate(
                    "(svg,xy)=>{const p=svg.createSVGPoint();[p.x,p.y]=xy;const q=p.matrixTransform(svg.querySelector('#vehicleLayer').getScreenCTM());return {x:q.x,y:q.y}}",
                    hover,
                )
                await page.mouse.move(pos["x"], pos["y"])
                clip = await page.locator("#vehicleDrawing").evaluate(
                    "(svg,box)=>{const m=svg.querySelector('#vehicleLayer').getScreenCTM();const p=svg.createSVGPoint();[p.x,p.y]=box;const a=p.matrixTransform(m);[p.x,p.y]=box.slice(2);const b=p.matrixTransform(m);return {x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y}}",
                    bounds,
                )
                raw = await page.screenshot(clip=clip, animations="disabled")
            else:
                raw = await target.screenshot(animations="disabled")
            actual = Image.open(io.BytesIO(raw)).convert("RGB")
            path = BASELINES / (name + ".png")
            if update:
                path.write_bytes(raw)
            assert path.exists(), f"Missing reviewed baseline {path}"
            expected = Image.open(path).convert("RGB")
            if name in geometry:
                # A 2 px displacement of a contour crop must still fail.
                assert mismatch(expected, ImageChops.offset(expected, 2, 0)) > 0.01
            if name == "flow-overview":
                assert mismatch(expected, ImageChops.offset(expected, 8, 0)) > 0.01
            ratio = mismatch(expected, actual)
            results.append({"name": name, "mismatchRatio": ratio})
            (OUT / (name + "-actual.png")).write_bytes(raw)
            if ratio > 0.01 and expected.size == actual.size:
                ImageChops.difference(expected, actual).save(OUT / (name + "-diff.png"))
            await page.close()
        await browser.close()
    (OUT / "results.json").write_text(json.dumps(results, indent=2))
    assert all(r["mismatchRatio"] <= 0.01 for r in results), results
    print(
        "PASS: visual baselines (1% max changed pixels), comparator mutation guard",
        results,
    )


with TestServer() as base:
    asyncio.run(main(base))
