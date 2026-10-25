'use strict';

// Canonical IDs and labels mirror the existing 2D catalog. This is a visual
// navigation index, never an assertion of legal or geometric completeness.
// Exact source-region IDs are projected through the reviewed resolver; no rule
// is inferred from a mesh, an assembly label, or a shared taxonomy.
const CANONICAL_ROWS = [
  {
    id: 'vidros/vidros',
    label: 'Vidros e transparência',
    system: 'vidros',
    systemLabel: 'Vidros e visibilidade',
    assemblyId: 'glass',
    legacyParts: [
      'peca_02_vidro_lateral_dianteiro',
      'peca_03_parabrisa',
      'peca_04_vidro_lateral_superior',
      'peca_05_vidro_triangular_superior',
      'peca_06_vidro_traseiro',
      'peca_07_vidro_lateral_traseiro',
      'peca_18_vidro_lateral_inferior',
      'peca_19_vidro_porta_dianteira',
      'peca_20_vidro_porta_traseira',
    ],
    description:
      'Vidros de segurança e visibilidade; verificar posição, transparência, marcações e configuração.',
  },
  {
    id: 'vidros/limpadores',
    label: 'Limpadores e lavadores',
    system: 'vidros',
    systemLabel: 'Vidros e visibilidade',
    assemblyId: 'glass',
    legacyParts: ['peca_03_parabrisa'],
    description:
      'Limpadores e lavadores associados ao para-brisa; conferir a área e as condições do dispositivo.',
  },
  {
    id: 'vidros/janelas',
    label: 'Acionamento de janelas',
    system: 'vidros',
    systemLabel: 'Vidros e visibilidade',
    assemblyId: 'doors',
    legacyParts: ['peca_19_vidro_porta_dianteira', 'peca_20_vidro_porta_traseira'],
    description:
      'Acionamento das janelas e proteção dos ocupantes; distinguir vidro e mecanismo de acionamento.',
  },
  {
    id: 'pneus-rodas/pneus',
    label: 'Pneus e estepe',
    system: 'pneus-rodas',
    systemLabel: 'Pneus e rodas',
    assemblyId: 'wheels',
    legacyParts: ['peca_34_roda_dianteira', 'peca_36_roda_traseira'],
    description:
      'Pneus, estepe e marcações; conferir capacidades, uso, montagem original e reposição.',
  },
  {
    id: 'pneus-rodas/rodas',
    label: 'Rodas e requisitos',
    system: 'pneus-rodas',
    systemLabel: 'Pneus e rodas',
    assemblyId: 'wheels',
    legacyParts: ['peca_34_roda_dianteira', 'peca_36_roda_traseira'],
    description:
      'Rodas, capacidades e compatibilidade de montagem; o conjunto 3D não confirma dimensões ou especificações.',
  },
  {
    id: 'freios/frenagem',
    label: 'Frenagem, ABS e componentes',
    system: 'freios',
    systemLabel: 'Freios e estabilidade',
    assemblyId: 'brakes',
    legacyParts: ['peca_35_freio_dianteiro', 'peca_37_freio_traseiro'],
    description:
      'Frenagem, ABS e componentes; a evidência depende de categoria, configuração e exceções.',
  },
  {
    id: 'freios/estabilidade',
    label: 'Controle de estabilidade',
    system: 'freios',
    systemLabel: 'Freios e estabilidade',
    assemblyId: 'brakes',
    legacyParts: ['peca_35_freio_dianteiro', 'peca_37_freio_traseiro'],
    description:
      'Controle de estabilidade e seus sensores; conferir categoria, uso, configuração e datas.',
  },
  {
    id: 'freios/fluido',
    label: 'Fluido de freio',
    system: 'freios',
    systemLabel: 'Freios e estabilidade',
    assemblyId: 'brakeFluid',
    legacyParts: ['peca_35_freio_dianteiro', 'peca_37_freio_traseiro'],
    description:
      'Fluido, reservatório e circuito de freio; conferir produto, mecanismo de conformidade e aplicação.',
  },
  {
    id: 'iluminacao/dispositivos',
    label: 'Dispositivos e instalação',
    system: 'iluminacao',
    systemLabel: 'Iluminação e sinalização',
    assemblyId: 'lights',
    legacyParts: [
      'peca_12_farol_lado_oposto',
      'peca_13_farol_lado_visivel',
      'peca_15_lanterna_traseira_1',
      'peca_16_lanterna_traseira_2',
    ],
    description:
      'Dispositivos e instalação no veículo; posições, funções e condições dependem do enquadramento.',
  },
  {
    id: 'iluminacao/componentes',
    label: 'Componentes de iluminação',
    system: 'iluminacao',
    systemLabel: 'Iluminação e sinalização',
    assemblyId: 'lights',
    legacyParts: [
      'peca_12_farol_lado_oposto',
      'peca_13_farol_lado_visivel',
      'peca_15_lanterna_traseira_1',
      'peca_16_lanterna_traseira_2',
    ],
    description:
      'Componentes e fontes luminosas; não confundir certificação de produto e instalação no veículo.',
  },
  {
    id: 'ocupantes/cintos',
    label: 'Cintos, ancoragem e apoios',
    system: 'ocupantes',
    systemLabel: 'Proteção dos ocupantes',
    assemblyId: 'seats',
    legacyParts: ['peca_08_banco_traseiro', 'peca_09_bancos_dianteiros_console'],
    description:
      'Cintos, ancoragens e apoios; conferir posição de assento, categoria e configuração.',
  },
  {
    id: 'ocupantes/airbag',
    label: 'Airbags',
    system: 'ocupantes',
    systemLabel: 'Proteção dos ocupantes',
    assemblyId: 'airbag',
    legacyParts: ['peca_09_bancos_dianteiros_console'],
    description:
      'Airbags e retenção suplementar; a ilustração não determina obrigatoriedade ou quantidade.',
  },
  {
    id: 'ocupantes/criancas',
    label: 'Retenção infantil',
    system: 'ocupantes',
    systemLabel: 'Proteção dos ocupantes',
    assemblyId: 'seats',
    legacyParts: ['peca_08_banco_traseiro', 'peca_09_bancos_dianteiros_console'],
    description:
      'Retenção infantil e suas interfaces; a seleção do banco aponta o assunto e não comprova a instalação do dispositivo.',
  },
  {
    id: 'ocupantes/materiais',
    label: 'Materiais do habitáculo',
    system: 'ocupantes',
    systemLabel: 'Proteção dos ocupantes',
    assemblyId: 'seats',
    legacyParts: ['peca_08_banco_traseiro', 'peca_09_bancos_dianteiros_console'],
    description:
      'Materiais e revestimentos do habitáculo; as lacunas sobre espuma e métodos privados continuam explícitas.',
  },
  {
    id: 'carroceria/impactos',
    label: 'Impactos e pedestres',
    system: 'carroceria',
    systemLabel: 'Carroceria e proteção externa',
    assemblyId: 'body',
    legacyParts: [
      'peca_01_painel_teto',
      'peca_10_carroceria',
      'peca_11_capo',
      'peca_14_parachoque_dianteiro',
    ],
    description:
      'Impactos, estrutura e proteção de pedestres; o relatório é do veículo/configuração abrangidos pelo ato.',
  },
  {
    id: 'carroceria/fechaduras',
    label: 'Portas, dobradiças e fechaduras',
    system: 'carroceria',
    systemLabel: 'Carroceria e proteção externa',
    assemblyId: 'doors',
    legacyParts: ['peca_21_porta_dianteira', 'peca_22_porta_traseira'],
    description: 'Portas, dobradiças, retenção e fechaduras; conferir o conjunto e sua instalação.',
  },
  {
    id: 'carroceria/acessorios',
    label: 'Acessórios e proteção externa',
    system: 'carroceria',
    systemLabel: 'Carroceria e proteção externa',
    assemblyId: 'body',
    legacyParts: ['peca_17_parachoque_traseiro'],
    description:
      'Acessórios e proteção externa; não atribuir ao SUV uma regra de outra categoria por analogia.',
  },
  {
    id: 'retrovisores/espelhos',
    label: 'Espelhos e visão indireta',
    system: 'retrovisores',
    systemLabel: 'Retrovisores e visão traseira',
    assemblyId: 'mirrors',
    legacyParts: ['peca_23_retrovisor'],
    description:
      'Espelhos e visão indireta; classes e instalação dependem da categoria e do campo de visão.',
  },
  {
    id: 'retrovisores/monitoramento',
    label: 'Monitoramento traseiro',
    system: 'retrovisores',
    systemLabel: 'Retrovisores e visão traseira',
    assemblyId: 'mirrors',
    legacyParts: ['peca_23_retrovisor'],
    description:
      'Monitoramento traseiro, câmera e sensores; verificar escopo, configuração e integração.',
  },
  {
    id: 'propulsao/emissoes',
    label: 'Emissões e ensaios',
    system: 'propulsao',
    systemLabel: 'Propulsão e emissões',
    assemblyId: 'engine',
    legacyParts: ['peca_24_motor_combustao_transmissao', 'peca_31_escapamento'],
    description:
      'Emissões, ensaios e pós-tratamento; separar LP/LC, pesados e PROMOT e manter o ramo térmico dos híbridos.',
    assemblyIds: ['engine', 'exhaust'],
  },
  {
    id: 'propulsao/eletrica',
    label: 'Propulsão elétrica e bateria',
    system: 'propulsao',
    systemLabel: 'Propulsão e emissões',
    assemblyId: 'motorElectric',
    legacyParts: ['peca_25_motor_eletrico_inversor_cabos', 'peca_26_bateria_tracao'],
    description:
      'Motor elétrico, inversor, cabos e bateria de tração; preservar diferenças de química, integração e procedimento.',
    assemblyIds: ['motorElectric', 'batteryHV'],
  },
  {
    id: 'propulsao/combustiveis',
    label: 'Combustíveis e eficiência',
    system: 'propulsao',
    systemLabel: 'Propulsão e emissões',
    assemblyId: 'tank',
    legacyParts: ['peca_30_tanque_tubo_combustivel'],
    description:
      'Tanque, alimentação e eficiência; emissões evaporativas, abastecimento e combustível exigem avaliação específica.',
  },
  {
    id: 'propulsao/componentes',
    label: 'Componentes do motor',
    system: 'propulsao',
    systemLabel: 'Propulsão e emissões',
    assemblyId: 'engine',
    legacyParts: ['peca_24_motor_combustao_transmissao'],
    description:
      'Motor e transmissão de exemplo; componentes, identificação e interfaces não comprovam a homologação do conjunto.',
    assemblyIds: ['engine'],
  },
  {
    id: 'eletronica/obd',
    label: 'Diagnóstico e OBD',
    system: 'eletronica',
    systemLabel: 'Eletrônica e comandos',
    assemblyId: 'electronics',
    legacyParts: ['peca_24_motor_combustao_transmissao', 'peca_31_escapamento'],
    description:
      'Diagnóstico, OBD e controles em uso; conferir fase ambiental, configuração e condições do procedimento.',
    assemblyIds: ['electronics', 'engine'],
  },
  {
    id: 'eletronica/imagens',
    label: 'Telas e imagens',
    system: 'eletronica',
    systemLabel: 'Eletrônica e comandos',
    assemblyId: 'electronics',
    legacyParts: [],
    description:
      'Telas e imagens no habitáculo; a presença de uma central no modelo não cria uma associação legal específica revisada.',
  },
  {
    id: 'eletronica/comandos',
    label: 'Comandos, sinal sonoro e outros',
    system: 'eletronica',
    systemLabel: 'Eletrônica e comandos',
    assemblyId: 'electronics',
    legacyParts: ['peca_28_chicote_eletrico'],
    description:
      'Comandos, sinal sonoro e chicote; a lacuna do chicote não deve ser preenchida com regras de rádio ou bateria.',
  },
  {
    id: 'identificacao/placas',
    label: 'Placas de identificação',
    system: 'identificacao',
    systemLabel: 'Identificação do veículo',
    assemblyId: 'vin',
    legacyParts: [],
    description:
      'Placas de identificação; a marca visual é um acesso ao assunto e não uma comprovação de conformidade da placa.',
  },
  {
    id: 'identificacao/vin',
    label: 'Identificação e marcações',
    system: 'identificacao',
    systemLabel: 'Identificação do veículo',
    assemblyId: 'vin',
    legacyParts: ['peca_10_carroceria'],
    description:
      'VIN e marcações: a posição física não foi identificada na prancha original; o vínculo permanece contexto do veículo.',
  },
  {
    id: 'identificacao/rotulagem',
    label: 'Rotulagem e informação',
    system: 'identificacao',
    systemLabel: 'Identificação do veículo',
    assemblyId: 'vin',
    legacyParts: [],
    description:
      'Etiquetas e informação ao usuário; finalidade, conteúdo, fonte e escopo devem ser verificados separadamente.',
  },
  {
    id: 'chassi/componentes',
    label: 'Componentes de suspensão e direção',
    system: 'chassi',
    systemLabel: 'Suspensão e direção',
    assemblyId: 'chassis',
    legacyParts: ['peca_32_suspensao_dianteira_direcao', 'peca_33_suspensao_traseira'],
    description:
      'Suspensão dianteira, traseira e direção; componentes e interfaces devem ser avaliados para a configuração real.',
    assemblyIds: ['chassis', 'steering'],
  },
];

