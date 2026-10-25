# Checkup regulatório do guia

Referência da auditoria: 2026-10-25.

Auditoria dirigida de integridade, relações e lacunas do acervo. Não certifica exaustividade da legislação brasileira, cadeia integral de todos os atos ou aplicabilidade de um veículo. Fontes autenticadas e métodos privados ainda exigem conferência.

O inventário contém 294 atos, 40 fontes e 98 itens estruturados: 58 trechos de atos públicos e 40 orientações oficiais. Esses itens não equivalem a obrigações automaticamente incidentes num veículo.

Foram registrados 28 achados: 15 correções aplicadas e 13 pontos ainda em revisão, candidatos ou com acesso impedido. As 55 exclusões editoriais CONTRAN permanecem preservadas.

## Profundidade do acervo

| Órgão | Atos | Itens estruturados | Íntegra indicada como lida | Cadeia integral revisada |
| --- | ---: | ---: | ---: | ---: |
| Ibama / CONAMA | 26 | 17 | 1 | 0 |
| SENATRAN / CONTRAN | 215 | 24 | 0 | 0 |
| Inmetro | 18 | 42 | 0 | 0 |
| Anatel | 22 | 15 | 0 | 0 |
| MDIC / MOVER | 13 | 0 | 0 | 0 |

Leitura integral indicada não comprova revisão de toda a cadeia modificadora. Ausência dessa indicação pode ser desconhecimento, sem inferir leitura ou ausência de obrigação.

## Observação técnica das fontes

Coleta em 2026-10-25T20:14:08+00:00: 326 URLs tentadas; 287 aceitas tecnicamente e 39 não validadas nesta execução. Inclui manutenção, erros HTTP/rede e limite de bytes. Não significa que existam 39 leis ausentes. Um índice ou FAQ acessível não comprova íntegra de uma portaria.

Rotina diária preparada. A execução agendada no GitHub depende de o workflow integrar o ramo padrão do repositório.

## Achados e encaminhamentos

### EM-01 — Categoria L não acompanha suas fontes LCM/PROMOT no processo

Situação: **Correção aplicada**; prioridade high.

Categoria L fica family=promot mas sourceIds contém somente ibama-lcvm-service. environment-route é LCVM para todas as categorias. electric-environment e hybrid-evidence usam CONAMA492/LCVM para L; cop-plan inclui L8/P8 para todo perfil.

Encaminhamento: Conectar categoria L a ibama-lcm-service e conama-493-2019 nos passos ambiental/modalidade/térmico/BEV/híbrido/pós-produção; selecionar o conjunto de fontes específico da família, sem importar os métodos L8 ou declarar dispensa automática.

- [Apresentação e Como solicitar a LCM](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/licenca-para-ciclomotores-motociclos-e-similares-lcm-promot)
- [Arts.1 e10](https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=785)

### EM-02 — Particularidade de LC na faixa3,5–3,856t não sinalizada

Situação: **Correção aplicada**; prioridade medium.



Encaminhamento: Acrescentar aviso condicional quando a massa estiver estritamente entre3500e3856kg: confirmar classeLC, origem do motor mestre e autorização prévia. Não converter automaticamente a classe ou marcar P8 aprovado; o perfil não possui os dois últimos documentos.

- [Art.23](https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=767)

### EM-03 — Lotação desconhecida pode produzir rótulo LP em veículo de carga

Situação: **Correção aplicada**; prioridade medium.

N1, MTMA3000, ordem de marcha2000, carga útil900, não derivado, seats=null resulta em LP porque JavaScript avalia null<=9 como true. O mesmo perfil lista lotação como dado faltante.

Encaminhamento: Exigir lotação positiva inteira antes de excluir a hipótese de mais de8assentos além do motorista no ramo não derivado. Conservar rótulo LP/LC pendente quando seats é null; manter as demais regras de classificação já corretas.

- [Art.35, art.1-A §§1–2 da CONAMA15/1995](https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=765)

### EM-04 — Cobertura de PROMOT ainda é encaminhamento, não matriz normativa completa

Situação: **Revisão necessária**; prioridade high.

Os25atos ativos foram escolhidos para L8/P8. IN21/2022 é explicitamente outside-scope em inactiveReferences, não revogada. O guia oferece categoriaL mas não possui sua cadeia administrativa, rito limitado e OBD-M1/M2 estruturados no catálogo ativo.

