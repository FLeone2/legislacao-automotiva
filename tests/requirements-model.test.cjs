const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { requirementNodesForRecord } = require('../src/core/requirements.js');
const canonical = JSON.parse(fs.readFileSync('data/requirements/catalog.json')).records;
test('vehicle and activity nodes reuse canonical requirement IDs and preserve act identity', () => {
  for (const requirement of canonical) {
    const record = { id: requirement.actId, requirements: [requirement] };
    const vehicle = requirementNodesForRecord(record, 'vehicle:system:act')[0];
    const flow = requirementNodesForRecord(record, 'flow:activity:act')[0];
    assert.equal(vehicle.requirementId, flow.requirementId);
    assert.equal(vehicle.requirementId, requirement.id);
    assert.deepEqual(vehicle.recordIds, [requirement.actId]);
    assert.notEqual(vehicle.id, flow.id);
  }
});
test('empty requirements are explicit and do not create invented methods', () => {
  assert.deepEqual(requirementNodesForRecord({ id: 'act' }, 'parent'), []);
});
test('compact and full requirements keep the same legal source classification', () => {
  const index = JSON.parse(fs.readFileSync('data/site/index.json'));
  let guidanceCount = 0;
  for (const agency of Object.values(index.regulations)) {
    for (const record of agency.records) {
      for (const summary of record.requirements) {
        const full = canonical.find((requirement) => requirement.id === summary.id);
        assert.ok(full, summary.id);
        const summaryNode = requirementNodesForRecord(
          { ...record, requirements: [summary] },
          'p',
        )[0];
        const fullNode = requirementNodesForRecord({ ...record, requirements: [full] }, 'p')[0];
        assert.equal(summaryNode.kind, fullNode.kind, summary.id);
        if (full.provision.kind === 'official_guidance') {
          guidanceCount++;
          assert.equal(summaryNode.kind, 'Orientação oficial vinculada');
        }
      }
    }
  }
  assert.ok(guidanceCount > 0);
});
test('a part reference shows only the provisions explicitly associated with that part', () => {
  const record = {
    id: 'multi-component-act',
    requirements: [
      { id: 'battery', title: 'Chumbo-ácido' },
      { id: 'lamp', title: 'Lâmpadas' },
    ],
  };
  assert.deepEqual(
    requirementNodesForRecord({ ...record, vehicleRequirementIds: ['battery'] }, 'part').map(
      (node) => node.requirementId,
    ),
    ['battery'],
  );
  assert.deepEqual(
    requirementNodesForRecord({ ...record, vehicleRequirementIds: [] }, 'unreviewed-part'),
    [],
  );
  assert.equal(record.requirements.length, 2);
});
test('both production tree builders include the shared canonical relationship', () => {
  for (const file of ['vehicle-navigation.js', 'homologation-flow.js']) {
    assert.match(fs.readFileSync(file, 'utf8'), /children: requirementNodesForRecord\(/);
  }
});
