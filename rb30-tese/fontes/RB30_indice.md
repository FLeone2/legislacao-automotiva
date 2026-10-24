# Índice dos documentos do RB-30

Leitura integral em 24/10/2026, em blocos de no máximo 20 páginas: manual pp. 1–20, 21–40,
41–60 e 61–72; catálogo PDF pp. 1–20 e 21–40.

| Código | Documento | Arquivo (fora do git, DEC-003) | SHA-256 |
|---|---|---|---|
| **MAN** | Manual de instruções *Veículo Elétrico RB*, versão em português MP-0379, edição nº 03/2011, código 1190408, Máquinas Agrícolas Jacto S.A. — Divisão Veículos Jacto, 72 p. | `fontes/manual_RB30_1190408.pdf` | `ecced237ec76789faf1ca52e6934aa64f7689350a2f507ef48263763008fb25e` |
| **CAT** | Catálogo de peças RB30-S4 PLUS, código 1185669 — **recorte das páginas impressas 44 a 83** (40 p. no PDF), marcado "Cópia controlada — Proibida a reprodução e distribuição" | `fontes/catalogo_RB30-S4PLUS_1185669.pdf` | `0be0e95d8303ef54680a9832ae671e33f7de7314e25eb5946ce7499c07c09e22` |

**Numeração.** No MAN, a página impressa coincide com a página do PDF. No CAT, cito a página
**impressa**; a do PDF é a impressa − 43. O título do MAN diz "Veículo elétrico RB" (linha
RB); o modelo RB30-S4 PLUS aparece no CAT p. 55, que lista o MAN 1190408 como manual deste
modelo.

## 1. Manual (MAN), por capítulo

