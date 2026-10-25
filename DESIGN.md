---
name: Legislação Automotiva — Obsidian
description: Sistema visual consultivo extraído da implementação aprovada.
colors:
  accent: '#ffb287'
  accent-soft: 'rgba(255, 178, 135, 0.1)'
  on-accent: '#1a0d03'
  bg: '#0b0c0f'
  surface: '#17191e'
  surface-2: '#202228'
  surface-3: '#25272e'
  ink: '#f5f5f7'
  ink-2: '#a8abb5'
  muted: '#8b8f9b'
  border: 'rgba(255, 255, 255, 0.1)'
  field-border: 'rgba(255, 255, 255, 0.24)'
  action-bg: '#f0f0f4'
  action-ink: '#15161a'
  process-blue: '#b7d3ff'
  process-green: '#b4e5cc'
  warning: '#ffb020'
  warning-soft: 'rgba(255, 176, 32, 0.15)'
  warning-line: 'rgba(255, 176, 32, 0.45)'
typography:
  display:
    fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,Arial,sans-serif"
    fontSize: '48px'
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: '-0.048em'
  title:
    fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,Arial,sans-serif"
    fontSize: '29px'
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: '-0.035em'
  body:
    fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,Arial,sans-serif"
    fontSize: '15px'
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,Arial,sans-serif"
    fontSize: '12px'
  action:
    fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,Arial,sans-serif"
    fontSize: '13px'
    fontWeight: 650
rounded:
  field: '12px'
  node: '16px'
  panel: '24px'
  capsule: '100px'
spacing:
  control-gap: '8px'
  inline-gap: '12px'
  section-gap: '18px'
  panel-inset: '24px'
  column-gap: '30px'
  page-gutter: '64px'
components:
  button-primary:
    backgroundColor: '{colors.action-bg}'
    textColor: '{colors.action-ink}'
    typography: '{typography.action}'
    rounded: '{rounded.capsule}'
    padding: '11px 18px'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-2}'
    rounded: '{rounded.capsule}'
    padding: '10px 15px'
  search-field:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    padding: '4px 0'
  navigation:
    textColor: '{colors.ink-2}'
    rounded: '{rounded.capsule}'
    padding: '5px'
  system-chip:
    textColor: '{colors.ink-2}'
    rounded: '{rounded.capsule}'
    padding: '11px 20px'
  inspector:
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '26px'
    width: '340px'
  tree-document:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    padding: '16px 30px 16px 0'
---

# Design System: Legislação Automotiva — Obsidian

## Overview

**Creative North Star: "Obsidian aprovado"**

O Obsidian aprovado organiza a consulta sobre um fundo grafite, com texto claro, seleção pêssego e superfícies discretas. A imagem técnica, as árvores, o mapa e as listas conservam sua identidade; os controles e inspetores compartilham o mesmo vocabulário visual.

O sistema usa densidade de ferramenta consultiva: títulos amplos introduzem cada vista, enquanto metadados e relações ocupam linhas compactas. O vidro aparece na navegação, nos controles flutuantes e no inspetor; listas de referências também usam superfícies planas e divisórias. Esta documentação registra o código existente, sem definir conteúdo ou critérios regulatórios.

O ambiente `#guide` segue o refinamento minimalista solicitado em 25/10/2026:
superfícies mais planas, ações azuis, perfil e árvore expansíveis no celular e
miniaturas dos conjuntos 3D. Essa extensão e suas referências Apple estão em
[frontend-apple-e-skills.md](docs/guide/frontend-apple-e-skills.md); as regras
Obsidian abaixo continuam descrevendo as consultas legadas.

A autoridade visual é o pacote Obsidian aprovado e sua implementação em HTML, CSS e JavaScript clássico. Não há uma nova direção criativa neste documento. As adaptações da maquete ao acervo real estão em [obsidian-implementation.md](docs/obsidian-implementation.md); propósito e restrições do produto estão em [PRODUCT.md](PRODUCT.md).

**Key Characteristics:**

