#!/usr/bin/env python3
"""Describe a finite regulatory inventory without certifying legal completeness."""

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/process/regulatory-coverage.json"
REVISION = ROOT / "data/process/regulatory-revision.json"
RULE_INPUTS = (
    "data/process/knowledge-index.json",
    "data/process/official-sources.json",
    "data/process/safety-sources.json",
    "data/process/report-matrix.json",
    "data/requirements/catalog.json",
    "data/vehicle-legislation/reviewed-map.json",
    "data/mover/reviewed-map.json",
    "src/guide/process-model.js",
    "src/guide/review-state.js",
)
AUDIT_INPUT = "data/audit/regulatory-findings.json"


def read(path, root=ROOT):
    return json.loads((root / path).read_text())


def serialized(value):
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    ).encode()


def build_report(root=ROOT):
    database = read("data/process/knowledge-index.json", root)
    audit = read(AUDIT_INPUT, root)
    health = read("data/process/source-health.json", root)
    requirements = read("data/requirements/catalog.json", root)["records"]
    mapping = read("data/vehicle-legislation/reviewed-map.json", root)
    acts = database["tables"]["acts"]
    act_ids = {row["id"] for row in acts}
    requirements_by_id = {row["id"]: row for row in requirements}
    if any(row["actId"] not in act_ids for row in requirements):
        raise ValueError("Requirement references an unpublished/missing act")
    req_agency = Counter(row["agency"] for row in requirements)
    evidence = Counter(row["provision"]["kind"] for row in requirements)
    provenance = [
        {"path": path, "sha256": hashlib.sha256((root / path).read_bytes()).hexdigest()}
        for path in RULE_INPUTS
    ]
    revision = hashlib.sha256(serialized(provenance)).hexdigest()
    agencies = []
    groups = [
        ("ibama", "Ibama / CONAMA", {"proconve", "ibama"}),
        ("senatran", "SENATRAN / CONTRAN", {"contran", "senatran"}),
        ("inmetro", "Inmetro", {"inmetro"}),
        ("anatel", "Anatel", {"anatel"}),
        ("mdic", "MDIC / MOVER", {"mover", "mdic"}),
    ]
    for identity, label, names in groups:
        selected = [row for row in acts if row["agency"].lower() in names]
        full = sum(
            (row.get("reviewStatus") or {}).get("fullTextReviewed") is True
            for row in selected
        )
        chain = sum(
            (row.get("reviewStatus") or {}).get("amendmentChainReviewed") is True
            for row in selected
        )
        agencies.append(
            {
                "id": identity,
                "label": label,
                "acts": len(selected),
                "requirements": sum(req_agency[name] for name in names),
                "fullTextReviewed": full,
                "chainReviewed": chain,
                "unknownOrPartial": len(selected) - chain,
            }
        )
    original = json.loads(
        subprocess.check_output(
            [
                "node",
                "-e",
                "const x=require('./src/guide/subsystem-coverage.js');"
                "console.log(JSON.stringify(x.ALL_SUBSYSTEMS.map(r=>({id:r.id,label:r.label,assemblyId:r.assemblyId,canonical:r.canonical}))))",
            ],
            cwd=root,
            text=True,
        )
    )
    topics = defaultdict(list)
    for part in mapping["parts"]:
        for topic in part["topics"]:
            topics[topic["subsystemId"]].append(topic)
    subsystems = []
    for row in original:
        linked = topics[row["id"]]
        ids = sorted(
            {link["actId"] for topic in linked for link in topic.get("links", [])}
        )
        specific = sorted(
            {
                identity
                for topic in linked
                for link in topic.get("links", [])
                for identity in link.get("requirementIds", [])
            }
        )
        if set(ids) - act_ids or set(specific) - requirements_by_id.keys():
            raise ValueError("Subsystem refers to an unknown act/requirement")
        subsystems.append(
            {
                **row,
                "actIds": ids,
                "requirementIds": specific,
                "status": "specific_excerpts"
                if specific
                else "consultation_context"
                if ids
                else "mapping_pending",
                "gaps": sorted(
                    {gap for topic in linked for gap in topic.get("gaps", [])}
                )
                or (
                    []
                    if specific
                    else [
                        "Sem requisito específico estruturado para este subsistema; vínculo temático não determina incidência."
                    ]
                ),
            }
        )
    statuses = Counter(row["status"] for row in audit["findings"])
    return {
        "schemaVersion": 1,
        "asOf": audit["asOf"],
        "revision": revision,
        "scopeNote": audit["scopeNote"],
        "universalCoverageConfirmed": False,
        "summary": {
            "acts": len(acts),
            "requirements": len(requirements),
            "publicTextExcerpts": evidence["public_text_excerpt"],
            "officialGuidanceItems": evidence["official_guidance"],
            "sources": len(database["tables"]["sources"]),
            "originalSubsystems": sum(row["canonical"] for row in original),
            "supplementalSubsystems": sum(not row["canonical"] for row in original),
            "findings": len(audit["findings"]),
            "fixedFindings": statuses["fixed"],
            "pendingFindings": len(audit["findings"]) - statuses["fixed"],
            "sourceIdentityLinks": len(database["tables"]["actSources"]),
            "excludedContranActs": len(
                read("data/contran/publication-policy.json", root)[
                    "inactiveHistoricalIds"
                ]
            ),
        },
        "agencies": agencies,
        "findings": audit["findings"],
        "subsystems": subsystems,
        "knowledge": {
            "indexUrl": "knowledge/README.md",
            "manifestUrl": "knowledge/manifest.json",
            "auditUrl": "docs/guide/checkup-regulatorio.md",
        },
        "monitoring": {
            "observedAt": health["observedAt"],
            "selectedUrls": health["counts"]["sources"],
            "acceptedUrls": health["counts"]["available"],
            "unverifiedUrls": health["counts"]["unavailable"],
            "unattemptedUrls": health["counts"]["notAttempted"],
            "scopeNote": health["scopeNote"],
            "snapshotUrl": "data/process/source-health.json",
            "workflowUrl": "https://github.com/FLeone2/legislacao-automotiva/actions?query=workflow%3A%22Regulatory+source+monitor%22",
            "schedulerNote": "Rotina diária preparada. A execução agendada no GitHub depende de o workflow integrar o ramo padrão do repositório.",
        },
        "provenance": provenance
        + [
            {
                "path": AUDIT_INPUT,
                "sha256": hashlib.sha256((root / AUDIT_INPUT).read_bytes()).hexdigest(),
            },
            {
                "path": "data/process/source-health.json",
                "sha256": hashlib.sha256(
                    (root / "data/process/source-health.json").read_bytes()
                ).hexdigest(),
            },
        ],
        "interpretation": [
            "Inventário cadastrado não é universo completo da legislação.",
            "Leitura integral indicada não significa cadeia modificadora integral revisada.",
            "Trecho público e orientação oficial são naturezas distintas; nenhum contador decide obrigação.",
            "Associação de ato ao subsistema é contexto; só requisito explicitamente ligado aparece como vínculo específico.",
            "Disponibilidade HTTP, hash e data de coleta não comprovam vigência ou aplicabilidade.",
        ],
    }


