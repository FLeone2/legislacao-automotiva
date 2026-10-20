"""Unresolved or excluded acts cannot enter the public citation index."""

import importlib.util
import json
import gzip
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "technical", ROOT / "scripts/build_technical_standards.py"
)
technical = importlib.util.module_from_spec(spec)
spec.loader.exec_module(technical)


class CitationContract(unittest.TestCase):
    def test_publication_gate(self):
        survey = json.loads(
            gzip.decompress(
                (ROOT / "data/technical-standards/review-input.json.gz").read_bytes()
            )
        )
        public = json.loads((ROOT / "data/site/technical-standards.json").read_text())
        published = {entry["actId"] for entry in public["records"]}
        index, pending = technical.compile_index(survey, published)
        self.assertEqual(index, public)
        self.assertEqual(len(pending), 257)
        empty, pending = technical.compile_index(survey, set())
        self.assertEqual(empty["records"], [])
        self.assertEqual(len(pending), 570)

    def test_raw_survey_is_not_shipped(self):
        from tempfile import TemporaryDirectory
        import sys

        sys.path.insert(0, str(ROOT / "scripts"))
        from build_static import build

        with TemporaryDirectory() as temporary:
            build(temporary)
            self.assertFalse((Path(temporary) / "data/technical-standards").exists())
            self.assertTrue(
                (Path(temporary) / "data/site/technical-standards.json").exists()
            )


if __name__ == "__main__":
    unittest.main()
