'use strict';

// Read-only projection of the reviewed 37-part mapping. A 3D assembly is a
// navigation surface: its geometry, brand or material never proves applicability.
const GuideTraceability = (() => {
  const relationLabels = {
    component: 'Sobre o conjunto selecionado',
    vehicle: 'Contexto do veículo completo',
  };
  const profileLabels = {
    category: 'Categoria técnica',
    powertrain: 'Propulsão',
    fuel: 'Combustível',
    massKg: 'Massa máxima / PBT (kg)',
    massRunningKg: 'Massa em ordem de marcha (kg)',
    payloadKg: 'Carga útil (kg)',
    seats: 'Assentos incluindo motorista',
    year: 'Ano de introdução',
    origin: 'Origem',
    purpose: 'Natureza do processo',
    usage: 'Uso',
    componentMarket: 'OEM ou reposição',
    radio: 'Equipamentos de radiofrequência',
  };
  const unique = (values) => [
    ...new Set(values.filter((value) => value !== null && value !== undefined && value !== '')),
  ];
  const strings = (value) =>
    (Array.isArray(value) ? value : value ? [value] : []).filter(
      (entry) => typeof entry === 'string',
    );
  const identity = (record) => record.regulatoryId || record.canonicalId || record.id;
  const clone = (value) => (value === undefined ? null : JSON.parse(JSON.stringify(value)));

  function legacyPartIds(part = {}) {
    return unique([
      ...(Array.isArray(part.legacyParts) ? part.legacyParts : []),
      ...(Array.isArray(part.legacyPartIds) ? part.legacyPartIds : []),
      part.legacyPart,
    ]).filter((id) => typeof id === 'string');
  }

  function records(part, catalogRecords, resolver) {
    if (!resolver || !Array.isArray(catalogRecords)) return [];
    const published = catalogRecords.filter((record) => record.publication?.included !== false);
    return resolver.unique(
      legacyPartIds(part).flatMap((id) =>
        resolver.part(id) ? resolver.records(id, published) : [],
      ),
    );
  }

  function provision(requirement, record) {
    return {
      id: requirement.id,
      requirementId: requirement.id,
      title: requirement.title || requirement.id,
      reference: requirement.provision?.reference || requirement.clause || null,
      kind: requirement.provision?.kind || null,
      rule: requirement.rule || null,
      scope: requirement.scope || null,
      sourceUrl:
        requirement.provision?.sourceUrl ||
        requirement.evidenceSource?.url ||
        requirement.sourceUrl ||
        record.officialUrl ||
        null,
      evidenceSource: clone(requirement.evidenceSource),
      verification: clone(requirement.verification),
      verificationPlan: clone(requirement.verificationPlan),
      detailState: record._summary
        ? 'summary_only'
        : requirement.evidenceSource
          ? 'source_detail_available'
          : 'reference_only',
    };
  }

  function recordTrace(record, topic) {
    const links = (record.vehicleMappingLinks || []).filter(
      (link) => link.relation === topic.relation,
    );
    const requirementIds = unique(record.vehicleRequirementIds || []);
    const mappedRequirements = (record.requirements || []).filter((requirement) =>
      requirementIds.includes(requirement.id),
    );
    const missingRequirementIds = requirementIds.filter(
      (id) => !mappedRequirements.some((requirement) => requirement.id === id),
    );
    const limits = [
      ...strings(record.uncertaintyNotes),
      ...strings(record.notes),
      ...links.map((link) => link.note).filter(Boolean),
    ];
    if (!requirementIds.length)
      limits.push(
        'Associação de consulta ao ato; nenhum requisito individual deste conjunto foi estruturado nesse vínculo.',
      );
    if (record.reviewStatus?.fullTextReviewed === false)
      limits.push('A íntegra do ato não foi revisada.');
    if (record.reviewStatus?.amendmentChainReviewed === false)
      limits.push('A cadeia integral de alterações ainda exige conferência.');
    if (!record.reviewStatus)
      limits.push('Profundidade de revisão não estruturada neste registro.');
    if (record.legalStatus?.state === 'partially_repealed')
      limits.push('O ato possui revogação parcial; conferir os dispositivos remanescentes.');
    if (record._summary)
      limits.push(
        'Resumo do índice: abra o ato para consultar o detalhe e a evidência disponíveis.',
      );
    if (missingRequirementIds.length)
      limits.push(
        'Há requisitos vinculados cujo detalhe ainda não está disponível nesta consulta.',
      );
    return {
      id: record.id,
      canonicalId: identity(record),
      title: record.title || record.subject || record.id,
      agency: record.issuer || record.agency || null,
      officialUrl: record.officialUrl || null,
      requirementIds,
      provisions: mappedRequirements.map((requirement) => provision(requirement, record)),
      missingRequirementIds,
      legalStatus: clone(record.legalStatus),
      reviewStatus: clone(record.reviewStatus),
      applicability: clone(record.applicability),
      publication: clone(record.publication),
      statusLabel: record.statusLabel || record.status || null,
      reviewedAt:
        record.reviewStatus?.reviewedAt ||
        record.reviewDate ||
        record.officialAudit?.reviewDate ||
        null,
      phases: clone(record.phases || []),
      mappingEvidence: links.map((link) => ({
        legacyPartId: link.partId,
        topicId: link.topicId,
        relation: link.relation,
        requirementIds: clone(link.requirementIds || []),
        basis: link.basis || null,
        note: link.note || null,
        sourceFields: clone(link.sourceFields || []),
      })),
      limits: unique(limits),
      assessment: { state: 'requires_assessment', automaticObligation: false },
    };
  }

  function mergeRecord(previous, next) {
    if (!previous) return next;
    return {
      ...previous,
      requirementIds: unique([...previous.requirementIds, ...next.requirementIds]),
      provisions: [
        ...new Map(
          [...previous.provisions, ...next.provisions].map((item) => [item.id, item]),
        ).values(),
      ],
      missingRequirementIds: unique([
        ...previous.missingRequirementIds,
        ...next.missingRequirementIds,
      ]),
      mappingEvidence: [
        ...new Map(
          [...previous.mappingEvidence, ...next.mappingEvidence].map((item) => [
            JSON.stringify(item),
            item,
          ]),
        ).values(),
      ],
      limits: unique([...previous.limits, ...next.limits]),
    };
  }

  function create({ resolver, catalogRecords, reviewedAt = null } = {}) {
    if (!resolver?.part || !resolver?.topics || !resolver?.recordsForTopic || !resolver?.unique)
      throw new TypeError('Reviewed vehicle resolver required');
    const catalog = (Array.isArray(catalogRecords) ? catalogRecords : []).filter(
      (record) => record.publication?.included !== false,
    );
    return function traceability(part = {}, profile = {}) {
      const ids = legacyPartIds(part);
      const knownIds = ids.filter((id) => resolver.part(id));
      const referenceImages = knownIds.map((id) => ({
        legacyPartId: id,
        label: resolver.part(id).label || id,
        asset: `assets/vehicle-vector/previews/${id}.webp`,
      }));
      const primaryImage =
        part.referenceAsset ||
        part.referenceImage ||
        referenceImages[0]?.asset ||
        'assets/vehicle-vector/previews/vehicle.webp';
      const relationMaps = new Map(Object.keys(relationLabels).map((kind) => [kind, new Map()]));
      const gaps = [];
      for (const id of ids.filter((entry) => !knownIds.includes(entry)))
        gaps.push(`Conjunto de origem sem associação revisada: ${id}.`);
      if (!knownIds.length)
        gaps.push(
          'Este conjunto 3D não possui associação específica revisada ao acervo. A ausência de vínculo não significa ausência de obrigação.',
        );
      for (const id of knownIds) {
        const topics = resolver.topics(id);
        if (!topics.length)
          gaps.push(`Não há assunto normativo revisado para ${resolver.part(id).label || id}.`);
        for (const topic of topics) {
          const key = JSON.stringify([
            topic.relation,
            topic.lane,
            topic.subsystemId || null,
            topic.label,
          ]);
          const map = relationMaps.get(topic.relation);
          if (!map) continue;
          if (!map.has(key))
            map.set(key, {
              id: `${topic.relation}:${topic.lane}:${topic.sourceId || topic.id}`,
              label: topic.label,
              lane: topic.lane,
              subsystemId: topic.subsystemId || null,
              legacyPartIds: [],
              records: [],
              gaps: [],
              gapReview: clone(topic.gapReview),
            });
          const entry = map.get(key);
          entry.legacyPartIds = unique([...entry.legacyPartIds, id]);
          entry.gaps = unique([...entry.gaps, ...strings(topic.gaps)]);
          const traced = resolver
            .recordsForTopic(topic, catalog)
            .map((record) => recordTrace(record, topic));
          const acts = new Map(entry.records.map((record) => [record.canonicalId, record]));
          for (const record of traced)
            acts.set(record.canonicalId, mergeRecord(acts.get(record.canonicalId), record));
          entry.records = [...acts.values()];
          for (const link of topic.links || []) {
            if (
              !entry.records.some(
                (record) => record.canonicalId === link.actId || record.id === link.actId,
              )
            )
              entry.gaps = unique([
                ...entry.gaps,
                'Uma referência do vínculo não está no acervo publicado; ela não foi recuperada como obrigação.',
              ]);
          }
        }
      }
      const relations = [...relationMaps]
        .map(([kind, map]) => ({ kind, label: relationLabels[kind], topics: [...map.values()] }))
        .filter((relation) => relation.topics.length);
      const allRecords = relations.flatMap((relation) =>
        relation.topics.flatMap((topic) => topic.records),
      );
      const conditions = Object.entries(profileLabels).map(([field, label]) => ({
        field,
        label,
        value: profile[field] ?? null,
        state:
          profile[field] === null || profile[field] === undefined || profile[field] === ''
            ? 'not_informed'
            : 'provided',
      }));
      return {
        visual: {
          partId: part.id || null,
          label: part.label || part.id || 'Conjunto selecionado',
          legacyPartIds: knownIds,
          referenceAsset: primaryImage,
          referenceImages,
          association: 'reviewed_consultation_mapping',
        },
        referenceImage: primaryImage,
        relations,
        gaps: unique(gaps),
        reviewedAt,
        conditions,
        counts: {
          acts: new Set(allRecords.map((record) => record.canonicalId)).size,
          requirements: new Set(allRecords.flatMap((record) => record.requirementIds)).size,
          componentActs: new Set(
            relations
              .filter((relation) => relation.kind === 'component')
              .flatMap((relation) =>
                relation.topics.flatMap((topic) =>
                  topic.records.map((record) => record.canonicalId),
                ),
              ),
          ).size,
          vehicleActs: new Set(
            relations
              .filter((relation) => relation.kind === 'vehicle')
              .flatMap((relation) =>
                relation.topics.flatMap((topic) =>
                  topic.records.map((record) => record.canonicalId),
                ),
              ),
          ).size,
        },
        assessment: {
          state: 'requires_assessment',
          automaticObligation: false,
          note: 'A seleção 3D recupera vínculos revisados de consulta. Categoria, propulsão, massas, datas, uso e configuração precisam ser confrontados com o dispositivo; o modelo visual não certifica o veículo nem uma peça.',
        },
      };
    };
  }
  return { create, records, legacyPartIds };
})();

if (typeof module !== 'undefined') module.exports = GuideTraceability;
