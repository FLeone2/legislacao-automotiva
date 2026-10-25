"""Validate the real local SUV asset and the reviewed law trace behind its assemblies."""

import asyncio
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright
from browser_support import TestServer, launch_options, select_theme

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/suv-reference"
OUT.mkdir(parents=True, exist_ok=True)
REQUIREMENTS = {
    row["id"]: row
    for row in json.loads((ROOT / "data/requirements/catalog.json").read_text())[
        "records"
    ]
}


async def wait_model(page):
    await page.locator('.g3d[data-model="bmw-x5-g05"][data-g3d-ready="true"]').wait_for(
        timeout=90_000
    )
    assert await page.locator(".g3d-fallback").count() == 0
    assert await page.locator(".g3d-loading").count() == 0


async def wait_trace(page):
    await page.locator(".g-traceability").wait_for()
    await page.wait_for_function(
        "() => !document.querySelector('.g-trace-relations [role=status]')"
    )


async def select_part(page, label, expected):
    await page.get_by_label("Buscar componente", exact=True).fill(label)
    await page.locator(".g-parts-tree button").filter(has_text=label).click()
    assert parse_qs(page.url.partition("?")[2]).get("part", [None])[0] == expected, (
        page.url
    )
    assert await page.locator(".g-inspector-title h2").inner_text() == label
    await wait_trace(page)


async def expand_trace(page):
    for details in await page.locator(".g-traceability details").all():
        if await details.get_attribute("open") is None:
            await details.locator(":scope > summary").click()


async def model_screenshots(page):
    await page.set_viewport_size({"width": 1600, "height": 1100})
    await select_part(page, "Carroceria", "body")
    await page.get_by_label("Buscar componente", exact=True).fill("")
    await page.get_by_label("Vista explodida", exact=True).uncheck()
    await page.locator(".g-visual-panel").screenshot(
        path=str(OUT / "desktop-body-highlight.png")
    )
    await select_part(page, "Freios e estabilidade", "brakes")
    await page.get_by_label("Buscar componente", exact=True).fill("")
    for width, height, label in [
        (1600, 1100, "desktop"),
        (390, 844, "mobile-390"),
        (320, 740, "mobile-320"),
    ]:
        await page.set_viewport_size({"width": width, "height": height})
        await page.get_by_label("Vista explodida", exact=True).uncheck()
        await page.get_by_role(
            "button", name="Restaurar vista em perspectiva", exact=True
        ).click()
        await page.locator(".g-visual-panel").screenshot(
            path=str(OUT / f"{label}-assembled.png")
        )
        await page.get_by_label("Vista explodida", exact=True).check()
        await page.locator(".g-visual-panel").screenshot(
            path=str(OUT / f"{label}-exploded.png")
        )
        assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    await page.get_by_role("button", name="Lateral", exact=True).click()
    await page.get_by_role("button", name="Superior", exact=True).click()
    await page.get_by_role(
        "button", name="Restaurar vista em perspectiva", exact=True
    ).click()


