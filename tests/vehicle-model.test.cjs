const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { vehicleComponents, ComponentFlow } = require('../vehicle-data.js');
const catalog = JSON.parse(fs.readFileSync('catalog.json'));
test('component, lane and topic IDs are stable and unique', () => {
  assert.equal(new Set(vehicleComponents.map((c) => c.id)).size, vehicleComponents.length);
  for (const c of vehicleComponents) {
    const lanes = ComponentFlow.topics(c, catalog.metadata.hierarchy);
    assert(lanes.length);
    assert.equal(new Set(lanes.map((l) => l.id)).size, lanes.length);
    for (const lane of lanes)
      assert.equal(new Set(lane.topics.map((t) => t.id)).size, lane.topics.length);
  }
});
test('seat anchorage and materials link only to catalogue references', () => {
  const topics = ComponentFlow.topics(
    ComponentFlow.component('bancos'),
    catalog.metadata.hierarchy,
  )[0].topics;
  assert(ComponentFlow.records(topics[0], catalog.records).some((r) => r.id === 'senatran-061'));
  const foam = topics.find((t) => t.id === 'materiais');
  assert.deepEqual(
    ComponentFlow.records(foam, catalog.records).map((r) => r.id),
    ['senatran-092'],
  );
  assert(foam.gaps.some((s) => s.includes('NBR')));
});
test('motor and tank have distinct safety and environmental branches', () => {
  for (const id of ['motor', 'tanque']) {
    const lanes = ComponentFlow.topics(ComponentFlow.component(id), catalog.metadata.hierarchy);
    assert.deepEqual(
      lanes.map((l) => l.id),
      ['seguranca', 'ambiental'],
    );
    const a = lanes.map(
      (l) =>
        new Set(
          l.topics.flatMap((t) => ComponentFlow.records(t, catalog.records).map((r) => r.id)),
        ),
    );
    assert(a[0].size > 0 && a[1].size > 0);
    assert([...a[0]].every((id) => !a[1].has(id)));
  }
});
test('explicit links resolve and canister distinguishes OBD coverage from construction gaps', () => {
  const ids = new Set(catalog.records.map((r) => r.id));
  for (const c of vehicleComponents)
    for (const l of ComponentFlow.topics(c, catalog.metadata.hierarchy))
      for (const t of l.topics) for (const id of t.recordIds || []) assert(ids.has(id), id);
  const canister = ComponentFlow.component('tanque').lanes[1].topics[1];
  assert.deepEqual(
    ComponentFlow.records(canister, catalog.records)
      .map((r) => r.id)
      .sort(),
    ['ibama-025', 'ibama-029'],
  );
  assert(canister.gaps.length);
});
test('taxonomy joins return no unrelated fallback documents', () => {
  assert.deepEqual(ComponentFlow.records({ taxonomy: ['missing'] }, catalog.records), []);
  assert.deepEqual(ComponentFlow.records({ recordIds: ['missing'] }, catalog.records), []);
  for (const r of ComponentFlow.records({ taxonomy: ['freios'] }, catalog.records))
    assert(r.taxonomy.some((t) => t.startsWith('freios/')));
});
test('all fourteen regions have image geometry and artwork; deduplication preserves source records', () => {
  assert.equal(vehicleComponents.length, 14);
  for (const c of vehicleComponents) {
    assert(c.path.startsWith('M'));
    assert(c.asset || c.crop);
  }
  const r = catalog.records[0];
  assert.deepEqual(ComponentFlow.unique([r, r]), [r]);
});
test('all 11 physical systems and 30 subsystems are covered with artwork', () => {
  const coverage = ComponentFlow.coverage(catalog.metadata.hierarchy);
  assert.deepEqual(coverage, { systems: 11, total: 30, covered: 30, missing: [] });
  for (const g of catalog.metadata.hierarchy.filter((g) => g.physical))
    for (const s of g.children) {
      const c = vehicleComponents.find((c) =>
        ComponentFlow.subsystems(c, catalog.metadata.hierarchy).some((x) => x.id === s.id),
      );
      assert(c);
      const sub = ComponentFlow.subsystems(c, catalog.metadata.hierarchy).find(
        (x) => x.id === s.id,
      );
      const art = ComponentFlow.art(sub, catalog.metadata.hierarchy);
      assert(art?.asset);
      assert(art.x >= 0 && art.y >= 0 && art.x + art.width <= 1536 && art.y + art.height <= 1024);
      const lanes = ComponentFlow.subsystemLanes(c, sub);
      assert(lanes.length);
      for (const lane of lanes)
        for (const topic of lane.topics) {
          const refs = ComponentFlow.records(topic, catalog.records);
          assert(refs.every((r) => catalog.records.includes(r)));
        }
    }
});
