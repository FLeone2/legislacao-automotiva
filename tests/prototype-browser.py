"""Three-tab analyst journey against the real app, scene and published documents.

The assistant endpoint is deliberately unavailable in this suite. This exercises
an honest source-only fallback without contacting a remote model or using keys.
"""

import json
import math
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
TREE_FIT_ACTIONS = []
MAIN_CLEARANCE_PAIRS = [
    ("door-front-left", "door-rear-left"),
    ("door-front-right", "door-rear-right"),
    *[
        pair
        for side in ("left", "right")
        for pair in [
            (f"door-front-{side}", f"wheel-front-{side}"),
            (f"door-rear-{side}", f"wheel-rear-{side}"),
            (f"wheel-front-{side}", f"brake-front-{side}"),
            (f"wheel-rear-{side}", f"brake-rear-{side}"),
        ]
    ],
    ("engine", "cooling"),
    ("engine", "hood"),
    ("batteryHV", "front-axle"),
    ("batteryHV", "rear-axle"),
    ("batteryHV", "tank"),
    ("batteryHV", "exhaust"),
]


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
    if scope.count() and scope.evaluate(
        "el => Boolean(el.closest('.prototype-stage-plan:not([open])'))"
    ):
        page.locator(".prototype-stage-plan > summary").click()
        expect(page.locator(".prototype-stage-plan")).to_have_attribute("open", "")
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
    button = graph.get_by_role("button", name=label, exact=True).first
    if keyboard:
        button.focus()
        expect(button).to_be_focused()
        page.keyboard.press("Enter")
    else:
        graph.scroll_into_view_if_needed()
        expect(button).to_be_visible()
        if not tree_target_in_view(graph, button):
            graph.get_by_role("button", name="Enquadrar árvore", exact=True).click()
            frames(page)
            TREE_FIT_ACTIONS.append(label)
            assert tree_target_in_view(graph, button), (
                "The user-facing fit control must bring this node inside the tree viewport",
                label,
            )
        button.click()
    current = graph.locator(".is-current .prototype-node-main")
    expect(current).to_have_text(label)
    expect(current).to_be_focused()
    return page.locator(".prototype-tree-node-content")


def tree_target_in_view(graph, button):
    viewport = graph.bounding_box()
    target = button.bounding_box()
    if not viewport or not target:
        return False
    margin = 4
    return (
        target["x"] >= viewport["x"] + margin
        and target["y"] >= viewport["y"] + margin
        and target["x"] + target["width"] <= viewport["x"] + viewport["width"] - margin
        and target["y"] + target["height"]
        <= viewport["y"] + viewport["height"] - margin
    )


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
    page.get_by_role("button", name="Explodido", exact=True).click()
    page.wait_for_function("""() => {
        const s = document.querySelector('.prototype-viewport').__vehicleViewer.getState();
        return s.mode === 'exploded' && s.actualExplosion >= 0.64;
    }""")
    scene = state(page)
    diagnostics = scene["explosionDiagnostics"]
    assert diagnostics["coordinateFrame"] == "vehicle"
    assert diagnostics["movedPieceCount"] > 20, (
        "Exploding must move the actual GLB pieces, not replace the scene with an image"
    )
    assert_wheel_coherence(scene)
    assert len(diagnostics["brakeSets"]) == 4
    pieces = {piece["nodeId"]: piece for piece in diagnostics["pieces"]}
    brakes = {brake["corner"]: brake for brake in diagnostics["brakeSets"]}
    for wheel in diagnostics["coherentWheels"]:
        wheel_offsets = [
            math.dist(piece["origin"], piece["current"])
            for node_id in wheel["nodeIds"]
            if (piece := pieces.get(node_id))
        ]
        brake_offsets = [
            math.dist(piece["origin"], piece["current"])
            for node_id in brakes[wheel["corner"]]["nodeIds"]
            if (piece := pieces.get(node_id))
        ]
        assert wheel_offsets and brake_offsets
        assert sum(wheel_offsets) / len(wheel_offsets) > sum(brake_offsets) / len(
            brake_offsets
        ), "Pulling the road wheel outward must reveal its brake close to the axle"
    ratios = diagnostics["envelopeRatio"]
    ratios = (
        [ratios[key] for key in ("x", "y", "z")] if isinstance(ratios, dict) else ratios
    )
    assert len(ratios) == 3 and all(math.isfinite(ratio) for ratio in ratios)
    assert ratios[0] < 1.8 and ratios[2] < 2.4, ratios
    assert ratios[1] < 1.8, (
        "The overview must stay near the vehicle, without the previous tall parts column",
        ratios,
    )
    return scene


