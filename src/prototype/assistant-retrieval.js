// Shared, deterministic retrieval. Only the server supplies evidence to the model;
// the browser uses this module to offer clearly labelled source cards offline.
const MAX_QUESTION = 600;
const MAX_SOURCES = 6;
const SHORT_REGULATORY_LABELS = new Set([
  'lp',
  'lc',
  'l7',
  'l8',
  'p7',
  'p8',
  'm1',
  'm2',
  'm3',
  'n1',
  'n2',
  'n3',
  'o1',
  'o2',
  'o3',
  'o4',
  'l1',
  'l2',
  'l3',
  'l4',
  'l5',
  'l6',
]);
const PROFILE_KEYS = new Set([
  'category',
  'subcategory',
  'propulsion',
  'fuel',
  'mass',
  'massKg',
  'grossMass',
  'grossMassKg',
  'mtma',
  'pbt',
  'seats',
  'year',
  'modelYear',
  'origin',
  'use',
  'operation',
  'application',
  'componentApplication',
  'manufacturingDate',
]);
const STOP_WORDS = new Set(
  'a o as os de do da dos das em no na nos nas para por e ou um uma que qual quais como quando onde quem sao ser esta este esse essa se ao aos minha meu sobre preciso precisa necessario necessaria obrigatorio obrigatoria requisitos requisito normas norma leis lei legislacao homologacao homologar veiculo veiculos aplica aplicam aplicavel verificar conferir consulta consultar fontes fonte referencia referencias selecao peca pecas conjunto devo deve devem gostaria quero saber entender pode podem posso voce texto textos oficial oficiais documento documentos relatorio relatorios evidencia evidencias ato atos resolucao resolucoes portaria portarias instrucao instrucoes normativa normativas decreto decretos deliberacao deliberacoes diferenca diferencas entre distinguir diferenciar comparar comparacao explique explicar'.split(
    ' ',
  ),
);

export function plainText(value, limit = 600) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
}

export class PrototypeQuestionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrototypeQuestionError';
    this.status = 400;
  }
}

export function normalizePrototypeQuestion(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new PrototypeQuestionError('Envie uma pergunta e, se desejar, a seleção do veículo.');
  if (typeof input.question !== 'string' || input.question.length > MAX_QUESTION)
    throw new PrototypeQuestionError('Escreva uma pergunta de 4 a 600 caracteres.');
  const question = plainText(input.question, MAX_QUESTION);
  if (question.length < 4 || !/[\p{L}]{2}/u.test(question))
    throw new PrototypeQuestionError('Escreva uma pergunta de 4 a 600 caracteres.');
  const result = { question, componentId: '', subsystemId: '', stageId: '', profile: {} };
  for (const key of ['componentId', 'subsystemId', 'stageId']) {
    if (input[key] == null || input[key] === '') continue;
    if (typeof input[key] !== 'string' || !/^[a-zA-Z0-9/_:.-]{1,160}$/.test(input[key]))
      throw new PrototypeQuestionError('A seleção informada não é válida.');
    result[key] = input[key];
  }
  if (input.profile && typeof input.profile === 'object' && !Array.isArray(input.profile)) {
    for (const [key, value] of Object.entries(input.profile)) {
      if (!PROFILE_KEYS.has(key)) continue;
      if (typeof value === 'string') result.profile[key] = plainText(value, 100);
      else if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))
        result.profile[key] = value;
    }
  }
  return result;
}

const list = (value) => (Array.isArray(value) ? value : Object.values(value || {}));
const normalized = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const wordRoot = (word) => word.replace(/^frenagem$/, 'freio').replace(/s$/, '');
export function prototypeQueryWords(value) {
  return [
    ...new Set(
      (normalized(value).match(/[a-z0-9]+/g) || [])
        .filter(
          (word) => (word.length > 2 || SHORT_REGULATORY_LABELS.has(word)) && !STOP_WORDS.has(word),
        )
        .map(wordRoot),
    ),
  ];
}
function scoreText(queryWords, value, weight) {
  const textWords = new Set(prototypeQueryWords(value));
  return queryWords.reduce((sum, word) => sum + (textWords.has(word) ? weight : 0), 0);
}
function actScore(act, queryWords, sourceHints = []) {
  return (
    scoreText(queryWords, `${act.id} ${act.title}`, 6) +
    scoreText(queryWords, act.description || act.scope, 3) +
    scoreText(queryWords, sourceHints.map((source) => source.title).join(' '), 6) +
    scoreText(queryWords, sourceHints.map((source) => source.scope).join(' '), 3)
  );
}

