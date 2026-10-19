# Implementação da auditoria de 19/10/2026

Este registro acompanha os 26 itens do plano elaborado a partir do PDF
`Auditoria_Legislacao_Automotiva_2026-10-19.pdf` e do ZIP de evidências fornecidos
pelo responsável pelo projeto. A implementação mantém o portal consultivo:
associa referências a assuntos e direciona às fontes oficiais. Não decide a
conformidade de um veículo nem substitui a revisão do enquadramento.

**Estado da implementação:** validações locais concluídas em 19/10/2026.
As limitações de fonte abaixo permanecem explícitas. O artefato de publicação
é reproduzível; a revisão de conteúdo em `version.json` identifica os bytes
que devem corresponder ao endereço estável e ao commit aprovado pela CI.

## Inventário desta implementação

Contagens derivadas dos arquivos gerados, sem somar fases ou aliases como se
fossem atos distintos:

| Recorte                           |                 Quantidade | Limite da contagem                                                                           |
| --------------------------------- | -------------------------: | -------------------------------------------------------------------------------------------- |
| CONTRAN publicado                 |                   209 atos | 64 associados a sistemas físicos e 145 a categorias gerais                                   |
| PROCONVE publicado                |                    25 atos | L8: 21; P8: 7; há sobreposição entre fases                                                   |
| Inmetro publicado                 |             18 referências | 42 resumos; nenhuma das 18 íntegras foi promovida a integralmente revisada                   |
| Anatel publicado                  |                    22 atos | Recorte automotivo já existente, sem afirmação de cobertura universal                        |
| Quatro recortes de órgãos         |                   274 atos | Soma dos quatro conjuntos acima                                                              |
| Biblioteca canônica               |                   294 atos | 299 entradas documentais reconciliadas por identidade e aliases                              |
| Requisitos canônicos              |                         97 | Dispositivos e orientações com evidência própria; contexto não implica incidência individual |
| Navegação vetorial                | 37 conjuntos e 88 assuntos | Os contornos originais foram preservados                                                     |
| Associações editoriais do desenho |                        154 | Ligações por assunto; podem se repetir para o mesmo ato                                      |
| Atos associados ao desenho        |                         56 | 19 diretos, 38 de contexto, com um ato nas duas classes                                      |
| Atos sem região visual            |                        238 | Permanecem acessíveis por assuntos e processos                                               |

A fonte reproduzível dessas contagens é
[`data/site/vehicle-legislation-audit.json`](../data/site/vehicle-legislation-audit.json),
em conjunto com [`data/site/index.json`](../data/site/index.json) e os conjuntos
`data/{contran,proconve,inmetro,anatel}/active.json`. Classificar todos os atos do
acervo entre visual/não visual não significa cobrir toda a legislação necessária
a qualquer veículo. A dimensão do índice permanece sujeita ao orçamento de
450 kB sem compressão; detalhes completos e fichas históricas carregam sob demanda.

## Matriz dos 26 itens

“Implementado” descreve o comportamento ou conteúdo presente na árvore de trabalho.
As limitações de fonte são indicadas mesmo quando o encaminhamento consultivo
está implementado. Os casos de regressão relacionados abaixo foram executados.

