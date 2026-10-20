"""Exercise the supplied 37-part scene through real mouse, touch and keyboard input."""

import asyncio
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import xml.etree.ElementTree as ET

from playwright.async_api import async_playwright, expect
from browser_support import (
    open_preferences,
    select_theme,
    TestServer,
    launch_options,
    wait_for_route,
)

SYSTEMS = {
    "bancos",
    "motor",
    "tanque",
    "freios",
    "chassi",
    "vidros",
    "iluminacao",
    "carroceria",
    "retrovisores",
    "pneus-rodas",
    "eletrica",
    "escapamento",
    "bateria",
    "identificacao",
}
ELECTRIC_PARTS = {
    "peca_25_motor_eletrico_inversor_cabos": "bateria",
    "peca_26_bateria_tracao": "bateria",
    "peca_27_bateria_12v": "eletrica",
    "peca_28_chicote_eletrico": "eletrica",
}
CAPTURED_SCENES = set()


def query(page):
    return {
        key: values[0]
        for key, values in parse_qs(
            urlparse(page.url).fragment.partition("?")[2]
        ).items()
    }


async def screen_point(page, xy):
    # An exploded part's bounding-box center can lie in a hole or another part.
    return await page.locator("#vehicleDrawing").evaluate(
        """(svg,xy)=>{
        const p=svg.createSVGPoint();[p.x,p.y]=xy;
        const q=p.matrixTransform(svg.querySelector('#vehicleLayer').getScreenCTM());
        return{x:q.x,y:q.y};
    }""",
        xy,
    )


async def hit(page, xy):
    point = await screen_point(page, xy)
    return await page.evaluate(
        """p=>{
        const link=document.elementFromPoint(p.x,p.y)?.closest('#vehicleDrawing [data-map-part]');
        return link?{id:link.dataset.mapPart,componentId:link.dataset.componentLink}:null;
    }""",
        point,
    )


async def overview(page, value="#vehicle?all=1"):
    await page.goto(BASE + value)
    await wait_for_route(page)
    await page.locator("#vehicleDrawing").wait_for()


async def assert_selection(page, part):
    await wait_for_route(page)
    params = query(page)
    assert params.get("focus") == part["componentId"], (part, params)
    assert params.get("part") == part["id"], (part, params)
    assert "component" not in params, params
    await expect(page.locator(".aurora-explorer h2")).to_have_text(part["systemLabel"])
    await expect(page.locator(".vehicle-part-name")).to_have_text(part["label"])
    await expect(page.locator("#vehicleDrawing .aurora-selected")).to_have_attribute(
        "data-map-part", part["id"]
    )
    assert (
        query_from_href(await page.locator(".aurora-primary").get_attribute("href"))[
            "part"
        ]
        == part["id"]
    )
    scene = {
        (1440, "peca_27_bateria_12v"): "vehicle-law-desktop-12v.png",
        (1440, "peca_21_porta_dianteira"): "vehicle-law-desktop-porta.png",
        (390, "peca_09_bancos_dianteiros_console"): "vehicle-law-mobile-bancos.png",
    }.get((page.viewport_size["width"], part["id"]))
    if scene and scene not in CAPTURED_SCENES:
        artifacts = Path(__file__).resolve().parent / "artifacts"
        artifacts.mkdir(exist_ok=True)
        await page.screenshot(path=str(artifacts / scene), full_page=True)
        CAPTURED_SCENES.add(scene)


def query_from_href(href):
    return {key: values[0] for key, values in parse_qs(href.partition("?")[2]).items()}