function sourceOf(act) {
  return {
    id: act.id,
    title: act.title,
    description: act.description || act.scope || '',
    agency: act.agency || null,
    officialUrl: act.officialUrl || act.url || null,
    pdfUrl: act.pdfUrl || null,
    pdfOfficialUrl: act.pdfOfficialUrl || null,
    pdfStatus: act.pdfStatus || null,
    evidenceType: act.evidenceType || 'catalog_reference',
    publication: act.publication ?? null,
    legalStatus: act.legalStatus ?? null,
    reviewStatus: act.reviewStatus ?? null,
    applicability: act.applicability ?? null,
    limitations: act.limitations || [],
    relatedCandidates: act.relatedCandidates || [],
    revision: act.revision || act.contentRevision || null,
    reviewedAt: act.reviewedAt || act.reviewDate || null,
    checkedAt: act.checkedAt || null,
    retrieval: act.retrieval || null,
    provenance: act.provenance || null,
    requirementIds: act.requirementIds || [],
  };
}

export function retrievePrototypeSources(input, catalog) {
  const request = normalizePrototypeQuestion(input);
  const acts = list(catalog.acts).filter((act) => act?.id && act?.title);
  const actIds = new Set(acts.map((act) => act.id));
  const references = [
    ...acts,
    ...list(catalog.sources).filter(
      (source) =>
        source?.id &&
        source?.title &&
        !actIds.has(source.id) &&
        source.evidenceType !== 'editorial_candidate',
    ),
  ];
  const findContext = (field, items) => {
    if (!request[field]) return null;
    const found = list(items).find((item) => item.id === request[field]);
    if (!found) throw new PrototypeQuestionError('A seleção não existe no catálogo desta revisão.');
    return found;
  };
  const component = findContext('componentId', catalog.assemblies);
  const subsystem = findContext('subsystemId', catalog.subsystems);
  const stage = findContext('stageId', catalog.stages);
  if (
    component &&
    subsystem &&
    subsystem.assemblyId &&
    subsystem.assemblyId !== component.id &&
    !component.subsystemIds?.includes(subsystem.id)
  )
    throw new PrototypeQuestionError('O subsistema não corresponde ao conjunto selecionado.');
  const selected = subsystem || component;
  let allowedIds = selected ? new Set(selected.actIds || []) : null;
  if (stage) {
    const stageIds = new Set([...(stage.actIds || []), ...(stage.sourceIds || [])]);
    allowedIds = allowedIds ? new Set([...allowedIds].filter((id) => stageIds.has(id))) : stageIds;
    if (selected && stage.assemblyIds?.includes(component?.id || subsystem?.assemblyId)) {
      for (const id of stage.sourceIds || []) allowedIds.add(id);
    }
  }
  const queryWords = prototypeQueryWords(request.question);
  const contextReferences = [];
  for (const relation of selected?.relations || []) {
    for (const topic of relation.topics || []) {
      for (const record of topic.records || []) {
        contextReferences.push({
          id: record.canonicalId || record.id,
          kind: relation.kind,
          topic: topic.label,
          requirementIds: record.requirementIds || [],
          notes: [
            ...new Set((record.mappingEvidence || []).map((entry) => entry.note).filter(Boolean)),
          ],
        });
      }
    }
  }
  const scored = references.map((act) => {
    // Identity is explicit: an existing source with the same canonical ID or
    // registered actIds may improve discovery, never create a new legal join.
    const sourceHints = list(catalog.sources).filter(
      (source) => source.id === act.id || source.actIds?.includes(act.id),
    );
    return {
      act,
      titleScore:
        scoreText(queryWords, `${act.id} ${act.title}`, 6) +
        scoreText(queryWords, sourceHints.map((source) => source.title).join(' '), 6),
      score:
        actScore(act, queryWords, sourceHints) +
        contextReferences
          .filter((reference) => reference.id === act.id)
          .reduce((sum, reference) => sum + scoreText(queryWords, reference.topic, 4), 0),
    };
  });
  const scoped = allowedIds ? scored.filter(({ act }) => allowedIds.has(act.id)) : scored;
  let ranked = scoped;
  let contextApplied = !!allowedIds;
  // A clearly different question can leave the current selection. Generic
  // questions keep its explicit context; zero lexical matches never broaden it.
  const bestScoped = Math.max(0, ...scoped.map(({ score }) => score));
  const bestGlobal = Math.max(0, ...scored.map(({ score }) => score));
  const contextSelection = selected || stage;
  const selectionMatch =
    contextSelection &&
    scoreText(queryWords, `${contextSelection.label} ${contextSelection.description}`, 1);
  // Leaving an explicitly chosen workflow stage needs a subject named by a
  // trusted reference title/identifier. A description's incidental word alone
  // cannot turn a generic follow-up into an unrelated collection-wide query.
  const clearlyDifferent = scored.filter(
    ({ titleScore, score }) => score >= 3 && (!stage || titleScore >= 6),
  );
  if (
    allowedIds &&
    !selectionMatch &&
    bestScoped === 0 &&
    bestGlobal >= 3 &&
    clearlyDifferent.length
  ) {
    ranked = clearlyDifferent;
    contextApplied = false;
  } else if (allowedIds && bestScoped > 0) {
    ranked = scoped.filter(({ score }) => score > 0);
  } else if (!allowedIds) {
    ranked = scored.filter(({ score }) => score >= 3);
  }
  ranked.sort((left, right) => right.score - left.score || left.act.id.localeCompare(right.act.id));
  const sources = ranked.slice(0, MAX_SOURCES).map(({ act }) => sourceOf(act));
  const requirementIds = new Set(selected?.requirementIds || []);
  for (const relation of selected?.relations || []) {
    for (const topic of relation.topics || []) {
      for (const record of topic.records || []) {
        for (const id of record.requirementIds || []) requirementIds.add(id);
      }
    }
  }
  return {
    request,
    sources,
    requirementIds: contextApplied ? [...requirementIds] : [],
    context: {
      componentId: component?.id || null,
      componentLabel: component?.label || null,
      subsystemId: subsystem?.id || null,
      subsystemLabel: subsystem?.label || null,
      stageId: stage?.id || null,
      stageLabel: stage?.label || null,
      applied: contextApplied,
      relation: 'consultation_context',
      references: contextApplied
        ? contextReferences.filter((reference) =>
            sources.some((source) => source.id === reference.id),
          )
        : [],
      gaps: [...(selected?.gaps || []), ...(stage?.limitations || [])],
    },
    dataset: {
      revision: catalog.revision || null,
      knowledgeRevision: catalog.knowledgeRevision || catalog.provenance?.knowledgeRevision || null,
      asOf: catalog.asOf || null,
      scopeNote:
        catalog.scopeNote ||
        'Acervo consultivo; cobertura integral e aplicabilidade não são presumidas.',
    },
  };
}

