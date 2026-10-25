#!/usr/bin/env python3
"""Build a portable consultation index; never infer legal validity or applicability.

Inputs are already-published agency summaries and the guide's reviewed source
registries. Historical research catalogs are intentionally not an input. The
optional SQLite export uses the standard library and is never created by default.
"""

import argparse
import hashlib
import json
import re
import sqlite3
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/process/knowledge-index.json"
SOURCE_INPUTS = (
    "data/process/official-sources.json",
    "data/process/safety-sources.json",
)
SITE_INPUT = "data/site/index.json"
POLICY_INPUT = "data/contran/publication-policy.json"
DECISIONS_INPUT = "data/contran/publication-decisions.json"
MAX_BYTES = 300_000


def read(relative, root=ROOT):
    return json.loads((root / relative).read_text())


def official_url(value):
    """Accept only public HTTPS official-government destinations, no credentials."""
    if not isinstance(value, str):
        raise ValueError("Missing official HTTPS URL")
    url = urlsplit(value)
    host = (url.hostname or "").lower()
    if (
        url.scheme != "https"
        or not (host.endswith(".gov.br") or host == "gov.br")
        or url.username
        or url.password
        or url.port not in (None, 443)
    ):
        raise ValueError("Not an official HTTPS URL: " + value)
    return value


def url_identity(value):
    parsed = urlsplit(value)
    path = parsed.path.rstrip("/").removesuffix("/@@display-file/file")
    return urlunsplit(
        (
            parsed.scheme,
            parsed.netloc.lower(),
            path,
            urlencode(sorted(parse_qsl(parsed.query, keep_blank_values=True))),
            "",
        )
    )


def identity_targets(source, acts):
    """An official collection/service URL is not the identity of an act."""
    targets = {source["id"]} & {act["id"] for act in acts}
    if source["evidenceType"] not in {"official_index", "official_guidance"}:
        targets |= {
            act["id"]
            for act in acts
            if url_identity(act["officialUrl"]) == url_identity(source["url"])
        }
    return targets


def unique_by_id(rows, label):
    result = {}
    for row in rows:
        identity = row.get("id")
        if not identity or identity in result:
            raise ValueError(f"Missing or duplicate {label} ID: {identity}")
        result[identity] = row
    return result


def excluded_ids(root):
    policy = read(POLICY_INPUT, root)
    decisions = read(DECISIONS_INPUT, root)
    return (
        set(policy["inactiveHistoricalIds"])
        | set(policy.get("officialExclusions", {}))
        | {
            record["id"]
            for record in decisions["decisions"]
            if record["active"] is False
        }
    )


def load_sources(root):
    sources = []
    for path in SOURCE_INPUTS:
        document = read(path, root)
        for position, row in enumerate(document["records"]):
            official_url(row.get("url"))
            for field in (
                "agency",
                "title",
                "checkedAt",
                "evidenceType",
                "scope",
                "limitations",
            ):
                if not row.get(field):
                    raise ValueError(f"Source {row.get('id')} missing {field}")
            sources.append(
                {
                    **row,
                    "provenance": {"path": path, "pointer": f"/records/{position}"},
                }
            )
    unique_by_id(sources, "source")
    urls = [url_identity(row["url"]) for row in sources]
    if len(set(urls)) != len(urls):
        raise ValueError(
            "Duplicate source URLs; reconcile the source registries explicitly"
        )
    return sorted(sources, key=lambda row: row["id"])


def act_summary(record, agency, pointer, reviewed_at):
    official_url(record.get("officialUrl"))
    identity = record["id"]
    title = record.get("title") or (
        f"Resolução CONTRAN {record['number']}/{record['year']}"
        if agency == "contran"
        else identity
    )
    # Independent states are copied verbatim. Legacy records have null states;
    # their prose or publication in a list must not promote them to reviewed law.
    return {
        "id": identity,
        "agency": agency,
        "title": title,
        "officialUrl": record["officialUrl"],
        "statusLabel": record.get("statusLabel") or record.get("status"),
        "legalStatus": record.get("legalStatus"),
        "reviewStatus": record.get("reviewStatus"),
        "applicability": record.get("applicability"),
        "publication": record.get("publication"),
        "reviewDate": (
            record.get("reviewStatus", {}).get("reviewedAt")
            or record.get("reviewDate")
            or reviewed_at
        ),
        "phases": record.get("phases", []),
        "requirementIds": record.get("requirementIds", []),
        "provenance": {"path": SITE_INPUT, "pointer": pointer},
    }