| Págs. | Capítulo / seção | O que interessa à tese | Parâmetros |
|---|---|---|---|
| 1–8 | Capa, índice geral, introdução, plaqueta de identificação, índice detalhado | Edição e código; marca registrada | — |
| 9–12 | **Cap. 1 — Precauções**: manual de segurança, adesivos, recomendações | Aclive/declive ≤ 20 %; carga inicial 8–10 h; **câmara frigorífica: 30 min contínuos**; não alterar o sistema elétrico; só áreas privadas (restrições que o enunciado declara não aplicáveis) | `aclive_max_sem_carga`, `limite_camara_frigorifica`, `tempo_carga` |
| 13–16 | **Cap. 2 — Especificações técnicas**: apresentação (13), dimensões e massas (14), vistas em planta (15), rodas, desempenho e sistema elétrico (16) | **Tabela principal do veículo** | todo o grupo `veiculo`, `potencia_motor`, `bateria_original` |
| 17–23 | **Cap. 3 — Principais componentes**: painel, chave, farol (17); seta e indicadores de bateria (18); horímetro, **botão de emergência** (19); chave F/N/R e buzina (20); **pedais e homem-morto**, freio de estacionamento (21); extintor ABC, banco, plataforma 25 kg (22); engate, sinalizador (23) | Sinais que o kit precisa respeitar: homem-morto aciona a contatora principal; emergência isola a bateria; ré reduz a velocidade e soa alarme | `intertravamentos`, `tensao_recarga_indicador` |
| 24–26 | **Cap. 4 — Operação**: cinto (24), sequência de partida em 12 passos (25), **distribuição de carga e rampas** (26) | Aclive/declive 10 % (carregado) e 20 % (vazio), carreta com freio acima de 1 500 kg | `aclive_*`, `carga_recomenda_carreta_com_freio` |
| 27–40 | **Cap. 4 — Bateria**: manuseio (27), **retirada da bateria com carriola** (28–30), cuidados e torque (31), teste (32), densidade (33), tensão de circuito aberto (34), **tabelas Saturnia e Moura** (35), eletrólito (36–37), armazenamento (38), **profundidade de descarga** (39), **esquema de ligação 125 A NH e cabos 25** (40) | Modelo da bateria de chumbo (fase D): OCV × SOC por elemento; DoD 50 %/80 %; 18 elementos | `descarga_*`, `ocv_*`, `densidade_*`, `cabo_potencia_bateria`, `fusivel_principal` |
| 41–46 | **Cap. 4 — Carregador**: introdução e fotos (41), segurança (42), instalação (43), aterramento, extensão e operação (44), manutenção (45–46) | **Carregador só para chumbo-ácido líquido**: o cenário LFP precisa de outro carregador | `carregador`, `carregador_tipo_bateria` |
| 47–52 | **Cap. 5 — Manutenção, freios**: tipos (47), regulagem do estacionamento (48), fluido (49), ajuste das lonas (50), sangria (51), inspeção do veículo e pneus (52) | Freio a tambor hidráulico nas rodas dianteiras e traseiras; pode haver versão mecânica | `freio_*`, `fluido_freio` |
| 53–54 | **Esquema elétrico de potência e comando** (53) e **diagrama de sinalização RB-30 Série 4** (54) | Base do diagrama unifilar do kit (fase J): bateria → botão de emergência → fusível 125 A → contatora → B+; armadura A1/A2 e campo S1/S2; comando com fusíveis 15 A e diodo; potenciômetro 5 kΩ; conversor 36/12 V com fusíveis 10 A na saída | `acelerador`, fusíveis |
| 55–57 | **Guia de falhas Curtis 1243**: Current Shunt, HW Failsafe, M-Shorted, SRO, Throttle Wiper, EMR Rev (55); HPD/SRVC/Disable, Field Short, Main Cont Welded, Field Open (56); Missing Contactor, **Low Battery Voltage, Overvoltage, Thermal Cutback 85 °C / −25 °C**, Anti-Tiedown, Motor Hot/Warm (57) | Lista de falhas que a integração não pode mascarar (fase G) | `controlador`, `corte_termico_*`, `protecoes_tensao_controlador` |
| 58 | Verificação geral da instalação com programador Curtis 1307 | Procedimento de comissionamento reaproveitável no kit | — |
| 59 | **Fusíveis** F1–F6 e acesso à caixa | 15 A comando, 15 A conversor, 10 A sinalização | `fusivel_*` |
| 60–63 | Teste do homem-morto, direção, lubrificação, limpeza | Teste do homem-morto com rodas suspensas | — |
| 64–67 | **Inspeções**: pré e pós-operação (64), intervalos 8/40/170/500/1000/2000 h (65), quadro de inspeções (66–67) | Base do manual de manutenção do kit | — |
| 68 | **Informações de serviço**: escovas 30/15 mm, densidade 1,275, **fusíveis 125/15/10 A**, lubrificantes | | `escova_motor_nova`, `oleo_diferencial` |
| 69–72 | **Cap. 6 — Garantia** (1 ano ou 1 000 h) | Não se aplica: veículo sem garantia vigente (enunciado) | — |

**O que o manual não tem:** entre-eixos e distribuição de massa por eixo; relação de
transmissão e raio dinâmico do pneu; curva do motor; níveis de corte de tensão do Curtis;
potência do conversor 36/12 V; resistência ao rolamento. Ver `dados/pendencias.md`.

## 2. Catálogo (CAT), por página impressa

