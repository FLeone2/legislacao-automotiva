import processModel from '../guide/process-model.js';

const list = (value) =>
  Array.isArray(value) ? value : typeof value === 'string' ? [value] : Object.values(value || {});
const unique = (values) => [...new Set(values.filter(Boolean))];
const text = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const boolean = (value) =>
  value === true || value === 'true' ? true : value === false || value === 'false' ? false : null;

export async function loadPrototypeWorkflow(url = '/data/prototype/workflow.json') {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível carregar o fluxo.');
  const data = await response.json();
  if (data.schemaVersion !== 1 || !Array.isArray(data.steps)) throw new Error('Fluxo inválido.');
  return data;
}

export function normalizeWorkflowProfile(input = {}) {
  const empty = Object.fromEntries(
    Object.keys(processModel.DEFAULT_PROFILE).map((key) => [key, null]),
  );
  const originalCategory = input.category || '';
  const category = /^L\d/.test(originalCategory)
    ? 'L'
    : /^O\d/.test(originalCategory)
      ? 'O'
      : originalCategory;
  const declaredPropulsion = input.propulsion ?? input.powertrain ?? null;
  const declaredFuel = input.fuel ?? null;
  const declaredOperation = input.purpose ?? input.operation ?? null;
  const purpose =
    { new: 'series', importation: 'series', production: 'series' }[declaredOperation] ||
    declaredOperation;
  const canonical = processModel.normalizeProfile({
    ...empty,
    ...input,
    category,
    massKg: input.grossMassKg ?? input.massKg ?? null,
    powertrain: declaredPropulsion === 'combustion' ? 'ice' : declaredPropulsion,
    year: input.year ?? input.modelYear ?? null,
    usage: input.usage ?? input.use ?? null,
    componentMarket:
      input.componentMarket ?? input.componentApplication ?? input.application ?? null,
    purpose,
    origin: input.origin || (declaredOperation === 'importation' ? 'imported' : null),
    derivedFromPassenger: boolean(input.derivedFromPassenger),
    offroad: boolean(input.offroad),
    radio: boolean(input.radio),
  });
  return {
    ...canonical,
    propulsion: canonical.powertrain,
    grossMassKg: canonical.massKg,
    vehicleType: input.vehicleType || '',
    subcategory: input.subcategory || (category !== originalCategory ? originalCategory : ''),
    declaredFuel,
    declaredOperation,
    scopeGaps:
      declaredFuel && !['flex', 'gasoline', 'diesel', 'electric'].includes(declaredFuel)
        ? [
            'Combustível informado preservado; este roteiro ainda não tem regras específicas estruturadas para ele.',
          ]
        : [],
  };
}

function matchesConditions(conditions, profile, classification) {
  if (!conditions || (Array.isArray(conditions) && !conditions.length)) return 'conditional';
  if (Array.isArray(conditions)) return 'conditional';
  const current = {
    ...profile,
    fuel: profile.declaredFuel || profile.fuel,
    environmentFamily: ['pending', 'unknown'].includes(classification.family)
      ? null
      : classification.family,
    environmentClass: classification.environmentClass,
  };
  let unknown = false;
  let tested = false;
  const keys = new Set([
    'category',
    'vehicleType',
    'propulsion',
    'powertrain',
    'fuel',
    'origin',
    'purpose',
    'environmentFamily',
    'environmentClass',
    'componentMarket',
  ]);
  for (const [key, expected] of Object.entries(conditions)) {
    if (!keys.has(key) || !Array.isArray(expected)) continue;
    tested = true;
    if (current[key] === null || current[key] === undefined || current[key] === '') unknown = true;
    else if (
      !expected.some(
        (item) =>
          text(item).replace(/[^a-z0-9]/g, '') === text(current[key]).replace(/[^a-z0-9]/g, ''),
      )
    )
      return 'outside_profile';
  }
  const range = conditions.massRange;
  if (range?.field) {
    tested = true;
    const value = Number(profile[range.field]);
    if (!value) unknown = true;
    else if (
      (range.maxInclusive !== undefined && value > range.maxInclusive) ||
      (range.minInclusive !== undefined && value < range.minInclusive)
    )
      return 'outside_profile';
  }
  return tested && !unknown ? 'profile_match' : 'conditional';
}

