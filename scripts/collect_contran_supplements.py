#!/usr/bin/env python3
"""Collect the official historical archive, annex and directed-review source texts."""

import argparse
import gzip
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import zipfile
from pathlib import Path
from pypdf import PdfReader
from map_contran import ROOT, fetch, extract_document, year

HISTORY = "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/res_ant_1998_new.zip"
ANNEX = "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9932023Anexo.pdf"


def save(path, value):
    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cache", type=Path, default=Path("/workspace/scratch/contran/cache")
    )
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    sources = ROOT / "data/contran/sources"
    data = fetch(HISTORY, args.cache)
    archive = zipfile.ZipFile(io.BytesIO(data))
    records, supplements = {}, []
    for info in archive.infolist():
        name = info.filename
        if name.endswith("/") or "_anexo" in name.lower():
            continue
        short = Path(name).name
        match = re.match(r"R(\d+)-(\d{2})\.", short, re.I) or re.match(
            r"Resolucao(\d+?)(19\d{2})\.", short, re.I
        )
        if not match:
            raise ValueError("Nome de documento histórico não reconhecido: " + name)
        number, y = int(match[1]), year(match[2])
        content = archive.read(name)
        key = f"contran-{number}-{y}"
        state, text = "formato_nao_extraido", ""
        try:
            if content.startswith(b"%PDF"):
                text = "\n".join(
                    p.extract_text() or "" for p in PdfReader(io.BytesIO(content)).pages
                )
            elif content.startswith(b"{\\rtf") and shutil.which("pandoc"):
                text = subprocess.run(
                    ["pandoc", "-f", "rtf", "-t", "plain"],
                    input=content,
                    capture_output=True,
                    check=True,
                ).stdout.decode()
            elif os.environ.get("CONTRAN_ANTIWORD") or shutil.which("antiword"):
                binary = os.environ.get("CONTRAN_ANTIWORD") or shutil.which("antiword")
                local = args.cache / hashlib.sha256(content).hexdigest()
                local.write_bytes(content)
                text = subprocess.run(
                    [binary, "-m", "UTF-8.txt", str(local)],
                    capture_output=True,
                    check=True,
                ).stdout.decode()
            state = "extraido" if len(text.strip()) > 80 else "sem_texto"
        except Exception:
            state = "falha"
        entry = {
            "id": key,
            "number": number,
            "year": y,
            "archivePath": name,
            "text": text,
            "state": state,
            "sha256": hashlib.sha256(content).hexdigest(),
            "bytes": len(content),
            "url": HISTORY,
        }
        if key in records:
            supplements.append(entry)
        else:
            records[key] = entry
    metadata = {
        "url": HISTORY,
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
        "files": [
            {"name": i.filename, "size": i.file_size} for i in archive.infolist()
        ],
    }
    save(
        sources / "historical-extracts.json.gz",
        {
            "metadata": metadata,
            "records": list(records.values()),
            "supplements": supplements,
        },
    )
    save(
        sources / "993-annex.json.gz",
        extract_document({"officialUrl": ANNEX}, args.cache),
    )
    inventory = json.loads((sources.parent / "inventory.json").read_text())
    with gzip.open(sources / "text-extracts.json.gz", "rt") as f:
        extracts = json.load(f)
    reviews = json.loads((sources.parent / "reviewed-effects.json").read_text())
    ids = {e["sourceId"] for e in reviews["effects"]}
    for r in inventory["records"]:
        if r["id"] in ids and r["id"] not in extracts:
            extracts[r["id"]] = extract_document(r, args.cache)
    save(sources / "text-extracts.json.gz", extracts)
    print(
        f"{len(records)} atos-base históricos preservados; anexo e fontes de conferência atualizados."
    )


if __name__ == "__main__":
    main()
