"""Verify deploy identity, automatic asset revisions and the publication boundary."""

import hashlib
import importlib.util
import json
import re
import tempfile
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "build_static", ROOT / "scripts/build_static.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

config = tomllib.loads((ROOT / "wrangler.toml").read_text())
assert config["name"] == "legislacao-automotiva"
assert config["pages_build_output_dir"] == "./dist"
assert (
    json.loads((ROOT / "package.json").read_text())["scripts"]["postinstall"]
    == "python scripts/build_static.py"
)

with tempfile.TemporaryDirectory() as directory:
    target = Path(directory) / "dist"
    module.build(target)
    version = json.loads((target / "version.json").read_text())
    assert re.fullmatch(r"[0-9a-f]{64}", version["revision"])
    html = (target / "index.html").read_text()
    assets = re.findall(r'(?:src|href)="([^"?]+\.(?:js|css))\?v=([0-9a-f]{16})"', html)
    assert dict(assets) == version["assets"]
    assert "src/core/theme.js" in version["assets"]
    assert "src/styles/theme-tokens.css" in version["assets"]
    for path, revision in assets:
        assert hashlib.sha256((target / path).read_bytes()).hexdigest()[:16] == revision
    fingerprint = hashlib.sha256()
    for path in sorted(
        p for p in target.rglob("*") if p.is_file() and p != target / "version.json"
    ):
        fingerprint.update(path.relative_to(target).as_posix().encode() + b"\0")
        fingerprint.update(hashlib.sha256(path.read_bytes()).digest())
    assert version["revision"] == fingerprint.hexdigest()
    assert html.index("src/core/theme.js") < html.index('rel="stylesheet"')
    headers = (target / "_headers").read_text()
    assert "/index.html\n  Cache-Control: no-cache" in headers
    assert "/version.json\n  Cache-Control: no-store" in headers
    manifest = json.loads((ROOT / "knowledge/manifest.json").read_text())
    assert (target / "knowledge/README.md").is_file()
    assert (target / "knowledge/manifest.json").is_file()
    assert set(manifest["artifacts"]) == {
        str(path.relative_to(target / "knowledge"))
        for path in (target / "knowledge").rglob("*")
        if path.is_file() and path.name != "manifest.json"
    }
    unregistered = ROOT / "knowledge/.publication-test-private.sqlite"
    assert not unregistered.exists()
    try:
        unregistered.write_text("Local-only test database; never publish")
        module.build(target)
        assert not (target / "knowledge" / unregistered.name).exists()
    finally:
        unregistered.unlink(missing_ok=True)
    for private in [
        ".git",
        ".agents",
        "tests",
        "scripts",
        "data/contran/sources",
        "data/vehicle-visual",
        "data/vehicle-legislation",
        "data/contran/publication-policy.json",
    ]:
        assert not (target / private).exists(), private
    before = {
        str(path.relative_to(target)): path.read_bytes()
        for path in target.rglob("*")
        if path.is_file()
    }
    (target / "stale-private-input.json").write_text("must not be published")
    module.build(target)
    after = {
        str(path.relative_to(target)): path.read_bytes()
        for path in target.rglob("*")
        if path.is_file()
    }
    assert before == after, "The same source must produce the same static artifact"
print(
    "PASS: content revision, asset URLs, revalidation rules, private input exclusion, stale output removal and deterministic build."
)
