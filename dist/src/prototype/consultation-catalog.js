import { prototypeQueryWords } from './assistant-retrieval.js';
// A trusted projection used on the Worker and for the explicit local source
// fallback. Browser evidence is never submitted to the Worker as authority.
const list = (value) => (Array.isArray(value) ? value : Object.values(value || {}));
export function buildConsultationCatalog(catalog, workflow = {}, documents = {}) {
  const publishedIds = new Set(list(catalog.acts).map((act) => act.id));
  const indexed = list(documents.documents).filter(
    (document) => document.indexable === true && publishedIds.has(document.actId),
  );
  const documentOwners = new Map(indexed.map((document) => [document.documentId, document]));
  const stages = new Map(list(catalog.stages).map((stage) => [stage.id, stage]));
  const sourceMap = new Map(list(catalog.sources).map((source) => [source.id, source]));
  const hints = new Map();
  const documentWordIndex = new Map();
  const documentChunkIndex = new Map();
  for (const chunk of list(documents.chunks)) {
    const owner = documentOwners.get(chunk.documentId);
    if (
      !owner ||
      chunk.actId !== owner.actId ||
      chunk.sourceId !== owner.sourceId ||
      chunk.documentSha256 !== owner.documentSha256 ||
      chunk.kind !== owner.kind
    )
      continue;
    const words = documentWordIndex.get(chunk.actId) || new Set();
    const chunkWords = new Set(prototypeQueryWords(chunk.text));
    for (const word of chunkWords) words.add(word);
    documentChunkIndex.set(chunk.actId, [
      ...(documentChunkIndex.get(chunk.actId) || []),
      {
        chunk: {
          ...chunk,
          unreviewedExtraction: true,
          notConsolidated: true,
          sourceIncludesChangeAnnotations: owner.sourceIncludesChangeAnnotations === true,
        },
        words: chunkWords,
      },
    ]);
    documentWordIndex.set(chunk.actId, words);
  }
  const documentWordFrequency = new Map();
  for (const words of documentWordIndex.values())
    for (const word of words)
      documentWordFrequency.set(word, (documentWordFrequency.get(word) || 0) + 1);
  for (const source of list(workflow.sources)) {
    if (!source.id) continue;
    const previous = sourceMap.get(source.id) || {};
    sourceMap.set(source.id, {
      ...previous,
      ...source,
      title: source.title || previous.title,
      evidenceType: source.evidenceType || source.kind || previous.evidenceType || null,
    });
  }
  for (const step of list(workflow.steps)) {
    for (const id of step.actIds || [])
      hints.set(id, [...(hints.get(id) || []), step.title || step.label || '']);
    stages.set(step.id, {
      ...step,
      label: step.label || step.title,
      description: step.description || step.title,
      workflowGuide: {
        kind: 'analyst_planning_not_legal_text',
        conditions: step.conditions,
        inputs: step.inputs,
        actions: step.actions,
        preconditioning: step.preconditioning,
        results: step.results,
        handover: step.handover,
        limitations: step.limitations,
        gaps: step.gaps,
      },
    });
    for (const test of list(step.tests)) {
      if (typeof test !== 'object') continue;
      const ids = new Set([
        ...(test.actIds || []),
        ...list(test.sources).map((source) => source.actId),
      ]);
      for (const id of ids) {
        if (!id) continue;
        hints.set(id, [...(hints.get(id) || []), test.label || test.title || '']);
      }
    }
  }
  return {
    ...catalog,
    acts: list(catalog.acts).map((act) => ({
      ...act,
      searchTerms: (hints.get(act.id) || []).join(' '),
      fullTextMarkdownPath:
        act.fullTextMarkdownPath ||
        indexed.find((document) => document.actId === act.id)?.markdownPath ||
        null,
    })),
    stages: [...stages.values()],
    sources: [...sourceMap.values()],
    documentRevision: documents.revision || null,
    workflowRevision: workflow.revision || null,
    documentWordIndex,
    documentWordFrequency,
    documentChunkIndex,
  };
}