def build_database(root=ROOT):
    index = read(SITE_INPUT, root)
    sources = load_sources(root)
    excluded = excluded_ids(root)
    historical = {record["id"] for record in index["historicalReferences"]}
    blocked = excluded | historical
    acts = []
    aliases = {}
    aliased_originals = set()
    for agency, collection in index["regulations"].items():
        for position, record in enumerate(collection["records"]):
            if record["id"] in blocked:
                raise ValueError("Excluded act in published input: " + record["id"])
            if record.get("publication", {}).get("included") is not True:
                raise ValueError(
                    "Unpublished record in active agency input: " + record["id"]
                )
            act = act_summary(
                record,
                agency,
                f"/regulations/{agency}/records/{position}",
                collection["metadata"].get("asOf"),
            )
            acts.append(act)
            for alias in [record["id"], *record.get("catalogRecordIds", [])]:
                if alias in aliases and aliases[alias] != record["id"]:
                    raise ValueError("Ambiguous act alias: " + alias)
                aliases[alias] = record["id"]
            aliased_originals.update(record.get("catalogRecordIds", []))
    # Reproduce the retained base portion of installActiveRegulations: official
    # collections replace regulated legacy entries; never restore their old rows.
    for position, record in enumerate(index["base"]["records"]):
        if (
            record["id"] in aliased_originals
            or record["id"] in blocked
            or record.get("publication", {}).get("included") is False
            or record.get("_historical")
        ):
            continue
        if (
            record.get("agency") in {"IBAMA", "INMETRO", "ANATEL"}
            and record["id"] != "ibama-042"
        ):
            continue
        if re.search(
            r"CONTRAN\s*(?:n[º°o]?\s*)?\d+[./]\d{2,4}", record.get("title", ""), re.I
        ):
            continue
        act = act_summary(
            record,
            record.get("agency", "unknown").lower(),
            f"/base/records/{position}",
            None,
        )
        acts.append(act)
        aliases[record["id"]] = record["id"]
    unique_by_id(acts, "act")
    source_links = []
    for source in sources:
        # Exact canonical ID and exact official URL are identity links only.
        # No title similarity or taxonomy association establishes legal coverage.
        targets = identity_targets(source, acts)
        for target in sorted(targets):
            if target in blocked:
                raise ValueError("Source link would reactivate an excluded act")
            source_links.append(
                {
                    "sourceId": source["id"],
                    "actId": target,
                    "relation": "same_canonical_id"
                    if target == source["id"]
                    else "same_official_url",
                }
            )
    provenance = []
    for relative in (*SOURCE_INPUTS, SITE_INPUT, POLICY_INPUT, DECISIONS_INPUT):
        provenance.append(
            {
                "path": relative,
                "sha256": hashlib.sha256((root / relative).read_bytes()).hexdigest(),
            }
        )
    database = {
        "schemaVersion": 1,
        "kind": "curated_consultation_reference_index",
        "scopeNote": "Índice de consulta e evidências. Não consolida toda a legislação nem decide aplicabilidade. Fontes do guia não ampliam o catálogo ativo.",
        "counts": {
            "sources": len(sources),
            "acts": len(acts),
            "aliases": len(aliases),
            "actSources": len(source_links),
        },
        "provenance": provenance,
        "tables": {
            "sources": sources,
            "acts": sorted(acts, key=lambda row: row["id"]),
            "aliases": [
                {"alias": alias, "actId": target}
                for alias, target in sorted(aliases.items())
            ],
            "actSources": source_links,
        },
    }
    validate_database(database, blocked)
    return database


