#!/usr/bin/env python3
"""Generate texts/<act>.md: the full text of each published act, with
its annexes, as clean Markdown for reading on the site and for AI consultation.

The text comes from the official copy in pdfs/ when it exists, otherwise from the
official text already archived in data/*/sources. Each file records its source
address, hash and date. The text is a consultation copy: it does not change the
legal state, review depth, applicability or publication recorded for the act, and
it is never edited by hand. Run with --check to verify the generated files.
"""

import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "texts"
NOTICE = (
    "Cópia de consulta do texto oficial. Não substitui a publicação oficial e não "
    "altera a situação jurídica, a revisão, a aplicabilidade ou a publicação "
    "registradas para o ato."
)

# ---------------------------------------------------------------------------
# Cleaning


NOISE = [
    re.compile(r"^\d{2}/\d{2}/\d{4},?\s+\d{2}:\d{2}\s.*(?:Imprensa Nacional|DOU)\s*$"),
    re.compile(r"^https?://\S+(?:\s+\d+/\d+)?$"),
    re.compile(r"^Este conteúdo não substitui o publicado na versão certificada\.?$"),
    re.compile(r"^Fl\.\s*\d+\s+da\s+Portaria.*$", re.I),
    re.compile(r"^\d{1,4}(?:/\d{1,4})?$"),
    re.compile(r"^Este documento pode ser verificado no endereço eletrônico.*$"),
    re.compile(r"^http://www\.in\.gov\.br/autenticidade\.html.*$"),
    re.compile(r"^Documento assinado digitalmente conforme MP.*$"),
]
LIGATURES = {"ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl", "­": ""}

ROMAN = r"[IVXLC]+"
ARTICLE = re.compile(
    r"^Art\.?\s*(\d+)\s*(?:º|°|o\b)?(?:-([A-Z]))?\.?\s*[-–—]?\s*", re.I
)
PARAGRAPH = re.compile(r"^§\s*(\d+)\s*(?:º|°|o\b)?\.?\s*[-–—]?\s*")
SOLE = re.compile(r"^Parágrafo\s+único\.?\s*[-–—:]?\s*", re.I)
INCISO = re.compile(rf"^({ROMAN})\s*[-–—]\s+")
ALINEA = re.compile(r"^([a-z])\)\s+")
DIVISION = re.compile(
    r"^(CAPÍTULO|TÍTULO|SEÇÃO|SUBSEÇÃO|LIVRO)\s+([IVXLC]+|ÚNICO|ÚNICA)\b", re.I
)
ANNEX = re.compile(
    rf"^ANEXO(?:\s+({ROMAN}|[A-Z]|ÚNICO|\d+)(?![A-Za-zÀ-ú]))?\s*(?:[-–—:.]\s*)?(.*)$"
)
NUMBERED = re.compile(r"^\d+(?:\.\d+)*\.\s+\S|^\d+(?:\.\d+)+\s+\S")
STARTS = [ARTICLE, PARAGRAPH, SOLE, INCISO, ALINEA, DIVISION, NUMBERED]
START_EXTRA = re.compile(
    r"^(?:•|–\s|-\s|Tabela\s+\d|Figura\s+\d|Quadro\s+\d|Nota\s*\d*[:.]"
    r"|DIÁRIO OFICIAL DA UNIÃO|Publicado em:|Órgão:|CONSIDERANDO|Considerando"
    r"|O (?:CONSELHO|PRESIDENTE|MINISTRO|DIRETOR|SECRETÁRIO|SUPERINTENDENTE)\b"
    r"|A (?:PRESIDENTE|MINISTRA|DIRETORA|SECRETÁRIA|SUPERINTENDENTE)\b)"
)
ACT_TITLE = re.compile(
    r"^(?:RESOLUÇÃO|PORTARIA|INSTRUÇÃO NORMATIVA|DELIBERAÇÃO|DECRETO|LEI|ATO)\b[^a-z]{4,}$"
)
# Devices that a flattened HTML text still announces inline.
INLINE_DEVICE = re.compile(
    r"\s+(?=(?:Art\.\s*\d+\s*[ºo°]?(?:-[A-Z])?\.?\s+[A-ZÀ-Ú]|§\s*\d+\s*[ºo°]\s+[A-ZÀ-Ú]"
    r"|Parágrafo único|[IVXLC]+\s*[-–]\s|[a-z]\)\s|CAPÍTULO\s|SEÇÃO\s"
    r"|ANEXO\b(?!\s+d[aeo]s?\b)|\d+(?:\.\d+)+\.?\s+[A-ZÀ-Ú]|\d{1,2}\.\s+[A-ZÀ-Ú]{3,}))"
)


