#!/usr/bin/env python3
"""Build a searchable map from preserved official evidence; never guess applicability."""

import csv
import gzip
import json
import re
from collections import Counter
from pathlib import Path

from map_contran import (
    ROOT,
    clean,
    normalized,
    parse_index,
    classify_source,
    cross_reference,
    entry_clauses,
    temporal_flags,
    entry_assessment,
    write_json,
    relation_kind,
    year,
)
import datetime as dt

OUT = ROOT / "data/contran"
LABELS = {
    "vigencia_expressa": "Vigência indicada no índice",
    "vigencia_texto": "Entrada em vigor localizada no texto",
    "parcialmente_revogada": "Revogação parcial — conferir redação remanescente",
    "revogada": "Revogada",
    "suspensa": "Efeitos suspensos",
    "prazo_encerrado": "Prazo encerrado no índice",
    "nula": "Declarada nula",
    "nao_confirmada": "Vigência atual não confirmada",
}
SYSTEM_RULES = {
    "vidros": r"vidr|limpador|lavador|janelas|para.?brisa",
    "pneus-rodas": r"pneu|roda sobressalente|rodas especiais|protetores de roda|antispray",
    "freios": r"freio|frenagem|antitravamento|controle de estabilidade",
    "iluminacao": r"iluminacao|iluminaca|lanterna|farol|sinalizacao (?:luminosa|refletora)|retrorreflet|retroreflet",
    "ocupantes": r"bancos e apoios|ancoragem|cinto|air.?bag|ocupantes|retencao infantil|revestimento interno|retencao para.*crianca|transporte de criancas",
    "carroceria": r"para.?choque|quebra.?mato|fechadura|dobradica|retencao das portas|protetor lateral|protecao aos pedestres|carroceria|carrocaria|capotagem|impacto",
    "retrovisores": r"retrovisor|espelho|monitoramento traseiro|visao indireta|camera.monitor",
    "propulsao": r"emiss|escapamento|combustivel|gas natural|gasogenio|motor eletrico|propulsao|veiculos eletricos|bateria|eletric[ao] auxiliar|gases|ruido",
    "eletronica": r"geradores de imagem|equipamentos geradores|comandos|controles indicadores|buzina|alarmes|acionadores|antifurto|cronotacografo",
    "identificacao": r"identificacao de veiculos|identificacao veicular|identificacao automatica|placas de identificacao|siniav|marca.modelo.versao",
    "chassi": r"suspensao e direcao|sistema de suspensao|suspensao (?:dos|de) veiculos|direcao do veiculo|volante de direcao|eixo|pesos e dimensoes|limites de pesos",
}
THEME_RULES = {
    "prazos-excepcionais": (
        "Prazos excepcionais",
        r"covid|pandemia|calamidade|prorrog|emergencia (?:de saude|em saude|sanitaria|publica)",
    ),
    "condutores": (
        "Condutores e habilitação",
        r"habilita|condutor|cnh|aprendizagem|formacao|exame toxicologico",
    ),
    "registro": (
        "Registro, licenciamento e propriedade",
        r"registro|licenciamento|transferencia de propriedade|renave|renavam|financiamento|alienacao|desmonte|leilao|baixa",
    ),
    "fiscalizacao": (
        "Fiscalização, infrações e penalidades",
        r"fiscaliza|infracao|infracoes|penalidade|multas|recursos|autuacao",
    ),
    "circulacao": (
        "Circulação, sinalização viária e transporte",
        r"circulacao|sinalizacao viaria|sinalizacao de transito|transporte|trafego|pedagio|free flow|estacionamento",
    ),
    "organizacao": (
        "Organização do SNT e educação",
        r"camara|regimento|sistema nacional de transito|campanha|educacao|pnatrans|plano nacional",
    ),
    "seguranca-veicular": (
        "Segurança veicular e construção",
        r"requisit|equipamento|fabricacao|homologacao|seguranca.*veicul|veicul.*seguranca|ensaios",
    ),
}


def historic_subject(text, number, year):
    text = clean(text)
    # The archived Word documents put the ementa between their title and the council.
    m = re.search(
        r"RESOLU[ÇC][ÃA]O.{0,90}?\b"
        + str(number)
        + r"\s*/\s*"
        + str(year)[-2:]
        + r"\b\s*",
        text,
        re.I,
    )
    tail = text[m.end() :] if m else text
    subject = re.split(
        r"\bO\s+CONSELHO|\bO\s+Conselho|\bConsiderando\b", tail, maxsplit=1
    )[0].strip()
    return (
        subject[:1000]
        if 12 < len(subject) < 1000
        else f"Resolução CONTRAN nº {number}/{year} — ementa não extraída com segurança; consultar arquivo histórico."
    )


