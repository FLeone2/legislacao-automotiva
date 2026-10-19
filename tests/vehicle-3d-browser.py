import asyncio, io, os
from PIL import Image, ImageStat
from playwright.async_api import async_playwright, expect
from browser_support import launch_options

BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"


async def ready(page):
    await page.locator(".model-stage.is-ready").wait_for()
    await page.wait_for_timeout(400)


async def find_parts(page):
    box = await page.locator("#vehicleModel").bounding_box()
    found = {}
    for gx in range(10, 92, 6):
        for gy in range(18, 84, 6):
            x, y = (
                box["x"] + box["width"] * gx / 100,
                box["y"] + box["height"] * gy / 100,
            )
            await page.mouse.move(x, y)
            label = await page.evaluate(
                "(()=>{const t=document.querySelector('.model-tooltip');return t.hidden?null:t.textContent})()"
            )
            if label:
                found.setdefault(label, (x, y))
    return found


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1440, "height": 1000}, reduced_motion="reduce"
        )
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(BASE + "#vehicle")
        await ready(page)
        await expect(
            page.locator(".vehicle-mode-switch [aria-current=true]")
        ).to_have_text("Modelo 3D")
        assert not await page.locator("#vehicleDrawing").count()
        pixels = Image.open(
            io.BytesIO(await page.locator("#vehicleModel").screenshot())
        ).convert("L")
        assert ImageStat.Stat(pixels).stddev[0] > 8, "3D canvas rendered blank"

        # The part list shares routes with the model and keeps keyboard focus.
        await expect(page.locator("[data-model-part]")).to_have_count(14)
        await page.locator('[data-model-part="freios"]').click()
        await expect(page.locator(".aurora-explorer h2")).to_have_text(
            "Freios e estabilidade"
        )
        assert "focus=freios" in page.url
        assert (
            await page.evaluate("document.activeElement.dataset.modelPart") == "freios"
        )
        await expect(page.locator('[data-model-part="freios"]')).to_have_attribute(
            "aria-current", "true"
        )
        await expect(page.locator("[data-model-callout] strong")).to_have_text(
            "Freios e estabilidade"
        )

        # Pointer hover names parts and a click selects the part under the cursor.
        found = await find_parts(page)
        assert len(found) >= 6, found
        label, (x, y) = next(
            (k, v) for k, v in found.items() if k != "Freios e estabilidade"
        )
        await page.mouse.click(x, y)
        await expect(page.locator(".aurora-explorer h2")).to_have_text(label)
        assert await page.evaluate("document.activeElement.id") == "vehicleModel"

        # Controls: exploded view, x-ray, camera presets and keyboard orbit.
        explode = page.locator("[data-model-explode]")
        await explode.fill("0")
        await expect(page.locator(".model-explode output")).to_have_text("Montado")
        await explode.fill("80")
        await expect(page.locator(".model-explode output")).to_have_text("80%")
        await page.locator("[data-model-xray]").click()
        await expect(page.locator("[data-model-xray]")).to_have_attribute(
            "aria-pressed", "true"
        )
        for view in ("lateral", "frente", "topo", "perspectiva"):
            await page.locator(f'[data-model-view="{view}"]').click()
        await page.locator("[data-model-zoom=in]").click()
        await page.locator("[data-model-zoom=reset]").click()
        await page.locator("#vehicleModel").focus()
        for key in ("ArrowLeft", "ArrowUp", "+", "-", "0"):
            await page.keyboard.press(key)
        selected = page.url.split("focus=")[1].split("&")[0]
        await page.keyboard.press("Enter")
        await page.locator(".component-graph").wait_for()
        assert "component=" + selected in page.url

        # Back to the overview keeps the model; the illustration is a remembered choice.
        await page.go_back()
        await ready(page)
        await page.locator(".vehicle-mode-switch a", has_text="Ilustração").click()
        await page.locator("#vehicleDrawing").wait_for()
        await page.goto(BASE + "#vehicle?focus=motor")
        await page.locator("#vehicleDrawing").wait_for()
        # Illustration: wheel zoom at the cursor and drag panning without navigation.
        drawing = await page.locator("#vehicleDrawing").bounding_box()
        cx, cy = (
            drawing["x"] + drawing["width"] * 0.3,
            drawing["y"] + drawing["height"] * 0.4,
        )
        await page.mouse.move(cx, cy)
        await page.mouse.wheel(0, -400)
        zoom = int((await page.locator("#vehicleImageZoom").inner_text()).rstrip("%"))
        assert zoom > 100, zoom
        url = page.url
        before = await page.locator("#vehicleLayer").get_attribute("transform")
        await page.mouse.down()
        await page.mouse.move(cx + 120, cy + 60, steps=6)
        await page.mouse.up()
        assert await page.locator("#vehicleLayer").get_attribute("transform") != before
        assert page.url == url
        await page.locator("[data-vehicle-zoom=reset]").click()
        await expect(page.locator("#vehicleImageZoom")).to_have_text("100%")
        await page.locator(".vehicle-mode-switch a", has_text="Modelo 3D").click()
        await ready(page)

        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(BASE + "#vehicle?focus=bancos&vista=3d")
        await ready(page)
        assert not await page.evaluate(
            "document.documentElement.scrollWidth>innerWidth"
        )
        assert not errors, errors

        # Without WebGL the illustration is used automatically.
        context = await browser.new_context()
        await context.add_init_script(
            "HTMLCanvasElement.prototype.getContext=function(){return null}"
        )
        fallback = await context.new_page()
        await fallback.goto(BASE + "#vehicle")
        await fallback.locator("#vehicleDrawing").wait_for()
        await context.close()
        await browser.close()
    print(
        "PASS: 3D model renders, parts selectable by pointer, list and keyboard, exploded view, x-ray, camera presets, remembered view, mobile and WebGL fallback."
    )


asyncio.run(main())
