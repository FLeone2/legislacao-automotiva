#!/usr/bin/env python3
"""Rasterize the supplied vectors without changing their geometry or content.

Generation requires native librsvg, Cairo and ImageMagick 7 with WebP support.
The complete native librsvg renderer is accessed through ctypes. ImageMagick
only encodes its PNG output; no partial SVG fallback is used.

CI uses --check: only Python's standard library and the project's pinned Pillow
are needed. It validates committed derivatives against source hashes, image
dimensions, lossless encoding and decoded pixels; it does not rerender using a
potentially different native library version.
"""

import argparse
import ctypes
import ctypes.util
import hashlib
import json
import math
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = "assets/vehicle-vector"
OUTPUT = f"{ASSETS}/previews"
PROVENANCE = f"{ASSETS}/preview-provenance.json"
MAIN_DIMENSIONS = (3072, 2048)
PART_MAX_DIMENSION = 768


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(value):
    return hashlib.sha256(value).hexdigest()


def relative(path):
    return Path(path).relative_to(ROOT).as_posix()


class NativeSvgRenderer:
    """Use the stable librsvg document/viewport API with explicit cleanup."""

    class Rectangle(ctypes.Structure):
        _fields_ = [(name, ctypes.c_double) for name in ("x", "y", "width", "height")]

    class Error(ctypes.Structure):
        _fields_ = [
            ("domain", ctypes.c_uint),
            ("code", ctypes.c_int),
            ("message", ctypes.c_char_p),
        ]

    def __init__(self):
        def library(name):
            path = ctypes.util.find_library(name)
            require(path is not None, f"Generation requires native {name}")
            return ctypes.CDLL(path)

        self.svg = library("rsvg-2")
        self.cairo = library("cairo")
        self.objects = library("gobject-2.0")
        self.glib = library("glib-2.0")

        def signature(library, name, arguments, result=None):
            function = getattr(library, name)
            function.argtypes, function.restype = arguments, result

        pointer = ctypes.c_void_p
        error_pointer = ctypes.POINTER(ctypes.POINTER(self.Error))
        signature(
            self.svg,
            "rsvg_handle_new_from_file",
            [ctypes.c_char_p, error_pointer],
            pointer,
        )
        signature(
            self.svg,
            "rsvg_handle_render_document",
            [pointer, pointer, ctypes.POINTER(self.Rectangle), error_pointer],
            ctypes.c_int,
        )
        signature(self.cairo, "cairo_image_surface_create", [ctypes.c_int] * 3, pointer)
        signature(self.cairo, "cairo_create", [pointer], pointer)
        signature(self.cairo, "cairo_surface_status", [pointer], ctypes.c_int)
        signature(self.cairo, "cairo_status", [pointer], ctypes.c_int)
        signature(self.cairo, "cairo_status_to_string", [ctypes.c_int], ctypes.c_char_p)
        signature(
            self.cairo,
            "cairo_surface_write_to_png",
            [pointer, ctypes.c_char_p],
            ctypes.c_int,
        )
        signature(self.cairo, "cairo_destroy", [pointer])
        signature(self.cairo, "cairo_surface_destroy", [pointer])
        signature(self.cairo, "cairo_version_string", [], ctypes.c_char_p)
        signature(self.objects, "g_object_unref", [pointer])
        signature(self.glib, "g_error_free", [ctypes.POINTER(self.Error)])
        self.svg_version = ".".join(
            str(ctypes.c_uint.in_dll(self.svg, f"rsvg_{part}_version").value)
            for part in ("major", "minor", "micro")
        )
        self.cairo_version = self.cairo.cairo_version_string().decode()

    def render(self, source, png, width, height):
        error = ctypes.POINTER(self.Error)()
        handle, surface, context = None, None, None
        try:
            handle = self.svg.rsvg_handle_new_from_file(
                str(source).encode(), ctypes.byref(error)
            )
            require(handle, f"librsvg could not parse {source}")
            # ARGB32 surfaces start transparent. The SVG controls the background;
            # the explicit viewport preserves its original viewBox origin.
            surface = self.cairo.cairo_image_surface_create(0, width, height)
            require(
                self.cairo.cairo_surface_status(surface) == 0,
                "Cairo surface creation failed",
            )
            context = self.cairo.cairo_create(surface)
            require(
                self.cairo.cairo_status(context) == 0, "Cairo context creation failed"
            )
            viewport = self.Rectangle(0, 0, width, height)
            success = self.svg.rsvg_handle_render_document(
                handle, context, ctypes.byref(viewport), ctypes.byref(error)
            )
            message = error.contents.message.decode() if error else "unknown SVG error"
            require(success, f"librsvg failed to render {source}: {message}")
            status = self.cairo.cairo_surface_write_to_png(surface, str(png).encode())
            require(
                status == 0,
                f"PNG encoding failed: {self.cairo.cairo_status_to_string(status)}",
            )
        finally:
            if context:
                self.cairo.cairo_destroy(context)
            if surface:
                self.cairo.cairo_surface_destroy(surface)
            if handle:
                self.objects.g_object_unref(handle)
            if error:
                self.glib.g_error_free(error)


