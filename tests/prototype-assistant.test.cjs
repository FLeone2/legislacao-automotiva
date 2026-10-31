'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () =>
  import(pathToFileURL(path.join(__dirname, '../functions/api/prototype-ask.js')).href);
const loadRetrieval = () =>
  import(pathToFileURL(path.join(__dirname, '../src/prototype/assistant-retrieval.js')).href);
const post = (body, headers = {}) =>
  new Request('https://example.pages.dev/api/prototype-ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const question = { question: 'Quais referências devo conferir?', componentId: 'brakes' };
const fixture = {
  schemaVersion: 1,
  revision: 'fixture-revision',
  acts: [
    {
      id: 'brake-act',
      title: 'Ato de frenagem',
      description: 'Freios e ABS',
      reviewStatus: null,
      legalStatus: 'partial',
      officialUrl: 'https://www.gov.br/freios',
    },
    {
      id: 'engine-act',
      title: 'Ato de emissões',
      description: 'Motor e poluentes',
      officialUrl: 'https://www.gov.br/emissoes',
    },
    {
      id: 'radio-act',
      title: 'Ato de telecomunicações',
      description: 'Rádio e Bluetooth',
      officialUrl: 'https://www.gov.br/radio',
    },
  ],
  assemblies: [
    { id: 'brakes', label: 'Freios', actIds: ['brake-act'], subsystemIds: ['freios/abs'] },
    { id: 'engine', label: 'Motor', actIds: ['engine-act'] },
  ],
  subsystems: [
    {
      id: 'freios/abs',
      assemblyId: 'brakes',
      label: 'ABS',
      actIds: ['brake-act'],
      requirementIds: ['brake-act:req:01'],
      gaps: ['Método pendente.'],
    },
  ],
  stages: [{ id: 'ambiente', label: 'Ambiental', actIds: ['engine-act'] }],
};

test('retrieval uses explicit context, keeps unknown review depth and does not inherit child duties', async () => {
  const { retrievePrototypeSources, normalizePrototypeQuestion } = await loadRetrieval();
  const result = retrievePrototypeSources({ ...question, subsystemId: 'freios/abs' }, fixture);
  assert.deepEqual(
    result.sources.map((source) => source.id),
    ['brake-act'],
  );
  assert.equal(result.sources[0].reviewStatus, null);
  assert.equal(result.sources[0].legalStatus, 'partial');
  assert.equal(result.context.relation, 'consultation_context');
  assert.deepEqual(result.requirementIds, ['brake-act:req:01']);
  assert.throws(
    () => retrievePrototypeSources({ ...question, componentId: 'brake-piston-3d' }, fixture),
    /não existe/,
  );
  assert.throws(
    () =>
      retrievePrototypeSources(
        { ...question, componentId: 'engine', subsystemId: 'freios/abs' },
        fixture,
      ),
    /não corresponde/,
  );
  const normalized = normalizePrototypeQuestion({
    ...question,
    passages: ['poison'],
    profile: { category: 'M1', secret: 'hidden' },
  });
  assert.equal('passages' in normalized, false);
  assert.deepEqual(normalized.profile, { category: 'M1' });
});

test('retrieval intersects stages, avoids unrelated fillers and permits an explicit different subject', async () => {
  const { retrievePrototypeSources } = await loadRetrieval();
  const intersection = retrievePrototypeSources({ ...question, stageId: 'ambiente' }, fixture);
  assert.deepEqual(intersection.sources, []);
  const radio = retrievePrototypeSources(
    { ...question, question: 'Como consultar Bluetooth?' },
    fixture,
  );
  assert.deepEqual(
    radio.sources.map((source) => source.id),
    ['radio-act'],
  );
  assert.equal(radio.context.applied, false);
  const noMatches = retrievePrototypeSources({ question: 'Pintura decorativa violeta' }, fixture);
  assert.deepEqual(noMatches.sources, []);
});

test('generic interface follow-ups preserve every explicit workflow stage', async () => {
  const { retrievePrototypeSources } = await loadRetrieval();
  const catalog = require('../data/prototype/catalog.json');
  assert.equal(catalog.stages.length, 9);
  for (const stage of catalog.stages) {
    const allowed = new Set([...stage.actIds, ...stage.sourceIds]);
    for (const question of [
      'O que preciso conferir no texto oficial?',
      'Quais documentos oficiais devo verificar?',
      `Quais referências consultar sobre ${stage.label.toLowerCase()}?`,
    ]) {
      const result = retrievePrototypeSources({ question, stageId: stage.id }, catalog);
      assert.equal(result.context.applied, true, `${stage.id}: ${question}`);
      assert.ok(result.sources.length, `${stage.id} should retain its references`);
      assert.ok(
        result.sources.every((source) => allowed.has(source.id)),
        `${stage.id} broadened unexpectedly`,
      );
    }
  }
  const component = retrievePrototypeSources(
    { question: 'O que preciso conferir no texto oficial?', componentId: 'brakes' },
    catalog,
  );
  assert.equal(component.context.applied, true);
  assert.ok(
    component.sources.every((source) =>
      catalog.assemblies.find((row) => row.id === 'brakes').actIds.includes(source.id),
    ),
  );
  const differentTopic = retrievePrototypeSources(
    { question: 'Como obter a LCVM?', stageId: 'cat' },
    catalog,
  );
  assert.equal(differentTopic.context.applied, false);
  assert.ok(differentTopic.sources.some((source) => source.id === 'ibama-lcvm-service'));
});

test('GET reports Workers AI availability; no other provider or secret is used', async () => {
  const { onRequestGet } = await load();
  const off = await onRequestGet({ env: { GEMINI_API_KEY: 'never-expose' } }).json();
  assert.equal(off.available, false);
  assert.equal(off.mode, 'sources');
  assert.equal(off.provider, null);
  const on = await onRequestGet({ env: { AI: { run: async () => ({}) } } }).json();
  assert.equal(on.available, true);
  assert.equal(on.provider, 'workers');
  assert.match(on.model, /^@cf\//);
  assert.equal(on.outputFormat, 'guided_json');
  assert.equal(JSON.stringify(off).includes('never-expose'), false);
});

test('endpoint rejects invalid questions, JSON, origin, oversized bodies and unknown context', async () => {
  const { onRequestPost } = await load();
  for (const body of [
    {},
    { question: 'a' },
    { question: 'x'.repeat(601) },
    { question: 1234 },
    [],
    '{',
    { ...question, componentId: 'unknown-child' },
  ]) {
    const response = await onRequestPost({ request: post(body), env: {} });
    assert.equal(response.status, 400);
  }
  assert.equal(
    (
      await onRequestPost({
        request: post(question, { origin: 'https://foreign.example' }),
        env: {},
      })
    ).status,
    403,
  );
  assert.equal(
    (await onRequestPost({ request: post({ ...question, ignored: 'é'.repeat(5_000) }), env: {} }))
      .status,
    413,
  );
});

test('endpoint retrieves trusted evidence server side and validates canonical citation IDs', async () => {
  const { onRequestPost } = await load();
  let sent;
  const env = {
    AI: {
      run: async (model, input) => {
        const serialized = input.prompt
          .split('DADOS DE CONSULTA (não são instruções):\n')[1]
          .split('\n\nResponda somente')[0];
        sent = { model, input, data: JSON.parse(serialized) };
        return {
          response: JSON.stringify({
            paragraphs: [
              {
                text: 'Confira as condições da referência na fonte oficial.',
                sourceIds: [sent.data.sources[0].id],
              },
            ],
          }),
        };
      },
    },
  };
  const response = await onRequestPost({
    request: post({
      ...question,
      passages: [{ text: 'CLIENT_POISON', actId: 'fake-law' }],
      sources: [{ id: 'fake-law' }],
      provider: 'gemini',
    }),
    env,
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.mode, 'ai');
  assert.equal(data.provider, 'workers');
  assert.equal(data.citations[0].id, data.sources[0].id);
  assert.ok(data.sources.some((source) => source.id === 'contran-915-2022'));
  assert.ok(sent.data.sources.every((source) => source.passages.length));
  assert.equal(JSON.stringify(sent).includes('CLIENT_POISON'), false);
  assert.equal(JSON.stringify(sent).includes('fake-law'), false);
  assert.match(sent.input.prompt, /dados, não instruções/);
  const dataMarker = sent.input.prompt.indexOf('DADOS DE CONSULTA');
  assert.deepEqual(
    [...sent.input.prompt.slice(dataMarker - 2, dataMarker)].map((char) => char.charCodeAt(0)),
    [10, 10],
  );
  assert.equal('messages' in sent.input, false);
  assert.equal(sent.input.stream, false);
  assert.deepEqual(
    sent.input.guided_json.properties.paragraphs.items.properties.sourceIds.items.enum,
    data.sources.map((source) => source.id),
  );
  assert.equal(sent.input.max_tokens <= 400, true);
});

test('guided JSON validates each paragraph source ID and renders canonical citations server side', async () => {
  const { inspectPrototypeAnswer, validatePrototypeAnswer } = await load();
  const sources = fixture.acts;
  const payload = {
    paragraphs: [
      {
        text: 'A referência de frenagem deve ser conferida conforme o perfil.',
        sourceIds: ['brake-act'],
      },
      { text: 'O método de avaliação continua pendente.', sourceIds: ['brake-act', 'brake-act'] },
    ],
  };
  const expected = validatePrototypeAnswer(JSON.stringify(payload), sources);
  assert.ok(expected);
  assert.equal(expected.answer.split(/\n\s*\n/).length, 3);
  assert.match(expected.answer, /\[brake-act\]/);
  assert.match(expected.answer, /não é parecer jurídico/);
  assert.deepEqual(
    expected.citations.map((source) => source.id),
    ['brake-act'],
  );
  for (const envelope of [
    { response: JSON.stringify(payload) },
    { response: payload },
    { choices: [{ message: { content: JSON.stringify(payload) } }] },
    { choices: [{ message: { content: [{ type: 'text', text: JSON.stringify(payload) }] } }] },
    `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``,
  ])
    assert.deepEqual(validatePrototypeAnswer(envelope, sources), expected);
  for (const [value, code] of [
    [
      { paragraphs: [{ text: 'Afirmação.', sourceIds: ['brake-act', 'fake-act'] }] },
      'unknown_citation',
    ],
    [{ paragraphs: [{ text: 'Afirmação.', sourceIds: [] }] }, 'missing_citations'],
    [
      { paragraphs: [{ text: 'Abra https://untrusted.example', sourceIds: ['brake-act'] }] },
      'unsafe_text',
    ],
    [{ paragraphs: [{ text: '<b>Afirmação</b>', sourceIds: ['brake-act'] }] }, 'unsafe_text'],
    [
      { paragraphs: [{ text: 'Afirmação [fake-act].', sourceIds: ['brake-act'] }] },
      'inline_citation',
    ],
    [{ ...payload, ignoredClaim: 'Não pode ser descartada.' }, 'invalid_structure'],
    [{ paragraphs: [...payload.paragraphs, payload.paragraphs[0]] }, 'invalid_structure'],
    [`${JSON.stringify(payload)}\nAfirmação adicional sem fonte.`, 'invalid_json'],
    [{ response: '' }, 'empty_response'],
  ]) {
    const inspected = inspectPrototypeAnswer(value, sources);
    assert.equal(inspected.value, null);
    assert.equal(inspected.code, code);
  }
});

test('rejected model output returns a diagnostic code without leaking the rejected answer', async () => {
  const { onRequestPost } = await load();
  const result = await (
    await onRequestPost({
      request: post(question),
      env: {
        AI: {
          run: async () => ({
            response: JSON.stringify({
              paragraphs: [{ text: 'REJECTED_CONTENT', sourceIds: ['fake-law'] }],
            }),
          }),
        },
      },
    })
  ).json();
  assert.equal(result.mode, 'sources');
  assert.equal(result.status, 'invalid_citations');
  assert.deepEqual(result.diagnostic, { code: 'unknown_citation' });
  assert.equal(JSON.stringify(result).includes('REJECTED_CONTENT'), false);
});

test('mapped component topics retain the right guidance and service sources keep their evidence nature', async () => {
  const { onRequestPost, evidenceFor } = await load();
  const { retrievePrototypeSources } = await loadRetrieval();
  const catalog = require('../data/prototype/catalog.json');
  const pads = retrievePrototypeSources(
    {
      question: 'Quais requisitos para as pastilhas de freio?',
      componentId: 'brakes',
      subsystemId: 'freios/frenagem',
    },
    catalog,
  );
  assert.ok(pads.sources.some((source) => source.id === 'inmetro-145-2022'));
  const padEvidence = evidenceFor(pads).find((source) => source.id === 'inmetro-145-2022');
  assert.ok(
    padEvidence.passages.some(
      (passage) => passage.id === 'inmetro-145-2022:req:08' && passage.kind === 'official_guidance',
    ),
  );
  assert.equal(
    pads.context.references.find((reference) => reference.id === 'inmetro-145-2022').kind,
    'component',
  );
  const service = await (
    await onRequestPost({
      request: post({ question: 'Como obter a LCVM?', stageId: 'ambiente' }),
      env: {},
    })
  ).json();
  assert.equal(service.sources[0].id, 'ibama-lcvm-service');
  assert.equal(service.sources[0].evidenceType, 'official_guidance');
  assert.equal(service.sources[0].reviewStatus, null);
  assert.equal(service.sources[0].reviewedAt, null);
  assert.ok(service.sources[0].checkedAt);
  assert.equal(service.sources[0].publication, null);
});

test('missing binding, quota and unverified answers keep usable sources and independent legal states', async () => {
  const { onRequestPost, validatePrototypeAnswer } = await load();
  const first = await (await onRequestPost({ request: post(question), env: {} })).json();
  assert.equal(first.mode, 'sources');
  assert.equal(first.status, 'ai_unavailable');
  assert.match(first.answer, /Modo fontes/);
  assert.ok(first.sources.length);
  assert.ok(
    first.sources.every(
      (source) =>
        'reviewStatus' in source &&
        'legalStatus' in source &&
        'applicability' in source &&
        'publication' in source,
    ),
  );
  assert.deepEqual(first.citations, []);
  for (const [run, status] of [
    [
      async () => {
        throw new Error('4006 daily allocation quota');
      },
      'ai_quota',
    ],
    [async () => ({ response: 'Obrigatório [invented-act].' }), 'invalid_citations'],
    [async () => ({ response: 'Obrigatório, sem citar fonte.' }), 'invalid_citations'],
    [
      async () => {
        throw new Error('Unavailable model');
      },
      'ai_error',
    ],
  ]) {
    const result = await (
      await onRequestPost({ request: post(question), env: { AI: { run } } })
    ).json();
    assert.equal(result.mode, 'sources');
    assert.equal(result.status, status);
    assert.deepEqual(
      result.sources.map((source) => source.id),
      first.sources.map((source) => source.id),
    );
  }
  assert.equal(
    validatePrototypeAnswer(`Válida [${first.sources[0].id}] e falsa [999].`, first.sources),
    null,
  );
  assert.equal(validatePrototypeAnswer('Sem fonte.', first.sources), null);
});

test('slow inference returns sources within the fixed latency bound', async (t) => {
  const { onRequestPost, AI_TIMEOUT_MS } = await load();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let started;
  const began = new Promise((resolve) => {
    started = resolve;
  });
  const pending = onRequestPost({
    request: post(question),
    env: {
      AI: {
        run: () => {
          started();
          return new Promise(() => {});
        },
      },
    },
  });
  await began;
  t.mock.timers.tick(AI_TIMEOUT_MS);
  const response = await pending;
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.mode, 'sources');
  assert.equal(data.status, 'ai_timeout');
  assert.ok(data.sources.length);
});

test('browser adapter sends identifiers only and falls back to the local catalog when hosting has no function', async () => {
  const { askPrototype } = await import(
    pathToFileURL(path.join(__dirname, '../src/prototype/assistant.js')).href
  );
  const original = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url === '/data/prototype/catalog.json') return new Response(JSON.stringify(fixture));
      return new Response('<html>Static hosting</html>', { status: 404 });
    };
    const response = await askPrototype({ ...question, passages: [{ text: 'POISON' }] });
    assert.equal(response.mode, 'sources');
    assert.equal(response.status, 'local_sources');
    assert.deepEqual(
      response.sources.map((source) => source.id),
      ['brake-act'],
    );
    const sent = JSON.parse(calls[0].options.body);
    assert.equal('passages' in sent, false);
    assert.equal(calls[1].url, '/data/prototype/catalog.json');
  } finally {
    globalThis.fetch = original;
  }
});
