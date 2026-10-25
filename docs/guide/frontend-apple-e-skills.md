# Frontend consultivo e referências de design

A direção desta etapa segue a preferência do responsável por interfaces no estilo Apple: hierarquia clara, fonte de sistema, espaços bem definidos, controles familiares e superfícies discretas. O desenho 3D aprovado continua sendo o elemento visual principal. O refinamento se limita ao ambiente `#guide`; as decisões anteriores sobre as consultas legadas continuam documentadas no `DESIGN.md` do repositório.

O guia combina dois usos: operar um processo e ler evidências. A expressão visual deve ajudar a localizar a próxima ação, entender um estado e voltar à fonte. A área de cobertura mostra o alcance e os limites do acervo. Um número de registros ou uma correção aplicada não se transforma em selo de conformidade do veículo.

## Skills verificadas

As referências abaixo foram lidas na origem em **25 de outubro de 2026**. Os links estão fixados nos commits consultados. Elas foram usadas como orientação de implementação e revisão; não foram instaladas no catálogo de skills do executor. Os instaladores e binários dessas skills não foram executados. A formatação e a validação usam as dependências já previstas no projeto.

| Referência | Uso nesta implementação | Origem e licença verificadas |
| --- | --- | --- |
| **frontend-design**, Anthropic | Direção a partir do produto, hierarquia, conteúdo real, tipografia e contenção visual | [SKILL.md](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design/SKILL.md) · [Apache-2.0 da skill](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design/LICENSE.txt) |
| **webapp-testing**, Anthropic | Reconhecimento do DOM renderizado, jornadas reais, screenshots, logs e encerramento dos contextos Playwright | [SKILL.md](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/webapp-testing/SKILL.md) · [Apache-2.0 da skill](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/webapp-testing/LICENSE.txt) |
| **Impeccable 4.7.1**, pbakaus | Referências de `audit`, `polish`, modo Operate/Read e craft-floor: revisão técnica e visual do caminho completo | [SKILL.md](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/.agents/skills/impeccable/SKILL.md) · [Apache-2.0](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/LICENSE) |
| **apple-design**, Emil Kowalski | Fonte de sistema, resposta imediata, continuidade espacial, materiais contidos e acessibilidade | [SKILL.md](https://github.com/emilkowalski/skills/blob/2d228630ba1446365f614a108cb8252f1feda202/skills/apple-design/SKILL.md) · [MIT](https://github.com/emilkowalski/skills/blob/2d228630ba1446365f614a108cb8252f1feda202/LICENSE) |
| **react-flow**, framara | Referência para evolução do fluxo, seus controles, acessibilidade e desempenho | [SKILL.md](https://github.com/framara/react-flow-skill/blob/b060a63f9dd8ee08b1100fc8a23877173b66fc95/SKILL.md) · [MIT](https://github.com/framara/react-flow-skill/blob/b060a63f9dd8ee08b1100fc8a23877173b66fc95/LICENSE) |

`apple-design` é uma interpretação independente de palestras da Apple para a web, sem vínculo de autoria ou certificação da Apple. A referência React Flow foi revisada pelo autor contra a versão 12.12.0; este projeto utiliza `@xyflow/react` 12.9.3. Uma API deve ser conferida nas declarações da versão instalada e na [documentação oficial](https://reactflow.dev/llms.txt) antes de ser adotada.

O guia **Web Design Guidelines**, da Vercel Labs, também foi localizado. A licença não foi identificada na referência inspecionada; seu conteúdo não foi incorporado como material licenciado do projeto por suposição.

### Como as referências foram aplicadas

O launcher Impeccable não está disponível neste executor. Seu carregamento de contexto e detector binário não foram executados. Foi seguido o caminho documentado de leitura direta de `PRODUCT.md`, `DESIGN.md` e da implementação, com consulta às referências [polish](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/.agents/skills/impeccable/reference/polish.md), [audit](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/.agents/skills/impeccable/reference/audit.md), [Operate/Read](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/.agents/skills/impeccable/reference/operate.md) e [craft-floor](https://github.com/pbakaus/impeccable/blob/3671d50f0ac9a662ce0615e85a256110c9cd720b/.agents/skills/impeccable/reference/craft-floor.md). Não há resultado de detector nem pontuação automática de design atribuída a esta etapa.

As instruções do responsável e as restrições do repositório orientam a aplicação das referências. Por exemplo, a fonte de sistema foi escolhida para este ambiente de consulta, e os avisos e rótulos de significado regulatório mantêm sua presença. O workflow de testes do projeto continua responsável por seu próprio servidor; não se adicionou outra dependência para substituir esse mecanismo.

## Fontes oficiais da Apple

Foram conferidas as páginas e os documentos de dados oficiais que sustentam estas referências:

- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/).
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography): legibilidade, hierarquia e ênfase. [Documento consultado](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json).
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): inclusão e alternativas de interação. [Documento consultado](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json).
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials): profundidade e hierarquia funcional. [Documento consultado](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json).
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout): adaptação entre tamanhos e contextos. [Documento consultado](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json).
- [Designing Fluid Interfaces, WWDC18](https://developer.apple.com/videos/play/wwdc2018/803/): resposta e continuidade das interações.

Essas fontes são referências de design, não uma licença para distribuir fontes, ícones ou outros ativos proprietários da Apple. A implementação usa a pilha de fontes de sistema e os ícones SVG já presentes no projeto.

## Implementação

`src/styles/guide-apple.css` define o refinamento visual depois dos estilos existentes. Seus seletores são limitados a `#app.guide-mode`. O arquivo mantém as paletas selecionadas pelo usuário e acrescenta neutros próprios para superfícies, texto secundário, limites de campos e foco visível. O 3D conserva suas malhas, poses, coordenadas, renderização e controles.

A composição usa:

- Títulos com peso e escala legíveis, texto de sistema e medidas de leitura próximas de 70 caracteres.
- Navegação por áreas com estado selecionado explícito e adaptação das linhas em telas estreitas.
- Controles arredondados, campos com espaço de toque e foco de alto contraste.
- Separação por proximidade, linhas discretas e espaços entre assuntos; a informação não depende de efeitos de vidro.
- Resposta curta aos comandos e respeito à redução de movimento, transparência e aumento de contraste.
- Valores tabulares para contagens e fontes junto dos achados.

No refinamento seguinte, a apresentação do guia e de sua navegação recebeu superfícies planas, ações em azul, títulos diretos e menos contêineres sobrepostos. No celular, o perfil do processo fica em uma expansão nativa com resumo do veículo; a árvore possui sua própria expansão, busca sempre disponível e atalho para a seleção. Os campos, opções, avisos e vínculos permanecem acessíveis. No computador, o perfil continua aberto. O objetivo é trazer o veículo para a primeira tela sem retirar informações do processo.

O painel da seleção apresenta uma imagem derivada das malhas reais do modelo, com legenda, escopo e atribuição. A referência histórica 2D permanece disponível em uma expansão separada. A imagem de exemplo não substitui uma evidência de ensaio nem estende a associação jurídica a componentes ausentes da captura; os detalhes de cada exportação constam no inventário das miniaturas.

`src/guide/RegulatoryCoverage.jsx` carrega `data/process/regulatory-coverage.json` sob demanda. A tela possui carregamento, erro recuperável, repetição da consulta, busca, filtros de prioridade e situação, tabela por órgão, vínculos por subsistema e acesso ao índice Markdown e ao inventário para IA.

As contagens distinguem trechos de atos públicos de orientações oficiais. O total de itens estruturados não é apresentado como quantidade de obrigações aplicáveis. A data indica a geração do diagnóstico; cada fonte conserva seu próprio escopo e sua própria conferência. As dimensões de publicação, situação jurídica, profundidade de revisão e aplicabilidade continuam independentes.

O bloco **Observação das fontes** apresenta a rodada de acesso HTTP, suas tentativas e os resultados de transferência. Suas contagens são de URLs, não de leis faltantes ou de atos integralmente revisados. A nota operacional informa a condição de ativação do agendamento no GitHub e permanece visível junto dos resultados e do snapshot.

## Validação

A revisão deve observar computador, larguras intermediárias e celular, temas disponíveis, foco de teclado, expansão de assuntos, troca de abas, filtros, fonte indisponível e repetição da consulta. A visualização tem de conservar o acesso aos avisos, às lacunas e às fontes em todas essas situações.

Os comandos de check, testes, navegador, acessibilidade, visual e build continuam os definidos em `AGENTS.md`. Nenhuma baseline deve ser atualizada para encobrir uma regressão. Os resultados efetivamente executados e suas limitações são registrados na entrega; este documento não equivale a uma auditoria completa de acessibilidade ou de homologação.

A verificação isolada desta superfície usou uma fixture explicitamente identificada como dados de teste, nos três temas e em larguras de 1440, 768, 390 e 320 pixels. Passaram carregamento com falha HTTP 503 seguido de repetição, busca, filtros, estado vazio e ausência de overflow. Nos 12 cenários não houve erro JavaScript nem violação axe na área testada. Essa verificação não substitui a integração com o diagnóstico real, a suíte completa do portal ou o teste dos equipamentos físicos.

A verificação integrada foi acrescentada em `tests/regulatory-coverage-browser.py`, comparando as contagens e os achados ao JSON de origem. Passaram os filtros, a repetição após HTTP 503, os links da base e do relatório, o bloco de observação das fontes e o retorno a um subsistema mantendo o segundo projeto selecionado e sua etapa. Um registro legado concluído permaneceu pendente de revalidação após editar a nota; o comando explícito de conferência gravou a revisão atual e preservou a evidência. Nos três temas, em desktop e em 390/320 pixels, não houve overflow, erro JavaScript ou violação axe nessa jornada. Os testes não certificam a cobertura jurídica do acervo.

O refinamento visual foi registrado em capturas reais de antes e depois, nos temas claro e escuro, em 1600 × 1100, 390 × 844 e 320 × 740 pixels. Foram conferidos a primeira tela, o veículo e a seleção de freios, com quatro capturas adicionais da imagem e de sua legenda no celular. Os registros dessa captura não apresentaram erro JavaScript nem overflow horizontal; uma revisão visual independente não identificou bloqueio prioritário. A navegação fixa foi mantida nas imagens. As capturas e os metadados de execução foram entregues como artefatos, sem alterar baselines. Esses resultados visuais são distintos dos testes de teclado e de acessibilidade da suíte do projeto.
