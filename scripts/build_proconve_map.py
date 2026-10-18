#!/usr/bin/env python3
"""Rebuild the reviewed L8/P8 map from preserved official Ibama/Conama sources."""

import gzip, json, re
from pathlib import Path
from map_contran import ROOT, clean, entry_clauses, write_json, normalized
from build_active_catalogs import CATEGORIES, write_csv
from regulatory_contract import apply_contract

DIRECTORY = ROOT / "data/proconve"


def excerpts(text, numbers):
    text = clean(text)
    marks = list(re.finditer(r"\bArt\.\s*(\d+)[º°o.]?", text))
    results = []
    for i, m in enumerate(marks):
        if int(m[1]) not in numbers:
            continue
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        value = text[m.start() : min(end, m.start() + 1900)]
        if value not in results:
            results.append(value)
    return results


def main():
    review = json.loads((DIRECTORY / "reviewed-map.json").read_text())
    with gzip.open(DIRECTORY / "sources/evidence.json.gz", "rt") as f:
        snapshot = json.load(f)
    sources = snapshot["sources"]
    records = []
    for seed in review["records"]:
        source = sources[seed["sourceKey"]]
        text = source["text"]
        number, year = seed["number"], seed["year"]
        title = (
            f"Resolução CONAMA nº {number}/{year}"
            if seed["issuer"] == "CONAMA"
            else f"Instrução Normativa IBAMA nº {number}/{year}"
        )
        assert str(number) in text[:1300] and str(year) in text[:1300], title
        links = []
        for target in seed["targets"]:
            sub = target["subsystemId"]
            system = sub.split("/")[0]
            links.append(
                {
                    **target,
                    "systemId": system,
                    "basis": "Relação conferida no objeto e nos dispositivos do ato; a exigência depende da fase, categoria, combustível e datas.",
                }
            )
        record = {
            "id": seed["id"],
            "title": title,
            "issuer": seed["issuer"],
            "number": number,
            "year": year,
            "subject": seed["topic"],
            "phases": seed["phases"],
            "active": True,
            "currentIndication": True,
            "status": "vigente_no_recorte_revisado",
            "statusLabel": "Vigente · ler com alterações"
            if seed["modifies"]
            else "Vigente no recorte revisado",
            "officialUrl": source["url"],
            "sourceStatus": "Texto oficial localizado no sistema do Ibama/Conama e cadeia de alterações conferida no recorte L8/P8.",
            "statusEvidence": excerpts(text, seed["articles"]),
            "entryIntoForceEvidence": entry_clauses(text),
            "documentCheck": {
                "state": "extraido",
                "sha256": source["sha256"],
                "bytes": source["bytes"],
                "url": source["url"],
            },
            "vehicleLinks": links,
            "systems": sorted({x["systemId"] for x in links}),
            "generalCategories": seed["categories"],
            "relationships": [],
            "incomingEffects": [],
            "relatedLinks": [],
            "catalogRecordIds": seed["catalogRecordIds"],
            "actNature": "modificadora"
            if seed["modifies"]
            else "normativa-ou-procedimental",
            "notes": [
                "O vínculo é temático e depende do enquadramento. A fase L8 de veículos leves não é a fase P8 de veículos pesados."
            ],
            "classificationBasis": "Mapa dirigido a partir dos objetos e dispositivos oficiais, com rastreabilidade por norma e fase.",
            "regulatoryDomain": "environmental",
            "temporalFlags": [],
        }
        assert record["statusEvidence"] or record["entryIntoForceEvidence"], title
        records.append(record)
    indexed = {r["id"]: r for r in records}
    for seed in review["records"]:
        source = indexed[seed["id"]]
        for target_id in seed["modifies"]:
            target = indexed[target_id]
            evidence = (
                source["statusEvidence"][0]
                if source["statusEvidence"]
                else seed["topic"]
            )
            source["relationships"].append(
                {
                    "kind": "altera",
                    "number": target["number"],
                    "year": target["year"],
                    "label": target["title"],
                    "url": target["officialUrl"],
                    "evidence": evidence,
                }
            )
            target["incomingEffects"].append(
                {
                    "sourceId": source["id"],
                    "sourceTitle": source["title"],
                    "kind": "altera",
                    "sourceUrl": source["officialUrl"],
                    "evidence": evidence,
                }
            )
    for key, base in [
        ("139110", "ibama-in-23-2020"),
        ("139023", "ibama-in-23-2020"),
        ("139023", "ibama-in-29-2020"),
        ("139106", "ibama-in-22-2020"),
        ("139026", "ibama-in-22-2020"),
        ("139027", "ibama-in-3-2021"),
        ("138998", "ibama-in-3-2021"),
    ]:
        src = sources[key]
        indexed[base]["relatedLinks"].append({"label": src["title"], "url": src["url"]})
    indexed["ibama-in-23-2022"]["relatedLinks"].append(
        {
            "label": "Aplicação do controle corporativo: balanço oficial de 2026",
            "url": sources["balanco"]["url"],
        }
    )
    for key in ["ibama-in-16-2025", "ibama-in-20-2025", "ibama-in-23-2020"]:
        indexed[key]["notes"].append(
            "A IN 20/2025 ajusta a Parte 9: coleta dos dados de IUMPR a partir de janeiro de 2026; relatório até 31 de julho e plano até 31 de março, com entregas iniciando em 2027. Ler a IN 16/2025 com essa alteração."
        )
    for key in ["ibama-in-23-2022", "ibama-in-28-2023"]:
        indexed[key]["notes"].append(
            "Controle corporativo e créditos são obrigações da corporação, não de um componente isolado. A aplicação em 2026 foi confirmada na publicação oficial do balanço L8 ano-base 2025."
        )
    indexed["ibama-in-5-2024"]["notes"].append(
        "O art. 28 revoga as INs 19/2021 e 22/2022. Esses atos anteriores não foram mantidos na consulta ativa. O regime ACP contempla também PROMOT, mas aqui foi vinculado somente ao recorte L8."
    )
    indexed["ibama-in-3-2023"]["notes"].append(review["sourceGaps"][0]["note"])
    for r in records:
        if r["incomingEffects"]:
            r["statusLabel"] = "Vigente com alterações vinculadas"
        if (
            r["id"].startswith("ibama-")
            and "conama-492-2018" not in [x.get("targetId") for x in r["relationships"]]
            and r["phases"] == ["L8"]
        ):
            r["relationships"].append(
                {
                    "kind": "regulamenta",
                    "label": "Resolução CONAMA nº 492/2018 — fase L8",
                    "url": indexed["conama-492-2018"]["officialUrl"],
                    "evidence": "Associação de fase e objeto conferida no texto e nos atos relacionados.",
                }
            )
        if r["phases"] == ["P8"]:
            r["relationships"].append(
                {
                    "kind": "regulamenta",
                    "label": "Resolução CONAMA nº 490/2018 — fase P8",
                    "url": indexed["conama-490-2018"]["officialUrl"],
                    "evidence": "Fase P8 de veículos pesados expressamente indicada na fonte.",
                }
            )
    records = [apply_contract(r, "proconve", review["reviewDate"]) for r in records]
    records.sort(key=lambda r: (r["year"], r["number"]), reverse=True)
    metadata = {
        "asOf": review["reviewDate"],
        "publicationDate": review["reviewDate"],
        "recordCount": len(records),
        "activeCount": len(records),
        "sourceUrl": "https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/legislacao-emissoes",
        "phaseScope": review["phaseScope"],
        "phaseCounts": {
            p: sum(p in r["phases"] for r in records) for p in ["L8", "P8"]
        },
        "systemLinkedCount": sum(bool(r["vehicleLinks"]) for r in records),
        "generalCategoryCount": sum(not r["vehicleLinks"] for r in records),
        "categoryLabels": {k: v["label"] for k, v in CATEGORIES.items()},
        "sourceGaps": review["sourceGaps"],
        "publicationPolicy": "Somente atos selecionados no recorte vigente L8/P8; revogados, fases anteriores sem vínculo atual e PROMOT M5 ficam fora desta consulta. Retificações integram a cadeia de cada ato, sem duplicar a contagem de instruções normativas.",
        "limits": [
            "Revisão dirigida aos atos e alterações localizados nas fontes oficiais; não substitui consolidação integral ou enquadramento técnico de cada veículo.",
            "A página geral de legislação de emissões foi atualizada em 2023 e a lista genérica de atos vigentes em 2022. A coleta cruzou os textos do sistema de legislação do Ibama, as alterações de 2023 a 2025, o sistema do Conama e a publicação oficial de 2026.",
            "Prazos futuros de entrega não significam que o ato ainda não entrou em vigor: a IN 20/2025 fixa coleta em 2026 e entregas em 2027.",
            review["sourceGaps"][0]["note"],
            "Categorias L8 e P8 não são intercambiáveis; combustível, massa/categoria, datas e configuração devem ser confirmados no ato aplicável.",
        ],
    }
    write_json(DIRECTORY / "active.json", {"metadata": metadata, "records": records})
    write_csv(DIRECTORY / "active.csv", records)
    print(
        json.dumps(
            {
                k: metadata[k]
                for k in [
                    "activeCount",
                    "phaseCounts",
                    "systemLinkedCount",
                    "generalCategoryCount",
                ]
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