def clean_lines(text):
    for old, new in LIGATURES.items():
        text = text.replace(old, new)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    if text.count("\n") < len(text) / 1500:  # flattened HTML text
        text = INLINE_DEVICE.sub("\n", text)
    lines = []
    for raw in text.replace("\r", "").split("\n"):
        line = re.sub(r"[ \t ]+", " ", raw).strip()
        if line and any(pattern.match(line) for pattern in NOISE):
            continue
        lines.append(line)
    # A capitalised line printed on every page ("ANEXO DA PORTARIA INMETRO Nº 200/
    # 2021") is a running header: keep its first occurrence only.
    counts = {}
    for line in lines:
        if len(line) >= 20 and re.sub(r"[ºª°]", "", line).isupper():
            counts[line] = counts.get(line, 0) + 1
    seen = set()
    kept = []
    for line in lines:
        if counts.get(line, 0) >= 3:
            if line in seen:
                continue
            seen.add(line)
        kept.append(line)
    return kept


ROMAN_VALUES = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100}


def roman_value(text):
    total, previous = 0, 0
    for char in reversed(text.upper()):
        value = ROMAN_VALUES.get(char, 0)
        if not value:
            return 0
        total, previous = (
            (total - value, previous) if value < previous else (total + value, value)
        )
    return total


def split_glued_label(rest, expected):
    """'IINSTALAÇÃO' after Anexo I is 'II' + 'NSTALAÇÃO'? No: the label is the
    roman prefix that continues the sequence (expected), the rest is the title."""
    match = re.match(r"^([IVXLC]+)(?=[A-ZÀ-Ú])", rest)
    if not match:
        return None, rest
    prefix = match[1]
    for size in range(len(prefix), 0, -1):
        if roman_value(prefix[:size]) == expected:
            return prefix[:size], rest[size:]
    return None, rest


def is_caps(text):
    return re.sub(r"[ºª°]", "", text).isupper()


def is_annex_heading(line):
    match = ANNEX.match(line)
    if not match:
        return None
    rest = match[2].strip()
    # "ANEXO desta Resolução" or a sentence is a reference, not a heading. A short
    # line all in capitals ("ANEXO DA PORTARIA INMETRO Nº 200/2021") is a heading.
    titled = is_caps(line) and len(line) < 140
    if (
        rest
        and not titled
        and (rest[:1].islower() or re.match(r"^(d[aeo]s?|à|ao)\b", rest, re.I))
    ):
        return None
    if rest.endswith(("..", "…")):
        return None
    return match


def starts_block(line):
    return (
        any(pattern.match(line) for pattern in STARTS)
        or START_EXTRA.match(line)
        or is_annex_heading(line)
    )


def paragraphs(lines):
    """Join wrapped lines; a new block starts at a blank line or a device."""
    blocks, current = [], []
    for line in lines:
        if not line:
            if current:
                blocks.append(" ".join(current))
                current = []
            continue
        heading_above = (
            current
            and len(current[-1]) > 8
            and is_caps(current[-1])
            and not current[-1].endswith(("-", "–", ",", ";"))
            and not is_caps(line)
        )
        if current and (starts_block(line) or heading_above or ACT_TITLE.match(line)):
            blocks.append(" ".join(current))
            current = []
        if current and current[-1].endswith("-") and line[:1].islower():
            current[-1] = current[-1][:-1] + line  # word broken across lines
        else:
            current.append(line)
    if current:
        blocks.append(" ".join(current))
    return [re.sub(r"\s+", " ", block).strip() for block in blocks if block.strip()]


