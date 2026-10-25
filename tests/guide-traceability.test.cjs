'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const VehicleLegislation = require('../src/core/vehicle-legislation.js');
const Traceability = require('../src/guide/traceability.js');
const mapping = require('../data/vehicle-legislation/reviewed-map.json');
const index = require('../data/site/index.json');
const requirements = require('../data/requirements/catalog.json').records;
const catalog = [
  ...index.base.records,
  ...Object.entries(index.regulations).flatMap(([agency, data]) =>
    data.records.map((record) => ({
      ...record,
      agency,
      reviewStatus: { reviewedAt: data.metadata.asOf, ...record.reviewStatus },
    })),
  ),
];
const resolver = VehicleLegislation.create(mapping);
const trace = Traceability.create({ resolver, catalogRecords: catalog, reviewedAt: mapping.asOf });
const allRecords = (result) =>
  result.relations.flatMap((relation) => relation.topics.flatMap((topic) => topic.records));

// Use the real reviewed associations: no new legal or geometry mapping is created here.
test('battery chemistry and vehicle context stay separate from a visually similar assembly', () => {
  const auxiliary = trace({ id: 'battery12v', legacyPart: 'peca_27_bateria_12v' });
  const traction = trace({ id: 'batteryHV', legacyPart: 'peca_26_bateria_tracao' });
  assert.ok(allRecords(auxiliary).some((record) => record.canonicalId === 'inmetro-145-2022'));
  assert.ok(!allRecords(traction).some((record) => record.canonicalId === 'inmetro-145-2022'));
  assert.ok(traction.relations.every((relation) => relation.kind === 'vehicle'));
  assert.ok(
    allRecords(auxiliary)
      .flatMap((record) => record.limits)
      .some((note) => /chumbo.ácido/.test(note)),
  );
  assert.equal(auxiliary.assessment.automaticObligation, false);
  assert.equal(traction.assessment.state, 'requires_assessment');
});

test('aggregating front and rear wheels deduplicates acts and preserves provenance of both regions', () => {
  const part = {
    id: 'wheel-assembly',
    label: 'Pneus e rodas',
    legacyParts: ['peca_34_roda_dianteira', 'peca_36_roda_traseira'],
  };
  const result = trace(part, { category: 'M1', massKg: 2200, powertrain: 'bev' });
  assert.equal(result.visual.legacyPartIds.length, 2);
  assert.equal(result.visual.referenceImages.length, 2);
  assert.ok(result.relations.some((relation) => relation.kind === 'component'));
  assert.ok(result.relations.some((relation) => relation.kind === 'vehicle'));
  const topic = result.relations
    .find((relation) => relation.kind === 'component')
    .topics.find((topic) => topic.label === 'Pneus novos e marcações');
  assert.equal(topic.legacyPartIds.length, 2);
  assert.equal(
    topic.records.length,
    new Set(topic.records.map((record) => record.canonicalId)).size,
  );
  assert.ok(
    topic.records.some(
      (record) => new Set(record.mappingEvidence.map((link) => link.legacyPartId)).size === 2,
    ),
  );
  assert.equal(result.conditions.find((condition) => condition.field === 'massKg').value, 2200);
  assert.equal(
    result.conditions.find((condition) => condition.field === 'year').state,
    'not_informed',
  );
});

