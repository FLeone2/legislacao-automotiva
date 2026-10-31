'use strict';

// This is a read-only projection. Legal/editorial states are owned by the
// canonical generators; illustration and workflow links never establish duty.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const jsonl = (file) =>
  fs.readFileSync(path.join(ROOT, file), 'utf8').trim().split('\n').map(JSON.parse);
const unique = (values) => [...new Set(values.filter(Boolean))];
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const pick = (value, fields) =>
  value == null
    ? null
    : Object.fromEntries(
        fields.filter((field) => value[field] !== undefined).map((field) => [field, value[field]]),
      );
const coverage = require('../src/guide/subsystem-coverage.js');
const VehicleLegislation = require('../src/core/vehicle-legislation.js');
const GuideTraceability = require('../src/guide/traceability.js');
const processModel = require('../src/guide/process-model.js');
const mapping = read('data/vehicle-legislation/reviewed-map.json');
const knowledge = read('knowledge/manifest.json');
const regulatoryRevision = read('data/process/regulatory-revision.json');
const coverageReport = read('data/process/regulatory-coverage.json');
const cards = jsonl('knowledge/records.jsonl');
const sourceContexts = jsonl('knowledge/source-contexts.jsonl');
const pdfReview = fs.existsSync(path.join(ROOT, 'data/prototype/pdf-review.json'))
  ? read('data/prototype/pdf-review.json')
  : { records: [] };

// The source file intentionally stays an ES module for the 3D application.
const partsContext = vm.createContext({});
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'src/guide/vehicle-parts.js'), 'utf8').replace(/^export /gm, '') +
    '\nglobalThis.prototypeParts = PARTS;',
  partsContext,
);
const parts = JSON.parse(JSON.stringify(partsContext.prototypeParts));

function verifiedPdf(record) {
  if (record.status !== 'verified_pdf' || !record.path || !record.titleEvidence) return false;
  const absolute = path.resolve(ROOT, record.path);
  if (!absolute.startsWith(path.join(ROOT, 'pdfs/prototype/')) || !fs.existsSync(absolute))
    return false;
  const bytes = fs.readFileSync(absolute);
  return (
    bytes.subarray(0, 5).toString() === '%PDF-' &&
    bytes.length === record.byteLength &&
    sha256(bytes) === record.sha256
  );
}

