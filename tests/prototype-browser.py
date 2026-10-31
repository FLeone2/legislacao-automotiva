"""Three-tab analyst journey against the real app, scene and published documents.

The assistant endpoint is deliberately unavailable in this suite. This exercises
an honest source-only fallback without contacting a remote model or using keys.
"""

import json
import re
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from PIL import Image
from playwright.sync_api import expect, sync_playwright
from browser_support import TestServer, launch_options

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/prototype"
OUT.mkdir(parents=True, exist_ok=True)
CATALOG = json.loads((ROOT / "data/prototype/catalog.json").read_text())
WORKFLOW = json.loads((ROOT / "data/prototype/workflow.json").read_text())
STEPS = {step["id"]: step for step in WORKFLOW["steps"]}
AXE_RESULTS = []


def frames(page):
    page.evaluate(
        "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
    )


def state(page):
    return page.locator(".prototype-viewport").evaluate(
        "el => el.__vehicleViewer.getState()"
    )


def navigate(page, name):
    button = page.get_by_role("navigation", name="Navegação principal").get_by_role(
        "button", name=name, exact=True
    )
    button.click()
    section = {
        "IA": ".prototype-ia",
        "Veículo": ".prototype-vehicle-page",
        "Homologação": ".prototype-homologation",
    }[name]
    expect(page.locator(section)).to_be_visible()
    frames(page)


def capture(page, name, accessibility=False):
    frames(page)
    page.screenshot(path=str(OUT / name), full_page=True)
    if accessibility:
        if not page.evaluate("typeof window.axe !== 'undefined'"):
            page.add_script_tag(path=str(ROOT / "node_modules/axe-core/axe.min.js"))
        violations = page.evaluate("""async () => {
            const result = await axe.run(document, {
                runOnly: {type:'tag', values:['wcag2a','wcag2aa','wcag21aa']}
            });
            return result.violations.map(({id,impact,nodes}) => ({id,impact,
                nodes:nodes.map(({target,failureSummary}) => ({target,failureSummary}))}));
        }""")
        AXE_RESULTS.append({"screen": name, "violations": violations})
        (OUT / "accessibility.json").write_text(
            json.dumps(AXE_RESULTS, ensure_ascii=False, indent=2)
        )


def open_evidence(page, scope, label):
    summary = (
        scope.locator("summary")
        .filter(has_text=re.compile(r"^\s*" + re.escape(label) + r"\s*$"))
        .first
    )
    expect(summary).to_be_visible()
    group = summary.locator("..")
    if group.get_attribute("open") is None:
        summary.click()
    expect(group).to_have_attribute("open", "")
    return group


def choose_step(page, step_id):
    phase = next(phase for phase in WORKFLOW["phases"] if step_id in phase["stepIds"])
    phase_button = page.locator(".prototype-linear-flow").get_by_role(
        "button", name=re.compile(r"\d+\s*" + re.escape(phase["label"]) + r"$")
    )
    phase_button.click()
    expect(phase_button).to_have_attribute("aria-current", "step")
    if len(phase["stepIds"]) > 1:
        step_button = page.locator(".prototype-step-selector").get_by_role(
            "button", name=STEPS[step_id]["label"], exact=True
        )
        step_button.click()
        expect(step_button).to_have_attribute("aria-pressed", "true")
    expect(
        page.locator('.prototype-tree-breadcrumb [aria-current="location"]')
    ).to_have_text(STEPS[step_id]["label"])


def set_profile(page, values):
    trigger = page.locator(".prototype-profile-trigger")
    if trigger.get_attribute("aria-expanded") != "true":
        trigger.click()
    fields = {field["key"]: field for field in WORKFLOW["profileFields"]}
    for key, value in values.items():
        field = fields[key]
        role = (
            "combobox"
            if field.get("options") or field["type"] == "boolean"
            else "spinbutton"
            if field["type"] == "number"
            else "textbox"
        )
        control = page.locator(".prototype-profile-fields").get_by_role(
            role, name=field["label"], exact=True
        )
        if field.get("options") or field["type"] == "boolean":
            rendered = str(value).lower() if isinstance(value, bool) else str(value)
            control.select_option(rendered)
            expect(control).to_have_value(rendered)
        else:
            control.fill(str(value))
            expect(control).to_have_value(str(value))
    trigger.click()
    expect(trigger).to_have_attribute("aria-expanded", "false")


def tree_choose(page, label, keyboard=False):
    graph = page.get_by_role("region", name="Árvore de legislação expansível")
    button = graph.get_by_role("button", name=label, exact=True)
    expect(button).to_be_visible()
    if keyboard:
        button.focus()
        expect(button).to_be_focused()
        page.keyboard.press("Enter")
    else:
        button.click()
    current = graph.locator(".is-current .prototype-node-main")
    expect(current).to_have_text(label)
    expect(current).to_be_focused()
    return page.locator(".prototype-tree-node-content")


