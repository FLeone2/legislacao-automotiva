#!/usr/bin/env python3
"""Inventory the official CONTRAN index without treating silence as proof of validity.

Dependencies: beautifulsoup4, pypdf. Downloads stay in --cache, outside the app.
The saved index, text extracts, hashes and verbatim evidence make the snapshot auditable.
"""

import argparse
import concurrent.futures
import csv
import datetime as dt
import gzip
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import time
import unicodedata
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, NavigableString
from pypdf import PdfReader

INDEX = "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran"
CONSOLIDATED = "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes_consolidadas/resolucoes-contran-homologacao"
ROOT = Path(__file__).resolve().parents[1]
MONTHS = dict(
    zip(
        "janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro".split(),
        range(1, 13),
    )
)


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def normalized(value):
    return "".join(
        c
        for c in unicodedata.normalize("NFD", value.lower())
        if unicodedata.category(c) != "Mn"
    )


def year(value):
    value = int(value)
    return value if value > 99 else value + (2000 if value < 50 else 1900)


def short_date(value):
    m = re.fullmatch(r"(\d{1,2})[./](\d{1,2})[./](\d{2,4})", clean(value))
    if m:
        try:
            return dt.date(year(m[3]), int(m[2]), int(m[1])).isoformat()
        except ValueError:
            pass
    return None


def long_dates(value):
    found = []
    for m in re.finditer(
        r"(\d{1,2})\s*[º°o]?\s+de\s+(\w+)\s+de\s+(\d{4})", value, re.I
    ):
        month = MONTHS.get(m[2].lower())
        if month:
            try:
                found.append(dt.date(int(m[3]), month, int(m[1])).isoformat())
            except ValueError:
                pass
    return found


def fetch(url, cache):
    key = hashlib.sha256(url.encode()).hexdigest()
    destination = cache / key
    if destination.exists():
        return destination.read_bytes()
    for attempt in range(3):
        try:
            with urlopen(
                Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "*/*"}),
                timeout=45,
            ) as response:
                data = response.read(40 * 1024 * 1024)
            destination.write_bytes(data)
            return data
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def links(cell):
    return [
        {"label": clean(a.get_text(" ", strip=True)), "url": urljoin(INDEX, a["href"])}
        for a in cell.select("a[href]")
        if a["href"].strip()
    ]


def blocks(cell):
    # Preserve paragraph/div boundaries; do not split a numbered linked reference.
    nodes = [x for x in cell.find_all(["p", "div"]) if not x.find(["p", "div"])]
    return [
        clean(x.get_text(" ", strip=True))
        for x in nodes
        if clean(x.get_text(" ", strip=True))
    ] or [clean(cell.get_text(" ", strip=True))]


def relation_kind(prefix):
    """Use the last explicit verb, retaining the full literal clause as evidence."""
    matches = list(
        re.finditer(
            r"\b(?:revoga(?:da|do|das|dos)?|alterad[ao]s?|altera|suspens[ao]s?|suspende|referenda|aprova)\b",
            normalized(prefix),
        )
    )
    if not matches:
        return "referencia"
    m = matches[-1]
    verb, clause = m[0], normalized(prefix[m.start() :])
    before = normalized(prefix[: m.start()].rsplit("\n", 1)[-1])
    partial = bool(
        re.search(
            r"\b(?:art\.?|arts\.?|artigo|anexo|inciso|itens|item|paragrafo|observacao)\b",
            clause + " " + before,
        )
    )
    # "Ficam revogados ... da Resolução X" is outgoing, not a repeal of this row.
    if verb.startswith("revogad"):
        if re.search(r"\b(?:ficam?|declara)\s*$", before):
            return "revoga_parcialmente" if partial else "revoga"
        return "revogada_parcialmente_por" if partial else "revogada_por"
    if verb == "revoga":
        return "revoga_parcialmente" if partial else "revoga"
    if verb.startswith("alterad"):
        return "alterada_por"
    if verb == "altera":
        return "altera"
    if verb.startswith("suspens"):
        return "suspensa_por"
    if verb == "suspende":
        return "suspende"
    return verb