const acts = cards
  .filter((card) => card.publication?.included !== false)
  .map((card) => {
    const copies = pdfReview.records.filter(
      (record) => record.actId === card.id && verifiedPdf(record),
    );
    const primary = copies.find((record) => record.primary) || copies[0];
    return {
      ...pick(card, [
        'id',
        'title',
        'agency',
        'aliases',
        'officialUrl',
        'limitations',
        'relatedCandidates',
        'requirementIds',
        'revision',
        'reviewDate',
        'provenance',
        'stateProvenance',
      ]),
      legalStatus: pick(card.legalStatus, ['state', 'asOf', 'basis']),
      reviewStatus: pick(card.reviewStatus, [
        'state',
        'fullTextReviewed',
        'amendmentChainReviewed',
        'reviewedAt',
        'summary',
      ]),
      applicability: pick(card.applicability, ['state', 'vehicleSpecific', 'basis']),
      publication: card.publication,
      description: card.summary || card.title,
      detailPath: card.detailPath ? `/${card.detailPath}` : null,
      markdownPath: `/knowledge/${card.markdownPath}`,
      pdfUrl: primary ? `/${primary.path}` : null,
      pdfOfficialUrl: primary?.url || null,
      pdfStatus: primary ? 'verified_pdf' : 'official_source_only',
      pdf: primary || null,
      pdfVariants: copies,
      automaticApplicability: false,
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id, 'en'));
const byId = new Map(acts.map((act) => [act.id, act]));
const detailed = cards.map((card) => ({
  ...(card.detailPath ? read(card.detailPath) : {}),
  ...card,
  _summary: false,
  issuer: card.agency,
}));
const trace = GuideTraceability.create({
  resolver: VehicleLegislation.create(mapping),
  catalogRecords: detailed,
  reviewedAt: mapping.asOf,
});

function references(selection) {
  const result = trace(selection);
  const idsFor = (kind) =>
    unique(
      result.relations
        .filter((relation) => relation.kind === kind)
        .flatMap((relation) =>
          relation.topics.flatMap((topic) => topic.records.map((record) => record.canonicalId)),
        ),
    );
  const componentActIds = idsFor('component');
  const vehicleContextActIds = idsFor('vehicle');
  const relations = result.relations.map((relation) => ({
    kind: relation.kind,
    label: relation.label,
    topics: relation.topics.map((topic) => ({
      id: topic.id,
      label: topic.label,
      lane: topic.lane,
      subsystemId: topic.subsystemId,
      legacyPartIds: topic.legacyPartIds,
      gaps: topic.gaps,
      records: topic.records.map((record) => ({
        canonicalId: record.canonicalId,
        requirementIds: record.requirementIds,
        mappingEvidence: record.mappingEvidence.map((evidence) =>
          pick(evidence, ['legacyPartId', 'topicId', 'relation', 'basis', 'note']),
        ),
      })),
    })),
  }));
  return {
    actIds: unique([...componentActIds, ...vehicleContextActIds]),
    componentActIds,
    vehicleContextActIds,
    requirementIds: unique(
      relations.flatMap((relation) =>
        relation.topics.flatMap((topic) =>
          topic.records.flatMap((record) => record.requirementIds),
        ),
      ),
    ),
    relations,
    gaps: result.gaps,
    assessment: pick(result.assessment, ['state', 'automaticObligation']),
    mappingReviewedAt: result.reviewedAt,
  };
}

const subsystems = coverage.ALL_SUBSYSTEMS.map((row) => ({
  ...pick(row, [
    'id',
    'label',
    'description',
    'canonical',
    'exampleOnly',
    'assemblyId',
    'assemblyIds',
    'system',
    'systemLabel',
    'anchor',
    'applicabilityHints',
  ]),
  ...references(coverage.subsystemSelection(row.id)),
}));
const assemblies = parts.map((part) => ({
  ...part,
  subsystemIds: subsystems.filter((row) => row.assemblyIds.includes(part.id)).map((row) => row.id),
  // Trace the actual assembly's source regions, not its taxonomy or descendants.
  ...references(part),
}));

function normalizedUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.searchParams.delete('layout');
    return url
      .toString()
      .replace(/\/@@display-file\/file\/?$/, '')
      .replace(/\/$/, '');
  } catch {
    return null;
  }
}
const sources = processModel.SOURCE_REFERENCES.map((source) => {
  const explicit = unique([
    source.actId,
    ...(source.relatedActIds || []),
    ...sourceContexts
      .filter((context) => context.sourceId === source.id)
      .map((context) => context.actId),
    ...acts
      .filter(
        (act) =>
          act.id === source.id || normalizedUrl(act.officialUrl) === normalizedUrl(source.url),
      )
      .map((act) => act.id),
  ]).filter((id) => byId.has(id));
  return { ...source, actIds: explicit, relation: 'source_context', automaticApplicability: false };
});
const sourceById = new Map(sources.map((source) => [source.id, source]));
// The empty profile deliberately avoids treating an illustrative SUV's numbers
// as a user's technical configuration. The existing rules choose task wording.
const emptyProfile = Object.fromEntries(
  Object.keys(processModel.DEFAULT_PROFILE).map((key) => [key, null]),
);
emptyProfile.name = 'Projeto a enquadrar';
const tasks = processModel.buildChecklist(emptyProfile).map((task) => ({
  ...task,
  actIds: unique(task.sourceIds.flatMap((id) => sourceById.get(id)?.actIds || [])),
  relation: 'workflow_consultation_context',
  automaticApplicability: false,
}));
const flow = processModel.buildFlow(emptyProfile);
const stages = flow.nodes.map((node) => {
  const stageTasks = tasks.filter((task) => task.stage === node.id);
  const actIds = unique(stageTasks.flatMap((task) => task.actIds));
  return {
    id: node.id,
    label: node.title.replace(/^\d+ · /, ''),
    description: node.description,
    agency: node.agency,
    actIds,
    sourceIds: unique(stageTasks.flatMap((task) => task.sourceIds)),
    taskIds: stageTasks.map((task) => task.id),
    tasks: stageTasks,
    assemblyIds: assemblies
      .filter((assembly) => assembly.actIds.some((id) => actIds.includes(id)))
      .map((assembly) => assembly.id),
    assemblyRelation: 'shared_consultation_reference_only',
    dependencies: flow.edges
      .filter((edge) => edge.target === node.id && !edge.label)
      .map((edge) => edge.source),
    limitations: [
      'Etapa de consulta e planejamento. As regras do perfil e a evidência de cada dispositivo definem o caminho aplicável.',
    ],
    automaticApplicability: false,
  };
});
const serviceReviewPath = 'data/prototype/services-review.json';
const defaultServices = sources
  .filter((source) =>
    [
      'ibama-lcvm-service',
      'ibama-lcm-service',
      'senatran-cat-service',
      'guide-senatran-siscat',
    ].includes(source.id),
  )
  .map((source) => ({
    id: source.id,
    label: source.title,
    description: source.scope,
    url: source.url,
    checkedAt: source.checkedAt || null,
    limitations: [
      source.limitations,
      'O protótipo não está autenticado neste serviço e não realiza protocolo.',
    ],
    verification: 'official_guidance_in_project_registry',
  }));
