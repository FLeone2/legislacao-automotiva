// Navigation IDs, not engineering part numbers or legal applicability claims.
export const PARTS = [
  {
    id: 'body',
    label: 'Carroceria',
    system: 'carroceria',
    taxonomy: 'carroceria',
    description:
      'Estrutura, proteção externa, impactos e proteção de pedestres. Conferir categoria, datas e configuração.',
    legacyPart: 'peca_10_carroceria',
  },
  {
    id: 'doors',
    label: 'Portas e fechaduras',
    system: 'carroceria',
    taxonomy: 'carroceria/portas',
    description:
      'Retenção de portas, dobradiças e fechaduras. O conjunto final e sua instalação também precisam ser avaliados.',
    legacyPart: 'peca_21_porta_dianteira',
  },
  {
    id: 'glass',
    label: 'Vidros e visibilidade',
    system: 'vidros',
    taxonomy: 'vidros',
    description:
      'Vidros de segurança, visibilidade, transparência e marcações. Distinguir certificação do produto e instalação no veículo.',
    legacyPart: 'peca_03_parabrisa',
  },
  {
    id: 'seats',
    label: 'Bancos, cintos e ancoragens',
    system: 'bancos',
    taxonomy: 'ocupantes',
    description:
      'Bancos, cintos, ancoragens, apoios de cabeça e materiais internos. Aplicação depende da categoria e da posição de assento.',
    legacyPart: 'peca_09_bancos_dianteiros_console',
  },
  {
    id: 'airbag',
    label: 'Airbags e retenção',
    system: 'bancos',
    taxonomy: 'ocupantes/airbag',
    description:
      'Proteção dos ocupantes e sistemas suplementares de retenção. A representação visual não determina obrigatoriedade.',
  },
  {
    id: 'chassis',
    label: 'Chassi e suspensão',
    system: 'chassi',
    taxonomy: 'chassi',
    description:
      'Estrutura inferior, suspensão, capacidades e geometria do veículo. O desenho é esquemático e não contém dimensões de projeto.',
    legacyPart: 'peca_33_suspensao_traseira',
  },
  {
    id: 'steering',
    label: 'Direção e comandos',
    system: 'chassi',
    taxonomy: 'chassi',
    description:
      'Direção, articulações e comandos. Consulte requisitos do sistema e as condições do veículo completo.',
    legacyPart: 'peca_32_suspensao_dianteira_direcao',
  },
  {
    id: 'wheels',
    label: 'Pneus e rodas',
    system: 'pneus-rodas',
    taxonomy: 'pneus-rodas',
    description:
      'Pneus, rodas, capacidades, compatibilidade e marcações. OEM e reposição podem ter tratamentos distintos.',
    legacyPart: 'peca_34_roda_dianteira',
  },
  {
    id: 'brakes',
    label: 'Freios e estabilidade',
    system: 'freios',
    taxonomy: 'freios',
    description:
      'Frenagem, ABS, estabilidade e componentes. O relatório de veículo completo depende do enquadramento e das condições do ato.',
    legacyPart: 'peca_35_freio_dianteiro',
  },
  {
    id: 'engine',
    label: 'Motor a combustão',
    system: 'motor',
    taxonomy: 'propulsao/emissoes',
    description:
      'Motor térmico, emissões e diagnóstico. Separar PROCONVE leves, pesados e PROMOT e conservar o ramo térmico de híbridos.',
    legacyPart: 'peca_24_motor_combustao_transmissao',
  },
  {
    id: 'motorElectric',
    label: 'Motor elétrico e inversor',
    system: 'bateria',
    taxonomy: 'propulsao/eletrica',
    description:
      'Propulsão elétrica, inversor e integração de alta tensão. Não transferir regras de baterias chumbo-ácido à tração elétrica.',
    legacyPart: 'peca_25_motor_eletrico_inversor_cabos',
  },
  {
    id: 'exhaust',
    label: 'Escapamento e pós-tratamento',
    system: 'escapamento',
    taxonomy: 'propulsao/emissoes',
    description:
      'Emissões, ruído e pós-tratamento. Um catalisador de reposição não equivale à homologação ambiental do veículo.',
    legacyPart: 'peca_31_escapamento',
  },
  {
    id: 'tank',
    label: 'Tanque e circuito de combustível',
    system: 'tanque',
    taxonomy: 'propulsao/combustiveis',
    description:
      'Armazenamento e alimentação de combustível; avaliar evaporação e reabastecimento no recorte pertinente.',
    legacyPart: 'peca_30_tanque_tubo_combustivel',
  },
  {
    id: 'batteryHV',
    label: 'Bateria de tração',
    system: 'bateria',
    taxonomy: 'propulsao/eletrica',
    description:
      'Armazenamento de energia de tração, alta tensão e integração. O acervo pode ter lacunas específicas.',
    legacyPart: 'peca_26_bateria_tracao',
  },
  {
    id: 'battery12v',
    label: 'Bateria de baixa tensão',
    system: 'eletrica',
    taxonomy: 'eletronica',
    description:
      'Alimentação auxiliar. A incidência de referências de baterias chumbo-ácido depende da química e do escopo do produto.',
    legacyPart: 'peca_27_bateria_12v',
  },
  {
    id: 'lights',
    label: 'Iluminação e sinalização',
    system: 'iluminacao',
    taxonomy: 'iluminacao',
    description:
      'Dispositivos, fontes luminosas e instalação. Distinguir certificação de componentes e requisitos de instalação.',
    legacyPart: 'peca_13_farol_lado_visivel',
  },
  {
    id: 'mirrors',
    label: 'Retrovisores e visão indireta',
    system: 'retrovisores',
    taxonomy: 'retrovisores',
    description:
      'Espelhos e dispositivos de visão indireta. Categoria e configuração influenciam classes e instalação.',
    legacyPart: 'peca_23_retrovisor',
  },
  {
    id: 'electronics',
    label: 'Eletrônica e conectividade',
    system: 'eletrica',
    taxonomy: 'eletronica',
    description:
      'Centrais, conectividade, diagnóstico e rádios. A homologação Anatel depende do produto, da função e da integração.',
    legacyPart: 'peca_28_chicote_eletrico',
  },
  {
    id: 'vin',
    label: 'VIN e identificação',
    system: 'identificacao',
    taxonomy: 'identificacao',
    description:
      'Identificação veicular, gravações e marcações. A etiqueta visível no modelo indica apenas um assunto de consulta.',
  },
];

