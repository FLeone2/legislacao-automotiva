#!/usr/bin/env python3
"""Import the reviewed 37-piece illustration without changing legal relationships.

The original archive is an editorial input, excluded from the static publication.
Published SVG bytes and contour paths remain identical to that source. Only the
existing component route and a verified interior test point are added per piece.
"""

import argparse
import json
import math
import re
import stat
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/vehicle-visual/source.zip"
TARGET = ROOT / "src/core/vehicle-vector.js"
ASSETS = "assets/vehicle-vector"
SVG_NS = "http://www.w3.org/2000/svg"
INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape"
NS = {"s": SVG_NS}
WIDTH, HEIGHT = 1536, 1024
VIEWBOX = "0 0 1536 1024"

# Reviewed navigation only: these IDs do not establish legal applicability.
# Identification has no visible assembly in this illustration and no hotspot.
PARTS = (
    ("peca_01_painel_teto", "carroceria", 748, 76),
    ("peca_02_vidro_lateral_dianteiro", "vidros", 554, 134),
    ("peca_03_parabrisa", "vidros", 617, 194),
    ("peca_04_vidro_lateral_superior", "vidros", 917, 97),
    ("peca_05_vidro_triangular_superior", "vidros", 1027, 88),
    ("peca_06_vidro_traseiro", "vidros", 1157, 91),
    ("peca_07_vidro_lateral_traseiro", "vidros", 1160, 171),
    ("peca_08_banco_traseiro", "bancos", 1036, 200),
    ("peca_09_bancos_dianteiros_console", "bancos", 877, 227),
    ("peca_10_carroceria", "carroceria", 745, 419),
    ("peca_11_capo", "carroceria", 381, 388),
    ("peca_12_farol_lado_oposto", "iluminacao", 205, 459),
    ("peca_13_farol_lado_visivel", "iluminacao", 322, 507),
    ("peca_14_parachoque_dianteiro", "carroceria", 283, 606),
    ("peca_15_lanterna_traseira_1", "iluminacao", 1258, 165),
    ("peca_16_lanterna_traseira_2", "iluminacao", 1390, 207),
    ("peca_17_parachoque_traseiro", "carroceria", 1330, 270),
    ("peca_18_vidro_lateral_inferior", "vidros", 1058, 446),
    ("peca_19_vidro_porta_dianteira", "vidros", 1169, 379),
    ("peca_20_vidro_porta_traseira", "vidros", 1252, 356),
    ("peca_21_porta_dianteira", "carroceria", 1145, 486),
    ("peca_22_porta_traseira", "carroceria", 1263, 438),
    ("peca_23_retrovisor", "retrovisores", 1030, 511),
    ("peca_24_motor_combustao_transmissao", "motor", 444, 638),
    ("peca_25_motor_eletrico_inversor_cabos", "bateria", 736, 625),
    ("peca_26_bateria_tracao", "bateria", 943, 678),
    ("peca_27_bateria_12v", "eletrica", 932, 549),
    ("peca_28_chicote_eletrico", "eletrica", 1316, 554),
    ("peca_29_radiador", "motor", 228, 717),
    ("peca_30_tanque_tubo_combustivel", "tanque", 1225, 703),
    ("peca_31_escapamento", "escapamento", 997, 784),
    ("peca_32_suspensao_dianteira_direcao", "chassi", 414, 868),
    ("peca_33_suspensao_traseira", "chassi", 1001, 904),
    ("peca_34_roda_dianteira", "pneus-rodas", 131, 860),
    ("peca_35_freio_dianteiro", "freios", 242, 857),
    ("peca_36_roda_traseira", "pneus-rodas", 1399, 872),
    ("peca_37_freio_traseiro", "freios", 1280, 895),
)
ALLOWED_TAGS = {"svg", "g", "path", "title", "desc", "rect"}
ALLOWED_ATTRIBUTES = {
    "version",
    "width",
    "height",
    "viewBox",
    "id",
    "transform",
    "d",
    "fill",
    "fill-rule",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    f"{{{INKSCAPE_NS}}}groupmode",
    f"{{{INKSCAPE_NS}}}label",
}
NUMBER = r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"
PATH_TOKEN = re.compile(rf"[A-Za-z]|{NUMBER}")
TRANSLATE = re.compile(rf"translate\(\s*({NUMBER})\s*[, ]\s*({NUMBER})\s*\)")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def path_polygons(value):
    """Read the source's closed straight-line paths, including relative lines."""
    require(not PATH_TOKEN.sub("", value).replace(",", "").strip(), "Invalid SVG path")
    tokens = PATH_TOKEN.findall(value)
    polygons, polygon, command = [], [], None
    index, x, y = 0, 0.0, 0.0
    while index < len(tokens):
        if tokens[index].isalpha():
            command = tokens[index]
            index += 1
            require(
                command in {"M", "m", "L", "l", "z", "Z"}, "Unsupported path command"
            )
            if command in {"z", "Z"}:
                require(len(polygon) >= 3, "Open or empty SVG contour")
                polygons.append(polygon)
                x, y = polygon[0]
                polygon, command = [], None
                continue
        require(command in {"M", "m", "L", "l"}, "Path must begin with a move")
        require(index + 1 < len(tokens), "Incomplete SVG coordinate")
        px, py = float(tokens[index]), float(tokens[index + 1])
        require(math.isfinite(px) and math.isfinite(py), "Nonfinite SVG coordinate")
        index += 2
        if command.islower():
            px, py = x + px, y + py
        x, y = px, py
        if command in {"M", "m"}:
            require(not polygon, "Unclosed SVG contour")
            command = "l" if command == "m" else "L"
        polygon.append((x, y))
    require(not polygon and polygons, "Unclosed or empty SVG path")
    return polygons


