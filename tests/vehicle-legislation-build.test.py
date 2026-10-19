"""Exercise editorial link validation, canonical counts and build drift guards."""

import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "build_vehicle_legislation", ROOT / "scripts/build_vehicle_legislation.py"
)
BUILD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD)


class VehicleLegislationBuild(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inputs = BUILD.load_inputs()
        cls.source = BUILD.read(BUILD.SOURCE)
        cls.runtime = BUILD.compile_mapping(cls.source, cls.inputs)
        cls.audit = BUILD.build_audit(cls.source, cls.runtime, cls.inputs)

    def changed_source(self):
        return copy.deepcopy(self.source)

    def part(self, data, prefix):
        return next(part for part in data["parts"] if part["id"].startswith(prefix))

    def test_exact_supplied_geometry_and_no_drawing_fallback(self):
        actual = {part["id"] for part in self.runtime["parts"]}
        expected = {part["id"] for part in self.inputs["vector"]["parts"]}
        self.assertEqual(actual, expected)
        self.assertEqual(len(actual), 37)
        for mutate in ("missing", "duplicate", "unknown", "component", "label"):
            with self.subTest(mutate=mutate):
                data = self.changed_source()
                if mutate == "missing":
                    data["parts"].pop()
                elif mutate == "duplicate":
                    data["parts"][0] = copy.deepcopy(data["parts"][1])
                elif mutate == "unknown":
                    data["parts"][0]["id"] = "invented-drawing-region"
                elif mutate == "component":
                    data["parts"][0]["componentId"] = "tanque"
                else:
                    data["parts"][0]["label"] = "Invented drawing label"
                with self.assertRaises(ValueError):
                    BUILD.compile_mapping(data, self.inputs)

    def test_subsystems_may_cross_component_taxonomy_but_must_exist(self):
        data = self.changed_source()
        data["parts"][0]["topics"][0]["subsystemId"] = "eletronica/obd"
        compiled = BUILD.compile_mapping(data, self.inputs)
        self.assertEqual(
            compiled["parts"][0]["topics"][0]["subsystemId"], "eletronica/obd"
        )
        data["parts"][0]["topics"][0]["subsystemId"] = "invented/subsystem"
        with self.assertRaisesRegex(ValueError, "Unknown subsystem"):
            BUILD.compile_mapping(data, self.inputs)

    def test_invalid_topic_states_and_silent_empty_topic_are_rejected(self):
        for field, value in (
            ("lane", "all"),
            ("relation", "automatically_applicable"),
            ("gaps", "not an array"),
        ):
            with self.subTest(field=field):
                data = self.changed_source()
                data["parts"][0]["topics"][0][field] = value
                with self.assertRaises(ValueError):
                    BUILD.compile_mapping(data, self.inputs)
        data = self.changed_source()
        topic = data["parts"][0]["topics"][0]
        topic["links"], topic["gaps"] = [], []
        with self.assertRaisesRegex(ValueError, "explicit coverage gap"):
            BUILD.compile_mapping(data, self.inputs)

    def test_alias_is_canonical_and_unpublished_or_excluded_ids_cannot_leak(self):
        data = self.changed_source()
        topic = self.part(data, "peca_27_")["topics"][0]
        link = topic["links"][0]
        link.pop("actId")
        link["catalogId"] = "inmetro-045"
        result = BUILD.compile_mapping(data, self.inputs)
        self.assertEqual(
            self.part(result, "peca_27_")["topics"][0]["links"][0]["actId"],
            "inmetro-145-2022",
        )
        for act_id in ("contran-835-1997", "ibama-in-26-2020", "unknown-act"):
            with self.subTest(act_id=act_id):
                candidate = self.changed_source()
                candidate["parts"][0]["topics"][0]["links"][0]["actId"] = act_id
                with self.assertRaisesRegex(ValueError, "unpublished act"):
                    BUILD.compile_mapping(candidate, self.inputs)

    def test_requirement_ids_belong_to_the_selected_published_act(self):
        for ids in (
            ["inmetro-33-2021:req:01"],
            ["inmetro-145-2022:req:999"],
            ["inmetro-145-2022:req:06", "inmetro-145-2022:req:06"],
        ):
            with self.subTest(ids=ids):
                data = self.changed_source()
                self.part(data, "peca_27_")["topics"][0]["links"][0][
                    "requirementIds"
                ] = ids
                with self.assertRaises(ValueError):
                    BUILD.compile_mapping(data, self.inputs)

    def test_source_excerpts_must_still_match_the_record_and_act(self):
        data = self.changed_source()
        field = data["parts"][0]["topics"][0]["links"][0]["sourceFields"][0]
        field["excerpt"] = "A fabricated obligation absent from the source"
        with self.assertRaisesRegex(ValueError, "excerpt drift"):
            BUILD.compile_mapping(data, self.inputs)
        data = self.changed_source()
        field = data["parts"][0]["topics"][0]["links"][0]["sourceFields"][0]
        field["recordId"] = "contran-749-2018"
        with self.assertRaisesRegex(ValueError, "another act"):
            BUILD.compile_mapping(data, self.inputs)

    def test_powertrain_false_positives_do_not_reappear_through_system_taxonomy(self):
        battery = self.part(self.runtime, "peca_27_")
        links = [link for topic in battery["topics"] for link in topic["links"]]
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0]["actId"], "inmetro-145-2022")
        self.assertEqual(links[0]["requirementIds"], ["inmetro-145-2022:req:06"])
        for prefix in ("peca_25_", "peca_26_"):
            part = self.part(self.runtime, prefix)
            ids = {link["actId"] for topic in part["topics"] for link in topic["links"]}
            self.assertNotIn("inmetro-145-2022", ids)
            self.assertTrue(
                all(topic["relation"] == "vehicle" for topic in part["topics"])
            )
        for prefix in ("peca_28_", "peca_29_"):
            part = self.part(self.runtime, prefix)
            self.assertTrue(all(not topic["links"] for topic in part["topics"]))
            self.assertTrue(all(topic["gaps"] for topic in part["topics"]))

    def test_all_published_acts_are_classified_once_without_alias_double_count(self):
        records = self.audit["records"]
        act_ids = {record["actId"] for record in records}
        expected = {
            record.get("regulatoryId") or record["id"]
            for record in self.inputs["records"]
        }
        self.assertEqual(act_ids, expected)
        self.assertEqual(len(records), len(expected))
        self.assertFalse(act_ids & self.inputs["excluded"])
        counts = self.audit["counts"]
        self.assertEqual(counts["classificationCoveragePercent"], 100)
        self.assertEqual(counts["classifiedUniqueActs"], counts["uniqueActs"])
        self.assertEqual(
            counts["visualLinkedActs"] + counts["nonvisualActs"], len(records)
        )
        self.assertGreater(counts["catalogEntries"], counts["uniqueActs"])
        by_id = {record["actId"]: record for record in records}
        self.assertEqual(len(by_id["ibama-in-22-2020"]["catalogIds"]), 2)
        for act_id in ("anatel-res715", "inmetro-169-2023", "ibama-in-5-2024"):
            self.assertTrue(by_id[act_id]["nonvisual"])
            self.assertTrue(by_id[act_id]["taxonomy"])
            self.assertEqual(
                by_id[act_id]["classification"], ["other_topics_no_visual_region"]
            )
        for part in self.audit["parts"]:
            self.assertEqual(
                part["uniqueCount"],
                len(set(part["componentActIds"]) | set(part["vehicleActIds"])),
            )

    def test_generated_bytes_are_deterministic_and_check_does_not_rewrite(self):
        outputs = BUILD.generate(self.source, self.inputs)
        self.assertEqual(outputs, BUILD.generate(self.source, self.inputs))
        self.assertNotIn(b"sourceFields", outputs[BUILD.RUNTIME])
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            BUILD.write_outputs(outputs, target=target)
            BUILD.write_outputs(outputs, target=target, check=True)
            drifted = target / BUILD.RUNTIME
            drifted.write_bytes(b"stale runtime bytes\n")
            before = {
                path: path.read_bytes() for path in target.rglob("*") if path.is_file()
            }
            with self.assertRaisesRegex(ValueError, "Stale generated file"):
                BUILD.write_outputs(outputs, target=target, check=True)
            after = {
                path: path.read_bytes() for path in target.rglob("*") if path.is_file()
            }
            self.assertEqual(before, after)
        audit = json.loads(outputs[BUILD.AUDIT_JSON])
        csv_text = outputs[BUILD.AUDIT_CSV].decode()
        self.assertEqual(audit["asOf"], self.source["asOf"])
        self.assertIn("other_topics_no_visual_region", csv_text)


if __name__ == "__main__":
    unittest.main()
