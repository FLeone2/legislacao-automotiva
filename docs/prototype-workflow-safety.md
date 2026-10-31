# Identificação, segurança e CAT: roteiro do analista

Entrada editorial: `data/prototype/workflow-safety.json`. É uma projeção de planejamento, com condições e lacunas, não uma declaração de que todos os ensaios se aplicam ou de que o veículo foi aprovado. Não altera os atos, as 55 exclusões editoriais, os estados de revisão ou os requisitos canônicos.

Foi feita leitura dirigida da **republicação** de 19/08/2022 da Portaria SENATRAN 990/2022: arts. 2º–5º, 9º–26 e Anexos I–VII, XI–XIII. O documento local `pdfs/prototype/senatran-095-republication_2022-08-19.pdf` tem SHA-256 `b43f07baf172a06413eefbb43752d999b0b65e76f825396273433f311b5aa69a`. Original e republicação não são tratados como o mesmo arquivo. A revisão dirigida não consolida alterações posteriores.

## Como os níveis devem ser usados

| Controle do Anexo XI | Conteúdo e comprovação | Referência |
| --- | --- | --- |
| 1 | Declarações de conformidade com documentação de suporte; referência expressa às ABNT NBR ISO/IEC 17050-1 e 17050-2, sem edição inventada. | Anexo XI, 1.1–1.2 e grupos correspondentes |
| 2 | Ensaios/avaliações de segurança ativa e declaração sobre o sistema de gestão que controla as operações do laboratório. | 1.3–1.4; 2.3–2.4 |
| 3 | Ensaios de segurança passiva, comprovação de terceira parte do SGQ e verificação do acompanhamento SENATRAN/INMETRO; há exceção para ensaio em laboratório acreditado por órgão signatário ILAC, nos termos do ato. | 1.5–1.6; 2.5–2.6; art. 9º |

Esses números não são fases cronológicas, não significam que o nível 3 é tecnologia nova e não são os níveis de desempenho do MOVER. Um controle documental não substitui o escopo e o cronograma do ato de produto.

A tabela divide **PBT até 3.500 kg** e **PBT acima de 3.500 kg**, com colunas de tipo brasileiro (automóvel, camioneta, caminhonete, utilitário, micro-ônibus etc.). M2 precisa de PBT para escolher o grupo da tabela e continua M2. Essa divisão não é a classificação ambiental LP/LC, nem o limiar de 3.856 kg ambiental. Rebocados e categorias L têm grupos próprios; o Anexo XI não lhes atribui universalmente os três níveis.

## Ordem de trabalho e entregas

1. Fixar configuração, versões, uso, massas, lotação, datas e identificação. Preparar Anexos III/IV e rastreabilidade das amostras antes dos ensaios.
2. Selecionar grupo/coluna e montar a matriz item → condição → ato/dispositivo → método/edição → laboratório → evidência. Manter remissões antigas como histórico; não reativar atos excluídos para preencher a tabela.
3. Definir laboratório, preparação pelo método, competência/SGQ/acreditação e eventual acompanhamento. O art. 9º prevê interação com o protocolo e aprovação de cronograma; não se força toda a segurança a ocorrer somente depois da LCVM.
4. Reunir declarações de controle 1 e executar os ensaios pertinentes de controles 2/3. Preparação, montagens, limites e amostragem de métodos privados permanecem a conferir.
5. Conferir certificados/registros de componentes e produtos de telecomunicações segundo seu mecanismo e sua configuração. Aprovação de módulo Anatel não é aprovação automática do veículo; Portaria Inmetro 145 não é transferida por analogia para bateria de tração.
6. Fechar o dossiê CAT com conteúdo documental dos Anexos I–VII e ambiental pertinente. Conciliar configuração, versão e documento IBAMA; distinguir licença, declaração e dispensa. BEV não recebe dispensa automática.
7. Acessar o SISCAT oficial, conferir o módulo/modalidade, preencher/anexar conforme as regras do módulo, revisar e preservar o protocolo e o pacote submetido.
8. Responder exigências com revisão identificada, conferir CAT/código/restrições e encaminhar o pré-cadastro pertinente. CAT não é o registro/licenciamento individual no DETRAN.
9. Manter conformidade e controlar alterações de projeto e de componente. Abrir a avaliação MDIC/MOVER separada, verificando reutilização de evidências por objeto, método, edição, versão, critério e cronograma.

