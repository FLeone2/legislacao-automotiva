"""Exercise the real audit, project context and explicit regulatory revalidation."""

import asyncio
import json
from pathlib import Path
import subprocess
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright, expect
from browser_support import TestServer, launch_options, select_theme

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/regulatory-coverage"
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads((ROOT / "data/process/regulatory-coverage.json").read_text())
REVISION = json.loads((ROOT / "data/process/regulatory-revision.json").read_text())[
    "revision"
]
MODEL = json.loads(
    subprocess.check_output(
        [
            "node",
            "-e",
            "const p=require('./src/guide/process-model.js');"
            "console.log(JSON.stringify({profile:p.DEFAULT_PROFILE,"
            "check:p.buildChecklist(p.DEFAULT_PROFILE)[0],"
            "stage:p.buildFlow(p.DEFAULT_PROFILE).nodes[3].id}));",
        ],
        cwd=ROOT,
        text=True,
    )
)
KEY = "homologation-projects-v1"
FIRST = "coverage-first-control"
SELECTED = "coverage-second-selected"
EVIDENCE = "Dossiê de teste / relatório preservado R2"
NOTE = "Conclusão de teste em base legada; revisar as condições."
EDITED_NOTE = NOTE + " Nota editada sem confirmar a base."
CHECK_ID = MODEL["check"]["id"]
PROJECTS = [
    {
        "schemaVersion": 1,
        "id": FIRST,
        "profile": {**MODEL["profile"], "name": "Primeiro processo de controle"},
        "checks": {},
    },
    {
        "schemaVersion": 1,
        "id": SELECTED,
        "profile": {**MODEL["profile"], "name": "Segundo processo auditado"},
        "checks": {CHECK_ID: {"status": "done", "note": NOTE, "evidence": EVIDENCE}},
    },
]


def route_values(page):
    return parse_qs(urlsplit(page.url).fragment.partition("?")[2])


def formatted(value):
    return f"{value:,}".replace(",", ".") if isinstance(value, (float, int)) else "—"


async def ready(page):
    await page.locator('.g-coverage[data-coverage-state="ready"]').wait_for()
    await expect(page.locator("#g-tab-coverage")).to_have_attribute(
        "aria-selected", "true"
    )


async def check_saved(page):
    return await page.evaluate(
        """args => JSON.parse(localStorage.getItem(args.key))
            .find(project=>project.id===args.id).checks[args.check]""",
        {"key": KEY, "id": SELECTED, "check": CHECK_ID},
    )


async def wait_saved(page, note, revision=None):
    await page.wait_for_function(
        """args => {
          const projects=JSON.parse(localStorage.getItem(args.key)||'[]');
          const check=projects.find(project=>project.id===args.id)?.checks[args.check];
          return check?.note===args.note &&
            (args.revision===null ? !check.regulatoryRevision : check.regulatoryRevision===args.revision);
        }""",
        arg={
            "key": KEY,
            "id": SELECTED,
            "check": CHECK_ID,
            "note": note,
            "revision": revision,
        },
    )


async def axe_check(page, name, findings):
    await page.add_script_tag(path=str(ROOT / "node_modules/axe-core/axe.min.js"))
    result = await page.evaluate(
        """async()=>await axe.run(document,{runOnly:{type:'tag',
            values:['wcag2a','wcag2aa','wcag21aa']}})"""
    )
    findings.extend(
        {
            "context": name,
            "id": violation["id"],
            "nodes": [node["target"] for node in violation["nodes"]],
        }
        for violation in result["violations"]
    )


