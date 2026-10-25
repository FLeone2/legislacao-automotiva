"""Portable guide database: provenance, exclusion and independent legal states."""

import copy
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

import jsonschema

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "guide_database", ROOT / "scripts/build_guide_database.py"
)
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


def resolve(pointer):
    value = json.loads((ROOT / pointer["path"]).read_text())
    for token in pointer["pointer"].split("/")[1:]:
        value = value[int(token)] if isinstance(value, list) else value[token]
    return value


class GuideDatabase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.database = BUILDER.build_database()
        cls.tables = cls.database["tables"]
        cls.acts = {row["id"]: row for row in cls.tables["acts"]}
        cls.sources = {row["id"]: row for row in cls.tables["sources"]}

    def test_schema_and_reproducible_committed_artifact(self):
        schema = json.loads((ROOT / "schemas/guide-database.schema.json").read_text())
        jsonschema.Draft202012Validator(
            schema, format_checker=jsonschema.FormatChecker()
        ).validate(self.database)
        content = BUILDER.serialize(self.database)
        self.assertLessEqual(len(content), 300_000)
        self.assertEqual(
            content, (ROOT / "data/process/knowledge-index.json").read_bytes()
        )
        self.assertEqual(content, BUILDER.serialize(BUILDER.build_database()))

    def test_ids_foreign_keys_and_published_references(self):
        self.assertEqual(len(self.acts), len(self.tables["acts"]))
        self.assertEqual(len(self.sources), len(self.tables["sources"]))
        aliases = self.tables["aliases"]
        self.assertEqual(len({row["alias"] for row in aliases}), len(aliases))
        for row in aliases:
            self.assertIn(row["actId"], self.acts)
        for row in self.tables["actSources"]:
            self.assertIn(row["actId"], self.acts)
            self.assertIn(row["sourceId"], self.sources)
        for name, rows in self.tables.items():
            self.assertEqual(self.database["counts"][name], len(rows))

    def test_excluded_and_historical_acts_cannot_be_reintroduced(self):
        blocked = BUILDER.excluded_ids(ROOT)
        policy = json.loads((ROOT / BUILDER.POLICY_INPUT).read_text())
        self.assertEqual(len(policy["inactiveHistoricalIds"]), 55)
        historical = json.loads((ROOT / BUILDER.SITE_INPUT).read_text())[
            "historicalReferences"
        ]
        blocked.update(row["id"] for row in historical)
        self.assertFalse(blocked.intersection(self.acts))
        self.assertNotIn("contran-220-2007", self.acts)
        self.assertNotIn("mover-009", self.acts)
        # New guide research is evidence, not an automatic active-catalog import.
        self.assertIn("conama-493-2019", self.sources)
        self.assertNotIn("conama-493-2019", self.acts)

    def test_states_and_nulls_are_preserved_from_the_actual_input(self):
        for row in self.tables["acts"]:
            original = resolve(row["provenance"])
            for field in (
                "legalStatus",
                "reviewStatus",
                "applicability",
                "publication",
            ):
                self.assertEqual(row[field], original.get(field), (row["id"], field))
            self.assertEqual(row["requirementIds"], original.get("requirementIds", []))
        pbev = self.acts["inmetro-169-2023"]
        self.assertIs(pbev["reviewStatus"]["fullTextReviewed"], False)
        self.assertEqual(pbev["legalStatus"]["state"], "official_current_reference")
        self.assertEqual(pbev["applicability"]["state"], "requires_assessment")
        self.assertIsNone(self.acts["mover-001"]["legalStatus"])
        self.assertTrue(
            any(
                row["legalStatus"]
                and row["legalStatus"]["state"] == "partially_repealed"
                for row in self.tables["acts"]
            )
        )

    def test_provenance_and_official_url_validation(self):
        for row in self.tables["sources"]:
            original = resolve(row["provenance"])
            self.assertEqual(row["url"], original["url"])
            self.assertEqual(row["checkedAt"], original["checkedAt"])
            BUILDER.official_url(row["url"])
        for url in (
            "http://www.gov.br/example",
            "https://www.gov.br.attacker.example/",
            "https://person:secret@www.gov.br/",
            "https://example.com/",
        ):
            with self.assertRaises(ValueError):
                BUILDER.official_url(url)
        mutated = copy.deepcopy(self.database)
        mutated["tables"]["actSources"].append(
            {"sourceId": "missing", "actId": "missing", "relation": "same_canonical_id"}
        )
        with self.assertRaisesRegex(ValueError, "broken"):
            BUILDER.validate_database(mutated)

    def test_sqlite_is_optional_local_and_preserves_cross_references(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "knowledge.sqlite"
            BUILDER.write_sqlite(self.database, output)
            with sqlite3.connect(output) as connection:
                self.assertEqual(
                    connection.execute("SELECT count(*) FROM acts").fetchone()[0],
                    len(self.acts),
                )
                self.assertEqual(
                    connection.execute("SELECT count(*) FROM sources").fetchone()[0],
                    len(self.sources),
                )
                self.assertEqual(
                    connection.execute("PRAGMA foreign_key_check").fetchall(), []
                )
                raw = connection.execute(
                    "SELECT record_json FROM acts WHERE id=?", ("inmetro-169-2023",)
                ).fetchone()[0]
                self.assertIs(
                    json.loads(raw)["reviewStatus"]["fullTextReviewed"], False
                )
            with self.assertRaisesRegex(ValueError, "already exists"):
                BUILDER.write_sqlite(self.database, output)
        with self.assertRaisesRegex(ValueError, "never an artifact"):
            BUILDER.write_sqlite(self.database, ROOT / "dist/knowledge.sqlite")


if __name__ == "__main__":
    unittest.main()
