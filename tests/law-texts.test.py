"""The generated full texts are current, anchored and tied to their sources."""

import json
from pathlib import Path
import re
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
TEXTS = ROOT / "texts"


def front(path):
    values = {}
    for line in path.read_text().split("---")[1].strip().splitlines():
        key, value = line.split(": ", 1)
        values[key] = json.loads(value)
    return values


class LawTexts(unittest.TestCase):
    def test_generated_files_are_current(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts/build_law_texts.py"), "--check"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_every_published_act_has_a_text_file(self):
        acts = {path.stem for path in (ROOT / "knowledge/acts").glob("*.md")}
        texts = {path.stem for path in TEXTS.glob("*.md")}
        self.assertEqual(acts, texts)

    def test_anchors_are_unique_and_articles_are_addressable(self):
        for path in TEXTS.glob("*.md"):
            anchors = re.findall(r'<a id="([^"]+)"></a>', path.read_text())
            self.assertEqual(len(anchors), len(set(anchors)), path.name)
        text = (TEXTS / "contran-949-2022.md").read_text()
        for anchor in ("art-2", "art-2-p1", "art-3", "anexo-i", "anexo-iii"):
            self.assertIn(f'<a id="{anchor}"></a>', text)

    def test_full_text_records_its_source_and_missing_text_says_so(self):
        index = json.loads((TEXTS / "index.json").read_text())
        for act in index["acts"]:
            meta = front(TEXTS / f"{act['id']}.md")
            if act["fullTextAvailable"]:
                self.assertTrue(meta["source"]["url"], act["id"])
                self.assertTrue(meta["source"]["sha256"], act["id"])
            else:
                self.assertIsNone(meta["source"], act["id"])
                self.assertIn(
                    "Texto completo ainda não disponível",
                    (TEXTS / f"{act['id']}.md").read_text(),
                )

    def test_a_copy_does_not_carry_legal_states(self):
        meta = front(TEXTS / "contran-949-2022.md")
        for key in ("legalStatus", "reviewStatus", "applicability", "publication"):
            self.assertNotIn(key, meta)


if __name__ == "__main__":
    unittest.main()
