const test = require('node:test');
const assert = require('node:assert/strict');
const { regulatoryMilestoneState } = require('../src/regulations/status.js');

test('conditional milestone crosses its date without declaring legal status', () => {
  const milestone = { date: '2026-10-23', scope: { conditions: ['Affected tire category'] } };
  assert.deepEqual(regulatoryMilestoneState(milestone, '2026-10-22'), {
    days: 1,
    state: 'upcoming',
    label: 'Em 1 dia',
  });
  assert.deepEqual(regulatoryMilestoneState(milestone, '2026-10-23'), {
    days: 0,
    state: 'today',
    label: 'Hoje',
  });
  assert.deepEqual(regulatoryMilestoneState(milestone, '2026-10-24'), {
    days: -1,
    state: 'past',
    label: 'Data passada',
  });
  assert.equal(milestone.scope.conditions[0], 'Affected tire category');
  assert.equal(milestone.legalStatus, undefined);
});

test('calendar dates work across years and the thirty-day boundary', () => {
  assert.equal(regulatoryMilestoneState({ date: '2027-01-01' }, '2026-12-31').days, 1);
  assert.equal(regulatoryMilestoneState({ date: '2027-01-01' }, '2026-12-02').state, 'upcoming');
  assert.equal(regulatoryMilestoneState({ date: '2027-01-01' }, '2026-12-01').state, 'future');
});

test('invalid or absent dates are not presented as a milestone', () => {
  for (const date of [undefined, '', '2026-02-30', '23/10/2026', '2026-13-01'])
    assert.equal(regulatoryMilestoneState({ date }, '2026-10-19'), null);
  assert.equal(regulatoryMilestoneState({ date: '2026-10-23' }, 'invalid'), null);
  assert.equal(regulatoryMilestoneState({ date: '2026-10-23' }, '2026-02-30'), null);
});