def relationships(cell):
    result, prefix = [], ""
    for node in cell.descendants:
        if isinstance(node, NavigableString):
            prefix += " " + str(node)
        elif node.name in ["p", "div"] and re.search(
            r"\b(?:revoga|revogad[ao]s?|altera|alterad[ao]s?|suspens[ao]s?|suspende|referenda|aprova)\b",
            normalized(node.get_text(" ", strip=True)),
        ):
            prefix = ""
        elif node.name == "a" and node.get("href"):
            label = clean(node.get_text(" ", strip=True))
            m = re.fullmatch(r"0*(\d+)\s*/\s*(\d{2,4})", label)
            if not m:
                continue
            context = clean(prefix)
            result.append(
                {
                    "number": int(m[1]),
                    "year": year(m[2]),
                    "kind": relation_kind(context),
                    "label": label,
                    "url": urljoin(INDEX, node["href"]),
                    "evidence": clean(context[-900:] + " " + label),
                }
            )
    return result


def parse_index(html):
    soup = BeautifulSoup(html, "html.parser")
    records, supplements, raw_count = {}, [], 0
    for row in soup.select("#content-core tr"):
        cells = row.find_all("td", recursive=False)
        if len(cells) != 5:
            continue
        values = [clean(c.get_text(" ", strip=True)) for c in cells]
        m = re.match(r"^(\d+)", values[0])
        if not m:
            continue
        raw_count += 1
        number = int(m[1])
        if not short_date(values[1]) and "retifica" in normalized(values[3]):
            supplements.append(
                {
                    "number": number,
                    "publication": values[2],
                    "subject": values[3],
                    "sourceStatus": values[4],
                    "links": links(cells[0]),
                }
            )
            continue
        date = short_date(values[1])
        publication = short_date(values[2])
        primary_url = next(
            (x["url"] for x in links(cells[0]) if re.match(r"^\d", x["label"])), None
        )
        filename_year = re.search(
            r"[_-](\d{2})(?=\.(?:doc|pdf|rtf)(?:$|\?))", primary_url or "", re.I
        )
        # Preserve the basis when the date cells literally say "revogada".
        inferred_year = (
            int(date[:4])
            if date
            else int(publication[:4])
            if publication
            else year(filename_year[1])
            if filename_year
            else (1998 if number <= 9 else None)
        )
        year_basis = (
            "data_do_ato_no_indice"
            if date
            else "data_publicacao_no_indice"
            if publication
            else "nome_do_recurso_oficial"
            if filename_year
            else "serie_1998"
            if number <= 9
            else "nao_identificado"
        )
        record = {
            "id": f"contran-{number}-{inferred_year or 'ano-pendente'}",
            "number": number,
            "year": inferred_year,
            "yearBasis": year_basis,
            "date": date,
            "publicationDate": publication,
            "sourceDateText": values[1],
            "sourcePublicationText": values[2],
            "subject": values[3],
            "sourceStatus": values[4],
            "statusClauses": blocks(cells[4]),
            "officialUrl": primary_url,
            "documentLinks": links(cells[0]),
            "relatedLinks": links(cells[4]),
            "relationships": relationships(cells[4]),
            "notes": [],
        }
        if number in records:
            raise ValueError(
                f"Duplicate base resolution {number}; inspect source before continuing"
            )
        records[number] = record
    for item in supplements:
        records[item["number"]].setdefault("supplements", []).append(item)
    modified = soup.select_one(".documentModified .value")
    return list(records.values()), {
        "tableRows": raw_count,
        "supplementRows": len(supplements),
        "sourceModifiedText": clean(modified.get_text()) if modified else None,
    }


