import prototypeCatalog from './catalog.js';
import {
  normalizePrototypeQuestion,
  prototypeSourceResponse,
  retrievePrototypeSources,
} from './assistant-retrieval.js';

const ENDPOINT = '/api/prototype-ask';
const CLIENT_TIMEOUT_MS = 8_000;
const { loadPrototypeCatalog } = prototypeCatalog;

async function requestJson(fetcher, url, options, signal, timeoutMs) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { ...options, signal: controller.signal });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data?.error || 'Não foi possível consultar a IA.');
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export async function getPrototypeAssistantStatus({
  signal,
  fetch: fetcher = globalThis.fetch,
} = {}) {
  try {
    return await requestJson(fetcher, ENDPOINT, { method: 'GET' }, signal, 3_000);
  } catch (error) {
    if (signal?.aborted) throw error;
    return { available: false, mode: 'sources', status: 'local_sources', provider: null };
  }
}

export async function askPrototype(input, { signal, fetch: fetcher = globalThis.fetch } = {}) {
  const request = normalizePrototypeQuestion(input);
  try {
    const data = await requestJson(
      fetcher,
      ENDPOINT,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Deliberately send identifiers and profile only. Evidence is retrieved
        // from the trusted server bundle, never accepted from browser passages.
        body: JSON.stringify(request),
      },
      signal,
      CLIENT_TIMEOUT_MS,
    );
    if (!['ai', 'sources'].includes(data.mode) || !Array.isArray(data.sources))
      throw new Error('Resposta de consulta inválida.');
    return data;
  } catch (error) {
    if (signal?.aborted || error.status === 400 || error.status === 403 || error.status === 413)
      throw error;
    const catalog = await loadPrototypeCatalog();
    return prototypeSourceResponse(retrievePrototypeSources(request, catalog), 'local_sources');
  }
}
