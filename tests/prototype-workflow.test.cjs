'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const data = read('data/prototype/workflow.json');
const catalog = read('data/prototype/catalog.json');
const documents = read('data/prototype/document-chunks.json');
const load = (file) => import(pathToFileURL(path.join(root, file)).href);
const light = {
  category: 'M1',
  vehicleType: 'automovel',
  propulsion: 'ice',
  fuel: 'gasoline',
  grossMassKg: 2400,
  massRunningKg: 1700,
  payloadKg: 500,
  seats: 5,
  year: 2026,
  origin: 'national',
  purpose: 'series',
};
function walk(node) {
  return [node, ...(node.children || []).flatMap(walk)];
}

test('new workflow never obtains a technical profile from illustrative SUV defaults', async () => {
  const { normalizeWorkflowProfile, buildWorkflow } = await load('src/prototype/workflow.js');
  const blank = normalizeWorkflowProfile({});
  for (const key of ['massKg', 'massRunningKg', 'payloadKg', 'seats', 'year', 'radio'])
    assert.equal(blank[key], null);
  assert.equal(blank.category, '');
  assert.equal(blank.powertrain, '');
  assert.equal(blank.fuel, '');
  const built = buildWorkflow({}, data, catalog);
  assert.equal(built.classification.family, 'pending');
  assert.equal(built.classification.environmentClass, null);
  assert.ok(built.missing.length);
  for (const id of ['em-03-coastdown', 'em-07-infoserv'])
    assert.equal(built.steps.find((step) => step.id === id).status, 'conditional');
});

test('profile aliases preserve entered data without equating LP/LC with M1/N1', async () => {
  const { normalizeWorkflowProfile, buildWorkflow } = await load('src/prototype/workflow.js');
  const normalized = normalizeWorkflowProfile({
    category: 'L3',
    propulsion: 'combustion',
    fuel: 'ethanol',
    operation: 'importation',
    modelYear: 2026,
  });
  assert.equal(normalized.category, 'L');
  assert.equal(normalized.subcategory, 'L3');
  assert.equal(normalized.propulsion, 'ice');
  assert.equal(normalized.origin, 'imported');
  assert.equal(normalized.purpose, 'series');
  assert.equal(normalized.declaredFuel, 'ethanol');
  assert.ok(normalized.scopeGaps.length);
  assert.equal(buildWorkflow(light, data, catalog).classification.environmentClass, 'LP');
  assert.equal(
    buildWorkflow(
      {
        ...light,
        category: 'N1',
        vehicleType: 'caminhonete',
        grossMassKg: 3300,
        massRunningKg: 1900,
        payloadKg: 1300,
        seats: 2,
        derivedFromPassenger: false,
      },
      data,
      catalog,
    ).classification.environmentClass,
    'LC',
  );
  assert.equal(
    buildWorkflow({ ...light, category: 'N1', massRunningKg: null }, data, catalog).classification
      .environmentClass,
    null,
  );
});

test('BEV and heavy configurations do not inherit a light thermal FTP-75 checklist', async () => {
  const { buildWorkflow } = await load('src/prototype/workflow.js');
  const bev = buildWorkflow({ ...light, propulsion: 'bev', fuel: 'electric' }, data, catalog);
  const urban = bev.steps
    .find((s) => s.id === 'em-05-ensaios')
    .tests.find((t) => t.id === 'em-test-urban');
  assert.equal(urban.status, 'outside_profile');
  assert.ok(bev.steps.some((s) => s.id === 'em-08-lcvm'));
  assert.ok(bev.classification.particularities.some((s) => /dispensa automática/.test(s)));
  const heavy = buildWorkflow(
    { ...light, category: 'N3', vehicleType: 'caminhao', grossMassKg: 12000, massRunningKg: 7000 },
    data,
    catalog,
  );
  assert.equal(heavy.classification.family, 'heavy');
  const heavyLicense = heavy.steps.find((step) => step.id === 'em-08-lcvm');
  assert.match(heavyLicense.scopeReferral.description, /também abrange veículos pesados/);
  const { getWorkflowTree } = await load('src/prototype/workflow.js');
  const heavyTree = walk(getWorkflowTree(heavy, heavy.profile, catalog, heavyLicense.id));
  assert.ok(
    heavyTree.some((node) => node.kind === 'act' && node.actIds.includes('conama-490-2018')),
  );
  assert.ok(
    !heavyTree.some((node) => node.kind === 'act' && node.actIds.includes('conama-492-2018')),
  );
  assert.equal(
    heavy.steps.find((s) => s.id === 'em-05-ensaios').tests.find((t) => t.id === 'em-test-urban')
      .status,
    'outside_profile',
  );
});