def classify_source(record):
    status = record["sourceStatus"]
    full_repeal, partial_repeal = [], []
    for clause in record["statusClauses"]:
        s = normalized(clause)
        if re.fullmatch(r"revogad[ao]\.?", s):
            full_repeal.append(clause)
        if re.search(r"^revogad[ao]\s+(?:em parte|os itens|os arts)", s):
            partial_repeal.append(clause)
        # Incoming revocation, unlike "revoga ..." or "ficam revogadas ...".
        m = re.search(r"\brevogad[ao]\s+(?:pela|a partir|em\s+\d|por\s+)", s)
        if m and not re.search(r"\bficam?\s*$", s[: m.start()]):
            if re.search(
                r"\b(?:art\.?|arts\.?|artigo|anexo|inciso|itens|item|paragrafo)\b",
                s[: m.start()],
            ):
                partial_repeal.append(clause)
            else:
                full_repeal.append(clause)
    if full_repeal:
        return "revogada", full_repeal
    if re.search(r"declarada nula", status, re.I):
        return "nula", [status]
    if re.search(r"extinta pelo cumprimento", status, re.I):
        return "prazo_encerrado", [status]
    if re.search(
        r"^(?:vigência suspensa|suspensa por|suspensa pela|efeitos suspensos)",
        status,
        re.I,
    ):
        return "suspensa", [status]
    if partial_repeal:
        return "parcialmente_revogada", partial_repeal
    if re.search(r"\bem vig(?:or|ar|o\b)|entra em vigor", status, re.I):
        return "vigencia_expressa", [
            c
            for c in record["statusClauses"]
            if re.search(r"em vig|entra em vigor", c, re.I)
        ]
    return "nao_confirmada", []


def extract_document(record, cache):
    url = record["officialUrl"]
    if not url:
        return {
            "state": "sem_link",
            "error": "O índice não oferece link primário para este ato.",
        }
    try:
        data = fetch(url, cache)
        if data.lstrip().startswith(b"%PDF"):
            reader = PdfReader(io.BytesIO(data))
            text = "\n".join(p.extract_text() or "" for p in reader.pages)
            pages = len(reader.pages)
        elif b"<html" in data[:3000].lower() or b"<!doctype" in data[:3000].lower():
            soup = BeautifulSoup(data, "html.parser")
            core = soup.select_one("#content-core")
            if not core:
                raise ValueError("HTML sem conteúdo documental reconhecido")
            text, pages = core.get_text("\n", strip=True), None
        elif data.startswith(b"{\\rtf") and shutil.which("pandoc"):
            proc = subprocess.run(
                ["pandoc", "-f", "rtf", "-t", "plain"],
                input=data,
                capture_output=True,
                check=True,
            )
            text, pages = proc.stdout.decode("utf-8"), None
        elif data.startswith(bytes.fromhex("d0cf11e0a1b11ae1")) and (
            os.environ.get("CONTRAN_ANTIWORD") or shutil.which("antiword")
        ):
            binary = os.environ.get("CONTRAN_ANTIWORD") or shutil.which("antiword")
            filename = cache / hashlib.sha256(url.encode()).hexdigest()
            proc = subprocess.run(
                [binary, "-m", "UTF-8.txt", str(filename)],
                capture_output=True,
                check=True,
            )
            text, pages = proc.stdout.decode("utf-8"), None
        else:
            return {
                "state": "formato_nao_extraido",
                "sha256": hashlib.sha256(data).hexdigest(),
                "bytes": len(data),
            }
        return {
            "state": "extraido" if len(text.strip()) > 80 else "sem_texto",
            "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data),
            "pages": pages,
            "text": text,
            "url": url,
        }
    except Exception as exc:
        return {
            "state": "falha",
            "error": f"{type(exc).__name__}: {str(exc)[:240]}",
            "url": url,
        }


def entry_clauses(text):
    text = clean(text)
    found = []
    for m in re.finditer(r"\b(?:entra|entrará|entrara)\s+em\s+vigor\b", text, re.I):
        before = text[max(0, m.start() - 80) : m.start()]
        articles = list(re.finditer(r"Art\.\s*\d+[º°.]*\s*", before))
        start = (
            max(0, m.start() - 80) + articles[-1].start()
            if articles
            else m.start() - len(before)
        )
        tail = text[m.end() : m.end() + 900]
        # A lower-case "art. 14" inside a sentence is not the next article.
        end = re.search(r"\.\s+(?=[A-ZÁÉÍÓÚ])|\s+Art\.\s*\d", tail)
        found.append(
            text[start : m.end() + (end.start() + 1 if end else len(tail))].strip()
        )
    return found


