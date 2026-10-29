"""Prevent the didactic engine from piercing the real reference hood."""

import asyncio
import json
from pathlib import Path
import subprocess
import tempfile

from playwright.async_api import async_playwright
from browser_support import TestServer, launch_options

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/artifacts/mechanical-fit"


async def exercise(base, script):
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        try:
            page = await browser.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            await page.route(
                "**/__mechanical-fit.html",
                lambda route: route.fulfill(
                    content_type="text/html",
                    body='<html><body><script src="__mechanical-fit.js"></script></body></html>',
                ),
            )
            await page.route(
                "**/__mechanical-fit.js",
                lambda route: route.fulfill(
                    content_type="text/javascript", body=script
                ),
            )
            await page.goto(base + "__mechanical-fit.html")
            await page.wait_for_function(
                "window.mechanicalFit || window.mechanicalFitError", timeout=90_000
            )
            assert await page.evaluate("window.mechanicalFitError || null") is None
            result = await page.evaluate("window.mechanicalFit")
            assert result["hoodMeshes"] >= 2, result
            assert result["engineVertices"] > 5_000, result
            assert result["checkedVertices"] > 1_000, result
            assert result["minimumClearance"] >= 0.02, result
            assert result["previousMinimumClearance"] < 0, result
            assert result["bounds"]["min"][1] > 0.20, result
            assert result["bounds"]["max"][1] < 1.12, result
            checked_parts = {row["partId"] for row in result["internalChecks"]}
            assert {
                "engine",
                "cooling",
                "chassis",
                "battery12v",
                "electronics",
            } <= checked_parts
            for row in result["internalChecks"]:
                assert row["minimumClearance"] >= 0.005, row
            assert not errors, errors
            OUT.mkdir(parents=True, exist_ok=True)
            (OUT / "acceptance.json").write_text(json.dumps(result, indent=2) + "\n")
            print(
                "PASS: actual engine/hood meshes; "
                f"{result['checkedVertices']} vertices, "
                f"minimum visual clearance {result['minimumClearance']:.4f}m; "
                "former pose reproduces the intersection"
            )
        finally:
            await browser.close()


def main():
    with tempfile.TemporaryDirectory() as directory:
        bundle = Path(directory) / "fit.js"
        subprocess.run(
            [
                "node",
                "--input-type=module",
                "-e",
                "import {build} from 'esbuild'; await build({"
                "entryPoints:['tests/mechanical-fit-harness.js'],bundle:true,"
                "format:'iife',target:['es2020'],outfile:process.argv[1]});",
                str(bundle),
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
        )
        with TestServer() as base:
            asyncio.run(exercise(base, bundle.read_bytes()))


if __name__ == "__main__":
    main()
