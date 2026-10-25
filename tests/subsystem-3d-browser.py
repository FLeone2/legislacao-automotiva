"""Verify every original 2D subsystem has a real, selectable 3D navigation path."""

import asyncio
import json
import subprocess
from pathlib import Path
from urllib.parse import parse_qs

from playwright.async_api import async_playwright
from browser_support import TestServer, launch_options, select_theme

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/subsystem-3d"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = json.loads(
    subprocess.check_output(
        [
            "node",
            "-e",
            "const c=require('./src/guide/subsystem-coverage.js');"
            "const catalog=require('./catalog.json');"
            "console.log(JSON.stringify({rows:c.ALL_SUBSYSTEMS,report:c.coverageReport(),"
            "selections:Object.fromEntries(c.ALL_SUBSYSTEMS.map(r=>[r.id,c.subsystemSelection(r.id)])),"
            "original:catalog.metadata.hierarchy.filter(g=>g.physical).flatMap(g=>g.children)}));",
        ],
        cwd=ROOT,
        text=True,
    )
)
ROWS = {row["id"]: row for row in SOURCE["rows"]}
MAPPING = json.loads((ROOT / "data/vehicle-legislation/reviewed-map.json").read_text())


def route_values(page):
    return parse_qs(page.url.partition("?")[2])


async def ready(page):
    await page.locator('.g3d[data-g3d-ready="true"]').wait_for(timeout=90_000)


async def trace_ready(page):
    await page.wait_for_function(
        "() => !document.querySelector('.g-trace-relations [role=status]')"
    )


async def select_subsystem(page, subsystem_id):
    row = ROWS[subsystem_id]
    await page.get_by_label("Buscar componente", exact=True).fill(subsystem_id)
    button = page.locator(f'.g-parts-tree button[data-subsystem="{subsystem_id}"]')
    await button.click()
    values = route_values(page)
    assert values["subsystem"] == [subsystem_id]
    assert values["part"] == [row["assemblyId"]]
    assert values["tree"] == ["subsystems"]
    assert await button.get_attribute("aria-pressed") == "true"
    assert await page.locator(".g-inspector-title h2").inner_text() == row["label"]
    assert await page.locator(".g-selection-origin code").inner_text() == subsystem_id
    await page.wait_for_function(
        """id => {
          const canvas=document.querySelector('.g3d canvas');
          return canvas?.dataset.subsystem===id && Number(canvas.dataset.highlightedMeshes)>0;
        }""",
        arg=subsystem_id,
    )
    canvas = page.locator(".g3d canvas")
    actual = set((await canvas.get_attribute("data-highlighted-assemblies")).split(","))
    assert actual == set(row["assemblyIds"]), (subsystem_id, actual, row["assemblyIds"])
    callout = page.locator(f'.g3d-subsystem-callout[data-subsystem="{subsystem_id}"]')
    await callout.wait_for(state="visible")
    assert await callout.inner_text() == row["label"]
    await trace_ready(page)
    return {
        "id": subsystem_id,
        "assemblies": sorted(actual),
        "highlightedMeshes": int(await canvas.get_attribute("data-highlighted-meshes")),
    }


