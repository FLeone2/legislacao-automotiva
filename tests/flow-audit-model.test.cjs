const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { homologationFlowSpec: spec, HomologationFlow: flow } = require('../flow-data.js');
const catalog = require('../catalog.json');
const mover = require('../data/mover/reviewed-map.json');

const activity = (stage, id) => flow.stage(stage).activities.find((item) => item.id === id);

test('ICE, HEV and PHEV share the thermal consultation without inheriting each other preparation', () => {
  const stage = flow.stage('laboratorio');
  const refs = [
    { id: 'l8', regulatoryId: 'conama-492-2018' },
    { id: 'p8', regulatoryId: 'conama-490-2018' },
    { id: 'nmog', regulatoryId: 'ibama-in-22-2020' },
    { id: 'obd', regulatoryId: 'ibama-in-23-2020' },
    { id: 'hybrid', regulatoryId: 'ibama-in-3-2023' },
  ];
  for (const profile of ['combustao', 'hibrido', 'hev', 'phev']) {
    assert(flow.activities(stage, profile).some((a) => a.id === 'combustao'));
    assert(
      flow
        .references(activity('laboratorio', 'combustao'), refs, profile)
        .some((r) => r.id === 'obd'),
    );
  }
  const hev = flow.activities(stage, 'hev').map((a) => a.id);
  const phev = flow.activities(stage, 'phev').map((a) => a.id);
  assert(hev.includes('hev') && !hev.includes('phev'));
  assert(phev.includes('phev') && !phev.includes('hev'));
  assert(flow.activities(stage, 'hibrido').some((a) => a.id === 'hev'));
  assert(flow.activities(stage, 'hibrido').some((a) => a.id === 'phev'));
  const bev = flow.activities(stage, 'eletrico').map((a) => a.id);
  for (const id of ['combustao', 'hibrido', 'hev', 'phev', 'evaporativas', 'rde', 'durabilidade'])
    assert(!bev.includes(id), id);
  assert(bev.includes('eletrico'));
  const coast = activity('coastdown', 'metodo');
  assert(
    flow.references(coast, [{ id: 'autonomia', regulatoryId: 'ibama-in-11-2014' }], 'hev').length,
  );
  assert(
    !flow.references(coast, [{ id: 'autonomia', regulatoryId: 'ibama-in-11-2014' }], 'eletrico')
      .length,
  );
});

test('consultative subjects are reachable with explicit L8/P8 and method limitations', () => {
  for (const id of ['rde', 'ruido', 'durabilidade']) {
    const item = activity('laboratorio', id);
    assert(item.refs.length && item.gaps.length);
  }
  assert.match(activity('laboratorio', 'rde').text, /leves.*P8/i);
  assert.match(activity('laboratorio', 'durabilidade').text, /escapamento.*evaporativas.*Ki.*ISC/);
  assert(!activity('aprovacoes', 'corporativo').vehicleComponent);
  assert(activity('aprovacoes', 'corporativo').refs.includes('ibama-in-23-2022'));
  assert(activity('aprovacoes', 'corporativo').refs.includes('ibama-in-28-2023'));
  assert.match(activity('cat', 'cct').text, /sem SGQ.*CCT.*Não é exigência universal/s);
  assert(
    activity('cat', 'cct').officialLinks.every((link) =>
      link.url.startsWith('https://www.gov.br/'),
    ),
  );
  assert(activity('seguranca', 'equipamentos').refs.includes('contran-993-2023'));
  assert.equal(spec.stages.length, 12);
});

test('PBEV, MOVER and ACP stay distinct vehicle/company processes', () => {
  const efficiency = activity('aprovacoes', 'eficiencia');
  assert(efficiency.refs.includes('inmetro-169-2023'));
  assert(efficiency.recordIds.includes('mover-007'));
  assert.match(efficiency.relation, /voluntária/);
  assert.match(efficiency.gaps.join(' '), /ENCE.*pneus.*VIN.*ETA/);
  assert(!efficiency.vehicleComponent);
  const acp = activity('cop', 'acp');
  assert(acp.refs.includes('ibama-in-5-2024'));
  assert(acp.refs.includes('inmetro-169-2023'));
  assert.match(acp.text, /não foi convertida em ACP universal/);
  assert(!flow.activities(flow.stage('cop'), 'eletrico').some((a) => a.id === 'acp'));
});

test('MOVER successor has exact source evidence while 43 remains historical and unselected', () => {
  const old = catalog.records.find((r) => r.id === 'mover-009');
  const successor = catalog.records.find((r) => r.id === 'mover-014');
  assert.equal(old.publication.included, false);
  assert.equal(old.legalStatus.state, 'revoked');
  assert.equal(old.replacedBy.id, successor.id);
  assert.equal(successor.publication.included, true);
  assert.equal(successor.reviewStatus.fullTextReviewed, false);
  assert.equal(successor.reviewStatus.amendmentChainReviewed, false);
  assert.match(successor.summary, /43\/2024/);
  const effects = mover.effects.find((effect) => effect.targetId === old.id);
  assert.equal(effects.effectiveDate, null);
  assert.equal(effects.device, null);
  const source = mover.sources[0];
  const archived = fs.readFileSync(source.archivePath);
  assert.equal(crypto.createHash('sha256').update(archived).digest('hex'), source.sha256);
  assert(archived.toString().includes('694449850'));
  assert.match(source.excerpt, /68.*Revoga.*43/);
  assert.equal(flow.references({ recordIds: ['mover-009'] }, catalog.records).length, 0);
  assert.deepEqual(
    flow.references(activity('aprovacoes', 'mover'), catalog.records).map((r) => r.id),
    ['mover-001', 'mover-002', 'mover-007', 'mover-014'],
  );
  const ids = JSON.stringify(catalog.metadata.moverTree);
  assert(!ids.includes('"mover-009"'));
  assert(ids.includes('"mover-014"'));
});

test('reference resolution accepts canonical aliases without publishing excluded histories', () => {
  const records = [
    { id: 'canonical', aliases: ['legacy'], publication: { included: true } },
    { id: 'old', publication: { included: false } },
  ];
  assert.deepEqual(
    flow.references({ recordIds: ['legacy', 'old'] }, records).map((r) => r.id),
    ['canonical'],
  );
});
