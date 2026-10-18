"""Publication policy, source chains and physical-vs-administrative associations."""
import csv,gzip,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(name):return json.loads((ROOT/name).read_text())
class ActiveRegulations(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.contran=read('data/contran/active.json');cls.proconve=read('data/proconve/active.json')
  cls.c={r['id']:r for r in cls.contran['records']};cls.p={r['id']:r for r in cls.proconve['records']}
 def test_only_active_and_classified(self):
  hierarchy=read('catalog.json')['metadata']['hierarchy'];systems={g['id']:g for g in hierarchy if g['physical']}
  components={'vidros','pneus-rodas','freios','iluminacao','bancos','carroceria','retrovisores','motor','eletrica','identificacao','chassi','tanque','bateria','escapamento'}
  for data in [self.contran,self.proconve]:
   m=data['metadata'];rows=data['records'];self.assertEqual(len(rows),m['activeCount']);self.assertEqual(len({r['id'] for r in rows}),len(rows))
   self.assertEqual(m['systemLinkedCount']+m['generalCategoryCount'],len(rows))
   for r in rows:
    self.assertIs(r['active'],True);self.assertIs(r['currentIndication'],True)
    self.assertNotIn(r['status'],['revogada','suspensa','vigencia_nao_confirmada'])
    self.assertTrue(bool(r['vehicleLinks'])!=bool(r['generalCategories']),r['id'])
    for link in r['vehicleLinks']:
     self.assertIn(link['componentId'],components);self.assertIn(link['systemId'],systems)
     if link['subsystemId']:self.assertIn(link['subsystemId'],[s['id'] for s in systems[link['systemId']]['children']])
    for cat in r['generalCategories']:self.assertIn(cat,m['categoryLabels'])
 def test_55_removed_without_fabricated_revocation(self):
  policy=read('data/contran/publication-policy.json');history={r['id']:r for r in read('data/contran/inventory.json')['records']}
  decisions={r['id']:r for r in read('data/contran/publication-decisions.json')['decisions']}
  self.assertEqual(len(policy['inactiveHistoricalIds']),55)
  for id in policy['inactiveHistoricalIds']:
   self.assertNotIn(id,self.c);self.assertFalse(decisions[id]['active']);self.assertEqual(decisions[id]['reason'],'historico_inativado_pelo_responsavel')
   self.assertFalse(history[id]['currentIndication'])
 def test_suspended_exhausted_and_explicit_revocations_withheld(self):
  for id in ['contran-1029-2026','contran-1014-2024','contran-330-2009','contran-329-2009','contran-343-2010','contran-364-2010','contran-443-2013','contran-412-2012','contran-433-2013','contran-248-2007']:
   self.assertNotIn(id,self.c)
  with gzip.open(ROOT/'data/contran/sources/text-extracts.json.gz','rt') as f:text=json.load(f)['contran-537-2015']['text']
  self.assertIn('412/2012',text);self.assertIn('433/2013',text)
 def test_real_vehicle_relations_and_administrative_exceptions(self):
  self.assertIn(('bancos','ocupantes/cintos'),[(x['componentId'],x['subsystemId']) for x in self.c['contran-951-2022']['vehicleLinks']])
  self.assertEqual(self.c['contran-921-2022']['vehicleLinks'][0]['componentId'],'tanque')
  self.assertIn('tanque',[x['componentId'] for x in self.c['contran-910-2022']['vehicleLinks']])
  for id in ['contran-922-2022','contran-916-2022','contran-694-2017','contran-696-2017']:
   self.assertFalse(self.c[id]['vehicleLinks']);self.assertTrue(self.c[id]['generalCategories'])
 def test_proconve_phases_and_latest_amendments(self):
  self.assertEqual(self.proconve['metadata']['phaseCounts'],{'L8':19,'P8':6})
  for id in ['ibama-in-20-2020','ibama-in-18-2021','ibama-in-18-2023','conama-490-2018']:self.assertEqual(self.p[id]['phases'],['P8'])
  for id in ['ibama-in-20-2021','ibama-in-16-2025','ibama-in-20-2025','conama-492-2018']:self.assertEqual(self.p[id]['phases'],['L8'])
  for id in ['ibama-in-19-2021','ibama-in-22-2022','ibama-in-21-2022','conama-493-2019','ibama-in-26-2020']:self.assertNotIn(id,self.p)
  r=self.p['ibama-in-20-2025'];self.assertEqual({x['label'] for x in r['relationships'] if x['kind']=='altera'},{self.p['ibama-in-16-2025']['title'],self.p['ibama-in-23-2020']['title']})
  self.assertIn('2026',str(r['notes']));self.assertIn('2027',str(r['notes']))
  self.assertIn('ibama-in-26-2020',str(self.proconve['metadata']['sourceGaps']))
 def test_corporate_obligations_are_not_physical_parts(self):
  for id in ['ibama-in-23-2022','ibama-in-28-2023']:
   r=self.p[id];self.assertFalse(r['vehicleLinks']);self.assertEqual(r['generalCategories'],['emissoes-corporativas'])
  self.assertEqual(self.p['ibama-in-5-2024']['generalCategories'],['homologacao'])
 def test_official_provenance_and_retifications(self):
  with gzip.open(ROOT/'data/proconve/sources/evidence.json.gz','rt') as f:sources=json.load(f)['sources']
  for r in self.p.values():
   self.assertTrue(r['statusEvidence'] or r['entryIntoForceEvidence']);self.assertEqual(len(r['documentCheck']['sha256']),64)
   self.assertTrue(any(s['url']==r['officialUrl'] and s['sha256']==r['documentCheck']['sha256'] for s in sources.values()),r['id'])
  self.assertGreaterEqual(len(self.p['ibama-in-23-2020']['relatedLinks']),2)
 def test_csv_exports_match_active_set(self):
  for source,data in [('contran',self.contran),('proconve',self.proconve)]:
   with (ROOT/f'data/{source}/active.csv').open(encoding='utf-8-sig') as f:rows=list(csv.DictReader(f))
   self.assertEqual({r['id'] for r in rows},{r['id'] for r in data['records']})
if __name__=='__main__':unittest.main()
