"""Export cited WebP previews from actual model meshes, without changing the viewer."""

import argparse
import asyncio
import base64
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))
from browser_support import TestServer, launch_options

OUTPUT = ROOT / "assets/models/suv/thumbnails"
INPUTS = (
    "assets/models/suv/bmw-x5.glb",
    "assets/models/suv/mechanical-supplement.glb",
    "assets/models/suv/provenance.json",
    "assets/models/suv/mechanical-provenance.json",
    "src/guide/reference-suv.js",
    "src/guide/vehicle-parts.js",
    "src/guide/subsystem-coverage.js",
    "src/guide/exploded-layout.js",
    "scripts/model-thumbnail-harness.js",
    "scripts/capture_model_thumbnails.py",
)


def sha(content):
    return hashlib.sha256(content).hexdigest()


def inputs():
    return [
        {"path": path, "sha256": sha((ROOT / path).read_bytes())} for path in INPUTS
    ]


def json_write(path, value):
    path.write_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    )


def verify(output=OUTPUT):
    provenance = json.loads((output / "provenance.json").read_text())
    if provenance["inputs"] != inputs():
        raise ValueError(
            "Thumbnail sources changed; explicitly recapture the model previews"
        )
    for row in provenance["images"]:
        path = output / row["file"]
        if sha(path.read_bytes()) != row["sha256"]:
            raise ValueError("Thumbnail image checksum differs: " + row["id"])
    if sha((output / "index.json").read_bytes()) != provenance["indexSha256"]:
        raise ValueError("Thumbnail selection index differs from its provenance")
    print(f"PASS: {len(provenance['images'])} model thumbnails and input/index hashes")