export function buildWorkflow(profile = {}, data = {}, catalog = {}) {
  const normalized = normalizeWorkflowProfile(profile);
  const evaluation = processModel.evaluateProfile(normalized);
  evaluation.warnings = [...(evaluation.warnings || []), ...normalized.scopeGaps];
  const environmental =
    evaluation.environmental || evaluation.emissions || evaluation.environment || {};
  const label = environmental.label || '';
  const environmentClass =
    environmental.family === 'light' && /^LP —/.test(label)
      ? 'LP'
      : environmental.family === 'light' && /^LC —/.test(label)
        ? 'LC'
        : null;
  const classification = {
    ...environmental,
    environmentClass,
    shortLabel:
      environmentClass ||
      (environmental.family === 'heavy'
        ? 'Pesado'
        : environmental.family === 'promot'
          ? 'PROMOT'
          : environmental.family === 'light'
            ? 'LP / LC a definir'
            : 'Enquadramento a definir'),
  };
  const steps = list(data.steps).map((step) => ({
    ...step,
    scopeReferral:
      ['em-07-infoserv', 'em-08-lcvm'].includes(step.id) &&
      ['heavy', 'promot'].includes(classification.family)
        ? classification.family === 'heavy'
          ? {
              label: 'Ramo P8 — detalhamento pendente',
              description:
                'A LCVM também abrange veículos pesados, pelo Infoserv 2. Prepare os ensaios e o dossiê próprios do ramo P8. O detalhamento de leves desta etapa não define os campos ou métodos de pesados e não indica dispensa.',
              actIds: ['conama-490-2018'],
              sourceIds: ['ibama-lcvm-service'],
            }
          : {
              label: 'Ramo PROMOT / LCM',
              description:
                'Consulte o serviço LCM e o formulário próprio no Infoserv. Não reutilize o pacote de leves ou trate a ausência de detalhamento como dispensa.',
              actIds: [],
              sourceIds: ['ibama-lcm-service'],
            }
        : null,
    status: matchesConditions(step.conditions, normalized, classification),
    tests: list(step.tests).map((test) =>
      typeof test === 'string'
        ? { id: test, label: test, status: 'conditional' }
        : { ...test, status: matchesConditions(test.conditions, normalized, classification) },
    ),
  }));
  const built = {
    ...data,
    profile: normalized,
    evaluation,
    classification,
    missing: (evaluation.missing || []).filter(
      (label) => !normalized.declaredFuel || !label.startsWith('Combustível'),
    ),
    scopeGaps: normalized.scopeGaps,
    steps,
  };
  built.tree = getWorkflowTree(built, normalized, catalog);
  return built;
}

