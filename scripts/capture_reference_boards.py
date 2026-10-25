"""Export consistent 2D views from the actual web model, without UI overlays."""

import asyncio
import base64
import hashlib
import io
import json
from pathlib import Path
import sys

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))
from browser_support import TestServer, launch_options

OUT = ROOT / "assets/models/suv/reference-views"


async def capture(base):
    OUT.mkdir(parents=True, exist_ok=True)
    records = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(**launch_options())
        page = await browser.new_page(
            viewport={"width": 1920, "height": 1400},
            device_scale_factor=2,
            reduced_motion="reduce",
        )
        await page.goto(base + "#guide")
        await page.locator('[data-g3d-ready="true"]').wait_for(timeout=90_000)
        for name, button, exploded in [
            ("assembled", "Restaurar vista em perspectiva", False),
            ("side", "Lateral", False),
            ("top", "Superior", False),
            ("exploded", "Restaurar vista em perspectiva", True),
        ]:
            await page.get_by_label("Vista explodida", exact=True).set_checked(exploded)
            await page.get_by_role("button", name=button, exact=True).click()
            await page.evaluate(
                "() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))"
            )
            data = await page.locator(".g3d canvas").evaluate("""canvas => {
                // A symmetric orbit redraws synchronously before reading the WebGL buffer.
                for(const key of ['ArrowRight','ArrowLeft']) canvas.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
                return canvas.toDataURL('image/png');
            }""")
            image = Image.open(io.BytesIO(base64.b64decode(data.split(",", 1)[1])))
            assert image.getbbox(), "Exported frame must contain real rendered geometry"
            target = OUT / (name + ".webp")
            image.save(target, "WEBP", quality=94, method=6)
            records.append(
                {
                    "id": name,
                    "path": str(target.relative_to(ROOT)),
                    "width": image.width,
                    "height": image.height,
                    "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                }
            )
        await browser.close()
    inputs = [
        "assets/models/suv/bmw-x5.glb",
        "assets/models/suv/mechanical-supplement.glb",
        "src/guide/exploded-layout.js",
        "src/guide/VehicleScene.jsx",
        "src/guide/reference-suv.js",
        "src/guide/render-definition.js",
    ]
    metadata = {
        "method": "Direct WebGL export from the published-model source; no image generation or external vehicle photograph",
        "background": "transparent",
        "inputs": [
            {
                "path": path,
                "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest(),
            }
            for path in inputs
        ],
        "views": records,
    }
    (OUT / "provenance.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n"
    )
    print("Exported four actual-model 2D boards")


if __name__ == "__main__":
    with TestServer() as base:
        asyncio.run(capture(base))
