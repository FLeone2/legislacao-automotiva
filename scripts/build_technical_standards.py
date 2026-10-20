#!/usr/bin/env python3
"""Publish only documentary citations attached to already published acts.

The imported survey is a review input, never a source of active obligations.
Unresolved IDs stay in an unpublished queue. Legal wording and editions stay
literal; the search identity is a separate, typographic field.
"""

import csv
import json
import gzip
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/technical-standards"


def compile_index(survey, published):
    citations, pending, seen = [], [], set()
    for record in survey["records"]:
        identity = record["id_vinculo"]
        if not identity or identity in seen:
            raise ValueError("Duplicate or missing citation ID: " + identity)
        seen.add(identity)
        if record.get("publicacao_automatica") is not False:
            raise ValueError("Survey cannot automatically authorize publication")
        act_id = record.get("id_ato_site")
        if not act_id or act_id not in published:
            pending.append(record)
            continue
        citations.append(
            {
                "id": identity,
                "actId": act_id,
                "designation": record["designacao_base_busca"],
                "literal": record["norma_citada"],
                "edition": record["edicao_citada"],
                "clause": record["dispositivo"],
                "nature": record["natureza_vinculo"],
                "scope": record["aplicabilidade"],
                "sourceUrl": record["fonte_url"],
                "sourceClass": record["classe_fonte"],
                "sourceVerification": record["verificacao"],
                "sourceLegalState": record["situacao_legal"],
                "notes": record["observacoes"],
                "aliases": record["aliases_busca"],
                "reviewState": "pending",
                "applicability": "requires_assessment",
            }
        )
    return (
        {
            "schemaVersion": 1,
            "asOf": survey["asOf"],
            "notice": "Citações do levantamento documental; conferência de cadeia, edição e aplicação pendente. Não são obrigações universais.",
            "records": citations,
        },
        pending,
    )


def main():
    site = json.loads((ROOT / "data/site/index.json").read_text())
    published = {
        r["id"]
        for agency in site["regulations"].values()
        for r in agency["records"]
        if r["publication"]["included"] is True
    }
    published.update(
        r["id"]
        for r in site["base"]["records"]
        if r.get("publication", {}).get("included") is not False
    )
    survey = json.loads(gzip.decompress((SOURCE / "review-input.json.gz").read_bytes()))
    index, pending = compile_index(survey, published)
    (ROOT / "data/site/technical-standards.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n"
    )
    # Explicitly outside the static build allowlist.
    with (SOURCE / "integration-pending.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as stream:
        writer = csv.writer(stream, delimiter=";")
        writer.writerow(["id_vinculo", "ato", "norma", "motivo", "fonte"])
        for record in pending:
            writer.writerow(
                [
                    record["id_vinculo"],
                    record["ato"],
                    record["norma_citada"],
                    "Ato sem correspondência confirmada na coleção publicada",
                    record["fonte_url"],
                ]
            )
    print(f"Technical citations: {len(index['records'])}; pending IDs: {len(pending)}")


if __name__ == "__main__":
    main()
