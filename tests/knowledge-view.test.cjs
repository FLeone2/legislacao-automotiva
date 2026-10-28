'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { RegulatoryKnowledge: knowledge } = require('../src/views/knowledge.js');
const index = JSON.parse(fs.readFileSync('data/process/knowledge-index.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('knowledge/manifest.json', 'utf8'));
const candidates = fs
  .readFileSync('knowledge/candidates.jsonl', 'utf8')
  .trim()
  .split('\n')
  .map(JSON.parse);
const rows = knowledge.rows(index, candidates);

function environment(fetch) {
  const context = vm.createContext({ URLSearchParams, fetch });
  vm.runInContext(fs.readFileSync('src/core/dom.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('src/views/knowledge.js', 'utf8'), context);
  return context;
}

test('all public cards resolve only to manifest-listed Markdown with the expected content hash', () => {
  assert.equal(
    rows.length,
    manifest.counts.acts + manifest.counts.sourceCards + manifest.counts.candidates,
  );
  for (const row of rows) {
    const path = knowledge.markdownPath(row, row.kind, manifest);
    assert.ok(path, row.id);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
    assert.equal(hash, manifest.artifacts[path.replace(/^knowledge\//, '')]);
  }
  for (const id of ['../README', 'https://outside.test', '<script>', 'constructor', '__proto__'])
    assert.equal(knowledge.markdownPath({ id }, 'acts', manifest), '');
  assert.equal(knowledge.markdownPath({ id: 'valid-id' }, 'acts', { artifacts: {} }), '');
});

test('candidate and excluded act states survive search without being promoted or written back', () => {
  const before = JSON.stringify({ index, candidates });
  const decisions = JSON.parse(fs.readFileSync('data/contran/publication-decisions.json', 'utf8'));
  const excluded = decisions.decisions.filter((row) => row.active === false);
  assert.ok(excluded.length >= 55);
  const ids = new Set(rows.filter((row) => row.kind === 'acts').map((row) => row.id));
  assert.ok(excluded.every((row) => !ids.has(row.id)));
  assert.ok(rows.some((row) => row.kind === 'acts' && row.publication === null));
  assert.equal(knowledge.filter(rows, { kind: 'candidates' }).length, manifest.counts.candidates);
  assert.ok(
    knowledge.filter(rows, { kind: 'acts', agency: 'CONTRAN' }).every((row) => row.kind === 'acts'),
  );
  assert.ok(
    knowledge
      .filter(rows, { kind: 'candidates' })
      .every((row) => row.publication.included === false),
  );
  assert.equal(JSON.stringify({ index, candidates }), before);
});

test('search is case and accent insensitive and source scope is searchable independently of act titles', () => {
  const expected = rows.find((row) => row.kind === 'sources' && row.id === 'conama-490-2018');
  assert.ok(
    knowledge
      .filter(rows, { kind: 'sources', q: 'justificativa/autorizacao' })
      .some((row) => row.id === expected.id),
  );
  assert.ok(
    knowledge
      .filter(rows, { kind: 'acts', q: 'CONAMA 492' })
      .some((row) => row.id === 'conama-492-2018'),
  );
  const selected = knowledge.filter(rows, {
    kind: 'acts',
    agency: 'ANATEL',
    review: 'directed_text_review',
  });
  assert.ok(selected.length);
  assert.ok(
    selected.every(
      (row) => row.agency === 'anatel' && row.reviewStatus.state === 'directed_text_review',
    ),
  );
  assert.equal(knowledge.filter(rows, { q: 'no-such-regulatory-card' }).length, 0);
});

test('permalinks encode terms and normalize invalid pagination without changing technical project data', () => {
  const values = {
    q: 'emissões & projeto=outro',
    kind: 'sources',
    agency: 'CONAMA / IBAMA',
    page: 2,
  };
  const route = knowledge.route(values);
  const query = new URLSearchParams(route.split('?')[1]);
  assert.equal(query.get('q'), values.q);
  assert.equal(query.has('projeto'), false);
  assert.equal(knowledge.values('page=Infinity').page, 1);
  assert.equal(knowledge.values('page=-4&kind=constructor').page, 1);
  assert.equal(knowledge.values('page=-4&kind=constructor').kind, '');
  assert.equal(knowledge.values('page=2.9').page, 2);
});

test('card rendering escapes source text and keeps source evidence separate from legal review', () => {
  const context = environment();
  context.manifestFixture = manifest;
  context.record = {
    ...rows.find((row) => row.kind === 'sources' && row.evidenceType === 'official_original_text'),
    title: '<img src=x onerror=alert(1)>',
    scope: '<script>untrusted text</script>',
    url: 'javascript:alert(1)',
  };
  const html = vm.runInContext('knowledgeRecordCard(record, manifestFixture)', context);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|<script|href="javascript:/);
  assert.match(html, /Tipo de evidência/);
  assert.match(html, /Texto oficial de origem/);
  assert.match(html, /O tipo de fonte não determina vigência/);
  assert.doesNotMatch(html, /Revisão dirigida de trechos/);
  context.record = rows.find((row) => row.kind === 'acts' && row.publication === null);
  const unknownPublication = vm.runInContext(
    'knowledgeRecordCard(record, manifestFixture)',
    context,
  );
  assert.match(unknownPublication, /Condição editorial de publicação não informada/);
  assert.doesNotMatch(unknownPublication, /Excluído da consulta ativa/);
  context.record = rows.find((row) => row.kind === 'candidates');
  const candidate = vm.runInContext('knowledgeRecordCard(record, manifestFixture)', context);
  assert.match(candidate, /fora do catálogo ativo/);
  assert.doesNotMatch(candidate, /Consultar na biblioteca/);
});

test('lazy loader deduplicates concurrent requests and offers a clean retry after a failed fetch', async () => {
  const requests = [];
  let fail = true;
  const context = environment(async (url) => {
    requests.push(url);
    if (fail && url === 'knowledge/manifest.json') return { ok: false };
    const value = url === 'knowledge/manifest.json' ? manifest : index;
    return {
      ok: true,
      json: async () => value,
      text: async () => candidates.map((row) => JSON.stringify(row)).join('\n'),
    };
  });
  await assert.rejects(vm.runInContext('loadRegulatoryKnowledge()', context));
  fail = false;
  const [one, two] = await Promise.all([
    vm.runInContext('loadRegulatoryKnowledge()', context),
    vm.runInContext('loadRegulatoryKnowledge()', context),
  ]);
  assert.strictEqual(one, two);
  assert.equal(one.rows.length, rows.length);
  assert.equal(requests.length, 6);
  assert.ok(
    requests.every((url) => !url.includes('records.jsonl') && !url.includes('relations.jsonl')),
  );
});
