"""Cross-surface audit regressions for historical acts and qualified legal guidance.

T03/T04, T08/T09 and T12 have focused suites for flow, canonical exports and tree
navigation; this journey checks the semantic hand-offs those suites cannot infer
from matching component counts.
"""

import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright, expect

from browser_support import TestServer, launch_options, wait_for_route

ROOT = Path(__file__).resolve().parents[1]


async def visit(page, base, route):
    await page.goto(base + route)
    await wait_for_route(page)


async def export_json(page):
    async with page.expect_download() as pending:
        await page.locator('[data-regulatory-export="json"]').click()
    download = await pending.value
    return json.loads(Path(await download.path()).read_text(encoding="utf-8-sig"))


async def main(base):
    report = {"passed": [], "errors": []}

    def passed(message):
        report["passed"].append(message)
        print(message, flush=True)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1165, "height": 747}, reduced_motion="reduce"
        )
        page.on("pageerror", lambda error: report["errors"].append(str(error)))

        # T01: an old URL must never reopen the obsolete active ficha.
        await visit(page, base, "#contran?record=contran-220-2007")
        await expect(page.locator(".contran-record")).to_have_count(0)
        assert "#history?" in page.url
        await expect(page.locator("#main")).to_contain_text("Fora da consulta atual")
        await visit(page, base, "#contran?q=220%2F2007")
        exported = await export_json(page)
        assert not any(
            record["id"] == "contran-220-2007" for record in exported["records"]
        )
        await visit(page, base, "#library?q=220%2F2007")
        await expect(
            page.locator('[data-catalog-act="contran-220-2007"]')
        ).to_have_count(0)
        assert not await page.evaluate(
            "filters().some(record=>(record.regulatoryId||record.id)==='contran-220-2007')"
        )
        historical = page.locator(
            'a[href="#history?agency=contran&record=contran-220-2007"]'
        )
        await historical.click()
        await wait_for_route(page)
        await expect(page.locator("#main")).to_contain_text("Fora da consulta atual")
        await expect(page.locator("#main")).to_contain_text("2023-10-02")
        limits = page.locator("#main details").filter(
            has=page.locator("summary", has_text="Limites da revisão")
        )
        await limits.locator("summary").click()
        await expect(limits).to_contain_text(
            "Não se pressupõe substituição textual de toda a regra anterior pela 951"
        )
        await expect(
            page.locator('#main a[href="#contran?record=contran-951-2022"]')
        ).to_be_visible()
        await expect(
            page.locator('#main a[href="#contran?record=contran-997-2023"]')
        ).to_be_visible()
        for part in ("peca_08_banco_traseiro", "peca_09_bancos_dianteiros_console"):
            await visit(page, base, "#vehicle?component=bancos&part=" + part)
            assert not await page.evaluate(
                "Object.values(treeModels.vehicle.nodes).some(node=>node.recordId&&catalogRecord(catalog,node.recordId)?.regulatoryId==='contran-220-2007')"
            )
        passed(
            "T01: historical 220 with documented 951/997 chain; no current seat/export leak"
        )

        # T02: the successor can be consulted without promoting an index review.
        await visit(page, base, "#library?agency=MOVER&q=43%2F2024")
        await expect(page.locator('[data-catalog-act="mover-009"]')).to_have_count(0)
        await expect(page.locator('[data-catalog-act="mover-014"]')).to_have_count(1)
        await page.locator('a[href="#history?agency=mover&record=mover-009"]').click()
        await wait_for_route(page)
        await expect(page.locator("#main")).to_contain_text("Fora da consulta atual")
        await expect(page.locator("#main")).to_contain_text("68/2026")
        limits = page.locator("#main details").filter(
            has=page.locator("summary", has_text="Limites da revisão")
        )
        await limits.locator("summary").click()
        await expect(limits).to_contain_text(
            "entrada em vigor, transições e procedimentos não foram inferidos"
        )
        await expect(page.locator("#main .regulatory-state-grid")).to_contain_text(
            "Índice e anotações oficiais"
        )
        await (
            page.locator("#main details summary")
            .filter(has_text="Fontes do histórico")
            .click()
        )
        await expect(
            page.locator(
                '#main a[href="https://www.gov.br/mdic/pt-br/acesso-a-informacao/institucional/atos-normativos/gabinete-do-ministro/portarias/2026"]'
            )
        ).to_be_visible()
        await page.locator('[data-open="mover-014"]').click()
        await expect(page.locator("#normDialog")).to_be_visible()
        await expect(page.locator("#normDialog")).to_contain_text("íntegra")
        assert (
            await page.evaluate(
                "catalogRecord(catalog,'mover-014').reviewStatus.fullTextReviewed"
            )
            is False
        )
        await page.locator("#closeDialog").click()
        passed("T02: 43 history, 68 successor and index-only review remain distinct")

        # T05: reviewed excerpts are available; methods stay explicitly incomplete.
        for record_id in ("ibama-in-26-2020", "ibama-in-6-2025"):
            await visit(page, base, "#proconve?record=" + record_id)
            await expect(
                page.locator('[data-contran-record="' + record_id + '"]')
            ).to_have_count(1)
            payload = await export_json(page)
            record = payload["records"][0]
            assert record["id"] == record_id and record["requirements"]
            assert record["reviewStatus"]["amendmentChainReviewed"] is False
            assert record["applicability"]["vehicleSpecific"] is False
        # All five service scenarios have their own URL and preserved source scope.
        for guide_id in (
            "lcvm-regular",
            "lcvm-quantidades-limitadas",
            "lcvm-dispensa",
            "lcvm-alteracoes",
            "importacao-lpco",
        ):
            await visit(page, base, "#proconve?guide=" + guide_id)
            guide_view = page.locator('[data-procedure-guide="' + guide_id + '"]')
            await expect(guide_view).to_be_visible()
            guide = await page.evaluate(
                "id=>regulatoryData.proconve.metadata.procedureGuidance.find(guide=>guide.id===id)",
                guide_id,
            )
            await expect(guide_view.locator("h1")).to_have_text(guide["label"])
            await expect(guide_view).to_contain_text(guide["scope"])
            assert guide["sources"] and guide["reviewedAt"]
            await expect(
                guide_view.locator('a[href="' + guide["channel"]["url"] + '"]').first
            ).to_be_visible()
            await page.reload()
            await wait_for_route(page)
            await expect(
                page.locator('[data-procedure-guide="' + guide_id + '"]')
            ).to_be_visible()
        await visit(page, base, "#inmetro?record=inmetro-169-2023")
        await expect(page.locator(".contran-record")).to_contain_text("voluntár")
        assert (
            await page.evaluate(
                "regulatoryData.inmetro.records.find(record=>record.id==='inmetro-169-2023').reviewStatus.fullTextReviewed"
            )
            is False
        )
        passed(
            "T05: IN26/IN6 excerpts and voluntary PBEV preserve review/application limits"
        )

        # T06: lead-acid import guidance and a directed rectification do not turn
        # into an integral certification or an installation permission for LEDs.
        await visit(page, base, "#inmetro?record=inmetro-145-2022")
        requirements = page.locator(".regulatory-requirements")
        await expect(requirements).to_contain_text("modelo 5")
        await expect(requirements).to_contain_text("LED")
        await expect(requirements).to_contain_text("ISO 4383:2000")
        await expect(page.locator(".regulatory-state-grid")).to_contain_text(
            "Não confirmada integralmente"
        )
        payload = await export_json(page)
        record = payload["records"][0]
        by_id = {item["id"]: item for item in record["requirements"]}
        assert record["reviewStatus"]["fullTextReviewed"] is False
        assert record["legalStatus"]["state"] == "official_current_reference"
        for number in (11, 12, 13, 14):
            assert (
                by_id[f"inmetro-145-2022:req:{number:02}"]["evidenceKind"]
                == "official_guidance"
            )
        assert by_id["inmetro-145-2022:req:15"]["evidenceKind"] == "public_text_excerpt"
        assert "modelo 5" in by_id["inmetro-145-2022:req:12"]["rule"]
        passed(
            "T06: LED exclusion, model-5 guidance and ISO rectification retain their exact evidence scope"
        )

        # T07/T10: the visible timeline and export use the same records and status.
        for agency, record_id, expected_dates in (
            ("inmetro", "inmetro-379-2021", {"2026-10-23", "2025-11-30", "2027-11-30"}),
            (
                "proconve",
                "ibama-in-20-2025",
                {"2026-01-01", "2027-03-31", "2027-07-31"},
            ),
        ):
            await visit(page, base, f"#{agency}?record={record_id}")
            dates = await page.locator(".regulatory-timeline time").evaluate_all(
                "nodes=>nodes.map(node=>node.dateTime)"
            )
            assert set(dates) == expected_dates
            payload = await export_json(page)
            exported_record = payload["records"][0]
            assert {
                flag["date"] for flag in exported_record["temporalFlags"]
            } == expected_dates
            in_memory = await page.evaluate(
                "([agency,id])=>regulatoryData[agency].records.find(record=>record.id===id)",
                [agency, record_id],
            )
            assert exported_record["reviewStatus"] == in_memory["reviewStatus"]
            assert exported_record["legalStatus"] == in_memory["legalStatus"]
            await expect(page.locator(".regulatory-timeline")).to_contain_text(
                "Cada data se refere às condições indicadas"
            )
            assert all(
                flag.get("source", {}).get("url") or flag.get("sourceUrl")
                for flag in exported_record["temporalFlags"]
            )
        passed(
            "T07/T10: scoped dates and legal/review states agree with the filtered export"
        )

        # Recovered historical routes remain explicit on a narrow screen too.
        await page.set_viewport_size({"width": 390, "height": 844})
        await visit(page, base, "#history?agency=contran&record=contran-220-2007")
        await expect(page.locator("#main")).to_contain_text("Fora da consulta atual")
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        assert not report["errors"], report["errors"]
        passed("T11: historical routes and qualified status survive mobile navigation")
        (ROOT / "tests/artifacts").mkdir(exist_ok=True)
        (ROOT / "tests/artifacts/audit-release.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n"
        )
        await browser.close()
    print(
        "PASS: audit semantic journeys, qualified sources, canonical history and export/status coherence"
    )


with TestServer() as base:
    asyncio.run(main(base))
