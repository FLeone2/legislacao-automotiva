"""Rules of the official-copy robot that run without network access."""

import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "fetch_official_pdfs", ROOT / "scripts/fetch_official_pdfs.py"
)
fetch = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(fetch)

BASE = "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/"


class CandidateUrls(unittest.TestCase):
    def test_gov_br_pdf_tries_the_file_before_the_information_page(self):
        url = BASE + "Resolucao9492022.pdf"
        self.assertEqual(fetch.candidate_urls(url), [url + "/@@display-file/file", url])

    def test_addresses_already_pointing_to_the_file_are_kept(self):
        url = BASE + "Resolucao9492022.pdf/@@display-file/file"
        self.assertEqual(fetch.candidate_urls(url), [url])

    def test_other_hosts_are_kept(self):
        url = "https://www.planalto.gov.br/ccivil_03/leis/l8723.htm"
        self.assertEqual(fetch.candidate_urls(url), [url])


class RejectedPages(unittest.TestCase):
    def test_file_information_page_is_not_the_act(self):
        text = "Resolucao9492022.pdf\nCriado em 04/04/2022\nResolucao9492022.pdf — 74.72 KB"
        self.assertIsNotNone(fetch.rejected_page(text, BASE + "Resolucao9492022.pdf"))

    def test_maintenance_notice_is_not_the_act(self):
        text = "Aplicação em manutenção programada - SpectrumE"
        url = "https://informacoes.anatel.gov.br/aviso/manutencao-sistemas.html"
        self.assertIsNotNone(fetch.rejected_page(text, url))

    def test_inmetro_index_is_not_the_ordinance(self):
        url = "https://portaliq.mdic.gov.br/busca-aplicada/central-de-consultas/x"
        self.assertIsNotNone(fetch.rejected_page("Natureza do Regulamento", url))

    def test_law_text_is_accepted(self):
        text = (
            "RESOLUÇÃO CONTRAN Nº 949, DE 28 DE MARÇO DE 2022\nArt. 1º Esta Resolução"
        )
        self.assertIsNone(fetch.rejected_page(text, BASE + "x.pdf/@@display-file/file"))


class ContranAnnexLinks(unittest.TestCase):
    def test_separate_annexes_are_matched_to_published_acts(self):
        acts = {"contran-949-2022", "contran-970-2022", "contran-888-2021"}
        links = fetch.contran_annex_links(acts)
        self.assertEqual(
            links["contran-949-2022"], [BASE + "Resolucao9492022ANEXO.pdf"]
        )
        self.assertEqual(len(links["contran-970-2022"]), 2)
        self.assertIn("contran-888-2021", links)
        self.assertTrue(set(links) <= acts)

    def test_acts_outside_the_selection_are_ignored(self):
        self.assertEqual(fetch.contran_annex_links(set()), {})


if __name__ == "__main__":
    unittest.main()
