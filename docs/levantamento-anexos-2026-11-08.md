# Levantamento de íntegras e anexos — 08/11/2026

Inventário do que existe e do que falta para ter a íntegra (corpo + anexos) de cada ato
publicado na base (`knowledge/acts`, 294 fichas). A tabela completa, ato por ato, está em
[`levantamento-anexos-2026-11-08.csv`](levantamento-anexos-2026-11-08.csv).

Este levantamento é uma auditoria de acervo. Ele não altera situação jurídica, profundidade
de revisão, aplicabilidade nem publicação de nenhum ato, e não reativa os 55 atos CONTRAN
excluídos.

## Resposta curta

1. **Nenhum ato tem a íntegra em Markdown.** Todas as 294 fichas têm
   `fullTextIncluded: false`. Isso foi uma decisão de projeto (`knowledge/README.md`:
   "A íntegra das leis não é exportada"). As fichas trazem resumo, estados, trechos e
   requisitos, mas não o texto completo nem os anexos.
2. **Onde há íntegra, ela está só nas fontes compactadas** em `data/*/sources`, que o build
   usa: 209 PDFs CONTRAN extraídos, 23 textos anotados IBAMA/CONAMA, 2 PDFs certificados do
   DOU (IN 6/2025 e IN 26/2020) e 22 páginas oficiais ANATEL.
3. **Faltam anexos ou íntegras em 80 atos:**

| Órgão          | Atos | Com íntegra arquivada | Anexo completo/no texto | **Falta** | Natureza da falta                                                         |
| -------------- | ---: | --------------------: | ----------------------: | --------: | ------------------------------------------------------------------------- |
| CONTRAN        |  209 |                   209 |  56 (+9 alterações)     |    **42** | 38 anexos publicados em arquivo separado e não arquivados; 3 ausentes; 1 parcial |
| IBAMA / CONAMA |   26 |                    25 |  11 (+7 alterações)     |     **1** | Lei 8.723/1993 sem texto arquivado                                        |
| Inmetro        |   18 |                     0 |                       0 |    **18** | Só o resumo do Portal IQ; portaria, RTQ, RAC e anexos ausentes            |
| ANATEL         |   22 |                    22 |  5 (+1 alteração)       |         0 | Anexos estão no texto oficial arquivado                                   |
| MDIC / MOVER   |   13 |                     0 |                       — |    **13** | Sem texto arquivado                                                       |
| SENATRAN       |    6 |                     0 |                       — |     **6** | Sem texto arquivado (inclui o CTB, Lei 9.503/1997)                        |

"Alterações" são atos que alteram anexo de outro ato e trazem a nova redação no próprio
texto. Eles estão completos, mas dependem do anexo do ato alterado.

## Prioridade 1 — CONTRAN de segurança veicular com anexo fora do acervo

Estas resoluções dizem que os anexos "encontram-se disponíveis no sítio eletrônico". O
corpo está arquivado; o anexo, que costuma conter os requisitos técnicos e os métodos de
ensaio, não está. O índice oficial arquivado (`data/contran/sources/index.html.gz`) já traz
o link de cada um. Prefixo comum dos links:
`https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/`.

