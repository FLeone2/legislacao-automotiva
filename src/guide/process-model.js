'use strict';

const { REGULATORY_REVISION, needsRegulatoryReview } = require('./review-state.js');

// Decision support and work planning, not an automatic declaration of compliance.
// The evidence list identifies what supports each branch and its review limit.
const BASE_SOURCE_REFERENCES = [
  {
    id: 'guide-contran-954',
    agency: 'CONTRAN',
    title: 'Resolução CONTRAN 954/2022',
    url: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao9542022.pdf/@@display-file/file',
    device: 'Arts. 3º–7º',
    scope: 'ESC/VSF, categoria, uso urbano/escolar, eixos e cronograma.',
    limitations:
      'Texto original conferido; cadeia modificadora integral não certificada. Exceções exigem configuração e datas reais.',
  },
  {
    id: 'guide-senatran-990',
    agency: 'SENATRAN',
    title: 'Portaria SENATRAN 990/2022 — procedimento CAT e registros de ensaios',
    url: 'https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria9902022.pdf/@@display-file/file',
    device: 'Arts. 2º, 9º, 12–22, 26; Anexos I–XI',
    scope: 'Procedimento, SGQ/CCT, CS/ITL, relatórios, SISCAT e grupos do Anexo XI.',
    limitations:
      'PDF oficial da publicação original, não consolidação. Referências antigas no Anexo XI exigem atualização; republicação e cadeia integral não revisadas.',
  },
  {
    id: 'conama-492-2018',
    agency: 'ibama',
    title: 'CONAMA 492/2018 — leves, fases L7/L8 e classificação LP/LC',
    url: 'https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=765',
    device: 'Arts. 6º, 35 e 36; art. 1º-A da CONAMA 15/1995',
    scope: 'Classificação ambiental a partir da fase L7; leve não é sinônimo de M1/N1.',
    limitations:
      'A configuração, os modificadores e os marcos específicos de cada requisito exigem conferência.',
  },
  {
    id: 'conama-490-2018',
    agency: 'ibama',
    title: 'CONAMA 490/2018 — PROCONVE P8',
    url: 'https://conama.mma.gov.br/?option=com_sisconama&task=arquivo.download&id=767',
    device: 'Escopo de veículos pesados e fase P8',
    scope: 'Veículos pesados; não transfere procedimentos de leves a pesados.',
    limitations: 'Fase e ensaios dependem do enquadramento e dos prazos do ato.',
  },
  {
    id: 'ibama-lcvm-service',
    agency: 'ibama',
    title: 'Ibama — Licença para Uso da Configuração de Veículo ou Motor (LCVM)',
    url: 'https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/licenca-para-veiculos-motores-ou-maquinas-lcvm-proconve',
    device: 'Orientação oficial de serviço',
    scope: 'Canal Infoserv, modalidade regular, quantidades limitadas, alterações e dispensas.',
    limitations:
      'A orientação não decide o caso individual; confirmar documentos e canal no serviço atual.',
  },
  {
    id: 'ibama-importation',
    agency: 'ibama',
    title: 'Ibama — procedimentos de controle de importações, IN 6/2025',
    url: 'https://www.gov.br/ibama/pt-br/assuntos/notas/2025/ibama-publica-instrucao-normativa-que-consolida-os-procedimentos-de-controle-de-importacoes',
    device: 'Orientação oficial sobre a IN 6/2025',
    scope: 'Controle de importações e anuência ambiental.',
    limitations: 'LPCO, licença ambiental da configuração e CAT têm finalidades diferentes.',
  },
  {
    id: 'senatran-990-2022',
    agency: 'senatran',
    title: 'Portaria SENATRAN 990/2022 — CAT e documentação',
    url: 'https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/portarias/2022/Portaria9902022R.pdf',
    device: 'Art. 2º, § 7º; arts. 8º, 9º e 26; anexos conforme caso',
    scope: 'CAT, relatórios, CCT condicionado ao SGQ e SISCAT.',
    limitations:
      'Cadeia integral de alterações e anexos aplicáveis ao projeto precisam de revisão.',
  },
  {
    id: 'senatran-cat-service',
    agency: 'senatran',
    title: 'SENATRAN — serviço de emissão do CAT',
    url: 'https://www.gov.br/pt-br/servicos/emitir-certificado-de-adequacao-a-legislacao-de-transito-cat',
    device: 'Orientação oficial de serviço',
    scope: 'Peticionamento, documentos e SISCAT.',
    limitations: 'Verificar disponibilidade de módulos e procedimento da operação concreta.',
  },
  {
    id: 'contran-consultation',
    agency: 'senatran',
    title: 'CONTRAN — índice oficial de resoluções',
    url: 'https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran',
    device: 'Índice oficial; atos específicos na biblioteca',
    scope: 'Localização dos atos por sistema, categoria e data.',
    limitations:
      'Índice não comprova sozinho incidência ou vigência integral. Relatórios exigem ato e dispositivo próprios.',
  },
  {
    id: 'inmetro-components',
    agency: 'inmetro',
    title: 'Inmetro — conformidade de componentes automotivos',
    url: 'https://portaliq.mdic.gov.br/busca-aplicada/central-de-consultas/portaria-inmetro-no-1452022',
    device: 'Orientações oficiais; RAC/RTQ conforme produto',
    scope: 'Enquadrar produto, mecanismo, aplicação OEM/reposição e exclusões.',
    limitations:
      'O acervo mantém referências com íntegra pendente; não é certificação de toda peça nem de bateria de tração por analogia.',
  },
  {
    id: 'inmetro-pbev',
    agency: 'inmetro',
    title: 'Inmetro — Programa Brasileiro de Etiquetagem Veicular',
    url: 'https://portaliq.mdic.gov.br/busca-aplicada/central-de-consultas/portaria-inmetro-no-1692023',
    device: 'Programa PBEV; Portaria 169/2023 no acervo',
    scope: 'Eficiência e informação ao consumidor conforme participação e escopo.',
    limitations:
      'Não se transforma adesão voluntária em obrigação universal. ENCE não substitui CAT ou LCVM.',
  },
  {
    id: 'anatel-715-2019',
    agency: 'anatel',
    title: 'Anatel — Resolução 715/2019 e alterações',
    url: 'https://informacoes.anatel.gov.br/legislacao/resolucoes/2019/1350-resolucao-715',
    device: 'Regulamento de avaliação da conformidade e homologação',
    scope: 'Produtos para telecomunicações e configuração de integração.',
    limitations:
      'Módulo homologado não dispensa automaticamente o equipamento final; recepção AM/FM pura não recebe obrigação universal.',
  },
  {
    id: 'mdic-mover',
    agency: 'mdic',
    title: 'MDIC — Programa MOVER',
    url: 'https://www.gov.br/mdic/pt-br/assuntos/sdic/setor-automotivo/programa-mover-1/legislacao-programa-mover',
    device: 'Orientações do programa e atos aplicáveis ao agente econômico',
    scope: 'Habilitação, comercialização, eficiência e compromissos conforme modalidade.',
    limitations:
      'Benefícios e habilitação não equivalem a aprovação técnica do veículo. Não inferir incidência a todo projeto de peça.',
  },
];