const serviceReview = fs.existsSync(path.join(ROOT, serviceReviewPath))
  ? read(serviceReviewPath)
  : null;
const serviceLinks = Array.isArray(serviceReview)
  ? serviceReview
  : serviceReview?.records || defaultServices;

for (const act of acts) {
  act.assemblyIds = assemblies
    .filter((assembly) => assembly.actIds.includes(act.id))
    .map((assembly) => assembly.id);
  act.subsystemIds = subsystems
    .filter((subsystem) => subsystem.actIds.includes(act.id))
    .map((subsystem) => subsystem.id);
  act.stageIds = stages.filter((stage) => stage.actIds.includes(act.id)).map((stage) => stage.id);
}
const inputPaths = [
  'scripts/build-prototype-data.cjs',
  'knowledge/records.jsonl',
  'knowledge/source-contexts.jsonl',
  'knowledge/manifest.json',
  'data/vehicle-legislation/reviewed-map.json',
  'src/guide/subsystem-coverage.js',
  'src/guide/vehicle-parts.js',
  'src/guide/process-model.js',
  'src/guide/traceability.js',
  'data/prototype/pdf-review.json',
  ...(serviceReview ? [serviceReviewPath] : []),
].filter((file) => fs.existsSync(path.join(ROOT, file)));
const provenance = inputPaths.map((file) => ({
  path: file,
  sha256: sha256(fs.readFileSync(path.join(ROOT, file))),
}));
const catalog = {
  schemaVersion: 1,
  revision: sha256(JSON.stringify(provenance)),
  knowledgeRevision: knowledge.revision,
  regulatoryRevision: regulatoryRevision.revision,
  asOf: regulatoryRevision.asOf,
  scope:
    'Consulta e planejamento a partir do acervo publicado; a geometria e os vínculos não comprovam aplicabilidade ou homologação.',
  scopeNote: knowledge.scopeNote,
  automaticApplicability: false,
  counts: {
    acts: acts.length,
    assemblies: assemblies.length,
    subsystems: subsystems.length,
    canonicalSubsystems: subsystems.filter((row) => row.canonical).length,
    supplementalSubsystems: subsystems.filter((row) => !row.canonical).length,
    stages: stages.length,
    verifiedPdfActs: acts.filter((act) => act.pdfStatus === 'verified_pdf').length,
  },
  acts,
  assemblies,
  subsystems,
  stages,
  tasks,
  sources,
  serviceLinks,
  workflow: { profile: emptyProfile, edges: flow.edges, ruleModule: 'src/guide/process-model.js' },
  coverage: {
    summary: coverageReport.summary,
    detailPath: '/data/process/regulatory-coverage.json',
    scopeNote: coverageReport.scopeNote,
    universalCoverageConfirmed: false,
  },
  provenance,
};
const destination = path.join(ROOT, 'data/prototype/catalog.json');
const output = JSON.stringify(catalog) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) {
    console.error('Prototype catalog is stale; run node scripts/build-prototype-data.cjs');
    process.exitCode = 1;
  }
} else {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output)
    fs.writeFileSync(destination, output);
  console.log(
    `Prototype catalog: ${acts.length} acts, ${assemblies.length} assemblies, ${subsystems.length} subsystems, ${catalog.counts.verifiedPdfActs} acts with verified PDFs.`,
  );
}
