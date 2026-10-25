'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProject, loadProjects, saveProjects } = require('../src/guide/storage.js');
const { DEFAULT_PROFILE } = require('../src/guide/process-model.js');
const KEY = 'homologation-projects-v1';
const project = () => ({
  schemaVersion: 1,
  id: 'project-a',
  profile: { ...DEFAULT_PROFILE, name: 'Plano de homologação' },
  checks: { profile: { status: 'done', note: 'Evidência revisada', evidence: 'REL-001' } },
});
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('backup round trip preserves evidence and justified non-applicability', () => {
  const storage = memoryStorage();
  const value = project();
  value.checks.example = { status: 'na', note: 'Configuração sem motor térmico' };
  assert.equal(saveProjects(storage, [value]), null);
  assert.deepEqual(loadProjects(storage), { projects: [value], error: null, raw: null });
});

test('invalid imports do not silently accept missing schema, technical data or unjustified exclusions', () => {
  for (const value of [
    { ...project(), schemaVersion: 2 },
    { ...project(), profile: { name: 'Sem perfil técnico' } },
    { ...project(), profile: { ...project().profile, massKg: '1800' } },
    { ...project(), checks: [] },
    { ...project(), checks: { x: { status: 'approved' } } },
    { ...project(), checks: { x: { status: 'na', note: ' ' } } },
    { ...project(), checks: { x: { status: 'pending', note: 0 } } },
    { ...project(), checks: { x: { status: 'pending', evidence: {} } } },
    { ...project(), checks: { x: { status: 'pending', evidence: null } } },
    { ...project(), profileHistory: {} },
    { ...project(), profileHistory: [{ profile: { name: 'Histórico sem dados técnicos' } }] },
  ]) {
    assert.throws(() => validateProject(value));
  }
});

test('blocked or corrupt local storage gives a recoverable error and preserves original bytes', () => {
  const blocked = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.equal(loadProjects(blocked).projects.length, 0);
  assert.ok(loadProjects(blocked).error);
  assert.match(saveProjects(blocked, [project()]), /Exporte o JSON/);
  const corrupted = memoryStorage({ [KEY]: '{broken' });
  assert.equal(loadProjects(corrupted).raw, '{broken');
  assert.equal(saveProjects(corrupted, [project()]), null);
  assert.equal(corrupted.getItem(KEY + '-recovery'), '{broken');
  assert.deepEqual(loadProjects(corrupted).projects, [project()]);
});

test('existing recovery data or a failed backup cannot erase unreadable current data', () => {
  const storage = memoryStorage({ [KEY]: '{new-broken', [KEY + '-recovery']: '{old-broken' });
  assert.match(saveProjects(storage, [project()]), /recuperação anteriores/);
  assert.equal(storage.getItem(KEY), '{new-broken');
  assert.equal(storage.getItem(KEY + '-recovery'), '{old-broken');
  const failedBackup = memoryStorage({ [KEY]: '{quota-broken' });
  failedBackup.setItem = () => {
    throw new Error('quota');
  };
  assert.match(saveProjects(failedBackup, [project()]), /não permitiu salvar/);
  assert.equal(failedBackup.getItem(KEY), '{quota-broken');
});
