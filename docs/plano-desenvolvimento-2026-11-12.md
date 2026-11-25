# Plano de desenvolvimento e novo layout — 12/11/2026

Este plano transforma o escopo de 10/11 ([escopo-plataforma-2026-11-10.md](escopo-plataforma-2026-11-10.md))
e a auditoria ([auditoria-2026-11-10.md](auditoria-2026-11-10.md)) em entregas, na ordem em
que devem ser feitas, e descreve o novo layout proposto.

Proposta visual, com dez telas (seis de computador, quatro de celular):
<https://claude.ai/artifact/K8FTwVxiVq9SfZRcETazXH>. O link é privado; só abre para quem
receber acesso pelo menu Compartilhar.

## 1. Onde queremos chegar

Uma plataforma de consulta da legislação veicular em que a pessoa lê a lei inteira com os
anexos, pergunta à IA e recebe o artigo citado, clica numa peça do carro em 3D e vê os
artigos dela, e segue o roteiro de homologação do seu veículo. Tudo com origem e data
visíveis, e funcionando bem no celular.

Hoje: 269 de 294 leis têm texto completo em Markdown, mas o site ainda não mostra esse
texto; a IA busca por coincidência de palavras; o 3D não leva a nenhum artigo; e o celular
tem sobreposições.

## 2. Novo layout

### O que muda e por quê

| Hoje | Proposta | Motivo |
| --- | --- | --- |
| Fundo escuro em todas as telas | Fundo claro por padrão; tema escuro continua disponível | O uso principal é ler texto longo |
| A lei abre num painel estreito, só com resumo | Página própria da lei, com sumário, texto e contexto | Ler, citar e compartilhar um artigo |
| Quatro entradas no menu e dez rotas espalhadas | Cinco destinos: Início, Leis, Veículo 3D, Roteiro, Perguntar | Um lugar para cada tarefa |
| Um campo de busca e outro de pergunta | Um campo só no Início: número, assunto ou pergunta | A pessoa não precisa escolher a ferramenta |
| Vários avisos repetidos por tela | Uma linha de origem por página e um aviso só onde há decisão | Os avisos continuam, sem competir com o conteúdo |
| No celular, o carro aparece depois de duas telas | Carro no topo, controles abaixo dele, artigos em seguida | Nada coberto pela barra inferior |
| Clique na peça mostra uma contagem | Clique na peça mostra os artigos, com "Abrir no artigo" | É o objetivo da tela |

### Estrutura das telas

- **Início:** um campo de consulta, quatro caminhos (Leis, Veículo 3D, Roteiro, Perguntar)
  e a lista de órgãos com a quantidade de atos.
- **Leis:** filtros à esquerda (órgão, sistema do veículo, texto completo, anexos) e a
  lista à direita. Cada linha mostra se há texto completo e anexos.
- **Página da lei:** três colunas. Sumário com artigos e anexos; texto em fonte de
  leitura, com o artigo de chegada destacado; contexto com situação registrada,
  requisitos, peças do carro e etapa do roteiro. No celular vira uma coluna, com o sumário
  num botão.
- **Veículo 3D:** lista de sistemas, modelo no centro em palco escuro, painel da peça com
  os artigos. No celular: modelo, controles de vista, artigos.
- **Perguntar:** conversa à esquerda, fontes citadas à direita com o trecho do artigo.
  Cada fonte abre a lei no artigo.
- **Roteiro:** etapas numeradas à esquerda e a etapa escolhida à direita, com o que
  conferir, a lei e o artigo, e onde pedir.

### Padrões visuais

- **Cores:** fundo `#F6F7F9`, superfícies brancas, texto `#14171C`. Azul `#1D5BD8` para
  ações e seleção. Laranja (`#7A3A06` sobre `#FDF0E3`) só para atenção e pendência. O
  contraste de texto passa de 4,5:1 em todas as combinações usadas.
- **Tipografia:** Inter na interface; Source Serif 4 no texto das leis, 18 px com
  entrelinha de 1,65 a 1,7 e coluna de até 720 px.
- **Componentes:** cartões com borda fina e raio de 14 px, sem sombra; botões e alvos de
  toque com pelo menos 44 px; ícones de traço.
- **Celular:** barra inferior com os cinco destinos; ações da página em linha rolável;
  nenhum controle atrás da barra.

### O que é preservado

Endereços atuais, navegação por teclado, foco visível, movimento reduzido, alternativa em
texto para o que é visual, o modelo 3D e suas coordenadas, e a separação entre vigência,
revisão, aplicabilidade e publicação. A prancha 2D continua acessível como referência.

`PRODUCT.md` e `DESIGN.md` registram o tema Obsidian como o aprovado. Se esta proposta for
aprovada, os dois documentos precisam ser atualizados na Entrega 1.

## 3. Entregas, em ordem

Tamanho: P (pequena), M (média), G (grande). Cada entrega termina com as verificações do
projeto passando e um PR para revisão.

