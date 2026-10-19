#!/usr/bin/env python3
"""Build reviewed Inmetro/Anatel requirements from traceable official snapshots."""

import gzip
import json
from map_contran import ROOT, write_json
from build_active_catalogs import CATEGORIES, write_csv
from regulatory_contract import apply_contract


def build(agency):
    directory = ROOT / "data" / agency
    review = json.loads((directory / "reviewed-map.json").read_text())
    with gzip.open(directory / "sources/evidence.json.gz", "rt") as f:
        sources = json.load(f)["sources"]
    records = []
    for seed in review["records"]:
        if not seed.get("active", True):
            continue
        source = sources[seed["sourceKey"]]
        record = {
            **seed,
            "active": True,
            "currentIndication": True,
            "status": "vigente_no_recorte_revisado",
            "statusLabel": seed.get("statusLabel", "Vigente no recorte revisado"),
            "officialUrl": seed.get("officialUrl", source["url"]),
            "documentCheck": {
                "state": "extraido",
                "sha256": source["sha256"],
                "url": source["url"],
                "bytes": source.get("bytes"),
            },
            "entryIntoForceEvidence": seed.get("entryIntoForceEvidence", []),
            # A deadline concerns the specified family/procedure, not the legal
            # validity of the whole act. Preserve reviewed conditions and source.
            "temporalFlags": seed.get("temporalFlags", []),
            "relationships": seed.get("relationships", []),
            "incomingEffects": seed.get("incomingEffects", []),
            "relatedLinks": seed.get("relatedLinks", []),
            "catalogRecordIds": seed.get("catalogRecordIds", []),
            "vehicleLinks": seed.get("vehicleLinks", []),
            "generalCategories": seed.get("generalCategories", []),
            "requirements": seed.get("requirements", []),
            "systems": sorted({x["systemId"] for x in seed.get("vehicleLinks", [])}),
            "regulatoryDomain": seed.get("regulatoryDomain", "conformity"),
            "classificationBasis": seed.get(
                "classificationBasis",
                "Vínculo baseado no produto, campo de aplicação e requisitos da fonte oficial. Não estabelece obrigação universal para o veículo ilustrado.",
            ),
            "notes": seed.get("notes", []),
            "actNature": seed.get("actNature", "normativa-ou-procedimental"),
            "phases": seed.get("phases", []),
        }
        assert record.get("statusEvidence"), record["id"]
        assert bool(record["vehicleLinks"]) != bool(record["generalCategories"]), (
            record["id"]
        )
        for requirement in record["requirements"]:
            for key in ["title", "rule", "clause", "scope", "evidence", "topics"]:
                assert requirement.get(key), (record["id"], key)
        records.append(record)
    indexed = {r["id"]: r for r in records}
    for r in records:
        for relation in r["relationships"]:
            target = indexed.get(relation.get("targetId"))
            if target and relation["kind"] == "altera":
                target["incomingEffects"].append(
                    {
                        "sourceId": r["id"],
                        "sourceTitle": r["title"],
                        "sourceUrl": r["officialUrl"],
                        "kind": "altera",
                        "evidence": relation.get("evidence", r["subject"]),
                    }
                )
    records = [apply_contract(r, agency, review["reviewDate"]) for r in records]
    records.sort(key=lambda r: (r["year"], r["number"]), reverse=True)
    metadata = {
        "asOf": review["reviewDate"],
        "publicationDate": review["reviewDate"],
        "recordCount": len(records),
        "activeCount": len(records),
        "sourceUrl": review["sourceUrl"],
        "scopeNote": review["scopeNote"],
        "systemLinkedCount": sum(bool(r["vehicleLinks"]) for r in records),
        "generalCategoryCount": sum(not r["vehicleLinks"] for r in records),
        "requirementCount": sum(len(r["requirements"]) for r in records),
        "categoryLabels": {k: v["label"] for k, v in CATEGORIES.items()},
        "publicationPolicy": review["publicationPolicy"],
        "limits": review["limits"],
        "sourceGaps": review.get("sourceGaps", []),
    }
    write_json(directory / "active.json", {"metadata": metadata, "records": records})
    write_csv(directory / "active.csv", records)
    print(
        agency,
        metadata["activeCount"],
        "acts,",
        metadata["requirementCount"],
        "requirement summaries",
    )


if __name__ == "__main__":
    for agency in ["inmetro", "anatel"]:
        build(agency)
