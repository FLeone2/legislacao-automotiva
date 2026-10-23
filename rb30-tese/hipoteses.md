# Hipóteses

Cada hipótese tem justificativa e forma de teste. Status: **aberta**, **confirmada**,
**refutada**. Hipóteses não viram dado sem teste.

| ID | Hipótese | Justificativa | Como testar | Status |
|---|---|---|---|---|
| H-001 | Num stack de cátodo aberto, o calor a remover pelo ar se aproxima da base LHV (a água sai como vapor). | Com base HHV, o ar a 50 slpm/célula esquentaria 49,5 K, mais que os ~41 K possíveis entre 20 °C e 61 °C; com LHV, 35,8 K (ficha, achado 9). | Balanço de calor da fase C, com a fração de água líquida como parâmetro; no experimento, medir a temperatura do ar de saída e a água condensada. | aberta |
| H-002 | "1020" é designação de plataforma (Mark 1020), não potência. | O DOE chama o stack de "Mk1020"; o nome cobre 10 a 80 células (411 W a 3,3 kW). | Pergunta à Ballard; nenhuma decisão de cálculo depende disto. | aberta |
| H-003 | A faixa entre a tensão mínima e a típica da Tab. 2 da SPC representa a variação de um stack novo (BOL). | A SPC dá as duas linhas, "greater than" e "typical". | Na fase B, usar a faixa como incerteza dos parâmetros da curva; comparar com a dispersão das curvas do DOE (Fig. 5 e a curva da seção "Stack Performance Testing"). | aberta |
| H-004 | A estequiometria de H2 de 1,07 já inclui a perda por purga. | 20 cc/célula por purga com λ = 1,07 exige purga a cada 2 460 A·s; a literatura (segunda mão) relata 2 300 A·s. | Balanço de massa do H2 na fase A; pergunta F-03; no experimento, medir a massa de H2 consumida e a carga entregue. | aberta |
| H-005 | O regulador de baixa pressão precisa manter 116–156 kPa **absolutos**; com referência atmosférica (gauge), o ajuste depende da altitude do local. | A SPC especifica kPa absolutos; a DS converteu com 100 kPa. | Calcular a pressão absoluta entregue em função da altitude do local de ensaio (fase A); especificar o regulador na fase J. | aberta |
| H-006 | O stack não tem comunicação nem sinais próprios; toda instrumentação e lógica são do integrador. | DS: "no moving parts"; AIF: vendido a integradores; SPC não lista interface elétrica. | Pergunta F-09; desenho de interface. | aberta |
| H-007 | Os dados do RB-30 transcritos no enunciado estão corretos, com a página indicada. | O pesquisador extraiu-os do manual. | Ler o PDF e marcar verificado_no_pdf: true em cada item (pendência P-01). | aberta |
