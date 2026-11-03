import concurrent.futures,json,urllib.request,hashlib,re
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parent/'fontes-seguranca'
class Rows(HTMLParser):
 def __init__(self): super().__init__(); self.rows=[];self.row=None;self.cell=None;self.a=None
 def handle_starttag(self,t,a):
  if t=='tr':self.row=[]
  if t in ('td','th') and self.row is not None:self.cell={'text':'','links':[]}
  if t=='a':self.a={'text':'','url':dict(a).get('href','')}
 def handle_data(self,t):
  if self.cell is not None:self.cell['text']+=t+' '
  if self.a is not None:self.a['text']+=t
 def handle_endtag(self,t):
  if t=='a' and self.a is not None:
   if self.cell is not None:self.cell['links'].append(self.a)
   self.a=None
  if t in ('td','th') and self.cell is not None:
   self.cell['text']=re.sub(r'\s+',' ',self.cell['text']).strip();self.row.append(self.cell);self.cell=None
  if t=='tr' and self.row is not None:self.rows.append(self.row);self.row=None
def work(y):
 url=f'https://www.gov.br/transportes/pt-br/assuntos/transito/'+('conteudo-Senatran' if y==2023 else 'senatran')+f'/portarias-{y}'
 try:
  data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read()
  (ROOT/f'indice-portarias-{y}.html').write_bytes(data);p=Rows();p.feed(data.decode('utf-8'))
  candidates=[r for r in p.rows if any(re.search(r'\b990\b|\b1554\b|\b1\.554\b|homologa.{0,30}ve[íi]cul|CAT\b|ENSV|etiqueta nacional de seguran|pr[ée].cadastro veicular',c['text'],re.I) for c in r)]
  result={'year':y,'source':url,'consulted_at':'2026-10-31','sha256':hashlib.sha256(data).hexdigest(),'rows_count':len(p.rows),'selected':candidates,'state':'index_screened'}
  print(json.dumps(result,ensure_ascii=False),flush=True)
  return result
 except Exception as ex:return {'year':y,'source':url,'state':'failed','error':str(ex)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(work,[2023,2024,2025,2026]))
(ROOT/'triagem-portarias-2023-2026.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