def temporal_flags(record, as_of):
    subject, status = normalized(record["subject"]), record["sourceStatus"]
    flags = []
    years = re.findall(
        r"(?:janeiro a dezembro|janeiro à dezembro|janeiro ate dezembro) de (20\d{2})",
        subject,
    )
    if years and int(years[-1]) < as_of.year:
        flags.append(
            {
                "kind": "periodo_encerrado",
                "evidence": record["subject"],
                "note": "O objeto informado na ementa é um calendário anual anterior à data de referência.",
            }
        )
    if re.search(
        r"covid|pandemia|calamidade|prorrog|excepcional|emergencia (?:de saude|em saude|sanitaria|publica)",
        subject,
    ):
        flags.append(
            {
                "kind": "aplicacao_temporal_condicionada",
                "evidence": record["subject"],
                "note": "Verificar prazo, território e evento: vigência formal não comprova efeitos aplicáveis hoje.",
            }
        )
    if re.search(r"art(?:s)?\..{0,35}vigorarão até", status, re.I):
        dates = long_dates(status)
        flags.append(
            {
                "kind": "dispositivos_com_prazo_encerrado"
                if dates and dates[0] < as_of.isoformat()
                else "dispositivos_temporarios",
                "evidence": status,
                "note": "O prazo pertence a dispositivos, sem presumir revogação integral da resolução.",
            }
        )
    if re.search(r"efeitos do art|art.{0,15}suspens", normalized(status)):
        flags.append(
            {
                "kind": "suspensao_parcial",
                "evidence": status,
                "note": "A suspensão informada é parcial.",
            }
        )
    return flags


def cross_reference(records, as_of):
    indexed = {(r["number"], r["year"]): r for r in records}
    for r in records:
        r["incomingEffects"] = []
    for source in records:
        for rel in source["relationships"]:
            target = indexed.get((rel["number"], rel["year"]))
            if target and rel["kind"] in [
                "revoga",
                "revoga_parcialmente",
                "altera",
                "suspende",
            ]:
                dates = long_dates(rel["evidence"])
                future = bool(dates and dates[0] > as_of.isoformat())
                target["incomingEffects"].append(
                    {
                        "sourceId": source["id"],
                        "kind": rel["kind"],
                        "sourceUrl": source["officialUrl"],
                        "evidence": rel["evidence"],
                        "futureDateInEvidence": future,
                    }
                )
    for target in records:
        incoming = [
            x
            for x in target["incomingEffects"]
            if x["kind"] == "revoga" and not x["futureDateInEvidence"]
        ]
        if incoming and target["status"] not in ["revogada", "nula"]:
            target["notes"].append(
                "O cruzamento com a anotação de outro ato no mesmo índice indica revogação integral, mesmo sem anotação atualizada na própria linha."
            )
            target["status"] = "revogada"
            target["statusEvidence"].extend(x["evidence"] for x in incoming)