async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1440, "height": 1100}, reduced_motion="reduce"
        )
        page.on("pageerror", lambda error: errors.append(str(error)))
        await overview(page)
        parts = await page.evaluate("""()=>VehicleVector.parts.map(p=>({
            id:p.id,label:p.label,componentId:p.componentId,testPoint:p.testPoint,asset:p.asset,
            displayAsset:p.displayAsset,
            systemLabel:ComponentFlow.component(p.componentId).label
        }))""")
        assert len(parts) == 37
        assert len({part["id"] for part in parts}) == 37
        assert await page.evaluate("VehicleVector===vehicleVector")
        assert set(await page.evaluate("vehicleComponents.map(c=>c.id)")) == SYSTEMS
        assert {part["componentId"] for part in parts} == SYSTEMS - {"identificacao"}
        await expect(page.locator(".aurora-system-card")).to_have_count(14)
        await expect(page.locator("#vehicleDrawing")).to_have_attribute(
            "viewBox", "0 0 1536 1024"
        )
        await expect(page.locator("#vehicleDrawing image")).to_have_attribute(
            "href", await page.evaluate("VehicleVector.displayAsset")
        )
        await expect(page.locator("#vehicleDrawing [data-map-part]")).to_have_count(37)
        await expect(
            page.locator("#vehicleDrawing rect, #vehicleDrawing text")
        ).to_have_count(0)

        # Keep every exact-source SVG, with no embedded images or remote resources.
        for asset in ["assets/vehicle-vector/vehicle.svg"] + [
            part["asset"] for part in parts
        ]:
            response = await page.request.get(BASE + asset)
            assert response.ok, asset
            svg = ET.fromstring(await response.body())
            assert svg.tag == "{http://www.w3.org/2000/svg}svg", asset
            assert svg.findall(".//{http://www.w3.org/2000/svg}path"), asset
            assert not svg.findall(".//{http://www.w3.org/2000/svg}image"), asset

        # Faithful WebP derivatives paint quickly while the vector contours own clicks.
        previews = [await page.evaluate("VehicleVector.displayAsset")] + [
            part["displayAsset"] for part in parts
        ]
        assert len(set(previews)) == 38
        for index, asset in enumerate(previews):
            assert asset.startswith("assets/vehicle-vector/previews/")
            assert asset.endswith(".webp")
            response = await page.request.get(BASE + asset)
            assert response.ok, asset
            content = await response.body()
            assert content[:4] == b"RIFF" and content[8:12] == b"WEBP", asset
            dimensions = await page.evaluate(
                """async url=>{
                    const response=await fetch(url);
                    const bitmap=await createImageBitmap(await response.blob());
                    const dimensions={width:bitmap.width,height:bitmap.height};
                    bitmap.close();return dimensions;
                }""",
                BASE + asset,
            )
            assert dimensions["width"] > 0 and dimensions["height"] > 0, asset
            if index == 0:
                assert dimensions["width"] * 2 == dimensions["height"] * 3
                assert dimensions["width"] >= 1536

        # Every supplied safe point resolves to its exact physical part at both sizes.
        for width in [1440, 390]:
            await page.set_viewport_size(
                {"width": width, "height": 1100 if width == 1440 else 844}
            )
            await overview(page)
            for part in parts:
                actual = await hit(page, part["testPoint"])
                assert actual == {
                    "id": part["id"],
                    "componentId": part["componentId"],
                }, (width, part, actual)
                await page.mouse.click(**await screen_point(page, part["testPoint"]))
                await assert_selection(page, part)
                # Zoom is anchored to the selected part, including pieces at image edges.
                for zoom in [120, 240]:
                    steps = 1 if zoom == 120 else 6
                    await page.locator('[data-vehicle-zoom="in"]').focus()
                    for _ in range(steps):
                        await page.keyboard.press("Enter")
                    await expect(page.locator("#vehicleImageZoom")).to_have_text(
                        f"{zoom}%"
                    )
                    actual = await hit(page, part["testPoint"])
                    assert actual == {
                        "id": part["id"],
                        "componentId": part["componentId"],
                    }, (
                        width,
                        zoom,
                        part,
                        actual,
                    )
                await page.locator('[data-vehicle-zoom="reset"]').click()
                await expect(page.locator("#vehicleImageZoom")).to_have_text("100%")
            assert await page.evaluate(
                "document.documentElement.scrollWidth<=innerWidth"
            ), width
            print(
                f"Checked all 37 vector targets and zoom levels at {width}px.",
                flush=True,
            )
            # Margins and the former external inset area have no synthetic hotspot.
            saved = page.url
            for xy in [[20, 20], [130, 150], [1510, 1000]]:
                assert await hit(page, xy) is None, (width, xy)
                await page.mouse.click(**await screen_point(page, xy))
                assert page.url == saved

        await page.set_viewport_size({"width": 1440, "height": 1100})
        # The 12 V electrical network and high-voltage propulsion use distinct stable routes.
        for part_id, component in ELECTRIC_PARTS.items():
            part = next(item for item in parts if item["id"] == part_id)
            assert part["componentId"] == component
            await overview(
                page,
                "#vehicle?focus="
                + component
                + "&part="
                + part_id
                + "&type=Comercial+leve&powertrain=El%C3%A9trico&all=1",
            )
            await assert_selection(page, part)
            await page.locator(".aurora-primary").click()
            await wait_for_route(page)
            await expect(page.locator("#main h1")).to_have_text(part["label"])
            for key, value in {
                "component": component,
                "part": part_id,
                "type": "Comercial leve",
                "powertrain": "Elétrico",
                "all": "1",
            }.items():
                assert query(page)[key] == value, (part_id, key, query(page))
            saved = page.url
            await page.reload()
            await wait_for_route(page)
            assert page.url == saved
            await page.locator("[data-vehicle-back]").click()
            await assert_selection(page, part)
            assert query(page)["type"] == "Comercial leve"
            assert query(page)["powertrain"] == "Elétrico"
            await page.go_back()
            await wait_for_route(page)
            assert query(page)["component"] == component
            assert query(page)["part"] == part_id

        # Existing component URLs keep their original meaning, including text-only identification.
        for system in sorted(SYSTEMS):
            await page.goto(BASE + "#vehicle?component=" + system)
            await wait_for_route(page)
            await expect(page.locator(".component-graph")).to_have_count(1)
            assert query(page)["component"] == system
        await overview(page)
        await expect(
            page.locator('#vehicleDrawing [data-component-link="identificacao"]')
        ).to_have_count(0)
        await page.locator(
            '.aurora-system-card[data-aurora-component="identificacao"]'
        ).focus()
        await page.keyboard.press("Enter")
        await expect(page.locator(".aurora-explorer h2")).to_have_text(
            "Identificação e marcações"
        )
        await page.locator(".aurora-primary").click()
        await wait_for_route(page)
        assert query(page)["component"] == "identificacao"

        # Selection never leaves a permanent fill after the pointer or keyboard focus moves away.
        selected = next(
            part for part in parts if part["id"] == "peca_09_bancos_dianteiros_console"
        )
        for theme in ["dark", "light", "aurora"]:
            await overview(page, "#vehicle?focus=bancos&part=" + selected["id"])
            await select_theme(page, theme)
            path = page.locator("#" + selected["id"] + " path")
            await page.mouse.move(0, 0)
            assert (
                await path.evaluate("e=>getComputedStyle(e).fill") == "rgba(0, 0, 0, 0)"
            )
            await page.mouse.move(**await screen_point(page, selected["testPoint"]))
            assert (
                await path.evaluate("e=>getComputedStyle(e).fill") != "rgba(0, 0, 0, 0)"
            )
            await expect(page.locator("#componentHover")).to_contain_text(
                selected["label"]
            )
            await page.mouse.move(0, 0)
            assert (
                await path.evaluate("e=>getComputedStyle(e).fill") == "rgba(0, 0, 0, 0)"
            )
            await page.locator("#" + selected["id"]).focus()
            await page.keyboard.press("Enter")
            await assert_selection(page, selected)
            await open_preferences(page)
            await page.get_by_label("Tema", exact=True).focus()
            await page.mouse.move(0, 0)
            assert (
                await path.evaluate("e=>getComputedStyle(e).fill") == "rgba(0, 0, 0, 0)"
            )

        touch = await browser.new_page(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
            reduced_motion="reduce",
        )
        touch.on("pageerror", lambda error: errors.append(str(error)))
        await overview(touch)
        for part_id in ELECTRIC_PARTS:
            part = next(item for item in parts if item["id"] == part_id)
            point = await screen_point(touch, part["testPoint"])
            await touch.touchscreen.tap(point["x"], point["y"])
            await assert_selection(touch, part)
        await touch.close()
        # The exact same 37 selections are available as a native textual control.
        await page.set_viewport_size({"width": 390, "height": 844})
        await overview(page)
        selector = page.get_by_label("Selecionar conjunto", exact=True)
        options = await selector.locator("option[value]").evaluate_all(
            "els=>els.map(e=>({value:e.value,label:e.textContent})).filter(e=>e.value)"
        )
        assert {option["value"] for option in options} == {part["id"] for part in parts}
        assert {option["value"]: option["label"] for option in options} == {
            part["id"]: part["label"] for part in parts
        }
        for part in parts:
            await selector.select_option(part["id"])
            await assert_selection(page, part)
            await expect(selector).to_have_value(part["id"])
            await expect(selector).to_be_focused()
        await selector.press("Home")
        await selector.press("ArrowDown")
        first_option = next(part for part in parts if part["id"] == options[0]["value"])
        await assert_selection(page, first_option)
        await expect(selector).to_have_value(first_option["id"])
        await expect(selector).to_be_focused()
        assert not errors, errors
        await browser.close()
    print(
        "PASS: 37 exact vector targets at desktop/mobile and 100/120/240% zoom, blank gaps, vector assets, distinct 12 V/HV routes, part context/reload/back, 14 stable systems, themes/hover, keyboard and touch."
    )


with TestServer() as BASE:
    asyncio.run(main())
