# Perguntar (IA gratuita) e cópias dos PDFs oficiais

Protótipo (MVP) de 30/10/2026. Esta página explica o que foi ligado, como ativar e quais são os limites.

## Perguntar

A aba **Perguntar** (`/#ia`) responde perguntas usando somente o acervo publicado:

1. O navegador procura, por palavras, nos 434 trechos do acervo (`data/ai/passages.json`): resumos das fichas, trechos de atos, orientações oficiais e fontes revisadas.
2. Quando um ato tem cópia do PDF oficial, o navegador também procura dentro do texto desse PDF e dos anexos publicados em arquivo separado, e separa o melhor trecho de cada arquivo.
3. Os trechos escolhidos (no máximo 8) vão para `functions/api/ask.js`, uma Pages Function do Cloudflare. Ela chama o **Workers AI**, que roda dentro do Cloudflare: não existe chave de API no navegador.
4. A resposta cita os trechos com números `[n]`. Cada trecho mostra a etapa (ambiental, trânsito, sua responsabilidade ou fornecedor), o tipo de evidência e os links para o PDF e a fonte oficial.

Sem a IA ligada, a aba continua útil: ela mostra os trechos encontrados.

### Limites

- **Grátis com limite diário.** O Workers AI dá 10.000 "neurons" por dia, que voltam às 21h (horário de Brasília). Com o modelo padrão (`@cf/mistralai/mistral-small-3.1-24b-instruct`) isso dá algumas dezenas de perguntas por dia. Quando acabar, a aba avisa e mostra só os trechos.
- **O modelo pode errar.** Ele é instruído a usar só os trechos e a não inventar artigos, prazos ou limites, mas a resposta não é parecer jurídico.
- **A ficha não é a lei.** A maior parte das fichas Markdown traz um resumo e referências, não a íntegra do ato. A íntegra entra quando a cópia do PDF existe.
- **Uso aberto.** Qualquer pessoa com o link pode usar a aba e consumir o limite diário. Para um uso interno, o próximo passo seria proteger o site com o Cloudflare Access.
- **Busca por palavras.** A busca não entende sinônimos além de uma pequena lista (LCVM, CAT, PBEV, COP, ABS, ESC…). Perguntas com o nome da norma, do órgão ou da peça funcionam melhor.

Para trocar o modelo, altere `AI_MODEL` em `wrangler.toml`.

### Google Gemini (opcional, recomendado para testar)

Quando o segredo `GEMINI_API_KEY` existe, a aba usa primeiro o **Gemini** (`GEMINI_MODEL`, padrão `gemini-3.5-flash-lite`, com outros modelos Flash como reserva) e mostra um seletor para comparar com o Workers AI. Se o limite do Gemini acabar, a resposta vem do Workers AI e a tela avisa.

1. Crie uma chave gratuita no Google AI Studio (aistudio.google.com, menu **Get API key**).
2. No Cloudflare, abra **Workers & Pages → legislacao-automotiva → Settings → Variables and Secrets**, clique em **Add**, escolha o tipo **Secret**, use o nome `GEMINI_API_KEY` e cole a chave. Faça isso para **Production** e **Preview**.
3. Faça um novo deploy, ou reabra o PR, para a chave valer.

