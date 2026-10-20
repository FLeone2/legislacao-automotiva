const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { ComponentFlow } = require('../vehicle-data.js');
const VehicleLegislation = require('../src/core/vehicle-legislation.js');
const { requirementNodesForRecord } = require('../src/core/requirements.js');

function vehicleModel(mapping) {
  const index = JSON.parse(fs.readFileSync('data/site/index.json', 'utf8'));
  const context = vm.createContext({
    URLSearchParams,
    ComponentFlow,
    VehicleLegislation: VehicleLegislation.create(mapping),
    requirementNodesForRecord,
    vehicleVector: { parts: mapping.parts },
    regulatoryData: index.regulations,
    base: index.base,
    enrichFlowCatalogRecord: (record) => record,
    document: { addEventListener() {} },
    window: { addEventListener() {} },
  });
  for (const file of [
    'src/core/dom.js',
    'src/regulations/catalog.js',
    'tree.js',
    'vehicle-navigation.js',
  ])
    vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  vm.runInContext('globalThis.catalog = installActiveRegulations(base)', context);
  return context;
}

function canonicalId(model, id) {
  const record = model.catalogRecord(model.catalog, id);
  assert.ok(record, id);
  return model.catalogIdentity(record);
}

function openPart(model, part) {
  model.initializeComponentTree(
    ComponentFlow.component(part.componentId),
    new URLSearchParams({ component: part.componentId, part: part.id }),
  );
  return vm.runInContext('treeModels.vehicle', model);
}

test('vehicle topics show each shared note once while keeping every distinct act and note', () => {
  const mapping = JSON.parse(fs.readFileSync('data/vehicle-legislation/reviewed-map.json', 'utf8'));
  const before = JSON.stringify(mapping);
  const model = vehicleModel(mapping);
  let repeatedTopics = 0;
  for (const part of mapping.parts) {
    const repeats = part.topics.filter((topic) => {
      const notes = topic.links.map((link) => link.note?.trim()).filter(Boolean);
      return new Set(notes).size < notes.length;
    });
    if (!repeats.length) continue;
    const tree = openPart(model, part);
    for (const topic of repeats) {
      repeatedTopics++;
      const id = `component:${part.componentId}:${topic.lane}:${topic.relation}:${topic.id}`;
      const node = tree.nodes[id];
      assert.ok(node, id);
      const expectedNotes = [...new Set(topic.links.map((link) => link.note.trim()))];
      assert.equal(node.text, expectedNotes.join(' '), id);
      const expectedActs = [...new Set(topic.links.map((link) => canonicalId(model, link.actId)))];
      assert.deepEqual(
        Array.from(node.recordIds, (id) => canonicalId(model, id)),
        expectedActs,
        id,
      );
      assert.equal(node.children.length, expectedActs.length + (topic.gaps || []).length, id);
    }
  }
  assert.ok(repeatedTopics >= 8, 'Both seat groups and the engine/exhaust topics are covered');
  assert.equal(JSON.stringify(mapping), before, 'Presentation must not edit editorial links');
});

test('act leaves deduplicate shared mapping notes without dropping separate link provenance', () => {
  const mapping = JSON.parse(fs.readFileSync('data/vehicle-legislation/reviewed-map.json', 'utf8'));
  const part = mapping.parts.find((entry) => entry.id === 'peca_08_banco_traseiro');
  const topic = part.topics.find((entry) => entry.id === 'bancos-ancoragem');
  const original = topic.links[0];
  topic.links.push(
    { ...original, basis: 'Second association of the same act', note: ` ${original.note} ` },
    { ...original, basis: 'Separate caveat', note: 'Outra condição específica de consulta.' },
  );
  const model = vehicleModel(mapping);
  const tree = openPart(model, part);
  const node = tree.nodes['component:bancos:seguranca:component:bancos-ancoragem'];
  const leaf = node.children.find((entry) => canonicalId(model, entry.recordId) === original.actId);
  assert.equal(leaf.text, original.note + ' Outra condição específica de consulta.');
  assert.deepEqual(
    Array.from(node.recordIds, (id) => canonicalId(model, id)),
    ['contran-951-2022', 'contran-997-2023'],
  );
  assert.equal(node.children.length, 2);
  const records = model.vehicleTopicRecords(model.VehicleLegislation.topics(part.id)[0]);
  assert.equal(
    records.find((entry) => model.catalogIdentity(entry) === original.actId).vehicleMappingLinks
      .length,
    3,
  );
  assert.equal(model.vehicleMappingNotes(), '');
  assert.equal(model.vehicleMappingNotes([{ note: '' }, {}]), '');
});
