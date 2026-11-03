from pathlib import Path
import hashlib,json,re,shutil,zipfile
from collections import Counter

ROOT=Path(__file__).resolve().parent.parent
REPO=ROOT/'work/github-salvamento'
DEST=REPO/'docs/pesquisa-seguranca/2026-11-02'
DEST.mkdir(parents=True,exist_ok=True)

def sha(data):return hashlib.sha256(data).hexdigest()
def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s.strip()+'\n',encoding='utf-8')

# A cópia é explícita: produtos finais, scripts e dados editoriais da pesquisa.
# Não entram credenciais, diretórios de dependências, checkout Git ou caches de navegador.
selected=[p for p in (ROOT/'outputs').rglob('*') if p.is_file() and p.suffix.lower()!='.zip' and not p.name.endswith('.inspect.ndjson')]
selected += [p for p in (ROOT/'work').iterdir() if p.is_file() and p.suffix in ['.py','.mjs','.json']]
manifest=[]
for src in sorted(selected):
 rel=src.relative_to(ROOT)
 dest=DEST/rel
 dest.parent.mkdir(parents=True,exist_ok=True)
 data=src.read_bytes(); original_hash=sha(data)
 sanitizations=[]
 if src.suffix in ['.json','.jsonl','.md','.txt','.html','.svg','.py','.mjs']:
  text=data.decode('utf-8')
  # Caminhos de máquina não são necessários para retomar a pesquisa no repositório.
  for variant in [str(ROOT).replace('\\','\\\\'),str(ROOT),ROOT.as_posix()]:
   if variant in text:
    text=text.replace(variant,'.');sanitizations.append('caminho absoluto do workspace substituído por caminho relativo')
  updated=re.sub(r'(/processo-cat-usuario/alterar/)\d+',r'\1PROCESSO_EXEMPLO',text)
  if updated!=text:sanitizations.append('identificador do processo de exemplo removido da URL')
  data=updated.encode('utf-8')
  assert not re.search(r'(?:gh[pousr]_[A-Za-z0-9]{24,}|AIza[0-9A-Za-z_-]{25,}|Bearer\s+[A-Za-z0-9._-]{24,})',updated), f'Possível segredo em {rel}'
 dest.write_bytes(data)
 assert sha(dest.read_bytes())==sha(data)
 manifest.append(dict(path=rel.as_posix(),bytes=len(data),sha256=sha(data),sha256_origem=original_hash,ajustes=sorted(set(sanitizations))))

