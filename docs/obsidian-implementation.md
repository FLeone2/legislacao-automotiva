# Obsidian aprovado: implementação e revisão

## Direção confirmada

O briefing do responsável já define propósito, conteúdo, composição, cores,
tipografia, movimento e referências executáveis. Por essa instrução explícita,
não se abriu uma nova rodada de escolha visual nem de entrevista. As skills
indicadas são apoio de implementação e revisão; não substituem o design aprovado.

**Tese:** a exploração visual do veículo conduz ao mesmo acervo consultivo das
árvores, do fluxo e da biblioteca. Preservar os vínculos reais tem precedência
sobre os sete registros demonstrativos da maquete.

**Linguagem:** grafite `#0b0c0f`, superfícies `#17191e` e `#25272e`, texto
`#f5f5f7`, seleção pêssego `#ffb287`, materiais discretos apenas nos controles e
inspetores flutuantes. Fonte de sistema, sem distribuir fontes proprietárias.

**Percurso:** escolher sistema/conjunto, expandir assunto ou atividade, abrir
referência e fonte, retornar preservando veículo, rota e contexto. A busca é
uma superfície sobre a tela de origem, sem alterar seus filtros.

**Primeira tela:** margens de 64 px, cabeçalho de 116 px, título de 48 px, veículo
em primeiro plano e inspetor de 340 px. No celular, composição vertical,
navegação inferior e todos os acessos secundários pelo menu.

**Forma:** o HTML e as capturas aprovados pelo responsável são a composição
fixada; não houve sorteio, outra proposta, nova imagem de veículo ou dependência
de Figma. As árvores de atividades/legislação continuam na aplicação real.

## Referências conferidas

`Legislacao_Obsidian.html`, seis PNGs, `Obsidian_Transicoes.mp4`, `LEIA-ME.txt` e
`Verification.json`: os dez hashes correspondem ao manifesto. A baseline de
código é `87797e61a13f89683813a840758819b35237757d`. As capturas anteriores e a
exploração do protótipo foram registradas antes da mudança em área de pesquisa,
fora do `dist`.

## Adaptações ao produto real

- Os 294 atos únicos, 37 conjuntos e todas as atividades/subsistemas permanecem
  disponíveis; os números da maquete não foram copiados.
- O inspetor inclui seleção textual e assuntos reais. Em desktop, seu conteúdo
  pode rolar; no celular, cresce com o conteúdo.
- O retângulo `fundo_branco` é omitido apenas na entrada de renderização do
  preview principal. O SVG original, os 37 grupos, os caminhos, cores e
  coordenadas de seleção permanecem intactos. A receita e os hashes são
  registrados em `preview-provenance.json`.
- A composição do mapa usa as medidas de 1456 × 680 do protótipo. IDs, dados,
  frentes, convergências e retornos continuam vindo do fluxo real.
- O painel lateral de uma etapa permite selecionar atividades e consultar atos.
  A ação **Explorar a árvore** leva ao explorador original completo.
- Categoria visual fica no menu de preferências em telas pequenas; não se
  adicionaram filtros fictícios de ano-modelo ou aplicabilidade.
- Temas Claro e Aurora continuam acessíveis; Obsidian é o tema padrão Escuro.

## Skills consultadas

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill):
  hierarquia, toque e foco não encoberto; a consulta específica retornou as
  distinções WCAG AA/AAA de foco.
- [Web Design Guidelines](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md):
  semântica, teclado, estados, responsividade e preferências do usuário.
- [Apple Design e Emil Design Engineering](https://github.com/emilkowalski/skills):
  continuidade, ações interrompíveis, pressão discreta e busca imediata pelo teclado.
- [Taste](https://github.com/Leonxlnx/taste-skill): preservação de stack/conteúdo e
  comparação de capturas do antes e depois.
- [Impeccable](https://github.com/pbakaus/impeccable): acabamento, revisão do
  resultado renderizado e documentação do sistema efetivamente implementado.

## Verificação e entrega

A alteração é preparada em `feat/obsidian-approved-design`, com PR contra
`main`. Não há merge automático. A produção permanece na revisão anterior até
que o responsável faça o merge do PR e confirme a publicação correspondente.

- 56 testes JavaScript e 71 testes Python passaram.
- Os checks de dados, sintaxe, proveniência dos 38 previews e orçamento inicial passaram.
- A navegação do veículo foi conferida nos 37 contornos, em desktop/celular e zoom 100/120/240%.
- A matriz Obsidian cobre sete larguras (1600, 1440, 1024, 768, 430, 390 e 375), busca, retorno, preferências e seis checks axe de etapa/busca nas três paletas.
- A revisão independente apontou quatro correções, consideradas resolvidas; a regressão de sobreposição introduzida pelo aumento de texto também foi corrigida e aprovada. O último parecer `ship` é restrito a essa correção; não representa uma nova auditoria completa.
- Fontes: em um mesmo Chromium, o título do app e do HTML aprovado têm pilha, peso, tamanho, tracking e largura computados idênticos. A aparência dos PNGs pode variar conforme as fontes locais do sistema operacional; não se distribuiu uma fonte proprietária.

Evidências: [veículo desktop](obsidian/screenshots/vehicle-desktop.png),
[veículo móvel](obsidian/screenshots/vehicle-mobile.png),
[mapa](obsidian/screenshots/flow-desktop.png),
[etapa e árvore](obsidian/screenshots/activity-desktop.png),
[busca](obsidian/screenshots/search-desktop.png) e
[clipe real de interação](obsidian/interaction.mp4).

Os resultados finais de navegador, axe, baselines e a revisão do artefato
publicado constam do PR. As URLs de implantação são verificadas pelo conteúdo
de `version.json`, não apenas pelo indicador de deploy.

## Fases e limites da revisão visual

| Fase | Execução e evidência |
| --- | --- |
| Contexto | Inspeção do código e PRODUCT.md a partir das instruções já confirmadas. |
| Direção | Pacote Obsidian aprovado pelo responsável; não houve seed, sorteio, entrevista nem nova proposta. |
| Composição | Implementação a partir do HTML executável, CSS e PNGs aprovados, com dados reais. |
| Verificação | Matriz de sete larguras, navegação/estados, axe, checks funcionais e cinco baselines visuais. |
| Detector | Uma execução manual; achados estáticos confrontados com cascade e renderização real. |
| Revisão independente | Comparação estática das 25 capturas com o aprovado; correções reunidas em um lote. |
| Documentação | Sistema visual registrado a partir dos tokens e componentes efetivamente implementados. |

A autoridade de composição é o pacote entregue pelo responsável. Não foram
produzidos seed de direção, QUALITY BAR de competidores, hero-repro, score de
reprodução nem relatórios quantitativos de comp-diff. Não se apresentam fases
simuladas ou medições inexistentes. Os testes de regressão visual medem desvio
contra baselines revisadas do produto; não são uma pontuação de fidelidade ao
protótipo. A revisão independente citada é estática; movimento é documentado
pelo clipe real e pelos testes funcionais de preferências, sem alegar avaliação
visual independente do vídeo.

O marcador sobre a imagem identifica a seleção e é decorativo, sem interceptar
cliques nos contornos abaixo dele. A ação **Abrir referências** permanece no
inspetor e preserva o contexto. O teste de todos os 37 pontos, incluindo zoom,
impede que o marcador cubra outra peça.