Encaminhamento: Registrar esses atos como candidatos de escopo PROMOT e lacuna de revisão. Não forçar inclusão no catálogo L8/P8 ou tratar outside-scope como revogação. Ligar a fonte CONAMA493 já existente ao guia e acrescentar cronograma específico de OBD-M2 como triagem (novos2025/todos2027; semnovashomologaçõesOBD-M1desde2025), preservando necessidade de cadeia e método.

- [Apresentação: IN17/2002 e normas subsequentes](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/licenca-para-ciclomotores-motociclos-e-similares-lcm-promot)
- [Índice: IN11/2021 eIN21/2022](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/legislacao-emissoes)
- [Ementa e arts.22-A–22-G com referências à IN10/2024](https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139213)
- [Art.10 §§1,4–6](https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=785)

### EM-05 — Trechos antigos e novos convivem na mesma evidência; IA precisa de contexto de versão

Situação: **Revisão necessária**; prioridade medium.

Textos oficiais HTML e statusEvidence conservam redações substituídas, marcadas revogado/retificado, junto das novas redações. Ato vigente com alterações não torna todo trecho antigo aplicável.

Encaminhamento: Exportar textos brutos como evidência arquivada não consolidada, manter estado de revisão/versão junto de cada trecho recuperado e priorizar requisitos editoriais curados. Não etiquetar todo chunk como regra vigente apenas pelo estado do ato. Não remover a evidência histórica.

- [Art.1 e art.2: redações históricas e redaçãoIN3/2023](https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=133670)

### EM-06 — Índice oficial de emissões não serve sozinho como universo atualizado

Situação: **Revisão necessária**; prioridade medium.

Página oficial recuperada hoje traz referênciasaté2022 e lista IN19/2021 e22/2022 como NormasVigentes, apesar de sua revogação expressa peloart28daIN5/2024 já corretamente tratada no repositório.

Encaminhamento: Monitorar também o DOU e as páginas individuais/comunicados. Mudança de hash e referência em índice geram candidatos para revisão; não reativam automaticamente ato ou requisito. Manter as exclusões/revogações atuais.

- [Tabela NormasVigentes](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/legislacao-emissoes)
- [Art.28](https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139386)

### EM-07 — Formulários autenticados do Infoserv e métodos privados não foram auditados integralmente

Situação: **Revisão necessária**; prioridade medium.

O checklist é consultivo e os canais oficiais estão corretamente distinguidos. Não existe mapeamento validado de todos os campos autenticados, assinaturas/documentos por modalidade, famílias, edições de métodos e integração automática.

Encaminhamento: Manter esse limite visível e exigir conferência no início de cada processo. A recuperação25/25 comprova acesso aos documentos cadastrados, não homologação completa nem cobertura de todo ato automotivo.

- [Como solicitar/Observações](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/licenca-para-veiculos-motores-ou-maquinas-lcvm-proconve)
- [Como solicitar aLCM](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/licenca-para-ciclomotores-motociclos-e-similares-lcm-promot)

### agency-audit-01 — MOVER pesado: modificador 167/2026 ausente do inventário ativo

Situação: **Candidato pendente**; prioridade high.

Portaria 176/2025 está cadastrada como mover-012, mas o modificador 167/2026 e sua relação não estavam representados. O índice tem o mesmo hash da coleta de 19/10: é uma lacuna de conciliação de inventário, não nova publicação desde então.

Encaminhamento: Registrar candidato não publicado com reviewStatus index_review, legalStatus null e relação index_reported → mover-012; obter e revisar íntegra, dispositivo e data antes de gerar obrigação.

