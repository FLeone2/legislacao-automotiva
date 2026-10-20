"""Canonical consultation identities, complete filtered exports and agency context."""

import asyncio
import csv
import hashlib
import io
import json
import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.async_api import async_playwright, expect

from browser_support import launch_options, wait_for_route

BASE = os.environ.get("VEHICLE_TEST_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"


async def downloaded(page, format_name):
    async with page.expect_download() as pending:
        await page.locator(f'[data-regulatory-export="{format_name}"]').click()
    download = await pending.value
    path = await download.path()
    return Path(path).read_text(encoding="utf-8-sig")


async def agency(page, route):
    await page.goto(BASE + route)
    await wait_for_route(page)
    await expect(page.locator("#contranResultCount")).to_be_visible()


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(**launch_options())
        page = await browser.new_page(viewport={"width": 1366, "height": 900})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        for number, identity in [
            ("23/2022", "ibama-in-23-2022"),
            ("3/2021", "ibama-in-3-2021"),
            ("23/2020", "ibama-in-23-2020"),
            ("22/2020", "ibama-in-22-2020"),
            ("11/2014", "ibama-in-11-2014"),
        ]:
            await page.goto(BASE + "#library?q=" + number.replace("/", "%2F"))
            await wait_for_route(page)
            await expect(
                page.locator(f'[data-catalog-act="{identity}"]')
            ).to_have_count(1)
        assert (
            await page.evaluate("catalogRecord(catalog, 'ibama-023').regulatoryId")
            == "ibama-in-23-2022"
        )
        await page.goto(BASE + "#library")
        await wait_for_route(page)
        count = await page.evaluate("catalogRecords(catalog).length")
        identities = []
        for page_number in range(1, (count + 29) // 30 + 1):
            await page.goto(BASE + f"#library?page={page_number}")
            await wait_for_route(page)
            identities.extend(
                await page.locator("[data-catalog-act]").evaluate_all(
                    "nodes=>nodes.map(node=>node.dataset.catalogAct)"
                )
            )
        assert len(identities) == len(set(identities)) == count

        # N03: query exports must contain the same requirement IDs before any
        # lazy detail is opened and after JSON/detail reads, with no cache effect.
        await agency(page, "#inmetro?q=169%2F2023")
        await expect(page.locator(".contran-record")).to_have_count(1)
        await expect(
            page.locator('[data-lazy-record="inmetro-169-2023"]')
        ).to_have_count(1)
        csv_rows = list(csv.DictReader(io.StringIO(await downloaded(page, "csv"))))
        assert [record["id"] for record in csv_rows] == ["inmetro-169-2023"]
        assert json.loads(csv_rows[0]["queryFilters"]) == {"q": "169/2023"}
        expected_ids = ["inmetro-169-2023:req:01", "inmetro-169-2023:req:02"]
        assert json.loads(csv_rows[0]["requirementIds"]) == expected_ids
        payload = json.loads(await downloaded(page, "json"))
        assert payload["query"]["resultCount"] == len(payload["records"]) == 1
        exported_record = payload["records"][0]
        assert exported_record["requirementIds"] == expected_ids
        assert [item["id"] for item in exported_record["requirements"]] == expected_ids
        after_json = list(csv.DictReader(io.StringIO(await downloaded(page, "csv"))))
        assert json.loads(after_json[0]["requirementIds"]) == expected_ids
        await page.locator('[data-lazy-record="inmetro-169-2023"] summary').click()
        await expect(page.locator(".regulatory-requirements")).to_be_visible()
        after_detail = list(csv.DictReader(io.StringIO(await downloaded(page, "csv"))))
        assert [record["id"] for record in after_detail] == ["inmetro-169-2023"]
        assert json.loads(after_detail[0]["requirementIds"]) == expected_ids
        source = await page.request.get(BASE + "data/inmetro/active.json")
        assert (
            payload["query"]["datasetSha256"]
            == hashlib.sha256(await source.body()).hexdigest()
        )
        assert payload["query"]["exportedAt"] and payload["query"]["sourceAsOf"]
        await expect(page.locator('a[download][href$="active.csv"]')).to_contain_text(
            "Acervo completo"
        )

        await agency(page, "#inmetro?q=pneus")
        visible = await page.locator("[data-contran-record]").evaluate_all(
            "nodes=>nodes.map(node=>node.dataset.contranRecord)"
        )
        csv_rows = list(csv.DictReader(io.StringIO(await downloaded(page, "csv"))))
        assert {record["id"] for record in csv_rows} == set(visible)
        await page.reload()
        await wait_for_route(page)
        assert {
            record["id"]
            for record in json.loads(await downloaded(page, "json"))["records"]
        } == set(visible)

        await agency(page, "#contran?page=2")
        expected = await page.evaluate(
            "contranFiltered(regulatoryData.contran, new URLSearchParams(location.hash.split('?')[1])).map(record=>record.id)"
        )
        payload = json.loads(await downloaded(page, "json"))
        assert len(payload["records"]) > await page.locator(".contran-record").count()
        assert {record["id"] for record in payload["records"]} == set(expected)
        assert "page" not in payload["query"]["filters"]

        await agency(page, "#inmetro?q=unknown-query-no-results-xyz")
        await page.locator('[data-regulatory-export="csv"]').click()
        await expect(page.locator("#regulatoryExportStatus")).to_contain_text(
            "Nenhum resultado"
        )
        empty = json.loads(await downloaded(page, "json"))
        assert empty["query"]["resultCount"] == 0 and empty["records"] == []

        await agency(page, "#inmetro?component=freios&subsystem=freios%2Ffrenagem")
        await page.locator("#contranSearch").fill("145")
        await page.locator('#contranFilters button[type="submit"]').click()
        await wait_for_route(page)
        query = parse_qs(urlparse(page.url).fragment.split("?", 1)[1])
        assert query["component"] == ["freios"]
        assert query["subsystem"] == ["freios/frenagem"]
        assert query["q"] == ["145"]
        await page.reload()
        await wait_for_route(page)
        await expect(page.locator(".regulatory-context")).to_contain_text("Freios")
        await page.locator("[data-regulatory-remove-context]").click()
        await wait_for_route(page)
        query = parse_qs(urlparse(page.url).fragment.split("?", 1)[1])
        assert "component" not in query and "subsystem" not in query
        assert query["q"] == ["145"]
        assert not errors, errors
        await browser.close()
    print(
        "PASS: canonical library and legacy aliases, filtered CSV/JSON with all pages and source hash, empty exports, persistent agency context and explicit removal"
    )


asyncio.run(main())
