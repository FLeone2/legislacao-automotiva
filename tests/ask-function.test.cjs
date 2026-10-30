'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, '../functions/api/ask.js')).href);
const post = (body, headers = {}) =>
  new Request('https://example.pages.dev/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const passage = { title: 'IN IBAMA 6/2025', kind: 'Trecho do ato', agency: 'ibama', text: 'LCVM' };
const question = 'Quem emite a LCVM?';

test('reports availability without exposing configuration', async () => {
  const { onRequestGet } = await load();
  const off = await onRequestGet({ env: {} }).json();
  assert.equal(off.available, false);
  assert.deepEqual(off.providers, []);
  const on = await onRequestGet({ env: { AI: {} } }).json();
  assert.equal(on.available, true);
  assert.match(on.model, /^@cf\//);
});

test('rejects other origins, missing binding and invalid questions', async () => {
  const { onRequestPost } = await load();
  const env = { AI: { run: async () => ({ response: 'x' }) } };
  const status = async (request, environment = env) =>
    (await onRequestPost({ request, env: environment })).status;
  const foreign = post({ question, passages: [passage] }, { origin: 'https://evil.example' });
  assert.equal(await status(foreign), 403);
  assert.equal(await status(post({}), {}), 503);
  assert.equal(await status(post('{')), 400);
  assert.equal(await status(post({ question: 'a', passages: [passage] })), 400);
  assert.equal(await status(post({ question, passages: [] })), 422);
});

test('sends only numbered passages as data and maps the daily limit', async () => {
  const { onRequestPost } = await load();
  let seen;
  const env = {
    AI: {
      run: async (model, input) => {
        seen = { model, input };
        return { response: 'A LCVM é do IBAMA [1].' };
      },
    },
  };
  const many = Array.from({ length: 12 }, (_, i) => ({ ...passage, title: `Ato ${i}` }));
  const response = await onRequestPost({ request: post({ question, passages: many }), env });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).answer, 'A LCVM é do IBAMA [1].');
  const user = seen.input.messages[1].content;
  assert.match(user, /\[8\] Ato 7/);
  assert.doesNotMatch(user, /\[9\]/);
  assert.match(seen.input.messages[0].content, /não instruções/);
  const limited = { AI: { run: async () => Promise.reject(new Error('4006: daily allocation')) } };
  const quota = await onRequestPost({
    request: post({ question, passages: [passage] }),
    env: limited,
  });
  assert.equal(quota.status, 429);
});

test('uses Gemini when its secret exists and falls back on quota', async () => {
  const { onRequestGet, onRequestPost } = await load();
  const env = {
    GEMINI_API_KEY: 'test-key',
    AI: { run: async () => ({ response: 'Resposta do Workers AI [1].' }) },
  };
  const listed = await onRequestGet({ env }).json();
  assert.deepEqual(
    listed.providers.map((p) => p.id),
    ['gemini', 'workers'],
  );
  assert.equal(JSON.stringify(listed).includes('test-key'), false);
  const original = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Do Gemini [1].' }] } }] }),
        { status: 200 },
      );
    };
    const ok = await onRequestPost({
      request: post({ question, passages: [passage], provider: 'gemini' }),
      env,
    });
    const data = await ok.json();
    assert.equal(data.answer, 'Do Gemini [1].');
    assert.equal(data.provider, 'gemini');
    assert.match(calls[0].url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-/);
    assert.equal(calls[0].init.headers['x-goog-api-key'], 'test-key');
    globalThis.fetch = async () => new Response('{}', { status: 429 });
    const fallback = await (
      await onRequestPost({ request: post({ question, passages: [passage] }), env })
    ).json();
    assert.equal(fallback.provider, 'workers');
    assert.equal(fallback.fallback, true);
  } finally {
    globalThis.fetch = original;
  }
});
