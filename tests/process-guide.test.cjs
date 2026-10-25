'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_PROFILE,
  normalizeProfile,
  evaluateProfile,
  buildChecklist,
  buildFlow,
  exportProcessMarkdown,
  SOURCE_REFERENCES,
} = require('../src/guide/process-model.js');

test('missing environmental mass prevents false M1→LP equivalence', () => {
  const result = evaluateProfile(DEFAULT_PROFILE);
  assert.equal(result.emissions.family, 'pending');
  assert.match(result.emissions.label, /enquadramento pendente/);
  assert.ok(result.missing.some((value) => /ordem de marcha/.test(value)));
});

test('PROMOT routes and environmental evidence use LCM without inheriting L8/P8 licensing', () => {
  for (const powertrain of ['ice', 'hev', 'phev', 'bev']) {
    const profile = { ...DEFAULT_PROFILE, category: 'L', origin: 'imported', powertrain };
    const assessment = evaluateProfile(profile);
    assert.deepEqual(assessment.emissions.sourceIds, ['ibama-lcm-service', 'conama-493-2019']);
    for (const item of buildChecklist(profile).filter((row) =>
      [
        'environment-route',
        'electric-environment',
        'hybrid-evidence',
        'thermal-evidence',
        'cop-plan',
        'importation',
      ].includes(row.id),
    )) {
      assert.ok(item.sourceIds.includes('ibama-lcm-service'), item.id);
      assert.ok(
        !item.sourceIds.some((id) =>
          ['ibama-lcvm-service', 'conama-492-2018', 'conama-490-2018'].includes(id),
        ),
        item.id,
      );
    }
  }
});

test('unknown M2 mass leaves the Annex XI group pending', () => {
  const result = evaluateProfile({ ...DEFAULT_PROFILE, category: 'M2', massKg: null, seats: 15 });
  assert.ok(result.safety.particularities.some((text) => /PBT pendente/.test(text)));
  assert.ok(!result.safety.particularities.some((text) => /segue o grupo pesado/.test(text)));
  assert.ok(result.safety.sourceIds.includes('guide-contran-939'));
  assert.ok(
    evaluateProfile({ ...DEFAULT_PROFILE, category: 'M3' }).safety.sourceIds.includes(
      'guide-contran-959',
    ),
  );
});

test('report fronts respect powertrain and purpose while a towed auxiliary axle stays under review', () => {
  const ids = (profile) => buildChecklist({ ...DEFAULT_PROFILE, ...profile }).map((row) => row.id);
  assert.ok(!ids({ category: 'M1', powertrain: 'ice' }).includes('report-electric-mn'));
  assert.ok(
    ids({ category: 'M1', powertrain: 'bev', fuel: 'electric' }).includes('report-electric-mn'),
  );
  assert.ok(
    ids({ category: 'L', powertrain: 'bev', fuel: 'electric' }).includes('report-electric-l'),
  );
  assert.ok(
    !ids({ category: 'L', powertrain: 'bev', fuel: 'electric' }).includes('report-electric-mn'),
  );
  assert.ok(
    ids({ category: 'N3', purpose: 'modification' }).includes(
      'report-auxiliary-motor-modification',
    ),
  );
  assert.ok(
    !ids({ category: 'N3', purpose: 'series' }).includes('report-auxiliary-motor-modification'),
  );
  const towed = buildChecklist({ ...DEFAULT_PROFILE, category: 'O', powertrain: 'ice' }).find(
    (row) => row.id === 'report-electric-towed-review',
  );
  assert.equal(towed.applicability, 'review');
  assert.ok(!ids({ purpose: 'component' }).some((id) => id.startsWith('report-')));
});

test('electric safety follows M/N or L acts and a conditional LC alternative never selects P8', () => {
  const electric = (category) =>
    buildChecklist({ ...DEFAULT_PROFILE, category, powertrain: 'bev', fuel: 'electric' }).find(
      (row) => row.id === 'electric-safety',
    );
  assert.ok(electric('M1').sourceIds.includes('guide-contran-749'));
  assert.ok(electric('L').sourceIds.includes('guide-contran-750'));
  assert.ok(!electric('L').sourceIds.includes('guide-contran-749'));
  const lc = evaluateProfile({
    ...DEFAULT_PROFILE,
    category: 'N2',
    massKg: 3800,
    massRunningKg: 2300,
    payloadKg: 1300,
    derivedFromPassenger: false,
    seats: 3,
  });
  assert.equal(lc.emissions.family, 'light');
  assert.match(lc.emissions.phase, /L7\/L8/);
  assert.ok(
    lc.emissions.particularities.some(
      (text) => /art\. 23/.test(text) && /autorização prévia/.test(text),
    ),
  );
});

