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
    assert re.fullmatch(r"[0-9a-f]{40}", version["commit"])
    html = (target / "index.html").read_text()
    assets = re.findall(r'(?:src|href)="([^"?]+\.(?:js|css))\?v=([0-9a-f]{16})"', html)
    assert dict(assets) == version["assets"]
    assert "src/core/theme.js" in version["assets"]
    assert "src/styles/theme-tokens.css" in version["assets"]
    for path, revision in assets:
        assert hashlib.sha256((target / path).read_bytes()).hexdigest()[:16] == revision
    assert html.index("src/core/theme.js") < html.index('rel="stylesheet"')
    headers = (target / "_headers").read_text()
    assert "/index.html\n  Cache-Control: no-cache" in headers
    assert "/version.json\n  Cache-Control: no-store" in headers
    for private in [
        ".git",
        ".agents",
        "tests",
        "scripts",
        "data/contran/sources",
        "data/contran/publication-policy.json",
    ]:
        assert not (target / private).exists(), private
    before = {
        str(path.relative_to(target)): path.read_bytes()
        for path in target.rglob("*")
        if path.is_file()
    }
    module.build(target)
    after = {
        str(path.relative_to(target)): path.read_bytes()
        for path in target.rglob("*")
        if path.is_file()
    }
    assert before == after, "The same source must produce the same static artifact"
print(
    "PASS: deploy commit, content-based asset URLs, revalidation rules, private input exclusion and deterministic build."
)
