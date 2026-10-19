"""Directed Inmetro audit fixes retain scope, evidence and pending full review."""

import contextlib
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))


def normalized(value):
    return re.sub(r"\s+", " ", value).strip()


class InmetroAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.review = json.loads((ROOT / "data/inmetro/reviewed-map.json").read_text())
        cls.rows = {r["id"]: r for r in cls.review["records"]}
        with gzip.open(ROOT / "data/inmetro/sources/evidence.json.gz", "rt") as f:
            cls.sources = json.load(f)["sources"]

    def test_directed_corrections_do_not_promote_full_act_review(self):
        self.assertEqual(len(self.rows), 18)
        for record in self.rows.values():
            self.assertIs(record["fullTextReviewed"], False, record["id"])
        pbev = self.rows["inmetro-169-2023"]
        self.assertIn("voluntário", pbev["mechanism"])
        self.assertEqual(len(pbev["requirements"]), 2)
        self.assertTrue(
            all(t["kind"] == "reference_only" for t in pbev["consultationTracks"])
        )
        self.assertEqual(
            {t["id"] for t in pbev["consultationTracks"]}, {"ice", "hev", "phev", "bev"}
        )
        self.assertEqual(
            {r["targetId"] for r in pbev["relationships"]},
            {"mover-002", "ibama-in-5-2024"},
        )

    def test_office_is_conditional_guidance_not_traction_certification(self):
        record = self.rows["inmetro-145-2022"]
        requirements = {r["id"]: r for r in record["requirements"]}
        guidance = [requirements[f"inmetro-145-2022:req:{n}"] for n in range(11, 15)]
        for requirement in guidance:
            self.assertEqual(requirement["evidenceKind"], "official_guidance")
            self.assertEqual(requirement["sourceKey"], "oficio-circular-5-2026")
            self.assertIn("chumbo", requirement["scope"].lower())
        arrival = requirements["inmetro-145-2022:req:12"]
        self.assertIn("modelo 5", arrival["scope"])
        self.assertIn("Quando utilizado", arrival["rule"])
        self.assertIn("não", arrival["rule"])
        self.assertIn("íons de lítio", requirements["inmetro-145-2022:req:06"]["rule"])

    def test_led_exclusion_keeps_traffic_rules_separate(self):
        requirement = next(
            q
            for q in self.rows["inmetro-145-2022"]["requirements"]
            if q["id"] == "inmetro-145-2022:req:05"
        )
        self.assertIn("filamento e miniatura", requirement["title"])
        self.assertIn("LED automotivo não integra", requirement["rule"])
        self.assertIn("231/2026", requirement["rule"])
        self.assertIn("CONTRAN", requirement["rule"])
        self.assertIn("não autoriza", requirement["rule"])
        self.assertEqual(requirement["sourceKey"], "faq-led-automotivo-2026")
        self.assertNotIn("inmetro-231-2026", self.rows)

    def test_bearing_edition_is_incorporated_not_invented_test_method(self):
        requirements = self.rows["inmetro-145-2022"]["requirements"]
        edition = next(q for q in requirements if q["id"] == "inmetro-145-2022:req:15")
        self.assertEqual(edition["evidenceKind"], "public_text_excerpt")
        self.assertEqual(edition["referenceStandard"]["designation"], "ISO 4383")
        self.assertEqual(edition["referenceStandard"]["edition"], "2000")
        self.assertIn("tabela 2", edition["clause"])
        self.assertNotIn("method", edition)
        transition = next(
            q for q in requirements if q["id"] == "inmetro-145-2022:req:16"
        )
        self.assertIn("não exige iniciar novo processo", transition["rule"])

    def test_deadlines_keep_family_and_laboratory_conditions(self):
        flags = self.rows["inmetro-379-2021"]["temporalFlags"]
        indexed = {f["date"]: f for f in flags}
        self.assertEqual(set(indexed), {"2026-10-23", "2025-11-30", "2027-11-30"})
        self.assertIn(
            "329/2020", " ".join(indexed["2026-10-23"]["scope"]["conditions"])
        )
        self.assertIn(
            "não acreditados", " ".join(indexed["2025-11-30"]["scope"]["conditions"])
        )
        self.assertNotIn(
            "não acreditados", " ".join(indexed["2027-11-30"]["scope"]["conditions"])
        )
        for flag in flags:
            self.assertEqual(flag["kind"], "obligation_milestone")
            self.assertEqual(flag["event"], "deadline")
            self.assertIn("Art. 15", flag["source"]["clause"])
            source = self.sources[flag["source"]["sourceKey"]]
            self.assertIn(
                normalized(flag["source"]["excerpt"]), normalized(source["text"])
            )

    def test_archived_documents_and_requirement_excerpts_have_provenance(self):
        for source in self.sources.values():
            if source.get("archivedDocument"):
                document = ROOT / source["archivedDocument"]
                self.assertEqual(
                    hashlib.sha256(document.read_bytes()).hexdigest(), source["sha256"]
                )
        for record in self.rows.values():
            for requirement in record["requirements"]:
                source = self.sources[requirement.get("sourceKey", record["sourceKey"])]
                self.assertIn(
                    normalized(requirement["evidence"]), normalized(source["text"])
                )
                self.assertFalse(
                    requirement["evidence"].rstrip().endswith("índices de")
                )
                self.assertFalse(
                    requirement["evidence"].rstrip().endswith("comparação relat")
                )
        attempts = json.loads(
            (
                ROOT / "data/inmetro/sources/retrieval-attempts-2026-10-19.json"
            ).read_text()
        )
        rtac = [a for a in attempts if "RTAC00" in a["url"]]
        dou = [a for a in attempts if "in.gov.br" in a["url"]]
        self.assertEqual(len(rtac), 4)
        self.assertEqual(len(dou), 2)
        self.assertTrue(all("503" in a.get("error", "") for a in rtac))
        self.assertTrue(all("403" in a.get("error", "") for a in dou))

    def test_compiler_preserves_scoped_deadlines_without_global_regeneration(self):
        spec = importlib.util.spec_from_file_location(
            "certification_build", ROOT / "scripts/build_certification_maps.py"
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory)
            shutil.copytree(ROOT / "data/inmetro", destination / "data/inmetro")
            module.ROOT = destination
            with contextlib.redirect_stdout(io.StringIO()):
                module.build("inmetro")
            compiled = json.loads(
                (destination / "data/inmetro/active.json").read_text()
            )
        rows = {r["id"]: r for r in compiled["records"]}
        self.assertEqual(
            rows["inmetro-379-2021"]["temporalFlags"],
            self.rows["inmetro-379-2021"]["temporalFlags"],
        )
        self.assertEqual(
            rows["inmetro-169-2023"]["consultationTracks"],
            self.rows["inmetro-169-2023"]["consultationTracks"],
        )
        for row in rows.values():
            self.assertIs(row["reviewStatus"]["fullTextReviewed"], False)
            self.assertEqual(row["legalStatus"]["state"], "official_current_reference")


if __name__ == "__main__":
    unittest.main()