test('LP/LC triage uses both mass limits, capacity and derivation', () => {
  const lp = { ...DEFAULT_PROFILE, massKg: 2500, massRunningKg: 1800, seats: 5 };
  assert.match(evaluateProfile(lp).emissions.label, /^LP/);
  const lc = {
    ...lp,
    category: 'N1',
    massKg: 3500,
    massRunningKg: 2200,
    payloadKg: 1200,
    derivedFromPassenger: false,
  };
  assert.match(evaluateProfile(lc).emissions.label, /^LC/);
  assert.match(
    evaluateProfile({ ...lc, derivedFromPassenger: null }).emissions.label,
    /a confirmar/,
  );
  assert.match(evaluateProfile({ ...lc, payloadKg: 1000, seats: 2 }).emissions.label, /^LP/);
  assert.match(evaluateProfile({ ...lc, derivedFromPassenger: true }).emissions.label, /^LP/);
  assert.match(
    evaluateProfile({ ...lc, payloadKg: 900, seats: null }).emissions.label,
    /a confirmar/,
  );
  // N2 with MTMA 3,800 kg may remain in the environmental light scope.
  assert.equal(evaluateProfile({ ...lc, category: 'N2', massKg: 3800 }).emissions.family, 'light');
  assert.equal(evaluateProfile({ ...lp, massRunningKg: 2721 }).emissions.family, 'heavy');
  assert.equal(evaluateProfile({ ...lp, massKg: 3857 }).emissions.family, 'heavy');
});

test('BEV excludes thermal evidence without claiming automatic license exemption', () => {
  const profile = { ...DEFAULT_PROFILE, powertrain: 'bev', fuel: 'electric' };
  const ids = buildChecklist(profile).map((value) => value.id);
  assert.ok(!ids.includes('thermal-evidence'));
  assert.ok(ids.includes('electric-environment'));
  assert.ok(ids.includes('electric-safety'));
  assert.ok(
    evaluateProfile(profile).emissions.particularities.some((value) =>
      /não constitui dispensa automática/.test(value),
    ),
  );
});

test('hybrids retain thermal branch and add distinct hybrid work', () => {
  for (const powertrain of ['hev', 'phev']) {
    const items = buildChecklist({ ...DEFAULT_PROFILE, powertrain });
    assert.ok(items.some((value) => value.id === 'thermal-evidence'));
    assert.ok(items.some((value) => value.id === 'hybrid-evidence'));
  }
  assert.match(
    buildChecklist({ ...DEFAULT_PROFILE, powertrain: 'phev' }).find(
      (value) => value.id === 'hybrid-evidence',
    ).title,
    /PHEV/,
  );
});

test('trailer, motorcycle and standalone component receive different paths', () => {
  const trailer = buildChecklist({ ...DEFAULT_PROFILE, category: 'O', seats: 0 });
  assert.ok(
    !trailer.some((value) =>
      ['thermal-evidence', 'electric-environment', 'environment-class'].includes(value.id),
    ),
  );
  assert.equal(evaluateProfile({ ...DEFAULT_PROFILE, category: 'L' }).emissions.family, 'promot');
  const component = buildChecklist({ ...DEFAULT_PROFILE, purpose: 'component' });
  assert.ok(component.some((value) => value.id === 'component-impact'));
  assert.ok(
    !component.some((value) => ['sis-cat', 'cct-sgq', 'thermal-evidence'].includes(value.id)),
  );
  assert.match(
    buildFlow({ ...DEFAULT_PROFILE, purpose: 'component' }).nodes.find(
      (value) => value.id === 'cat',
    ).title,
    /fornecimento/,
  );
});

test('operation and radio change conditional work, never fabricate approval', () => {
  const imported = buildChecklist({ ...DEFAULT_PROFILE, origin: 'imported', purpose: 'limited' });
  assert.ok(imported.some((value) => value.id === 'importation'));
  assert.match(
    imported.find((value) => value.id === 'environment-route').description,
    /não presumir dispensa/,
  );
  assert.ok(
    !buildChecklist({ ...DEFAULT_PROFILE, radio: false }).some(
      (value) => value.id === 'telecom-scope',
    ),
  );
  assert.ok(
    buildChecklist({ ...DEFAULT_PROFILE, radio: null }).some(
      (value) => value.id === 'telecom-scope',
    ),
  );
  assert.equal(
    buildChecklist(DEFAULT_PROFILE).find((value) => value.id === 'cct-sgq').applicability,
    'conditional',
  );
  assert.equal(
    buildChecklist(DEFAULT_PROFILE).find((value) => value.id === 'safety-matrix').applicability,
    'review',
  );
});

test('invalid inputs stay unknown and contradictions are visible', () => {
  const p = normalizeProfile({
    category: 'invalid',
    massKg: '',
    massRunningKg: -1,
    radio: 'yes',
    derivedFromPassenger: 'false',
  });
  assert.equal(p.category, '');
  assert.equal(p.massKg, null);
  assert.equal(p.massRunningKg, null);
  assert.equal(p.radio, null);
  assert.equal(p.derivedFromPassenger, false);
  const assessment = evaluateProfile({
    ...DEFAULT_PROFILE,
    powertrain: 'bev',
    fuel: 'diesel',
    seats: 10,
    massKg: 1000,
    massRunningKg: 1200,
  });
  assert.ok(assessment.warnings.some((value) => /BEV/.test(value)));
  assert.ok(assessment.warnings.some((value) => /M1/.test(value)));
  assert.ok(assessment.warnings.some((value) => /superior/.test(value)));
});

