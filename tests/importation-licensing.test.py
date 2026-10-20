"""Keep the licensing/shipment sequence faithful to IN Ibama 6/2025, art. 5."""

import copy
import gzip
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location(
    "proconve_builder", ROOT / "scripts/build_proconve_map.py"
)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class ImportationLicensingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.review = json.loads((ROOT / "data/proconve/reviewed-map.json").read_text())
        with gzip.open(ROOT / "data/proconve/sources/evidence.json.gz", "rt") as stream:
            cls.snapshot = json.load(stream)
        cls.data = builder.build(cls.review, cls.snapshot)
        cls.record = next(
            record
            for record in cls.data["records"]
            if record["id"] == "ibama-in-6-2025"
        )
        cls.requirement = next(
            row
            for row in cls.record["requirements"]
            if row["id"] == "ibama-in-6-2025:req:02"
        )

    def test_operation_flex_and_impediment_keep_their_source_backed_conditions(self):
        rule = self.requirement["rule"]
        evidence = self.requirement["evidence"]
        source = self.snapshot["sources"]["in6-2025-certified"]
        self.assertIn(builder.clean(evidence), source["text"])

        # The license precedes shipment; the authority may remove that restriction.
        self.assertRegex(
            rule,
            r"por operação[^.]*Ibama exige licença prévia ao embarque; "
            r"[^.]*retirar a restrição de embarque mediante justificativa fundamentada",
        )
        self.assertIn("o Ibama exigirá licença prévia ao embarque", evidence)
        self.assertIn("é facultada ao Ibama a retirada da restrição", evidence)
        self.assertNotIn("embarque prévio", rule)

        # Flex changes the prior-shipment condition, not the need for its license.
        self.assertRegex(
            rule,
            r"flex[^.]*licença[^.]*múltiplas operações[^.]*"
            r"é dispensada a licença prévia ao embarque",
        )
        self.assertIn("b) é dispensada a licença prévia ao embarque", evidence)
        self.assertRegex(rule, r"NCM/destaque[^.]*Anexo I")
        self.assertRegex(
            rule,
            r"Ambas[^.]*produtos[^.]*quantidades autorizados[^.]*"
            r"prazo de validade da licença/LPCO",
        )
        self.assertIn("limitada aos produtos e quantidades autorizados", evidence)
        self.assertIn("prazo de validade da LPCO", evidence)
        self.assertRegex(
            rule, r"Impedimento[^.]*importação proibida[^.]*não uma licença"
        )
        self.assertIn("importação é proibida", evidence)

    def test_correction_keeps_directed_review_and_editorial_identity(self):
        editorial = next(
            row for row in self.review["records"] if row["id"] == "ibama-in-6-2025"
        )
        original = next(
            row
            for row in editorial["requirements"]
            if row["id"] == "ibama-in-6-2025:req:02"
        )
        self.assertEqual(self.requirement["id"], original["id"])
        self.assertEqual(self.requirement["rule"], original["rule"])
        self.assertEqual(self.requirement["clause"], "Art. 5º e Anexo I")
        self.assertEqual(self.requirement["sourceKey"], original["sourceKey"])
        self.assertEqual(self.requirement["sourceUrl"], original["sourceUrl"])
        self.assertIsNone(self.record["fullTextReviewed"])
        self.assertFalse(self.record["reviewStatus"]["amendmentChainReviewed"])
        before = copy.deepcopy(self.review)
        builder.build(self.review, self.snapshot)
        self.assertEqual(self.review, before)


if __name__ == "__main__":
    unittest.main()