# ---------------------------------------------------------------------------
# Markdown


def anchor_label(value):
    value = value.lower().replace("ú", "u").replace("ç", "c").replace("ã", "a")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


class Writer:
    def __init__(self):
        self.lines = []
        self.used = set()
        self.article = None
        self.annexes = []
        self.annex_number = 0
        self.annex_anchor = None

    def anchor(self, name):
        base, number = name, 2
        while name in self.used:
            name, number = f"{base}-{number}", number + 1
        self.used.add(name)
        return name

    def block(self, text, prefix=""):
        self.lines.append(text)
        self.lines.append("")

    def render(self, blocks, annex_prefix=""):
        index = 0
        while index < len(blocks):
            text = blocks[index]
            annex = is_annex_heading(text)
            if annex and (text.isupper() or len(text) < 160):
                label = (annex[1] or "").upper()
                title = annex[2].strip()
                if not label:
                    glued, rest = split_glued_label(title, self.annex_number + 1)
                    if glued:
                        label, title = glued, rest.strip()
                title = re.sub(r"(AP[ÊE]NDICE\s+\d+)(?=[A-ZÀ-Ú])", r"\1 — ", title)
                appendix = re.match(
                    r"^AP[ÊE]NDICE\s+(\d+)\s*(?:—\s*)?(.*)$", title, re.I
                )
                if appendix and self.annex_anchor:
                    name = self.anchor(f"{self.annex_anchor}-apendice-{appendix[1]}")
                    rest = appendix[2].strip()
                    self.block(
                        f'<a id="{name}"></a>\n### Apêndice {appendix[1]}'
                        + (f" — {rest}" if rest else "")
                    )
                    index += 1
                    continue
                if roman_value(label):
                    self.annex_number = roman_value(label)
                if (
                    not title
                    and index + 1 < len(blocks)
                    and is_caps(blocks[index + 1])
                    and len(blocks[index + 1]) < 300
                    and not is_annex_heading(blocks[index + 1])
                ):
                    index += 1
                    title = blocks[index]
                name = self.anchor(
                    f"{annex_prefix}anexo-{anchor_label(label) or 'unico'}"
                )
                heading = f"Anexo {label}".strip() if label else "Anexo"
                self.annex_anchor = name
                self.annexes.append({"label": heading, "anchor": name})
                self.article = None
                self.block(
                    f'<a id="{name}"></a>\n## {heading}'
                    + (f" — {title}" if title else "")
                )
            elif DIVISION.match(text) and len(text) < 160:
                title = text
                if (
                    index + 1 < len(blocks)
                    and blocks[index + 1].isupper()
                    and len(blocks[index + 1]) < 160
                ):
                    index += 1
                    title = f"{text} — {blocks[index]}"
                self.block(f"### {title}")
            elif match := ARTICLE.match(text):
                number = match[1] + (f"-{match[2].lower()}" if match[2] else "")
                self.article = number
                name = self.anchor(f"art-{number}")
                label = text[: match.end()].strip().rstrip("-–—").strip()
                self.block(
                    f'<a id="{name}"></a>**{label}** {text[match.end() :]}'.rstrip()
                )
            elif (match := PARAGRAPH.match(text)) and self.article:
                name = self.anchor(f"art-{self.article}-p{match[1]}")
                label = text[: match.end()].strip().rstrip("-–—").strip()
                self.block(
                    f'<a id="{name}"></a>**{label}** {text[match.end() :]}'.rstrip()
                )
            elif (match := SOLE.match(text)) and self.article:
                name = self.anchor(f"art-{self.article}-pu")
                self.block(
                    f'<a id="{name}"></a>**Parágrafo único.** {text[match.end() :]}'.rstrip()
                )
            elif ACT_TITLE.match(text):
                self.block(f"**{text}**")
            elif re.match(r"^(DIÁRIO OFICIAL DA UNIÃO|Publicado em:|Órgão:)", text):
                self.block(f"*{text}*")
            else:
                self.block(text)
            index += 1

    def text(self):
        return "\n".join(self.lines).strip() + "\n"