async def exercise(base):
    errors, findings, evidence = [], [], {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        try:
            context = await browser.new_context(
                viewport={"width": 1440, "height": 1050}, reduced_motion="reduce"
            )
            try:
                await context.add_init_script(
                    "try { if(!localStorage.getItem(" + json.dumps(KEY) + ")) "
                    "localStorage.setItem("
                    + json.dumps(KEY)
                    + ","
                    + json.dumps(json.dumps(PROJECTS, ensure_ascii=False))
                    + "); } catch {}"
                )
                page = await context.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                route = (
                    "#guide?tab=checklist&project="
                    + SELECTED
                    + "&stage="
                    + MODEL["stage"]
                )
                await page.goto(base + route)
                await page.locator(".g-checklist").wait_for()
                await expect(page.locator("#g-project-select")).to_have_value(SELECTED)
                item = page.locator(".g-check-item").filter(
                    has_text=MODEL["check"]["title"]
                )
                await expect(item.locator(".g-status-label")).to_have_text(
                    "Revalidar base"
                )
                assert "g-status-review" in await item.get_attribute("class")
                assert "0 concluídos" in await page.locator(".g-progress").inner_text()
                await item.locator("summary").click()
                await expect(
                    item.get_by_label("Referência da evidência", exact=True)
                ).to_have_value(EVIDENCE)
                await item.get_by_label("Notas e justificativa", exact=True).fill(
                    EDITED_NOTE
                )
                await wait_saved(page, EDITED_NOTE)
                saved = await check_saved(page)
                assert saved["evidence"] == EVIDENCE and saved["status"] == "done"
                assert "regulatoryRevision" not in saved
                await expect(item.locator(".g-status-label")).to_have_text(
                    "Revalidar base"
                )
                await item.get_by_role(
                    "button", name="Registrar nova conferência desta tarefa", exact=True
                ).click()
                await wait_saved(page, EDITED_NOTE, REVISION)
                saved = await check_saved(page)
                assert saved["evidence"] == EVIDENCE and saved["status"] == "done"
                assert saved["regulatoryReviewedAt"]
                await expect(item.locator(".g-status-label")).to_have_text("Concluído")
                evidence["manualRevalidation"] = saved
                await page.reload()
                await page.locator(".g-checklist").wait_for()
                await expect(page.locator("#g-project-select")).to_have_value(SELECTED)
                await expect(item.locator(".g-status-label")).to_have_text("Concluído")
                assert (await check_saved(page))["evidence"] == EVIDENCE

                # The fifth tab participates in the existing keyboard and URL model.
                await page.locator("#g-tab-checklist").focus()
                await page.keyboard.press("End")
                await ready(page)
                assert await page.locator("#g-tab-coverage").evaluate(
                    "element=>element===document.activeElement"
                )
                assert route_values(page)["project"] == [SELECTED]
                assert route_values(page)["stage"] == [MODEL["stage"]]
                await page.reload()
                await ready(page)
                await expect(page.locator("#g-project-select")).to_have_value(SELECTED)

                expected_metrics = [
                    formatted(DATA["summary"][key])
                    for key in [
                        "acts",
                        "publicTextExcerpts",
                        "officialGuidanceItems",
                        "sources",
                    ]
                ]
                assert (
                    await page.locator(".g-coverage-metrics strong").all_text_contents()
                    == expected_metrics
                )
                assert (
                    DATA["scopeNote"]
                    in await page.locator(".g-coverage-scope").inner_text()
                )
                assert (
                    "não são uma contagem de obrigações aplicáveis"
                    in await page.locator(".g-coverage-scope").inner_text()
                )
                await expect(page.locator(".g-coverage-finding")).to_have_count(
                    len(DATA["findings"])
                )
                await expect(page.locator(".g-coverage-subsystem")).to_have_count(
                    len(DATA["subsystems"])
                )
                assert await page.locator(
                    ".g-coverage-finding h4"
                ).all_text_contents() == [
                    finding["title"] for finding in DATA["findings"]
                ]
                agency_rows = page.locator(".g-coverage-table tbody tr")
                await expect(agency_rows).to_have_count(len(DATA["agencies"]))
                for index, agency in enumerate(DATA["agencies"]):
                    assert await agency_rows.nth(index).locator(
                        "th,td"
                    ).all_text_contents() == [
                        agency["label"],
                        *[
                            formatted(agency.get(key))
                            for key in [
                                "acts",
                                "requirements",
                                "fullTextReviewed",
                                "chainReviewed",
                                "unknownOrPartial",
                            ]
                        ],
                    ]

                monitoring = DATA["monitoring"]
                await page.get_by_role(
                    "heading", name="Observação das fontes", exact=True
                ).wait_for()
                assert await page.locator(
                    ".g-coverage-monitoring dd"
                ).all_text_contents() == [
                    formatted(
                        monitoring["selectedUrls"] - monitoring["unattemptedUrls"]
                    ),
                    formatted(monitoring["acceptedUrls"]),
                    formatted(monitoring["unverifiedUrls"]),
                    formatted(monitoring["unattemptedUrls"]),
                ]
                assert (
                    monitoring["scopeNote"]
                    in await page.locator(".g-coverage").inner_text()
                )
                await expect(page.locator(".g-coverage-scheduler")).to_have_text(
                    monitoring["schedulerNote"]
                )
                monitor_links = await page.locator(
                    ".g-coverage-monitor-links a"
                ).evaluate_all(
                    "elements=>elements.map(element=>element.getAttribute('href'))"
                )
                assert monitor_links == [
                    monitoring["snapshotUrl"],
                    monitoring["workflowUrl"],
                ]
                health = await page.request.get(base + monitoring["snapshotUrl"])
                assert health.ok, health.status
                evidence["monitoring"] = monitoring

                await page.get_by_label("Buscar no diagnóstico", exact=True).fill(
                    DATA["findings"][0]["title"]
                )
                await expect(page.locator(".g-coverage-finding")).to_have_count(1)
                await page.get_by_label("Buscar no diagnóstico", exact=True).fill("")
                await page.get_by_label("Situação", exact=True).select_option("fixed")
                await expect(page.locator(".g-coverage-finding")).to_have_count(
                    sum(finding["status"] == "fixed" for finding in DATA["findings"])
                )
                await page.get_by_label("Prioridade", exact=True).select_option("high")
                await expect(page.locator(".g-coverage-finding")).to_have_count(
                    sum(
                        finding["status"] == "fixed" and finding["severity"] == "high"
                        for finding in DATA["findings"]
                    )
                )
                await page.get_by_label("Situação", exact=True).select_option("all")
                await page.get_by_label("Prioridade", exact=True).select_option("all")
                await page.get_by_label("Buscar no diagnóstico", exact=True).fill(
                    "sem-correspondencia-qa-90210"
                )
                await page.locator(".g-coverage-no-results").wait_for()
                await page.get_by_label("Buscar no diagnóstico", exact=True).fill("")

                links = await page.locator(".g-coverage-knowledge a").evaluate_all(
                    "elements=>elements.map(element=>element.getAttribute('href'))"
                )
                assert links == [
                    DATA["knowledge"][key]
                    for key in ["indexUrl", "manifestUrl", "auditUrl"]
                    if DATA["knowledge"].get(key)
                ]
                for href in links:
                    response = await page.request.get(base + href)
                    assert response.ok, (href, response.status)
                evidence["knowledgeLinks"] = links

                # A relationship may change the visual selection, never the active dossier.
                subsystem = next(
                    row for row in DATA["subsystems"] if row["id"] == "freios/fluido"
                )
                row = page.locator(".g-coverage-subsystem").filter(
                    has=page.get_by_text(subsystem["label"], exact=True)
                )
                await row.locator("summary").click()
                link = row.get_by_role(
                    "link", name="Ver este subsistema no veículo", exact=True
                )
                params = parse_qs((await link.get_attribute("href")).partition("?")[2])
                assert params["project"] == [SELECTED]
                assert params["stage"] == [MODEL["stage"]]
                assert params["subsystem"] == [subsystem["id"]]
                await link.click()
                await page.locator('.g3d[data-g3d-ready="true"]').wait_for(
                    timeout=90_000
                )
                await expect(page.locator("#g-project-select")).to_have_value(SELECTED)
                await expect(page.locator(".g-selection-origin code")).to_have_text(
                    subsystem["id"]
                )
                await page.wait_for_function(
                    """id=>{const canvas=document.querySelector('.g3d canvas');
                    return canvas?.dataset.subsystem===id && Number(canvas.dataset.highlightedMeshes)>0}""",
                    arg=subsystem["id"],
                )
                assert route_values(page)["stage"] == [MODEL["stage"]]
                assert route_values(page)["project"] == [SELECTED]
                assert (await check_saved(page))["evidence"] == EVIDENCE
                assert (
                    await page.evaluate(
                        "key=>JSON.parse(localStorage.getItem(key))[0].checks", KEY
                    )
                    == {}
                )
                evidence["subsystemContext"] = route_values(page)
                await page.locator("#g-tab-coverage").click()
                await ready(page)

                for theme in ["dark", "light", "aurora"]:
                    await select_theme(page, theme)
                    for width, height, label in [
                        (1440, 1050, "desktop"),
                        (390, 844, "mobile-390"),
                        (320, 740, "mobile-320"),
                    ]:
                        await page.set_viewport_size({"width": width, "height": height})
                        assert await page.evaluate(
                            "document.documentElement.scrollWidth <= innerWidth"
                        ), (theme, label)
                        await page.locator(".g-coverage").screenshot(
                            path=str(OUT / f"{theme}-{label}.png")
                        )
                        await axe_check(page, theme + "/" + label, findings)
                evidence["realSummary"] = DATA["summary"]
            finally:
                await context.close()

            retry = await browser.new_context(
                viewport={"width": 390, "height": 844}, reduced_motion="reduce"
            )
            try:
                page = await retry.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                calls = 0

                async def unavailable_once(route):
                    nonlocal calls
                    calls += 1
                    if calls == 1:
                        await route.fulfill(
                            status=503, content_type="application/json", body="{}"
                        )
                    else:
                        await route.continue_()

                await page.route(
                    "**/data/process/regulatory-coverage.json*", unavailable_once
                )
                await page.goto(base + "#guide?tab=coverage")
                await page.locator('[data-coverage-state="error"]').wait_for()
                await page.get_by_role(
                    "button", name="Tentar novamente", exact=True
                ).click()
                await ready(page)
                assert calls == 2
                await expect(page.locator(".g-coverage-finding")).to_have_count(
                    len(DATA["findings"])
                )
                evidence["retryRequests"] = calls
            finally:
                await retry.close()
        finally:
            await browser.close()
    (OUT / "accessibility.json").write_text(
        json.dumps(findings, indent=2, ensure_ascii=False)
    )
    (OUT / "journeys.json").write_text(
        json.dumps(evidence, indent=2, ensure_ascii=False)
    )
    assert not errors, errors
    assert not findings, findings
    print(
        "PASS: real regulatory coverage, source-qualified metrics, filters, knowledge links, "
        "keyboard/reload, second-project subsystem context, explicit legacy revalidation, "
        "503 retry, mobile themes and axe."
    )


if __name__ == "__main__":
    with TestServer() as test_base:
        asyncio.run(exercise(test_base))
