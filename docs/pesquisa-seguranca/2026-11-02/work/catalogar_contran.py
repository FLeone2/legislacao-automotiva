"""Catálogo do índice público CONTRAN; atos originais, sem consolidação presumida."""
import concurrent.futures, datetime, hashlib, io, json, re, shutil, struct, time, unicodedata, urllib.parse, urllib.request, zipfile
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path
from pypdf import PdfReader
import olefile
from striprtf.striprtf import rtf_to_text

ROOT=Path(__file__).resolve().parent.parent
WORK=ROOT/'work'/'catalogo-contran'; DOCS=WORK/'documentos'; OUT=ROOT/'outputs'/'contran-vigentes'
for p in (WORK,DOCS,OUT,OUT/'resolucoes'):p.mkdir(parents=True,exist_ok=True)
SOURCE='https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran'
ASOF='2026-10-31'
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s) if not unicodedata.combining(c)).lower()
def clean(s):return re.sub(r'\s+',' ',s).strip()
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (public legislation research)'})
 with urllib.request.urlopen(req,timeout=30) as response:return response.read(),response.url,response.headers.get('Content-Type','')
class Table(HTMLParser):
 def __init__(self):super().__init__();self.rows=[];self.row=None;self.cell=None;self.a=None;self.links=[]
 def handle_starttag(self,t,a):
  if t=='tr':self.row=[]
  if t in ('td','th') and self.row is not None:self.cell={'text':'','links':[]}
  if t=='a':self.a={'label':'','url':dict(a).get('href','')}
 def handle_data(self,s):
  if self.cell is not None:self.cell['text']+=s+' '
  if self.a is not None:self.a['label']+=s
 def handle_endtag(self,t):
  if t=='a' and self.a is not None:
   self.a['label']=clean(self.a['label']);self.links.append(self.a)
   if self.cell is not None:self.cell['links'].append(self.a)
   self.a=None
  if t in ('td','th') and self.cell is not None:self.cell['text']=clean(self.cell['text']);self.row.append(self.cell);self.cell=None
  if t=='tr' and self.row is not None:self.rows.append(self.row);self.row=None

def year(date):
 m=re.fullmatch(r'\d{2}\.\d{2}\.(\d{2}|\d{4})',date)
 if not m:return None
 y=int(m[1]);return y if y>=100 else y+(1900 if y>=90 else 2000)
def absolute(url):return urllib.parse.urljoin(SOURCE,url)

def parse_index(data):
 p=Table();p.feed(data.decode('utf-8',errors='replace'));groups={};extra_rows=[]
 for cells in p.rows:
  if len(cells)<5 or not re.match(r'^\d+',cells[0]['text']):continue
  n=int(re.match(r'^\d+',cells[0]['text'])[0]);y=year(cells[1]['text'])
  row={'number':n,'year':y,'date':cells[1]['text'],'publication':cells[2]['text'],'subject':cells[3]['text'],'index_status':cells[4]['text'],'document_links':[{**l,'url':absolute(l['url'])} for l in cells[0]['links']],'status_links':[{**l,'url':absolute(l['url'])} for l in cells[4]['links']]}
  if n not in groups or y:groups[n]=row
  if not y:extra_rows.append(row)
 for row in extra_rows:
  parent=groups[row['number']]
  if parent is not row:
   parent.setdefault('supplementary_rows',[]).append(row)
 for r in groups.values():
  links=[l for l in r['document_links'] if re.fullmatch(r'0*'+str(r['number']),l['label'])]
  r['official_url']=(links or r['document_links'] or [{'url':SOURCE}])[0]['url']
  r['notes']=[]
  if r['year'] is None:
   match=re.search(r'resolucao0*'+str(r['number'])+r'_(\d{2})\.',r['official_url'],re.I)
   if match:
    suffix=int(match[1]);r['year']=suffix+(1900 if suffix>=90 else 2000)
    r['notes'].append('A coluna de data do índice não informa data válida. O ano de identificação foi obtido do nome do arquivo oficial; não substitui conferência do cabeçalho do ato.')
  r['id']=f"contran-{r['number']:04}-{r['year'] or 'ano-nao-identificado'}"
  if r['number']==224:r['notes'].append('Divergência de ano: esta linha do índice registra 2006; outros documentos oficiais, incluindo a Portaria 990/2022 e o índice de consolidadas, referem 2007. Data original preservada, sem saneamento presumido.')
 return list(groups.values()),len([c for c in p.rows if len(c)>=5 and re.match(r'^\d+',c[0]['text'])])

