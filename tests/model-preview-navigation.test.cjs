const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const previews = require('../src/core/model-previews.js');
const vector = require('../src/core/vehicle-vector.js');
const { PARTS, SUV_ASSEMBLY_IDS } = require('../src/guide/vehicle-parts.js');
const { ALL_SUBSYSTEMS } = require('../src/guide/subsystem-coverage.js');
const index = require('../assets/models/suv/thumbnails/index.json');
const source = fs.readFileSync('src/core/model-previews.js', 'utf8');

function browser(fetch) {
  const context = vm.createContext({ fetch, VehicleVector: vector });
  vm.runInContext(source, context);
  return context.VehicleModelPreviews;
}

test('all 37 historic pieces resolve to explicit existing visual assemblies without legal scope', () => {
  assert.equal(vector.parts.length, 37);
  for (const part of vector.parts) {
    const assemblyId = previews.legacyAssembly(part.id);
    assert.ok(SUV_ASSEMBLY_IDS.includes(assemblyId), part.id);
    const selected = previews.selection(
      { legacyPartId: part.id, componentId: part.componentId },
      index,
    );
    assert.deepEqual(selected.assemblyIds, [assemblyId], part.id);
    assert.equal(selected.legacyPartId, part.id);
    assert.equal(selected.visualOnly, true);
    assert.ok(previews.resolve(selected, index), part.id);
    for (const prohibited of [
      'legacyParts',
      'legacyPartIds',
      'requirementIds',
      'recordIds',
      'applicability',
      'publication',
      'legalStatus',
      'reviewStatus',
    ])
      assert.equal(prohibited in selected, false, part.id + ': ' + prohibited);
  }
  for (const [componentId, parts] of Map.groupBy(PARTS, (part) => part.system)) {
    assert.ok(
      parts.some((part) => part.id === previews.componentAssembly(componentId)),
      componentId,
    );
  }
});

test('all 21 assemblies and 33 subsystems preserve exact manifest selections', () => {
  assert.equal(SUV_ASSEMBLY_IDS.length, 21);
  assert.equal(ALL_SUBSYSTEMS.length, 33);
  for (const id of SUV_ASSEMBLY_IDS)
    assert.deepEqual(previews.resolve({ assemblyId: id }, index).assemblyIds, [id]);
  for (const row of ALL_SUBSYSTEMS) {
    const expected = [...row.assemblyIds].sort();
    const selected = previews.selection({ subsystemId: row.id }, index);
    assert.deepEqual(selected.assemblyIds, expected, row.id);
    assert.deepEqual(previews.resolve(selected, index).assemblyIds, expected, row.id);
  }
  assert.deepEqual(
    previews.resolve({ assemblyIds: ['motorElectric', 'engine', 'batteryHV'] }, index).assemblyIds,
    ['batteryHV', 'engine', 'motorElectric'],
  );
  assert.equal(previews.resolve({ assemblyIds: ['body', 'engine'] }, index), null);
});

test('auxiliary battery, traction, cooling, harness and glass stay visually distinct', () => {
  const cases = {
    peca_25_motor_eletrico_inversor_cabos: 'motorElectric',
    peca_26_bateria_tracao: 'batteryHV',
    peca_27_bateria_12v: 'battery12v',
    peca_28_chicote_eletrico: 'electronics',
    peca_29_radiador: 'cooling',
    peca_19_vidro_porta_dianteira: 'glass',
    peca_20_vidro_porta_traseira: 'glass',
    peca_21_porta_dianteira: 'doors',
    peca_22_porta_traseira: 'doors',
  };
  for (const [legacyPartId, id] of Object.entries(cases))
    assert.equal(previews.resolve({ legacyPartId }, index).id, id);
  assert.equal(previews.resolve({ subsystemId: 'freios/fluido' }, index).id, 'brakeFluid');
  assert.equal(
    previews.resolve({ legacyPartId: 'peca_27_bateria_12v', componentId: 'bateria' }, index),
    null,
  );
  const vin = previews.resolve(
    {
      legacyPartId: 'peca_10_carroceria',
      componentId: 'carroceria',
      subsystemId: 'identificacao/vin',
    },
    index,
  );
  assert.equal(vin.id, 'vin');
  assert.match(vin.notes[0], /não é uma reprodução individual exata/);
});

