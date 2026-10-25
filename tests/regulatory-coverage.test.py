"""Finite coverage reporting must not manufacture applicability or reviewed chains."""

import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "coverage_builder", ROOT / "scripts/build_regulatory_coverage.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CoverageTest(unittest.TestCase):
    def test_report_is_reproducible_and_qualifies_its_finite_inventory(self):
        result = MODULE.build_report()
        self.assertEqual(MODULE.serialized(result), MODULE.OUTPUT.read_bytes())
        self.assertFalse(result["universalCoverageConfirmed"])
        self.assertEqual(result["summary"]["acts"], 294)
        self.assertEqual(result["summary"]["excludedContranActs"], 55)
        self.assertEqual(
            result["summary"]["requirements"],
            result["summary"]["publicTextExcerpts"]
            + result["summary"]["officialGuidanceItems"],
        )
        self.assertEqual(len(result["subsystems"]), 33)
        self.assertTrue(any(row["status"] == "candidate" for row in result["findings"]))
        self.assertTrue(
            any(row["status"] == "requires_review" for row in result["findings"])
        )
        self.assertEqual(
            result["revision"], json.loads(MODULE.REVISION.read_text())["revision"]
        )

    def test_subsystem_requirements_are_explicit_links_not_all_requirements_of_related_acts(
        self,
    ):
        result = MODULE.build_report()
        mapping = json.loads(
            (ROOT / "data/vehicle-legislation/reviewed-map.json").read_text()
        )
        for row in result["subsystems"]:
            expected = {
                rid
                for part in mapping["parts"]
                for topic in part["topics"]
                if topic["subsystemId"] == row["id"]
                for link in topic.get("links", [])
                for rid in link.get("requirementIds", [])
            }
            self.assertEqual(set(row["requirementIds"]), expected)
        inmetro = next(row for row in result["agencies"] if row["id"] == "inmetro")
        self.assertEqual(inmetro["fullTextReviewed"], 0)
        self.assertEqual(inmetro["chainReviewed"], 0)


if __name__ == "__main__":
    unittest.main()