export function prototypeSourceResponse(retrieval, status = 'ai_unavailable') {
  const messages = {
    ai_unavailable: 'A IA está indisponível neste ambiente.',
    ai_quota: 'A cota gratuita da IA foi atingida.',
    ai_timeout: 'A IA não respondeu dentro do tempo de consulta.',
    ai_error: 'A IA está temporariamente indisponível.',
    invalid_citations: 'A resposta da IA não passou pela conferência das citações.',
    local_sources: 'A consulta está usando o catálogo local.',
    no_sources: 'Não encontrei referências suficientemente relacionadas a esta pergunta.',
  };
  const hasSources = retrieval.sources.length > 0;
  const heading = `Modo fontes. ${messages[status] || messages.ai_unavailable}`;
  const body = hasSources
    ? 'Abra as referências abaixo. Confira no texto as condições para seu veículo; os vínculos orientam a consulta e não confirmam uma obrigação.'
    : 'Selecione um conjunto, subsistema ou etapa, ou informe o assunto regulatório com mais precisão.';
  return {
    answer: `${heading} ${body}`,
    mode: 'sources',
    status: hasSources ? status : 'no_sources',
    sources: retrieval.sources,
    citations: [],
    provider: null,
    context: retrieval.context,
    dataset: retrieval.dataset,
    limitations: retrieval.context.gaps,
  };
}