def inside(point, polygon):
    """Even-odd point containment, independent of polygon orientation."""
    x, y = point
    result = False
    previous = polygon[-1]
    for current in polygon:
        ax, ay = previous
        bx, by = current
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            result = not result
        previous = current
    return result


def validate_svg(data, name):
    # The approved input is UTF-8. Reject alternate encodings before XML parsing
    # so declaration checks cannot be bypassed with UTF-16 null bytes.
    document = data.decode("utf-8")
    require(
        "<!DOCTYPE" not in document.upper() and "<!ENTITY" not in document.upper(),
        f"DTD: {name}",
    )
    root = ET.fromstring(document)
    require(root.tag == f"{{{SVG_NS}}}svg", f"SVG root missing: {name}")
    viewbox = [float(n) for n in root.attrib["viewBox"].split()]
    require(len(viewbox) == 4, f"Invalid viewBox: {name}")
    x, y, width, height = viewbox
    require(
        0 <= x < x + width <= WIDTH and 0 <= y < y + height <= HEIGHT, f"Bounds: {name}"
    )
    ids = set()

    def visit(element, offset=(0.0, 0.0)):
        require(element.tag.startswith(f"{{{SVG_NS}}}"), f"Foreign namespace: {name}")
        tag = element.tag.rsplit("}", 1)[-1]
        require(tag in ALLOWED_TAGS, f"Disallowed SVG element {tag}: {name}")
        for key, value in element.attrib.items():
            require(
                key in ALLOWED_ATTRIBUTES, f"Disallowed SVG attribute {key}: {name}"
            )
            require(
                not re.search(r"url\s*\(|javascript:|https?://", value, re.I),
                f"Resource: {name}",
            )
        identifier = element.get("id")
        if identifier:
            require(identifier not in ids, f"Duplicate SVG ID {identifier}: {name}")
            ids.add(identifier)
        transform = element.get("transform")
        if transform:
            match = TRANSLATE.fullmatch(transform)
            require(match is not None, f"Unsupported transform: {name}")
            offset = (offset[0] + float(match[1]), offset[1] + float(match[2]))
        if tag == "path":
            require(
                element.get("fill-rule") == "evenodd", f"Unexpected fill rule: {name}"
            )
            for polygon in path_polygons(element.attrib["d"]):
                require(
                    all(
                        0 <= px + offset[0] <= WIDTH and 0 <= py + offset[1] <= HEIGHT
                        for px, py in polygon
                    ),
                    f"Path outside global bounds: {name}",
                )
        for child in element:
            visit(child, offset)

    visit(root)
    return root


def archive_files(source):
    files = {}
    with ZipFile(source) as archive:
        require(
            sum(f.file_size for f in archive.infolist()) <= 80 * 1024 * 1024,
            "Oversized archive",
        )
        for entry in archive.infolist():
            path = PurePosixPath(entry.filename)
            require(
                not path.is_absolute()
                and ".." not in path.parts
                and "\\" not in entry.filename,
                "Unsafe archive path",
            )
            require(not stat.S_ISLNK(entry.external_attr >> 16), "Archive symlink")
            if not entry.is_dir():
                require(entry.filename not in files, "Duplicate archive path")
                require(entry.file_size <= 16 * 1024 * 1024, "Oversized archive file")
                files[entry.filename] = archive.read(entry)
    return files


