"""Validate the shipped reference asset, its provenance and portable PBR materials."""

import hashlib
import json
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]
ASSET = ROOT / "assets/models/suv"


class ReferenceAssetTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.provenance = json.loads((ASSET / "provenance.json").read_text())
        cls.bytes = (ASSET / "bmw-x5.glb").read_bytes()
        magic, version, total = struct.unpack_from("<III", cls.bytes)
        assert magic == 0x46546C67 and version == 2 and total == len(cls.bytes)
        length, kind = struct.unpack_from("<II", cls.bytes, 12)
        assert kind == 0x4E4F534A
        cls.gltf = json.loads(cls.bytes[20 : 20 + length])

    def test_reference_identity_license_and_checksum(self):
        self.assertEqual(self.provenance["license"], "CC-BY-4.0")
        self.assertTrue(self.provenance["visualOnly"])
        self.assertEqual(
            self.provenance["sha256"], hashlib.sha256(self.bytes).hexdigest()
        )
        self.assertIn("bmwcarit/digital-car-3d", self.provenance["sourceUrl"])
        self.assertTrue((ASSET / "LICENSE.txt").is_file())
        self.assertLess(len(self.bytes), 12_000_000)

    def test_material_factors_survive_export_and_compression(self):
        materials = {m["name"]: m for m in self.gltf["materials"]}
        tire = materials["M_E_common_Tire"]["pbrMetallicRoughness"]
        self.assertLess(max(tire["baseColorFactor"][:3]), 0.04)
        self.assertGreater(tire["roughnessFactor"], 0.7)
        paint = materials["M_E_common_Paint"]["pbrMetallicRoughness"]
        self.assertGreater(paint["metallicFactor"], 0.5)
        self.assertLess(max(paint["baseColorFactor"][:3]), 0.7)
        glass = materials["M_E_common_Glass_1sided"]
        self.assertEqual(glass["alphaMode"], "BLEND")
        self.assertLess(glass["pbrMetallicRoughness"]["baseColorFactor"][3], 1)

    def test_source_mesh_identity_and_assembly_tags_are_retained(self):
        nodes = [node for node in self.gltf["nodes"] if "mesh" in node]
        self.assertGreaterEqual(len(nodes), 100)
        parts = {node["extras"]["partId"] for node in nodes}
        self.assertTrue(
            {
                "body",
                "doors",
                "glass",
                "seats",
                "wheels",
                "brakes",
                "steering",
                "lights",
                "mirrors",
                "electronics",
            }
            <= parts
        )
        for node in nodes:
            extras = node["extras"]
            self.assertTrue(extras["sourceFile"].startswith("meshes/"))
            self.assertTrue(extras["sourceMesh"])
            self.assertTrue(extras["sourceRcaId"])

    def test_decoder_and_textures_have_no_runtime_cdn_dependency(self):
        self.assertIn("KHR_draco_mesh_compression", self.gltf["extensionsRequired"])
        self.assertTrue((ASSET / "draco/draco_decoder.wasm").is_file())
        self.assertTrue((ASSET / "draco/draco_wasm_wrapper.js").is_file())
        self.assertTrue((ASSET / "draco/LICENSE.txt").is_file())
        for buffer in self.gltf.get("buffers", []):
            self.assertNotIn("uri", buffer)
        for image in self.gltf.get("images", []):
            self.assertIn("bufferView", image)


if __name__ == "__main__":
    unittest.main()
