#!/usr/bin/env python3
"""Compile a compact initial index, per-act details and canonical requirements.

Editorial inputs remain in reviewed-map.json/reviewed.json. Generated files must
not be edited. Context links mean an activity consults the act, not that every
provision of that act applies to every activity or vehicle.
"""

import json
import gzip
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
    shutil.rmtree(SITE / "history", ignore_errors=True)
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
                        **(
                            {
                                "requirementIds": activity["requirementRefs"].get(
                                    act_id, []
                                )
                            }
                            if "requirementRefs" in activity
                            else {}
                        ),
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
        "consultationTopics",
    ]
    for agency in AGENCIES:
        data = read(f"data/{agency}/active.json")
        summaries = []
        evidence_path = ROOT / f"data/{agency}/sources/evidence.json.gz"
        snapshots = {}
        if evidence_path.exists():
            with gzip.open(evidence_path, "rt") as evidence_file:
                snapshots = json.load(evidence_file)["sources"]
        snapshots_by_url = {
            snapshot["url"]: snapshot for snapshot in snapshots.values()
        }
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
                evidence_kind = (
                    q.get("evidenceKind")
                    or q.get("provision", {}).get("kind")
                    or (
                        "official_guidance"
                        if record.get("fullTextReviewed") is False
                        else "public_text_excerpt"
                    )
                )
                if evidence_kind not in {"official_guidance", "public_text_excerpt"}:
                    raise ValueError("Unknown requirement evidence kind: " + q["id"])
                q["provision"] = {
                    "kind": evidence_kind,
                    "reference": q["clause"],
                    "sourceUrl": q.get("sourceUrl", record["officialUrl"]),
                }
                evidence_url = q.get("sourceUrl", record["officialUrl"])
                source_key = q.get("sourceKey", record.get("sourceKey"))
                snapshot = snapshots.get(source_key, {})
                if snapshot.get("url") != evidence_url:
                    snapshot = snapshots_by_url.get(evidence_url, {})
                document = record["documentCheck"]
                document_hash = snapshot.get("sha256") or (
                    document.get("sha256")
                    if document.get("url") == evidence_url
                    else None
                )
                q["evidenceSource"] = {
                    "url": evidence_url,
                    "sourceKey": source_key,
                    "documentSha256": document_hash,
                    "documentKind": q.get("documentKind")
                    or (
                        "official_guidance_snapshot"
                        if evidence_kind == "official_guidance"
                        else "official_text_snapshot"
                    ),
                }
                q["verification"] = {
                    "state": "directed_review"
                    if evidence_kind == "public_text_excerpt"
                    else "official_guidance_only",
                    "applicability": "requires_assessment",
                }
                q["context"] = {
                    "vehicleLinks": record["vehicleLinks"],
                    "activities": [
                        link
                        for link in contexts.get(record["id"], [])
                        if link.get("requirementIds") is None
                        or q["id"] in link["requirementIds"]
                    ],
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
            # The collection date is only a compact default. Preserve each
            # different review date and restore the default in the store.
            reviewed_at = record["reviewStatus"].get("reviewedAt")
            if reviewed_at != data["metadata"].get("asOf"):
                summary["reviewStatus"]["reviewedAt"] = reviewed_at
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
                {
                    **{
                        k: q[k]
                        for k in ["id", "title", "rule", "clause", "topics", "actId"]
                    },
                    # Keep the source classification before the full record loads.
                    "provision": {"kind": q["provision"]["kind"]},
                }
                for q in detail["requirements"]
            ]
            summary["requirementIds"] = detail["requirementIds"]
            summary["_summary"] = True
            summaries.append(summary)
        regulations[agency] = {"metadata": data["metadata"], "records": summaries}
    history = []
    for agency in AGENCIES:
        history_path = ROOT / f"data/{agency}/historical.json"
        if not history_path.exists():
            continue
        historical = read(f"data/{agency}/historical.json")
        for record in historical.get("records", []):
            if record.get("publication", {}).get("included") is not False:
                raise ValueError("Historical record must be outside current collection")
            write(SITE / "history" / agency / (record["id"] + ".json"), record)
            history.append(
                {
                    "id": record["id"],
                    "agency": agency,
                    "title": record.get("title")
                    or f"Resolução CONTRAN nº {record['number']}/{record['year']}",
                    "statusLabel": record.get("statusLabel", "Registro histórico"),
                }
            )
    base = read("catalog.json")
    for record in base["records"]:
        if record.get("publication", {}).get("included") is False:
            history.append(
                {
                    "id": record["id"],
                    "agency": "mover",
                    "title": record["title"],
                    "statusLabel": record.get("status", "Registro histórico"),
                }
            )
            write(SITE / "history" / "mover" / (record["id"] + ".json"), record)
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
            "stages": r.get("stages", []),
        }
        if r["id"] in all_original
        else {
            "id": r["id"],
            "title": r["title"],
            "agency": r["agency"],
            "publication": {"included": False},
            "_historical": True,
        }
        if r.get("publication", {}).get("included") is False
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
            "historicalReferences": history,
        },
    )
    for stage in flow["stages"]:
        for activity in stage["activities"]:
            for act_id, ids in activity.get("requirementRefs", {}).items():
                if act_id not in activity.get("refs", []):
                    raise ValueError(
                        "Provision target outside activity acts: " + act_id
                    )
                for requirement_id in ids:
                    if requirements.get(requirement_id, {}).get("actId") != act_id:
                        raise ValueError(
                            "Invalid activity provision: " + requirement_id
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