def generate(source):
    files = archive_files(source)
    svg_files = {
        name: validate_svg(data, name)
        for name, data in sorted(files.items())
        if name.endswith(".svg")
    }
    require(len(svg_files) == 40, "Expected exactly 40 source SVGs")
    metadata = json.loads(files["mapa_conjuntos.json"])
    require(
        metadata["viewBox"] == VIEWBOX and metadata["quantidade_conjuntos"] == 37,
        "Unexpected illustration dimensions or piece count",
    )
    expected_ids = [part[0] for part in PARTS]
    require(
        [part["id"] for part in metadata["conjuntos"]] == expected_ids,
        "Unexpected piece IDs",
    )
    roots = [
        svg_files[name]
        for name in (
            "01_suv_vetorizado.svg",
            "02_contornos_por_conjunto.svg",
            "03_silhuetas_por_conjunto.svg",
        )
    ]
    for root in roots:
        require(root.get("viewBox") == VIEWBOX, "Main SVG viewBox changed")
        require(
            [g.get("id") for g in root.findall("s:g", NS)] == expected_ids,
            "Main SVG groups differ from reviewed IDs",
        )
    contours = roots[1].findall("s:g/s:path", NS)
    silhouettes = roots[2].findall("s:g/s:path", NS)
    require(len(contours) == len(silhouettes) == 37, "Expected 37 contour paths")
    polygons, parts = [], []
    outputs = {f"{ASSETS}/vehicle.svg": files["01_suv_vetorizado.svg"]}
    for reviewed, item, contour, silhouette in zip(
        PARTS, metadata["conjuntos"], contours, silhouettes
    ):
        identifier, component, tx, ty = reviewed
        contour_id = f"contorno_{identifier}"
        require(
            item["id_contorno"]
            == contour.get("id")
            == silhouette.get("id")
            == contour_id,
            f"Unexpected contour ID: {identifier}",
        )
        require(
            contour.get("d") == silhouette.get("d"),
            f"Contour/silhouette mismatch: {identifier}",
        )
        shape = path_polygons(silhouette.get("d"))
        require(len(shape) == 1, f"Expected one closed exterior contour: {identifier}")
        polygons.append(shape[0])
        bbox = item["bbox_px"]
        require(
            len(bbox) == 4 and all(isinstance(n, int) for n in bbox),
            "Invalid source bbox",
        )
        x, y, width, height = bbox
        require(
            0 <= x < x + width <= WIDTH and 0 <= y < y + height <= HEIGHT,
            "Invalid bbox bounds",
        )
        require(
            all(x <= px <= x + width and y <= py <= y + height for px, py in shape[0]),
            f"Contour outside source bbox: {identifier}",
        )
        individual = f"conjuntos_individuais/{identifier}.svg"
        require(
            item["arquivo_individual"] == individual,
            "Unexpected individual source path",
        )
        require(
            [g.get("id") for g in svg_files[individual].findall("s:g", NS)]
            == [identifier],
            f"Individual SVG group mismatch: {identifier}",
        )
        asset = f"{ASSETS}/{identifier}.svg"
        outputs[asset] = files[individual]
        parts.append(
            {
                "id": identifier,
                "contourId": contour_id,
                "label": item["nome"],
                "componentId": component,
                "asset": asset,
                "bbox": bbox,
                "path": silhouette.get("d"),
                "fillRule": "evenodd",
                "testPoint": [tx, ty],
            }
        )
    for index, part in enumerate(parts):
        hits = [
            i
            for i, polygon in enumerate(polygons)
            if inside(part["testPoint"], polygon)
        ]
        require(hits == [index], f"Ambiguous test point: {part['id']}")
    dataset = {
        "viewBox": VIEWBOX,
        "width": WIDTH,
        "height": HEIGHT,
        "asset": f"{ASSETS}/vehicle.svg",
        "parts": parts,
    }
    javascript = (
        "'use strict';\n\n"
        "// Generated by scripts/import_vehicle_vector.py from data/vehicle-visual/source.zip.\n"
        "const VehicleVector = "
        + json.dumps(dataset, ensure_ascii=False, indent=2)
        + ";\n\n"
        "if (typeof module !== 'undefined') module.exports = VehicleVector;\n"
    )
    # Use the project's pinned formatter; never install or fetch a dependency.
    formatted = subprocess.run(
        ["npx", "--no-install", "prettier", "--stdin-filepath", str(TARGET)],
        input=javascript,
        text=True,
        capture_output=True,
        check=True,
        cwd=ROOT,
    )
    outputs[str(TARGET.relative_to(ROOT))] = formatted.stdout.encode()
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate exact generated bytes without writing",
    )
    arguments = parser.parse_args()
    outputs = generate(SOURCE)
    for name, expected in outputs.items():
        target = ROOT / name
        if arguments.check:
            require(
                target.is_file() and target.read_bytes() == expected,
                f"Stale generated file: {name}",
            )
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(expected)
    actual_assets = {
        p.relative_to(ROOT).as_posix() for p in (ROOT / ASSETS).glob("*.svg")
    }
    require(
        actual_assets == {p for p in outputs if p.endswith(".svg")},
        "Unexpected generated SVG asset",
    )
    print(
        f"Vehicle vector: 37 reviewed pieces, 38 exact-source SVG assets ({'checked' if arguments.check else 'generated'})."
    )


if __name__ == "__main__":
    main()
