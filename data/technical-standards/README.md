# Levantamento documental de NBRs - 20/10/2026

`review-input.json.gz` preserva os 570 vínculos preparados a partir do pacote
documental enviado pelo usuário. Os campos literais não são decisões de vigência
ou aplicabilidade. As 23 verificações originalmente vazias estão explicitadas como
`nao_informada_no_pacote`. `integration-audit.json` registra a auditoria desse
pacote, não uma auditoria posterior da aplicação.

`scripts/build_technical_standards.py` gera:

- `data/site/technical-standards.json`: 313 citações associadas por ID a 68 atos
  já publicados. Todas têm `reviewState: pending` e
  `applicability: requires_assessment`. A interface as apresenta como levantamento
  em revisão; não são requisitos canônicos nem liberam decisões jurídicas.
- `integration-pending.csv`: 257 vínculos sem correspondência confirmada com um
  ato publicado. Isso não significa 257 atos ausentes. Nenhum ID foi inventado a
  partir de número, título, órgão aproximado ou URL parecida.

Regeneração: `npm run build:data`. O índice é carregado sob demanda na biblioteca,
na busca e no documento. O veículo continua carregando apenas o índice inicial.
Esta pasta não integra a allowlist de `dist`; somente o índice público derivado é
publicado. Atos excluídos ou históricos não entram pelo levantamento.

## Busca e edições

`designacao_base_busca` é uma identidade tipográfica para pesquisa. A designação
literal, a edição citada, as alternativas, as fontes e as ressalvas permanecem
por vínculo. Não substituir a edição legal pela comercial atual nem converter
ISO puro em ABNT NBR ISO. Famílias e partes permanecem distintas. A busca por
16567 alcança atos publicados com citações rastreáveis; não mede obrigações ou
cobertura jurídica.

## Dispositivo dos híbridos

`ibama-in-3-2023:req:02` descreve somente o art. 2º, conferido no snapshot oficial
`139279` já arquivado em `data/proconve/sources/evidence.json.gz`. O gerador
confere trecho, URL e hash. A tentativa de recuperação ao vivo em 20/10/2026
retornou HTTP 403. Não foi declarada conferência de toda a cadeia posterior nem
da norma técnica privada; o plano de ensaio continua `not_structured`.

As atividades HEV/PHEV/híbrido da etapa laboratório usam `requirementRefs` para
consultar esse dispositivo. O requisito `req:01` de famílias evaporativas é
preservado no ato; não é um método de preparação ou de emissões para PHEV.

## Próxima revisão documental

Reconciliar os IDs pendentes com documento e identidade completa; verificar cadeia,
período, alternativa e escopo antes de promover uma citação. Priorizar IN IBAMA
10/2024 e 21/2022, MDIC 19/277 e Inmetro 33/223. O prazo condicional de pneus de
23/10/2026 precisa de confirmação da cadeia antes de virar alerta público.

Os exemplos de aplicabilidade e seus 96 testes do pacote são testes de
componentes; não foram instalados como um motor jurídico. A composição de escopo,
dispensa, cronograma e evidência exige revisão por requisito. Dados ausentes
devem continuar desconhecidos.
