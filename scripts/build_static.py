#!/usr/bin/env python3
"""Build a static artifact from an explicit allowlist; never publish audit inputs."""

import hashlib
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def source_commit():
    commit = os.environ.get("CF_PAGES_COMMIT_SHA", "")
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        try:
            commit = subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
            ).strip()
        except (OSError, subprocess.CalledProcessError):
            return None
    return commit if re.fullmatch(r"[0-9a-f]{40}", commit) else None


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
    (target / "version.json").write_text(
        json.dumps(
            {"commit": source_commit(), "assets": revisions},
            ensure_ascii=False,
            sort_keys=True,
            indent=2,
        )
        + "\n"
    )
    # Revalidate the entry page/data in browsers, including the stable Pages URL.
    (target / "_headers").write_text(
        "/*\n  Cache-Control: public, max-age=0, must-revalidate\n"
        "/\n  Cache-Control: no-cache\n"
        "/index.html\n  Cache-Control: no-cache\n"
        "/version.json\n  Cache-Control: no-store\n"
    )
    (target / ".nojekyll").touch()
    print(f"Static artifact: {target}")


if __name__ == "__main__":
    build()
