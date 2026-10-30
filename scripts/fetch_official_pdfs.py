#!/usr/bin/env python3
"""Keep a copy of each act's official document as PDF, with its text for the assistant.

The copy is a convenience for reading and consultation. It does not change the
legal state, review depth or applicability recorded for any act. Only official
government hosts are fetched. A page that is published as HTML is printed to
PDF by a browser and marked as such. Technical standards (ABNT/NBR) are never
copied, because they are not public-domain official acts.
"""

import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "pdfs"
MANIFEST = OUTPUT / "manifest.json"
MAX_BYTES = 24 * 1024 * 1024  # Cloudflare Pages serves files up to 25 MiB.
MAX_TEXT_CHARS_PER_PAGE = 12_000
USER_AGENT = (
    "legislacao-automotiva/1.0 (+https://github.com/FLeone2/legislacao-automotiva; "
    "copia de consulta de atos oficiais)"
)


def official_host(url):
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    official = host == "gov.br" or host.endswith(".gov.br")
    return parsed.scheme == "https" and official


def private_standard(record):
    text = f"{record.get('title', '')} {record.get('agency', '')}".upper()
    return bool(re.search(r"\b(ABNT|NBR|ISO)\b", text)) and not re.search(
        r"\b(RESOLU|PORTARIA|INSTRU|LEI|DECRETO|ATO|DELIBERA)", text
    )


class OfficialRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urljoin(req.full_url, newurl)
        if not official_host(target):
            raise URLError(f"redirect outside official hosts: {target}")
        return super().redirect_request(req, fp, code, msg, headers, target)


OPENER = build_opener(OfficialRedirects())


def download(url, timeout=60):
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with OPENER.open(request, timeout=timeout) as response:
        final_url = response.geturl()
        if not official_host(final_url):
            raise URLError(f"final URL outside official hosts: {final_url}")
        content_type = response.headers.get("Content-Type", "")
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("document larger than the publishing limit")
    return data, content_type, final_url


def pdf_text(data):
    from io import BytesIO
    from pypdf import PdfReader

    reader = PdfReader(BytesIO(data))
    pages = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:  # A damaged page must not discard the whole document.
            text = ""
        pages.append(normalise(text)[:MAX_TEXT_CHARS_PER_PAGE])
    return pages