def report_markdown(report):
    summary = report["summary"]
    lines = [
        "# Checkup regulatório do guia",
        "",
        f"Referência da auditoria: {report['asOf']}.",
        "",
        report["scopeNote"],
        "",
        f"O inventário contém {summary['acts']} atos, {summary['sources']} fontes e {summary['requirements']} itens estruturados: {summary['publicTextExcerpts']} trechos de atos públicos e {summary['officialGuidanceItems']} orientações oficiais. Esses itens não equivalem a obrigações automaticamente incidentes num veículo.",
        "",
        f"Foram registrados {summary['findings']} achados: {summary['fixedFindings']} correções aplicadas e {summary['pendingFindings']} pontos ainda em revisão, candidatos ou com acesso impedido. As {summary['excludedContranActs']} exclusões editoriais CONTRAN permanecem preservadas.",
        "",
        "## Profundidade do acervo",
        "",
        "| Órgão | Atos | Itens estruturados | Íntegra indicada como lida | Cadeia integral revisada |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for row in report["agencies"]:
        lines.append(
            f"| {row['label']} | {row['acts']} | {row['requirements']} | {row['fullTextReviewed']} | {row['chainReviewed']} |"
        )
    monitor = report["monitoring"]
    lines += [
        "",
        "Leitura integral indicada não comprova revisão de toda a cadeia modificadora. Ausência dessa indicação pode ser desconhecimento, sem inferir leitura ou ausência de obrigação.",
        "",
        "## Observação técnica das fontes",
        "",
        f"Coleta em {monitor['observedAt']}: {monitor['selectedUrls']} URLs tentadas; {monitor['acceptedUrls']} aceitas tecnicamente e {monitor['unverifiedUrls']} não validadas nesta execução. Inclui manutenção, erros HTTP/rede e limite de bytes. Não significa que existam {monitor['unverifiedUrls']} leis ausentes. Um índice ou FAQ acessível não comprova íntegra de uma portaria.",
        "",
        monitor["schedulerNote"],
        "",
        "## Achados e encaminhamentos",
        "",
    ]
    labels = {
        "fixed": "Correção aplicada",
        "candidate": "Candidato pendente",
        "access_blocked": "Acesso impedido",
        "requires_review": "Revisão necessária",
        "open": "Em aberto",
    }
    for finding in report["findings"]:
        lines += [
            f"### {finding['id']} — {finding['title']}",
            "",
            f"Situação: **{labels.get(finding['status'], finding['status'])}**; prioridade {finding['severity']}.",
            "",
            finding["detail"],
            "",
            f"Encaminhamento: {finding['action']}",
            "",
        ]
        if finding.get("remainingReview"):
            lines += [f"Limite remanescente: {finding['remainingReview']}", ""]
        lines += [
            f"- [{source['label']}]({source['url']})"
            for source in finding["sourceUrls"]
        ]
        lines.append("")
    lines += [
        "## Manutenção e consulta por IA",
        "",
        "Consulte a [arquitetura da base](arquitetura-base-regulatoria.md), o [monitor de fontes](atualizacoes-e-operacao.md) e os cartões versionados em `knowledge/`. As conclusões antigas de um processo são sinalizadas para nova conferência quando o conjunto de dados/regras muda; as notas e referências não são apagadas.",
        "",
    ]
    return "\n".join(lines).encode()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    report = build_report()
    outputs = {
        OUTPUT: serialized(report),
        ROOT / "docs/guide/checkup-regulatorio.md": report_markdown(report),
        REVISION: serialized(
            {
                "revision": report["revision"],
                "scope": "rules_and_evidence_snapshot",
                "asOf": report["asOf"],
            }
        ),
    }
    for path, content in outputs.items():
        if args.check:
            if not path.exists() or path.read_bytes() != content:
                raise SystemExit("Stale regulatory coverage: " + str(path))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
    print("Regulatory coverage:", report["summary"], "not a completeness certificate")


if __name__ == "__main__":
    main()
