"""Check actual model preview pixels, source meshes and subsystem identity without GPU."""

import hashlib
import json
from pathlib import Path
import struct
import subprocess
import unittest

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets/models/suv"
OUTPUT = ASSETS / "thumbnails"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_nodes(path):
    data = path.read_bytes()
    length = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20 : 20 + length])
    return {row["name"]: row["extras"] for row in gltf["nodes"] if "mesh" in row}


class ModelThumbnailsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = json.loads((OUTPUT / "index.json").read_text())
        cls.provenance = json.loads((OUTPUT / "provenance.json").read_text())
        cls.images = {row["id"]: row for row in cls.provenance["images"]}
        cls.nodes = source_nodes(ASSETS / "bmw-x5.glb") | source_nodes(
            ASSETS / "mechanical-supplement.glb"
        )
        cls.mapping = json.loads(
            subprocess.check_output(
                [
                    "node",
                    "-e",
                    "const s=require('./src/guide/subsystem-coverage.js');"
                    "const p=require('./src/guide/vehicle-parts.js');"
                    "const {modelThumbnail}=require('./src/guide/model-thumbnails.js');"
                    "console.log(JSON.stringify({rows:s.ALL_SUBSYSTEMS,assemblies:p.SUV_ASSEMBLY_IDS,"
                    "resolved:s.ALL_SUBSYSTEMS.map(r=>({id:r.id,preview:modelThumbnail(s.subsystemSelection(r.id))})),"
                    "wrongModel:modelThumbnail(s.subsystemSelection(s.ALL_SUBSYSTEMS[0].id),'truck'),"
                    "wrongAssembly:modelThumbnail({subsystemId:'freios/fluido',assemblyIds:['brakes']}),"
                    "unknown:modelThumbnail({subsystemId:'unknown'})}));",
                ],
                cwd=ROOT,
                text=True,
            )
        )

    def test_all_33_subsystems_and_21_assemblies_have_exact_preview_selections(self):
        self.assertEqual(len(self.index["subsystems"]), 33)
        self.assertEqual(set(self.index["assemblies"]), set(self.mapping["assemblies"]))
        self.assertEqual(len(self.index["assemblies"]), 21)
        self.assertEqual(len(self.images), 26)
        self.assertFalse(self.provenance["partialExport"])
        resolved = {row["id"]: row["preview"] for row in self.mapping["resolved"]}
        for row in self.mapping["rows"]:
            with self.subTest(subsystem=row["id"]):
                entry = self.index["subsystems"][row["id"]]
                image = self.images[entry["imageId"]]
                self.assertEqual(set(row["assemblyIds"]), set(image["assemblyIds"]))
                self.assertEqual(set(entry["assemblyIds"]), set(image["assemblyIds"]))
                self.assertEqual(resolved[row["id"]]["id"], image["id"])
                self.assertIn(image["sha256"][:16], resolved[row["id"]]["assetUrl"])
        self.assertIsNone(self.mapping["wrongModel"])
        self.assertIsNone(self.mapping["wrongAssembly"])
        self.assertIsNone(self.mapping["unknown"])

    def test_manifest_and_input_hashes_match_the_saved_export(self):
        self.assertEqual(self.provenance["indexSha256"], sha(OUTPUT / "index.json"))
        paths = {row["path"] for row in self.provenance["inputs"]}
        self.assertIn("scripts/model-thumbnail-harness.js", paths)
        self.assertIn("src/guide/reference-suv.js", paths)
        self.assertNotIn("src/guide/VehicleScene.jsx", paths)
        for row in self.provenance["inputs"]:
            self.assertEqual(row["sha256"], sha(ROOT / row["path"]), row["path"])
        for row in self.images.values():
            self.assertEqual(row["sha256"], sha(OUTPUT / row["file"]))

    def test_every_preview_contains_decodable_detailed_transparent_pixels(self):
        for row in self.images.values():
            with self.subTest(image=row["id"]):
                image = Image.open(OUTPUT / row["file"]).convert("RGBA")
                self.assertEqual(image.size, (1024, 768))
                alpha = image.getchannel("A")
                low, high = alpha.getextrema()
                self.assertEqual(low, 0)
                if row["id"] == "glass":
                    # Actual glass remains translucent; making it opaque would
                    # hide a material regression rather than improve detail.
                    self.assertGreater(high, 80)
                    self.assertLess(high, 255)
                    threshold = 64
                else:
                    self.assertEqual(high, 255)
                    threshold = 230
                opaque = alpha.point(lambda value: 255 if value > threshold else 0)
                self.assertGreater(
                    opaque.histogram()[255], image.width * image.height * 0.025
                )
                self.assertGreater(
                    max(ImageStat.Stat(image.convert("RGB"), opaque).stddev), 12
                )
                self.assertEqual(
                    (row["renderWidth"], row["renderHeight"]), (2048, 1536)
                )

    def test_selected_meshes_are_real_and_context_is_explicitly_separate(self):
        for image in self.images.values():
            with self.subTest(image=image["id"]):
                self.assertEqual(
                    set(image["selectedMeshIds"]),
                    {m["id"] for m in image["selectedMeshes"]},
                )
                primary = set()
                context = set()
                for mesh in image["selectedMeshes"]:
                    source = self.nodes[mesh["id"]]
                    self.assertEqual(mesh["sourceMesh"], source["sourceMesh"])
                    self.assertEqual(mesh["sourceFile"], source["sourceFile"])
                    assembly = (
                        "steering"
                        if "SteeringWheel" in source["sourceMesh"]
                        else "vin"
                        if "LicensePlates" in source["sourceFile"]
                        else source["partId"]
                    )
                    self.assertEqual(mesh["assemblyId"], assembly)
                    if mesh["role"] == "context":
                        context.add(assembly)
                        self.assertIn("brakes", image["assemblyIds"])
                        self.assertEqual(assembly, "wheels")
                        self.assertTrue(
                            "Wheel_Connecter" in mesh["sourceMesh"]
                            or "Wheel_Screws" in mesh["sourceMesh"]
                        )
                    else:
                        self.assertEqual(mesh["role"], "selection")
                        primary.add(assembly)
                    self.assertEqual(
                        mesh["mechanicalExample"], bool(source.get("mechanicalExample"))
                    )
                self.assertEqual(primary, set(image["assemblyIds"]))
                self.assertEqual(context, set(image["contextAssemblyIds"]))

    def test_brake_fluid_never_uses_a_disc_and_brake_subset_shows_actual_front_face(
        self,
    ):
        entry = self.index["subsystems"]["freios/fluido"]
        fluid = self.images[entry["imageId"]]
        self.assertEqual(fluid["assemblyIds"], ["brakeFluid"])
        self.assertEqual(fluid["contextAssemblyIds"], [])
        self.assertTrue(
            all(m["section"] == "brakeHydraulics" for m in fluid["selectedMeshes"])
        )
        self.assertNotEqual(fluid["sha256"], self.images["brakes"]["sha256"])
        brake = self.images["brakes"]
        self.assertEqual(brake["contextAssemblyIds"], ["wheels"])
        self.assertTrue(
            all(
                m["baseCenter"][0] < -0.8 and m["baseCenter"][2] > 0.4
                for m in brake["selectedMeshes"]
            )
        )
        self.assertFalse(
            any("Brake_Cover" in m["sourceMesh"] for m in brake["selectedMeshes"])
        )
        self.assertTrue(
            any(
                m["flatShading"] and "Brake_Disk" in m["sourceMesh"]
                for m in brake["selectedMeshes"]
            )
        )

    def test_motor_suspension_and_hybrid_are_identified_as_didactic_examples(self):
        for identity in ("engine", "chassis", "batteryHV--engine--motorElectric"):
            image = self.images[identity]
            self.assertTrue(image["mechanicalExample"])
            self.assertIn("authored-mechanics", image["modelSources"])
        self.assertEqual(
            {m["section"] for m in self.images["chassis"]["selectedMeshes"]},
            {"frontSuspension"},
        )
        hybrid = self.images["batteryHV--engine--motorElectric"]
        self.assertEqual(
            set(hybrid["assemblyIds"]), {"batteryHV", "engine", "motorElectric"}
        )
        self.assertEqual(set(hybrid["displayTranslations"]), set(hybrid["assemblyIds"]))

    def test_derivative_previews_retain_creator_license_and_adaptations(self):
        bmw = self.provenance["modelSources"]["bmw-x5-g05"]
        self.assertIn("BMW Car IT", bmw["creator"])
        self.assertEqual(bmw["license"], "CC-BY-4.0")
        self.assertIn("bmwcarit/digital-car-3d", bmw["sourceUrl"])
        self.assertEqual(
            bmw["licenseUrl"], "https://creativecommons.org/licenses/by/4.0/"
        )
        self.assertTrue(self.provenance["adaptations"])
        self.assertTrue(self.provenance["limitations"])


if __name__ == "__main__":
    unittest.main()