def assert_wheel_coherence(scene):
    diagnostics = scene["explosionDiagnostics"]
    assert scene["wheelCount"] == 4
    assert {wheel["corner"] for wheel in scene["wheelPositions"]} == {
        "front-left",
        "front-right",
        "rear-left",
        "rear-right",
    }
    assert len(diagnostics["coherentWheels"]) == 4
    assert len({wheel["corner"] for wheel in diagnostics["coherentWheels"]}) == 4
    assert all(
        wheel["offsetSpread"] < 0.00001 for wheel in diagnostics["coherentWheels"]
    ), "Tire and rim must travel with their physical wheel corner"


def set_explosion(page, amount):
    slider = page.get_by_role("slider", name="Separação dos conjuntos", exact=True)
    slider.fill(str(amount))
    expect(slider).to_have_value(str(amount))
    page.wait_for_function(
        """amount => {
            const s = document.querySelector('.prototype-viewport').__vehicleViewer.getState();
            return Math.abs(s.actualExplosion - amount) < .000001;
        }""",
        arg=amount,
    )
    frames(page)
    scene = state(page)
    assert_wheel_coherence(scene)
    return scene


def select_assembly(page, assembly_id, label):
    page.locator(".prototype-picker-trigger").click()
    page.get_by_label("Buscar componente", exact=True).fill(label)
    page.locator(".prototype-picker-popover").get_by_role(
        "button", name=label, exact=True
    ).click()
    page.wait_for_function(
        """id => document.querySelector('.prototype-viewport').__vehicleViewer
            .getState().selection.assemblyId === id""",
        arg=assembly_id,
    )
    expect(page.locator("#prototype-vehicle-references h2")).to_have_text(label)
    frames(page)


def real_bounds(scene, identifier, piece=False):
    rows = scene["explosionDiagnostics"]["pieces" if piece else "groups"]
    row = next(
        (row for row in rows if row["nodeId" if piece else "id"] == identifier), None
    )
    assert row, ("Actual rendered geometry must expose its world bounds", identifier)
    if piece:
        assert row["visible"], (
            "The detailed part must actually be rendered",
            identifier,
        )
    return row["currentBounds"]


def assert_real_clearance(scene, first, second, first_piece=False, second_piece=False):
    a = real_bounds(scene, first, first_piece)
    b = real_bounds(scene, second, second_piece)
    # Physical 3D boxes can separate on any axis. A projected screen overlap is
    # legitimate during orbit; hollow body/cabin fits are deliberately excluded.
    gap = math.hypot(
        *[
            max(0, b["min"][axis] - a["max"][axis], a["min"][axis] - b["max"][axis])
            for axis in range(3)
        ]
    )
    assert gap >= 0.015, (first, second, scene["actualExplosion"], gap, a, b)
    return {"first": first, "second": second, "gapMeters": gap}