test('every checklist reference and dependency resolves across profiles', () => {
  const sources = new Set(SOURCE_REFERENCES.map((value) => value.id));
  for (const profile of [
    DEFAULT_PROFILE,
    { purpose: 'component' },
    { category: 'O' },
    { category: 'L' },
    { purpose: 'modification' },
    { powertrain: 'bev', fuel: 'electric' },
    { origin: 'imported' },
  ]) {
    const items = buildChecklist(profile);
    const ids = new Set(items.map((value) => value.id));
    assert.equal(ids.size, items.length);
    for (const item of items) {
      assert.ok(
        item.sourceIds.every((id) => sources.has(id)),
        item.id,
      );
      assert.ok(
        item.blockedBy.every((id) => ids.has(id)),
        item.id,
      );
    }
    const flow = buildFlow(profile);
    const nodes = new Set(flow.nodes.map((value) => value.id));
    assert.ok(flow.edges.every((edge) => nodes.has(edge.source) && nodes.has(edge.target)));
  }
});

test('Markdown export preserves manual evidence and does not declare regulatory approval', () => {
  const md = exportProcessMarkdown({
    id: 'demo',
    profile: { ...DEFAULT_PROFILE, name: 'Meu projeto' },
    checks: {
      profile: { status: 'done', note: 'Conferido por engenharia', evidence: 'Ficha R2' },
      'legal-matrix': { status: 'na', note: 'Justificativa registrada' },
    },
  });
  assert.match(md, /^# Meu projeto/);
  assert.match(md, /Concluído pelo usuário/);
  assert.match(md, /Ficha R2/);
  assert.match(md, /Justificativa registrada/);
  assert.match(md, /não comprovam aprovação/);
  assert.match(md, /https:\/\/conama\.mma\.gov\.br/);
  assert.doesNotThrow(() => exportProcessMarkdown({ checks: null }));
});

test('safety report groups use PBT and M3 usage is explicit', () => {
  const low = evaluateProfile({ ...DEFAULT_PROFILE, category: 'M2', massKg: 3400, seats: 12 });
  const high = evaluateProfile({ ...DEFAULT_PROFILE, category: 'M2', massKg: 4800, seats: 15 });
  assert.ok(low.safety.particularities.some((value) => /grupo até 3.500/.test(value)));
  assert.ok(high.safety.particularities.some((value) => /grupo pesado/.test(value)));
  const urban = evaluateProfile({
    ...DEFAULT_PROFILE,
    category: 'M3',
    massKg: 10000,
    seats: 40,
    usage: 'urban',
  });
  const school = evaluateProfile({
    ...DEFAULT_PROFILE,
    category: 'M3',
    massKg: 10000,
    seats: 40,
    usage: 'school',
  });
  assert.ok(urban.safety.particularities.some((value) => /opcional de ESC/.test(value)));
  assert.ok(school.safety.particularities.some((value) => /obrigatória de ESC/.test(value)));
  assert.ok(urban.safety.sourceIds.includes('guide-contran-954'));
  assert.equal(normalizeProfile({ derivedFromPassenger: 'true', offroad: 'false' }).offroad, false);
});

test('classification from L7 is not silently applied to a historical project', () => {
  const assessment = evaluateProfile({ ...DEFAULT_PROFILE, year: 2021, massRunningKg: 1400 });
  assert.match(assessment.emissions.label, /histórica/);
  assert.ok(!/^LP/.test(assessment.emissions.label));
});

test('safety report matrix follows category and M3 use without inherited car impacts', () => {
  const ids = (profile) => buildChecklist({ ...DEFAULT_PROFILE, ...profile }).map((x) => x.id);
  const matrix = require('../data/process/report-matrix.json');
  for (const row of matrix.rows) {
    assert.ok(['conditional', 'review'].includes(row.applicability));
    assert.ok(row.sourceIds.every((id) => SOURCE_REFERENCES.some((s) => s.id === id)));
    assert.ok(row.description && row.reason && row.evidence.length);
  }
  const urbanRows = matrix.rows.filter((x) => x.usage?.includes('urban'));
  for (const row of urbanRows) assert.ok(ids({ category: 'M3', usage: 'urban' }).includes(row.id));
  const schoolOnly = matrix.rows.filter(
    (x) => x.usage?.includes('school') && !x.usage.includes('urban'),
  );
  for (const row of schoolOnly) {
    assert.ok(ids({ category: 'M3', usage: 'school' }).includes(row.id));
    assert.ok(!ids({ category: 'M3', usage: 'urban' }).includes(row.id));
  }
  for (const row of matrix.rows.filter(
    (x) => x.categories.includes('M1') && !x.categories.includes('O'),
  ))
    assert.ok(!ids({ category: 'O' }).includes(row.id));
  assert.ok(!ids({ purpose: 'component' }).some((id) => matrix.rows.some((row) => row.id === id)));
});
