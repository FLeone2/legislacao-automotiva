'use strict';
const vehicleVector =
  typeof module !== 'undefined' ? require('./src/core/vehicle-vector.js') : VehicleVector;
// These links reference the repository's catalogue, never ASA part numbers.
// Overview paths follow the original 1536x1024 illustration's visible silhouettes.
// Geometry is simplified to subpixel tolerance; the image and SVG share the zoom transform.
const vehicleComponents = [
  {
    id: 'bancos',
    label: 'Bancos e ocupantes',
    short: 'Bancos',
    taxonomy: 'ocupantes',
    asset: 'assets/bancos.webp',
    crop: '530 190 430 325',
    path: '',
    lanes: [
      {
        id: 'seguranca',
        label: 'Segurança',
        topics: [
          {
            id: 'ancoragem',
            label: 'Ancoragem, cintos e apoios de cabeça',
            recordIds: ['senatran-061', 'senatran-058', 'senatran-074'],
            text: 'Referências de cintos, ancoragem, apoios de cabeça e aviso de não afivelamento já classificadas no acervo. Conferir objeto e anexos nas fontes.',
          },
          {
            id: 'materiais',
            label: 'Espuma, revestimento e inflamabilidade',
            recordIds: ['senatran-092'],
            text: 'O acervo associa materiais do habitáculo à referência de inflamabilidade. Isso não comprova requisitos específicos de composição, conforto ou durabilidade da espuma.',
            gaps: [
              'Normas ABNT NBR específicas de espuma e bancos ainda não cadastradas nem verificadas.',
            ],
          },
          {
            id: 'retencao',
            label: 'Proteção e retenção dos ocupantes',
            taxonomy: ['ocupantes/airbag', 'ocupantes/criancas'],
            text: 'Referências temáticas de proteção e retenção; confirmar categorias e condições.',
          },
        ],
      },
    ],
  },
  {
    id: 'motor',
    label: 'Motor e transmissão',
    short: 'Motor',
    taxonomy: 'propulsao',
    asset: 'assets/motor.webp',
    crop: '270 435 400 270',
    path: '',
    lanes: [
      {
        id: 'seguranca',
        label: 'Segurança e conformidade',
        topics: [
          {
            id: 'componentes',
            label: 'Componentes do motor',
            recordIds: ['inmetro-045'],
            text: 'Referência de conformidade de componentes do acervo. Verificar quais produtos e anexos efetivamente cobrem o componente em análise.',
            gaps: [
              'Requisitos de segurança do conjunto completo do motor não foram mapeados neste protótipo.',
            ],
          },
        ],
      },
      {
        id: 'ambiental',
        label: 'Ambiental',
        topics: [
          {
            id: 'gases',
            label: 'Emissões de gases e partículas',
            recordIds: ['ibama-042', 'senatran-069', 'ibama-021', 'ibama-026'],
            text: 'Referências de emissões e procedimentos já cadastradas. Conferir categoria, combustível, fase e datas de aplicação.',
          },
          {
            id: 'diagnostico',
            label: 'Diagnóstico de emissões — OBD',
            taxonomy: ['eletronica/obd'],
            text: 'O acervo ativo reúne exigências OBDBr-3 do recorte L8 e procedimentos de diferentes combustíveis. A fase está indicada em cada ato; a seleção visual não decide sua aplicabilidade.',
          },
          {
            id: 'catalisador',
            label: 'Catalisador e pós-tratamento',
            recordIds: ['inmetro-052'],
            text: 'Referência de conversores catalíticos de reposição, conforme classificação do acervo.',
          },
        ],
      },
    ],
  },
  {
    id: 'tanque',
    label: 'Tanque de combustível',
    short: 'Tanque',
    taxonomy: 'propulsao/combustiveis',
    asset: 'assets/tanque.webp',
    crop: null,
    path: '',
    lanes: [
      {
        id: 'seguranca',
        label: 'Segurança',
        topics: [
          {
            id: 'instalacao',
            label: 'Tanques e alteração de capacidade',
            recordIds: ['senatran-118'],
            text: 'Referência cadastrada sobre múltiplos tanques, tanque suplementar e alteração de capacidade. Não equivale à validação de todos os requisitos de um tanque original.',
            gaps: [
              'Demais requisitos de construção e instalação do tanque precisam de mapeamento específico.',
            ],
          },
        ],
      },
      {
        id: 'ambiental',
        label: 'Ambiental',
        topics: [
          {
            id: 'evaporativas',
            label: 'Emissões evaporativas e RVEP',
            recordIds: ['ibama-020', 'ibama-014'],
            text: 'Exigências L8 e atualização de procedimentos evaporativos. A IN 3/2023 referencia a IN 26/2020, cujo inteiro teor ainda não foi localizado.',
            gaps: [
              'Conferir o inteiro teor da IN Ibama 26/2020 antes de detalhar seu método de ensaio.',
            ],
          },
          {
            id: 'canister',
            label: 'Cânister e circuito de vapores',
            recordIds: ['ibama-029', 'ibama-025'],
            text: 'Assunto físico para navegação. O controle de purga e de emissões evaporativas está vinculado às normas ambientais relacionadas. Requisitos construtivos específicos do cânister ainda precisam de mapeamento.',
            gaps: ['Mapear requisitos específicos do cânister, válvulas e linhas de vapor.'],
          },
        ],
      },
    ],
  },
  {
    id: 'freios',
    label: 'Freios e estabilidade',
    short: 'Freios',
    taxonomy: 'freios',
    crop: '740 720 170 210',
    path: '',
  },
  {
    id: 'chassi',
    label: 'Suspensão e direção',
    short: 'Suspensão',
    taxonomy: 'chassi',
    crop: '490 595 410 300',
    path: '',
  },
  {
    id: 'vidros',
    label: 'Vidros e visibilidade',
    short: 'Vidros',
    taxonomy: 'vidros',
    crop: '320 100 345 250',
    path: '',
  },
  {
    id: 'iluminacao',
    label: 'Iluminação e sinalização',
    short: 'Iluminação',
    taxonomy: 'iluminacao',
    crop: '320 748 210 100',
    path: '',
  },
  {
    id: 'carroceria',
    label: 'Carroceria e portas',
    short: 'Carroceria',
    taxonomy: 'carroceria',
    crop: '785 30 560 370',
    path: '',
  },
  {
    id: 'retrovisores',
    label: 'Retrovisores e visão traseira',
    short: 'Retrovisores',
    taxonomy: 'retrovisores',
    crop: '1120 323 120 97',
    path: '',
  },
  {
    id: 'pneus-rodas',
    label: 'Pneus e rodas',
    short: 'Rodas',
    taxonomy: 'pneus-rodas',
    crop: '860 747 225 235',
    path: '',
  },
  {
    id: 'eletrica',
    label: 'Elétrica e comandos',
    short: 'Elétrica',
    taxonomy: 'eletronica',
    crop: '560 452 200 157',
    path: '',
  },
  {
    id: 'escapamento',
    label: 'Escapamento e emissões',
    short: 'Escapamento',
    taxonomy: 'propulsao/emissoes',
    crop: '716 496 480 190',
    path: '',
  },
];
const ComponentFlow = {
  component(id) {
    return vehicleComponents.find((c) => c.id === id);
  },
  topics(component, hierarchy) {
    return (
      component.lanes || [
        {
          id: component.id === 'escapamento' ? 'ambiental' : 'seguranca',
          label: component.id === 'escapamento' ? 'Ambiental' : 'Segurança e conformidade',
          topics: (
            hierarchy.find((g) => g.id === component.taxonomy)?.children || [
              { id: component.taxonomy, label: component.label },
            ]
          ).map((c) => ({ id: c.id.split('/').pop(), label: c.label, taxonomy: [c.id] })),
        },
      ]
    );
  },
  records(topic, records) {
    return topic.recordIds
      ? records.filter((r) => topic.recordIds.includes(r.id))
      : records.filter((r) =>
          (topic.taxonomy || []).some((id) =>
            (r.taxonomy || []).some((t) => t === id || t.startsWith(id + '/')),
          ),
        );
  },
  unique(records) {
    return [...new Map(records.map((r) => [r.id, r])).values()];
  },
};
if (typeof module !== 'undefined') module.exports = { vehicleComponents, ComponentFlow };