def assert_exterior_extraction(scene):
    # A frontward extraction must pass the foremost fascia X plane entirely.
    # This uses one exterior boundary, without treating the hollow cabin as solid.
    plane = real_bounds(scene, "body")["min"][0]
    gaps = {}
    for assembly_id in ("engine", "cooling"):
        rear_edge = real_bounds(scene, assembly_id)["max"][0]
        gap = plane - rear_edge
        assert gap >= 0.015, (
            "The removed assembly must clear the bumper/grille plane",
            assembly_id,
            scene["selection"],
            scene["actualExplosion"],
            rear_edge,
            plane,
        )
        gaps[assembly_id] = gap
    side_plane = real_bounds(scene, "body")["min"][2]
    tank_gap = side_plane - real_bounds(scene, "tank")["max"][2]
    assert tank_gap >= 0.015, (
        "The removed fuel tank must clear the exterior side plane",
        scene["selection"],
        scene["actualExplosion"],
        tank_gap,
    )
    gaps["tankLateral"] = tank_gap
    return gaps


def assert_door_coherence(scene, expected_members):
    pieces = {row["nodeId"]: row for row in scene["explosionDiagnostics"]["pieces"]}
    groups = {row["id"]: row for row in scene["explosionDiagnostics"]["groups"]}
    for group_id, members in expected_members.items():
        assert set(groups[group_id]["nodeIds"]) == members
        offsets = [pieces[node_id]["offset"] for node_id in members]
        assert all(math.dist(offsets[0], offset) < 0.00001 for offset in offsets), (
            "Glass and trim must remain attached to their physical door panel",
            group_id,
            scene["selection"],
            scene["actualExplosion"],
        )


def piece_positions(scene):
    return {
        piece["nodeId"]: piece["current"]
        for piece in scene["explosionDiagnostics"]["pieces"]
    }


def assert_same_positions(expected, actual, tolerance=0.00001):
    assert expected.keys() == actual.keys()
    for node_id in expected:
        assert (
            max(
                abs(left - right)
                for left, right in zip(expected[node_id], actual[node_id], strict=True)
            )
            < tolerance
        ), (node_id, expected[node_id], actual[node_id])


def assert_assembled(page):
    page.get_by_role("button", name="Montado", exact=True).click()
    page.wait_for_function("""() => {
        const s = document.querySelector('.prototype-viewport').__vehicleViewer.getState();
        return s.mode === 'assembled' && s.actualExplosion < 0.000001;
    }""")
    scene = state(page)
    for piece in scene["explosionDiagnostics"]["pieces"]:
        assert (
            max(
                abs(left - right)
                for left, right in zip(piece["origin"], piece["current"], strict=True)
            )
            < 0.00001
        ), (piece["nodeId"], piece["origin"], piece["current"])
    return scene