- Fundo grafite e seleção pêssego.
- Fonte de sistema e hierarquia curta.
- Controles em cápsula; painéis de cantos suaves.
- Árvores expansíveis e alternativas textuais preservadas.
- Movimento curto, com redução conforme a preferência do usuário.

## Colors

Grafite e neutros próximos criam profundidade; pêssego destaca a seleção e os vínculos de consulta.

### Primary

- **Pêssego de seleção** (`accent`): contornos selecionados, links de consulta, foco e marcador do veículo. A área suave usa `accent-soft`.
- O botão principal usa os neutros claros `action-bg` e `action-ink`; sua ação não depende de um preenchimento pêssego.

### Secondary

- **Azul e verde do processo** (`process-blue`, `process-green`): frentes e conexões no mapa. São cores contextuais, sem classificação jurídica implícita.
- **Âmbar de aviso** (`warning`, `warning-soft`, `warning-line`): texto, fundo e linha das mensagens de atenção já presentes.

### Neutral

- **Grafite de fundo** (`bg`): plano geral.
- **Superfícies próximas** (`surface`, `surface-2`, `surface-3`): campos, grupos, nós e estados de interação.
- **Texto claro, secundário e discreto** (`ink`, `ink-2`, `muted`): hierarquia de leitura.
- **Linhas de superfície e campo** (`border`, `field-border`): separação discreta e limites dos controles.

**The Seleção legível Rule.** A seleção combina cor e estado identificável; foco e seleção são tratados separadamente.

As variáveis do frontmatter registram o Obsidian padrão. `theme-tokens.css` contém as substituições reais dos temas Claro e Aurora; a composição permanece compartilhada. Não há uma escala tonal proprietária no código e nenhuma rampa sintetizada foi acrescentada ao sidecar.

## Typography

**Display Font / Body Font:** a pilha exata do frontmatter. Não há uma família separada para títulos. O nome SF Pro Text é uma opção local da pilha; nenhuma fonte proprietária é distribuída. Os atalhos usam uma pilha de sistema menor, sem impor uma família monoespaçada.

**Character:** leitura técnica, com título compacto e peso semibold. Os valores extraídos são papéis observados, não uma escala matemática de razão fixa.

### Hierarchy

- **Display:** título da vista; medidas normativas no frontmatter. Reduz para (43px) até (1250px) e (36px) até (650px).
- **Title:** nome do sistema no inspetor. O detalhe da árvore usa (26px), entrelinha (1.16), e o painel de etapa usa (25px), entrelinha (1.15); ambos mantêm o tracking compacto (-0.035em).
- **Body:** base de leitura. Subtítulos usam entrelinha (1.6) e explicações nos detalhes podem usar (1.7).
- **Label:** filtros, sistemas e metadados usuais; informações compactas também usam (11px).
- **Action:** ação principal. Referências do inspetor usam (13px), peso (600); títulos de documentos da biblioteca usam (21px), peso (550).

A fonte resolvida e a largura dos glifos variam com o ambiente. A documentação não promete igualdade entre sistemas operacionais. Não se acrescentam fontes remotas para forçar essa igualdade.

## Layout

A aplicação tem largura máxima (1728px), centralizada. No desktop, o cabeçalho mede (116px), o gutter usa `page-gutter`, e o conteúdo começa com (34px) de espaço superior. A vista de veículo combina uma coluna fluida, intervalo `column-gap` e inspetor de (340px). Árvores e fluxos conservam seus próprios espaços de coordenadas.

O inspetor de veículo tem altura (578px), preenchimento (26px) e rolagem interna do conteúdo. O detalhe da árvore usa preenchimento `panel-inset`, posição sticky e altura ligada à janela; são variantes reais, não um único cartão universal.

| Condição real      | Mudança observada                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| A partir de 1600px | Espaço superior (42px) e área do veículo (640px).                                                                                   |
| Até 1250px         | Gutter (35px), inspetor (310px), navegação mais estreita e veículo (550px).                                                         |
| Até 900px          | Cabeçalho (84px), navegação principal inferior, painel da árvore no fluxo da página; veículo mantém coluna com inspetor de (300px). |
| Até 650px          | Gutter (23px), cabeçalho (78px), veículo e inspetor empilhados; veículo (360px), painel sem limite de altura e sem rolagem interna. |
| Até 600px          | A lista textual da árvore reduz o preenchimento para (14px).                                                                        |
| Até 380px          | Cabeçalho com padding lateral (16px) e marca menor.                                                                                 |