async def capture(base, output, only=None):
    output.mkdir(parents=True, exist_ok=True)
    snapshots = inputs()
    bmw = json.loads((ROOT / "assets/models/suv/provenance.json").read_text())
    mechanics = json.loads(
        (ROOT / "assets/models/suv/mechanical-provenance.json").read_text()
    )
    images = []
    with tempfile.TemporaryDirectory() as directory:
        bundle = Path(directory) / "studio.js"
        subprocess.run(
            [
                "node",
                "--input-type=module",
                "-e",
                "import {build} from 'esbuild'; await build({entryPoints:['scripts/model-thumbnail-harness.js'],bundle:true,format:'iife',target:['es2020'],define:{'process.env.NODE_ENV':'\"production\"'},outfile:process.argv[1]});",
                str(bundle),
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
        )
        content = bundle.read_bytes()
        async with async_playwright() as p:
            browser = await p.chromium.launch(**launch_options())
            try:
                page = await browser.new_page(
                    viewport={"width": 1100, "height": 850},
                    device_scale_factor=1,
                    reduced_motion="reduce",
                )
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                await page.route(
                    "**/__thumbnail-studio.html",
                    lambda route: route.fulfill(
                        content_type="text/html",
                        body='<html><body style="margin:0"><script src="__thumbnail-studio.js"></script></body></html>',
                    ),
                )
                await page.route(
                    "**/__thumbnail-studio.js",
                    lambda route: route.fulfill(
                        content_type="text/javascript", body=content
                    ),
                )
                await page.goto(base + "__thumbnail-studio.html")
                await page.wait_for_function(
                    "() => window.thumbnailStudio || window.thumbnailError",
                    timeout=90_000,
                )
                error = await page.evaluate("window.thumbnailError || null")
                if error:
                    raise RuntimeError(error)
                catalog = await page.evaluate("window.thumbnailStudio.catalog")
                for identity in only or catalog["requests"]:
                    rendered = await page.evaluate(
                        "id => window.thumbnailStudio.capture(id)", identity
                    )
                    data = rendered.pop("dataUrl")
                    image = Image.open(
                        io.BytesIO(base64.b64decode(data.split(",", 1)[1]))
                    ).convert("RGBA")
                    if image.size != (2048, 1536) or not image.getbbox():
                        raise ValueError(
                            "Expected nonempty actual model pixels: " + identity
                        )
                    image = image.resize((1024, 768), Image.Resampling.LANCZOS)
                    path = output / (identity + ".webp")
                    image.save(path, "WEBP", quality=94, method=6)
                    record = {
                        **rendered,
                        "file": path.name,
                        "width": image.width,
                        "height": image.height,
                        "renderWidth": 2048,
                        "renderHeight": 1536,
                        "sha256": sha(path.read_bytes()),
                    }
                    images.append(record)
                    print("Rendered " + identity, flush=True)
                await page.evaluate("window.thumbnailStudio.dispose()")
                if errors:
                    raise RuntimeError(errors)
                browser_version = browser.version
            finally:
                await browser.close()
    if snapshots != inputs():
        raise ValueError(
            "Inputs changed during export; rerun after the source edits settle"
        )
    image_index = {
        row["id"]: {
            key: value
            for key, value in row.items()
            if key
            in {
                "id",
                "assemblyIds",
                "contextAssemblyIds",
                "labels",
                "width",
                "height",
                "sha256",
                "modelSources",
                "mechanicalExample",
                "subset",
                "notes",
            }
        }
        | {"asset": "assets/models/suv/thumbnails/" + row["file"]}
        for row in images
    }
    index = {
        "schemaVersion": 1,
        "kind": "actual_model_mesh_previews",
        "sceneKind": "car",
        "model": "bmw-x5-g05-and-didactic-mechanics",
        "images": image_index,
        "assemblies": {row["id"]: row for row in catalog["assemblies"]},
        "subsystems": {row["id"]: row for row in catalog["subsystems"]},
    }
    json_write(output / "index.json", index)
    provenance = {
        "schemaVersion": 1,
        "method": "Direct WebGL render of the approved GLB meshes in an export-only studio; no generated photograph, replacement geometry or image generation",
        "background": "transparent",
        "browser": browser_version,
        "adaptations": [
            "Isolated selection, representative source-mesh subsets, camera framing, studio rendering and WebP encoding",
            "Independent assemblies may be translated for a readable thumbnail; exact translations and selected mesh IDs are recorded per image",
            "Supersampled at 2048 × 1536 and downsampled with Lanczos to 1024 × 768; no geometry is created or changed",
            "Brake preview omits the rear cover, shows the original wheel hub/screws as context and uses a cloned flat-shaded brake-disc material; these export-only choices do not change the interactive model",
        ],
        "limitations": [
            "Preview is a navigation example, not a certified installation, dimension or regulatory applicability decision",
            "Shared subsystems show a related assembly; missing individual components are not silently created",
            "Current previews are captured from the SUV reference and its authored mechanical supplement",
        ],
        "modelSources": {
            "bmw-x5-g05": {
                key: bmw.get(key)
                for key in (
                    "title",
                    "creator",
                    "sourceUrl",
                    "license",
                    "licenseUrl",
                    "notice",
                )
            },
            "authored-mechanics": {
                key: mechanics.get(key)
                for key in ("title", "creator", "license", "notice")
            },
        },
        "inputs": snapshots,
        "indexSha256": sha((output / "index.json").read_bytes()),
        "images": images,
        "partialExport": bool(only),
    }
    json_write(output / "provenance.json", provenance)
    print(f"Exported {len(images)} actual model previews; GPU closed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument(
        "--only", nargs="+", help="Review subset; requires a separate output directory"
    )
    parser.add_argument(
        "--check", action="store_true", help="Validate saved artifacts without GPU"
    )
    args = parser.parse_args()
    if args.only and args.output.resolve() == OUTPUT.resolve():
        raise ValueError(
            "A partial review export must use --output outside the published directory"
        )
    if args.check:
        verify(args.output)
    else:
        with TestServer() as base:
            asyncio.run(capture(base, args.output, args.only))


if __name__ == "__main__":
    main()