async def exercise(base):
    assert len(SOURCE["original"]) == 30
    assert len(ROWS) == 33
    original_ids = {row["id"] for row in SOURCE["original"]}
    assert {row["id"] for row in SOURCE["rows"] if row["canonical"]} == original_ids
    assert len(set(ROWS) - original_ids) == 3
    assert SOURCE["report"]["covered"] == 30
    assert SOURCE["report"]["missing"] == []
    assert SOURCE["report"]["complete"] is True
    for row in SOURCE["rows"]:
        assert (ROOT / row["referenceAsset"]).is_file(), row["id"]
    errors, checked, findings, responses = [], [], [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        context = await browser.new_context(
            viewport={"width": 1600, "height": 1100}, reduced_motion="reduce"
        )
        context.on("response", lambda response: responses.append(response))
        page = await context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(base + "#guide")
        await ready(page)
        assert (
            await page.locator(".g-parts-tree").get_attribute("data-tree-mode")
            == "subsystems"
        )
        assert await page.locator(".g-parts-tree button[data-subsystem]").count() == 33
        assert "30/30" in await page.locator(".g-tree-coverage").inner_text()
        available = set(
            (
                await page.locator(".g3d canvas").get_attribute(
                    "data-available-assemblies"
                )
            ).split(",")
        )
        assert len(available) == 21
        assert {
            "engine",
            "motorElectric",
            "batteryHV",
            "chassis",
            "cooling",
        } <= available
        assert any(
            "mechanical-supplement.glb" in response.url and response.ok
            for response in responses
        )

        for row in SOURCE["rows"]:
            checked.append(await select_subsystem(page, row["id"]))
            reference = page.locator(".g-trace-reference")
            art = row.get("referenceArt")
            if art:
                assert (
                    await reference.locator("svg image").get_attribute("href")
                    == art["asset"]
                )
                assert [
                    float(value)
                    for value in (
                        await reference.locator("svg").get_attribute("viewBox")
                    ).split()
                ] == [art["x"], art["y"], art["width"], art["height"]], row["id"]
            else:
                assert (await reference.locator("img").get_attribute("src")) == row[
                    "referenceAsset"
                ]
            assert (
                "não certifica a conformidade do projeto"
                in await page.locator(".g-trace-assessment").inner_text()
            )

        print(
            "Checked all 30 original and 3 supplemental subsystem/mesh/2D links",
            flush=True,
        )
        # Fluids share physical source regions with ABS/ESC but must not inherit their laws.
        await select_subsystem(page, "freios/fluido")
        expected_ids = {
            link["actId"]
            for part in MAPPING["parts"]
            if part["id"] in ROWS["freios/fluido"]["legacyParts"]
            for topic in part["topics"]
            if topic["subsystemId"] == "freios/fluido"
            for link in topic["links"]
        }
        traced = await page.evaluate(
            """part => {
              const t=guideBridge.traceability(part,{});
              const rows=t.relations.flatMap(r=>r.topics.flatMap(topic=>topic.records));
              return {ids:[...new Set(rows.map(r=>r.canonicalId))],
                titles:[...new Set(rows.map(r=>r.title))],
                automaticObligation:t.assessment.automaticObligation};
            }""",
            SOURCE["selections"]["freios/fluido"],
        )
        assert set(traced["ids"]) == expected_ids
        assert traced["automaticObligation"] is False
        assert set(
            await page.locator(
                ".g-trace-record .g-reference strong"
            ).all_text_contents()
        ) == set(traced["titles"])
        assert "915/2022" not in await page.locator(".g-trace-relations").inner_text()
        assert "954/2022" not in await page.locator(".g-trace-relations").inner_text()

        # Engine, running gear and all three hybrid assemblies can be read in isolation.
        await page.get_by_label("Vista explodida", exact=True).check()
        for subsystem_id in [
            "propulsao/componentes",
            "chassi/componentes",
            "visual/powertrain-hibrido",
        ]:
            await select_subsystem(page, subsystem_id)
            await page.get_by_role(
                "button", name="Isolar e focar o conjunto selecionado"
            ).click()
            assert await page.locator(".g3d").get_attribute("data-isolated") == "true"
            expected = set(ROWS[subsystem_id]["assemblyIds"])
            actual = set(
                (
                    await page.locator(".g3d canvas").get_attribute(
                        "data-highlighted-assemblies"
                    )
                ).split(",")
            )
            assert actual == expected
            await page.locator(".g-visual-panel").screenshot(
                path=str(OUT / (subsystem_id.replace("/", "-") + "-focused.png"))
            )
            await page.get_by_role("button", name="Mostrar todos os conjuntos").click()
            assert await page.locator(".g3d").get_attribute("data-isolated") == "false"

        # URL and browser history preserve the same precise subsystem and tree presentation.
        await select_subsystem(page, "chassi/componentes")
        await select_subsystem(page, "propulsao/eletrica")
        await page.go_back()
        await ready(page)
        assert route_values(page)["subsystem"] == ["chassi/componentes"]
        assert (
            await page.locator(".g-inspector-title h2").inner_text()
            == ROWS["chassi/componentes"]["label"]
        )
        await page.reload()
        await ready(page)
        assert route_values(page)["tree"] == ["subsystems"]
        assert route_values(page)["subsystem"] == ["chassi/componentes"]
        assert (
            await page.locator(
                '.g-parts-tree button[aria-pressed="true"]'
            ).get_attribute("data-subsystem")
            == "chassi/componentes"
        )

        await select_subsystem(page, "visual/powertrain-hibrido")
        await page.get_by_label("Vista explodida", exact=True).check()
        await page.get_by_label("Buscar componente", exact=True).fill("")
        for width, height, label in [
            (1600, 1100, "desktop"),
            (390, 844, "mobile-390"),
            (320, 740, "mobile-320"),
        ]:
            await page.set_viewport_size({"width": width, "height": height})
            assert await page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth"
            )
            await page.locator(".g-visual-panel").screenshot(
                path=str(OUT / (label + "-exploded.png"))
            )

        print(
            "Checked exact law scope, focus, history and responsive model views",
            flush=True,
        )
        # The new model-derived 2D boards are actual packaged images, not placeholder links.
        boards = page.locator(".g-model-boards")
        await boards.locator("summary").click()
        assert await boards.locator("img").count() == 4
        for image in await boards.locator("img").all():
            href = await image.get_attribute("src")
            response = await page.request.get(base + href)
            assert response.ok, href
            await image.evaluate("img=>img.decode()")
            assert await image.evaluate(
                "img=>img.naturalWidth>100 && img.naturalHeight>100"
            )
        for theme in ["dark", "light"]:
            await select_theme(page, theme)
            await page.add_script_tag(
                path=str(ROOT / "node_modules/axe-core/axe.min.js")
            )
            result = await page.evaluate(
                "async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
            )
            findings.extend(
                {"theme": theme, "id": row["id"], "nodes": row["nodes"]}
                for row in result["violations"]
            )
        await browser.close()
    (OUT / "coverage.json").write_text(
        json.dumps(
            {"originalTotal": 30, "supplemental": 3, "selections": checked},
            ensure_ascii=False,
            indent=2,
        )
    )
    (OUT / "accessibility.json").write_text(
        json.dumps(findings, ensure_ascii=False, indent=2)
    )
    assert not errors, json.dumps(errors, ensure_ascii=False)
    assert not findings, json.dumps(findings, ensure_ascii=False)[:24000]
    print(
        "PASS: all30 original+3 supplemental subsystems, actual mesh highlights, exact law scope, 2D crops/boards, focus/history, mobile and axe."
    )


if __name__ == "__main__":
    with TestServer() as test_base:
        asyncio.run(exercise(test_base))
