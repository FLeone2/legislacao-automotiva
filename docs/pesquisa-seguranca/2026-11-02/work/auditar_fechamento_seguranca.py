import hashlib
import json
import re
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'outputs' / 'levantamento-seguranca'
CAT = ROOT / 'outputs' / 'contran-vigentes'
load = lambda p: json.loads(p.read_text(encoding='utf-8'))
inventory = load(OUT / 'inventario-seguranca.json')
catalogue = load(CAT / 'catalogo.json')
manifest = load(OUT / 'manifesto-fontes.json')
records = {r['id']: r for r in catalogue['records']}
sources = {r['id']: r for r in manifest['documentos']}


def canonical(ref):
    match = re.fullmatch(r'contran-(\d+)-(\d{4})(?:-doc)?', ref)
    return f'contran-{int(match[1]):04d}-{match[2]}' if match else None


items = inventory['matriz_ensaios'] + inventory['requisitos_complementares']
refs = set()
for item in items:
    refs.update(r for r in item['fontes'] if canonical(r))
for row in inventory['suplemento_nivel1_fonte_oficial']:
    refs.update(r for r in row['fontes_para_revisao_atual'] if canonical(r))

crosscheck = []
for ref in sorted(refs, key=lambda r: tuple(map(int, re.search(r'(\d+)-(\d{4})', r).groups()))):
    key = canonical(ref)
    record = records.get(key)
    source = sources.get(ref, {})
    if source.get('state') != 'downloaded' and sources.get(ref + '-doc', {}).get('state') == 'downloaded':
        source = sources[ref + '-doc']
    entry = {
        'referencia_inventario': ref,
        'id_catalogo': key,
        'situacao_indice': record['status'] if record else 'fora_do_indice_consultado',
        'url_oficial': record['official_url'] if record else source.get('official_url'),
        'fonte_original_salva': source.get('state') == 'downloaded',
        'registro_manifesto_fonte_original': source.get('id'),
        'sha256_fonte_original': source.get('sha256'),
        'limite': 'Situação do ato inteiro no catálogo; não atesta aplicação ao veículo nem consolidação dos dispositivos.'
    }
    if not record:
        assert ref == 'contran-827-1997-doc', ref
        entry['nota'] = 'Resolução histórica de 1997 recuperada no arquivo oficial; não confundir com a 827/2021. Ausência neste índice não comprova vigência ou revogação.'
    else:
        entry['ficha_markdown'] = f'../contran-vigentes/resolucoes/{key}.md'
    crosscheck.append(entry)

current_ids = {canonical(r) for r in refs}
unreviewed_incoming = [e for e in catalogue['relationships']
                       if e['target'] in current_ids and e['source'] not in current_ids
                       and e['kind'] in ('altera', 'revoga', 'revoga_parcialmente', 'suspende')]
assert not unreviewed_incoming, unreviewed_incoming
assert len(inventory['guias']) == 10
assert len(inventory['matriz_ensaios']) == 36
assert len(inventory['requisitos_complementares']) == 35
assert len(inventory['suplemento_nivel1_fonte_oficial']) == 12
assert all(r['fonte_original_salva'] for r in crosscheck)
assert all(r['situacao_indice'] in ('vigencia_indicada', 'fora_do_indice_consultado') for r in crosscheck)

pending_decisions = {
    'P-01': ('revisao_documental_aberta', 'Direção e cobertura da ancoragem de assentos: a base 951/2022 + 997/2023 está identificada; falta fechar a equivalência entre escopo técnico, método e linha de comprovação. Isso não é ausência de legislação atual de ancoragem.'),
    'P-02': ('revisao_documental_aberta', 'Mangueiras de freio: componente vinculado ao sistema de freios. A exigência de relatório autônomo na linha legada não foi demonstrada; não dispensar nem criar entrega por inferência.'),
    'P-03': ('divergencia_preservada', 'Resolução 224: conflito de ano permanece exposto e rastreável. Não bloqueia a captura ou a arquitetura, mas requer aviso na ficha e identificação documental consistente.'),
    'P-05': ('validacao_tecnica_posterior', 'Métodos, amostras e critérios de aceitação precisam ser detalhados antes de o aplicativo avaliar suficiência de relatórios. O catálogo de requisitos pode ser usado como base de implementação.'),
    'P-06': ('atualidade_aberta', 'O índice foi conferido em 31/10/2026 e anuncia alteração em 06/10/2026. Não houve varredura integral do DOU posterior nem certificação de todos os atos complementares. Não declarar cobertura legal integral até 31/10.'),
    'P-07': ('validacao_de_outros_perfis', 'As dez guias estão captadas para o exemplo elétrico M1. Outros combustíveis, massas e modalidades precisam de verificação própria; não mudar o exemplo para testar um processo real.'),
    'P-08': ('cadeias_complementares_abertas', 'Regulamentos Inmetro de produtos/fornecedores e atos posteriores de rotulagem precisam de cadeia própria. A obrigação do veículo, a conformidade do produto e a declaração na ENSV são relações diferentes.'),
    'P-09': ('implementacao_3d', 'Associar os identificadores semânticos às malhas reais do modelo na implementação. Esta tarefa não bloqueia o encerramento da captura SISCAT.'),
}

