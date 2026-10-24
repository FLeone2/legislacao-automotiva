# RB-30 + PEM — modelo comparativo e kit de retrofit

Dissertação de mestrado (IPEN/USP, Tecnologia Nuclear). Conversão do rebocador elétrico
Jacto RB-30 para tração com célula a combustível PEM (Ballard FCgen-1020ACS, 56 células)
e bateria LFP de apoio.

**Pergunta:** como a versão PEM + LFP se compara à original (chumbo-ácido) e à só LFP em
autonomia por turno, eficiência e custo?

## Estado das fases

| Fase | Conteúdo | Estado |
|---|---|---|
| Começo 1 | Estrutura, ambiente Python, git | feito |
| Começo 2 | Leitura dos PDFs do RB-30, índice, parâmetros do veículo | feito em 24/10/2026: 72 + 40 páginas lidas; dados conferidos no PDF; lista de peças extraída |
| E0 | Ficha da célula Ballard | feito; **portão aberto** aguardando o pesquisador |
| A–J | Modelos, controle, comparação, kit | não iniciadas |

## Onde está cada coisa

- `celula/ficha_ballard.md` — ficha completa do stack, com 14 achados e as lacunas.
- `celula/perguntas_ao_fabricante.md` — 17 perguntas à Ballard e 3 sobre importação.
- `celula/conferencias_e0.py` — contas da fase E0 (Faraday, vazões, eficiência, purga).
- `fontes/RB30_indice.md` — índice do manual e do catálogo, e conferência do enunciado.
- `dados/parametros.yaml` — todos os parâmetros, com fonte, tag e condição.
- `dados/catalogo_pecas.csv` — 234 itens do catálogo (gerado por `fontes/extrair_catalogo.py`).
- `dados/pendencias.md` — o que falta e quem resolve.
- `hipoteses.md`, `decisoes.md` — hipóteses (H-###) e decisões (DEC-###).
- `revisao/fontes_usadas.md` — cada fonte, com status de verificação.
- `aulas/` — aulas por fase; gabaritos em `aulas/gabaritos/`.

## Ambiente

```
cd rb30-tese
python3 -m venv .venv                       # cria um Python isolado só para a tese
.venv/bin/pip install -r requirements.txt   # instala as versões fixas das bibliotecas
.venv/bin/python -m pytest -q               # roda todos os testes
.venv/bin/python celula/conferencias_e0.py  # imprime as conferências da fase E0
```

Os PDFs de terceiros não entram no git (DEC-003). Para reproduzir, baixe-os pelos links de
`revisao/fontes_usadas.md` para `celula/fontes_pdf/` e confira o SHA-256.

## Regras

Nenhum número sem fonte ou cálculo; unidades com `pint`; cada função com teste e valor de
referência calculado à mão; conflitos entre fontes registrados, nunca escolhidos em
silêncio. A pasta é isolada do site que vive neste repositório (DEC-001).
