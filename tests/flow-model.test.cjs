const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs');
const {
  homologationFlowSpec: spec,
  HomologationFlow: flow,
  homologationSourceOverrides: overrides,
} = require('../flow-data.js');
const base = require('../catalog.json'),
  sources = ['contran', 'proconve', 'inmetro', 'anatel'].flatMap(
    (s) => JSON.parse(fs.readFileSync(`data/${s}/active.json`)).records,
  );
const available = new Set(sources.map((r) => r.id)),
  original = new Set(base.records.map((r) => r.id));
test('all stages, activities and dependency targets use stable, unique IDs', () => {
  assert.equal(spec.stages.length, 12);
  assert.equal(new Set(spec.stages.map((s) => s.id)).size, 12);
  for (const s of spec.stages) {
    assert(s.outputs.length);
    assert(s.purpose);
    assert.equal(new Set(s.activities.map((a) => a.id)).size, s.activities.length);
    for (const a of s.activities) {
      for (const id of a.refs || []) assert(available.has(id), id);
      for (const id of a.recordIds || []) assert(original.has(id), id);
    }
  }
  for (const [a, b] of spec.edges) {
    assert(flow.stage(a));
    assert(flow.stage(b));
  }
});
test('parallel branches converge before CAT and COP has feedback', () => {
  for (const id of ['coastdown', 'seguranca', 'componentes'])
    assert(spec.edges.some((e) => e[0] === 'preparacao' && e[1] === id && e[2] === 'parallel'));
  assert(spec.edges.some((e) => e[0] === 'dossie' && e[1] === 'cat'));
  assert(spec.edges.some((e) => e[0] === 'cop' && e[1] === 'construcao' && e[2] === 'feedback'));
  assert(spec.edges.some((e) => e[0] === 'cop' && e[1] === 'dossie' && e[2] === 'feedback'));
});
test('BEV view excludes combustion/LCVM/OBD activities and preserves electric energy', () => {
  assert.deepEqual(
    flow.activities(flow.stage('aprovacoes'), 'eletrico').map((a) => a.id),
    ['eficiencia'],
  );
  assert(
    !flow
      .activities(flow.stage('laboratorio'), 'eletrico')
      .some((a) => ['combustao', 'hibrido', 'evaporativas'].includes(a.id)),
  );
  assert(flow.activities(flow.stage('laboratorio'), 'eletrico').some((a) => a.id === 'eletrico'));
  assert(!flow.activities(flow.stage('cop'), 'eletrico').some((a) => a.id === 'acp'));
});
test('exact reference join has no thematic fallback and deduplicates canonical acts', () => {
  const a = { refs: ['abc'] },
    rows = [
      { id: 'one', regulatoryId: 'abc' },
      { id: 'two', regulatoryId: 'abc' },
      { id: 'unrelated', regulatoryId: 'def' },
    ];
  assert.equal(flow.references(a, rows).length, 1);
  assert.deepEqual(flow.references({ refs: ['missing'] }, rows), []);
  const coast = flow.stage('coastdown').activities[0];
  assert.deepEqual(
    flow
      .references(
        coast,
        [
          { id: 'pbe', regulatoryId: 'inmetro-169-2023' },
          { id: 'in', regulatoryId: 'ibama-in-11-2014' },
        ],
        'eletrico',
      )
      .map((r) => r.id),
    ['pbe'],
  );
});
test('preparation, technical methods and COP preserve scope and open gaps', () => {
  assert.notEqual(flow.stage('preparacao'), flow.stage('coastdown'));
  assert(flow.stage('preparacao').activities.find((a) => a.id === 'amaciamento').gaps.length);
  assert.match(
    flow.stage('preparacao').activities.find((a) => a.id === 'obd').text,
    /contexto do ensaio OBD/,
  );
  assert.match(
    flow.stage('cop').activities.find((a) => a.id === 'uso').text,
    /não foram apresentados como o mesmo/,
  );
  assert.match(
    flow.stage('cop').activities.find((a) => a.id === 'acp').text,
    /não foi convertida em ACP universal/,
  );
});
test('CAT uses the directly inspected official PDF without claiming consolidated validity', () => {
  assert.match(overrides['senatran-095'].officialUrl, /gov.br.*Portaria9902022R.pdf$/);
  assert.match(
    overrides['senatran-095'].uncertaintyNotes.join(' '),
    /Não certifica a cadeia integral/,
  );
});