audit = {
    'data': '2026-10-31',
    'escopo': inventory['escopo_pretendido'],
    'decisao': {
        'captura_do_exemplo_concluida': True,
        'inventario_base_para_arquitetura_disponivel': True,
        'seguranca_normativa_integral_fechada': False,
        'pode_iniciar_captura_infoserv_em_paralelo': True,
        'explicacao': 'Encerrar a captura do exemplo não equivale a encerrar toda a revisão de segurança. A próxima fonte pode ser captada preservando as pendências de segurança e sem apresentar a base como completa.'
    },
    'contagens': {
        'guias_siscat': 10, 'linhas_ensaio': 36, 'ajudas_legais_nao_vazias': 27,
        'linhas_nivel1_complementadas_por_fonte_oficial': 12,
        'requisitos_complementares': 35,
        'fichas_no_catalogo_geral': catalogue['active_count'],
        'referencias_contran_distintas_no_inventario': len(crosscheck),
        'situacoes_das_referencias': dict(Counter(r['situacao_indice'] for r in crosscheck)),
        'relacoes_de_alteracao_revogacao_suspensao_nao_citadas_detectadas_no_indice': len(unreviewed_incoming),
    },
    'limite_do_cruzamento': 'Conferência de identidade e situação dos atos citados, com procura de relações no índice. Não equivale a revisão integral de cada anexo ou norma incorporada; não prova completude dos temas de segurança.',
    'privacidade_e_preservacao': inventory['captura'],
    'pendencias_classificadas': [dict(p, classificacao_para_fechamento=pending_decisions[p['id']][0], parecer=pending_decisions[p['id']][1]) for p in inventory['pendencias']],
    'referencias_conferidas': crosscheck,
    'arquivos_conferidos': [],
}
for path in [OUT / 'inventario-seguranca.json', OUT / 'siscat-ensaios-observados.json',
             OUT / 'manifesto-fontes.json', CAT / 'catalogo.json', CAT / 'validacao.json']:
    audit['arquivos_conferidos'].append({'arquivo': path.relative_to(ROOT / 'outputs').as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size})

def clean(text):
    return str(text).replace('|', '\\|').replace('\n', ' ')

lines = [
    '# Parecer de fechamento — segurança e captura SISCAT', '',
    'Conferência: **31/10/2026**. Escopo: automóvel novo de passageiros fabricado no Brasil, categoria M1. O exemplo observado é elétrico com fonte externa.', '',
    '**Resultado: a captura das dez guias do exemplo está concluída e salva. A segurança normativa integral ainda não está fechada.**', '',
    'É possível iniciar a captura do InfoServ em paralelo. Isso permite avançar o levantamento do aplicativo sem apagar ou tratar como resolvidas as pendências de segurança.', '',
    '## O que está preservado', '',
    '| Conteúdo | Situação |', '|---|---|',
    '| Dez guias, grupos de campos, documentos e observações | Capturados no exemplo visitado |',
    '| 36 linhas de ensaio: 14 de nível 2 e 22 de nível 3 | Visitadas; rótulos e detalhes preservados |',
    '| 27 ajudas legais não vazias | Preservadas como informação original, separadas da referência normativa atual |',
    '| 12 linhas de nível 1 | Complementadas pelo Anexo XI oficial; o arquivo-modelo da interface não foi recuperado |',
    '| 35 ramos complementares | Mapeados, incluindo exigências que não possuem relatório próprio no fluxo |',
    '| Requisito, condição, dispositivo, evidência e componente 3D | Estrutura semântica preparada; associação às malhas ainda por implementar |',
    '| Dados pessoais e relatórios privados do exemplo | Não copiados |', '',
    'O material salvo é o levantamento estrutural e normativo. Não é uma cópia integral dos dados e anexos do processo, nem garante acesso futuro à sessão autenticada do navegador. Não houve criação, gravação ou submissão no processo.', '',
    '## Resultado da conferência com o catálogo CONTRAN', '',
    f'O catálogo geral contém **{catalogue["active_count"]} fichas com vigência indicada**, incluindo situações parciais. Elas abrangem todos os temas do índice, não apenas segurança veicular.', '',
    f'Foram confrontadas **{len(crosscheck)} referências CONTRAN distintas** utilizadas nas linhas de ensaio, requisitos complementares e suplemento de nível 1. **{sum(r["situacao_indice"] == "vigencia_indicada" for r in crosscheck)}** têm vigência indicada no índice. A **827/1997** foi recuperada no arquivo oficial e não consta desse índice; sua ausência não é conclusão sobre vigência. Não foi detectada relação adicional de alteração, revogação ou suspensão no índice que atingisse os atos relacionados sem já estar citada no inventário.', '',
    'A ancoragem permanece ligada à **951/2022 com a 997/2023**. A antiga 220/2007 não é tratada como fundamento vigente. A dúvida remanescente é a correspondência documental e o alcance do método para assentos, distinguindo banco, cinto, apoio de cabeça e ISOFIX.', '',
    'Essa conferência valida referências e relações dentro da fonte consultada. Não transforma automaticamente todas as regras em obrigações para qualquer M1 e não substitui a leitura dos anexos ou das normas técnicas incorporadas.', '',
    'Fonte: [índice oficial de resoluções CONTRAN](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran), consultado em 31/10/2026, com alteração anunciada em 06/10/2026. A cobertura do DOU posterior permanece aberta.', '',
    '## O que falta para declarar segurança concluída', '',
    '| Frente | Verificação que falta | Critério para encerrar |', '|---|---|---|',
    '| Linhas legadas de direção e assentos (P-01) | Correspondência entre obrigação atual, método e entrega documental | Dispositivo e escopo que sustentem cada entrega, inclusive eventual cobertura compartilhada |',
    '| Mangueiras de freio (P-02) | Fundamento para relatório autônomo ou cobertura pelo relatório do sistema | Evidência normativa/procedimental explícita; o rótulo do SISCAT sozinho não basta |',
    '| Atualidade normativa (P-06) | Publicações posteriores à atualização do índice e atos complementares aplicáveis | Janela de pesquisa e fontes efetivamente verificadas registradas |',
    '| Inmetro e rotulagem (P-08) | Cadeias dos regulamentos de produto/fornecedor e dos atos de execução | Ato vigente, condições e evidências separados por competência |', '',
    'A divergência de metadados da Resolução 224 (P-03) permanece documentada. O detalhamento dos métodos (P-05), a verificação de outros perfis do SISCAT (P-07) e a ligação das malhas 3D (P-09) pertencem a etapas próprias. Não impedem encerrar a captura deste exemplo, mas precisam ser atendidos antes das funcionalidades que dependem deles.', '',
    '## Decisão por etapa', '',
    '| Etapa | Decisão |', '|---|---|',
    '| Captura do SISCAT no exemplo visitado | Concluída |',
    '| Base para desenhar navegação, árvore e relações com o 3D | Disponível, com condições e pendências explícitas |',
    '| Revisão normativa integral de segurança | Aberta nas quatro frentes acima |',
    '| Motor que decide aplicabilidade e aprova suficiência de relatórios | Ainda não validado |',
    '| Captura de informações no InfoServ | Pode começar em paralelo |', '',
    '## Referências confrontadas', '',
    '| Referência | Situação no catálogo | Fonte/ficha |', '|---|---|---|',
]
for r in crosscheck:
    label = r['referencia_inventario'].removeprefix('contran-').removesuffix('-doc')
    link = f'[ficha Markdown]({r["ficha_markdown"]})' if 'ficha_markdown' in r else f'[arquivo oficial]({r["url_oficial"]})'
    lines.append(f'| {label} | {r["situacao_indice"]} | {link} |')
