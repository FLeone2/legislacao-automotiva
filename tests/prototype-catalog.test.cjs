'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const catalog = require('../data/prototype/catalog.json');
const { getAct, getSelectionReferences, searchActs } = require('../src/prototype/catalog.js');
const canonical = fs
  .readFileSync(path.join(ROOT, 'knowledge/records.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map(JSON.parse);

test('prototype projection preserves every published act and its independent editorial states', () => {
  assert.equal(catalog.acts.length, 294);
  assert.equal(catalog.assemblies.length, 21);
  assert.equal(catalog.subsystems.length, 33);
  assert.equal(catalog.subsystems.filter((row) => row.canonical).length, 30);
  assert.equal(catalog.subsystems.filter((row) => !row.canonical).length, 3);
  assert.deepEqual(catalog.acts.map((act) => act.id).sort(), canonical.map((act) => act.id).sort());
  for (const act of catalog.acts) {
    const source = canonical.find((row) => row.id === act.id);
    for (const field of [
      'publication',
      'requirementIds',
      'relatedCandidates',
      'provenance',
      'stateProvenance',
    ])
      assert.deepEqual(act[field], source[field], `${act.id}:${field}`);
    for (const dimension of ['legalStatus', 'reviewStatus', 'applicability']) {
      if (source[dimension] === null) assert.equal(act[dimension], null);
      else
        for (const [field, value] of Object.entries(act[dimension]))
          assert.deepEqual(value, source[dimension][field], `${act.id}:${dimension}:${field}`);
    }
    assert.equal(act.legalStatus?.state, source.legalStatus?.state);
    assert.equal(act.reviewStatus?.fullTextReviewed, source.reviewStatus?.fullTextReviewed);
    assert.equal(
      act.reviewStatus?.amendmentChainReviewed,
      source.reviewStatus?.amendmentChainReviewed,
    );
    assert.equal(act.automaticApplicability, false);
    assert.ok(fs.existsSync(path.join(ROOT, act.markdownPath)));
  }
  assert.equal(getAct(catalog, 'senatran-095').reviewStatus, null);
});

test('exact subsystem references do not inherit other acts from their assembly or shared taxonomy', () => {
  const fluid = getSelectionReferences(catalog, {
    assemblyId: 'brakes',
    subsystemId: 'freios/fluido',
  });
  assert.deepEqual(fluid.actIds, ['inmetro-456-2021']);
  assert.ok(!fluid.actIds.includes('contran-915-2022'));
  assert.ok(!fluid.actIds.includes('inmetro-145-2022'));
  const traction = getSelectionReferences(catalog, {
    assemblyId: 'batteryHV',
    subsystemId: 'propulsao/eletrica',
  });
  assert.ok(!traction.actIds.includes('inmetro-145-2022'));
  assert.equal(traction.componentActs.length, 0);
  assert.ok(traction.vehicleContextActs.length);
  const auxiliary = getSelectionReferences(catalog, { assemblyId: 'battery12v' });
  assert.deepEqual(auxiliary.componentActIds, ['inmetro-145-2022']);
  assert.equal(getSelectionReferences(catalog, { assemblyId: 'cooling' }).actIds.length, 0);
  assert.equal(getSelectionReferences(catalog, { assemblyId: 'electronics' }).actIds.length, 0);
  assert.equal(
    getSelectionReferences(catalog, { assemblyId: 'brakes', subsystemId: 'missing' }).actIds.length,
    0,
  );
  const hybrid = getSelectionReferences(catalog, { subsystemId: 'visual/powertrain-hibrido' });
  const motorComponents = hybrid.componentActs.find((act) => act.id === 'inmetro-145-2022');
  assert.deepEqual(motorComponents.contextualRequirementIds, [
    'inmetro-145-2022:req:02',
    'inmetro-145-2022:req:15',
  ]);
  assert.ok(!motorComponents.contextualTopics.some((topic) => /bateria/i.test(topic)));
  const motorIdentity = hybrid.componentActs.find((act) => act.id === 'contran-968-2022');
  assert.deepEqual(motorIdentity.contextualRequirementIds, ['contran-968-2022:req:06']);
  assert.equal(motorIdentity.contextualDescription, 'Identificação do motor');
});

test('geometric children expose parent references separately without direct obligations', () => {
  const child = getSelectionReferences(catalog, {
    assemblyId: 'brakes',
    partId: 'front-caliper-mesh',
  });
  assert.deepEqual(child.actIds, []);
  assert.deepEqual(child.componentActs, []);
  assert.deepEqual(child.vehicleContextActs, []);
  assert.equal(child.parentContext.assemblyId, 'brakes');
  assert.ok(child.parentContext.actIds.includes('contran-915-2022'));
  assert.equal(child.assessment.automaticObligation, false);
  assert.ok(child.gaps.some((gap) => /sem associação normativa própria/.test(gap)));
});

test('all cross references resolve and workflow dependencies follow the actual process model', () => {
  const actIds = new Set(catalog.acts.map((act) => act.id));
  const stageIds = new Set(catalog.stages.map((stage) => stage.id));
  for (const row of [
    ...catalog.assemblies,
    ...catalog.subsystems,
    ...catalog.stages,
    ...catalog.tasks,
  ]) {
    assert.ok(
      row.actIds.every((id) => actIds.has(id)),
      row.id,
    );
  }
  assert.equal(catalog.stages.length, 9);
  for (const stage of catalog.stages) {
    assert.ok(stage.dependencies.every((id) => stageIds.has(id)));
    const expected = catalog.workflow.edges
      .filter((edge) => edge.target === stage.id && !edge.label)
      .map((edge) => edge.source);
    assert.deepEqual(stage.dependencies, expected);
    const taskSources = new Set(stage.tasks.flatMap((task) => task.sourceIds));
    const actsFromSources = new Set(
      catalog.sources
        .filter((source) => taskSources.has(source.id))
        .flatMap((source) => source.actIds),
    );
    assert.ok(stage.actIds.every((id) => actsFromSources.has(id)));
  }
  assert.ok(catalog.stages.find((stage) => stage.id === 'cat').actIds.includes('senatran-095'));
});

test('PDF labels require verified official bytes, identity, length and hash; HTML stays source-only', () => {
  const bank = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data/prototype/document-chunks.json'), 'utf8'),
  );
  const pdfActs = new Set(
    bank.documents
      .filter(
        (document) =>
          document.format === 'pdf' && catalog.acts.some((act) => act.id === document.actId),
      )
      .map((document) => document.actId),
  );
  assert.equal(catalog.counts.verifiedPdfActs, pdfActs.size);
  for (const act of catalog.acts) {
    if (act.pdfStatus !== 'verified_pdf') {
      assert.equal(act.pdfUrl, null);
      assert.equal(act.pdfStatus, 'official_source_only');
      continue;
    }
    assert.ok(act.pdfVariants.length);
    for (const document of act.pdfVariants) {
      const bytes = fs.readFileSync(path.join(ROOT, document.path));
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
      assert.equal(bytes.length, document.byteLength);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), document.sha256);
      assert.ok(document.titleEvidence);
      assert.ok(new URL(document.finalUrl).hostname.endsWith('.gov.br'));
    }
  }
  const components = getAct(catalog, 'inmetro-145-2022');
  assert.equal(components.pdfStatus, 'official_source_only');
  assert.match(components.officialUrl, /portaliq\.mdic\.gov\.br/);
  assert.equal(components.reviewStatus.fullTextReviewed, false);
  const cat = getAct(catalog, 'senatran-095');
  assert.deepEqual(
    cat.pdfVariants.map((copy) => copy.variant),
    ['original', 'republication_2022-08-19'],
  );
  assert.equal(cat.pdf.variant, 'republication_2022-08-19');
  assert.equal(cat.reviewStatus, null);
});

test('search accepts names and aliases while output remains source backed and deterministic', () => {
  assert.ok(
    fs.statSync(path.join(ROOT, 'data/prototype/catalog.json')).size < 1_000_000,
    'initial catalog must stay below 1MB; full evidence lives in canonical detail cards',
  );
  assert.ok(
    searchActs(catalog, 'componentes automotivos').some((act) => act.id === 'inmetro-145-2022'),
  );
  assert.ok(searchActs(catalog, 'senatran-095').some((act) => act.id === 'senatran-095'));
  const check = spawnSync(process.execPath, ['scripts/build-prototype-data.cjs', '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(check.status, 0, check.stderr || check.stdout);
});
