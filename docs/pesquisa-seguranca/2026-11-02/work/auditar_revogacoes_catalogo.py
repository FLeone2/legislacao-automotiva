import json,re
from pathlib import Path
root=Path(__file__).resolve().parent/'catalogo-contran'
data=json.loads((root/'indice-estruturado.json').read_text(encoding='utf-8'))
rows={(r['number'],r['year']):r for r in data['rows']}
acts=json.loads((root/'clausulas-revogacao-extraidas.json').read_text(encoding='utf-8'))
matches=[]
for a in acts:
 for block in a['blocks']:
  # Considera somente trechos que designam expressamente resoluções inteiras.
  heading=re.search(r'(?:Fica\s+revogada\s+a\s+Resolu[çc][ãa]o|Ficam\s+revogadas\s+as\s+Resolu[çc][õo]es|(?:II|III|IV|V)\s*[-–]\s*as\s+Resolu[çc][õo]es)',block,re.I)
  if not heading:continue
  scope=block[heading.start():]
  # Nem número isolado nem referência a artigo serve para revogação integral.
  for m in re.finditer(r'(?:n[ºo°.]?\s*)?([0-9]{1,4}),\s*de\s+[^;\n]{1,70}?((?:19|20)[0-9]{2})',scope,re.I):
   key=int(m[1]),int(m[2]); target=rows.get(key)
   if target and target['status'].startswith('vigencia') and target['id']!=a['id']:
    matches.append({'actor':a['id'],'target':target['id'],'target_status':target['status'],'block':block,'match':m[0],'url':a['official_url']})
(root/'revogacoes-candidatas-a-conferencia.json').write_text(json.dumps(matches,ensure_ascii=False,indent=2),encoding='utf-8')
for x in matches:print(json.dumps(x,ensure_ascii=False))
print('MATCHES',len(matches))
