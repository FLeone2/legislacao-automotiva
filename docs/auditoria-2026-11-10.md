# Auditoria do projeto — 10/11/2026

Varredura completa do repositório: verificações automáticas, todas as rotas do site em
computador e celular, código e arquivos sem uso, documentação contra a realidade, fluxos do
GitHub e desperdícios. O que era certo foi corrigido; o resto está listado para decisão.

## Como foi feito

- `npm run check`, `npm run check:knowledge`, `npm run format:check`, `npm test`,
  `npm run test:browser`, `npm run test:a11y` e `npm run test:visual`.
- Navegação automática em 18 rotas, em 1440 px e 390 px, registrando erros de JavaScript,
  arquivos que não carregam e rolagem horizontal.
- Analisador estático (ruff) nos scripts e testes Python; busca de funções JavaScript,
  scripts, arquivos de `assets/` e classes CSS sem referência.
- Caminhos de arquivo citados na documentação conferidos contra o repositório.
- Histórico das execuções dos três fluxos do GitHub Actions.
- 5 perguntas reais na busca da IA.

## Corrigido

| # | Problema | Correção |
| --- | --- | --- |
| 1 | **O botão "Abrir PDF" nunca aparecia para leis abertas por ID antigo.** A Biblioteca abre a Res. 949/2022 como `senatran-072`; as cópias são guardadas como `contran-949-2022`. | A lei procura a cópia pelo ID canônico e pelos aliases. Teste novo: `tests/pdf-copy-browser.py`. |
| 2 | **A IA não lia os anexos.** A busca olhava só o PDF principal de cada lei, mesmo com 44 arquivos de anexo copiados. | A busca inclui os anexos e ordena os trechos pelo mais relevante de cada arquivo. |
| 3 | **Texto extraído dos PDFs com letras faltando** (ligaduras "ti"/"fi") e páginas do DOU cortadas em 12 mil caracteres. | Extração com Poppler e limite de 60 mil caracteres por página. |
| 4 | **Robô de cópias guardava páginas que não eram a lei** e falhava na instalação. | Corrigido em 09/11; regras de recusa com teste. |
| 5 | **Teste instável** em `tests/guide-browser.py`: lia a mensagem de erro da importação sem esperar. Falhava sob carga. | Passa a esperar a mensagem. |
| 6 | **Código morto:** `flowStrip` e `systemCount` em `app.js`, `loadContran` em `src/regulations/store.js`, e `contran.js` (uma linha de comentário). | Removidos. O README, que descrevia `contran.js` como módulo ativo, aponta para `src/regulations`. |
| 7 | Importações Python sem uso em 4 arquivos e uma variável de laço sem uso. | Removidas. |
| 8 | **A verificação do GitHub não cobria `texts/`.** | A etapa de dados reproduzíveis inclui `texts`. |
| 9 | `.gitattributes` não marcava os PDFs como binários nem os textos gerados. | Marcados. |
| 10 | `AGENTS.md` e `docs/guide/assistente-e-pdfs.md` não descreviam `texts/`, os anexos, a lista de faltantes nem os comandos novos. | Atualizados. |

## Para você decidir

### Quebrado ou enganoso

1. **O monitor diário de fontes está vermelho todos os dias** (`regulatory-monitor.yml`).
   Ele termina com erro sempre que alguma fonte não responde, e o IBAMA recusa o robô
   sempre. Um alerta que dispara todo dia deixa de avisar. Sugestão: tratar bloqueio
   conhecido como aviso e reservar o erro para mudança real de conteúdo.
2. **O teste visual "veículo no celular" falha neste ambiente** e passa no GitHub
   (execução 91). É diferença de ambiente, não defeito do site. Mas esta branch ainda não
   passou pela verificação do GitHub, que só roda em PR ou na `main`. Sugestão: abrir um PR
   em rascunho para validar.
