"""Regression checks for Chico's environmental findings and source boundaries."""

import copy
import gzip
import hashlib
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


class EnvironmentalAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.review = json.loads((ROOT / "data/proconve/reviewed-map.json").read_text())
        with gzip.open(ROOT / "data/proconve/sources/evidence.json.gz", "rt") as stream:
            cls.snapshot = json.load(stream)
        cls.data = builder.build(cls.review, cls.snapshot)
        cls.records = {record["id"]: record for record in cls.data["records"]}

    def test_evaporative_base_act_and_amendment_are_present_with_distinct_scope(self):
        base = self.records["ibama-in-26-2020"]
        self.assertEqual(base["phases"], ["L8"])
        self.assertEqual(base["catalogRecordIds"], ["ibama-031"])
        self.assertEqual(base["fullTextReviewed"], True)
        self.assertFalse(base["reviewStatus"]["amendmentChainReviewed"])
        self.assertIn("não", base["sourceStatus"].lower())
        self.assertTrue(
            any(
                effect["sourceId"] == "ibama-in-3-2023"
                for effect in base["incomingEffects"]
            )
        )
        self.assertTrue(
            any("tanque pressurizado" in item["rule"] for item in base["requirements"])
        )
        self.assertTrue(
            any(
                "não é rodagem obrigatória" in item["rule"]
                for item in base["requirements"]
            )
        )
        resolved = self.data["metadata"]["resolvedSourceGaps"]
        self.assertTrue(any(item["id"] == base["id"] for item in resolved))
        gaps = self.data["metadata"]["sourceGaps"]
        self.assertNotIn("não foi localizado", str(gaps))
        self.assertIn("NBR", str(gaps))

    def test_certified_originals_are_archived_with_exact_hashes(self):
        for key in ["in26-2020-certified", "in6-2025-certified"]:
            source = self.snapshot["sources"][key]
            raw = (ROOT / source["archivePath"]).read_bytes()
            self.assertTrue(raw.startswith(b"%PDF"))
            self.assertEqual(hashlib.sha256(raw).hexdigest(), source["sha256"])
            self.assertEqual(len(raw), source["bytes"])
            self.assertTrue(source["url"].startswith("https://www.ibama.gov.br/"))

    def test_iump_collection_and_annual_deliveries_are_separate(self):
        record = self.records["ibama-in-20-2025"]
        milestones = {
            flag["id"].split(":")[-1]: flag for flag in record["temporalFlags"]
        }
        self.assertEqual(milestones["coleta"]["date"], "2026-01-01")
        self.assertEqual(milestones["coleta"]["event"], "collection_start")
        self.assertNotIn("recurrence", milestones["coleta"])
        self.assertEqual(milestones["plano"]["date"], "2027-03-31")
        self.assertEqual(milestones["relatorio"]["date"], "2027-07-31")
        for name in ["plano", "relatorio"]:
            self.assertEqual(milestones[name]["event"], "deadline")
            self.assertEqual(milestones[name]["recurrence"]["firstYear"], 2027)
            self.assertEqual(milestones[name]["scope"]["phases"], ["L8"])
            self.assertNotIn("eletrico", milestones[name]["scope"]["powertrains"])
        self.assertEqual(
            self.records["ibama-in-23-2020"]["temporalFlags"],
            record["temporalFlags"],
        )
        self.assertEqual(
            self.records["ibama-in-16-2025"]["temporalFlags"],
            record["temporalFlags"],
        )

    def test_lcvm_guidance_is_separate_from_acts_and_does_not_grant_bev_exemption(self):
        guidance = self.data["metadata"]["procedureGuidance"]
        self.assertEqual(len(guidance), 5)
        self.assertEqual(self.data["metadata"]["recordCount"], 25)
        by_id = {item["id"]: item for item in guidance}
        self.assertIn("lcvm-alteracoes", by_id)
        self.assertEqual(by_id["lcvm-regular"]["kind"], "official_guidance")
        self.assertEqual(
            by_id["lcvm-regular"]["channel"]["url"], "https://infoserv.ibama.gov.br/"
        )
        self.assertIn("dispensa geral", by_id["lcvm-dispensa"]["note"])
        self.assertIn("não há", by_id["lcvm-dispensa"]["note"])
        self.assertIn("antiga", by_id["lcvm-quantidades-limitadas"]["note"])
        for guide in guidance:
            self.assertTrue(guide["documents"])
            self.assertTrue(guide["who"])
            for source in guide["sources"]:
                preserved = self.snapshot["sources"][source["sourceKey"]]
                self.assertEqual(source["url"], preserved["url"])
                self.assertIn(builder.clean(source["excerpt"]), preserved["text"])

    def test_noise_corporate_and_real_world_transitions_keep_their_scope(self):
        flags = self.records["conama-492-2018"]["temporalFlags"]
        by_id = {flag["id"]: flag for flag in flags}
        self.assertEqual(
            by_id["conama-492-2018:ruido-2025-new"]["scope"]["modelCohort"], "new"
        )
        self.assertEqual(
            by_id["conama-492-2018:ruido-2027-all"]["scope"]["modelCohort"], "all"
        )
        self.assertEqual(by_id["conama-492-2018:ruido-2027-all"]["date"], "2027-01-01")
        etr = by_id["conama-492-2018:etr-2027"]
        self.assertEqual(etr["date"], "2027-01-01")
        self.assertIn("2025", etr["dateBasis"]["excerpt"])
        self.assertNotIn("eletrico", etr["scope"]["powertrains"])
        corporate = by_id["conama-492-2018:corporativo-2027"]
        self.assertIn("não são obrigação individual", str(corporate["scope"]))
        self.assertTrue(all(flag["kind"] == "obligation_milestone" for flag in flags))

    def test_nmog_table_does_not_silently_continue_after_2027(self):
        for identifier in ["ibama-in-21-2021", "ibama-in-22-2020"]:
            transition = next(
                flag
                for flag in self.records[identifier]["temporalFlags"]
                if flag["id"] == "ibama-in-21-2021:nmog-2028"
            )
            self.assertEqual(transition["date"], "2028-01-01")
            self.assertIn("Tabela 2A", transition["source"]["excerpt"])
            self.assertIn("Tabela 2B", transition["source"]["excerpt"])
            self.assertIn("IN 15/2022", str(transition["scope"]))

    def test_importation_is_not_a_part_or_a_national_production_requirement(self):
        record = self.records["ibama-in-6-2025"]
        self.assertEqual(record["vehicleLinks"], [])
        self.assertEqual(record["generalCategories"], ["homologacao"])
        self.assertIsNone(record["fullTextReviewed"])
        self.assertIn("produção nacional", str(record["notes"]))
        self.assertIn("apenas", str(record["notes"]))
        self.assertTrue(
            any(
                relation["kind"] == "revoga_parcialmente"
                and "Anexo II" in relation["label"]
                for relation in record["relationships"]
            )
        )

    def test_review_copy_does_not_claim_a_consolidated_chain(self):
        for record in self.records.values():
            self.assertNotIn("cadeia de alterações conferida", record["sourceStatus"])
        self.assertEqual(self.records["ibama-in-29-2020"]["reviewedAt"], "2026-10-18")
        self.assertEqual(self.records["ibama-in-26-2020"]["reviewedAt"], "2026-10-19")
        self.assertEqual(self.data["metadata"]["phaseCounts"], {"L8": 21, "P8": 7})
        for identifier in ["ibama-in-19-2021", "ibama-in-22-2022"]:
            self.assertNotIn(identifier, self.records)

    def test_unknown_source_requirement_or_temporal_evidence_is_rejected(self):
        for key in ["requirements", "temporalFlags"]:
            review = copy.deepcopy(self.review)
            seed = next(
                row for row in review["records"] if row["id"] == "ibama-in-20-2025"
            )
            if key == "requirements":
                seed[key][0]["evidence"] = (
                    "Uma obrigação inventada não aparece na fonte."
                )
            else:
                seed[key][0]["source"]["excerpt"] = (
                    "Um prazo inventado não aparece na fonte."
                )
            with self.assertRaises(AssertionError):
                builder.build(review, self.snapshot)

    def test_compilation_is_deterministic_and_does_not_mutate_editorial_inputs(self):
        original_review = copy.deepcopy(self.review)
        original_snapshot = copy.deepcopy(self.snapshot)
        first = builder.build(self.review, self.snapshot)
        second = builder.build(self.review, self.snapshot)
        self.assertEqual(first, second)
        self.assertEqual(self.review, original_review)
        self.assertEqual(self.snapshot, original_snapshot)


if __name__ == "__main__":
    unittest.main()