function standardNode(standard, parentId) {
  const label = [
    standard.designation || standard.label || standard.literal,
    standard.edition ? `(${standard.edition})` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const european =
    standard.jurisdiction ||
    /(?:\bUN\b|UNECE|ECE|EU\b|CE\b|CEE|Regulamento.*Europe|Diretiva)/i.test(label);
  return {
    id: `${parentId}:standard:${standard.id}`,
    label,
    kind: european ? 'international_reference' : 'standard',
    standardIds: [standard.id],
    children: [],
    url:
      standard.url ||
      (/\bNBR\b/i.test(label) ? 'https://www.abntcatalogo.com.br/' : standard.sourceUrl || null),
    sourceUrl: standard.sourceUrl,
    clause: standard.clause,
    scope: standard.scope,
    edition: standard.edition,
    notes: standard.notes || standard.description || standard.limitations,
    editionCited: standard.editionCited,
    reviewState: standard.reviewState,
    relation: standard.relation || 'cited_reference',
    acceptedEquivalent: false,
    limitations: european
      ? [
          'Referência internacional citada; equivalência e aceitação do relatório dependem do dispositivo aplicável.',
        ]
      : [
          'A edição e o método devem ser confirmados na cadeia aplicável. Texto privado não reproduzido.',
        ],
  };
}

export function getWorkflowTree(workflow = {}, profile = {}, catalog = {}, stepId = null) {
  const actMap = new Map(list(catalog.acts).map((act) => [act.id, act]));
  const requirementMap = new Map(
    list(workflow.requirements).map((requirement) => [requirement.id, requirement]),
  );
  const standardMap = new Map(list(workflow.standards).map((standard) => [standard.id, standard]));
  const sourceMap = new Map(
    [...list(catalog.sources), ...list(workflow.sources)].map((source) => [
      source.id || source.sourceId,
      source,
    ]),
  );
  const foreignMap = new Map(
    list(workflow.foreignReferences).map((reference) => [reference.id, reference]),
  );
  const actNode = (id, parentId) => {
    const act = actMap.get(id);
    if (!act) return null;
    const nodeId = `${parentId}:act:${id}`;
    const standards = [...standardMap.values()].filter((standard) => standard.actId === id);
    const foreign = [...foreignMap.values()].filter(
      (reference) => reference.actId === id || reference.sourceIds?.includes(id),
    );
    return {
      id: nodeId,
      label: act.title,
      kind: 'act',
      actIds: [id],
      act,
      description: act.description,
      url: act.pdfUrl || act.officialUrl,
      markdownPath: act.markdownPath,
      children: [...standards, ...foreign].map((standard) => standardNode(standard, nodeId)),
      limitations: act.limitations,
    };
  };
  const stepNodes = list(workflow.steps)
    .filter((step) => !stepId || step.id === stepId)
    .map((originalStep) => {
      const step = originalStep.scopeReferral
        ? {
            ...originalStep,
            ...originalStep.scopeReferral,
            tests: [],
            requirementIds: [],
          }
        : originalStep;
      const nodeId = `step:${step.id}`;
      const tests = list(step.tests).map((test, index) => {
        if (typeof test === 'string') test = { label: test };
        const testId = `${nodeId}:test:${test.id || index}`;
        const explicitActs = unique([
          ...(test.actIds || []),
          ...list(test.sources).map((source) => source.actId),
        ]);
        const acts = explicitActs.map((id) => actNode(id, testId)).filter(Boolean);
        const standards = unique([
          ...(test.standardIds || []),
          ...(test.methodRefIds || []),
          ...(test.methodRefs || []),
        ])
          .map((id) => standardMap.get(id))
          .filter(Boolean)
          .map((standard) => standardNode(standard, testId));
        const foreign = unique([
          ...(test.foreignReferenceIds || []),
          ...(test.internationalReferenceIds || []),
        ])
          .map((id) => foreignMap.get(id))
          .filter(Boolean)
          .map((reference) => standardNode(reference, testId));
        return {
          ...test,
          id: testId,
          label: test.label || test.title || test.id,
          kind: 'test',
          children: [...acts, ...standards, ...foreign],
          actIds: explicitActs,
          standardIds: test.standardIds || [],
          description: test.description || test.purpose,
          inputs: test.inputs,
          preconditioning: test.preconditions || test.preconditioning,
          outputs: test.outputs,
          limitations: unique([...list(test.limitations), ...list(test.gaps)]),
          status: test.status || 'conditional',
          methodRefs: test.methodRefs,
          sources: test.sources,
        };
      });
      const acts = (step.actIds || []).map((id) => actNode(id, nodeId)).filter(Boolean);
      const sources = (step.sourceIds || [])
        .map((id) => sourceMap.get(id))
        .filter(Boolean)
        .filter((source) => !step.actIds?.includes(source.id))
        .map((source) => ({
          id: `${nodeId}:source:${source.id || source.sourceId}`,
          label: source.title || source.label,
          kind: 'source',
          sourceIds: [source.id || source.sourceId],
          url: source.url || source.officialUrl,
          description: source.scope || source.description,
          evidenceType: source.evidenceType || source.kind || null,
          device: source.device,
          children: [],
          limitations: source.limitations,
        }));
      const requirements = (step.requirementIds || [])
        .map((id) => requirementMap.get(id))
        .filter(Boolean)
        .map((requirement) => ({
          id: `${nodeId}:requirement:${requirement.id}`,
          label: requirement.title,
          kind: 'requirement',
          requirementIds: [requirement.id],
          description: requirement.rule,
          clause: requirement.clause,
          children: [],
          limitations: requirement.limitations,
        }));
      const scopedActIds = new Set([
        ...(step.actIds || []),
        ...tests.flatMap((test) => test.actIds || []),
      ]);
      const crosswalk = list(workflow.crosswalk)
        .filter(
          (entry) =>
            step.id === 'sa-11-cop' || entry.senatranActIds?.some((id) => scopedActIds.has(id)),
        )
        .map((entry) => ({
          id: `${nodeId}:crosswalk:${entry.id}`,
          label: `MOVER · ${entry.safetyTopic}`,
          kind: 'crosswalk',
          children: [
            ...(entry.moverRefs || [])
              .map((id) => actNode(id, `${nodeId}:crosswalk:${entry.id}`))
              .filter(Boolean),
            ...(entry.equivalentRefs || [])
              .map((id) => foreignMap.get(id))
              .filter(Boolean)
              .map((reference) => standardNode(reference, `${nodeId}:crosswalk:${entry.id}`)),
          ],
          description: 'Conferir configuração, escopo e evidências exigidos nos dois processos.',
          relation: entry.relation,
          conditions: entry.categoryConditions,
          sources: entry.evidence,
          limitations: entry.gaps,
          reportReusableAutomatically: false,
        }));
      return {
        id: nodeId,
        label: originalStep.title || originalStep.label,
        kind: 'step',
        scopeReferral: originalStep.scopeReferral,
        description: originalStep.scopeReferral?.description,
        stepId: step.id,
        children: [...tests, ...acts, ...sources, ...requirements, ...crosswalk],
        actIds: step.actIds || [],
        sourceIds: step.sourceIds || [],
        standardIds: step.standardIds || [],
        limitations: unique([...list(step.limitations), ...list(step.gaps)]),
        status: step.status,
      };
    });
  return {
    id: 'homologation',
    label: 'Homologação',
    kind: 'root',
    children: stepNodes,
    automaticApplicability: false,
  };
}
