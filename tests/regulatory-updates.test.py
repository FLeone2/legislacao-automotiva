"""Monitoring must expose missing inventory even without a changed HTTP response."""

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import socket
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.request import Request

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "regulatory_updates", ROOT / "scripts/check_regulatory_updates.py"
)
M = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = M
SPEC.loader.exec_module(M)

SOURCE = {
    "id": "fixture-source",
    "title": "Fonte oficial de teste",
    "agency": "MDIC",
    "url": "https://www.gov.br/mdic/test-source",
    "checkedAt": "2026-10-19",
    "legalStatus": "requires_chain_review",
}
TEXT = "Conteúdo normativo de exemplo para observar a fonte sem decidir sua validade."


def response(body=None, status=200, url=None, headers=None):
    return M.FetchResult(
        status,
        url or SOURCE["url"],
        headers or {"ETag": '"one"', "Last-Modified": "Mon, 19 Oct 2026 10:00:00 GMT"},
        (body or f"<html><title>Fonte</title><main>{TEXT}</main></html>").encode(),
    )


def run_monitor(
    source=SOURCE, state=None, packet=None, known=None, date="2026-10-25T10:00:00+00:00"
):
    return M.monitor(
        [source],
        state or {},
        known or set(),
        transport=lambda url, headers: packet or response(),
        observed_at=date,
        workers=1,
    )


def public_dns(host, port, **kwargs):
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", port))]