async def exercise(base):
    errors = []
    responses = []
    findings = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        context = await browser.new_context(
            viewport={"width": 1600, "height": 1100}, reduced_motion="reduce"
        )
        context.on("response", lambda response: responses.append(response))
        page = await context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(base + "#guide")
        await wait_model(page)
        assert not await page.get_by_label("Vista explodida", exact=True).is_checked()
        assert await page.locator(".g-parts-tree button").count() == 11
        assert "BMW X5 G05" in await page.locator(".g3d-caption").inner_text()
        assert (
            await page.locator(
                '.g-model-attribution a[href="https://github.com/bmwcarit/digital-car-3d"]'
            ).count()
            == 1
        )
        assert (
            await page.locator('.g-model-attribution a[href$="LICENSE.txt"]').count()
            == 1
        )
        model_responses = [r for r in responses if "/bmw-x5.glb" in r.url]
        wasm_responses = [r for r in responses if r.url.endswith("draco_decoder.wasm")]
        wrapper_responses = [
            r for r in responses if r.url.endswith("draco_wasm_wrapper.js")
        ]
        assert model_responses and all(r.ok for r in model_responses)
        assert wasm_responses and all(r.ok for r in wasm_responses)
        assert wrapper_responses and all(r.ok for r in wrapper_responses)
        assert all(
            r.url.startswith(base)
            for r in model_responses + wasm_responses + wrapper_responses
        ), "The actual model and decoder must load locally, without a CDN."

        await select_part(page, "Pneus e rodas", "wheels")
        trace = page.locator(".g-traceability")
        assert await trace.locator('[data-relation="component"]').count() == 1
        assert await trace.locator('[data-relation="vehicle"]').count() == 1
        assert set(
            await trace.locator(".g-trace-reference code").all_text_contents()
        ) == {
            "peca_34_roda_dianteira",
            "peca_36_roda_traseira",
        }
        await expand_trace(page)
        origins = set(
            await trace.locator(".g-trace-origin code:first-child").all_text_contents()
        )
        assert {"peca_34_roda_dianteira", "peca_36_roda_traseira"} <= origins
        ids = await trace.locator(".g-trace-provisions code").all_text_contents()
        assert ids and all(value in REQUIREMENTS for value in ids)
        sources = await trace.locator(".g-trace-record a").evaluate_all(
            "nodes => nodes.map(node => node.href)"
        )
        assert sources
        assert all(
            urlparse(url).scheme == "https"
            and urlparse(url).hostname.endswith(".gov.br")
            for url in sources
        )
        assert "Íntegra pendente" in await trace.inner_text()
        assert "não certifica a conformidade do projeto" in await trace.inner_text()
        assert "Nenhuma obrigação é confirmada" in await trace.inner_text()
        for topic in await trace.locator(".g-trace-topic").all():
            titles = await topic.locator(".g-reference strong").all_text_contents()
            assert len(titles) == len(set(titles)), (
                "An aggregated assembly must not duplicate acts."
            )

        await trace.locator(".g-reference").first.click()
        await page.locator("#normDialog[open]").wait_for()
        await page.locator("#closeDialog").click()
        assert "part=wheels" in page.url
        await select_part(page, "Iluminação e sinalização", "lights")
        assert set(
            await page.locator(".g-trace-reference code").all_text_contents()
        ) == {
            "peca_13_farol_lado_visivel",
            "peca_12_farol_lado_oposto",
            "peca_15_lanterna_traseira_1",
            "peca_16_lanterna_traseira_2",
        }
        assert (
            "Conjunto de origem sem associação revisada" not in await trace.inner_text()
        )

        # Geometry is a navigation surface and cannot set the technical project profile.
        await page.get_by_role("button", name="Novo processo", exact=True).click()
        modal = page.get_by_role("dialog", name="Iniciar novo processo")
        await modal.get_by_label("Nome do processo", exact=True).fill(
            "SUV · perfil de consulta"
        )
        await modal.get_by_label(re.compile("^Propulsão")).select_option("phev")
        await modal.get_by_label("Massa máxima / PBT (kg)", exact=True).fill("2200")
        await modal.get_by_label("Massa em ordem de marcha (kg)", exact=True).fill(
            "1800"
        )
        await modal.get_by_label("Carga útil (kg)", exact=True).fill("400")
        await modal.get_by_label("Assentos incluindo motorista", exact=True).fill("5")
        await modal.get_by_role("button", name="Criar processo e checklist").click()
        await page.locator("#g-tab-explore").click()
        await wait_model(page)
        await select_part(page, "Pneus e rodas", "wheels")
        conditions = page.locator(".g-trace-conditions")
        await conditions.locator("summary").click()
        assert (
            await conditions.locator("dl > div")
            .filter(has=page.locator("dt", has_text="Massa máxima / PBT (kg)"))
            .locator("dd")
            .inner_text()
            == "2200"
        )
        assert "Híbrido PHEV" in await conditions.inner_text()
        assert "Nenhuma obrigação é confirmada" in await conditions.inner_text()
        await model_screenshots(page)

        for theme in ["dark", "light"]:
            await select_theme(page, theme)
            await expand_trace(page)
            await page.add_script_tag(
                path=str(ROOT / "node_modules/axe-core/axe.min.js")
            )
            result = await page.evaluate(
                "async() => await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})"
            )
            findings.extend(
                {"theme": theme, "id": row["id"], "nodes": row["nodes"]}
                for row in result["violations"]
            )
        await context.close()

        # A failed binary download keeps genuine text associations and offers a real retry.
        failure_context = await browser.new_context(
            viewport={"width": 1200, "height": 900}, reduced_motion="reduce"
        )
        failure_page = await failure_context.new_page()
        failure_page.on("pageerror", lambda error: errors.append(str(error)))
        pattern = "**/assets/models/suv/bmw-x5.glb*"
        await failure_page.route(
            pattern,
            lambda route: route.fulfill(
                status=503, content_type="text/plain", body="Unavailable"
            ),
        )
        await failure_page.goto(base + "#guide?part=wheels")
        await failure_page.locator(".g3d-fallback").wait_for(timeout=90_000)
        assert await failure_page.locator('.g3d[data-g3d-ready="false"]').count() == 1
        await wait_trace(failure_page)
        assert await failure_page.locator(".g-trace-record").count() > 0
        assert (
            "Pneus e rodas"
            == await failure_page.locator(".g-inspector-title h2").inner_text()
        )
        await failure_page.unroute(pattern)
        await failure_page.get_by_role(
            "button", name="Tentar carregar o modelo novamente"
        ).click()
        await wait_model(failure_page)
        assert await failure_page.locator('.g3d[data-model="bmw-x5-g05"]').count() == 1
        await failure_context.close()
        await browser.close()
    (OUT / "accessibility.json").write_text(
        json.dumps(findings, ensure_ascii=False, indent=2)
    )
    (OUT / "evidence.json").write_text(
        json.dumps(
            {
                "model": "bmw-x5-g05",
                "localDracoWasm": True,
                "requirementIds": sorted(set(ids)),
                "officialSources": sorted(set(sources)),
                "recoveredModelDownload": True,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    assert not errors, json.dumps(errors, ensure_ascii=False)
    assert not findings, json.dumps(findings, ensure_ascii=False)[:24000]
    print(
        "PASS: genuine local BMW SUV+WASM, assembly/source/requirement trace, profile limits, mobile/views and failed-download recovery."
    )


if __name__ == "__main__":
    with TestServer() as test_base:
        asyncio.run(exercise(test_base))
