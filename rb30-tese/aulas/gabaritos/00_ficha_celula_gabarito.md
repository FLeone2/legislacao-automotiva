# Gabarito — Aula 00

Valores conferidos com as funções testadas de `celula/conferencias_e0.py`.

## Exercício 1 (36 células, 51,7 A, 0,70 V típico)

- (a) P = 36 × 0,70 V × 51,7 A = 25,2 V × 51,7 A = **1 302,8 W**.
- (b) H2 = 36 × 0,037609 g/Ah × 51,7 A = 1,35392 g/Ah × 51,7 A = **70,0 g/h**.
- (c) η_HHV = 0,70 / 1,4812 = **47,3 %**; η_LHV = 0,70 / 1,2532 = **55,9 %**.

Repare: a eficiência sobe quando a corrente cai, porque a tensão por célula sobe. A célula é
mais eficiente em carga parcial, ao contrário de um motor a combustão.

## Exercício 2 (vazamento após 1 500 h)

- Vazamento do stack: 56 × 12 cc/min = 672 cc/min (padrão, 0 °C e 1 atm).
- Em massa: 672 / 22 414 mol/min × 2,01588 g/mol × 60 min/h = **3,63 g/h**.
- Num turno de 8 h: 3,63 × 8 = **29,0 g**.
- Consumo a 29,0 A por 8 h: 2,1061 g/Ah × 29,0 A × 8 h = **488,6 g**.
- Relação: 29,0 / 488,6 = **5,9 %**.

Em carga baixa o vazamento pesa mais, porque ele não cai com a corrente. A 65,3 A seria
2,6 %. Ressalva: o vazamento foi especificado a 36 kPa g, quase a pressão ótima de
operação (136 kPa abs ≈ 35 kPa g); como ele muda com a pressão é a pergunta F-16.

## Exercício 3 (altitude de 800 m)

- Regulador referenciado à atmosfera: P_abs = 92 kPa + 35 kPa = **127 kPa abs**.
- Faixa da SPC: 116 a 156 kPa abs → **dentro**, mas 9 kPa abaixo do ótimo (136 kPa abs).
- Ao nível do mar, o mesmo ajuste daria 101,3 + 35 = 136,3 kPa abs, praticamente o ótimo.

Conclusão: a SPC especifica pressão **absoluta**. Ou o regulador é referenciado ao vácuo
(absoluto), ou o ajuste em bar g precisa ser corrigido para a altitude do local (H-005).
Os 92 kPa a 800 m são aproximados; o valor real vem da atmosfera padrão ou de medição local.
