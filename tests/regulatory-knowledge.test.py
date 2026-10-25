"""Cited IA corpus: exclusions, source nature, immutable inputs and read-only FTS."""

import copy
import importlib.util
import json
import shutil
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

import jsonschema

ROOT = Path(__file__).resolve().parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BUILDER = load_module("regulatory_knowledge", "scripts/build_regulatory_knowledge.py")
QUERY = load_module(
    "regulatory_knowledge_query", "scripts/query_regulatory_knowledge.py"
)


def frontmatter(content):
    block = content.decode().split("---\n", 2)[1]
    return {
        key: json.loads(value)
        for key, value in (line.split(": ", 1) for line in block.splitlines())
    }


class RegulatoryKnowledge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.knowledge = BUILDER.build_knowledge()
        cls.manifest, cls.files = BUILDER.bundle(cls.knowledge)
        cls.cards = {row["id"]: row for row in cls.knowledge["records"]}
        cls.chunks = {row["id"]: row for row in cls.knowledge["chunks"]}
        cls.directory = tempfile.TemporaryDirectory()
        cls.database = Path(cls.directory.name) / "knowledge.sqlite"
        BUILDER.write_sqlite(cls.knowledge, cls.manifest, cls.database)

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def test_manifest_schema_committed_files_and_determinism(self):
        schema = json.loads(
            (ROOT / "schemas/regulatory-knowledge.schema.json").read_text()
        )
        jsonschema.Draft202012Validator(schema).validate(self.manifest)
        again_manifest, again_files = BUILDER.bundle(BUILDER.build_knowledge())
        self.assertEqual(self.manifest, again_manifest)
        self.assertEqual(self.files, again_files)
        BUILDER.write_bundle(self.files, ROOT / "knowledge", check=True)
        for path, content in self.files.items():
            if path == "manifest.json":
                continue
            self.assertEqual(self.manifest["artifacts"][path], BUILDER.digest(content))
        metadata = copy.deepcopy(self.manifest)
        revision = metadata.pop("revision")
        self.assertEqual(revision, BUILDER.digest(BUILDER.json_bytes(metadata)))

    def test_states_and_dates_are_copied_without_promotion(self):
        for card in self.cards.values():
            original = BUILDER.pointer_value(ROOT, card["stateProvenance"])
            for field in BUILDER.STATE_FIELDS:
                self.assertEqual(card[field], original.get(field), (card["id"], field))
            metadata = frontmatter(self.files[card["markdownPath"]])
            self.assertFalse(metadata["fullTextIncluded"])
            self.assertFalse(metadata["automaticApplicability"])
            self.assertEqual(metadata["reviewDate"], card["reviewDate"])
            self.assertEqual(metadata["revision"], card["revision"])
        self.assertIsNone(self.cards["mover-001"]["legalStatus"])
        self.assertFalse(
            self.cards["inmetro-169-2023"]["reviewStatus"]["fullTextReviewed"]
        )
        self.assertTrue(
            any(
                card["legalStatus"]
                and card["legalStatus"]["state"] == "partially_repealed"
                for card in self.cards.values()
            )
        )

    def test_markdown_presentation_has_no_trailing_spaces_and_distinguishes_guidance(
        self,
    ):
        for path, content in self.files.items():
            if path.endswith(".md"):
                self.assertTrue(content.endswith(b"\n"), path)
                for line in content.decode().splitlines():
                    self.assertEqual(line, line.rstrip(), path)
        guidance = copy.deepcopy(
            next(
                card
                for card in self.cards.values()
                if any(
                    requirement["provision"]["kind"] == "official_guidance"
                    for requirement in card["requirements"]
                )
            )
        )
        guidance["requirements"] = [
            next(
                requirement
                for requirement in guidance["requirements"]
                if requirement["provision"]["kind"] == "official_guidance"
            )
        ]
        original = guidance["requirements"][0]["evidence"]
        guidance["requirements"][0]["evidence"] = (
            "Linha de apresentação  \n\nFim truncado "
        )
        rendered = BUILDER.markdown(guidance).decode()
        self.assertIn(
            "Conteúdo da referência arquivada (orientação; não transcrição da portaria)",
            rendered,
        )
        self.assertNotIn("Trecho da evidência pública", rendered)
        self.assertIn("> Linha de apresentação\n>\n> Fim truncado\n", rendered)
        # Presentation normalization must not mutate even its input fixture.
        self.assertEqual(
            guidance["requirements"][0]["evidence"],
            "Linha de apresentação  \n\nFim truncado ",
        )
        self.assertIn(original, self.chunks[guidance["requirements"][0]["id"]]["text"])
        public = copy.deepcopy(
            next(
                card
                for card in self.cards.values()
                if any(
                    requirement["provision"]["kind"] == "public_text_excerpt"
                    for requirement in card["requirements"]
                )
            )
        )
        public["requirements"] = [
            next(
                requirement
                for requirement in public["requirements"]
                if requirement["provision"]["kind"] == "public_text_excerpt"
            )
        ]
        rendered_public = BUILDER.markdown(public).decode()
        self.assertIn(
            "Trecho da evidência pública, possivelmente parcial", rendered_public
        )
        self.assertNotIn("Conteúdo da referência arquivada", rendered_public)

    def test_citations_preserve_provisions_excerpts_and_evidence_nature(self):
        requirements = json.loads((ROOT / BUILDER.REQUIREMENTS).read_text())["records"]
        for requirement in requirements:
            chunk = self.chunks[requirement["id"]]
            self.assertEqual(chunk["actId"], requirement["actId"])
            self.assertEqual(
                chunk["citation"]["device"],
                requirement.get("provision", {}).get("reference")
                or requirement.get("clause"),
            )
            self.assertEqual(chunk["kind"], requirement["provision"]["kind"])
            self.assertIn(requirement["evidence"], chunk["text"])
            BUILDER.official_url(chunk["citation"]["sourceUrl"])
            self.assertEqual(
                chunk["verificationPlan"], requirement.get("verificationPlan")
            )
            self.assertEqual(chunk["context"], requirement.get("context"))
        self.assertEqual(self.manifest["counts"]["requirements"], len(requirements))
        self.assertEqual(self.manifest["counts"]["acts"], len(self.cards))

    def test_guide_sources_are_searchable_without_becoming_active_acts(self):
        for source in self.knowledge["sources"]:
            chunk = self.chunks[source["id"] + ":source"]
            self.assertIsNone(chunk["actId"])
            self.assertIsNone(chunk["requirementId"])
            self.assertEqual(chunk["sourceMetadata"], source)
            self.assertEqual(chunk["citation"]["evidenceType"], source["evidenceType"])
            self.assertEqual(chunk["checkedAt"], source["checkedAt"])
            self.assertIsNone(chunk["reviewDate"])
            self.assertIsNone(chunk["legalStatus"])
            self.assertIn(f"sources/{source['id']}.md", self.files)
        self.assertNotIn("conama-493-2019", self.cards)
        with closing(QUERY.connect(self.database)) as connection:
            result = QUERY.query(connection, text="PROMOT", limit=50)
            direct = QUERY.query(connection, source_id="ibama-lcm-service")
        self.assertEqual(direct["count"], 1)
        self.assertEqual(direct["results"][0]["retrieval"]["kind"], "exact_source_id")
        source_results = [
            row for row in result["results"] if row["sourceId"] == "ibama-lcm-service"
        ]
        self.assertTrue(source_results)
        self.assertEqual(
            source_results[0]["evidenceAssessment"]["evidenceType"], "official_guidance"
        )
        self.assertFalse(
            source_results[0]["evidenceAssessment"]["automaticApplicability"]
        )

    def test_exclusions_history_and_foreign_keys(self):
        policy = BUILDER.read(BUILDER.POLICY)
        self.assertEqual(len(policy["inactiveHistoricalIds"]), 55)
        blocked = BUILDER.blocked_ids(ROOT)
        self.assertFalse(set(self.cards) & blocked)
        self.assertNotIn("acts/contran-220-2007.md", self.files)
        self.assertNotIn("acts/mover-009.md", self.files)
        for alias in self.knowledge["aliases"]:
            self.assertIn(alias["actId"], self.cards)
        with closing(QUERY.connect(self.database)) as connection:
            self.assertEqual(
                connection.execute("PRAGMA foreign_key_check").fetchall(), []
            )
            self.assertEqual(
                connection.execute("SELECT count(*) FROM acts").fetchone()[0],
                len(self.cards),
            )
            self.assertEqual(
                connection.execute("SELECT count(*) FROM chunks").fetchone()[0],
                len(self.chunks),
            )
            self.assertEqual(
                connection.execute("SELECT count(*) FROM act_sources").fetchone()[0],
                len(self.knowledge["actSources"]),
            )
            self.assertEqual(
                QUERY.query(connection, act_id="contran-220-2007")["count"], 0
            )

    def test_fts_read_only_safe_input_aliases_and_result_limits(self):
        with closing(QUERY.connect(self.database)) as connection:
            accented = QUERY.query(connection, text="chumbo ácido", limit=50)
            plain = QUERY.query(connection, text="chumbo acido", limit=50)
            self.assertTrue(accented["count"])
            self.assertEqual(
                [row["id"] for row in accented["results"]],
                [row["id"] for row in plain["results"]],
            )
            limited = QUERY.query(connection, text="chumbo ácido", limit=1)
            self.assertEqual(limited["count"], 1)
            self.assertEqual(limited["totalMatches"], accented["totalMatches"])
            self.assertTrue(limited["truncated"])
            # User text never becomes SQL/FTS operators.
            QUERY.query(connection, text='"; DROP TABLE acts; --')
            self.assertEqual(
                connection.execute("SELECT count(*) FROM acts").fetchone()[0],
                len(self.cards),
            )
            alias = next(
                row for row in self.knowledge["aliases"] if row["alias"] != row["actId"]
            )
            resolved = QUERY.query(connection, act_id=alias["alias"])
            self.assertTrue(resolved["count"])
            self.assertTrue(
                all(row["actId"] == alias["actId"] for row in resolved["results"])
            )
            linked_act = self.knowledge["actSources"][0]["actId"]
            linked_results = QUERY.query(connection, act_id=linked_act)
            expected_links = {
                (row["sourceId"], row["relation"])
                for row in self.knowledge["actSources"]
                if row["actId"] == linked_act
            }
            for row in linked_results["results"]:
                self.assertEqual(
                    {
                        (link["sourceId"], link["relation"])
                        for link in row["sourceIdentityLinks"]
                    },
                    expected_links,
                )
                self.assertTrue(
                    all(link["identityOnly"] for link in row["sourceIdentityLinks"])
                )
            for row in accented["results"]:
                self.assertEqual(
                    row["citation"]["knowledgeRevision"], self.manifest["revision"]
                )
                self.assertFalse(row["retrieval"]["scoreIsLegalConfidence"])
                self.assertTrue(row["limitations"])
            with self.assertRaises(sqlite3.OperationalError):
                connection.execute("DELETE FROM acts")
        with self.assertRaises(ValueError):
            QUERY.lexical_query("---")
        with closing(QUERY.connect(self.database)) as connection:
            with self.assertRaises(ValueError):
                QUERY.query(connection, text="bateria", limit=51)

    def test_editorial_candidate_is_indexed_without_becoming_a_published_act(self):
        identity = "mdic-gm-167-2026"
        original = next(
            row
            for row in BUILDER.read(BUILDER.CANDIDATES)["candidates"]
            if row["id"] == identity
        )
        candidate = next(
            row for row in self.knowledge["candidates"] if row["id"] == identity
        )
        chunk = self.chunks[identity + ":candidate"]
        self.assertNotIn(identity, self.cards)
        self.assertNotIn(identity, {row["actId"] for row in self.knowledge["aliases"]})
        self.assertEqual(candidate["role"], "candidate")
        self.assertIsNone(candidate["actId"])
        self.assertIsNone(candidate["legalStatus"])
        self.assertIs(candidate["publication"]["included"], False)
        self.assertEqual(candidate["reviewStatus"], original["reviewStatus"])
        self.assertFalse(candidate["reviewStatus"]["fullTextReviewed"])
        self.assertFalse(candidate["automaticApplicability"])
        self.assertEqual(chunk["kind"], "editorial_candidate")
        self.assertIsNone(chunk["requirementId"])
        self.assertEqual(chunk["citation"]["evidenceType"], "official_index")
        self.assertIsNone(chunk["citation"]["device"])
        self.assertIn("167", chunk["citation"]["indexLocator"])
        source = candidate["sourceProof"]
        actual_hash = BUILDER.digest((ROOT / source["archivePath"]).read_bytes())
        self.assertEqual(chunk["citation"]["indexSnapshotSha256"], actual_hash)
        self.assertIn(
            {"path": source["archivePath"], "sha256": actual_hash},
            self.manifest["provenance"],
        )
        self.assertIn(candidate["markdownPath"], self.files)
        self.assertEqual(self.manifest["counts"]["acts"], len(self.cards))
        self.assertEqual(
            self.manifest["counts"]["candidates"], len(self.knowledge["candidates"])
        )
        with closing(QUERY.connect(self.database)) as connection:
            self.assertEqual(QUERY.query(connection, act_id=identity)["count"], 0)
            exact = QUERY.query(connection, candidate_id=identity)
            found = QUERY.query(connection, text="167", limit=50)
            self.assertEqual(
                connection.execute("SELECT count(*) FROM candidates").fetchone()[0],
                len(self.knowledge["candidates"]),
            )
            self.assertEqual(
                connection.execute("PRAGMA foreign_key_check").fetchall(), []
            )
        self.assertEqual(exact["count"], 1)
        result = next(row for row in found["results"] if row["candidateId"] == identity)
        self.assertEqual(result["role"], "candidate")
        self.assertIsNone(result["actId"])
        self.assertIs(result["publication"]["included"], False)
        self.assertFalse(result["retrieval"]["scoreIsLegalConfidence"])
        self.assertTrue(found["warnings"])

    def test_related_act_query_exposes_candidate_limits_even_with_one_result(self):
        card = self.cards["mover-012"]
        self.assertIsNone(card["legalStatus"])
        self.assertIsNone(card["reviewStatus"])
        self.assertIn("167", self.files[card["markdownPath"]].decode())
        with closing(QUERY.connect(self.database)) as connection:
            result = QUERY.query(connection, act_id="mover-012", limit=1)
            relation = connection.execute(
                "SELECT kind,target_act_id FROM candidate_relations WHERE candidate_id=?",
                ("mdic-gm-167-2026",),
            ).fetchone()
        self.assertEqual(tuple(relation), ("index_reported", "mover-012"))
        self.assertEqual(result["count"], 1)
        self.assertTrue(result["warnings"])
        notice = next(
            row
            for row in result["relatedCandidates"]
            if row["candidateId"] == "mdic-gm-167-2026"
        )
        self.assertEqual(notice["relation"], "index_reported")
        self.assertEqual(notice["reportedEffect"], "altera")
        self.assertFalse(notice["formalEffectEstablished"])
        self.assertIsNone(notice["device"])
        self.assertIsNone(notice["effectiveDate"])
        self.assertTrue(notice["requiredReview"])
        self.assertTrue(notice["limitations"])
        self.assertEqual(
            result["results"][0]["relatedCandidates"], result["relatedCandidates"]
        )
        workgroup = next(
            row
            for row in self.knowledge["candidates"]
            if row["id"] == "mdic-gm-76-2026"
        )
        self.assertEqual(workgroup["relationships"], [])
        self.assertIn("76", workgroup["citation"]["indexLocator"])
        self.assertNotIn("167", workgroup["citation"]["indexLocator"])
        self.assertNotIn(
            "possível alteração do ato relacionado",
            self.files[workgroup["markdownPath"]].decode(),
        )

    def test_candidate_cannot_promote_state_effect_or_mismatched_snapshot(self):
        mutations = [
            (
                lambda document: document["candidates"][0]["publication"].update(
                    included=True
                ),
                "index-only",
            ),
            (
                lambda document: document["candidates"][0]["relationships"][0].update(
                    kind="altera"
                ),
                "index-reported",
            ),
            (
                lambda document: document["sources"][-1].update(sha256="0" * 64),
                "snapshot hash",
            ),
            (
                lambda document: document["sources"][-1].update(
                    locator="Entrada de outro ato 999"
                ),
                "own indexed entry",
            ),
        ]
        for mutate, message in mutations:
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                document = copy.deepcopy(BUILDER.read(BUILDER.CANDIDATES))
                for source in document["sources"]:
                    relative = source.get("archivePath")
                    if relative:
                        target = root / relative
                        target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(ROOT / relative, target)
                mutate(document)
                target = root / BUILDER.CANDIDATES
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(BUILDER.json_bytes(document))
                with self.assertRaisesRegex(ValueError, message):
                    BUILDER.load_candidates(root, self.cards)

    def test_source_context_preserves_explicit_targets_device_and_limit(self):
        expected = sum(
            len(source.get("relatedActIds", [])) for source in self.knowledge["sources"]
        )
        self.assertEqual(len(self.knowledge["sourceContexts"]), expected)
        for row in self.knowledge["sourceContexts"]:
            self.assertEqual(row["relation"], "source_context")
            self.assertFalse(row["establishesApplicability"])
            self.assertTrue(row["limitations"])
            self.assertTrue(row["citation"]["sourceUrl"])
        with closing(QUERY.connect(self.database)) as connection:
            act = QUERY.query(connection, act_id="contran-949-2022")
            source = QUERY.query(connection, source_id="guide-contran-949-retificacao")
            self.assertEqual(
                connection.execute("SELECT count(*) FROM source_contexts").fetchone()[
                    0
                ],
                expected,
            )
        row = next(
            link
            for link in act["results"][0]["sourceContextLinks"]
            if link["sourceId"] == "guide-contran-949-retificacao"
        )
        self.assertEqual(row["actId"], "contran-949-2022")
        self.assertEqual(row["relation"], "source_context")
        self.assertIn("Art. 5", row["citation"]["device"])
        self.assertEqual(source["results"][0]["sourceContextLinks"], [row])
        unresolved = BUILDER.source_contexts(
            {
                "sample": {
                    "id": "sample",
                    "relatedActIds": ["rótulo 949/2022"],
                    "title": "Source",
                    "scope": "context",
                    "limitations": "pending",
                    "url": "https://www.gov.br/example",
                    "evidenceType": "official_index",
                    "checkedAt": "2026-10-25",
                    "provenance": {"path": "example.json", "pointer": ""},
                }
            },
            {},
            self.cards,
        )
        self.assertIsNone(unresolved[0]["actId"])
        self.assertEqual(
            unresolved[0]["targetCitation"]["idAsRecorded"], "rótulo 949/2022"
        )

    def test_recorded_relations_preserve_partial_repeal_unresolved_citations_and_modifiers(
        self,
    ):
        rows = self.knowledge["recordedRelations"]
        for row in rows:
            self.assertEqual(row["relation"], "as_recorded")
            for key in ("anchorActId", "sourceActId", "targetActId"):
                if row[key] is not None:
                    self.assertIn(row[key], self.cards)
            self.assertEqual(
                row["sourceRecordSha256"],
                BUILDER.digest((ROOT / row["provenance"]["path"]).read_bytes()),
            )
        partial = next(
            row
            for row in rows
            if row["anchorActId"] == "contran-949-2022"
            and row["provenance"]["pointer"].startswith("/relationships/")
            and row["recordedKind"] == "revoga_parcialmente"
        )
        self.assertIsNone(partial["targetActId"])
        self.assertEqual(partial["targetCitation"]["label"], "799/20")
        self.assertIsNone(partial["provision"])
        self.assertIn("Art. 6", partial["evidence"])
        with closing(QUERY.connect(self.database)) as connection:
            result = QUERY.query(connection, act_id="ibama-in-23-2020")
            impact = QUERY.query(connection, act_id="contran-949-2022")
            self.assertEqual(
                connection.execute(
                    "SELECT count(*) FROM recorded_relations"
                ).fetchone()[0],
                len(rows),
            )
            self.assertEqual(
                connection.execute("PRAGMA foreign_key_check").fetchall(), []
            )
        self.assertTrue(
            any(
                row["recordedKind"] == "altera"
                and row["sourceActId"] == "ibama-in-20-2025"
                and row["targetActId"] == "ibama-in-23-2020"
                for row in result["results"][0]["recordedRelations"]
            )
        )
        self.assertTrue(impact["results"][0]["temporalFlags"])

    def temporary_inputs(self, directory):
        root = Path(directory)
        index = BUILDER.read(BUILDER.INDEX)
        for path in {
            BUILDER.INDEX,
            BUILDER.REQUIREMENTS,
            *[row["path"] for row in index["provenance"]],
        }:
            target = root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / path, target)
        return root, index

    def test_rejects_excluded_requirement_orphans_and_stale_input_snapshots(self):
        with tempfile.TemporaryDirectory() as directory:
            root, index = self.temporary_inputs(directory)
            blocked = copy.deepcopy(index["tables"]["acts"][0])
            blocked["id"] = "contran-220-2007"
            index["tables"]["acts"].append(blocked)
            (root / BUILDER.INDEX).write_bytes(BUILDER.json_bytes(index))
            with self.assertRaisesRegex(ValueError, "Excluded/historical"):
                BUILDER.build_knowledge(root)
        with tempfile.TemporaryDirectory() as directory:
            root, _ = self.temporary_inputs(directory)
            requirements = BUILDER.read(BUILDER.REQUIREMENTS, root)
            requirements["records"][0]["actId"] = "missing-act"
            (root / BUILDER.REQUIREMENTS).write_bytes(BUILDER.json_bytes(requirements))
            with self.assertRaisesRegex(ValueError, "unpublished or missing"):
                BUILDER.build_knowledge(root)
        with tempfile.TemporaryDirectory() as directory:
            root, index = self.temporary_inputs(directory)
            path = root / index["provenance"][0]["path"]
            path.write_bytes(path.read_bytes() + b"\n")
            with self.assertRaisesRegex(ValueError, "index is stale"):
                BUILDER.build_knowledge(root)

    def test_generated_cleanup_check_and_binary_destination_guards(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "knowledge"
            BUILDER.write_bundle(self.files, output)
            manifest_path = output / "manifest.json"
            previous = json.loads(manifest_path.read_text())
            previous["artifacts"]["acts/contran-220-2007.md"] = BUILDER.digest(b"old")
            manifest_path.write_bytes(BUILDER.json_bytes(previous))
            stale = output / "acts/contran-220-2007.md"
            stale.write_bytes(b"old")
            with self.assertRaisesRegex(ValueError, "stale"):
                BUILDER.write_bundle(self.files, output, check=True)
            BUILDER.write_bundle(self.files, output)
            self.assertFalse(stale.exists())
            BUILDER.write_bundle(self.files, output, check=True)
            unknown = output / "acts/unmanaged-draft.md"
            unknown.write_text("draft")
            with self.assertRaisesRegex(ValueError, "Unmanaged Markdown"):
                BUILDER.write_bundle(self.files, output)
            self.assertEqual(unknown.read_text(), "draft")
        with self.assertRaisesRegex(ValueError, "already exists"):
            BUILDER.write_sqlite(self.knowledge, self.manifest, self.database)
        for target in (
            ROOT / "dist/knowledge.sqlite",
            ROOT / "knowledge/database.sqlite",
        ):
            with self.assertRaisesRegex(ValueError, "optional local export"):
                BUILDER.write_sqlite(self.knowledge, self.manifest, target)
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "missing.sqlite"
            with self.assertRaisesRegex(ValueError, "not found"):
                QUERY.connect(missing)
            self.assertFalse(missing.exists())


if __name__ == "__main__":
    unittest.main()
