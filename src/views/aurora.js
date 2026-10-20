'use strict';
// Obsidian overview; stable routes, supplied geometry and canonical relationships.
const originalVehicleRenderer = renderVehicle;
renderVehicle = function () {
  preserveVisualProfile();
  const query = new URLSearchParams(location.hash.split('?')[1] || '');
  if (query.has('component')) return originalVehicleRenderer();
  renderAuroraOverview(query);
};
function auroraFocusLink(component, partId) {
  return (
    '#vehicle?' +
    new URLSearchParams({
      focus: component.id,
      type: $('#vehicleType').value,
      powertrain: $('#powertrain').value,
      ...(vehicleVector.parts.some(
        (part) => part.id === partId && part.componentId === component.id,
      )
        ? { part: partId }
        : {}),
      ...(new URLSearchParams(location.hash.split('?')[1] || '').get('all') === '1'
        ? { all: '1' }
        : {}),
    })
  );
}
function vehiclePartPicker(selectedPart) {
  return `<div class="vehicle-part-picker"><label class="sr-only" for="vehiclePartSelect">Selecionar conjunto</label><select id="vehiclePartSelect"><option value="">Selecionar conjunto</option>${vehicleComponents
    .filter((c) => c.mapParts.length)
    .map(
      (c) =>
        `<optgroup label="${esc(c.label)}">${c.mapParts.map((part) => `<option value="${esc(part.id)}" ${selectedPart?.id === part.id ? 'selected' : ''}>${esc(part.label)}</option>`).join('')}</optgroup>`,
    )
    .join('')}</select></div>`;
}
function auroraPanel(component, selectedPart) {
  if (!component)
    return `<aside class="aurora-explorer aurora-explorer-empty glass" aria-label="Seleção de sistema"><div class="inspector-meta"><span role="status">Nenhum sistema selecionado</span></div><header class="aurora-explorer-heading"><h2>Selecione um sistema</h2></header>${vehiclePartPicker(null)}</aside>`;
  const subsystems = ComponentFlow.subsystems(component, catalog.metadata.hierarchy);
  const records = selectedPart
    ? VehicleLegislation.records(selectedPart.id, catalog.records)
    : [
        ...new Map(
          ComponentFlow.topics(component, catalog.metadata.hierarchy)
            .flatMap((lane) => lane.topics)
            .flatMap((topic) => ComponentFlow.records(topic, catalog.records))
            .concat(
              activeVehicleRecords(component, null, 'seguranca'),
              activeVehicleRecords(component, null, 'ambiental'),
            )
            .map((record) => [catalogIdentity(record), record]),
        ).values(),
      ];
  const count = records.length;
  return `<aside class="aurora-explorer glass" aria-label="Subsistemas de ${esc(component.label)}">
    <div class="inspector-meta"><span>Sistema selecionado</span><p class="vehicle-reference-count" role="status">${count ? `${count} ${count === 1 ? 'referência associada' : 'referências associadas'}` : 'Sem referência específica cadastrada'}</p></div>
    <header class="aurora-explorer-heading"><div><h2>${esc(component.label)}</h2>${selectedPart ? `<span class="vehicle-part-name">${esc(selectedPart.label)}</span>` : ''}</div></header>
    <div class="inspector-content">
    <div class="inspector-references">${records
      .slice(0, 3)
      .map(
        (record) =>
          `<button class="inspector-reference" data-open="${esc(record.id)}"><strong>${esc(record.title)}</strong>${auroraIcon('arrow')}<small>${esc((record.taxonomy || []).map(systemLabel).slice(0, 2).join(' · ') || record.issuer || record.agency)}</small></button>`,
      )
      .join('')}</div>
    ${vehiclePartPicker(selectedPart)}
    <details class="inspector-topics" open><summary>Subsistemas e assuntos</summary>${selectedPart ? auroraPartTopics(component, selectedPart) : `<div class="aurora-subsystem-list">${subsystems.map((sub) => `<a class="aurora-subsystem" href="${esc(vehicleLink(component, null, sub.id))}"><span class="aurora-subsystem-art">${subsystemArt(sub)}</span><strong>${esc(sub.label)}</strong></a>`).join('')}</div>`}</details>
    <a class="aurora-library-link" href="${esc(libraryRoute(selectedPart ? { part: selectedPart.id } : { component: component.taxonomy }))}">${selectedPart ? 'Biblioteca deste conjunto' : 'Biblioteca do sistema'} →</a>
    </div><footer class="inspector-footer"><p>Confira âmbito, alterações e profundidade de revisão na ficha de cada ato.</p><a class="aurora-primary" href="${esc(vehicleLink(component))}">Abrir referências ${auroraIcon('arrow')}</a></footer>
  </aside>`;
}
function auroraPartTopics(component, part) {
  const topics = VehicleLegislation.topics(part.id);
  const hierarchy = catalog.metadata.hierarchy;
  return ['component', 'vehicle']
    .map((relation) => {
      const related = topics.filter((topic) => topic.relation === relation);
      if (!related.length) return '';
      return `<section class="vehicle-reference-group" aria-label="${relation === 'component' ? 'Sobre este conjunto' : 'Contexto do veículo'}"><h3>${relation === 'component' ? 'Sobre este conjunto' : 'Contexto do veículo'}</h3><div class="aurora-subsystem-list">${related
        .map((topic) => {
          const subsystem = hierarchy
            .flatMap((system) => system.children.map((sub) => ({ ...sub, system: system.id })))
            .find((sub) => sub.id === topic.subsystemId);
          const records = VehicleLegislation.recordsForTopic(topic, catalog.records);
          return `<a class="aurora-subsystem vehicle-topic-card" data-part-topic="${esc(topic.id)}" href="${esc(vehicleTopicLink(component, part, topic))}"><span class="aurora-subsystem-art">${subsystem && component.id !== 'eletrica' ? subsystemArt(subsystem) : `<img src="${esc(part.displayAsset || part.asset)}" alt="">`}</span><span><strong>${esc(topic.label)}</strong><small>${records.length ? `${records.length} ${records.length === 1 ? 'referência' : 'referências'}` : 'Mapeamento pendente'}</small></span></a>`;
        })
        .join('')}</div></section>`;
    })
    .join('');
}
function renderAuroraOverview(query) {
  for (const [key, id] of [
    ['type', 'vehicleType'],
    ['powertrain', 'powertrain'],
  ]) {
    const value = query.get(key);
    const select = document.getElementById(id);
    if (value && [...select.options].some((option) => option.value === value)) select.value = value;
  }
  const component =
    ComponentFlow.component(query.get('focus')) ||
    ComponentFlow.component(VehicleLegislation.part(query.get('part'))?.componentId);
  const selectedPart = vehicleVector.parts.find(
    (part) => part.id === query.get('part') && part.componentId === component?.id,
  );
  if (query.has('part') && !selectedPart) return renderInvalidVehiclePart();
  vehicleUI.component = null;
  vehicleUI.part = selectedPart?.id || null;
  vehicleUI.lane = null;
  vehicleUI.subsystem = null;
  vehicleUI.zoom = 1;
  $('#app').classList.add('aurora-home', 'vehicle-overview-mode');
  $('#app').classList.remove('tree-mode', 'vehicle-flow-mode', 'contran-mode');
  const all = query.get('all') === '1';
  const directoryLink = new URLSearchParams(query);
  if (all) directoryLink.delete('all');
  else directoryLink.set('all', '1');
  const directory = all
    ? vehicleComponents
    : ['motor', 'freios', 'iluminacao', 'pneus-rodas', 'eletrica', 'bateria'].map((id) =>
        ComponentFlow.component(id),
      );
  $('#main').innerHTML =
    `<header class="obsidian-page-head"><div><h1 tabindex="-1">Explore o veículo.</h1><p>Selecione um sistema. Consulte suas referências.</p></div><span class="view-switch">Veículo genérico · Vista explodida</span></header><div id="vehicleProfileMount"></div>
    <div class="aurora-overview-grid"><section class="aurora-vehicle-column" aria-label="Exploração visual do veículo">
    <div class="aurora-car-glass">${vehicleMap()}${component?.mapParts.length ? `<div class="vehicle-selection-label glass" aria-hidden="true"><span class="selection-pin"></span><span>${esc(selectedPart?.label || component.label)}</span></div>` : ''}</div>
  </section>${auroraPanel(component, selectedPart)}</div>
  <section class="aurora-directory" aria-labelledby="auroraDirectory"><header><h2 id="auroraDirectory" class="sr-only">Sistemas</h2><a href="${esc('#vehicle?' + directoryLink)}">${all ? 'Principais' : 'Todos'}</a></header><div class="aurora-directory-grid ${all ? 'expanded' : ''}">${directory
    .map(
      (c) =>
        `<a data-aurora-component="${esc(c.id)}" class="aurora-system-card ${component?.id === c.id ? 'selected' : ''}" href="${esc(auroraFocusLink(c))}" ${component?.id === c.id ? 'aria-current="true"' : ''}>${esc(c.label)}</a>`,
    )
    .join(
      '',
    )}</div><a class="vehicle-flow-shortcut" href="#flow">Ver fluxo de homologação ${auroraIcon('arrow')}</a></section><footer class="transversal"><span>Além dos componentes</span><a href="#mover">MOVER</a><a href="#flow?stage=cop">Conformidade de produção</a><a href="#proconve?guide=importacao-lpco">Importação e registro</a><details class="vehicle-other-topics"><summary>Outros assuntos</summary><nav aria-label="Assuntos sem região própria na ilustração"><a href="#vehicle?component=eletrica&subsystem=eletronica/imagens">Rádio e multimídia</a><a href="#markings">Etiquetas e VIN</a><a href="#tree">Árvore regulatória</a><a href="#library">Todo o acervo</a></nav></details><a class="transversal-last" href="#updates">Fontes e revisões</a></footer>`;
  document.querySelector('.aurora-car-glass').after(document.querySelector('.vehicle-drawing-bar'));
  mountVisualProfile();
  $('#main')
    .querySelectorAll('#vehicleDrawing [data-component-link]')
    .forEach((link) => {
      const c = ComponentFlow.component(link.dataset.componentLink);
      link.setAttribute('href', auroraFocusLink(c, link.dataset.mapPart));
      const selected = selectedPart
        ? link.dataset.mapPart === selectedPart.id
        : c.id === component?.id;
      link.classList.toggle('aurora-selected', selected);
      link.setAttribute('aria-current', selected ? 'true' : 'false');
    });
  setupComponentHover();
  setupVehicleSelectionPin(selectedPart || component?.mapParts[0]);
  $('#vehiclePartSelect').addEventListener('change', (event) => {
    const part = vehicleVector.parts.find((item) => item.id === event.target.value);
    if (!part) {
      if (event.target.value) return;
      const next = new URLSearchParams(location.hash.split('?')[1] || '');
      next.delete('focus');
      next.delete('part');
      goVehicle('#vehicle' + (next.size ? '?' + next : ''));
      $('#vehiclePartSelect')?.focus({ preventScroll: true });
      return;
    }
    goVehicle(auroraFocusLink(ComponentFlow.component(part.componentId), part.id));
    $('#vehiclePartSelect')?.focus({ preventScroll: true });
  });
}
let vehicleSelectionObserver;
let vehicleSelectionPoint;
function updateVehicleSelectionPin() {
  const label = document.querySelector('.vehicle-selection-label');
  const svg = document.getElementById('vehicleDrawing');
  if (!label || !svg || !vehicleSelectionPoint) return;
  const point = svg.createSVGPoint();
  [point.x, point.y] = vehicleSelectionPoint;
  const screen = point.matrixTransform(document.getElementById('vehicleLayer').getScreenCTM());
  const bounds = label.parentElement.getBoundingClientRect();
  label.style.left = `${Math.min(bounds.width - label.offsetWidth - 8, Math.max(20, screen.x - bounds.left + 12))}px`;
  label.style.top = `${Math.min(bounds.height - 76, Math.max(12, screen.y - bounds.top))}px`;
}
function setupVehicleSelectionPin(part) {
  vehicleSelectionObserver?.disconnect();
  vehicleSelectionPoint = part?.testPoint;
  if (!part) return;
  const stage = document.querySelector('.aurora-car-glass');
  vehicleSelectionObserver = new ResizeObserver(updateVehicleSelectionPin);
  vehicleSelectionObserver.observe(stage);
  updateVehicleSelectionPin();
}
// Stable entry route; the shell and the illustration use the same catalog.
if (!location.hash) history.replaceState(null, '', '#vehicle');