| ID         | Implementação e evidência inspecionável                                                                                                                                                                                                                                                                                                                          | Validação executada                                                                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CON-01     | **Implementado.** A 220/2007 saiu do acervo atual; a cadeia 997/2023 → art. 8º da 951/2022 → 220/2007 registra efeito em 02/10/2023. Bancos conservam os vínculos pertinentes de cintos/ancoragens/apoios. Ficha histórica separada. Fontes: `data/contran/reviewed-effects.json`, `reviewed-consultation.json`, `historical.json`.                              | `tests/contran-consultation.test.py`, `active-regulations.test.py` e `audit-release-browser.py`: fronteira de data, histórico, ausência no atual e preservação das 55 exclusões.                                                     |
| MOV-01     | **Implementado com limite de fonte.** A Portaria GM-MDIC 68/2026 entra na consulta atual; a 43/2024 conserva histórico e remissão à sucessora. O índice oficial foi arquivado com hash em `data/mover/`; a íntegra, o dispositivo e a data de efeito não foram inferidos.                                                                                        | `tests/flow-audit-model.test.cjs`, `flow-audit-browser.py` e `audit-release-browser.py`: sucessora localizável, antiga fora do atual e limite de revisão visível.                                                                    |
| AMB-02     | **Implementado.** Combustão, HEV e PHEV compartilham o ramo térmico pertinente; HEV/PHEV têm caminhos próprios, sem transferi-los para BEV. O alias de URL de híbridos foi conservado. Fonte editorial: `flow-data.js`.                                                                                                                                          | `tests/flow-audit-model.test.cjs`, `flow-model.test.cjs` e `flow-audit-browser.py`: referências térmicas pertinentes em HEV/PHEV, ausência no ramo BEV e distinção L8/P8.                                                            |
| AMB-06     | **Implementado.** Rótulos e detalhes usam metadados reais de revisão, com escopo e data por registro. Campos desconhecidos permanecem desconhecidos; revisão dirigida não se torna consolidação integral. Fontes: `scripts/regulatory_contract.py`, `src/regulations/status.js` e mapas editoriais.                                                              | `tests/regulatory-contract.test.py`, `proconve-audit.test.py` e `audit-release-browser.py`: coerência entre dados e tela e independência dos quatro estados.                                                                         |
| UI-01      | **Implementado.** Biblioteca, árvore, contagens e exportações compartilham identidade canônica. Os cinco pares de aliases foram reconciliados, preservando relações e IDs antigos em `src/regulations/catalog.js`.                                                                                                                                               | `tests/catalog-consultation.test.cjs`, `catalog-consultation-browser.py` e `vehicle-legislation-build.test.py`: um cartão por ato, aliases válidos e contexto preservado.                                                            |
| UI-02      | **Implementado.** CSV/JSON usam todo o conjunto filtrado, incluindo páginas não exibidas; o acervo completo tem acesso separado. Exportações registram contexto, data e fonte. Implementação: `src/views/regulations.js`.                                                                                                                                        | `tests/catalog-consultation-browser.py` e `audit-release-browser.py`: 169/2023 produz uma linha, filtros combinados coincidem com a tela, múltiplas páginas e vazio não se confundem com acervo completo.                            |
| UX-05      | **Implementado.** A pesquisa mantém peça/subsistema e oferece remoção explícita do contexto. Implementação: `src/views/library.js` e `src/views/regulations.js`.                                                                                                                                                                                                 | `tests/catalog-consultation-browser.py`, `library-part-browser.py` e `audit-release-browser.py`: busca 145 em frenagem conserva o recorte; remoção, reload e voltar funcionam.                                                       |
| UX-02      | **Implementado.** A busca global é limpa ao sair da biblioteca e restaurada pela URL no retorno, sem aparentar filtrar o fluxo. Implementação: `src/core/router.js`.                                                                                                                                                                                             | `tests/tree-navigation-browser.py` e `catalog-consultation-browser.py`: ida ao fluxo, retorno e recarregamento restauram o estado correto.                                                                                           |
| AMB-01     | **Implementado com pesquisa técnica remanescente.** PDF oficial certificado da IN 26/2020 recuperado; trechos dos arts. 1–10 e do anexo revistos com a alteração do art. 6º da IN 3/2023. Famílias, evaporativas/RVEP e condições de híbridos/tanque pressurizado têm vínculos próprios. Fontes: `data/proconve/reviewed-map.json` e `sources/evidence.json.gz`. | `tests/proconve-audit.test.py`, `vehicle-legislation-build.test.py` e `audit-release-browser.py`: base/alteração acessíveis e somente os requisitos pertinentes no tanque. Métodos integrais e cadeia exaustiva continuam pendentes. |
| AMB-03     | **Implementado como orientação de serviço.** Cinco caminhos separam LCVM regular, quantidades limitadas, dispensa, alterações e importação/LPCO. IN 6/2025 recuperada em PDF oficial; o serviço atual indica Infoserv 2 para leves/pesados. Fonte: `metadata.procedureGuidance` em `data/proconve/active.json`, gerada das fontes editoriais.                    | `tests/proconve-audit.test.py`, `flow-audit-browser.py` e `audit-release-browser.py`: canais, hipóteses e fontes de cada caminho; ausência de dispensa universal de BEV.                                                             |
| CON-02     | **Implementado.** Resumos por dispositivo da 949/2022 distinguem categoria, projeto, cronograma e retificação; não declaram obrigação universal sem configuração. Fontes: `data/contran/reviewed-consultation.json` e evidências arquivadas.                                                                                                                     | `tests/contran-consultation.test.py`, `regulatory-dates.test.cjs` e `audit-release-browser.py`: datas e condições consultáveis, inclusive fronteiras temporais.                                                                      |
| AMB-05     | **Implementado.** Marcos estruturados distinguem coleta IUMPR em 2026, plano e relatório em 2027, além dos demais marcos revistos. Fase, categorias e condições acompanham as datas. Fontes: mapa PROCONVE e `src/regulations/status.js`.                                                                                                                        | `tests/proconve-audit.test.py`, `regulatory-dates.test.cjs` e `audit-release-browser.py`: coleta não se confunde com entrega; fronteiras anuais e datas passadas/futuras corretas.                                                   |
| INM-01     | **Implementado como orientação oficial.** Ofício 5/2026 ligado à importação de baterias chumbo-ácido. Condições de modelo 5 permanecem no requisito correspondente. A bateria de 12 V tem assunto próprio; não há transferência à bateria de tração. Fontes: `data/inmetro/reviewed-map.json` e mapa do veículo.                                                 | `tests/inmetro-audit.test.py`, `vehicle-legislation-build.test.py` e `audit-release-browser.py`: busca/importação/modelo 5 e escopo químico preservados.                                                                             |
| INM-02     | **Implementado.** Filamento/miniatura e exclusão de LED dos RACs citados ficam explícitos. Hotspots de iluminação preservam somente os requisitos pertinentes e encaminham ao CONTRAN. Fontes: mapa Inmetro e mapa do veículo.                                                                                                                                   | `tests/inmetro-audit.test.py`, `vehicle-legislation-build.test.py` e `audit-release-browser.py`: busca LED esclarece o escopo sem autorizar instalação por inferência.                                                               |
| INM-04     | **Implementado por trecho público revisado.** Arts. 14/15 e Anexo F/tabela 2 da retificação da 145/2022 de 11/12/2024 vinculados; ISO 4383:2000 aparece somente em bronzinas. A íntegra do ato permanece pendente. Fontes: requisitos `inmetro-145-2022:req:15` e `:16`.                                                                                         | `tests/inmetro-audit.test.py`, `regulatory-contract.test.py` e `vehicle-legislation-build.test.py`: evidência de trecho distinta de orientação, assunto próprio e ausência de novo processo inferido.                                |
| INM-05     | **Implementado com indicação da natureza da fonte.** Três marcos da transição de pneus mantêm família, laboratórios e condições da orientação oficial. Datas são comparadas à data de consulta, inclusive 23/10/2026. A FAQ não substitui a íntegra.                                                                                                             | `tests/inmetro-audit.test.py`, `regulatory-dates.test.cjs` e `audit-release-browser.py`: antes/no/depois do prazo; laboratório não acreditado e prazo de família não se confundem.                                                   |
| UX-01      | **Implementado.** Árvore enquadra o ramo selecionado e oferece apresentação em lista com controles textuais equivalentes, mantendo zoom e teclado. Implementação: `tree.js` e `src/styles/tree-navigation.css`.                                                                                                                                                  | `tests/tree-navigation.test.cjs`, `tree-navigation-browser.py`, `accessibility-browser.py` e visual: leitura em computador/celular e navegação nas duas apresentações.                                                               |
| UX-03      | **Implementado.** Árvore geral/MOVER persiste nó, aba e apresentação na URL, reconstrói ancestrais e trata ID inválido. Implementação: `tree.js` e `src/core/router.js`.                                                                                                                                                                                         | `tests/tree-navigation.test.cjs` e `tree-navigation-browser.py`: link direto, nova aba, reload, histórico e preservação do fluxo.                                                                                                    |
| UX-04      | **Implementado sem reescrever a fonte original.** Espaços e cortes editoriais foram corrigidos; trechos delimitados preservam localizador e ressalvas quando a própria fonte é incompleta. Fontes arquivadas não foram silenciosamente alteradas. Fonte editorial: mapa Inmetro.                                                                                 | `tests/inmetro-audit.test.py` e `audit-release-browser.py`: textos legíveis, proveniência e hash dos snapshots preservados.                                                                                                          |
| UX-06      | **Implementado.** Lacunas distinguem pesquisa pendente, ausência de referência específica no acervo e recorte não classificado, com data e próximo passo. Zero documentos não significa isenção. Implementação: `gapReview` no mapa do veículo e `vehicle-navigation.js`.                                                                                        | `tests/vehicle-legislation-build.test.py`, `vehicle-legislation.test.cjs` e `vehicle-legislation-browser.py`: radiador/chicote e estados vazios coerentes.                                                                           |
| AMB-04     | **Implementado no escopo consultivo.** Ruído, RDE, durabilidade/FD e obrigações corporativas têm assuntos próprios, com fontes e lacunas. Temas corporativos permanecem fora de peças. Fonte: `flow-data.js`.                                                                                                                                                    | `tests/flow-audit-model.test.cjs` e `flow-audit-browser.py`: assuntos localizáveis e L8/P8, FD/ISC/Ki e responsabilidade corporativa distintos. Não há roteiro executável completo.                                                  |
| INM-03     | **Implementado com aprofundamento pendente.** Quatro encaminhamentos PBEV preservam contexto por tecnologia e relações MOVER/ACP; a 169/2023 continua voluntária. ENCE de veículo é distinta de pneu, VIN e ETA. Fontes: mapa Inmetro e `flow-data.js`.                                                                                                          | `tests/inmetro-audit.test.py`, `flow-audit-model.test.cjs` e `flow-audit-browser.py`: nenhum PBEV atribuído como certificação de roda/bateria; métodos/edições não inventados.                                                       |
| EXT-CON-01 | **Implementado.** Resumos condicionais de 910, 752, 759 e 954 distinguem projetos, categorias, exceções e datas. O vínculo do tanque com 910 é o de integridade do combustível no impacto traseiro. Fonte: `reviewed-consultation.json`.                                                                                                                         | `tests/contran-consultation.test.py`, `regulatory-dates.test.cjs` e `vehicle-legislation-build.test.py`: dispositivos pertinentes, sem câmera de ré ou revogação integral universalizadas.                                           |
| EXT-CON-02 | **Implementado como encaminhamento.** CAT/CCT e SISCAT têm fontes de ato/serviço e condição de SGQ explícita; CCT não é tratado como obrigatório para todo fabricante. Fontes: `flow-data.js` e consulta editorial da Portaria 990/2022.                                                                                                                         | `tests/flow-audit-model.test.cjs` e `flow-audit-browser.py`: diferenças, condição e canal oficial acessíveis.                                                                                                                        |
| EXT-CON-03 | **Implementado como assunto transversal.** Equipamentos obrigatórios da 993/2023 têm atividade, resumos e condições próprias; não se cria checklist conclusivo do veículo inteiro. Fontes: `flow-data.js` e `reviewed-consultation.json`.                                                                                                                        | `tests/contran-consultation.test.py`, `flow-audit-model.test.cjs` e `flow-audit-browser.py`: tema localizável, notas e categorias preservadas.                                                                                       |
| QA-01      | **Implementado e validado localmente.** Os achados T01–T12 e a perda de contexto têm regressões executadas. As 18 suítes funcionais, a acessibilidade e o visual passaram. Marcador de rota, quebra de texto móvel e retorno após abrir documento foram corrigidos.                                                                                              | Comandos abaixo, revisão das diferenças, build `dist`, commit/deploy correspondente e `version.json` do endereço estável. A correspondência do endereço estável é conferida após o deploy, além dos testes locais.                   |

