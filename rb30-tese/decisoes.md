# Decisões

Cada decisão registra o contexto, a escolha, as alternativas e como desfazê-la.

## DEC-001 — Onde fica o projeto (23/10/2026)

- **Contexto:** esta sessão só tem acesso ao repositório `fleone2/legislacao-automotiva`, no
  ramo `claude/rb30-pem-retrofit-2398gq`. Esse repositório é um site estático sobre
  legislação automotiva, sem relação com a tese.
- **Escolha:** criar a tese na pasta `rb30-tese/`, isolada. Ela não muda nenhum arquivo do
  site e não entra no `dist` publicado (o build do site usa lista de arquivos permitidos).
- **Alternativa recomendada:** um repositório próprio (por exemplo, `rb30-tese`), privado.
  Basta mover a pasta; o histórico pode ser preservado com `git subtree split`.
- **Pendente:** decisão do pesquisador (pergunta P-04).

## DEC-002 — Fonte de referência do stack (23/10/2026)

- **Escolha:** a especificação de produto SPC5103429-0E (2019, 10 p.) prevalece sobre a folha
  comercial SPC510559-01H (2021, 2 p.) e sobre a página web.
- **Motivo:** a SPC tem as tabelas completas e é coerente consigo mesma (V × I = P em todas
  as colunas). A folha comercial mistura valor mínimo de potência com tensão típica
  (ficha, achado 1).

## DEC-003 — PDFs de terceiros fora do git (23/10/2026)

- **Escolha:** os PDFs baixados ficam em `celula/fontes_pdf/` e em `fontes/`, mas são ignorados
  pelo git. O repositório guarda o link, a data de acesso e o hash SHA-256.
- **Motivo:** a SPC diz "Reproduction in whole or part without permission is prohibited". O
  manual e o catálogo Jacto também têm direitos autorais. Publicá-los num repositório pode
  ser redistribuição.
- **Alternativa:** guardar os PDFs num repositório privado ou no Drive do pesquisador.

## DEC-004 — Condição padrão de vazão (23/10/2026)

- **Escolha:** slpm a 0 °C e 1 atm (V_m = 22,414 L/mol) em todo o projeto.
- **Motivo:** é a definição do glossário da SPC (p. 5). Com 20 °C, a vazão de H2 a 65,3 A
  passaria de 0,455 para 0,488 slpm/célula, uma diferença de 7 % que não existe.

## DEC-005 — Ambiente Python fixo (23/10/2026)

- **Escolha:** ambiente virtual `rb30-tese/.venv`, versões fixas em `requirements.txt`.
- **Motivo:** o resultado da tese deve ser reproduzível. Uma versão nova de biblioteca pode
  mudar um número.
