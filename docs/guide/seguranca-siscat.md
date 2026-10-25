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

A Portaria SENATRAN 990/2022, Anexo XI **republicado em 19/08/2022**, organiza registros por **leves com PBT até 3.500 kg**, **pesados acima de 3.500 kg**, **rebocados** e **motos/similares**. Há subdivisões por tipo e estágio de construção. Portanto, um M2 entre 3,5 e 5 t está no ramo pesado dessa tabela, embora continue M2. Sem PBT informado, o grupo da tabela permanece pendente.

Os controles distinguem nível 1 (declaração de conformidade), nível 2 (segurança ativa) e nível 3 (segurança passiva). Esse nível descreve o controle da evidência; não é uma graduação de segurança do veículo. CCT é exigido na condição do art. 2º, §7º, de ausência de SGQ certificado nos termos previstos. Transformação compulsória exige o documento adicional do Anexo VII/ITL (§3º). Os relatórios estrangeiros têm regras de tradução juramentada e anuência (art. 12). [Fonte: Portaria 990/2022, republicação](https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria9902022R.pdf/@@display-file/file).

A republicação corrige colunas e referências do Anexo XI, incluindo fechaduras/dobradiças, apoios de cabeça e itens do grupo pesado. O [PDF original](https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria9902022.pdf/@@display-file/file) foi mantido como origem documental, com hash distinto. A tabela republicada ainda contém referências anteriores, como as Resoluções 220/2007 e 912/2022: sua citação não reativa atos históricos. A obrigação atual depende da resolução de cada assunto e de seus modificadores. A conferência dirigida da republicação não certifica toda a cadeia posterior da Portaria.

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

**Estabilidade:** a Resolução 954/2022, arts. 3º–7º, diferencia ESC/VSF e categorias. M3 exclusivamente urbano tem instalação opcional (§5º), enquanto M3 escolar a tem obrigatória (§6º). N3 depende também de eixos, massa técnica e roda. Datas dependem do primeiro código do modelo básico; derivação não reinicia automaticamente o cronograma. A Deliberação 264/2022 alterou os cortes de código para 01/01/2020 no ramo M1/N1 e 01/07/2023 no ramo M2/M3/N2/N3/O3/O4. Os marcos gerais alcançam 100% de M1/N1 em 2024 e projetos anteriores das demais categorias citadas em 2025, mantendo exceções. Não determine dispensa somente porque o veículo é transformado, “fora de estrada” ou antigo. [Ato base](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9542022.pdf/@@display-file/file) e [Deliberação 264/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/deliberacoes/Deliberacao2642022.pdf/@@display-file/file).

No pacote M2, a [retificação de 27/05/2022 da Resolução 939/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9392022R.pdf/@@display-file/file) corrige o corte do código de projeto do art. 4º, I, para **01/01/2023**. Não usar a data original de 28/12/2018 isoladamente.

## Ligações específicas para a matriz de evidências

| Frente de análise | Fonte e particularidade |
| --- | --- |
| Impactos frontal e traseiro | [910/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9102022.pdf/@@display-file/file) e [retificação de 06/06/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9102022R.pdf/@@display-file/file). O art. 4º considera tipo e PBT **inferior** a 2.500 kg. Dispositivos com prazo encerrado não significam revogação integral da resolução. |
| Impacto lateral contra barreira e poste | [949/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9492022.pdf/@@display-file/file) e [retificação de 07/06/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9492022R.pdf/@@display-file/file). Tipo, ponto R, exceções e primeiro código do modelo básico delimitam o caso; o marco de novos projetos de poste em 2026 não equivale ao marco geral de 2030. |
| Cintos, ancoragens e apoios de cabeça | [951/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9512022.pdf/@@display-file/file) com [997/2023](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9972023.pdf/@@display-file/file). Conferir categoria, posição, anexo e atos próprios de ônibus. A 220/2007 citada em tabelas antigas permanece histórica. |
| Propulsão híbrida/elétrica M/N | [749/2018, arts. 1º–3º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao7492018.pdf/@@display-file/file). Os tipos são enumerados e os capítulos de pós-colisão seguem também o âmbito dos atos de impacto. O corpo prevê aplicação desde 01/01/2023; anexos e cadeia posterior precisam de avaliação. |
| Propulsão híbrida/elétrica L | [750/2018, arts. 1º–3º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao7502018.pdf/@@display-file/file). Ciclomotores, motocicletas, motonetas, triciclos e quadriciclos têm pacote próprio, com marco no corpo do ato em 01/01/2022. Não herdar o pacote M/N. |
| Semirreboque com eixo elétrico auxiliar | [956/2022, arts. 1º–2º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9562022.pdf/@@display-file/file). A instalação, inclusive opcional, tem condição própria de CAT. Um perfil O não comprova presença desse eixo; a triagem começa pelo inventário da configuração. |
| Caminhão/caminhão-trator com motor elétrico auxiliar | [1.021/2026, arts. 3º–6º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao10212026.pdf/@@display-file/file). Distinguir essa modalidade de outras conversões. O art. 5º trata veículos produzidos desde 01/01/2014; o art. 3º remete a segurança impactada, identificação e atendimento ambiental. Anexo e retificação seguem em revisão. |
| Cabine N2/N3 | [765/2018, arts. 1º–4º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao7652018.pdf/@@display-file/file). O texto consultado prevê 2028 para novos projetos e 2030 para todos em produção, com exceções e antecipação facultativa. Cadastro ou indicação de vigência não torna o ensaio universal em 2026. |
| Modificação e registro | [916/2022, arts. 2º–6º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9162022.pdf/@@display-file/file). Separar autorização prévia, hipóteses de CAT, CSV e atualização de registro. Anexos IV/V e seus modificadores decidem a modalidade concreta. |
| Equipamentos e construção em geral | [993/2023, arts. 2º–7º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9932023.pdf/@@display-file/file). Tipo e estágio de construção definem o ramo. Os anexos e as regulamentações específicas devem ser reconciliados; o índice não é uma lista fechada de ensaios. |

Esses vínculos são frentes de consulta com estado **a revisar**, não confirmação de obrigatoriedade para um projeto. As referências UN/FMVSS encontradas nos atos não fornecem, por analogia, edição, método, limite, amostra ou aceitação individual de relatório.

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

O checkup desta rodada melhora a rastreabilidade do acervo consultado. Não demonstra que os 30 subsistemas físicos e as atividades cadastradas cobrem toda a legislação brasileira. Faltam, conforme o caso, dados como tipo/carroçaria, estágio de construção, data do primeiro código, ponto R, eixos e configuração de laboratório. Anexos técnicos integrais, cadeias posteriores e requisitos disponíveis apenas no módulo autenticado do SISCAT continuam exigindo conferência. Trechos públicos curtos e hashes da consulta estão em `data/process/review-evidence/safety-2026-10-25.json`.