## Evidência e profundidade da revisão

- A IN 26/2020 foi recuperada em
  [PDF oficial do Ibama](https://www.ibama.gov.br/sophia/cnia/legislacao/IBAMA/2020/IN0026-18122020.pdf)
  e a IN 6/2025 em
  [PDF oficial do Ibama](https://www.ibama.gov.br/sophia/cnia/legislacao/IBAMA/2025/IN0006-30052025.pdf).
  Arquivos/textos e hashes ficam na pesquisa versionada. A recuperação do ato não
  equivale à revisão integral das normas técnicas privadas por ele referidas.
- A fonte da sucessão MOVER é o índice MDIC arquivado em
  `data/mover/sources/mdic-2026.html`, com trecho e hash no mapa editorial. O DOU
  da 68/2026 não foi recuperado integralmente nesta rodada. Não se atribui artigo
  revogador nem data de efeito desconhecidos.
- A evidência Inmetro distingue orientação oficial (`official_guidance`) de
  trecho público diretamente conferido (`public_text_excerpt`). Requisitos de
  bronzinas/retificação têm evidência própria sem transformar o ato inteiro em
  revisado. O Ofício 5/2026 continua orientação, com condições de importação.
- As novas relações do desenho são editadas em
  `data/vehicle-legislation/reviewed-map.json`; saídas de auditoria e dataset do
  navegador são gerados. Nenhum contorno vetorial foi redesenhado nesta revisão.
- Somente as fichas históricas selecionadas da 220/2007 e da 43/2024 ficam
  acessíveis por rotas históricas. Elas não entram em busca/exportação atual e
  não reativam os 55 atos retirados por política editorial.
- A skill local [Revisão normativa](../.agents/skills/revisao-normativa/SKILL.md)
  orienta os contratos de fonte, estados independentes e casos obrigatórios de
  regressão. Usar essa skill não elimina as pendências de pesquisa.

## Limitações ainda abertas

1. **Íntegras Inmetro:** os dois endereços oficiais de cada PDF da 145/2022 e
   169/2023 retornaram 503; tentativas de DOU retornaram 403 nesta rodada.
   `data/inmetro/sources/retrieval-attempts-2026-10-19.json` preserva as tentativas.
   As 18 referências continuam com íntegra não revisada; não se infere cobertura
   de exceções OEM, baixo volume ou toda a cadeia de alterações.
2. **MOVER:** o índice sustenta a sucessão 43 → 68, com limite explícito de
   profundidade. Íntegra, dispositivos e efeitos temporais da 68 não estão
   certificados nesta implementação.
3. **Normas e métodos técnicos:** não se criaram edições, limites, preparação,
   quilometragem, métodos NBR/ISO ou plano de ensaio sem fonte revisada. A menção
   à ISO 4383:2000 deriva da retificação específica, sem reprodução de seu texto.
4. **Cadeias e aplicabilidade:** a pesquisa dirigida não é consolidação exaustiva
   de todos os atos, nem monitoramento automático do Diário Oficial. Fase,
   combustível, categoria, data, configuração e exceções continuam necessários.
5. **Lacunas de conteúdo:** cânister, radiador, chicote e demais assuntos com
   pesquisa pendente não recebem normas de outro tema para aparentar completude.
   Ausência de documento no acervo não significa ausência de obrigação.

## Fechamento e reprodução do release

Executar no mesmo estado de código/fontes editoriais, revisando as diferenças
geradas antes de publicar:

```sh
npm run build:data
npm run check
npm test
npm run format:check
npm run test:browser
npm run test:a11y
npm run test:visual
npm run build
```

A suíte funcional deve cobrir as 37 seleções do desenho e os atalhos textuais,
histórico, pesquisa e exportação com contexto, cinco guias de procedimento,
árvores/listas e fluxos por powertrain. A acessibilidade e a comparação visual
complementam a verificação; não substituem uma avaliação manual integral.
Baselines só devem mudar após inspeção da diferença, nunca para ocultar falhas.

A integração Cloudflare usa `main` e publica `dist`. No endereço estável
https://legislacao-automotiva.pages.dev/, conferir a revisão de `version.json`
contra o artefato local e abrir o fluxo no navegador. O check do GitHub deve
identificar o mesmo commit implantado. Links com prefixo de implantação são
fotografias de releases; não comprovam atualização do endereço estável.

Resultados locais desta versão:

- 51 casos JavaScript, 66 casos Python e o verificador de publicação determinística aprovados.
- 18 suítes funcionais aprovadas; 11 rotas, 14 entradas de sistema, 30 subsistemas,
  47 atividades, 274 fichas regulatórias e 294 diálogos canônicos percorridos.
- 37 alvos vetoriais em computador/celular, zoom de 100/120/240% e 88 assuntos
  com vínculos explícitos conferidos; nenhum erro de JavaScript nos percursos.
- Axe WCAG A/AA em 25 rotas nos três temas, mais navegação móvel e teclado:
  sem violações no recorte testado.
- Cinco comparações visuais aprovadas com diferença de pixels de 0%; os
  baselines foram preservados. Lista e fluxo também inspecionados visualmente.
- Índice inicial: 446.956 bytes, dentro do limite de 450 kB.

Os relatórios de execução são gerados em `tests/artifacts/`, fora do artefato
público. A CI repete os comandos e exige dados e `dist` reproduzíveis. A
conferência remota compara o manifesto, os recursos e a navegação no endereço
estável após o envio do commit, incluindo os 37 cliques e os três temas.

Artefato validado nesta rodada (`dist/version.json`):
`49e7abac959b0d6695018496846eb394079b97f31c6c3862d647d9d4c7a57d2e`.