- [Entrada Portaria GM/MDIC 167, de 18/06/2026 e ementa imediatamente seguinte](https://www.gov.br/mdic/pt-br/acesso-a-informacao/institucional/atos-normativos/gabinete-do-ministro/portarias/2026)
- [Fonte oficial](https://pesquisa.in.gov.br/imprensa/jsp/visualiza/index.jsp?data=19/06/2026&jornal=602&pagina=5)

### agency-audit-02 — URL de coleção não comprova identidade de um ato

Situação: **Correção aplicada**; prioridade high.

Gerador liga guide-mdic-2026 a mover-007 e guide-contran-index a senatran-097 como same_official_url. As duas URLs são índices com vários atos. O contrato documenta esse vínculo como identidade, o que é forte demais para fonte de coleção.

Encaminhamento: Tipar fonte como act/collection/service/guidance. Inferir identidade só por ID canônico ou URL de ato individual confirmado; índices devem ter relação collection_mentions/contextual_reference e lista de IDs localizada, não identidade automática.

- [Índice contém várias portarias distintas, incluindo 19/2026, 68/2026 e 167/2026](https://www.gov.br/mdic/pt-br/acesso-a-informacao/institucional/atos-normativos/gabinete-do-ministro/portarias/2026)
- [Coleção referenciada em guide-contran-index; demonstração estrutural de URL compartilhada](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran)

### agency-audit-03 — 18 referências Inmetro ainda não sustentam um checklist técnico integral

Situação: **Revisão necessária**; prioridade high.

Os 18 registros têm fullTextReviewed false e amendmentChainReviewed false. Isso está corretamente qualificado na base, mas impede afirmar que todos os anexos, exceções OEM/reposição, métodos, transições e modificadores foram cobertos. Nova coleta aos PDFs 145 e 169 pelos dois hosts oficiais retornou503.

Encaminhamento: Manter estados atuais e exibir pendência de íntegra/cadeia no painel e no pacote IA. Priorizar145,169,379+845,501,456,34 por função do projeto; não elevar FAQ/PortalIQ a texto integral.

- [Fonte oficial](https://www.inmetro.gov.br/legislacao/rtac/pdf/RTAC002960.pdf)
- [Fonte oficial](https://sistema-sil.inmetro.gov.br/rtac/RTAC002960.pdf)
- [Fonte oficial](https://www.inmetro.gov.br/legislacao/rtac/pdf/RTAC003000.pdf)
- [Fonte oficial](https://sistema-sil.inmetro.gov.br/rtac/RTAC003000.pdf)

### agency-audit-04 — Manutenção Anatel responde200 e precisa ser classificada por conteúdo/redirect

Situação: **Acesso impedido**; prioridade high.

As URLs de715 e4083 responderam200 após redirecionar à mesma página de manutenção, de 3890 bytes. Não são novas leituras dos atos. Uma atualização automática que aceita apenas status200 produziria frescor enganoso.

Encaminhamento: Classificar maintenance_redirect/content_unavailable, preservar snapshot de 18/10 e data da revisão real. Não revalidar legalStatus nem reviewStatus por sucesso HTTP.

- [Fonte oficial](https://informacoes.anatel.gov.br/legislacao/resolucoes/2019/1350-resolucao-715)
- [Fonte oficial](https://informacoes.anatel.gov.br/legislacao/resolucoes/2020/1453-resolucao-729)

### agency-audit-05 — Localizadores MOVER individuais ainda apontam a páginas de coleção

Situação: **Correção aplicada**; prioridade medium.

Existem links individuais oficiais localizados nas páginas MDIC para esses atos; o catálogo usa páginas genéricas. Corrigir apenas localizador melhora citação e consulta IA, sem promover revisão ou vigência.

Encaminhamento: Atualizar officialUrl nas entradas editoriais conforme directLocators deste relatório; preservar reviewStatus/legalStatus e registrar relação located_in_index.

- [Entradas86/2024,192/2025,213/2025 e215/2025](https://www.gov.br/mdic/pt-br/assuntos/sdic/setor-automotivo/programa-mover-1/legislacao-programa-mover)
- [Entrada19/2026](https://www.gov.br/mdic/pt-br/acesso-a-informacao/institucional/atos-normativos/gabinete-do-ministro/portarias/2026)
- [Entrada176/2025](https://www.gov.br/mdic/pt-br/acesso-a-informacao/institucional/atos-normativos/gabinete-do-ministro/portarias/2025)

### agency-audit-06 — Requisitos por produto precisam de condições próprias, além de links por ato

Situação: **Revisão necessária**; prioridade medium.

O recorte contém 42 itens Inmetro e 15 Anatel, mas apenas 1 requisito Inmetro explicita conditions e nenhum Anatel tem condições estruturadas. Muitos vínculos são do ato inteiro ao subsistema e continuam consultivos. Por exemplo, associação 145/2022 a motor não torna as regras de bateria e lâmpadas aplicáveis a esse motor.

Encaminhamento: Criar relações requisito→produto/configuração com evidência/dispositivo. Filtros por química, funçãoRF, categoria, OEM/reposição, uso e datas só podem se tornar regras após revisão; até lá manter requires_assessment/context_only.

- [Objeto: vários componentes diferentes, incluindo bateria chumbo-ácido, lâmpada, freio e pistão](https://portaliq.mdic.gov.br/busca-aplicada/central-de-consultas/portaria-inmetro-no-1452022)
- [LGT art.162§2 e regulamento de produtos; enquadramento de equipamento](https://www.gov.br/anatel/pt-br/regulado/certificacao-de-produtos/base-legal)

### agency-audit-07 — MOVER tem índice e obrigações gerais, mas não matriz de obrigações comerciais revisadas

Situação: **Revisão necessária**; prioridade high.

Dos 14 registros MOVER no catálogo, 13 são publicados e 1 histórico; nenhum possui fullTextReviewed true nem cadeia integral. Doze não possuem estados de revisão jurídica estruturados (null deve permanecer null). O portal oficial separa requisitos obrigatórios para comercialização/importação de veículos novos desde 01/06/2025 de incentivos empresariais. O checklist atual pede enquadramento genérico e não demonstra cobertura completa dessas condições.

Encaminhamento: Publicar a lacuna e separar compromissos/requisitos obrigatórios, PBEV voluntário, incentivos/habilitação/P&D e atos por empresa; revisar dispositivos doDecreto 12.435/2025 e atos leves/pesados antes de prometer checklists completos.

- [Seção 1. Requisitos Obrigatórios para Comercialização e Importação de Veículos Novos](https://www.gov.br/mdic/pt-br/assuntos/sdic/setor-automotivo/programa-mover)
- [Fonte oficial](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12435.htm)

### agency-audit-08 — Consulta pública sobre167/2026 não pode entrar como regra ativa

Situação: **Candidato pendente**; prioridade medium.

Busca oficial também localiza minuta para estabelecer ciclo de condução do Grupo 01 e alterar 167/2026. Proposta/minuta e ato publicado devem ter estados e tipos distintos.

Encaminhamento: Rastrear como proposal/consultation; só registrar efeito normativo após localizar publicação oficial final e revisar dispositivo. Não atribuir vigência a minuta.

- [Objeto da consulta sobre ciclo de condução Grupo01 e alteração 167/2026](https://www.gov.br/mdic/pt-br/assuntos/sdic/setor-automotivo/consultas-publicas)

### safety-990-republication — Usar a republicação da Portaria 990, preservando a publicação original

Situação: **Correção aplicada**; prioridade high.

A fonte primária do guia era o PDF original de 25 páginas. A republicação oficial tem 27 páginas e mudanças materiais em colunas/referências do Anexo XI.

Encaminhamento: URL/hash primários passaram à republicação; originalUrl e originalDocumentSha256 foram preservados. A matriz e o guia agora identificam expressamente essa edição.

Limite remanescente: A comparação não certifica toda a cadeia posterior nem transforma referências históricas do Anexo XI em obrigações atuais.

- [Republicação de 19/08/2022; Anexo XI, itens 1–4](https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria9902022R.pdf/@@display-file/file)

### safety-m2-unknown-pbt — PBT M2 ausente deve manter o grupo documental pendente

Situação: **Correção aplicada**; prioridade high.

O ramo M2 tratava a condição else como grupo pesado mesmo com massKg nulo.

Encaminhamento: Root adicionou ramo explícito PBT pendente; cenário real avaliado pelo módulo confirmou a saída sem classificação por massa presumida.

Limite remanescente: Tipo, estágio, documentos e anexos do projeto permanecem sujeitos à verificação.

- [Anexo XI, grupos de leves até 3.500 kg e pesados acima de 3.500 kg](https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria9902022R.pdf/@@display-file/file)

### safety-electric-mn-l — Distinguir os pacotes híbrido/elétrico M/N e L

Situação: **Correção aplicada**; prioridade high.

electric-safety apontava apenas ao índice CONTRAN e contexto Inmetro, sem a fonte específica do ramo.

Encaminhamento: Novas fontes 749/750, linhas report-electric-mn/l com seleção de propulsão e vínculo específico da tarefa electric-safety; categoria L não recebe o pacote M/N.

Limite remanescente: Anexos integrais, capítulos de pós-colisão e cadeia posterior exigem enquadramento próprio; não inferir método/edição/limite da referência UN/FMVSS.

- [749/2018, arts. 1º–3º; 750/2018, arts. 1º–3º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao7492018.pdf/@@display-file/file)

### safety-towed-auxiliary-axis — Inventariar eixo elétrico auxiliar sem inferi-lo do perfil O

Situação: **Correção aplicada**; prioridade high.

A categoria O não tinha frente dedicada ao semirreboque com eixo elétrico auxiliar. Ao mesmo tempo, herdar a segurança de veículo trator seria incorreto.

Encaminhamento: Adicionada report-electric-towed-review para todos os perfis O, em review, com presença/ausência a documentar; não depende de BEV/HEV nem afirma existência do eixo.

Limite remanescente: Apenas a confirmação de semirreboque e do equipamento habilita a análise específica dos requisitos e da modalidade de CAT.

- [Arts. 1º–2º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9562022.pdf/@@display-file/file)

### safety-heavy-auxiliary-motor — Vincular a modalidade específica de motor elétrico auxiliar em caminhão

Situação: **Correção aplicada**; prioridade high.

O fluxo genérico de modificação não destacava a modalidade de caminhão/caminhão-trator com motor elétrico auxiliar nem seus requisitos impactados.

Encaminhamento: Adicionada triagem report-auxiliary-motor-modification para N2/N3 com purpose modification; data de produção desde 01/01/2014 e natureza real da alteração são condições a conferir.

Limite remanescente: A linha não presume que toda modificação seja instalação de motor auxiliar. Anexo e retificação da 1.021 ainda precisam de revisão integral.

- [1.021/2026, arts. 3º–6º, especialmente art. 3º, §§1º–4º e art. 5º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao10212026.pdf/@@display-file/file)

### safety-impact-direct-bindings — Conectar o pacote de impactos às fontes específicas e retificações

Situação: **Correção aplicada**; prioridade medium.

report-impact-m1n1 apontava somente à Portaria 990 e a um índice, embora o acervo já contivesse dispositivos dirigidos de 910 e 949.

Encaminhamento: Fontes e ligações específicas foram adicionadas preservando review: PBT inferior a 2.500 kg, tipo, ponto R, derivação, código e cronogramas distintos.

Limite remanescente: Não universalizar relatório M1 para todo N1; ato vigente e dispositivo cujo prazo encerrou são estados diferentes.

- [910/2022, arts. 1º–6º e retificação; 949/2022, arts. 2º–5º e retificação](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9102022.pdf/@@display-file/file)

### safety-stability-and-m2-modifiers — Exibir os modificadores dos cronogramas ESC/VSF e M2

Situação: **Correção aplicada**; prioridade medium.

O fluxo referenciava o texto original sem ligação direta ao modificador do art. 7º da 954 ou ao corte retificado do art. 4º da 939.

Encaminhamento: Fonte 264 ligada às três linhas de estabilidade; retificação 939 ligada ao pacote M2; guia esclarece cortes 01/01/2020, 01/07/2023 e 01/01/2023 conforme cada ramo.

Limite remanescente: Os cortes não substituem o exame de exceções, data do primeiro modelo básico e cadeia posterior.

- [Deliberação 264/2022, art. 2º; retificação 939/2022 de 27/05/2022](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/deliberacoes/Deliberacao2642022.pdf/@@display-file/file)

### safety-profile-bus-sources — Conectar a avaliação do perfil aos atos próprios de M2/M3

Situação: **Correção aplicada**; prioridade medium.

A avaliação safety.sourceIds não apontava diretamente à 939 em M2 nem à 959 em M3, embora a matriz documental tivesse essas fontes.

Encaminhamento: Root incluiu as fontes específicas por categoria; a navegação do perfil passou a acompanhar os atos próprios.

Limite remanescente: Anexos, aplicação de ônibus e nível de prova não foram automaticamente confirmados.

- [939/2022, art. 2º; 959/2022, arts. 1º–2º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9392022.pdf/@@display-file/file)

### safety-restraints-current-pair — Ligar retenção a 951/997 sem reativar 220/2007

Situação: **Correção aplicada**; prioridade medium.

O quadro de processo precisava de frente explícita para retenção, e o Anexo XI da 990 ainda cita a 220/2007.

Encaminhamento: Adicionada report-restraints com fontes 951/997 e ressalva explícita de posição, categoria, anexo e atos de ônibus; a 220 permanece histórica.

Limite remanescente: Não tratar alterações de referências de ensaio como consolidação de todas as regras de banco/carroceria.

- [951/2022, arts. 1º–3º; 997/2023, arts. 1º–3º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9512022.pdf/@@display-file/file)

### safety-heavy-cab-milestones — Separar cadastro de ato e incidência temporal da proteção de cabine

Situação: **Correção aplicada**; prioridade medium.

A proteção da cabine N2/N3 não tinha frente própria e não deve ser inferida dos bancos ilustrados do SUV.

Encaminhamento: Adicionada report-cab-n2n3 em review, com marcos originais 2028 para novos projetos e 2030 para produção; nenhuma obrigação geral de ensaio em 2026 foi declarada.

Limite remanescente: Conferir primeiro código, exceções, anexo e alterações posteriores antes da decisão.

- [765/2018, arts. 1º–4º](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao7652018.pdf/@@display-file/file)

### safety-coverage-not-total — A cobertura de navegação não prova todo o arcabouço aplicável

Situação: **Revisão necessária**; prioridade high.

30 subsistemas e 47 atividades são um universo editorial, não todo o conjunto de obrigações veiculares ou de modalidades de homologação.

Encaminhamento: Adicionada report-general-construction e documentação de limites; a matriz tem 17 frentes consultivas, sem percentual que certifique completude legal.

Limite remanescente: Continuam pendentes conforme o caso: anexos técnicos integrais, cadeia posterior por assunto, tipos e construção, artesanal/leilão/dispensa e demais módulos especiais, dados de primeiro código, ponto R, eixos e configuração de laboratório.

- [993/2023, arts. 2º–7º; SISCAT, carta de serviço](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9932023.pdf/@@display-file/file)

### safety-authenticated-module — Conferir documentos e canal no módulo real do SISCAT

Situação: **Revisão necessária**; prioridade medium.

A página CAT menciona SEI, enquanto a carta SISCAT estabelece obrigatoriedade do módulo quando disponibilizado. Nenhuma sessão autenticada foi acessada.

Encaminhamento: O guia conserva a distinção e exige confirmação do módulo e procedimento de indisponibilidade; não promete protocolo automático.

Limite remanescente: Confirmar documentos, disponibilização do módulo, canal de contingência, taxa e acesso na operação concreta; orientação pública não equivale ao procedimento completo autenticado.

- [Portaria 990/2022, art. 26; carta SISCAT](https://www.gov.br/pt-br/servicos/sistema-de-certificacao-de-adequacao-a-legislacao-de-transito)

### monitor-mdic-76-2026 — Grupo de trabalho da Portaria MDIC 76/2026 identificado no índice

Situação: **Candidato pendente**; prioridade low.

Institui grupos de trabalho para elaboração de propostas técnicas sobre reciclabilidade e desempenho estrutural e tecnologias assistivas de veículos automotores pesados.

Encaminhamento: Conferir a íntegra e acompanhar as propostas resultantes. O registro não acrescenta requisito obrigatório ao veículo.

Limite remanescente: Somente ementa/índice conferidos; conteúdo e efeitos do ato não foram estruturados.

- [Índice oficial MDIC2026](https://www.gov.br/mdic/pt-br/acesso-a-informacao/institucional/atos-normativos/gabinete-do-ministro/portarias/2026)
- [Localizador DOU — íntegra pendente](https://www.in.gov.br/web/dou/-/portaria-gm/mdic-n-76-de-27-de-marco-de-2026-696054503)

## Manutenção e consulta por IA

Consulte a [arquitetura da base](arquitetura-base-regulatoria.md), o [monitor de fontes](atualizacoes-e-operacao.md) e os cartões versionados em `knowledge/`. As conclusões antigas de um processo são sinalizadas para nova conferência quando o conjunto de dados/regras muda; as notas e referências não são apagadas.
