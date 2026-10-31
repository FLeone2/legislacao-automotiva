"""Validate the prototype GLB contract without changing authored or base assets."""

import hashlib
import json
import pathlib
import struct


ROOT = pathlib.Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets/prototype/models"


def glb(path):
    data = path.read_bytes()
    magic, version, length = struct.unpack_from("<III", data)
    assert magic == 0x46546C67 and version == 2 and length == len(data), path
    json_length, chunk_type = struct.unpack_from("<II", data, 12)
    assert chunk_type == 0x4E4F534A, path
    return json.loads(data[20 : 20 + json_length])


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    base = ROOT / "assets/models/suv/bmw-x5.glb"
    assert (
        checksum(base)
        == "25c74e4411872932dee468a1d2f533ca5d7e7e448ef55244c2c7bb5e152a37e2"
    )
    tires = [
        n
        for n in glb(base)["nodes"]
        if n.get("extras", {}).get("sourceInstance") == "001_Wheel_Tire"
    ]
    assert len(tires) == 4, f"Expected four road tires, found {len(tires)}"
    original = ROOT / "assets/models/suv/mechanical-supplement.glb"
    assert (
        checksum(original)
        == "d5e013b9ae5265ca98a0d78ad4d7089c32bdc9c2dc0dd094af582a4dfea4e213"
    )

    asset = ASSETS / "mechanical-supplement.glb"
    document = glb(asset)
    metadata = json.loads((ASSETS / "mechanical-provenance.json").read_text())
    pieces = json.loads((ASSETS / "semantic-pieces.json").read_text())
    assert metadata["sha256"] == checksum(asset)
    assert metadata["bytes"] == asset.stat().st_size
    assert metadata["assembledInstallation"]["engineTranslation"] == [0, -0.185, 0]
    assert metadata["assembledInstallation"]["radiatorTranslation"] == [0, -0.045, 0]
    for source in metadata["authoredSources"]:
        assert checksum(ROOT / source["path"]) == source["sha256"], source["path"]

    required = {
        "partId",
        "section",
        "pieceId",
        "pieceLabel",
        "semanticPath",
        "parentAssemblyId",
    }
    mesh_nodes = [node for node in document["nodes"] if "mesh" in node]
    ids = {p["pieceId"] for p in pieces}
    assert len(ids) == len(pieces)
    assert len(mesh_nodes) == metadata["drawMeshCount"] < 300
    assert len(pieces) == metadata["pieceCount"]
    for node in mesh_nodes:
        extras = node.get("extras", {})
        assert required <= extras.keys(), node["name"]
        assert extras["pieceId"] in ids
        assert extras["partId"] == extras["parentAssemblyId"]
        assert extras["partId"] != "wheels", (
            "Supplement must never add a fifth road wheel"
        )
    assert {f"battery-module-{i:02d}" for i in range(1, 11)} <= ids
    assert {
        "battery-cooling-plate",
        "battery-hv-connectors",
        "battery-bms",
        "battery-busbars",
    } <= ids
    for axle in ("front", "rear"):
        for side in ("left", "right"):
            for piece in ("spring", "damper", "strut-mount", "control-arm", "knuckle"):
                assert f"{axle}-{side}-{piece}" in ids
    assert len([p for p in pieces if p["section"] == "engineInternal"]) == 6
    assert (
        len([p for p in pieces if p["pieceId"].startswith("engine-ignition-coil-")])
        == 4
    )
    for piece in pieces:
        assert all(
            lo < hi for lo, hi in zip(piece["bounds"]["min"], piece["bounds"]["max"])
        ), piece["pieceId"]
    print(
        json.dumps(
            {
                "fourRoadTires": len(tires),
                "semanticPieces": len(pieces),
                "drawMeshes": len(mesh_nodes),
                "bytes": asset.stat().st_size,
                "sha256": checksum(asset),
            }
        )
    )


if __name__ == "__main__":
    main()
