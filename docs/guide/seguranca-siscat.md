# Segurança veicular e preparação do SISCAT

Revisão dirigida: **25/10/2026**. Este guia organiza a decisão técnica. O estado de cada fonte está em `data/process/safety-sources.json`; uma consulta ao texto original não certifica a consolidação de todas as alterações. A lista abaixo é um roteiro de trabalho e não uma aprovação automática.

## Primeiro enquadre o veículo

Registre finalidade, quantidade de rodas, lotação sem o condutor, PBT, massa em ordem de marcha, dimensões, número de eixos, uso, datas de fabricação e de concessão do primeiro código do modelo básico. Categoria, espécie, tipo e carroçaria são classificações diferentes. Não determine a categoria jurídica pelo nome comercial “SUV”, “van” ou “picape”.

A classificação usada pela Resolução CONTRAN 915/2022, art. 2º, é:

| Categoria | Informação que decide o ramo |
| --- | --- |
| M1 | Passageiros; até oito assentos além do condutor |
| M2 | Mais de oito assentos além do condutor; massa até 5 t |
| M3 | Mais de oito assentos além do condutor; massa superior a 5 t |
| N1 | Carga; massa até 3,5 t |
| N2 | Carga; massa superior a 3,5 t e até 12 t |
| N3 | Carga; massa superior a 12 t |
| O1 / O2 | Rebocados: até 0,75 t / acima de 0,75 t e até 3,5 t |
| O3 / O4 | Rebocados: acima de 3,5 t e até 10 t / acima de 10 t |
| L | Duas, três ou quatro rodas; subcategoria depende de velocidade, cilindrada/potência, massa e configuração |

Não converter automaticamente a classificação M/N em LP/LC ambiental. As definições de emissões são próprias. [Fonte: Resolução 915/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9152022.pdf/@@display-file/file).

## O que muda no pacote de segurança

A Portaria SENATRAN 990/2022, Anexo XI, organiza registros por **leves com PBT até 3.500 kg**, **pesados acima de 3.500 kg**, **rebocados** e **motos/similares**. Há subdivisões por tipo e estágio de construção. Portanto, um M2 entre 3,5 e 5 t está no ramo pesado dessa tabela, embora continue M2.

Os controles distinguem nível 1 (declaração de conformidade), nível 2 (segurança ativa) e nível 3 (segurança passiva). Esse nível descreve o controle da evidência; não é uma graduação de segurança do veículo. CCT é exigido na condição do art. 2º, §7º, de ausência de SGQ certificado nos termos previstos. Transformação compulsória exige o documento adicional do Anexo VII/ITL (§3º). Os relatórios estrangeiros têm regras de tradução juramentada e anuência (art. 12). [Fonte: Portaria 990/2022, texto original](https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria9902022.pdf/@@display-file/file).

A tabela original contém referências anteriores. A obrigação atual depende também da resolução de cada assunto e de seus modificadores; não reproduza as referências antigas como lista atual consolidada.

| Caso | Particularidade a verificar |
| --- | --- |
| M1 / N1 | Não transportar o pacote de impacto do automóvel para todo veículo de carga. Delimitar a categoria, a massa, geometria, datas e exceções de cada resolução. |
| Micro-ônibus M2 | A Resolução 939/2022 tem anexos próprios de estabilidade, estrutura, bancos/ancoragens e emergência. Art. 4º distingue data do projeto, produção e derivados para cintos. |
| Micro-ônibus / ônibus M3 | A Resolução 959/2022 separa aplicação rodoviária, intermunicipal, particular, urbana e escolar. Anexos II/III tratam estabilidade e estrutura; o art. 2º exige informações nos pedidos CAT. |
| N2 / N3 | Distinguir caminhão inacabado, acabado, caminhão-trator e chassi; revisar proteções, eixos, uso e massa. |
| Reboque / semirreboque | Usar ramo próprio. Freios, iluminação e proteções não significam herdar ensaios de ocupantes de um M1. |
| Motocicleta e similares | Determinar L1–L7 antes de aplicar ABS/CBS; usar configuração e potência/cilindrada efetivas. |

