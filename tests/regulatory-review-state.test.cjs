'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  needsRegulatoryReview,
  recordCheckReview,
  REGULATORY_REVISION,
} = require('../src/guide/review-state.js');
const { exportProcessMarkdown, DEFAULT_PROFILE } = require('../src/guide/process-model.js');

test('legacy conclusions and changed snapshots require review without discarding evidence', () => {
  const previous = { status: 'done', evidence: 'Relatório R2', note: 'Conferência anterior' };
  assert.equal(needsRegulatoryReview(previous), true);
  assert.equal(needsRegulatoryReview({ ...previous, status: 'na' }), true);
  const edited = recordCheckReview(previous, {
    ...previous,
    note: 'Mais uma nota',
    regulatoryRevision: REGULATORY_REVISION,
  });
  assert.equal(needsRegulatoryReview(edited), true);
  assert.equal(edited.evidence, 'Relatório R2');
  assert.equal(edited.regulatoryRevision, undefined);
  const reviewed = recordCheckReview(previous, previous, true);
  assert.equal(needsRegulatoryReview(reviewed), false);
  assert.equal(reviewed.evidence, previous.evidence);
  assert.ok(Number.isFinite(Date.parse(reviewed.regulatoryReviewedAt)));
  assert.equal(needsRegulatoryReview(reviewed, '0'.repeat(64)), true);
});

test('Markdown distinguishes an older conclusion from a current completed task', () => {
  const old = { status: 'done', evidence: 'Relatório preservado' };
  const stale = exportProcessMarkdown({ profile: DEFAULT_PROFILE, checks: { profile: old } });
  assert.match(stale, /Concluído pelo usuário — base anterior; revalidar/);
  assert.match(stale, /Relatório preservado/);
  const current = exportProcessMarkdown({
    profile: DEFAULT_PROFILE,
    checks: { profile: recordCheckReview(old, old, true) },
  });
  assert.match(current, /\[x\] Concluído pelo usuário/);
  assert.ok(current.includes(REGULATORY_REVISION));
});
