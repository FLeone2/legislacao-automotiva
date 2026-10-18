import csv
import gzip
import hashlib
import json
import sys
import unittest
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from map_contran import parse_index, classify_source, entry_clauses


class OfficialContranMap(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.data=json.loads((ROOT/'data/contran/inventory.json').read_text())
  cls.records={r['id']:r for r in cls.data['records']}
  cls.html=gzip.decompress((ROOT/'data/contran/sources/index.html.gz').read_bytes())

 def test_complete_index_deduplicates_only_retification_rows(self):
  source,info=parse_index(self.html)
  self.assertEqual(len(source),1030)
  self.assertEqual(info['tableRows'],1033)
  self.assertEqual(info['supplementRows'],3)
  self.assertEqual({r['number'] for r in source},set(range(1,1032))-{982})
  self.assertEqual(len(self.records),1141)
  self.assertEqual(sum(r['origin']=='historical_archive' for r in self.records.values()),111)
  self.assertEqual(hashlib.sha256(self.html).hexdigest(),self.data['metadata']['sourceSha256'])

 def test_partial_revocation_never_becomes_total_revocation(self):
  for key in ['contran-1009-2024','contran-611-2016','contran-351-2010','contran-129-2001']:
   self.assertEqual(self.records[key]['status'],'parcialmente_revogada')
  self.assertEqual(self.records['contran-1020-2025']['status'],'vigencia_expressa')
  self.assertEqual(classify_source({'sourceStatus':'Revoga a Resolução 123/01','statusClauses':['Revoga a Resolução 123/01']})[0],'nao_confirmada')

 def test_explicit_incoming_effects_correct_stale_index_rows(self):
  for key in ['contran-248-2007','contran-219-2007','contran-270-2008','contran-257-2007','contran-573-2015','contran-463-1973']:
   r=self.records[key];self.assertEqual(r['status'],'revogada',key)
   self.assertTrue(any(x['kind']=='revoga' for x in r['incomingEffects']))
   self.assertFalse(r['currentIndication'])

 def test_number_and_year_are_both_identity(self):
  self.assertEqual(self.records['contran-827-2021']['status'],'revogada')
  self.assertEqual(self.records['contran-827-1997']['status'],'nao_confirmada')
  self.assertEqual(self.records['contran-111-2000']['yearBasis'],'nome_do_recurso_oficial')
  for r in self.records.values():self.assertIsInstance(r['year'],int)

 def test_system_mapping_uses_vehicle_context_instead_of_homonyms(self):
  self.assertNotIn('vidros',self.records['contran-923-2022']['systems'])
  self.assertNotIn('iluminacao',self.records['contran-960-2022']['systems'])
  self.assertNotIn('chassi',self.records['contran-723-2018']['systems'])
  self.assertIn('vidros',self.records['contran-224-2006']['systems'])

 def test_modifications_and_system_joins_have_provenance(self):
  for target,modifier,system in [('contran-951-2022','contran-997-2023','ocupantes'),('contran-960-2022','contran-989-2022','vidros'),('contran-970-2022','contran-1024-2026','iluminacao'),('contran-1013-2024','contran-1028-2026',None)]:
   r=self.records[target]
   self.assertTrue(any(x['sourceId']==modifier and x['kind']=='altera' for x in r['incomingEffects']),(target,modifier))
   if system:self.assertIn(system,r['systems'])
  for r in self.records.values():
   for rel in r['relationships']:self.assertTrue(rel['evidence'])

 def test_suspensions_and_exhausted_time_limits_remain_explicit(self):
  for key in ['contran-245-2007','contran-485-2014','contran-716-2017']:
   self.assertEqual(self.records[key]['status'],'suspensa')
   self.assertFalse(self.records[key]['currentIndication'])
  self.assertIn('dispositivos_com_prazo_encerrado',[x['kind'] for x in self.records['contran-910-2022']['temporalFlags']])
  self.assertIn('prazo_principal_encerrado',[x['kind'] for x in self.records['contran-1029-2026']['temporalFlags']])
  self.assertNotEqual(self.records['contran-1029-2026']['status'],'revogada')

 def test_entry_clause_does_not_stop_at_lowercase_internal_article_reference(self):
  text='Art. 16. Esta Resolução entra em vigor: I - em 60 dias após a data de sua publicação nos termos do art. 14 desta Resolução; e II - na data de sua publicação, quanto aos demais artigos. JOÃO SILVA Presidente'
  evidence=entry_clauses(text)
  self.assertEqual(len(evidence),1)
  self.assertIn('quanto aos demais artigos.',evidence[0])
  self.assertNotIn('JOÃO SILVA',evidence[0])

 def test_counts_csv_and_all_current_indications_have_evidence(self):
  m=self.data['metadata'];records=list(self.records.values())
  self.assertEqual(dict(Counter(r['status'] for r in records)),m['statusCounts'])
  selected=[r for r in records if r['currentIndication']]
  self.assertEqual(len(selected),m['currentIndicationCount'])
  for r in selected:
   self.assertTrue(r['statusEvidence'],r['id'])
   self.assertEqual(r['origin'],'official_index')
  with (ROOT/'data/contran/vigencia-indicada.csv').open(encoding='utf-8-sig') as f:csv_rows=list(csv.DictReader(f))
  self.assertEqual({r['id'] for r in csv_rows},{r['id'] for r in selected})
  self.assertEqual(m['sourceModifiedText'],'06/10/2026 14h52')
  self.assertEqual(m['douCheck']['state'],'nao_concluido')


if __name__=='__main__':unittest.main()
