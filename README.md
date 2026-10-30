# legislacao-automotiva

Portal consultivo de legislação automotiva, com navegação visual, referências oficiais e limites de revisão por registro.

Site: https://legislacao-automotiva.pages.dev/#guide. O guia de projeto é a entrada
principal; `/#vehicle` abre a consulta 3D e `/#vehicle?view=reference` conserva
o desenho original. A [Base regulatória](https://legislacao-automotiva.pages.dev/#knowledge)
reúne as fichas Markdown, fontes e arquivos estruturados publicados.
O [checkup regulatório de 25/10/2026](docs/guide/checkup-regulatorio.md) registra
as correções, a profundidade do acervo e as pendências. A auditoria anterior está
na [matriz de melhorias e evidências](docs/audit-implementation-2026-10-19.md).

## Início, Perguntar e PDFs oficiais

`/#inicio` é a nova entrada: as três etapas em sequência (ambiental → trânsito →
produção) e, ao lado, o que corre em paralelo (sua responsabilidade e fornecedores).
`/#ia` responde perguntas com trechos citados do acervo e dos PDFs oficiais, usando o
Workers AI gratuito do Cloudflare (`functions/api/ask.js`). As cópias dos PDFs são
feitas pelo fluxo **Official PDF copies** do GitHub Actions. Veja
[como ativar e quais são os limites](docs/guide/assistente-e-pdfs.md).

## Ambiente de projeto e guia profissional

Abra `/#guide` (também é a entrada padrão). O ambiente usa uma composição minimalista
inspirada nas referências de design Apple, conserva os temas Obsidian, Claro e
Aurora e acrescenta:

- Seleção 3D real, por Three.js, sincronizada à árvore e ao inspetor de referências. SUV de referência BMW X5 G05 oficial, sob CC BY 4.0, com geometria e materiais PBR reais em GLB. Vinte e um conjuntos 3D e 33 identificações de subsistemas (30 originais + três complementares) retomam as imagens originais. Um suplemento didático acrescenta motor/transmissão, suspensão dianteira e traseira, motor elétrico/inversor e bateria HV. Ônibus, caminhão, motociclo e reboque conservam modelos esquemáticos; nenhuma vista substitui CAD. O desenho original e seus 37 contornos continuam em `/#vehicle?view=reference`.
- Perfil técnico com categoria, propulsão, origem, finalidade, massas, lotação, uso e radiofrequência. LP/LC não são inferidos apenas de M1/N1. Dados ausentes geram pendências; BEV não recebe dispensa ambiental automática.
- Roteiro em React Flow, checklists por perfil e matriz consultiva de relatórios por categoria/uso. Verificações condicionais não significam obrigação já confirmada. M2 por PBT, M3 urbano/escolar e L têm particularidades próprias.
- Registro local de status, notas e referência de evidência; exportação Markdown e backup/importação JSON. Não há conta, sincronização entre dispositivos, upload de laudos ou protocolo nos sistemas oficiais. URLs de processos locais precisam do backup no navegador de destino.
- Mudanças no perfil devolvem verificações a pendentes para revalidação e preservam notas/evidências. O limite de 50 processos não remove processos antigos silenciosamente. Dados locais ilegíveis são preservados em chave de recuperação antes de substituição.
- [Guia de emissões](docs/guide/emissoes.md), [segurança e SISCAT](docs/guide/seguranca-siscat.md), [órgãos e peças](docs/guide/orgaos-e-componentes.md), [base normativa](docs/guide/banco-normativo.md) e [brief de manutenção](docs/guide/brief-de-manutencao.md).

Veja também [a origem do SUV e a cadeia de rastreabilidade](docs/guide/modelo-suv-e-rastreabilidade.md). A seleção mostra vínculos específicos do conjunto e contexto do veículo, dispositivos, âmbito, fontes e limites; o perfil técnico permanece independente do modelo visual.

A base `data/process/knowledge-index.json` reúne as fontes da revisão dirigida e os atos canônicos já publicados com seus estados separados. Gerar com `python scripts/build_guide_database.py`; `--check` confere determinismo e `--sqlite /tmp/base.sqlite` produz uma cópia SQLite local opcional. Novas fontes não são automaticamente promovidas a atos vigentes ou a requisitos confirmados.

O site continua estático. A ilha React compartilhada pelo Guia e pelo explorador 3D carrega sob demanda, com dependências fixadas e empacotadas localmente em `assets/guide`; nenhuma CDN é necessária. `npm run build:guide` recompila a ilha; `npm run build` recompila também o artefato Cloudflare. `postinstall` conserva a publicação estática comprometida. A suíte `tests/guide-browser.py`, descoberta por `npm run test:browser`, verifica fluxo, 3D/árvore, teclado, persistência, backups, celular e axe.

As skills Anatomy, React Flow, Impeccable e webapp-testing não estavam instaladas na sessão. Foram utilizados React Flow e Three.js como bibliotecas, o sistema visual Impeccable já versionado, a skill normativa local e Playwright/axe nas verificações. O guia não é uma certificação de completude jurídica para todo veículo: métodos privados, cadeias integrais e particularidades não revisadas permanecem pendentes.

### Subsistemas e referências 2D do modelo atual

A árvore do guia abre em **Subsistemas** e conserva os 30 IDs e títulos físicos do catálogo anterior. Arrefecimento, bateria auxiliar e powertrain híbrido são complementos identificados separadamente. O modo **Conjuntos 3D** mantém a seleção direta por malha. Endereços preservam `subsystem`, `part` e `tree`; todos os itens têm legenda ancorada e correspondência com geometria real carregada.

A vista explodida usa faixas de apresentação por conjunto e enquadramento dos volumes visíveis. **Focar conjunto** isola a seleção (ou os três ramos do exemplo híbrido), permitindo examinar detalhes. As quatro pranchas em `assets/models/suv/reference-views` são exportações WebGL do próprio modelo atual, com metadados e hashes. O suplemento mecânico é ilustrativo, não o CAD interno do BMW nem uma especificação para homologação.

Veja [cobertura, exemplos mecânicos e vista explodida](docs/guide/subsistemas-e-explosao.md). A geração das pranchas é deliberada com `python scripts/capture_reference_boards.py`; não é executada na CI nem altera as imagens originais. Os geradores autorais dos componentes ficam em `scripts/models`.

As miniaturas do painel de rastreabilidade são renderizações dos conjuntos 3D
atuais. Consulte [geração e proveniência](docs/guide/miniaturas-3d.md) e a
[direção visual e referências de frontend](docs/guide/frontend-apple-e-skills.md).
Um conjunto relacionado ou ilustrativo conserva sua legenda; sua imagem não
comprova a aplicabilidade de uma referência normativa.

## Portal unificado

O acabamento minimalista do Guia se estende a Veículo, Homologação, Biblioteca,
árvores, consultas por órgão, etiquetas/VIN, histórico, revisões e busca. As
miniaturas de conjuntos usam os derivados do modelo 3D aprovado. Os temas
Obsidian, Claro e Aurora permanecem disponíveis. A direção compartilhada está em
[design-portal-unificado.md](docs/guide/design-portal-unificado.md).

`/#vehicle` reutiliza a cena do Guia, com 33 subsistemas e 21 conjuntos 3D,
seleção textual e referências específicas do conjunto. A consulta histórica em
`/#vehicle?view=reference` mantém os 37 contornos e suas coordenadas. Os endereços
anteriores de peças e sistemas continuam disponíveis.

A barra de contexto permite continuar o processo selecionado no Guia ao navegar
pelas consultas. `src/core/portal-context.js` conserva somente sua identificação
ativa; o carregador do Guia continua validando perfil, checklist e evidências.
Uma consulta livre não escolhe automaticamente um processo salvo. Categoria e
motorização visuais permanecem distintas do perfil técnico do processo.

A área `/#knowledge` torna a base publicada acessível pela interface: busca por
fichas de atos e fontes, filtros, qualificações de revisão, fontes oficiais e
acesso aos respectivos Markdown. Candidatos à revisão aparecem separados dos
atos publicados. Seus arquivos são descritos na seção **Auditoria e base para IA**.

## Consulta ativa CONTRAN e PROCONVE

Acervo atualizado com a revisão dirigida de **19/10/2026**. A data e a profundidade
da conferência continuam próprias de cada registro; essa atualização não significa
revisão integral de todas as cadeias. Abra `/#contran` ou `/#proconve` pelo menu.

- **CONTRAN: 209 atos na consulta ativa**, 64 ligados a sistemas físicos e 145
  em categorias gerais. Os 55 históricos apontados pelo responsável foram
  retirados da publicação ativa; a decisão não foi transformada em revogação
  oficial inventada. Também ficam fora os revogados, suspensos, atos com objeto
  temporal encerrado e aqueles cujos efeitos atuais não foram confirmados.
- A conferência final encontrou a revogação expressa de 412/2012 e 433/2013 no
  art. 6º da 537/2015, apesar de o índice antigo ainda indicá-las em vigor.
  Alterações de bases suspensas também ficaram fora do conjunto ativo. A revisão
  de 19/10 conferiu a revogação da 220/2007 pela redação dada ao art. 8º da
  951/2022 pela 997/2023, com efeito em 02/10/2023. A ficha da 220 permanece
  apenas em consulta histórica, separada do acervo atual e de suas exportações.
- **PROCONVE: 25 atos**, com recortes separados **L8 (21)** e **P8 (7)**;
  as contagens de fases se sobrepõem. São 18 atos relacionados a componentes
  e sete em categorias de homologação/conformidade e créditos
  corporativos. PROMOT M5 e as INs 19/2021 e 22/2022, revogadas pela IN 5/2024,
  não entram nessa consulta.
- As cadeias incluem as INs 16/2025 e 20/2025: coleta de IUMPR em 2026 e
  entregas em 2027. Coleta, plano e relatório têm marcos próprios, com condições
  por fase/configuração. Retificações ficam vinculadas ao ato, sem contagem duplicada.
- Sistemas e subsistemas oferecem fluxogramas com referências ativas e acesso
  à consulta filtrada. Cada ato também permite retornar ao sistema associado.
  Créditos corporativos, habilitação, fiscalização, registro e outros assuntos
  transversais têm categorias próprias; não são atribuídos a peças por analogia.
- Busca, paginação, filtros, fases, fontes, alterações e exportações CSV/JSON
  usam o mesmo conjunto ativo. Parâmetros antigos como `scope=all` não recuperam
  registros excluídos. A biblioteca e os fluxogramas recebem esse mesmo recorte.

### Fontes e limites da confirmação

O [índice oficial CONTRAN](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran)
foi atualizado em **06/10/2026, 14h52**. A busca suplementar no DOU retornou HTTP
403 na coleta original: a revisão dirigida de 19/10 não constitui uma nova varredura
integral do período posterior à atualização do índice. Uma cláusula
original de entrada em vigor não certifica isoladamente a vigência atual de todos
os dispositivos; as evidências e ressalvas ficam acessíveis em cada registro.

O PROCONVE cruza textos oficiais do sistema de legislação do Ibama, as Resoluções
CONAMA 490/2018 e 492/2018, alterações até 2025 e o balanço corporativo oficial
publicado pelo Ibama em 2026. As páginas gerais de legislação, desatualizadas,
não foram usadas isoladamente como prova de vigência. Em 19/10, foram recuperados
os PDFs oficiais certificados das **INs 26/2020 e 6/2025** no acervo Sophia do
Ibama. Evaporativas, famílias, reabastecimento e a alteração pela IN 3/2023 têm
dispositivos vinculados; a IN 6/2025 distingue importação/LPCO da aprovação
técnica. Métodos integrais das NBRs e a consolidação exaustiva das cadeias
continuam pendentes.
L8 e P8 não são intercambiáveis; categoria, combustível, datas, anexos e exceções
continuam necessários para aplicar qualquer requisito a um veículo.

### Dados, rastreabilidade e reprodução

`catalog.json` conserva as entradas preexistentes e suas identificações, além
das atualizações editoriais, como fonte de histórico. A aplicação filtra suas referências CONTRAN/IBAMA e incorpora os atos
ativos em tempo de execução; preserva IDs dos documentos que continuam ativos.
O inventário original de **1.141 atos** e **370 textos-base extraídos** permanece
no GitHub para auditoria, sem a opção de consultá-lo como acervo ativo no site.

- `data/contran/active.json` e `active.csv`: conjunto publicado.
- `data/contran/publication-policy.json` e `publication-decisions.json`: decisão
  por registro, distinguindo a orientação do responsável de evidência oficial.
- `data/contran/inventory.json`, `reviewed-effects.json` e `sources/`: inventário
  histórico, conferências e fontes oficiais comprimidas, com SHA-256.
- `data/proconve/active.json` e `active.csv`: conjunto publicado por fase.
- `data/proconve/reviewed-map.json` e `sources/evidence.json.gz`: relações revisadas,
  fontes, textos, hashes e lacunas para reprodução offline.
- `contran.js`: consulta compartilhada, política ativa em tempo de execução e
  vínculos usados pelos fluxogramas. Imagens e áreas de seleção foram preservadas.

A publicação usa uma lista explícita de arquivos ativos e detalhes carregados
sob demanda. Somente fichas históricas selecionadas e identificadas como tais
são publicadas em `data/site/history`; os 55 atos excluídos não são reativados.
Fontes comprimidas, decisões de auditoria e inventários antigos permanecem no
repositório, fora da pasta estática publicada.

```sh
python -m pip install -r scripts/requirements-contran.txt
python scripts/build_contran_map.py
python scripts/build_active_catalogs.py
python scripts/build_proconve_map.py
python tests/contran-map.test.py
python tests/active-regulations.test.py
```

Uma nova coleta CONTRAN requer cache novo, `pandoc` e `antiword` para RTF/DOC
antigos. `CONTRAN_ANTIWORD` indica o executável; `ANTIWORDHOME`, os mapas.

```sh
python scripts/map_contran.py --as-of AAAA-MM-DD --cache /tmp/contran-nova-coleta
python scripts/collect_contran_supplements.py --cache /tmp/contran-nova-coleta
python scripts/build_contran_map.py
```

Revisar as decisões e os textos antes de republicar: refazer a coleta não equivale
a revisão jurídica. Com servidor local e Chromium/Playwright, execute
`python tests/contran-browser.py`. O teste percorre exclusão de inativos, fases,
categorias, exportação, relações com o veículo, teclado, celular e erro/repetição.

## Inmetro, Anatel, etiquetas e VIN

As novas consultas são `/#inmetro`, `/#anatel` e `/#markings` (**Etiquetas e VIN**).
As mesmas fontes aparecem nos fluxogramas do veículo e nos detalhes da biblioteca,
com retorno à consulta por ato. Imagens, contornos e os 30 subsistemas foram
preservados.

- **Inmetro: 18 referências atuais e 42 resumos de requisitos/orientações.**
  Componentes da 145/2022, vidros, rodas, líquido de freio, pneus novos e
  reformados, conversores catalíticos de reposição, retenção infantil, GNV,
  engates, PBEV/ENCE, RGCP, declaração do fornecedor, registro e selos.
  Cada cartão informa o mecanismo; declaração do fornecedor não foi apresentada
  como certificação por OCP. Baterias chumbo-ácido não foram transformadas em
  certificação de baterias de tração de íons de lítio. O Ofício 5/2026 aparece
  como orientação de importação de baterias chumbo-ácido; as condições de modelo 5
  permanecem no requisito correspondente. Lâmpadas LED são explicitamente
  excluídas do escopo dos RACs de filamento/miniatura citados, com encaminhamento
  às regras CONTRAN. A referência retificada ISO 4383:2000 fica no assunto
  bronzinas, sem criar um novo processo de certificação por analogia.
- **Anatel: 22 atos e 15 resumos de requisitos**, incluindo Resoluções 715/2019,
  779/2025 e 780/2025; procedimento de identificação 4.088/2020 com 5.701/2021;
  radiação restrita e alterações até 4.746/2026; terminais celulares,
  carregadores, compatibilidade eletromagnética e segurança elétrica.
  Rádio AM/FM exclusivamente receptor não recebe exigência universal inferida.
  Ato 5.155/2024 distingue carregadores de interfaces USB integradas à central.
  Módulo homologado não foi tratado como dispensa automática do equipamento final.
- **VIN, ETA e PIV: nove resumos de dispositivos públicos** das Resoluções
  CONTRAN 968/2022, 969/2022 e 882/2021, com trechos e âmbito de aplicação.
  Estrutura do VIN, gravações, identificação do motor, ETA, VIS nos vidros,
  ano de fabricação, PIV/QR Code e plaquetas de pesos/capacidades têm referências
  próprias. Os requisitos da 968 dependem do art. 49 e não foram aplicados
  retroativamente ao exemplo de veículo de 2018.
- **Etiquetas:** ENCE do veículo, ENCE do pneu, selo Inmetro, selo INMPAM,
  identificação/e-label Anatel, ETA e PIV aparecem por finalidade. O selo
  314/2025 não foi estendido indiscriminadamente a toda peça. A transição de
  pneus citada na FAQ oficial mantém a data de 23/10/2026, sem reutilizar como
  autorização presente o prazo de laboratório não acreditado encerrado em 2025.

### Profundidade da confirmação

**O levantamento Inmetro ainda não é revisão integral de vigência nem de todos
os RTQs/RACs.** As 18 referências foram confirmadas em fontes oficiais atuais
(Portal IQ e FAQs), com requisitos reproduzidos nessas orientações. Os PDFs
SIL retornaram 503 e o DOU direto 403. Cada cartão explicita **“Referência atual ·
íntegra pendente”**; detalhes técnicos de ensaios, exclusões OEM, baixo volume
110/2022 e a cadeia integral continuam pendentes. A retificação da 145/2022 de
11/12/2024 foi conferida pontualmente nos arts. 14/15 e na referência a bronzinas;
essa evidência de trecho público não promove a íntegra do ato a revisada.
A 845/2025 e a 110/2022 não ganharam cartões ativos sem essa conferência.

As fontes da Anatel incluem textos oficiais anotados com alterações e
revogações. Atos revogados (como 950/2018, 5.159/2022 e 4.521/2021) ficam na
pesquisa, fora da consulta ativa. Exposição humana/SAR e a configuração exata
da integração automotiva ainda exigem enquadramento específico. Não se afirma
cobertura de todo o universo de produtos regulados, de todas as CONAMAs/COP,
ou de toda legislação necessária a qualquer veículo.

Cada resumo apresenta dispositivo, aplicação, trecho e acesso à fonte que o
sustenta. Normas ABNT/ISO referenciadas no ato são apontadas sem reproduzir
conteúdo não consultado ou inventar dimensões/limites de ensaio.

### Arquivos e reprodução

- `data/inmetro/` e `data/anatel/`: `reviewed-map.json`, `active.json`, CSV ativo
  e `sources/evidence.json.gz` com URLs, textos e SHA-256 das fontes oficiais.
- `data/markings/reviewed.json`: resumos dos dispositivos CONTRAN; os trechos
  correspondem aos textos preservados no inventário anterior.
- `scripts/build_certification_maps.py`: gera as duas consultas a partir das
  fontes e relações revisadas, sem buscar novas normas ou inferir vigência.
- `contran.js`: consulta compartilhada, requisitos, marcações e vínculos.
- `tests/certification-maps.test.py` e `certification-browser.py`: proveniência,
  mecanismos, atuais/revogados, relações, datas, exclusões, etiquetas, fluxo
  multimídia → fonte, teclado, celular e carga parcial/repetição.

```sh
python scripts/build_active_catalogs.py
python scripts/build_certification_maps.py
python tests/certification-maps.test.py
python tests/certification-browser.py
```

A publicação estática contém somente os conjuntos ativos; os mapas revisados e
snapshots de pesquisa ficam no GitHub. O catálogo histórico original continua
preservado, mas as referências Inmetro sem confirmação são filtradas em tempo de
execução.

## Fluxo de homologação por atividade

A aba `/#flow` substitui os quatro cartões antigos por um **diagrama navegável de
12 etapas**, com três níveis: **etapa → atividade → referência**. As frentes de
segurança, componentes e ambiental/eficiência convergem no dossiê e no CAT.
A produção segue com COP e retorno à engenharia/aprovações quando necessário.
As setas organizam o processo conceitual; não determinam precedência legal
universal entre todos os ensaios.

As etapas cobrem enquadramento, projeto/construção, preparação/amaciamento,
coastdown, laboratório, aprovações ambientais/eficiência, segurança, componentes,
dossiê, CAT, produção/liberação e COP. Cada uma contém propósito, atividades,
resultados a organizar, vínculos explícitos e lacunas; essa estrutura permite
acrescentar depois um resumo operacional por atividade sem misturar fontes de
etapas distintas.

- Clique no mapa ou escolha pela lista textual para abrir a árvore. Expanda uma
  atividade para ver normas e pendências, selecione um documento e abra seu
  detalhe/fonte. Alterações ativas conhecidas são vinculadas ao respectivo ato.
- Recortes por combustão, híbridos em conjunto, HEV, PHEV e elétrico a bateria.
  HEV/PHEV mantêm o ramo térmico pertinente e têm caminhos específicos; BEV não
  herda ensaios térmicos. É um recorte de
  consulta: categoria, combustível, fase e datas continuam necessários. O elétrico
  puro não recebe automaticamente o ramo de escapamento ou LCVM da combustão.
- Amaciamento e coastdown são separados. A preparação citada na IN 23/2020 é
  específica do ensaio OBD; não foi criada quilometragem universal. NBR 16897,
  NBR 16567 e NBR 10312 aparecem no contexto das referências localizadas, com
  seus limites explícitos; métodos integrais e edições ainda requerem revisão.
- COP é planejada desde o projeto e executada na produção. ACP da IN 5/2024
  (leves/motos) não foi universalizada para pesados P8. ISC/IUMPR são controles
  em uso apresentados em atividade distinta.
- A Portaria SENATRAN 990/2022 ganhou link direto ao PDF oficial, conferido para
  CAT, relatórios, laboratório e responsabilidade pela conformidade. A cadeia
  integral de alterações permanece pendente, sem selo de consolidação jurídica.
- Cinco orientações oficiais separam LCVM regular, quantidades limitadas,
  dispensa, alterações e importação/LPCO. O serviço atual indica Infoserv 2
  para leves/pesados; condições, exceções e diferenças perante orientações
  anteriores ficam visíveis. São orientações de serviço, não novos atos ou
  dispensa universal de elétricos.
- CAT/CCT e SISCAT têm encaminhamentos próprios, preservando a condição de SGQ
  da Portaria 990/2022. Ruído, RDE, durabilidade/FD, equipamentos obrigatórios e
  obrigações corporativas têm assuntos consultivos separados.
- URL guarda etapa, nó e powertrain; reload/histórico preservam o contexto.
  O mapa e a árvore têm controles de escala independentes; seleção textual,
  teclado, preferência por movimento reduzido e navegação móvel são suportados.

Arquivos: `flow-data.js` contém a estrutura editorial e os identificadores das
referências; `homologation-flow.js` monta o diagrama e a expansão, reaproveitando
`tree.js`. `data/flow/evidence.json.gz` preserva o texto e hash do PDF oficial
990/2022; `source-review.json` documenta vínculos e lacunas. Fontes de pesquisa
ficam no GitHub, fora dos arquivos estáticos publicados.

```sh
node --test tests/flow-model.test.cjs
python tests/flow-browser.py
```

Os testes verificam relações, recortes, junções sem preenchimento artificial,
expansão/recolhimento, documentos/alterações, CAT, lacunas, URL/reload/retorno,
controles independentes, teclado/celular, ausência de dados e retorno à árvore
preexistente.

## Navegação do veículo aos fluxogramas

Execute `python -m http.server 8000 --bind 127.0.0.1` e abra
`http://127.0.0.1:8000/#vehicle`.

Clique em um componente no desenho ou no card equivalente. A consulta abre um
fluxograma com os assuntos e referências do componente. Bancos abre Segurança;
motor e tanque oferecem caminhos separados de Segurança e Ambiental. O perfil do
veículo permanece no cabeçalho. As imagens são ilustrativas, sem modelo ou VIN.

- **Bancos:** ancoragem/cintos/apoios de cabeça, materiais e inflamabilidade,
  proteção e retenção. O ramo de espuma mostra a referência de inflamabilidade
  já cadastrada e uma lacuna explícita para normas ABNT NBR ainda não mapeadas.
- **Motor:** conformidade de componentes, emissões, OBD e catalisadores.
- **Tanque:** referência de tanques/alteração de capacidade, integridade do
  combustível no impacto traseiro e evaporativas/RVEP. A IN 26/2020 e sua
  alteração pela IN 3/2023 têm vínculos específicos; não se atribui ao tanque
  individual a proteção frontal do habitáculo. Requisitos construtivos do
  cânister continuam como lacuna.
- **Demais componentes:** fluxogramas derivados dos vínculos temáticos existentes
  na taxonomia: freios, suspensão, vidros, iluminação, carroceria, retrovisores,
  rodas, elétrica e escapamento.

As conexões organizam assuntos e não representam uma sequência obrigatória de
homologação. O acervo inclui categorias distintas de veículos; perfil visual,
componente e ramo não confirmam aplicabilidade, vigência ou requisitos técnicos.
Nenhuma norma foi inferida de PNCs, de imagens ou do catálogo ASA. Referências
legais existentes não foram substituídas por dados gerados.

Os ramos abrem por clique ou teclado. Selecionar um documento mostra resumo,
rastreabilidade e link para a fonte do acervo. Lacunas não recebem normas de
outros assuntos como preenchimento. A URL guarda componente, ramo, nó e perfil;
histórico, recarregamento e retorno ao veículo funcionam sem perder o contexto.

A vista explodida do SUV híbrido tem **37 conjuntos selecionáveis**, organizados
em **13 grupos visuais**, além do acesso textual a Identificação e marcações.
A bateria auxiliar de **12 V** e o chicote abrem Elétrica e comandos; a bateria de
tração **HV**, o motor elétrico, o inversor e seus cabos abrem o grupo de propulsão
elétrica já existente. O tanque e o tubo de combustível têm seu próprio contorno.
Essa associação serve à navegação e não amplia a aplicabilidade das referências.

A imagem geral tem zoom/reset e silhuetas sobre a mesma transformação, com
`viewBox="0 0 1536 1024"`. Desenho e alternativas textuais compartilham os mesmos
identificadores; a URL também pode guardar o conjunto em `part`. O realce acompanha
mouse e foco de teclado. A transição de tela respeita preferência por movimento
reduzido. O fluxograma tem controles próprios de zoom e enquadramento.

## Arquivos e origem dos recursos

- `catalog.json`: acervo e taxonomia preexistentes, mantidos nesta implementação.
- `vehicle-data.js`: componentes e vínculos entre assuntos e registros
  do acervo. Ligações específicas de bancos/motor/tanque citam IDs do catálogo;
  demais ramos usam sua taxonomia existente. Os conjuntos da ilustração se ligam
  aos IDs estáveis desses componentes, sem alterar as relações normativas.
- `data/vehicle-visual/source.zip`: cópia integral de
  `1-primeira_imagem_vetorizada.zip`, fornecido pelo responsável, que autorizou seu
  uso para substituir a vista explodida. O arquivo conserva o mapa, as instruções,
  as prévias e os SVGs recebidos; fica fora do artefato estático publicado.
- `assets/vehicle-vector/vehicle.svg` e `peca_*.svg`: vista atual e 37 conjuntos
  individuais, copiados sem alterar os bytes dos SVGs fornecidos. A cena é
  ilustrativa: o traçado segue os pixels visíveis da referência, não é geometria
  CAD nem fornece medidas físicas. Peças que se tocam internamente permanecem
  agrupadas; a separação dos bancos dianteiros e da carroceria é aproximada.
- `src/core/vehicle-vector.js`: dataset gerado com os 37 IDs, nomes, contornos
  originais, coordenadas globais, imagens individuais e grupos de navegação.
- `scripts/import_vehicle_vector.py`: importação determinística e validação dos
  SVGs, limites, IDs e pontos internos de interação. Usa a biblioteca padrão do
  Python e o Prettier já instalado no projeto, sem baixar dependências.
- `vehicle-navigation.js`: desenho interativo, cards, rotas e montagem dos
  fluxogramas por componente.
- `tree.js`: motor de fluxogramas já existente, reaproveitado para a nova consulta.
- `app.js`, `index.html`, `styles.css`: integração e interface responsiva.
- `assets/bancos.webp`, `motor.webp`, `tanque.webp` e demais pranchas WebP:
  ilustrações anteriores geradas por IA, mantidas para os detalhes dos subsistemas.
- `assets/image-provenance.json`: prompts, método e origem dessas 16 ilustrações
  anteriores. A origem da vista vetorial atual é o ZIP fornecido, descrito acima.
- `vehicle.png`: imagem da versão anterior, mantida para histórico do projeto,
  sem uso na nova visão do veículo. Autoria/licença não documentadas no acervo.

O ASA é referência de interação. Nenhum recurso gráfico, sessão, credencial,
catálogo comercial ou número de peça foi copiado dele. Os desenhos gerados são
conceituais; não são representações de engenharia de um Eclipse Cross nem
instruções para montagem, manutenção ou homologação.

Para reproduzir a importação após `npm ci`, ou conferir os arquivos sem regravá-los:

```sh
npm run build:vehicle
python scripts/import_vehicle_vector.py --check
node --test tests/vehicle-vector.test.cjs
```

O importador exige os 37 IDs recebidos, preserva `fill-rule="evenodd"` e verifica
que cada ponto de teste pertence somente ao seu conjunto. Rejeita scripts,
recursos externos, atributos de eventos, caminhos de ZIP inseguros e geometria
fora dos limites da imagem.

A revisão visual aplica as orientações de composição e interação da skill
[Anatomy](https://github.com/wheresryan22/anatomy/blob/main/SKILL.md): controles sem
ocultar peças, contornos no mesmo espaço do desenho, alternativas por teclado,
movimento reduzido e conferência em tamanho normal, 4× e celular. A implementação
continua sendo uma ilustração 2D fornecida pelo responsável; não é um modelo 3D.

## Testes

```sh
node --test tests/vehicle-model.test.cjs
node --check app.js
node --check tree.js
node --check vehicle-navigation.js
node --check vehicle-data.js
```

Com o servidor local em execução, Python com Playwright instalado e Chromium em
`/usr/bin/chromium`:

```sh
python tests/vehicle-browser.py
```

É possível verificar outra publicação com
`VEHICLE_TEST_URL=https://servidor/caminho/ python tests/vehicle-browser.py`.
Os testes cobrem regiões reais do SVG, limites internos/externos das rodas em
desktop, zoom e celular, zoom/reset, bancos/motor/tanque, documentos
e lacunas, retorno/histórico/URL, teclado, tela de 390 px, ausência de dados e
imagem, além das seis páginas já existentes. Capturas são salvas em
`tests/artifacts/` e não são versionadas.

## Publicação

A publicação atual usa a branch `main` de `FLeone2/legislacao-automotiva` no
Cloudflare Pages: https://legislacao-automotiva.pages.dev/. As antigas prévias
em Sites são históricas e não identificam a versão atual.

A aplicação é estática. Publique o artefato `dist` gerado por `npm run build`,
inclusive ao usar GitHub Pages. `.nojekyll` evita processamento pelo Jekyll.
A revisão do conteúdo está em `version.json`; confira esse manifesto e a UI
no endereço estável após cada implantação.

## Cobertura integral dos sistemas cadastrados

A navegação cobre **11 sistemas físicos e os 30 subsistemas definidos na taxonomia
atual do projeto**, sem subsistema ausente. Essa contagem descreve o acervo atual;
não afirma que uma taxonomia de 30 itens esgote todas as configurações possíveis
de veículos.

| Sistema do acervo             | Subsistemas com entrada visual e fluxograma                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Vidros e visibilidade         | Vidros e transparência; limpadores e lavadores; acionamento de janelas                          |
| Pneus e rodas                 | Pneus e estepe; rodas e requisitos                                                              |
| Freios e estabilidade         | Frenagem/ABS/componentes; controle de estabilidade; fluido de freio                             |
| Iluminação e sinalização      | Dispositivos e instalação; componentes de iluminação                                            |
| Proteção dos ocupantes        | Cintos/ancoragem/apoios; airbags; retenção infantil; materiais do habitáculo                    |
| Carroceria e proteção externa | Impactos e pedestres; portas/dobradiças/fechaduras; acessórios e proteção externa               |
| Retrovisores e visão traseira | Espelhos e visão indireta; monitoramento traseiro                                               |
| Propulsão e emissões          | Emissões e ensaios; propulsão elétrica/bateria; combustíveis e eficiência; componentes do motor |
| Eletrônica e comandos         | Diagnóstico/OBD; telas e imagens; comandos/sinal sonoro                                         |
| Identificação do veículo      | Placas; identificação e marcações; rotulagem e informação                                       |
| Suspensão e direção           | Componentes de suspensão e direção                                                              |

A visão geral oferece **37 conjuntos em 13 grupos visuais**, mais o acesso
textual a **Identificação e marcações**: são 14 entradas de navegação, algumas
pertencentes ao mesmo sistema do acervo. Identificação não recebe uma região
inventada na ilustração. Ao abrir um sistema, a área **Subsistemas** apresenta o
desenho com regiões clicáveis e cards textuais.
Selecionar um deles abre seu fluxograma específico, e o endereço guarda
`component`, `subsystem`, `lane`, `node` e o perfil. Voltar ao fluxograma completo
mantém o sistema.

As pranchas anteriores geradas por IA continuam nos detalhes dos **30 subsistemas**;
sua contagem e suas relações permanecem as mesmas. Essas ilustrações são recortes
de exibição SVG das pranchas correspondentes, com coordenadas explícitas em `subsystemBoards` e
`specialSubsystemArt` de `vehicle-data.js`. Os originais não são recortados nem
alterados: os SVGs recortam somente a exibição. Assim, a prancha de subsistemas e
seus recortes mostram a mesma arte. Os prompts e os
caminhos dos PNGs originais estão em `assets/image-provenance.json`.

A vista geral carrega um SVG externo com as 37 silhuetas de interação sobrepostas;
as imagens individuais dos cartões usam carregamento sob demanda. A bateria de
tração HV faz parte da cena fornecida e tem seleção separada da bateria de 12 V.

O teste `ComponentFlow.coverage()` exige zero lacunas de navegação. Ele não conta
uma norma não cadastrada como cobertura legal: uma referência ausente permanece
uma lacuna explícita no fluxograma, incluindo NBRs de espuma e o ramo ambiental
de bateria. Não há associação automática de normas de outros temas para preencher
um ramo vazio.

Além das verificações anteriores, execute:

```sh
python tests/subsystem-browser.py
```

Essa suíte percorre os 30 subsistemas, confere cada ilustração e o conjunto exato
de registros esperado, testa cliques reais nas regiões do desenho de subsistemas,
retorno, recarregamento, teclado e layout móvel. As capturas incluem freios em
vista completa e airbags na tela de subsistema.

## Organização e verificações de qualidade

O menu agrupa Explorar, Acervo normativo e Programas e acompanhamento. No celular,
o botão de navegação abre o menu; Escape fecha e devolve o foco. Há link para
pular ao conteúdo e indicação da página atual.

A aplicação continua estática, sem framework. O código de navegação e utilidades
fica em `src/core`, o armazenamento/adaptação dos atos em `src/regulations` e as
telas em `src/views`. Os módulos de modelo do veículo e homologação mantêm seus
caminhos originais. `index.html` declara a ordem de dependências.

Os registros normativos separam quatro dimensões: indicação de vigência,
profundidade da revisão, aplicabilidade ao projeto e decisão de publicação. Em
particular, os 18 registros Inmetro continuam referências oficiais com íntegra
pendente; publicá-los não confirma sua vigência integral. Os cinco atos CONTRAN
com revogação parcial mantêm a ressalva. A política dos 55 excluídos e o inventário
histórico são preservados.

Há 97 requisitos canônicos com IDs estáveis, dispositivo/orientação, fonte e contexto
compartilhados entre veículo e atividade de homologação. A relação de contexto
significa que a atividade consulta o ato; não comprova a incidência de cada
requisito. Métodos e evidências de ensaio ainda não revisados aparecem como
pendência, sem procedimento inventado.

`data/site/index.json` contém o índice inicial de aproximadamente **446 kB**,
com orçamento de 450 kB sem compressão. Cada ato completo carrega sob demanda e fica em cache na sessão. A
tela de marcações busca somente os atos necessários. Falhas exibem tentativa de
recuperação; registros excluídos não são recuperados como atos atuais por URL.
As duas fichas históricas selecionadas têm rota e aviso próprios, fora dos
filtros e contagens do acervo ativo.

### Desenvolvimento e CI

```sh
npm ci
python -m pip install -r requirements-dev.txt
python -m playwright install --with-deps chromium
npm run build:data
npm run check
npm test
npm run format:check
npm run test:browser
npm run test:a11y
npm run test:visual
npm run build
```

Os testes de navegador iniciam e encerram seu próprio servidor. Para um servidor
existente, configure `VEHICLE_TEST_URL`. `BROWSER_EXECUTABLE` permite uma substituição
local explícita; CI e baselines usam o Chromium da versão fixada do Playwright.

A suíte visual fixa as fontes Liberation Sans (licença OFL em `tests/fonts`)
para evitar substituições entre ambientes Linux. Ela compara imagens de referência de veículo/contorno da roda, fluxo
e celular, gera diferenças e aceita até 1% de pixels alterados acima da tolerância
de antialiasing (desfoque de 1 px). Testes deslocam o recorte da roda em 2 px
e o mapa em 8 px, além de uma mutação sintética, para verificar que o comparador rejeita
mudanças visíveis. Atualize imagens somente após revisão visual deliberada com
`UPDATE_VISUAL_BASELINES=1 npm run test:visual`; CI nunca atualiza baselines.
A suíte axe verifica WCAG A/AA nas principais telas e testa navegação por teclado.
Essas verificações automáticas não substituem uma auditoria completa de acesso.

`.github/workflows/ci.yml` executa geração reproduzível, contratos, sintaxe,
modelos, formatação, navegador, acessibilidade, comparação visual e build, com
permissão somente de leitura e ações fixadas por SHA. Artefatos de falha ficam
retidos por sete dias. A proteção obrigatória de branch depende das permissões e
configurações do GitHub; o workflow não a configura.

`AGENTS.md` registra arquitetura, comandos e invariantes. A skill local
`.agents/skills/revisao-normativa/SKILL.md` padroniza revisão com fontes e cenários
de avaliação, sem transformar referências ou lacunas em confirmação jurídica.
O build usa uma lista explícita de arquivos; inventários históricos, snapshots,
políticas editoriais e pesquisas brutas ficam fora de `dist`.

## Base visual Obsidian e evolução do portal

A composição original aprovada no pacote Obsidian está em `src/styles/obsidian.css`.
O refinamento atual de todo o portal usa `src/styles/portal-apple.css`, com ajustes
específicos do Guia em `src/styles/guide-apple.css`.
`src/views/aurora.js` mantém seu nome histórico e compõe a visão geral do veículo.
A navegação principal reúne Guia, Veículo, Homologação e Biblioteca; **Mais acessos e
preferências** reúne a Base regulatória, consultas por órgão, árvores, etiquetas/VIN e temas.
No celular, a navegação principal fica na base da tela.

A vista de referência 2D usa os 37 contornos originais, sem alterar coordenadas. A prévia WebP
omite somente o retângulo branco do fundo; o SVG fornecido permanece intacto.
Seleção visual e controles textuais consultam o mesmo mapa de relacionamentos.
O mapa de homologação adota a composição aprovada e mantém as árvores expansíveis
de etapas, atividades e referências do acervo real. A busca por Ctrl/Cmd+K abre
uma consulta contextual sem abandonar a seleção ou os filtros da página.

Veja [o registro de implementação](docs/obsidian-implementation.md),
[as decisões de produto](PRODUCT.md) e [o sistema visual](DESIGN.md).
O redesenho não altera legislação, estados de revisão ou dados editoriais.

## Portal consultivo

O produto agrega referências e direciona às fontes oficiais. Os vínculos entre
sistemas, subsistemas, etapas e documentos são temáticos; não constituem avaliação
automática de aplicabilidade. O novo guia gera um checklist de trabalho condicional;
a conclusão por requisito e a comprovação perante o órgão continuam dependentes da revisão técnica.

A biblioteca preserva no endereço os filtros `q`, `agency`, `component`, `stage`
e `review`, além da página de resultados (`page`). A listagem apresenta até 30
registros por página. O botão **Copiar link** permite retomar ou compartilhar a consulta,
respeitando o acesso atual do site. **Todos os níveis de revisão** distingue
revisão dirigida, referência/índice e conferência pendente; esse filtro não
certifica vigência. Os detalhes apresentam a fonte e as ressalvas disponíveis.
A biblioteca, as árvores e as exportações usam uma visão canônica por ato,
preservando aliases e relações das entradas anteriores. CSV/JSON exportam todos
os resultados filtrados, inclusive páginas não exibidas; o acervo completo tem
acesso separado. Pesquisar dentro de uma peça preserva o contexto até sua remoção
explícita. As árvores gerais e MOVER oferecem apresentação em lista, breadcrumb
e links com nó/aba persistidos na URL.

Para manutenção do acervo, use o procedimento de revisão normativa em
`.agents/skills/revisao-normativa/SKILL.md`, registre fonte/data e alterações,
regenere os dados e execute os checks antes da publicação. Atualizações visuais
não alteram a data de conferência normativa. A tela **Atualizações** reúne as
fontes, os limites de cobertura e as pendências já registradas; não monitora o
Diário Oficial automaticamente.

## Tema escuro e revisão de navegação

O padrão é **Obsidian**. O seletor **Tema**, em **Mais acessos e preferências**,
também oferece Claro e Aurora. A preferência é aplicada antes da primeira
pintura e salva neste navegador; o funcionamento com armazenamento bloqueado
continua coberto por testes. As paletas alternativas preservam sua origem no
MOVER, enquanto o padrão usa os valores aprovados no pacote Obsidian.
`src/core/theme.js` mantém a escolha independente da seleção e do zoom.

Os realces transitórios usam a cor de destaque do tema. Tanque, baterias,
bancos e rodas compartilham a mesma vista e a mesma transformação dos contornos.
Os controles de categoria e powertrain indicam perfil de consulta; sua seleção
não comprova aplicabilidade de uma norma. No celular, a categoria fica nas
preferências para manter a imagem e a seleção acessíveis.

`tests/checkup-browser.py` percorre todos os menus em computador e celular,
os 14 acessos ao veículo, seus subsistemas, as atividades do fluxo, os detalhes
dos atos dos recortes ativos e dos registros canônicos da biblioteca. Verifica
hover/foco, tanque, abas de documentos, atalhos e erros JavaScript, e grava
`tests/artifacts/full-checkup.json`. Os links oficiais exigem conferência de
alcance separada: bloqueios de portais e de rede não são prova de URL removida.

No Cloudflare Pages, a configuração esperada é comando `npm run build` e
diretório de saída `dist`. A raiz do repositório contém pesquisas e inventários
que não fazem parte do artefato estático.

`wrangler.toml` fixa o projeto existente e a saída `./dist`. O artefato `dist` é
versionado para que a integração publique a saída correta mesmo quando não
executa instalação ou build. `postinstall` também o recompila nas instalações
npm. A CI refaz `npm run build` e exige correspondência exata com a saída
versionada; `tests/publication.test.py` verifica determinismo, revisão por conteúdo
e exclusão dos arquivos de pesquisa. O build usa apenas a biblioteca padrão do
Python, sem depender dos pacotes de pesquisa ou teste.

O build gera versões por conteúdo para os scripts e estilos, regras `_headers`
para revalidar a página e `version.json` com a revisão do conteúdo publicado
(`revision`) e as revisões dos scripts e estilos. A revisão é determinística e
independe do hash do commit; o check do GitHub identifica o commit implantado.
O endereço estável é `https://legislacao-automotiva.pages.dev/`; os links
com prefixo de implantação são fotografias de uma publicação e não acompanham
novos commits. A entrega precisa ser conferida nesse endereço estável, com
`version.json` e teste no navegador; um check de deploy sozinho não comprova a UI.

Resultado da rodada anterior à implementação desta auditoria, em 19/10/2026:
11 menus, 14 acessos ao veículo,
30 subsistemas, 37 atividades, 273 atos e 298 documentos percorridos sem erros
JavaScript. As suítes funcionais incluem persistência e troca de tema, estados
do desenho, teclado, celular e armazenamento bloqueado. A auditoria axe cobre 14
rotas e detalhes em cada uma das três paletas, além da navegação móvel.
Na rodada anterior de verificação externa de 814
endereços de fontes: 65 responderam HTTP 200, 696 retornaram 403 e 53 retornaram 503. Os 749 casos sem confirmação permanecem como acesso não verificado; nenhum
404/410 foi confirmado nessa rodada. Isso não altera a revisão normativa.

## Associação entre os conjuntos vetoriais e a legislação

A seleção por peça usa `data/vehicle-legislation/reviewed-map.json`, revisado em
19/10/2026 a partir das referências já existentes. Os 37 contornos permanecem
inalterados. Cada conjunto aponta para assuntos com referências explícitas,
separadas entre **sobre o conjunto** e **contexto do veículo**. Não há herança
indiscriminada dos atos do sistema inteiro ao selecionar uma peça.

O mapa contém 88 entradas de assunto e 154 associações editoriais. O inventário
de 299 entradas documentais representa 294 atos únicos: 56 têm alguma associação
visual (19 com relação ao conjunto, 38 como contexto, com um ato em ambas) e 238 seguem
acessíveis pelos assuntos e processos do acervo, sem região visual atribuída.
Essas contagens descrevem a classificação do acervo, não sua completude jurídica.

Exemplos de delimitação:

- Porta: retenção e fechaduras; capô: proteção de pedestres no veículo.
- Vidro fixo: requisitos do vidro e contexto de marcação; acionamento de janela
  fica ligado aos conjuntos correspondentes.
- Bateria de 12 V: referência de bateria chumbo-ácido, condicionada à química;
  a referência não é transferida para o conjunto de tração. A orientação de
  importação fica em assunto próprio, separado do RAC de produto.
- Portaria com vários produtos: a árvore exibe somente os dispositivos
  associados ao assunto selecionado. O documento completo conserva seus dados.
- Radiador e chicote: lacunas explícitas, sem preencher com normas de
  catalisador, rádio ou multimídia. Uma lacuna não significa ausência de obrigação.

`src/core/vehicle-legislation.js` é o único resolvedor dessas relações para
cards, árvore, biblioteca e retorno do documento à peça. A URL conserva `part`
e o assunto em `topic`; subsistemas de outra categoria, como VIN no monobloco,
podem ser consultados sem inventar sua posição na imagem. Aliases de um mesmo
ato são agrupados nos resultados por peça, preservando os endereços antigos.

O gerador valida IDs e geometria de origem, categorias, atos publicados,
requisitos pertencentes ao ato e os trechos que fundamentam o vínculo. Não altera
publicação, vigência, profundidade de revisão ou aplicabilidade. As exclusões
editoriais e as ressalvas das referências continuam válidas.

```sh
npm run build:vehicle-map
python scripts/build_vehicle_legislation.py --check
```

`npm run build:data` também atualiza esse mapa. As saídas incluem
`src/core/vehicle-legislation-data.js` e
`data/site/vehicle-legislation-audit.{json,csv}`, com classificação dos 294 atos,
IDs canônicos, aliases e conjuntos associados. A evidência editorial completa
permanece fora do artefato público; o documento original é consultado pelos links
do acervo.

As referências de interação estão registradas em
`data/vehicle-legislation/navigation-references.json`: [RealOEM](https://www.realoem.com/bmw/enUS/partgrp?id=3A91-EUR-02-2013-F30-BMW-335i)
para contexto e relação desenho/lista; [eCFR](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-571)
para sumário e links por seção; [Baymard](https://baymard.com/blog/how-to-design-applied-filters)
para filtros visíveis e removíveis; e [W3C](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)
para expansão progressiva e teclado. São referências de navegação, sem importação
de conteúdo normativo estrangeiro nem afirmação de ranking.

A imagem exibida e as miniaturas têm derivados WebP sem perdas, renderizados dos
SVGs fornecidos; os SVGs originais e os 37 contornos continuam preservados.
`displayAsset` aponta para o derivado de pintura e `asset` para o original.
Essa separação evita redesenhar milhões de coordenadas a cada transição ou zoom,
sem alterar a composição ou a área clicável. `preview-provenance.json` registra
origens, versões, dimensões e hashes; a CI confere os arquivos comprometidos,
sem depender do renderizador nativo para publicar o site.

## Revisão dirigida de 19/10/2026

A [matriz dos 26 itens da auditoria](docs/audit-implementation-2026-10-19.md)
registra as alterações, os arquivos de evidência e os testes de aceitação.
O acervo atual reúne 274 atos nos quatro recortes de órgãos; a biblioteca
canônica soma 294 atos, incluindo o restante do acervo. Entradas documentais
legadas não são contadas como atos distintos quando representam aliases.

A Portaria GM-MDIC 68/2026 substitui a 43/2024 na consulta atual do MOVER,
conforme o índice oficial. A 43 conserva ficha histórica. A íntegra da 68,
o dispositivo e a data de efeito da revogação permanecem sem conferência
integral, sem preenchimento por inferência.

Os marcos temporais preservam dispositivo, categoria e condições e são
comparados à data da consulta. Uma data passada não transforma todo o ato
em revogado nem indica irregularidade universal. O portal mantém distintas
a publicação, a indicação legal, a profundidade de revisão e a aplicabilidade.

O [retorno do reteste, em 20/10/2026](docs/retest-implementation-2026-10-20.md)
registra a correção da síntese de licença e embarque da IN 6/2025, das notas
repetidas e dos IDs de requisitos nas exportações. LCVM, plano ambiental e PBEV
mantêm os limites de revisão; o portal continua consultivo.

### Auditoria e base para IA

A aba **Cobertura regulatória** separa cadastro, trechos normativos, orientações, revisão e pendências. O diagnóstico é reproduzível com `python scripts/build_regulatory_coverage.py` e não certifica cobertura universal.

A [Base regulatória](https://legislacao-automotiva.pages.dev/#knowledge) apresenta
294 fichas de atos e 40 fichas de fontes, além de dois candidatos separados para
revisão. As fichas registram o conteúdo disponível, fontes, qualificações e
lacunas; não representam as íntegras de todas as leis nem uma revisão integral do
acervo. O [índice Markdown publicado](https://legislacao-automotiva.pages.dev/knowledge/README.md)
é a entrada documental para pessoas e ferramentas de IA.

`npm run build:data` gera `knowledge/`: Markdown por ato/fonte, JSONL, relações,
candidatos separados e um manifesto com hashes e revisão. `npm run check:knowledge`
verifica os artefatos. Crie um SQLite FTS5 com
`python scripts/build_regulatory_knowledge.py --sqlite /tmp/homologacao.sqlite` e
consulte com
`python scripts/query_regulatory_knowledge.py --database /tmp/homologacao.sqlite --query "LCM PROMOT"`.
O SQLite é uma cópia local opcional; a publicação estática disponibiliza os
Markdown e índices estruturados. Não há API remota de consulta, PostgreSQL ou
assistente de IA conectado. A arquitetura proposta para essa expansão está em
[arquitetura-base-regulatoria.md](docs/guide/arquitetura-base-regulatoria.md), com
operação em [atualizacoes-e-operacao.md](docs/guide/atualizacoes-e-operacao.md).

O workflow de monitoramento já integra a `main`, com agenda diária às 09h17 UTC
e acionamento manual. Ele observa fontes/índices e mantém uma fila de revisão;
não publica alterações normativas automaticamente nem transforma mudanças de
HTTP ou hash em revisão jurídica. A revisão humana dos efeitos e da
aplicabilidade continua separada da coleta. Conclusões de processos salvos em
outra versão da base são sinalizadas para nova conferência, com notas e
referências preservadas.