def sha(data):
    return hashlib.sha256(data).hexdigest()


# ---------------------------------------------------------------------------
# Sources


def jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def gz(path):
    return json.loads(gzip.decompress(path.read_bytes()))


def cards():
    result = {}
    for path in sorted((ROOT / "knowledge/acts").glob("*.md")):
        front = path.read_text().split("---")[1]
        card = {}
        for line in front.strip().splitlines():
            key, value = line.split(": ", 1)
            card[key] = json.loads(value)
        result[card["id"]] = card
    return result


def copy_text(entry):
    pages = json.loads((ROOT / entry["text"]).read_text())["pages"]
    return "\n".join(pages)


def archived_sources(card_ids):
    """Official texts already archived in the repository, by act ID."""
    found = {}
    contran = ROOT / "data/contran/sources/text-extracts.json.gz"
    if contran.exists():
        for act_id, item in gz(contran).items():
            if act_id in card_ids and item.get("text"):
                found[act_id] = {
                    "text": item["text"],
                    "url": item.get("url"),
                    "sha256": item.get("sha256"),
                    "origin": "archived_pdf_extract",
                }
    proconve = ROOT / "data/proconve/sources/evidence.json.gz"
    if proconve.exists():
        sources = gz(proconve)["sources"]
        for act_id in card_ids:
            record = ROOT / f"data/site/records/proconve/{act_id}.json"
            urls = []
            if record.exists():
                data = json.loads(record.read_text())
                urls = [data.get("officialUrl") or ""] + [
                    link.get("url", "") for link in data.get("relatedLinks", [])
                ]
            keys = [m[1] for u in urls if (m := re.search(r"legislacao=(\d+)", u))]
            keys += {
                "conama-490-2018": ["conama490"],
                "conama-492-2018": ["conama492"],
                "ibama-in-6-2025": ["in6-2025-certified"],
                "ibama-in-26-2020": ["in26-2020-certified"],
            }.get(act_id, [])
            for key in keys:
                item = sources.get(key)
                text = item and (item.get("rawText") or item.get("text"))
                if text:
                    found.setdefault(
                        act_id,
                        {
                            "text": text,
                            "url": item.get("url"),
                            "sha256": item.get("sha256"),
                            "origin": "archived_official_text",
                        },
                    )
                    break
    anatel = ROOT / "data/anatel/sources/evidence.json.gz"
    if anatel.exists():
        sources = gz(anatel)["sources"]
        for act_id in card_ids:
            record = ROOT / f"data/site/records/anatel/{act_id}.json"
            if not record.exists():
                continue
            item = sources.get(json.loads(record.read_text()).get("sourceKey"))
            if item and item.get("text"):
                found.setdefault(
                    act_id,
                    {
                        "text": item["text"],
                        "url": item.get("url"),
                        "sha256": item.get("sha256"),
                        "origin": "archived_official_text",
                    },
                )
    return found


def missing_reasons():
    path = ROOT / "pdfs/faltantes.csv"
    if not path.exists():
        return {}
    import csv

    return {
        row["chave"]: row["motivo"]
        for row in csv.DictReader(path.read_text().splitlines())
        if row["tipo"] == "ato"
    }


# ---------------------------------------------------------------------------
# Build


def front_matter(values):
    lines = ["---"]
    for key in sorted(values):
        lines.append(
            f"{key}: {json.dumps(values[key], ensure_ascii=False, sort_keys=True)}"
        )
    lines.append("---")
    return "\n".join(lines) + "\n\n"


