'use strict';
function catalogIdentity(record) {
  return record.regulatoryId || record.id;
}

// Keep the original entries addressable, but present each act once. Array-valued
// associations belong to the act and must survive reconciliation of legacy IDs.
function canonicalCatalogRecords(records) {
  const acts = new Map();
  for (const record of records) {
    if (record.publication?.included === false) continue;
    const identity = catalogIdentity(record);
    if (!identity) continue;
    const previous = acts.get(identity);
    const merged = { ...(previous || record) };
    if (previous) {
      for (const [field, value] of Object.entries(record)) {
        if (!Array.isArray(value)) continue;
        const values = [...(previous[field] || []), ...value];
        merged[field] = [...new Map(values.map((item) => [JSON.stringify(item), item])).values()];
      }
    }
    merged.aliases = [
      ...new Set(
        [
          ...(previous?.aliases || []),
          ...(record.aliases || []),
          identity,
          record.id,
          ...(record.catalogRecordIds || []),
        ].filter(Boolean),
      ),
    ];
    merged.catalogEntryIds = [
      ...new Set([
        ...(previous?.catalogEntryIds || []),
        ...(record.catalogEntryIds || [record.id]),
      ]),
    ];
    const contexts = [
      ...(previous?.catalogEntryContexts || []),
      ...(record.catalogEntryContexts || [
        Object.fromEntries(
          [
            'id',
            'stages',
            'taxonomy',
            'vehicleLinks',
            'scope',
            'legalApplicability',
            'applicability',
          ]
            .filter((field) => record[field] !== undefined)
            .map((field) => [field, record[field]]),
        ),
      ]),
    ];
    merged.catalogEntryContexts = [
      ...new Map(contexts.map((context) => [JSON.stringify(context), context])).values(),
    ];
    acts.set(identity, merged);
  }
  return [...acts.values()];
}

function catalogRecords(source) {
  return source.canonicalRecords || canonicalCatalogRecords(source.records || []);
}

function catalogRecord(source, id) {
  const matches = (record) =>
    record.id === id || catalogIdentity(record) === id || record.aliases?.includes(id);
  return catalogRecords(source).find(matches) || source.records?.find(matches);
}

function contranReference(record) {
  const match = norm(record.title).match(/contran\s*(?:n[º°o]?\s*)?(\d+)[./](\d{2,4})\b/);
  if (!match) return '';
  const year = Number(match[2]);
  return `contran-${Number(match[1])}-${year < 100 ? (year < 50 ? 2000 : 1900) + year : year}`;
}

function contranRecordLink(record) {
  const id = record.regulatoryId || contranReference(record),
    view = record.regulatorySource || 'contran';
  return id
    ? `<a class="contran-reference" href="#${view}?record=${esc(id)}" data-contran-open>Conferir no acervo de referência ${regulatoryConfig[view]?.label || view} →</a>`
    : '';
}