def source_assets():
    with ZipFile(ROOT / "data/vehicle-visual/source.zip") as archive:
        maps = [
            name for name in archive.namelist() if name.endswith("mapa_conjuntos.json")
        ]
        require(len(maps) == 1, "Missing unique supplied geometry map")
        geometry = json.loads(archive.read(maps[0]))
    parts = geometry["conjuntos"]
    require(
        len(parts) == 37 and len({part["id"] for part in parts}) == 37,
        "Source geometry must contain 37 unique supplied parts",
    )
    sources = [("vehicle", ROOT / ASSETS / "vehicle.svg")]
    sources += [(part["id"], ROOT / ASSETS / f"{part['id']}.svg") for part in parts]
    require(
        {path for _, path in sources} == set((ROOT / ASSETS).glob("*.svg")),
        "The 38 source SVG files differ from the supplied geometry",
    )
    return sources


def source_geometry(path):
    svg = ET.fromstring(path.read_bytes())
    require(svg.tag == "{http://www.w3.org/2000/svg}svg", f"Not an SVG: {path}")
    width, height = float(svg.attrib["width"]), float(svg.attrib["height"])
    view_box = [float(value) for value in svg.attrib["viewBox"].split()]
    require(
        len(view_box) == 4
        and all(math.isfinite(value) for value in [width, height, *view_box])
        and width > 0
        and height > 0
        and view_box[2:] == [width, height],
        f"Unexpected source viewport: {path}",
    )
    # All drawing objects are filled paths and groups, without filters, embedded
    # images or text. librsvg handles each of these source primitives directly.
    allowed = {"svg", "g", "path", "title", "desc", "rect"}
    require(
        all(element.tag.rsplit("}", 1)[-1] in allowed for element in svg.iter()),
        f"Unsupported SVG primitive: {path}",
    )
    return {"width": width, "height": height, "viewBox": view_box}


def dimensions(asset_id, geometry):
    if asset_id == "vehicle":
        require(
            geometry["viewBox"] == [0, 0, 1536, 1024],
            "Main source viewport changed",
        )
        return MAIN_DIMENSIONS
    width, height = geometry["width"], geometry["height"]
    factor = PART_MAX_DIMENSION / max(width, height)
    return max(1, round(width * factor)), max(1, round(height * factor))


def image_details(path):
    with Image.open(path) as opened:
        require(opened.format == "WEBP", f"Not a WebP image: {path}")
        opened.load()
        image = opened.convert("RGBA")
    alpha = image.getchannel("A")
    require(alpha.getbbox() is not None, f"Empty preview: {path}")
    return {
        "width": image.width,
        "height": image.height,
        "hasTransparency": alpha.getextrema()[0] < 255,
        "rgbaSha256": digest(image.tobytes()),
    }