test('unknown or conflicting explicit IDs never broaden into a generic fallback', () => {
  for (const value of [
    { subsystemId: 'unknown', assemblyId: 'brakes' },
    { legacyPartId: 'peca_27_unknown', componentId: 'eletrica' },
    { subsystemId: 'freios/fluido', assemblyIds: ['brakes'] },
    { subsystemId: 'freios/fluido', assemblyId: 'brakes' },
    { legacyPartId: 'peca_27_bateria_12v', assemblyIds: ['batteryHV'] },
    { assemblyId: 'unknown' },
    { assemblyId: 'brakes', componentId: 'motor' },
    { componentId: 'unknown' },
    { assemblyIds: [] },
    { assemblyIds: ['brakes', 'unknown'] },
    { subsystemId: '__proto__' },
    { assemblyId: 'constructor' },
  ]) {
    assert.equal(previews.resolve(value, index), null, JSON.stringify(value));
    assert.equal(previews.art(value, '', index), '', JSON.stringify(value));
  }
  assert.equal(previews.legacyAssembly('peca_27_bateria_12v-extra'), null);
  assert.equal(
    previews.selection({ assemblyId: 'doors', componentId: 'carroceria' }, index).assemblyId,
    'doors',
  );
  assert.equal(previews.componentAssembly('constructor'), null);
  assert.equal(previews.resolve({ assemblyId: 'brakes' }, null), null);
});

test('lookups do not alter source states, mappings or arrays', () => {
  const snapshot = JSON.stringify(index);
  const freeze = (value) => {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const frozen = freeze(JSON.parse(snapshot));
  const resolved = previews.resolve(
    {
      assemblyId: 'brakes',
      publication: { included: false },
      legalStatus: null,
      reviewStatus: { fullTextReviewed: false },
    },
    frozen,
  );
  assert.equal(resolved.id, 'brakes');
  resolved.assemblyIds.push('unknown');
  resolved.notes.push('caller note');
  assert.equal(JSON.stringify(frozen), snapshot);
  assert.equal(JSON.stringify(index), snapshot);
});

test('generated figures escape labels, identify related geometry and retain derivative attribution', () => {
  const html = previews.art(
    { legacyPartId: 'peca_11_capo', label: '<img src=x onerror=alert(1)>' },
    'test" unsafe=',
    index,
  );
  assert.match(html, /data-model-preview="body"/);
  assert.match(html, /width="1024" height="768" loading="lazy" decoding="async"/);
  assert.match(html, /body\.webp\?v=[a-f0-9]{16}/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /não é uma reprodução individual exata/);
  assert.match(html, /BMW Car IT/);
  assert.match(html, /creativecommons.org\/licenses\/by\/4.0/);
  assert.match(html, /Renderização adaptada/);
  const mechanics = previews.art({ assemblyId: 'engine' }, '', index);
  assert.match(mechanics, /Exemplo ilustrativo do conjunto 3D/);
  assert.match(mechanics, /Geometria mecânica autoral didática/);
  assert.doesNotMatch(mechanics, /BMW Car IT/);
});

test('classic ensure shares one fetch, caches the index and fails gracefully', async () => {
  let calls = 0;
  const helper = browser(async (url, options) => {
    calls += 1;
    assert.equal(url, 'assets/models/suv/thumbnails/index.json');
    assert.equal(options.credentials, 'same-origin');
    return { ok: true, json: async () => index };
  });
  assert.equal(helper.resolve({ assemblyId: 'brakes' }), null);
  const first = helper.ensure();
  assert.equal(helper.ensure(), first);
  assert.equal(await first, index);
  assert.equal(helper.resolve({ assemblyId: 'brakes' }).id, 'brakes');
  await helper.ensure();
  assert.equal(calls, 1);
  for (const fetch of [
    async () => {
      throw Error('offline');
    },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ images: {} }) }),
  ]) {
    const failed = browser(fetch);
    assert.equal(await failed.ensure(), null);
    assert.equal(failed.art({ assemblyId: 'brakes' }), '');
  }
});