const NAVIGATION_ANCHORS = {
  'vidros/vidros': [-0.88, 1.28, 0.38],
  'vidros/limpadores': [-1.0, 1.12, 0.2],
  'vidros/janelas': [-0.3, 1.2, 0.96],
  'pneus-rodas/pneus': [-1.58, 0.39, 1.05],
  'pneus-rodas/rodas': [-1.58, 0.39, 1.01],
  'freios/frenagem': [-1.58, 0.4, 0.88],
  'freios/estabilidade': [-1.15, 0.68, 0.36],
  'freios/fluido': [-1.12, 0.93, 0.42],
  'iluminacao/dispositivos': [-2.23, 0.86, 0.66],
  'iluminacao/componentes': [-2.23, 0.86, 0.66],
  'ocupantes/cintos': [-0.05, 0.97, 0.52],
  'ocupantes/airbag': [-0.4, 1.08, 0.4],
  'ocupantes/criancas': [0.85, 0.9, 0.43],
  'ocupantes/materiais': [0.1, 0.98, 0.48],
  'carroceria/impactos': [0.6, 1.4, 0.86],
  'carroceria/fechaduras': [-0.2, 0.87, 1.02],
  'carroceria/acessorios': [2.25, 0.52, 0.65],
  'retrovisores/espelhos': [-0.65, 1.15, 1.08],
  'retrovisores/monitoramento': [2.28, 1.08, 0],
  'propulsao/emissoes': [-1.5, 0.73, 0],
  'propulsao/eletrica': [0.1, 0.42, -0.36],
  'propulsao/combustiveis': [1.08, 0.32, -0.28],
  'propulsao/componentes': [-1.5, 0.73, 0],
  'eletronica/obd': [-0.45, 0.84, 0.37],
  'eletronica/imagens': [-0.48, 1.08, 0],
  'eletronica/comandos': [-0.4, 1.08, 0.4],
  'identificacao/placas': [-2.46, 0.52, 0],
  'identificacao/vin': [0.18, 1.3, 0.98],
  'identificacao/rotulagem': [0.18, 1.04, 0.98],
  'chassi/componentes': [-1.5, 0.45, 0.58],
  'visual/arrefecimento': [-2.12, 0.65, 0],
  'visual/bateria-12v': [-1.6, 0.78, -0.5],
  'visual/powertrain-hibrido': [-0.75, 0.62, 0],
};