lines += ['', '## Arquivos de referência', '',
          '- [Relatório navegável da captura e da matriz](relatorio.html)',
          '- [Inventário estruturado](inventario-seguranca.json)',
          '- [Auditoria com referências e hashes](auditoria-fechamento.json)',
          '- [Catálogo geral em Markdown](../contran-vigentes/CATALOGO-RESOLUCOES-VIGENTES.md)', '',
          'Os textos originais das fichas não são uma consolidação jurídica automática. Os hashes registram a versão dos arquivos conferidos nesta auditoria.', '']
(OUT / 'PARECER-FECHAMENTO-SEGURANCA.md').write_text('\n'.join(lines), encoding='utf-8')
(OUT / 'auditoria-fechamento.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding='utf-8')

# Add the audit to the existing user-facing report, preserving all captured content.
report = OUT / 'relatorio.html'
html = report.read_text(encoding='utf-8')
marker = '<!-- auditoria-fechamento -->'
if marker not in html:
    snippet = marker + '<p class="notice"><strong>Parecer após conferência do catálogo CONTRAN:</strong> captura do exemplo concluída; revisão normativa integral ainda aberta. <a href="PARECER-FECHAMENTO-SEGURANCA.md">Ler o parecer de fechamento</a> · <a href="auditoria-fechamento.json">Ver a auditoria estruturada</a>.</p>'
    html = html.replace('<div class="stats">', snippet + '<div class="stats">', 1)
    report.write_text(html, encoding='utf-8')

# Refresh selected public files inside the existing source package without duplicate entries.
package = ROOT / 'outputs' / 'levantamento-seguranca-siscat.zip'
replacement = {name: OUT / name for name in ['PARECER-FECHAMENTO-SEGURANCA.md', 'auditoria-fechamento.json', 'relatorio.html']}
temporary = ROOT / 'work' / 'levantamento-seguranca-siscat-atualizado.zip'
with zipfile.ZipFile(package) as old, zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as new:
    for info in old.infolist():
        if info.filename not in replacement:
            new.writestr(info, old.read(info.filename))
    for name, path in replacement.items():
        new.write(path, name)
with zipfile.ZipFile(temporary) as verified:
    assert verified.testzip() is None
    assert len(verified.namelist()) == len(set(verified.namelist()))
    for name, path in replacement.items():
        assert verified.read(name) == path.read_bytes()
temporary.replace(package)
print(json.dumps(audit['contagens'], ensure_ascii=False, indent=2))
