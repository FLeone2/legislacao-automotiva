# Escopo da plataforma — verificação e caminho (10/11/2026)

Este documento substitui o plano de 08/11 como referência de trabalho. Ele registra o
objetivo final, o que foi verificado até hoje, os defeitos encontrados e as fases para
chegar lá, com critério de pronto em cada uma.

## 1. Objetivo final

Uma plataforma de consulta da legislação veicular brasileira (CONTRAN/SENATRAN,
IBAMA/CONAMA, Inmetro, ANATEL e MOVER) em que a pessoa:

1. **Lê a lei inteira** no site, com os anexos, em texto limpo, e chega a um artigo por
   link direto.
2. **Pergunta à IA** em português, inclusive perguntas que cruzam leis, prazos e
   exceções, e recebe a resposta com o artigo citado e o link para ele.
3. **Clica numa peça do carro em 3D** e vê os artigos de lei daquela peça.
4. **Segue o roteiro de homologação** do seu tipo de veículo, etapa por etapa, com as
   leis de cada etapa.
5. **Confia no que lê**: todo texto mostra de onde veio (endereço oficial, data, hash), o
   que foi revisado e o que não foi, e funciona bem no celular.

O que a plataforma **não** faz: não certifica vigência nem substitui o Diário Oficial ou
um parecer jurídico. Ela mostra a cópia oficial, a data da cópia e a situação registrada,
e aponta para a fonte.

### Como saber que chegamos

| Área | Meta | Hoje |
| --- | --- | --- |
| Texto completo | 294 de 294 atos | **269** |
| Anexos publicados à parte | todos copiados e legíveis | 44 arquivos de 40 atos; 14 documentos precisam de OCR |
| Artigos com link direto | todos | 6.145 artigos e parágrafos endereçáveis |
| IA | ≥ 85% de acerto numa bateria de 30 perguntas difíceis, sem citação inventada | ver seção 3.2 |
| Veículo 3D | 33 de 33 subsistemas com artigos ou lacuna explícita | 13 com trechos; 20 sem requisito |
| Requisitos estruturados | cobrir os atos de segurança, emissões e componentes | 98 requisitos para 294 atos |
| Celular | carro e ação principal na primeira tela; nada sobreposto | ver seção 3.4 |
| Atualização | robô mensal abre PR com o que mudou | robô funcionando; PR automático bloqueado no GitHub |

## 2. Verificação — o que está feito e conferido

Tudo na branch `claude/stoic-pasteur-gszayh`.