function installActiveRegulations(base) {
  const all = Object.entries(regulatoryData).flatMap(([source, data]) =>
    (data?.records || []).map((r) => ({ ...r, regulatorySource: source })),
  );
  const byOriginal = new Map(all.flatMap((r) => (r.catalogRecordIds || []).map((id) => [id, r])));
  const taxonomy = (r) =>
    r.vehicleLinks.length
      ? [...new Set(r.vehicleLinks.map((x) => x.subsystemId || x.systemId))]
      : r.generalCategories.includes('emissoes-corporativas')
        ? ['corporativo/ambiental']
        : r.generalCategories.includes('homologacao')
          ? ['processos/homologacao']
          : r.generalCategories.includes('registro')
            ? ['regras-gerais/registro']
            : ['regras-gerais/base'];
  const adapt = (source, id, old = {}) => ({
    ...old,
    id,
    title: source.title || `Resolução CONTRAN nº ${source.number}/${source.year}`,
    agency: { contran: 'SENATRAN', proconve: 'IBAMA', inmetro: 'INMETRO', anatel: 'ANATEL' }[
      source.regulatorySource
    ],
    issuer: source.issuer || (source.regulatorySource === 'contran' ? 'CONTRAN' : 'IBAMA'),
    summary: source.subject,
    status: source.statusLabel,
    officialUrl: source.officialUrl,
    reviewDate:
      source.reviewStatus?.reviewedAt ||
      source.reviewedAt ||
      regulatoryData[source.regulatorySource].metadata.asOf,
    taxonomy: taxonomy(source),
    componentLabels: source.vehicleLinks
      .map((x) => ComponentFlow.component(x.componentId)?.label)
      .filter(Boolean),
    stages: old.stages || [source.regulatorySource === 'proconve' ? 'emissoes' : 'seguranca'],
    legalApplicability: `${source.phases?.length ? 'Fase(s) PROCONVE: ' + source.phases.join(' / ') + '. ' : ''}Aplicação condicionada à categoria, configuração, combustível, datas e dispositivos do ato.`,
    availability:
      source.reviewStatus?.summary || 'Fonte oficial localizada. Confira os limites da revisão.',
    classificationBasis:
      source.classificationBasis ||
      'Vínculo temático no índice; abrir a fonte e conferir o enquadramento.',
    amendingRefs: source.relationships.filter((x) => x.kind !== 'referencia').map((x) => x.label),
    uncertaintyNotes: source.notes,
    officialAudit: {
      reviewDate:
        source.reviewStatus?.reviewedAt ||
        source.reviewedAt ||
        regulatoryData[source.regulatorySource].metadata.asOf,
    },
    regulatoryId: source.id,
    regulatorySource: source.regulatorySource,
    regulatoryDomain: source.regulatoryDomain || 'safety',
    vehicleLinks: source.vehicleLinks,
    phases: source.phases || [],
    generalCategories: source.generalCategories,
    requirements: source.requirements || [],
    requirementIds: source.requirementIds || [],
    _summary: Boolean(source._summary),
    legalStatus: source.legalStatus,
    reviewStatus: source.reviewStatus,
    applicability: source.applicability,
    publication: source.publication,
    consultation: source.consultation,
    consultationTracks: source.consultationTracks || [],
    consultationTopics: source.consultationTopics || [],
    temporalFlags: source.temporalFlags || [],
    reviewMetadata: source.reviewMetadata,
    topics: source.topics || [],
  });
  const records = base.records
    .filter((r) => !contranReference(r) || byOriginal.has(r.id))
    .filter(
      (r) =>
        !['IBAMA', 'INMETRO', 'ANATEL'].includes(r.agency) ||
        byOriginal.has(r.id) ||
        r.id === 'ibama-042',
    )
    .map((r) => (byOriginal.has(r.id) ? adapt(byOriginal.get(r.id), r.id, r) : r))
    .map(enrichFlowCatalogRecord);
  for (const source of all)
    if (!records.some((r) => r.regulatoryId === source.id))
      records.push(adapt(source, 'official-' + source.id));
  const canonicalRecords = canonicalCatalogRecords(records);
  return {
    ...base,
    metadata: {
      ...base.metadata,
      recordCount: canonicalRecords.length,
      documentaryEntryCount: records.length,
      countCaveat: `${canonicalRecords.length} referências canônicas do acervo de consulta.`,
    },
    records,
    canonicalRecords,
  };
}

function activeVehicleRecords(component, subsystem, lane, partId) {
  if (partId)
    return VehicleLegislation.part(partId, component.id)
      ? VehicleLegislation.records(partId, catalog.records, { subsystemId: subsystem?.id, lane })
      : [];
  const domain = lane === 'ambiental' ? 'environmental' : 'safety';
  return [
    ...new Map(
      catalog.records
        .filter(
          (r) =>
            r.regulatoryId &&
            ((lane !== 'ambiental' && r.regulatoryDomain === 'conformity') ||
              r.regulatoryDomain === domain) &&
            r.vehicleLinks.some(
              (x) =>
                x.componentId === component.id && (!subsystem || x.subsystemId === subsystem.id),
            ),
        )
        .map((r) => [r.regulatoryId, r]),
    ).values(),
  ];
}

function activeVehicleSourceLinks(component, subsystem, partId) {
  if (partId) {
    const records = VehicleLegislation.records(partId, catalog.records, {
      subsystemId: subsystem?.id,
    });
    return [...new Set(records.map((record) => record.agency))]
      .map(
        (agency) =>
          `<a href="${esc(libraryRoute({ part: partId, agency }))}">${esc(agency)} · ${records.filter((record) => record.agency === agency).length} referências →</a>`,
      )
      .join(' · ');
  }
  if (component.id === 'bateria') return '';
  return Object.entries(regulatoryData)
    .map(([source, data]) => {
      const count = (data?.records || []).filter((r) =>
        r.vehicleLinks.some(
          (x) => x.componentId === component.id && (!subsystem || x.subsystemId === subsystem.id),
        ),
      ).length;
      return count
        ? `<a href="${esc(regulatoryUrl(source, { component: component.id, subsystem: subsystem?.id }))}">${regulatoryConfig[source].label} · ${count} ${source === 'inmetro' ? 'referências atuais relacionadas' : 'atos vigentes relacionados'} →</a>`
        : '';
    })
    .filter(Boolean)
    .join(' · ');
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = {
    catalogIdentity,
    canonicalCatalogRecords,
    catalogRecords,
    catalogRecord,
    installActiveRegulations,
  };