const BOARD_LAYOUTS = {
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
const SPECIAL_ART = {
  'propulsao/emissoes': { asset: 'assets/escapamento.webp', columns: 1, rows: 1 },
  'propulsao/eletrica': { asset: 'assets/bateria.webp', columns: 1, rows: 1 },
  'propulsao/combustiveis': { asset: 'assets/tanque.webp', columns: 1, rows: 1 },
  'propulsao/componentes': { asset: 'assets/motor.webp', columns: 1, rows: 1 },
};
const COMMON_HINTS = [
  'Categoria, configuração, uso e datas exigem avaliação de aplicabilidade.',
  'A geometria de exemplo não substitui a revisão da fonte nem comprova homologação.',
];
function referenceArt(row, index) {
  const board = SPECIAL_ART[row.id] || BOARD_LAYOUTS[row.system];
  const cell = SPECIAL_ART[row.id] ? 0 : index;
  const width = 1536 / board.columns;
  const height = 1024 / board.rows;
  return {
    ...board,
    index: cell,
    x: (cell % board.columns) * width,
    y: Math.floor(cell / board.columns) * height,
    width,
    height,
    sourceWidth: 1536,
    sourceHeight: 1024,
  };
}
const offsets = new Map();
const SUBSYSTEMS = CANONICAL_ROWS.map((row) => {
  const index = offsets.get(row.system) || 0;
  offsets.set(row.system, index + 1);
  const art = referenceArt(row, index);
  const hints = [...COMMON_HINTS];
  if (row.id === 'propulsao/emissoes')
    hints.unshift(
      'BEV não recebe ensaios de escapamento de motor térmico; isso não comprova dispensa ambiental.',
    );
  if (row.id === 'propulsao/eletrica')
    hints.unshift(
      'Bateria de tração não herda automaticamente o RAC de bateria chumbo-ácido de baixa tensão.',
    );
  if (row.id === 'ocupantes/materiais')
    hints.unshift(
      'As normas privadas específicas de espuma/banco não foram verificadas integralmente no acervo.',
    );
  return Object.freeze({
    ...row,
    canonical: true,
    anchor: Object.freeze(NAVIGATION_ANCHORS[row.id]),
    anchorKind: 'consultative_navigation',
    preferredLegacyPartId: row.legacyParts[0] || null,
    assemblyIds: Object.freeze(row.assemblyIds || [row.assemblyId]),
    legacyParts: Object.freeze(row.legacyParts),
    subsystemIds: Object.freeze([row.id]),
    referenceAsset: art.asset,
    referenceViewport: Object.freeze(art),
    referenceArt: Object.freeze(art),
    applicabilityHints: Object.freeze(hints),
  });
});

// These are explicitly visual examples, not new regulatory taxonomy or proof
// that a production BMW version contains this teaching configuration.
const SUPPLEMENTAL_SUBSYSTEMS = [
  {
    id: 'visual/arrefecimento',
    label: 'Arrefecimento: radiador e ventilador',
    system: 'propulsao',
    systemLabel: 'Propulsão e emissões',
    assemblyId: 'cooling',
    assemblyIds: ['cooling'],
    legacyParts: ['peca_29_radiador'],
    subsystemIds: [],
    referenceAsset: 'assets/vehicle-vector/previews/peca_29_radiador.webp',
    description:
      'Radiador e ventilador de exemplo, conforme a imagem 2D original. O vínculo específico no acervo permanece uma lacuna.',
    applicabilityHints: [
      'Não preencher a lacuna de arrefecimento com regras de emissões, catalisador ou bateria.',
    ],
  },
  {
    id: 'visual/bateria-12v',
    label: 'Bateria auxiliar de 12 V',
    system: 'eletronica',
    systemLabel: 'Eletrônica e comandos',
    assemblyId: 'battery12v',
    assemblyIds: ['battery12v'],
    legacyParts: ['peca_27_bateria_12v'],
    subsystemIds: ['eletronica/comandos'],
    referenceAsset: 'assets/vehicle-vector/previews/peca_27_bateria_12v.webp',
    description:
      'Bateria auxiliar de exemplo. Requisitos de chumbo-ácido dependem da química e não são transferidos à bateria de tração.',
    applicabilityHints: ['Conferir química, produto, mercado e escopo do mecanismo de avaliação.'],
  },
  {
    id: 'visual/powertrain-hibrido',
    label: 'Powertrain híbrido de exemplo',
    system: 'propulsao',
    systemLabel: 'Propulsão e emissões',
    assemblyId: 'motorElectric',
    assemblyIds: ['engine', 'motorElectric', 'batteryHV'],
    legacyParts: [
      'peca_24_motor_combustao_transmissao',
      'peca_25_motor_eletrico_inversor_cabos',
      'peca_26_bateria_tracao',
    ],
    subsystemIds: ['propulsao/componentes', 'propulsao/emissoes', 'propulsao/eletrica'],
    referenceAsset: 'assets/bateria.webp',
    description:
      'Exemplo didático de integração entre motor térmico, motor elétrico/inversor e bateria de tração; não é uma ficha de homologação de uma versão BMW.',
    applicabilityHints: [
      'HEV e PHEV mantêm o ramo térmico pertinente e procedimentos próprios. A ilustração não define família, fase ou licença.',
    ],
  },
].map((row) =>
  Object.freeze({
    ...row,
    canonical: false,
    anchor: Object.freeze(NAVIGATION_ANCHORS[row.id]),
    anchorKind: 'consultative_navigation',
    preferredLegacyPartId: row.legacyParts[0] || null,
    exampleOnly: true,
    legacyParts: Object.freeze(row.legacyParts),
    assemblyIds: Object.freeze(row.assemblyIds),
    subsystemIds: Object.freeze(row.subsystemIds),
    applicabilityHints: Object.freeze([...row.applicabilityHints, ...COMMON_HINTS]),
  }),
);

const ALL_SUBSYSTEMS = Object.freeze([...SUBSYSTEMS, ...SUPPLEMENTAL_SUBSYSTEMS]);
function subsystemSelection(id) {
  const row = ALL_SUBSYSTEMS.find((item) => item.id === id);
  if (!row) return null;
  return {
    id: row.assemblyId,
    assemblyId: row.assemblyId,
    anchor: [...row.anchor],
    anchorKind: row.anchorKind,
    preferredLegacyPartId: row.preferredLegacyPartId,
    assemblyIds: [...row.assemblyIds],
    subsystemId: row.id,
    subsystemIds: [...row.subsystemIds],
    label: row.label,
    system: row.system,
    taxonomy: row.canonical ? row.id : row.subsystemIds[0] || row.system,
    legacyParts: [...row.legacyParts],
    legacyPartIds: [...row.legacyParts],
    legacyPart: row.preferredLegacyPartId || null,
    description: row.description,
    referenceAsset: row.referenceAsset,
    referenceArt: row.referenceArt ? { ...row.referenceArt } : null,
    referenceViewport: row.referenceViewport ? { ...row.referenceViewport } : null,
    applicabilityHints: [...row.applicabilityHints],
    canonical: row.canonical,
    exampleOnly: Boolean(row.exampleOnly),
  };
}
function subsystemsForAssembly(assemblyId) {
  return ALL_SUBSYSTEMS.filter((row) => row.assemblyIds.includes(assemblyId));
}
function coverageReport(identified = ALL_SUBSYSTEMS) {
  const ids = new Set(identified.map((item) => (typeof item === 'string' ? item : item.id)));
  const expected = SUBSYSTEMS.map((row) => row.id);
  const supported = new Set(ALL_SUBSYSTEMS.map((row) => row.id));
  const missing = expected.filter((id) => !ids.has(id));
  const supplemental = SUPPLEMENTAL_SUBSYSTEMS.filter((row) => ids.has(row.id)).map(
    (row) => row.id,
  );
  return {
    systems: new Set(SUBSYSTEMS.map((row) => row.system)).size,
    expected: expected.length,
    originalTotal: expected.length,
    total: ids.size,
    covered: expected.length - missing.length,
    supplemental: supplemental.length,
    supplementalIds: supplemental,
    missing,
    unrecognized: [...ids].filter((id) => !supported.has(id)),
    complete: missing.length === 0,
    note: 'Cobertura de identificação e navegação do acervo, não completude jurídica ou dimensional do modelo.',
  };
}

if (typeof module !== 'undefined')
  module.exports = {
    SUBSYSTEMS,
    SUPPLEMENTAL_SUBSYSTEMS,
    ALL_SUBSYSTEMS,
    coverageReport,
    subsystemSelection,
    subsystemsForAssembly,
  };
