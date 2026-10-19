# legislacao-automotiva

Protótipo público de consulta à legislação automotiva, com referências oficiais e ressalvas de validação.

## Consulta ativa CONTRAN e PROCONVE

Revisão de **18/10/2026**. Abra `/#contran` ou `/#proconve` pelo menu.

- **CONTRAN: 210 atos na consulta ativa**, 65 ligados a sistemas físicos e 145
  em categorias gerais. Os 55 históricos apontados pelo responsável foram
  retirados da publicação ativa; a decisão não foi transformada em revogação
  oficial inventada. Também ficam fora os revogados, suspensos, atos com objeto
  temporal encerrado e aqueles cujos efeitos atuais não foram confirmados.
- A conferência final encontrou a revogação expressa de 412/2012 e 433/2013 no
  art. 6º da 537/2015, apesar de o índice antigo ainda indicá-las em vigor.
  Alterações de bases suspensas também ficaram fora do conjunto ativo.
- **PROCONVE: 23 atos**, com recortes separados **L8 (19)** e **P8 (6)**; dois
  atos de avaliação técnica são comuns aos recortes. São 17 atos relacionados
  a componentes e seis em categorias de homologação/conformidade e créditos
  corporativos. PROMOT M5 e as INs 19/2021 e 22/2022, revogadas pela IN 5/2024,
  não entram nessa consulta.
- As cadeias incluem as INs 16/2025 e 20/2025: coleta de IUMPR em 2026 e
  entregas em 2027. Retificações ficam vinculadas ao ato, sem contagem duplicada.
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
403: **permanece uma lacuna entre essa atualização e 18/10/2026**. Uma cláusula
original de entrada em vigor não certifica isoladamente a vigência atual de todos
os dispositivos; as evidências e ressalvas ficam acessíveis em cada registro.

O PROCONVE cruza textos oficiais do sistema de legislação do Ibama, as Resoluções
CONAMA 490/2018 e 492/2018, alterações até 2025 e o balanço corporativo oficial
publicado pelo Ibama em 2026. As páginas gerais de legislação, desatualizadas,
não foram usadas isoladamente como prova de vigência. **O inteiro teor da IN
26/2020 não foi localizado**: sua aplicação/alteração é referenciada no art. 6º
da IN 3/2023, sem criar um registro integralmente conferido para a norma ausente.
L8 e P8 não são intercambiáveis; categoria, combustível, datas, anexos e exceções
continuam necessários para aplicar qualquer requisito a um veículo.

### Dados, rastreabilidade e reprodução

`catalog.json` conserva o acervo preexistente de 124 entradas como fonte de
histórico. A aplicação filtra suas referências CONTRAN/IBAMA e incorpora os atos
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

A publicação privada copia apenas os conjuntos ativos de `data/contran` e
`data/proconve`; fontes comprimidas, decisões de auditoria e inventários antigos
permanecem no repositório, fora da pasta estática publicada.

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

- **Inmetro: 18 referências atuais e 36 resumos de requisitos/orientações.**
  Componentes da 145/2022, vidros, rodas, líquido de freio, pneus novos e
  reformados, conversores catalíticos de reposição, retenção infantil, GNV,
  engates, PBEV/ENCE, RGCP, declaração do fornecedor, registro e selos.
  Cada cartão informa o mecanismo; declaração do fornecedor não foi apresentada
  como certificação por OCP. Baterias chumbo-ácido não foram transformadas em
  certificação de baterias de tração de íons de lítio.
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
110/2022, retificações da 145/2022 e a cadeia integral continuam pendentes.
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
- Recorte por combustão, híbrido/plug-in e elétrico a bateria. É um recorte de
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
- **Tanque:** referência de tanques/alteração de capacidade, emissões
  evaporativas/RVEP e vínculo ao diagnóstico de purga/evaporação. Requisitos construtivos do cânister continuam como lacuna.
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

A imagem geral tem zoom/reset e regiões vetoriais sobre a mesma transformação.
Desenho e cards compartilham os mesmos identificadores. O realce acompanha mouse
e foco de teclado. A transição de tela respeita preferência por movimento
reduzido. O fluxograma tem controles próprios de zoom e enquadramento.

## Arquivos e origem dos recursos

- `catalog.json`: acervo e taxonomia preexistentes, mantidos nesta implementação.
- `vehicle-data.js`: componentes, polígonos e vínculos entre assuntos e registros
  do acervo. Ligações específicas de bancos/motor/tanque citam IDs do catálogo;
  demais ramos usam sua taxonomia existente.
- `vehicle-navigation.js`: desenho interativo, cards, rotas e montagem dos
  fluxogramas por componente.
- `tree.js`: motor de fluxogramas já existente, reaproveitado para a nova consulta.
- `app.js`, `index.html`, `styles.css`: integração e interface responsiva.
- `assets/vehicle-exploded.webp`: ilustração original de um SUV genérico em vista
  explodida, gerada por IA para esta experiência. Os demais sistemas usam suas pranchas próprias, descritas na seção de cobertura.
