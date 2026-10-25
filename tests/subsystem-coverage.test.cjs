'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../catalog.json');
const mapping = require('../data/vehicle-legislation/reviewed-map.json');
const { ComponentFlow } = require('../vehicle-data.js');
const {
  SUBSYSTEMS,
  SUPPLEMENTAL_SUBSYSTEMS,
  ALL_SUBSYSTEMS,
  coverageReport,
  subsystemSelection,
  subsystemsForAssembly,
} = require('../src/guide/subsystem-coverage.js');
const ROOT = path.resolve(__dirname, '..');
const hierarchy = catalog.metadata.hierarchy;
const canonical = hierarchy
  .filter((group) => group.physical)
  .flatMap((group) =>
    group.children.map((row) => ({
      ...row,
      system: group.id,
      systemLabel: group.label,
    })),
  );
const originalParts = new Map(mapping.parts.map((part) => [part.id, part]));

// The previous visual catalog is the authority for parity, not the new model's
// count of meshes or an arbitrary total of labels.
test('all thirty original subsystem identities and labels survive in canonical order', () => {
  assert.equal(canonical.length, 30);
  assert.deepEqual(
    SUBSYSTEMS.map(({ id, label, system, systemLabel }) => ({ id, label, system, systemLabel })),
    canonical,
  );
  assert.equal(new Set(ALL_SUBSYSTEMS.map((row) => row.id)).size, ALL_SUBSYSTEMS.length);
  const report = coverageReport();
  assert.equal(report.systems, 11);
  assert.equal(report.originalTotal, 30);
  assert.equal(report.covered, 30);
  assert.equal(report.total, 33);
  assert.equal(report.supplemental, 3);
  assert.deepEqual(report.missing, []);
  assert.equal(report.complete, true);
});

test('canonical 2D board viewports reproduce the existing subsystem artwork contract', () => {
  for (const row of SUBSYSTEMS) {
    const original = ComponentFlow.art(row, hierarchy);
    assert.ok(original, row.id);
    assert.ok(fs.existsSync(path.join(ROOT, row.referenceAsset)), row.referenceAsset);
    for (const field of ['asset', 'columns', 'rows', 'index', 'x', 'y', 'width', 'height'])
      assert.equal(row.referenceArt[field], original[field], `${row.id}: ${field}`);
    assert.ok(row.referenceArt.width > 0 && row.referenceArt.height > 0);
    assert.ok(row.referenceArt.x + row.referenceArt.width <= row.referenceArt.sourceWidth);
    assert.ok(row.referenceArt.y + row.referenceArt.height <= row.referenceArt.sourceHeight);
  }
});

test('exact original region IDs and subsystem filters prevent unrelated requirement inheritance', () => {
  for (const row of SUBSYSTEMS) {
    const selection = subsystemSelection(row.id);
    assert.deepEqual(selection.subsystemIds, [row.id]);
    assert.equal(selection.id, row.assemblyId);
    assert.equal(selection.subsystemId, row.id);
    for (const partId of selection.legacyParts) {
      const part = originalParts.get(partId);
      assert.ok(part, `${row.id}: unknown original region ${partId}`);
      assert.ok(
        part.topics.some((topic) => topic.subsystemId === row.id),
        `${row.id}: ${partId} has no explicit reviewed topic for this subsystem`,
      );
    }
  }
  const auxiliary = subsystemSelection('visual/bateria-12v');
  const traction = subsystemSelection('propulsao/eletrica');
  assert.deepEqual(auxiliary.legacyParts, ['peca_27_bateria_12v']);
  assert.ok(!traction.legacyParts.includes('peca_27_bateria_12v'));
  const linked = (selection) =>
    selection.legacyParts
      .flatMap((id) => originalParts.get(id).topics)
      .flatMap((topic) => topic.links);
  assert.ok(!linked(traction).some((link) => link.actId === 'inmetro-145-2022'));
  assert.ok(linked(auxiliary).some((link) => link.actId === 'inmetro-145-2022'));
  assert.ok(!subsystemSelection('eletronica/comandos').legacyParts.includes('peca_27_bateria_12v'));
});

test('unreviewed radiators, screens, labels and harnesses retain explicit gaps instead of guessed laws', () => {
  const cooling = subsystemSelection('visual/arrefecimento');
  assert.deepEqual(cooling.legacyParts, ['peca_29_radiador']);
  assert.deepEqual(cooling.subsystemIds, []);
  assert.ok(originalParts.get(cooling.legacyParts[0]).topics.every((topic) => !topic.links.length));
  assert.ok(/lacuna/.test(cooling.description));
  for (const id of ['eletronica/imagens', 'identificacao/placas', 'identificacao/rotulagem']) {
    assert.deepEqual(subsystemSelection(id).legacyParts, [], id);
    assert.ok(subsystemSelection(id).anchor, `${id} remains identifiable in the scene`);
  }
  const harness = subsystemSelection('eletronica/comandos');
  assert.deepEqual(harness.legacyParts, ['peca_28_chicote_eletrico']);
  assert.ok(originalParts.get(harness.legacyParts[0]).topics.every((topic) => !topic.links.length));
  const materials = subsystemSelection('ocupantes/materiais');
  assert.ok(materials.applicabilityHints.some((hint) => /espuma/.test(hint)));
});

test('navigation anchors and supplemental hybrid examples remain separate from technical approval', () => {
  for (const row of ALL_SUBSYSTEMS) {
    assert.equal(row.anchor.length, 3, row.id);
    assert.ok(row.anchor.every(Number.isFinite), row.id);
    assert.equal(row.anchorKind, 'consultative_navigation');
    assert.ok(Math.abs(row.anchor[0]) <= 3 && row.anchor[1] >= 0 && row.anchor[1] <= 2);
    assert.ok(fs.existsSync(path.join(ROOT, row.referenceAsset)), row.id);
    assert.ok(row.assemblyIds.includes(row.assemblyId));
  }
  assert.ok(SUPPLEMENTAL_SUBSYSTEMS.every((row) => !row.canonical && row.exampleOnly));
  const hybrid = subsystemSelection('visual/powertrain-hibrido');
  assert.deepEqual(hybrid.assemblyIds, ['engine', 'motorElectric', 'batteryHV']);
  assert.deepEqual(hybrid.subsystemIds, [
    'propulsao/componentes',
    'propulsao/emissoes',
    'propulsao/eletrica',
  ]);
  assert.ok(hybrid.exampleOnly);
  assert.ok(subsystemsForAssembly('engine').some((row) => row.id === 'propulsao/componentes'));
  assert.ok(subsystemsForAssembly('batteryHV').some((row) => row.id === 'propulsao/eletrica'));
  assert.equal(subsystemSelection('unknown'), null);
});

test('coverage reports missing original identities even when duplicates or extra labels inflate a list', () => {
  const sample = ALL_SUBSYSTEMS.filter((row) => row.id !== 'vidros/limpadores');
  sample.push(SUBSYSTEMS[0], { id: 'visual/not-a-reviewed-subsystem' });
  const report = coverageReport(sample);
  assert.equal(report.covered, 29);
  assert.equal(report.complete, false);
  assert.deepEqual(report.missing, ['vidros/limpadores']);
  assert.deepEqual(report.unrecognized, ['visual/not-a-reviewed-subsystem']);
  const descriptor = subsystemSelection('propulsao/eletrica');
  descriptor.legacyParts.push('fake');
  descriptor.anchor[0] = 999;
  assert.ok(!subsystemSelection('propulsao/eletrica').legacyParts.includes('fake'));
  assert.notEqual(subsystemSelection('propulsao/eletrica').anchor[0], 999);
});
