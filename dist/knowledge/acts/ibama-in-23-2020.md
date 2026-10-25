---
agency: "proconve"
aliases: ["ibama-029", "ibama-032", "ibama-in-23-2020"]
applicability: {"basis": "Mapa dirigido a partir dos objetos e dispositivos oficiais, com rastreabilidade por norma e fase.", "conditions": ["Categoria, configuração, datas, combustível, exceções e transições precisam de enquadramento."], "phases": ["L8"], "state": "requires_assessment", "vehicleSpecific": false}
automaticApplicability: false
context: {"activities": [], "relation": "act_context_only", "systems": ["eletronica", "propulsao"], "vehicleLinks": [{"basis": "Relação conferida no objeto e nos dispositivos do ato; a exigência depende da fase, categoria, combustível e datas.", "componentId": "motor", "subsystemId": "propulsao/emissoes", "systemId": "propulsao"}, {"basis": "Relação conferida no objeto e nos dispositivos do ato; a exigência depende da fase, categoria, combustível e datas.", "componentId": "escapamento", "subsystemId": "propulsao/emissoes", "systemId": "propulsao"}, {"basis": "Relação conferida no objeto e nos dispositivos do ato; a exigência depende da fase, categoria, combustível e datas.", "componentId": "eletrica", "subsystemId": "eletronica/obd", "systemId": "eletronica"}, {"basis": "Relação conferida no objeto e nos dispositivos do ato; a exigência depende da fase, categoria, combustível e datas.", "componentId": "tanque", "subsystemId": "propulsao/combustiveis", "systemId": "propulsao"}]}
detailPath: "data/site/records/proconve/ibama-in-23-2020.json"
fullTextIncluded: false
id: "ibama-in-23-2020"
kind: "consultation_act_card"
legalStatus: {"asOf": "2026-10-19", "basis": "Indicação nas fontes do recorte revisado; não equivale a consolidação integral.", "evidence": ["Art. 1º Estabelecer especificações e critérios de verificação e certificação do Sistema de Diagnose a Bordo OBDBr-3, aplicados a veículos leves, em atendimento aos arts. 18 e 19 da Resolução CONAMA nº 492, de 20 de dezembro de 2018. Parágrafo único. Para atendimento às determinações desta Instrução Normativa serão utilizadas as normas internacionais ISO 15031, partes 1 a 7, ISO 15765 parte 4 e ISO 2575, até que sejam estabelecidos instrumentos normativos nacionais equivalentes. ", "Art. 6º Para os veículos com motores de ignição por centelha que atendem à Fase PROCONVE L8, conforme Resolução CONAMA nº 492, de 2018, o sistema OBDBr-3, complementarmente às funções e características estabelecidas no ", "Art. 6A. Para os veículos com motores de ignição por compressão que atendem à Fase PROCONVE L8, conforme Resolução CONAMA nº 492, de 2018, o sistema OBDBr-3, complementarmente às funções e características estabelecidas no ", "Art. 7º As interfaces, protocolos de comunicação, conectores, ferramentas de diagnose e códigos de falhas devem estar de acordo com as normas internacionais descritas na Parte 6 do ANEXO desta Instrução Normativa, até o estabelecimento de normas brasileiras equivalentes. ", "Art. 6A desta Instrução Normativa. A critério do fabricante, também pode(m) ser considerado(s) em mau funcionamento mesmo que as emissões não excedam estes limites. No caso de sistemas de escapamento que contenham catalisadores em \"paralelo\" (isto é, configuração com dois bancos na qual cada um dos bancos tem o seu próprio catalisador), o critério de mau funcionamento deve ser determinado com os catalisadores em \"paralelo\" igualmente deteriorados. (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) II. Remoção ou inoperância de qualquer um dos conversores do sistema de pós-tratamento de emissões, como unidade separada ou integrado em um dispositivo de controle de emissões combinado, mesmo que as emissões não excedam quaisquer dos limites para ativação da LIM. 2.2.2.2. O mau funcionamento do filtro de material particulado (DPF) quanto à: I. Redução da eficiência que provoque emissões acima de quaisquer dos limites para a ativação da LIM. A critério do fabricante, também pode ser considerado em mau funcionamento mesmo que as emissões não excedam estes limites. II. Remoção ou inoperância do filtro de material particulado, como unidade separada ou integrado em um dispositivo de controle de emissões combinado, mesmo que as emissões não excedam quaisquer dos limites para ativação da LIM. III. Regeneração inadequada do filtro de material particulado em veículos da fase L-8 nas condições definidas pelo fabricante, onde a regeneração é projetada para ocorrer. (Incluído pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.2.2.3. O mau funcionamento do sistema de pós-tratamento de NOx quanto à: I. Redução da eficiência que provoque emissões acima de quaisquer dos limites para a ativação da LIM. A critério do fabricante, também pode ser considerado em mau funcionamento mesmo que as emissões não excedam estes limites. II. Falha do sistema de pós-tratamento dos", "Art. 6A desta Instrução Normativa, a continuidade elétrica de outros componentes conectados ao módulo de controle do motor cujas falhas afetem as emissões. Alternativamente pode ser efetuado o monitoramento indireto (plausibilidade). (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.2.2.10. A continuidade elétrica dos componentes do sistema de controle do motor que sejam necessários para que se efetuem as funções de monitoramento do sistema OBDBr-3. Alternativamente pode ser efetuado o monitoramento indireto (plausibilidade). 2.2.2.11. A critério do fabricante, plausibilidade de componentes do sistema de controle do motor e das emissões. 2.2.2.12. Falhas de combustão em um ou mais cilindros, sem a obrigatoriedade de identificar o cilindro específico com falha de combustão. Se mais de um cilindro apresentar falha de combustão, um código de falha separado deverá ser armazenado indicando que múltiplos cilindros estão apresentando falha. Ao identificar vários cilindros com falha de combustão o sistema OBDBr-3 não é obrigado a identificar cada um dos cilindros com falha de combustão individualmente por meio de códigos de falha individuais. (Incluído pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.2.2.12.1. O sistema OBDBr-3 deve monitorar minimamente falhas de combustão durante as condições de marcha lenta do motor, pelo menos uma vez por ciclo de condução em que as condições de monitoramento para falha de combustão são atendidas. (Incluído pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.2.2.12.1.1. O fabricante deve garantir que as condições de monitoramento: (Incluído pela Instrução Nomativa 20, de 10 de dezembro de 2021) I. sejam tecnicamente necessárias para garantir a detecção robusta de mau funcionamento (por exemplo, evitar falso resultado \"passa/não passa\") projetado para garantir que o monitoramento ocorrerá em condições que ", "Art. 6º desta Instrução Normativa para veículos com motores de ignição por centelha, ou no Inciso I do ", "Art. 6A desta Instrução Normativa para veículos com motores de ignição por compressão. (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.4.9.2. Falhas detectadas de acordo com os critérios de monitoramento definidos nos itens 2.2.1 para veículos com motores de ignição por centelha ou 2.2.2 para veículos com motores de ignição por compressão. 2.5. Do Armazenamento de Códigos de Falha 2.5.1. O sistema OBDBr-3 deve registrar código(s) de falha indicando o estado do sistema de controle de emissões conforme descrito no item 2.5.6. Códigos de estado diferentes devem ser usados para identificar sistemas de controle de emissões prontamente funcionais e os sistemas que necessitam de um maior tempo de operação do veículo para serem avaliados. 2.5.2. Se a LIM for ativada devido à deterioração ou ao mau funcionamento ou à passagem para o modo degradado de emergência, um código de falha deve ser armazenado para identificar o mau funcionamento. 2.5.3. Um código de falha também deve ser armazenado nas condições referidas nos itens 2.2.1.12 a 2.2.1.14 e 2.2.2.9 a 2.2.2.11. 2.5.4. A distância percorrida pelo veículo desde o momento em que a LIM foi ativada deve estar disponível a qualquer momento através do conector normalizado do Sistema OBDBr-3. Essa informação deve estar contida no PID $21 do Serviço $01, conforme descrito na norma ISO 15031-5. 2.5.4.1. É facultativo o registro do código de falha, bem como da distância percorrida, em caso da falha específica da LIM. 2.5.5. Não é necessária a identificação do cilindro onde se registram falhas de combustão desde que se registre um código de falha distinto para um ou múltiplos cilindros. 2.5.6. Estado de prontidão - O módulo de controle do motor deve indicar através do(s) estado(s) de prontidão que o diagnóstico de todos os sistemas e componentes monitorados foi completado, no mínimo, desde a última vez que os cód", "Art. 6º desta Instrução Normativa para veículos com motores de ignição por centelha, ou no § 1º do ", "Art. 6A desta Instrução Normativa para veículos com motores de ignição por compressão. (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) 3.1.1.3. Deficiências relativas ao não atendimento da Parte 6 deste ANEXO, com exceção do item 6.3.1.4. Isto não é aplicável aos veículos bi-combustíveis funcionando a gás. 3.1.2. Demais deficiências relativas à produção descontinuada de motores, veículos ou módulos de controle de motor serão analisadas pelo Ibama. 3.2. Veículos Bicombustível Funcionando a Gás 3.2.1. Sem prejuízo dos requisitos do item 2.8.1 da Parte 2 deste ANEXO, e sempre que solicitado pelo fabricante, o Ibama aceitará as seguintes deficiências como estando em conformidade com os requisitos deste ANEXO para efeitos da homologação de veículos bicombustíveis funcionando a gás: a) Apagamento de códigos de falha, distância percorrida e informação do QIP correspondente após 40 períodos de aquecimento consecutivos do motor, independentemente do combustível utilizado; b) Ativação da LIM em ambos os tipos de combustível (gasolina/etanol e gás) após a detecção de uma falha em um dos tipos de combustível; c) Desativação da LIM depois de efetuados três ciclos de condução consecutivos sem falha, independentemente do combustível utilizado; d) Utilização de dois códigos de estado de prontidão, um para cada tipo de combustível. 3.2.1.1. O fabricante poderá solicitar mais opções cujo deferimento ficará a critério do Ibama. 3.2.2. Sem prejuízo dos requisitos do item 6.4 da Parte 6 deste ANEXO, e sempre que solicitado pelo fabricante, o Ibama aceitará as seguintes deficiências como estando em conformidade com os requisitos deste ANEXO para efeitos de avaliação e transmissão de sinais de diagnose: a) Transmissão de sinais de diagnose relativos ao combustível utilizado num só endereço-fonte; b) Avaliação de um conjunto de sinais de diagnose para ambos os tipos de c", "Art. 6º no caso de veículos com motores de ignição por centelha da Fase PROCONVE L8. (Retificado) 7.1.4. Se o veículo estiver equipado com um monitor \"M\" específico, o IUMPRM deve obedecer ao estabelecido no § 2º do ", "Art. 6º no caso de veículos com motores de ignição por centelha da Fase PROCONVE L8 e no § 2º do ", "Art. 6A no caso de veículos com motores de ignição por compressão da Fase PROCONVE L8. (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) 7.1.5. Os veículos devem satisfazer os requisitos do item 7.1.4 para uma quilometragem de pelo menos 160.000 km (cento e sessenta mil quilômetros). 7.1.6. Para veículos da Fase PROCONVE L8, considera-se que o requisito foi cumprido para um monitor \"M\" específico se, para todos os veículos de uma determinada família de OBD fabricados num determinado ano, forem verificadas as seguintes condições estatísticas em uma amostra: a) O valor médio do IUMPRM é maior ou igual ao valor mínimo aplicável ao monitor; b) Mais de 50% do total de veículos têm um IUMPRM maior ou igual ao valor mínimo aplicável ao monitor. 7.1.7. Para confirmação do atendimento das condições do item 7.1.6, o programa que abrange a forma de coleta de dados, a frota alvo, a periodicidade da amostragem e a forma de controle será definidos em uma regulamentação específica do Ibama será definido em uma regulamentação específica do Ibama. (Retificado) 7.1.7. O procedimento de coleta de dados, definição da frota-alvo, periodicidade de amostragem, forma de controle e cálculo da Taxa de Desempenho de Monitores em Uso (IUMPR) será aquele descrito na Parte 9 do Anexo desta Instrução Normativa.(Redação dada pela Instrução Normativa nº 16, de 18 de agosto de 2025 ) 7.2. NumeradorM 7.2.1. O numerador de um monitor específico é um contador que mede o número de vezes que o veículo foi operado de tal forma que todas as condições necessárias para esse monitor detectar uma falha foram atendidas. O numerador deve ser incrementado em até 10 segundos quando essas condições forem satisfeitas e não deve ser incrementado mais de uma vez por ciclo de condução. 7.3. DenominadorM 7.3.1. A finalidade do denominador é apresentar um contador que indique o número de eventos em que o"], "state": "indicated_current"}
limitations: ["A IN 20/2025 ajusta a Parte 9: coleta dos dados de IUMPR a partir de janeiro de 2026; relatório até 31 de julho e plano até 31 de março, com entregas iniciando em 2027. Ler a IN 16/2025 com essa alteração.", "Esta ficha reúne referências e trechos do acervo; não inclui a íntegra do ato nem comprova consolidação da cadeia.", "Nenhum requisito estruturado foi disponibilizado para este ato.", "O vínculo é temático e depende do enquadramento. A fase L8 de veículos leves não é a fase P8 de veículos pesados.", "Vínculos de sistema e atividade são contexto de consulta; a aplicabilidade individual precisa de avaliação do projeto."]
markdownPath: "acts/ibama-in-23-2020.md"
officialUrl: "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=138749"
phases: ["L8"]
provenance: {"path": "data/site/index.json", "pointer": "/regulations/proconve/records/18"}
publication: {"included": true, "policySource": "data/proconve/reviewed-map.json", "reason": "included_in_reviewed_collection", "reviewedAt": "2026-10-19"}
relatedCandidates: []
requirementIds: []
reviewDate: "2026-10-19"
reviewStatus: {"amendmentChainReviewed": false, "fullTextReviewed": null, "gaps": ["O vínculo é temático e depende do enquadramento. A fase L8 de veículos leves não é a fase P8 de veículos pesados.", "A IN 20/2025 ajusta a Parte 9: coleta dos dados de IUMPR a partir de janeiro de 2026; relatório até 31 de julho e plano até 31 de março, com entregas iniciando em 2027. Ler a IN 16/2025 com essa alteração."], "reviewedAt": "2026-10-19", "state": "directed_text_review", "summary": "Trechos e relações identificadas revisados; cadeia integral não certificada."}
revision: "227b87d4132e618bad14da8a5b8d21920ab61bac115ed4e71f7438d614b4b639"
sourceIds: []
stateProvenance: {"path": "data/site/records/proconve/ibama-in-23-2020.json", "pointer": ""}
title: "Instrução Normativa IBAMA nº 23/2020"
---