| Entrega | Situação | Como foi conferido |
| --- | --- | --- |
| Levantamento de íntegras e anexos | Feito | Detector + conferência manual dos casos duvidosos |
| Robô de cópias oficiais | Corrigido e executado no GitHub | 3ª execução: 194 resoluções CONTRAN em PDF, CONAMA 490/492, SENATRAN e 40 anexos |
| Recusa de páginas que não são a lei | Feito | 34 páginas falsas removidas (informação de arquivo, perguntas frequentes, índices); teste unitário |
| Importação da pesquisa de 02/11 (PR #18) | Feito | Só entra arquivo com SHA-256 conferido: 8 portarias Inmetro, SENATRAN 1554/2022, Decreto 12.435/2025, MDIC 215/2025 |
| Texto completo em Markdown (`texts/`) | Feito para 269 atos | Teste novo: arquivos atuais, âncoras únicas, origem registrada; build determinístico |
| Extração de texto dos PDFs | Corrigida | O extrator anterior perdia letras ("dispositivo" não aparecia nos anexos da 970/2022; agora aparece 378 vezes). Páginas do DOU eram cortadas em 12 mil caracteres |
| Vista explodida 3D mais espaçada | Feito | 28 conjuntos de testes de navegador |
| Lista do que falta coletar | Feito | `pdfs/faltantes.csv` |

Verificações do projeto nesta data: `npm run check`, `npm run format:check`,
`npm test` (140 testes Node e as suítes Python), `npm run test:browser` (28 conjuntos) e
`npm run test:a11y` passam. `npm run test:visual` falha só no cenário "veículo no
celular", e falha igual antes das mudanças desta branch.

## 3. Defeitos e lacunas encontrados

### 3.1 Acervo

- **25 atos sem nenhum texto completo** (lista na seção 6).
- **14 documentos com páginas digitalizadas** (imagem sem texto), entre eles o anexo da
  910/2022 (24 páginas) e o da 954/2022. Precisam de OCR.
- **15 resoluções CONTRAN antigas** (1998–2006) estão no gov.br como arquivo Word. O texto
  delas veio do acervo já arquivado; falta a cópia oficial.
- **ANATEL (22) e IBAMA (24):** o texto vem do acervo arquivado em outubro. O site da
  ANATEL estava em manutenção e o do IBAMA recusa o robô.
- **Tabelas e figuras** dos anexos saem como texto corrido. Tabelas de limites (CONAMA
  490/492) e figuras de ensaio precisam de tratamento próprio.
- **Páginas do DOU** trazem outros atos na mesma página (Decreto 12.435/2025, MDIC
  215/2025, Inmetro 314/2025). Falta recortar só o ato.
- **Motocicletas (PROMOT)** estão fora do recorte por decisão anterior.

### 3.2 IA

Teste feito hoje com 5 perguntas, olhando o que a busca entrega ao modelo:

| Pergunta | O que a busca trouxe |
| --- | --- |
| SUV, impacto lateral contra poste, prazos e retificação | Achou a 949 e a retificação, mas também a 752 e a retificação da 939, sem relação |
| Altura máxima do ponto R | Achou o Art. 2º, mas incluiu um ato da ANATEL |
| Limites de NMOG+NOx na L8 e meta corporativa | Só o resumo da ficha da CONAMA 492; **nenhuma tabela de limites** |
| Pneu precisa de certificação? Quais isentos? | Razoável: Portaria 379 e Anexo VI |
| O que o anexo da 970 exige para farol de rodagem diurna | **Não chegou ao Anexo XIV**; trouxe IBAMA e ANATEL |

Causas:

1. O índice é feito de resumos e de 98 requisitos; o texto dos anexos não entra.
2. A busca é por coincidência de palavras, limitada a 8 trechos, feita no navegador.
3. O modelo recebe os trechos uma vez e não pode pedir mais nem abrir um artigo.
4. Modelo mais leve do Gemini (Flash-Lite), raciocínio baixo, 15 s.
5. Busca na internet desligada: exige faturamento ativo no Google.
6. Neste ambiente a IA não roda (precisa do Cloudflare); só a busca pôde ser testada.

### 3.3 Veículo 3D

- Selecionar uma peça mostra só uma contagem ("1 ato · 0 requisitos"), longe do carro,
  sem artigo e sem link para o texto.
- 20 dos 33 subsistemas não têm nenhum requisito ligado (cintos, airbags, ESC,
  retrovisores, impactos, portas, entre outros), embora as leis estejam no acervo.
- O clique na malha 3D e a lista lateral não levam ao mesmo painel de leis.

### 3.4 Leitura, visual e celular

- A lei abre num painel estreito, só com o resumo. Não há página própria nem link de
  artigo.
- No celular, o carro só aparece depois de duas telas de cabeçalho, e a barra de
  navegação inferior cobre os botões de câmera do 3D.
- Títulos e botões grandes demais no celular; filtros ocupam a primeira tela inteira da
  Biblioteca.
- A linha de base do teste visual do celular está desatualizada.
- Muitos avisos repetidos competem com o conteúdo. Eles devem continuar, mas com menos
  peso visual.

### 3.5 Fluxo de homologação

- O mapa mostra etapas e leis, mas não um roteiro por perfil de veículo.
- 13 achados de cobertura continuam pendentes (`data/process/regulatory-coverage.json`),
  como a matriz do MOVER e o checklist técnico do Inmetro.

### 3.6 Organização do projeto

- Há três PRs em rascunho com linhas paralelas: #8 (garagem consultiva), #17 (protótipo
  "nexo", com outra IA e outro 3D) e #18 (pesquisa de segurança). É preciso decidir qual é
  a base, para não manter dois sites.
