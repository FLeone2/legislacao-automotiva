"""Check actual WebGL backing resolution and selection through canvas resizing."""

import asyncio
import json
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright
from browser_support import TestServer, launch_options


async def ready(page):
    await page.locator('.g3d[data-model="bmw-x5-g05"][data-g3d-ready="true"]').wait_for(
        timeout=90_000
    )
    assert await page.locator(".g3d-fallback").count() == 0


async def buffer(page):
    return await page.locator(".g3d canvas").evaluate("""canvas => {
        const gl = canvas.getContext('webgl2');
        return {
            width: canvas.width, height: canvas.height,
            cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight,
            drawingWidth: gl.drawingBufferWidth, drawingHeight: gl.drawingBufferHeight,
            maximum: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            lost: gl.isContextLost(),
            dpr: devicePixelRatio, memory: navigator.deviceMemory,
        };
    }""")


def check_buffer(actual, budget):
    assert not actual["lost"], actual
    assert actual["width"] > 0 and actual["height"] > 0, actual
    assert actual["width"] == actual["drawingWidth"], actual
    assert actual["height"] == actual["drawingHeight"], actual
    assert actual["width"] * actual["height"] <= budget, actual
    assert max(actual["width"], actual["height"]) <= actual["maximum"], actual


async def exercise(base):
    errors, results = [], {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        try:
            desktop = await browser.new_context(
                viewport={"width": 1440, "height": 1050},
                device_scale_factor=2,
                reduced_motion="reduce",
            )
            try:
                await desktop.add_init_script(
                    "Object.defineProperty(navigator,'deviceMemory',{get:()=>8});"
                )
                page = await desktop.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                await page.goto(base + "#guide")
                await ready(page)
                actual = await buffer(page)
                check_buffer(actual, 4_000_000)
                assert actual["dpr"] == 2 and actual["memory"] == 8, actual
                assert abs(actual["width"] - actual["cssWidth"] * 2) <= 1, actual
                assert abs(actual["height"] - actual["cssHeight"] * 2) <= 1, actual
                results["desktopNative"] = actual

                subsystem = "propulsao/componentes"
                await page.get_by_label("Buscar componente", exact=True).fill(subsystem)
                selection = page.locator(
                    f'.g-parts-tree button[data-subsystem="{subsystem}"]'
                )
                await selection.click()
                await page.wait_for_function(
                    """id => {
                        const canvas = document.querySelector('.g3d canvas');
                        return canvas?.dataset.subsystem === id &&
                            Number(canvas.dataset.highlightedMeshes) > 0;
                    }""",
                    arg=subsystem,
                )
                selected_url = page.url
                route = parse_qs(urlparse(selected_url).fragment.partition("?")[2])
                assert route["subsystem"] == [subsystem]
                assert route["part"] == ["engine"]
                selected_title = await page.locator(
                    ".g-inspector-title h2"
                ).inner_text()
                await page.get_by_label("Vista explodida", exact=True).check()

                # Exercise an ultrawide embedding beyond the normal page max-width.
                # Only CSS layout changes: resolution is read from the real WebGL buffer.
                await page.add_style_tag(
                    content="#app.guide-mode, #app.guide-mode .body-layout {max-width:none;}"
                )
                await page.set_viewport_size({"width": 3200, "height": 1400})
                await page.wait_for_function(
                    """previousWidth => {
                        const canvas = document.querySelector('.g3d canvas');
                        return canvas && canvas.clientWidth * canvas.clientHeight * 4 > 4000000 &&
                            canvas.width * canvas.height <= 4000000 &&
                            canvas.width !== previousWidth;
                    }""",
                    arg=actual["width"],
                )
                actual = await buffer(page)
                check_buffer(actual, 4_000_000)
                assert actual["cssWidth"] * actual["cssHeight"] * 4 > 4_000_000, actual
                # Use the pixel budget, unless the device's real GL limit is smaller.
                if actual["maximum"] >= 4096:
                    assert actual["width"] * actual["height"] > 3_980_000, actual
                else:
                    assert (
                        max(actual["width"], actual["height"]) >= actual["maximum"] - 1
                    )
                assert page.url == selected_url
                assert await selection.get_attribute("aria-pressed") == "true"
                assert (
                    await page.locator(".g-selection-origin code").inner_text()
                    == subsystem
                )
                assert (
                    await page.locator(".g-inspector-title h2").inner_text()
                    == selected_title
                )
                assert (
                    await page.locator(".g3d canvas").get_attribute("data-subsystem")
                    == subsystem
                )
                assert (
                    await page.locator(".g3d canvas").get_attribute(
                        "data-highlighted-assemblies"
                    )
                    == "engine"
                )
                assert (
                    int(
                        await page.locator(".g3d canvas").get_attribute(
                            "data-highlighted-meshes"
                        )
                    )
                    > 0
                )
                await ready(page)
                results["desktopCapped"] = actual
            finally:
                await desktop.close()

            mobile = await browser.new_context(
                viewport={"width": 390, "height": 844},
                device_scale_factor=3,
                is_mobile=True,
                has_touch=True,
                reduced_motion="reduce",
            )
            try:
                await mobile.add_init_script(
                    "Object.defineProperty(navigator,'deviceMemory',{get:()=>2});"
                )
                page = await mobile.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                await page.goto(base + "#guide")
                await ready(page)
                actual = await buffer(page)
                check_buffer(actual, 2_000_000)
                assert actual["dpr"] == 3 and actual["memory"] == 2, actual
                assert actual["width"] <= actual["cssWidth"] * 2, actual
                assert actual["height"] <= actual["cssHeight"] * 2, actual
                assert abs(actual["width"] - actual["cssWidth"] * 2) <= 1, actual
                assert abs(actual["height"] - actual["cssHeight"] * 2) <= 1, actual
                results["mobileLimited"] = actual
            finally:
                await mobile.close()
        finally:
            await browser.close()
    assert not errors, errors
    print(
        "PASS: native desktop definition, actual 4 MP resize budget, preserved selection/URL, "
        "2 GB mobile density/budget and no WebGL fallback or JavaScript errors. "
        + json.dumps(results)
    )


if __name__ == "__main__":
    with TestServer() as test_base:
        asyncio.run(exercise(test_base))
