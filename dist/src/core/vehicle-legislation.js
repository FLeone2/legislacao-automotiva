'use strict';

// Geometry, editorial associations and legal status have independent owners.
// This helper resolves explicit associations; it never infers applicability.
const VehicleLegislation = (() => {
  const relationIds = ['component', 'vehicle'];
  const laneIds = ['seguranca', 'ambiental'];
  const key = (record) => record.regulatoryId || record.id;
  const topicKey = (topic) =>
    topic.id?.startsWith(topic.relation + ':') ? topic.id : `${topic.relation}:${topic.id}`;

  function unique(records) {
    const found = new Map();
    for (const record of records) {
      const id = key(record);
      if (!id) continue;
      const previous = found.get(id);
      if (!previous) {
        found.set(id, { ...record });
        continue;
      }
      const merged = { ...previous };
      if (previous.vehicleMappingLinks || record.vehicleMappingLinks) {
        const links = [
          ...(previous.vehicleMappingLinks || []),
          ...(record.vehicleMappingLinks || []),
        ];
        merged.vehicleMappingLinks = [
          ...new Map(links.map((link) => [JSON.stringify(link), link])).values(),
        ];
      }
      if (
        previous.vehicleRequirementIds !== undefined &&
        record.vehicleRequirementIds !== undefined
      ) {
        merged.vehicleRequirementIds = [
          ...new Set([...previous.vehicleRequirementIds, ...record.vehicleRequirementIds]),
        ];
      } else delete merged.vehicleRequirementIds;
      found.set(id, merged);
    }
    return [...found.values()];
  }

  function create(data) {
    if (data?.schemaVersion !== 1 || !Array.isArray(data.parts))
      throw new TypeError('Invalid vehicle legislation mapping');
    const byId = new Map();
    for (const entry of data.parts) {
      if (!entry.id || !entry.componentId || !Array.isArray(entry.topics) || byId.has(entry.id))
        throw new TypeError('Invalid or duplicate vehicle part mapping');
      const topicIds = new Set();
      for (const topic of entry.topics) {
        const topicId = topicKey(topic);
        if (
          !topic.id ||
          !topic.label ||
          !relationIds.includes(topic.relation) ||
          !laneIds.includes(topic.lane) ||
          !Array.isArray(topic.links) ||
          (topic.gaps !== undefined && !Array.isArray(topic.gaps)) ||
          topicIds.has(topicId)
        )
          throw new TypeError('Invalid or duplicate vehicle legislation topic');
        topicIds.add(topicId);
        for (const link of topic.links) {
          if (
            !link.actId ||
            (link.requirementIds !== undefined &&
              (!Array.isArray(link.requirementIds) ||
                link.requirementIds.some((id) => typeof id !== 'string' || !id)))
          )
            throw new TypeError('Invalid explicit vehicle legislation link');
        }
      }
      byId.set(entry.id, entry);
    }

    function part(partId, componentId) {
      const entry = byId.get(partId);
      return entry && (!componentId || entry.componentId === componentId) ? entry : null;
    }

    function topics(partId, options = {}) {
      return (part(partId)?.topics || [])
        .filter(
          (topic) =>
            (!options.subsystemId || topic.subsystemId === options.subsystemId) &&
            (!options.lane || topic.lane === options.lane) &&
            (!options.relation || topic.relation === options.relation),
        )
        .map((topic) => ({
          ...topic,
          sourceId: topic.id,
          id: topicKey(topic),
          partId,
        }));
    }

    function recordsForTopic(topic, catalogRecords) {
      if (!Array.isArray(topic?.links)) return [];
      return unique(
        topic.links.flatMap((link) =>
          catalogRecords
            .filter((record) => link.actId === key(record) || link.actId === record.id)
            .map((record) => ({
              ...record,
              vehicleMappingLinks: [
                {
                  ...link,
                  partId: topic.partId,
                  topicId: topic.id,
                  topicLabel: topic.label,
                  subsystemId: topic.subsystemId,
                  lane: topic.lane,
                  relation: topic.relation,
                },
              ],
              // Missing specific references mean no reviewed requirement association.
              // Undefined on an ordinary catalog record continues to mean unfiltered.
              vehicleRequirementIds: [...new Set(link.requirementIds || [])],
            })),
        ),
      );
    }

    function records(partId, catalogRecords, options = {}) {
      return unique(
        topics(partId, options).flatMap((topic) => recordsForTopic(topic, catalogRecords)),
      );
    }

    function subsystems(partId, hierarchy) {
      const ids = new Set(
        topics(partId)
          .map((topic) => topic.subsystemId)
          .filter(Boolean),
      );
      return hierarchy.flatMap((system) =>
        (system.children || [])
          .filter((subsystem) => ids.has(subsystem.id))
          .map((subsystem) => ({ id: subsystem.id, label: subsystem.label, system: system.id })),
      );
    }

    function matchesRecord(partId, record, options = {}) {
      return records(partId, [record], options).length > 0;
    }

    function relations(partId, catalogRecords, options = {}) {
      return relationIds
        .map((id) => ({
          id,
          topics: topics(partId, { ...options, relation: id }).length,
          references: records(partId, catalogRecords, { ...options, relation: id }).length,
        }))
        .filter((relation) => relation.topics > 0);
    }

    return { part, topics, recordsForTopic, records, subsystems, matchesRecord, relations, unique };
  }

  let cachedData;
  let cachedResolver;
  function resolver() {
    const data = typeof VehicleLegislationData === 'undefined' ? null : VehicleLegislationData;
    if (!data) throw new Error('Vehicle legislation data is not loaded');
    if (cachedData !== data) {
      cachedResolver = create(data);
      cachedData = data;
    }
    return cachedResolver;
  }

  const api = { create, unique };
  for (const name of [
    'part',
    'topics',
    'recordsForTopic',
    'records',
    'subsystems',
    'matchesRecord',
    'relations',
  ])
    api[name] = (...args) => resolver()[name](...args);
  return api;
})();

if (typeof module !== 'undefined') module.exports = VehicleLegislation;