def own_status(r):
 s=norm(r['index_status'])
 if re.match(r'revogad[ao]\s+(?:em parte|(?:os?|as?)?\s*(?:itens|arts?\b|artigos|incisos|anexo))',s):return 'vigencia_com_revogacao_parcial'
 if re.search(r'\brevogada\b.{0,180}?\bpela\b',s) or re.match(r'^(?:anexos?\s+)?revogada\b',s) or re.search(r'\brevogada em\s+\d',s):return 'revogada_indice'
 if re.search(r'\banulada\b|\bnula\b|sem efeito|insubsistente',s):return 'anulada_ou_sem_efeito'
 if re.search(r'extinta|extinto',s):return 'efeitos_encerrados_indice'
 if re.match(r'(?:efeitos suspensos|suspensa\b)',s):return 'suspensa_indice'
 if re.search(r'efeitos do art.{0,35}suspensos',s):return 'vigencia_com_suspensao_parcial'
 if re.match(r'(?:em vigor\s+)?art.{0,30}revogad',s) or re.match(r'revogado os arts',s):return 'vigencia_com_revogacao_parcial'
 if r['date']=='---':return 'registro_complementar'
 return 'vigencia_indicada'

def ref_from_link(l, rows):
 label=clean(l['label']);m=re.match(r'0*(\d+)\s*/\s*(\d{2,4})\b',label)
 if not m:return None
 n=int(m[1]); y=int(m[2]); y=y if y>=100 else y+(1900 if y>=50 else 2000)
 target=next((r for r in rows if r['number']==n and r['year']==y),None)
 return {'number':n,'year':y,'id':target['id'] if target else f'contran-{n:04}-{y}','url':l['url'],'label':label}

def index_relations(rows):
 edges=[]
 # A última operação antes de cada referência fornece o sentido. Relações ambíguas ficam para leitura.
 for r in rows:
  text=r['index_status']; low=norm(text); cursor=0
  for l in r['status_links']:
   ref=ref_from_link(l,rows)
   if not ref:continue
   pos=text.find(l['label'],cursor)
   if pos<0:pos=text.find(l['label'])
   if pos<0:continue
   before=low[:pos];cursor=pos+len(l['label'])
   ops=list(re.finditer(r'revogad[ao]s?|revoga\b|alterad[ao]s?|altera\b|suspens[ao]s?|suspende\b|referenda\b|aprova\b|anula\b|restaura\b',before))
   if not ops:continue
   op=ops[-1]; fragment=before[op.start():];word=op[0]
   if word.startswith('revogad'):
    if 'pela' in fragment:
     preceding=before[max(0,op.start()-70):op.start()]
     partial=word.startswith('revogado') or bool(re.search(r'\barts?\.?\s*\d|\bincis|\bparagr|\banexos?\b|§',preceding)) or bool(re.search(r'\bart|\bincis|\bparagr|§|\bitens|\banexo',fragment))
     kind='revoga_parcialmente' if partial else 'revoga'; direction='incoming'
    elif re.search(r'\bart|\bincis|\bparagr|§|\bitens|\banexo',fragment):kind='revoga_parcialmente';direction='outgoing'
    elif re.search(r'as (?:seguintes )?resolucoes',fragment):kind='revoga';direction='outgoing'
    else:continue
   elif word=='revoga':kind='revoga_parcialmente' if re.search(r'\bart|\bincis|\bparagr|§|\bitens|\banexo',fragment) else 'revoga';direction='outgoing'
   elif word.startswith('alterad'):
    if 'pela' not in fragment:continue
    kind='altera';direction='incoming'
   elif word=='altera':kind='altera';direction='outgoing'
   elif word.startswith('suspens'):
    if 'pela' not in fragment:continue
    kind='suspende_efeitos';direction='incoming'
   elif word=='suspende':kind='suspende_efeitos';direction='outgoing'
   else:continue
   # Portaria e Deliberação não devem ser confundidas com Resolução de mesmo número.
   scope=text[op.start():pos]
   if re.search('portaria|delibera',norm(scope)):continue
   src,tgt=(r['id'],ref['id']) if direction=='outgoing' else (ref['id'],r['id'])
   if src==tgt:continue
   edges.append({'source':src,'target':tgt,'kind':kind,'evidence_kind':'indice','evidence':clean(text[op.start():pos+len(l['label'])]),'evidence_url':SOURCE,'actor_url':ref['url'] if direction=='incoming' else r['official_url'],'classification':'relacao_indicada_no_indice; escopo e datas devem ser lidos'})
 return edges

