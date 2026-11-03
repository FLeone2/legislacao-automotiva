import urllib.request, json, hashlib, struct, re
from pathlib import Path
import olefile
ROOT=Path(__file__).resolve().parent/'fontes-seguranca'
manifest=[]
for number,year,name in [(215,2006,'resolucao_215.doc'),(37,1998,'resolucao037_98.doc'),(26,1998,'resolucao026_98.doc'),(36,1998,'resolucao036_98.doc'),(827,1997,'r827-97.doc')]:
    index=json.loads((ROOT.parent/'indice-contran-completo.json').read_text(encoding='utf-8'))['rows']
    if number==827:
        original='https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucoes-anteriores-a-2000/r827-97.doc'
    else:
        row=next(x for x in index if x['number']==number and str(year)[2:] in x['date_text'])
        original=next(x['url'] for x in row['links'] if x['label'].strip()==str(number))
    url=original if '@@download/file' in original else original+'/@@download/file'
    entry={'id':f'contran-{number}-{year}-doc','official_url':original,'download_url':url,'consulted_at':'2026-10-31'}
    try:
        data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=35).read()
        path=ROOT/(entry['id']+'.doc'); path.write_bytes(data)
        if data.startswith(b'{\\rtf'):
            from striprtf.striprtf import rtf_to_text
            text=rtf_to_text(data.decode('cp1252'))
            (ROOT/(entry['id']+'.txt')).write_text(text,encoding='utf-8')
            entry.update(state='downloaded',sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),extraction='RTF de arquivo oficial com extensão DOC')
            manifest.append(entry); print(entry['id'],text[:150]); continue
        ole=olefile.OleFileIO(data); wd=ole.openstream('WordDocument').read()
        table=ole.openstream('1Table' if struct.unpack_from('<H',wd,10)[0]&0x200 else '0Table').read()
        fc,lcb=struct.unpack_from('<II',wd,418); clx=table[fc:fc+lcb]; i=0
        while clx[i]==1: i+=3+struct.unpack_from('<H',clx,i+1)[0]
        assert clx[i]==2
        length=struct.unpack_from('<I',clx,i+1)[0]; piece=clx[i+5:i+5+length]; n=(length-4)//12
        cps=struct.unpack_from('<'+'I'*(n+1),piece,0); out=[]
        for p in range(n):
            f=struct.unpack_from('<I',piece,(n+1)*4+p*8+2)[0]; count=cps[p+1]-cps[p]
            compressed=bool(f&0x40000000); f=f&0x3fffffff
            if compressed: f//=2
            out.append(wd[f:f+count*(1 if compressed else 2)].decode('cp1252' if compressed else 'utf-16le',errors='replace'))
        text=''.join(out).replace('\r','\n').replace('\x07','\t')
        (ROOT/(entry['id']+'.txt')).write_text(text,encoding='utf-8')
        entry.update(state='downloaded',sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),extraction='Word97 piece table; campos e notas podem exigir conferência visual')
        print(entry['id'],len(text),text[:200])
    except Exception as ex: entry.update(state='failed',error=str(ex)); print(entry)
    manifest.append(entry)
(ROOT/'manifesto-docs.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
