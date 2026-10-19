"""Guard against falsely promoting editorial publication into legal certainty."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from regulatory_contract import apply_contract
from check_project import check


class ContractTests(unittest.TestCase):
    def test_guidance_does_not_confirm_validity(self):
        result = apply_contract(
            {"id": "sample", "fullTextReviewed": False, "currentIndication": True},
            "inmetro",
            "2026-10-18",
        )
        self.assertFalse(result["currentIndication"])
        self.assertEqual(result["legalStatus"]["state"], "official_current_reference")
        self.assertTrue(result["publication"]["included"])
        self.assertFalse(result["reviewStatus"]["fullTextReviewed"])

    def test_unknown_review_stays_unknown(self):
        result = apply_contract({"id": "sample"}, "contran", "2026-10-18")
        self.assertIsNone(result["reviewStatus"]["fullTextReviewed"])
        self.assertFalse(result["applicability"]["vehicleSpecific"])

    def test_partial_revocation_retained(self):
        result = apply_contract(
            {"status": "parcialmente_revogada"}, "contran", "2026-10-18"
        )
        self.assertEqual(result["legalStatus"]["state"], "partially_repealed")

    def test_directed_review_preserves_date_scope_and_unknown_full_text(self):
        result = apply_contract(
            {
                "id": "directed",
                "documentCheck": {"state": "extraido"},
                "reviewMetadata": {
                    "reviewedAt": "2026-10-19",
                    "reviewScope": ["art. 2º", "revogação expressa"],
                    "fullTextReviewed": None,
                    "amendmentChainReviewed": False,
                },
            },
            "contran",
            "2026-10-18",
        )
        review = result["reviewStatus"]
        self.assertEqual(review["reviewedAt"], "2026-10-19")
        self.assertEqual(review["reviewScope"], ["art. 2º", "revogação expressa"])
        self.assertIsNone(review["fullTextReviewed"])
        self.assertFalse(review["amendmentChainReviewed"])
        self.assertIn("cadeia integral não certificada", review["summary"])

    def test_guidance_cannot_promote_full_text_even_with_editorial_override(self):
        result = apply_contract(
            {
                "id": "guidance",
                "fullTextReviewed": False,
                "reviewMetadata": {"fullTextReviewed": True},
            },
            "inmetro",
            "2026-10-19",
        )
        self.assertFalse(result["reviewStatus"]["fullTextReviewed"])
        self.assertIn("íntegra consolidada pendente", result["reviewStatus"]["summary"])

    def test_complete_chain_requires_its_own_evidence(self):
        with self.assertRaisesRegex(ValueError, "requires evidence"):
            apply_contract(
                {
                    "id": "unsupported-chain",
                    "reviewMetadata": {"amendmentChainReviewed": True},
                },
                "contran",
                "2026-10-19",
            )

    def test_compiled_contract(self):
        check()


unittest.main()
