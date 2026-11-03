"""Consolidação rastreável da revisão, sem alterar o Excel respondido ou o projeto."""
from pathlib import Path
import copy, hashlib, json, re, shutil, zipfile
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / 'work'
RAW = WORK / 'pesquisa-seguranca-2026-11-02'
OLD = WORK / 'fontes-seguranca'
OUT = ROOT / 'outputs/revisao-seguranca-2026-11-02'
for folder in [OUT, OUT/'fontes', OUT/'legislacoes', OUT/'base-ia']:
    folder.mkdir(parents=True, exist_ok=True)
DATE = '2026-11-02'

def dump(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def write(path, text):
    path.write_text(text.strip()+'\n', encoding='utf-8')

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def source(ident, dispositivo, *pages):
    return dict(fonte=ident, dispositivo=dispositivo, paginas_pdf=list(pages))

scope = {
    'pais': 'Brasil', 'origem': 'fabricação nacional', 'condicao': 'veículo novo',
    'tipo_principal': 'automóvel de passageiros', 'categoria': 'M1',
    'ocupantes_maximos_produto': 7, 'inclui_motorista': True,
    'pbt_padrao_max_kg': 3500,
    'ramo_adicional': 'M1 elétrico acima de 3500 kg, sem desconto automático da bateria; reenquadrar cada requisito por sua própria massa/escopo.',
    'propulsoes': 'Consulta deve comportar todas as propulsões; cobertura comum + elétrica/híbrida + GNV revisadas nesta rodada. Demais gases/tecnologias não recebem aprovação automática.',
    'uso_app': 'Consulta e orientação documental; sem aprovar relatórios, certificar engenharia ou protocolar processos.',
    'datas_obrigatorias_consulta': ['data do primeiro CAT/MMV do projeto básico', 'data de fabricação/importação', 'data de referência normativa', 'novo projeto ou derivado'],
    'excecoes_a_perguntar': ['pequena série', 'artesanal', 'réplica', 'buggy', 'especial', 'fora de estrada', 'uso bélico'],
    'confirmacao_ocupantes': {'fonte': 'resposta direta do usuário', 'texto': 'Sim, 7 ocupantes no total', 'data': DATE},
}

# Cada conclusão separa decisão de produto de confirmação normativa.
decisions = [
('C01','revisado_com_limite',
 'Manter a linha legada de deslocamento da coluna ligada à proteção frontal. A aceitação de UN R ou FMVSS depende da equivalência expressa e da cobertura do relatório; não existe aceitação genérica de qualquer norma dessas famílias.',
 'A 910/2022, art. 6º, admite testes no exterior em veículos representativos segundo FMVSS 203/208/301 ou UN R32/R34/R94. Esse artigo não cita FMVSS 204. Não foi demonstrada nesta rodada uma exigência autônoma atual para a linha legada de deslocamento.',
 ['ENS-3-01'], [source('contran-910-2022','arts. 4º a 7º e 11',1,2)],
 'Consulta pode explicar a ligação; validação da entrega independente permanece sem conclusão automática.'),
('C02','revisado_com_limite',
 'Absorção de energia da direção integra a consulta de proteção frontal e deve apontar os métodos expressamente admitidos, considerando o escopo do relatório.',
 'A aceitação internacional da 910/2022 não equivale à aceitação irrestrita de qualquer relatório estrangeiro. Preservar identificação do laboratório, veículo representativo, método e cobertura.',
 ['ENS-3-02'], [source('contran-910-2022','arts. 4º a 7º',1,2)],
 'A correspondência da linha antiga não cria uma nova obrigação de ensaio separado.'),
('C03','revisado_no_recorte',
 'Usar a Resolução 951/2022 com a alteração 997/2023. Um relatório conjunto pode ser associado a banco/fixação/apoio quando sua cobertura demonstrar o requisito aplicável. Cintos, suas ancoragens e ISOFIX continuam assuntos distintos.',
 'O item 3.5.3 do Anexo I, na redação da 997/2023, aceita NBR 15283:2013, UN R17 série 07 ou posteriores, ou FMVSS 202 e 207, observado o escopo. Os itens 3.5.1 e 3.5.2 tratam separadamente cintos/ancoragens e fixações infantis.',
 ['ENS-3-05','ENS-3-06','ENS-3-07','ENS-3-08','ENS-3-10'],
 [source('contran-951-2022','Anexo I, itens 3.1 a 3.5'),source('contran-997-2023','art. 2º; Anexo I, itens 3.5.1 a 3.5.3',1)],
 'Não apresentar a 220/2007 como legislação atual: revogação expressa corrigida pela 997/2023.'),
('C04','revisado_com_limite',
 'Ligar mangueiras ao sistema de freios e à 915/2022, com as normas que ela incorpora conforme o veículo. Preservar a linha observada no SISCAT.',
 'O art. 4º exige desempenho conforme NBR 10966 partes 1 a 7, NBR 16068 ou sucedâneas, consoante o tipo. Não foi localizado fundamento que permita afirmar, para todo M1, relatório autônomo de mangueira apenas pelo rótulo da tela.',
 ['ENS-2-01','ENS-2-07'],[source('contran-915-2022','arts. 4º e 5º',2,3),source('portaria-senatran-990-2022-republicacao','Anexo XI, item 1.3')],
 'Sem criar dispensa e sem inventar uma entrega independente.'),
('C05','decisao_editorial_registrada',
 'Seguir o documento ligado no índice oficial de resoluções, com identificador estável da 224 e busca pelos dois anos.',
 'O índice consultado registra 224/2006; o Anexo XI da 990/2022 e outros registros oficiais usam 224/2007. Preservar a divergência de metadados, além do PDF original; não são duas obrigações.',
 ['ENS-2-02'],[source('contran-224-2006','documento oficial da resolução e metadados do índice'),source('portaria-senatran-990-2022-republicacao','Anexo XI, item 1.3')],
 'Alias 224/2007 não deve duplicar a ficha nem apagar a divergência.'),
('C06','revisado_no_recorte',
 'Apresentar a declaração Nível 1 por assunto do Anexo XI, acompanhada dos dados e documentos de suporte exigidos.',
 'O item 1.2 do Anexo XI exige conformidade com ABNT NBR ISO/IEC 17050-1 e 17050-2. Um relato sem identificação e suporte não pode ser anunciado como suficiente só por preencher uma linha.',
 [],[source('portaria-senatran-990-2022-republicacao','Anexo XI, itens 1.1 e 1.2; Anexo V',11,15)],
 'Texto privado das normas ABNT não foi reproduzido nem seus requisitos inventados.'),
('C07','escopo_produto_confirmado_cobertura_condicional',
 'Disponibilizar seleção de propulsão e ramificações de segurança; não inferir autorização de um combustível a partir do seletor do SISCAT.',
 'A 749/2018 acrescenta proteção elétrica/alta tensão e pós-impacto para híbridos e elétricos. GNV tem cadeia própria. A restrição de diesel em leves e tecnologias como hidrogênio exigem análise específica; a seleção da interface não as libera.',
 ['ENS-3-03','ENS-3-13','SEG-024','SEG-025','SEG-026'],
 [source('contran-749-2018','arts. 1º a 3º; Anexos I e II'),source('contran-280-2008','arts. 1º a 3º'),source('inmetro-130-2022-http','arts. 3º a 6º',1,2),source('dnc-23-1994-reproducao-camara','reprodução da Portaria DNC 23/1994, art. 1º',14)],
 'Cadeia atual e exceções de diesel não integralmente saneadas; hidrogênio não marcado como ramo concluído.'),
('C08','escopo_produto_confirmado',
 'Sete ocupantes no total, incluindo motorista. Até 3500 kg no recorte principal; elétrico M1 acima disso em ramo próprio.',
 'M1, na tabela do art. 2º da 915/2022, é definido por passageiros/assentos, sem teto de 3500 kg. O limite do produto não é a definição legal universal. A 1015/2024 trata de limites de peso por eixo/PBT em condições próprias; não manda descontar bateria de todos os limites de segurança.',
 ['SEG-022'],[source('contran-915-2022','art. 2º',1),source('contran-1015-2024','art. 2º; nova redação do art. 6º, §§ 3º e 4º, da 882/2021',1),source('contran-882-2021','arts. 6º e 8º')],
 'Reavaliar por regra os cortes de 2500/3500 kg; nunca aplicar um bônus geral de massa de bateria.'),
('C09','escopo_produto_confirmado',
 'O aplicativo é informativo. Explicar datas e enquadramentos, sem emitir parecer automático de aprovação do veículo.',
 'Mesmo em consulta, a data de projeto básico/CAT e fabricação pode alterar a obrigação. A 910/2022, arts. 4º, 5º e 11, é exemplo de cronograma e redações com períodos distintos.',
 [],[source('contran-910-2022','arts. 4º, 5º e 11',1,2)],
 'Não exigir engenharia executável para desenhar a arquitetura informativa.'),
('C10','escopo_produto_confirmado',
 'Acessórios ficam em área própria e ativam requisitos quando presentes, mantendo perguntas sobre origem de fábrica/reposição, massa e instalação.',
 'Quebra-mato e engate têm escopos que excluem o equipamento original de fábrica de seus regulamentos específicos de fornecedor. A ausência do acessório não elimina uma obrigação independente de prever local de instalação, como no extintor.',
 ['SEG-002','SEG-003','SEG-004','SEG-017'],[source('inmetro-400-2020-http','art. 4º, § 2º',1),source('inmetro-309-2021-http','art. 4º, § 2º',1),source('contran-919-2022','art. 2º, §§ 1º a 3º',1)],
 'Condição por requisito, evitando um interruptor universal que desative obrigações de construção.'),
('C11','revisado_com_ressalva_de_registro',
 'Quebra-mato não é exclusivo de polícia. Aplicar 215/2006 e Inmetro 400/2020 ao respectivo escopo; distinguir conformidade do fornecedor de certificação de produto por terceira parte.',
 'A 400/2020, art. 5º, usa declaração compulsória do fornecedor e seu Anexo II exige autoverificação/LAV. A 215/2006 contém exceções para usos públicos e equipamentos originais em condições próprias. Há diferença entre a referência a registro na 215 e a dispensa de ato de liberação para risco I na 282/2020; não anunciar registro obrigatório universal sem sanear essa interface.',
 ['SEG-002'],[source('contran-215-2006-html','arts. 1º a 5º'),source('inmetro-400-2020-http','arts. 4º, 5º e 9º; Anexo II, item 6.1',1,2,13,14),source('inmetro-282-2020','art. 2º, I; Tabela 1, item 10',1,2)],
 'Pendência limitada ao tratamento atual do registro/plaqueta entre autoridades; mecanismo de declaração confirmado.'),
('C12','revisado_no_recorte',
 'Engate acessório: conferir fornecedor/registro Inmetro, engate compatível, declaração do fabricante do veículo sobre capacidade, manual e pontos de fixação. Separar o ensaio do engate da demonstração de capacidade de frenagem do veículo/reboque.',
 'A 937/2022 exige veículo com capacidade de tracionar declarada pelo fabricante/importador e relatório de protótipo do dispositivo nos termos do art. 2º. A Inmetro 309/2021 exige declaração e registro do fornecedor (arts. 6º a 8º); equipamentos originais de fábrica ficam fora desse regulamento específico.',
 ['SEG-003','ENS-2-01'],[source('contran-937-2022','arts. 1º a 5º'),source('inmetro-309-2021-http','arts. 4º e 6º a 8º',1,2),source('contran-915-2022','art. 4º',2)],
 'O comentário do usuário sobre relatório de freio é orientação de cobertura; não foi criada entrega universal nova só com base nele.'),
('C13','revisado_no_recorte',
 'Pneus novos: certificação compulsória, registro, marcações e compatibilidade da aplicação. DOT e logotipo sozinhos não fecham a comprovação.',
 'Inmetro 379/2021, arts. 8º e 9º: certificação e registro. O art. 7º permite ENCE facultativa em pneus destinados a montadoras em condições próprias. A 845/2025, corrigida em 06/02/2026, alterou prazo de famílias já certificadas/registradas para 23/10/2026; isso não é dispensa geral de certificação.',
 ['ENS-2-10','SEG-001'],[source('inmetro-379-2021-http','arts. 4º e 7º a 9º; Anexo II, marcações; art. 15'),source('inmetro-845-2025-dou-p41','art. 1º'),source('inmetro-845-2025-retif','retificação do § 1º do art. 15',1),source('portaria-senatran-990-2022-republicacao','Anexo V, item 1.3',11)],
 'Fonte anotada contém redações antigas e atuais; não indexar todas como vigentes.'),
('C14','revisado_no_recorte',
 'Para automóvel, instalação facultativa; o fabricante deve disponibilizar local adequado para suporte. Se instalado, extintor precisa atender à 919/2022 e à certificação/registro de produto do Inmetro.',
 'A autodeclaração do veículo não substitui a certificação do extintor prevista na Inmetro 108/2022, arts. 6º e 7º. Os selos foram alterados pela 314/2025 e novamente pela 409/2026.',
 ['SEG-017'],[source('contran-919-2022','arts. 2º e 3º',1),source('inmetro-108-2022-http','arts. 6º e 7º; Anexo II'),source('inmetro-314-2025-dou','art. 4º'),source('inmetro-409-2026-dou-p110','art. 2º, alteração do art. 4º da 314/2025',1),source('inmetro-409-2026-dou-p111','art. 3º, redações dos arts. 9º e 10 da 314/2025',1)],
 'Selos novos com identificação Casa da Moeda têm regras de estoque; não rejeitar apenas pela identificação do emissor.'),
('C15','revisado_no_recorte',
 'GNV: organizar componentes, cilindro, instalação/manutenção, inspeção do veículo e requalificação do cilindro em nós separados, incluindo o original de fábrica.',
 'Bases: 280/2008; Inmetro 111/2022, 436/2021, 130/2022, 147/2022 e 133/2022. Para inspeção, juntar 384/2023, histórico 634/2023 e 106/2025: esta última revoga o art. 5º da 147, não a portaria inteira, restabelece efeitos e valida inspeções no período especificado. Selos 314/2025 + 409/2026.',
 ['SEG-024'],[source('contran-280-2008','arts. 1º a 3º',1,2),source('inmetro-111-2022-http','escopo e exigências pré-mercado'),source('inmetro-436-2021-http','escopo e exigências pré-mercado'),source('inmetro-130-2022-http','arts. 3º a 6º',1,2),source('inmetro-147-2022-http','arts. 1º a 4º; Anexo I'),source('inmetro-384-2023-dou-p150','art. 2º',1),source('inmetro-634-2023-dou-p72','art. 1º',1),source('inmetro-106-2025-dou-p16','arts. 1º a 5º',1),source('inmetro-133-2022-http','RTQ e RAC de requalificação'),source('inmetro-409-2026-dou-p111','art. 3º',1)],
 'Homologação original, conversão posterior e manutenção periódica têm momentos distintos. Não pedir CSV de modificação como se toda fabricação nova fosse conversão.'),
('C16','revisado_no_recorte',
 'Acrescentar MOVER/InTec, com os grupos A/B/C/D, requisitos por MMV e comprovação anual da empresa. A hierarquia de métodos é condicionada e não é uma regra irrestrita para qualquer relatório do CAT.',
 'Decreto 12.435/2025, Anexo IV, e GM/MDIC 215/2025, arts. 1º a 6º e Anexo II: primeiro CONTRAN; na ausência, alternativas UN R/UN GTR/UE/FMVSS; ISO ou dossiê nos casos previstos. Respeitar os métodos específicos do Anexo II. Grupo B tem oito requisitos; TPMS estava ausente das 36 linhas captadas.',
 ['SEG-034'],[source('decreto-12435-2025-dou-p5','Anexo IV, itens 2 a 5',1),source('decreto-12435-2025-dou-p6','Anexo IV, item 6',1),source('mdic-215-2025-dou-p26','arts. 1º a 6º',1),source('mdic-215-2025-dou-p27','Anexo II, Grupos A e B',1),source('mdic-215-2025-dou-p28','Anexo II, Grupos C e D',1)],
 'Meta ponderada da empresa não pode virar obrigatoriedade de todos os oito equipamentos em cada carro.'),
('C17','busca_atualizada_sem_certificacao_de_exaustividade',
 'Usar os atos efetivamente publicados encontrados. Consulta pública/proposta não substitui ato vigente.',
 'Foram conferidos o índice CONTRAN (última atualização anunciada 06/10/2026) e o índice de portarias SENATRAN 2026 (20/10/2026), além dos atos MOVER/Inmetro localizados. Nas fontes consultadas, não foi localizado substituto geral publicado da 1554/2022. Isso não prova ausência de toda publicação posterior do DOU.',
 [],[source('contran-indice-novembro','índice e data de atualização'),source('senatran-portarias-2026','índice e data de atualização'),source('senatran-consultas','consultas públicas')],
 'Nova busca antes de publicar uma base anunciada como integralmente atual; manter data de corte visível.'),
('C18','escopo_produto_confirmado',
 'Cada item deve responder: o que cumprir, por que se aplica, qual legislação e o que entregar/guardar. Métodos privados entram como referência e condição de acesso, sem criar texto técnico.',
 'A árvore será de conhecimento e orientação. A existência do documento e a identificação do dispositivo revisado são estados distintos da revisão integral do método e da avaliação de um relatório concreto.',
 [],[], 'Essa definição permite desenhar a árvore sem prometer uma ferramenta certificadora.'),
('C19','orientacao_do_usuario_registrada',
 'Usar as mesmas dez guias como estrutura de navegação, conforme sua orientação, deixando campos condicionais parametrizáveis.',
 'A observação direta preservada continua sendo de um processo deferido M1 elétrico. A informação de que os demais perfis são iguais vem do usuário, não de nova navegação em todos os perfis.',
 [],[], 'Não abrir nem criar processo fictício para validar campos.'),
]

answers = read(WORK/'respostas-excel-2026-11-02.json')
by_answer = {r['id']: r for r in answers['respostas']}
matrix=[]
for ident,status,conclusion,evidence,items,refs,limit in decisions:
    row = by_answer[ident]
    matrix.append(dict(id=ident, tema=row['tema'], resposta_usuario=row['resposta'],
        linha_excel=row['linha'], estado_revisao=status, conclusao=conclusion,
        fundamento=evidence, itens_relacionados=items, fontes=refs, limite=limit,
        origem_resposta='Excel preenchido pelo usuário', data_revisao=DATE))

groups = {
 'A': [
 ('Impacto lateral','contran-949-2022','CONTRAN 949/2022','ENS-3-09',['lateral','estrutura']),
 ('Controle eletrônico de estabilidade (ESC)','contran-954-2022','CONTRAN 954/2022, com ato posterior de cronograma aplicável','ENS-2-09',['freios','painel']),
 ('Indicador de direção lateral','contran-970-2022','CONTRAN 970/2022, com alterações aplicáveis','ENS-2-03',['iluminacao-lateral']),
 ('Farol de rodagem diurna (DRL)','contran-970-2022','CONTRAN 970/2022, com alterações aplicáveis','ENS-2-03',['iluminacao-frontal']),
 ('Aviso de cinto: condutor','contran-936-2022','CONTRAN 936/2022','ENS-2-12',['cintos','painel']),
 ('Indicação de frenagem de emergência (ESS)','contran-970-2022','CONTRAN 970/2022, com alterações aplicáveis','ENS-2-03',['iluminacao-traseira','freios']),
 ('Alerta ou visibilidade traseira','contran-759-2018','CONTRAN 759/2018','ENS-2-11',['traseira','painel']),
 ],
 'B': [
 ('Impacto lateral em poste','contran-949-2022','CONTRAN 949/2022','ENS-3-12',['lateral','estrutura']),
 ('Proteção de pedestres','contran-752-2018','CONTRAN 752/2018','ENS-3-11',['frente','estrutura']),
 ('Frenagem automática: obstáculo móvel',None,'UN R152; MoU Automatic Emergency Braking Voluntary Commitment; ou FMVSS 127','ENS-3-14',['freios','frente','painel']),
 ('Frenagem automática: obstáculo fixo',None,'UN R152; MoU Automatic Emergency Braking Voluntary Commitment; ou FMVSS 127','ENS-3-15',['freios','frente','painel']),
 ('Aviso de afastamento de faixa (LDWS)',None,'ISO 17361:2017; UN R79.03; ou Regulamento de Execução UE 2021/646','ENS-3-16',['vidros','painel']),
 ('Impacto frontal: camionetas e utilitários','contran-910-2022','CONTRAN 910/2022; observar tipo e PBT inferior a 2500 kg no texto citado','ENS-3-17',['frente','estrutura']),
 ('Monitoramento da pressão de pneus (TPMS)',None,'UN R141 Amend. 1; ou FMVSS 138',None,['pneus','painel']),
 ('Aviso de cinto: condutor e passageiro frontal','contran-936-2022','CONTRAN 936/2022, observado o escopo do requisito contado no MOVER','ENS-2-12',['cintos','painel']),
 ],
 'C': [
 ('Frenagem automática: pedestres',None,'UN R152; ou FMVSS 127','ENS-3-18',['freios','frente','painel']),
 ('Frenagem automática: ciclistas',None,'UN R152; alternativa temporária de dossiê no texto oficial contém inconsistência semântica e terminou em setembro de 2026','ENS-3-19',['freios','frente','painel']),
 ('Assistente de permanência em faixa (LKAS)',None,'UN R79 Revision 4; ou Regulamento de Execução UE 2021/646','ENS-3-20',['coluna-direcao','vidros','painel']),
 ('Aviso de sonolência e atenção (DDAW)',None,'Regulamento Delegado UE 2021/1341; alternativa temporária de dossiê até setembro de 2026 não tratada como vigente em novembro','ENS-3-21',['painel','bancos']),
 ('Aviso avançado de distração (ADDW)',None,'Regulamento Delegado UE 2023/2590',None,['painel','bancos']),
 ('Sensor de ponto cego',None,'ISO 17387:2008; ou SAE J2802_202110',None,['retrovisores','lateral','painel']),
 ('Aviso de cinto: todos os passageiros','contran-936-2022','CONTRAN 936/2022, observado o escopo do requisito contado no MOVER',None,['cintos','bancos','painel']),
 ('Controle de cruzeiro adaptativo (ACC)',None,'ISO 15622:2018; ou SAE J2399_202110','ENS-3-22',['frente','painel','freios']),
 ],
 'D': [
 ('Chamada de emergência a bordo (eCall)',None,'Definição técnica depende do processo previsto no art. 5º, § 1º',None,['painel','veiculo']),
 ('Assistente inteligente de velocidade (ISA)',None,'Definição técnica depende do processo previsto no art. 5º, § 1º',None,['painel','propulsao']),
 ('Pré-instalação de bloqueio da ignição sensível ao álcool',None,'Definição técnica depende do processo previsto no art. 5º, § 1º',None,['painel','propulsao']),
 ('Comunicação carro-carro',None,'Definição técnica depende do processo previsto no art. 5º, § 1º',None,['veiculo']),
 ('Comunicação carro-infraestrutura',None,'Definição técnica depende do processo previsto no art. 5º, § 1º',None,['veiculo']),
 ]
}
substitutions = {'C1':'B4','C2':'B3','C3':'B5','C4':'B5','C5':'B5','C6':'B7','C7':'B8','C8':'B5'}
mover_nodes=[]
for group,rows in groups.items():
    for n,(title,contran,method,link,parts) in enumerate(rows,1):
        code=f'{group}{n}'
        mover_nodes.append(dict(id=f'MOVER-{code}', codigo_oficial=code, grupo=group,
            titulo=title, fontes=['decreto-12435-2025-dou-p5', 'mdic-215-2025-dou-p26',
                'mdic-215-2025-dou-p28' if group in ['C','D'] else 'mdic-215-2025-dou-p27'] + ([contran] if contran else []),
            dispositivo='Decreto 12.435/2025, Anexo IV, item 2; GM/MDIC 215/2025, Anexo II',
            metodos_citados=method, texto_metodo_internacional_revisado_integralmente=False,
            correspondencia_siscat=link, ausencia_de_linha_na_captura=link is None,
            substitui_no_calculo=substitutions.get(code),
            condicao_substituicao='Art. 5º: regulamentado e constante do MMV na aferição; Grupo D também depende de viabilidade e definição técnica.' if group in ['C','D'] else None,
            obrigatoriedade_individual_universal=False,
            natureza='catálogo condicionado a definição técnica' if group=='D' else 'requisito contabilizável na meta ponderada da empresa; verificar obrigação individual por norma específica',
            partes_3d=parts, vinculo_3d='semântico; sem mesh validada',
            alerta=('C2 menciona monitoramento de motoristas no parágrafo de alternativa para ciclistas; literalidade preservada, sem correção por inferência.' if code=='C2' else None)))

mover = dict(data=DATE, escopo='M1 e N1 nos termos dos atos MOVER; produto foca M1',
    novos_registros=mover_nodes,
    metas={'A':[{'data':'2025-10-01','intec_minimo_percentual':85},{'data':'2026-10-01','intec_minimo_percentual':90},{'data':'2027-10-01','intec_minimo_percentual':100}],
           'B':[{'data':f'{y}-10-01','intec_minimo_percentual':v} for y,v in [(2027,50),(2028,65),(2029,75),(2030,80),(2031,90)]]},
    formula='Média dos percentuais de atendimento dos 7 requisitos A ou 8 requisitos B; percentuais ponderados por emplacamentos. Não é exigência de cada equipamento em todo carro.',
    prova_por_mmv='Presença e características nos pedidos CAT/MMV; equipamentos contados devem ser de série em todos os veículos do MMV.',
    prova_empresa='Anexo I da 215/2025: planilhas de MMV/CAT/LCVM/volume/itens S-N-NA, índice, PDF assinado e Excel; apresentação anual até 1º de novembro de 2025 a 2031 pelo SEI.',
    periodo='Doze meses anteriores ao mês do cálculo; aferição anual de referência de outubro: 1º de outubro do ano anterior a 30 de setembro do ano da aferição.',
    exclusoes='Verificar art. 3º do Decreto e condições próprias: pequena série, artesanal, especiais e demais hipóteses, sem generalizar para todo fabricante.',
    substituicoes=substitutions,
    fontes_metodologia=[source('decreto-12435-2025-dou-p6','Anexo IV, itens 6 e 11',1), source('mdic-215-2025-dou-p26','arts. 1º a 10',1)],
    limite='Métodos internacionais foram identificados no Anexo II brasileiro; não foram todos baixados nem revisados em suas edições atuais nesta rodada.')

gnv_nodes=[]
components=[('valvula-cilindro','Válvula de cilindro'),('valvula-abastecimento','Válvula de abastecimento'),
 ('valvula-fechamento','Válvula de fechamento rápido'),('tubo-alta-pressao','Tubo de alta pressão e conexões'),
 ('indicador-pressao','Indicador de pressão'),('duto-baixa-pressao','Duto de baixa pressão, conexões e fixações'),
 ('redutor-pressao','Redutor de pressão'),('suporte-cilindro','Suporte de cilindro'),('ventilacao','Sistema de ventilação e conexões')]
for n,(part,title) in enumerate(components,1):
    gnv_nodes.append(dict(id=f'GNV-C{n:02}',titulo=title,pai='SEG-024',fase='componente e construção',
        obrigacao='Componente incluído no regulamento de segurança e certificação compulsória do sistema GNV.',
        entrega='Comprovação de conformidade do componente; marcações e certificado aplicável, sem substituir prova da instalação ou inspeção do veículo.',
        condicao='Se o veículo tem sistema GNV e o componente está no escopo do art. 4º.',
        fontes=[source('inmetro-111-2022-http',f'art. 4º, § 1º, inciso {["I","II","III","IV","V","VI","VII","VIII","IX"][n-1]}; arts. 5º e 6º',1,2),source('contran-280-2008','art. 1º, parágrafo único',1)],
        partes_3d=['gnv-'+part],vinculo_3d='semântico, a conferir no modelo'))
for code,title,phase,obligation,delivery,refs in [
 ('GNV-01','Cilindro de armazenamento','componente e construção','Cilindro deve atender à segurança e certificação compulsória de seu regulamento; tipo de gás e aplicação precisam ser compatíveis.',
  'Certificado, identificação/marcações, rastreabilidade e selo aplicáveis.',[source('inmetro-436-2021-http','arts. 4º a 9º'),source('inmetro-409-2026-dou-p111','art. 3º: selo do cilindro',1)]),
 ('GNV-02','Instalação, desinstalação, substituição e manutenção','serviço de instalação','Fornecedores sujeitos à declaração compulsória e registro; art. 4º inclui original de fábrica e alteração posterior.',
  'Declaração/registro do fornecedor e documentação do serviço prevista no RTQ/RAC; conferir ramo original ou modificação.',[source('inmetro-130-2022-http','arts. 3º a 6º; Anexos I e II',1,2)]),
 ('GNV-03','Inspeção periódica do veículo original de fábrica','veículo em uso','Inspeção a cada 12 meses a partir do primeiro registro/licenciamento, conforme 280/2008; a partir do segundo licenciamento comprovar por CSV.',
  'CSV emitido eletronicamente por instituição técnica licenciada, no momento aplicável.',[source('contran-280-2008','arts. 2º e 3º',1,2),source('inmetro-147-2022-http','arts. 1º a 4º e Anexo I'),source('inmetro-106-2025-dou-p16','arts. 1º a 5º',1)]),
 ('GNV-04','Requalificação do cilindro','veículo em uso','Periodicidade de 5 anos ou menor por necessidade técnica; não ultrapassar fim da vida útil do cilindro. Fornecedor sujeito a declaração e registro.',
  'Relatório técnico de requalificação e documentos definidos pelo regulamento; selo aplicável.',[source('inmetro-133-2022-http','arts. 6º e 7º; Anexo I, itens 5.4.2 e 7.4'),source('inmetro-409-2026-dou-p111','art. 3º: selo da requalificação',1)]),
 ('GNV-05','Informações técnicas ao Inmetro no CAT/MMV','homologação original','Fabricante/importador deve fornecer especificações técnicas do GNV ao obter o MMV, nos termos da 280/2008.',
  'Especificações técnicas do sistema; documentação de conformidade do Anexo V da 990/2022 quando aplicável.',[source('contran-280-2008','art. 2º',1),source('portaria-senatran-990-2022-republicacao','Anexo V, item 1.4',11)]),
]:
    gnv_nodes.append(dict(id=code,titulo=title,pai='SEG-024',fase=phase,obrigacao=obligation,entrega=delivery,
        condicao='Somente veículo com sistema GNV; separar fabricação original, uso e modificação posterior.',fontes=refs,
        partes_3d=['gnv-cilindro'] if code in ['GNV-01','GNV-04'] else ['combustivel','veiculo'],vinculo_3d='semântico, a conferir no modelo'))

# Documentos adicionais com identidade verificada. Páginas de sondagem sem o ato não entram no pacote.
new_ids = [
 'inmetro-400-2020-http','inmetro-309-2021-http','inmetro-379-2021-http',
 'inmetro-108-2022-http','inmetro-111-2022-http','inmetro-436-2021-http',
 'inmetro-130-2022-http','inmetro-147-2022-http','inmetro-133-2022-http',
 'inmetro-200-2021','inmetro-278-2021','inmetro-282-2020','inmetro-258-2020-http',
 'inmetro-314-2025-dou','inmetro-314-2025-dou-p74','inmetro-314-2025-dou-p75',
 'inmetro-409-2026-dou-p110','inmetro-409-2026-dou-p111',
 'inmetro-384-2023-dou-p149','inmetro-384-2023-dou-p150',
 'inmetro-634-2023-dou-p72','inmetro-634-2023-dou-p73','inmetro-106-2025-dou-p16',
 'inmetro-845-2025-dou-p41','inmetro-845-2025-retif',
 *[f'decreto-12435-2025-dou-p{p}' for p in range(1,7)],
 *[f'mdic-215-2025-dou-p{p}' for p in range(26,29)],
 'dnc-23-1994-reproducao-camara',
 'mdic-mover-indice','contran-indice-novembro','senatran-portarias-2026',
 'senatran-consultas','contran-215-2006-html',
]

old_manifest = read(ROOT/'outputs/levantamento-seguranca/manifesto-fontes.json')['documentos']
sources=[]
for old in old_manifest:
    if old['state']!='downloaded': continue
    entry=copy.deepcopy(old)
    src=OLD/Path(old['arquivo_pacote']).name
    assert src.exists(), src
    assert sha(src)==old['sha256'], src
    entry['format']=src.suffix[1:].lower()
    entry['grupo_aquisicao']='captura_e_revisao_2026-10-31'
    entry['diretorio_origem']=str(OLD)
    sources.append(entry)
for ident in new_ids:
    meta=read(RAW/(ident+'.meta.json'))
    assert meta['state']=='downloaded', ident
    entry={k:v for k,v in meta.items() if k!='links'}
    entry['arquivo_pacote']='fontes/'+ident+'.'+entry['format']
    entry['grupo_aquisicao']='revisao_2026-11-02'
    entry['diretorio_origem']=str(RAW)
    entry['revisao']='dispositivos_citados_revisados; anexos completos não integralmente parametrizados'
    sources.append(entry)

titles={
 'inmetro-400-2020-http':'Portaria Inmetro 400/2020 — fornecedor de quebra-mato',
 'inmetro-309-2021-http':'Portaria Inmetro 309/2021 — fornecedor de engate',
 'inmetro-379-2021-http':'Portaria Inmetro 379/2021 — pneus novos',
 'inmetro-108-2022-http':'Portaria Inmetro 108/2022 — extintores de incêndio',
 'inmetro-111-2022-http':'Portaria Inmetro 111/2022 — componentes de GNV',
 'inmetro-436-2021-http':'Portaria Inmetro 436/2021 — cilindros de GNV',
 'inmetro-130-2022-http':'Portaria Inmetro 130/2022 — instalação de GNV',
 'inmetro-147-2022-http':'Portaria Inmetro 147/2022 — inspeção de veículos com GNV',
 'inmetro-133-2022-http':'Portaria Inmetro 133/2022 — requalificação de cilindros de GNV',
 'inmetro-106-2025-dou-p16':'Portaria Inmetro 106/2025 — competência e efeitos das inspeções (DOU p. 16)',
 'inmetro-845-2025-retif':'Retificação de 06/02/2026 da Portaria Inmetro 845/2025 (DOU p. 37)',
 'contran-215-2006-html':'Resolução CONTRAN 215/2006 — página oficial',
 'dnc-23-1994-reproducao-camara':'Portaria DNC 23/1994 — reprodução em avulso legislativo da Câmara',
}
chains={
 'inmetro-147-2022-http':['inmetro-384-2023-dou-p149','inmetro-384-2023-dou-p150','inmetro-634-2023-dou-p72','inmetro-634-2023-dou-p73','inmetro-106-2025-dou-p16'],
 'inmetro-108-2022-http':['inmetro-314-2025-dou','inmetro-314-2025-dou-p74','inmetro-314-2025-dou-p75','inmetro-409-2026-dou-p110','inmetro-409-2026-dou-p111'],
 'inmetro-436-2021-http':['inmetro-314-2025-dou','inmetro-409-2026-dou-p110','inmetro-409-2026-dou-p111'],
 'inmetro-133-2022-http':['inmetro-314-2025-dou','inmetro-409-2026-dou-p110','inmetro-409-2026-dou-p111'],
 'inmetro-379-2021-http':['inmetro-845-2025-dou-p41','inmetro-845-2025-retif'],
 'contran-951-2022':['contran-997-2023'],
}
pages_by_id={}
for entry in sources:
    ident=entry['id']; folder=Path(entry.pop('diretorio_origem'))
    original=folder/Path(entry['arquivo_pacote']).name
    shutil.copy2(original,OUT/entry['arquivo_pacote'])
    entry['titulo']=titles.get(ident,ident.replace('-',' '))
    entry['estado_disponibilidade']='arquivo_original_disponivel'
    entry['estado_vigencia']='não inferido da disponibilidade; consultar cadeia e dispositivo'
    entry['aplicabilidade']='condicional; consultar matriz revisada'
    entry['publicar_como_criterio_executavel']=False
    entry['alteradores_ou_complementos_identificados']=chains.get(ident,[])
    entry['markdown']='legislacoes/'+ident+'.md'
    if entry['format']=='pdf':
        pp=folder/(ident+('.pages.json' if folder==RAW else '.json'))
        pages=read(pp) if pp.exists() else []
        assert pages and all('text' in p for p in pages), ident
        entry['extracao']='texto por página; tabelas, fórmulas, desenhos e leitura em colunas devem ser consultados no PDF'
    else:
        txt=folder/(ident+'.txt')
        pages=[dict(page=None,text=txt.read_text(encoding='utf-8'))] if txt.exists() else []
        entry['extracao']='texto HTML/DOC; documento original preservado; sem paginação PDF' if pages else 'original preservado; extração textual não disponível'
    pages_by_id[ident]=pages
    preface=f'''# {entry['titulo']}

- ID: `{ident}`
- Consulta/aquisição: {entry.get('consulted_at',DATE)}
- [Fonte oficial]({entry['official_url']})
- [Arquivo preservado](../{entry['arquivo_pacote']}) — {entry['format'].upper()}
- SHA-256 do arquivo: `{entry['sha256']}`
- Disponibilidade: arquivo obtido. Isso não certifica vigência, aplicação ou revisão integral.
- Revisão: {entry.get('revisao','identificação e vínculo; consultar matriz')}
- Extração: {entry['extracao']}
- Uso em IA: **transcrição documental bruta; não tratar todos os parágrafos como regra atual.**
'''
    if ident in chains:
        preface+='\nLer junto: '+', '.join(f'[{x}]({x}.md)' for x in chains[ident])+'.\n'
    if ident=='inmetro-147-2022-http':
        preface+='\nA indicação de revogação junto ao art. 5º refere-se a esse artigo. A 106/2025 não revogou integralmente a 147/2022.\n'
    if ident=='dnc-23-1994-reproducao-camara':
        preface+='\nO arquivo também contém projeto legislativo e normas históricas. A Portaria DNC está na página 14. Projeto de sustação não comprova sustação efetiva. Cadeia atual e exceções ainda a sanear.\n'
    if ident in new_ids and '-dou' in ident:
        preface+='\nA página do Diário Oficial pode conter outros atos. A ficha e as conclusões identificam o dispositivo pertinente; o texto bruto não é filtrado automaticamente para uso normativo.\n'
    text='\n\n'.join('## '+('Página '+str(p['page']) if p['page'] is not None else 'Texto extraído')+'\n\n'+p['text'] for p in pages)
    write(OUT/entry['markdown'],preface+'\n'+text)

source_map={s['id']:s for s in sources}
assert len(source_map)==len(sources)

def links(refs):
    return '; '.join(f"[{r['fonte']}](legislacoes/{r['fonte']}.md), {r['dispositivo']}" for r in refs)

# Arquivo público de conclusões de consulta: não contém as respostas privadas do Excel.
curated=[]
for row in matrix:
    if not row['fontes']: continue
    curated.append(dict(id='REV-'+row['id'],tipo='conclusao_revisada_no_recorte',
        tema=row['tema'],texto=row['conclusao'],fundamento=row['fundamento'],
        condicoes=scope,estado_revisao=row['estado_revisao'],limites=row['limite'],
        fontes=[dict(**r,url=source_map[r['fonte']]['official_url'],sha256=source_map[r['fonte']]['sha256'],markdown=source_map[r['fonte']]['markdown']) for r in row['fontes']],
        uso='consulta com citação; não aprovar relatório nem ampliar equivalências', data_corte=DATE))
for node in mover_nodes:
    curated.append(dict(id=node['id'],tipo='requisito_contabilizavel_mover',
        tema=node['titulo'],texto=node['metodos_citados'],grupo=node['grupo'],
        natureza=node['natureza'],condicoes='Meta ponderada da empresa; presença de série por MMV; não obrigação individual universal.',
        substituicao=node['substitui_no_calculo'],alerta=node['alerta'],
        fontes=[dict(fonte=f,url=source_map[f]['official_url'],sha256=source_map[f]['sha256'],markdown=source_map[f]['markdown'],dispositivo=node['dispositivo']) for f in node['fontes']],
        data_corte=DATE,metodo_internacional_integralmente_revisado=False))
for node in gnv_nodes:
    curated.append(dict(id=node['id'],tipo='requisito_gnv',tema=node['titulo'],texto=node['obrigacao'],
        entrega=node['entrega'],fase=node['fase'],condicoes=node['condicao'],
        fontes=[dict(**r,url=source_map[r['fonte']]['official_url'],sha256=source_map[r['fonte']]['sha256'],markdown=source_map[r['fonte']]['markdown']) for r in node['fontes']],
        data_corte=DATE,uso='consulta com citação; sem aprovação automática do serviço ou do veículo'))
write(OUT/'base-ia/conclusoes-revisadas.jsonl','\n'.join(json.dumps(x,ensure_ascii=False) for x in curated))

pending=[
 dict(id='R01',tema='Coluna de direção e mangueira: entrega autônoma',bloqueia_desenho=False,bloqueia_resposta_automatica='aprovação/dispensa da entrega independente',
      achado='As ligações 910/2022 e 915/2022 estão identificadas. Falta fundamento publicado para concluir aceitação/dispensa autônoma de cada linha legada.',
      acao='Consultar instrução/documentação vigente da Senatran que trate especificamente da linha, ou registrar entendimento formal com escopo. Não pedir ao usuário para escolher outra legislação de ancoragem.'),
 dict(id='R02',tema='Quebra-mato: registro e plaqueta entre CONTRAN e Inmetro',bloqueia_desenho=False,bloqueia_resposta_automatica='registro obrigatório universal para qualquer fornecedor',
      achado='215/2006 menciona registro; 282/2020 classifica atividade como risco I e dispensa ato de liberação; 400/2020 institui declaração e autoverificação. Mecanismo e escopo estão confirmados.',
      acao='Sanear exigência administrativa atual de número na plaqueta/registro com os dois órgãos. Na consulta, mostrar as duas bases e a ressalva, sem afirmar dispensa de conformidade.'),
 dict(id='R03',tema='Redação do MOVER C2 e Grupo D',bloqueia_desenho=False,bloqueia_resposta_automatica='usar dossiê de monitoramento de motorista para comprovar AEB de ciclistas; escolher método definitivo para Grupo D',
      achado='Anexo II da 215/2025, C2, contém a expressão de monitoramento de motoristas em alternativa temporária até setembro de 2026. Grupo D depende de definição técnica/viabilidade.',
      acao='Não corrigir C2 por inferência; buscar esclarecimento/retificação se essa alternativa histórica for consultada. Em novembro de 2026 não oferecer o prazo temporário como aberto. Grupo D permanece condicional.'),
 dict(id='R04',tema='Atualidade completa e documentos técnicos incorporados',bloqueia_desenho=False,bloqueia_resposta_automatica='base integralmente atualizada ou todos os métodos integralmente revisados',
      achado='Índices CONTRAN e SENATRAN têm datas de atualização próprias. Não foi certificada a leitura de todas as edições posteriores do DOU. Normas ABNT/ISO/SAE e todos os UN R/FMVSS não foram obtidos/revisados integralmente.',
      acao='Verificar publicações posteriores antes da publicação da base; montar inventário das edições dos métodos e de seus direitos de acesso. Manter data de corte e revisões por dispositivo.'),
 dict(id='R05',tema='Propulsões especiais e restrição de diesel',bloqueia_desenho=False,bloqueia_resposta_automatica='declarar qualquer propulsão/combustível autorizado no M1',
      achado='A escolha de cobrir todas as propulsões é decisão do produto. Segurança elétrica/híbrida e GNV foram aprofundadas. Diesel tem restrição externa ao CONTRAN identificada; gases/tecnologias menos usuais não tiveram todas as cadeias atuais saneadas.',
      acao='Concluir cadeia atual/exceções da DNC 23/1994 e regras específicas da tecnologia ao ativar o ramo. Projeto/consulta pública de hidrogênio não é autorização vigente.'),
 dict(id='R06',tema='Validação de interface e ligação real ao 3D',bloqueia_desenho=False,bloqueia_resposta_automatica='captura de todos os perfis ou ligação visual implementada',
      achado='Dez guias de um exemplo preservadas; uniformidade dos demais perfis informada pelo usuário. Ligações de peças são semânticas e não identificadores reais de malha.',
      acao='No desenvolvimento, conferir malhas disponíveis e associar IDs estáveis; requisitos sem peça visível ficam em visão de sistema/veículo. Usar a árvore mesmo sem carregar o 3D.'),
]

dump(OUT/'escopo-confirmado.json',scope)
dump(OUT/'confirmacoes-revisadas.json',dict(data=DATE,fonte_excel=answers['fonte'],sha256_excel_na_leitura=answers['sha256'],respostas_preservadas=matrix,
    correcoes_ids_planilha={'C13':'ENS-2-10 / SEG-001, pneus; antes apontava SEG-017 (extintor)', 'C14':'SEG-017, extintor; antes apontava SEG-024 (GNV)', 'C15':'SEG-024, GNV; antes apontava SEG-034 (ENSV)'},
    nota='Excel original preservado. Situações Pendente no dropdown não anulam as respostas efetivamente preenchidas.'))
dump(OUT/'mover-requisitos.json',mover)
dump(OUT/'gnv-requisitos.json',dict(data=DATE,requisitos=gnv_nodes,limite='Revisão dos dispositivos citados; não é parametrização integral dos métodos técnicos nem avaliação de um serviço concreto.'))
dump(OUT/'pendencias-residuais.json',pending)

counts=dict(documentos_preservados=len(sources),pdf=sum(s['format']=='pdf' for s in sources),doc=sum(s['format']=='doc' for s in sources),html=sum(s['format']=='html' for s in sources),
    fichas_markdown=len(sources),fontes_adicionais=len(new_ids),conclusoes_ia=len(curated),respostas_excel=len(matrix),requisitos_mover=len(mover_nodes),
    guias_capturadas=10,linhas_ensaio_capturadas=36,requisitos_complementares_base=35,linhas_nivel1_base=12,requisitos_gnv=len(gnv_nodes))
dump(OUT/'manifesto-fontes.json',dict(data_corte=DATE,contagens=counts,documentos=sources,
    limites=['Documento disponível não prova vigência/aplicabilidade.', 'Páginas do DOU são arquivos, não atos distintos.', 'Atos históricos e alteradores também estão preservados.', 'Este pacote cobre os documentos selecionados da análise de segurança, não todas as 251 resoluções do catálogo geral.', 'Não inclui todas as normas técnicas privadas nem promete extração perfeita de tabelas/desenhos.']))

# Inventário v2: preservar as 36 linhas observadas e acrescentar a camada normativa atual.
inv=read(ROOT/'outputs/levantamento-seguranca/inventario-seguranca.json')
inv['versao']='0.2-revisao-2026-11-02'
inv['data_consulta']=DATE
inv['escopo_confirmado']=scope
inv['escopo_pretendido']='Automóvel novo nacional M1; até 7 ocupantes incluindo motorista; PBT usual até 3500 kg e ramo M1 elétrico acima disso; consulta por propulsão e condições.'
inv['status']='base_para_desenho_revisada_com_ressalvas_documentais_explicitas'
inv['seguranca_integral_fechada']=False
inv['pronto_para_desenho_informativo']=True
inv['requisitos_mover']=mover_nodes
inv['requisitos_gnv']=gnv_nodes
for part,title in components:
    inv['partes_3d_semanticas']['gnv-'+part]=title+' — sistema GNV'
inv['partes_3d_semanticas']['gnv-cilindro']='Cilindro de GNV'
inv['metodologia_mover']={k:v for k,v in mover.items() if k!='novos_registros'}
inv['revisao_confirmacoes']=[{k:v for k,v in r.items() if k!='resposta_usuario'} for r in matrix]
inv['pendencias_anteriores']=inv.pop('pendencias')
inv['pendencias']=pending
for row in inv['matriz_ensaios']:
    matches=[r for r in matrix if row['id'] in r['itens_relacionados']]
    row['notas_revisao_2026_11_02']=[dict(confirmacao=r['id'],conclusao=r['conclusao'],fontes=r['fontes'],limite=r['limite']) for r in matches]
    mapped=[n['id'] for n in mover_nodes if n['correspondencia_siscat']==row['id']]
    if mapped:
        row['vinculos_mover']=mapped
        for f in ['mdic-215-2025-dou-p26','mdic-215-2025-dou-p27','mdic-215-2025-dou-p28']:
            if f not in row['fontes']:row['fontes'].append(f)
for row in inv['requisitos_complementares']:
    matches=[r for r in matrix if row['id'] in r['itens_relacionados']]
    row['notas_revisao_2026_11_02']=[dict(confirmacao=r['id'],conclusao=r['conclusao'],fontes=r['fontes'],limite=r['limite']) for r in matches]
    for m in matches:
        for ref in m['fontes']:
            if ref['fonte'] not in row['fontes']:row['fontes'].append(ref['fonte'])
inv['observacoes'].append('A atualização adiciona 28 vínculos MOVER, com sobreposição de temas existentes. Não somar 36 + 28 como 64 ensaios obrigatórios únicos.')
dump(OUT/'inventario-seguranca-v2.json',inv)

md=['# Conferência das 19 respostas do Excel', '', f'Data de corte: {DATE}. O arquivo preenchido foi preservado. As respostas são reproduzidas abaixo, separadas do resultado da pesquisa.', '']
for row in matrix:
    md += [f"## {row['id']} — {row['tema']}",'',f"**Sua resposta:** {row['resposta_usuario']}",'',f"**Resultado:** {row['conclusao']}",'',row['fundamento'],'',f"**Situação:** {row['estado_revisao']}. {row['limite']}",'', '**Fontes:** '+links(row['fontes']) if row['fontes'] else '**Fonte:** orientação expressa do usuário, sem inferência de validação normativa.', '']
md += ['## Correções de referências da planilha','', '- C13/Pneus: usar ENS-2-10 / SEG-001, em vez de SEG-017 (extintor).', '- C14/Extintor: usar SEG-017, em vez de SEG-024 (GNV).', '- C15/GNV: usar SEG-024, em vez de SEG-034 (ENSV).', '', 'O Excel respondido não foi sobrescrito; as correções estão registradas nesta consolidação.']
write(OUT/'CONFIRMACOES-REVISADAS.md','\n'.join(md))

md=['# MOVER: requisitos para a árvore de segurança','',f'Data de corte: {DATE}. Bases: Decreto 12.435/2025, Anexo IV; Portaria GM/MDIC 215/2025, arts. 1º a 10 e Anexos I/II.','',
    '**Distinção essencial:** os índices são calculados sobre os veículos comercializados pela empresa, ponderados por emplacamentos. Não converter a meta da empresa em obrigação de instalar todos os sistemas em cada automóvel. Regras individuais do CONTRAN devem ser verificadas em paralelo.','',
    '## Metas e comprovação','',
    '| Grupo | Data de aferição | InTec mínimo |','|---|---|---|']
for g,rows in mover['metas'].items():
    for row in rows:md.append(f"| {g} | {row['data']} | {row['intec_minimo_percentual']}% |")
md += ['',mover['formula'],'',mover['prova_por_mmv'],'',mover['prova_empresa'],'',mover['periodo'],'',
    '## Catálogo de requisitos','',
    '| Código | Requisito | Comprovação citada no Anexo II | Linha observada no SISCAT |','|---|---|---|---|']
for n in mover_nodes:
    md.append(f"| {n['codigo_oficial']} | {n['titulo']} | {n['metodos_citados']} | {n['correspondencia_siscat'] or 'Sem linha própria na captura'} |")
md += ['', '## Substituições condicionadas','',
    'As substituições abaixo só valem para a contabilização prevista no art. 5º, atendidas suas condições. Não são equivalências universais de ensaios.', '',
    '| Requisito C | Pode substituir B |','|---|---|']
md += [f'| {c} | {b} |' for c,b in substitutions.items()]
md += ['', 'O Grupo D depende de análise de viabilidade e definição dos requisitos técnicos pelo processo previsto no art. 5º, § 1º. Não foi tratado como instalação obrigatória geral nem como método técnico já concluído.', '',
    '## Redação que exige cuidado','',
    'No C2 (AEB para ciclistas), o texto oficial oferece, até setembro de 2026, um parágrafo sobre avaliação de monitoramento de motoristas. Essa inconsistência foi preservada e não corrigida por inferência. A alternativa temporária do C4 também termina em setembro de 2026. Na data de corte desta pesquisa, novembro de 2026, esses prazos não devem aparecer como abertos.', '',
    'O Anexo I escreve “D1 a D4”, mas lista D1 a D5 e a própria tabela contém D5; preservar o registro literal e modelar os cinco itens expressamente listados. Isso não autoriza alterar a norma.', '',
    '**Limite documental:** identificamos as referências internacionais no ato brasileiro. Ainda não reunimos todos os textos UN R/FMVSS/UE/ISO/SAE e suas edições atuais. Isso é uma fase própria da biblioteca de métodos.', '',
    'Fontes: '+links(mover['fontes_metodologia'])+'.']
write(OUT/'MOVER-REQUISITOS.md','\n'.join(md))

md=['# GNV: requisitos separados para consulta e ligação ao 3D','',
    'A fabricação original, a modificação posterior e a manutenção do veículo em uso não devem aparecer como uma única entrega. As partes 3D abaixo são semânticas, sem pressupor que o modelo já contenha essas malhas.', '',
    '| ID | Assunto | Fase | Obrigação | Comprovação | Fontes |','|---|---|---|---|---|---|']
for n in gnv_nodes:
    md.append(f"| {n['id']} | {n['titulo']} | {n['fase']} | {n['obrigacao']} | {n['entrega']} | {links(n['fontes'])} |")
md += ['', 'A 147/2022 deve ser lida com 384/2023, 634/2023 (histórico) e 106/2025. Esta última revogou o art. 5º que limitava os efeitos do regime, restabeleceu efeitos a partir de 31/12/2024 e validou as inspeções do intervalo especificado. O regime não foi considerado extinto pela leitura isolada do prazo antigo.', '',
    'Para os selos de cilindros e requalificação: 314/2025 com 409/2026. A redação atual do art. 9º, § 6º, da 314 prevê registro de uso do selo pelo fornecedor no aplicativo a partir de 01/11/2026. Isso é obrigação do fornecedor, não um novo ensaio de homologação do automóvel.', '',
    'Os textos completos dos RTQ/RAC estão preservados. A tabela sintetiza os dispositivos citados, sem substituir seus anexos ou validar certificados/serviços concretos.']
write(OUT/'GNV-REQUISITOS.md','\n'.join(md))

md=['# Pendências residuais e critério de fechamento','',
    '**A base já permite redesenhar o fluxo e a árvore informativos. Segurança integralmente fechada: não.** As ressalvas abaixo impedem algumas afirmações automáticas, sem paralisar a organização do conhecimento já conferido.','']
for p in pending:
    md += [f"## {p['id']} — {p['tema']}",'',p['achado'],'',f"**Resolver:** {p['acao']}",'',f"**Não concluir automaticamente:** {p['bloqueia_resposta_automatica']}.",'']
md += ['## O que deixou de ser uma dúvida genérica','',
    '- Qual é a legislação atual de ancoragem: 951/2022 com 997/2023 confirmadas.',
    '- Se quebra-mato é exclusivo de polícia: não é; as hipóteses públicas são exceções específicas.',
    '- Se há regra Inmetro para engate, pneus, extintor e GNV: atos e mecanismos identificados e arquivos obtidos.',
    '- Se o MOVER tem base publicada: Decreto 12.435/2025 e GM/MDIC 215/2025 obtidos, com grupos e métodos.',
    '- Se o produto precisa aprovar relatórios de engenharia: não; o usuário definiu consulta e orientação.',
    '- Se os sete lugares incluem motorista: sim, sete ocupantes no total.', '',
    '## Fechamento para publicação','',
    'O desenho pode avançar usando estados “aplicável”, “condicional”, “referência histórica” e “ponto ainda não concluído”. A publicação como base normativa integral requer concluir a atualização temporal, sanear as interfaces administrativas indicadas e conferir disponibilidade/versões dos documentos técnicos incorporados. A ligação real ao 3D é trabalho de implementação posterior.']
write(OUT/'PENDENCIAS-RESIDUAIS.md','\n'.join(md))

md=['# Disponibilidade dos documentos da análise de segurança','',f'Data: {DATE}. {len(sources)} arquivos de fonte, sendo {counts["pdf"]} PDFs, {counts["doc"]} DOCs e {counts["html"]} páginas HTML. Há {len(sources)} fichas Markdown com fonte e hash.', '',
    'Contagem é de **arquivos**, não de atos: um ato do Diário Oficial pode ocupar várias páginas. Um PDF de corpo principal não prova que todos os anexos externos também estejam disponíveis.', '',
    'Os arquivos oficiais antigos em DOC permanecem em DOC; não foram renomeados como PDF oficial. Textos anotados do Inmetro contêm redações anteriores e atuais. Extração para Markdown não equivale a consolidação de vigência.', '',
    '| ID / ficha | Formato | Páginas PDF | Original preservado |','|---|---|---|---|']
for s in sources:
    md.append(f"| [{s['id']}]({s['markdown']}) | {s['format'].upper()} | {s.get('pages','—')} | [arquivo]({s['arquivo_pacote']}) |")
md += ['', '## O que não está anunciado como completo','',
    '- Todos os textos privados ABNT/ISO/SAE e todas as edições dos regulamentos internacionais incorporados.',
    '- Todas as resoluções do catálogo geral CONTRAN: o catálogo de 251 fichas já entregue tem recorte diferente e inclui assuntos alheios à segurança deste M1.',
    '- Consolidação automática de toda redação antiga/nova em um único texto vigente.',
    '- Revisão integral de todos os métodos, desenhos e tabelas anexos.']
write(OUT/'DISPONIBILIDADE-DOCUMENTOS.md','\n'.join(md))

write(OUT/'base-ia/LEIA-ME.md', '''# Base de consulta com IA — estágio atual

`conclusoes-revisadas.jsonl` contém conclusões selecionadas, os 28 vínculos MOVER e os subitens de GNV, com IDs, condições, fontes oficiais, dispositivo e SHA-256. Não contém as respostas privadas do Excel. É uma base inicial de registros para consulta, não um sistema de busca ou um motor de homologação implementado.

O diretório `legislacoes/` preserva a extração documental bruta. Não indexe todos os seus parágrafos como se fossem regras atuais. Os PDFs anotados do Inmetro podem exibir redações sucessivas; páginas do Diário Oficial podem conter outros atos; documentos históricos permanecem necessários para entender as alterações. Desenhos, tabelas e fórmulas exigem consulta ao original.

Para uma resposta confiável: filtrar a configuração e as datas; distinguir obrigação individual de meta da fabricante; usar apenas a redação aplicável; citar ato, dispositivo e fonte; declarar o ponto não concluído. Ausência de uma linha no SISCAT não comprova ausência de obrigação. A existência de uma malha 3D não comprova conformidade da peça.

Antes de disponibilizar uma busca pública: resolver as pendências indicadas, rever versões dos textos técnicos, atribuir validade temporal a cada trecho e testar perguntas que envolvam exceções, massas, acessórios, GNV e MOVER. Nunca substituir uma lacuna por equivalência inventada.
''')

write(OUT/'RESULTADO-DA-REVISAO.md',f'''# Resultado da revisão de segurança

Data de corte: **2 de novembro de 2026**.

**As pesquisas desta rodada foram consolidadas e a base está pronta para orientar o novo desenho informativo do fluxo e da árvore. Ainda não há fundamento para declarar toda a segurança normativa integralmente fechada.** As pendências agora estão delimitadas por assunto e não impedem representar os requisitos já conferidos.

## Recorte confirmado

Automóvel de passageiros novo, fabricado no Brasil, categoria M1, **até sete ocupantes no total, incluindo o motorista**. PBT usual até 3.500 kg, com ramo próprio para M1 elétrico acima disso. A definição de M1 da 915/2022, art. 2º, não estabelece esse teto geral de massa; cada legislação mantém seu próprio corte. Não há desconto automático da massa de bateria nos requisitos de segurança.

O aplicativo será de consulta: obrigação → condição de aplicação → legislação → comprovação → parte/sistema no 3D. Datas do projeto/CAT e de fabricação continuam relevantes, mesmo sem aprovar relatórios. Todas as propulsões devem caber na arquitetura, com cobertura específica e lacunas visíveis.

## O que a pesquisa acrescentou

1. **MOVER/InTec.** Decreto 12.435/2025, Anexo IV, e GM/MDIC 215/2025, Anexos I/II, acrescentam uma camada de requisitos por MMV e metas ponderadas da empresa. Foram estruturados os 28 itens A/B/C/D, inclusive TPMS, ADDW, sensor de ponto cego e aviso de cinto para todos os passageiros, que não tinham linha própria entre as 36 capturadas. Grupo D permanece condicionado à definição técnica. Esses 28 vínculos se sobrepõem a temas existentes: não são 28 novos ensaios obrigatórios universais.
2. **Inmetro.** Identificados os mecanismos de engate/quebra-mato (declaração do fornecedor, com diferenças de registro), pneus/extintores/componentes e cilindros GNV (certificação nos respectivos regulamentos), instalação e requalificação GNV (regras de serviço) e inspeção veicular. Não se deve resumir todos os mecanismos à palavra “certificação”.
3. **Atualizações efetivas.** Pneus: 845/2025 + retificação de 06/02/2026. Selos: 314/2025 + 409/2026. Inspeção GNV: 384/2023 + histórico 634/2023 + 106/2025. A 106 revogou o art. 5º da 147/2022 e restabeleceu efeitos; não revogou a portaria inteira.
4. **Ancoragens.** 951/2022 + 997/2023 continuam como base atual confirmada; separar bancos/apoios, cintos/ancoragens e ISOFIX. Relatório conjunto depende da cobertura do requisito, sem criar uma exigência separada pelo simples nome antigo da tela.

## Correções práticas para a consulta

| Assunto | Como mostrar |
|---|---|
| Quebra-mato | Não é exclusivo de polícia; há exceções específicas. Inmetro 400/2020 exige declaração/autoverificação do fornecedor. Registro/plaqueta entre 215/2006 e risco I da 282/2020 permanece ressalva administrativa. |
| Engate | Acessório e original de fábrica têm escopos diferentes. Separar relatório de protótipo do engate, registro do fornecedor e capacidade declarada do veículo. |
| Pneus | DOT + logotipo não bastam para a cadeia de conformidade; conferir certificação, registro, marcações e aplicação. ENCE em pneu para montadora tem condição própria. |
| Extintor | Instalação facultativa para automóvel, mas local adequado para suporte é dever do fabricante. Produto instalado não se torna regular apenas por autodeclaração do veículo. |
| GNV | Separar componentes, cilindro, instalação, inspeção e requalificação. O original de fábrica também aparece expressamente nos regulamentos. |
| UN R / FMVSS / ISO | Usar alternativas expressamente admitidas e seu escopo; a hierarquia do MOVER não é autorização irrestrita para substituir qualquer relatório CAT. |
| PBT do elétrico | Manter M1 e reenquadrar cada obrigação pela massa real e pelo texto da regra; não criar “isenção por bateria”. |
| Linhas antigas do SISCAT | Preservar o que foi observado e mostrar a base atual ao lado. Não criar nem dispensar entrega independente sem fundamento. |

## Resultado documental

- {counts['respostas_excel']} respostas do Excel incorporadas à conferência, sem alterar o arquivo preenchido.
- Captura anterior preservada: 10 guias e 36 linhas de ensaios, além de 12 linhas Nível 1 complementadas pela fonte oficial e 35 requisitos complementares.
- {counts['documentos_preservados']} arquivos de fonte preservados: {counts['pdf']} PDF, {counts['doc']} DOC e {counts['html']} HTML; cada um com ficha Markdown e hash. Páginas do DOU contam como arquivos, não como leis distintas.
- {counts['requisitos_mover']} vínculos MOVER estruturados, com grupos, métodos citados, condições e correspondência com o SISCAT.
- {counts['requisitos_gnv']} subitens GNV estruturados, incluindo os nove componentes expressamente listados na 111/2022, cilindro e etapas de instalação/uso.
- Inventário v2 e {counts['conclusoes_ia']} registros iniciais para consulta com IA, mantendo condições e fontes. Isso não implementa ainda a busca por IA nem certifica todos os métodos internacionais/privados.

## Estrutura que o novo desenho deve respeitar

1. **Enquadrar o veículo:** tipo, categoria, lugares, massas, propulsão, datas e exceções.
2. **Exibir obrigações individuais do veículo:** construção, segurança ativa/passiva, sistemas e acessórios instalados.
3. **Orientar o dossiê CAT/SISCAT:** documentos administrativos, declarações e relatórios que correspondam aos requisitos aplicáveis. Não confundir a lista de arquivos da interface com o universo legal.
4. **Exibir MOVER/rotulagem:** presença e características por MMV; controle separado das metas anuais da fabricante.
5. **Consultar o veículo em uso:** inspeções/manutenção e modificações posteriores, com ramo separado da homologação original.
6. **Ligar ao 3D:** relações de conhecimento por peça/sistema; o fluxo continua acessível sem carregar o modelo. IDs de malha reais ainda serão conferidos na implementação.

## O que falta para o fechamento integral

As seis ressalvas estão descritas em [PENDENCIAS-RESIDUAIS.md](PENDENCIAS-RESIDUAIS.md): entrega autônoma de linhas legadas; registro/plaqueta do quebra-mato; redação C2 e definição do Grupo D; atualização temporal e métodos incorporados; propulsões especiais/diesel; validação de outros perfis e malhas 3D. Cada uma indica exatamente qual afirmação ainda não pode ser automática.

Os desenhos anteriores de 31/10 são versões históricas: ainda não refletem toda esta revisão MOVER/Inmetro. O próximo desenho deverá usar o inventário v2, sem apresentar as ressalvas como resolvidas.

## Arquivos principais

- [Conferência das suas 19 respostas](CONFIRMACOES-REVISADAS.md).
- [Requisitos e metas MOVER](MOVER-REQUISITOS.md).
- [Componentes e etapas GNV](GNV-REQUISITOS.md).
- [Disponibilidade de fontes, PDFs e Markdown](DISPONIBILIDADE-DOCUMENTOS.md).
- [Inventário estruturado v2](inventario-seguranca-v2.json).
- [Critérios de uso na base de IA](base-ia/LEIA-ME.md).

Fontes centrais: [Decreto 12.435/2025, Anexo IV](legislacoes/decreto-12435-2025-dou-p5.md); [GM/MDIC 215/2025](legislacoes/mdic-215-2025-dou-p26.md); [Inmetro 409/2026](legislacoes/inmetro-409-2026-dou-p110.md); [Inmetro 106/2025](legislacoes/inmetro-106-2025-dou-p16.md). As fichas ligam ao arquivo oficial e ao dispositivo conferido.
''')

# Tentativas de acesso separadas dos documentos de identidade verificada.
attempts=[read(p) for p in sorted(RAW.glob('*.meta.json'))]
dump(OUT/'tentativas-de-acesso.json', [dict(id=m['id'],url=m['official_url'],estado=m['state'],erro=m.get('error'),selecionado_no_pacote=m['id'] in new_ids) for m in attempts])

# Verificações de integridade e referências. A planilha do usuário deve continuar idêntica.
assert len(matrix)==19 and set(by_answer)=={x['id'] for x in matrix}
assert all(x['resposta_usuario']==by_answer[x['id']]['resposta'] for x in matrix)
assert len(mover_nodes)==28
assert Counter(n['grupo'] for n in mover_nodes)==dict(A=7,B=8,C=8,D=5)
assert len(inv['matriz_ensaios'])==36 and len(inv['guias'])==10
assert inv['seguranca_integral_fechada'] is False
assert scope['ocupantes_maximos_produto']==7 and scope['inclui_motorista'] is True
for row in matrix:
    assert all(r['fonte'] in source_map for r in row['fontes']), row['id']
for node in mover_nodes:
    assert all(f in source_map for f in node['fontes']),node['id']
    assert all(p in inv['partes_3d_semanticas'] for p in node['partes_3d']),node['id']
for node in gnv_nodes:
    assert all(r['fonte'] in source_map for r in node['fontes']),node['id']
    assert all(p in inv['partes_3d_semanticas'] for p in node['partes_3d']),node['id']
for s in sources:
    assert sha(OUT/s['arquivo_pacote'])==s['sha256'], s['id']
assert sha(Path(answers['fonte']))==answers['sha256'], 'O Excel foi modificado depois da leitura: não substituir respostas.'

valid=dict(data=DATE,resultado='aprovado nos controles de integridade e rastreabilidade',contagens=counts,
    criterios=['19 respostas preservadas integralmente','Excel respondido com mesmo SHA-256','36 linhas e 10 guias preservadas','28 itens MOVER: A7/B8/C8/D5','fontes de todas as conclusões existentes no pacote','hashes dos arquivos conferidos','segurança integral não marcada como fechada','sete ocupantes incluem motorista'],
    limite='Controle documental e de referências. Não é certificação jurídica/engenharia de todos os métodos ou garantia de completude normativa.')
dump(OUT/'validacao.json',valid)
bundle=ROOT/'outputs/revisao-seguranca-2026-11-02.zip'
with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(OUT.parent))
print(json.dumps(dict(saida=str(OUT),zip=str(bundle),bytes_zip=bundle.stat().st_size,contagens=counts),ensure_ascii=False,indent=2))
