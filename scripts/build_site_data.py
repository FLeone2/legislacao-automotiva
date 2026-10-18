#!/usr/bin/env python3
"""Compile a compact initial index, per-act details and canonical requirements.

Editorial inputs remain in reviewed-map.json/reviewed.json. Generated files must
not be edited. Context links mean an activity consults the act, not that every
provision of that act applies to every activity or vehicle.
"""

import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENCIES = ("contran", "proconve", "inmetro", "anatel")
SITE = ROOT / "data/site"


def read(path):
    return json.loads((ROOT / path).read_text())


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")


def main():
    # Remove stale generated records so excluded acts cannot remain published.
    shutil.rmtree(SITE / "records", ignore_errors=True)
    flow = json.loads(
        subprocess.check_output(
            [
                "node",
                "-e",
                "process.stdout.write(JSON.stringify(require('./flow-data.js').homologationFlowSpec))",
            ],
            cwd=ROOT,
            text=True,
        )
    )
    contexts = {}
    for stage in flow["stages"]:
        for activity in stage["activities"]:
            for act_id in activity.get("refs", []):
                contexts.setdefault(act_id, []).append(
                    {
                        "stageId": stage["id"],
                        "activityId": activity["id"],
                        "stageLabel": stage["label"],
                        "activityLabel": activity["label"],
                        "relation": "activity_consults_act",
                    }
                )
    requirements = {}
    regulations = {}
    keep = [
        "id",
        "title",
        "number",
        "year",
        "subject",
        "issuer",
        "active",
        "currentIndication",
        "status",
        "statusLabel",
        "officialUrl",
        "systems",
        "vehicleLinks",
        "generalCategories",
        "regulatoryDomain",
        "catalogRecordIds",
        "phases",
        "classificationBasis",
        "sourceStatus",
        "topics",
        "mechanism",
        "fullTextReviewed",
        "actNature",
        "legalStatus",
        "reviewStatus",
        "applicability",
        "publication",
        "incomingEffects",
    ]
    for agency in AGENCIES:
        data = read(f"data/{agency}/active.json")
        summaries = []
        for record in data["records"]:
            detail = dict(record)
            detail["requirements"] = []
            for requirement in record.get("requirements", []):
                q = dict(requirement)
                if not q.get("id"):
                    raise ValueError(
                        f"Requirement without editorial stable ID: {record['id']}"
                    )
                q["actId"] = record["id"]
                q["agency"] = agency
                q["provision"] = {
                    "kind": "official_guidance"
                    if record.get("fullTextReviewed") is False
                    else "public_text_excerpt",
                    "reference": q["clause"],
                    "sourceUrl": q.get("sourceUrl", record["officialUrl"]),
                }
                q["evidenceSource"] = {
                    "url": q.get("sourceUrl", record["officialUrl"]),
                    "sourceKey": q.get("sourceKey", record.get("sourceKey")),
                    "actDocumentSha256": record["documentCheck"].get("sha256"),
                }
                q["verification"] = {
                    "state": "directed_review"
                    if record.get("fullTextReviewed") is not False
                    else "official_guidance_only",
                    "applicability": "requires_assessment",
                }
                q["context"] = {
                    "vehicleLinks": record["vehicleLinks"],
                    "activities": contexts.get(record["id"], []),
                    "relation": "act_context_only",
                    "note": "O sistema/atividade consulta este ato; a aplicação deste requisito ainda exige avaliação específica.",
                }
                # No method is invented from the title or quoted technical norm.
                q["verificationPlan"] = {
                    "state": "not_structured",
                    "method": None,
                    "expectedEvidence": [],
                    "note": "Método, edição, limites e evidências específicas devem ser revisados antes de criar um checklist.",
                }
                if q["id"] in requirements:
                    raise ValueError("Duplicate canonical requirement: " + q["id"])
                requirements[q["id"]] = q
                detail["requirements"].append(q)
            detail["requirementIds"] = [q["id"] for q in detail["requirements"]]
            write(SITE / "records" / agency / (record["id"] + ".json"), detail)
            summary = {k: record[k] for k in keep if k in record}
            # Review gaps and quoted legal evidence are only needed when opening a record.
            summary.pop("sourceStatus", None)
            summary.pop("classificationBasis", None)
            summary["vehicleLinks"] = [
                {k: v for k, v in link.items() if k != "basis"}
                for link in record["vehicleLinks"]
            ]
            summary["reviewStatus"] = {
                k: record["reviewStatus"][k]
                for k in ["state", "fullTextReviewed", "amendmentChainReviewed"]
            }
            summary["legalStatus"] = {
                k: record["legalStatus"][k] for k in ["state", "asOf"]
            }
            summary["applicability"] = {
                k: record["applicability"][k] for k in ["state", "vehicleSpecific"]
            }
            summary["publication"] = {"included": record["publication"]["included"]}
            summary["incomingEffects"] = [
                {"sourceId": e["sourceId"], "kind": e["kind"]}
                for e in record.get("incomingEffects", [])
            ]
            summary["relationships"] = [
                {k: rel[k] for k in ["kind", "label"] if k in rel}
                for rel in record.get("relationships", [])
            ]
            summary["requirements"] = [
                {k: q[k] for k in ["id", "title", "rule", "clause", "topics", "actId"]}
                for q in detail["requirements"]
            ]
            summary["requirementIds"] = detail["requirementIds"]
            summary["_summary"] = True
            summaries.append(summary)
        regulations[agency] = {"metadata": data["metadata"], "records": summaries}
    base = read("catalog.json")
    all_original = {
        id
        for d in regulations.values()
        for r in d["records"]
        for id in r.get("catalogRecordIds", [])
    }
    # Preserve original IDs for bookmarks/tests. Retain only minimal placeholders
    # for regulated originals that will be adapted from the compact agency index.
    base["records"] = [
        {
            "id": r["id"],
            "title": r["title"],
            "agency": r["agency"],
            "stages": r.get("stages", []),
        }
        if r["id"] in all_original
        else r
        for r in base["records"]
    ]
    write(
        SITE / "index.json",
        {
            "schemaVersion": 2,
            "base": base,
            "regulations": regulations,
            "requirementCount": len(requirements),
        },
    )
    write(
        ROOT / "data/requirements/catalog.json",
        {
            "schemaVersion": 1,
            "records": sorted(requirements.values(), key=lambda q: q["id"]),
        },
    )
    print(
        f"Compiled {sum(len(d['records']) for d in regulations.values())} acts / {len(requirements)} canonical requirements; initial index {(SITE / 'index.json').stat().st_size:,} bytes"
    )


if __name__ == "__main__":
    main()
