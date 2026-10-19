const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const VehicleLegislation = require('../src/core/vehicle-legislation.js');

const catalog = [
  {
    id: 'legacy-12v',
    regulatoryId: 'inmetro-components',
    regulatoryDomain: 'conformity',
    taxonomy: ['eletronica/comandos'],
    legalStatus: { state: 'partial_revocation' },
    reviewStatus: { state: 'reference_only', fullTextReviewed: false },
    applicability: { state: 'requires_assessment' },
    requirements: [{ id: '12v:req:01' }, { id: 'motor:req:01' }],
  },
  { id: 'other-alias-12v', regulatoryId: 'inmetro-components' },
  { id: 'legacy-hv', regulatoryId: 'contran-hybrid', taxonomy: ['propulsao/eletrica'] },
  { id: 'anatel-radio', regulatoryDomain: 'conformity', taxonomy: ['eletronica/comandos'] },
  { id: 'ibama-emissions', taxonomy: ['propulsao/emissoes'] },
  { id: 'mover-efficiency', taxonomy: ['corporativo/eficiencia'] },
];
const mapping = {
  schemaVersion: 1,
  parts: [
    {
      id: '12v',
      componentId: 'eletrica',
      topics: [
        {
          id: 'battery',
          label: 'Bateria auxiliar',
          subsystemId: 'eletronica/comandos',
          lane: 'seguranca',
          relation: 'component',
          links: [
            {
              actId: 'inmetro-components',
              basis: 'Battery chapter',
              requirementIds: ['12v:req:01'],
            },
          ],
          gaps: [],
        },
        {
          id: 'battery',
          label: 'Eficiência do veículo',
          subsystemId: 'eletronica/comandos',
          lane: 'ambiental',
          relation: 'vehicle',
          links: [{ actId: 'mover-efficiency', basis: 'Vehicle context only' }],
          gaps: [],
        },
      ],
    },
    {
      id: 'traction',
      componentId: 'bateria',
      topics: [
        {
          id: 'electrification',
          label: 'Tração',
          subsystemId: 'propulsao/eletrica',
          lane: 'seguranca',
          relation: 'vehicle',
          links: [{ actId: 'contran-hybrid', basis: 'Hybrid vehicle' }],
          gaps: [],
        },
      ],
    },
    { id: 'radiator', componentId: 'motor', topics: [] },
  ],
};
const resolver = VehicleLegislation.create(mapping);

test('exact part associations exclude same-taxonomy and conformity-domain false positives', () => {
  assert.deepEqual(
    resolver.records('12v', catalog, { relation: 'component' }).map((r) => r.regulatoryId || r.id),
    ['inmetro-components'],
  );
  assert.deepEqual(
    resolver.records('traction', catalog).map((r) => r.regulatoryId || r.id),
    ['contran-hybrid'],
  );
  assert.equal(resolver.matchesRecord('12v', catalog[3]), false);
  assert.equal(resolver.matchesRecord('traction', catalog[0]), false);
  assert.deepEqual(
    resolver.records('12v', catalog, { lane: 'ambiental' }).map((r) => r.id),
    ['mover-efficiency'],
  );
});

test('unknown or empty parts and invalid selections never inherit a whole system', () => {
  assert.equal(resolver.part('12v', 'bateria'), null);
  assert.equal(resolver.part('missing'), null);
  assert.equal(resolver.part('12v', 'eletrica').id, '12v');
  for (const part of ['missing', 'radiator']) {
    assert.deepEqual(resolver.records(part, catalog), []);
    assert.deepEqual(resolver.topics(part), []);
    assert.equal(resolver.matchesRecord(part, catalog[0]), false);
  }
  for (const options of [{ subsystemId: 'missing' }, { lane: 'invalid' }, { relation: 'invalid' }])
    assert.deepEqual(resolver.records('12v', catalog, options), []);
});