class MonitoringTest(unittest.TestCase):
    def test_baseline_unchanged_content_and_304_do_not_promote_review(self):
        source = deepcopy(SOURCE)
        _, state = run_monitor(source=source)
        sent = []

        def cached(url, headers):
            sent.append(headers)
            return response(status=304)

        report, after = M.monitor(
            [source], state, set(), cached, observed_at="2026-10-26T10:00:00+00:00"
        )
        self.assertEqual(report["observations"][0]["outcome"], "not_modified")
        self.assertEqual(state, after)
        self.assertEqual(sent[0]["If-None-Match"], '"one"')
        self.assertIn("If-Modified-Since", sent[0])
        self.assertEqual(source, SOURCE)
        self.assertEqual(source["checkedAt"], "2026-10-19")
        unchanged, _ = run_monitor(source=source, state=state)
        self.assertEqual(unchanged["observations"][0]["outcome"], "unchanged")

    def test_hash_ignores_chrome_but_changes_when_a_legal_link_changes(self):
        first = response(
            f"<nav>Dia 1</nav><main>{TEXT}<a href='/a'>Documento</a></main><script>one()</script>"
        )
        _, state = run_monitor(packet=first)
        second = response(
            f"<nav>Dia 2</nav><main>{TEXT}<a href='/a'>Documento</a></main><script>two()</script>"
        )
        report, state = run_monitor(state=state, packet=second)
        self.assertEqual(report["observations"][0]["outcome"], "unchanged")
        changed = response(f"<main>{TEXT}<a href='/b'>Documento</a></main>")
        report, state = run_monitor(state=state, packet=changed)
        self.assertEqual(report["observations"][0]["outcome"], "changed")
        self.assertEqual(
            report["observations"][0]["addedOfficialLinks"], ["https://www.gov.br/b"]
        )
        self.assertEqual(report["counts"]["pendingContentReviews"], 1)
        # A second unchanged fetch cannot silently drop an unreviewed change.
        again, state = run_monitor(state=state, packet=changed)
        self.assertEqual(again["observations"][0]["outcome"], "unchanged")
        self.assertEqual(again["status"], "review_required")
        identity = next(iter(state["pendingChanges"]))
        with self.assertRaises(ValueError):
            M.acknowledge(deepcopy(state), [identity], "", "2026-10-26")
        M.acknowledge(state, [identity], "commit-reviewed-evidence", "2026-10-26")
        self.assertEqual(state["pendingChanges"], {})
        self.assertEqual(
            state["acknowledgedChanges"][0]["reviewReference"],
            "commit-reviewed-evidence",
        )

    def test_200_maintenance_auth_page_and_failed_fetch_preserve_last_good_state(self):
        _, state = run_monitor()
        for packet in [
            response(
                "<html><title>Em manutenção</title><main>O sistema está temporariamente indisponível.</main></html>"
            ),
            response(
                url="https://informacoes.anatel.gov.br/aviso/manutencao-sistemas.html"
            ),
            response(
                url="https://www.gov.br/inmetro/acl_users/credentials_cookie_auth/require_login"
            ),
            response(status=503),
            response(
                status=304,
                url="https://informacoes.anatel.gov.br/aviso/manutencao-sistemas.html",
            ),
            response(url="https://example.com/not-official"),
        ]:
            report, after = run_monitor(state=state, packet=packet)
            self.assertEqual(report["status"], "partial_observation")
            self.assertEqual(report["counts"]["unavailable"], 1)
            self.assertEqual(after, state)

        def timeout(url, headers):
            raise TimeoutError("timed out")

        report, after = M.monitor([SOURCE], state, set(), timeout, workers=1)
        self.assertEqual(report["counts"]["unavailable"], 1)
        self.assertEqual(after, state)
        report, after = run_monitor(packet=response(status=304))
        self.assertEqual(
            report["observations"][0]["reason"], "304_without_previous_snapshot"
        )
        self.assertEqual(after["sources"], {})

    def test_pdf_request_cannot_accept_a_generic_html_success_page(self):
        source = {**SOURCE, "url": "https://www.gov.br/a.pdf/@@display-file/file"}
        report, state = run_monitor(source=source, packet=response())
        self.assertEqual(report["observations"][0]["reason"], "unexpected_html_for_pdf")
        self.assertFalse(state["sources"])

    def test_unchanged_index_and_304_keep_uninventoried_citations_visible(self):
        source = {**SOURCE, "citationPolicy": "mdic_portarias_automotive"}
        body = """<main><h1>Portarias MDIC</h1><table>
        <tr><td><a href='https://www.in.gov.br/web/dou/-/portaria-167-2026'>Portaria GM/MDIC nº 167, de 8 de outubro de 2026</a></td><td>Altera a Portaria GM/MDIC nº 176/2025, Programa MOVER.</td></tr>
        <tr><td><a href='https://www.in.gov.br/web/dou/-/portaria-170-2026'>Portaria GM/MDIC nº 170/2026</a></td><td>Nomeação de pessoal administrativo.</td></tr>
        <tr><td><a href='https://www.gov.br/mdic/minuta-171'>Portaria GM/MDIC nº 171/2026</a></td><td>Minuta em consulta pública do Programa MOVER.</td></tr>
        </table></main>"""
        known = {"MDIC:portaria:176:2025"}
        packet = response(body)
        baseline, state = run_monitor(source, packet=packet, known=known)
        self.assertEqual(baseline["counts"]["missingInventoryCitations"], 1)
        self.assertEqual(
            baseline["inventoryCandidates"][0]["key"], "MDIC:portaria:167:2026"
        )
        self.assertEqual(baseline["counts"]["draftOrConsultationCandidates"], 1)
        self.assertIsNone(baseline["inventoryCandidates"][0]["legalStatus"])
        self.assertEqual(
            baseline["inventoryCandidates"][0]["reviewStatus"], "index_reference_only"
        )
        for result in (packet, response(status=304)):
            report, _ = run_monitor(source, state, result, known)
            self.assertIn(
                report["observations"][0]["outcome"], ("unchanged", "not_modified")
            )
            self.assertEqual(report["counts"]["missingInventoryCitations"], 1)
            self.assertEqual(report["status"], "review_required")
        reconciled, _ = run_monitor(
            source, state, response(status=304), known | {"MDIC:portaria:167:2026"}
        )
        self.assertEqual(reconciled["counts"]["missingInventoryCitations"], 0)
        # Exact agency, act type and year are mandatory; a shared number is insufficient.
        self.assertEqual(M.mdic_citations("Portaria Inmetro 167/2026"), [])
        self.assertEqual(M.mdic_citations("Resolução MDIC 167/2026"), [])
        self.assertEqual(M.mdic_citations("Portaria nº 167"), [])
        self.assertEqual(
            M.mdic_citations("Portaria GM-MDIC 167-2025")[0]["key"],
            "MDIC:portaria:167:2025",
        )

    def test_url_redirect_dns_and_published_output_guards(self):
        for url in [
            "http://www.gov.br/x",
            "https://www.gov.br.evil.com/x",
            "https://name:password@www.gov.br/x",
            "https://127.0.0.1/x",
            "https://www.gov.br:444/x",
        ]:
            with self.assertRaises(ValueError):
                M.official_url(url)
        self.assertEqual(M.official_url(SOURCE["url"], public_dns), SOURCE["url"])

        def private_dns(host, port, **kwargs):
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.1.2.3", port))]

        with self.assertRaises(ValueError):
            M.official_url(SOURCE["url"], private_dns)
        with self.assertRaises(ValueError):
            M.SafeRedirect(public_dns).redirect_request(
                Request(SOURCE["url"]),
                None,
                302,
                "redirect",
                {},
                "https://example.com/target",
            )
        for path in (
            ROOT / "dist/state.json",
            ROOT / "data/state.json",
            ROOT / "docs/guide/state.json",
        ):
            with self.assertRaises(ValueError):
                M.safe_output(path)
        with tempfile.TemporaryDirectory() as folder:
            path = M.safe_output(Path(folder) / "state.json")
            self.assertEqual(path.parent, Path(folder))

    def test_actual_mdic_split_word_http_anchor_and_interministerial_number_collision(
        self,
    ):
        source = {**SOURCE, "citationPolicy": "mdic_portarias_automotive"}
        packet = response("""<main>
        <p><b>P<a href="http://pesquisa.in.gov.br/imprensa/jsp/visualiza/index.jsp?data=19/06/2026&amp;jornal=602&amp;pagina=5">ORTARIA GM/MDIC Nº 167, DE 18 DE JUNHO DE 2026</a></b> (Altera a <a href="http://www.in.gov.br/en/web/dou/-/portaria-gm/mdic-n-176-de-7-de-julho-de-2025-641610640">PORTARIA GM/MDIC Nº 176, DE 7 DE JULHO DE 2025</a>)</p>
        <p>Dispõe sobre implementos e eficiência energética de veículos pesados.</p>
        <p><a href="https://www.in.gov.br/web/dou/-/portaria-interministerial-mdic/mcti-n-167-de-9-de-marco-de-2026-693793551">PORTARIA INTERMINISTERIAL MDIC/MCTI Nº 167, DE 9 DE MARÇO DE 2026</a></p>
        <p>Produto de petróleo; referência interministerial distinta.</p>
        </main>""")
        report, state = run_monitor(
            source, packet=packet, known={"MDIC:portaria:176:2025"}
        )
        self.assertEqual(report["counts"]["missingInventoryCitations"], 1)
        candidate = report["inventoryCandidates"][0]
        self.assertEqual(candidate["key"], "MDIC:portaria:167:2026")
        self.assertTrue(
            candidate["originalHref"].startswith("http://pesquisa.in.gov.br/")
        )
        self.assertTrue(candidate["url"].startswith("https://pesquisa.in.gov.br/"))
        self.assertEqual(candidate["linkStatus"], "https_variant_not_fetched")
        self.assertTrue(candidate["originalAnchorLabel"].startswith("ORTARIA"))
        self.assertTrue(candidate["citationLabel"].startswith("PORTARIA"))
        report, _ = run_monitor(
            source, state, response(status=304), {"MDIC:portaria:176:2025"}
        )
        self.assertEqual(report["counts"]["missingInventoryCitations"], 1)

    def test_transport_enforces_response_size_before_accepting_the_body(self):
        class TooLarge:
            headers = {"Content-Length": str(M.MAX_BYTES + 1)}
            url = SOURCE["url"]
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

        class FakeOpener:
            def open(self, *args, **kwargs):
                return TooLarge()

        with patch.object(M, "build_opener", return_value=FakeOpener()):
            with self.assertRaises(ValueError):
                M.fetch(SOURCE["url"], {}, resolver=public_dns)

    def test_curated_registry_loads_without_duplicate_urls_or_mutating_review_dates(
        self,
    ):
        sources = M.load_sources()
        self.assertGreaterEqual(len(sources), 29)
        self.assertEqual(len(sources), len({row["id"] for row in sources}))
        self.assertEqual(len(sources), len({row["url"] for row in sources}))
        snapshot = json.loads((ROOT / "data/process/official-sources.json").read_text())
        for original in snapshot["records"]:
            loaded = next(row for row in sources if row["id"] == original["id"])
            self.assertEqual(loaded["registryCheckedAt"], original["checkedAt"])

    def test_all_catalog_identities_survive_url_deduplication(self):
        sources = M.load_sources(include_catalog=True)
        index = json.loads((ROOT / "data/process/knowledge-index.json").read_text())
        actual = {
            ref["id"]
            for source in sources
            for ref in source["references"]
            if ref["kind"] == "catalog_act"
        }
        self.assertEqual(actual, {act["id"] for act in index["tables"]["acts"]})
        self.assertEqual(len(sources), len({source["url"] for source in sources}))
        self.assertTrue(any(len(source["references"]) > 1 for source in sources))

    def test_registered_index_candidate_remains_review_pending_on_304(self):
        source = {**SOURCE, "citationPolicy": "mdic_portarias_automotive"}
        body = "<main><p><a href='https://www.in.gov.br/portaria167'>Portaria GM/MDIC nº167/2026</a></p><p>Programa MOVER e veículos pesados.</p></main>"
        editorial = {
            "MDIC:portaria:167:2026": {
                "candidateId": "mdic-gm-167-2026",
                "publication": {"included": False},
                "legalStatus": None,
                "reviewStatus": {"fullTextReviewed": False},
            }
        }
        report, state = M.monitor(
            [source], {}, set(), lambda u, h: response(body), candidates=editorial
        )
        self.assertEqual(report["counts"]["missingInventoryCitations"], 0)
        self.assertEqual(report["counts"]["registeredCandidateReviews"], 1)
        self.assertEqual(report["status"], "review_required")
        self.assertEqual(
            report["inventoryCandidates"][0]["status"],
            "registered_candidate_review_pending",
        )
        report, _ = M.monitor(
            [source],
            state,
            set(),
            lambda u, h: response(status=304),
            candidates=editorial,
        )
        self.assertEqual(report["counts"]["registeredCandidateReviews"], 1)
        self.assertFalse(
            report["inventoryCandidates"][0]["editorialCandidate"]["publication"][
                "included"
            ]
        )

    def test_time_budget_does_not_report_unattempted_sources_as_unchanged(self):
        _, state = run_monitor()
        counter = iter([0])

        def clock():
            return next(counter, 10)

        def forbidden_fetch(url, headers):
            raise AssertionError("Expired work must not start another network request")

        with patch.object(M.time, "monotonic", side_effect=clock):
            report, after = M.monitor(
                [SOURCE], state, set(), forbidden_fetch, time_budget=1
            )
        self.assertEqual(report["counts"]["notAttempted"], 1)
        self.assertEqual(report["counts"]["available"], 0)
        self.assertEqual(report["status"], "partial_observation")
        self.assertEqual(after, state)

    def test_new_normalizer_requires_full_fetch_instead_of_trusting_a_stale_304(self):
        _, state = run_monitor()
        state["sources"][SOURCE["id"]].pop("normalizationVersion")
        report, after = run_monitor(state=state, packet=response(status=304))
        self.assertEqual(
            report["observations"][0]["reason"],
            "304_requires_current_normalization_snapshot",
        )
        self.assertEqual(state, after)
        report, after = run_monitor(state=state)
        self.assertEqual(report["observations"][0]["outcome"], "normalization_rebased")
        self.assertFalse(after["pendingChanges"])

    def test_new_curated_id_for_existing_catalog_url_reuses_the_previous_baseline(self):
        _, state = run_monitor()
        renamed = {**SOURCE, "id": "new-curated-source"}
        received = []

        def cached(url, headers):
            received.append(headers)
            return response(status=304)

        report, after = M.monitor([renamed], state, set(), cached)
        self.assertEqual(report["observations"][0]["outcome"], "not_modified")
        self.assertEqual(received[0]["If-None-Match"], '"one"')
        self.assertEqual(state, after)
        self.assertEqual(
            M.mdic_citations("PORTARIA MDIC/GM Nº 43/2024")[0]["key"],
            "MDIC:portaria:43:2024",
        )
        self.assertIn("MDIC:portaria:43:2024", M.known_citations())

    def test_official_plone_preview_resolves_only_declared_same_file_https_download(
        self,
    ):
        seed = "https://www.gov.br/transportes/resolucao.pdf"
        download = seed + "/@@display-file/file"
        html = f"<html><main>Documento oficial <a href='{download}'>Baixar PDF</a></main></html>".encode()
        calls = []

        class Packet:
            def __init__(self, url, body):
                self.url, self.body = url, body
                self.status, self.headers = 200, {}

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def read(self, limit):
                return self.body[:limit]

        class PreviewOpener:
            def open(self, request, timeout):
                calls.append(
                    (
                        request.full_url,
                        {k.lower(): v for k, v in request.header_items()},
                    )
                )
                return (
                    Packet(seed, html)
                    if len(calls) == 1
                    else Packet(download, b"%PDF-1.7 official example")
                )

        with patch.object(M, "build_opener", return_value=PreviewOpener()):
            result = M.fetch(
                seed, {"If-None-Match": '"pdf-baseline"'}, resolver=public_dns
            )
        self.assertEqual(result.url, download)
        self.assertTrue(result.body.startswith(b"%PDF-"))
        self.assertNotIn("if-none-match", calls[0][1])
        self.assertEqual(calls[1][1]["if-none-match"], '"pdf-baseline"')
        for link in [
            "http://www.gov.br/transportes/resolucao.pdf/@@display-file/file",
            "https://example.com/resolucao.pdf/@@display-file/file",
            "https://www.gov.br/other.pdf/@@display-file/file",
        ]:
            html = f"<main>Documento com referência <a href='{link}'>PDF</a></main>".encode()
            self.assertIsNone(
                M.preview_download_url(M.FetchResult(200, seed, {}, html))
            )


if __name__ == "__main__":
    unittest.main()