def plain_relations(record, indexed):
    # Some references are plain text, notably the historical acts revoked by 885/2021.
    # Match number AND year, and only an explicit outgoing action in its clause.
    clauses = record["statusClauses"] + [record["subject"]]
    seen = {(x["number"], x["year"], x["kind"]) for x in record["relationships"]}
    for clause in clauses:
        patterns = [
            r"(?<![\d/])\b0*(\d{1,4})\s*/\s*(\d{2,4})(?![\d/])\b",
            r"\b(?:n[º°o.]*)?\s*(\d{1,4}),?\s+de\s+(?:\d{1,2}[º°o]?\s+de\s+\w+\s+de\s+)?(19\d{2}|20\d{2})\b",
        ]
        for pattern in patterns:
            for m in re.finditer(pattern, clause, re.I):
                prefix = clause[: m.start()]
                types = list(
                    re.finditer(
                        r"resolu[cç][aã]o|resolu[cç][oõ]es|delibera[cç][aã]o|portaria",
                        prefix,
                        re.I,
                    )
                )
                if types and not normalized(types[-1][0]).startswith("resolu"):
                    continue
                kind = relation_kind(prefix)
                if kind not in ["revoga", "revoga_parcialmente", "altera", "suspende"]:
                    continue
                number, y = int(m[1]), year(m[2])
                target = indexed.get(f"contran-{number}-{y}")
                key = (number, y, kind)
                if not target or key in seen:
                    continue
                seen.add(key)
                record["relationships"].append(
                    {
                        "number": number,
                        "year": y,
                        "kind": kind,
                        "label": f"{number}/{y}",
                        "url": target["officialUrl"],
                        "evidence": clause,
                        "extractedFrom": "literal_text",
                    }
                )


