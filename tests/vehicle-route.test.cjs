'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  vehicleSelection,
  vehicleModeRoute,
  vehicleVisualProfile,
} = require('../src/guide/vehicle-route.js');
const { parts } = require('../src/core/vehicle-vector.js');
const { ALL_SUBSYSTEMS } = require('../src/guide/subsystem-coverage.js');
const { PARTS } = require('../src/guide/vehicle-parts.js');
const Traceability = require('../src/guide/traceability.js');
const resolver = require('../src/core/vehicle-legislation.js').create(
  require('../data/vehicle-legislation/reviewed-map.json'),
);
const index = require('../data/site/index.json');
const records = [
  ...index.base.records,
  ...Object.values(index.regulations).flatMap((source) => source.records),
];
const components = [...new Set(parts.map((part) => part.componentId))].map((id) => ({
  id,
  label: id,
  legacyPartIds: parts.filter((part) => part.componentId === id).map((part) => part.id),
}));
const trace = Traceability.create({ resolver, catalogRecords: records });
const acts = (result) =>
  [
    ...new Set(
      result.relations.flatMap((relation) =>
        relation.topics.flatMap((topic) => topic.records.map((record) => record.canonicalId)),
      ),
    ),
  ].sort();

test('all 37 legacy URLs retain exactly their source part rather than sibling assembly laws', () => {
  for (const part of parts) {
    const selected = vehicleSelection(
      { part: part.id, component: part.componentId },
      parts,
      components,
    );
    assert.deepEqual(Traceability.legacyPartIds(selected), [part.id], part.id);
    assert.deepEqual(acts(trace(selected)), acts(trace({ legacyParts: [part.id] })), part.id);
    assert.equal(selected.referenceAsset, part.displayAsset);
  }
});

test('all 33 subsystem routes retain their original explicit source IDs and assembly sets', () => {
  for (const row of ALL_SUBSYSTEMS) {
    const selected = vehicleSelection({ subsystem: row.id }, parts, components);
    assert.deepEqual([...selected.assemblyIds].sort(), [...row.assemblyIds].sort(), row.id);
    assert.deepEqual(
      Traceability.legacyPartIds(selected).sort(),
      [...row.legacyParts].sort(),
      row.id,
    );
    assert.deepEqual(selected.subsystemIds, row.subsystemIds, row.id);
  }
});

test('an explicit assembly keeps Guide source IDs and topic filters despite a broader focus system', () => {
  for (const assembly of PARTS) {
    const selected = vehicleSelection(
      { assembly: assembly.id, focus: assembly.system },
      parts,
      components,
    );
    assert.deepEqual(
      Traceability.legacyPartIds(selected).sort(),
      Traceability.legacyPartIds(assembly).sort(),
      assembly.id,
    );
    assert.deepEqual(selected.subsystemIds, assembly.subsystemIds || [], assembly.id);
    assert.deepEqual(acts(trace(selected)), acts(trace(assembly)), assembly.id);
    assert.equal(selected.label, assembly.label);
  }
  const fluid = vehicleSelection({ assembly: 'brakeFluid', focus: 'freios' }, parts, components);
  const retrieved = acts(trace(fluid));
  assert.ok(!retrieved.includes('contran-915-2022'));
  assert.ok(!retrieved.includes('contran-954-2022'));
  assert.deepEqual(
    acts(trace(vehicleSelection({ assembly: 'cooling', focus: 'motor' }, parts, components))),
    [],
  );
});

test('auxiliary battery, traction, radiator and harness keep exact consultation boundaries', () => {
  const auxiliary = vehicleSelection({ part: 'peca_27_bateria_12v' }, parts, components);
  const traction = vehicleSelection({ part: 'peca_26_bateria_tracao' }, parts, components);
  assert.equal(auxiliary.assemblyId, 'battery12v');
  assert.equal(traction.assemblyId, 'batteryHV');
  assert.ok(acts(trace(auxiliary)).includes('inmetro-145-2022'));
  assert.ok(!acts(trace(traction)).includes('inmetro-145-2022'));
  const radiator = vehicleSelection({ part: 'peca_29_radiador' }, parts, components);
  const harness = vehicleSelection({ part: 'peca_28_chicote_eletrico' }, parts, components);
  assert.equal(radiator.assemblyId, 'cooling');
  assert.equal(harness.assemblyId, 'electronics');
  assert.deepEqual(acts(trace(radiator)), []);
  assert.deepEqual(acts(trace(harness)), []);
});

test('a transverse VIN topic keeps the exact body source while highlighting identification geometry', () => {
  const selected = vehicleSelection(
    { component: 'carroceria', part: 'peca_10_carroceria', subsystem: 'identificacao/vin' },
    parts,
    components,
  );
  assert.equal(selected.assemblyId, 'vin');
  assert.deepEqual(Traceability.legacyPartIds(selected), ['peca_10_carroceria']);
  assert.deepEqual(
    acts(trace(selected)),
    acts(trace({ legacyParts: ['peca_10_carroceria'], subsystemIds: ['identificacao/vin'] })),
  );
});

test('overview is empty and visual selectors do not populate unknown technical conditions', () => {
  assert.equal(vehicleSelection({}, parts, components), null);
  const visual = vehicleVisualProfile('Comercial leve', 'Elétrico');
  assert.deepEqual(visual, { category: 'N1', powertrain: 'bev' });
  const selected = vehicleSelection(
    { part: 'peca_24_motor_combustao_transmissao' },
    parts,
    components,
  );
  const result = trace(selected, {});
  assert.ok(
    result.conditions.every(
      (condition) => condition.state === 'not_informed' && condition.value === null,
    ),
  );
  assert.equal(result.assessment.automaticObligation, false);
});

test('switching presentation preserves legacy selection, consultation branch, profile and zoom', () => {
  const query = {
    component: 'motor',
    part: 'peca_24_motor_combustao_transmissao',
    subsystem: 'propulsao/emissoes',
    type: 'Comercial leve',
    powertrain: 'Elétrico',
    lane: 'ambiental',
    node: 'component:motor:ambiental',
    topic: 'gases',
    zoom: '1.6',
    project: 'processo com espaços',
  };
  const reference = vehicleModeRoute(query, true);
  const params = Object.fromEntries(new URLSearchParams(reference.split('?')[1]));
  assert.deepEqual(params, { ...query, view: 'reference' });
  const model = Object.fromEntries(new URLSearchParams(vehicleModeRoute(params).split('?')[1]));
  assert.deepEqual(model, query);
  assert.equal(vehicleModeRoute({ part: '', component: '' }), '#vehicle');
});

test('modern assembly links open the 2D board without pretending to be a historic region', () => {
  for (const assembly of PARTS) {
    const reference = vehicleModeRoute({ part: assembly.id, tree: 'assemblies' }, true);
    const params = Object.fromEntries(new URLSearchParams(reference.split('?')[1]));
    assert.equal(params.part, undefined);
    assert.equal(params.assembly, assembly.id);
    assert.equal(params.view, 'reference');
    const restored = Object.fromEntries(
      new URLSearchParams(vehicleModeRoute(params).split('?')[1]),
    );
    assert.equal(vehicleSelection(restored, parts, components).id, assembly.id);
    assert.deepEqual(
      acts(trace(vehicleSelection(restored, parts, components))),
      acts(trace(assembly)),
    );
  }
});
