import gzip, json, re, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


def text(s):
    return re.sub(r"\s+", " ", str(s)).strip()


class CertificationMaps(unittest.TestCase):
    def test_active_integrity_and_source_provenance(self):
        hierarchy = {
            g["id"]: {s["id"] for s in g["children"]}
            for g in read("catalog.json")["metadata"]["hierarchy"]
            if g["physical"]
        }
        for name in ["inmetro", "anatel"]:
            d = read(f"data/{name}/active.json")
            rows = d["records"]
            self.assertEqual(len(rows), d["metadata"]["activeCount"])
            self.assertEqual(len({r["id"] for r in rows}), len(rows))
            with gzip.open(ROOT / f"data/{name}/sources/evidence.json.gz", "rt") as f:
                sources = json.load(f)["sources"]
            for r in rows:
                self.assertTrue(r["active"])
                self.assertTrue(r["statusEvidence"])
                self.assertTrue(r["officialUrl"].startswith("https://"))
                self.assertEqual(
                    r["documentCheck"]["sha256"], sources[r["sourceKey"]]["sha256"]
                )
                self.assertTrue(bool(r["vehicleLinks"]) != bool(r["generalCategories"]))
                for link in r["vehicleLinks"]:
                    self.assertIn(link["subsystemId"], hierarchy[link["systemId"]])
                for q in r["requirements"]:
                    self.assertTrue(
                        all(
                            q.get(k)
                            for k in [
                                "title",
                                "rule",
                                "clause",
                                "scope",
                                "evidence",
                                "topics",
                            ]
                        )
                    )
                    self.assertIn(
                        text(q["evidence"]),
                        text(sources[q.get("sourceKey", r["sourceKey"])]["text"]),
                        (r["id"], q["title"]),
                    )

    def test_inmetro_mechanisms_and_pending_integral_review(self):
        rows = {r["id"]: r for r in read("data/inmetro/active.json")["records"]}
        self.assertIn("Declaração", rows["inmetro-33-2021"]["mechanism"])
        self.assertEqual(rows["inmetro-145-2022"]["fullTextReviewed"], False)
        self.assertIn("íntegra pendente", rows["inmetro-145-2022"]["statusLabel"])
        self.assertNotIn("inmetro-110-2022", rows)
        self.assertNotIn("inmetro-845-2025", rows)
        self.assertNotIn(
            "bateria",
            [x["componentId"] for x in rows["inmetro-145-2022"]["vehicleLinks"]],
        )
        self.assertIn("chumbo", str(rows["inmetro-145-2022"]["requirements"]))

    def test_label_families_and_child_restraint(self):
        rows = {r["id"]: r for r in read("data/inmetro/active.json")["records"]}
        for id in [
            "inmetro-169-2023",
            "inmetro-379-2021",
            "inmetro-246-2021",
            "inmetro-314-2025",
        ]:
            self.assertTrue(
                any("etiquetas" in q["topics"] for q in rows[id]["requirements"]), id
            )
        self.assertIn(
            "ocupantes/criancas",
            [x["subsystemId"] for x in rows["inmetro-246-2021"]["vehicleLinks"]],
        )
        self.assertIn(
            "identificacao/rotulagem",
            [x["subsystemId"] for x in rows["inmetro-169-2023"]["vehicleLinks"]],
        )
        self.assertIn("23/10/2026", str(rows["inmetro-379-2021"]["requirements"]))

    def test_anatel_current_amendments_not_revoked_predecessors(self):
        rows = {r["id"]: r for r in read("data/anatel/active.json")["records"]}
        for id in [
            "anatel-res715",
            "anatel-res779",
            "anatel-res780",
            "anatel-ato4088-2020",
            "anatel-ato5701-2021",
            "anatel-ato17087-2022",
            "anatel-ato4746-2026",
        ]:
            self.assertIn(id, rows)
        for id in [
            "anatel-ato950-2018",
            "anatel-ato5159-2022",
            "anatel-ato2221-2020",
            "anatel-ato4521-2021",
        ]:
            self.assertNotIn(id, rows)
        self.assertIn(
            "anatel-res780",
            [x["sourceId"] for x in rows["anatel-res715"]["incomingEffects"]],
        )
        self.assertIn(
            "anatel-ato5701-2021",
            [x["sourceId"] for x in rows["anatel-ato4088-2020"]["incomingEffects"]],
        )

    def test_no_blanket_radio_usb_or_module_waiver(self):
        d = read("data/anatel/active.json")
        rows = {r["id"]: r for r in d["records"]}
        self.assertIn("receptor", str(rows["anatel-res715"]["notes"]).lower())
        self.assertIn("integrado", str(rows["anatel-ato5155-2024"]["requirements"]))
        self.assertTrue(any("módulo" in x for x in d["metadata"]["limits"]))

    def test_vin_eta_date_and_public_source_clauses(self):
        rows = {r["id"]: r for r in read("data/contran/active.json")["records"]}
        r = rows["contran-968-2022"]
        self.assertEqual(len(r["requirements"]), 7)
        self.assertTrue(
            any(
                x["subsystemId"] == "identificacao/rotulagem" for x in r["vehicleLinks"]
            )
        )
        self.assertIn("01/01/2025", str(r["requirements"]))
        self.assertIn("2018", str(r["requirements"]))
        self.assertIn("destrut", str(r["requirements"]))
        self.assertIn("17 caracteres", str(r["requirements"]))
        self.assertIn("Anexo VI", str(rows["contran-882-2021"]["requirements"]))
        self.assertNotIn("Anexo IV", str(rows["contran-882-2021"]["requirements"]))


if __name__ == "__main__":
    unittest.main()
