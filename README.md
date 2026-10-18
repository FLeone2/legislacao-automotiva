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
https://legislacao-automotiva-teste.fleone.chatgpt.site/#proconve.
O código está na branch `feat/navegacao-visual-sistemas` (PR #1); `main` não foi
mesclada. A publicação preserva o acesso privado existente.

A aplicação é estática e também pode ser hospedada no GitHub Pages, com a raiz
do repositório como origem. `.nojekyll` evita processamento pelo Jekyll. A
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
