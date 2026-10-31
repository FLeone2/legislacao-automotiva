"""Verified source ownership, immutable review states and historical segregation."""

import copy
import gzip
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "prototype_knowledge", ROOT / "scripts/prototype_knowledge_build.py"
)
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class PrototypeKnowledge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.files, index, cls.manifest = BUILDER.build()
        cls.index = json.loads(index)
        cls.cards = {
            row["id"]: row
            for row in map(
                json.loads, (ROOT / "knowledge/records.jsonl").read_text().splitlines()
            )
        }

    def test_deterministic_export_and_secure_artifact_manifest(self):
        files, index, manifest = BUILDER.build()
        self.assertEqual(self.files, files)
        self.assertEqual(self.index, json.loads(index))
        self.assertEqual(self.manifest, manifest)
        for name, expected in manifest["artifacts"].items():
            self.assertEqual(BUILDER.digest(files[name]), expected)
            self.assertFalse(Path(name).is_absolute())
            self.assertNotIn("..", Path(name).parts)

    def test_source_documents_never_promote_canonical_states(self):
        for document in self.index["documents"]:
            card = self.cards.get(document["actId"])
            for field in BUILDER.STATE_FIELDS:
                self.assertEqual(document[field], card.get(field) if card else None)
            self.assertFalse(document["automaticApplicability"])
            self.assertTrue(document["extractionIsNotLegalReview"])
            self.assertTrue(document["notConsolidated"])
            self.assertEqual(
                document["reviewDate"], card.get("reviewDate") if card else None
            )
        self.assertFalse(self.manifest["legalReviewPromoted"])
        self.assertFalse(self.manifest["privateStandardsCopied"])

    def test_historical_guidance_and_original_variant_are_not_current_ai_evidence(self):
        by_id = {row["documentId"]: row for row in self.index["documents"]}
        for document_id in [
            "ibama-manual-proconve-promot-2011",
            "senatran-095-original",
        ]:
            self.assertFalse(by_id[document_id]["indexable"])
            self.assertEqual(by_id[document_id]["chunkCount"], 0)
            self.assertFalse(
                any(row["documentId"] == document_id for row in self.index["chunks"])
            )
        self.assertEqual(by_id["ibama-manual-proconve-promot-2011"]["pageCount"], 586)

    def test_every_chunk_has_one_verified_owner_and_accurate_page_link(self):
        documents = {row["documentId"]: row for row in self.index["documents"]}
        ids = set()
        for chunk in self.index["chunks"]:
            self.assertNotIn(chunk["id"], ids)
            ids.add(chunk["id"])
            document = documents[chunk["documentId"]]
            self.assertTrue(document["indexable"])
            self.assertEqual(chunk["actId"], document["actId"])
            self.assertEqual(chunk["documentSha256"], document["documentSha256"])
            self.assertLessEqual(len(chunk["text"]), BUILDER.CHUNK_LENGTH)
            self.assertTrue(chunk["unreviewedExtraction"])
            if chunk["page"] is None:
                self.assertIsNone(chunk["pdfUrl"])
                self.assertEqual(chunk["kind"], "public_html_machine_extraction")
            else:
                self.assertIn(f"#page={chunk['page']}", chunk["pdfUrl"])
                self.assertLessEqual(chunk["page"], document["pageCount"])

    def test_offline_builder_rejects_tampered_snapshots_and_excluded_acts(self):
        source_manifest = json.loads(
            (ROOT / "data/prototype/texts-manifest.json").read_text()
        )
        source = next(
            row
            for row in source_manifest["documents"]
            if row["format"] == "html" and row["status"] == "verified_source"
        )
        original_root, original_input = BUILDER.ROOT, BUILDER.INPUT
        with tempfile.TemporaryDirectory() as directory:
            temporary = Path(directory)
            for relative in [source["textPath"], source["rawSourcePath"]]:
                path = temporary / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / relative, path)
            (temporary / "knowledge").mkdir()
            card = copy.deepcopy(self.cards[source["actId"]])
            (temporary / "knowledge/records.jsonl").write_text(json.dumps(card) + "\n")
            (temporary / "knowledge/manifest.json").write_text(
                json.dumps({"revision": self.manifest["knowledgeRevision"]})
            )
            input_path = temporary / "data/prototype/texts-manifest.json"
            input_path.write_text(json.dumps({"documents": [source]}))
            try:
                BUILDER.ROOT, BUILDER.INPUT = temporary, input_path
                BUILDER.build()
                text_path = temporary / source["textPath"]
                frozen = text_path.read_bytes()
                text_path.write_bytes(frozen + b" ")
                with self.assertRaisesRegex(ValueError, "hash changed"):
                    BUILDER.build()
                text_path.write_bytes(frozen)
                receipt = temporary / source["rawSourcePath"]
                original = receipt.read_bytes()
                receipt.write_bytes(
                    gzip.compress(b"Different official document", mtime=0)
                )
                with self.assertRaisesRegex(ValueError, "receipt hash changed"):
                    BUILDER.build()
                receipt.write_bytes(original)
                card["publication"] = {"included": False}
                (temporary / "knowledge/records.jsonl").write_text(
                    json.dumps(card) + "\n"
                )
                with self.assertRaisesRegex(ValueError, "not in the active"):
                    BUILDER.build()
            finally:
                BUILDER.ROOT, BUILDER.INPUT = original_root, original_input


if __name__ == "__main__":
    unittest.main()