def transparent_vehicle_source(payload):
    """Omit the supplied canvas, preserving every painted part and coordinate.

    This is a render input only: never rewrite the original SVG or its geometry.
    """
    root = ET.fromstring(payload)
    backgrounds = [child for child in root if child.get("id") == "fundo_branco"]
    require(len(backgrounds) == 1, "Expected the single supplied white canvas")
    background = backgrounds[0]
    require(
        background.tag == "{http://www.w3.org/2000/svg}rect"
        and background.get("fill") == "#ffffff"
        and background.get("width") == root.get("width")
        and background.get("height") == root.get("height"),
        "Do not remove an unexpected drawing object",
    )
    root.remove(background)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def lossless_webp(path):
    payload = path.read_bytes()
    require(
        payload[:4] == b"RIFF" and payload[8:12] == b"WEBP",
        f"Invalid WebP container: {path}",
    )
    offset, types = 12, []
    while offset + 8 <= len(payload):
        kind = payload[offset : offset + 4]
        size = int.from_bytes(payload[offset + 4 : offset + 8], "little")
        require(offset + 8 + size <= len(payload), f"Truncated WebP chunk: {path}")
        types.append(kind)
        offset += 8 + size + (size % 2)
    require(
        b"VP8L" in types and b"VP8 " not in types,
        f"Preview must use lossless VP8L: {path}",
    )


def recipe():
    return {
        "source": "Exact existing SVG bytes; no geometry, labels or colors changed",
        "svgRasterization": (
            "librsvg.rsvg_handle_render_document(handle, Cairo ARGB32 context, viewport[0,0,width,height])"
        ),
        "mainDimensions": list(MAIN_DIMENSIONS),
        "partMaxDimension": PART_MAX_DIMENSION,
        "partSizing": "Scale the SVG viewport to a longest edge of 768 px; preserve aspect ratio",
        "background": "Parts retain source transparency; main preview omits only rect#fundo_branco; no trim",
        "encoding": [
            "magick",
            "rendered.png",
            "-strip",
            "-define",
            "webp:lossless=true",
            "-define",
            "webp:exact=true",
            "output.webp",
        ],
        "verification": "Decoded RGBA bytes must equal the renderer PNG before publication",
    }


def generate():
    renderer = NativeSvgRenderer()
    magick = shutil.which("magick")
    require(magick is not None, "Generation requires ImageMagick 7 with WebP support")
    version = subprocess.check_output([magick, "-version"], text=True)
    require(version.startswith("Version: ImageMagick 7."), "Expected ImageMagick 7")
    manifest = {
        "schemaVersion": 1,
        "renderers": {
            "svg": {"name": "librsvg", "version": renderer.svg_version},
            "cairo": {"name": "Cairo", "version": renderer.cairo_version},
            "webp": {"name": "ImageMagick", "version": version.splitlines()[0]},
        },
        "recipe": recipe(),
        "assets": [],
    }
    output_directory = ROOT / OUTPUT
    output_directory.mkdir(parents=True, exist_ok=True)
    expected = set()
    with tempfile.TemporaryDirectory(prefix="vehicle-preview-") as temporary:
        temporary = Path(temporary)
        for asset_id, source in source_assets():
            geometry = source_geometry(source)
            width, height = dimensions(asset_id, geometry)
            png, webp = temporary / f"{asset_id}.png", temporary / f"{asset_id}.webp"
            render_source = source
            if asset_id == "vehicle":
                render_source = temporary / "vehicle-transparent.svg"
                render_source.write_bytes(
                    transparent_vehicle_source(source.read_bytes())
                )
            renderer.render(render_source, png, width, height)
            subprocess.run(
                [
                    magick,
                    str(png),
                    "-strip",
                    "-define",
                    "webp:lossless=true",
                    "-define",
                    "webp:exact=true",
                    str(webp),
                ],
                check=True,
                capture_output=True,
            )
            lossless_webp(webp)
            image = image_details(webp)
            require(
                (image["width"], image["height"]) == (width, height),
                "Render size drift",
            )
            with Image.open(png) as rendered:
                require(
                    digest(rendered.convert("RGBA").tobytes()) == image["rgbaSha256"],
                    f"WebP changed source PNG pixels: {asset_id}",
                )
            require(image["hasTransparency"], f"Preview lost transparency: {asset_id}")
            output = output_directory / webp.name
            # Each image appears only after the complete renderer/encoder checks.
            output.write_bytes(webp.read_bytes())
            expected.add(output)
            manifest["assets"].append(
                {
                    "id": asset_id,
                    "source": relative(source),
                    "sourceSha256": digest(source.read_bytes()),
                    "sourceGeometry": geometry,
                    "output": relative(output),
                    "outputSha256": digest(output.read_bytes()),
                    "dimensions": image,
                }
            )
            print(
                f"Rendered {asset_id}: {width} × {height}, {output.stat().st_size:,} bytes",
                flush=True,
            )
    for stale in output_directory.glob("*.webp"):
        if stale not in expected:
            stale.unlink()
    (ROOT / PROVENANCE).write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )
    return manifest