3. **A IA continua fraca em perguntas complexas.** Ela agora alcança os anexos, mas ainda
   escolhe trechos por coincidência de palavras: para "farol de rodagem diurna" na
   970/2022, trouxe um trecho do segundo arquivo de anexos, não o Anexo XIV. A correção de
   verdade é a Fase 2 do escopo.
4. **O robô não consegue abrir PR sozinho** (permissão do GitHub Actions).
5. **Rota desconhecida cai no Início sem aviso** (`#qualquer-coisa`). Um link quebrado
   parece funcionar.

### Inconsistente

6. **Três linhas de desenvolvimento paralelas:** PRs #8, #17 e #18 em rascunho, além desta
   branch. O #17 tem outra IA e outro 3D.
7. **README com 822 linhas** em forma de histórico, com números de épocas diferentes
   (141, 209, 273, 274 e 294 atos). Está correto por trecho, mas ninguém consegue usar
   como guia. Sugestão: README curto e mover o histórico para `docs/`.
8. **`index.html` tem versões escritas à mão** (`?v=20261019-dark` em 25 arquivos). O
   build as substitui pelo hash real, então são só ruído na fonte.
9. **Duas listas de documentos faltantes:** `pdfs/faltantes.csv` (gerada) e
   `docs/levantamento-anexos-2026-11-08.csv` (do levantamento). A segunda ficou datada.

10. **Dois testes de navegador não sobem o próprio servidor** quando rodados sozinhos
    (`lazy-data-browser.py` e `subsystem-browser.py` esperam `127.0.0.1:8000`). O
    `AGENTS.md` diz que os testes são donos do servidor; isso só vale via
    `npm run test:browser`.

### Ineficiente

11. **Os PDFs estão duas vezes no repositório:** 147 MB em `pdfs/` e 147 MB em
    `dist/pdfs/`. Cada execução do robô que mude arquivos soma de novo. O projeto exige
    hoje que `dist` esteja versionado e idêntico ao build. Sugestão: tirar `dist/pdfs` e
    `dist/texts` do Git e deixar o Cloudflare gerá-los, mantendo a conferência para o
    resto de `dist`.
12. **`pdfs/manifest.json` (199 KB) é baixado em toda visita**, em qualquer página, e só é
    usado ao abrir uma lei ou a Base regulatória.
13. **A IA baixa o índice inteiro (485 KB) e os textos de PDF no navegador** para buscar.
    Resolve-se na Fase 2, com a busca no servidor.

### Talvez não seja mais necessário

14. **`vehicle.png` (2,6 MB na raiz):** o README diz "imagem da versão anterior, mantida
    para histórico". Nada no site a usa.
15. **Cerca de 40 classes CSS sem uso aparente**, 31 delas em `styles.css` (por exemplo
    `flow-strip`, `flow-card`, `demo-badge`, `chat-input`, `ai-bottom`). Remover exige
    conferir os testes visuais, por isso não removi.
16. **Branches antigas no GitHub:** 11 já incorporadas à `main` (`fix/gemini-*`,
    `fix/citacoes`, `feat/ia-busca-web`, entre outras), mais `tmp-probe` e as duas
    `auto/pdfs-20261109-*` (a primeira tem cópias erradas; a segunda já foi incorporada
    aqui).
17. **`docs/plano-texto-integral-ia-2026-11-08.md`:** substituído pelo escopo de 10/11.
18. **Prancha 2D do veículo:** continua no site como referência. Com o 3D como caminho
    principal, vale decidir se ela fica visível ou vai para uma página secundária.

## Sem problemas encontrados

- Nenhum erro de JavaScript nem rolagem horizontal nas 18 rotas, em computador e celular.
  O único arquivo que não carrega localmente é `/api/ask`, que depende do Cloudflare.
- Acessibilidade (axe WCAG A/AA, teclado, foco) passa.
- Todos os 138 arquivos de `assets/` e todos os scripts são referenciados.
- Todos os caminhos de arquivo citados na documentação existem.
- As dependências declaradas (Node e Python) são usadas.
- `npm run build:data` e `npm run build` são determinísticos.
