import json,re,zipfile,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent.parent
out=root/'outputs'/'levantamento-seguranca'
d=json.loads((out/'inventario-seguranca.json').read_text(encoding='utf-8'))
o=json.loads((root/'work'/'siscat-ensaios-observados.json').read_text(encoding='utf-8'))
m=json.loads((out/'manifesto-fontes.json').read_text(encoding='utf-8'))
assert len(d['guias'])==10
assert [x['rotulo_siscat'] for x in d['matriz_ensaios']]==[x['item'] for lv in ('nivel2','nivel3') for x in o['niveis'][lv]]
assert sum(bool(x['ajuda']) for x in o['ajudas'])==27
items=d['matriz_ensaios']+d['requisitos_complementares']
assert len(set(i['id'] for i in items))==len(items)
known={x['id'] for x in m['documentos']}
missing=[]
for i in items:
 assert all(p in d['partes_3d_semanticas'] for p in i['partes_3d']),i['id']
 for s in i['fontes']:
  if s not in known:missing.append((i['id'],s))
assert not missing,missing
payload=(out/'inventario-seguranca.json').read_text(encoding='utf-8')
assert not re.search(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b',payload)
assert not re.search(r'[\w.+-]+@[\w.-]+\.[a-z]{2,}',payload,re.I)
assert '33152' not in payload
assert d['seguranca_integral_fechada'] is False
assert len(d['suplemento_nivel1_fonte_oficial'])==12
package=root/'outputs'/'levantamento-seguranca-siscat.zip'
with zipfile.ZipFile(package) as z:
 assert z.testzip() is None
 for e in m['documentos']:
  if e.get('state')=='downloaded':assert hashlib.sha256(z.read(e['arquivo_pacote'])).hexdigest()==e['sha256']
result={'data':'2026-10-31','resultado':'integridade_estrutural_verificada','checks':['10 guias presentes','36 rótulos na mesma ordem e sem perda em relação à captura original','27 ajudas não vazias preservadas na origem','IDs únicos e todas as partes semânticas referenciadas existentes','Todas as fontes das ligações presentes no manifesto','12 linhas do suplemento nível 1','Ausência de CPF formatado, e-mail e identificador do processo no inventário derivado','ZIP íntegro e hashes dos arquivos oficiais conferidos'],'limite':'Verificações de integridade não atestam completude jurídica nem substituem as pendências da revisão.'}
(out/'validacao-levantamento.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
with zipfile.ZipFile(package,'a',zipfile.ZIP_DEFLATED) as z:
 if 'validacao-levantamento.json' not in z.namelist():z.write(out/'validacao-levantamento.json','validacao-levantamento.json')
print(json.dumps({'checks':'OK','guias':len(d['guias']),'linhas':len(d['matriz_ensaios']),'complementares':len(d['requisitos_complementares']),'fontes_adquiridas':sum(x.get('state')=='downloaded' for x in m['documentos'])},ensure_ascii=False))
