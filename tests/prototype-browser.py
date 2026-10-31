"""Exercise the real prototype: raycast, retained scene, documents and small screens."""

import json
from io import BytesIO
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect
from browser_support import TestServer, launch_options

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/prototype"
OUT.mkdir(parents=True, exist_ok=True)
CATALOG = json.loads((ROOT / "data/prototype/catalog.json").read_text())
AXE_RESULTS = []


def state(page):
    return page.locator(".prototype-viewport").evaluate(
        "(el)=>el.__vehicleViewer.getState()"
    )


def screenshot(page, name):
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    page.screenshot(path=str(OUT / name), full_page=True)
    if name in {
        "01-veiculo.png",
        "03-arvore.png",
        "05-mapa.png",
        "06-assistente.png",
        "07-biblioteca.png",
        "08-mobile-390.png",
        "09-arvore-320.png",
    }:
        if not page.evaluate("typeof window.axe !== 'undefined'"):
            page.add_script_tag(path=str(ROOT / "node_modules/axe-core/axe.min.js"))
        result = page.evaluate("""async () => {
            const result = await axe.run(document, {
                runOnly: {type:'tag', values:['wcag2a','wcag2aa','wcag21aa']}
            });
            return result.violations.map(({id,impact,nodes})=>({id,impact,
                nodes:nodes.map(({target,failureSummary})=>({target,failureSummary}))}));
        }""")
        AXE_RESULTS.append({"screen": name, "violations": result})


