#!/usr/bin/env python3
"""Retrieve a bounded set of public official PDFs without changing legal review.

Only genuine PDF bytes with a matching title are accepted. This separate
prototype inventory never writes the original PDF manifest or editorial states.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 24 * 1024 * 1024
TRANSPORTS = "https://www.gov.br/transportes/pt-br/assuntos/transito/"
DOCUMENTS = [
    {
        "actId": "inmetro-145-2022",
        "variant": "original",
        "urls": [
            "https://sistema-sil.inmetro.gov.br/rtac/RTAC002960.pdf",
            "https://www.inmetro.gov.br/legislacao/rtac/pdf/RTAC002960.pdf",
        ],
        "titlePattern": r"PORTARIA.{0,20}145.{0,40}2022",
        "sourcePage": "https://portaliq.mdic.gov.br/busca-aplicada/central-de-consultas/portaria-inmetro-no-1452022?layout=norma_detalhe",
        "primary": True,
    },
    {
        "actId": "senatran-095",
        "variant": "original",
        "urls": [
            TRANSPORTS
            + "arquivos-senatran/portarias/2022/Portaria9902022.pdf/@@display-file/file"
        ],
        "titlePattern": r"PORTARIA.{0,30}990.{0,60}2022",
        "primary": False,
    },
    {
        "actId": "senatran-095",
        "variant": "republication_2022-08-19",
        "urls": [
            TRANSPORTS
            + "arquivos-senatran/portarias/2022/Portaria9902022R.pdf/@@display-file/file"
        ],
        "titlePattern": r"PORTARIA.{0,30}990.{0,60}2022",
        "primary": True,
    },
    {
        "actId": "contran-954-2022",
        "variant": "original",
        "urls": [
            TRANSPORTS
            + "conteudo-contran/resolucoes/Resolucao9542022.pdf/@@display-file/file"
        ],
        "titlePattern": r"RESOLU.{0,30}954.{0,60}2022",
        "primary": True,
    },
    {
        "actId": "contran-915-2022",
        "variant": "original",
        "urls": [
            TRANSPORTS
            + "conteudo-contran/resolucoes/Resolucao9152022.pdf/@@display-file/file"
        ],
        "titlePattern": r"RESOLU.{0,30}915.{0,60}2022",
        "primary": True,
    },
    {
        "actId": "conama-490-2018",
        "variant": "official_publication",
        "urls": [
            "https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=767"
        ],
        "titlePattern": r"RESOLU.{0,35}490.{0,75}2018",
        "primary": True,
    },
    {
        "actId": "conama-492-2018",
        "variant": "official_publication",
        "urls": [
            "https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=765"
        ],
        "titlePattern": r"RESOLU.{0,35}492.{0,75}2018",
        "primary": True,
    },
]


def official_url(url):
    parsed = urlparse(url)
    return parsed.scheme == "https" and (parsed.hostname or "").endswith(".gov.br")


def retrieve(document):
    failures = []
    for url in document["urls"]:
        try:
            if not official_url(url):
                raise ValueError("not an HTTPS official source")
            request = Request(
                url,
                headers={
                    "User-Agent": "legislacao-automotiva/1.0",
                    "Accept": "application/pdf",
                },
            )
            with urlopen(request, timeout=30) as response:
                final_url = response.geturl()
                content_type = response.headers.get("Content-Type", "")
                if not official_url(final_url):
                    raise ValueError("final source is not an official HTTPS host")
                data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES or not data.startswith(b"%PDF-"):
                raise ValueError("source did not return bounded PDF bytes")
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "document.pdf"
                path.write_bytes(data)
                result = subprocess.run(
                    ["pdftotext", "-f", "1", "-l", "2", str(path), "-"],
                    capture_output=True,
                    check=True,
                    timeout=20,
                )
                text = " ".join(result.stdout.decode("utf-8").split())
            match = re.search(document["titlePattern"], text, re.IGNORECASE)
            if not match:
                raise ValueError("PDF title did not match requested act")
            local_path = f"pdfs/prototype/{document['actId']}-{document['variant']}.pdf"
            destination = ROOT / local_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            if not destination.exists() or destination.read_bytes() != data:
                destination.write_bytes(data)
            return {
                "actId": document["actId"],
                "variant": document["variant"],
                "primary": document["primary"],
                "status": "verified_pdf",
                "url": url,
                "finalUrl": final_url,
                "path": local_path,
                "byteLength": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
                "contentType": content_type,
                "header": "%PDF-",
                "titleEvidence": match.group(0),
                "checkedAt": date.today().isoformat(),
                "sourcePage": document.get("sourcePage"),
            }
        except Exception as error:
            failures.append(
                {"url": url, "error": f"{type(error).__name__}: {error}"[:250]}
            )
    return {
        "actId": document["actId"],
        "variant": document["variant"],
        "primary": document["primary"],
        "status": "unavailable",
        "checkedAt": date.today().isoformat(),
        "attempts": failures,
        "sourcePage": document.get("sourcePage"),
    }


def main():
    with ThreadPoolExecutor(max_workers=4) as executor:
        records = list(executor.map(retrieve, DOCUMENTS))
    payload = {
        "schemaVersion": 1,
        "purpose": "Cópias públicas de consulta; acesso e hash não alteram revisão jurídica, vigência ou aplicabilidade.",
        "records": records,
    }
    target = ROOT / "data/prototype/pdf-review.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    for record in records:
        print(
            record["actId"],
            record["variant"],
            record["status"],
            record.get("byteLength", ""),
        )


if __name__ == "__main__":
    main()
