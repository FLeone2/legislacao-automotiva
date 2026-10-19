"""Verify the explicit part-to-legislation map through the real consultation UI."""

import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path
import time
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright, expect

from browser_support import TestServer, launch_options, wait_for_route


def params(page):
    return {
        key: values[0]
        for key, values in parse_qs(
            urlsplit(page.url).fragment.partition("?")[2]
        ).items()
    }


async def visit(page, base, route):
    await page.goto(base + route)
    await wait_for_route(page)


async def select_drawing_part(page, part):
    point = await page.locator("#vehicleDrawing").evaluate(
        """(svg,xy)=>{
            const point=svg.createSVGPoint();[point.x,point.y]=xy;
            const screen=point.matrixTransform(svg.querySelector('#vehicleLayer').getScreenCTM());
            return{x:screen.x,y:screen.y};
        }""",
        part["testPoint"],
    )
    started = time.perf_counter()
    await page.mouse.click(**point)
    await wait_for_route(page)
    elapsed_ms = (time.perf_counter() - started) * 1000
    assert params(page).get("part") == part["id"]
    await expect(page.locator(".vehicle-part-name")).to_have_text(part["label"])
    return elapsed_ms


async def assert_explicit_tree(page, part, subsystem=None):
    actual = await page.evaluate(
        """()=>Object.values(treeModels.vehicle.nodes).map(node=>({
            id:node.id,recordId:node.recordId,requirementId:node.requirementId,
            children:(node.children||[]).map(child=>({
                id:child.id,recordId:child.recordId,requirementId:child.requirementId
            }))
        }))"""
    )
    nodes = {node["id"]: node for node in actual}
    records = await page.evaluate(
        "catalog.records.map(record=>({id:record.id,actId:record.regulatoryId||record.id,requirements:(record.requirements||[]).map(item=>item.id)}))"
    )
    by_record = {record["id"]: record for record in records}
    expected_topics = [
        topic
        for topic in part["topics"]
        if not subsystem or topic.get("subsystemId") == subsystem
    ]
    expected_acts = set()
    expected_requirements = set()
    for topic in expected_topics:
        normalized_id = topic["relation"] + ":" + topic["id"]
        topic_id = (
            "component:"
            + part["componentId"]
            + ":"
            + topic["lane"]
            + ":"
            + normalized_id
        )
        assert topic_id in nodes, (part["id"], topic_id, list(nodes))
        actual_records = [
            child
            for child in nodes[topic_id]["children"]
            if child.get("recordId") and not child.get("requirementId")
        ]
        allowed = {link["actId"] for link in topic["links"]}
        actual_acts = {
            by_record[child["recordId"]]["actId"] for child in actual_records
        }
        assert actual_acts == allowed, (part["id"], topic_id, actual_acts, allowed)
        assert len(actual_records) == len(allowed), (part["id"], topic_id)
        for child in actual_records:
            record = by_record[child["recordId"]]
            allowed_requirements = {
                requirement_id
                for link in topic["links"]
                if link["actId"] in (record["actId"], record["id"])
                for requirement_id in link.get("requirementIds", [])
            }
            actual_requirements = {
                item["requirementId"]
                for item in nodes[child["id"]]["children"]
                if item.get("requirementId")
            }
            assert actual_requirements == allowed_requirements, (
                part["id"],
                topic_id,
                actual_requirements,
                allowed_requirements,
            )
            expected_requirements.update(allowed_requirements)
        expected_acts.update(allowed)

    actual_acts = {
        by_record[node["recordId"]]["actId"]
        for node in actual
        if node.get("recordId") and not node.get("requirementId")
    }
    actual_requirements = {
        node["requirementId"] for node in actual if node.get("requirementId")
    }
    assert actual_acts == expected_acts, (part["id"], actual_acts, expected_acts)
    assert actual_requirements == expected_requirements, (
        part["id"],
        actual_requirements,
        expected_requirements,
    )
    assert not any(node["id"].endswith(":official") for node in actual)
    return actual_acts, actual_requirements


