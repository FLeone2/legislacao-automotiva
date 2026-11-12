#!/usr/bin/env python3
"""Import official documents preserved by an earlier research package into pdfs/.

The package records, for each file, the official address, the download address,
the consultation date and the SHA-256. A file is imported only when its bytes
match that hash. A copy fetched by the robot is never replaced. The import is a
consultation copy: it does not change legal state, review depth, applicability
or publication of any act.

    python scripts/import_document_copies.py --package DIR --label TEXT
"""

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "fetch_official_pdfs", ROOT / "scripts/fetch_official_pdfs.py"
)
fetch = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(fetch)

# Package IDs whose act is named differently in the published collection.
EXPLICIT = {
    "portaria-senatran-990-2022-republicacao": "senatran-095",
    "portaria-senatran-1554-2022": "senatran-096",
    "deliberacao-264-2022": "senatran-097",
}
# Acts published across several DOU pages, saved by the package one page per file.
DOU_PAGES = {
    "decreto-12435-2025-dou-p": "mover-002",
    "mdic-215-2025-dou-p": "mover-006",
    "inmetro-314-2025-dou-p": "inmetro-314-2025",
}
ACT = re.compile(r"^(contran|inmetro)-(\d+)-(\d{4})(?:-http)?$")
COMPLEMENT = re.compile(r"^(contran-\d+-\d{4})-complemento-(\d+)$")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load_package(package):
    manifest = next(package.rglob("manifesto-fontes.json"))
    folder = manifest.parent
    documents = json.loads(manifest.read_text())["documentos"]
    usable = []
    for doc in documents:
        if doc.get("state") != "downloaded" or doc.get("format", "pdf") != "pdf":
            continue
        path = folder / doc["arquivo_pacote"]
        if not path.exists():
            print(f"ausente  {doc['id']}")
            continue
        data = path.read_bytes()
        if sha(data) != doc.get("sha256"):
            print(f"hash diferente, ignorado: {doc['id']}")
            continue
        usable.append((doc, data))
    return usable


def merge_pages(parts):
    from io import BytesIO
    from pypdf import PdfReader, PdfWriter

    writer = PdfWriter()
    for data in parts:
        for page in PdfReader(BytesIO(data)).pages:
            writer.add_page(page)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package", type=Path, required=True)
    parser.add_argument(
        "--label", required=True, help="Origem, ex.: pacote de 02/11/2026"
    )
    args = parser.parse_args()

    manifest = json.loads(fetch.MANIFEST.read_text())
    items = manifest["items"]
    failures = manifest["failures"]
    annexes = manifest.get("annexes", {})
    annex_failures = manifest.get("annexFailures", {})
    records = fetch.records()
    known = {record["id"] for record in records}

    def store(act_id, data, name, agency):
        pdf_path = fetch.OUTPUT / agency / f"{fetch.safe_name(name)}.pdf"
        text_path = fetch.OUTPUT / "text" / f"{fetch.safe_name(name)}.json"
        pages = fetch.pdf_text(data)
        fetch.write_if_changed(pdf_path, data)
        fetch.write_if_changed(
            text_path,
            json.dumps(
                {"actId": act_id, "pages": pages},
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode(),
        )
        return {
            "bytes": len(data),
            "file": pdf_path.relative_to(ROOT).as_posix(),
            "origin": "research_package",
            "pages": len(pages),
            "sha256": sha(data),
            "text": text_path.relative_to(ROOT).as_posix(),
            "textChars": sum(len(p) for p in pages),
            "via": args.label,
        }

    def add_act(act_id, data, doc, note=None):
        if act_id not in known or act_id in items:
            return False
        entry = store(act_id, data, act_id, act_id.split("-")[0])
        entry.update(
            {
                "agency": act_id.split("-")[0],
                "finalUrl": doc.get("download_url") or doc.get("official_url"),
                "retrievedAt": doc.get("consulted_at"),
                "sourceUrl": doc.get("official_url"),
                "title": next(
                    (r.get("title") for r in records if r["id"] == act_id), None
                ),
            }
        )
        if note:
            entry["note"] = note
        items[act_id] = entry
        failures.pop(act_id, None)
        print(f"ato    {act_id} ← {doc['id']}")
        return True

    usable = load_package(args.package)
    pages_by_act = {}
    for doc, data in usable:
        doc_id = doc["id"]
        dou = next((prefix for prefix in DOU_PAGES if doc_id.startswith(prefix)), None)
        if dou:
            page = int(re.search(r"(\d+)$", doc_id)[1])
            pages_by_act.setdefault(DOU_PAGES[dou], []).append((page, data, doc))
            continue
        complement = COMPLEMENT.match(doc_id)
        if complement:
            act_id = complement[1]
            url = doc.get("official_url", "")
            existing = annexes.get(act_id, [])
            if act_id not in known or any(e.get("sourceUrl") == url for e in existing):
                continue
            entry = store(
                act_id, data, f"{act_id}--complemento-{complement[2]}", "contran"
            )
            entry.update(
                {
                    "finalUrl": doc.get("download_url") or url,
                    "kind": "anexo"
                    if re.search(r"anexo", url, re.I)
                    else "complementar",
                    "retrievedAt": doc.get("consulted_at"),
                    "sourceUrl": url,
                }
            )
            annexes[act_id] = existing + [entry]
            for key in [k for k, v in annex_failures.items() if v.get("url") == url]:
                del annex_failures[key]
            print(f"anexo  {act_id} ← {doc_id}")
            continue
        act = ACT.match(doc_id)
        act_id = EXPLICIT.get(doc_id) or (
            f"{act[1]}-{act[2]}-{act[3]}" if act else None
        )
        if act_id:
            add_act(act_id, data, doc)

    for act_id, parts in sorted(pages_by_act.items()):
        parts.sort(key=lambda part: part[0])
        numbers = ", ".join(str(part[0]) for part in parts)
        add_act(
            act_id,
            merge_pages([part[1] for part in parts]),
            parts[0][2],
            note=f"Páginas {numbers} do DOU reunidas; podem conter outros atos.",
        )

    fetch.save(items, failures, annexes, annex_failures, records)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