# Instrução Normativa IBAMA nº 23/2020

## Resumo do acervo

OBDBr-3 e monitores em uso

## Fonte e estados

- Fonte oficial: <https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=138749>
- Revisão registrada do ato: 2026-10-19.
- Revisão desta ficha: `227b87d4132e618bad14da8a5b8d21920ab61bac115ed4e71f7438d614b4b639`.
- O conteúdo abaixo é referência/trecho; a íntegra não foi exportada.

- `legalStatus`: `{"asOf": "2026-10-19", "basis": "Indicação nas fontes do recorte revisado; não equivale a consolidação integral.", "evidence": ["Art. 1º Estabelecer especificações e critérios de verificação e certificação do Sistema de Diagnose a Bordo OBDBr-3, aplicados a veículos leves, em atendimento aos arts. 18 e 19 da Resolução CONAMA nº 492, de 20 de dezembro de 2018. Parágrafo único. Para atendimento às determinações desta Instrução Normativa serão utilizadas as normas internacionais ISO 15031, partes 1 a 7, ISO 15765 parte 4 e ISO 2575, até que sejam estabelecidos instrumentos normativos nacionais equivalentes. ", "Art. 6º Para os veículos com motores de ignição por centelha que atendem à Fase PROCONVE L8, conforme Resolução CONAMA nº 492, de 2018, o sistema OBDBr-3, complementarmente às funções e características estabelecidas no ", "Art. 6A. Para os veículos com motores de ignição por compressão que atendem à Fase PROCONVE L8, conforme Resolução CONAMA nº 492, de 2018, o sistema OBDBr-3, complementarmente às funções e características estabelecidas no ", "Art. 7º As interfaces, protocolos de comunicação, conectores, ferramentas de diagnose e códigos de falhas devem estar de acordo com as normas internacionais descritas na Parte 6 do ANEXO desta Instrução Normativa, até o estabelecimento de normas brasileiras equivalentes. ", "Art. 6A desta Instrução Normativa. A critério do fabricante, também pode(m) ser considerado(s) em mau funcionamento mesmo que as emissões não excedam estes limites. No caso de sistemas de escapamento que contenham catalisadores em \"paralelo\" (isto é, configuração com dois bancos na qual cada um dos bancos tem o seu próprio catalisador), o critério de mau funcionamento deve ser determinado com os catalisadores em \"paralelo\" igualmente deteriorados. (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) II. Remoção ou inoperância de qualquer um dos conversores do sistema de pós-tratamento de emissões, como unidade separada ou integrado em um dispositivo de controle de emissões combinado, mesmo que as emissões não excedam quaisquer dos limites para ativação da LIM. 2.2.2.2. O mau funcionamento do filtro de material particulado (DPF) quanto à: I. Redução da eficiência que provoque emissões acima de quaisquer dos limites para a ativação da LIM. A critério do fabricante, também pode ser considerado em mau funcionamento mesmo que as emissões não excedam estes limites. II. Remoção ou inoperância do filtro de material particulado, como unidade separada ou integrado em um dispositivo de controle de emissões combinado, mesmo que as emissões não excedam quaisquer dos limites para ativação da LIM. III. Regeneração inadequada do filtro de material particulado em veículos da fase L-8 nas condições definidas pelo fabricante, onde a regeneração é projetada para ocorrer. (Incluído pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.2.2.3. O mau funcionamento do sistema de pós-tratamento de NOx quanto à: I. Redução da eficiência que provoque emissões acima de quaisquer dos limites para a ativação da LIM. A critério do fabricante, também pode ser considerado em mau funcionamento mesmo que as emissões não excedam estes limites. II. Falha do sistema de pós-tratamento dos", "Art. 6A desta Instrução Normativa, a continuidade elétrica de outros componentes conectados ao módulo de controle do motor cujas falhas afetem as emissões. Alternativamente pode ser efetuado o monitoramento indireto (plausibilidade). (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.2.2.10. A continuidade elétrica dos componentes do sistema de controle do motor que sejam necessários para que se efetuem as funções de monitoramento do sistema OBDBr-3. Alternativamente pode ser efetuado o monitoramento indireto (plausibilidade). 2.2.2.11. A critério do fabricante, plausibilidade de componentes do sistema de controle do motor e das emissões. 2.2.2.12. Falhas de combustão em um ou mais cilindros, sem a obrigatoriedade de identificar o cilindro específico com falha de combustão. Se mais de um cilindro apresentar falha de combustão, um código de falha separado deverá ser armazenado indicando que múltiplos cilindros estão apresentando falha. Ao identificar vários cilindros com falha de combustão o sistema OBDBr-3 não é obrigado a identificar cada um dos cilindros com falha de combustão individualmente por meio de códigos de falha individuais. (Incluído pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.2.2.12.1. O sistema OBDBr-3 deve monitorar minimamente falhas de combustão durante as condições de marcha lenta do motor, pelo menos uma vez por ciclo de condução em que as condições de monitoramento para falha de combustão são atendidas. (Incluído pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.2.2.12.1.1. O fabricante deve garantir que as condições de monitoramento: (Incluído pela Instrução Nomativa 20, de 10 de dezembro de 2021) I. sejam tecnicamente necessárias para garantir a detecção robusta de mau funcionamento (por exemplo, evitar falso resultado \"passa/não passa\") projetado para garantir que o monitoramento ocorrerá em condições que ", "Art. 6º desta Instrução Normativa para veículos com motores de ignição por centelha, ou no Inciso I do ", "Art. 6A desta Instrução Normativa para veículos com motores de ignição por compressão. (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) 2.4.9.2. Falhas detectadas de acordo com os critérios de monitoramento definidos nos itens 2.2.1 para veículos com motores de ignição por centelha ou 2.2.2 para veículos com motores de ignição por compressão. 2.5. Do Armazenamento de Códigos de Falha 2.5.1. O sistema OBDBr-3 deve registrar código(s) de falha indicando o estado do sistema de controle de emissões conforme descrito no item 2.5.6. Códigos de estado diferentes devem ser usados para identificar sistemas de controle de emissões prontamente funcionais e os sistemas que necessitam de um maior tempo de operação do veículo para serem avaliados. 2.5.2. Se a LIM for ativada devido à deterioração ou ao mau funcionamento ou à passagem para o modo degradado de emergência, um código de falha deve ser armazenado para identificar o mau funcionamento. 2.5.3. Um código de falha também deve ser armazenado nas condições referidas nos itens 2.2.1.12 a 2.2.1.14 e 2.2.2.9 a 2.2.2.11. 2.5.4. A distância percorrida pelo veículo desde o momento em que a LIM foi ativada deve estar disponível a qualquer momento através do conector normalizado do Sistema OBDBr-3. Essa informação deve estar contida no PID $21 do Serviço $01, conforme descrito na norma ISO 15031-5. 2.5.4.1. É facultativo o registro do código de falha, bem como da distância percorrida, em caso da falha específica da LIM. 2.5.5. Não é necessária a identificação do cilindro onde se registram falhas de combustão desde que se registre um código de falha distinto para um ou múltiplos cilindros. 2.5.6. Estado de prontidão - O módulo de controle do motor deve indicar através do(s) estado(s) de prontidão que o diagnóstico de todos os sistemas e componentes monitorados foi completado, no mínimo, desde a última vez que os cód", "Art. 6º desta Instrução Normativa para veículos com motores de ignição por centelha, ou no § 1º do ", "Art. 6A desta Instrução Normativa para veículos com motores de ignição por compressão. (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) 3.1.1.3. Deficiências relativas ao não atendimento da Parte 6 deste ANEXO, com exceção do item 6.3.1.4. Isto não é aplicável aos veículos bi-combustíveis funcionando a gás. 3.1.2. Demais deficiências relativas à produção descontinuada de motores, veículos ou módulos de controle de motor serão analisadas pelo Ibama. 3.2. Veículos Bicombustível Funcionando a Gás 3.2.1. Sem prejuízo dos requisitos do item 2.8.1 da Parte 2 deste ANEXO, e sempre que solicitado pelo fabricante, o Ibama aceitará as seguintes deficiências como estando em conformidade com os requisitos deste ANEXO para efeitos da homologação de veículos bicombustíveis funcionando a gás: a) Apagamento de códigos de falha, distância percorrida e informação do QIP correspondente após 40 períodos de aquecimento consecutivos do motor, independentemente do combustível utilizado; b) Ativação da LIM em ambos os tipos de combustível (gasolina/etanol e gás) após a detecção de uma falha em um dos tipos de combustível; c) Desativação da LIM depois de efetuados três ciclos de condução consecutivos sem falha, independentemente do combustível utilizado; d) Utilização de dois códigos de estado de prontidão, um para cada tipo de combustível. 3.2.1.1. O fabricante poderá solicitar mais opções cujo deferimento ficará a critério do Ibama. 3.2.2. Sem prejuízo dos requisitos do item 6.4 da Parte 6 deste ANEXO, e sempre que solicitado pelo fabricante, o Ibama aceitará as seguintes deficiências como estando em conformidade com os requisitos deste ANEXO para efeitos de avaliação e transmissão de sinais de diagnose: a) Transmissão de sinais de diagnose relativos ao combustível utilizado num só endereço-fonte; b) Avaliação de um conjunto de sinais de diagnose para ambos os tipos de c", "Art. 6º no caso de veículos com motores de ignição por centelha da Fase PROCONVE L8. (Retificado) 7.1.4. Se o veículo estiver equipado com um monitor \"M\" específico, o IUMPRM deve obedecer ao estabelecido no § 2º do ", "Art. 6º no caso de veículos com motores de ignição por centelha da Fase PROCONVE L8 e no § 2º do ", "Art. 6A no caso de veículos com motores de ignição por compressão da Fase PROCONVE L8. (Redação dada pela Instrução Nomativa 20, de 10 de dezembro de 2021) 7.1.5. Os veículos devem satisfazer os requisitos do item 7.1.4 para uma quilometragem de pelo menos 160.000 km (cento e sessenta mil quilômetros). 7.1.6. Para veículos da Fase PROCONVE L8, considera-se que o requisito foi cumprido para um monitor \"M\" específico se, para todos os veículos de uma determinada família de OBD fabricados num determinado ano, forem verificadas as seguintes condições estatísticas em uma amostra: a) O valor médio do IUMPRM é maior ou igual ao valor mínimo aplicável ao monitor; b) Mais de 50% do total de veículos têm um IUMPRM maior ou igual ao valor mínimo aplicável ao monitor. 7.1.7. Para confirmação do atendimento das condições do item 7.1.6, o programa que abrange a forma de coleta de dados, a frota alvo, a periodicidade da amostragem e a forma de controle será definidos em uma regulamentação específica do Ibama será definido em uma regulamentação específica do Ibama. (Retificado) 7.1.7. O procedimento de coleta de dados, definição da frota-alvo, periodicidade de amostragem, forma de controle e cálculo da Taxa de Desempenho de Monitores em Uso (IUMPR) será aquele descrito na Parte 9 do Anexo desta Instrução Normativa.(Redação dada pela Instrução Normativa nº 16, de 18 de agosto de 2025 ) 7.2. NumeradorM 7.2.1. O numerador de um monitor específico é um contador que mede o número de vezes que o veículo foi operado de tal forma que todas as condições necessárias para esse monitor detectar uma falha foram atendidas. O numerador deve ser incrementado em até 10 segundos quando essas condições forem satisfeitas e não deve ser incrementado mais de uma vez por ciclo de condução. 7.3. DenominadorM 7.3.1. A finalidade do denominador é apresentar um contador que indique o número de eventos em que o"], "state": "indicated_current"}`
- `reviewStatus`: `{"amendmentChainReviewed": false, "fullTextReviewed": null, "gaps": ["O vínculo é temático e depende do enquadramento. A fase L8 de veículos leves não é a fase P8 de veículos pesados.", "A IN 20/2025 ajusta a Parte 9: coleta dos dados de IUMPR a partir de janeiro de 2026; relatório até 31 de julho e plano até 31 de março, com entregas iniciando em 2027. Ler a IN 16/2025 com essa alteração."], "reviewedAt": "2026-10-19", "state": "directed_text_review", "summary": "Trechos e relações identificadas revisados; cadeia integral não certificada."}`
- `applicability`: `{"basis": "Mapa dirigido a partir dos objetos e dispositivos oficiais, com rastreabilidade por norma e fase.", "conditions": ["Categoria, configuração, datas, combustível, exceções e transições precisam de enquadramento."], "phases": ["L8"], "state": "requires_assessment", "vehicleSpecific": false}`
- `publication`: `{"included": true, "policySource": "data/proconve/reviewed-map.json", "reason": "included_in_reviewed_collection", "reviewedAt": "2026-10-19"}`