with TestServer() as base, sync_playwright() as p:
    options = launch_options()
    options["args"].append("--enable-unsafe-swiftshader")
    browser = p.chromium.launch(**options)
    page = browser.new_page(
        viewport={"width": 1600, "height": 1000}, reduced_motion="reduce"
    )
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(base + "prototipo/", wait_until="networkidle")
    page.locator('[data-prototype-ready="true"]').wait_for(timeout=60_000)
    assert state(page)["wheelCount"] == 4
    assert len({row["corner"] for row in state(page)["wheelPositions"]}) == 4
    assert state(page)["pieceCount"] >= 150
    screenshot(page, "01-veiculo.png")

    # Choose the visible vehicle using a real mouse event, through its raycaster.
    viewport = page.locator(".prototype-viewport")
    bounds = viewport.bounding_box()
    points = state(page)["pickPoints"]
    for point in [x for x in points if x["inView"] and x["assemblyId"] == "body"][:8]:
        page.mouse.click(bounds["x"] + point["x"], bounds["y"] + point["y"])
        if state(page)["selection"]["assemblyId"]:
            break
    assert state(page)["selection"]["assemblyId"], (
        "Real mesh click must select a component"
    )
    assert "?part=" in page.url
    assert page.locator(".prototype-inspector-heading h2").inner_text()

    # Select a known assembly and unfold its independent vehicle references.
    page.locator(".prototype-quick-parts").get_by_role(
        "button", name="Freios e estabilidade", exact=True
    ).click()
    page.wait_for_function(
        "document.querySelector('.prototype-viewport').__vehicleViewer.getState().selection.assemblyId === 'brakes'"
    )
    assert state(page)["selection"]["assemblyId"] == "brakes"
    page.locator(".prototype-context-references > summary").click()
    assert (
        page.get_by_role("link", name="Resolução CONTRAN 915/2022", exact=False).count()
        >= 1
    )
    pdf_links = page.locator('.prototype-inspector a[href^="/pdfs/prototype/"]')
    assert pdf_links.count() >= 1
    pdf_url = pdf_links.first.get_attribute("href")
    document = page.request.get(base.rstrip("/") + pdf_url)
    assert document.ok and document.body().startswith(b"%PDF-")
    assert pdf_links.first.get_attribute("target") == "_blank"
    page.locator(".prototype-inspector").evaluate("el => el.scrollTop = 0")
    screenshot(page, "02-freios-e-fontes.png")

    # Manual keyboard camera movement must survive tab changes with the same canvas.
    canvas = page.locator(".prototype-viewport canvas")
    canvas.evaluate('(el)=>el.dataset.persistenceToken="same-canvas"')
    canvas.focus()
    page.keyboard.press("ArrowLeft")
    camera_before = state(page)["cameraPosition"]
    page.get_by_role("navigation", name="Navegação principal").get_by_role(
        "button", name="Árvore", exact=True
    ).click()
    expect(page.locator(".prototype-tree-assembly")).to_have_count(21)
    assert "?part=brakes" in page.url
    screenshot(page, "03-arvore.png")
    page.get_by_role("navigation", name="Navegação principal").get_by_role(
        "button", name="Veículo", exact=True
    ).click()
    page.locator(".prototype-vehicle-page").wait_for()
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    assert page.locator('canvas[data-persistence-token="same-canvas"]').count() == 1
    assert state(page)["cameraPosition"] == camera_before, (
        "Returning must retain the camera"
    )

    page.get_by_role("button", name="Desmontar", exact=True).click()
    page.wait_for_function(
        "document.querySelector('.prototype-viewport').__vehicleViewer.getState().actualExplosion > 0"
    )
    assert state(page)["mode"] == "exploded"
    assert state(page)["actualExplosion"] > 0
    assert state(page)["wheelCount"] == 4
    screenshot(page, "04-explosao.png")

    # A semantic battery child remains independently selectable, with parent references.
    page.get_by_role("navigation", name="Navegação principal").get_by_role(
        "button", name="Árvore", exact=True
    ).click()
    page.get_by_label("Buscar na árvore").fill("Bateria de tração")
    battery = page.locator(".prototype-tree-assembly").filter(
        has_text="Bateria de tração"
    )
    battery.locator(".prototype-tree-pieces > summary").click()
    battery.get_by_role("button", name="Módulo de células 01", exact=True).click()
    expect(page.locator(".prototype-tree-page .prototype-inspector h2")).to_have_text(
        "Módulo de células 01"
    )
    expect(page.locator(".prototype-tree-page .prototype-inherited")).to_contain_text(
        "não tem vínculo próprio revisado"
    )
    page.get_by_role("navigation", name="Navegação principal").get_by_role(
        "button", name="Veículo", exact=True
    ).click()
    page.get_by_role("button", name="Opções de visualização", exact=True).click()
    page.get_by_label("Isolar seleção", exact=True).check()
    page.wait_for_function(
        "document.querySelector('.prototype-viewport').__vehicleViewer.getState().isolated"
    )
    assert state(page)["selection"]["nodeId"] == "battery-module-01"
    screenshot(page, "04b-modulo-bateria.png")
    page.get_by_role("button", name="Fechar opções", exact=True).click()
    page.locator(".prototype-viewport canvas").focus()
    page.keyboard.press("Home")
    expect(page.get_by_role("button", name="Montado", exact=True)).to_have_attribute(
        "aria-pressed", "true"
    )

    page.get_by_role("navigation", name="Navegação principal").get_by_role(
        "button", name="Mapa", exact=True
    ).click()
    expect(page.locator(".prototype-stage-node")).to_have_count(9)
    map_region = page.get_by_role(
        "region", name="Mapa de etapas, com rolagem horizontal"
    )
    map_bounds = map_region.bounding_box()
    before_scroll = map_region.evaluate("el => el.scrollLeft")
    page.mouse.move(map_bounds["x"] + 240, map_bounds["y"] + map_bounds["height"] - 40)
    page.mouse.down()
    page.mouse.move(
        map_bounds["x"] + 120, map_bounds["y"] + map_bounds["height"] - 40, steps=3
    )
    page.mouse.up()
    assert map_region.evaluate("el => el.scrollLeft") > before_scroll
    page.locator(".prototype-stage-node").filter(
        has_text="Ambiental e eficiência"
    ).click()
    expect(page.locator(".prototype-stage-inspector h2")).to_have_text(
        "Ambiental e eficiência"
    )
    screenshot(page, "05-mapa.png")
    page.get_by_role("button", name="Perguntar sobre esta etapa", exact=False).click()
    assert page.get_by_label("O que você quer consultar?").input_value()
    page.get_by_role("button", name="Consultar", exact=True).click()
    page.locator(".prototype-answer").wait_for(timeout=15_000)
    assert (
        "A IA não está ativa nesta resposta."
        in page.locator(".prototype-answer").inner_text()
    )
    assert page.locator(".prototype-answer .prototype-act").count() > 0
    screenshot(page, "06-assistente.png")

    page.get_by_role("button", name="Abrir Biblioteca", exact=True).click()
    page.get_by_label("Buscar leis e referências").fill("492")
    assert page.locator(".prototype-library-page .prototype-act").count() >= 1
    screenshot(page, "07-biblioteca.png")
    page.get_by_role("button", name="Voltar à consulta", exact=False).click()
    page.wait_for_url("**/#assistente*")

    # A partial legal indication must remain explicit in the progressive details.
    page.goto(base + "prototipo/#biblioteca", wait_until="networkidle")
    page.reload(wait_until="networkidle")
    page.get_by_label("Buscar leis e referências").fill("1009")
    expect(page.locator(".prototype-library-page .prototype-act")).to_have_count(1)
    page.locator(".prototype-act-detail summary").first.click()
    assert (
        "Revogação parcial indicada"
        in page.locator(".prototype-library-page").inner_text()
    )

    page.get_by_role("navigation", name="Navegação principal").get_by_role(
        "button", name="Veículo", exact=True
    ).click()
    page.locator('[data-prototype-ready="true"]').wait_for(timeout=60_000)
    for width, height in [(390, 844), (320, 740)]:
        page.set_viewport_size({"width": width, "height": height})
        page.evaluate(
            "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
        )
        rendered_canvas = Image.open(
            BytesIO(page.locator(".prototype-viewport canvas").screenshot())
        ).convert("RGB")
        assert rendered_canvas.getcolors(maxcolors=512) is None, (
            "The actual vehicle must remain drawn after resizing"
        )
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
            width
        )
        assert page.get_by_role("navigation", name="Navegação principal").is_visible()
        screenshot(page, f"08-mobile-{width}.png")
        page.get_by_role("navigation", name="Navegação principal").get_by_role(
            "button", name="Árvore", exact=True
        ).click()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
            width
        )
        screenshot(page, f"09-arvore-{width}.png")
        page.get_by_role("navigation", name="Navegação principal").get_by_role(
            "button", name="Veículo", exact=True
        ).click()

    assert not errors, errors
    (OUT / "accessibility.json").write_text(
        json.dumps(AXE_RESULTS, ensure_ascii=False, indent=2)
    )
    assert not any(row["violations"] for row in AXE_RESULTS), "See accessibility.json"
    (OUT / "report.json").write_text(
        json.dumps(
            {
                "wheelCount": 4,
                "pieces": state(page)["pieceCount"],
                "routes": 5,
                "verifiedPdf": pdf_url,
                "errors": errors,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    browser.close()
print(
    "PASS: real raycast, four wheels, retained canvas/camera, legal sources, map, assistant fallback and 390/320px journeys"
)