def extract_doc(data):
 if data.startswith(b'{\\rtf'):return rtf_to_text(data.decode('cp1252',errors='replace')),'RTF'
 ole=olefile.OleFileIO(data);wd=ole.openstream('WordDocument').read();table=ole.openstream('1Table' if struct.unpack_from('<H',wd,10)[0]&0x200 else '0Table').read()
 fc,lcb=struct.unpack_from('<II',wd,418);clx=table[fc:fc+lcb];i=0
 while clx[i]==1:i+=3+struct.unpack_from('<H',clx,i+1)[0]
 if clx[i]!=2:raise ValueError('Tabela de texto Word não reconhecida')
 size=struct.unpack_from('<I',clx,i+1)[0];piece=clx[i+5:i+5+size];n=(size-4)//12;cps=struct.unpack_from('<'+'I'*(n+1),piece);parts=[]
 for p in range(n):
  f=struct.unpack_from('<I',piece,(n+1)*4+p*8+2)[0];compressed=bool(f&0x40000000);f&=0x3fffffff
  if compressed:f//=2
  parts.append(wd[f:f+(cps[p+1]-cps[p])*(1 if compressed else 2)].decode('cp1252' if compressed else 'utf-16le',errors='replace'))
 return ''.join(parts).replace('\r','\n').replace('\x07','\t'),'DOC'

# Reutiliza arquivos oficiais já obtidos, com sua procedência, sem substituir o índice recém-consultado.
cached_sources=[]
for manifest_name in ('manifesto-fontes.json','manifesto-docs.json'):
 path=ROOT/'work'/'fontes-seguranca'/manifest_name
 if path.exists():cached_sources+=json.loads(path.read_text(encoding='utf-8'))
def canonical(u):return urllib.parse.unquote(u).replace('/@@display-file/file','').replace('/@@download/file','').rstrip('/')

def acquire(r):
 ident=r['id']; meta=DOCS/(ident+'.meta.json'); txt=DOCS/(ident+'.txt')
 if meta.exists():
  prev=json.loads(meta.read_text(encoding='utf-8'))
  if prev.get('state')=='downloaded':return prev
 result={'id':ident,'official_url':r['official_url'],'consulted_at':ASOF,'state':'failed','text_extracted':False}
 try:
  cached=next((x for x in cached_sources if x.get('state')=='downloaded' and canonical(x['official_url'])==canonical(r['official_url'])),None)
  if cached:
   extension='.doc' if cached['id'].endswith('-doc') else '.pdf';old=ROOT/'work'/'fontes-seguranca'/(cached['id']+extension);data=old.read_bytes();actual=cached.get('download_url',r['official_url']);ctype='cached-official'
  else:
   data,actual,ctype=get(r['official_url'])
   if b'<html' in data[:500].lower() or b'<!doctype' in data[:500].lower():
    p=Table();p.feed(data.decode('utf-8',errors='replace'))
    links=[l for l in p.links if '@@display-file/file' in l['url'] or '@@download/file' in l['url']]
    if not links:raise ValueError('Página sem link de documento identificável')
    actual=urllib.parse.urljoin(actual,links[0]['url']);data,actual,ctype=get(actual)
  ext='.pdf' if data.startswith(b'%PDF') else '.doc' if data.startswith(b'\xd0\xcf\x11\xe0') else '.rtf' if data.startswith(b'{\\rtf') else None
  if not ext:raise ValueError('Resposta não reconhecida como PDF, DOC ou RTF')
  (DOCS/(ident+ext)).write_bytes(data)
  result.update(state='downloaded',download_url=actual,content_type=ctype,format=ext[1:].upper(),sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),binary=ident+ext)
  try:
   if ext=='.pdf':
    reader=PdfReader(io.BytesIO(data));pages=[p.extract_text() or '' for p in reader.pages];text='\n\n'.join(f'PÁGINA {i+1}\n{p}' for i,p in enumerate(pages));result['pages']=len(pages)
   else:text,_=extract_doc(data)
   text=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',text)
   txt.write_text(text,encoding='utf-8');result.update(text_extracted=bool(text.strip()),text_characters=len(text),extraction_review='extração automática; não é texto consolidado nem revisão integral')
   if text.count('�')>10 or len(text)<300:result['text_warning']='Extração incompleta ou com caracteres problemáticos; consultar original.'
  except Exception as ex:result['extraction_error']=str(ex)
 except Exception as ex:result['error']=str(ex)
 meta.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 return result