test('analyst steps retain preparation, handovers and conditional evidence rather than generic map headings', async () => {
  const { buildWorkflow, getWorkflowTree } = await load('src/prototype/workflow.js');
  const built = buildWorkflow({ ...light, fuel: 'diesel' }, data, catalog);
  assert.equal(built.steps.length, 19);
  assert.equal(built.phases.length, 7);
  const coast = built.steps.find((s) => s.id === 'em-03-coastdown');
  assert.ok(
    coast.inputs.length && coast.actions.length && coast.results.length && coast.handover.length,
  );
  const infoserv = built.steps.find((s) => s.id === 'em-07-infoserv');
  assert.equal(infoserv.fieldGroups.length, 4);
  assert.ok(infoserv.fieldGroups.reduce((total, group) => total + group.fields.length, 0) >= 14);
  assert.ok(infoserv.fieldGroups.every((group) => group.currentUiVerified === false));
  const dossier = built.steps.find((s) => s.id === 'sa-08-dossier');
  assert.ok(dossier.dependencyLinks.some((link) => link.id === 'em-08-lcvm' && link.conditional));
  const tree = getWorkflowTree(built, light, catalog, 'em-05-ensaios');
  const nodes = walk(tree);
  const highway = nodes.find((n) => n.kind === 'test' && n.label.includes('Highway'));
  assert.ok(highway);
  assert.equal(highway.requirementMode, 'conditional_or_optional');
  assert.ok(nodes.some((n) => n.kind === 'standard' && /6601/.test(n.label)));
  assert.equal(
    nodes.find((n) => n.kind === 'standard' && /6601/.test(n.label)).url,
    'https://www.abntcatalogo.com.br/',
  );
  const published = new Set(catalog.acts.map((a) => a.id));
  assert.ok(
    nodes.filter((n) => n.kind === 'act').every((n) => n.actIds.every((id) => published.has(id))),
  );
});

test('safety controls and MOVER checks retain exact source references without declaring formal equivalence', async () => {
  const { buildWorkflow, getWorkflowTree } = await load('src/prototype/workflow.js');
  const built = buildWorkflow(light, data, catalog);
  const active = built.steps.find((s) => s.id === 'sa-05-active');
  const passive = built.steps.find((s) => s.id === 'sa-06-passive');
  assert.ok(active.tests.every((t) => t.reportControlLevel === 2));
  assert.ok(passive.tests.every((t) => t.reportControlLevel === 3));
  const nodes = walk(getWorkflowTree(built, light, catalog, active.id));
  assert.ok(nodes.some((n) => n.kind === 'crosswalk' && n.reportReusableAutomatically === false));
  const foreign = nodes.filter((n) => n.kind === 'international_reference');
  assert.ok(foreign.length);
  assert.ok(foreign.every((n) => n.acceptedEquivalent === false));
  assert.ok(foreign.some((n) => n.clause || n.notes));
});

test('new step consultation uses trusted documents and retrieves terms from real PDF text', async () => {
  const { buildConsultationCatalog } = await load('src/prototype/consultation-catalog.js');
  const { retrievePrototypeSources } = await load('src/prototype/assistant-retrieval.js');
  const c = buildConsultationCatalog(catalog, data, documents);
  const scoped = retrievePrototypeSources(
    { question: 'O que preciso preparar nesta etapa?', stageId: 'em-03-coastdown' },
    c,
  );
  assert.equal(scoped.context.stageId, 'em-03-coastdown');
  assert.equal(scoped.dataset.documentRevision, documents.revision);
  assert.equal(scoped.dataset.workflowRevision, data.revision);
  assert.ok(scoped.context.workflowGuide.inputs.length);
  assert.ok(scoped.sources.length);
  assert.ok(
    retrievePrototypeSources({ question: 'Como preparar o coastdown?' }, c).sources.some((s) =>
      /ibama/.test(s.id),
    ),
  );
  const textQuery = retrievePrototypeSources(
    { question: 'Como consultar resistência de isolamento?' },
    c,
  );
  assert.ok(textQuery.sources.some((s) => s.id === 'contran-749-2018'));
  const manualWords = c.documentWordIndex.get('ibama-manual-proconve-promot-2011');
  assert.equal(manualWords, undefined);
});

test('consultation rejects historical, unpublished and mismatched document chunks', async () => {
  const { buildConsultationCatalog } = await load('src/prototype/consultation-catalog.js');
  const chunk = documents.chunks[0];
  const historical = documents.documents.find((document) => document.indexable === false);
  const forged = [
    { ...chunk, documentId: historical.documentId, text: 'historicalinjection' },
    { ...chunk, actId: 'not-published', text: 'unpublishedinjection' },
    { ...chunk, documentSha256: 'wrong', text: 'hashinjection' },
    { ...chunk, sourceId: 'wrong', text: 'sourceinjection' },
  ];
  const c = buildConsultationCatalog(catalog, data, {
    ...documents,
    chunks: [...documents.chunks, ...forged],
  });
  const accepted = [...c.documentChunkIndex.values()].flat().map((entry) => entry.chunk);
  assert.equal(accepted.length, documents.chunks.length);
  assert.ok(accepted.every((entry) => entry.unreviewedExtraction && entry.notConsolidated));
  assert.ok(!accepted.some((entry) => /injection/.test(entry.text)));
});