A navegação inferior respeita `safe-area-inset-bottom`, tem largura máxima disponível e reserva espaço no fim da página. Os acessos secundários e preferências continuam no menu. No celular, controles da composição recebem alvo mínimo (44px); controles próprios da árvore também têm regras específicas.

O veículo abre sem sistema pré-selecionado. O inspetor inicial mostra a seleção
textual; o marcador e as referências aparecem após uma escolha explícita.
Limpar a escolha retorna ao estado neutro. Os controles de zoom ficam em uma
faixa abaixo do desenho: diminuir, restaurar (100%) e ampliar. No celular,
os alvos continuam com pelo menos (44px).

O menu de sistemas usa seis colunas iguais no desktop, três até (1250px) e duas
até (650px), com textos centralizados. Os itens móveis têm altura mínima
(56px) para acomodar nomes em duas linhas sem desalinhamento.

O mapa de homologação conserva a composição (1456 × 680), com zoom, ajuste e rolagem. O painel de etapa sai da sobreposição até (900px). Isso não impõe rolagem horizontal ao texto de consulta.

## Elevation & Depth

A profundidade combina camadas tonais, linhas finas e material translúcido localizado. O fundo geral permanece grafite; o leve halo do veículo pertence à sua composição. O material usa `--material`, sua sombra usa `--material-shadow`, e o vidro aplica blur (24px) com saturação (140%). Cartões documentais e nós podem permanecer sem sombra.

### Shadow Vocabulary

- **Material flutuante:** `inset 0 1px 0 #ffffff0b, 0 12px 40px #00000018`; navegação, controles de vidro e inspetor.
- **Indicador da navegação:** `0 2px 6px #0005`; elevação curta da seleção.
- **Diálogo:** `0 30px 140px #0009`; superfície modal sobre backdrop escuro e blur (10px).
- **Ação principal:** `inset 0 1px 0 #fff`; brilho interno discreto.

**The Material localizado Rule.** Reutilizar o vidro nas superfícies que já o empregam; listas e documentos podem continuar planos.

Sem suporte a `backdrop-filter`, superfícies de vidro usam `surface`. A preferência de transparência reduzida também remove o blur dos diálogos e do backdrop. Claro e Aurora substituem material e sombra usando as variáveis já existentes.

## Shapes

Cápsulas identificam navegação, ações e sistemas. Campos têm canto `field`, nós usam `node`, e os inspetores principais usam `panel`. Outros contêineres existentes têm variações locais (20px, 22px, 25px e 26px), sem formar uma escala adicional obrigatória.

As linhas normalmente têm espessura (1px). Referências em lista usam divisórias e cantos retos; isso convive com painéis arredondados. Ícones do shell são vetores inline de (20px), com traço (1.5), reduzidos em controles compactos. A imagem técnica e seus 37 contornos não são ícones de interface e conservam os ativos fornecidos.

## Components

### Buttons

A ação principal é uma cápsula clara e tátil, com borda transparente, brilho interno e os valores do frontmatter. No hover fica branca; o texto escurece. A ação secundária é transparente, com borda neutra, passando a `surface-3` no hover. Botões recebem pressão (scale 0.975), transição de transform (120ms) e de cor/fundo/borda (180ms). Desabilitados usam opacidade (0.45) e não recebem a pressão.

O foco geral é contorno (2px) em `--focus-ring`, com afastamento (4px). Algumas áreas navegáveis da árvore usam contorno interno para mantê-lo visível.

### Chips

Os sistemas são links em cápsula, com texto secundário e alvo (44px). O selecionado usa texto de acento, preenchimento translúcido e brilho interno. Seleção e rota usam `aria-current`; estes chips não simulam filtros regulatórios inexistentes.

### Cards / Containers

