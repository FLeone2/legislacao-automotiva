#!/usr/bin/env python3
"""Acquire a bounded public-law corpus; retrieval never promotes legal review.

Network/PDF extraction is deliberately separate from the offline export builder.
No private ABNT/NBR text is downloaded. Existing canonical law states are inputs.
"""

import argparse
import gzip
from concurrent.futures import ThreadPoolExecutor
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/prototype/texts-manifest.json"
MAX_BYTES = 24 * 1024 * 1024
TODAY = date.today().isoformat()
HTML_ACTS = [
    "ibama-in-11-2014",
    "ibama-in-22-2020",
    "ibama-in-3-2023",
    "ibama-in-16-2025",
    "ibama-in-20-2020",
    "ibama-in-3-2021",
    "ibama-in-23-2020",
    "ibama-in-20-2021",
    "ibama-in-18-2023",
    "ibama-in-5-2024",
]
PDF_ACTS = [
    "ibama-in-26-2020",
    "ibama-in-6-2025",
    "contran-749-2018",
    "contran-882-2021",
    "contran-968-2022",
    "contran-970-2022",
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def official_url(url):
    value = urlparse(url)
    return (
        value.scheme == "https"
        and (value.hostname or "").endswith(".gov.br")
        and not value.username
        and not value.password
        and value.port in (None, 443)
    )


def clean_lines(text):
    return "\n".join(
        line.rstrip() for line in text.replace("\x00", "").splitlines()
    ).strip()


def fold(text):
    return " ".join(
        "".join(
            char
            for char in unicodedata.normalize("NFKD", text)
            if not unicodedata.combining(char)
        )
        .upper()
        .split()
    )


def title_evidence(spec, text):
    if spec.get("actId"):
        numbers = re.findall(r"\d+", spec["actId"])
        if spec["actId"] == "senatran-095":
            number, year, name = "990", "2022", "PORTARIA"
        else:
            number, year = numbers[-2:]
            name = (
                "INSTRUCAO NORMATIVA"
                if spec["actId"].startswith("ibama-in-")
                else "RESOLUCAO"
            )
        pattern = rf"{name}.{{0,35}}\b{int(number)}\b.{{0,100}}\b{year}\b"
    else:
        pattern = r"PROCONVE.{0,100}PROMOT|PROMOT.{0,100}PROCONVE"
    match = re.search(pattern, fold(text), re.IGNORECASE)
    if not match:
        raise ValueError(
            "Official document title/number/year did not match the requested identity"
        )
    return match.group(0)


def table_markdown(table):
    # Complex spans retain their source HTML structure rather than inventing
    # a numeric association during conversion to Markdown.
    if any(
        int(cell.get(attr, 1)) > 1
        for cell in table.find_all(["td", "th"])
        for attr in ["rowspan", "colspan"]
    ):
        for tag in table.find_all(True):
            tag.attrs = {
                key: value
                for key, value in tag.attrs.items()
                if key in ["rowspan", "colspan"]
            }
        table.attrs = {}
        return "\n\n```html\n" + str(table) + "\n```\n\n"
    rows = []
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"], recursive=False)
        if cells:
            rows.append(
                [
                    " ".join(cell.get_text(" ", strip=True).split()).replace("|", "\\|")
                    for cell in cells
                ]
            )
    if not rows:
        return "\n\n" + table.get_text(" ", strip=True) + "\n\n"
    width = max(map(len, rows))
    rows = [row + [""] * (width - len(row)) for row in rows]
    lines = [
        "| " + " | ".join(rows[0]) + " |",
        "| " + " | ".join(["---"] * width) + " |",
    ]
    lines.extend("| " + " | ".join(row) + " |" for row in rows[1:])
    return "\n\n" + "\n".join(lines) + "\n\n"


def extract_html(data):
    soup = BeautifulSoup(data, "html.parser")
    body = soup.select_one(".legislacao")
    if not body:
        raise ValueError("Expected official IBAMA legislation container is missing")
    for element in body(["script", "style", "nav", "button", "form"]):
        element.decompose()
    for table in body.find_all("table"):
        table.replace_with(table_markdown(table))
    return clean_lines(body.get_text("\n", strip=True))


def extract_pdf(data):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "document.pdf"
        path.write_bytes(data)
        completed = subprocess.run(
            ["pdftotext", "-layout", "-enc", "UTF-8", str(path), "-"],
            check=True,
            capture_output=True,
            timeout=60,
        )
    pages = completed.stdout.decode("utf-8").split("\f")
    if pages and not pages[-1].strip():
        pages.pop()
    pages = [clean_lines(page) for page in pages]
    if not pages or sum(len(page) for page in pages) < 150:
        raise ValueError(
            "PDF did not provide enough searchable text; OCR was not assumed"
        )
    return pages


def specs():
    cards = {
        card["id"]: card
        for card in map(
            json.loads, (ROOT / "knowledge/records.jsonl").read_text().splitlines()
        )
        if (card.get("publication") or {}).get("included") is not False
    }
    result = []
    for old in json.loads((ROOT / "data/prototype/pdf-review.json").read_text())[
        "records"
    ]:
        if old["status"] != "verified_pdf":
            continue
        result.append(
            {
                "documentId": Path(old["path"]).stem,
                "actId": old["actId"],
                "sourceId": old["actId"],
                "title": cards[old["actId"]]["title"],
                "format": "pdf",
                "url": old["url"],
                "existingPath": old["path"],
                "expectedSha256": old["sha256"],
                "variant": old["variant"],
                "primary": old.get("primary", True),
                "retrievedAt": old["checkedAt"],
            }
        )
    for act_id in HTML_ACTS + PDF_ACTS:
        card = cards[act_id]
        is_html = act_id in HTML_ACTS
        spec = {
            "documentId": act_id + ("-official-html" if is_html else "-official-pdf"),
            "actId": act_id,
            "sourceId": act_id,
            "title": card["title"],
            "format": "html" if is_html else "pdf",
            "url": card["officialUrl"],
            "variant": "official_html_snapshot" if is_html else "official_publication",
            "primary": True,
        }
        archived = {
            "ibama-in-26-2020": "data/proconve/sources/in26-certified.pdf",
            "ibama-in-6-2025": "data/proconve/sources/in6-certified.pdf",
        }
        if act_id in archived:
            spec["existingPath"] = archived[act_id]
        result.append(spec)
    result.append(
        {
            "documentId": "ibama-manual-proconve-promot-2011",
            "actId": None,
            "sourceId": "ibama-manual-proconve-promot-2011",
            "title": "Manual Proconve/Promot — orientação histórica do Ibama (2011)",
            "format": "pdf",
            "url": "https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/arquivos/manual%20proconve%20promot_portugues.pdf",
            "variant": "historical_official_guidance_2011",
            "primary": True,
            "historicalGuidance": True,
        }
    )
    return result


def acquire(spec, cached, refresh):
    document_id = spec["documentId"]
    old = cached.get(document_id)
    if old and not refresh and old.get("status") == "verified_source":
        text_path = ROOT / old["textPath"]
        pdf_path = ROOT / old["pdfPath"] if old.get("pdfPath") else None
        raw_receipt_valid = spec["format"] != "html" or (
            old.get("rawSourcePath") and (ROOT / old["rawSourcePath"]).is_file()
        )
        if (
            text_path.is_file()
            and digest(text_path.read_bytes()) == old["extractionSha256"]
            and raw_receipt_valid
            and (
                not pdf_path
                or (
                    pdf_path.is_file()
                    and digest(pdf_path.read_bytes()) == old["documentSha256"]
                )
            )
        ):
            return old
    try:
        if not official_url(spec["url"]):
            raise ValueError("Only public official HTTPS URLs are accepted")
        if spec.get("existingPath"):
            data = (ROOT / spec["existingPath"]).read_bytes()
            content_type = "application/pdf"
            final_url = spec["url"]
        else:
            with urlopen(
                Request(
                    spec["url"],
                    headers={
                        "User-Agent": "Mozilla/5.0",
                        "Accept": "application/pdf,text/html",
                    },
                ),
                timeout=30,
            ) as response:
                data = response.read(MAX_BYTES + 1)
                final_url = response.geturl()
                content_type = response.headers.get("Content-Type", "")
            if spec["format"] == "pdf" and not data.startswith(b"%PDF-"):
                display_url = spec["url"].rstrip("/") + "/@@display-file/file"
                with urlopen(
                    Request(
                        display_url,
                        headers={
                            "User-Agent": "Mozilla/5.0",
                            "Accept": "application/pdf",
                        },
                    ),
                    timeout=30,
                ) as response:
                    data = response.read(MAX_BYTES + 1)
                    final_url = response.geturl()
                    content_type = response.headers.get("Content-Type", "")
        if not official_url(final_url) or len(data) > MAX_BYTES:
            raise ValueError("Source is not a bounded official HTTPS response")
        if spec.get("expectedSha256") and digest(data) != spec["expectedSha256"]:
            raise ValueError("Existing official PDF differs from its verified receipt")
        if spec["format"] == "pdf":
            if not data.startswith(b"%PDF-"):
                raise ValueError(
                    "Official URL returned non-PDF bytes; no PDF was fabricated"
                )
            pages = extract_pdf(data)
            evidence = title_evidence(spec, "\n".join(pages[:2]))
            pdf_path = (
                spec.get("existingPath")
                if str(spec.get("existingPath", "")).startswith("pdfs/prototype/")
                else f"pdfs/prototype/{document_id}.pdf"
            )
            destination = ROOT / pdf_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
            page_count = len(pages)
        else:
            text = extract_html(data)
            evidence = title_evidence(spec, text[:2500])
            pages, pdf_path, page_count = [text], None, None
        receipt_path = None
        if spec["format"] == "html":
            receipt_path = f"data/prototype/document-receipts/{document_id}.html.gz"
            receipt = ROOT / receipt_path
            receipt.parent.mkdir(parents=True, exist_ok=True)
            receipt.write_bytes(gzip.compress(data, mtime=0))
        text_path = f"data/prototype/document-texts/{document_id}.json"
        extraction = {
            "schemaVersion": 1,
            "documentId": document_id,
            "documentSha256": digest(data),
            "format": spec["format"],
            "extractionMethod": "pdftotext-layout"
            if spec["format"] == "pdf"
            else "official-ibama-html-container",
            "pages": [
                {"page": index + 1 if spec["format"] == "pdf" else None, "text": page}
                for index, page in enumerate(pages)
            ],
        }
        write_json(ROOT / text_path, extraction)
        record = {
            key: value
            for key, value in spec.items()
            if key not in ["existingPath", "expectedSha256"]
        }
        record.update(
            {
                "status": "verified_source",
                "finalUrl": final_url,
                "contentType": content_type,
                "byteLength": len(data),
                "documentSha256": digest(data),
                "titleEvidence": evidence,
                "retrievedAt": spec.get("retrievedAt", TODAY),
                "pdfPath": pdf_path,
                "rawSourcePath": receipt_path,
                "textPath": text_path,
                "extractionSha256": digest((ROOT / text_path).read_bytes()),
                "pageCount": page_count,
                "extractionQuality": "searchable_text_not_manually_reviewed",
                "extractionReview": "machine_extracted_not_reviewed",
                "sourceIncludesChangeAnnotations": any(
                    re.search(
                        r"revogad[oa]|reda[çc][aã]o dada|alterad[oa]",
                        page,
                        re.IGNORECASE,
                    )
                    for page in pages
                ),
            }
        )
        return record
    except Exception as error:
        return {
            "documentId": document_id,
            "actId": spec.get("actId"),
            "sourceId": spec["sourceId"],
            "title": spec["title"],
            "url": spec["url"],
            "format": spec["format"],
            "status": "unavailable",
            "retrievedAt": TODAY,
            "error": f"{type(error).__name__}: {error}"[:280],
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Fetch sources again; preserve legal review states",
    )
    args = parser.parse_args()
    old = json.loads(MANIFEST.read_text()) if MANIFEST.is_file() else {"documents": []}
    cached = {row["documentId"]: row for row in old["documents"]}
    with ThreadPoolExecutor(max_workers=4) as executor:
        documents = list(
            executor.map(lambda spec: acquire(spec, cached, args.refresh), specs())
        )
    payload = {
        "schemaVersion": 1,
        "scope": "Bounded public-law and official-guidance source corpus, separate from canonical legal review",
        "legalReviewPromoted": False,
        "privateStandardsCopied": False,
        "documents": sorted(documents, key=lambda item: item["documentId"]),
    }
    write_json(MANIFEST, payload)
    for document in payload["documents"]:
        print(
            document["documentId"],
            document["status"],
            document.get("pageCount"),
            document.get("byteLength"),
            document.get("error", ""),
        )


if __name__ == "__main__":
    main()