// Use the audited registry for the exact URL, date and review depth. Task IDs stay stable.
const registrySources = [
  ...require('../../data/process/official-sources.json').records,
  ...require('../../data/process/safety-sources.json').records,
];
const sourceAliases = {
  'ibama-importation': 'ibama-import-service',
  'senatran-990-2022': 'guide-senatran-990',
  'senatran-cat-service': 'guide-senatran-cat',
  'contran-consultation': 'guide-contran-index',
  'inmetro-components': 'guide-inmetro-145',
  'anatel-715-2019': 'guide-anatel-715',
  'mdic-mover': 'guide-mdic-mover',
};
const SOURCE_REFERENCES = BASE_SOURCE_REFERENCES.map((source) => {
  const reviewed = registrySources.find(
    (entry) => entry.id === (sourceAliases[source.id] || source.id),
  );
  return reviewed
    ? { ...source, ...reviewed, id: source.id, sourceRegistryId: reviewed.id }
    : source;
});
for (const source of registrySources) {
  if (
    !SOURCE_REFERENCES.some(
      (entry) => entry.id === source.id || entry.sourceRegistryId === source.id,
    )
  )
    SOURCE_REFERENCES.push(source);
}

const DEFAULT_PROFILE = Object.freeze({
  name: 'Novo projeto',
  category: 'M1',
  powertrain: 'ice',
  fuel: 'flex',
  origin: 'national',
  purpose: 'series',
  massKg: 1800,
  seats: 5,
  year: 2026,
  radio: true,
  componentMarket: 'oem',
  usage: 'general',
  // Null means not assessed, not zero/false. Seats include the driver.
  massRunningKg: null,
  payloadKg: null,
  derivedFromPassenger: null,
  offroad: null,
});

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeProfile(input = {}) {
  const p = { ...DEFAULT_PROFILE, ...input };
  const allowed = {
    category: ['M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'O', 'L'],
    powertrain: ['ice', 'hev', 'phev', 'bev'],
    fuel: ['flex', 'gasoline', 'diesel', 'electric'],
    origin: ['national', 'imported'],
    purpose: ['series', 'limited', 'modification', 'component'],
    componentMarket: ['oem', 'replacement'],
    usage: ['general', 'urban', 'school'],
  };
  for (const [field, values] of Object.entries(allowed))
    if (!values.includes(p[field])) p[field] = '';
  for (const field of ['massKg', 'seats', 'year', 'massRunningKg', 'payloadKg'])
    p[field] = numberOrNull(p[field]);
  for (const field of ['derivedFromPassenger', 'offroad'])
    p[field] =
      p[field] === true || p[field] === 'true'
        ? true
        : p[field] === false || p[field] === 'false'
          ? false
          : null;
  p.radio =
    p.radio === true || p.radio === 'true'
      ? true
      : p.radio === false || p.radio === 'false'
        ? false
        : null;
  p.name =
    String(p.name ?? '')
      .trim()
      .slice(0, 200) || 'Projeto sem nome';
  return p;
}

function environmentalClassification(p) {
  if (p.purpose === 'component')
    return {
      family: 'component',
      label: 'Componente — impacto no veículo a avaliar',
      phase: 'Não atribuída a uma peça isolada',
      route:
        'Enquadrar a peça e verificar se a alteração afeta a configuração ambiental do veículo.',
      particularities: [
        'Uma peça nova não recebe licença ambiental de veículo completo por simples associação temática.',
        'Mudanças em motor, pós-tratamento, OBD, combustível ou calibração podem exigir avaliação da configuração afetada.',
      ],
      sourceIds: [
        p.category === 'L' ? 'ibama-lcm-service' : 'ibama-lcvm-service',
        'inmetro-components',
      ],
    };
  if (p.category === 'O')
    return {
      family: 'trailer',
      label: 'Reboque / semirreboque — sem motor de propulsão',
      phase: 'Sem fase de escapamento atribuída',
      route:
        'Verificar equipamentos auxiliares e a configuração real; não criar ensaio de escapamento de propulsão inexistente.',
      particularities: [
        'Categoria O não herda os ensaios de escapamento do veículo trator.',
        'Motor auxiliar e equipamentos próprios demandam enquadramento separado, quando existentes.',
      ],
      sourceIds: ['ibama-lcvm-service'],
    };

  const detail = [];
  let family = 'pending';
  let label = 'LP / LC ou pesado — enquadramento pendente';
  let phase = 'Confirmar programa, fase e marco do requisito';
  const sourceIds =
    p.category === 'L' ? ['ibama-lcm-service', 'conama-493-2019'] : ['ibama-lcvm-service'];
  if (p.category === 'L') {
    family = 'promot';
    label = 'Categoria L — consultar enquadramento PROMOT';
    phase = 'PROMOT — fase e subcategoria a confirmar';
    detail.push(
      'Motociclos e similares seguem seu enquadramento próprio; não aplicar L8 ou P8 por analogia.',
    );
    detail.push(
      'O recorte de atos L8/P8 da biblioteca não esgota PROMOT. Conferir subcategoria, fases M e cronograma próprio de OBD-M1/M2; referências e métodos ainda pendentes de estruturação permanecem lacunas.',
    );
  } else {
    sourceIds.push('conama-492-2018', 'conama-490-2018');
    const massHeavy = p.massKg > 3856 || p.massRunningKg > 2720;
    const knownLight =
      p.massKg > 0 && p.massKg <= 3856 && p.massRunningKg > 0 && p.massRunningKg <= 2720;
    if (massHeavy) {
      family = 'heavy';
      label = 'Pesado — enquadramento ambiental pelas massas';
      phase = 'PROCONVE P8 — confirmar datas e configuração';
      detail.push(
        'O recorte ambiental usa massas próprias e não apenas a categoria M/N. Leves L8 e pesados P8 têm procedimentos distintos.',
      );
    } else if (knownLight) {
      family = 'light';
      label = 'Leve — LP / LC a confirmar';
      phase = 'PROCONVE L7/L8 — confirmar datas e configuração';
      if (!p.year || p.year < 2022) {
        label = 'Leve — classificação histórica a revisar';
        phase = 'Programa e fase do período do projeto a confirmar';
      } else if (['M1', 'M2', 'M3'].includes(p.category) && p.seats > 0 && p.seats <= 9) {
        label = 'LP — leve de passageiros (triagem pelos dados informados)';
      } else if (p.derivedFromPassenger === false && (p.payloadKg > 1000 || p.seats > 9)) {
        label = 'LC — leve comercial (triagem pelos dados informados)';
      } else if (
        ['N1', 'N2', 'N3'].includes(p.category) &&
        p.payloadKg !== null &&
        (p.derivedFromPassenger === true || (p.payloadKg <= 1000 && p.seats > 0 && p.seats <= 9))
      ) {
        label = 'LP — veículo de carga fora do recorte LC (triagem)';
      }
      detail.push(
        'A partir de L7: LP e LC têm MTMA até 3.856 kg e massa em ordem de marcha até 2.720 kg. LP e LC são classes ambientais, não modalidades de licença.',
      );
      detail.push(
        'LC exige veículo não derivado de LP e carga útil superior a 1.000 kg ou mais de oito assentos além do motorista. Veículos de carga fora desse recorte integram LP, conforme art. 1º-A.',
      );
    } else {
      detail.push(
        'Informe MTMA/PBT e massa em ordem de marcha para separar leve de pesado. A categoria M1/N1 isolada não determina LP ou LC.',
      );
    }
    detail.push(
      'A condição fora de estrada depende da definição técnica referenciada pelo Ibama; SUV ou tração 4×4 não comprovam essa condição. O art. 36 trata da possibilidade de limites LC, não de classificação LC automática.',
    );
    if (p.massKg > 3500 && p.massKg < 3856 && family !== 'heavy')
      detail.push(
        'Particularidade a verificar: para LC com MTMA superior a 3.500 kg e inferior a 3.856 kg e motor derivado de mestre pesado, o art. 23 da CONAMA 490/2018 prevê alternativa P8 condicionada a justificativa e autorização prévia do Ibama. O perfil não informa essa derivação nem a autorização; nenhuma mudança automática de fase foi realizada.',
      );
  }
  if (p.powertrain === 'bev') {
    phase = 'BEV — sem ensaios de escapamento de motor térmico';
    detail.push(
      'O elétrico puro não recebe ensaios de escapamento de motor térmico. Isso não constitui dispensa automática de documento ambiental ou de anuência na importação.',
    );
  } else if (p.powertrain === 'hev' || p.powertrain === 'phev') {
    detail.push(
      'O híbrido mantém o ramo do motor térmico pertinente. Condicionamento da bateria, modos de operação e ensaios dependem do procedimento específico.',
    );
    if (p.powertrain === 'phev')
      detail.push(
        'O PHEV demanda avaliação específica da recarga externa, autonomia elétrica e modos de ensaio; não reutilizar indiscriminadamente o procedimento de HEV.',
      );
  }
  if (p.purpose === 'limited')
    detail.push(
      'Quantidades limitadas têm modalidade e condições próprias. Baixo volume não é dispensa automática nem elimina o enquadramento técnico.',
    );
  if (p.purpose === 'modification')
    detail.push(
      'Antes de repetir ensaios, classificar a alteração e verificar extensão, atualização ou novo pedido da configuração afetada.',
    );
  return {
    family,
    label,
    phase,
    route:
      p.category === 'L'
        ? 'Consultar serviço PROMOT e canal atual do Ibama; confirmar licença e modalidade próprias.'
        : 'Infoserv / Infoserv 2: confirmar o canal atual, habilitação e modalidade de LCVM no serviço oficial.',
    particularities: detail,
    sourceIds,
  };
}

function evaluateProfile(input = {}) {
  const p = normalizeProfile(input);
  const missing = [];
  const warnings = [];
  for (const [key, label] of [
    ['category', 'Categoria regulamentar'],
    ['powertrain', 'Propulsão'],
    ['origin', 'Origem'],
    ['purpose', 'Modalidade do projeto'],
  ])
    if (!p[key]) missing.push(label);
  if (p.purpose !== 'component') {
    if (!p.massKg) missing.push('MTMA / PBT em kg');
    if (p.category !== 'O' && !p.fuel) missing.push('Combustível da configuração');
    if (p.category !== 'O' && (!p.seats || !Number.isInteger(p.seats)))
      missing.push('Lotação inteira, incluindo o motorista');
    if (!p.year || !Number.isInteger(p.year)) missing.push('Ano de referência do projeto');
    if (!['L', 'O'].includes(p.category) && p.massKg <= 3856 && !p.massRunningKg)
      missing.push('Massa em ordem de marcha para enquadramento ambiental');
  }
  if (p.powertrain === 'bev' && p.fuel !== 'electric')
    warnings.push(
      'Perfil inconsistente: BEV selecionado com combustível térmico. Corrija antes de definir a matriz.',
    );
  if (['ice', 'hev', 'phev'].includes(p.powertrain) && p.fuel === 'electric' && p.category !== 'O')
    warnings.push(
      'Perfil inconsistente: motor térmico informado com combustível exclusivamente elétrico.',
    );
  if (p.massRunningKg && p.massKg && p.massRunningKg > p.massKg)
    warnings.push(
      'Massa em ordem de marcha superior à MTMA/PBT. Revise as unidades e a ficha técnica.',
    );
  if (
    p.payloadKg !== null &&
    p.massRunningKg &&
    p.massKg &&
    p.massRunningKg + p.payloadKg > p.massKg
  )
    warnings.push('Massa em ordem de marcha somada à carga útil supera a MTMA/PBT informada.');
  if (p.category === 'M1' && p.seats > 9)
    warnings.push(
      'M1 informado com mais de nove assentos, incluindo o motorista. Revise a categoria.',
    );
  if (p.category === 'N1' && p.massKg > 3500)
    warnings.push(
      'N1 informado acima de 3.500 kg. Confira a categoria de segurança; o limite ambiental é diferente.',
    );
  if (['M2', 'M3'].includes(p.category) && p.seats && p.seats <= 9)
    warnings.push(
      'M2/M3 informado com até nove assentos, incluindo o motorista. Confira categoria e lotação.',
    );
  if (p.category === 'M2' && p.massKg > 5000)
    warnings.push('M2 informado acima de 5.000 kg. Confira a categoria regulamentar.');
  if (p.category === 'M3' && p.massKg && p.massKg <= 5000)
    warnings.push('M3 informado com até 5.000 kg. Confira a categoria regulamentar.');
  if (p.category === 'N2' && p.massKg && (p.massKg <= 3500 || p.massKg > 12000))
    warnings.push('N2 informado fora do intervalo de massa da categoria. Confira a ficha técnica.');
  if (p.category === 'N3' && p.massKg && p.massKg <= 12000)
    warnings.push('N3 informado com até 12.000 kg. Confira a categoria regulamentar.');
  if (p.year > 2026)
    warnings.push(
      'Projeto posterior à referência desta revisão. Confira novos atos e transições antes de usar a matriz.',
    );
  if (p.year && p.year < 2025)
    warnings.push(
      'Projeto com ano anterior ao recorte atual: não aplicar L8 ou marcos recentes retroativamente.',
    );
  if (p.radio === null) missing.push('Presença e função dos equipamentos de telecomunicações');

  const safetyDetail = [
    'Os relatórios dependem da categoria, massa, lotação, carroçaria, datas, configuração e exceções de cada ato. A lista é uma triagem, não uma declaração de obrigatoriedade.',
    'Para cada sistema, registrar ato, dispositivo, condição de incidência, versão do método e laboratório antes de contratar ensaios.',
    'CCT depende da condição de SGQ e do art. 2º, § 7º da Portaria 990/2022; não é exigência universal para todo fabricante.',
  ];
  if (['M2', 'M3'].includes(p.category))
    safetyDetail.push(
      'Veículo de transporte coletivo: conferir carroçaria, lotação, saídas de emergência, acessibilidade e requisitos específicos de ônibus, conforme o caso.',
    );
  if (p.category === 'M2')
    safetyDetail.push(
      !p.massKg
        ? 'M2 com PBT pendente: informar a massa antes de definir o grupo de registros do Anexo XI da Portaria 990/2022. A categoria isolada não define o grupo pesado dessa tabela.'
        : p.massKg <= 3500
          ? 'Na tabela de relatórios do Anexo XI da Portaria 990/2022, este M2 está no grupo até 3.500 kg; a categoria M2 mantém seus requisitos próprios.'
          : 'Na tabela de relatórios do Anexo XI da Portaria 990/2022, M2 acima de 3.500 kg segue o grupo pesado, embora continue M2. Confirmar PBT e estágio de construção.',
    );
  if (p.category === 'M3')
    safetyDetail.push(
      p.usage === 'urban'
        ? 'M3 exclusivamente urbano: a Resolução 954/2022, art. 3º, § 5º, prevê instalação opcional de ESC/VSF. Confirmar uso exclusivo, configuração, alterações e cadeia do ato antes de decidir a incidência.'
        : p.usage === 'school'
          ? 'M3 escolar: a Resolução 954/2022, art. 3º, § 6º, prevê instalação obrigatória de ESC/VSF. Confirmar datas, configuração e cadeia do ato na matriz de evidências.'
          : 'M3: uso urbano exclusivo e uso escolar têm tratamentos distintos de ESC/VSF na Resolução 954/2022; informar o uso antes de definir a matriz.',
    );
  if (['N2', 'N3', 'O'].includes(p.category))
    safetyDetail.push(
      'Veículo de carga ou rebocado: conferir proteção lateral/traseira, acoplamento, dimensões, massas e frenagem conforme subcategoria e exceções.',
    );
  if (p.category === 'M1' || p.category === 'N1')
    safetyDetail.push(
      'Impactos, proteção de ocupantes, cintos, estabilidade e visibilidade têm âmbitos e marcos próprios; não universalizar relatórios pelo nome do veículo.',
    );
  if (p.category === 'L')
    safetyDetail.push(
      'Categoria L: confirmar subcategoria e requisitos próprios de frenagem, iluminação, identificação e demais sistemas; não herdar a matriz de automóvel.',
    );
  if (p.powertrain !== 'ice' && p.category !== 'O')
    safetyDetail.push(
      'Propulsão elétrica: incluir avaliação de segurança elétrica e armazenamento de energia segundo o ato aplicável. RAC de bateria chumbo-ácido não comprova bateria de tração.',
    );
  if (p.purpose === 'modification')
    safetyDetail.push(
      'Separar alteração de veículo em circulação de homologação de novo modelo: CAT, CSV e autorização de modificação têm finalidades diferentes.',
    );
  if (p.purpose === 'component')
    safetyDetail.push(
      'Projeto de peça: validar interfaces e efeito sobre a configuração do veículo. A peça isolada não recebe automaticamente CAT de veículo completo.',
    );

  const agencies = [
    {
      id: 'senatran',
      label: 'SENATRAN',
      reason:
        p.purpose === 'component'
          ? 'Efeito da peça sobre o atendimento do veículo e suas configurações.'
          : 'Categoria, requisitos de segurança, identificação, dossiê e procedimento CAT/SISCAT.',
    },
    {
      id: 'inmetro',
      label: 'Inmetro',
      reason:
        'Escopo de produto, mecanismo de conformidade e, se pertinente, eficiência/etiquetagem.',
    },
    {
      id: 'ibama',
      label: 'Ibama',
      reason:
        p.category === 'O'
          ? 'Verificar somente equipamentos e configuração ambiental efetivamente existentes.'
          : 'Programa ambiental, modalidade de licença e controle de importação conforme enquadramento.',
    },
    {
      id: 'mdic',
      label: 'MDIC',
      reason:
        'Consultar incidência do MOVER e instrumentos de comércio exterior para o agente e a operação.',
    },
  ];
  if (p.radio !== false)
    agencies.push({
      id: 'anatel',
      label: 'Anatel',
      reason:
        'Funções reais de telecomunicações e condições de integração/homologação do produto final.',
    });
  return {
    emissions: environmentalClassification(p),
    safety: {
      label: `Matriz de segurança · ${p.category || 'categoria pendente'}`,
      particularities: safetyDetail,
      sourceIds: [
        'senatran-990-2022',
        'contran-consultation',
        ...(p.category === 'M3' ? ['guide-contran-954', 'guide-contran-959'] : []),
        ...(p.category === 'M2' ? ['guide-senatran-990', 'guide-contran-939'] : []),
      ],
    },
    agencies,
    warnings,
    missing,
  };
}

function buildChecklist(input = {}) {
  const p = normalizeProfile(input);
  const assessment = evaluateProfile(p);
  const items = [];
  const add = (
    id,
    stage,
    agency,
    title,
    description,
    applicability,
    reason,
    sourceIds,
    evidence,
    blockedBy = [],
  ) =>
    items.push({
      id,
      stage,
      agency,
      title,
      description,
      applicability,
      reason,
      sourceIds,
      evidence,
      blockedBy,
    });
  add(
    'profile',
    'enquadramento',
    'senatran',
    'Registrar e conferir o perfil técnico',
    'Conferir categoria, MTMA/PBT, massa em ordem de marcha, lotação incluindo motorista, carroçaria, uso, propulsão e datas.',
    'required',
    'Tarefa de organização do processo; o perfil orienta todas as frentes.',
    ['contran-consultation'],
    ['Ficha técnica controlada', 'Registro de classificação e responsável'],
  );
  add(
    'legal-matrix',
    'enquadramento',
    'senatran',
    'Validar a matriz de aplicabilidade',
    'Para cada obrigação, registrar ato, dispositivo, categoria, marco temporal, condição, exclusão e justificativa de aplicação ou não aplicação.',
    'required',
    'O acervo tem relações temáticas; a incidência deve ser analisada no projeto.',
    ['contran-consultation', 'senatran-990-2022'],
    ['Matriz revisada com fontes e datas'],
    ['profile'],
  );
  add(
    'configuration',
    'projeto',
    'senatran',
    'Controlar variantes, protótipos e mudanças',
    'Relacionar peças, variantes, calibrações, protótipos representativos e responsáveis. Definir quando mudanças exigem retorno aos ensaios.',
    'required',
    'Tarefa de rastreabilidade; não define um ensaio por analogia.',
    ['senatran-990-2022'],
    ['Lista de configuração', 'Registro de alterações'],
    ['profile'],
  );
  add(
    'test-plan',
    'projeto',
    'senatran',
    'Aprovar o plano de evidências',
    'Definir ensaios efetivamente aplicáveis, método e edição consultados, preparação, laboratório e forma de demonstrar conformidade.',
    'review',
    'Métodos e limites não revisados no acervo continuam pendentes; preencher antes da contratação.',
    ['senatran-990-2022', 'contran-consultation'],
    ['Plano de ensaios com base normativa', 'Escopo do laboratório'],
    ['legal-matrix', 'configuration'],
  );

  if (p.purpose !== 'component' && p.category !== 'O') {
    add(
      'environment-class',
      'ambiente',
      'ibama',
      'Confirmar LP, LC, pesado ou PROMOT',
      `${assessment.emissions.label}. Conferir as definições ambientais e seus dados técnicos; M1/N1 não equivalem automaticamente a LP/LC.`,
      'review',
      'A definição do programa e da classe antecede a seleção de requisitos ambientais.',
      assessment.emissions.sourceIds,
      [
        'Ficha de enquadramento ambiental com dispositivo',
        'Massas, carga útil, lotação e derivação documentadas',
      ],
      ['profile'],
    );
    add(
      'environment-route',
      'ambiente',
      'ibama',
      'Definir modalidade e canal do pedido ambiental',
      p.purpose === 'limited'
        ? 'Verificar condições da modalidade de quantidades limitadas, limites, documentação e canal atual; não presumir dispensa.'
        : p.purpose === 'modification'
          ? 'Classificar a alteração para determinar atualização, extensão ou novo pedido da configuração, conforme procedimento aplicável.'
          : 'Confirmar cadastro/habilitação, modalidade regular, dispensa ou outra hipótese efetivamente cabível e o canal indicado pelo Ibama.',
      'conditional',
      `${p.category === 'L' ? 'LCM / PROMOT' : 'LCVM'}, declaração, dispensa e alteração têm fundamentos e condições distintos.`,
      [p.category === 'L' ? 'ibama-lcm-service' : 'ibama-lcvm-service'],
      ['Modalidade justificada e cadastro do interessado', 'Lista documental oficial atual'],
      ['environment-class'],
    );
    if (p.powertrain !== 'bev') {
      add(
        'thermal-evidence',
        'ambiente',
        'ibama',
        assessment.emissions.family === 'promot'
          ? 'Planejar as evidências ambientais do PROMOT'
          : 'Planejar as evidências do motor térmico',
        'Conferir escapamento, evaporativas, ruído, OBD, durabilidade e controles em uso somente quando previstos para classe, combustível, fase e configuração.',
        'conditional',
        'Os nomes são frentes de análise; não significam que todos os ensaios incidam em todas as configurações.',
        assessment.emissions.sourceIds,
        ['Plano ambiental fundamentado', 'Relatórios exigidos pela modalidade'],
        ['test-plan', 'environment-class'],
      );
    } else {
      add(
        'electric-environment',
        'ambiente',
        'ibama',
        'Documentar o enquadramento ambiental do BEV',
        'Registrar ausência de motor térmico, declarações pertinentes e tratamento administrativo aplicável. Confirmar documento ambiental ou dispensa fundamentada, quando cabível.',
        'review',
        `Escapamento nulo não equivale a dispensa automática de ${p.category === 'L' ? 'LCM' : 'LCVM'} ou anuência de importação.`,
        assessment.emissions.sourceIds,
        ['Ficha técnica elétrica', 'Enquadramento ambiental e manifestação pertinente'],
        ['environment-class'],
      );
    }
    if (p.powertrain === 'hev' || p.powertrain === 'phev')
      add(
        'hybrid-evidence',
        'ambiente',
        'ibama',
        p.powertrain === 'phev'
          ? 'Definir ensaios específicos do PHEV'
          : 'Definir ensaios específicos do HEV',
        'Registrar modos de operação e condicionamento da bateria segundo o método aplicável; no PHEV, conferir também tratamento da recarga externa.',
        'conditional',
        'Híbrido mantém o ramo térmico e requer tratamento específico; HEV e PHEV não são intercambiáveis.',
        assessment.emissions.sourceIds,
        ['Configuração híbrida', 'Método e modos de ensaio fundamentados'],
        ['test-plan', 'environment-class'],
      );
  } else if (p.purpose === 'component') {
    add(
      'component-impact',
      'ambiente',
      'ibama',
      'Analisar o impacto ambiental da peça',
      'Verificar se o projeto altera uma configuração licenciada, emissões, pós-tratamento, OBD, combustível ou calibração; encaminhar somente as alterações efetivamente abrangidas.',
      'review',
      'Peça isolada não herda a licença ou todos os ensaios do veículo completo.',
      [p.category === 'L' ? 'ibama-lcm-service' : 'ibama-lcvm-service'],
      ['Análise de interfaces e impacto', 'Decisão fundamentada sobre alteração de configuração'],
      ['configuration'],
    );
  }

  add(
    'safety-matrix',
    'seguranca',
    'senatran',
    'Definir relatórios por categoria e sistema',
    assessment.safety.particularities.join(' '),
    'review',
    'Não existe lista universal de relatórios para toda categoria. Necessário validar ato, dispositivo, datas e exceções.',
    assessment.safety.sourceIds,
    ['Matriz de relatórios aplicáveis', 'Dispositivo e justificativa por item'],
    ['legal-matrix'],
  );
  if (p.powertrain !== 'ice' && p.category !== 'O')
    add(
      'electric-safety',
      'seguranca',
      'senatran',
      'Avaliar segurança da propulsão elétrica',
      'Revisar requisitos aplicáveis à configuração elétrica, interfaces e armazenamento de energia; distinguir bateria auxiliar de bateria de tração.',
      'conditional',
      'Química e função da bateria importam; não aplicar RAC chumbo-ácido à tração por analogia.',
      [p.category === 'L' ? 'guide-contran-750' : 'guide-contran-749', 'inmetro-components'],
      ['Configuração HV/armazenamento', 'Requisitos e evidências aplicáveis'],
      ['safety-matrix'],
    );
  add(
    'components-scope',
    'componentes',
    'inmetro',
    'Enquadrar componentes e mecanismo de conformidade',
    `Revisar escopo de cada produto, exclusões e condições de ${p.componentMarket === 'replacement' ? 'reposição' : 'aplicação original (OEM)'}. Distinguir certificação, declaração do fornecedor, registro e selos.`,
    'review',
    'O conjunto visual não comprova a incidência de um RAC; a íntegra Inmetro pendente deve ser obtida antes da decisão.',
    ['inmetro-components'],
    [
      'Lista de produtos abrangidos',
      'RAC/RTQ e exclusões consultados',
      'Certificados/declarações e identificação, quando exigidos',
    ],
    ['configuration'],
  );
  if (p.radio !== false)
    add(
      'telecom-scope',
      'componentes',
      'anatel',
      'Validar rádio, módulos e integração final',
      'Inventariar Wi-Fi, Bluetooth, celular, transmissores e outras funções de telecomunicação. Verificar enquadramento e condições de integração; módulo homologado não é dispensa universal do produto final.',
      'conditional',
      p.radio === null
        ? 'Presença e funções de telecomunicações ainda não informadas.'
        : 'Há telecomunicações no perfil; incidência depende da função e do produto real.',
      ['anatel-715-2019'],
      ['Inventário de módulos e funções', 'Homologação e condições de integração aplicáveis'],
      ['configuration'],
    );
  if (p.purpose !== 'component' && !['O', 'L'].includes(p.category))
    add(
      'efficiency',
      'ambiente',
      'inmetro',
      'Avaliar PBEV e etiquetagem do veículo',
      'Conferir escopo e participação no PBEV, procedimento e informação ao consumidor. Não confundir ENCE com CAT ou aprovação ambiental.',
      'conditional',
      'A referência voluntária não é convertida em obrigação universal; verificar também exigências específicas do agente econômico.',
      ['inmetro-pbev'],
      ['Enquadramento no programa', 'Resultados/etiqueta quando pertinentes'],
      ['profile'],
    );
  add(
    'mover-scope',
    'enquadramento',
    'mdic',
    'Verificar incidência do MOVER',
    'Identificar fabricante/importador e operação; distinguir requisitos de comercialização, habilitação, benefícios e compromissos corporativos conforme o enquadramento.',
    'review',
    'O programa não é uma aprovação técnica genérica e não se aplica indistintamente a todo projeto de peça.',
    ['mdic-mover'],
    ['Enquadramento do agente e da operação', 'Obrigações e prazos efetivamente incidentes'],
    ['profile'],
  );
  if (p.origin === 'imported')
    add(
      'importation',
      'enquadramento',
      'ibama',
      'Separar anuência de importação e aprovações técnicas',
      'Conferir NCM, tratamento administrativo, DUIMP/DI e LPCO/anuências pertinentes à operação. Planejar prazos conforme o procedimento vigente.',
      'conditional',
      `${p.category === 'L' ? 'LCM' : 'LCVM'}, LPCO, CAT e desembaraço têm funções próprias; um documento não substitui os demais.`,
      ['ibama-importation', p.category === 'L' ? 'ibama-lcm-service' : 'ibama-lcvm-service'],
      ['Tratamento administrativo consultado', 'Documentos e anuências aplicáveis'],
      ['profile'],
    );
  if (p.purpose === 'modification')
    add(
      'modification-route',
      'cat',
      'senatran',
      'Distinguir alteração, CAT e CSV',
      'Identificar se há veículo em circulação, novo modelo, transformação ou alteração de configuração; confirmar autorizações, inspeção e documentos próprios de cada hipótese.',
      'review',
      'CSV e CAT têm finalidades distintas; o perfil não determina sozinho o procedimento.',
      ['contran-consultation', 'senatran-990-2022'],
      ['Descrição da alteração', 'Procedimento e documentos justificados'],
      ['legal-matrix', 'safety-matrix'],
    );
  add(
    'traceability',
    'dossie',
    'senatran',
    'Consolidar evidências e tratar pendências',
    'Relacionar cada evidência à configuração, relatório, responsável e requisito. Registrar divergências, validade e justificativas de não aplicação.',
    'required',
    'Tarefa de controle documental do processo; conclusão manual não constitui aprovação do órgão.',
    ['senatran-990-2022'],
    ['Índice do dossiê', 'Matriz requisito × evidência', 'Pendências e responsáveis'],
    ['test-plan', 'safety-matrix', 'components-scope'],
  );
  if (p.purpose !== 'component') {
    add(
      'cct-sgq',
      'cat',
      'senatran',
      'Verificar SGQ e hipótese de CCT',
      'Conferir a condição do SGQ do interessado e o art. 2º, § 7º da Portaria 990/2022; se aplicável, verificar ITL acreditada e licenciada para emissão do CCT.',
      'conditional',
      'CCT não é exigência automática para todos os fabricantes, importadores, encarroçadores e transformadores.',
      ['senatran-990-2022'],
      ['Evidência de SGQ ou CCT, conforme enquadramento'],
      ['profile'],
    );
    add(
      'sis-cat',
      'cat',
      'senatran',
      'Preparar e conferir o pedido no SISCAT',
      'Confirmar modalidade, anexos pertinentes, cadastro, GRU e módulo disponível no serviço oficial; revisar o dossiê antes de protocolar.',
      'conditional',
      'O pedido e os anexos dependem do caso. Este portal organiza o trabalho e não protocola no órgão.',
      ['senatran-990-2022', 'senatran-cat-service'],
      ['Lista oficial de documentos conferida', 'Requerimento e comprovantes pertinentes'],
      ['traceability', 'cct-sgq'],
    );
  }
  add(
    'production-control',
    'producao',
    'senatran',
    'Planejar liberação e controle de mudanças',
    'Definir critérios internos de liberação, manter a configuração aprovada quando aplicável e separar aprovação técnica de registro/licenciamento e comercialização.',
    'conditional',
    p.purpose === 'component'
      ? 'Adaptar o controle ao produto e ao fornecimento.'
      : 'A execução depende do resultado real dos procedimentos perante os órgãos.',
    ['senatran-990-2022', 'mdic-mover'],
    ['Plano de liberação', 'Rastreabilidade e controle de mudanças'],
    ['traceability'],
  );
  add(
    'cop-plan',
    'cop',
    'ibama',
    'Definir conformidade de produção e acompanhamento',
    'Planejar os controles aplicáveis desde o projeto, responsáveis, amostragem e prazos com base no ato específico. Distinguir produção, ACP e controles em uso; não universalizar procedimentos L8 para P8.',
    'review',
    'Programa, produto e fase determinam controles e métodos; o portal não inventa amostragem nem periodicidade.',
    [...new Set([...assessment.emissions.sourceIds, 'inmetro-components'])],
    ['Plano fundamentado de conformidade', 'Responsáveis, calendário e registros'],
    ['legal-matrix'],
  );
  if (p.purpose !== 'component') {
    const matrix = require('../../data/process/report-matrix.json');
    for (const row of matrix.rows) {
      if (
        !row.categories.includes(p.category) ||
        (row.usage && !row.usage.includes(p.usage)) ||
        (row.powertrains && !row.powertrains.includes(p.powertrain)) ||
        (row.purposes && !row.purposes.includes(p.purpose))
      )
        continue;
      items.push({
        id: row.id,
        stage: 'seguranca',
        agency: 'senatran',
        title: row.title,
        description: row.description,
        applicability: row.applicability,
        reason: row.reason,
        sourceIds: row.sourceIds,
        evidence: row.evidence,
        blockedBy: ['safety-matrix'],
      });
    }
  }
  return items;
}

function buildFlow(input = {}) {
  const p = normalizeProfile(input);
  const assessment = evaluateProfile(p);
  const component = p.purpose === 'component';
  const nodes = [
    {
      id: 'enquadramento',
      title: '01 · Enquadramento',
      agency: 'Projeto',
      description: 'Perfil, operação e matriz de aplicabilidade',
    },
    {
      id: 'projeto',
      title: '02 · Projeto e ensaios',
      agency: 'Engenharia',
      description: 'Configuração, protótipos e plano de evidências',
    },
    {
      id: 'ambiente',
      title: 'Ambiental e eficiência',
      agency: 'Ibama / Inmetro',
      description: assessment.emissions.label,
    },
    {
      id: 'seguranca',
      title: 'Segurança por categoria',
      agency: 'SENATRAN',
      description: assessment.safety.label,
    },
    {
      id: 'componentes',
      title: 'Componentes e conectividade',
      agency: p.radio === false ? 'Inmetro' : 'Inmetro / Anatel',
      description: 'Escopo do produto e integração real',
    },
    {
      id: 'dossie',
      title: '03 · Dossiê e pendências',
      agency: 'Projeto',
      description: 'Convergência das evidências pertinentes',
    },
    {
      id: 'cat',
      title: component
        ? '04 · Validação do fornecimento'
        : p.purpose === 'modification'
          ? '04 · Procedimento da alteração'
          : '04 · Pedido CAT / SISCAT',
      agency: component ? 'Engenharia / qualidade' : 'SENATRAN',
      description: component
        ? 'Componente não recebe CAT de veículo por analogia'
        : 'Anexos, SGQ/CCT e modalidade conforme caso',
    },
    {
      id: 'producao',
      title: '05 · Liberação e produção',
      agency: 'Qualidade',
      description: 'Resultado real, configuração e mudanças',
    },
    {
      id: 'cop',
      title: '06 · Conformidade e uso',
      agency: 'Órgãos / qualidade',
      description: 'Controles e prazos aplicáveis; retorno à engenharia',
    },
  ];
  const pairs = [
    ['enquadramento', 'projeto'],
    ['projeto', 'ambiente'],
    ['projeto', 'seguranca'],
    ['projeto', 'componentes'],
    ['ambiente', 'dossie'],
    ['seguranca', 'dossie'],
    ['componentes', 'dossie'],
    ['dossie', 'cat'],
    ['cat', 'producao'],
    ['producao', 'cop'],
    ['cop', 'projeto', 'Mudanças e desvios'],
  ];
  return {
    nodes,
    edges: pairs.map(([source, target, label]) => ({
      id: `${source}-${target}`,
      source,
      target,
      ...(label ? { label } : {}),
    })),
  };
}

function exportProcessMarkdown(process = {}) {
  const p = normalizeProfile(process.profile || {});
  const assessment = evaluateProfile(p);
  const checklist = buildChecklist(p);
  const checks = process.checks && typeof process.checks === 'object' ? process.checks : {};
  const text = (value) => String(value ?? '').replace(/\r\n?/g, '\n');
  const line = (value) =>
    text(value)
      .replace(/\n/g, ' ')
      .replace(/[\[\]]/g, '');
  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em andamento',
    done: 'Concluído pelo usuário',
    na: 'Não aplicável — justificar',
  };
  const out = [
    `# ${line(p.name)}`,
    '',
    `Processo: ${line(process.id || 'sem identificador')} · Criado: ${line(process.createdAt || 'não informado')}`,
    '',
    '> Plano consultivo de trabalho. Marcações e justificativas são registros do usuário; não comprovam aprovação de órgão nem substituem a revisão de aplicabilidade.',
    '',
    `Versão da base de regras e evidências: ${REGULATORY_REVISION}`,
    '',
    '## Perfil',
    '',
    `- Categoria: ${p.category || 'pendente'}; uso: ${p.usage || 'pendente'}`,
    `- Propulsão: ${p.powertrain || 'pendente'}; combustível: ${p.fuel || 'pendente'}`,
    `- Origem / modalidade: ${p.origin || 'pendente'} / ${p.purpose || 'pendente'}`,
    `- MTMA/PBT: ${p.massKg ?? 'pendente'} kg; ordem de marcha: ${p.massRunningKg ?? 'pendente'} kg`,
    `- Carga útil: ${p.payloadKg ?? 'pendente'} kg; lotação incluindo motorista: ${p.seats ?? 'pendente'}`,
    `- Ano de referência: ${p.year ?? 'pendente'}`,
    '',
    '## Enquadramento ambiental',
    '',
    assessment.emissions.label,
    '',
    assessment.emissions.phase,
    '',
    ...assessment.emissions.particularities.map((value) => `- ${value}`),
    '',
    '## Alertas e dados pendentes',
    '',
    ...(assessment.warnings.length || assessment.missing.length
      ? [
          ...assessment.warnings,
          ...assessment.missing.map((value) => `Dado pendente: ${value}`),
        ].map((value) => `- ${value}`)
      : [
          'Nenhuma inconsistência detectada nos campos estruturados. A revisão técnica de aplicabilidade continua necessária.',
        ]),
    '',
    '## Checklist de trabalho',
    '',
  ];
  for (const item of checklist) {
    const check = checks[item.id] || {};
    const status = Object.hasOwn(statusLabels, check.status) ? check.status : 'pending';
    const stale = needsRegulatoryReview(check);
    out.push(
      `### ${item.title}`,
      '',
      `- [${status === 'done' && !stale ? 'x' : ' '}] ${statusLabels[status]}${stale ? ' — base anterior; revalidar' : ''} · ${item.agency} · ${item.applicability}`,
      '',
      item.description,
      '',
      `Fundamento da tarefa: ${item.reason}`,
      '',
    );
    if (stale)
      out.push(
        'A conclusão ou justificativa registrada precisa de nova conferência na base atual. As evidências anteriores permanecem como histórico de trabalho.',
        '',
      );
    if (check.regulatoryRevision)
      out.push(`Base registrada na tarefa: ${line(check.regulatoryRevision)}`, '');
    if (item.blockedBy.length) out.push(`Depende de: ${item.blockedBy.join(', ')}`, '');
    if (check.note) out.push(`Registro / justificativa: ${text(check.note)}`, '');
    if (check.evidence)
      out.push(
        `Evidência informada pelo usuário: ${Array.isArray(check.evidence) ? check.evidence.map(line).join('; ') : text(check.evidence)}`,
        '',
      );
    out.push(`Evidências a organizar: ${item.evidence.join('; ')}`, '');
    for (const id of item.sourceIds) {
      const source = SOURCE_REFERENCES.find((entry) => entry.id === id);
      if (source)
        out.push(
          `- [${source.title}](${source.url}) — ${source.device}. Limite: ${source.limitations}`,
        );
    }
    out.push('');
  }
  out.push(
    '## Limite de cobertura',
    '',
    'A matriz não é exaustiva para todo veículo, peça ou operação. Requisitos sem método, dispositivo ou texto integral revisado permanecem pendentes. Consultar modificadores e transições nas fontes oficiais antes de projetar, ensaiar ou protocolar.',
    '',
  );
  return out.join('\n');
}

module.exports = {
  DEFAULT_PROFILE,
  normalizeProfile,
  evaluateProfile,
  buildChecklist,
  buildFlow,
  exportProcessMarkdown,
  SOURCE_REFERENCES,
};