def normalise(text):
    text = text.replace(" ", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def print_html(url, browser):
    page = browser.new_page()
    try:
        response = page.goto(url, wait_until="networkidle", timeout=90_000)
        if response is None or not response.ok:
            raise URLError(f"HTTP {response.status if response else 'sem resposta'}")
        if not official_host(page.url):
            raise URLError(f"page moved outside official hosts: {page.url}")
        text = normalise(page.inner_text("body"))
        data = page.pdf(
            format="A4",
            print_background=False,
            margin={"top": "16mm", "bottom": "16mm"},
        )
    finally:
        page.close()
    if len(data) > MAX_BYTES:
        raise ValueError("printed document larger than the publishing limit")
    size = MAX_TEXT_CHARS_PER_PAGE
    return data, [text[i : i + size] for i in range(0, len(text), size)]


def records(only=None):
    rows = []
    for line in (ROOT / "knowledge/records.jsonl").read_text().splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        if only and record["id"] not in only:
            continue
        rows.append(record)
    return sorted(rows, key=lambda r: r["id"])


def safe_name(value):
    return re.sub(r"[^a-z0-9._-]+", "-", value.lower()).strip("-")


def write_if_changed(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() == data:
        return False
    path.write_bytes(data)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", nargs="*", help="IDs de atos a baixar")
    parser.add_argument("--limit", type=int, help="Máximo de atos nesta execução")
    parser.add_argument("--delay", type=float, default=1.0, help="Pausa entre pedidos")
    parser.add_argument(
        "--no-browser", action="store_true", help="Não imprimir páginas HTML"
    )
    args = parser.parse_args()

    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    items = dict(previous.get("items", {}))
    failures = {}
    today = date.today().isoformat()
    selected = records(set(args.only) if args.only else None)
    if args.limit:
        selected = selected[: args.limit]

    playwright = browser = None
    if not args.no_browser:
        try:
            from playwright.sync_api import sync_playwright

            playwright = sync_playwright().start()
            browser = playwright.chromium.launch()
        except Exception as error:  # The PDF documents can still be copied.
            print(f"Navegador indisponível; HTML será ignorado: {error}")

    try:
        for record in selected:
            act_id, url = record["id"], record.get("officialUrl")
            if not url or not official_host(url):
                failures[act_id] = "Sem endereço oficial em domínio gov.br."
                continue
            if private_standard(record):
                failures[act_id] = "Norma técnica privada; não é copiada."
                continue
            try:
                data, content_type, final_url = download(url)
                origin = "pdf"
                if data[:5] == b"%PDF-":
                    pages = pdf_text(data)
                elif browser and "html" in content_type.lower():
                    data, pages = print_html(url, browser)
                    origin = "html_printed"
                else:
                    kind = content_type or "tipo desconhecido"
                    raise ValueError(f"conteúdo não é PDF ({kind})")
            except (HTTPError, URLError, TimeoutError, ValueError, OSError) as error:
                failures[act_id] = f"{type(error).__name__}: {error}"[:300]
                print(f"FALHA {act_id}: {failures[act_id]}")
                time.sleep(args.delay)
                continue
            except Exception as error:  # Browser/PDF parsing errors stay per document.
                failures[act_id] = f"{type(error).__name__}: {error}"[:300]
                print(f"FALHA {act_id}: {failures[act_id]}")
                continue

            agency = safe_name(record.get("agency") or "outros")
            pdf_path = OUTPUT / agency / f"{safe_name(act_id)}.pdf"
            text_path = OUTPUT / "text" / f"{safe_name(act_id)}.json"
            digest = hashlib.sha256(data).hexdigest()
            old = items.get(act_id, {})
            # HTML printed twice is rarely byte-identical; keep the old copy when the
            # extracted text is unchanged, so a monthly run does not churn the repo.
            text_digest = hashlib.sha256(
                json.dumps(pages, ensure_ascii=False).encode()
            ).hexdigest()
            kept = (ROOT / old.get("file", "-")).exists()
            same_text = old.get("textSha256") == text_digest
            if origin == "html_printed" and same_text and kept:
                print(f"igual   {act_id}")
                time.sleep(args.delay)
                continue
            write_if_changed(pdf_path, data)
            text_json = json.dumps(
                {"actId": act_id, "title": record.get("title"), "pages": pages},
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode()
            write_if_changed(text_path, text_json)
            changed = old.get("sha256") != digest
            items[act_id] = {
                "agency": record.get("agency"),
                "bytes": len(data),
                "file": pdf_path.relative_to(ROOT).as_posix(),
                "origin": origin,
                "pages": len(pages),
                "retrievedAt": today if changed else old.get("retrievedAt", today),
                "sha256": digest,
                "sourceUrl": url,
                "finalUrl": final_url,
                "text": text_path.relative_to(ROOT).as_posix(),
                "textChars": sum(len(p) for p in pages),
                "textSha256": text_digest,
                "title": record.get("title"),
            }
            print(("novo   " if changed else "igual  ") + act_id)
            time.sleep(args.delay)
    finally:
        if browser:
            browser.close()
        if playwright:
            playwright.stop()

    manifest = {
        "schemaVersion": 1,
        "purpose": (
            "Cópias de consulta dos documentos oficiais. Não alteram situação "
            "jurídica, profundidade de revisão ou aplicabilidade."
        ),
        "items": dict(sorted(items.items())),
        "failures": dict(sorted(failures.items())),
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    )
    print(f"Cópias: {len(items)} · falhas nesta execução: {len(failures)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