O inspetor contextual usa raio `panel`, material translúcido e divisórias entre referências. O nome selecionado aparece acima do conteúdo rolável; a ação principal fica no rodapé. No celular, o painel cresce com seu conteúdo. Contadores e pequenas qualificações permanecem texto secundário, sem transformar cada linha em um novo cartão.

### Inputs / Fields

Campos comuns usam `surface`, borda `field-border` e raio `field`. A busca global é uma exceção contextual: campo sem borda dentro de uma linha com ícone, espaçamento (20px 26px), texto (21px) e indicação de foco por linha inferior interna em acento. Até (650px), usa (17px) e preenchimento (16px).

A busca abre um diálogo sobre a tela de origem, mostra resultados do mesmo acervo e restaura foco ao fechar. Entrada por teclado não espera uma animação. Não se documentam estados de erro de campo que o produto não implementa.

### Navigation

Três destinos principais compartilham cápsula e indicador deslizante. Cada link desktop mede (146 × 40px), com texto (14px); até (1250px), largura (118px). O indicador move em (320ms) com `--ease`. Até (900px), a navegação é fixa no rodapé e os links têm altura (44px). Rotas secundárias mantêm o menu próprio.

### Referência de árvore

O botão de referência mantém emissor, título, qualificação e indicação de abertura. O título usa (12px), entrelinha (1.6); a qualificação usa (11px). A linha reserva (30px) à direita para que a seta permaneça separada de títulos longos. A variante dentro da lista textual tem superfície e borda mais definidas. As expansões continuam usando botões com `aria-expanded` e agrupamentos nativos `details` quando presentes.

### Movimento e preferências

A curva reutilizada é `cubic-bezier(0.22, 1, 0.36, 1)`. A entrada do painel de etapa usa (350ms), deslocamento horizontal (25px) e opacidade inicial (0.3); ela é suprimida ao reutilizar o painel ou entrar por teclado. A busca acionada por ponteiro usa (240ms), deslocamento vertical (-8px) e escala inicial (0.985). Com movimento reduzido, animações e transições são removidas e a rolagem fica imediata.

Os sete snippets de `.impeccable/design.json` são amostras visuais autocontidas, sem navegação ou carregamento do acervo. Reutilizam os valores da implementação e incluem estados CSS. As setas vetoriais usam o SVG canônico de `src/core/icons.js`; não exigem bibliotecas externas. A amostra de referência usa esse vetor no lugar do glifo legado de abertura, sem alterar o produto.

Fontes conferidas: `index.html`, `styles.css`, `src/styles/theme-tokens.css`, `src/styles/obsidian.css`, `src/styles/tree-navigation.css`, `src/views/aurora.js`, `src/views/obsidian-search.js`, `tree.js`, `homologation-flow.js`, `src/core/icons.js` e `src/core/dom.js`. A leitura de duas capturas estáticas serviu apenas para conferir a composição; esta etapa não executou navegador, detector ou nova avaliação de movimento. O reflow de 30px consta no código; a recaptura dessa última correção fica a cargo da verificação de entrega.

Glifos legados em alguns controles e a sua substituição futura não são canonizados como vocabulário de ícones. A pilha de sistema permanece por decisão explícita do pacote aprovado. Este documento não altera código nem afirma verificação jurídica.

## Do's and Don'ts

### Do:

- Do reutilizar as variáveis semânticas para conservar Obsidian, Claro e Aurora.
- Do manter foco visível, rótulos acessíveis e indicação textual dos estados.
- Do reservar espaço para títulos longos, setas e qualificações das referências.
- Do manter o marcador do veículo decorativo e a ação de abrir referências no inspetor.
- Do conservar os vetores e coordenadas do veículo ao modificar a composição.

### Don't:

- Don't distribuir fontes proprietárias para imitar uma captura de outro ambiente.
- Don't substituir as árvores expansíveis por conteúdo demonstrativo.
- Don't tratar o pêssego de seleção ou a proximidade visual como qualificação jurídica.
- Don't aplicar a composição de veículo e inspetor a todas as telas como obrigação global.
