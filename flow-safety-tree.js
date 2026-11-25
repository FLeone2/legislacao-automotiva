// Editorial input: safety requirement tree of the homologation flow (stage B).
// Each item keeps the act and device that the 2026-11-02 review linked to it.
// Requirement links are thematic: they say which act to consult, not that every
// item applies to every vehicle. Do not infer limits or applicability from labels.
const safetyTreeSpec = {
  schemaVersion: 1,
  reviewedAt: '2026-11-02',
  scope:
    'Veículos leves com PBT até 3.500 kg (Portaria SENATRAN 990/2022, Anexo XI, item 1). O levantamento foi feito para automóvel M1 de fabricação nacional; pesados, rebocados e motocicletas têm tabelas próprias no mesmo anexo.',
  provenance:
    'Inventário de segurança de 02/11/2026 (docs/pesquisa-seguranca/2026-11-02): itens do Anexo XI e da tela SISCAT observada em leitura, com os atos atuais vinculados. Rótulo e nível da tela não decidem sozinhos a obrigação.',
  groups: [
    {
      id: 'nivel-1',
      label: 'Nível 1 — Declaração de conformidade',
      source: {
        id: 'senatran-095',
        device: 'Anexo XI, itens 1.1 e 1.2',
        anchor: 'anexo-xi',
      },
      text: 'Itens declarados pelo fabricante, conforme ABNT NBR ISO/IEC 17050-1 e 17050-2. Sem relatório de ensaio na tabela. A lista não obriga a instalar todo acessório: cada item segue o ato associado.',
      items: [
        {
          id: 'N1-01',
          label: 'Localização, identificação e iluminação dos controles',
          condition: null,
          refs: [
            {
              id: 'contran-758-2018',
              device: 'arts. 1º e 2º',
              anchor: 'art-1',
            },
          ],
        },
        {
          id: 'N1-02',
          label: 'Buzina',
          condition: null,
          refs: [
            {
              id: 'contran-764-2018',
              device: 'arts. 1º e 2º',
              anchor: 'art-1',
            },
          ],
        },
        {
          id: 'N1-03',
          label: 'Antifurto',
          condition: null,
          refs: [
            {
              id: 'contran-37-1998',
              device: 'art. 1º',
              anchor: 'art-1',
            },
            {
              id: 'contran-988-2022',
              device: 'art. 1º',
              anchor: 'art-1',
            },
            {
              id: 'contran-559-2015',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
        },
        {
          id: 'N1-04',
          label: 'Triângulo de segurança',
          condition: null,
          refs: [
            {
              id: 'contran-993-2023',
              device: 'art. 1º',
              anchor: 'art-1',
            },
            {
              id: 'contran-36-1998',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
        },
        {
          id: 'N1-05',
          label: 'Trava do capuz',
          condition: null,
          refs: [
            {
              id: 'contran-993-2023',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
        },
        {
          id: 'N1-06',
          label: 'Placa de Identificação Veicular',
          condition: null,
          refs: [
            {
              id: 'contran-969-2022',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'N1-07',
          label: 'Equipamentos Geradores de Imagem',
          condition: null,
          refs: [
            {
              id: 'contran-242-2007',
              device: 'art. 1º',
              anchor: 'art-1',
            },
            {
              id: 'contran-1030-2026',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
        },
        {
          id: 'N1-08',
          label: 'Quebra mato',
          condition: null,
          refs: [
            {
              id: 'contran-215-2006',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
        },
        {
          id: 'N1-09',
          label: 'Equipamentos obrigatórios',
          condition:
            'Consultar as tabelas, notas, datas e exceções do ato por categoria. A presença de uma peça no veículo não resolve o enquadramento do veículo inteiro.',
          refs: [
            {
              id: 'contran-993-2023',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
        },
        {
          id: 'N1-10',
          label: 'Número de identificação veicular (VIN)',
          condition: null,
          refs: [
            {
              id: 'contran-968-2022',
              device: 'arts. 4º a 6º',
              anchor: 'art-4',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'N1-11',
          label: 'Flamabilidade de materiais de revestimento interno',
          condition: null,
          refs: [
            {
              id: 'contran-498-2014',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
        },
        {
          id: 'N1-12',
          label: 'Número de identificação da carroceria',
          condition:
            'Carroceria implementada após a fabricação recebe NIEV próprio (Res. 968/2022, art. 4º, IV). A Res. 939/2022, citada no levantamento, trata de micro-ônibus M2.',
          refs: [
            {
              id: 'contran-968-2022',
              device: 'art. 4º, IV; art. 11',
              anchor: 'art-4',
            },
          ],
          vehicle: ['identificacao'],
        },
      ],
    },
    {
      id: 'nivel-2',
      label: 'Nível 2 — Ensaios de segurança ativa',
      source: {
        id: 'senatran-095',
        device: 'Anexo XI, itens 1.3 e 1.4',
        anchor: 'anexo-xi',
      },
      text: 'Relatórios de ensaio com declaração de que a empresa opera sistema de gestão do laboratório.',
      items: [
        {
          id: 'ENS-2-01',
          label: 'Sistemas de freio',
          condition:
            'M1: avaliar sistema de serviço, estacionamento e ABS; método/equivalência conforme o ato.',
          refs: [
            {
              id: 'contran-915-2022',
              device: 'arts. 4º, 5º, 7º e 9º',
              anchor: 'art-4',
            },
          ],
          vehicle: ['freios', 'pneus-rodas'],
          siscatHelp: 'CONTRAN no.777/93',
        },
        {
          id: 'ENS-2-02',
          label: 'Sistemas de limpador e lavador do para-brisa',
          condition: 'Veículo automotor com para-brisa, conforme escopo do ato.',
          refs: [
            {
              id: 'contran-224-2006',
              device: 'arts. 1º a 3º e anexos',
              anchor: 'art-1',
            },
          ],
          vehicle: ['vidros'],
          siscatHelp: 'CONTRAN no.224/07',
        },
        {
          id: 'ENS-2-03',
          label: 'Instalação dos dispositivos de iluminação',
          condition:
            'Separar funções obrigatórias e opcionais, categoria e fase de introdução. A alteração de 2026 trata de veículos de utilidade pública.',
          refs: [
            {
              id: 'contran-970-2022',
              device: 'arts. 3º e 16 a 20 da 970; anexos; alteração 1024/2026',
              anchor: 'art-3',
            },
            {
              id: 'contran-1024-2026',
              device: 'art. 1º',
              anchor: 'art-1',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['iluminacao', 'identificacao'],
          siscatHelp: 'CONTRAN no.227/07; 294/08',
        },
        {
          id: 'ENS-2-04',
          label: 'Espelhos retrovisores internos e externos',
          condition:
            'Selecionar classe/quantidade/dispositivo admitido para a categoria. Regra de escolares é ramo próprio.',
          refs: [
            {
              id: 'contran-966-2022',
              device: 'arts. 1º, 2º e 5º; anexos',
              anchor: 'art-1',
            },
          ],
          vehicle: ['retrovisores', 'vidros'],
          siscatHelp: 'CONTRAN no.636/84; 226/07',
        },
        {
          id: 'ENS-2-05',
          label: 'Vidros de segurança',
          condition:
            'Material, área indispensável à dirigibilidade, película e blindagem devem ser distinguidos.',
          refs: [
            {
              id: 'contran-960-2022',
              device: 'arts. 2º a 4º e 8º da 960; art. 2º da 989; anexo',
              anchor: 'art-2',
            },
            {
              id: 'contran-989-2022',
              device: 'art. 2º',
              anchor: 'art-2',
            },
          ],
          vehicle: ['vidros'],
          siscatHelp: 'CONTRAN no.254/07',
        },
        {
          id: 'ENS-2-06',
          label: 'Fechaduras e dobradiças das portas laterais',
          condition: 'Categoria, tipo de porta e alternativas de comprovação previstas no ato.',
          refs: [
            {
              id: 'contran-885-2021',
              device: 'arts. 1º a 5º e anexo',
              anchor: 'art-1',
            },
          ],
          vehicle: ['carroceria'],
          siscatHelp: 'CONTRAN no.463/73; CONTRAN 885/2021 (anexo 11)',
        },
        {
          id: 'ENS-2-07',
          label: 'Mangueiras flexíveis do freio hidráulico',
          condition:
            'Verificar o sistema hidráulico. A linha antiga não tem correspondência autônoma confirmada na tabela atual do Anexo XI.',
          refs: [
            {
              id: 'contran-915-2022',
              device: 'arts. 4º e 5º (integra o sistema de freios)',
              anchor: 'art-4',
            },
          ],
          vehicle: ['freios'],
          siscatHelp: 'CONTRAN no.461/72; 636/84',
        },
        {
          id: 'ENS-2-08',
          label: 'Janela de acionamento energizado',
          condition: 'Ativa-se pela presença e pelo modo de acionamento desses mecanismos.',
          refs: [
            {
              id: 'contran-908-2022',
              device: 'arts. 2º a 4º e anexo',
              anchor: 'art-2',
            },
          ],
          vehicle: ['vidros', 'carroceria'],
          siscatHelp: 'CONTRAN no.649/85;762/92',
        },
        {
          id: 'ENS-2-09',
          label: 'Controle eletrônico de estabilidade',
          condition:
            'Para M1, aplicar o calendário do art. 7º, suas exceções e o texto alterado. Não transportar o calendário de veículos pesados.',
          refs: [
            {
              id: 'contran-954-2022',
              device: 'arts. 2º a 8º da 954; art. 2º da Deliberação 264',
              anchor: 'art-2',
            },
            {
              id: 'senatran-097',
              device: 'art. 2º',
              anchor: 'art-2',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['freios'],
          siscatHelp: 'CONTRAN no. 641/16',
        },
        {
          id: 'ENS-2-10',
          label: 'Conjunto roda e pneu sobressalente de uso temporário e sistemas alternativos',
          condition:
            'Distinguir estepe, temporário, run-flat e solução alternativa; a dispensa de estepe tem condições e instruções próprias.',
          refs: [
            {
              id: 'contran-913-2022',
              device: 'arts. 2º a 5º e anexo; retificação',
              anchor: 'art-2',
            },
          ],
          vehicle: ['pneus-rodas'],
          siscatHelp: 'CONTRAN no. 540/15',
        },
        {
          id: 'ENS-2-11',
          label: 'Sistema de alerta ou monitoramento traseiro',
          condition:
            'Novos projetos desde 01/01/2025; todos em produção desde 01/01/2027, ressalvadas dispensas do art. 4º.',
          refs: [
            {
              id: 'contran-759-2018',
              device: 'arts. 2º a 5º e anexos',
              anchor: 'art-2',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['carroceria'],
          siscatHelp: 'CONTRAN no. 759/18. Obrigatório a partir de jan/2025.',
        },
        {
          id: 'ENS-2-12',
          label: 'Aviso de afivelamento dos cintos de segurança',
          condition:
            'Obrigação de instalação para o condutor conforme o ato; desempenho de aviso de passageiros quando instalado também tem tratamento.',
          refs: [
            {
              id: 'contran-936-2022',
              device: 'arts. 2º a 5º; anexo; retificação',
              anchor: 'art-2',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['bancos'],
          siscatHelp: 'CONTRAN no. 760/18.',
        },
        {
          id: 'ENS-2-13',
          label: 'Sistema de redução de spray',
          condition:
            'O sistema antispray do § 1º tem escopo diferente do protetor de roda do § 2º. AUTOMOVEL exige avaliação pela linha de protetor, não por equivalência automática com caminhão.',
          refs: [
            {
              id: 'contran-888-2021',
              device: 'art. 1º, §§ 1º a 4º; arts. 3º e 4º; anexos II a IV',
              anchor: 'art-1',
            },
          ],
          vehicle: ['pneus-rodas'],
          siscatHelp: 'CONTRAN no. 717/17.',
        },
        {
          id: 'ENS-2-14',
          label: 'Dispositivo protetor de roda',
          condition:
            'Novos projetos desde 01/01/2026; todos os veículos do inciso desde 01/01/2028, observadas definições e dispensas.',
          refs: [
            {
              id: 'contran-888-2021',
              device: 'art. 1º, § 2º; art. 4º, III e §§; Anexo V',
              anchor: 'art-1',
            },
          ],
          vehicle: ['pneus-rodas'],
          siscatHelp: 'CONTRAN no. 888/21.',
        },
      ],
    },
    {
      id: 'nivel-3',
      label: 'Nível 3 — Ensaios de segurança passiva',
      source: {
        id: 'senatran-095',
        device: 'Anexo XI, itens 1.5 e 1.6',
        anchor: 'anexo-xi',
      },
      text: 'Relatórios com comprovação de terceira parte do sistema de gestão do laboratório e acompanhamento SENATRAN/Inmetro, salvo laboratório acreditado ILAC.',
      items: [
        {
          id: 'ENS-3-01',
          label: 'Deslocamento do sistema de coluna de direção',
          condition:
            'Ligar ao conjunto de segurança frontal. Não criar nova obrigação de ensaio isolado por simples persistência da linha legada.',
          refs: [
            {
              id: 'contran-910-2022',
              device: 'art. 6º e anexos; situação da referência antiga',
              anchor: 'art-6',
            },
          ],
          vehicle: ['carroceria', 'bancos'],
          siscatHelp: 'CONTRAN no.463/73',
        },
        {
          id: 'ENS-3-02',
          label: 'Sistema de controle de direção absorvedor de energia',
          condition:
            'Mapear em conjunto com proteção frontal; a alternativa FMVSS 203 aparece no art. 6º, sem autorizar equivalência automática para qualquer relatório.',
          refs: [
            {
              id: 'contran-910-2022',
              device: 'art. 6º e anexos; situação da referência antiga',
              anchor: 'art-6',
            },
          ],
          vehicle: ['carroceria'],
          siscatHelp: 'CONTRAN no.463/73',
        },
        {
          id: 'ENS-3-03',
          label: 'Sistema de combustível',
          condition:
            'Se há sistema de combustível, avaliar impacto traseiro e seu método; se híbrido/elétrico, avaliar também 749. Não converter ausência de tanque em dispensa de proteção elétrica.',
          refs: [
            {
              id: 'contran-910-2022',
              device: 'art. 4º, parágrafo único; arts. 6º e 11 da 910; art. 1º da 749',
              anchor: 'art-4',
            },
            {
              id: 'contran-749-2018',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
          vehicle: ['tanque', 'carroceria', 'bateria'],
          siscatHelp: 'CONTRAN no. 486/74; 221/07',
        },
        {
          id: 'ENS-3-04',
          label: 'Proteção ao ocupante (critério biomecânico)',
          condition:
            'A proteção frontal do art. 4º usa PBT inferior a 2.500 kg. Há regras para impacto traseiro e dispensas próprias. Os arts. 2º e 3º expiraram em 31/12/2025.',
          refs: [
            {
              id: 'contran-910-2022',
              device: 'arts. 4º a 7º e 11; anexos e retificação',
              anchor: 'art-4',
            },
          ],
          vehicle: ['carroceria', 'bancos'],
          siscatHelp: 'CONTRAN no. 221/07',
        },
        {
          id: 'ENS-3-05',
          label: 'Ancoragem dos assentos',
          condition:
            'A 997/2023 inclui expressamente a 220/2007 na revogação da 951. O item 3.5.3 atual admite NBR 15283:2013, UN R17 série 07 ou posteriores, ou FMVSS 202 e 207, no escopo ali definido para apoios de cabeça.',
          refs: [
            {
              id: 'contran-951-2022',
              device: 'art. 2º da 997; art. 8º e Anexo I, item 3.5.3, da 951 alterados',
              anchor: 'art-2',
            },
            {
              id: 'contran-997-2023',
              device: 'art. 2º',
              anchor: 'art-2',
            },
          ],
          vehicle: ['bancos', 'carroceria'],
          siscatHelp: 'CONTRAN no. 463/73; 220/07, 316/09',
        },
        {
          id: 'ENS-3-06',
          label: 'Ancoragem dos cintos de segurança',
          condition:
            'Distinguir ancoragem do cinto, do assento e do dispositivo infantil; ligar posições e amostra.',
          refs: [
            {
              id: 'contran-951-2022',
              device: 'Anexo I, itens 3.4.1 e 3.5.1, com redação da 997',
              anchor: 'anexo-i',
            },
            {
              id: 'contran-997-2023',
              device: 'art. 2º',
              anchor: 'art-2',
            },
          ],
          vehicle: ['bancos', 'carroceria'],
          siscatHelp: 'CONTRAN no. 48/98, 316/09',
        },
        {
          id: 'ENS-3-07',
          label: 'Cintos de segurança',
          condition:
            'Avaliar por posição/orientação do assento. Não usar um único resultado para configurações diferentes sem justificativa.',
          refs: [
            {
              id: 'contran-951-2022',
              device: 'Anexo I, itens 3.1 a 3.3 e 3.5.1, com redação da 997',
              anchor: 'anexo-i',
            },
            {
              id: 'contran-997-2023',
              device: 'art. 2º',
              anchor: 'art-2',
            },
          ],
          vehicle: ['bancos'],
          siscatHelp: 'CONTRAN no. 48/98',
        },
        {
          id: 'ENS-3-08',
          label: 'Apoio de cabeça',
          condition:
            'Considerar posições dos bancos, orientação e regras específicas de esportivos/conversíveis.',
          refs: [
            {
              id: 'contran-951-2022',
              device: 'Anexo I, itens 3.1, 3.2 e 3.5.3, com redação da 997',
              anchor: 'anexo-i',
            },
            {
              id: 'contran-997-2023',
              device: 'art. 2º',
              anchor: 'art-2',
            },
          ],
          vehicle: ['bancos'],
          siscatHelp: 'CONTRAN no. 44/98; 220/07',
        },
        {
          id: 'ENS-3-09',
          label: 'Impacto lateral contra barreira deformável',
          condition:
            'Verificar algum assento com ponto R até 700 mm e as dispensas. Calendário: novos projetos definidos no ato desde 2020; todos desde 2024.',
          refs: [
            {
              id: 'contran-949-2022',
              device: 'arts. 2º, 4º, 5º, I, e 7º; anexos e retificação',
              anchor: 'art-2',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['carroceria', 'bancos'],
          siscatHelp: 'CONTRAN no. 721/18',
        },
        {
          id: 'ENS-3-10',
          label: 'ISOFIX/LATCH',
          condition:
            'Banco traseiro, número de fileiras e hipóteses de esportivo/conversível alteram o enquadramento. Não presumir quantidade apenas pelo nome ISOFIX.',
          refs: [
            {
              id: 'contran-951-2022',
              device: 'Anexo I, itens 3.4.2 a 3.4.2.3 e 3.5.2, com redação da 997',
              anchor: 'anexo-i',
            },
            {
              id: 'contran-997-2023',
              device: 'art. 2º',
              anchor: 'art-2',
            },
          ],
          vehicle: ['bancos', 'carroceria'],
          siscatHelp: 'CONTRAN no. 518/15',
        },
        {
          id: 'ENS-3-11',
          label: 'Proteção ao pedestre',
          condition:
            'Novos projetos desde 01/01/2025; todos os veículos do escopo desde 01/01/2030; avaliar tipos e dispensas do ato.',
          refs: [
            {
              id: 'contran-752-2018',
              device: 'arts. 1º a 5º; anexos',
              anchor: 'art-1',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['carroceria', 'vidros'],
          siscatHelp: 'CONTRAN no. 752/18. Obrigatório a partir de jan/2025.',
        },
        {
          id: 'ENS-3-12',
          label: 'Impacto lateral em poste',
          condition:
            'Automóvel com PBT até 3.500 kg: projetos com MMV a partir de 31/12/2018 entram em 01/01/2026; demais em 01/01/2030, observadas dispensas e derivações.',
          refs: [
            {
              id: 'contran-949-2022',
              device: 'arts. 3º a 5º, II, e 7º; anexos e retificação',
              anchor: 'art-3',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['carroceria', 'bancos'],
          siscatHelp: 'CONTRAN no. 751/18. Obrigatório a partir de jan/2026.',
        },
        {
          id: 'ENS-3-13',
          label: 'Requisitos específicos para propulsão híbrida e elétrica',
          condition:
            'Para automóvel, aplicar 749/2018; art. 2º estabelece produção/importação desde 01/01/2023. Capítulos de impacto seguem o escopo de impacto pertinente.',
          refs: [
            {
              id: 'contran-749-2018',
              device: 'arts. 1º a 3º e anexos',
              anchor: 'art-1',
            },
          ],
          vehicle: ['bateria', 'carroceria', 'tanque'],
          siscatHelp: 'CONTRAN no. 750/18. Obrigatório a partir de jan/2022.',
        },
        {
          id: 'N3-AXI-01',
          label: 'Inclinação lateral (estabilidade)',
          condition:
            'Linha do Anexo XI, item 1.5, sem ato atual vinculado nesta revisão. Não aparece na tela SISCAT observada para M1.',
          refs: [],
          gap: 'Ato atual não vinculado. Conferir a linha do Anexo XI e o tipo de veículo.',
        },
        {
          id: 'N3-AXI-02',
          label: 'Procedimento de avaliação estrutural',
          condition:
            'Linha do Anexo XI, item 1.5, sem ato atual vinculado nesta revisão. Não aparece na tela SISCAT observada para M1.',
          refs: [],
          gap: 'Ato atual não vinculado. Conferir a linha do Anexo XI e o tipo de veículo.',
        },
        {
          id: 'N3-AXI-03',
          label: 'Sistema de retenção de cadeira de rodas (quando aplicável)',
          condition:
            'Linha do Anexo XI, item 1.5, sem ato atual vinculado nesta revisão. Não aparece na tela SISCAT observada para M1.',
          refs: [],
          gap: 'Ato atual não vinculado. Conferir a linha do Anexo XI e o tipo de veículo.',
        },
      ],
    },
    {
      id: 'identificacao',
      label: 'Etiquetas e VIN',
      source: {
        id: 'contran-968-2022',
        device: 'arts. 4º a 11',
        anchor: 'art-4',
      },
      text: 'VIN, gravações, etiquetas, placa e identificação eletrônica. Cada marcação tem fonte e âmbito próprios. ENCE de eficiência energética fica em Aprovações ambientais.',
      items: [
        {
          id: 'ID-VIN',
          label: 'VIN — número de identificação veicular',
          condition:
            'Gravação no chassi ou monobloco e segunda gravação conforme o ato. Descrição das seções do VIN no Anexo III da Portaria 990/2022 (ABNT NBR 6066).',
          refs: [
            {
              id: 'contran-968-2022',
              device: 'arts. 4º a 6º',
              anchor: 'art-4',
            },
            {
              id: 'senatran-095',
              device: 'Anexo III, itens 5 e 6',
              anchor: 'anexo-iii',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'ID-VIS',
          label: 'VIS nos vidros',
          condition: 'Marcação do VIS nos vidros do veículo.',
          refs: [
            {
              id: 'contran-968-2022',
              device: 'art. 9º',
              anchor: 'art-9',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'ID-ETA',
          label: 'Etiquetas autoadesivas (ETA)',
          condition: 'ETA previstas no art. 4º, IX; requisitos do art. 8º.',
          refs: [
            {
              id: 'contran-968-2022',
              device: 'art. 8º',
              anchor: 'art-8',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'ID-MOTOR',
          label: 'Número do motor e demais agregados',
          condition: 'Motor, câmbio, eixos, cabine e carroceria.',
          refs: [
            {
              id: 'contran-968-2022',
              device: 'arts. 7º e 11',
              anchor: 'art-7',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'ID-WMI',
          label: 'WMI — identificador mundial do fabricante',
          condition:
            'Comprovante do WMI no cadastro do CAT; não se aplica a transformados e encarroçados.',
          refs: [
            {
              id: 'senatran-095',
              device: 'Anexo III, item 1',
              anchor: 'anexo-iii',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'ID-PIV',
          label: 'Placa de identificação veicular (PIV)',
          condition: 'Local da placa e sistema PIV.',
          refs: [
            {
              id: 'contran-969-2022',
              device: 'art. 1º',
              anchor: 'art-1',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'SEG-021',
          label: 'Dispositivo auxiliar de identificação',
          condition:
            'Tratar a identificação auxiliar como dispositivo distinto da placa de registro. Uso facultativo nos termos do art. 2º; não impor como equipamento geral de fábrica ao M1.',
          refs: [
            {
              id: 'contran-944-2022',
              device: 'arts. 2º e 3º; anexo',
              anchor: 'art-2',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'ID-ENSV',
          label: 'Etiqueta Nacional de Segurança Veicular (ENSV)',
          condition:
            'Requisitos gerais e inovadores declarados como série, opcional, não disponível ou não aplicável. Os anexos da portaria não foram coletados.',
          refs: [
            {
              id: 'senatran-096',
              device: 'arts. 10, 11, 13 a 15',
              anchor: 'art-10',
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'ID-SELOS',
          label: 'Selos Inmetro com segurança física e digital',
          condition: 'Selos de componentes regulamentados; não certificam o veículo inteiro.',
          refs: [
            {
              id: 'inmetro-314-2025',
              device: 'art. 1º',
              anchor: null,
            },
          ],
          vehicle: ['identificacao'],
        },
        {
          id: 'SEG-035',
          label: 'SINIAV e identificação eletrônica',
          condition:
            'Manter o ramo de identificação eletrônica e seus atos de implementação separado do VIN e da PIV. A 537 revoga expressamente 412/2012 e 433/2013; arts. 4º e 5º remetem a cronograma e especificações do órgão executivo. Não presumir implantação universal efetiva nem obrigação de relatório CAT a partir do índice.',
          refs: [
            {
              id: 'contran-537-2015',
              device: 'arts. 1º a 6º',
              anchor: 'art-1',
            },
          ],
          vehicle: ['identificacao'],
        },
      ],
    },
    {
      id: 'opcionais',
      label: 'Opcionais e tecnologias inovadoras',
      source: {
        id: 'senatran-096',
        device: 'arts. 10 e 13',
        anchor: 'art-10',
      },
      text: 'Linhas da tela SISCAT para tecnologias declaradas na ENSV como série, opcional, não disponível ou não aplicável. A presença na tela não torna o item obrigatório.',
      items: [
        {
          id: 'ENS-3-14',
          label: 'Sistema de frenagem automático de emergência - obstáculo móvel',
          condition:
            'Se disponível/declarada, identificar o normativo e a prova de desempenho; a presença na tela não prova obrigação universal de instalação.',
          refs: [
            {
              id: 'senatran-096',
              device: 'arts. 5º, 9º, 10, 13 e 28; Anexo I',
              anchor: 'art-5',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['freios'],
        },
        {
          id: 'ENS-3-15',
          label: 'Sistema de frenagem automático de emergência - obstáculo fixo',
          condition:
            'Se disponível/declarada, identificar o normativo e a prova de desempenho; a presença na tela não prova obrigação universal de instalação.',
          refs: [
            {
              id: 'senatran-096',
              device: 'arts. 5º, 9º, 10, 13 e 28; Anexo I',
              anchor: 'art-5',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['freios'],
        },
        {
          id: 'ENS-3-16',
          label: 'Aviso de afastamento de faixa de rodagem (LDWS)',
          condition:
            'Se disponível/declarada, identificar o normativo e a prova de desempenho; a presença na tela não prova obrigação universal de instalação.',
          refs: [
            {
              id: 'senatran-096',
              device: 'arts. 5º, 9º, 10, 13 e 28; Anexo I',
              anchor: 'art-5',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['freios'],
        },
        {
          id: 'ENS-3-17',
          label: 'Impacto frontal - camionetas e utilitários',
          condition:
            'Para AUTOMOVEL, usar a avaliação da proteção frontal correspondente; não duplicar obrigação só por constar no grupo de inovadores.',
          refs: [
            {
              id: 'contran-910-2022',
              device: 'arts. 4º, 5º, 7º e 11',
              anchor: 'art-4',
            },
            {
              id: 'senatran-096',
              device: 'arts. 5º, 9º, 10, 13 e 28; Anexo I',
              anchor: 'art-5',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['carroceria', 'bancos'],
        },
        {
          id: 'ENS-3-18',
          label: 'Sistema de frenagem automático de emergência - pedestres',
          condition:
            'Se disponível/declarada, identificar o normativo e a prova de desempenho; a presença na tela não prova obrigação universal de instalação.',
          refs: [
            {
              id: 'senatran-096',
              device: 'arts. 5º, 9º, 10, 13 e 28; Anexo I',
              anchor: 'art-5',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['freios'],
        },
        {
          id: 'ENS-3-19',
          label: 'Sistema de frenagem automático de emergência - ciclistas',
          condition:
            'Se disponível/declarada, identificar o normativo e a prova de desempenho; a presença na tela não prova obrigação universal de instalação.',
          refs: [
            {
              id: 'senatran-096',
              device: 'arts. 5º, 9º, 10, 13 e 28; Anexo I',
              anchor: 'art-5',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['freios'],
        },
        {
          id: 'ENS-3-20',
          label: 'Assistente de permanência em faixa de rodagem (LKAS)',
          condition:
            'Se disponível/declarada, identificar o normativo e a prova de desempenho; a presença na tela não prova obrigação universal de instalação.',
          refs: [
            {
              id: 'senatran-096',
              device: 'arts. 5º, 9º, 10, 13 e 28; Anexo I',
              anchor: 'art-5',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['freios'],
        },
        {
          id: 'ENS-3-21',
          label: 'Monitor de sonolência ou distração do motorista',
          condition:
            'Se disponível/declarada, identificar o normativo e a prova de desempenho; a presença na tela não prova obrigação universal de instalação.',
          refs: [
            {
              id: 'senatran-096',
              device: 'arts. 5º, 9º, 10, 13 e 28; Anexo I',
              anchor: 'art-5',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['freios'],
        },
        {
          id: 'ENS-3-22',
          label: 'Controle de cruzeiro adaptativo',
          condition:
            'Se disponível/declarada, identificar o normativo e a prova de desempenho; a presença na tela não prova obrigação universal de instalação.',
          refs: [
            {
              id: 'senatran-096',
              device: 'arts. 5º, 9º, 10, 13 e 28; Anexo I',
              anchor: 'art-5',
            },
            {
              id: 'mover-006',
              device: 'Anexo II',
              anchor: 'anexo-ii',
            },
          ],
          vehicle: ['freios'],
        },
      ],
    },
    {
      id: 'outros',
      label: 'Outros requisitos de segurança',
      source: null,
      text: 'Requisitos de segurança que não são linhas dos Níveis 1 a 3 nem marcações: equipamentos, acessórios, combustível, transporte e processo, e os requisitos do programa MOVER.',
      subgroups: [
        {
          id: 'complementares',
          label: 'Equipamentos, acessórios e uso',
          items: [
            {
              id: 'SEG-005',
              label: 'Airbags frontais',
              condition:
                'Instalar o sistema suplementar frontal para condutor e passageiro dianteiro no escopo do ato. M1/N1 fabricados desde 01/01/2014, observadas dispensas expressas de configuração/produção.',
              refs: [
                {
                  id: 'contran-964-2022',
                  device: 'arts. 2º a 4º',
                  anchor: 'art-2',
                },
              ],
              vehicle: ['bancos', 'carroceria'],
            },
            {
              id: 'SEG-010',
              label: 'Para-choques dianteiro e traseiro do automóvel',
              condition:
                'Garantir os equipamentos previstos para a classe. Não transportar requisitos específicos de anti-intrusão de caminhões para o automóvel.',
              refs: [
                {
                  id: 'contran-993-2023',
                  device: 'Anexo I, tabela 1',
                  anchor: 'anexo-i',
                },
              ],
              vehicle: ['carroceria'],
            },
            {
              id: 'SEG-011',
              label: 'Para-sol do condutor',
              condition:
                'Prever a pala interna de proteção contra o sol para o condutor. Conforme tipo de veículo da tabela aplicável.',
              refs: [
                {
                  id: 'contran-993-2023',
                  device: 'Anexo I, tabela 1',
                  anchor: 'anexo-i',
                },
              ],
              vehicle: ['vidros'],
            },
            {
              id: 'SEG-012',
              label: 'Velocímetro',
              condition:
                'Prever o instrumento obrigatório de indicação de velocidade. Conforme tipo e tabela aplicável.',
              refs: [
                {
                  id: 'contran-993-2023',
                  device: 'Anexo I, tabela 1',
                  anchor: 'anexo-i',
                },
              ],
            },
            {
              id: 'SEG-023',
              label: 'Posição do volante',
              condition:
                'O registro/licenciamento de veículo com volante do sistema de direção à direita é proibido, salvo exceção do ato. Automóvel novo brasileiro não se enquadra na exceção de coleção com mais de 30 anos.',
              refs: [
                {
                  id: 'contran-528-2015',
                  device: 'art. 1º',
                  anchor: 'art-1',
                },
              ],
            },
            {
              id: 'SEG-014',
              label: 'Ferramentas e alternativa ao estepe',
              condition:
                'Compatibilizar solução de mobilidade, estepe, macaco e ferramentas. As dispensas dependem da solução efetivamente instalada e de suas instruções; não bastam as marcações do processo exemplo.',
              refs: [
                {
                  id: 'contran-993-2023',
                  device: 'Anexo I, tabela 1 e notas 31 a 36 e 46 da 993; 913 e anexo',
                  anchor: 'anexo-i',
                },
                {
                  id: 'contran-913-2022',
                  device: null,
                  anchor: null,
                },
              ],
              vehicle: ['pneus-rodas'],
            },
            {
              id: 'SEG-018',
              label: 'Rodas especiais',
              condition:
                'Rodas usadas para substituir as originais/opcionais devem atender aos requisitos específicos. Roda especial conforme definição do art. 3º; não é categoria automática das rodas originais de fábrica.',
              refs: [
                {
                  id: 'contran-963-2022',
                  device: 'arts. 2º a 5º e anexo',
                  anchor: 'art-2',
                },
              ],
              vehicle: ['pneus-rodas'],
            },
            {
              id: 'SEG-003',
              label: 'Engate para reboque instalado como acessório',
              condition:
                'Compatibilizar capacidade do veículo, pontos de fixação, engate e rastreabilidade. PBT até 3.500 kg, capacidade de tracionar declarada e engate não original de fábrica, conforme art. 1º. A instalação original exige enquadramento próprio, sem extensão automática da regra do acessório.',
              refs: [
                {
                  id: 'contran-937-2022',
                  device: 'arts. 1º a 5º e 8º',
                  anchor: 'art-1',
                },
                {
                  id: 'inmetro-309-2021',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-919-2022',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-915-2022',
                  device: null,
                  anchor: null,
                },
              ],
              outsideCollection: ['inmetro-400-2020'],
              vehicle: ['carroceria', 'freios'],
            },
            {
              id: 'SEG-004',
              label: 'Bagageiro e suporte para bicicletas',
              condition:
                'Respeitar limites e instalação do fabricante, visibilidade, amarração, luzes e placa. Quando se transporta carga/bicicleta externamente. Instalação proibida se o fabricante não recomendar ou proibir.',
              refs: [
                {
                  id: 'contran-955-2022',
                  device: 'arts. 2º a 10 da 955; regras da segunda PIV na 969',
                  anchor: 'art-2',
                },
                {
                  id: 'contran-969-2022',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'inmetro-309-2021',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-919-2022',
                  device: null,
                  anchor: null,
                },
              ],
              outsideCollection: ['inmetro-400-2020'],
              vehicle: ['carroceria', 'iluminacao', 'identificacao'],
            },
            {
              id: 'SEG-017',
              label: 'Extintor e local de instalação',
              condition:
                'Em automóvel, a instalação é facultativa; fabricante/importador deve disponibilizar local adequado para o suporte. Se instalado, cumprir especificação e conformidade. Uso coletivo pode alterar o enquadramento do veículo.',
              refs: [
                {
                  id: 'contran-919-2022',
                  device: 'art. 2º, §§ 1º a 3º; art. 3º e anexo',
                  anchor: 'art-2',
                },
                {
                  id: 'inmetro-309-2021',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'inmetro-314-2025',
                  device: null,
                  anchor: null,
                },
              ],
              outsideCollection: ['inmetro-400-2020', 'inmetro-108-2022', 'inmetro-409-2026'],
              vehicle: ['carroceria'],
            },
            {
              id: 'SEG-022',
              label: 'Massas, dimensões e capacidades',
              condition:
                'Compatibilizar limites técnicos, legais, eixos e capacidades declaradas. Usar o menor limite aplicável. As alterações posteriores não concedem automaticamente aumento de massa a todo veículo elétrico.',
              refs: [
                {
                  id: 'contran-882-2021',
                  device: 'arts. 2º a 8º da 882 e dispositivos alteradores',
                  anchor: 'art-2',
                },
                {
                  id: 'contran-899-2022',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-994-2023',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-1005-2024',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-1015-2024',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-915-2022',
                  device: null,
                  anchor: null,
                },
              ],
              outsideCollection: ['deliberacao-250-2021', 'deliberacao-270-2023'],
              vehicle: ['pneus-rodas', 'carroceria'],
            },
            {
              id: 'SEG-024',
              label: 'Sistema GNV original de fábrica',
              condition:
                'O sistema e os componentes têm conformidade e inspeções periódicas próprias. Somente configuração com GNV. Distinguir instalação original de conversão posterior.',
              refs: [
                {
                  id: 'contran-280-2008',
                  device: 'arts. 1º a 3º',
                  anchor: 'art-1',
                },
                {
                  id: 'contran-749-2018',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'inmetro-111-2022',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'inmetro-436-2021',
                  device: null,
                  anchor: null,
                },
              ],
              outsideCollection: [
                'inmetro-130-2022',
                'dnc-23-1994',
                'inmetro-147-2022',
                'inmetro-384-2023',
                'inmetro-634-2023',
                'inmetro-106-2025',
                'inmetro-133-2022',
                'inmetro-409-2026',
              ],
              vehicle: ['tanque', 'bateria'],
            },
            {
              id: 'SEG-025',
              label: 'Múltiplos tanques e tanque suplementar',
              condition:
                'Separar tanques instalados antes do registro de reservatório suplementar após o registro. A instalação de tanque suplementar do art. 3º é restrita aos tipos ali previstos; não é uma autorização geral para automóvel.',
              refs: [
                {
                  id: 'contran-921-2022',
                  device: 'arts. 2º a 6º',
                  anchor: 'art-2',
                },
                {
                  id: 'contran-749-2018',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-280-2008',
                  device: null,
                  anchor: null,
                },
              ],
              outsideCollection: ['inmetro-130-2022', 'dnc-23-1994'],
              vehicle: ['tanque', 'carroceria'],
            },
            {
              id: 'SEG-026',
              label: 'Escapamento e controle de ruído do motor',
              condition:
                'Prever o dispositivo de controle de ruído para veículo com motor a combustão. Não se aplica por existência de motor de combustão ao elétrico puro; limites ambientais e sua prova serão tratados no ramo ambiental.',
              refs: [
                {
                  id: 'contran-993-2023',
                  device: 'Anexo I, tabela 1 da 993; dispositivos pertinentes da 958',
                  anchor: 'anexo-i',
                },
                {
                  id: 'contran-958-2022',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-749-2018',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-280-2008',
                  device: null,
                  anchor: null,
                },
              ],
              outsideCollection: ['inmetro-130-2022', 'dnc-23-1994'],
              vehicle: ['escapamento', 'bateria'],
            },
            {
              id: 'SEG-030',
              label: 'Transporte de carga no compartimento de passageiros',
              condition:
                'A carga deve ficar em compartimento próprio e separado dos passageiros no escopo do ato. Quando o veículo de passageiros transporta carga, observadas regras do ato.',
              refs: [
                {
                  id: 'contran-26-1998',
                  device: 'arts. 1º a 4º',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['carroceria', 'bancos'],
            },
            {
              id: 'SEG-031',
              label: 'Transporte de crianças no uso do veículo',
              condition:
                'Escolher a retenção infantil adequada ao ocupante e ao veículo. Uso: idade/altura e exceções do ato. Não confundir o dispositivo infantil com a ancoragem que integra o veículo.',
              refs: [
                {
                  id: 'contran-819-2021',
                  device: 'arts. 1º a 4º e anexo',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['bancos'],
            },
            {
              id: 'SEG-032',
              label: 'Manual básico de segurança no trânsito',
              condition:
                'Disponibilizar o conteúdo obrigatório do manual de segurança no trânsito. Obrigações de fabricantes/importadores e meios de disponibilização conforme o ato.',
              refs: [
                {
                  id: 'contran-711-2017',
                  device: 'arts. 1º a 3º e anexo',
                  anchor: 'art-1',
                },
              ],
            },
            {
              id: 'SEG-033',
              label: 'Homologação, MMV e modificações',
              condition:
                'Distinguir obtenção do MMV/CAT do processo de modificação posterior de um veículo. A mudança de 2026 sobre motor elétrico auxiliar é de caminhão/caminhão-trator; não deve ser aplicada ao automóvel por proximidade temática.',
              refs: [
                {
                  id: 'contran-916-2022',
                  device: 'arts. 1º a 5º da 916 e anexos; atos modificadores',
                  anchor: 'art-1',
                },
                {
                  id: 'contran-958-2022',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-1021-2026',
                  device: null,
                  anchor: null,
                },
                {
                  id: 'contran-1010-2024',
                  device: null,
                  anchor: null,
                },
              ],
            },
          ],
        },
        {
          id: 'mover-a',
          label: 'MOVER — Grupo A, requisitos gerais',
          items: [
            {
              id: 'MOVER-A1',
              code: 'A1',
              label: 'Impacto lateral',
              condition: null,
              methods: 'CONTRAN 949/2022',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-949-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['carroceria'],
            },
            {
              id: 'MOVER-A2',
              code: 'A2',
              label: 'Controle eletrônico de estabilidade (ESC)',
              condition: null,
              methods: 'CONTRAN 954/2022, com ato posterior de cronograma aplicável',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-954-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['freios'],
            },
            {
              id: 'MOVER-A3',
              code: 'A3',
              label: 'Indicador de direção lateral',
              condition: null,
              methods: 'CONTRAN 970/2022, com alterações aplicáveis',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-970-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['iluminacao'],
            },
            {
              id: 'MOVER-A4',
              code: 'A4',
              label: 'Farol de rodagem diurna (DRL)',
              condition: null,
              methods: 'CONTRAN 970/2022, com alterações aplicáveis',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-970-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['iluminacao'],
            },
            {
              id: 'MOVER-A5',
              code: 'A5',
              label: 'Aviso de cinto: condutor',
              condition: null,
              methods: 'CONTRAN 936/2022',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-936-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['bancos'],
            },
            {
              id: 'MOVER-A6',
              code: 'A6',
              label: 'Indicação de frenagem de emergência (ESS)',
              condition: null,
              methods: 'CONTRAN 970/2022, com alterações aplicáveis',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-970-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['iluminacao', 'freios'],
            },
            {
              id: 'MOVER-A7',
              code: 'A7',
              label: 'Alerta ou visibilidade traseira',
              condition: null,
              methods: 'CONTRAN 759/2018',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-759-2018',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['carroceria'],
            },
          ],
        },
        {
          id: 'mover-b',
          label: 'MOVER — Grupo B, requisitos gerais',
          items: [
            {
              id: 'MOVER-B1',
              code: 'B1',
              label: 'Impacto lateral em poste',
              condition: null,
              methods: 'CONTRAN 949/2022',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-949-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['carroceria'],
            },
            {
              id: 'MOVER-B2',
              code: 'B2',
              label: 'Proteção de pedestres',
              condition: null,
              methods: 'CONTRAN 752/2018',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-752-2018',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['carroceria'],
            },
            {
              id: 'MOVER-B3',
              code: 'B3',
              label: 'Frenagem automática: obstáculo móvel',
              condition: null,
              methods:
                'UN R152; MoU Automatic Emergency Braking Voluntary Commitment; ou FMVSS 127',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['freios', 'carroceria'],
            },
            {
              id: 'MOVER-B4',
              code: 'B4',
              label: 'Frenagem automática: obstáculo fixo',
              condition: null,
              methods:
                'UN R152; MoU Automatic Emergency Braking Voluntary Commitment; ou FMVSS 127',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['freios', 'carroceria'],
            },
            {
              id: 'MOVER-B5',
              code: 'B5',
              label: 'Aviso de afastamento de faixa (LDWS)',
              condition: null,
              methods: 'ISO 17361:2017; UN R79.03; ou Regulamento de Execução UE 2021/646',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['vidros'],
            },
            {
              id: 'MOVER-B6',
              code: 'B6',
              label: 'Impacto frontal: camionetas e utilitários',
              condition: null,
              methods: 'CONTRAN 910/2022; observar tipo e PBT inferior a 2500 kg no texto citado',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-910-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['carroceria'],
            },
            {
              id: 'MOVER-B7',
              code: 'B7',
              label: 'Monitoramento da pressão de pneus (TPMS)',
              condition: null,
              methods: 'UN R141 Amend. 1; ou FMVSS 138',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['pneus-rodas'],
            },
            {
              id: 'MOVER-B8',
              code: 'B8',
              label: 'Aviso de cinto: condutor e passageiro frontal',
              condition: null,
              methods: 'CONTRAN 936/2022, observado o escopo do requisito contado no MOVER',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-936-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['bancos'],
            },
          ],
        },
        {
          id: 'mover-c',
          label: 'MOVER — Grupo C, substitutos do Grupo B',
          items: [
            {
              id: 'MOVER-C1',
              code: 'C1',
              label: 'Frenagem automática: pedestres',
              condition: null,
              methods: 'UN R152; ou FMVSS 127',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['freios', 'carroceria'],
            },
            {
              id: 'MOVER-C2',
              code: 'C2',
              label: 'Frenagem automática: ciclistas',
              condition: null,
              methods:
                'UN R152; alternativa temporária de dossiê no texto oficial contém inconsistência semântica e terminou em setembro de 2026',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['freios', 'carroceria'],
            },
            {
              id: 'MOVER-C3',
              code: 'C3',
              label: 'Assistente de permanência em faixa (LKAS)',
              condition: null,
              methods: 'UN R79 Revision 4; ou Regulamento de Execução UE 2021/646',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['vidros'],
            },
            {
              id: 'MOVER-C4',
              code: 'C4',
              label: 'Aviso de sonolência e atenção (DDAW)',
              condition: null,
              methods:
                'Regulamento Delegado UE 2021/1341; alternativa temporária de dossiê até setembro de 2026 não tratada como vigente em novembro',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['bancos'],
            },
            {
              id: 'MOVER-C5',
              code: 'C5',
              label: 'Aviso avançado de distração (ADDW)',
              condition: null,
              methods: 'Regulamento Delegado UE 2023/2590',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['bancos'],
            },
            {
              id: 'MOVER-C6',
              code: 'C6',
              label: 'Sensor de ponto cego',
              condition: null,
              methods: 'ISO 17387:2008; ou SAE J2802_202110',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['retrovisores', 'carroceria'],
            },
            {
              id: 'MOVER-C7',
              code: 'C7',
              label: 'Aviso de cinto: todos os passageiros',
              condition: null,
              methods: 'CONTRAN 936/2022, observado o escopo do requisito contado no MOVER',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
                {
                  id: 'contran-936-2022',
                  device: 'regulamento técnico citado no Anexo II',
                  anchor: 'art-1',
                },
              ],
              vehicle: ['bancos'],
            },
            {
              id: 'MOVER-C8',
              code: 'C8',
              label: 'Controle de cruzeiro adaptativo (ACC)',
              condition: null,
              methods: 'ISO 15622:2018; ou SAE J2399_202110',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['carroceria', 'freios'],
            },
          ],
        },
        {
          id: 'mover-d',
          label: 'MOVER — Grupo D, a definir',
          items: [
            {
              id: 'MOVER-D1',
              code: 'D1',
              label: 'Chamada de emergência a bordo (eCall)',
              condition: null,
              methods: 'Definição técnica depende do processo previsto no art. 5º, § 1º',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
            },
            {
              id: 'MOVER-D2',
              code: 'D2',
              label: 'Assistente inteligente de velocidade (ISA)',
              condition: null,
              methods: 'Definição técnica depende do processo previsto no art. 5º, § 1º',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['bateria'],
            },
            {
              id: 'MOVER-D3',
              code: 'D3',
              label: 'Pré-instalação de bloqueio da ignição sensível ao álcool',
              condition: null,
              methods: 'Definição técnica depende do processo previsto no art. 5º, § 1º',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
              vehicle: ['bateria'],
            },
            {
              id: 'MOVER-D4',
              code: 'D4',
              label: 'Comunicação carro-carro',
              condition: null,
              methods: 'Definição técnica depende do processo previsto no art. 5º, § 1º',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
            },
            {
              id: 'MOVER-D5',
              code: 'D5',
              label: 'Comunicação carro-infraestrutura',
              condition: null,
              methods: 'Definição técnica depende do processo previsto no art. 5º, § 1º',
              refs: [
                {
                  id: 'mover-002',
                  device: 'Anexo IV, item 2',
                  anchor: 'anexo-iv',
                },
                {
                  id: 'mover-006',
                  device: 'Anexo II',
                  anchor: 'anexo-ii',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

if (typeof module !== 'undefined') module.exports = { safetyTreeSpec };
