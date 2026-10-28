'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPortalContext } = require('../src/core/portal-context.js');

function runtime(seed = {}) {
  const data = new Map(Object.entries(seed));
  const listeners = {};
  return {
    data,
    listeners,
    localStorage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    },
    addEventListener: (name, listener) => (listeners[name] = listener),
  };
}

test('project context survives consultation routes and explicit demo clears only its preference', () => {
  const raw = '[{"id":"one","checks":{"saved":"evidence"}}]';
  const env = runtime({ 'homologation-projects-v1': raw });
  const context = createPortalContext(env);
  context.rememberRoute('#guide?project=second&tab=checklist');
  context.rememberRoute('#library?component=freios');
  assert.equal(context.activeProjectId(), 'second');
  const link = new URLSearchParams(
    context.guideRoute({ tab: 'flow', stage: 'seguranca' }).split('?')[1],
  );
  assert.equal(link.get('project'), 'second');
  assert.equal(link.get('stage'), 'seguranca');
  context.rememberRoute('#guide?project=demo');
  assert.equal(context.activeProjectId(), '');
  assert.equal(context.guideRoute(), '#guide');
  assert.equal(env.data.get('homologation-projects-v1'), raw);
});

test('saved projects never silently select the first profile for other consultation tabs', () => {
  const context = createPortalContext(
    runtime({
      'homologation-projects-v1': JSON.stringify([{ id: 'first' }, { id: 'second' }]),
    }),
  );
  assert.equal(context.activeProjectId(), '');
  assert.equal(context.guideRoute({ profile: 'new' }), '#guide?profile=new');
});

test('guide links encode identifiers, preserve explicit targets and exclude unrelated filters', () => {
  const context = createPortalContext(runtime());
  context.setActiveProjectId('process & project=other');
  const query = new URLSearchParams(
    context.guideRoute({ tab: 'sources', agency: 'IBAMA' }).split('?')[1],
  );
  assert.equal(query.get('project'), 'process & project=other');
  assert.equal(query.has('agency'), false);
  const explicit = new URLSearchParams(
    context.guideRoute({ project: 'demo', tab: 'explore' }).split('?')[1],
  );
  assert.equal(explicit.get('project'), 'demo');
  assert.equal(context.activeProjectId(), 'process & project=other');
});

test('blocked storage cannot break navigation or require overwriting recovery data', () => {
  const env = {};
  Object.defineProperty(env, 'localStorage', {
    get() {
      throw new Error('blocked');
    },
  });
  const context = createPortalContext(env);
  assert.doesNotThrow(() => context.rememberRoute('#guide?project=unknown'));
  assert.equal(context.activeProjectId(), 'unknown');
  assert.equal(context.guideRoute({ tab: 'checklist' }), '#guide?tab=checklist&project=unknown');
  assert.doesNotThrow(() => context.renderBar('library'));
});

test('missing, corrupt or excessive project records are never modified by context navigation', () => {
  const env = runtime({
    'homologation-active-project-v1': 'unavailable',
    'homologation-projects-v1': '{unreadable backup',
  });
  const context = createPortalContext(env);
  assert.equal(context.activeProjectId(), 'unavailable');
  context.rememberRoute('#flow?stage=seguranca');
  assert.equal(env.data.get('homologation-projects-v1'), '{unreadable backup');
  context.setActiveProjectId('x'.repeat(101));
  assert.equal(context.activeProjectId(), '');
});

test('cross-tab preference updates retain project records and notify shared consumers', () => {
  const events = [];
  const env = runtime();
  env.CustomEvent = class {
    constructor(type, options) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  env.dispatchEvent = (event) => events.push(event);
  const context = createPortalContext(env);
  env.data.set('homologation-active-project-v1', 'other-tab');
  env.listeners.storage({ key: 'homologation-active-project-v1' });
  assert.equal(context.activeProjectId(), 'other-tab');
  assert.equal(events.at(-1).type, 'portal:project-change');
  assert.equal(events.at(-1).detail.projectId, 'other-tab');
});