def explosion_regression(page, viewport):
    """Exercise the reported 97% mobile pose using actual rendered transforms."""
    page.set_viewport_size({"width": 390, "height": 844})
    navigate(page, "Veículo")
    page.wait_for_function("""() => {
        const s = document.querySelector('.prototype-viewport').__vehicleViewer.getState();
        return s.viewport.width === s.viewport.visibleWidth
            && s.viewport.height === s.viewport.visibleHeight
            && s.viewport.visibleWidth <= innerWidth;
    }""")
    clear = page.get_by_role("button", name="Limpar seleção", exact=True)
    if clear.count():
        clear.click()
    page.wait_for_function("""() => !document.querySelector('.prototype-viewport')
        .__vehicleViewer.getState().selection.assemblyId""")
    samples, report = {}, {"width": 390, "samples": [], "selections": []}
    for amount in (0, 0.5, 0.65, 0.97, 1):
        scene = set_explosion(page, amount)
        assert not scene["selection"]["assemblyId"]
        samples[amount] = scene
        assert scene["explosionDiagnostics"]["coordinateFrame"] == "vehicle"
        ratios = scene["explosionDiagnostics"]["envelopeRatio"]
        assert all(math.isfinite(ratio) for ratio in ratios)
        assert ratios[0] < 1.8 and ratios[1] < 1.8 and ratios[2] < 2.4, ratios
        clearances = (
            [
                assert_real_clearance(scene, first, second)
                for first, second in MAIN_CLEARANCE_PAIRS
            ]
            if amount >= 0.65
            else []
        )
        report["samples"].append(
            {
                "amount": amount,
                "movedPieces": scene["explosionDiagnostics"]["movedPieceCount"],
                "envelopeRatio": scene["explosionDiagnostics"]["envelopeRatio"],
                "clearances": clearances,
                "exteriorExtractionGaps": assert_exterior_extraction(scene)
                if amount >= 0.65
                else {},
            }
        )
        if amount in (0.97, 1):
            viewport.scroll_into_view_if_needed()
            capture(page, f"08-mobile-{round(amount * 100):03d}.png")
    positions = {amount: piece_positions(scene) for amount, scene in samples.items()}
    for piece in samples[0]["explosionDiagnostics"]["pieces"]:
        assert math.dist(piece["origin"], piece["current"]) < 0.00001
    assert positions[0].keys() == positions[1].keys()
    for group_id in (
        "hood",
        "engine",
        "batteryHV",
        "door-front-left",
        "wheel-front-left",
    ):
        group = next(
            group
            for group in samples[0.65]["explosionDiagnostics"]["groups"]
            if group["id"] == group_id
        )
        node_id = group["nodeIds"][0]
        assert math.dist(positions[0][node_id], positions[0.5][node_id]) > 0.02
        first_delta = math.dist(positions[0.65][node_id], positions[0.97][node_id])
        last_delta = math.dist(positions[0.97][node_id], positions[1][node_id])
        assert first_delta > 0.02, (
            "65→97% must not plateau without a selection",
            group_id,
            first_delta,
        )
        assert last_delta > 0.00001, (
            "97→100% still moves geometry",
            group_id,
            last_delta,
        )
        report.setdefault("continuedMovement", []).append(
            {
                "group": group_id,
                "65to97Meters": first_delta,
                "97to100Meters": last_delta,
            }
        )

    # The same physical pose must survive orbit and a landscape resize.
    canvas = viewport.locator("canvas")
    canvas.focus()
    page.keyboard.press("ArrowLeft")
    frames(page)
    orbit = state(page)
    assert orbit["cameraPosition"] != samples[1]["cameraPosition"]
    assert_same_positions(positions[1], piece_positions(orbit))
    page.set_viewport_size({"width": 1600, "height": 1000})
    frames(page)
    assert_same_positions(positions[1], piece_positions(state(page)))
    page.set_viewport_size({"width": 390, "height": 844})
    frames(page)

    door_members = {
        group["id"]: set(group["nodeIds"])
        for group in samples[0.65]["explosionDiagnostics"]["groups"]
        if group["id"].startswith("door-") or group["id"] == "tailgate"
    }
    assert len(door_members) == 5
    for assembly_id in ("body", "engine", "brakes", "chassis", "batteryHV", "doors"):
        label = next(
            row["label"] for row in CATALOG["assemblies"] if row["id"] == assembly_id
        )
        select_assembly(page, assembly_id, label)
        selected_samples = {}
        for amount in (0.65, 0.97, 1):
            scene = set_explosion(page, amount)
            assert scene["selection"]["assemblyId"] == assembly_id
            selected_samples[amount] = scene
            if assembly_id in ("body", "doors"):
                assert_door_coherence(scene, door_members)
            if amount == 0.65:
                continue
            clearances = []
            if assembly_id == "engine":
                pairs = [
                    ("engine-head", "engine-block"),
                    ("engine-cam-cover", "engine-head"),
                    *[
                        ("engine-block", f"engine-piston-{number:02d}")
                        for number in range(1, 5)
                    ],
                    *[
                        ("engine-cam-cover", f"engine-ignition-coil-{number:02d}")
                        for number in range(1, 5)
                    ],
                ]
                clearances.extend(
                    assert_real_clearance(scene, first, second, True, True)
                    for first, second in pairs
                )
                clearances.append(
                    assert_real_clearance(scene, "engine-head", "hood", True)
                )
                clearances.append(assert_real_clearance(scene, "engine", "cooling"))
            elif assembly_id in ("brakes", "chassis"):
                for axle in ("front", "rear"):
                    for side in ("left", "right"):
                        corner = f"{axle}-{side}"
                        clearances.append(
                            assert_real_clearance(
                                scene,
                                f"brake-{corner}"
                                if assembly_id == "brakes"
                                else f"{corner}-spring",
                                f"wheel-{corner}",
                                assembly_id == "chassis",
                            )
                        )
            elif assembly_id == "batteryHV":
                clearances.extend(
                    assert_real_clearance(
                        scene,
                        "battery-cover",
                        f"battery-module-{number:02d}",
                        True,
                        True,
                    )
                    for number in range(1, 11)
                )
                clearances.extend(
                    assert_real_clearance(scene, "batteryHV", neighbor)
                    for neighbor in ("front-axle", "rear-axle", "tank", "exhaust")
                )
            report["selections"].append(
                {
                    "assembly": assembly_id,
                    "amount": amount,
                    "clearances": clearances,
                    "exteriorExtractionGaps": assert_exterior_extraction(scene)
                    if assembly_id in ("body", "engine", "batteryHV")
                    else {},
                }
            )
        start_positions = piece_positions(selected_samples[0.65])
        end_positions = piece_positions(selected_samples[1])
        assert any(
            math.dist(start_positions[node_id], point) > 0.02
            for node_id, point in end_positions.items()
        ), ("The selected pose must continue opening above 65%", assembly_id)
        if assembly_id == "engine":
            canvas.focus()
            page.keyboard.press("ArrowRight")
            frames(page)
            assert_same_positions(
                piece_positions(selected_samples[1]), piece_positions(state(page))
            )
        viewport.scroll_into_view_if_needed()
        capture(page, f"09-mobile-{assembly_id}-100.png")
        no_overflow(page)
    assert_assembled(page)
    select_assembly(page, "brakes", "Freios e estabilidade")
    set_explosion(page, 0.65)
    (OUT / "explosion-regression.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2)
    )
    return report


