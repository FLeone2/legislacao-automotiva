# Reteste de 19/10/2026: análise e correções

O reteste fornecido pelo responsável pelo projeto contém 19 achados: 13
correções anteriores confirmadas no recorte auditado, três aprofundamentos
parciais e três novos defeitos. Esta rodada corrige N01–N03 e preserva a
finalidade consultiva: reunir referências e encaminhar à legislação pertinente.
O portal não decide a conformidade de um veículo.

## Evidências conferidas

- PDF recebido, SHA-256:
  `ea1b0c2efb6bbe2cd89e868e9af6f5abfaa9e2e0472fb624f540a8bfde70495e`.
- ZIP recebido, SHA-256:
  `9e08c77e199c3f113606987ba979385ddaa1417f686013c55e59ce6750f1792e`.
- Os 92 arquivos relacionados no `SHA256SUMS.txt` do ZIP foram verificados;
  nenhum divergiu. O PDF interno tem os mesmos textos das 14 páginas do anexo.
- O índice, os módulos de fluxo/mapeamento e o conjunto PROCONVE da evidência
  correspondem aos arquivos do release anterior. A ficha IN 6/2025 exportada no
  reteste corresponde ao registro de `data/proconve/active.json`; sua estrutura
  difere do detalhe compilado, sem indicar divergência de publicação.
- A revisão anterior no endereço estável era
  `49e7abac959b0d6695018496846eb394079b97f31c6c3862d647d9d4c7a57d2e`.

## Correções

| Achado | Causa e alteração | Critério de verificação |
| --- | --- | --- |
| N01 — licença e embarque | A síntese de `ibama-in-6-2025:req:02` dizia “embarque prévio”. A entrada editorial agora distingue licença prévia ao embarque por operação, retirada da restrição pelo Ibama com justificativa fundamentada, flex e impedimento. | Conferência do art. 5º, I–III, no PDF oficial; testes da sequência, limites e estados de revisão; mesma síntese na tela e no JSON. |
| N02 — notas repetidas | Dois atos associados compartilhavam a mesma nota, concatenada duas vezes no resumo. A composição de tópicos e folhas elimina repetições idênticas, preservando ordem, notas distintas e todos os documentos. | Bancos dianteiros e traseiro exibem a nota uma vez e mantêm 951/2022 e 997/2023; modelo também cobre outros tópicos com notas compartilhadas. |
| N03 — IDs ausentes no CSV | A exportação lia o conjunto original, onde os IDs estavam em `requirements[].id`, sem o campo direto usado pelo CSV. JSON e CSV passam pelo mesmo payload normalizado. | IDs dos 42 atos com requisitos coerentes com o índice e ambos os formatos; CSV antes/depois de JSON e abertura de detalhes, filtro e contagem preservados. |

A fonte primária de N01 é o
[PDF oficial da IN Ibama 6/2025](https://www.ibama.gov.br/sophia/cnia/legislacao/IBAMA/2025/IN0006-30052025.pdf),
art. 5º, página 1 do arquivo / página 154 do DOU. Seu SHA-256
`d92df418c638df91581b7c50a9f0fd85a506234f8b31cb94498fae1ee586b2c3`
é igual no ZIP e no arquivo versionado. O Anexo I exige consulta ao NCM/destaque;
não se universalizou o tratamento a todas as importações de veículos. A
dispensa de licença prévia ao embarque no flex não é uma dispensa geral de LPCO.

Fontes e contornos vetoriais permanecem preservados. Os artefatos são regenerados
pelos builders existentes, sem alteração manual de conjuntos gerados. A
[skill local de revisão normativa](../.agents/skills/revisao-normativa/SKILL.md)
orienta a revisão dirigida e os limites de evidência.

## Pendências preservadas

AMB-03 (LCVM), AMB-04 (plano ambiental) e INM-03 (PBEV) continuam com os limites
registrados no reteste. Os guias e fluxos ajudam a localizar fontes; não
constituem roteiro executável por configuração, método, amostra, critério,
evidência e responsável. Não foram preenchidos métodos, edições NBR ou limites
sem fonte revisada.

Continuam abertas as revisões integrais das 18 referências Inmetro, da Portaria
MDIC 68/2026 e das cadeias e exceções ainda não conferidas. A 169/2023 mantém o
escopo voluntário, as baterias chumbo-ácido não são promovidas a baterias de
tração e L8/P8 permanecem distintos. Os 55 atos CONTRAN excluídos e o histórico
não foram reativados. A correção de N01 não promove a cadeia de alterações da IN
6/2025 a integralmente revisada.

## Validação e publicação

Comandos do release: `npm run build:data`, `npm run check`, `npm test`,
`npm run format:check`, `npm run test:browser`, `npm run test:a11y`,
`npm run test:visual` e `npm run build`.

Resultados locais:

- 56 testes JavaScript e 68 testes Python aprovados, além do verificador de
  publicação determinística. A única diferença de conteúdo nos cinco JSONs
  editoriais/gerados alterados é `ibama-in-6-2025:req:02.rule`.
- 18 suítes funcionais, incluindo N01/N02 na jornada de auditoria e N03 na
  consulta: CSV → JSON → CSV → detalhe → CSV. Foram percorridas as 11 rotas,
  14 sistemas, 30 subsistemas, 47 atividades, 274 fichas e 294 documentos.
- Axe WCAG A/AA nas 25 rotas dos três temas, mais teclado/celular: sem violações
  no recorte testado.
- Cinco comparações visuais com os baselines preservados.
- Índice inicial de 447.260 bytes, abaixo do limite de 450 kB.
- Artefato `dist` reproduzível e conferido contra fontes, mapas e recursos.
  Revisão: `524babd6e335ab84fa00788bb07bfb2a8ecbeaec052318a23d9f81a57027c5be`.

As regressões estão em `tests/importation-licensing.test.py`,
`tests/vehicle-mapping-notes.test.cjs`, `tests/catalog-consultation.test.cjs`,
`tests/audit-release-browser.py` e `tests/catalog-consultation-browser.py`.
Os relatórios de execução ficam em `tests/artifacts/`, fora do artefato público.

A entrega exige conferir o check de implantação do mesmo commit e o
`version.json` no endereço estável https://legislacao-automotiva.pages.dev/,
comparando seus recursos com o `dist`. O teste remoto deve repetir N01–N03,
os 37 alvos vetoriais, o zoom, as rotas e os três temas. Um link de preview
isolado não demonstra atualização desse endereço.