| Pág. | Desenho | Conjunto | Interesse |
|---|---|---|---|
| 44 | EV9-343 | Kit cinto de segurança 2 pontos retrátil | — |
| 45 | EV9-389 | Pneu SE/PR 4.00-8 completo (maciço) | Pneu padrão |
| 46 | EV9-389 | Pneu SE/BR 4.00-8 completo (Soft Shoe Rib branco) | |
| 47 | EV9-455 | Pneu PN 5.00 x 8" completo (com câmara, "1000 kg") | Capacidade de carga do pneu |
| 48 | EV9-360 | Torre da direção completa | |
| 49 | EV9-354 | **Motor completo** 974907 | Motor de tração |
| 50 | EV9-361 | Mancal do pinhão completo | |
| 51 | EV9-457 | **Kit carregador monofásico 36 V/45 A – 220 V** | |
| 52 | EV9-370 | Kit carregador trifásico 36 V/45 A – 440 V | |
| 53 | EV9-370 | Kit carregador trifásico 36 V/45 A – 460 V | |
| 54 | EV9-372 | Kit fechamento de lona preto | |
| 55 | EV9-352 | Kit catálogo e manual RB30-S4 PLUS | Identifica manual 1190408 e catálogo 1185669 |
| 56 | EV9-456 | Pneu montado 5.00-8, roda 5 furos | |
| 57 | EV9-455 | Pneu montado 3.75-8, roda 5 furos | |
| 58 | EV9-370 | **Kit carregador trifásico 36 V/45 A – 220 V** (1229936) | |
| 59 | EV9-370 | **Kit carregador trifásico 36 V/45 A – 380 V** (1229938) | |
| 60 | EV9-271 | Kit jogo pneus montados 3.75 e 5.00 | |
| 61 | EV9-246 | **Kit conversor de voltagem** (DC/DC 36/12 956672) | Mantido no kit |
| 62 | EV9-278 | **Kit suporte troca de baterias** 357201 | Arranjo físico (fase J) |
| 63 | EV9-288 | Adesivo | |
| 64 | EV9-458 | Cubo da roda completo | |
| 65 | EV9-456 | Kit estepe 3,75-8 | |
| 66 | EV9-379 | Braço da suspensão prensado | |
| 67 | EV9-473 | Caçamba completa | |
| 68 | EV9-465 | Quadro do para-brisa | |
| 69 | EV9-466 | Suporte traseiro | |
| 70 | EV9-468 | **Cilindro mestre** | Freio hidráulico |
| 71 | EV9-470 | Impulsor completo | |
| 72 | EV9-460 | Sinalizador completo | |
| 73 | EV9-461 | Mancal do garfo completo | |
| 74 | EV9-479 | **Kit carregador monofásico 36 V – 250/400 Ah (1 kW), conector Anderson 175 A** | Conector de potência |
| 75 | EV9-509 | **Circuito de potência**: motor, diodos, fusível magnético retardado, fusíveis 10 A e 15 A | Unifilar |
| 76 | EV9-507 | Protetor das lanternas | |
| 77 | EV9-501 | **Kit botão de emergência** | Mantido no kit |
| 78 | EV9-500 | Tampa traseira | |
| 79 | EV9-499 | Kit estepes pneumáticos | |
| 80 | EV9-498 | Engate simples | |
| 81 | EV9-372 | Kit fechamento de lona branco | |
| 82 | EV9-504 | Kit banco sem apoio de braço | |
| 83 | EV9-496 | Kit banco com apoio de braço | |

**O que falta no recorte (pp. 1–43):** controlador Curtis, contatora, bateria e caixa,
eixo traseiro e diferencial, freios de roda, chassi e direção. Pendência P-07.

A lista de todos os itens (234 linhas) está em `dados/catalogo_pecas.csv`, gerada por
`fontes/extrair_catalogo.py`. O texto do PDF usa fonte Type 3 codificada, então a extração
é por OCR (Tesseract 5.3.4, português). Seis códigos lidos errado pelo OCR foram conferidos
na imagem a 300 dpi e corrigidos: 974774, 852251, 437178, 437194, 477588, 678722. A coluna
`origem` diz de onde veio cada linha.

## 3. Conferência dos dados do enunciado