| Ato              | Sistema                    | Assunto                                                | Anexos citados   | Arquivo                                                      |
| ---------------- | -------------------------- | ------------------------------------------------------ | ---------------- | ------------------------------------------------------------ |
| Res. 910/2022    | carroceria/ocupantes/propulsão | Proteção aos ocupantes e integridade do sistema de combustível | I–V              | `Resolucao9102022Anexos.pdf`                                 |
| Res. 949/2022    | carroceria/ocupantes       | Impacto lateral e frontal                              | I–VI             | `Resolucao9492022ANEXO.pdf`                                  |
| Res. 951/2022    | ocupantes                  | Cintos de segurança — instalação e ensaios             | Anexo            | `Resolucao9512022ANEXO.pdf`                                  |
| Res. 954/2022    | freios                     | Controle de estabilidade (ESC)                         | Anexo            | `Resolucao9542022ANEXO.pdf`                                  |
| Res. 970/2022    | iluminação                 | Iluminação e sinalização luminosa                      | I–XXI            | `resolucao9702022anexos_i-xvi.pdf`, `resolucao9702022anexos_xvii-xxi.pdf` |
| Res. 960/2022    | vidros                     | Vidros, visibilidade e áreas envidraçadas              | I–II             | `Resolucao9602022ANEXOS.pdf`                                 |
| Res. 966/2022    | retrovisores               | Requisitos técnicos dos espelhos retrovisores          | I–IV             | `Resolucao9662022ANEXOS.pdf`                                 |
| Res. 924/2022    | retrovisores               | Uso obrigatório de retrovisores e equipamentos         | I–VI…            | `Resolucao9242022ANEXO.pdf`                                  |
| Res. 759/2018    | retrovisores               | Alerta e monitoramento traseiro                        | I–II             | **link não localizado no índice**                            |
| Res. 948/2022    | iluminação                 | Película retrorrefletiva                               | I–III            | `Resolucao9482022ANEXO.pdf`                                  |
| Res. 952/2022    | carroceria                 | Para-choque traseiro                                   | I–II             | `Resolucao9522022ANEXO.pdf`                                  |
| Res. 953/2022    | carroceria                 | Protetor lateral                                       | I                | `Resolucao9532022ANEXO.pdf`                                  |
| Res. 955/2022    | carroceria                 | Cargas/bicicletas na parte externa                     | Anexo            | `Resolucao9552022ANEXO.pdf`                                  |
| Res. 956/2022    | chassi/propulsão           | Semirreboque com eixo elétrico                         | Anexo            | `Resolucao9562022ANEXO.pdf`                                  |
| Res. 958/2022    | propulsão                  | Limites de emissão no escapamento (fiscalização)       | I–V              | `Resolucao9582022ANEXOS.pdf`                                 |
| Res. 913/2022    | pneus/rodas                | Uso de pneus                                           | V                | `Resolucao9132022ANEXO.pdf`                                  |
| Res. 963/2022    | pneus/rodas                | Rodas especiais                                        | Anexo            | `Resolucao9632022ANEXOS.pdf`                                 |
| Res. 916/2022    | identificação              | Código marca/modelo/versão e modificações              | I, IV–VII        | `Resolucao9162022ANEXO.pdf`                                  |
| Res. 944/2022    | identificação              | Dispositivo auxiliar de identificação veicular         | Anexo            | `Resolucao9442022ANEXO.pdf`                                  |
| Res. 969/2022    | identificação              | Placas de Identificação Veicular (PIV)                 | I–III            | `resolucao9692022anexos.pdf`                                 |
| Res. 939/2022    | —                          | Segurança de veículos de passageiros (ônibus)          | I–IX…            | `Resolucao9392022ANEXO.pdf`                                  |
| Res. 961/2022    | —                          | Acessibilidade no transporte coletivo                  | I–II             | `Resolucao9612022ANEXOS.pdf`                                 |
| Res. 996/2023    | —                          | Ciclomotores, bicicletas elétricas e autopropelidos    | I–IV             | `Resolucao9962023Anexo.pdf`                                  |
| Res. 1021/2026   | identificação/propulsão    | Motor elétrico auxiliar em caminhões (Delib. 276/2026) | Anexo próprio    | **anexo próprio ausente do extrato**; link a localizar       |

Já arquivado: o anexo da Res. 993/2023 (`data/contran/sources/993-annex.json.gz`).

## Prioridade 2 — demais CONTRAN com anexo faltando