write(DEST/'.gitattributes','* -text')
residual=json.loads((DEST/'outputs/revisao-seguranca-2026-11-02/pendencias-residuais.json').read_text(encoding='utf-8'))
write(DEST/'README.md', '''# Pesquisa de segurança automotiva

Salvamento de 02/11/2026. Material de pesquisa e planejamento, separado dos dados publicados pelo aplicativo.

## Retomar amanhã

1. Preencher o [Excel das pendências residuais](outputs/revisao-seguranca-2026-11-02/Respostas-pendencias-residuais.xlsx), na guia **Responder**, colunas **D e E**.
2. Conferir as respostas recebidas com os dispositivos e fontes. Resposta registrada não equivale a validação normativa automática.
3. Atualizar a matriz e o inventário v2, preservando as respostas anteriores e as lacunas ainda abertas.
4. Redesenhar as imagens do fluxo e da árvore com a revisão MOVER/Inmetro. A versão nova do aplicativo ainda não foi implementada.

O [Excel anterior preenchido](outputs/fechamento-seguranca/Confirmacoes-seguranca.xlsx) foi preservado integralmente. **Não executar seu gerador sobre esse arquivo**, pois isso apagaria as respostas inseridas pelo usuário.

## Estado confirmado

- Escopo do produto: automóvel de passageiros novo, nacional, M1, até **sete ocupantes no total incluindo motorista**. PBT usual até 3.500 kg e ramo próprio para M1 elétrico acima disso, sem desconto automático da bateria nos requisitos.
- Aplicativo de consulta de todas as propulsões, com condições e lacunas por tecnologia. Não é aprovador automático de ensaios.
- Captura do exemplo SISCAT: dez guias e 36 linhas de ensaios. Doze linhas Nível 1 complementadas pela fonte oficial e 35 requisitos adicionais organizados.
- Dezenove respostas do usuário incorporadas à conferência.
- Base atual de ancoragens: 951/2022 com 997/2023. Bancos/apoios, cintos/ancoragens e ISOFIX continuam distintos.
- MOVER: 28 vínculos dos grupos A/B/C/D, com métodos citados, metas ponderadas da empresa e condições. Não são 28 ensaios universais novos por veículo.
- GNV: 14 subitens, incluindo nove componentes expressamente listados, cilindro e etapas de homologação, instalação, inspeção e requalificação.
- Arquivos de 137 fontes selecionadas preservados na revisão de novembro, com fichas Markdown e hashes. São arquivos, não 137 atos distintos. DOCs antigos continuam identificados como DOC, não PDF oficial.

## Leitura principal

- [Resultado da revisão atual](outputs/revisao-seguranca-2026-11-02/RESULTADO-DA-REVISAO.md)
- [Conferência das 19 respostas](outputs/revisao-seguranca-2026-11-02/CONFIRMACOES-REVISADAS.md)
- [Pendências residuais](outputs/revisao-seguranca-2026-11-02/PENDENCIAS-RESIDUAIS.md)
- [Inventário v2](outputs/revisao-seguranca-2026-11-02/inventario-seguranca-v2.json)
- [MOVER: requisitos e metas](outputs/revisao-seguranca-2026-11-02/MOVER-REQUISITOS.md)
- [GNV: componentes e etapas](outputs/revisao-seguranca-2026-11-02/GNV-REQUISITOS.md)
- [Disponibilidade de fontes](outputs/revisao-seguranca-2026-11-02/DISPONIBILIDADE-DOCUMENTOS.md)
- [Base inicial de consulta com IA](outputs/revisao-seguranca-2026-11-02/base-ia/LEIA-ME.md)
- [Catálogo geral CONTRAN e ressalvas](outputs/contran-vigentes/CATALOGO-RESOLUCOES-VIGENTES.md)

## Fluxos, mapas e imagens

As [imagens anteriores do fluxo e da árvore](outputs/fluxo-arvore-seguranca/LEIA-ME.md) são propostas de 31/10/2026. **Ainda não incorporam toda a revisão de novembro.** O inventário v2 é a referência para o próximo desenho.

Conceitos de interface: [entrada guiada](outputs/01-entrada-guiada.png), [mapa do processo](outputs/02-mapa-do-processo.png), [veículo e requisitos](outputs/03-veiculo-e-requisitos.png) e [tarefa e comprovação](outputs/04-tarefa-e-comprovacao.png). São imagens, não código de telas implementadas.

As relações 3D são semânticas. Não houve alteração do modelo existente, associação real de malhas nem correção da explosão/desempenho nesta etapa.

## O que permanece aberto

**Segurança normativa integralmente fechada: não.** Os seis grupos residuais estão detalhados no documento próprio. Eles não impedem desenhar a consulta informativa, mas impedem afirmações automáticas nos assuntos ainda não concluídos.

A transcrição documental bruta não é consolidação de vigência. Textos anotados do Inmetro podem conter redações sucessivas; páginas do DOU podem conter outros atos. Nem todos os métodos internacionais ou textos privados ABNT/ISO/SAE foram reunidos/revisados integralmente.

## Preservação e proveniência

`MANIFESTO-SALVAMENTO.json` registra cada arquivo copiado, tamanho, SHA-256 de origem e da cópia, além de eventuais ajustes de caminhos de máquina/identificador do exemplo. PDFs, DOCs, imagens e planilhas mantêm os bytes originais.

Os ZIPs locais repetem os diretórios e não foram duplicados no Git. A cópia antiga do código, `legislacao-automotiva-atual-63bac21.zip`, corresponde ao commit [63bac21539e5ff33aae522cb04650229fd27cd00](https://github.com/FLeone2/legislacao-automotiva/commit/63bac21539e5ff33aae522cb04650229fd27cd00), já preservado no repositório. O arquivo 3D permanece no histórico do projeto.

`work/` guarda scripts e intermediários editoriais úteis. Dependências e caches de extração/download não foram incluídos integralmente; os resultados, textos Markdown, documentos selecionados e manifestos estão em `outputs/`. Os scripts documentam a geração e podem exigir reconstruir caches no ambiente de execução.

Este salvamento não altera `data/`, `knowledge/`, a política de publicação ou `dist/`. As 55 exclusões editoriais do site permanecem intactas. Nenhuma referência de pesquisa foi promovida automaticamente a uma obrigação publicada.
''')
write(DEST/'PENDENCIAS-PARA-RETOMAR.md','# Pendências para retomar\n\n'+'\n\n'.join(f"## {r['id']} — {r['tema']}\n\n{r['achado']}\n\n**Próxima ação:** {r['acao']}\n\n**Ainda não concluir automaticamente:** {r['bloqueia_resposta_automatica']}." for r in residual))
omitted=[dict(path=p.relative_to(ROOT).as_posix(),reason='arquivo ZIP redundante com diretórios preservados ou código já existente no histórico Git') for p in sorted((ROOT/'outputs').glob('*.zip'))]
metadata=dict(data='2026-11-02',repositorio='FLeone2/legislacao-automotiva',branch='docs/seguranca-pesquisa-2026-11-02',
 base_commit='72a290eded7061edfa5a7d5f24809180c0b08b76',seguranca_integral_fechada=False,arquivos=manifest,arquivos_zip_nao_duplicados=omitted)
write(DEST/'MANIFESTO-SALVAMENTO.json',json.dumps(metadata,ensure_ascii=False,indent=2))

# Preserve transcrições e originais da pesquisa: o formatador do aplicativo não deve reescrevê-los.
ignore=REPO/'.prettierignore'
text=ignore.read_text(encoding='utf-8')
line='docs/pesquisa-seguranca/'
if line not in text:write(ignore,text+'\n# Pesquisa arquivada: preservar transcrições e arquivos de origem.\n'+line)

assert any(x['path'].endswith('Respostas-pendencias-residuais.xlsx') for x in manifest)
assert any(x['path'].endswith('Confirmacoes-seguranca.xlsx') for x in manifest)
assert all(x['bytes']<100*1024*1024 for x in manifest)
assert all(not x['ajustes'] for x in manifest if Path(x['path']).suffix.lower() in ['.pdf','.doc','.xlsx','.png','.svg','.webp'])
for m in manifest:
 assert sha((DEST/m['path']).read_bytes())==m['sha256']
for rel in ['outputs/revisao-seguranca-2026-11-02/confirmacoes-revisadas.json','outputs/revisao-seguranca-2026-11-02/inventario-seguranca-v2.json']:
 json.loads((DEST/rel).read_text(encoding='utf-8'))
with zipfile.ZipFile(DEST/'outputs/revisao-seguranca-2026-11-02/Respostas-pendencias-residuais.xlsx') as z:assert z.testzip() is None
print(json.dumps(dict(destino=str(DEST),arquivos_copiados=len(manifest),bytes=sum(x['bytes'] for x in manifest),ajustes_textuais=sum(bool(x['ajustes']) for x in manifest),formatos=dict(Counter(Path(x['path']).suffix for x in manifest))),ensure_ascii=False))
