'use strict';
// Editorial activity map. References are joined only to the available catalogue;
// graph edges express a reading/work relationship, not universal legal precedence.
const homologationFlowSpec = {
  version: 1,
  powertrains: [
    { id: 'todos', label: 'Todos os powertrains' },
    { id: 'combustao', label: 'Combustão' },
    { id: 'hibrido', label: 'Híbrido / plug-in' },
    { id: 'eletrico', label: 'Elétrico a bateria' },
  ],
  stages: [
    {
      id: 'enquadramento',
      number: '01',
      label: 'Enquadramento',
      short: 'Categoria e powertrain',
      icon: '▱',
      tone: 'project',
      x: 20,
      y: 230,
      w: 145,
      h: 140,
      purpose: 'Definir qual configuração será analisada antes de escolher métodos e requisitos.',
      outputs: ['Perfil técnico e categorias', 'Matriz inicial de requisitos'],
      activities: [
        {
          id: 'perfil',
          label: 'Categoria, massas e uso',
          text: 'Separar categoria regulamentar, massas, capacidade e finalidade. O perfil visual do cabeçalho não é enquadramento jurídico.',
          refs: ['contran-916-2022', 'contran-882-2021'],
          gaps: ['Validar a matriz por categoria, datas e configuração do projeto.'],
        },
        {
          id: 'powertrain',
          label: 'Escolher o powertrain',
          text: 'Distinguir combustão, híbridos/plug-in e elétricos a bateria. A fase L8 é de leves; P8 é de pesados.',
          refs: ['conama-492-2018', 'conama-490-2018'],
          powertrains: ['combustao', 'hibrido'],
          gaps: [
            'A seleção organiza este mapa; não determina automaticamente fase ou dispensa legal.',
          ],
        },
        {
          id: 'eletrico',
          label: 'Enquadramento do elétrico',
          text: 'Conferir requisitos específicos de propulsão elétrica e eficiência. Não impor ensaios de escapamento de um motor a combustão ao elétrico puro.',
          refs: ['contran-749-2018', 'inmetro-169-2023'],
          powertrains: ['eletrico'],
        },
      ],
    },
    {
      id: 'construcao',
      number: '02',
      label: 'Projeto e construção',
      short: 'Protótipos representativos',
      icon: '◇',
      tone: 'project',
      x: 185,
      y: 230,
      w: 145,
      h: 140,
      purpose:
        'Transformar o enquadramento em projeto e protótipos rastreáveis, com requisitos por sistema.',
      outputs: ['Protótipos identificados', 'Configuração e componentes documentados'],
      activities: [
        {
          id: 'sistemas',
          label: 'Segurança por sistema',
          text: 'Projetar sistemas de acordo com seus requisitos e categorias. As referências são por assunto, não um certificado global de todo o carro.',
          refs: ['contran-915-2022', 'contran-951-2022', 'contran-970-2022', 'contran-960-2022'],
          vehicleComponent: 'bancos',
        },
        {
          id: 'componentes',
          label: 'Componentes e conformidade',
          text: 'Verificar o produto efetivamente abrangido, mecanismo de conformidade e exclusões. Não presumir certificação de toda peça da linha de montagem.',
          refs: ['inmetro-145-2022', 'inmetro-34-2021', 'inmetro-501-2021'],
          gaps: [
            'Íntegra consolidada, exceções OEM e anexos técnicos Inmetro ainda precisam de revisão.',
          ],
        },
        {
          id: 'identificacao',
          label: 'VIN, ETA e etiquetas',
          text: 'Planejar gravações, localização e resistência das marcações conforme categoria e datas. ETA, ENCE e selo de produto têm funções distintas.',
          refs: ['contran-968-2022', 'contran-882-2021', 'inmetro-169-2023'],
          route: '#markings',
        },
      ],
    },
    {
      id: 'preparacao',
      number: '03',
      label: 'Preparação e amaciamento',
      short: 'Plano de ensaios e configuração',
      icon: '⚙',
      tone: 'project',
      x: 350,
      y: 230,
      w: 145,
      h: 140,
      purpose:
        'Preparar veículo, componentes e registros antes dos ensaios, segundo os métodos realmente aplicáveis.',
      outputs: ['Condições de ensaio registradas', 'Histórico de preparação e configuração'],
      activities: [
        {
          id: 'amaciamento',
          label: 'Amaciamento e condicionamento',
          text: 'Definir o amaciamento e o condicionamento específicos do veículo, pneus, freios e ensaio. Amaciamento não é coastdown.',
          refs: [],
          gaps: [
            'NBR, edição vigente, distância/ciclo e condições de amaciamento precisam ser confirmados por ensaio. Nenhum valor foi inventado.',
          ],
        },
        {
          id: 'obd',
          label: 'Preparação específica para OBD',
          text: 'No contexto do ensaio OBD, o item 4.3.1.1 do anexo da IN 23/2020 trata do veículo amaciado a critério do fabricante e remete ao envelhecimento de componentes conforme NBR 16897. Não é regra universal de amaciamento.',
          refs: ['ibama-in-23-2020'],
          powertrains: ['combustao', 'hibrido'],
          gaps: [
            'A íntegra da NBR 16897 e sua aplicação ao ensaio específico precisam de conferência.',
          ],
        },
        {
          id: 'plano',
          label: 'Plano e rastreabilidade',
          text: 'Organizar identificação dos protótipos, configurações, calibrações e evidências de cada ensaio.',
          recordIds: ['senatran-095'],
          gaps: [
            'Conferir os procedimentos específicos e o laboratório responsável antes de fixar condições de preparação.',
          ],
        },
        {
          id: 'hibrido',
          label: 'Preparação do híbrido',
          text: 'Definir modos de operação e condicionamento da bateria com base no procedimento aplicável ao híbrido e ao híbrido plug-in.',
          refs: ['ibama-in-3-2023'],
          powertrains: ['hibrido'],
          gaps: [
            'Edições e condições completas das normas técnicas referenciadas ainda não foram revisadas.',
          ],
        },
      ],
    },
    {
      id: 'coastdown',
      number: 'A1',
      label: 'Coastdown',
      short: 'Resistência ao avanço',
      icon: '↗',
      tone: 'environment',
      x: 540,
      y: 40,
      w: 150,
      h: 150,
      purpose:
        'Obter a resistência ao avanço e os parâmetros utilizados nos ensaios em dinamômetro quando o procedimento exigir.',
      outputs: [
        'Resultados de resistência ao avanço',
        'Parâmetros documentados para o dinamômetro',
      ],
      activities: [
        {
          id: 'metodo',
          label: 'Método e preparação',
          text: 'Conferir o método de resistência ao avanço, pista, veículo, pneus, massa, condições e edição da norma citada no procedimento aplicável.',
          refs: ['inmetro-169-2023', 'ibama-in-11-2014'],
          referencePowertrains: { 'ibama-in-11-2014': ['combustao', 'hibrido'] },
          relation:
            'Enquadramento PBEV e massa/potência resistiva para dinamômetro na IN 11/2014; não substitui o método integral de coastdown.',
          gaps: [
            'A NBR 10312 é citada na referência oficial PBEV; método integral, edição aplicável e condições ainda precisam de conferência.',
          ],
        },
        {
          id: 'dinamometro',
          label: 'Parâmetros para o laboratório',
          text: 'Vincular os resultados à configuração ensaiada e à preparação do dinamômetro; registrar os critérios do método.',
          refs: [],
          gaps: [
            'Coeficientes, tolerâncias, condições e critérios de aceitação ainda não foram mapeados.',
          ],
        },
      ],
    },
    {
      id: 'laboratorio',
      number: 'A2',
      label: 'Laboratório e ensaios',
      short: 'Métodos por powertrain',
      icon: '⚗',
      tone: 'environment',
      x: 710,
      y: 40,
      w: 150,
      h: 150,
      purpose: 'Executar ensaios com método, configuração e competência técnica documentados.',
      outputs: ['Relatórios e resultados rastreáveis', 'Identificação dos métodos e configurações'],
      activities: [
        {
          id: 'competencia',
          label: 'Laboratório e agentes técnicos',
          text: 'Distinguir competência do laboratório, acreditação quando exigida e atuação de agentes técnicos cooperados do Ibama. Um vínculo ATC não é acreditação universal.',
          refs: ['ibama-in-11-2020', 'ibama-in-16-2024'],
          recordIds: ['senatran-095'],
        },
        {
          id: 'combustao',
          label: 'Combustão: emissões e OBD',
          text: 'Consultar os ensaios e procedimentos ambientais da fase aplicável. L8 e P8 são recortes distintos e os atos abaixo não se aplicam automaticamente a todas as categorias.',
          refs: [
            'conama-492-2018',
            'conama-490-2018',
            'ibama-in-22-2020',
            'ibama-in-23-2020',
            'ibama-in-20-2020',
          ],
          powertrains: ['combustao'],
        },
        {
          id: 'hibrido',
          label: 'Híbridos e plug-in',
          text: 'A IN 3/2023 referencia a NBR 16567 para HEV/PHEV. Conferir modos elétrico/combustão e condições de carga no método aplicável, sem presumir uma edição não revisada.',
          refs: ['ibama-in-3-2023', 'ibama-in-11-2014', 'inmetro-169-2023'],
          powertrains: ['hibrido'],
          gaps: [
            'Métodos técnicos integrais e parâmetros de preparação ainda precisam de conferência.',
          ],
        },
        {
          id: 'eletrico',
          label: 'Elétrico: energia e autonomia',
          text: 'Conferir consumo elétrico, autonomia e condições do programa aplicável. O método técnico não foi integralmente validado neste acervo.',
          refs: ['inmetro-169-2023'],
          powertrains: ['eletrico'],
          gaps: [
            'Confirmar norma, edição, ciclos e condições de ensaio de autonomia/consumo elétrico.',
          ],
        },
        {
          id: 'evaporativas',
          label: 'Evaporativas e reabastecimento',
          text: 'Conferir combustível, configuração e condições dos ensaios previstos para a fase e as alterações aplicáveis.',
          refs: ['ibama-in-3-2023', 'conama-492-2018'],
          powertrains: ['combustao', 'hibrido'],
          gaps: [
            'Inteiro teor da IN Ibama 26/2020 ainda não localizado; remissão preservada na IN 3/2023.',
          ],
        },
      ],
    },
    {
      id: 'aprovacoes',
      number: 'A3',
      label: 'Aprovações ambientais',
      short: 'LCVM e eficiência, conforme escopo',
      icon: '▤',
      tone: 'environment',
      x: 880,
      y: 40,
      w: 150,
      h: 150,
      purpose:
        'Consolidar resultados e cumprir os procedimentos ambientais e de eficiência pertinentes à configuração.',
      outputs: ['Evidência ambiental aplicável', 'Resultados e informação de eficiência'],
      activities: [
        {
          id: 'lcvm',
          label: 'IBAMA / LCVM',
          text: 'Conferir o licenciamento ambiental da configuração. A documentação CAT trata de comprovação ambiental para veículos com combustão interna e emissão de gases de escapamento.',
          refs: ['conama-492-2018', 'conama-490-2018', 'ibama-in-11-2014'],
          recordIds: ['senatran-095'],
          powertrains: ['combustao', 'hibrido'],
          gaps: [
            'Procedimento completo de solicitação de LCVM e sua cadeia normativa ainda não estão integralmente mapeados.',
          ],
        },
        {
          id: 'eficiencia',
          label: 'PBEV e ENCE do veículo',
          text: 'Separar participação e procedimentos do programa de eficiência, resultados de ensaio e informação ao consumidor. ENCE não substitui CAT ou LCVM.',
          refs: ['inmetro-169-2023'],
          route: '#inmetro?record=inmetro-169-2023',
        },
      ],
    },
    {
      id: 'seguranca',
      number: 'B',
      label: 'Segurança veicular',
      short: 'Ensaios e evidências por sistema, em paralelo',
      icon: '◇',
      tone: 'safety',
      x: 540,
      y: 230,
      w: 490,
      h: 140,
      purpose:
        'Reunir os requisitos e comprovações dos sistemas de segurança de acordo com a categoria e as datas.',
      outputs: ['Relatórios de segurança', 'Matriz de atendimento por sistema'],
      activities: [
        {
          id: 'freios',
          label: 'Frenagem e estabilidade',
          text: 'Verificar frenagem, ABS/CBS, estabilidade e respectivos campos de aplicação.',
          refs: ['contran-915-2022', 'contran-954-2022'],
          vehicleComponent: 'freios',
        },
        {
          id: 'ocupantes',
          label: 'Ocupantes e estrutura',
          text: 'Separar cintos/ancoragens, airbags e requisitos de impacto. Os requisitos variam por categoria e configuração.',
          refs: [
            'contran-951-2022',
            'contran-220-2007',
            'contran-964-2022',
            'contran-949-2022',
            'contran-910-2022',
          ],
          vehicleComponent: 'bancos',
        },
        {
          id: 'visibilidade',
          label: 'Iluminação e visibilidade',
          text: 'Conferir iluminação, vidros, limpadores e visão indireta.',
          refs: ['contran-970-2022', 'contran-960-2022', 'contran-224-2006', 'contran-966-2022'],
          vehicleComponent: 'iluminacao',
        },
        {
          id: 'eletrica',
          label: 'Segurança de propulsão elétrica',
          text: 'Consultar os requisitos específicos da propulsão elétrica/híbrida e a configuração abrangida.',
          refs: ['contran-749-2018'],
          powertrains: ['hibrido', 'eletrico'],
          vehicleComponent: 'bateria',
        },
      ],
    },
    {
      id: 'componentes',
      number: 'C',
      label: 'Componentes e identificação',
      short: 'Inmetro, Anatel, VIN e etiquetas, em paralelo',
      icon: '✓',
      tone: 'components',
      x: 540,
      y: 410,
      w: 490,
      h: 140,
      purpose:
        'Associar cada produto e marcação ao seu mecanismo de conformidade e fonte, sem supor certificação de todas as peças.',
      outputs: ['Certificados ou declarações aplicáveis', 'Identificação e marcações documentadas'],
      activities: [
        {
          id: 'inmetro',
          label: 'Componentes / Inmetro',
          text: 'Conferir escopo de produto, certificação, declaração do fornecedor, exclusões e transições.',
          refs: [
            'inmetro-145-2022',
            'inmetro-34-2021',
            'inmetro-501-2021',
            'inmetro-456-2021',
            'inmetro-379-2021',
            'inmetro-33-2021',
            'inmetro-246-2021',
          ],
          route: '#inmetro',
          gaps: ['Revisão integral dos RTQs/RACs e exceções OEM ainda está pendente.'],
        },
        {
          id: 'anatel',
          label: 'Multimídia, rádio e conectividade',
          text: 'Enquadrar as funções reais de telecomunicações, módulos e equipamento final; não presumir exigência universal para recepção AM/FM pura.',
          refs: [
            'anatel-res715',
            'anatel-res779',
            'anatel-res780',
            'anatel-res680',
            'anatel-ato4088-2020',
          ],
          route: '#anatel',
        },
        {
          id: 'etiquetas',
          label: 'VIN, etiquetas e selos',
          text: 'Separar VIN/ETA, ENCE, selos Inmetro e identificação Anatel. Cada marcação tem fonte e âmbito próprios.',
          refs: ['contran-968-2022', 'inmetro-169-2023', 'inmetro-314-2025', 'anatel-ato4088-2020'],
          route: '#markings',
        },
      ],
    },
    {
      id: 'dossie',
      number: '04',
      label: 'Dossiê de homologação',
      short: 'Resultados e configurações',
      icon: '▤',
      tone: 'approval',
      x: 1060,
      y: 230,
      w: 145,
      h: 140,
      purpose:
        'Convergir as evidências pertinentes das frentes técnicas em uma configuração rastreável.',
      outputs: [
        'Conjunto documental organizado',
        'Relação entre configuração, ensaios e comprovações',
      ],
      activities: [
        {
          id: 'rastreabilidade',
          label: 'Relatórios e rastreabilidade',
          text: 'Conferir identificação dos relatórios, protótipos, configurações, responsáveis e comprovações exigidas no procedimento.',
          recordIds: ['senatran-095'],
          refs: ['contran-916-2022'],
          gaps: [
            'A lista documental final depende da categoria e do procedimento vigente; este mapa não a gera automaticamente.',
          ],
        },
        {
          id: 'ambiente',
          label: 'Comprovação ambiental',
          text: 'Anexar a comprovação ambiental quando pertinente ao processo e à configuração. Não converter LCVM em obrigação universal do elétrico puro.',
          recordIds: ['senatran-095'],
          powertrains: ['combustao', 'hibrido'],
        },
      ],
    },
    {
      id: 'cat',
      number: '05',
      label: 'SENATRAN / CAT',
      short: 'Adequação à legislação',
      icon: '▤',
      tone: 'approval',
      x: 1225,
      y: 230,
      w: 145,
      h: 140,
      purpose:
        'Consultar o procedimento de concessão de código marca/modelo/versão e do Certificado de Adequação à Legislação de Trânsito.',
      outputs: ['CAT / código, quando cabíveis', 'Configuração e responsabilidades identificadas'],
      activities: [
        {
          id: 'concessao',
          label: 'Concessão do CAT',
          text: 'Consultar a Resolução 916/2022 e o procedimento SENATRAN. CAT não é o mesmo documento que CSV nem substitui homologações ambientais.',
          refs: ['contran-916-2022'],
          recordIds: ['senatran-095'],
        },
        {
          id: 'mudancas',
          label: 'Mudanças e extensões',
          text: 'Conferir como alterações de configuração afetam o código e as comprovações. Retornar às frentes técnicas quando necessário.',
          refs: ['contran-916-2022'],
          recordIds: ['senatran-095'],
          gaps: ['Classificar alterações do projeto e o procedimento aplicável caso a caso.'],
        },
      ],
    },
    {
      id: 'producao',
      number: '06',
      label: 'Produção e liberação',
      short: 'Configuração aprovada e circulação',
      icon: '⚙',
      tone: 'approval',
      x: 1225,
      y: 410,
      w: 145,
      h: 140,
      purpose:
        'Manter a configuração e as responsabilidades após a aprovação e distinguir liberação da produção de registro/licenciamento.',
      outputs: [
        'Registros de produção e configuração',
        'Documentos para registro e circulação, conforme o caso',
      ],
      activities: [
        {
          id: 'configuracao',
          label: 'Produção conforme o tipo',
          text: 'Manter a conformidade da configuração produzida e os registros do fabricante; a aprovação não elimina controles posteriores.',
          recordIds: ['senatran-095'],
          refs: ['contran-916-2022'],
        },
        {
          id: 'circulacao',
          label: 'Registro, placa e licenciamento',
          text: 'Consultar as exigências para registro, identificação externa e circulação. CAT, placa e licenciamento cumprem funções diferentes.',
          recordIds: ['senatran-124'],
          refs: ['contran-969-2022'],
        },
      ],
    },
    {
      id: 'cop',
      number: '07',
      label: 'COP / Conformidade de produção',
      short: 'Planejada no projeto · executada na produção',
      icon: '↻',
      tone: 'production',
      x: 540,
      y: 580,
      w: 830,
      h: 105,
      purpose:
        'Confrontar a produção com a configuração aprovada e tratar desvios e mudanças. O plano de controle começa no projeto.',
      outputs: [
        'Plano e registros de controle',
        'Amostragens e resultados',
        'Ações sobre desvios e mudanças',
      ],
      activities: [
        {
          id: 'cat',
          label: 'Conformidade vinculada ao CAT',
          text: 'Consultar a responsabilidade do fabricante pela produção e a possibilidade de verificação/amostragem posterior à concessão do CAT.',
          recordIds: ['senatran-095'],
        },
        {
          id: 'acp',
          label: 'ACP Ibama — veículos leves',
          text: 'Consultar o sistema de Avaliação de Conformidade de Produção. A IN 5/2024 tem recorte de leves/motos; não foi convertida em ACP universal de pesados P8.',
          refs: ['ibama-in-5-2024'],
          powertrains: ['combustao', 'hibrido'],
          gaps: [
            'Conferir escopo, amostragem, ensaios e exigências da configuração; a cadeia completa de COP de pesados ainda não foi fechada.',
          ],
        },
        {
          id: 'certificados',
          label: 'Manutenção da conformidade de produtos',
          text: 'Verificar as condições de manutenção de certificados e declarações de cada produto, sem confundir esses controles com ACP de veículo.',
          refs: ['inmetro-200-2021', 'inmetro-140-2021', 'anatel-res715'],
          gaps: ['Planos de manutenção dependem do mecanismo e regulamento específico.'],
        },
        {
          id: 'uso',
          label: 'Controles em uso — distintos de COP',
          text: 'ISC de pesados e desempenho de monitores OBD/IUMPR são controles em uso. Eles não foram apresentados como o mesmo processo de conformidade de produção.',
          refs: ['ibama-in-20-2020', 'ibama-in-18-2023', 'ibama-in-16-2025', 'ibama-in-20-2025'],
          powertrains: ['combustao', 'hibrido'],
        },
        {
          id: 'desvios',
          label: 'Desvios, correções e mudanças',
          text: 'Registrar desvio, investigar causa e avaliar correção, repetição de ensaio e atualização da aprovação quando necessárias.',
          recordIds: ['senatran-095'],
          refs: ['contran-916-2022'],
          gaps: [
            'Procedimento de decisão e responsáveis por mudanças devem ser definidos para o projeto.',
          ],
        },
      ],
    },
  ],
  edges: [
    ['enquadramento', 'construcao', 'reading'],
    ['construcao', 'preparacao', 'reading'],
    ['preparacao', 'coastdown', 'parallel'],
    ['preparacao', 'seguranca', 'parallel'],
    ['preparacao', 'componentes', 'parallel'],
    ['coastdown', 'laboratorio', 'reading'],
    ['laboratorio', 'aprovacoes', 'reading'],
    ['aprovacoes', 'dossie', 'converge'],
    ['seguranca', 'dossie', 'converge'],
    ['componentes', 'dossie', 'converge'],
    ['dossie', 'cat', 'reading'],
    ['cat', 'producao', 'reading'],
    ['producao', 'cop', 'production'],
    ['cop', 'construcao', 'feedback'],
    ['cop', 'dossie', 'feedback'],
  ],
};
const HomologationFlow = {
  stage(id) {
    return homologationFlowSpec.stages.find((s) => s.id === id);
  },
  activities(stage, powertrain = 'todos') {
    return stage.activities.filter(
      (a) => powertrain === 'todos' || !a.powertrains || a.powertrains.includes(powertrain),
    );
  },
  references(activity, records, powertrain = 'todos') {
    return [
      ...new Map(
        records
          .filter(
            (r) =>
              ((activity.refs || []).includes(r.regulatoryId) ||
                (activity.recordIds || []).includes(r.id)) &&
              (powertrain === 'todos' ||
                !activity.referencePowertrains?.[r.regulatoryId] ||
                activity.referencePowertrains[r.regulatoryId].includes(powertrain)),
          )
          .map((r) => [r.regulatoryId || r.id, r]),
      ).values(),
    ];
  },
};
if (typeof module !== 'undefined') module.exports = { homologationFlowSpec, HomologationFlow };

const homologationSourceOverrides = {
  'senatran-095': {
    officialUrl:
      'https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria9902022R.pdf',
    reviewDate: '2026-10-18',
    availability:
      'PDF oficial conferido para os vínculos desta etapa; cadeia integral de alterações ainda não certificada.',
    uncertaintyNotes: [
      'A leitura dirigida confirma o vínculo a CAT, relatórios, laboratório e conformidade de produção. Não certifica a cadeia integral de vigência/alterações nem uma lista universal de documentos.',
    ],
  },
};
function enrichFlowCatalogRecord(record) {
  const update = homologationSourceOverrides[record.id];
  return update
    ? {
        ...record,
        ...update,
        uncertaintyNotes: [...(record.uncertaintyNotes || []), ...update.uncertaintyNotes],
      }
    : record;
}
if (typeof module !== 'undefined') Object.assign(module.exports, { homologationSourceOverrides });
