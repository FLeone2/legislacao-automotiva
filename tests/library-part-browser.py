"""Part-scoped library queries and reverse document links use the explicit map."""

import asyncio
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright, expect

from browser_support import TestServer, launch_options, wait_for_route

BATTERY_12V = "peca_27_bateria_12v"
TRACTION_BATTERY = "peca_26_bateria_tracao"
RADIATOR = "peca_29_radiador"


def route_query(page):
    return parse_qs(urlsplit(page.url).fragment.partition("?")[2])


async def main(base):
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        context = await browser.new_context(
            viewport={"width": 1440, "height": 1050},
            permissions=["clipboard-read", "clipboard-write"],
        )
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))

        await page.goto(base + "#library?part=" + BATTERY_12V)
        await wait_for_route(page)
        await expect(page.locator(".document")).to_have_count(1)
        await expect(page.locator("#libraryPartContext")).to_contain_text("12 V")
        await expect(page.locator(".document-context")).to_contain_text(
            "Vínculo com o componente"
        )
        await expect(page.locator("#libraryQuerySummary")).not_to_contain_text(
            "todo o acervo"
        )
        await page.locator("#agencyFilter").select_option("INMETRO")
        await page.locator("#reviewFilter").select_option("reference")
        await page.locator("#librarySearch").fill("145")
        await expect(page.locator(".document")).to_have_count(1)
        assert route_query(page)["part"] == [BATTERY_12V]
        await page.locator("#copyLibraryLink").click()
        await expect(page.locator("#libraryCopyStatus")).to_have_text("Link copiado.")
        copied = await page.evaluate("navigator.clipboard.readText()")
        assert parse_qs(urlsplit(copied).fragment.partition("?")[2])["part"] == [
            BATTERY_12V
        ]
        await page.reload()
        await wait_for_route(page)
        await expect(page.locator("#librarySearch")).to_have_value("145")
        await expect(page.locator("#reviewFilter")).to_have_value("reference")
        await expect(page.locator(".document")).to_have_count(1)
        await page.locator("#reviewFilter").select_option("directed")
        await expect(page.locator(".document")).to_have_count(0)
        assert route_query(page)["part"] == [BATTERY_12V]
        await page.locator("#reviewFilter").select_option("reference")

        # The broad 145 act contains a lead-acid topic, not a traction battery link.
        await page.locator(".document [data-open]").click()
        await expect(page.locator("#normDialog")).to_be_visible()
        await page.locator("#normDialog [data-document-part]").first.wait_for(
            state="attached"
        )
        linked = await page.locator("#normDialog [data-document-part]").evaluate_all(
            "elements=>elements.map(element=>element.dataset.documentPart)"
        )
        assert BATTERY_12V in linked
        assert TRACTION_BATTERY not in linked
        assert "peca_25_motor_eletrico_inversor_cabos" not in linked
        link = page.locator('#normDialog [data-document-part="' + BATTERY_12V + '"]')
        await link.evaluate(
            "element=>{const details=element.closest('details');if(details)details.open=true}"
        )
        await link.click()
        await expect(page.locator("#normDialog")).not_to_be_visible()
        await wait_for_route(page)
        assert route_query(page)["part"] == [BATTERY_12V]
        assert route_query(page)["component"] == ["eletrica"]

        await page.goto(base + "#library?part=" + TRACTION_BATTERY)
        await wait_for_route(page)
        await expect(page.locator(".document")).to_have_count(2)
        await expect(page.locator(".document-context").first).to_contain_text(
            "Contexto do veículo"
        )
        await expect(
            page.locator('[data-catalog-act="inmetro-145-2022"]')
        ).to_have_count(0)
        await page.locator("#agencyFilter").select_option("ANATEL")
        await expect(page.locator(".document")).to_have_count(0)
        await page.get_by_role("link", name="Remover filtro de conjunto").click()
        await wait_for_route(page)
        await expect(page.locator("#agencyFilter")).to_have_value("ANATEL")
        await expect(page.locator(".document")).not_to_have_count(0)
        assert "part" not in route_query(page)

        # Unknown or unmapped drawings must never fall back to their whole system.
        for part in [RADIATOR, "peca_inexistente"]:
            await page.goto(base + "#library?part=" + part)
            await wait_for_route(page)
            await expect(page.locator(".document")).to_have_count(0)
            await expect(page.locator(".empty")).to_be_visible()
            await page.locator("#clearEmpty").click()
            await wait_for_route(page)
            await expect(page.locator(".document")).to_have_count(30)
            assert "part" not in route_query(page)

        await page.goto(base + "#library?part=peca_24_motor_combustao_transmissao")
        await wait_for_route(page)
        canonical_ids = await page.locator(".document [data-open]").evaluate_all(
            """elements=>elements.map(element=>{
                const record=catalog.records.find(record=>record.id===element.dataset.open);
                return record.regulatoryId||record.id;
            })"""
        )
        assert len(canonical_ids) == 21
        assert len(canonical_ids) == len(set(canonical_ids))

        await page.goto(base + "#library?part=" + BATTERY_12V)
        await wait_for_route(page)
        await page.locator("#componentFilter").select_option("vidros")
        await expect(page.locator(".document")).not_to_have_count(0)
        assert "part" not in route_query(page)
        await expect(page.locator("#libraryPartContext")).to_be_empty()

        await page.goto(base + "#library?part=" + BATTERY_12V)
        await wait_for_route(page)
        await page.locator("#globalSearch").fill("rádio")
        await wait_for_route(page)
        assert "part" not in route_query(page)
        await expect(page.locator("#librarySearch")).to_have_value("rádio")
        await expect(page.locator(".document")).not_to_have_count(0)

        for term in ["bateria12V", "bateria 12V"]:
            await page.goto(base + "#library?q=" + term)
            await wait_for_route(page)
            await expect(page.locator(".document")).to_have_count(1)
            assert "145" in await page.locator(".document h3").inner_text()
        await page.goto(base + "#library?q=bateria+de+tração")
        await wait_for_route(page)
        # General text search also finds a negative scope statement in req:11.
        # Finding that wording must not create a curated traction-battery link.
        assert set(
            await page.locator("[data-catalog-act]").evaluate_all(
                "nodes=>nodes.map(node=>node.dataset.catalogAct)"
            )
        ) == {"ibama-in-3-2023", "contran-749-2018", "inmetro-145-2022"}
        rule = await page.evaluate(
            "catalogRecord(catalog,'inmetro-145-2022').requirements.find(item=>item.id==='inmetro-145-2022:req:11').rule"
        )
        assert "baterias chumbo-ácido importadas" in rule
        assert "não é regra universal de bateria de tração" in rule
        for part in (TRACTION_BATTERY, "peca_25_motor_eletrico_inversor_cabos"):
            await page.goto(base + "#library?part=" + part)
            await wait_for_route(page)
            assert set(
                await page.locator("[data-catalog-act]").evaluate_all(
                    "nodes=>nodes.map(node=>node.dataset.catalogAct)"
                )
            ) == {"ibama-in-3-2023", "contran-749-2018"}
            await expect(
                page.locator('[data-catalog-act="inmetro-145-2022"]')
            ).to_have_count(0)
        await page.goto(base + "#library?q=radiador")
        await wait_for_route(page)
        await expect(page.locator(".document")).to_have_count(0)

        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(base + "#library?part=" + BATTERY_12V)
        await wait_for_route(page)
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        await page.get_by_role("link", name="Ver no veículo").click()
        await wait_for_route(page)
        assert route_query(page)["part"] == [BATTERY_12V]
        assert route_query(page)["focus"] == ["eletrica"]

        assert not errors, errors
        await browser.close()
    print(
        "PASS: exact part scope, AND filters, shared query context, lead-acid/traction separation, "
        "reverse document links, explicit empty states, clearing and mobile return."
    )


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(main(base))