def build():
    all_cards = cards()
    manifest_path = ROOT / "pdfs/manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    items = manifest.get("items", {})
    annex_files = manifest.get("annexes", {})
    archived = archived_sources(set(all_cards))
    reasons = missing_reasons()
    outputs = {}
    summary = []
    for act_id, card in sorted(all_cards.items()):
        copy = items.get(act_id)
        if copy:
            body = copy_text(copy)
            source = {
                "origin": copy.get("origin"),
                "retrievedAt": copy.get("retrievedAt"),
                "sha256": copy.get("sha256"),
                "url": copy.get("sourceUrl"),
                "file": copy.get("file"),
            }
            if copy.get("via"):
                source["via"] = copy["via"]
        elif act_id in archived:
            item = archived[act_id]
            body = item["text"]
            source = {
                "origin": item["origin"],
                "sha256": item["sha256"],
                "url": item["url"],
            }
        else:
            body, source = None, None

        writer = Writer()
        title = card.get("title") or act_id
        writer.block(f"# {title}")
        annexes = []
        if body:
            writer.render(paragraphs(clean_lines(body)))
            for number, entry in enumerate(annex_files.get(act_id, []), start=1):
                kind = entry.get("kind", "anexo")
                writer.block(
                    f'<a id="arquivo-{number}"></a>\n---\n\n'
                    f"*Documento publicado em arquivo próprio ({'anexo' if kind == 'anexo' else 'documento complementar'}): "
                    f"<{entry.get('sourceUrl')}> · SHA-256 `{entry.get('sha256', '')[:16]}…`*"
                )
                before = len(writer.annexes)
                writer.render(
                    paragraphs(clean_lines(copy_text(entry))), annex_prefix=""
                )
                annexes.append(
                    {
                        "file": entry.get("file"),
                        "kind": kind,
                        "sections": [a["label"] for a in writer.annexes[before:]],
                        "sha256": entry.get("sha256"),
                        "url": entry.get("sourceUrl"),
                    }
                )
        else:
            reason = reasons.get(act_id, "Documento oficial ainda não obtido.")
            writer.block(
                f"> Texto completo ainda não disponível neste acervo. Motivo registrado: {reason}"
            )
            writer.block(f"Fonte oficial: <{card.get('officialUrl')}>")

        text = writer.text()
        meta = {
            "actCard": f"knowledge/acts/{act_id}.md",
            "agency": card.get("agency"),
            "annexFiles": annexes,
            "annexSections": [a["label"] for a in writer.annexes],
            "fullTextAvailable": bool(body),
            "id": act_id,
            "kind": "law_text",
            "notice": NOTICE,
            "officialUrl": card.get("officialUrl"),
            "source": source,
            "textSha256": sha(text.encode()),
            "title": title,
        }
        outputs[OUTPUT / f"{act_id}.md"] = front_matter(meta) + text
        summary.append(
            {
                "id": act_id,
                "fullTextAvailable": bool(body),
                "origin": source and source["origin"],
                "annexFiles": len(annexes),
                "annexSections": len(writer.annexes),
                "chars": len(text),
            }
        )
    index = {
        "schemaVersion": 1,
        "purpose": NOTICE,
        "acts": summary,
        "counts": {
            "acts": len(summary),
            "fullText": sum(1 for s in summary if s["fullTextAvailable"]),
            "annexFiles": sum(s["annexFiles"] for s in summary),
        },
    }
    outputs[OUTPUT / "index.json"] = (
        json.dumps(index, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
    )
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Só conferir os arquivos")
    args = parser.parse_args()
    outputs = build()
    if args.check:
        stale = [p for p, c in outputs.items() if not p.exists() or p.read_text() != c]
        extra = (
            [p for p in OUTPUT.glob("*") if p not in outputs] if OUTPUT.exists() else []
        )
        if stale or extra:
            print(
                f"texts desatualizado: {len(stale)} diferentes, {len(extra)} sobrando"
            )
            return 1
        print(f"texts: {len(outputs) - 1} textos conferidos")
        return 0
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for path in OUTPUT.glob("*"):
        if path not in outputs:
            path.unlink()
    for path, content in outputs.items():
        if not path.exists() or path.read_text() != content:
            path.write_text(content)
    counts = json.loads(outputs[OUTPUT / "index.json"])["counts"]
    print(
        f"texts: {counts['acts']} atos, {counts['fullText']} com texto completo, "
        f"{counts['annexFiles']} arquivos de anexo"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
