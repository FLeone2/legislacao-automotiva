"""Source-backed corrections and consultative transitions, without a vehicle checklist."""

from copy import deepcopy
import contextlib
import csv
import gzip
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_active_catalogs as active
import build_contran_map as inventory


def read(path):
    return json.loads((ROOT / path).read_text())


class ContranConsultation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.editorial = read("data/contran/reviewed-consultation.json")
        cls.effects = read("data/contran/reviewed-effects.json")
        with gzip.open(ROOT / "data/contran/sources/evidence.json.gz", "rt") as f:
            cls.sources = json.load(f)["sources"]

    def rows(self):
        return [
            {
                "id": key,
                "number": number,
                "year": year,
                "officialUrl": "https://www.gov.br/example/" + key,
                "status": "vigencia_expressa",
                "statusEvidence": ["Em vigor."],
                "notes": [],
                "incomingEffects": [],
                "relationships": [],
            }
            for key, number, year in [
                ("contran-997-2023", 997, 2023),
                ("contran-220-2007", 220, 2007),
            ]
        ]

    def effect(self):
        return next(
            e
            for e in self.effects["effects"]
            if e["sourceId"] == "contran-997-2023"
            and e["targetId"] == "contran-220-2007"
        )

    def test_repeal_changes_on_effective_date_not_original_base_date(self):
        effect = self.effect()
        self.assertEqual(effect["viaActId"], "contran-951-2022")
        self.assertEqual(effect["effectiveDate"], "2023-10-02")
        self.assertEqual(
            [x["actId"] for x in effect["chain"]],
            ["contran-951-2022", "contran-997-2023"],
        )
        for as_of, status in [
            ("2022-04-01", "vigencia_expressa"),
            ("2023-10-01", "vigencia_expressa"),
            ("2023-10-02", "revogada"),
            ("2026-10-19", "revogada"),
        ]:
            with self.subTest(as_of=as_of):
                rows = self.rows()
                inventory.apply_reviewed_effects(rows, {"effects": [effect]}, as_of)
                self.assertEqual(rows[1]["status"], status)
                self.assertEqual(
                    rows[1]["incomingEffects"][0]["viaClause"], "Art. 8º, I"
                )

    def test_effect_idempotency_and_no_inference_from_mentions(self):
        rows = self.rows()
        rows[0]["notes"] = ["Menciona a 220/2007"]
        inventory.apply_reviewed_effects(rows, {"effects": []}, "2026-10-19")
        self.assertEqual(rows[1]["status"], "vigencia_expressa")
        for _ in range(2):
            inventory.apply_reviewed_effects(
                rows, {"effects": [self.effect()]}, "2026-10-19"
            )
        self.assertEqual(len(rows[1]["incomingEffects"]), 1)
        self.assertEqual(len(rows[0]["relationships"]), 1)
        self.assertEqual(len(rows[1]["notes"]), 1)

    def test_every_new_clause_is_found_in_preserved_official_text(self):
        active.validate_consultation(self.editorial, self.sources)
        for records in [self.editorial["records"], self.editorial["externalRecords"]]:
            for act_id, entry in records.items():
                for requirement in entry["requirements"]:
                    self.assertTrue(requirement["id"].startswith(act_id + ":req:"))
                    self.assertIn(requirement["sourceKey"], self.sources)
                self.assertFalse(entry["reviewMetadata"]["amendmentChainReviewed"])
                self.assertIsNone(entry["reviewMetadata"]["fullTextReviewed"])

    def test_drifted_evidence_or_unscoped_milestone_fails(self):
        key = "contran-949-2022"
        for field, value in [
            ("excerpt", "Trecho que não está no documento"),
            ("sha256", "0" * 64),
            ("url", "https://example.com/unofficial.pdf"),
        ]:
            data = deepcopy(self.editorial)
            data["records"][key]["consultation"]["sources"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                active.validate_consultation(data, self.sources)
        data = deepcopy(self.editorial)
        data["records"][key]["applicationPhases"][0]["scope"]["conditions"] = []
        with self.assertRaises(ValueError):
            active.validate_consultation(data, self.sources)

    def test_949_retified_project_cuts_and_general_dates_are_distinct(self):
        entry = self.editorial["records"]["contran-949-2022"]
        phases = {phase["id"]: phase for phase in entry["applicationPhases"]}
        self.assertEqual(phases["barreira-novos"]["projectCode"]["date"], "2020-01-01")
        self.assertEqual(phases["poste-novos"]["projectCode"]["date"], "2026-01-01")
        self.assertEqual(phases["barreira-geral"]["date"], "2024-01-01")
        self.assertEqual(phases["poste-geral"]["date"], "2030-01-01")
        self.assertTrue(
            all(
                p["source"]["amendingSource"]["sourceKey"]
                == "contran-949-2022-retificacao"
                for p in phases.values()
            )
        )
        limits = entry["consultation"]["boundaries"]
        self.assertEqual(
            [(x["field"], x["operator"], x["value"]) for x in limits],
            [
                ("pointRHeightMm", "<=", 700),
                ("pbtKg", "<=", 3500),
                ("pickupAlphaDegrees", "<", 22),
                ("pickupRatio", "<", 1.30),
            ],
        )
        self.assertEqual(limits[2]["alternativeGroup"], limits[3]["alternativeGroup"])

    def test_910_strict_mass_boundary_and_article_sunset(self):
        entry = self.editorial["records"]["contran-910-2022"]
        boundary = entry["consultation"]["boundaries"][0]
        self.assertEqual((boundary["operator"], boundary["value"]), ("<", 2500))
        phases = {p["id"]: p for p in entry["applicationPhases"]}
        self.assertEqual(
            phases["nao-derivados-novos"]["projectCode"]["date"], "2024-01-01"
        )
        self.assertEqual(phases["nao-derivados-legados"]["date"], "2026-01-01")
        self.assertEqual(phases["fim-artigos-2-3"]["event"], "provision_end")
        self.assertEqual(phases["fim-artigos-2-3"]["date"], "2025-12-31")
        self.assertIn("não revoga", entry["consultation"]["summary"])
        requirements = {q["id"]: q for q in entry["requirements"]}
        tank = requirements["contran-910-2022:req:03"]
        self.assertEqual(tank["clause"], "Art. 4º, parágrafo único, II")
        self.assertIn("combustível", tank["evidence"])
        self.assertNotIn("habitáculo", tank["evidence"])
        self.assertNotIn("2.500", tank["scope"])

    def test_752_759_and_954_do_not_universalize_requirements(self):
        records = self.editorial["records"]
        self.assertEqual(
            [p["date"] for p in records["contran-752-2018"]["applicationPhases"]],
            ["2025-01-01", "2030-01-01"],
        )
        reverse = records["contran-759-2018"]
        self.assertEqual(
            [p["date"] for p in reverse["applicationPhases"]],
            ["2025-01-01", "2027-01-01"],
        )
        self.assertIn("alerta e/ou monitoramento", reverse["consultation"]["summary"])
        self.assertIn("não uma obrigação universal", reverse["consultation"]["summary"])
        esc = records["contran-954-2022"]
        cuts = {p["projectCode"]["date"] for p in esc["applicationPhases"]}
        self.assertEqual(cuts, {"2020-01-01", "2023-07-01"})
        self.assertTrue(
            all(
                p["source"]["amendingSource"]["sourceKey"]
                == "contran-deliberacao-264-2022"
                for p in esc["applicationPhases"]
            )
        )
        self.assertTrue(esc["consultation"]["exclusions"])

    def test_transverse_equipment_and_conditional_cct(self):
        equipment = self.editorial["records"]["contran-993-2023"]
        self.assertIn("equipamentos-obrigatorios", equipment["generalCategories"])
        self.assertEqual(len(equipment["consultation"]["relatedSubjects"]), 7)
        self.assertIn(
            "não foi concluída", " ".join(equipment["consultation"]["limitations"])
        )
        cct = self.editorial["externalRecords"]["senatran-095"]
        self.assertIn("ausência do SGQ", cct["consultation"]["summary"])
        self.assertIn("não é documento universal", cct["consultation"]["summary"])
        self.assertEqual(len(cct["consultation"]["serviceLinks"]), 3)
        self.assertIn("Art. 26", cct["requirements"][1]["scope"])

    def test_complete_offline_rebuild_keeps_history_separate(self):
        # Exercise real editorial generators in an isolated copy, never mutate the
        # shared project's current records while another check is reading them.
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp)
            shutil.copytree(ROOT / "data/contran", target / "data/contran")
            shutil.copytree(ROOT / "data/markings", target / "data/markings")
            shutil.copy2(ROOT / "catalog.json", target / "catalog.json")
            with (
                patch.object(active, "ROOT", target),
                patch.object(inventory, "ROOT", target),
                patch.object(inventory, "OUT", target / "data/contran"),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                active.main()
            directory = target / "data/contran"
            collection = json.loads((directory / "active.json").read_text())
            current = {record["id"]: record for record in collection["records"]}
            history = json.loads((directory / "historical.json").read_text())
            self.assertNotIn("contran-220-2007", current)
            decisions = {
                x["id"]: x
                for x in json.loads(
                    (directory / "publication-decisions.json").read_text()
                )["decisions"]
            }
            self.assertEqual(
                decisions["contran-220-2007"]["reason"],
                "revogacao_expressa_conferida_no_texto_oficial",
            )
            self.assertEqual(
                [r["id"] for r in history["records"]], ["contran-220-2007"]
            )
            historical = history["records"][0]
            self.assertFalse(historical["active"])
            self.assertFalse(historical["publication"]["included"])
            self.assertTrue(historical["historicalPublication"]["included"])
            self.assertEqual(historical["legalStatus"]["state"], "repealed")
            self.assertEqual(historical["effectiveDate"], "2023-10-02")
            self.assertEqual(len(historical["repealChain"]), 2)
            for key in ["contran-951-2022", "contran-997-2023"]:
                self.assertIn(key, current)
            policy = json.loads((directory / "publication-policy.json").read_text())
            self.assertEqual(len(policy["inactiveHistoricalIds"]), 55)
            for key in policy["inactiveHistoricalIds"]:
                self.assertNotIn(key, current)
                self.assertNotEqual(key, historical["id"])
            front = current["contran-910-2022"]
            self.assertEqual(front["legalStatus"]["state"], "indicated_current")
            self.assertTrue(
                any(
                    f["kind"] == "dispositivos_com_prazo_encerrado"
                    for f in front["temporalFlags"]
                )
            )
            for key, entry in self.editorial["records"].items():
                record = current[key]
                self.assertEqual(
                    record["applicability"]["phases"], entry["applicationPhases"]
                )
                self.assertFalse(record["applicability"]["vehicleSpecific"])
                self.assertEqual(
                    record["applicability"]["state"], "requires_assessment"
                )
                self.assertFalse(record["reviewStatus"]["amendmentChainReviewed"])
            with (directory / "active.csv").open(encoding="utf-8-sig") as f:
                exported = list(csv.DictReader(f))
            self.assertEqual({r["id"] for r in exported}, set(current))
            self.assertIn("consultation", exported[0])
            self.assertIn("temporalFlags", exported[0])
            # Re-running from the same snapshots is byte-for-byte deterministic.
            before = {p.name: p.read_bytes() for p in directory.glob("*.json")}
            with (
                patch.object(active, "ROOT", target),
                patch.object(inventory, "ROOT", target),
                patch.object(inventory, "OUT", directory),
                contextlib.redirect_stdout(io.StringIO()),
            ):
                active.main()
            self.assertEqual(
                before, {p.name: p.read_bytes() for p in directory.glob("*.json")}
            )


if __name__ == "__main__":
    unittest.main()