test('canonical requirement IDs select only linked devices and preserve independent regulatory states', () => {
  const source = catalog.find((record) => record.id === 'inmetro-145-2022');
  const detailed = {
    ...source,
    _summary: false,
    requirements: requirements.filter((requirement) => requirement.actId === source.id),
  };
  const detailedCatalog = catalog.filter((record) => record.id !== source.id).concat(detailed);
  const resolve = Traceability.create({ resolver, catalogRecords: detailedCatalog });
  const before = JSON.stringify(detailed);
  const result = resolve({ id: 'battery12v', legacyPart: 'peca_27_bateria_12v' });
  const row = allRecords(result).find((record) => record.canonicalId === source.id);
  assert.deepEqual(row.legalStatus, source.legalStatus);
  assert.deepEqual(row.reviewStatus, source.reviewStatus);
  assert.deepEqual(row.applicability, source.applicability);
  assert.deepEqual(row.publication, source.publication);
  assert.equal(row.reviewStatus.fullTextReviewed, false);
  assert.ok(row.provisions.length);
  assert.ok(row.provisions.every((provision) => row.requirementIds.includes(provision.id)));
  assert.ok(!row.provisions.some((provision) => provision.id === 'inmetro-145-2022:req:01'));
  assert.ok(row.provisions.every((provision) => provision.reference && provision.sourceUrl));
  assert.ok(row.provisions.some((provision) => provision.evidenceSource?.documentSha256));
  assert.equal(
    JSON.stringify(detailed),
    before,
    'traceability must not promote, mutate or rewrite reviewed source',
  );
});

test('unmapped radiator and harness remain gaps and do not inherit same-taxonomy rules', () => {
  for (const legacyPart of ['peca_29_radiador', 'peca_28_chicote_eletrico']) {
    const result = trace({ id: 'assembly', legacyPart, taxonomy: 'propulsao/emissoes' });
    assert.equal(result.counts.acts, 0);
    assert.ok(
      result.relations.flatMap((relation) => relation.topics).some((topic) => topic.gaps.length),
    );
    assert.ok(
      !allRecords(result).some(
        (record) => record.agency === 'anatel' || record.agency === 'proconve',
      ),
    );
  }
  const unknown = trace({ id: 'body', legacyParts: ['missing'], taxonomy: 'carroceria' });
  assert.equal(unknown.counts.acts, 0);
  assert.ok(unknown.gaps.length);
});

test('summary details stay pending and excluded records cannot reappear through a mesh', () => {
  const part = { id: 'battery12v', legacyPart: 'peca_27_bateria_12v' };
  const source = catalog.find((record) => record.id === 'inmetro-145-2022');
  const hidden = Traceability.create({
    resolver,
    catalogRecords: catalog.map((record) =>
      record.id === source.id ? { ...record, publication: { included: false } } : record,
    ),
  })(part);
  assert.ok(!allRecords(hidden).some((record) => record.canonicalId === source.id));
  const summary = allRecords(trace(part)).find((record) => record.canonicalId === source.id);
  assert.ok(summary.provisions.every((provision) => provision.detailState === 'summary_only'));
  assert.ok(summary.limits.some((note) => /Resumo do índice/.test(note)));
  assert.equal(summary.assessment.automaticObligation, false);
});

test('classic browser helper and CommonJS share the same resolver API', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync('src/guide/traceability.js', 'utf8'), context);
  assert.equal(vm.runInContext('typeof GuideTraceability.create', context), 'function');
  assert.deepEqual(Traceability.legacyPartIds({ legacyParts: ['a', 'b', 'a'], legacyPart: 'a' }), [
    'a',
    'b',
  ]);
});

test('a selected fluid subsystem never inherits the other brake assembly obligations', () => {
  const selection = require('../src/guide/subsystem-coverage.js').subsystemSelection(
    'freios/fluido',
  );
  const result = trace(selection, { category: 'M1', powertrain: 'phev' });
  assert.deepEqual(
    [...new Set(allRecords(result).map((row) => row.canonicalId))],
    ['inmetro-456-2021'],
  );
  assert.ok(
    result.relations.every((relation) =>
      relation.topics.every((topic) => topic.subsystemId === 'freios/fluido'),
    ),
  );
  assert.ok(!allRecords(result).some((row) => row.canonicalId === 'contran-915-2022'));
  assert.equal(result.assessment.automaticObligation, false);
  assert.deepEqual(result.visual.referenceArt, selection.referenceArt);
});

test('an unsupported subsystem filter is an explicit gap rather than a whole-body fallback', () => {
  const result = trace({
    id: 'body',
    legacyPart: 'peca_10_carroceria',
    subsystemIds: ['unknown/subsystem'],
  });
  assert.equal(result.counts.acts, 0);
  assert.ok(result.gaps.some((value) => /não há vínculo específico/i.test(value)));
});
