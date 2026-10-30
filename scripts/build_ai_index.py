#!/usr/bin/env python3
"""Build the compact passage index the "Perguntar" assistant searches in the browser.

The index is derived from the generated knowledge base and, when present, from
the official PDF copies. It changes no legal state: every passage keeps its
evidence type, so a catalog summary is never presented as the text of an act.
"""

import argparse
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "data/ai/passages.json"
MAX_TEXT = 1600

KIND_LABELS = {
    "catalog_reference": "Resumo da ficha",
    "public_text_excerpt": "Trecho do ato",
    "official_guidance": "Orientação oficial",
    "source_reference": "Fonte revisada",
    "editorial_candidate": "Candidato não publicado",
}


# Post-homologation acts: production conformity (ACP), in-use monitoring (IUMPR)
# and corporate fleet emissions. Grouping for navigation only, not legal scope.
POST_HOMOLOGATION = {
    "ibama-in-5-2024",
    "ibama-in-16-2025",
    "ibama-in-20-2025",
    "ibama-in-23-2022",
    "ibama-in-28-2023",
}


def stage(agency, act_id):
    agency = (agency or "").lower()
    if act_id in POST_HOMOLOGATION:
        return "pos"
    if "contran" in agency or "senatran" in agency:
        return "seguranca"
    if "inmetro" in agency or "anatel" in agency:
        return "inmetro"
    return "ambiental"


def clean(text):
    text = text or ""
    # Recorded relations are JSON objects in the card text; keep only their label.
    text = re.sub(r'\{[^{}]*"label": "([^"]*)"[^{}]*\}', r"\1", text)
    text = re.sub(r"\{[^{}]*\}", " ", text)
    text = text.replace("(as_recorded, sem nova consolidação)", "")
    text = re.sub(r"\.{5,}", " … ", text)
    text = re.sub(r"[#*`>|]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def build():
    records = {r["id"]: r for r in read_jsonl(ROOT / "knowledge/records.jsonl")}
    manifest_path = ROOT / "pdfs/manifest.json"
    copies = {}
    if manifest_path.exists():
        copies = json.loads(manifest_path.read_text())["items"]
    passages = []
    for chunk in read_jsonl(ROOT / "knowledge/chunks.jsonl"):
        citation = chunk.get("citation") or {}
        act_id = chunk.get("actId")
        agency = chunk.get("agency") or ""
        text = clean(chunk.get("text"))
        if not text:
            continue
        passages.append(
            {
                "id": chunk["id"],
                "actId": act_id,
                "agency": agency,
                "device": citation.get("device"),
                "kind": chunk.get("kind"),
                "kindLabel": KIND_LABELS.get(chunk.get("kind"), "Registro"),
                "stage": stage(agency, act_id),
                "text": text[:MAX_TEXT],
                "title": citation.get("title") or chunk.get("title"),
                "url": citation.get("sourceUrl"),
            }
        )
    acts = []
    for act_id, record in sorted(records.items()):
        copy = copies.get(act_id) or {}
        acts.append(
            {
                "id": act_id,
                "agency": record.get("agency"),
                "pdf": copy.get("file"),
                "pdfOrigin": copy.get("origin"),
                "pdfRetrievedAt": copy.get("retrievedAt"),
                "pdfText": copy.get("text"),
                "stage": stage(record.get("agency"), act_id),
                "title": record.get("title"),
                "url": record.get("officialUrl"),
            }
        )
    return {
        "schemaVersion": 1,
        "purpose": (
            "Índice de busca do assistente. Resumos de ficha não são o texto do ato; "
            "aplicabilidade e vigência exigem conferência nas fontes oficiais."
        ),
        "acts": acts,
        "passages": sorted(passages, key=lambda p: p["id"]),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    output = json.dumps(build(), ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.check:
        if not TARGET.exists() or TARGET.read_text() != output:
            raise SystemExit("data/ai/passages.json is stale; run build_ai_index.py")
        return
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(output)
    print(f"Assistant index: {TARGET.relative_to(ROOT)} ({len(output) // 1024} KiB)")


if __name__ == "__main__":
    main()
