# Aula 00 — Como ler a folha de um stack PEM (e como ela engana)

## 1. O que é

Um **stack PEM** é uma pilha de células a combustível ligadas em série. Cada célula tem uma
membrana polimérica (PEM, *proton exchange membrane*) entre dois eletrodos com platina:

- no **ânodo** entra H2, que se separa em prótons e elétrons: H2 → 2 H⁺ + 2 e⁻;
- os **prótons** atravessam a membrana; os **elétrons** não, e saem pelo circuito externo;
  essa é a corrente que move o RB-30;
- no **cátodo**, o O2 do ar recombina tudo: ½ O2 + 2 H⁺ + 2 e⁻ → H2O.

O FCgen-1020ACS é **refrigerado a ar com cátodo aberto**. Um ventilador sopra ar por canais
abertos; o mesmo ar leva o O2 e remove o calor. Não há água de refrigeração nem umidificador.
É simples, mas o ventilador precisa controlar a temperatura com precisão.

A **folha técnica** (datasheet) é o contrato entre o fabricante e quem integra o stack. Nesta
fase não modelamos nada; só aprendemos o que a folha garante, em que condição, e o que ela
não diz.

## 2. Por que importa para a pergunta da tese

A tese compara autonomia, eficiência e custo de três cenários. Na versão PEM, esses três
números dependem de quatro dados da folha:

1. **Potência nominal** → quanto da carga a célula cobre e quanto sobra para a bateria.
2. **Tensão × corrente** (curva de polarização) → eficiência → consumo de H2 → autonomia.
3. **Consumo de H2 por ampère-hora** → massa de H2 nos cilindros → horas de turno.
4. **Vida útil e degradação** → troca do stack → custo anualizado.

Se um deles estiver errado por um fator, a comparação inteira muda de sinal.

## 3. Intuição física

- **Corrente é taxa de reação.** Cada elétron que passa pelo circuito veio de "meia molécula"
  de H2. Logo, contar ampères é contar moléculas de H2. Isso é a lei de Faraday, e ela não
  depende do fabricante.
- **Tensão é qualidade da conversão.** A reação H2 + ½ O2 libera uma energia que, convertida
  em volts, vale 1,48 V (com a água líquida) ou 1,25 V (com a água em vapor). A célula entrega
  0,6 a 0,9 V. A diferença vira **calor**.
- **Em série, a corrente é a mesma em todas as células.** A tensão soma; o consumo de H2
  também soma. Um stack de 56 células gasta 56 vezes o H2 de uma célula pela mesma corrente.

## 4. Equações com unidades

**Faraday (consumo de H2), por célula:**

ṅ_H2 [mol/s] = I [A] / (2 · F [C/mol]),  F = 96 485,33 C/mol.

Em massa, por ampère-hora, para N células em série:

m_H2 / Q = N · M_H2 / (2F) = N · 2,01588 g/mol / (2 · 96 485,33 C/mol) × 3 600 C/Ah
= N × 0,037609 g/Ah.

**Vazão de gás em slpm:** V̇ [L/min] = ṅ [mol/s] × V_m [L/mol] × 60 [s/min], com
V_m = R·T/P = 22,414 L/mol a 0 °C e 1 atm (convenção da Ballard).

**Ar:** o O2 recebe 4 elétrons por molécula, ṅ_O2 = I/(4F); o ar tem 20,95 % de O2, então
ṅ_ar = λ · I / (4F · 0,2095). **λ (lambda)** é a estequiometria: quantas vezes mais reagente
do que a reação consome.

**Eficiência de tensão:** η = V_célula / E_ΔH, com E_ΔH = ΔH / (2F):
E_HHV = 285,83 kJ/mol / (2F) = 1,4812 V; E_LHV = 241,83 kJ/mol / (2F) = 1,2532 V.

**Calor gerado:** Q̇ [W] = N · I [A] · (E_ΔH − V_célula) [V].

**Potência elétrica:** P [W] = N · V_célula [V] · I [A].

## 5. Exemplo resolvido à mão

Stack de 56 células a 65,3 A, 0,66 V por célula (Tab. 2 da SPC, valor típico).

1. **Potência:** 56 × 0,66 V × 65,3 A = 36,96 V × 65,3 A = **2 413,5 W**.
2. **H2 por Ah:** 56 × 0,037609 = **2,106 g/Ah**. Por hora a 65,3 A:
   2,106 × 65,3 = **137,5 g/h**.
3. **Ah por kg:** 1 000 g / 2,106 g/Ah = **474,8 Ah/kg**.
4. **Vazão de H2 por célula (λ = 1):** 65,3 / 192 970,66 = 3,3839 × 10⁻⁴ mol/s;
   × 22,414 × 60 = **0,455 slpm**. A folha diz ~0,5 porque inclui o excesso (λ ≈ 1,07).
5. **Ar por célula (λ = 1):** 0,455 / 2 / 0,2095 = **1,086 slpm**. A folha diz ~50 slpm, que
   é λ ≈ 46. O excesso é o ar de **refrigeração**.
6. **Eficiência:** 0,66 / 1,4812 = **44,6 % (HHV)**; 0,66 / 1,2532 = **52,7 % (LHV)**.