def main():
    base = json.loads((OUT / "inventory.json").read_text())
    metadata = base["metadata"]
    as_of = dt.date.fromisoformat(metadata["asOf"])
    rows, info = parse_index(
        gzip.decompress((OUT / "sources/index.html.gz").read_bytes())
    )
    with gzip.open(OUT / "sources/text-extracts.json.gz", "rt") as f:
        extracts = json.load(f)
    with gzip.open(OUT / "sources/historical-extracts.json.gz", "rt") as f:
        historic = json.load(f)
    for r in rows:
        r["origin"] = "official_index"
        r["status"], r["statusEvidence"] = classify_source(r)
    for h in historic["records"]:
        r = {
            "id": h["id"],
            "number": h["number"],
            "year": h["year"],
            "date": None,
            "publicationDate": None,
            "subject": historic_subject(h["text"], h["number"], h["year"]),
            "sourceStatus": "Arquivo histórico anterior a 1998; não contém declaração geral de vigência atual.",
            "statusClauses": [],
            "officialUrl": h["url"],
            "documentLinks": [],
            "relatedLinks": [],
            "relationships": [],
            "notes": [],
            "origin": "historical_archive",
            "archivePath": h["archivePath"],
            "status": "nao_confirmada",
            "statusEvidence": [],
        }
        extracts[r["id"]] = h
        rows.append(r)
    indexed = {r["id"]: r for r in rows}
    for r in rows:
        plain_relations(r, indexed)
    cross_reference(rows, as_of)
    reviews = json.loads((OUT / "reviewed-effects.json").read_text())
    for effect in reviews["effects"]:
        source, target = indexed[effect["sourceId"]], indexed[effect["targetId"]]
        evidence = {**effect, "sourceUrl": source["officialUrl"], "reviewed": True}
        target["incomingEffects"].append(evidence)
        source["relationships"].append(
            {
                "number": target["number"],
                "year": target["year"],
                "label": f"{target['number']}/{target['year']}",
                "kind": effect["kind"],
                "url": target["officialUrl"],
                "evidence": effect["evidence"],
                "reviewed": True,
            }
        )
        if effect["kind"] == "revoga" and effect["effectiveDate"] <= metadata["asOf"]:
            target["status"] = "revogada"
            target["statusEvidence"].append(effect["evidence"])
            target["notes"].append(effect["calculation"])
    catalogue = json.loads((ROOT / "catalog.json").read_text())
    existing = {}
    for c in catalogue["records"]:
        m = re.search(
            r"contran\s*(?:n[º°o]?\s*)?(\d+)[./](\d{2,4})\b", normalized(c["title"])
        )
        if m:
            number, y = int(m[1]), int(m[2])
            y = y if y > 99 else (2000 + y if y < 50 else 1900 + y)
            existing.setdefault(f"contran-{number}-{y}", []).append(c)
    for r in rows:
        doc = extracts.get(r["id"])
        r["entryIntoForceEvidence"] = entry_clauses(doc.get("text", "")) if doc else []
        if (
            r["status"] == "nao_confirmada"
            and r["origin"] == "official_index"
            and r["entryIntoForceEvidence"]
        ):
            r["status"] = "vigencia_texto"
            r["statusEvidence"] = r["entryIntoForceEvidence"]
        r["documentCheck"] = (
            {k: v for k, v in doc.items() if k not in ["text", "id", "number", "year"]}
            if doc
            else {
                "state": "nao_coletado",
                "note": "Ato já indicado como revogado no índice; inteiro teor não coletado nesta rodada.",
            }
        )
        r["entryDateAssessment"] = entry_assessment(r)
        r["temporalFlags"] = temporal_flags(r, as_of)
        r["catalogRecordIds"] = [c["id"] for c in existing.get(r["id"], [])]
        text = normalized(r["subject"])
        r["systems"] = [
            key
            for key, expression in SYSTEM_RULES.items()
            if re.search(expression, text)
        ]
        for c in existing.get(r["id"], []):
            r["systems"].extend(
                t.split("/")[0]
                for t in c.get("taxonomy", [])
                if t.split("/")[0] in SYSTEM_RULES
            )
        r["systems"] = sorted(set(r["systems"]))
        r["themes"] = [
            key
            for key, (_, expression) in THEME_RULES.items()
            if re.search(expression, text)
        ] or ["outros"]
        r["classificationBasis"] = (
            "Associação temática pela ementa e vínculos já existentes no catálogo; não determina obrigação ou aplicação a um veículo."
        )
        r["actNature"] = (
            "modificadora"
            if re.match(r"altera\b|da nova redacao", text)
            else "revogatoria"
            if re.match(r"revoga\b|declara revogad", text)
            else "normativa-ou-procedimental"
        )
    # A modificatory act can mention its base only by number; follow that explicit relation.
    for _ in range(2):
        for r in rows:
            for relation in r["relationships"]:
                if relation["kind"] == "altera":
                    target = indexed.get(
                        f"contran-{relation['number']}-{relation['year']}"
                    )
                    if target:
                        r["systems"] = sorted(set(r["systems"] + target["systems"]))
    for r in rows:
        r["amendedBasesRevoked"] = [
            f"contran-{x['number']}-{x['year']}"
            for x in r["relationships"]
            if x["kind"] == "altera"
            and indexed.get(f"contran-{x['number']}-{x['year']}", {}).get("status")
            == "revogada"
        ]
        if r["amendedBasesRevoked"]:
            r["notes"].append(
                "Há vínculo de alteração com base hoje indicada como revogada. Conferir se o ato modificador conserva algum efeito autônomo; não usar a alteração isoladamente como requisito atual."
            )
        if r["status"] == "vigencia_texto":
            r["notes"].append(
                "O texto confirma a entrada em vigor original e o índice não informa revogação integral. Isso não constitui certificação de vigência ou consolidação atual."
            )
        r["statusLabel"] = LABELS[r["status"]]
        r["currentIndication"] = r["status"] in [
            "vigencia_expressa",
            "vigencia_texto",
            "parcialmente_revogada",
        ]
    for review in reviews["temporalReviews"]:
        indexed[review["id"]]["temporalFlags"].append(
            {k: v for k, v in review.items() if k != "id"}
        )
    # Preserve the annex as a source, without applying all its X marks to the visual SUV.
    annex_path = OUT / "sources/993-annex.json.gz"
    with gzip.open(annex_path, "rt") as f:
        annex = json.load(f)
    for key in ["contran-827-1997", "contran-580-1981"]:
        indexed[key]["notes"].append(
            "Citada no Anexo da Resolução 993/2023. A referência foi localizada, mas não certifica por si só a vigência integral atual do ato anterior ao CTB."
        )
        indexed[key]["relatedLinks"].append(
            {"label": "Anexo da Resolução 993/2023", "url": annex["url"]}
        )
    metadata.update(info)
    metadata.update(
        {
            "recordCount": len(rows),
            "indexActCount": sum(r["origin"] == "official_index" for r in rows),
            "historicalActCount": sum(
                r["origin"] == "historical_archive" for r in rows
            ),
            "statusCounts": dict(Counter(r["status"] for r in rows)),
            "currentIndicationCount": sum(r["currentIndication"] for r in rows),
            "primaryTextCount": sum(
                r["documentCheck"]["state"] == "extraido" for r in rows
            ),
            "reviewedEffectCount": len(reviews["effects"]),
            "temporalReviewCount": sum(bool(r["temporalFlags"]) for r in rows),
            "scope": "Índice principal oficial de 1998 a 2026, mais todos os atos-base identificados no arquivo histórico anterior a 1998 oferecido pelo mesmo portal.",
            "historicalSource": {
                k: v for k, v in historic["metadata"].items() if k != "files"
            },
            "consolidatedSource": {
                "url": "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes_consolidadas/resolucoes-contran-homologacao",
                "note": "Página consultada, assinalada em construção. Não foi tomada como lista completa de vigência atual.",
            },
            "themeLabels": {k: v[0] for k, v in THEME_RULES.items()}
            | {"outros": "Outros assuntos"},
            "statusLabels": LABELS,
            "douCheck": {
                "state": "nao_concluido",
                "note": "A consulta suplementar ao buscador do DOU retornou HTTP 403. A coleta não comprova ausência de atos posteriores a 06/10/2026.",
            },
            "limits": [
                "Consulta em 18/10/2026; o índice declara atualização em 06/10/2026. Não foi possível fechar a lacuna posterior com busca exaustiva no DOU.",
                "Vigência indicada combina a anotação do índice, a entrada em vigor original e cruzamentos explícitos. Ausência de revogação no índice não comprova vigência plena.",
                "Atos históricos sem indicação conclusiva ficam pendentes; a presença no ZIP ou a citação em um anexo não confirma vigência atual.",
                "Os textos e os anexos não foram integralmente consolidados artigo por artigo. Suspensões, normas alteradoras, regras transitórias e efeitos exauridos exigem conferência.",
                "Associação a sistema ou tema é um índice de consulta, sem decisão automática de aplicabilidade ao perfil ilustrativo do veículo.",
            ],
        }
    )
    # Human-readable order: newest series first; historical numbers never collide with newer acts.
    rows.sort(key=lambda r: (r["year"] or 0, r["number"]), reverse=True)
    write_json(OUT / "inventory.json", {"metadata": metadata, "records": rows})
    fields = [
        "id",
        "number",
        "year",
        "subject",
        "statusLabel",
        "currentIndication",
        "origin",
        "publicationDate",
        "sourceStatus",
        "officialUrl",
        "systems",
        "themes",
        "temporalFlags",
        "notes",
    ]
    for filename, selection in [
        ("inventory.csv", rows),
        ("vigencia-indicada.csv", [r for r in rows if r["currentIndication"]]),
    ]:
        with (OUT / filename).open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
            writer.writeheader()
            for r in selection:
                writer.writerow(
                    {
                        key: (
                            json.dumps(r.get(key), ensure_ascii=False)
                            if isinstance(r.get(key), list)
                            else r.get(key, "")
                        )
                        for key in fields
                    }
                )
    summary = [
        f"Levantamento CONTRAN — consulta em {metadata['asOf']}",
        f"Fonte: {metadata['sourceUrl']}",
        f"Atualização declarada pelo portal: {metadata['sourceModifiedText']}",
        f"{metadata['indexActCount']} resoluções do índice principal; {metadata['historicalActCount']} do arquivo anterior a 1998.",
        f"{metadata['currentIndicationCount']} atos com indicação de vigência, incluindo revogação parcial. Isso não significa aplicação automática hoje.",
        "",
        "Situações encontradas:",
    ]
    summary.extend(
        f"- {LABELS[key]}: {value}" for key, value in metadata["statusCounts"].items()
    )
    summary += [
        "",
        "Limites da verificação:",
        *[f"- {x}" for x in metadata["limits"]],
        "",
        "Fontes e reprodução:",
        "- sources/index.html.gz: cópia do índice, com SHA-256 registrado no JSON.",
        "- sources/text-extracts.json.gz e historical-extracts.json.gz: textos extraídos, URLs e hashes dos originais.",
        "- sources/993-annex.json.gz: anexo de equipamentos/requisitos consultado, sem transcrever suas tabelas como enquadramento automático.",
        "- reviewed-effects.json: conferências dirigidas de efeitos não resolvidos apenas pela linha do índice.",
        "- Atualizar: python scripts/map_contran.py --as-of AAAA-MM-DD; python scripts/collect_contran_supplements.py; python scripts/build_contran_map.py. Usar cache novo para uma coleta nova.",
        "- Reproduzir a fotografia preservada: python scripts/build_contran_map.py (sem rede).",
    ]
    (OUT / "LEIA-ME.txt").write_text("\n".join(summary) + "\n")
    print(
        json.dumps(
            {
                k: metadata[k]
                for k in [
                    "recordCount",
                    "indexActCount",
                    "historicalActCount",
                    "statusCounts",
                    "currentIndicationCount",
                    "primaryTextCount",
                    "temporalReviewCount",
                ]
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
