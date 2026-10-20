"""The Obsidian derivative may omit the canvas, never vehicle geometry or paint."""

import copy
import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "previews", ROOT / "scripts/render_vehicle_previews.py"
)
previews = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previews)


class VehicleBackgroundTests(unittest.TestCase):
    def test_only_the_named_supplied_canvas_is_removed_from_the_render_input(self):
        source = (ROOT / "assets/vehicle-vector/vehicle.svg").read_bytes()
        original = ET.fromstring(source)
        expected = copy.deepcopy(original)
        canvas = next(child for child in expected if child.get("id") == "fundo_branco")
        expected.remove(canvas)
        derived = ET.fromstring(previews.transparent_vehicle_source(source))
        self.assertEqual(ET.tostring(derived), ET.tostring(expected))
        self.assertEqual(derived.attrib["viewBox"], "0 0 1536 1024")
        self.assertEqual(
            [child.get("id") for child in derived if child.tag.endswith("}g")],
            [child.get("id") for child in original if child.tag.endswith("}g")],
        )
        self.assertEqual(
            (ROOT / "assets/vehicle-vector/vehicle.svg").read_bytes(), source
        )

    def test_an_unexpected_background_cannot_silently_remove_a_drawing_object(self):
        for fill, width in (("#000000", "1536"), ("#ffffff", "20")):
            payload = (
                '<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024">'
                f'<rect id="fundo_branco" width="{width}" height="1024" fill="{fill}"/>'
                "</svg>"
            ).encode()
            with self.assertRaisesRegex(ValueError, "unexpected drawing object"):
                previews.transparent_vehicle_source(payload)

    def test_committed_main_preview_is_transparent_at_the_original_dimensions(self):
        with Image.open(ROOT / "assets/vehicle-vector/previews/vehicle.webp") as image:
            rgba = image.convert("RGBA")
            self.assertEqual(rgba.size, (3072, 2048))
            self.assertEqual(rgba.getpixel((0, 0))[3], 0)
            self.assertEqual(rgba.getchannel("A").getextrema(), (0, 255))


if __name__ == "__main__":
    unittest.main()