- O GitHub não permite que o robô abra PR sozinho (Settings → Actions → General).

## 4. Caminho

Cada fase termina com testes passando e um PR revisável.

### Fase 0 — Acervo completo (em andamento)
- [x] Robô, anexos, importação, Markdown de 269 atos.
- [ ] Coletar os 25 atos sem texto (seção 6) e as 15 resoluções em Word.
- [ ] OCR dos 14 documentos digitalizados.
- [ ] Recortar o ato nas páginas do DOU.
- [ ] Tabelas dos anexos como tabela; figuras como imagem recortada do PDF.
- [ ] Rodar o robô de novo para ANATEL quando sair da manutenção.

**Pronto quando:** 294 de 294 com texto completo e nenhum anexo citado sem cópia.

### Fase 1 — Página da lei
- [ ] Rota `#lei/<id>` e `#lei/<id>/art-2`, compartilhável.
- [ ] Texto completo com sumário, artigo destacado e "copiar link do artigo".
- [ ] Anexos na mesma página; PDF oficial e Markdown para baixar.
- [ ] Lateral: situação, requisitos, peças do carro e etapa do processo.
- [ ] Busca dentro da lei.

**Pronto quando:** qualquer artigo abre por link em computador e celular, com teclado e
leitor de tela, e os testes de acessibilidade passam.

### Fase 2 — IA para perguntas complexas
- [ ] Índice por dispositivo (artigo, parágrafo, item de anexo) a partir de `texts/`.
- [ ] Busca no servidor, com sinônimos do domínio e filtro por órgão e assunto.
- [ ] Pesquisa em etapas: o modelo busca, abre artigos e lê a lei antes de responder.
- [ ] Modelo Flash para perguntas complexas; Flash-Lite para as simples.
- [ ] Resposta com citação por artigo, link para a página da lei e "como pesquisei".
- [ ] Conferência automática: toda citação precisa existir no texto.
- [ ] Bateria de 30 perguntas com resposta esperada, rodada a cada mudança.
- [ ] Busca na internet em fontes oficiais, se o faturamento for ativado.

**Pronto quando:** ≥ 85% da bateria correta, nenhuma citação inexistente e resposta em
até 20 segundos.

### Fase 3 — Veículo 3D → artigo
- [ ] Ligar os 20 subsistemas sem requisito aos artigos, a partir do texto revisado.
- [ ] Cartão ao lado da peça com lei, artigo e "Abrir no artigo".
- [ ] Mesmo resultado pelo clique no 3D, pela lista e pela vista explodida.
- [ ] Volta: da lei para a peça selecionada no 3D.
- [ ] Celular: carro na primeira tela, controles fora da barra inferior.

**Pronto quando:** os 33 subsistemas mostram artigos ou uma lacuna explícita, em até
dois toques.

### Fase 4 — Roteiro de homologação
- [ ] Perfil (categoria, propulsão, origem) define as etapas.
- [ ] Etapas: enquadramento, ambiental, segurança, componentes, CAT, produção e mercado.
- [ ] Cada etapa com o que fazer, onde pedir e os artigos.
- [ ] Revisão da ordem e dos pré-requisitos com o responsável técnico.

**Pronto quando:** dois perfis reais (por exemplo, SUV híbrido importado e comercial leve
a combustão nacional) percorrem o roteiro sem lacuna não explicada.

### Fase 5 — Refino visual e responsivo
- [ ] Tipografia de leitura para texto longo (medida, entrelinha, hierarquia).
- [ ] Cabeçalho compacto e ações em linha no celular; filtros em gaveta.
- [ ] Avisos consolidados: uma faixa de origem por página, sem repetir.
- [ ] Estados vazios, de carregamento e de erro revisados.
- [ ] Linhas de base visuais atualizadas depois da sua aprovação.

