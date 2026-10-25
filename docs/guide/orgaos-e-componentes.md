# Consulta por órgão e projeto de uma peça nova

Revisão dirigida: **25/10/2026**. Esta é uma organização de trabalho baseada nas fontes citadas e nos registros do acervo. Não representa cobertura de toda a legislação automotiva. Os estados de revisão, as exclusões editoriais e as lacunas existentes permanecem.

## Qual frente consultar

| Frente | Decisão a preparar | Saída a organizar |
| --- | --- | --- |
| IBAMA / CONAMA | Programa/fase e classe ambiental, configuração, família, ensaios e modalidade do licenciamento | Dossiê ambiental e licença/dispensa formal correspondente; veja `emissoes.md` |
| CONTRAN / SENATRAN | Identificação e segurança para a categoria, tipo, uso, datas e modalidade | Evidências, Certificado de Segurança, CAT e marca/modelo/versão quando aplicáveis |
| Inmetro | Produto no escopo de RTQ/RAC, mecanismo de avaliação, registro e marcação | Certificação por OCP ou declaração do fornecedor, conforme o programa; identificação pertinente |
| Anatel | Função de telecomunicações, RF, módulo, antena e integração | Avaliação, homologação e identificação do produto abrangido |
| MDIC / MOVER | Obrigações e compromissos aplicáveis à empresa/produto e eventuais regimes de incentivo | Cadastro, compromissos, comprovação e relatórios do regime efetivamente aplicável |

As frentes podem tramitar em paralelo, respeitando dependências documentais reais. Aprovação por um órgão não substitui a de outro. Veja as cartas de serviço e os atos ligados a cada item, sem tratar a associação temática do acervo como obrigação automática.

## Inmetro: o nome da peça não resolve o escopo

O [Portal IQ oficial para a Portaria 145/2022](https://portaliq.mdic.gov.br/busca-aplicada/central-de-consultas/portaria-inmetro-no-1452022?layout=norma_detalhe) identifica produtos como amortecedores, baterias chumbo-ácido, componentes de direção e materiais de atrito. A consulta é uma referência oficial, não prova de revisão da íntegra de todos os RTQs/RACs. Os 18 registros existentes do Inmetro continuam com essa limitação. Classifique produto, aplicação, mercado OEM/reposição, família e fabricação/importação; confirme exclusões antes de escolher ensaios e mecanismo. Não estenda requisitos de chumbo-ácido à bateria de tração de íons de lítio por semelhança do nome.

Um exemplo concreto: a [FAQ Inmetro de 13/08/2026 sobre LED automotivo](https://www.gov.br/inmetro/pt-br/acesso-a-informacao/perguntas-frequentes/avaliacao-da-conformidade/lampadas-e-luminarias-led-portaria-inmetro-no-231-2026-fabricantes-importadores-comerciantes-e-distribuidores/lampadas-led-para-carros-precisam-de-certificacao) informa que o LED automotivo está fora do escopo das Portarias 145/2022 e 231/2026; a 145 trata das lâmpadas de filamento e miniatura. Isso não autoriza qualquer substituição no veículo: a instalação deve ser confrontada com as regras atuais CONTRAN de iluminação e modificação. A FAQ é orientação, não um novo RAC nem dispensa geral de segurança.

O [Ofício Circular 5/2026](https://www.gov.br/inmetro/pt-br/assuntos/acreditacao-reconhecimento-bpl/comunicados/dicor-alerta/2026/oficio-circular-5-2026-dconf-inmetro.pdf) é orientação sobre baterias automotivas chumbo-ácido importadas e harmonização de entendimento. Não o transforme em regulamento universal de baterias elétricas. Separe conformidade do produto, anuência de importação e avaliação do veículo.

## Anatel: avalie a integração real

A [base legal oficial de certificação](https://www.gov.br/anatel/pt-br/regulado/certificacao-de-produtos/base-legal) remete à Resolução 715/2019. O acervo tem textos dirigidos e modificadores, incluindo 779/2025 e 780/2025. Na consulta de 25/10/2026, o endereço principal da 715 redirecionou para manutenção; não foi registrado como íntegra novamente revisada.

Para telemática, chave RF, Bluetooth/Wi-Fi, TPMS ou radar, registre tecnologia/banda, potência, antena, alimentação, software e condição de integração. Verifique escopo do certificado do módulo e se a integração requer nova avaliação. O [procedimento operacional publicado no Ato 4083/2020](https://informacoes.anatel.gov.br/legislacao/resolucoes/2020/1453-resolucao-729) prevê essa possibilidade para módulos; não existe dispensa automática para todo produto final. Identificação/e-label, exposição humana e requisitos específicos devem seguir a configuração e o procedimento vigente. Rádio exclusivamente receptor AM/FM não deve receber uma exigência universal deduzida pelo título “rádio”.

## MDIC: separar regime industrial e homologação do veículo

O [portal do MOVER](https://www.gov.br/mdic/pt-br/assuntos/sdic/setor-automotivo/programa-mover) descreve o programa instituído pela Lei 14.902/2024. Organize compromissos de eficiência, sustentabilidade e segurança, habilitação e incentivos conforme o dispositivo aplicável à empresa e ao produto. A participação em um incentivo não é um CAT.

O [índice oficial de portarias de 2026](https://www.gov.br/mdic/pt-br/acesso-a-informacao/institucional/atos-normativos/gabinete-do-ministro/portarias/2026) indica a Portaria GM/MDIC 68/2026 como revogadora da 43/2024. A página geral do programa ainda menciona a 43 em uma tabela. Use o ato e os modificadores; não promova a referência antiga da página geral a regra atual. Esta revisão confirma o índice, não a íntegra consolidada da 68 e todas as condições de transição. Não confunda esse ato com portarias homônimas de outro órgão ou ano.

## Dossiê recomendado para projetar um novo componente

A lista é uma recomendação de engenharia para organizar evidências, não uma lista legal universal de ensaios:

- [ ] Descrever função, interface, versões, materiais, química, software e modo de falha relevante.
- [ ] Fixar veículos-alvo, categoria, massas, datas e uso; separar equipamento original e reposição.
- [ ] Selecionar a peça no modelo e consultar os assuntos ligados especificamente ao conjunto.
- [ ] Registrar os órgãos que precisam de enquadramento, com ato, dispositivo, hipótese e exclusão justificadas.
- [ ] Identificar ensaios do produto e ensaios afetados no veículo; registrar o que pode ser reaproveitado e a justificativa.
- [ ] Conferir norma/edição, laboratório e método na fonte adequada; adquirir normas técnicas privadas quando necessárias.
- [ ] Planejar evidência verificável: amostra, configuração, relatório/certificado, rastreabilidade e responsável.
- [ ] Validar marcação, manual, identificação e documentação de importação, quando aplicáveis.
- [ ] Avaliar impacto sobre CAT/LCVM e outros registros existentes antes de alterar produção.
- [ ] Controlar fornecedores, mudanças, revisões, reclamações e manutenção de certificados.

Quando um assunto está sem norma cadastrada, o estado correto é “lacuna do acervo”, não “sem obrigação”. Não preencher lacunas de chicote/radiador com normas de sistemas vizinhos. Os detalhes da fonte e o recorte por peça devem acompanhar a seleção em árvore, lista e processo.