## Limites e pendências

- A IN 20/2025 ajusta a Parte 9: coleta dos dados de IUMPR a partir de janeiro de 2026; relatório até 31 de julho e plano até 31 de março, com entregas iniciando em 2027. Ler a IN 16/2025 com essa alteração.
- Esta ficha reúne referências e trechos do acervo; não inclui a íntegra do ato nem comprova consolidação da cadeia.
- Nenhum requisito estruturado foi disponibilizado para este ato.
- O vínculo é temático e depende do enquadramento. A fase L8 de veículos leves não é a fase P8 de veículos pesados.
- Vínculos de sistema e atividade são contexto de consulta; a aplicabilidade individual precisa de avaliação do projeto.

## Candidatos relacionados pendentes de revisão

A relação abaixo é uma indicação de índice/ementa, sem efeito formal ou data de vigência estabelecidos nesta base.

```json
[]
```

## Requisitos e trechos

Não há requisito estruturado para este ato neste snapshot.

## Relações registradas no acervo

Rótulos de relações não resolvidos por ID continuam rótulos; não se inferiu um ato de destino.

```json
{
  "asRecorded": [
    {
      "amendmentChainReviewed": false,
      "anchorActId": "ibama-in-23-2020",
      "citation": {
        "device": null,
        "evidenceType": "as_recorded_relation",
        "reviewDate": "2026-10-19",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=138749"
      },
      "direction": "outgoing",
      "effectiveDateAsRecorded": null,
      "evidence": "Associação de fase e objeto conferida no texto e nos atos relacionados.",
      "fullTextReviewed": null,
      "id": "as-recorded:8311f346eda3b163d4708c03",
      "kind": "recorded_legal_relation",
      "limitations": "Relação ou link preservado como registrado no acervo. O exportador não revisou novamente a cadeia, não resolveu rótulos por semelhança e não inferiu dispositivo, data ou aplicabilidade.",
      "provenance": {
        "path": "data/site/records/proconve/ibama-in-23-2020.json",
        "pointer": "/relationships/0"
      },
      "provision": null,
      "raw": {
        "evidence": "Associação de fase e objeto conferida no texto e nos atos relacionados.",
        "kind": "regulamenta",
        "label": "Resolução CONAMA nº 492/2018 — fase L8",
        "url": "https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=765"
      },
      "recordedKind": "regulamenta",
      "relation": "as_recorded",
      "reviewState": "directed_text_review",
      "sourceActId": "ibama-in-23-2020",
      "sourceCitation": null,
      "sourceRecordSha256": "966ca88689141ef9c20d04311490398b3a5d0b82802df42802e248205b716975",
      "targetActId": null,
      "targetCitation": {
        "idAsRecorded": null,
        "label": "Resolução CONAMA nº 492/2018 — fase L8",
        "number": null,
        "url": "https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=765",
        "year": null
      }
    },
    {
      "amendmentChainReviewed": false,
      "anchorActId": "ibama-in-23-2020",
      "citation": {
        "device": null,
        "evidenceType": "as_recorded_relation",
        "reviewDate": "2026-10-19",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139130"
      },
      "direction": "incoming",
      "effectiveDateAsRecorded": null,
      "evidence": "Art. 1º O art. 16 da Instrução Normativa 23, de 24 de setembro de 2020, passa a vigorar com a seguinte redação: \"",
      "fullTextReviewed": null,
      "id": "as-recorded:40753a2c7dcdf95bfb50ed8e",
      "kind": "recorded_legal_relation",
      "limitations": "Relação ou link preservado como registrado no acervo. O exportador não revisou novamente a cadeia, não resolveu rótulos por semelhança e não inferiu dispositivo, data ou aplicabilidade.",
      "provenance": {
        "path": "data/site/records/proconve/ibama-in-23-2020.json",
        "pointer": "/incomingEffects/0"
      },
      "provision": null,
      "raw": {
        "evidence": "Art. 1º O art. 16 da Instrução Normativa 23, de 24 de setembro de 2020, passa a vigorar com a seguinte redação: \"",
        "kind": "altera",
        "sourceId": "ibama-in-7-2021",
        "sourceTitle": "Instrução Normativa IBAMA nº 7/2021",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139130"
      },
      "recordedKind": "altera",
      "relation": "as_recorded",
      "reviewState": "directed_text_review",
      "sourceActId": "ibama-in-7-2021",
      "sourceCitation": null,
      "sourceRecordSha256": "966ca88689141ef9c20d04311490398b3a5d0b82802df42802e248205b716975",
      "targetActId": "ibama-in-23-2020",
      "targetCitation": null
    },
    {
      "amendmentChainReviewed": false,
      "anchorActId": "ibama-in-23-2020",
      "citation": {
        "device": null,
        "evidenceType": "as_recorded_relation",
        "reviewDate": "2026-10-19",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=138784"
      },
      "direction": "incoming",
      "effectiveDateAsRecorded": null,
      "evidence": "Art. 1º. A Instrução Normativa 23, de 24 de setembro de 2020, passa a vigorar com as seguintes alterações: \"................................................................................................................................. .................................................................................................................................. ",
      "fullTextReviewed": null,
      "id": "as-recorded:3fe05c8211617fc46861cb5c",
      "kind": "recorded_legal_relation",
      "limitations": "Relação ou link preservado como registrado no acervo. O exportador não revisou novamente a cadeia, não resolveu rótulos por semelhança e não inferiu dispositivo, data ou aplicabilidade.",
      "provenance": {
        "path": "data/site/records/proconve/ibama-in-23-2020.json",
        "pointer": "/incomingEffects/1"
      },
      "provision": null,
      "raw": {
        "evidence": "Art. 1º. A Instrução Normativa 23, de 24 de setembro de 2020, passa a vigorar com as seguintes alterações: \"................................................................................................................................. .................................................................................................................................. ",
        "kind": "altera",
        "sourceId": "ibama-in-20-2021",
        "sourceTitle": "Instrução Normativa IBAMA nº 20/2021",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=138784"
      },
      "recordedKind": "altera",
      "relation": "as_recorded",
      "reviewState": "directed_text_review",
      "sourceActId": "ibama-in-20-2021",
      "sourceCitation": null,
      "sourceRecordSha256": "966ca88689141ef9c20d04311490398b3a5d0b82802df42802e248205b716975",
      "targetActId": "ibama-in-23-2020",
      "targetCitation": null
    },
    {
      "amendmentChainReviewed": false,
      "anchorActId": "ibama-in-23-2020",
      "citation": {
        "device": null,
        "evidenceType": "as_recorded_relation",
        "reviewDate": "2026-10-19",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139347"
      },
      "direction": "incoming",
      "effectiveDateAsRecorded": null,
      "evidence": "Art. 1°. O Anexo da Instrução Normativa 23, de 24 de setembro de 2020, passa a vigorar com as seguintes alterações: \".......................................................................................... ANEXO................................................................................ ........................................................................................... \"1.1.1.15. Estado de prontidão ou \"readiness status\" - Estado no qual a diagnose de todos os sistemas e componentes monitorados foi completada ou não completada, de acordo com a especificação da norma SAE J1979.\" (NR) ........................................................................................... \"6.3.1.6. A critério do fabricante, os dados básicos de diagnose e as informações do controle bidirecional podem ser fornecidos no formato e unidades previstos na SAE J1979-2, podendo desta forma alterar os Serviços, PIDs, Tests IDs, Monitors IDs e INFOTYPE ID´s informados no ",
      "fullTextReviewed": null,
      "id": "as-recorded:62c808080e4ad809f5ee04ea",
      "kind": "recorded_legal_relation",
      "limitations": "Relação ou link preservado como registrado no acervo. O exportador não revisou novamente a cadeia, não resolveu rótulos por semelhança e não inferiu dispositivo, data ou aplicabilidade.",
      "provenance": {
        "path": "data/site/records/proconve/ibama-in-23-2020.json",
        "pointer": "/incomingEffects/2"
      },
      "provision": null,
      "raw": {
        "evidence": "Art. 1°. O Anexo da Instrução Normativa 23, de 24 de setembro de 2020, passa a vigorar com as seguintes alterações: \".......................................................................................... ANEXO................................................................................ ........................................................................................... \"1.1.1.15. Estado de prontidão ou \"readiness status\" - Estado no qual a diagnose de todos os sistemas e componentes monitorados foi completada ou não completada, de acordo com a especificação da norma SAE J1979.\" (NR) ........................................................................................... \"6.3.1.6. A critério do fabricante, os dados básicos de diagnose e as informações do controle bidirecional podem ser fornecidos no formato e unidades previstos na SAE J1979-2, podendo desta forma alterar os Serviços, PIDs, Tests IDs, Monitors IDs e INFOTYPE ID´s informados no ",
        "kind": "altera",
        "sourceId": "ibama-in-25-2023",
        "sourceTitle": "Instrução Normativa IBAMA nº 25/2023",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139347"
      },
      "recordedKind": "altera",
      "relation": "as_recorded",
      "reviewState": "directed_text_review",
      "sourceActId": "ibama-in-25-2023",
      "sourceCitation": null,
      "sourceRecordSha256": "966ca88689141ef9c20d04311490398b3a5d0b82802df42802e248205b716975",
      "targetActId": "ibama-in-23-2020",
      "targetCitation": null
    },
    {
      "amendmentChainReviewed": false,
      "anchorActId": "ibama-in-23-2020",
      "citation": {
        "device": null,
        "evidenceType": "as_recorded_relation",
        "reviewDate": "2026-10-19",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139520"
      },
      "direction": "incoming",
      "effectiveDateAsRecorded": null,
      "evidence": "Art. 1º O Anexo da Instrução Normativa nº 23, de 24 de setembro de 2020, publicada em 29 de setembro de 2020 na Seção 1 do Diário Oficial da União, Edição 187, página 82, passa a vigorar com as seguintes alterações: .......................................................................................... ANEXO................................................................................ ........................................................................................... \"7.1.7. O procedimento de coleta de dados, definição da frota-alvo, periodicidade de amostragem, forma de controle e cálculo da Taxa de Desempenho de Monitores em Uso (IUMPR) será aquele descrito na Parte 9 do Anexo desta Instrução Normativa.\" (NR) ........................................................................................... ........................................................................................... \"PARTE 9 - DO ATENDIMENTO A TAXA DE DESEMPENHO DE MONITORES EM USO OU IUMPR 9.1 Disposições gerais 9.1.1 A partir de janeiro de 2025, os fabricantes e importadores devem coletar e relatar um conjunto de dados de desempenho de monitoramento em uso representativos de cada Família OBD da fase L8 certificada pelo fabricante ou importador, de acordo com a Parte 7 do Anexo desta Instrução Normativa. 9.1.2 O Fabricante ou importador deverá apresentar anualmente os seguintes documentos: 9.1.2.1 Plano de Comprovação - documento contendo detalhes de como cada fabricante ou importador irá coletar, transmitir, analisar e selecionar os dados a serem incluídos no Relatório de Atendimento, incluindo por exemplo se a coleta de dados será feita fisicamente ou de forma remota. 9.1.2.2 Relatório de Atendimento ao IUMPR - relatório individual de cada Família OBD contendo as informações do monitoramento do IUMPR, conforme item 9.5.3. 9.1.3 Com base na análise do relatório do item 9.1.2.2,",
      "fullTextReviewed": null,
      "id": "as-recorded:3c377be9b105038796c34289",
      "kind": "recorded_legal_relation",
      "limitations": "Relação ou link preservado como registrado no acervo. O exportador não revisou novamente a cadeia, não resolveu rótulos por semelhança e não inferiu dispositivo, data ou aplicabilidade.",
      "provenance": {
        "path": "data/site/records/proconve/ibama-in-23-2020.json",
        "pointer": "/incomingEffects/3"
      },
      "provision": null,
      "raw": {
        "evidence": "Art. 1º O Anexo da Instrução Normativa nº 23, de 24 de setembro de 2020, publicada em 29 de setembro de 2020 na Seção 1 do Diário Oficial da União, Edição 187, página 82, passa a vigorar com as seguintes alterações: .......................................................................................... ANEXO................................................................................ ........................................................................................... \"7.1.7. O procedimento de coleta de dados, definição da frota-alvo, periodicidade de amostragem, forma de controle e cálculo da Taxa de Desempenho de Monitores em Uso (IUMPR) será aquele descrito na Parte 9 do Anexo desta Instrução Normativa.\" (NR) ........................................................................................... ........................................................................................... \"PARTE 9 - DO ATENDIMENTO A TAXA DE DESEMPENHO DE MONITORES EM USO OU IUMPR 9.1 Disposições gerais 9.1.1 A partir de janeiro de 2025, os fabricantes e importadores devem coletar e relatar um conjunto de dados de desempenho de monitoramento em uso representativos de cada Família OBD da fase L8 certificada pelo fabricante ou importador, de acordo com a Parte 7 do Anexo desta Instrução Normativa. 9.1.2 O Fabricante ou importador deverá apresentar anualmente os seguintes documentos: 9.1.2.1 Plano de Comprovação - documento contendo detalhes de como cada fabricante ou importador irá coletar, transmitir, analisar e selecionar os dados a serem incluídos no Relatório de Atendimento, incluindo por exemplo se a coleta de dados será feita fisicamente ou de forma remota. 9.1.2.2 Relatório de Atendimento ao IUMPR - relatório individual de cada Família OBD contendo as informações do monitoramento do IUMPR, conforme item 9.5.3. 9.1.3 Com base na análise do relatório do item 9.1.2.2,",
        "kind": "altera",
        "sourceId": "ibama-in-16-2025",
        "sourceTitle": "Instrução Normativa IBAMA nº 16/2025",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139520"
      },
      "recordedKind": "altera",
      "relation": "as_recorded",
      "reviewState": "directed_text_review",
      "sourceActId": "ibama-in-16-2025",
      "sourceCitation": null,
      "sourceRecordSha256": "966ca88689141ef9c20d04311490398b3a5d0b82802df42802e248205b716975",
      "targetActId": "ibama-in-23-2020",
      "targetCitation": null
    },
    {
      "amendmentChainReviewed": false,
      "anchorActId": "ibama-in-23-2020",
      "citation": {
        "device": null,
        "evidenceType": "as_recorded_relation",
        "reviewDate": "2026-10-19",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139548"
      },
      "direction": "incoming",
      "effectiveDateAsRecorded": null,
      "evidence": "Art. 1º O Anexo da Instrução Normativa nº 23, de 24 de setembro de 2020, publicada no Diário Oficial da União, Seção 1, em 29 de setembro de 2020, passa a vigorar com as seguintes alterações na Parte 9, incluída pela Instrução Normativa nº 16, de 18 de agosto de 2025, publicada no Diário Oficial da União, Seção 1, em 19 de agosto de 2025: ............................................................................................................................. ANEXO .............................................................................................................................. ................................................................................................................................ PARTE 9 - DO ATENDIMENTO A TAXA DE DESEMPENHO DE MONITORES EM USO OU IUMPR .................................................................................................................................. \"9.1.1 A partir de janeiro de 2026, os fabricantes e importadores devem coletar e relatar um conjunto de dados de desempenho de monitoramento em uso representativos de cada Família OBD da fase L8 certificada pelo fabricante ou importador, de acordo com a Parte 7 do Anexo desta Instrução Normativa. (NR) ............................................................................................................................. 9.2.1 O Relatório de Atendimento ao IUMPR deverá ser entregue até 31 de julho de cada ano, iniciando em 2027. (NR) ............................................................................................................................. 9.2.2 O Plano de Comprovação deverá ser entregue até 31 de março de cada ano, iniciando em 2027.\" (NR) ",
      "fullTextReviewed": null,
      "id": "as-recorded:9ee6422f6578fdb1227ab245",
      "kind": "recorded_legal_relation",
      "limitations": "Relação ou link preservado como registrado no acervo. O exportador não revisou novamente a cadeia, não resolveu rótulos por semelhança e não inferiu dispositivo, data ou aplicabilidade.",
      "provenance": {
        "path": "data/site/records/proconve/ibama-in-23-2020.json",
        "pointer": "/incomingEffects/4"
      },
      "provision": null,
      "raw": {
        "evidence": "Art. 1º O Anexo da Instrução Normativa nº 23, de 24 de setembro de 2020, publicada no Diário Oficial da União, Seção 1, em 29 de setembro de 2020, passa a vigorar com as seguintes alterações na Parte 9, incluída pela Instrução Normativa nº 16, de 18 de agosto de 2025, publicada no Diário Oficial da União, Seção 1, em 19 de agosto de 2025: ............................................................................................................................. ANEXO .............................................................................................................................. ................................................................................................................................ PARTE 9 - DO ATENDIMENTO A TAXA DE DESEMPENHO DE MONITORES EM USO OU IUMPR .................................................................................................................................. \"9.1.1 A partir de janeiro de 2026, os fabricantes e importadores devem coletar e relatar um conjunto de dados de desempenho de monitoramento em uso representativos de cada Família OBD da fase L8 certificada pelo fabricante ou importador, de acordo com a Parte 7 do Anexo desta Instrução Normativa. (NR) ............................................................................................................................. 9.2.1 O Relatório de Atendimento ao IUMPR deverá ser entregue até 31 de julho de cada ano, iniciando em 2027. (NR) ............................................................................................................................. 9.2.2 O Plano de Comprovação deverá ser entregue até 31 de março de cada ano, iniciando em 2027.\" (NR) ",
        "kind": "altera",
        "sourceId": "ibama-in-20-2025",
        "sourceTitle": "Instrução Normativa IBAMA nº 20/2025",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139548"
      },
      "recordedKind": "altera",
      "relation": "as_recorded",
      "reviewState": "directed_text_review",
      "sourceActId": "ibama-in-20-2025",
      "sourceCitation": null,
      "sourceRecordSha256": "966ca88689141ef9c20d04311490398b3a5d0b82802df42802e248205b716975",
      "targetActId": "ibama-in-23-2020",
      "targetCitation": null
    },
    {
      "amendmentChainReviewed": false,
      "anchorActId": "ibama-in-23-2020",
      "citation": {
        "device": null,
        "evidenceType": "as_recorded_relation",
        "reviewDate": "2026-10-19",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=138749"
      },
      "direction": "outgoing",
      "effectiveDateAsRecorded": null,
      "evidence": null,
      "fullTextReviewed": null,
      "id": "as-recorded:f8b636330698a430240fc43b",
      "kind": "recorded_document_link",
      "limitations": "Relação ou link preservado como registrado no acervo. O exportador não revisou novamente a cadeia, não resolveu rótulos por semelhança e não inferiu dispositivo, data ou aplicabilidade.",
      "provenance": {
        "path": "data/site/records/proconve/ibama-in-23-2020.json",
        "pointer": "/relatedLinks/0"
      },
      "provision": null,
      "raw": {
        "label": "Termo de Retificação SN, de 27 de novembro de 2020",
        "url": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139110"
      },
      "recordedKind": "related_document",
      "relation": "as_recorded",
      "reviewState": "directed_text_review",
      "sourceActId": "ibama-in-23-2020",
      "sourceCitation": null,
      "sourceRecordSha256": "966ca88689141ef9c20d04311490398b3a5d0b82802df42802e248205b716975",
      "targetActId": null,
      "targetCitation": {
        "idAsRecorded": null,
        "label": "Termo de Retificação SN, de 27 de novembro de 2020",
        "number": null,
        "url": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139110",
        "year": null
      }
    },
    {
      "amendmentChainReviewed": false,
      "anchorActId": "ibama-in-23-2020",
      "citation": {
        "device": null,
        "evidenceType": "as_recorded_relation",
        "reviewDate": "2026-10-19",
        "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=138749"
      },
      "direction": "outgoing",
      "effectiveDateAsRecorded": null,
      "evidence": null,
      "fullTextReviewed": null,
      "id": "as-recorded:debfd5ebec21f66513f259f2",
      "kind": "recorded_document_link",
      "limitations": "Relação ou link preservado como registrado no acervo. O exportador não revisou novamente a cadeia, não resolveu rótulos por semelhança e não inferiu dispositivo, data ou aplicabilidade.",
      "provenance": {
        "path": "data/site/records/proconve/ibama-in-23-2020.json",
        "pointer": "/relatedLinks/1"
      },
      "provision": null,
      "raw": {
        "label": "Termo de Retificação SN, de 29 de julho de 2021",
        "url": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139023"
      },
      "recordedKind": "related_document",
      "relation": "as_recorded",
      "reviewState": "directed_text_review",
      "sourceActId": "ibama-in-23-2020",
      "sourceCitation": null,
      "sourceRecordSha256": "966ca88689141ef9c20d04311490398b3a5d0b82802df42802e248205b716975",
      "targetActId": null,
      "targetCitation": {
        "idAsRecorded": null,
        "label": "Termo de Retificação SN, de 29 de julho de 2021",
        "number": null,
        "url": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139023",
        "year": null
      }
    }
  ],
  "incomingEffects": [
    {
      "evidence": "Art. 1º O art. 16 da Instrução Normativa 23, de 24 de setembro de 2020, passa a vigorar com a seguinte redação: \"",
      "kind": "altera",
      "sourceId": "ibama-in-7-2021",
      "sourceTitle": "Instrução Normativa IBAMA nº 7/2021",
      "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139130"
    },
    {
      "evidence": "Art. 1º. A Instrução Normativa 23, de 24 de setembro de 2020, passa a vigorar com as seguintes alterações: \"................................................................................................................................. .................................................................................................................................. ",
      "kind": "altera",
      "sourceId": "ibama-in-20-2021",
      "sourceTitle": "Instrução Normativa IBAMA nº 20/2021",
      "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=138784"
    },
    {
      "evidence": "Art. 1°. O Anexo da Instrução Normativa 23, de 24 de setembro de 2020, passa a vigorar com as seguintes alterações: \".......................................................................................... ANEXO................................................................................ ........................................................................................... \"1.1.1.15. Estado de prontidão ou \"readiness status\" - Estado no qual a diagnose de todos os sistemas e componentes monitorados foi completada ou não completada, de acordo com a especificação da norma SAE J1979.\" (NR) ........................................................................................... \"6.3.1.6. A critério do fabricante, os dados básicos de diagnose e as informações do controle bidirecional podem ser fornecidos no formato e unidades previstos na SAE J1979-2, podendo desta forma alterar os Serviços, PIDs, Tests IDs, Monitors IDs e INFOTYPE ID´s informados no ",
      "kind": "altera",
      "sourceId": "ibama-in-25-2023",
      "sourceTitle": "Instrução Normativa IBAMA nº 25/2023",
      "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139347"
    },
    {
      "evidence": "Art. 1º O Anexo da Instrução Normativa nº 23, de 24 de setembro de 2020, publicada em 29 de setembro de 2020 na Seção 1 do Diário Oficial da União, Edição 187, página 82, passa a vigorar com as seguintes alterações: .......................................................................................... ANEXO................................................................................ ........................................................................................... \"7.1.7. O procedimento de coleta de dados, definição da frota-alvo, periodicidade de amostragem, forma de controle e cálculo da Taxa de Desempenho de Monitores em Uso (IUMPR) será aquele descrito na Parte 9 do Anexo desta Instrução Normativa.\" (NR) ........................................................................................... ........................................................................................... \"PARTE 9 - DO ATENDIMENTO A TAXA DE DESEMPENHO DE MONITORES EM USO OU IUMPR 9.1 Disposições gerais 9.1.1 A partir de janeiro de 2025, os fabricantes e importadores devem coletar e relatar um conjunto de dados de desempenho de monitoramento em uso representativos de cada Família OBD da fase L8 certificada pelo fabricante ou importador, de acordo com a Parte 7 do Anexo desta Instrução Normativa. 9.1.2 O Fabricante ou importador deverá apresentar anualmente os seguintes documentos: 9.1.2.1 Plano de Comprovação - documento contendo detalhes de como cada fabricante ou importador irá coletar, transmitir, analisar e selecionar os dados a serem incluídos no Relatório de Atendimento, incluindo por exemplo se a coleta de dados será feita fisicamente ou de forma remota. 9.1.2.2 Relatório de Atendimento ao IUMPR - relatório individual de cada Família OBD contendo as informações do monitoramento do IUMPR, conforme item 9.5.3. 9.1.3 Com base na análise do relatório do item 9.1.2.2,",
      "kind": "altera",
      "sourceId": "ibama-in-16-2025",
      "sourceTitle": "Instrução Normativa IBAMA nº 16/2025",
      "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139520"
    },
    {
      "evidence": "Art. 1º O Anexo da Instrução Normativa nº 23, de 24 de setembro de 2020, publicada no Diário Oficial da União, Seção 1, em 29 de setembro de 2020, passa a vigorar com as seguintes alterações na Parte 9, incluída pela Instrução Normativa nº 16, de 18 de agosto de 2025, publicada no Diário Oficial da União, Seção 1, em 19 de agosto de 2025: ............................................................................................................................. ANEXO .............................................................................................................................. ................................................................................................................................ PARTE 9 - DO ATENDIMENTO A TAXA DE DESEMPENHO DE MONITORES EM USO OU IUMPR .................................................................................................................................. \"9.1.1 A partir de janeiro de 2026, os fabricantes e importadores devem coletar e relatar um conjunto de dados de desempenho de monitoramento em uso representativos de cada Família OBD da fase L8 certificada pelo fabricante ou importador, de acordo com a Parte 7 do Anexo desta Instrução Normativa. (NR) ............................................................................................................................. 9.2.1 O Relatório de Atendimento ao IUMPR deverá ser entregue até 31 de julho de cada ano, iniciando em 2027. (NR) ............................................................................................................................. 9.2.2 O Plano de Comprovação deverá ser entregue até 31 de março de cada ano, iniciando em 2027.\" (NR) ",
      "kind": "altera",
      "sourceId": "ibama-in-20-2025",
      "sourceTitle": "Instrução Normativa IBAMA nº 20/2025",
      "sourceUrl": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139548"
    }
  ],
  "relationships": [
    {
      "evidence": "Associação de fase e objeto conferida no texto e nos atos relacionados.",
      "kind": "regulamenta",
      "label": "Resolução CONAMA nº 492/2018 — fase L8",
      "url": "https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=765"
    }
  ]
}
```

