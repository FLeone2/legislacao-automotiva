#!/usr/bin/env python3
"""Export verified public-source snapshots as Markdown and citation-sized chunks.

Offline and deterministic: this command never fetches a URL or runs pdftotext.
Legal/review/application states remain exact copies of canonical law cards.
"""

import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "knowledge/prototype"
INDEX = ROOT / "data/prototype/document-chunks.json"
INPUT = ROOT / "data/prototype/texts-manifest.json"
STATE_FIELDS = ("legalStatus", "reviewStatus", "applicability", "publication")
CHUNK_LENGTH = 1400
CHUNK_OVERLAP = 160


def encoded(value):
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode()


def pretty(value):
    return (
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    ).encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def local_file(value, prefix):
    path = (ROOT / value).resolve()
    if not path.is_relative_to((ROOT / prefix).resolve()) or not path.is_file():
        raise ValueError("Unregistered or unavailable source input: " + str(value))
    return path


def slices(text):
    position = 0
    while position < len(text):
        end = min(position + CHUNK_LENGTH, len(text))
        if end < len(text):
            newline = text.rfind("\n", position + CHUNK_LENGTH // 2, end)
            if newline > position:
                end = newline
        value = text[position:end].strip()
        if value:
            yield position, end, value
        if end >= len(text):
            break
        position = max(position + 1, end - CHUNK_OVERLAP)


def frontmatter(values):
    return (
        "---\n"
        + "\n".join(
            f"{key}: {json.dumps(value, ensure_ascii=False, sort_keys=True)}"
            for key, value in values.items()
        )
        + "\n---\n"
    )


def build():
    source_manifest = json.loads(INPUT.read_text())
    cards = {
        row["id"]: row
        for row in map(
            json.loads, (ROOT / "knowledge/records.jsonl").read_text().splitlines()
        )
    }
    knowledge = json.loads((ROOT / "knowledge/manifest.json").read_text())
    files, documents, chunks = {}, [], []
    unavailable = []
    for source in source_manifest["documents"]:
        if source["status"] != "verified_source":
            unavailable.append(
                {
                    key: source.get(key)
                    for key in [
                        "documentId",
                        "actId",
                        "sourceId",
                        "title",
                        "url",
                        "status",
                        "error",
                    ]
                }
            )
            continue
        document_id, act_id = source["documentId"], source.get("actId")
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", document_id):
            raise ValueError("Unsafe document ID")
        card = cards.get(act_id) if act_id else None
        if act_id and (
            not card or (card.get("publication") or {}).get("included") is False
        ):
            raise ValueError(
                "Source act is not in the active canonical collection: " + act_id
            )
        text_path = local_file(source["textPath"], "data/prototype/document-texts")
        if digest(text_path.read_bytes()) != source["extractionSha256"]:
            raise ValueError("Source extraction hash changed: " + document_id)
        extraction = json.loads(text_path.read_text())
        if (
            extraction["documentId"] != document_id
            or extraction["documentSha256"] != source["documentSha256"]
        ):
            raise ValueError("Source extraction ownership changed")
        if source.get("pdfPath"):
            raw_path = local_file(source["pdfPath"], "pdfs/prototype")
            raw = raw_path.read_bytes()
            if not raw.startswith(b"%PDF-") or digest(raw) != source["documentSha256"]:
                raise ValueError("Verified PDF source bytes changed: " + document_id)
        if source.get("rawSourcePath"):
            receipt = local_file(
                source["rawSourcePath"], "data/prototype/document-receipts"
            )
            if (
                digest(gzip.decompress(receipt.read_bytes()))
                != source["documentSha256"]
            ):
                raise ValueError("Official HTML receipt hash changed: " + document_id)
        historical = bool(source.get("historicalGuidance"))
        indexable = bool(source.get("primary", True) and not historical)
        kind = (
            "historical_official_guidance_machine_extraction"
            if historical
            else (
                "public_html_machine_extraction"
                if source["format"] == "html"
                else "public_pdf_machine_extraction"
            )
        )
        document = {
            key: source.get(key)
            for key in [
                "documentId",
                "actId",
                "sourceId",
                "title",
                "format",
                "variant",
                "primary",
                "historicalGuidance",
                "url",
                "finalUrl",
                "documentSha256",
                "extractionSha256",
                "retrievedAt",
                "pageCount",
                "extractionQuality",
                "extractionReview",
                "sourceIncludesChangeAnnotations",
                "titleEvidence",
                "byteLength",
            ]
        }
        document.update(
            {
                "kind": kind,
                "indexable": indexable,
                "markdownPath": f"/knowledge/prototype/{document_id}.md",
                "pdfUrl": "/" + source["pdfPath"] if source.get("pdfPath") else None,
                "reviewDate": card.get("reviewDate") if card else None,
                "canonicalRevision": card.get("revision") if card else None,
                "notConsolidated": True,
                "automaticApplicability": False,
                "extractionIsNotLegalReview": True,
                "textExtractionScope": "searchable_text_only_no_ocr",
                "limitations": [
                    "Extração automática de uma fonte pública. Não é leitura jurídica integral, consolidação de alterações ou decisão de aplicabilidade.",
                    "Tabelas e disposição gráfica devem ser conferidas no documento de origem; nenhum método de norma técnica privada é reconstruído.",
                    "A extração não executa OCR nem reconstrói imagens, fórmulas ou diagramas; esses elementos exigem consulta ao original.",
                ]
                + (
                    [
                        "Manual de 2011: orientação histórica, excluída da recuperação automática de obrigações atuais e dos campos do Infoserv 2."
                    ]
                    if historical
                    else []
                )
                + (
                    [
                        "Variante original conservada para comparação documental; a variante primária é usada no índice automático."
                    ]
                    if not source.get("primary", True)
                    else []
                ),
                **{field: card.get(field) if card else None for field in STATE_FIELDS},
            }
        )
        if card and card.get("limitations"):
            document["canonicalLimitations"] = card["limitations"]
        md = [
            frontmatter(document),
            f"# {source['title']}\n",
            f"[Fonte oficial]({source['url']})",
        ]
        if document["pdfUrl"]:
            md.append(f" · [PDF arquivado]({document['pdfUrl']})")
        md.extend(["\n", "\n".join(document["limitations"]), "\n"])
        for page_record in extraction["pages"]:
            page, text = page_record["page"], page_record["text"]
            anchor = f"pagina-pdf-{page}" if page else "texto-oficial"
            md.extend(
                [
                    f'<a id="{anchor}"></a>',
                    f"## Página PDF {page}\n" if page else "## Texto público do ato\n",
                ]
            )
            if source["format"] == "pdf":
                md.extend(["```text", text, "```\n"])
            else:
                md.append(text + "\n")
            if not indexable:
                continue
            for number, (start, end, text_slice) in enumerate(slices(text), 1):
                chunks.append(
                    {
                        "id": f"{document_id}:p{page or 0:04d}:c{number:04d}",
                        "actId": act_id,
                        "sourceId": source["sourceId"],
                        "documentId": document_id,
                        "title": source["title"],
                        "text": text_slice,
                        "page": page,
                        "kind": kind,
                        "url": source.get("finalUrl") or source["url"],
                        "pdfUrl": (document["pdfUrl"] + f"#page={page}")
                        if document["pdfUrl"] and page
                        else document["pdfUrl"],
                        "markdownPath": document["markdownPath"] + "#" + anchor,
                        "documentSha256": source["documentSha256"],
                        "characterStart": start,
                        "characterEnd": end,
                        "device": f"Página PDF {page}"
                        if page
                        else f"Trecho HTML, caracteres {start}–{end}",
                        "unreviewedExtraction": True,
                        "notConsolidated": True,
                    }
                )
        document["chunkCount"] = sum(row["documentId"] == document_id for row in chunks)
        files[f"{document_id}.md"] = ("\n".join(md).rstrip() + "\n").encode()
        documents.append(document)
    files["README.md"] = (
        "# Textos públicos para consulta\n\n"
        f"{len(documents)} documentos recuperados, {len({row['actId'] for row in documents if row['actId']})} atos canônicos e {len(chunks)} trechos automáticos. O índice não representa toda a legislação nem certifica a revisão integral dos documentos.\n\n"
        "As fichas jurídicas canônicas continuam em `knowledge/acts`. Este diretório é uma coleção separada de fontes textuais: conserva publicação, indicação jurídica, revisão e aplicabilidade da ficha original, sem promovê-las. Não reproduz normas ABNT privadas.\n\n"
        "Cada Markdown identifica a URL oficial, hash, data de obtenção e páginas do PDF. Os textos HTML do Ibama conservam anotações de alterações; não se presume uma consolidação jurídica. Tabelas complexas mantêm a estrutura HTML em bloco de código.\n\n"
        "O Manual Proconve/Promot de 2011 fica marcado como orientação histórica e fora do índice automático de obrigações atuais. A Portaria SENATRAN 990 original é preservada para comparação; a republicação primária é indexada.\n\n"
        "| Documento | Formato | Consulta |\n| --- | --- | --- |\n"
        + "\n".join(
            f"| {row['title']} | {row['format']} | [{row['documentId']}]({row['documentId']}.md) |"
            for row in documents
        )
        + "\n"
    ).encode()
    artifacts = {name: digest(content) for name, content in sorted(files.items())}
    payload = {
        "schemaVersion": 1,
        "scope": "Verified public documents; machine extraction does not promote legal review",
        "knowledgeRevision": knowledge["revision"],
        "sourceManifestSha256": digest(INPUT.read_bytes()),
        "documents": documents,
        "chunks": chunks,
        "unavailable": unavailable,
        "counts": {
            "documents": len(documents),
            "acts": len({row["actId"] for row in documents if row["actId"]}),
            "pdfs": sum(bool(row["pdfUrl"]) for row in documents),
            "htmlTexts": sum(row["format"] == "html" for row in documents),
            "chunks": len(chunks),
            "historicalDocumentsExcludedFromAutomaticIndex": sum(
                bool(row["historicalGuidance"]) for row in documents
            ),
        },
    }
    revision = digest(encoded({"payload": payload, "artifacts": artifacts}))
    payload["revision"] = revision
    manifest = {
        "schemaVersion": 1,
        "revision": revision,
        "knowledgeRevision": knowledge["revision"],
        "sourceManifestSha256": digest(INPUT.read_bytes()),
        "counts": payload["counts"],
        "artifacts": artifacts,
        "legalReviewPromoted": False,
        "privateStandardsCopied": False,
    }
    files["manifest.json"] = pretty(manifest)
    return files, encoded(payload), manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate the committed export without writes",
    )
    args = parser.parse_args()
    files, index, manifest = build()
    if args.check:
        if (
            not INDEX.is_file()
            or INDEX.read_bytes() != index
            or any(
                not (OUTPUT / name).is_file() or (OUTPUT / name).read_bytes() != content
                for name, content in files.items()
            )
        ):
            raise SystemExit(
                "Public-source bank is stale; run scripts/prototype_knowledge_build.py"
            )
    else:
        OUTPUT.mkdir(parents=True, exist_ok=True)
        previous = (
            json.loads((OUTPUT / "manifest.json").read_text()).get("artifacts", {})
            if (OUTPUT / "manifest.json").is_file()
            else {}
        )
        for name in set(previous) - files.keys():
            candidate = (OUTPUT / name).resolve()
            if not candidate.is_relative_to(OUTPUT.resolve()):
                raise ValueError("Unsafe old export path")
            candidate.unlink(missing_ok=True)
        for name, content in files.items():
            (OUTPUT / name).write_bytes(content)
        INDEX.write_bytes(index)
    print(f"Public-source bank: {manifest['counts']}; revision {manifest['revision']}")


if __name__ == "__main__":
    main()
