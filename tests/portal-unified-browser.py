"""Whole-portal navigation, mobile reading and source-backed dialog acceptance.

The existing suites own the detailed legal/data and 3D behavior checks. This
matrix closes the integration gaps across the unified shell, themes and routes;
screenshots are review artifacts, not automatically accepted visual baselines.
"""

import asyncio
import hashlib
import json
from pathlib import Path
import subprocess
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright, expect

from browser_support import (
    TestServer,
    click_navigation,
    launch_options,
    select_theme,
    wait_for_route,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/portal-unified"
THEMES = ("dark", "light", "aurora")
ANATEL_COUNT = json.loads((ROOT / "data/anatel/active.json").read_text())["metadata"][
    "activeCount"
]
PROCESS_MODEL = json.loads(
    subprocess.check_output(
        [
            "node",
            "-e",
            "const p=require('./src/guide/process-model.js');"
            "console.log(JSON.stringify({profile:p.DEFAULT_PROFILE,"
            "checkId:p.buildChecklist(p.DEFAULT_PROFILE)[0].id}));",
        ],
        cwd=ROOT,
        text=True,
    )
)

# Route contracts are shared with the owning components and existing suites.
CASES = (
    (
        "guide",
        "#guide?tab=coverage",
        '.g-coverage[data-coverage-state="ready"]',
        "guide",
    ),
    ("vehicle", "#vehicle", '.g3d[data-g3d-ready="true"]', "vehicle"),
    ("reference", "#vehicle?view=reference", "#vehicleDrawing", "vehicle"),
    ("flow", "#flow?stage=seguranca", "#flowDetailPanel", "flow"),
    (
        "tree",
        "#tree?node=seg-freios&tab=documents&presentation=list",
        "[data-tree-list]",
        "tree",
    ),
    (
        "mover",
        "#mover?node=mover%2Frequisitos&tab=documents&presentation=list",
        "[data-tree-list]",
        "mover",
    ),
    ("library", "#library?agency=INMETRO&q=145", ".document", "library"),
    (
        "knowledge",
        "#knowledge",
        ".knowledge-page[data-knowledge-revision]",
        "knowledge",
    ),
    ("contran", "#contran?record=contran-949-2022", ".contran-record", "contran"),
    ("proconve", "#proconve?phase=L8", ".contran-record", "proconve"),
    ("inmetro", "#inmetro?record=inmetro-145-2022", ".contran-record", "inmetro"),
    ("anatel", "#anatel?record=anatel-res715", ".contran-record", "anatel"),
    ("markings", "#markings", "#markings-vin", "markings"),
    ("updates", "#updates", ".update-card", "updates"),
    (
        "history",
        "#history?agency=contran&record=contran-220-2007",
        ".regulatory-history",
        "library",
    ),
)


async def visit(page, base, route, selector):
    await page.goto(base + route)
    await wait_for_route(page)
    await page.locator(selector).first.wait_for(timeout=90_000)


async def no_overflow(page, label):
    metrics = await page.evaluate("""() => ({
        available: innerWidth,
        width: document.documentElement.scrollWidth,
        heading: document.querySelector('#main h1')?.textContent,
        font: getComputedStyle(document.querySelector('#main')).fontFamily,
        theme: document.documentElement.dataset.theme
    })""")
    assert metrics["width"] <= metrics["available"] + 1, (label, metrics)
    assert metrics["heading"] and metrics["heading"].strip(), (label, metrics)
    heading_bounds = await page.locator("#main h1").first.evaluate("""heading => {
        const range = document.createRange();
        range.selectNodeContents(heading);
        return [...range.getClientRects()].map(rect => ({left:rect.left, right:rect.right}));
    }""")
    assert all(
        bound["left"] >= -1 and bound["right"] <= metrics["available"] + 1
        for bound in heading_bounds
    ), (label, "Heading text must remain within the viewport", heading_bounds)
    return metrics


async def axe_check(page, label, findings):
    if not await page.evaluate("typeof window.axe !== 'undefined'"):
        await page.add_script_tag(path=str(ROOT / "node_modules/axe-core/axe.min.js"))
    result = await page.evaluate("""async () => await axe.run(document, {
        runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}
    })""")
    findings.extend(
        {
            "context": label,
            "id": violation["id"],
            "impact": violation["impact"],
            "nodes": [
                {"target": node["target"], "summary": node["failureSummary"]}
                for node in violation["nodes"]
            ],
        }
        for violation in result["violations"]
    )


async def screenshot(page, name):
    # A viewport shows the real responsive hierarchy. Huge document dumps and
    # stitched images would conceal which controls are visible during use.
    await page.screenshot(path=str(OUT / (name + ".png")), animations="disabled")


async def source_dialog_journey(page, base, label, findings):
    await visit(page, base, "#library?agency=INMETRO&q=145", ".document")
    target = page.locator('.document[data-catalog-act="inmetro-145-2022"]')
    await expect(target).to_be_visible()
    before = page.url
    opener = target.locator("[data-open]")
    await opener.click()
    await expect(page.locator("#normDialog")).to_be_visible()
    await expect(page.locator("#normDialogTitle")).to_contain_text("145/2022")
    # Legal uncertainty remains readable after the presentation changes.
    await expect(page.locator("#normDialog .regulatory-state-grid")).to_contain_text(
        "Referência e orientação oficiais"
    )
    official = page.locator('#normDialog .actions a[href^="http"]').first
    await expect(official).to_be_visible()
    href = await official.get_attribute("href")
    parsed = urlsplit(href)
    assert parsed.scheme in ("http", "https") and parsed.netloc, href
    assert parsed.netloc != urlsplit(base).netloc, href
    await axe_check(page, label + "-reference-dialog", findings)
    await screenshot(page, label + "-reference-dialog")
    await page.keyboard.press("Escape")
    await expect(page.locator("#normDialog")).not_to_be_visible()
    assert page.url == before
    await expect(opener).to_be_focused()
    return {"record": "inmetro-145-2022", "officialUrl": href, "origin": before}


async def search_journey(page, label, findings):
    origin = page.url
    trigger = page.locator("#searchTrigger")
    await trigger.focus()
    await page.keyboard.press("Control+k")
    await expect(page.locator("#searchDialog")).to_be_visible()
    await expect(page.locator("#globalSearch")).to_be_focused()
    await page.locator("#globalSearch").fill("951")
    await expect(page.locator("#searchResults")).to_contain_text("951/2022")
    await axe_check(page, label + "-search-dialog", findings)
    await screenshot(page, label + "-search-dialog")
    selected = await page.evaluate("""() => catalogSearchUI.entries.findIndex(
        item => item.kind === 'record' &&
        catalogIdentity(catalogRecord(catalog, item.id)) === 'contran-951-2022'
    )""")
    assert selected >= 0
    await page.locator(f'[data-search-result="{selected}"]').click()
    await expect(page.locator("#searchDialog")).not_to_be_visible()
    await expect(page.locator("#normDialogTitle")).to_contain_text("951/2022")
    assert page.url == origin, "A modal consultation must retain its origin route"
    await page.keyboard.press("Escape")
    await expect(trigger).to_be_focused()
    await trigger.click()
    await page.locator("#globalSearch").fill("no-results-portal-unified-xyz")
    await expect(page.locator("#searchStatus")).to_contain_text(
        "Nenhuma referência encontrada"
    )
    await expect(page.locator("[data-search-result]")).to_have_count(0)
    await page.keyboard.press("Escape")
    await expect(trigger).to_be_focused()
    assert page.url == origin


async def library_journey(page, base):
    await visit(page, base, "#library", ".document")
    await page.locator("#agencyFilter").select_option("ANATEL")
    await expect(page.locator(".document")).to_have_count(ANATEL_COUNT)
    values = parse_qs(urlsplit(page.url).fragment.partition("?")[2])
    assert values["agency"] == ["ANATEL"]
    permalink = await page.locator("#libraryPermalink").get_attribute("href")
    assert parse_qs(urlsplit(permalink).fragment.partition("?")[2])["agency"] == [
        "ANATEL"
    ]
    await page.reload()
    await wait_for_route(page)
    await expect(page.locator("#agencyFilter")).to_have_value("ANATEL")
    await expect(page.locator(".document")).to_have_count(ANATEL_COUNT)
    await page.locator("#librarySearch").fill("no-results-portal-unified-xyz")
    await expect(page.locator("#documents .empty")).to_be_visible()
    await page.locator("#clearEmpty").click()
    await wait_for_route(page)
    await expect(page.locator("#librarySearch")).to_have_value("")
    await expect(page.locator("#agencyFilter")).to_have_value("")
    assert await page.locator(".document").count() > 0


async def mobile_navigation(page):
    for view, selector in (("flow", ".homologation-step"), ("library", ".document")):
        await click_navigation(page, view)
        await wait_for_route(page)
        await page.locator(selector).first.wait_for()
        await expect(page.locator(f'[data-nav="{view}"]')).to_have_attribute(
            "aria-current", "page"
        )
        await expect(page.locator("#navigationToggle")).to_have_attribute(
            "aria-expanded", "false"
        )


async def consultation_to_project(page, base):
    """The new entry points retain the consulted subject and browser return."""
    origin = "#tree?node=seg-freios&tab=documents&presentation=list"
    await visit(page, base, origin, "[data-tree-list]")
    link = page.locator('.tree-guide-context a[href*="part=brakes"]')
    await expect(link).to_be_visible()
    await link.click()
    await wait_for_route(page)
    await page.locator('.g3d[data-g3d-ready="true"]').wait_for(timeout=90_000)
    values = parse_qs(urlsplit(page.url).fragment.partition("?")[2])
    assert values["tab"] == ["explore"]
    assert values["part"] == ["brakes"] and values["tree"] == ["assemblies"]
    await page.go_back()
    await wait_for_route(page)
    await expect(page.locator("[data-tree-list]")).to_be_visible()
    values = parse_qs(urlsplit(page.url).fragment.partition("?")[2])
    assert values["node"] == ["seg-freios"] and values["tab"] == ["documents"]

    await visit(page, base, "#flow?stage=seguranca", "#flowDetailPanel")
    await page.locator('.flow-guide-context a[href*="tab=checklist"]').click()
    await wait_for_route(page)
    await expect(page.locator(".g-checklist")).to_be_visible()
    await expect(page.locator("#g-tab-checklist")).to_have_attribute(
        "aria-selected", "true"
    )
    values = parse_qs(urlsplit(page.url).fragment.partition("?")[2])
    assert values["stage"] == ["seguranca"]
    await page.go_back()
    await wait_for_route(page)
    await expect(page.locator("#flowDetailPanel")).to_be_visible()
    assert parse_qs(urlsplit(page.url).fragment.partition("?")[2])["stage"] == [
        "seguranca"
    ]


async def project_continuity(page, base):
    """A selected local project survives consultation outside the React guide."""
    print("Portal journey: selected local process across tabs", flush=True)
    first, second = "unified-qa-first", "unified-qa-second"
    key = "homologation-projects-v1"
    projects = [
        {
            "schemaVersion": 1,
            "id": project_id,
            "profile": {**PROCESS_MODEL["profile"], "name": name},
            "checks": {
                PROCESS_MODEL["checkId"]: {
                    "status": "in_progress",
                    "note": f"Nota de teste preservada: {project_id}",
                    "evidence": f"Relatório QA: {project_id}",
                }
            },
        }
        for project_id, name in (
            (first, "Primeiro processo de controle QA"),
            (second, "Segundo processo selecionado QA"),
        )
    ]
    # Fixtures live only in this temporary browser context. Technical fields come
    # from the real default model, so the production validator remains in charge.
    await page.evaluate(
        """data => localStorage.setItem(data.key, JSON.stringify(data.projects))""",
        {"key": key, "projects": projects},
    )
    await visit(page, base, f"#guide?tab=checklist&project={first}", ".g-checklist")
    disclosure = page.locator(".g-project-disclosure")
    if await disclosure.get_attribute("open") is None:
        await disclosure.locator("summary").click()
    await page.locator("#g-project-select").select_option(second)
    await expect(page.locator("#g-project-select")).to_have_value(second)
    await page.wait_for_function(
        "id => localStorage.getItem('homologation-active-project-v1') === id",
        arg=second,
    )
    for view, ready in (
        ("library", ".document"),
        ("flow", ".homologation-step"),
        ("vehicle", '.g3d[data-g3d-ready="true"]'),
    ):
        await click_navigation(page, view)
        await wait_for_route(page)
        await page.locator(ready).first.wait_for(timeout=90_000)
        bar = page.locator("#portalContextBar")
        await expect(bar).to_be_visible()
        await expect(bar.locator("strong")).to_have_text(
            "Segundo processo selecionado QA"
        )
        link = bar.locator("a")
        values = parse_qs(
            urlsplit(await link.get_attribute("href")).fragment.partition("?")[2]
        )
        assert values["project"] == [second] and values["tab"] == ["checklist"]
        saved = await page.evaluate("key => JSON.parse(localStorage.getItem(key))", key)
        assert saved == projects, (
            "Consultation must not rewrite the project's profile or evidence"
        )
        await link.click()
        await wait_for_route(page)
        await expect(page.locator(".g-checklist")).to_be_visible()
        await expect(page.locator("#g-project-select")).to_have_value(second)
        await expect(page.locator("#portalContextBar")).not_to_be_visible()
    return {
        "project": second,
        "consulted": ["library", "flow", "vehicle"],
        "evidencePreserved": True,
    }


async def primary_vehicle_journey(page, base):
    """The shared 3D route preserves exact part scope and camera while browsing."""
    print("Portal journey: primary 3D selection and 2D round trip", flush=True)
    await visit(
        page,
        base,
        "#vehicle?part=brakes&tree=assemblies",
        '.g3d[data-g3d-ready="true"]',
    )
    await expect(
        page.locator('.g-parts-tree [data-assembly="brakes"]')
    ).to_have_attribute("aria-pressed", "true")
    canvas = await page.locator(".g3d canvas").element_handle()
    await page.locator("#portal-part-search").fill("brakeFluid")
    await page.locator('.g-parts-tree [data-assembly="brakeFluid"]').click()
    await wait_for_route(page)
    await expect(
        page.locator('.g-parts-tree [data-assembly="brakeFluid"]')
    ).to_have_attribute("aria-pressed", "true")
    assert await canvas.evaluate("node => node.isConnected"), (
        "Selecting another component must preserve the active 3D canvas/camera"
    )
    await expect(page.locator(".g-part-inspector h2")).to_contain_text(
        "fluido de freio"
    )
    await page.locator(".g-traceability").wait_for()
    await expect(
        page.get_by_text(
            "Carregando dispositivos e evidências do conjunto…", exact=True
        )
    ).not_to_be_visible()
    trace = await page.locator(".g-traceability").inner_text()
    assert "915/2022" not in trace and "954/2022" not in trace, (
        "Fluid selection must not inherit whole-brake-system ABS/ESC references",
        trace,
    )
    await page.get_by_label("Vista explodida", exact=True).check()
    await wait_for_route(page)
    assert parse_qs(urlsplit(page.url).fragment.partition("?")[2])["exploded"] == ["1"]
    await page.get_by_role("link", name="Referência 2D", exact=True).click()
    await wait_for_route(page)
    await expect(page.locator("#vehicleDrawing")).to_be_visible()
    values = parse_qs(urlsplit(page.url).fragment.partition("?")[2])
    assert values["assembly"] == ["brakeFluid"] and values["view"] == ["reference"]
    await page.get_by_role("link", name="Modelo 3D", exact=True).click()
    await wait_for_route(page)
    await page.locator('.g3d[data-g3d-ready="true"]').wait_for(timeout=90_000)
    await expect(
        page.locator('.g-parts-tree [data-assembly="brakeFluid"]')
    ).to_have_attribute("aria-pressed", "true")
    return {"vehicle": "3D → brakeFluid → 2D → 3D", "exactScope": True}


async def knowledge_journey(page, base):
    """Published Markdown remains reachable, verifiable and distinct from candidates."""
    print("Portal journey: knowledge filters, Markdown and retry", flush=True)
    await visit(page, base, "#knowledge", ".knowledge-page")
    await page.locator("#knowledgeKind").select_option("acts")
    await page.locator("#knowledgeAgency").select_option("INMETRO")
    await page.locator("#knowledgeSearch").fill("145")
    card = page.locator('[data-knowledge-id="inmetro-145-2022"]')
    await expect(card).to_be_visible()
    await expect(page.locator("#knowledgeCandidates")).not_to_be_visible()
    permalink = await page.locator("#knowledgePermalink").get_attribute("href")
    assert parse_qs(urlsplit(permalink).fragment.partition("?")[2]) == {
        "q": ["145"],
        "kind": ["acts"],
        "agency": ["INMETRO"],
        "page": ["1"],
    }
    markdown = await card.get_by_role("link", name="Ficha Markdown").get_attribute(
        "href"
    )
    manifest_response = await page.request.get(base + "knowledge/manifest.json")
    assert manifest_response.ok
    manifest = await manifest_response.json()
    markdown_response = await page.request.get(base + markdown)
    assert markdown_response.ok
    body = await markdown_response.body()
    assert (
        hashlib.sha256(body).hexdigest()
        == manifest["artifacts"][markdown.removeprefix("knowledge/")]
    )
    assert "145" in body.decode("utf-8")
    await page.reload()
    await wait_for_route(page)
    await expect(page.locator("#knowledgeSearch")).to_have_value("145")
    await expect(page.locator("#knowledgeAgency")).to_have_value("INMETRO")
    await expect(card).to_be_visible()
    await page.locator("#knowledgeSearch").fill("no-results-portal-unified-xyz")
    await expect(page.locator("#knowledgeRecords .empty")).to_be_visible()
    await page.locator("[data-knowledge-clear]").click()
    await expect(page.locator("#knowledgeSearch")).to_have_value("")
    await page.locator("#knowledgeKind").select_option("candidates")
    await expect(page.locator("#knowledgeCandidates")).to_be_visible()
    await expect(
        page.locator("#knowledgeCandidateRecords .knowledge-record")
    ).to_have_count(manifest["counts"]["candidates"])
    await expect(page.locator("#knowledgeRecords .knowledge-record")).to_have_count(0)
    # A cold navigation must render a useful retry rather than a blank screen.
    await page.route("**/knowledge/manifest.json", lambda route: route.abort())
    await page.goto(base + "#knowledge")
    await page.reload()
    await wait_for_route(page)
    await expect(page.locator("#knowledgeRetry")).to_be_visible()
    await page.unroute("**/knowledge/manifest.json")
    await page.locator("#knowledgeRetry").click()
    await expect(page.locator(".knowledge-page")).to_be_visible()
    return {
        "knowledge": "Markdown SHA-256 verified",
        "retry": True,
        "candidateSeparation": True,
    }


async def exercise(base):
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"status": "running", "cases": [], "journeys": [], "errors": [], "axe": []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        try:
            for width in (1440, 390):
                for theme in THEMES:
                    print(f"Portal acceptance: {theme} at {width}px", flush=True)
                    context = await browser.new_context(
                        viewport={
                            "width": width,
                            "height": 1000 if width > 650 else 844,
                        },
                        reduced_motion="reduce",
                    )
                    try:
                        page = await context.new_page()
                        page.on(
                            "pageerror",
                            lambda error: report["errors"].append(str(error)),
                        )
                        await visit(page, base, "#library", ".document")
                        await select_theme(page, theme)
                        for name, route, selector, nav in CASES:
                            label = f"{theme}-{width}-{name}"
                            await visit(page, base, route, selector)
                            await expect(page.locator("html")).to_have_attribute(
                                "data-theme", theme
                            )
                            await expect(
                                page.locator(f'[data-nav="{nav}"]')
                            ).to_have_attribute("aria-current", "page")
                            metrics = await no_overflow(page, label)
                            # Existing accessibility-browser.py owns desktop
                            # legacy surfaces; this closes its mobile and 3D/guide gaps.
                            if width == 390 or name in (
                                "guide",
                                "vehicle",
                                "reference",
                            ):
                                await axe_check(page, label, report["axe"])
                            await screenshot(page, label)
                            report["cases"].append(
                                {
                                    "name": name,
                                    "route": route,
                                    "width": width,
                                    "theme": theme,
                                    **metrics,
                                }
                            )
                        label = f"{theme}-{width}"
                        report["journeys"].append(
                            await source_dialog_journey(
                                page, base, label, report["axe"]
                            )
                        )
                        await search_journey(page, label, report["axe"])
                        await library_journey(page, base)
                        if theme == "dark":
                            await consultation_to_project(page, base)
                            if width == 1440:
                                report["journeys"].append(
                                    await primary_vehicle_journey(page, base)
                                )
                                report["journeys"].append(
                                    await knowledge_journey(page, base)
                                )
                                report["journeys"].append(
                                    await project_continuity(page, base)
                                )
                        if width == 390:
                            await mobile_navigation(page)
                            await page.set_viewport_size({"width": 320, "height": 844})
                            for name in ("flow", "tree", "library"):
                                _, route, selector, _ = next(
                                    c for c in CASES if c[0] == name
                                )
                                await visit(page, base, route, selector)
                                await no_overflow(page, f"{theme}-320-{name}")
                                await screenshot(page, f"{theme}-320-{name}")
                            await visit(
                                page,
                                base,
                                "#vehicle?assembly=brakes&focus=freios&tree=assemblies",
                                '.g3d[data-g3d-ready="true"]',
                            )
                            await expect(
                                page.locator(".g-part-inspector h2")
                            ).to_contain_text("Freios")
                            await no_overflow(page, f"{theme}-320-vehicle-selected")
                            await screenshot(page, f"{theme}-320-vehicle-selected")
                        print(
                            f"Portal acceptance passed: {theme} at {width}px",
                            flush=True,
                        )
                    except Exception as error:
                        report["status"] = "failed"
                        report["failure"] = {
                            "theme": theme,
                            "width": width,
                            "url": page.url,
                            "error": str(error),
                        }
                        await screenshot(page, f"failure-{theme}-{width}")
                        (OUT / "acceptance.json").write_text(
                            json.dumps(report, ensure_ascii=False, indent=2) + "\n"
                        )
                        raise
                    finally:
                        await context.close()
        finally:
            await browser.close()
    report["status"] = (
        "passed" if not report["errors"] and not report["axe"] else "failed"
    )
    (OUT / "acceptance.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )
    assert not report["errors"], report["errors"]
    assert not report["axe"], json.dumps(report["axe"], ensure_ascii=False)[:14000]
    print(
        "PASS: unified portal themes/routes, mobile reading, source dialogs, search and durable filters"
    )


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(exercise(base))
