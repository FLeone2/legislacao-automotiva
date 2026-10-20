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

function parseExportCsv(csv) {
  return JSON.parse(
    execFileSync(
      'python',
      [
        '-c',
        'import csv,io,json,sys; print(json.dumps(list(csv.DictReader(io.StringIO(sys.stdin.read().lstrip("\\ufeff"))))))',
      ],
      { input: csv, encoding: 'utf8' },
    ),
  );
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
  const parsed = parseExportCsv(csv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 'act-1');
  assert.equal(parsed[0].subject, exportFixture().records[1].subject);
  assert.equal(parsed[0].exportedAt, exportContext.exportedAt);
  assert.equal(parsed[0].datasetSha256, exportContext.datasetSha256);
  assert.equal(parsed[0].sourceUrl, exportContext.sourceUrl);
  assert.equal(JSON.parse(parsed[0].queryFilters).record, 'act-1');
});

test('exports reconcile direct and nested requirement IDs once without changing source records', () => {
  const model = viewModel();
  const data = exportFixture();
  data.records[0].requirementIds = ['act-0:req:01', 'act-0:req:01'];
  data.records[0].requirements = [{ id: 'act-0:req:01' }, { id: 'act-0:req:02' }];
  data.records[1].requirementIds = ['act-1:req:01'];
  const before = JSON.stringify(data);
  const payload = model.regulatoryExportPayload(data, new URLSearchParams(), exportContext);
  const json = JSON.parse(JSON.stringify(payload));
  const csv = parseExportCsv(model.regulatoryExportCsv(payload));
  assert.deepEqual(json.records[0].requirementIds, ['act-0:req:01', 'act-0:req:02']);
  assert.deepEqual(json.records[1].requirementIds, ['act-1:req:01']);
  assert.deepEqual(json.records[2].requirementIds, []);
  for (const [index, record] of json.records.entries())
    assert.deepEqual(JSON.parse(csv[index].requirementIds), record.requirementIds);
  assert.equal(payload.query.resultCount, data.records.length);
  assert.equal(JSON.stringify(data), before);
});

test('raw and compact sources export the same requirement IDs for every published agency act', () => {
  const model = viewModel();
  const index = JSON.parse(fs.readFileSync('data/site/index.json', 'utf8'));
  for (const agency of ['contran', 'proconve', 'inmetro', 'anatel']) {
    const data = JSON.parse(fs.readFileSync(`data/${agency}/active.json`, 'utf8'));
    const recordIds = data.records.map((record) => record.id);
    const before = JSON.stringify(data);
    const payload = model.regulatoryExportPayload(data, new URLSearchParams(), {
      ...exportContext,
      recordIds,
    });
    const compact = model.regulatoryExportPayload(
      index.regulations[agency],
      new URLSearchParams(),
      { ...exportContext, recordIds },
    );
    const csv = parseExportCsv(model.regulatoryExportCsv(payload));
    assert.deepEqual(
      Array.from(payload.records, (record) => record.id),
      recordIds,
      agency,
    );
    assert.equal(payload.query.resultCount, recordIds.length, agency);
    for (const [position, record] of payload.records.entries()) {
      const expected = (data.records[position].requirements || []).map(
        (requirement) => requirement.id,
      );
      assert.deepEqual(Array.from(record.requirementIds), expected, record.id);
      assert.deepEqual(Array.from(compact.records[position].requirementIds), expected, record.id);
      assert.deepEqual(JSON.parse(csv[position].requirementIds), expected, record.id);
    }
    assert.equal(JSON.stringify(data), before, agency);
  }
});

test('CSV and JSON keep PBEV requirements before and after a lazy detail load', async () => {
  const source = fs.readFileSync('data/inmetro/active.json');
  const index = JSON.parse(fs.readFileSync('data/site/index.json', 'utf8'));
  const detail = JSON.parse(
    fs.readFileSync('data/site/records/inmetro/inmetro-169-2023.json', 'utf8'),
  );
  const downloads = [];
  const requests = [];
  const status = {};
  class DownloadUrl extends URL {
    static createObjectURL(blob) {
      downloads.push(blob);
      return 'blob:export';
    }
  }
  const context = vm.createContext({
    canonicalCatalogRecords,
    URLSearchParams,
    URL: DownloadUrl,
    Blob,
    TextDecoder,
    crypto: require('node:crypto').webcrypto,
    location: { href: 'https://example.test/#inmetro?q=PBE+Veicular' },
    document: { addEventListener() {}, createElement: () => ({ click() {} }) },
    $: () => status,
    norm: (text) => String(text || '').toLowerCase(),
    setTimeout() {},
    async fetch(url) {
      requests.push(String(url));
      if (String(url).endsWith('data/inmetro/active.json'))
        return { ok: true, arrayBuffer: async () => Uint8Array.from(source).buffer };
      if (url === 'data/site/index.json') return { ok: true, json: async () => index };
      if (url === 'data/site/records/inmetro/inmetro-169-2023.json')
        return { ok: true, json: async () => detail };
      throw new Error('Unexpected source: ' + url);
    },
  });
  for (const file of ['src/regulations/store.js', 'src/views/regulations.js'])
    vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  await context.loadRegulations('inmetro');
  assert.equal(
    vm.runInContext(
      'regulatoryData.inmetro.records.find(r=>r.id==="inmetro-169-2023")._summary',
      context,
    ),
    true,
  );
  const expected = ['inmetro-169-2023:req:01', 'inmetro-169-2023:req:02'];
  for (const phase of ['compact', 'detail']) {
    if (phase === 'detail') await context.loadRegulationRecord('inmetro', detail.id);
    for (const format of ['csv', 'json', 'csv']) {
      const button = { disabled: false };
      await context.exportRegulatoryQuery('inmetro', 'q=PBE Veicular', format, button);
      const body = await downloads.at(-1).text();
      const records = format === 'csv' ? parseExportCsv(body) : JSON.parse(body).records;
      assert.deepEqual(
        records.map((record) => record.id),
        [detail.id],
        phase + '/' + format,
      );
      assert.deepEqual(
        format === 'csv' ? JSON.parse(records[0].requirementIds) : records[0].requirementIds,
        expected,
        phase + '/' + format,
      );
      assert.equal(button.disabled, false);
      assert.equal(status.textContent, '1 referências exportadas.');
    }
  }
  assert.equal(
    vm.runInContext(
      'regulatoryData.inmetro.records.find(r=>r.id==="inmetro-169-2023")._summary',
      context,
    ),
    false,
  );
  assert.equal(requests.filter((url) => url.endsWith('data/inmetro/active.json')).length, 6);
  assert.equal(requests.filter((url) => url.endsWith('/inmetro-169-2023.json')).length, 1);
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
