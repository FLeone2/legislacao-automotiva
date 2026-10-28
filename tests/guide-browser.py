"""Exercise complete guide workflows, durable local records and accessible alternatives."""

import asyncio
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright
from browser_support import TestServer, launch_options, select_theme

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/guide"
OUT.mkdir(parents=True, exist_ok=True)


def route_values(page):
    return parse_qs(urlsplit(page.url).fragment.partition("?")[2])


async def wait_guide(page):
    await page.locator(".g-app").wait_for()
    assert await page.locator(".g-app").count() == 1


async def choose_tab(page, tab):
    await page.locator(f"#g-tab-{tab}").click()
    await page.locator(f"#g-panel-{tab}").wait_for()


async def axe_check(page, context, findings):
    await page.add_script_tag(path=str(ROOT / "node_modules/axe-core/axe.min.js"))
    result = await page.evaluate("""async () => await axe.run(document, {
        runOnly: {type:'tag', values:['wcag2a','wcag2aa','wcag21aa']}
    })""")
    for violation in result["violations"]:
        findings.append(
            {
                "context": context,
                "id": violation["id"],
                "impact": violation["impact"],
                "nodes": [
                    {"target": n["target"], "summary": n["failureSummary"]}
                    for n in violation["nodes"]
                ],
            }
        )