def main():
 raw,actual,ctype=get(SOURCE);(WORK/'indice-oficial.html').write_bytes(raw)
 rows,row_count=parse_index(raw);by_num={r['number']:r for r in rows};by_id={r['id']:r for r in rows}
 edges=index_relations(rows)
 for r in rows:r['status']=own_status(r)
 # Correções que já possuem dispositivo primário conferido. Não depende de mera ementa.
 corrections=[
  (220,997,2023,'revoga','Art. 2º da 997/2023 inclui a 220/2007 no art. 8º da 951/2022; vigência em 02/10/2023.'),
  (412,537,2015,'revoga','Art. 6º da 537/2015 revoga expressamente a 412/2012.'),
  (433,537,2015,'revoga','Art. 6º da 537/2015 revoga expressamente a 433/2013.'),
 ]
 for target,actor,actor_year,kind,ev in corrections:
  if target in by_num and actor in by_num:
   edges.append({'source':by_num[actor]['id'],'target':by_num[target]['id'],'kind':kind,'evidence_kind':'dispositivo_primario_conferido','evidence':ev,'evidence_url':by_num[actor]['official_url'],'actor_url':by_num[actor]['official_url'],'classification':'dispositivo_primario_conferido'})
 incoming=defaultdict(list);outgoing=defaultdict(list)
 for e in edges:incoming[e['target']].append(e);outgoing[e['source']].append(e)
 # Conferência cruzada da própria tabela: uma linha pode não registrar o efeito informado em outra.
 discrepancies=[]
 for r in rows:
  full=[e for e in incoming[r['id']] if e['kind']=='revoga' and e['source'] in by_id and (by_id[e['source']]['year'] or 0) >= (r['year'] or 0)]
  if full and r['status'] not in ('revogada_indice','anulada_ou_sem_efeito','registro_complementar'):
   r['status_before_crosscheck']=r['status'];r['status']='revogada_por_conferencia_cruzada'
   r['notes'].append('Situação da linha diverge da revogação identificada em outro ato/linha; ver fontes de efeito recebidas.')
   discrepancies.append({'id':r['id'],'index_status':r['index_status'],'assessment':r['status'],'evidence':full})
 # Condição expressamente descrita no índice, cujo evento está materializado por ato publicado em 2011.
 if 248 in by_num and '390/11' in by_num[248]['index_status']:
  r=by_num[248];r['status']='revogada_por_condicao_publicada';r['notes'].append('O índice condiciona a revogação à publicação da 390/2011; esse ato consta publicado no próprio índice. Não há restauração automática por revogação posterior do ato.')
  e={'source':by_num[390]['id'],'target':r['id'],'kind':'revoga','evidence_kind':'condicao_explicita_no_indice','evidence':r['index_status'],'evidence_url':SOURCE,'actor_url':by_num[390]['official_url'],'classification':'condicao_de_publicacao_indicada_no_indice'}
  edges.append(e);incoming[r['id']].append(e);outgoing[e['source']].append(e)
 active_states={'vigencia_indicada','vigencia_com_revogacao_parcial','vigencia_com_suspensao_parcial'}
 candidates=[r for r in rows if r['status'] in active_states]
 (WORK/'indice-estruturado.json').write_text(json.dumps({'source':SOURCE,'consulted_at':ASOF,'rows':rows,'relationships':edges,'row_count':row_count},ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'etapa':'indice','linhas':row_count,'atos':len(rows),'candidatas':len(candidates),'divergencias':len(discrepancies)},ensure_ascii=False),flush=True)
 acquired={}
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  future_map={pool.submit(acquire,r):r for r in candidates}
  for n,f in enumerate(concurrent.futures.as_completed(future_map),1):
   r=future_map[f];result=f.result();acquired[r['id']]=result
   if n%20==0 or result['state']!='downloaded':print(json.dumps({'concluidos':n,'total':len(candidates),'id':r['id'],'state':result['state'],'error':result.get('error')},ensure_ascii=False),flush=True)
 (WORK/'aquisicao.json').write_text(json.dumps(acquired,ensure_ascii=False,indent=2),encoding='utf-8')
 # Extrair blocos de revogação para auditoria humana: não promove automaticamente qualquer número citado a revogação integral.
 audit=[]
 for r in candidates:
  p=DOCS/(r['id']+'.txt')
  if p.exists():
   text=p.read_text(encoding='utf-8');blocks=[]
   for match in re.finditer(r'(?:Fica[m]?\s+revogad[ao]s?|Revogam-se|Cláusula de revogação)',text,re.I):
    tail=text[match.start():];end=re.search(r'\n\s*Art\.?\s*\d+',tail[15:]);endpos=(end.start()+15) if end else min(len(tail),1800)
    blocks.append(tail[:endpos].strip())
   if blocks:audit.append({'id':r['id'],'official_url':r['official_url'],'blocks':blocks})
 (WORK/'clausulas-revogacao-extraidas.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
 generate(rows,edges,incoming,outgoing,acquired,discrepancies,raw,row_count)

def md(s):return clean(s).replace('|','\\|').replace('[','\\[').replace(']','\\]')
def official(r):return f"[{r['number']}/{r['year'] or '?'}]({r['official_url']})"
def rel_label(e,by_id,which):
 target=e[which];r=by_id.get(target)
 return official(r) if r else f"[{target.replace('contran-','')}]({e.get('actor_url') or e['evidence_url']})"
def revocation_phrase(r):
 text=r['index_status'];start=re.search(r'revogad[ao]|anulad[ao]|suspens[ao]|extint[ao]',text,re.I)
 if not start:return text
 tail=text[start.start():];end=re.search(r'\s+(?:Altera(?:da)?\b|Revoga\b|Em vigor\b|Referenda\b)',tail,re.I)
 return tail[:end.start()].strip() if end else tail
def generate(rows,edges,incoming,outgoing,acquired,discrepancies,raw,row_count):
 by_id={r['id']:r for r in rows};active_states={'vigencia_indicada','vigencia_com_revogacao_parcial','vigencia_com_suspensao_parcial'}
 active=sorted((r for r in rows if r['status'] in active_states),key=lambda r:(r['year'] or 0,r['number']),reverse=True)
 labels={'vigencia_indicada':'Vigência indicada no índice, após conferência cruzada','vigencia_com_revogacao_parcial':'Vigência com revogação parcial indicada','vigencia_com_suspensao_parcial':'Vigência com suspensão parcial de efeitos','revogada_indice':'Revogada segundo o índice','revogada_por_conferencia_cruzada':'Revogada: conferência cruzada com outro ato/linha','revogada_por_condicao_publicada':'Revogação condicionada a publicação já ocorrida','suspensa_indice':'Efeitos suspensos segundo o índice','efeitos_encerrados_indice':'Efeitos encerrados segundo o índice','anulada_ou_sem_efeito':'Anulada ou sem efeito segundo o índice','registro_complementar':'Registro complementar do índice'}
 # Alertas de base revogada e de efeitos temporais pertencem ao ato, sem concluir extinção automática.
 for r in active:
  amended=[e for e in outgoing[r['id']] if e['kind']=='altera' and e['target'] in by_id and by_id[e['target']]['status'].startswith('revogada')]
  if amended:r['notes'].append('Este ato altera base hoje indicada como revogada. Verificar efeitos próprios remanescentes; a simples indicação de vigência não autoriza aplicar isoladamente a alteração.')
  if re.search(r'prazo|prorrog|pandemia|calamidade|cronograma|campanhas',norm(r['subject'])):r['notes'].append('Ato com componente temporal: verificar período de eficácia de cada dispositivo. Ausência de revogação formal não garante efeito operacional atual.')
  a=acquired.get(r['id'],{});related=[]
  for l in r['document_links']+r['status_links']+[l for row in r.get('supplementary_rows',[]) for l in row['document_links']+row['status_links']]:
   if l['url']!=r['official_url'] and (l['label'],l['url']) not in {(x['label'],x['url']) for x in related}:related.append(l)
  text=f"# Resolução CONTRAN nº {r['number']}/{r['year'] or 'ano não identificado'}\n\n"
  text+=f"**Assunto:** {r['subject']}\n\n"
  text+=f"- **Data do ato no índice:** {r['date']}\n- **Publicação no índice:** {r['publication']}\n- **Situação no catálogo:** {labels[r['status']]}\n- **Consulta:** {ASOF}\n- **Texto oficial:** [abrir documento]({r['official_url']})\n- **Fonte do enquadramento:** [índice oficial CONTRAN]({SOURCE})\n\n"
  text+='## Situação e disponibilidade\n\n'+f"**Informação original da coluna Situação:** {r['index_status']}\n\n"
  if a.get('state')=='downloaded':text+=f"O documento principal foi recuperado em {ASOF}: {a['format']}, {a['bytes']:,} bytes. SHA-256: `{a['sha256']}`.\n\n"
  else:text+=f"O índice oferece o link, mas a recuperação automática não foi concluída nesta consulta: {a.get('error','não verificado')}. Isso não demonstra inexistência ou revogação do ato.\n\n"
  if r['notes']:text+='## Observações\n\n'+''.join('- '+n+'\n' for n in r['notes'])+'\n'
  text+='## Relações normativas identificadas\n\n'
  relations=[];seen_rel=set()
  for e in incoming[r['id']]:
   key=('incoming',e['source'],e['kind'])
   if key not in seen_rel:relations.append(f"- **Recebe efeito — {e['kind'].replace('_',' ')}:** {rel_label(e,by_id,'source')}. Evidência: {md(e['evidence'])}.\n");seen_rel.add(key)
  for e in outgoing[r['id']]:
   key=('outgoing',e['target'],e['kind'])
   if key not in seen_rel:relations.append(f"- **Produz efeito — {e['kind'].replace('_',' ')}:** {rel_label(e,by_id,'target')}. Evidência: {md(e['evidence'])}.\n");seen_rel.add(key)
  text+=''.join(dict.fromkeys(relations)) if relations else 'Nenhuma relação adicional estruturada com segurança a partir dos links desta linha. Consultar o texto original e a coluna Situação.\n'
  text+='\nAs relações do índice podem ter escopo parcial ou datas próprias. A revogação de um ato revogador não restaura automaticamente o anterior.\n\n'
  text+='## Anexos, retificações e outros links do índice\n\n'
  text+=''.join(f"- [{md(l['label'] or 'Link sem rótulo no índice')}]({l['url']})\n" for l in related) if related else 'Sem link adicional identificado nesta linha.\n'
  text+='\nOs links adicionais são os publicados na fonte; a recuperação de cada anexo não foi testada individualmente.\n\n'
  p=DOCS/(r['id']+'.txt')
  if a.get('text_extracted') and p.exists():
   extracted=p.read_text(encoding='utf-8')
   text+='## Texto do documento principal — extração automática\n\n> Reprodução textual extraída do arquivo oficial original. Não é consolidação com alterações posteriores. Tabelas, fórmulas, figuras e caracteres de PDFs antigos podem não ser preservados; prevalece a conferência do original.\n\n'
   text+='```text\n'+extracted.replace('```','~~~')+'\n```\n'
  else:text+='## Texto do documento principal\n\nExtração textual indisponível nesta consulta. Utilize o link oficial acima.\n'
  text+='\n[Voltar ao catálogo](../CATALOGO-RESOLUCOES-VIGENTES.md)\n'
  (OUT/'resolucoes'/(r['id']+'.md')).write_text(text,encoding='utf-8')
 intro=f"# Catálogo das resoluções CONTRAN com vigência indicada\n\nConsulta em **{ASOF}**. Fonte principal: [Resoluções CONTRAN — Ministério dos Transportes]({SOURCE}).\n\n"
 intro+=f"Foram inventariadas **{row_count} linhas**, reunidas em **{len(rows)} atos por número**; as linhas de retificação foram vinculadas ao respectivo ato. Este catálogo contém **{len(active)} fichas Markdown** após a conferência cruzada das indicações de revogação.\n\n"
 intro+='## Como usar\n\nCada ficha contém assunto, situação original do índice, relações de alteração/revogação identificadas, links oficiais e disponibilidade verificada do documento principal. Quando a extração foi possível, inclui o texto original em bloco textual.\n\n'
 intro+='**Escopo:** inventário das resoluções presentes no endereço indicado. Não inclui automaticamente todas as portarias SENATRAN, deliberações, normas ABNT ou atos fora desse índice. A indicação de vigência formal não decide aplicação a um veículo, eficácia de prazos já encerrados ou efeito autônomo de uma alteração de base revogada.\n\n'
 intro+='**Atualização da fonte:** a página informa última modificação em 06/10/2026. Este pacote registra o conteúdo acessível na consulta; não atesta publicações ainda ausentes do índice.\n\n'
 intro+='**Correções relevantes:** a 220/2007 foi excluída dos vigentes pela revogação expressa na 997/2023; 412/2012 e 433/2013, pela 537/2015. Casos adicionais de confronto entre linhas estão em [divergências](DIVERGENCIAS-E-CRITERIOS.md).\n\n'
 intro+='[Atos revogados e demais situações](REVOGACOES-E-OUTRAS-SITUACOES.md) · [Dados estruturados](catalogo.json) · [Manifesto das fontes](manifesto-fontes.json)\n\n'
 last=None
 for r in active:
  if r['year']!=last:
   last=r['year'];intro+=f"\n## {last}\n\n| Resolução / original oficial | Assunto | Situação no catálogo | Ficha Markdown |\n| --- | --- | --- | --- |\n"
  note='Parcialmente revogada' if 'revogacao_parcial' in r['status'] else 'Suspensão parcial' if 'suspensao_parcial' in r['status'] else 'Vigência indicada'
  if r['notes']:note+='; ver observações'
  intro+=f"| {official(r)} | {md(r['subject'])} | {note} | [Ficha](resolucoes/{r['id']}.md) |\n"
 (OUT/'CATALOGO-RESOLUCOES-VIGENTES.md').write_text(intro,encoding='utf-8')
 excluded=sorted((r for r in rows if r['status'] not in active_states),key=lambda r:r['number'],reverse=True)
 other=f"# Revogações e outras situações — CONTRAN\n\nFonte: [índice oficial]({SOURCE}). Consulta: {ASOF}.\n\nEste registro preserva os atos retirados do catálogo de vigência indicada. Suspensão, anulação e encerramento de efeitos são apresentados com seus próprios rótulos. Onde o responsável não pôde ser estruturado, a informação literal e seus links são mantidos.\n\n| Ato | Situação avaliada | Quem revogou / efeito identificado | Situação literal no índice |\n| --- | --- | --- | --- |\n"
 for r in excluded:
  effects=[e for e in incoming[r['id']] if e['kind'] in ('revoga','revoga_parcialmente','suspende_efeitos')]
  actors='; '.join(dict.fromkeys(f"{e['kind'].replace('_',' ')}: {rel_label(e,by_id,'source')}" for e in effects)) or md(revocation_phrase(r))
  other+=f"| {official(r)} | {labels[r['status']]} | {actors} | {md(r['index_status'])} |\n"
 (OUT/'REVOGACOES-E-OUTRAS-SITUACOES.md').write_text(other,encoding='utf-8')
 divergence='# Divergências, critérios e limites\n\n'
 divergence+='1. A classificação foi feita pela situação da própria resolução, diferenciando o ato que **revoga outro** do ato **revogado**.\n2. Revogação parcial e suspensão parcial preservam ficha no catálogo.\n3. Foram confrontadas relações entre linhas do índice. As classificações inferidas do índice mantêm a evidência para revisão.\n4. Dispositivos primários já conferidos corrigem divergências demonstradas, como 220/2007, 412/2012 e 433/2013.\n5. Atos de prazo, campanhas e pandemia permanecem com alerta de eficácia temporal quando não há revogação formal identificada.\n6. Alterações de base revogada recebem alerta; não foi presumida revogação automática do ato alterador inteiro.\n7. Texto original extraído não equivale a texto consolidado. O exame integral de todos os dispositivos e cadeias não é atestado.\n8. Disponibilidade é verificada para o arquivo principal; links adicionais são preservados como publicados.\n9. A Resolução 224 apresenta divergência de ano entre fontes oficiais, preservada em sua ficha.\n\n## Confrontos que alteraram a classificação\n\n'
 for d in discrepancies:
  r=by_id[d['id']];divergence+=f"### {r['number']}/{r['year']}\n\n- Situação da linha: {r['index_status']}\n- Resultado: {labels[r['status']]}\n"+''.join(f"- Evidência: {e['evidence']} — {rel_label(e,by_id,'source')}\n" for e in d['evidence'])+'\n'
 (OUT/'DIVERGENCIAS-E-CRITERIOS.md').write_text(divergence,encoding='utf-8')
 package_data={'source':SOURCE,'consulted_at':ASOF,'source_sha256':hashlib.sha256(raw).hexdigest(),'index_rows':row_count,'unique_acts':len(rows),'active_count':len(active),'status_counts':dict(Counter(r['status'] for r in rows)),'records':rows,'relationships':edges,'disponibilidade_documentos':acquired,'limits':'Vigência indicada na fonte após conferência cruzada; não é consolidação integral nem decisão de aplicabilidade.'}
 (OUT/'catalogo.json').write_text(json.dumps(package_data,ensure_ascii=False,indent=2),encoding='utf-8')
 manifest={'source':SOURCE,'consulted_at':ASOF,'source_sha256':hashlib.sha256(raw).hexdigest(),'documents':list(acquired.values()),'index_latest_modified_display':'06/10/2026','availability_scope':'Arquivo principal de cada ficha; anexos não verificados individualmente.'}
 (OUT/'manifesto-fontes.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 (OUT/'LEIA-ME.md').write_text('# Resoluções CONTRAN em Markdown\n\nAbra [CATALOGO-RESOLUCOES-VIGENTES.md](CATALOGO-RESOLUCOES-VIGENTES.md).\n\nUma ficha por ato com vigência indicada, incluindo texto extraído quando disponível. Os links oficiais permanecem em todas as fichas. Consulte também os registros de revogações e divergências.\n\nOs documentos originais não foram consolidados silenciosamente com seus modificadores. O catálogo é amplo, abrangendo todos os temas do índice, sem filtro de tipo de veículo.\n',encoding='utf-8')
 checks={'active_count':len(active),'markdown_files':len(list((OUT/'resolucoes').glob('*.md'))),'main_documents_downloaded':sum(x['state']=='downloaded' for x in acquired.values()),'text_extracted':sum(x.get('text_extracted',False) for x in acquired.values()),'missing_documents':[x['id'] for x in acquired.values() if x['state']!='downloaded'],'classification_counts':dict(Counter(r['status'] for r in rows)),'classified_full_revocations_in_active':[r['id'] for r in active if r['status'].startswith('revogada')],'all_source_rows_grouped':row_count>=len(rows)}
 assert checks['active_count']==checks['markdown_files'],checks
 assert not checks['classified_full_revocations_in_active']
 for number in (202,129,351,611,855,1009):assert any(r['number']==number and 'revogacao_parcial' in r['status'] for r in active),number
 for number in (220,412,433,573,782):assert not any(r['number']==number for r in active),number
 for r in active:assert (OUT/'resolucoes'/(r['id']+'.md')).exists()
 (OUT/'validacao.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
 with zipfile.ZipFile(ROOT/'outputs'/'contran-vigentes-markdown.zip','w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(OUT.rglob('*')):
   if p.is_file():z.write(p,p.relative_to(OUT))
  z.write(WORK/'indice-oficial.html','fonte/indice-oficial-consultado.html')
  z.write(WORK/'clausulas-revogacao-extraidas.json','fonte/clausulas-revogacao-extraidas.json')
 print(json.dumps({'etapa':'concluido',**checks},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