def no_overflow(page):
    frames(page)
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
        "The page must fit the viewport; the legislation diagram may scroll inside its own region"
    )


def assert_scene(page):
    page.wait_for_function(
        """() => {
        const el = document.querySelector('.prototype-viewport');
        return el?.__vehicleViewer?.getState().ready;
    }""",
        timeout=60_000,
    )
    scene = state(page)
    assert scene["wheelCount"] == 4
    assert len({wheel["corner"] for wheel in scene["wheelPositions"]}) == 4
    assert scene["pieceCount"] >= 230
    return scene


def assert_exploded(page):
    page.get_by_role("button", name="Desmontado", exact=True).click()
    page.wait_for_function("""() => {
        const s = document.querySelector('.prototype-viewport').__vehicleViewer.getState();
        return s.mode === 'exploded' && s.actualExplosion >= 0.64;
    }""")
    scene = state(page)
    assert scene["explosionOverlaps"] == [], scene["explosionOverlaps"]
    assert scene["wheelCount"] == 4


with TestServer() as base, sync_playwright() as p:
    options = launch_options()
    options["args"].append("--enable-unsafe-swiftshader")
    browser = p.chromium.launch(**options)
    page = browser.new_page(
        viewport={"width": 1600, "height": 1000}, reduced_motion="reduce"
    )
    page.set_default_timeout(15_000)
    errors, glb_requests = [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "request",
        lambda request: glb_requests.append(request.url)
        if urlsplit(request.url).path.endswith(".glb")
        else None,
    )
    page.route(
        "**/api/prototype-ask*",
        lambda route: route.fulfill(
            status=404,
            content_type="application/json",
            body='{"error":"test_source_only"}',
        ),
    )
    try:
        page.goto(base + "prototipo/", wait_until="networkidle")
        expect(page.locator(".prototype-ia")).to_be_visible()
        expect(page.locator(".prototype-composer")).to_be_visible()
        expect(page.locator(".prototype-ia h1, .prototype-ia h2")).to_have_count(0)
        expect(
            page.get_by_role("navigation", name="Navegação principal").get_by_role(
                "button"
            )
        ).to_have_text(["IA", "Veículo", "Homologação"])
        expect(page.locator(".prototype-model-name")).to_have_text("Fontes do acervo")
        assert glb_requests == [], (
            "The default IA screen must not download the 3D vehicle"
        )
        capture(page, "01-ia.png", accessibility=True)

        # A failed API has a visible, sourced fallback; it is never presented as an AI answer.
        page.get_by_label("Pergunta", exact=True).fill(
            "Qual a diferença entre LP e LC na homologação?"
        )
        page.get_by_role("button", name="Enviar pergunta", exact=True).click()
        expect(page.locator(".prototype-source-mode")).to_contain_text(
            "IA indisponível", timeout=30_000
        )
        expect(page.get_by_label("Pergunta", exact=True)).to_have_value("")
        sources_summary = page.locator(".prototype-response-sources > summary")
        expect(sources_summary).to_be_visible()
        sources_summary.click()
        expect(
            page.locator(".prototype-response-sources .prototype-act-link").first
        ).to_be_visible()
        capture(page, "02-ia-fontes.png", accessibility=True)

        # The first vehicle visit loads a real scene. A mesh click must go through the raycaster.
        navigate(page, "Veículo")
        scene = assert_scene(page)
        assert glb_requests, (
            "The vehicle must load its GLB when its tab is first opened"
        )
        viewport = page.locator(".prototype-viewport")
        viewport.scroll_into_view_if_needed()
        bounds = viewport.bounding_box()
        for point in [
            point
            for point in scene["pickPoints"]
            if point["inView"] and point["assemblyId"] == "body"
        ][:8]:
            page.mouse.click(bounds["x"] + point["x"], bounds["y"] + point["y"])
            frames(page)
            if state(page)["selection"]["assemblyId"]:
                break
        page.wait_for_function(
            "document.querySelector('.prototype-viewport').__vehicleViewer.getState().selection.assemblyId"
        )
        expect(page.locator("#prototype-vehicle-references")).to_be_visible()

        # The component picker is an accessible alternative to the 3D target.
        page.locator(".prototype-picker-trigger").click()
        page.get_by_label("Buscar componente", exact=True).fill("Freios")
        page.locator(".prototype-picker-popover").get_by_role(
            "button", name="Freios e estabilidade", exact=True
        ).click()
        page.wait_for_function(
            "document.querySelector('.prototype-viewport').__vehicleViewer.getState().selection.assemblyId === 'brakes'"
        )
        references = page.locator("#prototype-vehicle-references")
        expect(references.locator("h2")).to_have_text("Freios e estabilidade")
        assert (
            references.bounding_box()["y"]
            >= page.locator(".prototype-vehicle-studio").bounding_box()["y"]
            + page.locator(".prototype-vehicle-studio").bounding_box()["height"]
            - 2
        )
        references.locator(".prototype-context-references > summary").click()
        act = (
            references.locator(".prototype-act")
            .filter(has_text="Resolução CONTRAN 915/2022")
            .first
        )
        pdf_link = act.locator("a.prototype-act-link")
        expect(pdf_link).to_be_visible()
        assert pdf_link.get_attribute("target") == "_blank"
        pdf = page.request.get(urljoin(base, pdf_link.get_attribute("href")))
        assert pdf.ok and pdf.body().startswith(b"%PDF-")
        act.locator(".prototype-record-details > summary").click()
        for label in ["Ficha em Markdown", "Texto em Markdown"]:
            link = act.get_by_role("link", name=label, exact=False)
            expect(link).to_be_visible()
            document = page.request.get(urljoin(base, link.get_attribute("href")))
            assert document.ok and len(document.body()) > 200
            assert "<!doctype html" not in document.text().lower(), (
                "A missing Markdown must not return the SPA shell"
            )
        viewport.scroll_into_view_if_needed()
        capture(page, "03-veiculo.png", accessibility=True)

        # Keep both the canvas identity and the user-controlled camera across navigation.
        canvas = viewport.locator("canvas")
        canvas.evaluate('el => el.dataset.persistenceToken = "same-canvas"')
        canvas.focus()
        page.keyboard.press("ArrowLeft")
        frames(page)
        camera_before = state(page)["cameraPosition"]
        glb_count = len(glb_requests)
        navigate(page, "IA")
        navigate(page, "Veículo")
        expect(
            page.locator('canvas[data-persistence-token="same-canvas"]')
        ).to_have_count(1)
        assert state(page)["cameraPosition"] == camera_before
        assert len(glb_requests) == glb_count
        assert_exploded(page)
        capture(page, "04-explosao.png", accessibility=True)

        # The process is seven chronological groups backed by nineteen concrete analyst steps.
        navigate(page, "Homologação")
        expect(page.locator(".prototype-linear-flow li")).to_have_count(7)
        assert len(STEPS) == 19
        choose_step(page, "em-03-coastdown")
        expect(
            page.locator(".prototype-tree-node-content .prototype-condition-state")
        ).to_have_text("Condição a confirmar")
        set_profile(
            page,
            {
                "category": "M1",
                "vehicleType": "automovel",
                "propulsion": "ice",
                "fuel": "diesel",
                "grossMassKg": 2400,
                "massRunningKg": 1700,
                "payloadKg": 700,
                "seats": 5,
                "year": 2026,
                "origin": "national",
                "purpose": "series",
                "derivedFromPassenger": False,
                "offroad": False,
                "radio": False,
            },
        )
        expect(page.locator(".prototype-profile-trigger")).to_contain_text("LP")
        choose_step(page, "em-03-coastdown")
        work = page.locator(".prototype-stage-work")
        expect(open_evidence(page, work, "Entradas")).to_contain_text(
            "massas, pneus/rodas"
        )
        expect(open_evidence(page, work, "Encaminhamento")).to_contain_text(
            "Laboratório recebe dados"
        )
        choose_step(page, "em-07-infoserv")
        fields = open_evidence(
            page, page.locator(".prototype-stage-work"), "Dados para o Infoserv"
        )
        expect(fields).to_contain_text("Interface atual não verificada")
        expect(open_evidence(page, fields, "Sistemas e diagramas")).to_contain_text(
            "escapamento/pós-tratamento"
        )
        choose_step(page, "em-05-ensaios")
        graph = page.get_by_role("region", name="Árvore de legislação expansível")
        expect(
            graph.get_by_role(
                "button", name="Escapamento em laboratório / FTP-75", exact=True
            )
        ).to_be_visible()
        expect(
            graph.get_by_role("button", name="BEV: emissão zero e energia", exact=True)
        ).to_have_count(0)
        set_profile(page, {"propulsion": "phev", "fuel": "flex"})
        expect(
            graph.get_by_role("button", name="HEV/PHEV: modos de energia", exact=True)
        ).to_be_visible()
        set_profile(page, {"propulsion": "bev", "fuel": "electric"})
        expect(
            graph.get_by_role(
                "button", name="Escapamento em laboratório / FTP-75", exact=True
            )
        ).to_have_count(0)
        expect(
            graph.get_by_role("button", name="BEV: emissão zero e energia", exact=True)
        ).to_be_visible()
        page.get_by_role("button", name="Outros perfis", exact=True).click()
        expect(
            graph.get_by_role(
                "button", name="Escapamento em laboratório / FTP-75", exact=True
            )
        ).to_be_visible()
        set_profile(page, {"propulsion": "ice", "fuel": "diesel"})

        # Expand the original branch pattern by keyboard: test -> act -> cited NBR.
        choose_step(page, "sa-05-active")
        details = tree_choose(page, "Frenagem e ABS", keyboard=True)
        expect(details).to_contain_text("Controle de relatório: nível 2")
        tree_choose(page, "Resolução CONTRAN 915/2022", keyboard=True)
        expect(
            page.locator(".prototype-tree-node-content .prototype-act-link").first
        ).to_have_attribute("href", re.compile(r"contran-915-2022-original\.pdf$"))
        nbr = (
            graph.locator(".prototype-graph-node:not(.is-current) .prototype-node-main")
            .filter(has_text="NBR 10966-1")
            .first.inner_text()
        )
        details = tree_choose(page, nbr, keyboard=True)
        expect(
            details.get_by_role("link", name="Consultar referência")
        ).to_have_attribute("href", re.compile(r"abntcatalogo\.com\.br"))
        for summary in (
            details.locator("summary")
            .filter(has_text=re.compile(r"^Qualificações$"))
            .all()
        ):
            summary.click()
        expect(details).to_contain_text("Texto privado não reproduzido")

        # A foreign reference is qualified, with no blanket claim of equivalence.
        choose_step(page, "sa-05-active")
        tree_choose(page, "Controle eletrônico de estabilidade")
        tree_choose(page, "Resolução CONTRAN 954/2022")
        foreign = next(
            reference
            for reference in WORKFLOW["foreignReferences"]
            if reference["id"] == "wf-un-r13h"
        )
        details = tree_choose(page, foreign["label"])
        expect(
            details.get_by_role("link", name="Consultar referência")
        ).to_have_attribute("href", re.compile(r"^https://"))
        qualification = open_evidence(page, details, "Qualificações")
        expect(qualification).to_contain_text("equivalência")
        choose_step(page, "sa-06-passive")
        details = tree_choose(page, "Impacto lateral contra barreira")
        expect(details).to_contain_text("Controle de relatório: nível 3")
        choose_step(page, "sa-09-siscat")
        expect(
            open_evidence(page, page.locator(".prototype-stage-work"), "Entradas")
        ).not_to_be_empty()
        capture(page, "05-homologacao.png", accessibility=True)
        choose_step(page, "sa-11-cop")
        mover = tree_choose(page, "MOVER · " + WORKFLOW["crosswalk"][0]["safetyTopic"])
        expect(mover).to_contain_text(
            "Conferir configuração, escopo e evidências exigidos nos dois processos"
        )
        expect(open_evidence(page, mover, "Qualificações")).not_to_be_empty()

        # Real mobile canvas and independent tree scrolling at both narrow widths.
        for width, height in [(390, 844), (320, 740)]:
            page.set_viewport_size({"width": width, "height": height})
            navigate(page, "Veículo")
            viewport.scroll_into_view_if_needed()
            assert_scene(page)
            assert_exploded(page)
            frames(page)
            image = Image.open(
                BytesIO(viewport.locator("canvas").screenshot())
            ).convert("RGB")
            assert image.getcolors(maxcolors=512) is None, (
                "The actual vehicle must remain drawn after resizing"
            )
            no_overflow(page)
            capture(page, f"06-veiculo-{width}.png", accessibility=width == 390)
            navigate(page, "Homologação")
            choose_step(page, "sa-05-active")
            page.get_by_role("button", name="Lista", exact=True).click()
            expect(page.locator(".prototype-tree-text-list")).to_be_visible()
            no_overflow(page)
            capture(page, f"07-homologacao-{width}.png", accessibility=width == 320)
        assert not errors, errors
        assert len(AXE_RESULTS) == 7
        assert not any(result["violations"] for result in AXE_RESULTS), (
            "See tests/artifacts/prototype/accessibility.json"
        )
        (OUT / "report.json").write_text(
            json.dumps(
                {
                    "routes": 3,
                    "phases": 7,
                    "steps": 19,
                    "wheelCount": state(page)["wheelCount"],
                    "pieces": state(page)["pieceCount"],
                    "glbRequests": len(glb_requests),
                    "initialGlbRequests": 0,
                    "errors": errors,
                    "accessibilityScreens": len(AXE_RESULTS),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        browser.close()