| Dado do enunciado | O que o PDF diz | Situação |
|---|---|---|
| 780 kg, p. 14 | Igual; não diz qual bateria está embarcada | ✔ com ressalva |
| 36 V / 252 Ah (8 h); 350 kg Saturnia ou 408 kg Moura, p. 16 | Igual | ✔ |
| 3 000 kg, piso seco e plano, bateria carregada, 0,22 m/s por 30 s, p. 14 | Igual; "período **mínimo** de 30 s" | ✔ |
| Caçamba 25 kg, 350 × 835 mm, p. 14 | Igual (L2 = 350 comprimento, b4 = 835 largura); a p. 22 a chama de "plataforma" | ✔ |
| 17 km/h, p. 16 | Igual | ✔ |
| 280 kgf, p. 16 | O manual escreve "280 **kg**" | ✔ (unidade interpretada) |
| 3,5 HP (2,6 kW), SEPEX, Curtis 1243, p. 16 e 55–57 | p. 16 não cita a Curtis; o nome "1243" está no guia de falhas (55–57) | ✔ |
| Freio de serviço hidráulico, estacionamento mecânico, p. 16 e 47–49 | Igual; mas a p. 47 avisa que o veículo **pode** ter freio de serviço mecânico | ✔ com ressalva |
| Pneus 4.00 × 8; opcional 3.75 × 8 **ou** 5.00 × 8 a 60 psi | Opcional é **3.75 × 8 na frente e 5.00 × 8 atrás** (não "ou") | ✘ corrigido |
| Raio interno 415, L1 2 200, largura 885, altura livre 120, p. 14–15 | Igual; L1 é **comprimento máximo**, não entre-eixos | ✔ |
| 10 % com carga, 20 % sem carga, p. 26 | Igual; declives "c/ freio hidráulico 2 rodas" | ✔ |
| 68 dB(A), p. 16 | Igual ("no ouvido do operador") | ✔ |
| Carregador 36 V / 45 A, monofásico 220 V ou trifásico 220/380/440/460 V, **catálogo pp. 58–59** | CAT pp. 58–59 (impressas) são **só** os trifásicos 220 V e 380 V. Monofásico 220 V: p. 51; 440 V: p. 52; 460 V: p. 53. MAN p. 16 diz "bifásico 220V ou tri 440 V ou 460V"; MAN p. 11 diz 220/380/440 V; foto da p. 41 mostra etiqueta "36V - 40A" | ✘ páginas corrigidas; conflitos registrados |
| Códigos do carregador 1229936 a 1229940 | Existem 1229936 (kit 220 V), 1229938 (kit 380 V), 1229939 e 1229940 (carregadores). **1229937 não aparece** | ✘ corrigido |
| Fusíveis 125 / 15 / 10 / 15 A, p. 59 e 68 | 125 A só na p. 68 (e p. 40, 53); 15 A do conversor só na p. 59 (F3–F4); 15 A de 36 V é o comando (F1–F2) | ✔ páginas precisadas |
| Corte térmico 85 °C / −25 °C, p. 57 | Igual | ✔ |
| Intertravamentos, p. 55–58 | Igual; o homem-morto está também nas p. 21 e 60, e o botão de emergência na p. 19 | ✔ |
| Conversor 956672 | CAT p. 61 | ✔ |
| Kit suporte 357201 | CAT p. 62 | ✔ |
| Catálogo "40 páginas" | É o recorte das pp. 44–83 do catálogo | ✔ explicado |

### Conflitos entre fontes (registrados, não escolhidos)

1. **Alimentação do carregador:** MAN p. 16 (bifásico 220 / tri 440 / 460 V) × MAN p. 11 e
   p. 12 (220 / 380 / 440 V, 60 Hz) × CAT (monofásico 220 V e trifásico 220 / 380 / 440 / 460 V).
   Não afeta a tese: o cenário LFP troca o carregador.
2. **Corrente do carregador:** 45 A (MAN p. 16; CAT) × etiqueta "36V - 40A" na foto (MAN
   p. 41). Afeta o tempo de recarga do cenário 0 (fase I). Conferir na placa do carregador
   do pesquisador.
3. **Fusível principal:** "fusível 125A (NH)" (MAN p. 40) × "Fusível magnético retardado"
   852251, sem corrente (CAT p. 75). Conferir no veículo.
4. **Freio de serviço:** "Hidráulico" (MAN p. 16) × "pode estar montado com freio mecânico
   ou hidráulico" (MAN p. 47). Conferir no veículo.
5. **Tempo de carga:** 8 h (MAN p. 25, 40, 44) × 8 a 10 h (MAN p. 11). Coerentes: 10 h para
   bateria muito descarregada (p. 44).
6. **Tensão de circuito aberto por elemento:** Saturnia 2,10 → 1,87 V; Moura 2,12 → 1,60 V
   (MAN p. 35). A curva Moura é larga demais para chumbo-ácido em repouso. Pode ser erro
   de impressão; o modelo da fase D precisa decidir qual usar (H-008).
