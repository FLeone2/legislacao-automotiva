'use strict';

// The safety tree is an editorial input. Every act it cites must exist in the
// collection and every article it links must exist in the generated full text.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { safetyTreeSpec } = require('../flow-safety-tree.js');
const { homologationFlowSpec } = require('../flow-data.js');

const root = path.resolve(__dirname, '..');
const textIndex = new Map(
  JSON.parse(fs.readFileSync(path.join(root, 'texts/index.json'), 'utf8')).acts.map((a) => [
    a.id,
    a,
  ]),
);
const anchors = new Map();
function anchorsOf(id) {
  if (!anchors.has(id)) {
    const file = path.join(root, 'texts', `${id}.md`);
    const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    anchors.set(id, new Set([...text.matchAll(/<a id="([^"]+)"><\/a>/g)].map((m) => m[1])));
  }
  return anchors.get(id);
}
const sections = (group) => group.subgroups || [group];
const items = safetyTreeSpec.groups.flatMap((g) => sections(g).flatMap((s) => s.items));

test('safety tree covers the CAT levels, optional technologies, MOVER and identification', () => {
  const byGroup = Object.fromEntries(
    safetyTreeSpec.groups.map((g) => [g.id, sections(g).flatMap((s) => s.items).length]),
  );
  assert.deepEqual(byGroup, {
    'nivel-1': 12,
    'nivel-2': 14,
    'nivel-3': 16,
    identificacao: 10,
    opcionais: 9,
    outros: 46,
  });
  const others = safetyTreeSpec.groups.find((g) => g.id === 'outros');
  assert.equal(others.subgroups[0].items.length, 18);
  assert.deepEqual(
    others.subgroups.slice(1).map((s) => s.items.map((i) => i.code).join(',')),
    [
      'A1,A2,A3,A4,A5,A6,A7',
      'B1,B2,B3,B4,B5,B6,B7,B8',
      'C1,C2,C3,C4,C5,C6,C7,C8',
      'D1,D2,D3,D4,D5',
    ],
  );
  const labels = items.map((i) => i.label).join(' | ');
  for (const expected of ['VIN', 'ETA', 'ENSV', 'Placa', 'WMI', 'SINIAV', 'Airbags', 'Extintor'])
    assert.match(labels, new RegExp(expected));
  assert.ok(homologationFlowSpec.stages.some((s) => s.id === 'seguranca'));
});

test('item IDs are unique and every item has an act or an explicit gap', () => {
  const ids = items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of items) {
    if (!item.refs.length) assert.ok(item.gap, `${item.id} has no act and no gap`);
    for (const ref of item.refs) assert.match(ref.id, /^[a-z0-9-]+$/);
  }
});

test('every cited act is in the text index and every linked article exists', () => {
  const refs = [
    ...items.flatMap((i) => i.refs.map((r) => [i.id, r])),
    ...safetyTreeSpec.groups.filter((g) => g.source).map((g) => [g.id, g.source]),
  ];
  const withoutText = [];
  for (const [owner, ref] of refs) {
    assert.ok(textIndex.has(ref.id), `${owner}: ${ref.id} is not in texts/index.json`);
    if (!textIndex.get(ref.id).fullTextAvailable) {
      withoutText.push(ref.id);
      assert.equal(ref.anchor, null, `${owner}: ${ref.id} has no text to anchor`);
      continue;
    }
    if (ref.anchor)
      assert.ok(anchorsOf(ref.id).has(ref.anchor), `${owner}: ${ref.id}#${ref.anchor} missing`);
  }
  assert.deepEqual([...new Set(withoutText)], []);
});

test('acts inactivated by the collection owner are not cited', () => {
  const policy = JSON.parse(
    fs.readFileSync(path.join(root, 'data/contran/publication-policy.json'), 'utf8'),
  );
  const excluded = new Set(policy.inactiveHistoricalIds);
  for (const item of items)
    for (const ref of item.refs) assert.ok(!excluded.has(ref.id), `${item.id} cites ${ref.id}`);
});
