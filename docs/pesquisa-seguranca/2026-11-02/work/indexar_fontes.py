import json, re, hashlib, urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

ROOT=Path(__file__).resolve().parent
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.row=None; self.cell=None; self.anchor=None; self.text=[]; self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='tr': self.row=[]
        if tag in ('td','th') and self.row is not None: self.cell={'text':'','links':[]}
        if tag=='a': self.anchor={'label':'','url':a.get('href','')}
    def handle_data(self,data):
        self.text.append(data)
        if self.cell is not None: self.cell['text']+=data+' '
        if self.anchor is not None: self.anchor['label']+=data
    def handle_endtag(self,tag):
        if tag=='a' and self.anchor is not None:
            self.links.append(self.anchor)
            if self.cell is not None: self.cell['links'].append(self.anchor)
            self.anchor=None
        if tag in ('td','th') and self.cell is not None:
            self.cell['text']=re.sub(r'\s+',' ',self.cell['text']).strip()
            self.row.append(self.cell); self.cell=None
        if tag=='tr' and self.row is not None:
            self.rows.append(self.row); self.row=None

url='https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran'
data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read()
(ROOT/'fontes-seguranca'/'indice-contran-2026-10-31.html').write_bytes(data)
p=Page(); p.feed(data.decode('utf-8'))
rows=[]
for r in p.rows:
    if len(r)>=5 and re.match(r'^\d+',r[0]['text']):
        rows.append({'number':int(re.match(r'^\d+',r[0]['text'])[0]),'date_text':r[1]['text'],'publication_text':r[2]['text'],'subject':r[3]['text'],'status_observed':r[4]['text'],'links':[{**x,'url':urljoin(url,x['url'])} for c in r for x in c['links']]})
out={'source':url,'consulted_at':'2026-10-31','sha256':hashlib.sha256(data).hexdigest(),'rows':rows,'limits':'Triagem do índice público; situação e ementa não substituem leitura dos dispositivos e da cadeia de alterações.'}
(ROOT/'indice-contran-completo.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print('ROWS',len(rows),'MAX',max(x['number'] for x in rows))
for x in rows:
    if x['number']>=900 and x['number']<970: print(x['number'],x['subject'])