async def main(base):
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1440, "height": 1100}, reduced_motion="reduce"
        )
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        await visit(page, base, "#vehicle?all=1")
        parts = await page.evaluate(
            """()=>VehicleLegislationData.parts.map(part=>({...part,
                testPoint:VehicleVector.parts.find(item=>item.id===part.id).testPoint
            }))"""
        )
        assert len(parts) == 37
        by_id = {part["id"]: part for part in parts}
        total_topics = 0
        timings = []
        measured_parts = {
            "peca_03_parabrisa",
            "peca_27_bateria_12v",
            "peca_30_tanque_tubo_combustivel",
        }
        representative_topics = {
            "peca_03_parabrisa": {"vehicle:limpadores"},
            "peca_09_bancos_dianteiros_console": {"component:materiais"},
            "peca_27_bateria_12v": {"component:bateria-12v-chumbo-acido"},
            "peca_30_tanque_tubo_combustivel": {"vehicle:evaporativas-reabastecimento"},
        }

        # All 37 real contours expose only the manually associated subjects.
        for part in parts:
            print("Checking explicit map for " + part["id"], flush=True)
            elapsed_ms = await select_drawing_part(page, part)
            if part["id"] in measured_parts:
                timings.append(
                    {
                        "operation": "select-part",
                        "partId": part["id"],
                        "milliseconds": round(elapsed_ms, 2),
                    }
                )
            topics = await page.locator("[data-part-topic]").evaluate_all(
                """elements=>elements.map(element=>({
                    id:element.dataset.partTopic,
                    label:element.querySelector('strong').textContent,
                    relation:element.closest('section').getAttribute('aria-label'),
                    href:element.getAttribute('href')
                }))"""
            )
            expected_ids = {
                topic["relation"] + ":" + topic["id"] for topic in part["topics"]
            }
            assert {topic["id"] for topic in topics} == expected_ids, part["id"]
            assert len(topics) == len(expected_ids)
            total_topics += len(topics)
            for actual in topics:
                source = next(
                    topic
                    for topic in part["topics"]
                    if topic["relation"] + ":" + topic["id"] == actual["id"]
                )
                assert actual["label"] == source["label"]
                assert actual["relation"] == (
                    "Sobre este conjunto"
                    if source["relation"] == "component"
                    else "Contexto do veículo"
                )
                query = parse_qs(urlsplit(actual["href"]).fragment.partition("?")[2])
                assert query["part"] == [part["id"]]
                assert query["topic"] == [actual["id"]]

            # Opening the complete part must not restore the former system-wide extras.
            started = time.perf_counter()
            await page.locator(".aurora-primary").click()
            await wait_for_route(page)
            if part["id"] in measured_parts:
                timings.append(
                    {
                        "operation": "open-part-references",
                        "partId": part["id"],
                        "milliseconds": round(
                            (time.perf_counter() - started) * 1000, 2
                        ),
                    }
                )
            await expect(page.locator("#main h1")).to_have_text(part["label"])
            await assert_explicit_tree(page, part)
            await page.locator("[data-vehicle-back]").click()
            await wait_for_route(page)
            assert params(page)["part"] == part["id"]

            # Exercise representative cross-topic, domain and requirement branches.
            # All reviewed card targets and all 37 complete part trees were checked above.
            for actual in topics:
                if actual["id"] not in representative_topics.get(part["id"], set()):
                    continue
                source = next(
                    topic
                    for topic in part["topics"]
                    if topic["relation"] + ":" + topic["id"] == actual["id"]
                )
                await page.locator('[data-part-topic="' + actual["id"] + '"]').click()
                await wait_for_route(page)
                assert params(page)["part"] == part["id"]
                assert params(page)["topic"] == actual["id"]
                assert await page.evaluate("treeUI.vehicle.selected") == (
                    "component:"
                    + part["componentId"]
                    + ":"
                    + source["lane"]
                    + ":"
                    + actual["id"]
                )
                await assert_explicit_tree(page, part, source.get("subsystemId"))
                await page.locator("[data-vehicle-back]").click()
                await wait_for_route(page)
            print("Checked explicit map for " + part["id"], flush=True)
        assert total_topics == sum(len(part["topics"]) for part in parts)

        # Distinct physical objects never acquire their sibling's legislation.
        for number, wanted, unwanted in [
            ("11", "contran-752-2018", "contran-885-2021"),
            ("21", "contran-885-2021", "contran-752-2018"),
            ("08", "contran-951-2022", "contran-964-2022"),
            ("09", "contran-964-2022", "contran-885-2021"),
        ]:
            part = next(
                item for item in parts if item["id"].startswith("peca_" + number + "_")
            )
            await visit(
                page,
                base,
                "#vehicle?component=" + part["componentId"] + "&part=" + part["id"],
            )
            acts, _ = await assert_explicit_tree(page, part)
            assert wanted in acts and unwanted not in acts
            assert "contran-220-2007" not in acts

        battery = by_id["peca_27_bateria_12v"]
        await visit(page, base, "#vehicle?component=eletrica&part=" + battery["id"])
        acts, requirements = await assert_explicit_tree(page, battery)
        assert acts == {"inmetro-145-2022"}
        assert requirements == {
            f"inmetro-145-2022:req:{number:02}" for number in (6, 11, 12, 13, 14)
        }
        saved = page.url
        await page.reload()
        await wait_for_route(page)
        assert page.url == saved
        await assert_explicit_tree(page, battery)
        for number in ["25", "26"]:
            part = next(
                item for item in parts if item["id"].startswith("peca_" + number + "_")
            )
            await visit(page, base, "#vehicle?component=bateria&part=" + part["id"])
            acts, requirements = await assert_explicit_tree(page, part)
            assert "inmetro-145-2022" not in acts
            assert not requirements
        for number in ["28", "29"]:
            part = next(
                item for item in parts if item["id"].startswith("peca_" + number + "_")
            )
            await visit(
                page,
                base,
                "#vehicle?component=" + part["componentId"] + "&part=" + part["id"],
            )
            acts, requirements = await assert_explicit_tree(page, part)
            assert not acts and not requirements
            for topic in part["topics"]:
                assert (
                    topic["gapReview"]["state"] == "no_specific_reference_in_collection"
                )
                assert topic["gapReview"]["reviewedAt"]
            await page.locator('.node-main[data-tree-node$=":gap:0"]').click()
            await wait_for_route(page)
            await expect(page.locator("#aiPanel")).to_contain_text(
                "Sem referência neste acervo"
            )
            await expect(page.locator("#aiPanel")).to_contain_text(
                "Conferência do recorte: "
                + part["topics"][0]["gapReview"]["reviewedAt"]
            )
            await expect(page.locator("#aiPanel")).to_contain_text(
                "Zero documentos não significa isenção"
            )
            await expect(page.locator("#aiPanel .tree-doc")).to_have_count(0)

        # The body can reach VIN even though that taxonomy belongs to another system.
        body = by_id["peca_10_carroceria"]
        await visit(page, base, "#vehicle?focus=carroceria&part=" + body["id"])
        await page.locator('[data-part-topic="component:identificacao"]').click()
        await wait_for_route(page)
        assert params(page)["subsystem"] == "identificacao/vin"
        acts, requirements = await assert_explicit_tree(page, body, "identificacao/vin")
        assert acts == {"contran-968-2022"}
        assert requirements == {
            "contran-968-2022:req:02",
            "contran-968-2022:req:03",
            "contran-968-2022:req:07",
        }
        await page.locator("[data-vehicle-back]").click()
        await wait_for_route(page)
        await page.locator(".aurora-library-link").click()
        await wait_for_route(page)
        assert params(page)["part"] == body["id"]
        assert "component" not in params(page)
        library_acts = await page.evaluate(
            "filters().map(record=>record.regulatoryId||record.id)"
        )
        assert set(library_acts) == {
            link["actId"] for topic in body["topics"] for link in topic["links"]
        }

        # A voluntary label program must neither become a wheel rule nor compulsory.
        wheel = by_id["peca_34_roda_dianteira"]
        await visit(page, base, "#library?part=" + wheel["id"])
        assert "inmetro-169-2023" not in await page.evaluate(
            "filters().map(record=>record.regulatoryId||record.id)"
        )
        await visit(page, base, "#library?agency=INMETRO&q=169")
        await (
            page.locator(".document")
            .filter(has_text="Portaria Inmetro 169/2023")
            .locator("[data-open]")
            .click()
        )
        await expect(page.locator("#normDialog")).to_be_visible()
        await expect(page.locator("#normDialog")).to_contain_text("voluntár")
        await page.locator("#normDialog").evaluate("dialog=>dialog.close()")

        # Unknown part URLs remain empty instead of broadening a consultation silently.
        for route in [
            "#library?part=peca_inexistente",
            "#vehicle?component=eletrica&part=peca_inexistente",
            "#vehicle?component=bateria&part=" + battery["id"],
        ]:
            await visit(page, base, route)
            if route.startswith("#library"):
                await expect(page.locator(".document")).to_have_count(0)
            else:
                assert await page.evaluate(
                    "!document.querySelector('.component-graph')||Object.values(treeModels.vehicle.nodes).every(node=>!node.recordId)"
                ), route
        assert not errors, errors
        artifacts = Path(__file__).resolve().parent / "artifacts"
        artifacts.mkdir(exist_ok=True)
        (artifacts / "vehicle-legislation-browser.json").write_text(
            json.dumps(
                {
                    "url": base,
                    "asOf": datetime.now(timezone.utc).isoformat(),
                    "browser": browser.version,
                    "viewport": {"width": 1440, "height": 1100},
                    "reducedMotion": True,
                    "partsChecked": len(parts),
                    "subjectCardsChecked": total_topics,
                    "passed": True,
                    "errors": errors,
                    "timings": timings,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n"
        )
        print("Existing-click timings: " + json.dumps(timings), flush=True)
        await browser.close()
    print(
        f"PASS: {len(parts)} graphical selections, {total_topics} explicit subjects, scoped tree/requirements, component versus vehicle context, 12 V/HV, empty radiator/harness, body/VIN, part library, voluntary program and unknown-part guards.",
        flush=True,
    )


with TestServer() as base:
    asyncio.run(main(base))
