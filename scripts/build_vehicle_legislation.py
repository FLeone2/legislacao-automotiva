#!/usr/bin/env python3
"""Compile explicit vehicle-to-law links and audit every published reference.

The reviewed map is editorial input. Drawing geometry, publication, legal status,
review depth and applicability remain owned by their existing sources. An act
without a corresponding visual part remains classified and accessible by subject.
"""

import argparse
import csv
import io
import json
import re
import subprocess
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/vehicle-legislation/reviewed-map.json"
RUNTIME = "src/core/vehicle-legislation-data.js"
AUDIT_JSON = "data/site/vehicle-legislation-audit.json"
AUDIT_CSV = "data/site/vehicle-legislation-audit.csv"
LANES = {"seguranca", "ambiental"}
RELATIONS = {"component", "vehicle"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(path):
    return json.loads((ROOT / path).read_text())


def load_inputs():
    """Use the production adapter so aliases/exclusions match the browser."""
    program = r"""
const fs = require('node:fs');
const vm = require('node:vm');
const index = JSON.parse(fs.readFileSync('data/site/index.json', 'utf8'));
const { ComponentFlow } = require('./vehicle-data.js');
const context = {
  regulatoryData: index.regulations,
  ComponentFlow,
  enrichFlowCatalogRecord: (record) => record,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/core/dom.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('src/regulations/catalog.js', 'utf8'), context);
context.base = index.base;
vm.runInContext('globalThis.installed = installActiveRegulations(base)', context);
process.stdout.write(JSON.stringify({
  records: context.installed.canonicalRecords || context.installed.records,
  documentaryEntryCount: context.installed.records.filter(r => r.publication?.included !== false).length,
  vector: require('./src/core/vehicle-vector.js'),
}));
"""
    result = json.loads(
        subprocess.check_output(["node", "-e", program], cwd=ROOT, text=True)
    )
    result["base"] = read("catalog.json")
    result["collections"] = {
        agency: read(f"data/{agency}/active.json")
        for agency in ("contran", "proconve", "inmetro", "anatel")
    }
    result["excluded"] = set(
        read("data/contran/publication-policy.json")["inactiveHistoricalIds"]
    )
    with ZipFile(ROOT / "data/vehicle-visual/source.zip") as archive:
        names = [n for n in archive.namelist() if n.endswith("mapa_conjuntos.json")]
        require(len(names) == 1, "Missing unique drawing source map")
        result["originalGeometry"] = json.loads(archive.read(names[0]))
    return result


def catalog_context(inputs):
    acts, aliases = {}, {}
    for record in inputs["records"]:
        act_id = record.get("regulatoryId") or record["id"]
        require(act_id not in inputs["excluded"], "Excluded act in runtime catalog")
        require(
            record.get("publication", {}).get("included", True) is True,
            f"Unpublished act in runtime catalog: {act_id}",
        )
        acts.setdefault(act_id, []).append(record)
        for alias in {
            record["id"],
            act_id,
            *record.get("aliases", []),
            *record.get("catalogEntryIds", []),
        }:
            require(
                alias not in aliases or aliases[alias] == act_id,
                f"Ambiguous act alias: {alias}",
            )
            aliases[alias] = act_id
    originals = {}
    source_records = {"catalog.json": {r["id"]: r for r in inputs["base"]["records"]}}
    for agency, collection in inputs["collections"].items():
        source_records[f"data/{agency}/active.json"] = {
            r["id"]: r for r in collection["records"]
        }
        for record in collection["records"]:
            act_id = record["id"]
            require(act_id in acts, f"Published act missing from adapter: {act_id}")
            originals[act_id] = record
            for alias in record.get("catalogRecordIds", []):
                if alias in aliases:
                    require(aliases[alias] == act_id, f"Ambiguous catalog ID: {alias}")
    subsystems = {
        child["id"]
        for group in inputs["base"]["metadata"]["hierarchy"]
        for child in group["children"]
    }
    return acts, aliases, originals, source_records, subsystems


def canonical_id(link, aliases):
    supplied = [link[k] for k in ("actId", "regulatoryId", "catalogId") if link.get(k)]
    require(supplied, "Link has no act ID")
    require(
        all(isinstance(value, str) and value in aliases for value in supplied),
        f"Unknown or unpublished act: {supplied}",
    )
    ids = {aliases[value] for value in supplied}
    require(len(ids) == 1, f"Conflicting act aliases: {supplied}")
    return ids.pop()


def source_value(record, field):
    match = re.fullmatch(r"requirements\[id=([^\]]+)\]\.([A-Za-z]+)", field)
    if match:
        requirement = next(
            (q for q in record.get("requirements", []) if q["id"] == match[1]), None
        )
        require(requirement is not None, f"Unknown source requirement: {match[1]}")
        return requirement.get(match[2])
    return record.get(field)


def validate_source_fields(link, act_id, source_records, aliases):
    fields = link.get("sourceFields")
    require(isinstance(fields, list) and fields, f"Missing source fields: {act_id}")
    for field in fields:
        path, record_id = field.get("path"), field.get("recordId")
        require(path in source_records, f"Unsupported source path: {path}")
        record = source_records[path].get(record_id)
        require(record is not None, f"Unknown source record: {record_id}")
        require(
            aliases.get(record_id) == act_id,
            f"Evidence belongs to another act: {record_id} / {act_id}",
        )
        value = source_value(record, field.get("field", ""))
        excerpt = field.get("excerpt")
        require(
            isinstance(value, str) and isinstance(excerpt, str) and excerpt.strip(),
            f"Missing text evidence: {act_id}",
        )

        def normalized(text):
            return re.sub(r"\s+", " ", text).strip()

        require(
            normalized(excerpt) in normalized(value),
            f"Source excerpt drift: {act_id} / {field['field']}",
        )
        require(
            isinstance(field.get("sourceUrl"), str)
            and field["sourceUrl"].startswith("https://"),
            f"Missing official source URL: {act_id}",
        )


def compile_mapping(source, inputs):
    require(source.get("schemaVersion") == 1, "Unsupported vehicle map schema")
    require(
        isinstance(source.get("asOf"), str)
        and re.fullmatch(r"\d{4}-\d{2}-\d{2}", source["asOf"]),
        "Missing editorial map date",
    )
    require(isinstance(source.get("parts"), list), "Missing reviewed parts")
    geometry = inputs["vector"]["parts"]
    original_ids = [p["id"] for p in inputs["originalGeometry"]["conjuntos"]]
    geometry_ids = [p["id"] for p in geometry]
    require(
        len(geometry_ids) == 37
        and len(set(geometry_ids)) == 37
        and set(geometry_ids) == set(original_ids),
        "Generated geometry differs from the 37 supplied drawing parts",
    )
    part_ids = [p.get("id") for p in source["parts"]]
    require(
        len(part_ids) == 37
        and len(set(part_ids)) == 37
        and set(part_ids) == set(geometry_ids),
        "Reviewed map must cover all 37 drawing parts exactly once",
    )
    acts, aliases, originals, source_records, subsystems = catalog_context(inputs)
    reviewed = {part["id"]: part for part in source["parts"]}
    runtime = {"schemaVersion": 1, "asOf": source["asOf"], "parts": []}
    for drawing in geometry:
        part = reviewed[drawing["id"]]
        require(
            part.get("componentId") == drawing["componentId"],
            f"Wrong component for drawing part: {part['id']}",
        )
        require(
            part.get("label") == drawing["label"],
            f"Drawing label drift: {part['id']}",
        )
        require(isinstance(part.get("topics"), list), f"Missing topics: {part['id']}")
        output = {k: part[k] for k in ("id", "label", "componentId")}
        output["topics"] = []
        topic_ids = set()
        for topic in part["topics"]:
            topic_id = topic.get("id")
            require(
                isinstance(topic_id, str) and topic_id and topic_id not in topic_ids,
                f"Missing or duplicate topic: {part['id']} / {topic_id}",
            )
            topic_ids.add(topic_id)
            require(topic.get("lane") in LANES, f"Invalid lane: {topic_id}")
            require(topic.get("relation") in RELATIONS, f"Invalid relation: {topic_id}")
            require(
                topic.get("subsystemId") is None or topic["subsystemId"] in subsystems,
                f"Unknown subsystem: {topic.get('subsystemId')}",
            )
            require(
                isinstance(topic.get("label"), str) and topic["label"].strip(),
                f"Missing topic label: {topic_id}",
            )
            require(isinstance(topic.get("links"), list), f"Missing links: {topic_id}")
            require(
                isinstance(topic.get("gaps", []), list)
                and all(
                    isinstance(gap, str) and gap.strip()
                    for gap in topic.get("gaps", [])
                ),
                f"Invalid gaps: {topic_id}",
            )
            require(
                topic["links"] or topic.get("gaps"),
                f"Empty topic needs an explicit coverage gap: {topic_id}",
            )
            compact = {
                k: topic.get(k)
                for k in ("id", "label", "subsystemId", "lane", "relation")
            }
            compact["links"] = []
            seen_acts = set()
            for link in topic["links"]:
                act_id = canonical_id(link, aliases)
                require(act_id not in seen_acts, f"Duplicate act in topic: {act_id}")
                seen_acts.add(act_id)
                requirement_ids = link.get("requirementIds", [])
                require(
                    isinstance(requirement_ids, list)
                    and all(isinstance(q, str) for q in requirement_ids)
                    and len(requirement_ids) == len(set(requirement_ids)),
                    f"Invalid requirement IDs: {act_id}",
                )
                valid_ids = {
                    q["id"] for q in originals.get(act_id, {}).get("requirements", [])
                }
                require(
                    set(requirement_ids) <= valid_ids,
                    f"Requirement does not belong to published act: {act_id}",
                )
                for field in ("basis", "note"):
                    require(
                        isinstance(link.get(field, ""), str),
                        f"Invalid {field}: {act_id}",
                    )
                require(
                    link.get("basis", "").strip(), f"Missing mapping basis: {act_id}"
                )
                validate_source_fields(link, act_id, source_records, aliases)
                compact["links"].append(
                    {
                        "actId": act_id,
                        "requirementIds": requirement_ids,
                        "basis": link["basis"],
                        "note": link.get("note", ""),
                    }
                )
            compact["gaps"] = topic.get("gaps", [])
            if topic.get("gapReview"):
                gap = topic["gapReview"]
                require(
                    gap.get("state")
                    in {
                        "research_pending",
                        "no_specific_reference_in_collection",
                        "not_classified",
                    },
                    f"Invalid gap review state: {topic_id}",
                )
                require(
                    all(
                        isinstance(gap.get(key), str) and gap[key].strip()
                        for key in ("reviewedAt", "summary", "nextAction")
                    ),
                    f"Incomplete gap review: {topic_id}",
                )
                compact["gapReview"] = gap
            output["topics"].append(compact)
        runtime["parts"].append(output)
    return runtime


def build_audit(source, runtime, inputs):
    acts, aliases, _originals, _sources, _subsystems = catalog_context(inputs)
    direct, contextual, associations = {}, {}, {}
    for part in runtime["parts"]:
        for topic in part["topics"]:
            for link in topic["links"]:
                act_id = link["actId"]
                target = direct if topic["relation"] == "component" else contextual
                target.setdefault(act_id, set()).add(part["id"])
                associations.setdefault(act_id, []).append(
                    {
                        "partId": part["id"],
                        "topicId": topic["id"],
                        "subsystemId": topic["subsystemId"],
                        "lane": topic["lane"],
                        "relation": topic["relation"],
                        "requirementIds": link["requirementIds"],
                    }
                )
    editorial_notes = {}
    for item in source.get("unrepresentedReferences", []) + source.get(
        "processTopics", []
    ):
        act_id = canonical_id(item, aliases)
        editorial_notes.setdefault(act_id, []).append(item["reason"])
    rows = []
    for act_id in sorted(acts):
        records = acts[act_id]
        representative = records[0]
        part_ids = sorted(direct.get(act_id, set()))
        context_ids = sorted(contextual.get(act_id, set()))
        classification = []
        if part_ids:
            classification.append("part_direct")
        if context_ids:
            classification.append("vehicle_context")
        nonvisual = not (part_ids or context_ids)
        if nonvisual:
            classification.append("other_topics_no_visual_region")
        rows.append(
            {
                "actId": act_id,
                "title": representative["title"],
                "agency": representative["agency"],
                "regulatorySource": representative.get("regulatorySource"),
                "catalogIds": sorted(
                    {
                        alias
                        for r in records
                        for alias in r.get("catalogEntryIds", [r["id"]])
                    }
                ),
                "classification": classification,
                "componentPartIds": part_ids,
                "vehiclePartIds": context_ids,
                "nonvisual": nonvisual,
                "taxonomy": sorted({t for r in records for t in r.get("taxonomy", [])}),
                "associations": associations.get(act_id, []),
                "notes": sorted(set(editorial_notes.get(act_id, []))),
            }
        )
    direct_ids, context_ids = set(direct), set(contextual)
    nonvisual_ids = {row["actId"] for row in rows if row["nonvisual"]}
    require(
        direct_ids | context_ids | nonvisual_ids == set(acts),
        "Incomplete published reference classification",
    )
    counts = {
        "catalogEntries": inputs.get("documentaryEntryCount", len(inputs["records"])),
        "uniqueActs": len(acts),
        "drawingParts": len(runtime["parts"]),
        "partDirectActs": len(direct_ids),
        "vehicleContextActs": len(context_ids),
        "bothDirectAndContextActs": len(direct_ids & context_ids),
        "visualLinkedActs": len(direct_ids | context_ids),
        "nonvisualActs": len(nonvisual_ids),
        "classifiedUniqueActs": len(rows),
        "classificationCoveragePercent": 100,
    }
    by_part = []
    for part in runtime["parts"]:
        part_direct = {a for a, ids in direct.items() if part["id"] in ids}
        part_context = {a for a, ids in contextual.items() if part["id"] in ids}
        by_part.append(
            {
                "partId": part["id"],
                "label": part["label"],
                "componentId": part["componentId"],
                "componentActIds": sorted(part_direct),
                "vehicleActIds": sorted(part_context),
                "componentCount": len(part_direct),
                "vehicleCount": len(part_context),
                "uniqueCount": len(part_direct | part_context),
            }
        )
    return {
        "schemaVersion": 1,
        "asOf": source["asOf"],
        "scope": source.get("scope", ""),
        "classificationNote": (
            "Classificação de consulta, sem decisão de aplicabilidade ou vigência. "
            "Atos não representados permanecem disponíveis por assunto. "
            "Contagens de relações podem se sobrepor; atos são deduplicados por ID canônico."
        ),
        "counts": counts,
        "parts": by_part,
        "records": rows,
    }


def format_runtime(runtime):
    package = read("package.json")
    prettier = read("node_modules/prettier/package.json")
    require(
        package["devDependencies"]["prettier"] == prettier["version"],
        "Installed Prettier differs from the project pin; run npm ci",
    )
    javascript = (
        "'use strict';\n\n"
        "// Generated by scripts/build_vehicle_legislation.py; edit the reviewed map.\n"
        "const VehicleLegislationData = "
        + json.dumps(runtime, ensure_ascii=False, indent=2)
        + ";\n\n"
        "if (typeof module !== 'undefined') module.exports = VehicleLegislationData;\n"
    )
    return subprocess.run(
        [
            "node",
            str(ROOT / "node_modules/prettier/bin/prettier.cjs"),
            "--stdin-filepath",
            RUNTIME,
        ],
        cwd=ROOT,
        input=javascript,
        text=True,
        capture_output=True,
        check=True,
    ).stdout.encode()


def audit_csv(audit):
    output = io.StringIO(newline="")
    fields = [
        "actId",
        "title",
        "agency",
        "regulatorySource",
        "catalogIds",
        "classification",
        "componentPartIds",
        "vehiclePartIds",
        "nonvisual",
        "taxonomy",
        "notes",
    ]
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    for row in audit["records"]:
        writer.writerow(
            {
                field: " | ".join(row[field])
                if isinstance(row[field], list)
                else row[field]
                for field in fields
            }
        )
    return output.getvalue().encode()


def generate(source=None, inputs=None):
    source = read(SOURCE) if source is None else source
    inputs = load_inputs() if inputs is None else inputs
    runtime = compile_mapping(source, inputs)
    audit = build_audit(source, runtime, inputs)
    return {
        RUNTIME: format_runtime(runtime),
        AUDIT_JSON: (json.dumps(audit, ensure_ascii=False, indent=2) + "\n").encode(),
        AUDIT_CSV: audit_csv(audit),
    }


def write_outputs(outputs, target=ROOT, check=False):
    for name, expected in outputs.items():
        path = Path(target) / name
        if check:
            require(
                path.is_file() and path.read_bytes() == expected,
                f"Stale generated file: {name}",
            )
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(expected)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true", help="Compare bytes without writing"
    )
    args = parser.parse_args()
    outputs = generate()
    write_outputs(outputs, check=args.check)
    counts = json.loads(outputs[AUDIT_JSON])["counts"]
    print(
        f"Vehicle legislation: {counts['drawingParts']} parts, "
        f"{counts['classifiedUniqueActs']}/{counts['uniqueActs']} unique references "
        f"classified ({counts['nonvisualActs']} without a visual region); "
        f"{'checked' if args.check else 'generated'}."
    )


if __name__ == "__main__":
    main()
