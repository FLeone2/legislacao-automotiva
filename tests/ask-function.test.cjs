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

test('Gemini searches Google, returns web sources apart and answers without passages', async () => {
  const { onRequestGet, onRequestPost } = await load();
  const env = {
    GEMINI_API_KEY: 'test-key',
    GEMINI_WEB_SEARCH: 'on',
    AI: { run: async () => ({ response: 'Workers [1].' }) },
  };
  const listed = await onRequestGet({ env }).json();
  assert.equal(listed.providers[0].web, true);
  const original = globalThis.fetch;
  let sent;
  try {
    globalThis.fetch = async (url, init) => {
      sent = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: 'TPMS integra o Grupo B (internet).' }] },
              groundingMetadata: {
                webSearchQueries: ['TPMS MOVER grupo B'],
                groundingChunks: [
                  { web: { uri: 'https://www.gov.br/mdic/mover', title: 'gov.br' } },
                  { web: { uri: 'https://www.gov.br/mdic/mover', title: 'duplicado' } },
                  { web: { uri: 'javascript:alert(1)', title: 'x' } },
                ],
                searchEntryPoint: { renderedContent: '<div>chips</div>' },
              },
            },
          ],
        }),
        { status: 200 },
      );
    };
    const data = await (
      await onRequestPost({ request: post({ question: 'TPMS no MOVER?', passages: [] }), env })
    ).json();
    assert.deepEqual(sent.tools, [{ google_search: {} }]);
    assert.match(sent.contents[0].parts[0].text, /Nenhum trecho do acervo/);
    assert.match(sent.systemInstruction.parts[0].text, /\(internet\)/);
    assert.equal(data.provider, 'gemini');
    assert.deepEqual(data.web.sources, [{ uri: 'https://www.gov.br/mdic/mover', title: 'gov.br' }]);
    assert.deepEqual(data.web.queries, ['TPMS MOVER grupo B']);
    assert.equal(data.web.suggestions, '<div>chips</div>');

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400 });

    const fallback = await (
      await onRequestPost({ request: post({ question, passages: [passage] }), env })
    ).json();
    assert.equal(fallback.provider, 'workers');
    assert.match(
      fallback.fallbackReason,
      /Gemini \(gemini-3\.5-flash-lite\): erro 400 \(API key not valid\)/,
    );
    const noPassages = await onRequestPost({
      request: post({ question, passages: [] }),
      env,
    });
    assert.equal(noPassages.status, 502);
  } finally {
    globalThis.fetch = original;
  }
  const workersOnly = await onRequestPost({
    request: post({ question, passages: [] }),
    env: { AI: env.AI },
  });
  assert.equal(workersOnly.status, 422);
});

test('a retired Gemini model falls back to the next free Flash model', async () => {
  const { onRequestPost } = await load();
  const env = {
    GEMINI_API_KEY: 'k',
    GEMINI_MODEL: 'gemini-2.5-flash',
    AI: { run: async () => ({}) },
  };
  const original = globalThis.fetch;
  const urls = [];
  const bodies = [];
  try {
    globalThis.fetch = async (url, init) => {
      urls.push(url);
      bodies.push(JSON.parse(init.body));
      if (url.includes('gemini-2.5-flash'))
        return new Response(JSON.stringify({ error: { message: 'no longer available' } }), {
          status: 404,
        });
      const parts = [{ text: 'pensando', thought: true }, { text: 'Resposta [1].' }];
      return new Response(JSON.stringify({ candidates: [{ content: { parts } }] }), {
        status: 200,
      });
    };
    const data = await (
      await onRequestPost({ request: post({ question, passages: [passage] }), env })
    ).json();
    assert.equal(data.answer, 'Resposta [1].');
    assert.equal(data.model, 'gemini-3.6-flash');
    assert.equal(data.fallback, false);
    assert.equal(bodies[0].tools, undefined);
    assert.match(urls[1], /models\/gemini-3\.6-flash:generateContent/);
    assert.deepEqual(bodies[0].generationConfig.thinkingConfig, { thinkingBudget: 0 });
    assert.deepEqual(bodies[1].generationConfig.thinkingConfig, { thinkingLevel: 'low' });
  } finally {
    globalThis.fetch = original;
  }
});