// Graphic layout is deterministic and stored independently of regulatory records.
// SVG viewports expose each cluster without modifying the generated originals.
const subsystemBoards = {
  vidros: { asset: 'assets/vidros.webp', columns: 3, rows: 1 },
  'pneus-rodas': { asset: 'assets/pneus-rodas.webp', columns: 2, rows: 1 },
  freios: { asset: 'assets/freios.webp', columns: 3, rows: 1 },
  iluminacao: { asset: 'assets/iluminacao.webp', columns: 2, rows: 1 },
  ocupantes: { asset: 'assets/ocupantes.webp', columns: 2, rows: 2 },
  carroceria: { asset: 'assets/carroceria.webp', columns: 3, rows: 1 },
  retrovisores: { asset: 'assets/retrovisores.webp', columns: 2, rows: 1 },
  eletronica: { asset: 'assets/eletrica.webp', columns: 3, rows: 1 },
  identificacao: { asset: 'assets/identificacao.webp', columns: 3, rows: 1 },
  chassi: { asset: 'assets/chassi.webp', columns: 1, rows: 1 },
};
const specialSubsystemArt = {
  'propulsao/emissoes': { asset: 'assets/escapamento.webp', columns: 1, rows: 1, index: 0 },
  'propulsao/eletrica': { asset: 'assets/bateria.webp', columns: 1, rows: 1, index: 0 },
  'propulsao/combustiveis': { asset: 'assets/tanque.webp', columns: 1, rows: 1, index: 0 },
  'propulsao/componentes': { asset: 'assets/motor.webp', columns: 1, rows: 1, index: 0 },
};
const componentIllustrations = {
  freios: 'freios',
  chassi: 'chassi',
  vidros: 'vidros',
  iluminacao: 'iluminacao',
  carroceria: 'carroceria',
  retrovisores: 'retrovisores',
  'pneus-rodas': 'pneus-rodas',
  eletrica: 'eletrica',
  escapamento: 'escapamento',
  bateria: 'bateria',
  identificacao: 'identificacao',
};
vehicleComponents.push(
  {
    id: 'bateria',
    label: 'Propulsão elétrica e bateria',
    short: 'Bateria',
    taxonomy: 'propulsao/eletrica',
    asset: 'assets/bateria.webp',
    path: '',
  },
  {
    id: 'identificacao',
    label: 'Identificação e marcações',
    short: 'Identificação',
    taxonomy: 'identificacao',
    asset: 'assets/identificacao.webp',
    path: '',
  },
);
for (const c of vehicleComponents) {
  if (componentIllustrations[c.id]) c.asset = `assets/${componentIllustrations[c.id]}.webp`;
}
ComponentFlow.subsystems = function (c, hierarchy) {
  const group = hierarchy.find(
    (g) => g.physical && (g.id === c.taxonomy || g.children.some((s) => s.id === c.taxonomy)),
  );
  return group
    ? group.children
        .filter((s) => c.taxonomy === group.id || s.id === c.taxonomy)
        .map((s) => ({ id: s.id, label: s.label, system: group.id }))
    : [];
};
ComponentFlow.art = function (subsystem, hierarchy) {
  const group = hierarchy.find((g) => g.id === subsystem.system);
  const board = specialSubsystemArt[subsystem.id] || subsystemBoards[subsystem.system];
  if (!board) return null;
  const index = board.index ?? group.children.findIndex((s) => s.id === subsystem.id),
    w = 1536 / board.columns,
    h = 1024 / board.rows;
  return {
    ...board,
    index,
    x: (index % board.columns) * w,
    y: Math.floor(index / board.columns) * h,
    width: w,
    height: h,
  };
};
ComponentFlow.subsystemLanes = function (c, subsystem) {
  const id = subsystem.id,
    topic = { id: id.split('/')[1], label: subsystem.label, taxonomy: [id] };
  const gap =
    'Referências deste ramo ainda não estão associadas ao subsistema no acervo. Pesquisa e validação pendentes.';
  if (id === 'ocupantes/materiais') {
    topic.text =
      'Associação temática de materiais do habitáculo. O acervo não confirma requisitos específicos de espuma.';
    topic.gaps = [
      'Normas ABNT NBR específicas de espuma e bancos ainda não cadastradas nem verificadas.',
    ];
  }
  if (id === 'propulsao/combustiveis')
    return [
      {
        id: 'seguranca',
        label: 'Segurança',
        topics: [
          {
            ...topic,
            recordIds: ['senatran-118'],
            text: 'Tanques, alteração de capacidade e condições específicas do ato. Conferir fonte e enquadramento.',
          },
        ],
      },
      {
        id: 'ambiental',
        label: 'Ambiental e eficiência',
        topics: [
          {
            ...topic,
            recordIds: ['mover-007', 'mover-008', 'ibama-014'],
            text: 'Combustíveis, eficiência e emissões já classificados neste assunto. Não são requisitos exclusivos do tanque.',
          },
        ],
      },
    ];
  if (id === 'propulsao/eletrica')
    return [
      { id: 'seguranca', label: 'Segurança e conformidade', topics: [topic] },
      {
        id: 'ambiental',
        label: 'Ambiental',
        topics: [
          {
            id: 'ambiental',
            label: 'Bateria: ciclo de vida e destinação',
            recordIds: [],
            gaps: [gap],
          },
        ],
      },
    ];
  const environmental = ['propulsao/emissoes', 'eletronica/obd'].includes(id);
  return [
    {
      id: environmental ? 'ambiental' : 'seguranca',
      label: environmental ? 'Ambiental' : 'Segurança e conformidade',
      topics: [topic],
    },
  ];
};
const originalTopics = ComponentFlow.topics;
ComponentFlow.topics = function (c, hierarchy) {
  if (c.lanes) return originalTopics.call(this, c, hierarchy);
  const lanes = new Map();
  for (const sub of this.subsystems(c, hierarchy))
    for (const lane of this.subsystemLanes(c, sub)) {
      if (!lanes.has(lane.id)) lanes.set(lane.id, { ...lane, topics: [] });
      lanes.get(lane.id).topics.push(...lane.topics);
    }
  return [...lanes.values()];
};
ComponentFlow.coverage = function (hierarchy) {
  const expected = hierarchy.filter((g) => g.physical).flatMap((g) => g.children.map((s) => s.id));
  const covered = new Set(
    vehicleComponents.flatMap((c) => this.subsystems(c, hierarchy).map((s) => s.id)),
  );
  return {
    systems: hierarchy.filter((g) => g.physical).length,
    total: expected.length,
    covered: expected.filter((id) => covered.has(id)).length,
    missing: expected.filter((id) => !covered.has(id)),
  };
};
if (typeof module !== 'undefined')
  Object.assign(module.exports, { subsystemBoards, specialSubsystemArt });

// One supplied silhouette drives every drawing interaction and the related system route.
const vehiclePrimaryParts = {
  bancos: 'peca_09_bancos_dianteiros_console',
  motor: 'peca_24_motor_combustao_transmissao',
  tanque: 'peca_30_tanque_tubo_combustivel',
  freios: 'peca_35_freio_dianteiro',
  chassi: 'peca_32_suspensao_dianteira_direcao',
  vidros: 'peca_03_parabrisa',
  iluminacao: 'peca_13_farol_lado_visivel',
  carroceria: 'peca_10_carroceria',
  retrovisores: 'peca_23_retrovisor',
  'pneus-rodas': 'peca_34_roda_dianteira',
  eletrica: 'peca_27_bateria_12v',
  escapamento: 'peca_31_escapamento',
  bateria: 'peca_26_bateria_tracao',
};
for (const component of vehicleComponents) {
  component.mapParts = vehicleVector.parts.filter((part) => part.componentId === component.id);
  component.path = component.mapParts.map((part) => part.path).join(' ');
  component.external = component.mapParts.length === 0;
  component.overviewAsset = component.mapParts.find(
    (part) => part.id === vehiclePrimaryParts[component.id],
  )?.asset;
}