def assert_centered_tree(page):
    graph = page.get_by_role("region", name="Árvore de legislação expansível")
    stage = graph.locator(".centered-tree-stage")
    expect(stage).to_be_visible()
    frames(page)
    bounds = graph.bounding_box()
    root = graph.locator('.prototype-graph-node[data-side="root"]').bounding_box()
    assert root and bounds
    root_x = root["x"] + root["width"] / 2
    root_y = root["y"] + root["height"] / 2
    assert abs(root_x - (bounds["x"] + bounds["width"] / 2)) < 64
    assert abs(root_y - (bounds["y"] + bounds["height"] / 2)) < 64
    left = graph.locator('.prototype-graph-node[data-side="left"]')
    right = graph.locator('.prototype-graph-node[data-side="right"]')
    assert left.count() and right.count()
    assert all(
        (box := node.bounding_box()) and box["x"] + box["width"] / 2 < root_x
        for node in left.all()
    )
    assert all(
        (box := node.bounding_box()) and box["x"] + box["width"] / 2 > root_x
        for node in right.all()
    )


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

        # The game-style assembly menu and searchable picker are real selection controls.
        assembly_menu = page.get_by_role("group", name="Conjuntos do veículo")
        expect(assembly_menu).to_be_visible()
        brakes_button = assembly_menu.get_by_role(
            "button", name="Freios e estabilidade", exact=True
        )
        brakes_button.click()
        expect(brakes_button).to_have_attribute("aria-pressed", "true")
        page.wait_for_function(
            "document.querySelector('.prototype-viewport').__vehicleViewer.getState().selection.assemblyId === 'brakes'"
        )
        page.locator(".prototype-picker-trigger").click()
        page.get_by_label("Buscar componente", exact=True).fill("Motor a combustão")
        page.locator(".prototype-picker-popover").get_by_role(
            "button", name="Motor a combustão", exact=True
        ).click()
        page.wait_for_function(
            "document.querySelector('.prototype-viewport').__vehicleViewer.getState().selection.assemblyId === 'engine'"
        )
        brakes_button.click()
        expect(brakes_button).to_have_attribute("aria-pressed", "true")
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
        assembled_scene = assert_assembled(page)
        assembled_positions = piece_positions(assembled_scene)
        exploded_scene = assert_exploded(page)
        exploded_positions = piece_positions(exploded_scene)
        assert any(
            math.dist(assembled_positions[node_id], exploded_positions[node_id]) > 0.05
            for node_id in assembled_positions
        ), "The GLB geometry must move in 3D space"
        canvas.focus()
        page.keyboard.press("ArrowLeft")
        frames(page)
        orbit_scene = state(page)
        assert orbit_scene["cameraPosition"] != exploded_scene["cameraPosition"]
        assert_same_positions(exploded_positions, piece_positions(orbit_scene))
        restored_scene = assert_assembled(page)
        assert_same_positions(assembled_positions, piece_positions(restored_scene))
        exploded_scene = assert_exploded(page)
        exploded_positions = piece_positions(exploded_scene)
        capture(page, "04-explosao.png", accessibility=True)

        # The process is seven chronological groups backed by nineteen concrete analyst steps.
        navigate(page, "Homologação")
        expect(page.locator(".prototype-linear-flow li")).to_have_count(7)
        assert len(STEPS) == 19
        choose_step(page, "em-03-coastdown")
        expect(
            page.locator(".prototype-tree-node-content .prototype-condition-state")
        ).to_have_text("Condição a confirmar")
        assert_centered_tree(page)
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
        tree_stage = graph.locator(".centered-tree-stage")
        initial_zoom = float(tree_stage.get_attribute("data-zoom"))
        graph.get_by_role("button", name="Ampliar árvore", exact=True).click()
        page.wait_for_function(
            "before => Number(document.querySelector('.centered-tree-stage').dataset.zoom) > before",
            arg=initial_zoom,
        )
        expanded_zoom = tree_stage.get_attribute("data-zoom")
        details = tree_choose(page, "Frenagem e ABS", keyboard=True)
        expect(details).to_contain_text("Controle de relatório: nível 2")
        expect(tree_stage).to_have_attribute("data-zoom", expanded_zoom)
        expect(graph.locator('.prototype-graph-node[data-side="root"]')).to_be_visible()
        tree_choose(page, "Resolução CONTRAN 915/2022", keyboard=True)
        expect(tree_stage).to_have_attribute("data-zoom", expanded_zoom)
        expect(
            graph.get_by_role("button", name="Frenagem e ABS", exact=True).first
        ).to_be_visible()
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
        capture(page, "05a-arvore-expandida.png", accessibility=True)

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

        # Reproduce the reported plateau and real collisions on a 390px screen.
        explosion_report = explosion_regression(page, viewport)

        # Real mobile canvas and independent tree scrolling at both narrow widths.
        for width, height in [(390, 844), (320, 740)]:
            page.set_viewport_size({"width": width, "height": height})
            navigate(page, "Veículo")
            viewport.scroll_into_view_if_needed()
            assert_scene(page)
            mobile_scene = assert_exploded(page)
            assert_same_positions(exploded_positions, piece_positions(mobile_scene))
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
        assert len(AXE_RESULTS) >= 8
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
                    "coordinateFrame": exploded_scene["explosionDiagnostics"][
                        "coordinateFrame"
                    ],
                    "movedPieces": exploded_scene["explosionDiagnostics"][
                        "movedPieceCount"
                    ],
                    "explodedEnvelopeRatio": exploded_scene["explosionDiagnostics"][
                        "envelopeRatio"
                    ],
                    "glbRequests": len(glb_requests),
                    "initialGlbRequests": 0,
                    "treeFitActions": TREE_FIT_ACTIONS,
                    "explosionSamples": len(explosion_report["samples"]),
                    "detailedExplosionSelections": len(explosion_report["selections"]),
                    "errors": errors,
                    "accessibilityScreens": len(AXE_RESULTS),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        browser.close()