def serialize(database):
    return (
        json.dumps(database, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        + "\n"
    ).encode()


def validate_database(database, blocked=frozenset()):
    tables = database["tables"]
    acts = unique_by_id(tables["acts"], "act")
    sources = unique_by_id(tables["sources"], "source")
    if set(acts) & set(blocked):
        raise ValueError("Excluded acts cannot appear in the knowledge index")
    for row in [*acts.values(), *sources.values()]:
        official_url(row.get("officialUrl") or row.get("url"))
    for row in tables["aliases"]:
        if row["actId"] not in acts:
            raise ValueError("Alias references a missing act")
    for row in tables["actSources"]:
        if row["sourceId"] not in sources or row["actId"] not in acts:
            raise ValueError("Source-to-act reference is broken")
        if row["actId"] not in identity_targets(
            sources[row["sourceId"]], list(acts.values())
        ):
            raise ValueError(
                "Source-to-act identity is not supported by a document reference"
            )
    if len(serialize(database)) > MAX_BYTES:
        raise ValueError(f"Knowledge index exceeds {MAX_BYTES} byte budget")


def write_sqlite(database, path):
    path = Path(path).resolve()
    if path.is_relative_to(ROOT / "dist"):
        raise ValueError("SQLite is a local export, never an artifact inside dist")
    if path.exists():
        raise ValueError("SQLite output already exists; choose a new explicit path")
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    try:
        connection.execute("PRAGMA foreign_keys=ON")
        connection.executescript(
            "CREATE TABLE sources(id TEXT PRIMARY KEY, agency TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL UNIQUE, record_json TEXT NOT NULL);"
            "CREATE TABLE acts(id TEXT PRIMARY KEY, agency TEXT NOT NULL, title TEXT NOT NULL, official_url TEXT NOT NULL, record_json TEXT NOT NULL);"
            "CREATE TABLE aliases(alias TEXT PRIMARY KEY, act_id TEXT NOT NULL REFERENCES acts(id));"
            "CREATE TABLE act_sources(source_id TEXT NOT NULL REFERENCES sources(id), act_id TEXT NOT NULL REFERENCES acts(id), relation TEXT NOT NULL, PRIMARY KEY(source_id,act_id));"
            "CREATE TABLE metadata(key TEXT PRIMARY KEY, value_json TEXT NOT NULL);"
        )
        tables = database["tables"]
        for row in tables["sources"]:
            connection.execute(
                "INSERT INTO sources VALUES(?,?,?,?,?)",
                (
                    row["id"],
                    row["agency"],
                    row["title"],
                    row["url"],
                    json.dumps(row, ensure_ascii=False, sort_keys=True),
                ),
            )
        for row in tables["acts"]:
            connection.execute(
                "INSERT INTO acts VALUES(?,?,?,?,?)",
                (
                    row["id"],
                    row["agency"],
                    row["title"],
                    row["officialUrl"],
                    json.dumps(row, ensure_ascii=False, sort_keys=True),
                ),
            )
        connection.executemany(
            "INSERT INTO aliases VALUES(?,?)",
            [(row["alias"], row["actId"]) for row in tables["aliases"]],
        )
        connection.executemany(
            "INSERT INTO act_sources VALUES(?,?,?)",
            [
                (row["sourceId"], row["actId"], row["relation"])
                for row in tables["actSources"]
            ],
        )
        for key, value in database.items():
            if key != "tables":
                connection.execute(
                    "INSERT INTO metadata VALUES(?,?)",
                    (key, json.dumps(value, ensure_ascii=False, sort_keys=True)),
                )
        if connection.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("SQLite foreign key validation failed")
        connection.commit()
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true", help="Fail if the generated JSON differs"
    )
    parser.add_argument(
        "--output", type=Path, default=OUTPUT, help="Explicit JSON destination"
    )
    parser.add_argument(
        "--sqlite", type=Path, help="Optional new local SQLite export, outside dist"
    )
    args = parser.parse_args()
    database = build_database()
    content = serialize(database)
    if args.check:
        if not args.output.exists() or args.output.read_bytes() != content:
            raise SystemExit(
                "Knowledge index is stale; run python scripts/build_guide_database.py"
            )
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(content)
    if args.sqlite:
        write_sqlite(database, args.sqlite)
    print(f"Knowledge index: {database['counts']}, {len(content)} bytes")


if __name__ == "__main__":
    main()
