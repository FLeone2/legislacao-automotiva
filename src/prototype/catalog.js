'use strict';

async function loadPrototypeCatalog(url = '/data/prototype/catalog.json') {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível carregar o acervo do protótipo.');
  const catalog = await response.json();
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.acts))
    throw new Error('Acervo de consulta inválido.');
  return catalog;
}

function getAct(catalog, id) {
  return (catalog?.acts || []).find((act) => act.id === id || act.aliases?.includes(id)) || null;
}

function getSelectionReferences(catalog, selection = {}) {
  const subsystem = selection.subsystemId
    ? catalog.subsystems.find((row) => row.id === selection.subsystemId)
    : null;
  const assemblyId = selection.parentAssemblyId || selection.assemblyId || subsystem?.assemblyId;
  const assembly = catalog.assemblies.find((row) => row.id === assemblyId);
  const contextualAct = (row, kind, id) => {
    const act = getAct(catalog, id);
    if (!act) return null;
    const topics = (row?.relations || [])
      .filter((relation) => relation.kind === kind)
      .flatMap((relation) => relation.topics)
      .filter((topic) => topic.records.some((record) => record.canonicalId === id));
    const records = topics.flatMap((topic) =>
      topic.records.filter((record) => record.canonicalId === id),
    );
    const unique = (values) => [...new Set(values.filter(Boolean))];
    const contextualTopics = unique(topics.map((topic) => topic.label));
    return {
      ...act,
      contextualTopics,
      contextualDescription: contextualTopics.join(' · '),
      contextualRequirementIds: unique(records.flatMap((record) => record.requirementIds)),
      contextualNotes: unique(
        records.flatMap((record) => record.mappingEvidence.map((evidence) => evidence.note)),
      ),
    };
  };
  const resolve = (row) => ({
    selection: row?.id || null,
    label: row?.label || 'Elemento visual',
    actIds: [...(row?.actIds || [])],
    componentActIds: [...(row?.componentActIds || [])],
    vehicleContextActIds: [...(row?.vehicleContextActIds || [])],
    componentActs: (row?.componentActIds || [])
      .map((id) => contextualAct(row, 'component', id))
      .filter(Boolean),
    vehicleContextActs: (row?.vehicleContextActIds || [])
      .map((id) => contextualAct(row, 'vehicle', id))
      .filter(Boolean),
    relations: row?.relations || [],
    gaps: row?.gaps || [],
    assessment: row?.assessment || { state: 'requires_assessment', automaticObligation: false },
    parentContext: null,
  });
  // A mesh child is a navigation aid, never a reviewed association by inheritance.
  if (selection.partId && selection.partId !== assemblyId) {
    const result = resolve(null);
    result.selection = selection.partId;
    result.gaps = [
      'Elemento geométrico sem associação normativa própria revisada. As referências abaixo pertencem ao conjunto de origem.',
    ];
    if (assembly) result.parentContext = { assemblyId, ...resolve(assembly) };
    return result;
  }
  // A supplied but unknown subsystem must not fall back to all assembly rules.
  return resolve(selection.subsystemId ? subsystem : assembly);
}

function searchActs(catalog, query = '') {
  const normalize = (value) =>
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return (catalog?.acts || []).filter((act) => {
    const text = normalize(
      [act.id, act.title, act.description, act.agency, ...(act.aliases || [])].join(' '),
    );
    return words.every((word) => text.includes(word));
  });
}

const PrototypeCatalog = { loadPrototypeCatalog, getAct, getSelectionReferences, searchActs };
if (typeof module !== 'undefined') module.exports = PrototypeCatalog;
if (typeof globalThis !== 'undefined') globalThis.PrototypeCatalog = PrototypeCatalog;
