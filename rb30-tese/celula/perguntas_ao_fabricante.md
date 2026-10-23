# Perguntas à Ballard (e ao revendedor) sobre o FCgen-1020ACS de 56 células

Só o fabricante pode responder estas perguntas. Cada uma diz por que importa e qual fase
fica bloqueada sem a resposta. Contatos públicos: marketing@ballard.com (DS p. 2) e suporte
técnico +1 604 454-0900 (SPC p. 2). Revendedor B2B: QuinTech, team@quintech.de.

**Pedido principal:** cópia do *1020ACS Product Manual and Integration Guide* (MAN5100319) e
dos desenhos de interface DRW5117682 / DRW5122456. A SPC remete a eles. Eles respondem boa
parte das perguntas abaixo.

| Nº | Pergunta | Por que importa | Bloqueia |
|---|---|---|---|
| F-01 | Qual é a área ativa de cada célula (cm²)? | Converter corrente em densidade de corrente; comparar com a literatura | Fase B |
| F-02 | Qual é a corrente máxima contínua? E a de pico, com duração? 75 A da Tab. 2 é contínuo? | Limite I_max da gestão de energia e do conversor | Fases B, F, G |
| F-03 | Qual é o intervalo de purga recomendado (por carga em A·s, por tempo, ou por queda de tensão) e a duração da abertura da válvula? | Consumo e perda de H2; P&ID; estado Run | Fases A, G |
| F-04 | Qual é a sequência recomendada de partida e de parada? Como minimizar partidas ar-ar e potenciais mistos? | Estados Start e Shutdown; vida útil | Fase G |
| F-05 | De quanto é a redução de potência com altitude e com umidade baixa? Há curva? | Operação fora do nível do mar | Fase B |
| F-06 | Qual é a perda de carga do lado do ar em função da vazão (curva Δp × slpm)? | Escolha do ventilador e potência parasita | Fase C |
| F-07 | Qual é o critério de fim de vida (tensão, potência, vazamento) e qual é a garantia? | Custo anualizado e troca do stack | Fase I |
| F-08 | Qual é a orientação de montagem? A DS dá L × W × H = 363 × 103 × 351 mm; a SPC chama 103 mm de altura. Onde ficam a entrada e a saída de ar? | Arranjo físico no veículo | Fase J |
| F-09 | Confirmam que o stack não tem eletrônica de comunicação? Há placa de monitoramento de tensão (CVM) opcional? | Lista de sinais e integração | Fases G, H |
| F-10 | Os desenhos de interface incluem terminais de tensão por célula ou por grupo de células? | Detectar reversão de célula (o DOE usou −0,2 V) | Fases G, H |
| F-11 | Em que edição da CAN/CSA-C22.2 No. 62282-2 o produto foi certificado (:07 ou :18)? Há certificado para uso móvel ou em veículo industrial (UL 2267)? | Checklist de segurança do kit | Fase J |
| F-12 | Preço, prazo e quantidade mínima do stack de 56 células (P/N 5133808, v2.2). Vendem para pesquisa universitária no Brasil? Por qual distribuidor? | CAPEX e cronograma | Fase I |
| F-13 | Qual é o número permitido de partidas a −10 °C ("may be limited", SPC nota 3)? Há procedimento de partida a frio? | Cenário de partida a −10 °C | Fases C, G |
| F-14 | Qual é a máxima taxa de variação de corrente (A/s) recomendada? | Limitação de taxa na gestão de energia | Fase G |
| F-15 | Qual é o tempo máximo admissível em OCV e qual a corrente mínima recomendada em regime? | Corrente mínima I_min; vida útil | Fase G |
| F-16 | O vazamento externo de 5 cc/min/célula a 36 kPa g escala como com a pressão de operação (136 kPa abs ≈ 35 kPa g)? | Balanço de massa do H2 | Fase A |
| F-17 | Qual é a resistência de isolamento mínima do stack para a massa e a tensão de ensaio dielétrico? | Aterramento e NR-10 | Fase J |

## Perguntas ao despachante ou à Receita (importação)

| Nº | Pergunta |
|---|---|
| I-01 | Classificação NCM de um stack PEM sem eletrônica, e alíquotas (II, IPI, PIS/COFINS, ICMS). |
| I-02 | Exige licença de importação ou anuência (Inmetro, outro órgão)? |
| I-03 | Há regime para importação por instituição de pesquisa (por exemplo, a Lei 8.010/1990 via CNPq) aplicável a um bem do pesquisador? |