async def exercise(base):
    findings = []
    errors = []
    evidence = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        context = await browser.new_context(
            viewport={"width": 1440, "height": 1000}, reduced_motion="reduce"
        )
        page = await context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(base + "#guide")
        await wait_guide(page)
        scene = page.locator("[data-g3d-ready]")
        await page.wait_for_function("""() => document.querySelector('[data-g3d-ready="true"]')
            || document.querySelector('.g3d-fallback')""")
        evidence["webgl"] = await scene.get_attribute("data-g3d-ready") == "true"

        # Legacy assembly journeys remain available beside the complete subsystem tree.
        await page.get_by_role("button", name=re.compile("^Conjuntos 3D")).click()
        # Text alternatives and the selected mesh share one persistent identifier.
        await page.get_by_label("Buscar componente", exact=True).fill("Pneus e rodas")
        await (
            page.locator(".g-parts-tree button")
            .filter(has_text="Pneus e rodas")
            .click()
        )
        assert route_values(page)["part"] == ["wheels"]
        assert (
            await page.locator(".g-inspector-title h2").inner_text() == "Pneus e rodas"
        )
        assert (
            await page.locator('.g-parts-tree button[aria-pressed="true"]').count() == 1
        )
        await page.get_by_label("Vista explodida", exact=True).uncheck()
        assert route_values(page)["part"] == ["wheels"]
        await page.get_by_label("Vista explodida", exact=True).check()
        await page.get_by_label("Buscar componente", exact=True).fill("")
        if evidence["webgl"]:
            canvas = page.locator(".g3d canvas")
            box = await canvas.bounding_box()
            before = route_values(page)["part"]
            hit = False
            for x, y in [(0.5, 0.42), (0.45, 0.5), (0.6, 0.5), (0.5, 0.6), (0.35, 0.5)]:
                await canvas.click(
                    position={"x": box["width"] * x, "y": box["height"] * y}
                )
                if route_values(page)["part"] != before:
                    hit = True
                    break
            assert hit, "Clicks on rendered vehicle geometry must select a mesh"
            selected = await page.locator(
                '.g-parts-tree button[aria-pressed="true"]'
            ).inner_text()
            assert (
                await page.locator(".g-inspector-title h2").inner_text()
            ) in selected
            evidence["raycastSelection"] = route_values(page)["part"][0]
            await canvas.focus()
            await page.keyboard.press("ArrowRight")
            await page.keyboard.press("+")
            await page.keyboard.press("Escape")
        await page.screenshot(path=str(OUT / "explorer-desktop.png"), full_page=True)

        # Keyboard tabs and the textual stage list operate the same diagram.
        await page.locator("#g-tab-explore").focus()
        await page.keyboard.press("ArrowRight")
        assert (
            await page.locator("#g-tab-flow").get_attribute("aria-selected") == "true"
        )
        await page.locator(".react-flow__node").first.wait_for()
        assert await page.locator(".react-flow__node").count() > 5
        await page.locator(".g-stage-list button").nth(2).click()
        assert route_values(page).get("stage")
        active_stage = route_values(page)["stage"][0]
        assert await page.locator(
            f'.react-flow__node[data-id="{active_stage}"]'
        ).get_attribute("class")
        await page.locator(".react-flow__node").last.click()
        selected_node = await page.locator(".react-flow__node.selected").get_attribute(
            "data-id"
        )
        assert route_values(page)["stage"] == [selected_node]
        await page.screenshot(path=str(OUT / "flow-desktop.png"), full_page=True)

        # A real process survives reload; display filters never erase its evidence.
        await page.get_by_role("button", name="Novo processo", exact=True).click()
        modal = page.get_by_role("dialog", name="Iniciar novo processo")
        await modal.get_by_label("Nome do processo", exact=True).fill(
            "QA · PHEV de referência"
        )
        await modal.get_by_label(re.compile("^Propulsão")).select_option("phev")
        await modal.get_by_label("Massa máxima / PBT (kg)", exact=True).fill("2500")
        await modal.get_by_label("Massa em ordem de marcha (kg)", exact=True).fill(
            "1800"
        )
        await modal.get_by_label("Carga útil (kg)", exact=True).fill("700")
        await modal.get_by_label("Assentos incluindo motorista", exact=True).fill("5")
        if await modal.locator('input[type="checkbox"]').count():
            await modal.locator('input[type="checkbox"]').check()
        else:
            await modal.get_by_label(
                re.compile("Radiofrequência|radiofrequência|Bluetooth")
            ).select_option("true")
        await modal.get_by_role("button", name="Criar processo e checklist").click()
        await page.locator("#g-panel-checklist").wait_for()
        assert "project" in route_values(page)
        first_project = route_values(page)["project"][0]
        assert (
            "QA · PHEV de referência"
            in await page.locator(".g-profile-summary").inner_text()
        )
        assert (
            await page.get_by_role(
                "heading", name="Definir ensaios específicos do PHEV"
            ).count()
            == 1
        )
        item = page.locator(".g-check-item").first
        await item.locator("summary").click()
        await item.get_by_label(re.compile("^Status")).select_option("na")
        assert await item.get_by_label(re.compile("^Status")).input_value() == "pending"
        assert "justificativa" in await page.locator(".g-feedback").inner_text()
        await item.locator("textarea").fill(
            "Conferência documental concluída pelo responsável técnico."
        )
        await item.get_by_label("Referência da evidência", exact=True).fill(
            "REL-QA-001 · revisão A"
        )
        await item.get_by_label(re.compile("^Status")).select_option("done")
        await page.reload()
        await wait_guide(page)
        assert route_values(page)["project"] == [first_project]
        item = page.locator(".g-check-item").first
        await item.locator("summary").click()
        assert await item.get_by_label(re.compile("^Status")).input_value() == "done"
        assert (
            await item.get_by_label("Referência da evidência", exact=True).input_value()
            == "REL-QA-001 · revisão A"
        )
        assert "responsável técnico" in await item.locator("textarea").input_value()
        await page.get_by_label("Filtrar checklist por status").select_option("pending")
        assert await page.locator(".g-check-item.g-status-done").count() == 0
        await page.get_by_label("Filtrar checklist por status").select_option("all")
        assert await page.locator(".g-check-item.g-status-done").count() == 1

        # File exports are usable backups, and importing duplicates conserves the original.
        async with page.expect_download() as download_info:
            await page.get_by_role("button", name="Backup do processo .json").click()
        backup = await download_info.value
        backup_path = OUT / "process-backup.json"
        await backup.save_as(backup_path)
        saved = json.loads(backup_path.read_text())
        assert saved["profile"]["name"] == "QA · PHEV de referência"
        assert any(v["status"] == "done" for v in saved["checks"].values())
        async with page.expect_download() as download_info:
            await page.get_by_role("button", name="Exportar checklist .md").click()
        markdown = await download_info.value
        markdown_path = OUT / "process-checklist.md"
        await markdown.save_as(markdown_path)
        assert "REL-QA-001" in markdown_path.read_text()
        await page.locator('input[type="file"]').set_input_files(backup_path)
        await page.wait_for_function("""() => document.querySelector('.g-profile-summary h2')
            ?.textContent.includes('cópia importada')""")
        assert route_values(page)["project"] != [first_project]
        assert await page.locator("#g-project-select option").count() == 3
        await page.locator('input[type="file"]').set_input_files(
            {
                "name": "invalid.json",
                "mimeType": "application/json",
                "buffer": b'{"schemaVersion":999}',
            }
        )
        assert "inválido" in await page.locator(".g-feedback").inner_text()
        assert await page.locator("#g-project-select option").count() == 3

        # External profile links open the editor; saving consumes that request
        # so a reload cannot reopen it or create another history entry.
        await page.goto(page.url + "&profile=edit")
        modal = page.get_by_role("dialog", name="Editar perfil técnico")
        await modal.get_by_label(re.compile("^Propulsão")).select_option("bev")
        await modal.get_by_label(re.compile("^Combustível")).select_option("electric")
        await modal.get_by_role("button", name="Atualizar perfil").click()
        await modal.wait_for(state="hidden")
        assert "profile" not in route_values(page)
        await page.reload()
        await wait_guide(page)
        assert await page.locator(".g-modal").count() == 0
        assert (
            await page.get_by_role(
                "heading", name="Definir ensaios específicos do PHEV"
            ).count()
            == 0
        )
        assert (
            await page.get_by_role(
                "heading", name="Documentar o enquadramento ambiental do BEV"
            ).count()
            == 1
        )
        assert await page.locator(".g-check-item.g-status-done").count() == 0
        item = page.locator(".g-check-item").first
        if not await item.locator("details").get_attribute("open") == "":
            await item.locator("summary").click()
        assert "responsável técnico" in await item.locator("textarea").input_value()
        assert (
            await item.get_by_label("Referência da evidência", exact=True).input_value()
            == "REL-QA-001 · revisão A"
        )
        # Cancelling an external new-process request also clears its URL flag
        # and leaves the selected process and all saved evidence untouched.
        preserved = await page.evaluate(
            "localStorage.getItem('homologation-projects-v1')"
        )
        project_before_cancel = route_values(page)["project"]
        await page.goto(page.url + "&profile=new")
        modal = page.get_by_role("dialog", name="Iniciar novo processo")
        await modal.get_by_role("button", name="Cancelar", exact=True).click()
        await modal.wait_for(state="hidden")
        assert "profile" not in route_values(page)
        assert route_values(page)["project"] == project_before_cancel
        assert preserved == await page.evaluate(
            "localStorage.getItem('homologation-projects-v1')"
        )
        await choose_tab(page, "explore")
        await page.get_by_label("Buscar componente", exact=True).fill(
            "Motor a combustão"
        )
        # The mechanical architecture is a clearly labelled hybrid teaching example,
        # independent of the process profile. The BEV checklist above still excludes
        # thermal obligations; selecting a diagram must not fabricate applicability.
        assert await page.locator(".g-parts-tree button").count() == 1
        assert (
            "exemplo híbrido didático"
            in await page.locator(".g-model-attribution").inner_text()
        )
        await page.get_by_label("Buscar componente", exact=True).fill("")

        # Source documents are packaged, legacy routes still open, and mobile stays in bounds.
        await choose_tab(page, "sources")
        for link in await page.locator('.g-sources a[href^="docs/guide/"]').all():
            response = await page.request.get(base + await link.get_attribute("href"))
            assert response.ok
        for route, ready in [
            ("vehicle", ".portal-vehicle-explorer"),
            ("flow", ".homologation-step"),
            ("library", ".document"),
        ]:
            await page.goto(base + "#" + route)
            await page.locator(ready).first.wait_for()
        await page.goto(base + "#guide")
        await wait_guide(page)
        for theme in ["dark", "light"]:
            await select_theme(page, theme)
            for tab in ["explore", "flow", "checklist", "sources"]:
                await choose_tab(page, tab)
                await axe_check(page, f"desktop-{theme}-{tab}", findings)
        await page.set_viewport_size({"width": 390, "height": 844})
        # Compact mobile sections remain operable with a keyboard. Opening the
        # project exposes its controls without changing the active dossier.
        project_details = page.locator(".g-project-disclosure")
        await page.wait_for_function(
            "() => document.querySelector('.g-project-disclosure')?.open === false"
        )
        current_project = await page.get_by_label(
            "Processo ativo", exact=True
        ).input_value()
        project_summary = project_details.locator(":scope > summary")
        await project_summary.focus()
        await project_summary.press("Enter")
        await page.get_by_label("Processo ativo", exact=True).wait_for(state="visible")
        assert (
            await page.get_by_label("Processo ativo", exact=True).input_value()
            == current_project
        )
        await axe_check(page, "mobile-project-expanded", findings)
        await project_summary.press("Enter")
        await page.get_by_label("Processo ativo", exact=True).wait_for(state="hidden")
        await choose_tab(page, "explore")
        await page.get_by_role("button", name=re.compile("^Subsistemas")).click()
        tree_details = page.locator(".g-tree-disclosure")
        tree_summary = tree_details.locator(":scope > summary")
        await tree_summary.focus()
        await tree_summary.press("Enter")
        search = page.get_by_label("Buscar componente", exact=True)
        await search.fill("freios/fluido")
        selection = page.locator('.g-parts-tree button[data-subsystem="freios/fluido"]')
        await selection.wait_for(state="visible")
        await selection.focus()
        await selection.press("Enter")
        assert route_values(page)["part"] == ["brakeFluid"]
        assert (
            await page.locator(".g-inspector-title h2").inner_text()
            == "Fluido de freio"
        )
        assert (
            await page.get_by_label("Processo ativo", exact=True).input_value()
            == current_project
        )
        await search.fill("")
        evidence["mobileCompactKeyboard"] = True
        for theme in ["dark", "light"]:
            await select_theme(page, theme)
            for tab in ["explore", "flow", "checklist", "sources"]:
                await choose_tab(page, tab)
                assert await page.evaluate(
                    "document.documentElement.scrollWidth <= innerWidth"
                ), f"Overflow: {theme}/{tab}"
                await axe_check(page, f"mobile-{theme}-{tab}", findings)
        await choose_tab(page, "explore")
        await page.screenshot(path=str(OUT / "explorer-mobile.png"), full_page=True)
        await context.close()

        blocked = await browser.new_context(viewport={"width": 1200, "height": 900})
        await blocked.add_init_script("""Object.defineProperty(window,'localStorage',{
            get(){ throw new DOMException('blocked','SecurityError'); }
        });""")
        page = await blocked.new_page()
        await page.goto(base + "#guide")
        await wait_guide(page)
        assert "Exporte" in await page.locator(".g-feedback").inner_text()
        await page.get_by_role("button", name="Novo processo", exact=True).click()
        assert await page.get_by_role("dialog").is_visible()
        await blocked.close()
        await browser.close()
    (OUT / "accessibility.json").write_text(
        json.dumps(findings, ensure_ascii=False, indent=2)
    )
    (OUT / "evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2)
    )
    assert not errors, "JavaScript errors: " + json.dumps(errors, ensure_ascii=False)
    assert not findings, json.dumps(findings, ensure_ascii=False)[:24000]
    print(
        "PASS: guide 3D/tree, keyboard/flow, profile/checklist persistence, exports/imports, sources, legacy routes, mobile and axe."
    )


if __name__ == "__main__":
    with TestServer() as test_base:
        asyncio.run(exercise(test_base))