- `assets/bancos.webp`, `motor.webp`, `tanque.webp`: três ilustrações detalhadas
  originais, geradas por IA, sem marcas ou dados de catálogo de fabricantes.
- `assets/image-provenance.json`: prompts, método e origem dos 16 recursos.
  PNGs originais foram preservados no ambiente de geração; os recursos da aplicação
  foram somente convertidos para WebP com ImageMagick, qualidade 88. As quatro imagens iniciais somavam aproximadamente 785 KiB; a ampliação
  completa e a estratégia de carregamento estão detalhadas na seção de cobertura.
- `vehicle.png`: imagem da versão anterior, mantida para histórico do projeto,
  sem uso na nova visão do veículo. Autoria/licença não documentadas no acervo.

O ASA é referência de interação. Nenhum recurso gráfico, sessão, credencial,
catálogo comercial ou número de peça foi copiado dele. Os desenhos gerados são
conceituais; não são representações de engenharia de um Eclipse Cross nem
instruções para montagem, manutenção ou homologação.

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

## Publicação de teste

A prévia privada está em
https://legislacao-automotiva-teste.fleone.chatgpt.site/#vehicle e o levantamento
em https://legislacao-automotiva-teste.fleone.chatgpt.site/#contran e
https://legislacao-automotiva-teste.fleone.chatgpt.site/#proconve. As novas frentes
são `/#inmetro`, `/#anatel` e `/#markings` no mesmo endereço.
O PR #1 foi integrado à `main`, usada na publicação pelo Cloudflare Pages. A publicação preserva o acesso privado existente.

A aplicação é estática. Publique o artefato `dist` gerado por `npm run build`,
inclusive ao usar GitHub Pages. `.nojekyll` evita processamento pelo Jekyll. A
ativação automática do Pages havia sido recusada com HTTP 403; a prévia acima
usa Sites.

## Cobertura integral dos sistemas cadastrados

A navegação cobre **11 sistemas físicos e os 30 subsistemas definidos na taxonomia
atual do projeto**, sem subsistema ausente. Essa contagem descreve o acervo atual;
não afirma que uma taxonomia de 30 itens esgote todas as configurações possíveis
de veículos.

| Sistema do acervo | Subsistemas com entrada visual e fluxograma |
| --- | --- |
| Vidros e visibilidade | Vidros e transparência; limpadores e lavadores; acionamento de janelas |
| Pneus e rodas | Pneus e estepe; rodas e requisitos |
| Freios e estabilidade | Frenagem/ABS/componentes; controle de estabilidade; fluido de freio |
| Iluminação e sinalização | Dispositivos e instalação; componentes de iluminação |
| Proteção dos ocupantes | Cintos/ancoragem/apoios; airbags; retenção infantil; materiais do habitáculo |
| Carroceria e proteção externa | Impactos e pedestres; portas/dobradiças/fechaduras; acessórios e proteção externa |
| Retrovisores e visão traseira | Espelhos e visão indireta; monitoramento traseiro |
| Propulsão e emissões | Emissões e ensaios; propulsão elétrica/bateria; combustíveis e eficiência; componentes do motor |
| Eletrônica e comandos | Diagnóstico/OBD; telas e imagens; comandos/sinal sonoro |
| Identificação do veículo | Placas; identificação e marcações; rotulagem e informação |
| Suspensão e direção | Componentes de suspensão e direção |

A visão geral oferece 14 acessos físicos/temáticos (alguns pertencem ao mesmo
sistema do acervo). Todos agora usam arte detalhada própria. Ao abrir um sistema,
a área **Subsistemas** apresenta o desenho com regiões clicáveis e cards textuais.
Selecionar um deles abre seu fluxograma específico, e o endereço guarda
`component`, `subsystem`, `lane`, `node` e o perfil. Voltar ao fluxograma completo
mantém o sistema.

Foram adicionadas **12 pranchas geradas por IA**, totalizando **16 arquivos de
imagem**. As ilustrações dos 30 subsistemas são recortes de exibição SVG das
pranchas correspondentes, com coordenadas explícitas em `subsystemBoards` e
`specialSubsystemArt` de `vehicle-data.js`. Os originais não são recortados nem
alterados: os SVGs recortam somente a exibição. Isso mantém a coerência entre a
vista do sistema e as miniaturas/detalhes dos seus subsistemas. Os prompts e os
caminhos dos PNGs originais estão em `assets/image-provenance.json`.

Os 16 WebPs somam aproximadamente 2,9 MiB; imagens dos cards usam carregamento
sob demanda. A imagem geral permanece uma ilustração genérica de referência, com
entrada auxiliar identificada para a bateria elétrica.

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