## 6. Comparação com o código

Cada passo acima é uma função em `celula/conferencias_e0.py`:

| Passo | Função | Teste |
|---|---|---|
| 1 | `potencia_stack` | `test_potencia_stack_56_celulas` |
| 2–3 | `h2_por_carga`, `carga_por_h2` | `test_h2_por_ah_56_celulas`, `test_ah_por_kg_uma_e_56_celulas` |
| 4 | `vazao_h2_estequiometrica` | `test_vazao_h2_estequiometrica_65A` |
| 5 | `vazao_ar_estequiometrica` | `test_vazao_ar_estequiometrica_65A` |
| 6 | `eficiencia_tensao` | `test_eficiencia_tensao_066V` |

O código usa a biblioteca **pint**: cada número carrega sua unidade, e somar volts com
ampères dá erro em vez de um resultado errado.

**Comando para rodar os testes** (você ainda não precisa rodar; explico antes):

```
cd rb30-tese
.venv/bin/python -m pytest -q
```

- `cd rb30-tese` entra na pasta do projeto;
- `.venv/bin/python` usa o Python do ambiente virtual, com as versões fixas da tese;
- `-m pytest` executa o programa de testes, que procura funções `test_*` na pasta `testes/`;
- `-q` (*quiet*) mostra só um ponto por teste e o resumo. Se algum valor calculado divergir
  do valor feito à mão, o teste falha e mostra os dois.

## 7. Erros comuns (e o que causariam no RB-30)

| Erro | Exemplo nesta fase | Consequência num veículo real |
|---|---|---|
| Esquecer o número de células | O dossiê usou 26,59 kAh/kg, que vale para **uma** célula. O stack faz 474,8 Ah/kg. | Autonomia superestimada **56 vezes**: o veículo pararia sem H2 no meio do turno, com o operador longe do ponto de recarga. |
| Condição padrão diferente | slpm a 20 °C em vez de 0 °C → 7 % a mais de vazão | Medidor de vazão mal escolhido; balanço de massa do H2 "não fecha" e esconde um vazamento real. |
| Prefixo perdido | Ler "30 V/ciclo/célula" em vez de 30 µV | Modelo de vida absurdo; ou, no caminho inverso, um limite de alarme 10⁶ vezes fora. |
| Temperatura ambiente × temperatura do stack | Folha comercial: "operating −40 a 52 °C" é do **ambiente**; o stack opera a 26–66 °C | Software desligaria o stack a 52 °C, abaixo da temperatura normal a plena carga (61–66 °C): o veículo perderia tração em aclive com carga. |
| Pressão absoluta × manométrica | Tratar 136 kPa (abs) como 136 kPa g | 2,4 bar absolutos na entrada, acima do limite de segurança de 200 kPa abs: risco de dano à membrana e de vazamento de H2. |
| Misturar valor mínimo e típico | 41,1 W com 0,66 V (folha comercial) | Erro de 4,6 % na potência; acumulado com outros, muda o tamanho da bateria. |
| Comparar eficiência em bases diferentes | 44,6 % (HHV) contra 52,7 % (LHV) do mesmo ponto | Um artigo parece 8 pontos "melhor" sem ser. |

## 8. Exercícios

1. Um stack de 36 células da mesma família opera a 51,7 A com a tensão típica da Tab. 2.
   Calcule (a) a potência; (b) o consumo de H2 em g/h; (c) a eficiência de tensão em HHV e LHV.
2. O vazamento externo após 1 500 h é 12 cc/min por célula a 36 kPa g. Para o stack de 56
   células, calcule a perda de H2 num turno de 8 h, em gramas, e compare com o consumo de um
   turno a 29,0 A constantes.
3. A folha diz "fuel supply pressure 0,16 to 0,56 bar g". O RB-30 vai a um local a 800 m de
   altitude, onde a pressão atmosférica é cerca de 92 kPa. Se o regulador for ajustado em
   0,35 bar g, qual pressão absoluta chega ao stack? Está dentro da faixa da SPC?

Gabarito em `aulas/gabaritos/00_ficha_celula_gabarito.md`. Tente antes de abrir.

## 9. Glossário

- **BOL / EOL** — *beginning / end of life*: início e fim de vida útil.
- **Cátodo aberto** — o lado do ar fica exposto ao ambiente, com ventilador; o ar refrigera e
  oxida.
- **Dead-ended** — ânodo fechado na saída; o H2 só sai na purga.
- **Estequiometria (λ)** — razão entre o reagente fornecido e o consumido.
- **Faraday (F)** — carga de um mol de elétrons, 96 485,33 C/mol.
- **HHV / LHV** — poder calorífico superior (água líquida) e inferior (vapor).
- **OCV** — *open circuit voltage*, tensão sem corrente.
- **Partida ar-ar** — partida com ar dos dois lados da membrana; degrada o catalisador.
- **Purga** — abertura breve da saída do ânodo para expulsar água e inertes acumulados.
- **slpm** — litro padrão por minuto; na Ballard, a 0 °C e 1 atm.
- **Stack** — pilha de células em série.
- **Turn-down** — razão entre a vazão máxima e a mínima que o ventilador consegue.