// Visual assemblies aggregate only the original, explicitly reviewed source regions.
const assemblySources = {
  body: [
    'peca_10_carroceria',
    'peca_01_painel_teto',
    'peca_11_capo',
    'peca_14_parachoque_dianteiro',
    'peca_17_parachoque_traseiro',
  ],
  doors: ['peca_21_porta_dianteira', 'peca_22_porta_traseira'],
  glass: [
    'peca_03_parabrisa',
    'peca_02_vidro_lateral_dianteiro',
    'peca_04_vidro_lateral_superior',
    'peca_05_vidro_triangular_superior',
    'peca_06_vidro_traseiro',
    'peca_07_vidro_lateral_traseiro',
    'peca_18_vidro_lateral_inferior',
    'peca_19_vidro_porta_dianteira',
    'peca_20_vidro_porta_traseira',
  ],
  seats: ['peca_09_bancos_dianteiros_console', 'peca_08_banco_traseiro'],
  wheels: ['peca_34_roda_dianteira', 'peca_36_roda_traseira'],
  brakes: ['peca_35_freio_dianteiro', 'peca_37_freio_traseiro'],
  lights: [
    'peca_13_farol_lado_visivel',
    'peca_12_farol_lado_oposto',
    'peca_15_lanterna_traseira_1',
    'peca_16_lanterna_traseira_2',
  ],
};
for (const part of PARTS) if (assemblySources[part.id]) part.legacyParts = assemblySources[part.id];
export const SUV_ASSEMBLY_IDS = [
  'body',
  'doors',
  'glass',
  'seats',
  'steering',
  'wheels',
  'brakes',
  'lights',
  'mirrors',
  'electronics',
  'vin',
];

export function sceneKind(category = 'M1') {
  const value = String(category).toUpperCase();
  if (/^L\d|^L$|MOTO/.test(value)) return 'moto';
  if (/^O\d|^O$|REBOQUE|SEMIRREBOQUE/.test(value)) return 'trailer';
  if (/^M[23]|ÔNIBUS|ONIBUS/.test(value)) return 'bus';
  if (/^N[23]|CAMINH/.test(value)) return 'truck';
  return 'car';
}

export function visibleParts(category, powertrain = 'ICE') {
  const kind = sceneKind(category);
  const drive = String(powertrain).toUpperCase();
  const electric = /BEV|ELÉTRICO|ELETRICO|^EV$/.test(drive);
  const hybrid = /HEV|PHEV|HÍBRIDO|HIBRIDO|HYBRID/.test(drive);
  const hidden = new Set();
  if (electric) ['engine', 'exhaust', 'tank'].forEach((id) => hidden.add(id));
  if (!electric && !hybrid) ['motorElectric', 'batteryHV'].forEach((id) => hidden.add(id));
  if (kind === 'trailer') {
    [
      'engine',
      'motorElectric',
      'exhaust',
      'tank',
      'batteryHV',
      'battery12v',
      'seats',
      'airbag',
      'glass',
      'doors',
      'mirrors',
      'steering',
      'electronics',
    ].forEach((id) => hidden.add(id));
  }
  if (kind === 'moto') ['doors', 'airbag', 'glass'].forEach((id) => hidden.add(id));
  return PARTS.filter(
    (part) => !hidden.has(part.id) && (kind !== 'car' || SUV_ASSEMBLY_IDS.includes(part.id)),
  );
}