Há 60 requisitos com IDs estáveis, dispositivo/orientação, fonte e contexto
compartilhados entre veículo e atividade de homologação. A relação de contexto
significa que a atividade consulta o ato; não comprova a incidência de cada
requisito. Métodos e evidências de ensaio ainda não revisados aparecem como
pendência, sem procedimento inventado.

`data/site/index.json` contém o índice inicial de aproximadamente **416 kB**, ante
1,55 MB dos cinco JSONs anteriores (redução de cerca de **73%**, bytes sem
compressão). Cada ato completo carrega sob demanda e fica em cache na sessão. A
tela de marcações busca somente os atos necessários. Falhas exibem tentativa de
recuperação; registros excluídos não são recuperados por URL.

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

## Tema anterior · Liquid Aurora

O tema anterior foi implementado em `src/styles/aurora.css` e `src/views/aurora.js`.
A entrada padrão abre o veículo com o painel de sistemas e subsistemas. O botão
**Explorar fluxograma** abre a árvore do componente; todas as rotas anteriores
continuam disponíveis. O controle **Liquid Aurora** suaviza os reflexos.

As 16 imagens e os contornos de `vehicle-data.js` permanecem originais. A prancha
técnica recebe um fundo claro azulado dentro do tema escuro para preservar sua
leitura. Nenhuma nova montagem de carro foi adotada. Os dados normativos,
requisitos e ressalvas permanecem os mesmos.

O tema também cobre biblioteca, consultas por órgão, etiquetas/VIN, árvores,
fluxo de homologação e diálogos. A suíte `tests/aurora-browser.py` verifica seleção
por imagem, 14 entradas, subsistemas, fontes, busca e navegação móvel. Os baselines
visuais foram revisados para o tema aprovado.

## Portal consultivo

O produto agrega referências e direciona às fontes oficiais. Os vínculos entre
sistemas, subsistemas, etapas e documentos são temáticos; não constituem avaliação
automática de aplicabilidade nem um checklist operacional de homologação.

A biblioteca preserva no endereço os filtros `q`, `agency`, `component`, `stage`
e `review`, além da página de resultados (`page`). A listagem apresenta até 30
registros por página. O botão **Copiar link** permite retomar ou compartilhar a consulta,
respeitando o acesso atual do site. **Todos os níveis de revisão** distingue
revisão dirigida, referência/índice e conferência pendente; esse filtro não
certifica vigência. Os detalhes apresentam a fonte e as ressalvas disponíveis.

Para manutenção do acervo, use o procedimento de revisão normativa em
`.agents/skills/revisao-normativa/SKILL.md`, registre fonte/data e alterações,
regenere os dados e execute os checks antes da publicação. Atualizações visuais
não alteram a data de conferência normativa. A tela **Atualizações** reúne as
fontes, os limites de cobertura e as pendências já registradas; não monitora o
Diário Oficial automaticamente.


## Tema escuro e revisão de navegação

O tema atual usa os tokens Escuro OLED / Cobre de
`FLeone2/mover-saas/src/mover/web/static/themes.css`, adaptados em
`src/styles/mover-dark.css`. O arquivo `aurora.css` mantém o layout responsivo,
sem a pintura Liquid Glass. As imagens originais não foram alteradas.

Os realces do veículo são transitórios (mouse ou teclado), com uma única cor.
A seleção continua no painel e nos cartões. O tanque usa contornos extraídos da
imagem exibida em vez de um retângulo sobre a prancha. Os seletores visuais de
perfil, que não filtravam a legislação, e o controle decorativo de tema foram
retirados da interface; URLs anteriores continuam compatíveis.

`tests/checkup-browser.py` percorre todos os menus em computador e celular,
os 14 acessos ao veículo, seus subsistemas, as atividades do fluxo, os detalhes
dos 273 atos dos recortes ativos e os 298 registros da biblioteca. Verifica
hover/foco, tanque, abas de documentos, atalhos e erros JavaScript, e grava
`tests/artifacts/full-checkup.json`. Os links oficiais exigem conferência de
alcance separada: bloqueios de portais e de rede não são prova de URL removida.

No Cloudflare Pages, a configuração esperada é comando `npm run build` e
diretório de saída `dist`. A raiz do repositório contém pesquisas e inventários
que não fazem parte do artefato estático.

Resultado da checagem de 19/10/2026: 11 menus, 14 acessos ao veículo,
30 subsistemas, 37 atividades, 273 atos e 298 documentos percorridos sem erros
JavaScript. As nove suítes funcionais, os testes de dados/modelos e a auditoria
axe nas rotas principais e detalhes passaram. Na verificação externa de 814
endereços de fontes: 65 responderam HTTP 200, 696 retornaram 403 e 53 retornaram
503. Os 749 casos sem confirmação permanecem como acesso não verificado; nenhum
404/410 foi confirmado nessa rodada. Isso não altera a revisão normativa.