Fontes: [939/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9392022.pdf/@@display-file/file), [959/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9592022.pdf/@@display-file/file) e [índice oficial de resoluções](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran). Os anexos técnicos integrais e toda a cadeia modificadora não foram consolidados nesta revisão.

## Dois exemplos de decisão que mudam o relatório

**Freios:** a Resolução 915/2022 separa desempenho do sistema (art. 4º) de ABS/CBS (arts. 5º–7º). Para L3–L7, a partir de 300 cm³ ou, nos elétricos, 22 kW, exige ABS em todas as rodas; abaixo desses limiares, permite ABS ou CBS. As exceções do art. 7º não equivalem a dispensa geral de desempenho de frenagem. Rebocados acima de 0,75 t entram no art. 4º; O3/O4 aparecem na exigência de ABS. [Fonte](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9152022.pdf/@@display-file/file).

**Estabilidade:** a Resolução 954/2022, arts. 3º–7º, diferencia ESC/VSF e categorias. M3 exclusivamente urbano tem instalação opcional (§5º), enquanto M3 escolar a tem obrigatória (§6º). N3 depende também de eixos, massa técnica e roda. Datas dependem do primeiro código do modelo básico; derivação não reinicia automaticamente o cronograma. Os marcos gerais alcançam 100% de M1/N1 em 2024 e projetos anteriores das demais categorias citadas em 2025, mantendo exceções. Não determine dispensa somente porque o veículo é transformado, “fora de estrada” ou antigo. [Fonte](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9542022.pdf/@@display-file/file).

## Checklist de trabalho para um novo CAT

Os itens seguintes são uma **estrutura editorial de preparação**, a confrontar com a modalidade, os anexos e o módulo oficial disponível:

- [ ] Identificar fabricante/importador/encarroçador/transformador, representação e vínculo com fabricante.
- [ ] Registrar categoria, espécie/tipo/carroçaria, estágio de construção, uso, massas, lotação, eixos, variantes e datas.
- [ ] Levantar CAT do veículo-base e separar mudança de versão, derivação, encarroçamento e transformação.
- [ ] Montar matriz por assunto: dispositivo atual, condição, motivo da incidência ou exclusão, evidência, responsável e lacuna.
- [ ] Preparar cadastro da empresa, identificação veicular, dados técnicos e legislação complementar dos anexos pertinentes.
- [ ] Conferir Certificado de Segurança e condição SGQ/CCT; verificar ITL e escopo do laboratório quando exigidos.
- [ ] Indexar relatório, método, amostra/configuração, resultados, laboratório, responsável, revisão e material de suporte.
- [ ] Conferir tratamento de relatório estrangeiro e aceitação de procedimento equivalente; equivalência não é automática.
- [ ] Reconciliar configuração entre relatórios, dados técnicos, licença ambiental, identificações e produto comercial.
- [ ] Conferir acesso, módulo, documentos e GRU diretamente no SISCAT; registrar protocolo e exigências.
- [ ] Acompanhar análise e eventual complementação; depois organizar CAT/código marca-modelo-versão e pré-cadastro.
- [ ] Manter controle de alterações e evidências de conformidade na produção.

A [carta de serviço do SISCAT](https://www.gov.br/pt-br/servicos/sistema-de-certificacao-de-adequacao-a-legislacao-de-transito) confirma que o sistema emite CAT e que os requisitos seguem as regras de cada módulo disponibilizado. A página geral de CAT também menciona SEI; confira o módulo aplicável e o procedimento oficial para indisponibilidade antes de escolher o canal. Este portal não está integrado à conta governamental e não protocola processos.

## Critério de conclusão

“Documento anexado”, “item revisado” e “aprovação emitida” são estados diferentes. Só marque decisão normativa como confirmada quando houver dispositivo, condição do veículo e evidência suficiente; deixe “a enquadrar” quando faltar informação. Não use percentual de checklist como certificado de homologação. Uma peça nova pode alterar o desempenho do conjunto/veículo e exigir reavaliação mesmo quando possui certificado de produto.