test('canonical acts and legacy bookmarks resolve without duplicate aliases', () => {
  const topic = resolver.topics('12v')[0];
  const rows = resolver.recordsForTopic(
    { ...topic, links: [...topic.links, { actId: 'legacy-12v', basis: 'Legacy bookmark' }] },
    catalog,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'legacy-12v');
  assert.equal(rows[0].vehicleMappingLinks.length, 2);
  assert.deepEqual(
    rows[0].vehicleMappingLinks.map((link) => link.basis),
    ['Battery chapter', 'Legacy bookmark'],
  );
  assert.deepEqual(
    VehicleLegislation.unique([catalog[0], catalog[1]]).map((r) => r.id),
    ['legacy-12v'],
  );
});

test('mapped requirements are explicit, merged and separate from the unchanged act', () => {
  const before = JSON.stringify(catalog);
  const topic = resolver.topics('12v')[0];
  const row = resolver.recordsForTopic(
    {
      ...topic,
      links: [
        ...topic.links,
        { actId: 'legacy-12v', requirementIds: ['12v:req:02', '12v:req:01'] },
      ],
    },
    catalog,
  )[0];
  assert.deepEqual(row.vehicleRequirementIds, ['12v:req:01', '12v:req:02']);
  assert.equal(row.requirements.length, 2);
  assert.deepEqual(row.legalStatus, catalog[0].legalStatus);
  assert.deepEqual(row.reviewStatus, catalog[0].reviewStatus);
  assert.deepEqual(row.applicability, catalog[0].applicability);
  const contextOnly = resolver.records('traction', catalog)[0];
  assert.deepEqual(contextOnly.vehicleRequirementIds, []);
  assert.equal(catalog[2].vehicleRequirementIds, undefined);
  assert.equal(VehicleLegislation.unique([catalog[2]])[0].vehicleRequirementIds, undefined);
  assert.equal(JSON.stringify(catalog), before);
});

test('topic relation IDs remain distinct and subsystems come only from explicit topics', () => {
  const hierarchy = [
    {
      id: 'eletronica',
      children: [
        { id: 'eletronica/obd', label: 'OBD' },
        { id: 'eletronica/comandos', label: 'Comandos' },
      ],
    },
    { id: 'propulsao', children: [{ id: 'propulsao/eletrica', label: 'Tração' }] },
  ];
  assert.deepEqual(
    resolver.topics('12v').map((topic) => topic.id),
    ['component:battery', 'vehicle:battery'],
  );
  assert.deepEqual(resolver.subsystems('12v', hierarchy), [
    { id: 'eletronica/comandos', label: 'Comandos', system: 'eletronica' },
  ]);
  assert.deepEqual(resolver.subsystems('missing', hierarchy), []);
  assert.deepEqual(resolver.relations('12v', catalog), [
    { id: 'component', topics: 1, references: 1 },
    { id: 'vehicle', topics: 1, references: 1 },
  ]);
});

test('invalid editorial schemas and ambiguous topic keys fail before rendering', () => {
  assert.throws(() => VehicleLegislation.create({ parts: [] }), /Invalid vehicle/);
  assert.throws(
    () =>
      VehicleLegislation.create({ schemaVersion: 1, parts: [mapping.parts[0], mapping.parts[0]] }),
    /duplicate vehicle part/,
  );
  const repeated = {
    ...mapping.parts[0],
    topics: [mapping.parts[0].topics[0], mapping.parts[0].topics[0]],
  };
  assert.throws(
    () => VehicleLegislation.create({ schemaVersion: 1, parts: [repeated] }),
    /duplicate vehicle legislation topic/,
  );
});

test('classic-script global and isolated CommonJS factory share one resolver contract', () => {
  const context = vm.createContext({ data: mapping, rows: catalog });
  vm.runInContext('const VehicleLegislationData = data;', context);
  vm.runInContext(fs.readFileSync('src/core/vehicle-legislation.js', 'utf8'), context);
  assert.equal(
    vm.runInContext('VehicleLegislation.part("traction").componentId', context),
    'bateria',
  );
  assert.equal(vm.runInContext('VehicleLegislation.records("12v", rows).length', context), 2);
  assert.equal(vm.runInContext('VehicleLegislation.matchesRecord("12v", rows[3])', context), false);
});
