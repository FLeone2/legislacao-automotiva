"""Full internal-access audit, including transient map states and every document."""

import asyncio
from browser_support import reference_vehicle_url
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect
from browser_support import click_navigation, TestServer, launch_options, wait_for_route

ROOT = Path(__file__).resolve().parents[1]


async def main():
    report = {
        "routes": [],
        "systems": [],
        "partGaps": [],
        "subsystems": [],
        "activities": [],
        "records": [],
        "activeRecords": [],
        "externalLinks": [],
    }
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1440, "height": 1100}, reduced_motion="reduce"
        )
        page.on("pageerror", lambda e: errors.append(str(e)))

        async def route(value):
            # Contour and source-board assertions use the explicit 2D view.
            fragment = reference_vehicle_url(BASE + value).split("#", 1)[1]
            await page.evaluate("(value)=>location.hash=value", fragment)
            await wait_for_route(page)

        await page.goto(reference_vehicle_url(BASE + "#vehicle?all=1"))
        await wait_for_route(page)
        assert await page.locator("html").get_attribute("data-theme") == "dark"
        parts = await page.evaluate("""()=>Object.fromEntries(
            VehicleVector.parts.map(p=>[p.id,p.testPoint])
        )""")
        seat = parts["peca_08_banco_traseiro"]
        tank = parts["peca_30_tanque_tubo_combustivel"]

        async def point(x, y):
            return await page.locator("#vehicleDrawing").evaluate(
                '(svg,xy)=>{let p=svg.createSVGPoint();[p.x,p.y]=xy;p=p.matrixTransform(svg.querySelector("#vehicleLayer").getScreenCTM());return {x:p.x,y:p.y}}',
                [x, y],
            )

        async def fill():
            return await page.locator(
                "#vehicleDrawing #peca_08_banco_traseiro path"
            ).evaluate("e=>getComputedStyle(e).fill")

        assert await fill() == "rgba(0, 0, 0, 0)"
        await page.mouse.move(**await point(*seat))
        await page.wait_for_timeout(250)
        hover = await fill()
        assert hover != "rgba(0, 0, 0, 0)"
        await page.mouse.move(**await point(35, 35))
        await page.wait_for_timeout(250)
        assert await fill() == "rgba(0, 0, 0, 0)"
        assert await page.locator(".is-hovered").count() == 0
        await page.mouse.click(**await point(*seat))
        await wait_for_route(page)
        await page.mouse.move(0, 0)
        await page.wait_for_timeout(250)
        assert await fill() == "rgba(0, 0, 0, 0)"
        await page.mouse.move(**await point(*seat))
        await page.wait_for_timeout(250)
        assert await fill() == hover
        await page.mouse.move(0, 0)
        for xy, expected in [
            ((130, 150), None),
            ((1500, 990), None),
            (tank, "tanque"),
        ]:
            pt = await point(*xy)
            hit = await page.evaluate(
                'p=>document.elementFromPoint(p.x,p.y)?.closest("[data-component-link]")?.dataset.componentLink||null',
                pt,
            )
            assert hit == expected, (xy, hit)
        await page.mouse.click(**await point(*tank))
        await wait_for_route(page)
        await expect(page.locator(".aurora-explorer h2")).to_have_text(
            "Tanque de combustível"
        )
        await expect(page.locator("#vehiclePartSelect")).to_have_value(
            "peca_30_tanque_tubo_combustivel"
        )
        await expect(page.locator(".vehicle-part-name")).to_have_text(
            "Tanque e tubo de combustível"
        )
        await expect(
            page.locator('[data-part-topic="vehicle:tanque-impacto"]')
        ).to_have_count(1)
        await expect(
            page.locator('[data-part-topic="component:bomba-combustivel"]')
        ).to_have_count(1)
        await page.locator(".aurora-primary").click()
        await wait_for_route(page)
        await expect(page.locator("#main h1")).to_have_text(
            "Tanque e tubo de combustível"
        )
        assert "part=peca_30_tanque_tubo_combustivel" in page.url
        for tab in ["documents", "summary"]:
            await page.locator(f'.detail-tabs [data-tree-tab="{tab}"]').click()
            assert await page.evaluate("activeTreeUI().tab") == tab
        await page.locator('.detail-tabs [data-tree-tab="summary"]').focus()
        await page.keyboard.press("ArrowRight")
        assert await page.evaluate("activeTreeUI().tab") == "documents"
        await page.keyboard.press("ArrowLeft")
        assert await page.evaluate("activeTreeUI().tab") == "summary"
        # A drawn part without reviewed references must not inherit its system's laws.
        for part, component, label, fragment in [
            ("peca_29_radiador", "motor", "Radiador e ventilador", "radiador"),
            ("peca_28_chicote_eletrico", "eletrica", "Chicote elétrico", "chicote"),
        ]:
            await route(f"#vehicle?focus={component}&part={part}")
            await expect(page.locator("#vehiclePartSelect")).to_have_value(part)
            await expect(page.locator(".vehicle-reference-count")).to_have_text(
                "Sem referência específica cadastrada"
            )
            await page.locator(".aurora-primary").click()
            await wait_for_route(page)
            await expect(page.locator("#main h1")).to_have_text(label)
            assert (
                await page.evaluate(
                    "Object.values(treeModels.vehicle.nodes).filter(node=>node.recordId).length"
                )
                == 0
            ), part
            assert fragment in (await page.locator("#aiPanel").inner_text()).lower()
            assert await page.locator("#aiPanel .tree-doc").count() == 0
            await page.locator('.node-main[data-tree-node$=":gap:0"]').click()
            await wait_for_route(page)
            await expect(page.locator("#aiPanel")).to_contain_text(
                "Sem referência neste acervo"
            )
            await expect(page.locator("#aiPanel")).to_contain_text(
                "Zero documentos não significa isenção"
            )
            report["partGaps"].append(part)
        # Every primary route uses actual sidebar links, followed by mobile navigation.
        await route("#vehicle")
        links = await page.locator("[data-nav]").evaluate_all(
            'els=>els.filter(e=>getComputedStyle(e).display!=="none").map(e=>({id:e.dataset.nav,href:e.getAttribute("href")}))'
        )
        for link in links:
            await click_navigation(page, link["id"])
            await wait_for_route(page)
            assert await page.locator("#main h1").count() == 1, link
            assert not await page.evaluate(
                "document.documentElement.scrollWidth>innerWidth"
            ), link
            report["routes"].append(link["id"])
        await page.set_viewport_size({"width": 390, "height": 844})
        for link in links:
            await page.locator("#navigationToggle").click()
            await click_navigation(page, link["id"])
            await wait_for_route(page)
            assert (
                await page.locator("#navigationToggle").get_attribute("aria-expanded")
                == "false"
            )
            assert not await page.evaluate(
                "document.documentElement.scrollWidth>innerWidth"
            ), link
        await page.locator("#navigationToggle").click()
        await page.locator(".brand").click()
        await wait_for_route(page)
        assert (
            await page.locator("#navigationToggle").get_attribute("aria-expanded")
            == "false"
        )
        await page.set_viewport_size({"width": 1440, "height": 1100})
        await route("#vehicle?all=1")
        systems = await page.evaluate(
            "vehicleComponents.map(c=>({id:c.id,lanes:ComponentFlow.topics(c,catalog.metadata.hierarchy).map(l=>l.id),subs:ComponentFlow.subsystems(c,catalog.metadata.hierarchy).map(s=>s.id)}))"
        )
        for system in systems:
            await route("#vehicle?focus=" + system["id"] + "&all=1")
            await page.locator(".aurora-primary").click()
            await wait_for_route(page)
            assert await page.locator(".component-graph").count() == 1
            for lane in system["lanes"]:
                await page.locator(f'.component-lanes a[href*="lane={lane}"]').click()
                await wait_for_route(page)
                await page.locator('.detail-tabs [data-tree-tab="documents"]').click()
                assert await page.evaluate("activeTreeUI().tab") == "documents"
                await page.locator('.detail-tabs [data-tree-tab="summary"]').click()
                assert await page.evaluate("activeTreeUI().tab") == "summary"
            report["systems"].append(system["id"])
            for sub in system["subs"]:
                await route("#vehicle?component=" + system["id"] + "&subsystem=" + sub)
                assert await page.locator(".subsystem-card.active").count() == 1
                report["subsystems"].append(sub)
        await route("#flow")
        stages = await page.evaluate(
            "homologationFlowSpec.stages.map(s=>({id:s.id,activities:s.activities.map(a=>a.id)}))"
        )
        for stage in stages:
            await route("#flow?stage=" + stage["id"])
            for activity in stage["activities"]:
                node = "flow:" + stage["id"] + ":" + activity
                await page.locator(f'.node-main[data-tree-node="{node}"]').click()
                assert await page.evaluate("activeTreeUI().selected") == node
                shortcuts = await page.locator(".homologation-activity-links a").count()
                for tab in ["documents", "summary"]:
                    await page.locator(f'.detail-tabs [data-tree-tab="{tab}"]').click()
                    assert await page.evaluate("activeTreeUI().tab") == tab
                    assert (
                        await page.locator(".homologation-activity-links a").count()
                        == shortcuts
                    )
                report["activities"].append(node)
        # Every active collection record opens its own detail, with the correct source binding.
        for source in ["contran", "proconve", "inmetro", "anatel"]:
            print("Checking every active " + source + " record", flush=True)
            await route("#" + source)
            ids = await page.evaluate(
                "(s)=>regulatoryData[s].records.map(r=>r.id)", source
            )
            for record in ids:
                await route("#" + source + "?record=" + record)
                assert await page.locator("[data-contran-record]").count() == 1, (
                    source,
                    record,
                )
                assert (
                    await page.locator("[data-contran-record]").get_attribute(
                        "data-contran-record"
                    )
                    == record
                )
                report["activeRecords"].append(source + ":" + record)
        await route("#library")
        records = await page.evaluate(
            "catalogRecords(catalog).map(r=>({id:r.id,title:r.title}))"
        )
        print(f"Checking {len(records)} canonical document dialogs", flush=True)
        for ordinal, record in enumerate(records, 1):
            await page.evaluate("id=>openNorm(id)", record["id"])
            assert (
                await page.locator("#normDialogTitle").inner_text() == record["title"]
            ), record
            assert (
                await page.locator('#normDialog .actions a[target="_blank"]').count()
                > 0
            ), record
            report["externalLinks"] += await page.locator(
                '#normDialog a[target="_blank"]'
            ).evaluate_all("els=>els.map(e=>e.href)")
            await page.locator("#closeDialog").click()
            report["records"].append(record["id"])
            if ordinal % 100 == 0:
                print(f"Checked {ordinal}/{len(records)} document dialogs", flush=True)
        for legacy in ["#ai", "#unknown-route"]:
            await route(legacy) if legacy != "#ai" else await page.evaluate(
                '()=>location.hash="#ai"'
            )
            if legacy == "#ai":
                await page.wait_for_url("**/#library")
                await wait_for_route(page)
        expected_active = sum(
            json.loads((ROOT / f"data/{source}/active.json").read_text())["metadata"][
                "activeCount"
            ]
            for source in ("contran", "proconve", "inmetro", "anatel")
        )
        assert len(report["activeRecords"]) == expected_active
        assert not any(
            "contran-220-2007" in record for record in report["activeRecords"]
        )
        assert "mover-009" not in report["records"]
        assert not errors, errors
        report["subsystems"] = sorted(set(report["subsystems"]))
        report["externalLinks"] = sorted(set(report["externalLinks"]))
        report["errors"] = errors
        (ROOT / "tests/artifacts/full-checkup.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2)
        )
        await browser.close()
    print("PASS full checkup:", {k: len(v) for k, v in report.items()})


with TestServer() as BASE:
    asyncio.run(main())