### Entrega 0 — Preparação (P)
- Decidir a base: esta branch, com o que for aproveitado dos PRs #8 e #17.
- Abrir um PR em rascunho para a verificação do GitHub rodar nesta branch.
- Tirar `dist/pdfs` e `dist/texts` do Git, se aprovado (hoje os PDFs estão duas vezes).
- Monitor diário: bloqueio conhecido vira aviso; erro só para mudança de conteúdo.
- Liberar o robô para abrir PR sozinho.

**Pronto quando:** a verificação do GitHub passa nesta branch.

### Entrega 1 — Esqueleto do novo layout (M)
- Arquivo único de variáveis de cor, tipo, espaço e raio; tema claro padrão e tema escuro.
- Barra superior nova e barra inferior no celular, com os cinco destinos.
- Aplicar o esqueleto às telas atuais sem mudar o conteúdo delas.
- Remover as classes CSS sem uso encontradas na auditoria.
- Atualizar `PRODUCT.md`, `DESIGN.md` e as imagens de referência dos testes visuais,
  depois da sua aprovação.

**Pronto quando:** todas as rotas atuais abrem no esqueleto novo em 320, 390, 768 e
1440 px, sem sobreposição, e a acessibilidade passa.

### Entrega 2 — Leis e página da lei (G)
- O build gera, para cada lei, um arquivo pronto para a tela a partir de `texts/`: texto,
  sumário, anexos e origem.
- Rota `#lei/<id>` e `#lei/<id>/art-2`; o endereço antigo de cada lei continua valendo.
- Página da lei conforme a proposta: sumário, artigo destacado, copiar link, PDF,
  Markdown e fonte oficial.
- Lista de leis com filtros e busca no texto completo, mostrando o artigo onde a palavra
  aparece.
- Rota desconhecida mostra uma página de "não encontrado".

**Pronto quando:** qualquer artigo abre por link no computador e no celular, com teclado
e leitor de tela.

### Entrega 3 — Acervo completo (M, em paralelo, depende de coleta)
- Importar os 25 documentos sem texto e as 15 resoluções em Word, à medida que chegarem.
- OCR dos 14 documentos digitalizados.
- Tabelas dos anexos como tabela; figuras recortadas do PDF.
- Recortar o ato nas páginas do Diário Oficial.

**Pronto quando:** 294 de 294 leis com texto completo e nenhum anexo citado sem cópia.

### Entrega 4 — IA para perguntas complexas (G)
- Índice por dispositivo (artigo, parágrafo, item de anexo).
- Busca no servidor, com sinônimos do domínio e filtros.
- Pesquisa em etapas: o modelo busca, abre artigos e lê antes de responder.
- Citação por artigo, conferida contra o texto, com link para a página da lei.
- Bateria de 30 perguntas com resposta esperada.
- Revisão de segurança da função da IA.
- Busca na internet em fontes oficiais, se o faturamento do Google for ativado.

**Pronto quando:** pelo menos 85% da bateria correta, nenhuma citação inexistente e
resposta em até 20 segundos.

### Entrega 5 — Veículo 3D → artigo (M)
- Ligar os 20 subsistemas sem requisito aos artigos, a partir do texto revisado.
- Painel da peça com lei, artigo e "Abrir no artigo"; o mesmo resultado pelo clique, pela
  lista e pela vista explodida.
- Volta da lei para a peça selecionada.
- Celular conforme a proposta.

**Pronto quando:** os 33 subsistemas mostram artigos ou uma lacuna explícita, em até dois
toques.

### Entrega 6 — Roteiro de homologação (M)
- Perfil do veículo define as etapas e os artigos de cada uma.
- Etapa com o que conferir, lei e artigo, e onde pedir.
- Ordem e pré-requisitos validados com o responsável técnico.

**Pronto quando:** dois perfis reais percorrem o roteiro sem lacuna não explicada.

### Entrega 7 — Acabamento e operação (P)
- Página de cobertura: o que tem texto, o que falta, o que foi revisado.
- Robô mensal com resumo do que mudou e aviso de mudança de hash.
- README curto; histórico movido para `docs/`.
- Limpeza das branches antigas.

### Dependências

```
0 → 1 → 2 → 4
        2 → 5 → 6
3 corre em paralelo a partir de 0
7 fecha
```

A página da lei (2) vem antes da IA (4) e do 3D (5) porque os dois precisam do endereço
de cada artigo.

## 4. Riscos

- **Coleta manual:** a Entrega 3 depende dos documentos que os sites oficiais não liberam
  para o robô.
- **Custo da IA:** a pesquisa em etapas usa mais chamadas por pergunta. O limite gratuito
  pode não bastar para uso em equipe.
- **Qualidade das tabelas e figuras:** a extração automática erra em tabelas complexas;
  as tabelas de limites precisam de conferência humana.
- **Mudança de tema:** os testes visuais comparam com imagens do tema atual e terão de ser
  refeitos de uma vez na Entrega 1.

## 5. Decisões que dependem de você

1. Aprova a direção do novo layout? O que mudaria nas telas?
2. Tema claro como padrão, mantendo o escuro como opção?
3. Base do projeto: esta branch?
4. Tirar os PDFs duplicados de `dist` do Git?
5. Ativar a busca na internet da IA (faturamento no Google)?
6. A ordem das seis etapas do roteiro está correta?