- **Anexo em arquivo separado, link conhecido:** 911/2022 (trânsito de veículos novos),
  917/2022 (toras), 927/2022 (exame médico), 935/2022 (blocos e chapas), 940/2022 (capacete),
  942/2022 (siderúrgicos), 943/2022 (transporte remunerado), 945/2022 (amarração de carga),
  957/2022 (veículo de coleção), 965/2022 (áreas de segurança), 967/2022 (baixa de
  registro), 973/2022 (Regulamento de Sinalização, MBST vol. I–IX), 985/2022 (MBFT, ZIPs),
  1003/2023 (alteração do MBFT) e 1004/2023 (PNATRANS).
- **Anexo citado e ausente, sem link no índice:** 1013/2024 (free flow, Anexos I–III) e
  886/2021 (modelos da CNH, Anexos I–IV).
- **Anexo parcial:** 1022/2026. O Anexo I (quadro L6/L7) está no texto; o Anexo II
  (alterações do MBFT) não.
- **Anexo não público:** 998/2023. Pelo art. 4º, o anexo é entregue só às empresas
  credenciadas.
- **Anexo no texto, mas com figuras/tabelas não extraídas:** 400/2012, 506/2014 (ROPS),
  585/2016, 902/2022 e 1017/2024. Para estes, a conversão para Markdown precisa reproduzir
  as figuras como imagem ou descrição.

## IBAMA / CONAMA (PROCONVE)

Situação boa. Os anexos de CONAMA 490/2018 (P8) e 492/2018 (L7/L8), IN 23/2020 (OBDBr-3),
IN 22/2020, IN 29/2020, IN 3/2021, IN 11/2020, IN 16/2024, IN 23/2022 e IN 6/2025 estão no
texto arquivado. As INs 15/2022, 16/2025, 18/2021, 20/2021, 20/2025, 21/2021 e 25/2023 são
alterações com a nova redação no próprio texto.

Pontos de atenção:

- **Lei 8.723/1993** (`ibama-042`): sem texto arquivado.
- **CONAMA 490/2018, 492/2018 e IN 26/2020:** o anexo está presente, mas veio de PDF/HTML
  em colunas. É preciso conferir se os valores das tabelas de limites foram extraídos
  corretamente antes de converter.
- **Os textos do IBAMA são "texto anotado"** (redação original e alterações convivem). Isso
  não equivale a texto consolidado.
- **Fora do recorte por decisão registrada** em `data/proconve/reviewed-map.json`: IN 19/2021
  e IN 22/2022 (revogadas pela IN 5/2024) e IN 21/2022 (PROMOT M5, categoria L). CONAMA
  493/2019 existe só como fonte de guia. Se o objetivo é cobrir todo o arcabouço veicular,
  incluindo motocicletas, o recorte PROMOT precisa de uma decisão editorial própria.
- **Citados nos textos arquivados, sem ficha na base** (a vigência não foi verificada; podem
  estar revogados ou fora do escopo): Resoluções CONAMA 18/1986, 15/1995, 16/1995,
  230/1997, 299/2001, 297/2002, 315/2002, 354/2004, 416/2009 e 418/2009; IN IBAMA 12/2011,
  17/2021 e 20/2024; Portaria Inmetro 377/2011.

## Inmetro — maior lacuna estrutural

As 18 portarias têm apenas o resumo do Portal IQ (objeto, natureza, normas referenciadas).
A portaria, o RTQ, o RAC e os anexos específicos não estão arquivados, o que é coerente com
a regra de que as 18 referências Inmetro **não tiveram a íntegra revisada**. As tentativas
de 19/10/2026 aos RTAC (`RTAC002960`, `RTAC003000`) retornaram HTTP 503, e o DOU retornou
403 (`data/inmetro/sources/retrieval-attempts-2026-10-19.json`). Por sistema do veículo:

- Freios: 145/2022 (lonas/pastilhas, entre outros componentes) e 456/2021 (fluido de freio).
- Pneus e rodas: 379/2021 (pneus novos), 433/2021 (reforma), 501/2021 (rodas).
- Vidros: 34/2021. Ocupantes: 246/2021 (retenção infantil). Engate: 309/2021.
- Propulsão/GNV/catalisador: 111/2022, 436/2021, 33/2021 e 314/2025 (INMPAM).
- Eficiência energética: 169/2023 (PBE Veicular, voluntária; manter essa natureza).
- Gerais: 140/2021, 200/2021 (RGCP), 230/2021, 258/2020 e 278/2021.

Só a retificação de 11/12/2024 da 145/2022 e o Ofício Circular 5/2026 estão arquivados como
PDF.

## MOVER, SENATRAN e ANATEL

- **MOVER (13):** Lei 14.902/2024, Decretos 12.214/2024, 12.435/2025 e 12.549/2025,
  Portarias GM/MDIC 86/2024, 176/2025, 183/2025, 192/2025, 213/2025, 215/2025, 19/2026 e
  68/2026, e Resolução CNPE 14/2025. Nenhum texto arquivado; há só índices
  (`data/mover/sources`).
- **SENATRAN (6):** Portarias 989/2022, 990/2022, 1053/2022 e 1554/2022, Deliberação
  264/2022 e CTB. Nenhum texto integral arquivado; da 990/2022 há apenas um trecho de
  republicação em `data/contran/sources/evidence.json.gz`.
- **ANATEL (22):** anexos presentes no texto oficial arquivado. Só a Res. 680/2017 precisa
  de conferência (o texto arquivado não mostra o título do regulamento anexo).

## Bloqueio de coleta neste ambiente

Testado em 08/11/2026 a partir do container de nuvem: `gov.br` respondeu com página de
CAPTCHA, o IBAMA com desafio Cloudflare e o Portal IQ (Inmetro) com HTTP 403. Nada foi
contornado. A coleta precisa ser feita por navegador ou máquina local; depois, os arquivos
podem entrar no acervo com hash.

## Proposta de próximos passos

1. **Decisão de produto:** exportar a íntegra (corpo + anexos) como Markdown gerado, por
   exemplo em `knowledge/texts/<id>.md`, derivado das fontes arquivadas com hash e URL. Isso
   muda o contrato atual do `knowledge/README.md` e precisa de definição: publicar no `dist`
   ou manter só para consulta local/IA.
2. **Sem nova coleta:** gerar o Markdown dos 256 atos que já têm íntegra arquivada (209
   CONTRAN, 25 IBAMA/CONAMA, 22 ANATEL), marcando cada anexo como presente, separado,
   ausente ou figura.
3. **Coleta manual, na ordem:** (a) os 24 anexos CONTRAN da prioridade 1; (b) as 18
   portarias Inmetro com RTQ/RAC e anexos; (c) Lei 8.723/1993, CTB e as 4 portarias
   SENATRAN; (d) os 13 atos MOVER; (e) os demais anexos CONTRAN. Os links CONTRAN já estão
   na coluna `url_anexo_conhecida` do CSV.
4. **Revisão humana** de tabelas e figuras (970 iluminação, 960 vidros, 949 impacto,
   tabelas CONAMA). Normas técnicas privadas (ABNT/ISO) continuam fora, como hoje.

## Método e limites

O levantamento cruzou as 294 fichas com as fontes arquivadas. Um detector textual localizou
menções a anexos próprios ("Anexo I desta Resolução"), títulos de anexo no texto, avisos de
"anexo disponível no sítio eletrônico" e reticências de alteração. Todos os casos ausentes,
parciais ou duvidosos foram conferidos manualmente nos trechos. As menções a anexos de
outros atos (CTB, regulamentos UNECE/UE) foram descartadas. Limites: a presença do título e
do corpo não garante que tabelas e figuras tenham sido extraídas corretamente, e um ato
classificado como "sem anexo" foi avaliado só pelo texto arquivado, sem confronto com o DOU.