def entry_assessment(record):
    evidence = record.get("entryIntoForceEvidence") or record["statusEvidence"]
    dates = []
    for clause in evidence:
        m = re.search(r"(?:entra|entrará|entrara) em vigor", clause, re.I)
        tail = clause[m.end() :] if m else clause
        dates.extend(long_dates(tail))
        if (
            re.search(r"na data de sua publica", tail, re.I)
            and record["publicationDate"]
        ):
            dates.append(record["publicationDate"])
        days = re.search(r"em (\d+) dias ap[oó]s a data de sua publica", tail, re.I)
        if days and record["publicationDate"]:
            dates.append(
                (
                    dt.date.fromisoformat(record["publicationDate"])
                    + dt.timedelta(days=int(days[1]))
                ).isoformat()
            )
    return {
        "datesMentioned": sorted(set(dates)),
        "note": "Datas extraídas da cláusula; múltiplas datas e referências a outros atos exigem leitura do trecho, sem decisão automática de aplicabilidade.",
    }


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cache", type=Path, default=Path("/workspace/scratch/contran/cache")
    )
    parser.add_argument("--index-file", type=Path)
    parser.add_argument("--as-of", default=dt.date.today().isoformat())
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument(
        "--rebuild-from-snapshot",
        action="store_true",
        help="Reclassify saved HTML and extracts without making network requests",
    )
    args = parser.parse_args()
    as_of = dt.date.fromisoformat(args.as_of)
    args.cache.mkdir(parents=True, exist_ok=True)
    output = ROOT / "data/contran"
    (output / "sources").mkdir(parents=True, exist_ok=True)
    html = (
        gzip.decompress((output / "sources/index.html.gz").read_bytes())
        if args.rebuild_from_snapshot
        else (
            args.index_file.read_bytes()
            if args.index_file
            else fetch(INDEX, args.cache)
        )
    )
    records, info = parse_index(html)
    for record in records:
        record["status"], record["statusEvidence"] = classify_source(record)
    cross_reference(records, as_of)
    candidates = [
        r for r in records if r["status"] not in ["revogada", "nula", "prazo_encerrado"]
    ]
    extracts = {}
    saved = (
        json.loads(
            gzip.decompress((output / "sources/text-extracts.json.gz").read_bytes())
        )
        if args.rebuild_from_snapshot
        else {}
    )
    print(
        f"{len(records)} atos, {len(candidates)} documentos para conferir; {info}",
        flush=True,
    )
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:

        def document(r):
            if args.rebuild_from_snapshot:
                return saved.get(
                    r["id"],
                    {
                        "state": "nao_coletado",
                        "error": "Não há extração preservada para este ato.",
                    },
                )
            return extract_document(r, args.cache)

        pending = {pool.submit(document, r): r for r in candidates}
        for i, future in enumerate(concurrent.futures.as_completed(pending), 1):
            record = pending[future]
            doc = future.result()
            extracts[record["id"]] = doc
            record["documentCheck"] = {k: v for k, v in doc.items() if k != "text"}
            record["entryIntoForceEvidence"] = entry_clauses(doc.get("text", ""))
            if (
                record["status"] == "nao_confirmada"
                and record["entryIntoForceEvidence"]
            ):
                record["status"] = "vigencia_texto"
                record["statusEvidence"] = record["entryIntoForceEvidence"]
            record["temporalFlags"] = temporal_flags(record, as_of)
            record["entryDateAssessment"] = entry_assessment(record)
            if i % 20 == 0 or doc["state"] != "extraido":
                print(
                    f"{i}/{len(candidates)}: {record['number']} {doc['state']}",
                    flush=True,
                )
    counts = {
        s: sum(r["status"] == s for r in records)
        for s in sorted({r["status"] for r in records})
    }
    metadata = {
        "schemaVersion": 1,
        "asOf": args.as_of,
        "retrievedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sourceUrl": INDEX,
        "sourceSha256": hashlib.sha256(html).hexdigest(),
        **info,
        "recordCount": len(records),
        "statusCounts": counts,
        "missingNumbersInRange": sorted(
            set(range(1, max(r["number"] for r in records) + 1))
            - {r["number"] for r in records}
        ),
        "scope": "Atos do índice oficial indicado (série de 1998 a 2026). Não inventaria integralmente a série anterior ao CTB.",
        "limits": [
            "Data de consulta não é data de atualização do portal. Não foi executada busca exaustiva no DOU posterior à última atualização informada.",
            "Vigência indicada resulta de evidências do índice e dos textos acessíveis; ausência de anotação de revogação não certifica vigência.",
            "Aplicação concreta depende de categoria, datas, anexos, transições, alterações, suspensões e do perfil do veículo.",
            "Textos-base e cláusulas de entrada em vigor não equivalem a consolidação jurídica de todos os dispositivos.",
        ],
    }
    write_json(output / "inventory.json", {"metadata": metadata, "records": records})
    with gzip.open(output / "sources/index.html.gz", "wb") as f:
        f.write(html)
    with gzip.open(
        output / "sources/text-extracts.json.gz", "wt", encoding="utf-8"
    ) as f:
        json.dump(extracts, f, ensure_ascii=False)
    print(json.dumps(counts, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
