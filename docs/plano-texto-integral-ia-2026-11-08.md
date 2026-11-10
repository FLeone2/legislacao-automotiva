# Plano de trabalho — leis completas, IA, veículo e fluxo (08/11/2026)

> Substituído por [escopo-plataforma-2026-11-10.md](escopo-plataforma-2026-11-10.md). Os textos
> completos ficam em `texts/`, não em `knowledge/texts/`.

Objetivo: toda lei do acervo abre no site com o texto completo e os anexos, num formato
limpo, e existe em Markdown para a IA. A IA responde perguntas complexas citando artigos. O
veículo leva da peça ao artigo da lei. O fluxo de homologação mostra as etapas corretas, com
as leis de cada uma.

O levantamento de partida está em [levantamento-anexos-2026-11-08.md](levantamento-anexos-2026-11-08.md).
Nenhuma etapa altera situação jurídica, profundidade de revisão, aplicabilidade ou
publicação de um ato. Os 55 atos CONTRAN excluídos continuam fora.

## Diagnóstico da IA (por que ela não responde bem)

1. **Ela não tem as leis para ler.** O índice da IA (`data/ai/passages.json`) tem 434
   trechos. Destes, 294 são o resumo de uma linha de cada ficha e só 58 são trechos reais
   de lei. As cópias em PDF que completariam o texto nunca foram baixadas: o robô falhou na
   instalação (corrigido em 08/11/2026).
2. **A busca é curta e só por palavras.** O navegador escolhe no máximo 8 trechos de até
   2.400 caracteres cada, por coincidência de palavras (BM25). Uma pergunta que envolve
   duas leis, prazos e exceções não cabe nisso.
3. **O modelo é o mais leve e responde de uma vez.** O padrão é o `gemini-3.5-flash-lite`,
   com raciocínio baixo, 15 s de limite e instrução de "resposta curta". Ele não pode
   pedir mais trechos nem abrir o artigo citado.
4. **A busca na internet está desligada de propósito.** `GEMINI_WEB_SEARCH = "off"` porque
   a busca do Google (grounding) não funciona com a chave gratuita. Ela exige um projeto
   com faturamento ativo. Pela página de preços do Gemini, há uma cota mensal gratuita e
   cobrança acima dela; confira os valores na página oficial antes de ativar.

## Etapas

### 0. Coleta dos documentos
- [x] Corrigir o robô "Official PDF copies" (conflito de versão do pypdf).
- [ ] Rodar o robô no GitHub (Actions → Official PDF copies → Run workflow, branch
      `claude/stoic-pasteur-gszayh`) e revisar o PR que ele abrir.
- [ ] Ensinar o robô a baixar também os anexos publicados em arquivo separado (37 links
      CONTRAN já conhecidos; ZIP/RAR do MBST e do MBFT tratados à parte).
- [ ] Gerar automaticamente a lista do que não foi baixado (`pdfs/faltantes.csv`), com o
      link oficial de cada documento, para coleta manual.
- [ ] Receber os documentos coletados manualmente e registrá-los com URL, data e SHA-256.

### 1. Texto completo em Markdown
- [ ] Conversor PDF/HTML → Markdown estruturado: preâmbulo, artigos, parágrafos,
      incisos, alíneas, anexos e tabelas.
- [ ] Âncora estável por dispositivo (`art-2`, `art-2-p1`, `anexo-iii`) para links diretos.
- [ ] Figuras dos anexos recortadas do PDF oficial como imagem, com legenda.
- [ ] Arquivos gerados em `knowledge/texts/<id>.md`, com cabeçalho de origem (URL, data,
      hash, páginas) e estado de cada anexo: presente, separado, ausente, figura.
- [ ] Verificação automática: contagem de artigos, anexos citados × anexos presentes,
      geração determinística (`npm run build:data`).
- [ ] Começar pelas 256 leis com texto já arquivado; refazer cada uma quando chegar o PDF.