def check():
    manifest = json.loads((ROOT / PROVENANCE).read_text())
    require(manifest.get("schemaVersion") == 1, "Unknown preview provenance schema")
    require(
        manifest.get("recipe") == recipe(),
        "Preview recipe changed; regenerate deliberately",
    )
    for renderer in ("svg", "cairo", "webp"):
        value = manifest.get("renderers", {}).get(renderer, {})
        require(
            value.get("name") and value.get("version"),
            f"Missing renderer provenance: {renderer}",
        )
    require(
        manifest["renderers"]["svg"]["name"] == "librsvg",
        "Unexpected recorded SVG renderer",
    )
    expected = source_assets()
    rows = manifest.get("assets", [])
    require(
        len(rows) == 38
        and [row["id"] for row in rows] == [asset_id for asset_id, _ in expected],
        "Preview manifest must match the 38 supplied SVG files in source order",
    )
    outputs = set()
    for row, (asset_id, source) in zip(rows, expected, strict=True):
        expected_output = ROOT / OUTPUT / f"{asset_id}.webp"
        require(row["source"] == relative(source), f"Source path drift: {asset_id}")
        require(
            row["output"] == relative(expected_output), f"Output path drift: {asset_id}"
        )
        require(
            row["sourceSha256"] == digest(source.read_bytes()),
            f"Source hash drift: {asset_id}",
        )
        geometry = source_geometry(source)
        require(row["sourceGeometry"] == geometry, f"Source viewport drift: {asset_id}")
        require(expected_output.is_file(), f"Missing preview: {asset_id}")
        require(
            row["outputSha256"] == digest(expected_output.read_bytes()),
            f"Preview hash drift: {asset_id}",
        )
        lossless_webp(expected_output)
        image = image_details(expected_output)
        require(row["dimensions"] == image, f"Decoded image drift: {asset_id}")
        require(
            (image["width"], image["height"]) == dimensions(asset_id, geometry),
            f"Wrong preview dimensions: {asset_id}",
        )
        require(image["hasTransparency"], f"Opaque preview: {asset_id}")
        outputs.add(expected_output)
    require(outputs == set((ROOT / OUTPUT).glob("*.webp")), "Unexpected preview assets")
    print(
        "Vehicle previews: 38 lossless WebP derivatives, source/output hashes, geometry and RGBA verified."
    )
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate committed assets without rerendering or writing",
    )
    args = parser.parse_args()
    if args.check:
        check()
    else:
        generate()
        check()


if __name__ == "__main__":
    main()
