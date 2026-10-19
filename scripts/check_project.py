#!/usr/bin/env python3
"""Check syntax, publication states, canonical joins and initial payload budget."""

import json
import gzip
import subprocess
from pathlib import Path
import jsonschema

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


def check():
    schema = read("schemas/regulation.schema.json")
    index = read("data/site/index.json")
    assert (ROOT / "data/site/index.json").stat().st_size <= 450_000, (
        "Initial JSON budget exceeded"
    )
    canonical = read("data/requirements/catalog.json")["records"]
    ids = [r["id"] for r in canonical]
    assert len(ids) == len(set(ids)), "Duplicate requirement IDs"
    assert len(ids) == index["requirementCount"]
    requirements = {r["id"]: r for r in canonical}
    expected_files = set()
    for agency, collection in index["regulations"].items():
        source = read(f"data/{agency}/active.json")
        originals = {r["id"]: r for r in source["records"]}
        snapshots_path = ROOT / f"data/{agency}/sources/evidence.json.gz"
        snapshots = {}
        if snapshots_path.exists():
            with gzip.open(snapshots_path, "rt") as snapshot_file:
                snapshots = json.load(snapshot_file)["sources"]
        assert len(originals) == len(collection["records"])
        for summary in collection["records"]:
            record = originals[summary["id"]]
            jsonschema.validate(record, schema)
            assert record["publication"]["included"] is True
            assert summary["publication"]["included"] is True
            path = f"data/site/records/{agency}/{record['id']}.json"
            expected_files.add(ROOT / path)
            detail = read(path)
            assert detail["id"] == record["id"]
            assert summary["reviewStatus"].get(
                "reviewedAt", collection["metadata"]["asOf"]
            ) == detail["reviewStatus"].get("reviewedAt"), (
                "Review date changed in summary"
            )
            assert summary["requirementIds"] == detail["requirementIds"]
            assert summary["relationships"] == [
                {k: rel[k] for k in ("kind", "label") if k in rel}
                for rel in record.get("relationships", [])
            ]
            for q in detail["requirements"]:
                assert q == requirements[q["id"]], "Canonical requirement diverged"
                assert q["actId"] == record["id"] and q["agency"] == agency
                assert q["provision"]["reference"] and q["evidenceSource"][
                    "url"
                ].startswith("https://")
                if q["evidenceSource"]["sourceKey"] in snapshots:
                    snapshot = snapshots[q["evidenceSource"]["sourceKey"]]
                    assert q["evidenceSource"]["url"] == snapshot["url"]
                    assert q["evidenceSource"]["documentSha256"] == snapshot["sha256"]
                assert q["context"]["relation"] == "act_context_only"
                assert q["verificationPlan"]["method"] is None
                assert q["verificationPlan"]["state"] == "not_structured"
            if agency == "inmetro":
                assert record["legalStatus"]["state"] == "official_current_reference"
                assert record["reviewStatus"]["fullTextReviewed"] is False
                assert record["currentIndication"] is False
                editorial = {q["id"]: q for q in record["requirements"]}
                for q in detail["requirements"]:
                    expected_kind = editorial[q["id"]].get(
                        "evidenceKind", "official_guidance"
                    )
                    assert q["provision"]["kind"] == expected_kind
                    if expected_kind == "public_text_excerpt":
                        assert (
                            q["evidenceSource"]["documentSha256"]
                            and q["evidenceSource"]["sourceKey"] in snapshots
                        )
                        assert q["verification"]["state"] == "directed_review"
            if record["status"] == "parcialmente_revogada":
                assert record["legalStatus"]["state"] == "partially_repealed"
    assert expected_files == set((ROOT / "data/site/records").rglob("*.json")), (
        "Stale/unpublished detail"
    )
    # A historical URL is a separate publication, never a way to load one of
    # the 55 intentionally excluded CONTRAN records into current searches.
    history = index.get("historicalReferences", [])
    historical_ids = {(entry["agency"], entry["id"]) for entry in history}
    assert len(historical_ids) == len(history), "Duplicate historical identity"
    expected_history = set()
    for agency, record_id in historical_ids:
        assert agency in {"contran", "mover"}
        path = f"data/site/history/{agency}/{record_id}.json"
        expected_history.add(ROOT / path)
        detail = read(path)
        assert detail["id"] == record_id
        assert detail["publication"]["included"] is False
        assert detail["legalStatus"]["state"] in {"repealed", "revoked"}
        assert not (ROOT / f"data/site/records/{agency}/{record_id}.json").exists()
    assert expected_history == set((ROOT / "data/site/history").rglob("*.json")), (
        "Unregistered historical publication"
    )
    for path in [*ROOT.glob("*.js"), *ROOT.glob("src/**/*.js")]:
        subprocess.run(["node", "--check", str(path)], check=True, capture_output=True)
    print(
        f"PASS: {len(expected_files)} acts, {len(ids)} canonical requirements, independent states, publication joins, JavaScript syntax and 450 kB initial budget"
    )


if __name__ == "__main__":
    check()
