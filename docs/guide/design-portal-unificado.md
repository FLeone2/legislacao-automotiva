# Direção visual do portal unificado

A solicitação posterior ao refinamento do Guia estende sua linguagem visual a todas as áreas do portal. A direção desta etapa passa a ser compartilhada: fonte de sistema, hierarquia de leitura, ações azuis, superfícies planas e espaço entre assuntos. As descrições anteriores de Obsidian em `DESIGN.md` registram a origem do produto; o pedido atual amplia o escopo que antes estava limitado a `#guide`.

As referências verificadas, commits, licenças e limites de uso das skills permanecem em [frontend-apple-e-skills.md](frontend-apple-e-skills.md). Esta etapa reutiliza essa leitura de `frontend-design`, `webapp-testing`, Impeccable e das referências de design Apple. Não instala plugins, executa o launcher Impeccable nem distribui fontes ou símbolos proprietários da Apple.

## Composição compartilhada

`src/styles/portal-apple.css` complementa os estilos estruturais existentes. Deve carregar depois de `obsidian.css` e antes de `guide-apple.css`, para que o Guia conserve seus refinamentos específicos. O cabeçalho, a navegação, o menu, a busca e os diálogos passam a compartilhar o mesmo acabamento em todas as rotas. O conteúdo das consultas usa seletores que excluem `.guide-mode`.

Os tokens novos `--p-*` descrevem fonte, ação, link, foco, superfícies e divisórias. Os temas Obsidian, Claro e Aurora permanecem selecionáveis. A cor de uma ação não altera a qualificação regulatória de um registro. Os tokens originais de seleção do modelo não são redefinidos por esta camada.

| Área | Apresentação |
| --- | --- |
| Guia | Preserva o workspace aprovado, perfil, árvore, checklist, fluxo e cobertura. |
| Veículo | Consulta 3D e referência 2D com controles textuais; seleção e referências conservam sua relação. |
| Homologação | Etapas e conexões mantêm coordenadas e topologia; controles, seleção e detalhe recebem superfícies planas. |
| Biblioteca e consultas por órgão | Títulos diretos, filtros agrupados e atos apresentados em linhas com divisórias. |
| Base regulatória | Busca em atos e fontes, candidatos em coleção separada, fichas Markdown, proveniência e arquivos para IA. |
| Árvore regulatória e MOVER | Expansões, lista alternativa, breadcrumb e painel de detalhe permanecem disponíveis. |
| Etiquetas e VIN | Assuntos separados por seções; requisitos, fontes e ressalvas continuam explícitos. |
| Histórico, procedimentos e revisões | Leitura com medida confortável, fontes próximas e avisos de escopo visíveis. |
| Busca, documento e consulta assistida | Diálogos nativos com rolagem própria, foco visível e estado de disponibilidade preservado. |

Os cabeçalhos novos podem usar `.portal-header`, `.portal-title`, `.portal-eyebrow`, `.portal-summary` e `.portal-actions`. Árvores e mapas também usam `.portal-page-heading`. A faixa `.portal-context-card` reúne contexto e próximos destinos sem simular uma aprovação. A barra `.portal-context-bar` apresenta somente o processo de referência e o caminho para continuá-lo; sua apresentação respeita o atributo nativo `hidden`.

As imagens `.portal-model-preview` vêm dos conjuntos exportados do modelo, com legenda, atribuição e limites. Os componentes gráficos preservam as condições registradas pelo exportador. Uma miniatura, associação temática ou seleção de peça não equivale a uma evidência de ensaio ou declaração de aplicabilidade.

## Leitura e interação

Os títulos de página seguem a mesma família de sistema do Guia. Atos e explicações usam corpo de 14 pixels e entrelinha ampla; metadados têm pelo menos 12 pixels nas principais superfícies consultivas. Identificadores e qualificações compactas mantêm papéis próprios. O texto pode quebrar em títulos, URLs e trechos oficiais longos.

Os controles principais possuem alvo mínimo de 44 pixels. No celular, os filtros passam a uma coluna e a navegação inferior reserva espaço para a área segura do dispositivo. Árvores e mapas conservam sua rolagem local; o texto de consulta deve caber na largura da página. As imagens usam proporção própria e não recortam a peça para preencher um cartão.

Foco e seleção são estados separados. O foco recebe contorno azul contrastante; avisos jurídicos conservam sua indicação textual e sua paleta de atenção. Movimento reduzido remove a resposta de pressão e as transições da nova apresentação. Transparência reduzida torna a navegação opaca; maior contraste reforça divisórias e sublinhados. A camada não oculta pendências, fontes, exceções, avisos ou qualificações para simplificar a tela.

## Verificação e entrega

A validação deve observar as rotas da tabela em desktop e em 390/320 pixels, nos três temas, verificando leitura, overflow, menu, foco, busca, filtros, paginação, diálogos, expansões e URLs compartilháveis. O Guia exige uma verificação de regressão de suas jornadas aprovadas. O novo explorador de veículo também precisa demonstrar a correspondência entre seleção textual, modelo e referência.

As capturas devem vir do site real e manter a navegação e os avisos visíveis. Os testes de acessibilidade continuam usando a suíte do projeto; nenhuma baseline deve ser atualizada apenas para encobrir uma diferença. Os comandos de validação e build permanecem os registrados em `AGENTS.md`. Os resultados executados são registrados na entrega, separadamente deste documento de direção; o documento não afirma uma auditoria completa de acessibilidade ou de homologação.
