"""Exercise real palette changes, persistence, map states and blocked storage."""

import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright, expect
from browser_support import launch_options, wait_for_route

BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"
ROOT = Path(__file__).resolve().parents[1]
KEY = "legislacao-automotiva.theme"
PALETTES = {
    "dark": ("rgb(5, 6, 7)", "rgb(17, 19, 21)"),
    "light": ("rgb(244, 246, 248)", "rgb(255, 255, 255)"),
    "aurora": ("rgb(8, 15, 25)", "rgb(21, 30, 41)"),
}


async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        context = await browser.new_context(
            viewport={"width": 1440, "height": 1000}, reduced_motion="reduce"
        )
        page = await context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(BASE + "#vehicle?focus=bancos")
        await wait_for_route(page)
        picker = page.get_by_label("Tema", exact=True)
        await expect(picker).to_have_value("dark")
        # The control is keyboard operable and does not replace the current view.
        await picker.focus()
        await page.keyboard.press("ArrowDown")
        await page.keyboard.press("Enter")
        await expect(picker).to_have_value("light")
        await page.locator("[data-vehicle-zoom=in]").click()
        zoom = await page.locator("#vehicleImageZoom").inner_text()
        selected_url = page.url
        for theme in PALETTES:
            await picker.select_option(theme)
            assert page.url == selected_url
            await expect(page.locator("#vehicleImageZoom")).to_have_text(zoom)
            await expect(page.locator(".aurora-explorer h2")).to_have_text(
                "Bancos e ocupantes"
            )
        await page.locator("[data-vehicle-zoom=reset]").click()

        for theme, (background, surface) in PALETTES.items():
            await picker.select_option(theme)
            assert (
                await page.evaluate("getComputedStyle(document.body).backgroundColor")
                == background
            )
            assert await page.evaluate("key=>localStorage.getItem(key)", KEY) == theme
            # Both UI colors and nested content must change, not just the root attribute.
            for route in [
                "vehicle?focus=bancos",
                "flow?stage=coastdown",
                "tree",
                "library",
                "markings",
                "inmetro?record=inmetro-145-2022",
            ]:
                await page.goto(BASE + "#" + route)
                await wait_for_route(page)
                await expect(picker).to_have_value(theme)
                assert (
                    await page.evaluate(
                        "getComputedStyle(document.body).backgroundColor"
                    )
                    == background
                )
                assert (
                    await picker.evaluate("e=>getComputedStyle(e).backgroundColor")
                    == surface
                )
                assert await page.evaluate(
                    "document.documentElement.scrollWidth<=innerWidth"
                ), (theme, route)
            await page.goto(BASE + "#vehicle?focus=bancos")
            await wait_for_route(page)
            seat = page.locator('#vehicleDrawing [data-component-link="bancos"] path')
            assert (
                await seat.evaluate("e=>getComputedStyle(e).fill") == "rgba(0, 0, 0, 0)"
            )
            point = await page.locator("#vehicleDrawing").evaluate("""svg=>{
                const p=svg.createSVGPoint();p.x=750;p.y=350;
                const q=p.matrixTransform(svg.querySelector('#vehicleLayer').getScreenCTM());
                return{x:q.x,y:q.y};
            }""")
            await page.mouse.move(**point)
            assert (
                await seat.evaluate("e=>getComputedStyle(e).stroke")
                == "rgb(163, 69, 8)"
            )
            await page.mouse.move(10, 10)
            assert (
                await seat.evaluate("e=>getComputedStyle(e).fill") == "rgba(0, 0, 0, 0)"
            )
            await page.reload()
            await wait_for_route(page)
            await expect(picker).to_have_value(theme)
            assert (
                await page.evaluate("getComputedStyle(document.body).backgroundColor")
                == background
            )
            await page.screenshot(
                path=str(ROOT / f"tests/artifacts/theme-{theme}.png"), full_page=True
            )

        # A second tab follows a preference change without a reload.
        other = await context.new_page()
        await other.goto(BASE + "#library")
        await wait_for_route(other)
        await picker.select_option("light")
        await expect(other.get_by_label("Tema", exact=True)).to_have_value("light")
        await other.close()

        for width in [320, 390, 860]:
            await page.set_viewport_size({"width": width, "height": 844})
            for theme in PALETTES:
                await picker.select_option(theme)
                await expect(picker).to_be_visible()
                assert await page.evaluate(
                    "document.documentElement.scrollWidth<=innerWidth"
                ), (theme, width)
                assert (
                    await page.locator("#globalSearch").evaluate(
                        "e=>e.getBoundingClientRect().width"
                    )
                    > 90
                )

        # Invalid persisted values fall back before the application starts.
        await page.evaluate("key=>localStorage.setItem(key,'unknown-theme')", KEY)
        await page.reload()
        await wait_for_route(page)
        await expect(picker).to_have_value("dark")
        await context.close()

        blocked = await browser.new_context()
        await blocked.add_init_script("""Object.defineProperty(window,'localStorage',{
            get(){throw new DOMException('Blocked','SecurityError')}
        });""")
        page = await blocked.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(BASE + "#vehicle")
        await wait_for_route(page)
        await page.get_by_label("Tema", exact=True).select_option("light")
        await page.goto(BASE + "#flow")
        await wait_for_route(page)
        await expect(page.get_by_label("Tema", exact=True)).to_have_value("light")
        assert not errors, errors
        await blocked.close()
        await browser.close()
    print(
        "PASS: three real palettes, keyboard/mobile, saved preference, cross-tab sync, preserved route/zoom/selection, transient hover, invalid and blocked storage."
    )


asyncio.run(main())
