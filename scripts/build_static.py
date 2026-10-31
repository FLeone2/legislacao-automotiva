#!/usr/bin/env python3
"""Build a static artifact from an explicit allowlist; never publish audit inputs."""

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def copy_knowledge(target):
    source = ROOT / "knowledge"
    manifest = json.loads((source / "manifest.json").read_text())
    for name, expected in manifest["artifacts"].items():
        path = (source / name).resolve()
        if not path.is_relative_to(source.resolve()) or path.suffix not in {
            ".md",
            ".json",
            ".jsonl",
        }:
            raise ValueError("Knowledge publication path is not allowed: " + name)
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError("Stale knowledge artifact: " + name)
        output = target / "knowledge" / name
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, output)
    shutil.copy2(source / "manifest.json", target / "knowledge/manifest.json")
    # Public document extractions have their own checked manifest. Raw receipts
    # and extraction inputs stay in the repository, outside the published bank.
    prototype = source / "prototype"
    if (prototype / "manifest.json").exists():
        document_manifest = json.loads((prototype / "manifest.json").read_text())
        if document_manifest.get("knowledgeRevision") != manifest["revision"]:
            raise ValueError("Document bank uses a stale canonical knowledge revision")
        receipts = ROOT / "data/prototype/texts-manifest.json"
        if (
            document_manifest.get("sourceManifestSha256")
            != hashlib.sha256(receipts.read_bytes()).hexdigest()
        ):
            raise ValueError("Document bank source manifest changed; rebuild the bank")
        for name, expected in document_manifest["artifacts"].items():
            path = (prototype / name).resolve()
            if not path.is_relative_to(prototype.resolve()) or path.suffix not in {
                ".md",
                ".json",
                ".jsonl",
            }:
                raise ValueError(
                    "Document bank publication path is not allowed: " + name
                )
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                raise ValueError("Stale document bank artifact: " + name)
            output = target / "knowledge/prototype" / name
            output.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, output)
        shutil.copy2(
            prototype / "manifest.json", target / "knowledge/prototype/manifest.json"
        )


def build(destination=None):
    target = Path(destination) if destination else ROOT / "dist"
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    paths = [
        "index.html",
        "styles.css",
        "app.js",
        "tree.js",
        "vehicle-data.js",
        "vehicle-navigation.js",
        "flow-data.js",
        "homologation-flow.js",
        "src",
        "assets",
        "data/site",
        "data/process",
        "docs/guide",
        "data/requirements/catalog.json",
        "data/ai",
        "prototipo",
    ]
    for name in (
        "catalog.json",
        "pdf-review.json",
        "services-review.json",
        "workflow.json",
        "texts-manifest.json",
        "document-chunks.json",
    ):
        if (ROOT / "data/prototype" / name).exists():
            paths.append("data/prototype/" + name)
    # Official PDF copies are optional until the copy workflow has run.
    if (ROOT / "pdfs/manifest.json").exists():
        paths.append("pdfs")
    for agency in ("contran", "proconve", "inmetro", "anatel"):
        paths += [f"data/{agency}/active.json", f"data/{agency}/active.csv"]
    for name in paths:
        source, output = ROOT / name, target / name
        output.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, output)
        else:
            shutil.copy2(source, output)
    copy_knowledge(target)
    # Each script and stylesheet URL follows its actual bytes. A new release
    # cannot accidentally retain an old hand-written cache version.
    revisions = {}

    def version_asset(match):
        path = match[2]
        digest = hashlib.sha256((target / path.lstrip("/")).read_bytes()).hexdigest()[
            :16
        ]
        revisions[path] = digest
        return f'{match[1]}="{path}?v={digest}"'

    for index in (target / "index.html", target / "prototipo/index.html"):
        html = re.sub(
            r'(src|href)="([^"?]+\.(?:js|css))(?:\?[^\"]*)?"',
            version_asset,
            index.read_text(),
        )
        index.write_text(html)
    # Revalidate the entry page/data in browsers, including the stable Pages URL.
    (target / "_headers").write_text(
        "/*\n  Cache-Control: public, max-age=0, must-revalidate\n"
        "/\n  Cache-Control: no-cache\n"
        "/index.html\n  Cache-Control: no-cache\n"
        "/version.json\n  Cache-Control: no-store\n"
    )
    (target / ".nojekyll").touch()
    # A content revision remains reproducible when Pages publishes committed
    # output without running a build. Embedding the containing Git SHA would
    # make that artifact self-referential.
    fingerprint = hashlib.sha256()
    for path in sorted(p for p in target.rglob("*") if p.is_file()):
        fingerprint.update(path.relative_to(target).as_posix().encode() + b"\0")
        fingerprint.update(hashlib.sha256(path.read_bytes()).digest())
    (target / "version.json").write_text(
        json.dumps(
            {"revision": fingerprint.hexdigest(), "assets": revisions},
            ensure_ascii=False,
            sort_keys=True,
            indent=2,
        )
        + "\n"
    )
    print(f"Static artifact: {target}")


if __name__ == "__main__":
    build()