### 2. Página da lei no site
- [ ] Rota própria compartilhável: `#lei/<id>` e `#lei/<id>/art-2`.
- [ ] Sumário lateral, artigo destacado ao chegar por link, "copiar link do artigo".
- [ ] Botões: Texto completo, Resumo e requisitos, Perguntar sobre esta lei, PDF oficial,
      Markdown, Fonte oficial.
- [ ] Anexos: texto e figuras quando existirem; "cópia pendente" com link oficial quando
      não existirem.
- [ ] Lateral com situação registrada, requisitos extraídos, peças do veículo e etapa do
      processo.
- [ ] Celular: cabeçalho compacto, ações em linha rolável, sumário em gaveta.
- [ ] Teclado, foco visível, leitores de tela, movimento reduzido; testes de navegador,
      acessibilidade e visuais (baseline só após revisão).

### 3. IA para perguntas complexas
- [ ] Índice da IA a partir do texto completo, um trecho por dispositivo (artigo,
      parágrafo, anexo), no lugar dos resumos de uma linha.
- [ ] Busca no servidor (Pages Function) com termos e sinônimos do domínio, filtros por
      órgão, sistema do veículo e etapa.
- [ ] Pesquisa em etapas: o Gemini pode buscar trechos, abrir um artigo e ler uma lei
      inteira (até 3–4 rodadas) antes de responder.
- [ ] Modelo Flash (não Lite) para perguntas complexas, raciocínio médio, tempo-limite
      maior; Lite fica para perguntas simples.
- [ ] Resposta com citação por artigo e link direto para `#lei/<id>/art-N`; painel
      "Como pesquisei" com as leis e os artigos lidos.
- [ ] Busca na internet restrita a fontes oficiais e marcada "internet", **se o
      faturamento do Google for ativado**.
- [ ] Bateria de 20–30 perguntas difíceis com respostas esperadas, para medir antes e
      depois de cada mudança.

### 4. Veículo 3D → artigo da lei
A consulta por peça usa o **modelo 3D** como caminho principal. A prancha 2D continua
disponível como referência, sem receber novas funções.
- [ ] Mapa peça 3D → dispositivo a partir dos requisitos revisados (não do título da lei).
- [ ] Clique (ou seleção pela lista) destaca a peça no 3D e abre um cartão ao lado dela com
      os dispositivos de lei: lei, artigo, o que trata e "Abrir no artigo".
- [ ] "Abrir no artigo" leva à página da lei com o artigo destacado; "ver no carro", na
      página da lei, volta ao 3D com a peça selecionada (`#vehicle?part=…`).
- [ ] Funciona também na vista explodida e pela lista de componentes (teclado e leitor de
      tela), sem depender do clique no 3D.
- [ ] Preservar as coordenadas do modelo e da prancha 2D e a alternativa textual.
- [ ] Distinguir vínculo temático de requisito aplicável.

### 5. Fluxo de homologação
- [ ] Roteiro por perfil (categoria, propulsão, origem): enquadramento, ambiental
      (IBAMA/LCVM), segurança (CONTRAN), componentes (Inmetro/ANATEL), CAT (SENATRAN) e
      produção/mercado (COP, PBEV, MOVER).
- [ ] Cada etapa com o que fazer, onde pedir e as leis/artigos, com texto completo.
- [ ] Revisar ordem, pré-requisitos e frentes paralelas com o responsável técnico antes de
      publicar; preservar a separação L8/P8.

### 6. Entrega
- [ ] `npm run check`, `npm test`, `npm run format:check`, testes de navegador,
      acessibilidade e visuais.
- [ ] PR com limitações registradas e lista atualizada de documentos faltantes.

## Decisões pendentes

1. Rodar o robô de cópias no GitHub (só o dono do repositório pode).
2. Ativar ou não o faturamento do Google para a busca na internet.
3. Validar a ordem e os pré-requisitos do fluxo de homologação.
