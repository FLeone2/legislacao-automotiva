import concurrent.futures
import hashlib
import io
import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
DEST = ROOT / 'fontes-seguranca'
DEST.mkdir(exist_ok=True)
records = json.loads((ROOT / 'base-contran-referencia.json').read_text(encoding='utf-8'))
wanted = {37, 215, 224, 242, 498, 537, 559, 711, 749, 750, 752, 758, 759, 764, 827, 885, 888, 908, 910, 913, 915, 936, 937, 949, 951, 954, 960, 964, 966, 968, 969, 970, 988, 993, 997, 989, 1024, 1030, 882, 994, 1015}
tasks = [(r['id'], r['officialUrl']) for r in records if r['number'] in wanted]
for r in records:
    if r['number'] in {888, 910, 913, 936, 949, 951, 954, 960, 966, 968, 970, 993}:
        for i, link in enumerate(r.get('relatedLinks', [])):
            if re.search(r'anexo|retifica|republica', link['label'], re.I) and link['url'].lower().endswith('.pdf'):
                tasks.append((r['id'] + '-complemento-' + str(i), link['url']))
tasks.append(('portaria-senatran-990-2022-republicacao', 'https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria9902022R.pdf'))
tasks.append(('deliberacao-264-2022', 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/deliberacoes/Deliberacao2642022.pdf'))
tasks.append(('portaria-senatran-1554-2022', 'https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria15442022.pdf'))
extra={26,36,280,528,717,819,899,911,916,919,921,922,924,938,939,944,948,952,953,955,958,959,963,981,987,1005,1010,1021,1022,1023,1027}
index=json.loads((ROOT/'indice-contran-completo.json').read_text(encoding='utf-8'))['rows']
for row in index:
    if row['number'] in extra:
        match=next((l for l in row['links'] if re.fullmatch(str(row['number']),l['label'].strip())),None)
        if match:
            suffix=row['date_text'].split('.')[-1]
            year=('19' if int(suffix)>90 else '20')+suffix if len(suffix)==2 else suffix
            tasks.append((f"contran-{row['number']}-{year}",match['url']))
for r in records:
    if r['number'] in {969,970,955,963,916,819}:
        for i,link in enumerate(r.get('relatedLinks',[])):
            if link['url'].lower().endswith('.pdf') and re.search('anexo|ao|retific',link['label'],re.I):
                tasks.append((r['id']+'-complemento-'+str(i),link['url']))
for ident, url in [
    ('deliberacao-250-2021','https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/deliberacoes/Deliberacao2502021.pdf'),
    ('deliberacao-270-2023','https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/deliberacoes/Deliberacao2702023.pdf')]: tasks.append((ident,url))
tasks=list(dict.fromkeys(tasks))

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            u = dict(attrs).get('href', '')
            if '@@display-file/file' in u or '@@download/file' in u:
                self.urls.append(u)

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=35) as response:
        return response.read(), response.url

def fetch(task):
    ident, original_url = task
    previous_manifest = DEST / 'manifesto-fontes.json'
    if previous_manifest.exists() and (DEST / (ident + '.pdf')).exists():
        previous = next((x for x in json.loads(previous_manifest.read_text(encoding='utf-8')) if x['id'] == ident and x.get('state') == 'downloaded'), None)
        if previous:
            return previous
    entry = {'id': ident, 'official_url': original_url, 'consulted_at': '2026-10-31'}
    try:
        data, actual_url = get(original_url)
        if not data.startswith(b'%PDF'):
            links = Links()
            links.feed(data.decode('utf-8', errors='replace'))
            if not links.urls:
                raise ValueError('PDF nao encontrado na pagina oficial')
            data, actual_url = get(urllib.parse.urljoin(actual_url, links.urls[0]))
        if not data.startswith(b'%PDF'):
            raise ValueError('Resposta nao e PDF')
        pdf_path = DEST / (ident + '.pdf')
        pdf_path.write_bytes(data)
        reader = PdfReader(io.BytesIO(data))
        pages = [{'page': i + 1, 'text': p.extract_text() or ''} for i, p in enumerate(reader.pages)]
        (DEST / (ident + '.json')).write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding='utf-8')
        (DEST / (ident + '.txt')).write_text('\n\n'.join(f'PAGINA {p["page"]}\n{p["text"]}' for p in pages), encoding='utf-8')
        entry.update({'state': 'downloaded', 'download_url': actual_url, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'pages': len(pages)})
    except Exception as error:
        entry.update({'state': 'failed', 'error': str(error)})
    print(json.dumps({'id': ident, 'state': entry['state'], 'pages': entry.get('pages'), 'error': entry.get('error')}, ensure_ascii=False), flush=True)
    return entry

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(fetch, tasks))
(DEST / 'manifesto-fontes.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'total': len(results), 'ok': sum(r['state'] == 'downloaded' for r in results)}), flush=True)
