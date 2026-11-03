import concurrent.futures,hashlib,io,json,re,sys,urllib.request,urllib.parse
from pathlib import Path
from html.parser import HTMLParser
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parent
DEST=ROOT/'pesquisa-seguranca-2026-11-02'
DEST.mkdir(exist_ok=True)
class HTML(HTMLParser):
 def __init__(self):super().__init__();self.text=[];self.links=[];self.skip=0
 def handle_starttag(self,t,a):
  attrs=dict(a)
  if t in ['script','style','noscript']:self.skip+=1
  if t=='a' and attrs.get('href'):self.links.append({'label':'','url':attrs['href']})
  if t in ['p','tr','div','h1','h2','h3','li','br','article']:self.text.append('\n')
 def handle_endtag(self,t):
  if t in ['script','style','noscript']:self.skip=max(0,self.skip-1)
 def handle_data(self,s):
  if not self.skip:self.text.append(s)

def dou(date,page):return 'https://pesquisa.in.gov.br/imprensa/servlet/INPDFViewer?captchafield=firstAccess&data='+urllib.parse.quote(date,safe='')+'&jornal=515&pagina='+str(page)
seeds=[
 ('mdic-mover-indice','https://www.gov.br/mdic/pt-br/assuntos/sdic/setor-automotivo/programa-mover-1/legislacao-programa-mover'),
 ('decreto-12435-2025-texto','https://legis.senado.gov.br/norma/40549389/publicacao/40549630'),
 ('inmetro-400-2020','https://sistema-sil.inmetro.gov.br/rtac/RTAC002685.pdf'),
 ('inmetro-379-2021','https://www.inmetro.gov.br/legislacao/rtac/pdf/RTAC002835.pdf'),
 ('inmetro-111-2022','https://sistema-sil.inmetro.gov.br/rtac/RTAC002953.pdf'),
 ('inmetro-436-2021','https://sistema-sil.inmetro.gov.br/rtac/RTAC002855.pdf'),
 ('inmetro-130-2022','https://sistema-sil.inmetro.gov.br/rtac/RTAC002954.pdf'),
 ('inmetro-147-2022','https://sistema-sil.inmetro.gov.br/rtac/RTAC002963.pdf'),
 ('inmetro-309-2021-indice','https://www.inmetro.gov.br/legislacao/detalhe.asp?seq_ato=2802&seq_classe=1'),
 ('inmetro-108-2022-indice','https://www.inmetro.gov.br/legislacao/detalhe.asp?seq_ato=2949&seq_classe=1'),
 ('inmetro-314-2025-dou',dou('30/05/2025',73)),
 ('faq-inmetro-registro','https://www.gov.br/inmetro/pt-br/acesso-a-informacao/perguntas-frequentes/avaliacao-da-conformidade/registro-de-objetos/qual-a-legislacao-relacionada-ao-registro-1'),
 ('senatran-consultas','https://www.gov.br/transportes/pt-br/assuntos/transito/senatran/participacao-social-consultas-publicas'),
 ('contran-indice-novembro','https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran'),
 ('contran-215-2006-html','https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucao-contran-no-215-de-14-de-dezembro-de-2006'),
]
seeds +=[(f'decreto-12435-2025-dou-p{p}',dou('16/04/2025',p)) for p in range(1,7)]
seeds +=[(f'mdic-215-2025-dou-p{p}',dou('22/08/2025',p)) for p in range(26,30)]
if len(sys.argv)>1:
 seeds=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))

def fetch(task):
 ident,url=task;meta=DEST/(ident+'.meta.json')
 if meta.exists():
  prev=json.loads(meta.read_text(encoding='utf-8'))
  if prev.get('state')=='downloaded':return prev
 entry={'id':ident,'official_url':url,'consulted_at':'2026-11-02'}
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=25) as r:
   data=r.read();actual=r.url;content_type=r.headers.get('Content-Type','');charset=r.headers.get_content_charset() or 'utf-8'
  ext='.pdf' if data.startswith(b'%PDF') else '.html'
  (DEST/(ident+ext)).write_bytes(data)
  if ext=='.pdf':
   reader=PdfReader(io.BytesIO(data));pages=[{'page':i+1,'text':p.extract_text() or ''} for i,p in enumerate(reader.pages)]
   text='\n\n'.join(f'PÁGINA {p["page"]}\n{p["text"]}' for p in pages)
   (DEST/(ident+'.pages.json')).write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf-8')
   entry['pages']=len(pages)
  else:
   parser=HTML();parser.feed(data.decode(charset,errors='replace'))
   text=re.sub(r'\n[ \t]*\n+','\n\n',''.join(parser.text))
   entry['links']=[dict(link,url=urllib.parse.urljoin(actual,link['url'])) for link in parser.links]
   if re.search(r'Esta requisição foi bloqueada|Access Denied|Checking your browser',text,re.I):raise ValueError('Resposta de bloqueio, não texto normativo')
  (DEST/(ident+'.txt')).write_text(text,encoding='utf-8')
  entry.update(state='downloaded',download_url=actual,format=ext[1:],sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),text_chars=len(text))
 except Exception as e:entry.update(state='failed',error=str(e))
 meta.write_text(json.dumps(entry,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({k:entry.get(k) for k in ['id','state','format','pages','error']},ensure_ascii=False),flush=True)
 return entry
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool: results=list(pool.map(fetch,seeds))
all_records=[json.loads(p.read_text(encoding='utf-8')) for p in sorted(DEST.glob('*.meta.json'))]
(DEST/'manifesto.json').write_text(json.dumps(all_records,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'total':len(all_records),'ok':sum(r['state']=='downloaded' for r in all_records)},ensure_ascii=False))