## Fontes relacionadas por contexto, sem incidência automática

```json
[]
```

## Marcos temporais preservados do acervo

```json
[
  {
    "date": "2026-01-01",
    "event": "collection_start",
    "id": "ibama-in-20-2025:coleta",
    "kind": "obligation_milestone",
    "label": "Início da coleta IUMPR",
    "scope": {
      "conditions": [
        "Famílias OBD da fase L8 certificadas, conforme Parte 7 da IN 23/2020; enquadramento da configuração pendente."
      ],
      "phases": [
        "L8"
      ],
      "powertrains": [
        "combustao",
        "hibrido"
      ]
    },
    "source": {
      "clause": "Art. 1º, Parte 9, item 9.1.1",
      "excerpt": "A partir de janeiro de 2026, os fabricantes e importadores devem coletar e relatar um conjunto de dados de desempenho de monitoramento em uso representativos de cada Família OBD da fase L8 certificada pelo fabricante ou importador, de acordo com a Parte 7 do Anexo desta Instrução Normativa.",
      "sourceKey": "139548",
      "url": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139548"
    }
  },
  {
    "date": "2027-03-31",
    "event": "deadline",
    "id": "ibama-in-20-2025:plano",
    "kind": "obligation_milestone",
    "label": "Primeiro Plano de Comprovação IUMPR",
    "recurrence": {
      "firstYear": 2027,
      "frequency": "annual",
      "monthDay": "03-31"
    },
    "scope": {
      "conditions": [
        "Famílias OBD da fase L8 certificadas, conforme Parte 7 da IN 23/2020; enquadramento da configuração pendente."
      ],
      "phases": [
        "L8"
      ],
      "powertrains": [
        "combustao",
        "hibrido"
      ]
    },
    "source": {
      "clause": "Art. 1º, Parte 9, item 9.2.2",
      "excerpt": "9.2.2 O Plano de Comprovação deverá ser entregue até 31 de março de cada ano, iniciando em 2027.",
      "sourceKey": "139548",
      "url": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139548"
    }
  },
  {
    "date": "2027-07-31",
    "event": "deadline",
    "id": "ibama-in-20-2025:relatorio",
    "kind": "obligation_milestone",
    "label": "Primeiro Relatório de Atendimento IUMPR",
    "recurrence": {
      "firstYear": 2027,
      "frequency": "annual",
      "monthDay": "07-31"
    },
    "scope": {
      "conditions": [
        "Famílias OBD da fase L8 certificadas, conforme Parte 7 da IN 23/2020; enquadramento da configuração pendente."
      ],
      "phases": [
        "L8"
      ],
      "powertrains": [
        "combustao",
        "hibrido"
      ]
    },
    "source": {
      "clause": "Art. 1º, Parte 9, item 9.2.1",
      "excerpt": "9.2.1 O Relatório de Atendimento ao IUMPR deverá ser entregue até 31 de julho de cada ano, iniciando em 2027.",
      "sourceKey": "139548",
      "url": "https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=139548"
    }
  }
]
```

## Fontes auxiliares com identidade vinculada

Sem vínculo adicional de identidade no índice de fontes do guia.
