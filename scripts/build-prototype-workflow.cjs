'use strict';

// Analyst planning records preserve their citations; this projection does not
// turn a procedural recommendation into a legal obligation for every vehicle.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = (name, fallback = {}) =>
  fs.existsSync(path.join(root, name))
    ? JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'))
    : fallback;
const list = (value) => (Array.isArray(value) ? value : Object.values(value || {}));
const unique = (values) => [...new Set(values.filter(Boolean))];
const catalog = read('data/prototype/catalog.json');
const requirements = read('data/requirements/catalog.json').records || [];
const emissions = read('data/prototype/workflow-emissions.json');
const safety = read('data/prototype/workflow-safety.json');
const technical = read('data/site/technical-standards.json').records || [];
const byAct = new Map(catalog.acts.map((act) => [act.id, act]));
const aliases = new Map();
for (const act of catalog.acts) {
  aliases.set(act.id, act.id);
  for (const alias of act.aliases || []) {
    if (byAct.has(alias)) continue;
    if (!aliases.has(alias)) aliases.set(alias, act.id);
    else if (aliases.get(alias) !== act.id) aliases.set(alias, null);
  }
}
const options = (values) => values.map(([value, label]) => ({ value, label }));
const profileFields = [
  {
    key: 'category',
    label: 'Categoria',
    type: 'select',
    options: options([
      ['M1', 'M1'],
      ['M2', 'M2'],
      ['M3', 'M3'],
      ['N1', 'N1'],
      ['N2', 'N2'],
      ['N3', 'N3'],
      ['O', 'Reboque / semirreboque'],
      ['L', 'Categoria L'],
    ]),
  },
  {
    key: 'vehicleType',
    label: 'Tipo de veículo',
    type: 'select',
    options: options([
      ['automovel', 'Automóvel'],
      ['camioneta', 'Camioneta'],
      ['caminhonete', 'Caminhonete'],
      ['utilitario', 'Utilitário'],
      ['microonibus', 'Micro-ônibus'],
      ['onibus', 'Ônibus'],
      ['caminhao', 'Caminhão'],
      ['caminhao-trator', 'Caminhão-trator'],
      ['reboque', 'Reboque / semirreboque'],
      ['outro', 'Outro'],
    ]),
  },
  {
    key: 'propulsion',
    label: 'Propulsão',
    type: 'select',
    options: options([
      ['ice', 'Combustão'],
      ['hev', 'Híbrido HEV'],
      ['phev', 'Híbrido plug-in PHEV'],
      ['bev', 'Elétrico BEV'],
    ]),
  },
  {
    key: 'fuel',
    label: 'Combustível',
    type: 'select',
    options: options([
      ['gasoline', 'Gasolina'],
      ['flex', 'Flex'],
      ['diesel', 'Diesel'],
      ['electric', 'Elétrico'],
    ]),
  },
  { key: 'grossMassKg', label: 'PBT / MTMA (kg)', type: 'number', min: 1 },
  { key: 'massRunningKg', label: 'Massa em ordem de marcha (kg)', type: 'number', min: 1 },
  { key: 'payloadKg', label: 'Carga útil (kg)', type: 'number', min: 0 },
  { key: 'seats', label: 'Lotação, incluindo motorista', type: 'number', min: 1 },
  { key: 'year', label: 'Ano de referência', type: 'number', min: 1900 },
  {
    key: 'origin',
    label: 'Origem',
    type: 'select',
    options: options([
      ['national', 'Nacional'],
      ['imported', 'Importado'],
    ]),
  },
  {
    key: 'purpose',
    label: 'Processo',
    type: 'select',
    options: options([
      ['series', 'Novo modelo / série'],
      ['limited', 'Quantidade limitada'],
      ['modification', 'Alteração de configuração'],
      ['component', 'Componente'],
    ]),
  },
  { key: 'derivedFromPassenger', label: 'Derivado de veículo de passageiros', type: 'boolean' },
  { key: 'offroad', label: 'Uso fora de estrada tecnicamente enquadrado', type: 'boolean' },
  { key: 'radio', label: 'Equipamentos de rádio', type: 'boolean' },
  {
    key: 'componentMarket',
    label: 'Aplicação do componente',
    type: 'select',
    options: options([
      ['oem', 'Original / OEM'],
      ['replacement', 'Reposição'],
    ]),
  },
];
const rawSteps = [...list(emissions.steps), ...list(safety.steps)];
const seen = new Set();
const steps = rawSteps.map((step, index) => {
  if (!step.id || seen.has(step.id))
    throw new Error('Missing or duplicate analyst step: ' + step.id);
  seen.add(step.id);
  const statedActs = unique([
    ...(step.actIds || []),
    ...list(step.sources).map((source) => source.actId),
  ]);
  const actIds = unique(statedActs.map((id) => aliases.get(id)).filter((id) => byAct.has(id)));
  return {
    ...step,
    title: step.title || step.label,
    label: step.label || step.title,
    order: step.order ?? index,
    actIds,
    unresolvedActIds: statedActs.filter((id) => !aliases.has(id)),
    sourceIds: unique([
      ...(step.sourceIds || []),
      ...list(step.sources).map((source) => source.sourceId || source.id),
    ]),
    standardIds: unique([
      ...(step.standardIds || []),
      ...technical
        .filter((standard) => actIds.includes(standard.actId))
        .map((standard) => standard.id),
    ]),
    requirementIds: unique(step.requirementIds || []),
    automaticApplicability: false,
  };
});
const sources = [
  ...list(catalog.sources),
  ...list(emissions.sources),
  ...list(safety.sources),
  ...rawSteps.flatMap((step) => list(step.sources)),
];
const bySource = new Map();
for (const source of sources) {
  const id = source.id || source.sourceId;
  if (!id) continue;
  const previous = bySource.get(id) || {};
  bySource.set(id, {
    ...previous,
    ...source,
    id,
    title: source.title || previous.title || byAct.get(source.actId)?.title || id,
    evidenceType: source.evidenceType || source.kind || previous.evidenceType || null,
  });
}
for (const step of steps) {
  if (step.id === 'em-07-infoserv') step.fieldGroups = list(emissions.fieldGroups);
  if (step.id === 'sa-08-dossier') step.reportChecklist = list(safety.reportChecklist);
  step.dependencyLinks = [
    ...list(step.dependencies || step.dependsOn),
    ...list(step.conditionalDependencies),
  ]
    .map((entry) => {
      const id = typeof entry === 'string' ? entry : entry.stepId || entry.id;
      return {
        ...(typeof entry === 'object' ? entry : {}),
        id,
        label: steps.find((other) => other.id === id)?.title || id,
        conditional: typeof entry === 'object' && Boolean(entry.when || entry.condition),
      };
    })
    .filter((entry) => entry.id);
}
const extraStandards = list(emissions.standards).map((standard) => ({
  ...standard,
  designation: standard.designation || standard.label,
  actIds: unique((standard.sourceIds || []).map((id) => aliases.get(id)).filter(Boolean)),
  reviewState: 'reference_only',
  applicability: 'requires_assessment',
  currentEditionConfirmed: false,
}));
const foreignReferences = [
  ...list(emissions.internationalReferences),
  ...list(safety.foreignReferences),
];
const phases = [
  {
    id: 'configuration',
    label: 'Configuração',
    stepIds: ['em-01-enquadramento', 'sa-01-identity'],
  },
  {
    id: 'plan',
    label: 'Plano de ensaios',
    stepIds: ['em-02-plano-laboratorio', 'sa-02-matrix', 'sa-03-laboratory'],
  },
  {
    id: 'preparation',
    label: 'Preparação',
    stepIds: ['em-03-coastdown', 'em-04-precondicionamento'],
  },
  {
    id: 'tests',
    label: 'Ensaios',
    stepIds: [
      'em-05-ensaios',
      'em-06-consolidacao',
      'sa-04-level1',
      'sa-05-active',
      'sa-06-passive',
      'sa-07-components',
    ],
  },
  { id: 'ibama', label: 'IBAMA', stepIds: ['em-07-infoserv', 'em-08-lcvm'] },
  {
    id: 'siscat',
    label: 'SISCAT',
    stepIds: ['sa-08-dossier', 'sa-09-siscat', 'sa-10-cat-followup'],
  },
  { id: 'production', label: 'Conformidade', stepIds: ['sa-11-cop'] },
].map((phase) => ({ ...phase, stepIds: phase.stepIds.filter((id) => seen.has(id)) }));
const ungrouped = steps.filter((step) => !phases.some((phase) => phase.stepIds.includes(step.id)));
if (ungrouped.length)
  phases.push({
    id: 'additional',
    label: 'Particularidades',
    stepIds: ungrouped.map((step) => step.id),
  });
const output = {
  schemaVersion: 1,
  asOf: catalog.asOf,
  catalogRevision: catalog.revision,
  profileFields,
  phases,
  steps,
  sources: [...bySource.values()],
  requirements: requirements.filter((requirement) => byAct.has(requirement.actId)),
  standards: [...technical.filter((standard) => byAct.has(standard.actId)), ...extraStandards],
  foreignReferences,
  crosswalk: list(safety.crosswalk),
  fieldGroups: list(emissions.fieldGroups),
  gates: list(emissions.gates),
  reportChecklist: list(safety.reportChecklist),
  reportControls: list(safety.reportControls),
  scope: {
    authenticatedServices: false,
    automaticApplicability: false,
    privateMethodsIncluded: false,
    completenessCertified: false,
  },
};
output.revision = crypto.createHash('sha256').update(JSON.stringify(output)).digest('hex');
const target = path.join(root, 'data/prototype/workflow.json');
const bytes = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== bytes)
    throw new Error('Stale prototype workflow');
} else fs.writeFileSync(target, bytes);
console.log(
  `Analyst workflow: ${steps.length} steps, ${phases.length} phases, ${output.standards.length} technical references.`,
);
