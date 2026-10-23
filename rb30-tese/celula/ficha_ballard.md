# Ficha técnica — Ballard FCgen®-1020ACS (56 células)

Fase E0 · elaborada em 23/10/2026 · todas as fontes acessadas em 23/10/2026.

## Como ler esta ficha

Cada linha tem valor, unidade, condição, fonte, tag e status.

- **Tags:** [DF] folha do fabricante; [L] literatura; [C] calculado aqui; [H] hipótese; [?] pendente.
- **Status:** **confirmado** (lido na folha original da Ballard); **só em artigo** (lido em
  relatório ou artigo, não na folha); **segunda mão** (revendedor ou resumo, sem conferir no
  original); **lacuna** (nenhuma fonte pública encontrada).
- Os cálculos [C] estão em `celula/conferencias_e0.py` e têm teste em
  `testes/test_conferencias_e0.py`.

## Fontes primárias

| Código | Documento | Onde | SHA-256 do PDF baixado |
|---|---|---|---|
| **SPC** | Ballard, *FCgen®-1020ACS/FCvelocity®-1020ACS Fuel Cell Stack — Product Specification*, SPC5103429-0E, 31/10/2019, 10 p. | [arquivos.saebrasil.org.br](http://arquivos.saebrasil.org.br/SPC5103429-0E%20Product%20Specification%20FCgen-1020ACS,%20FCvelocity-1020ACS%20Fu....pdf) | `4102fc66…6079` |
| **DS** | Ballard, *FCgen®–1020ACS* (folha comercial), SPC510559-01H, 06/2021, 2 p. | [ballard.com](https://www.ballard.com/wp-content/uploads/2024/08/Ballard_FCgen_1020ACS_specs.pdf) | `041a3853…9308` |
| **WEB** | Ballard, página FCgen® – Fuel Cell Stacks | [ballard.com/fcgen](https://www.ballard.com/fcgen/) | (página) |
| **DOE** | Plug Power, *Air-Cooled Stack Freeze Tolerance — Final Scientific Report*, DE-EE0000473, 13/02/2012, 57 p. | [osti.gov 1034766](https://www.osti.gov/servlets/purl/1034766) | `6d56e297…5062` |
| **DOE12** | Hancock (Plug Power), *V.F.1 Air-Cooled Stack Freeze Tolerance*, DOE FY2012 Annual Progress Report, p. V-206 a V-208 | [hydrogen.energy.gov](https://www.hydrogen.energy.gov/docs/hydrogenprogramlibraries/pdfs/progress12/v_f_1_hancock_2012.pdf) | (não arquivado) |
| **AIF** | Ballard, *Annual Information Form* FY2025 (Form 40-F, SEC) | [sec.gov](https://www.sec.gov/Archives/edgar/data/1453015/000162828026017045/ballard993123125annualinfo.htm) | (página) |
| **QT** | QuinTech GmbH (revendedor, Alemanha), páginas dos stacks 1020ACS | [quintech.de/ballard](https://www.quintech.de/en/kategorie/manufacturer/ballard) | (página) |

A SPC é a fonte mais completa e é a referência desta ficha. Ela cita o manual de
integração **MAN5100319** (*1020ACS Product Manual and Integration Guide*) e os desenhos de
interface **DRW5117682** e **DRW5122456**. **Nenhum dos três é público**; foram procurados e não
encontrados. Por isso a maior parte do item "manual do usuário e guia de integração" é lacuna.

Os PDFs ficam em `celula/fontes_pdf/`, fora do git (ver DEC-003). O hash permite
provar qual versão foi lida.

## 1. Conciliação da potência nominal (pedida no item 4)

**Resultado:** a potência nominal de 56 células é **2,30 kW no mínimo** e **2,41 kW típica**,
a 65,3 A, no início de vida (BOL). É potência **bruta do stack**, não líquida.

| Grandeza | Valor | Condição | Fonte | Tag | Status |
|---|---|---|---|---|---|
| Potência por célula, mínima ("greater than") | 41,1 W/célula | 65,3 A, BOL, condições da Tabela 3 | SPC p. 6, Tab. 2 | [DF] | confirmado |
| Tensão por célula, mínima | 0,63 V | idem | SPC p. 6, Tab. 2 | [DF] | confirmado |
| Potência por célula, típica | 43,1 W/célula | idem | SPC p. 6, Tab. 2 | [DF] | confirmado |
| Tensão por célula, típica | 0,66 V | idem | SPC p. 6, Tab. 2 | [DF] | confirmado |
| Potência do stack de 56 células, mínima | 2 301,6 W (= 56 × 41,1) | idem | cálculo | [C] | — |
| Potência do stack de 56 células, típica | 2 413,6 W (= 56 × 43,1) | idem | cálculo | [C] | — |
| Folha comercial: potência e tensão "nominais" | 41,1 W/célula e 660 mV/célula | "lab ambient 20 °C, 30 % UR", "at rated power" | DS p. 2 | [DF] | confirmado (mas incoerente, ver abaixo) |

**Achado 1 — a folha comercial mistura duas linhas da tabela.** A DS (2021) dá 41,1 W/célula e
660 mV/célula. Mas 0,660 V × 65,3 A = 43,1 W, não 41,1 W. Na SPC, 41,1 W é o valor **mínimo**
(par de 0,63 V) e 660 mV é o valor **típico** (par de 43,1 W). O teste
`test_tabela_tipica_e_coerente_v_vezes_i` confirma que a SPC é coerente consigo mesma
(V × I = P em todas as colunas). **Decisão proposta:** usar a SPC, com a faixa mínima–típica
como incerteza de início de vida (ver H-003).

**Achado 2 — o dossiê (≈ 2,3 kW = 56 × 41,1 W) usa o valor mínimo**, o que é conservador, e
não o típico. Isso não é erro, mas precisa estar declarado: 4,6 % de diferença
(2 413,6 / 2 301,6 = 1,049).

**Achado 3 — "1020" não é potência.** O nome não sugere 1 020 W. No relatório DOE o stack é
chamado de "Mk1020" (Mark 1020), designação de plataforma da Ballard (DOE p. 3). O mesmo
nome cobre stacks de 10 a 80 células (SPC p. 4, Tab. 1): de 10 × 41,1 = 411 W até
80 × 41,1 = 3 288 W, exatamente a faixa "400 W to 3,3 kW" da página WEB. Não achei documento
que atribua significado numérico a "1020"; tag [H].

**Achado 4 — as faixas de potência divergem entre documentos.** WEB: 400 W a 3,3 kW. DS:
450 W a 3 kW. QT: 300 W a 3 kW. Só a da WEB bate com 10 e 80 células a 41,1 W. As outras
duas não têm cálculo explicado. Registrado, sem efeito para 56 células.

**Achado 5 — potência líquida não existe na folha.** A Ballard vende só o stack, "with no moving
parts" (DS p. 1). Ventilador, válvulas e controlador são do integrador. Logo:
P_líquida = P_stack − P_ventilador − P_controle − P_válvulas. Esses consumos serão
dimensionados na fase C (ventilador) e F (controle). É lacuna de projeto, não de informação.

## 2. Desempenho eletroquímico (BOL)

Tabela 2 da SPC (p. 6), operação nas condições da Tabela 3. Estes são os pontos de
calibração da curva de polarização da fase B.

| Corrente do stack (A) | 0 | 7,3 | 14,5 | 29,0 | 51,7 | 65,3 | 75,0 |
|---|---|---|---|---|---|---|---|
| V/célula mínima | 0,93 | 0,80 | 0,77 | 0,73 | 0,67 | 0,63 | 0,59 |
| W/célula mínima | 0 | 5,8 | 11,2 | 21,2 | 34,6 | 41,1 | 44,1 |
| V/célula típica | 0,99 | 0,83 | 0,80 | 0,76 | 0,70 | 0,66 | 0,62 |
| W/célula típica | 0 | 6,1 | 11,6 | 22,0 | 36,2 | 43,1 | 46,5 |
| Temperatura recomendada do stack (°C) | 26 | 30 | 34 | 41 | 53 | 61 | 66 |

Tag [DF], status **confirmado**. Observações:

- **Área ativa:** não publicada. Sem ela não se calcula densidade de corrente (A/cm²). Lacuna;
  pergunta F-01.
- **Tensão do stack de 56 células [C]:** circuito aberto 52,1 V (mín.) a 55,4 V (típ.); a 65,3 A,
  35,3 V a 37,0 V; a 75 A, 33,0 V a 34,7 V. **A tensão do stack atravessa a tensão
  do barramento de 36 V do RB-30**, acima em carga leve e abaixo em carga plena. Isso
  justifica um conversor que eleve e abaixe (buck-boost), como previsto no item 8.
- **75 A** aparece na tabela, mas a SPC não diz se é contínuo ou de pico. Corrente máxima contínua:
  lacuna; pergunta F-02.
- **Corrente mínima:** a tabela começa em 0 A (OCV), mas o DOE mostra que ficar em OCV degrada a
  membrana (DOE p. 49, estressor B). Ver seção 7.
- **Curva com degradação:** os números acima valem só no início de vida (SPC p. 4, 1.1).

## 3. Combustível (H2)

| Parâmetro | Valor | Unidade | Condição | Fonte | Tag | Status |
|---|---|---|---|---|---|---|
| Pureza | ≥ 99,95 | % | composição nominal | SPC p. 8, Tab. 6; DS p. 2 | [DF] | confirmado |
| Inertes totais | < 500 (pico < 19 000) | ppm | | SPC p. 8 | [DF] | confirmado |
| CO | < 0,2 (pico < 10) | ppm | | SPC p. 8 | [DF] | confirmado |
| Enxofre total | < 0,004 | ppm | nominal e pico | SPC p. 8 | [DF] | confirmado |
| Água | < 5 (pico < 19 000) | ppm | "dry fuel preferred" | SPC p. 7–8 | [DF] | confirmado |
| Pressão ótima de entrada | 136 | kPa abs | operação | SPC p. 7 | [DF] | confirmado |
| Faixa de pressão de entrada | 116 a 156 | kPa abs | operação | SPC p. 7 | [DF] | confirmado |
| Faixa de pressão (folha comercial) | 0,16 a 0,56 | bar g | | DS p. 2 | [DF] | confirmado |
| Pressão máxima admissível | 200 | kPa abs | limite de segurança | SPC p. 7 | [DF] | confirmado |
| Temperatura do H2 na entrada | −15 a +65 | °C | | SPC p. 7 | [DF] | confirmado |
| Estequiometria de entrada | ~1,07 (ótimo) | — | operação sem saída (dead-ended) | SPC p. 7 | [DF] | confirmado |
| Vazão de H2 | ~0,5 | slpm/célula | potência nominal | DS p. 2 | [DF] | confirmado |
| Purga recomendada | 20 cc/célula por purga (~6 slpm/célula) | | | SPC p. 9, Tab. 7 | [DF] | confirmado |
| Intervalo entre purgas | — | | | — | [?] | **lacuna** (no MAN5100319) |
| Intervalo de purga implícito | 2 460 | A·s | 20 cc/célula e λ = 1,07 | cálculo | [C] | — |
| Intervalo de purga relatado | 2 300 | A·s | aquecimento, bancada de teste | Segura e Andújar (2015) | [L] | **segunda mão** (resumo de busca; o artigo não abriu) |

**Achado 6 — conversão bar g da folha comercial.** 116 kPa abs − 100 kPa = 0,16 bar g e
156 − 100 = 0,56 bar g. A DS subtraiu 100 kPa, não 101,325 kPa (atmosfera padrão). Com
101,325 kPa a faixa é 0,147 a 0,547 bar g. A diferença é pequena, mas a SPC especifica
**pressão absoluta**. Em altitude a pressão atmosférica cai, e um regulador referenciado à
atmosfera (gauge) entrega pressão absoluta menor. Entra como requisito do regulador no kit
(ver H-005).

**Achado 7 — conferência (b) do item 5: vazão de H2.** A 65,3 A, Faraday dá 0,4551 slpm por
célula com λ = 1 (0 °C, 1 atm, a condição definida no glossário da SPC, p. 5). Com λ = 1,07
dá 0,487 slpm. A folha diz "~0,5". **Bate**: a folha inclui o excesso que sai na purga. O
"0,45" do enunciado vale para λ = 1; a 65 A em vez de 65,3 A seria 0,4530 slpm.

**Achado 8 — purga coerente.** Com 20 cc/célula por purga e λ = 1,07, cada purga deve ocorrer a
cada 2 460 A·s (37,7 s a 65,3 A). Um artigo de bancada relata 2 300 A·s, 7 % abaixo. A
coerência sugere que λ ≈ 1,07 já inclui a purga. Cada purga do stack de 56 células libera
0,101 g de H2 [C]. **Não tratar 2 300 A·s como dado do fabricante.**

## 4. Ar (oxidante e arrefecimento)

| Parâmetro | Valor | Unidade | Condição | Fonte | Tag | Status |
|---|---|---|---|---|---|---|
| Arrefecimento | ar (cátodo aberto); oxidante e refrigerante são o mesmo fluxo | — | | DS p. 1–2; SPC p. 6 | [DF] | confirmado |
| Vazão de ar | ~50 | slpm/célula | potência nominal | DS p. 2 | [DF] | confirmado |
| Estequiometria mínima de ar | 20 | — | regime permanente | SPC p. 6, Tab. 3 | [DF] | confirmado |
| Temperatura de entrada do ar, ótima | 10 a 40 | °C | | SPC p. 6 | [DF] | confirmado |
| Temperatura de entrada do ar, admissível | −20 a +52 | °C | desempenho degradado fora da ótima | SPC p. 6 | [DF] | confirmado |
| Umidade de entrada | 0 a 100 % UR sem condensação | — | redução de potência em UR baixa e T alta | SPC p. 6 | [DF] | confirmado |
| Contaminantes do ar | SO2 < 0,01 ppm; NO2 < 0,05 ppm; CO < 5 ppm; NH3 < 0,01 ppm; PM2,5 < 15 µg/m³; PM10 < 90 µg/m³ (nominais) | | | SPC p. 8, Tab. 5 | [DF] | confirmado |
| Perda de carga do stack no lado do ar | — | Pa | | — | [?] | **lacuna** (necessária para o ventilador) |

**Achado 9 — conferência (c): o que são os 50 slpm/célula.** Pela estequiometria de O2, a
65,3 A uma célula precisa de 1,086 slpm de ar com λ = 1. Então 50 slpm/célula equivale a
**λ ≈ 46**. Não é erro de unidade: num stack de cátodo aberto, o mesmo ar fornece o O2 **e**
remove o calor, e o calor exige muito mais ar que a reação. A SPC fixa o mínimo em λ = 20
(21,7 slpm/célula). A unidade é por célula, em slpm a 0 °C e 1 atm, na potência nominal. O
stack de 56 células precisa de 2 800 slpm ≈ 168 m³/h (normais).

Verificação térmica [C]: a 0,66 V, cada célula gera 53,6 W de calor em base HHV, ou 38,7 W em
base LHV. A 50 slpm/célula (1,077 g/s de ar), o ar esquenta 49,5 K (HHV) ou 35,8 K (LHV).
Com o ar a 20 °C e o stack a 61 °C (Tab. 3), a elevação real deve ficar abaixo de 41 K.
O valor LHV (35,8 K) é compatível; o HHV não é. Interpretação [H]: num cátodo aberto quase
toda a água sai como **vapor**, então o calor a remover se aproxima da base LHV. Isso será
testado no balanço térmico da fase C.

## 5. Temperaturas e partida a frio

| Parâmetro | Valor | Condição | Fonte | Tag | Status |
|---|---|---|---|---|---|
| Temperatura ambiente de operação | −40 a +52 °C | | SPC p. 7, Tab. 4 | [DF] | confirmado |
| Temperatura ambiente de standby e partida | −10 a +52 °C | número de partidas abaixo de zero "pode ser limitado" | SPC p. 7, nota 3 | [DF] | confirmado |
| Folha comercial: "Operating temperature" | −40 a +52 °C | | DS p. 2 | [DF] | confirmado (é **ambiente**, ver achado 10) |
| Página web: "Freeze start" | −40 a +52 °C | | WEB | [DF] | **conflita** com SPC (−10 °C) |
| Temperatura do stack (recomendada) | 26 a 66 °C, em função da corrente | Tab. 3 | SPC p. 6 | [DF] | confirmado |
| Lei de temperatura ótima (ajuste) | T = 0,531·I + 26,0 °C (R² = 0,9996) | ajuste linear da Tab. 3 | cálculo | [C] | — |
| Lei do dossiê | T = 0,56·I + 26,01 °C | | dossiê | [?] | **não confirmada** (achado 11) |
| Massa térmica | 100 J/°C por célula (5,6 kJ/°C para 56) | | SPC p. 10, Tab. 10 | [DF] | confirmado |
| Partida a −5 °C | ~5 min até partir | stack de teste | DOE p. 10, Fig. 3 | [L] | só em artigo |
| Partida a −15 °C e −20 °C | ~30 min até 80 % da potência | idem | DOE p. 10, Fig. 3 | [L] | só em artigo |
| Partidas consecutivas a −10 °C | 1ª sempre bem-sucedida; 2ª falha consistentemente; robusto a ≤ 5–8 ciclos | stack de 28 células, células de extremidade | DOE p. 17–19 | [L] | só em artigo |
| Energia de ponte para partir de −10 °C | ~15 × a da partida em temperatura ambiente | | DOE p. 17 | [L] | só em artigo |
| Redução de potência com ar de entrada frio | −2 % até −20 °C; −35 % de −20 a −45 °C | 65,3 A | DOE p. 8 | [L] | só em artigo |
| Corrente baixa abaixo de −20 °C | não opera abaixo de 65,3 A (limite de redução do ventilador) | | DOE p. 8 | [L] | só em artigo |
| Tempo de partida até 80 % | ~20 s | condição não informada | QT | [?] | **segunda mão** |

**Achado 10 — "operating temperature" é ambiente, não do stack.** A DS diz "Operating
temperature −40 °C to 52 °C", mas a SPC mostra que isso é temperatura **ambiente**
(Tab. 4). O stack opera a 26–66 °C (Tab. 3). Confundir os dois levaria a um limite de
alarme errado no software.

**Achado 11 — a lei T_opt = 0,56·I + 26,01 °C não sai da Tabela 3.** O intercepto bate
(26,0 °C), mas o ajuste dá 0,531 °C/A, não 0,56. A 65,3 A a lei do dossiê prevê 62,6 °C;
a tabela diz 61 °C. A 75 A: 68,0 °C contra 66 °C. Testei as 21 retas por dois pontos da
tabela. A mais próxima é a que passa por 7,3 A e 14,5 A: 0,556·I + 25,94 °C. Ela usa só os
dois pontos de corrente baixa e não reproduz 26,01 exatamente. O par 51,7–75 A dá 0,558,
mas com intercepto 24,2 °C. Hipótese de origem: reta pelos pontos de corrente baixa,
arredondada. A origem real fica pendente até eu ver o dossiê (pergunta ao pesquisador,
P-02). **Proposta:** usar o ajuste de todos os pontos da SPC, ou interpolar a tabela.

**Achado 12 — partida a −10 °C (cenário do item 9).** A SPC permite partir a −10 °C, mas limita o
número de partidas. O DOE mostra que partidas **consecutivas** a −10 °C falham sem
estratégia de sistema (recirculação de ar quente, aquecimento). Para a tese, o cenário de
−10 °C deve modelar uma partida isolada, com energia de ponte da bateria LFP, e apontar que
a repetição exige mitigação. A redução do ventilador (turn-down) de ~22 é necessária de 20 °C
a −30 °C (DOE p. 25, Tab. 1).

## 6. Altitude

| Parâmetro | Valor | Fonte | Tag | Status |
|---|---|---|---|---|
| Faixa | −400 m a +7 600 m, com redução de potência em altitude | SPC p. 6–7 | [DF] | confirmado |
| Ótimo | nível do mar | SPC p. 6 | [DF] | confirmado |
| Magnitude da redução por altitude | — | — | [?] | **lacuna** (pergunta F-05) |

## 7. Vida útil, degradação e manutenção

| Parâmetro | Valor | Condição | Fonte | Tag | Status |
|---|---|---|---|---|---|
| Degradação por ciclo liga-desliga (partida ar-ar) | 30 µV/ciclo/célula | típica | SPC p. 10, Tab. 11 | [DF] | confirmado (ver nota µ) |
| Degradação em regime | 12 µV/h/célula | 65,3 A | SPC p. 10, Tab. 11 | [DF] | confirmado |
| Vazamento externo de H2, BOL | < 5 cc/min por célula | 36 kPa g | SPC p. 9, Tab. 7 | [DF] | confirmado |
| Vazamento externo após 1 500 h e 1 000 ciclos | 12 cc/min por célula | 36 kPa g | SPC p. 10, Tab. 11 | [DF] | confirmado |
| Vazamento do stack de 56 células, BOL | 1,51 g/h = 1,10 % do consumo a 65,3 A | | cálculo | [C] | — |
| Idem, 1 500 h e 1 000 ciclos | 3,63 g/h = 2,64 % do consumo a 65,3 A | | cálculo | [C] | — |
| Ciclos de congelamento e descongelamento | > 470 | armazenamento | SPC p. 9 | [DF] | confirmado |
| Armazenamento | 3–30 °C: 2 anos; 30–50 °C: 1 mês; 50–70 °C: 3 dias | | SPC p. 9, Tab. 9 | [DF] | confirmado |
| Critério de fim de vida (EOL) | — | | — | [?] | **lacuna na folha** |
| Meta de vida, aplicação de manuseio de materiais | 5 000 h com > 0,54 V/célula a 51,7 A | Plug Power GenDrive | DOE12 p. V-206 | [L] | só em artigo |
| Durabilidade validada | média de 5 700 h em 6 stacks | idem | DOE12 p. V-206 | [L] | só em artigo |
| "Durabilidade nominal" | 5 000 h = 2,5 × a nominal, logo ~2 000 h | | DOE12 p. V-206 | [L] | só em artigo |
| Degradação medida em ciclo de empilhadeira | −13,3 a −27,1 µV/h a 51,7 A; −6,9 a −15,0 µV/h a 29,0 A | stacks de 36 células, 3 253 a 7 054 h | DOE p. 46, Tab. 4 | [L] | só em artigo |
| Melhoria anunciada na geração 2013 | 30 % a 50 % em durabilidade | | Press release Ballard, 16/04/2013 | [L] | só em artigo |
| Garantia | — | | — | [?] | **lacuna** |
| Rotinas de manutenção | — | no MAN5100319 | — | [?] | **lacuna** |

**Nota sobre µ.** No PDF da SPC, o prefixo das unidades de degradação e de material
particulado é o glifo U+F06D da fonte Symbol, que corresponde a "µ". Por isso a extração de
texto mostra "30 V/cycle/cell". A leitura correta é 30 µV/ciclo/célula. A Tabela 2 do DOE,
que usa µV/ciclo explicitamente, confirma a ordem de grandeza. Tratar como "30 V" seria um
erro de 10⁶.

**O que o DOE ensina para o RB-30 [L]:**
- Os modos dominantes de falha são a dissolução de platina e a corrosão de carbono nas
  **partidas ar-ar**. Num stack de cátodo aberto, **toda** partida é ar-ar (DOE p. 27, p. 56).
- Os estressores são quatro: (A) partidas ar-ar; (B) tempo em OCV; (C) corrente e temperatura
  altas; (D) potenciais mistos na partida e na parada (DOE p. 49).
- A estratégia de sistema (menos partidas, menos tempo em OCV, gestão da parada) foi mais
  barata que mudar o stack (DOE p. 56). Isso fundamenta a gestão de energia da fase G:
  manter a célula ligada no turno, com corrente mínima acima de zero, e deixar a bateria
  absorver transitórios.

**Ilustração [C] (não é previsão de vida):** um turno de 8 h a 65,3 A com uma partida
consome 8 × 12 + 30 = 126 µV por célula. Com o critério do DOE (0,54 V a 51,7 A) e a
tensão típica de 0,70 V a 51,7 A, a margem é 160 mV. O turno real terá corrente menor
e degradação diferente. A estimativa de vida fica para a fase I, com incerteza.

## 8. Dimensões, massa e montagem

| Parâmetro | Valor | Fonte | Tag | Status |
|---|---|---|---|---|
| Comprimento (empilhamento) | 55,4 + 5,5 × N mm → 363,4 mm para N = 56 | SPC p. 10, Tab. 10 | [DF] | confirmado |
| Dimensões, 56 células (C × L × A) | 363 × 103 × 351 mm | DS p. 2 | [DF] | confirmado |
| Altura e largura na SPC | altura 103 mm, largura 351 mm | SPC p. 10 | [DF] | **conflita** com a DS (L 103, A 351) |
| Massa seca | 2,1 + 0,16 × N kg → 11,06 kg para N = 56 | SPC p. 10 | [DF] | confirmado |
| Massa, 56 células | 11,0 kg | DS p. 2 | [DF] | confirmado |
| Choque e vibração | ensaiado em NEBS GR-63-CORE, UL 2267 (vibração), 15 g / 11 ms / 1 000 ciclos (IEC 60068-2-27 e -29) | SPC p. 7 | [DF] | confirmado (nota 5: com montagem por "spring-cap") |
| Pontos de fixação, terminais e conectores | — | DRW5117682 / DRW5122456 | [?] | **lacuna** |
| Drenagem | "água líquida pode se acumular na saída de combustível" | SPC p. 9 | [DF] | confirmado (detalhe: lacuna) |
| Ventilação, saída do ar e distância a obstáculos | — | MAN5100319 | [?] | **lacuna** |

**Achado 13 — orientação das dimensões.** A DS dá L × W × H = 363 × 103 × 351 mm; a SPC chama
103 mm de altura e 351 mm de largura. O volume é o mesmo, mas a orientação de montagem
(e de onde entra o ar) depende do desenho de interface. Pergunta F-08.

**Achado 14 — revendedor copia dados do stack de 56 células.** A QT dá 363 mm e 11,0 kg para os
stacks de 36 e de 80 células. Pela fórmula da SPC, o de 80 células teria 495 mm e 14,9 kg. Isso
mostra por que dado de revendedor não entra sem conferência.

## 9. Interface elétrica, controle e comunicação

| Item | Situação | Tag | Status |
|---|---|---|---|
| Protocolo CAN ou outro | **O stack não tem eletrônica.** Ele é vendido para integradores ("Sales to OEMs and system integrators", AIF; "no moving parts", DS). Não há CAN nem lista de sinais do stack. | [DF] + [H] | confirmado por ausência; pergunta F-09 |
| Monitoramento de tensão por célula | não mencionado; os desenhos de interface não são públicos | [?] | **lacuna** (F-10) |
| Sequência de partida e parada | no MAN5100319 (não público). O DOE descreve estratégias, sem passo a passo. | [?] | **lacuna** |
| Alarmes e códigos de falha | não existem no stack; são do controlador do integrador | [H] | — |
| Limite de reversão de célula usado pela Plug Power | < −0,2 V numa célula de extremidade gatilhou parada | [L] | só em artigo (DOE p. 19) |

**Consequência para a tese:** a lista de sinais, a máquina de estados e os alarmes da fase G
são **projeto nosso**. A fonte de verdade passa a ser a SPC e os achados do DOE, não um
manual do fabricante. Cada regra que inventarmos vai para `hipoteses.md` com teste.

## 10. Emissões e segurança

| Parâmetro | Valor | Fonte | Tag | Status |
|---|---|---|---|---|
| H2 no ar de exaustão | vazamento externo vai para o ar de arrefecimento | SPC p. 10 | [DF] | confirmado |
| Concentração de H2 no ar de saída, BOL [C] | 280 cc/min em 2 800 slpm = 0,01 % (100 ppm) à vazão nominal | cálculo | [C] | — |
| Água líquida | pode se acumular na saída de combustível | SPC p. 9 | [DF] | confirmado |

A diluição em vazão nominal é grande, mas em vazão mínima (carga baixa, frio) a concentração
sobe; e a purga lança 1,12 L de H2 de uma vez. Isso será dimensionado no P&ID da fase J.

## 11. Normas e certificação

| Norma | O que é | Verificação | Status |
|---|---|---|---|
| CAN/CSA-C22.2 No. 62282-2 | certificação do produto, "Fuel Cell Modules" (DS p. 2) | Título verificado no catálogo da CSA e do Conselho de Normas do Canadá: edição :18 (adota IEC 62282-2:2012 com desvios); a anterior :07 foi retirada. **A DS não diz qual edição.** Texto integral não lido. | parcial |
| IEC 62282-2 / 62282-2-100 | a IEC 62282-2:2012 foi substituída pela IEC 62282-2-100:2020 (*fuel cell modules — safety*) | Ficha no catálogo IEC (webstore) via resultado de busca; texto não lido | parcial |
| UL 2267 | *Fuel cell power systems for installation in industrial electric trucks*; ed. 3 (2020), revisão 12/02/2025 | Catálogo ANSI via busca; texto não lido. A SPC cita só o ensaio de **vibração** da UL 2267, não certificação. | parcial |
| NEBS GR-63-CORE | ensaio de transporte e terremoto (telecom) | citado na SPC p. 7 | só citado |
| IEC 60068-2-27 / -29 | choque (citado como "IEC-68-2-27, Ea" e "IEC-68-2-29, Eb") | citado na SPC p. 7 | só citado |

As normas do kit (IEC 62282-4-101, IEC 62282-4-102, ISO 23308-2, NR-10, NR-12, NR-20) **não
foram verificadas nesta fase**; serão lidas na fase J, antes de qualquer citação.

## 12. Integração em veículos e empilhadeiras (resultados medidos)

| Trabalho | O que mediu | Status |
|---|---|---|
| Plug Power / DOE DE-EE0000473 (2012) | 1020ACS em sistema GenDrive (empilhadeira, substituto de bateria chumbo-ácido); durabilidade > 5 000 h; operação 8 h a −30 °C; dados por stack na Tab. 4 | **lido no original** |
| Ballard, press release 16/04/2013 | Plug Power usa o 1020ACS no GenDrive, "drop-in replacements for lead-acid batteries in electric lift trucks" | lido no original |
| Shih, Lin, Chang, Wang. *Experimental tests of an air-cooling hydrogen fuel cell hybrid electric scooter.* Int. J. Hydrogen Energy 38 (2013) 11144–11148, doi:10.1016/j.ijhydene.2013.01.017 | scooter híbrido com stack de 2,3 kW refrigerado a ar + Li-ion + hidreto metálico; 53,2 km/h; 63,5 km a 30 km/h | **segunda mão** (acesso pago; o resumo não confirma que o stack é Ballard) |
| Segura, Andújar. *Modular PEM Fuel Cell SCADA & Simulator System.* Resources 4 (2015) 692–712, doi:10.3390/resources4030692 | bancada com FCgen-1020ACS; sequência de partida; purga a cada 2 300 A·s | **segunda mão** (acesso aberto, mas o servidor bloqueou o download automático) |

O caso Plug Power é a referência mais próxima do RB-30: um veículo industrial de bateria
chumbo-ácido convertido, com a mesma família de stack.

## 13. Compra, preço e importação

| Item | Valor | Fonte | Tag | Status |
|---|---|---|---|---|
| Produto em linha | sim: "FCgen®-1020ACS stacks — Material handling and backup power — Sales to OEMs and system integrators" | AIF FY2025 | [DF] | confirmado |
| Configuração de 56 células | P/N 5127058 (v2.1) ou 5133808 (v2.2) | SPC p. 4, Tab. 1 | [DF] | confirmado |
| Preço, 28 células (1,2 kW) | 3 290 € sem IVA, mais frete | QT | [DF de revendedor] | confirmado na página do revendedor |
| Preço, 36 células (1,6 kW) | 3 552 € sem IVA, prazo 8 semanas | QT | idem | idem |
| Preço, 80 células (3,3 kW) | 7 250 € sem IVA, prazo 8 semanas | QT | idem | idem |
| Preço, 56 células | não listado | — | [?] | **lacuna** (F-12) |
| Venda | QT vende só para empresas e instituições (B2B) | QT | | confirmado |
| Distribuidor no Brasil | nenhum encontrado | busca | [?] | **lacuna** |
| Classificação fiscal (NCM), tributos, licença de importação | — | — | [?] | **lacuna**; exige despachante |

O preço de 56 células fica entre os de 36 e 80 células, mas preço não é linear no número de
células. Na fase I ele entra como [E], com faixa larga e cálculo em código. **Até lá, não
usar nenhum valor como dado.**

## 14. Resumo das lacunas

1. Manual de integração MAN5100319: purga, partida e parada, alarmes, manutenção, ventilação.
2. Desenhos de interface DRW5117682 e DRW5122456: fixação, terminais, orientação, monitoramento.
3. Área ativa da célula (para densidade de corrente e calibração da fase B).
4. Corrente máxima contínua e de pico (75 A é contínuo?).
5. Perda de carga do lado do ar em função da vazão (para escolher o ventilador).
6. Magnitude da redução de potência em altitude e em umidade baixa.
7. Critério de fim de vida e garantia.
8. Edição da CSA 62282-2 em que o produto foi certificado.
9. Preço e prazo do stack de 56 células, e rota de importação para o Brasil.
10. Origem da lei T = 0,56·I + 26,01 °C do dossiê.

As perguntas correspondentes estão em `perguntas_ao_fabricante.md`.
