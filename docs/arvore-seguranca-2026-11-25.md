# Árvore completa da segurança veicular — 25/11/2026

Na etapa **B · Segurança veicular** (`#flow?stage=seguranca`), a tela agora mostra a
árvore inteira, já aberta: grupo → item → lei e artigo. Cada lei abre o texto completo no
artigo (`#lei?id=…&trecho=…`). Os mesmos grupos aparecem como ramos no grafo da etapa.

## Atividades da etapa

Os seis grupos são as atividades da etapa B (`flow-data.js`). As cinco atividades antigas
(Frenagem e estabilidade, Ocupantes e estrutura, Iluminação e visibilidade, Equipamentos
obrigatórios, Segurança de propulsão elétrica) repetiam itens dos Níveis 1 a 3 e saíram. Os
links antigos continuam abrindo o lugar novo do assunto:

| Link antigo (`node=flow:seguranca:…`) | Abre em |
| --- | --- |
| `freios` | Nível 2 › Sistemas de freio |
| `ocupantes` | Nível 3 |
| `visibilidade` | Nível 2 › Instalação dos dispositivos de iluminação |
| `equipamentos` | Nível 1 › Equipamentos obrigatórios |
| `eletrica` | Nível 3 › Requisitos específicos para propulsão híbrida e elétrica |

Cada item leva às peças do veículo 3D que o levantamento ligou a ele ("No veículo: …"),
no lugar do botão "Ver no veículo" das atividades antigas.

## Como os grupos foram montados

Nenhum ato usa os nomes "grupo 1", "grupo 2" e "opcionais". A árvore segue os nomes
oficiais mais próximos:

| Grupo na tela | Fonte | Itens |
| --- | --- | --- |
| Nível 1 — Declaração de conformidade | Portaria SENATRAN 990/2022, Anexo XI, itens 1.1–1.2 | 12 |
| Nível 2 — Ensaios de segurança ativa | Anexo XI, itens 1.3–1.4 | 14 |
| Nível 3 — Ensaios de segurança passiva | Anexo XI, itens 1.5–1.6 | 16 |
| Opcionais e tecnologias inovadoras | Tela SISCAT; Portaria SENATRAN 1.554/2022, arts. 10 e 13 (série/opcional na ENSV) | 9 |
| MOVER — Grupos A, B, C e D | Decreto 12.435/2025, Anexo IV; Portaria GM/MDIC 215/2025, Anexo II | 28 |
| Identificação: VIN, placa e etiquetas | Res. CONTRAN 968/2022 (VIN, VIS, ETA, agregados), 969/2022 (PIV), Portaria 990/2022 Anexo III (WMI), 1.554/2022 (ENSV), Portaria Inmetro 314/2025 (selos) | 8 |

Total: 87 itens, 40 atos citados, 3 itens sem ato vinculado.

## Origem dos vínculos

`flow-safety-tree.js` é entrada editorial. Os itens dos Níveis 2 e 3 e dos opcionais vêm
da matriz do inventário de segurança de 02/11/2026 (branch `docs/seguranca-pesquisa-2026-11-02`,
`docs/pesquisa-seguranca/2026-11-02`), que ligou cada linha da tela SISCAT ao ato atual. O
Nível 1 vem do suplemento do mesmo inventário, a partir do Anexo XI. Os grupos MOVER vêm
dos 28 requisitos levantados no mesmo inventário.

## Limites

- Escopo: veículos leves (PBT até 3.500 kg). Pesados, rebocados e motocicletas têm tabelas
  próprias no Anexo XI e ainda não estão na árvore.
- A tabela do Anexo XI marca com X os tipos de veículo de cada linha; a extração do PDF
  perdeu as colunas. A árvore não decide aplicabilidade por tipo.
- Três linhas do Anexo XI, item 1.5 (inclinação lateral, avaliação estrutural, retenção de
  cadeira de rodas) não têm ato atual vinculado e aparecem como lacuna.
- A Res. CONTRAN 827/1997 (triângulo), citada no inventário, está entre os atos inativados
  pelo responsável pelo acervo e não é citada.
- Os anexos da Portaria 1.554/2022 (lista de requisitos gerais e inovadores da ENSV) não
  foram coletados.
- Rótulo e nível da tela SISCAT não decidem sozinhos a obrigação. MOVER mede um índice da
  empresa; não exige cada equipamento em todo veículo.