test('with search on but refused, Gemini answers from the passages', async () => {
  const { onRequestPost } = await load();
  const env = {
    GEMINI_API_KEY: 'k',
    GEMINI_WEB_SEARCH: 'on',
    AI: { run: async () => ({ response: 'Workers [1].' }) },
  };
  const original = globalThis.fetch;
  const bodies = [];
  try {
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      bodies.push(body);
      if (body.tools)
        return new Response(JSON.stringify({ error: { message: 'You exceeded your quota' } }), {
          status: 429,
        });
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Do acervo [1].' }] } }] }),
        { status: 200 },
      );
    };
    const data = await (
      await onRequestPost({ request: post({ question, passages: [passage] }), env })
    ).json();
    assert.equal(data.provider, 'gemini');
    assert.equal(data.answer, 'Do acervo [1].');
    assert.match(data.webUnavailable, /limite atingido/);
    assert.equal(bodies.length, 5);
    assert.equal(bodies[4].tools, undefined);
    assert.match(bodies[4].systemInstruction.parts[0].text, /Use SOMENTE os trechos/);

    const empty = await onRequestPost({ request: post({ question, passages: [] }), env });
    assert.equal(empty.status, 502);
    assert.match((await empty.json()).error, /não está disponível na chave gratuita/);
  } finally {
    globalThis.fetch = original;
  }
});

test('overloaded or rate-limited Gemini models are skipped before Workers AI', async () => {
  const { onRequestPost } = await load();
  const env = { GEMINI_API_KEY: 'k', AI: { run: async () => ({ response: 'Workers [1].' }) } };
  const original = globalThis.fetch;
  const tried = [];
  try {
    globalThis.fetch = async (url) => {
      const model = url.match(/models\/([^:]+):/)[1];
      tried.push(model);
      if (model !== 'gemini-3.8-flash')
        return new Response(JSON.stringify({ error: { message: 'busy' } }), {
          status: model === 'gemini-3.5-flash-lite' ? 524 : 429,
        });
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Lite [1].' }] } }] }),
        { status: 200 },
      );
    };
    const data = await (
      await onRequestPost({ request: post({ question, passages: [passage] }), env })
    ).json();
    assert.deepEqual(tried, ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash']);
    assert.equal(data.provider, 'gemini');
    assert.equal(data.model, 'gemini-3.8-flash');
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'high demand' } }), { status: 503 });
    const all = await (
      await onRequestPost({ request: post({ question, passages: [passage] }), env })
    ).json();
    assert.equal(all.provider, 'workers');
    assert.match(all.fallbackReason, /gemini-flash-latest\): erro 503/);
  } finally {
    globalThis.fetch = original;
  }
});

test('without GEMINI_WEB_SEARCH the free key never sends the search tool', async () => {
  const { onRequestGet, onRequestPost } = await load();
  const env = { GEMINI_API_KEY: 'k', AI: { run: async () => ({ response: 'W [1].' }) } };
  assert.equal((await onRequestGet({ env }).json()).providers[0].web, false);
  const original = globalThis.fetch;
  const bodies = [];
  try {
    globalThis.fetch = async (url, init) => {
      bodies.push(JSON.parse(init.body));
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Ok [1].' }] } }] }),
        { status: 200 },
      );
    };
    const data = await (
      await onRequestPost({ request: post({ question, passages: [passage] }), env })
    ).json();
    assert.equal(data.answer, 'Ok [1].');
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0].tools, undefined);
    const empty = await onRequestPost({ request: post({ question, passages: [] }), env });
    assert.equal(empty.status, 422);
  } finally {
    globalThis.fetch = original;
  }
});

test('a Gemini model that does not answer in time is skipped', async () => {
  const { onRequestPost } = await load();
  const env = { GEMINI_API_KEY: 'k', AI: { run: async () => ({ response: 'W [1].' }) } };
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (url.includes('gemini-3.5-flash-lite')) throw new DOMException('timeout', 'TimeoutError');
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Ok [1].' }] } }] }),
        { status: 200 },
      );
    };
    const data = await (
      await onRequestPost({ request: post({ question, passages: [passage] }), env })
    ).json();
    assert.equal(data.model, 'gemini-3.6-flash');
  } finally {
    globalThis.fetch = original;
  }
});
