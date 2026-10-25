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
    ]
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
    index = target / "index.html"
    revisions = {}

    def version_asset(match):
        path = match[2]
        digest = hashlib.sha256((target / path).read_bytes()).hexdigest()[:16]
        revisions[path] = digest
        return f'{match[1]}="{path}?v={digest}"'

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