A busca no Google (grounding) não faz parte do nível gratuito do Gemini. Ela fica desligada (`GEMINI_WEB_SEARCH = "off"` em `wrangler.toml`) e só deve ser ligada (`"on"`) depois de ativar o faturamento no projeto do Google. Com a chave gratuita, o Gemini responde só com o acervo e tenta, em ordem, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.8-flash` e `gemini-flash-latest` quando um modelo está sobrecarregado, no limite, com erro do servidor ou sem resposta em 15 segundos.

A chave fica só no servidor do Cloudflare; o navegador nunca a recebe. No plano gratuito, o Google pode usar o conteúdo enviado (a pergunta e os trechos públicos das leis) para melhorar seus produtos. Não escreva informações confidenciais na pergunta.

## Cópias dos PDFs oficiais

`scripts/fetch_official_pdfs.py` baixa o documento oficial de cada ato e guarda em `pdfs/<órgão>/<ato>.pdf`, com o texto extraído em `pdfs/text/<ato>.json` e o registro em `pdfs/manifest.json` (endereço, data, SHA-256, páginas).

- Só baixa de endereços `https://*.gov.br`, inclusive depois de redirecionamentos.
- Quando a fonte oficial é uma página HTML, um navegador a imprime em PDF. O manifesto marca a origem como `html_printed`.
- Normas técnicas (ABNT/NBR/ISO) nunca são copiadas: não são atos oficiais de domínio público.
- A cópia é para leitura. Ela não altera situação jurídica, profundidade de revisão nem aplicabilidade registradas.
- No gov.br, um endereço terminado em `.pdf` abre uma página do portal sobre o arquivo. O robô busca o arquivo em `/@@display-file/file`.
- Páginas que não são o ato são recusadas, não guardadas: página de informações do arquivo, aviso de manutenção, verificação anti-robô, acesso negado, perguntas frequentes e páginas de índice (inclusive o Portal IQ do Inmetro).
- Anexos publicados em arquivo separado ficam em `annexes` no manifesto, por ato. `items` continua tendo uma entrada por ato.
- `pdfs/faltantes.csv` lista o que não foi obtido, com o endereço oficial e o motivo, para coleta manual.
- O texto é extraído com o Poppler (`pdftotext`); o pypdf é a alternativa quando ele não está instalado. Páginas digitalizadas ficam sem texto até passarem por OCR.

Comandos sem acesso à rede:

- `python scripts/fetch_official_pdfs.py --revalidate`: reaplica as regras de recusa às cópias guardadas.
- `python scripts/fetch_official_pdfs.py --reextract`: extrai de novo o texto dos PDFs guardados.
- `python scripts/import_document_copies.py --package PASTA --label "origem"`: importa PDFs oficiais de um pacote de pesquisa que registre endereço, data e SHA-256 de cada arquivo. Só entra arquivo cujo hash confere, e uma cópia do robô nunca é substituída.

## Texto completo das leis

`scripts/build_law_texts.py` gera `texts/<ato>.md` para cada ato publicado, a partir da cópia em `pdfs/` ou, na falta dela, do texto oficial já arquivado em `data/*/sources`. Cada arquivo tem âncora por artigo, parágrafo e anexo (`art-2`, `art-2-p1`, `anexo-iii`) e registra endereço, data e SHA-256 da origem. Um ato sem cópia diz isso e aponta a fonte oficial. `texts/index.json` resume quais atos têm texto completo. Os arquivos são gerados por `npm run build:data` e conferidos por `npm run check:knowledge`; não devem ser editados à mão.

O ambiente de desenvolvimento não acessa os sites do governo. Por isso a cópia roda no GitHub Actions, no fluxo **Official PDF copies**. Ele roda todo dia 3 de cada mês e também pode ser iniciado à mão. Ao terminar, abre um PR com os PDFs novos para revisão.

## Como ativar

1. Aceite o PR desta mudança. O `wrangler.toml` já declara o binding `AI`.
2. No Cloudflare, abra **Workers & Pages → legislacao-automotiva → Settings → Bindings** e confira se aparece **Workers AI** com o nome `AI`. Se não aparecer, adicione-o com esse nome e faça um novo deploy.
3. No GitHub, abra **Settings → Actions → General** e marque **Allow GitHub Actions to create and approve pull requests**.
4. Em **Actions → Official PDF copies → Run workflow**, rode a cópia. Revise e aceite o PR que ele abrir. PRs abertos pelo próprio Actions não disparam os testes sozinhos; feche e reabra o PR para rodá-los.
