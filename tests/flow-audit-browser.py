"""Audit regressions: thermal hybrids, process topics and MOVER successor."""

import asyncio
from playwright.async_api import async_playwright, expect
from browser_support import TestServer, launch_options, wait_for_route


async def open_route(page, base, route):
    await page.goto(base + route)
    await wait_for_route(page)


async def main(base):
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(viewport={"width": 1440, "height": 1050})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        for profile, present, absent in [
            ("hev", "hev", "phev"),
            ("phev", "phev", "hev"),
        ]:
            await open_route(
                page,
                base,
                f"#flow?stage=laboratorio&powertrain={profile}&node=flow:laboratorio:combustao",
            )
            await expect(page.locator("#flowPowertrain")).to_have_value(profile)
            ids = await page.evaluate("Object.keys(treeModels.flow.nodes)")
            assert "flow:laboratorio:combustao" in ids
            assert f"flow:laboratorio:{present}" in ids
            assert f"flow:laboratorio:{absent}" not in ids
            assert "flow:laboratorio:combustao:law:ibama-in-23-2020" in ids
            assert "flow:laboratorio:combustao:law:ibama-in-22-2020" in ids
            await expect(page.locator("#flowDetailPanel")).to_contain_text(
                "motor a combustão"
            )
            await page.reload()
            await wait_for_route(page)
            await expect(page.locator("#flowPowertrain")).to_have_value(profile)

        await open_route(page, base, "#flow?stage=laboratorio&powertrain=hibrido")
        ids = await page.evaluate("Object.keys(treeModels.flow.nodes)")
        assert "flow:laboratorio:hev" in ids and "flow:laboratorio:phev" in ids
        for subject in ["rde", "durabilidade", "ruido", "evaporativas"]:
            assert f"flow:laboratorio:{subject}" in ids
        assert "flow:laboratorio:evaporativas:law:ibama-in-26-2020" in ids
        await page.locator("#flowPowertrain").select_option("eletrico")
        await wait_for_route(page)
        ids = await page.evaluate("Object.keys(treeModels.flow.nodes)")
        for subject in [
            "combustao",
            "hev",
            "phev",
            "rde",
            "durabilidade",
            "evaporativas",
        ]:
            assert f"flow:laboratorio:{subject}" not in ids
        assert "flow:laboratorio:eletrico" in ids

        await open_route(page, base, "#flow?stage=aprovacoes&powertrain=eletrico")
        ids = await page.evaluate("Object.keys(treeModels.flow.nodes)")
        assert "flow:aprovacoes:lcvm" not in ids
        assert "flow:aprovacoes:importacao" not in ids
        assert "flow:aprovacoes:corporativo" not in ids
        assert "flow:aprovacoes:eficiencia" in ids
        assert "flow:aprovacoes:mover" in ids
        assert not any("mover-009" in id for id in ids)
        assert any("mover-014" in id for id in ids)

        await open_route(page, base, "#flow?stage=cat&node=flow:cat:cct")
        await expect(page.locator("#flowDetailPanel")).to_contain_text("sem SGQ")
        await expect(page.locator("#flowDetailPanel")).to_contain_text(
            "Não é exigência universal"
        )
        await expect(
            page.locator(
                "#flowDetailPanel .homologation-activity-links a[href^='https://www.gov.br/']"
            )
        ).to_have_attribute(
            "href",
            "https://www.gov.br/pt-br/servicos/emitir-certificado-de-adequacao-a-legislacao-de-transito-cat",
        )
        await open_route(
            page, base, "#flow?stage=seguranca&node=flow:seguranca:equipamentos"
        )
        await expect(page.locator("#flowDetailPanel")).to_contain_text("993/2023")
        assert not await page.evaluate(
            "Object.keys(treeModels.flow.nodes).some(id=>id.includes('contran-220-2007'))"
        )

        await open_route(page, base, "#library?agency=MOVER&q=68%2F2026")
        # The 192/2025 summary also directs the reader to the 68/2026 successor.
        # That contextual match is a different act, not a duplicate 68 card.
        assert set(
            await page.locator("[data-catalog-act]").evaluate_all(
                "nodes=>nodes.map(node=>node.dataset.catalogAct)"
            )
        ) == {"mover-014", "mover-013"}
        await expect(page.locator('[data-catalog-act="mover-014"]')).to_have_count(1)
        await expect(page.locator('[data-catalog-act="mover-014"] h3')).to_contain_text(
            "68/2026"
        )
        await expect(page.locator('[data-catalog-act="mover-009"]')).to_have_count(0)
        await page.set_viewport_size({"width": 390, "height": 844})
        await open_route(
            page,
            base,
            "#flow?stage=laboratorio&powertrain=phev&node=flow:laboratorio:phev",
        )
        await expect(page.locator("#flowPowertrain")).to_have_value("phev")
        await expect(page.locator("#flowDetailPanel")).to_contain_text(
            "recarregável externamente"
        )
        assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
        assert not errors, errors
        await browser.close()
        print(
            "PASS: HEV/PHEV thermal references, legacy hybrid route, BEV exclusions, reviewed subjects, CAT/CCT service, MOVER successor and mobile; no JavaScript errors."
        )


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(main(base))
