#!/usr/bin/env python3
"""Build a static artifact from an explicit allowlist; never publish audit inputs."""

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
    (target / ".nojekyll").touch()
    print(f"Static artifact: {target}")


if __name__ == "__main__":
    build()
