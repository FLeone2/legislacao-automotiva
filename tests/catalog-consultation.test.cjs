const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const {
  canonicalCatalogRecords,
  catalogIdentity,
  catalogRecords,
  catalogRecord,
} = require('../src/regulations/catalog.js');

function viewModel() {
  const context = {
    canonicalCatalogRecords,
    URLSearchParams,
    document: { addEventListener() {} },
    norm: (text) => String(text || '').toLowerCase(),
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/views/regulations.js', 'utf8'), context);
  return context;
}

test('canonical acts retain aliases and every legacy association without merging titles', () => {
  const entries = [
    {
      id: 'legacy-a',
      regulatoryId: 'act-a',
      title: 'Same title',
      stages: ['lab'],
      taxonomy: ['brakes'],
      vehicleLinks: [{ componentId: 'front' }],
      requirementIds: ['act-a:req:1'],
      legalApplicability: 'Needs assessment',
    },
    {
      id: 'legacy-b',
      regulatoryId: 'act-a',
      title: 'Same title',
      stages: ['cop'],
      taxonomy: ['production'],
      vehicleLinks: [{ componentId: 'rear' }],
      requirementIds: ['act-a:req:2'],
      legalApplicability: 'Rear component scope',
    },
    { id: 'unrelated-act', title: 'Same title' },
    { id: 'history', title: 'Old act', aliases: ['old-alias'], publication: { included: false } },
  ];
  const before = JSON.stringify(entries);
  const source = { records: entries, canonicalRecords: canonicalCatalogRecords(entries) };
  assert.equal(catalogRecords(source).length, 2);
  const record = catalogRecord(source, 'act-a');
  assert.deepEqual(record.stages, ['lab', 'cop']);
  assert.deepEqual(record.taxonomy, ['brakes', 'production']);
  assert.deepEqual(record.vehicleLinks, [{ componentId: 'front' }, { componentId: 'rear' }]);
  assert.deepEqual(record.requirementIds, ['act-a:req:1', 'act-a:req:2']);
  assert.deepEqual(record.catalogEntryIds, ['legacy-a', 'legacy-b']);
  assert.deepEqual(
    record.catalogEntryContexts.map((context) => context.legalApplicability),
    ['Needs assessment', 'Rear component scope'],
  );
  assert.deepEqual(
    canonicalCatalogRecords(source.canonicalRecords),
    source.canonicalRecords,
    'Canonicalization must retain contexts on repeated reads',
  );
  assert(record.aliases.includes('legacy-b'));
  assert.equal(catalogRecord(source, 'legacy-b'), record);
  assert.equal(catalogRecord(source, 'unrelated-act').title, 'Same title');
  assert.equal(catalogRecord(source, 'old-alias').id, 'history');
  assert.equal(catalogRecord(source, 'absent'), undefined);
  assert.equal(JSON.stringify(entries), before, 'Reconciliation must not edit legacy entries');
});

test('production adapter reconciles the five IBAMA alias pairs and counts canonical publications', () => {
  const index = JSON.parse(fs.readFileSync('data/site/index.json', 'utf8'));
  const { ComponentFlow } = require('../vehicle-data.js');
  const context = {
    regulatoryData: index.regulations,
    ComponentFlow,
    enrichFlowCatalogRecord: (record) => record,
    base: index.base,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/core/dom.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('src/regulations/catalog.js', 'utf8'), context);
  vm.runInContext('globalThis.installed = installActiveRegulations(base)', context);
  const source = context.installed;
  assert.equal(source.metadata.recordCount, source.canonicalRecords.length);
  assert.equal(
    new Set(source.canonicalRecords.map(catalogIdentity)).size,
    source.metadata.recordCount,
  );
  for (const id of [
    'ibama-in-23-2022',
    'ibama-in-3-2021',
    'ibama-in-23-2020',
    'ibama-in-22-2020',
    'ibama-in-11-2014',
  ]) {
    const aliases = source.records.filter((record) => record.regulatoryId === id);
    assert.equal(aliases.length, 2, id);
    const acts = source.canonicalRecords.filter((record) => record.regulatoryId === id);
    assert.equal(acts.length, 1, id);
    for (const alias of aliases) assert(acts[0].aliases.includes(alias.id));
  }
});

test('catalog adaptation preserves consultation and temporal scope with the actual review summary', () => {
  const source = {
    id: 'act-reviewed',
    title: 'Reviewed act',
    catalogRecordIds: ['legacy-reviewed'],
    vehicleLinks: [],
    generalCategories: [],
    relationships: [],
    reviewStatus: {
      summary: 'Directed excerpts reviewed; full text pending.',
      reviewedAt: '2026-10-18',
    },
    consultation: { scope: 'product-scope-only' },
    consultationTracks: ['safety'],
    consultationTopics: ['component'],
    temporalFlags: [{ type: 'transition', from: '2026-10-01', description: 'Check configuration' }],
    reviewMetadata: { asOf: '2026-10-19', fullTextReviewed: false },
  };
  const context = {
    regulatoryData: { inmetro: { metadata: { asOf: '2026-10-19' }, records: [source] } },
    base: { metadata: {}, records: [{ id: 'legacy-reviewed', agency: 'INMETRO' }] },
    ComponentFlow: {
      component() {
        return null;
      },
    },
    enrichFlowCatalogRecord: (record) => record,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/core/dom.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('src/regulations/catalog.js', 'utf8'), context);
  vm.runInContext('globalThis.installed = installActiveRegulations(base)', context);
  const adapted = context.installed.canonicalRecords[0];
  for (const field of [
    'consultation',
    'consultationTracks',
    'consultationTopics',
    'temporalFlags',
    'reviewMetadata',
  ])
    assert.deepEqual(JSON.parse(JSON.stringify(adapted[field])), source[field]);
  assert.equal(adapted.availability, source.reviewStatus.summary);
  assert.equal(adapted.reviewDate, '2026-10-18');
  assert.equal(adapted.officialAudit.reviewDate, '2026-10-18');
});

function exportFixture() {
  return {
    metadata: { asOf: '2026-10-19', recordCount: 36 },
    records: Array.from({ length: 36 }, (_, index) => ({
      id: `act-${index}`,
      active: true,
      title: `Act ${index}`,
      subject: index === 1 ? 'A comma, a "quote"\nand a second line' : 'Topic',
      systems: ['brakes'],
      generalCategories: [],
      phases: ['L8'],
      vehicleLinks: [{ componentId: 'brakes', subsystemId: 'brakes/front' }],
      publication: { included: true },
    })),
  };
}
const exportContext = {
  queryUrl: 'https://example.test/#inmetro?component=brakes',
  sourceUrl: 'https://example.test/data/inmetro/active.json',
  exportedAt: '2026-10-19T20:00:00.000Z',
  datasetSha256: 'a'.repeat(64),
};

test('filtered exports include all pages and reproduce the actual query IDs with version metadata', () => {
  const model = viewModel();
  const data = exportFixture();
  const q = new URLSearchParams('component=brakes&subsystem=brakes/front&page=2');
  const payload = model.regulatoryExportPayload(data, q, exportContext);
  assert.equal(payload.records.length, 36, 'The page parameter must not truncate the export');
  assert.equal(payload.query.resultCount, 36);
  assert.equal(payload.query.datasetSha256, 'a'.repeat(64));
  assert.equal(payload.query.sourceAsOf, '2026-10-19');
  assert.equal(payload.query.filters.component, 'brakes');
  assert.equal(payload.query.filters.page, undefined);
  // Full evidence can contain more search words than the compact UI index.
  const exact = model.regulatoryExportPayload(data, new URLSearchParams('q=not-in-index'), {
    ...exportContext,
    recordIds: ['act-1'],
  });
  assert.deepEqual(
    Array.from(exact.records, (record) => record.id),
    ['act-1'],
  );
  assert.throws(
    () =>
      model.regulatoryExportPayload(data, q, {
        ...exportContext,
        recordIds: ['act-no-longer-published'],
      }),
    /mudou de versão/,
  );
  const empty = model.regulatoryExportPayload(
    data,
    new URLSearchParams('q=unknown'),
    exportContext,
  );
  assert.equal(empty.records.length, 0);
  assert.equal(empty.query.resultCount, 0);
});

test('CSV has exactly the filtered references, escaped fields and reproducible query metadata', () => {
  const model = viewModel();
  const payload = model.regulatoryExportPayload(
    exportFixture(),
    new URLSearchParams('record=act-1'),
    exportContext,
  );
  const csv = model.regulatoryExportCsv(payload);
  const parsed = JSON.parse(
    execFileSync(
      'python',
      [
        '-c',
        'import csv,io,json,sys; print(json.dumps(list(csv.DictReader(io.StringIO(sys.stdin.read().lstrip("\\ufeff"))))))',
      ],
      { input: csv, encoding: 'utf8' },
    ),
  );
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 'act-1');
  assert.equal(parsed[0].subject, exportFixture().records[1].subject);
  assert.equal(parsed[0].exportedAt, exportContext.exportedAt);
  assert.equal(parsed[0].datasetSha256, exportContext.datasetSha256);
  assert.equal(parsed[0].sourceUrl, exportContext.sourceUrl);
  assert.equal(JSON.parse(parsed[0].queryFilters).record, 'act-1');
});

test('agency searches preserve the component and subsystem until explicitly removed', () => {
  const model = viewModel();
  const q = new URLSearchParams('record=act-1&component=brakes&subsystem=brakes/front&page=2');
  assert.deepEqual(JSON.parse(JSON.stringify(model.regulatoryContext(q))), {
    component: 'brakes',
    subsystem: 'brakes/front',
  });
  assert.equal(model.regulatoryContext(q).record, undefined);
  assert.equal(model.regulatoryContext(q).page, undefined);
});