**Pronto quando:** as rotas principais passam em 320, 390, 768 e 1440 px, nos três temas,
sem sobreposição nem rolagem horizontal.

### Fase 6 — Confiabilidade contínua
- [ ] Robô mensal com PR automático e resumo do que mudou.
- [ ] Aviso quando um documento oficial muda de hash.
- [ ] Página "Cobertura": o que tem texto, o que falta, o que foi revisado.
- [ ] Decisão sobre proteger o site com login (o limite gratuito da IA é compartilhado).

## 5. Skills para o refino

**Já no projeto** (`.agents/skills`), usadas em toda mudança de conteúdo:

- `revisao-normativa`: regras para alterar conteúdo normativo sem promover evidência.
- `consulta-regulatoria`: contrato de resposta para consulta por IA.

**Disponíveis nesta sessão:**

- `code-review`: revisão de erros no diff antes de cada PR.
- `simplify`: limpeza e reuso depois de cada fase.
- `security-review`: obrigatória na Fase 2 (função da IA, chave do Gemini, entrada do
  usuário) e na Fase 6 (login).
- `run`: abrir o site real e conferir a mudança na tela, além dos testes.
- `dataviz`: página de cobertura e gráficos do roteiro.
- `deep-research`: localizar atos citados e ainda sem ficha, com fontes.
- Conector **Figma**: protótipos da página da lei e do celular antes de codificar.

**Referências externas já registradas** em `docs/guide/frontend-apple-e-skills.md`. Foram
lidas como orientação, não estão instaladas aqui:

- `frontend-design` (Anthropic): hierarquia, tipografia e contenção visual.
- `webapp-testing` (Anthropic): jornadas reais com Playwright.
- `Impeccable` (auditoria e polimento) e `apple-design`: acabamento e leitura.
- `react-flow`: evolução do fluxo de homologação.

Sugestão de uso por fase: Figma e `frontend-design` nas Fases 1 e 5; `webapp-testing` e
`run` em todas; `security-review` na Fase 2; `code-review` e `simplify` antes de cada PR.

## 6. Coleta manual

Os 25 atos sem nenhum texto completo. A lista completa, incluindo os que só não têm a
cópia em PDF, está em `pdfs/faltantes.csv`.

| Ato | Onde buscar |
| --- | --- |
| Lei 8.723/1993; Lei 9.503/1997 (CTB); Lei 14.902/2024 (MOVER); Decretos 12.214/2024 e 12.549/2025 | planalto.gov.br (o site encerra a conexão do robô) |
| Portarias GM/MDIC 86/2024, 176/2025, 183/2025, 192/2025, 213/2025, 19/2026, 68/2026 | in.gov.br (DOU; responde acesso negado ao robô) |
| Resolução CNPE 14/2025 | gov.br/mme, página de resoluções do CNPE |
| Portarias Senatran 989/2022 e 1053/2022 | gov.br/transportes, portarias de 2022 |
| Portarias Inmetro 33/2021, 34/2021, 140/2021, 145/2022, 169/2023, 230/2021, 246/2021, 433/2021, 456/2021, 501/2021 | sistema-sil.inmetro.gov.br/rtac (PDF "RTAC") |

Basta salvar o PDF oficial de cada um. A importação confere o arquivo, registra endereço,
data e hash e gera o Markdown.

## 7. Decisões que dependem de você

1. **Base do projeto:** seguir nesta branch e aproveitar partes dos PRs #8 e #17, ou
   partir de um deles?
2. **Busca na internet da IA:** ativar o faturamento no Google?
3. **Ordem das fases:** proposta 0 → 1 → 2 → 3 → 5 → 4 → 6. A IA (Fase 2) depende da
   página da lei (Fase 1) para os links de artigo.
4. **PR automático do robô:** liberar em Settings → Actions → General.
5. **Motocicletas:** incluir o PROMOT no acervo?
