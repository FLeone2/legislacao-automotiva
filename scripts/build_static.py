#!/usr/bin/env python3
"""Build a static artifact from an explicit allowlist; never publish audit inputs."""

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


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
