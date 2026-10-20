const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const standards = require('../src/regulations/technical-standards.js');
const { requirementNodesForRecord } = require('../src/core/requirements.js');
const index = JSON.parse(fs.readFileSync('data/site/technical-standards.json'));
const flow = require('../flow-data.js').homologationFlowSpec;

test('NBR queries accept prefixes, dotted numbers and explicit editions', () => {
  const citation = { designation: 'NBR 16567', literal: 'ABNT NBR 16.567:2020', edition: '2020' };
  for (const query of ['16567', 'NBR 16567', 'ABNT NBR 16567:2020', 'nbr 16.567 / 2020'])
    assert.ok(standards.matches(citation, query), query);
  for (const query of ['1656', 'NBR 16567:2016', 'ISO 16567'])
    assert.equal(standards.matches(citation, query), false, query);
  assert.equal(standards.matches({ literal: 'ISO 1176:1990' }, 'NBR ISO 1176'), false);
  assert.equal(standards.matches({ literal: 'NBR 11353-1' }, 'NBR 11353-2'), false);
});
test('citations stay under review and legacy IDs select the same act', () => {
  assert.equal(index.records.length, 313);
  assert.ok(index.records.every((entry) => entry.reviewState === 'pending'));
  const original = { id: 'ibama-020', regulatoryId: 'ibama-in-3-2023' };
  const canonical = { id: 'official-ibama-in-3-2023', regulatoryId: 'ibama-in-3-2023' };
  assert.deepEqual(
    standards.forRecord(original, index.records),
    standards.forRecord(canonical, index.records),
  );
  assert.ok(
    standards.forRecord(original, index.records).some((entry) => standards.matches(entry, '16567')),
  );
  assert.equal(standards.forRecord({ id: 'unresolved' }, index.records).length, 0);
});
test('hybrid activity children point at the method, not the evaporative-family provision', () => {
  const record = JSON.parse(fs.readFileSync('data/site/records/proconve/ibama-in-3-2023.json'));
  for (const activity of flow.stages
    .flatMap((stage) => stage.activities)
    .filter((activity) => activity.requirementRefs)) {
    const selected = activity.requirementRefs[record.id];
    const nodes = requirementNodesForRecord(
      { ...record, activityRequirementIds: selected },
      'activity',
    );
    assert.deepEqual(
      nodes.map((node) => node.requirementId),
      ['ibama-in-3-2023:req:02'],
    );
    assert.equal(nodes[0].subtitle, 'Art. 2º');
  }
  assert.equal(record.requirements.length, 2, 'the family provision remains in its act');
  assert.deepEqual(
    requirementNodesForRecord({ ...record, activityRequirementIds: [] }, 'unmapped'),
    [],
  );
});
test('new method is traced to the official snapshot and keeps its verification gap', () => {
  const catalog = JSON.parse(fs.readFileSync('data/requirements/catalog.json')).records;
  const method = catalog.find((requirement) => requirement.id === 'ibama-in-3-2023:req:02');
  assert.ok(method.evidenceSource.documentSha256);
  assert.equal(method.evidenceSource.sourceKey, '139279');
  assert.equal(method.verificationPlan.state, 'not_structured');
  const family = catalog.find((requirement) => requirement.id === 'ibama-in-3-2023:req:01');
  assert.ok(
    !family.context.activities.some(
      (activity) =>
        activity.stageId === 'laboratorio' &&
        ['hibrido', 'hev', 'phev'].includes(activity.activityId),
    ),
  );
  for (const activity of flow.stages.flatMap((stage) => stage.activities))
    for (const ids of Object.values(activity.requirementRefs || {}))
      for (const id of ids) assert.ok(catalog.some((requirement) => requirement.id === id));
});