### Conteúdo verificável dos relatórios

Os arts. 12–22, em especial os 17 incisos do art. 14, sustentam a lista de título, laboratório/local/data, cliente, identificação unívoca e paginação, método/norma, marca/modelo/amostra/condição, requisitos, resultados/unidades/gráficos, fotos/filmagens, conformidade e assinatura do responsável. Há regras de tradução juramentada/anuência para relatório estrangeiro, identificação das revisões e dos resultados subcontratados, amostras de mercado brasileiro e rastreabilidade. Não se inventaram as condições numéricas de um ensaio privado.

### Particularidades preservadas

- O CCT é condicionado à situação de SGQ do art. 2º, § 7º; não é exigência universal para toda empresa. O Anexo II, item 2.5, possui remissão ao § 6º; a divergência textual é registrada, sem criar consolidação.
- Transformação sujeita a homologação e importação sem vínculo têm hipóteses próprias de CS/ITL/Anexo VII e VINs. CS, CSV, CCT e CAT são instrumentos distintos.
- Espécie misto/tipo utilitário/carroçaria jipe/motor diesel exige a análise adicional dos arts. 23–25 e Anexos XII/XIII; a fotografia de um SUV não demonstra esses critérios.
- A tabela de 2022 contém atos e anos antigos. Por exemplo, o tratamento atual de cintos inclui a 997/2023; as NBRs do regime dos arts. 2º–3º da 910/2022 têm término em 31/12/2025, enquanto os arts. 4º–6º/anexos possuem rota própria.

## Referências internacionais e MOVER

Foram conferidas alternativas estrangeiras expressas em textos públicos: 954/2022 art. 4º (ONU R13-H/R13/R140 e FMVSS 126); 910/2022 art. 6º (ONU R32/R34/R94 e FMVSS 203/208/301); 949/2022 art. 3º (ONU R135 e FMVSS 214 para poste); 749/2018 art. 3º (ONU R100/R94/R95 e FMVSS 305); 997/2023 art. 2º (séries e combinações expressas de R16/R14/R145/R44/R17). Há também referências estrangeiras não individualizadas no dispositivo, que ficam sem número inventado. A 915/2022 art. 9º prevê aceitação técnica de resultados estrangeiros por procedimentos similares; não é equivalência automática.

**ONU/UNECE não é União Europeia.** Cada referência tem jurisdição, ato brasileiro, dispositivo e relação tipada. Nenhum registro declara equivalência integral ABNT/UE ou aprovação automática de relatório estrangeiro.

A [página oficial MDIC do MOVER](https://www.gov.br/mdic/pt-br/assuntos/sdic/setor-automotivo/programa-mover-1/legislacao-programa-mover), lida em 31/10/2026, informa na ementa da Portaria 215/2025: desempenho estrutural e tecnologias assistivas à direção para M1/N1, com remissão ao Anexo IV, seção A, do Decreto 12.435/2025. A íntegra do DOU retornou HTTP 403 e o Decreto no Planalto retornou 503 nas tentativas desta revisão. Por isso o cruzamento de evidências é **temático e pendente**, não pontuação, nível ou critério MOVER extraído. As fichas canônicas de MOVER conservam suas revisões nulas/desconhecidas.

Portaria 68/2026: incentivos/P&D, com cadeia ainda pendente, não substitui o ato técnico de segurança. Os candidatos 167/2026 e 76/2026 continuam separados; a instituição de grupo de trabalho não vira obrigação de produto.

## Sistemas públicos

A [carta pública de CAT](https://www.gov.br/pt-br/servicos/emitir-certificado-de-adequacao-a-legislacao-de-transito-cat) foi relida em 31/10/2026 e orienta envio documental, análise, emissão/código e SISCAT. Ela também menciona SEI e contingência; isso não autoriza ignorar módulos obrigatórios do art. 26. Não houve autenticação no SISCAT; nomes exatos de campos, formatos de anexos e percurso da tela permanecem a conferir com capturas reais. A lista de conteúdo do dossiê não se apresenta como espelho de uma tela autenticada.
