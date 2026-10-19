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
test('both production tree builders include the shared canonical relationship', () => {
  for (const file of ['vehicle-navigation.js', 'homologation-flow.js']) {
    assert.match(fs.readFileSync(file, 'utf8'), /children: requirementNodesForRecord\(/);
  }
});
