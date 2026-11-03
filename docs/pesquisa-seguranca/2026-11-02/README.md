# Pesquisa de segurança automotiva

Salvamento de 02/11/2026. Material de pesquisa e planejamento, separado dos dados publicados pelo aplicativo.

## Retomar amanhã

1. Preencher o [Excel das pendências residuais](outputs/revisao-seguranca-2026-11-02/Respostas-pendencias-residuais.xlsx), na guia **Responder**, colunas **D e E**.
2. Conferir as respostas recebidas com os dispositivos e fontes. Resposta registrada não equivale a validação normativa automática.
3. Atualizar a matriz e o inventário v2, preservando as respostas anteriores e as lacunas ainda abertas.
4. Redesenhar as imagens do fluxo e da árvore com a revisão MOVER/Inmetro. A versão nova do aplicativo ainda não foi implementada.

O [Excel anterior preenchido](outputs/fechamento-seguranca/Confirmacoes-seguranca.xlsx) foi preservado integralmente. **Não executar seu gerador sobre esse arquivo**, pois isso apagaria as respostas inseridas pelo usuário.

## Estado confirmado

- Escopo do produto: automóvel de passageiros novo, nacional, M1, até **sete ocupantes no total incluindo motorista**. PBT usual até 3.500 kg e ramo próprio para M1 elétrico acima disso, sem desconto automático da bateria nos requisitos.
- Aplicativo de consulta de todas as propulsões, com condições e lacunas por tecnologia. Não é aprovador automático de ensaios.
- Captura do exemplo SISCAT: dez guias e 36 linhas de ensaios. Doze linhas Nível 1 complementadas pela fonte oficial e 35 requisitos adicionais organizados.
- Dezenove respostas do usuário incorporadas à conferência.
- Base atual de ancoragens: 951/2022 com 997/2023. Bancos/apoios, cintos/ancoragens e ISOFIX continuam distintos.
- MOVER: 28 vínculos dos grupos A/B/C/D, com métodos citados, metas ponderadas da empresa e condições. Não são 28 ensaios universais novos por veículo.
- GNV: 14 subitens, incluindo nove componentes expressamente listados, cilindro e etapas de homologação, instalação, inspeção e requalificação.
- Arquivos de 137 fontes selecionadas preservados na revisão de novembro, com fichas Markdown e hashes. São arquivos, não 137 atos distintos. DOCs antigos continuam identificados como DOC, não PDF oficial.

## Leitura principal

- [Resultado da revisão atual](outputs/revisao-seguranca-2026-11-02/RESULTADO-DA-REVISAO.md)
- [Conferência das 19 respostas](outputs/revisao-seguranca-2026-11-02/CONFIRMACOES-REVISADAS.md)
- [Pendências residuais](outputs/revisao-seguranca-2026-11-02/PENDENCIAS-RESIDUAIS.md)
- [Inventário v2](outputs/revisao-seguranca-2026-11-02/inventario-seguranca-v2.json)
- [MOVER: requisitos e metas](outputs/revisao-seguranca-2026-11-02/MOVER-REQUISITOS.md)
- [GNV: componentes e etapas](outputs/revisao-seguranca-2026-11-02/GNV-REQUISITOS.md)
- [Disponibilidade de fontes](outputs/revisao-seguranca-2026-11-02/DISPONIBILIDADE-DOCUMENTOS.md)
- [Base inicial de consulta com IA](outputs/revisao-seguranca-2026-11-02/base-ia/LEIA-ME.md)
- [Catálogo geral CONTRAN e ressalvas](outputs/contran-vigentes/CATALOGO-RESOLUCOES-VIGENTES.md)

## Fluxos, mapas e imagens

As [imagens anteriores do fluxo e da árvore](outputs/fluxo-arvore-seguranca/LEIA-ME.md) são propostas de 31/10/2026. **Ainda não incorporam toda a revisão de novembro.** O inventário v2 é a referência para o próximo desenho.

Conceitos de interface: [entrada guiada](outputs/01-entrada-guiada.png), [mapa do processo](outputs/02-mapa-do-processo.png), [veículo e requisitos](outputs/03-veiculo-e-requisitos.png) e [tarefa e comprovação](outputs/04-tarefa-e-comprovacao.png). São imagens, não código de telas implementadas.

As relações 3D são semânticas. Não houve alteração do modelo existente, associação real de malhas nem correção da explosão/desempenho nesta etapa.

## O que permanece aberto

**Segurança normativa integralmente fechada: não.** Os seis grupos residuais estão detalhados no documento próprio. Eles não impedem desenhar a consulta informativa, mas impedem afirmações automáticas nos assuntos ainda não concluídos.

A transcrição documental bruta não é consolidação de vigência. Textos anotados do Inmetro podem conter redações sucessivas; páginas do DOU podem conter outros atos. Nem todos os métodos internacionais ou textos privados ABNT/ISO/SAE foram reunidos/revisados integralmente.

## Preservação e proveniência

`MANIFESTO-SALVAMENTO.json` registra cada arquivo copiado, tamanho, SHA-256 de origem e da cópia, além de eventuais ajustes de caminhos de máquina/identificador do exemplo. PDFs, DOCs, imagens e planilhas mantêm os bytes originais.

Os ZIPs locais repetem os diretórios e não foram duplicados no Git. A cópia antiga do código, `legislacao-automotiva-atual-63bac21.zip`, corresponde ao commit [63bac21539e5ff33aae522cb04650229fd27cd00](https://github.com/FLeone2/legislacao-automotiva/commit/63bac21539e5ff33aae522cb04650229fd27cd00), já preservado no repositório. O arquivo 3D permanece no histórico do projeto.

`work/` guarda scripts e intermediários editoriais úteis. Dependências e caches de extração/download não foram incluídos integralmente; os resultados, textos Markdown, documentos selecionados e manifestos estão em `outputs/`. Os scripts documentam a geração e podem exigir reconstruir caches no ambiente de execução.

Este salvamento não altera `data/`, `knowledge/`, a política de publicação ou `dist/`. As 55 exclusões editoriais do site permanecem intactas. Nenhuma referência de pesquisa foi promovida automaticamente a uma obrigação publicada.
