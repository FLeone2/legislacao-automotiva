'use strict';
function requirementNodesForRecord(record, parentId) {
  return (record.requirements || [])
    .filter(
      (requirement) =>
        (record.activityRequirementIds === undefined ||
          record.activityRequirementIds.includes(requirement.id)) &&
        (record.vehicleRequirementIds === undefined ||
          record.vehicleRequirementIds.includes(requirement.id)),
    )
    .map((requirement) => ({
      id: parentId + ':requirement:' + requirement.id,
      label: requirement.title,
      subtitle: requirement.clause,
      icon: '§',
      kind:
        requirement.provision?.kind === 'official_guidance'
          ? 'Orientação oficial vinculada'
          : 'Requisito com fonte',
      recordId: record.id,
      recordIds: [record.id],
      requirementId: requirement.id,
      text: requirement.rule,
    }));
}
function requirementContextLinks(requirement) {
  if (!requirement.context) return '';
  const vehicle = requirement.context.vehicleLinks.map((link) => {
    const component = ComponentFlow.component(link.componentId);
    return component
      ? `<a data-close-reference href="${esc(vehicleLink(component, null, link.subsystemId))}">${esc(component.label)} →</a>`
      : '';
  });
  const activities = requirement.context.activities.map((link) => {
    const q = new URLSearchParams({
      stage: link.stageId,
      node: `flow:${link.stageId}:${link.activityId}`,
    });
    return `<a data-close-reference href="#flow?${q}">${esc(link.stageLabel)} · ${esc(link.activityLabel)} →</a>`;
  });
  return `<details class="requirement-context"><summary>Consultar este ato no veículo e no fluxo</summary><p>${esc(requirement.context.note)}</p><div class="requirement-context-links">${[...new Set([...vehicle, ...activities])].join('')}</div></details>`;
}
if (typeof module !== 'undefined') module.exports = { requirementNodesForRecord };
