'use strict';
// Official Liquid Aurora theme. Original illustrations, SVG paths and sources are retained.
const auroraIcons = {
  car: '<path d="m5 8 2-4h10l2 4M4 9h16v8H4zM6 17v3m12-3v3M7 12h2m6 0h2"/>',
  flow: '<rect x="8" y="2" width="8" height="5" rx="1"/><path d="M12 7v5M5 16v-4h14v4"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/>',
  tree: '<path d="M12 3v7m-7 3v-3h14v3M5 17v4m14-4v4"/><circle cx="12" cy="3" r="2"/><circle cx="5" cy="15" r="2"/><circle cx="19" cy="15" r="2"/>',
  book: '<path d="M4 3h11l5 5v13H4zM15 3v6h5M8 13h8m-8 4h8"/>',
  tag: '<path d="m3 13 10-10h7v7L10 20z"/><circle cx="16" cy="7" r="1"/>',
  shield: '<path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chart: '<path d="M4 20V10h4v10m4 0V4h4v16m4 0V8h2v12"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  gear: '<path d="m9 3-1 3-3 1 1 3-3 2 3 2-1 3 3 1 1 3 3-1 3 1 1-3 3-1-1-3 3-2-3-2 1-3-3-1-1-3-3 1z"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="m3 10 9-7 9 7M6 9v12h12V9m-8 12v-7h4v7"/>',
};
function auroraIcon(id, className = '') {
  return `<svg class="aurora-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${auroraIcons[id] || auroraIcons.book}</svg>`;
}
const originalVehicleRenderer = renderVehicle;
renderVehicle = function () {
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
function auroraPanel(component, selectedPart) {
  const subsystems = ComponentFlow.subsystems(component, catalog.metadata.hierarchy);
  const count = selectedPart
    ? VehicleLegislation.records(selectedPart.id, catalog.records).length
    : null;
  return `<aside class="aurora-explorer" aria-label="Subsistemas de ${esc(component.label)}">
    <header class="aurora-explorer-heading"><div><h2>${esc(component.label)}</h2>${selectedPart ? `<span class="vehicle-part-name">${esc(selectedPart.label)}</span>` : ''}</div></header>
    <div class="vehicle-part-picker"><label class="sr-only" for="vehiclePartSelect">Selecionar conjunto</label><select id="vehiclePartSelect"><option value="">Selecionar conjunto</option>${vehicleComponents
      .filter((c) => c.mapParts.length)
      .map(
        (c) =>
          `<optgroup label="${esc(c.label)}">${c.mapParts.map((part) => `<option value="${esc(part.id)}" ${selectedPart?.id === part.id ? 'selected' : ''}>${esc(part.label)}</option>`).join('')}</optgroup>`,
      )
      .join('')}</select></div>
    ${selectedPart ? `<p class="vehicle-reference-count" role="status">${count ? `${count} ${count === 1 ? 'referência associada' : 'referências associadas'}` : 'Sem referência específica cadastrada'}</p>${auroraPartTopics(component, selectedPart)}` : `<div class="aurora-subsystem-list">${subsystems.map((sub) => `<a class="aurora-subsystem" href="${esc(vehicleLink(component, null, sub.id))}"><span class="aurora-subsystem-art">${subsystemArt(sub)}</span><strong>${esc(sub.label)}</strong></a>`).join('')}</div>`}
    <a class="aurora-primary" href="${esc(vehicleLink(component))}">Ver referências ${auroraIcon('arrow')}</a>
    <a class="aurora-library-link" href="${esc(libraryRoute(selectedPart ? { part: selectedPart.id } : { component: component.taxonomy }))}">${selectedPart ? 'Biblioteca deste conjunto' : 'Biblioteca do sistema'} →</a>
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
    ComponentFlow.component(VehicleLegislation.part(query.get('part'))?.componentId) ||
    ComponentFlow.component('bancos');
  const selectedPart = vehicleVector.parts.find(
    (part) => part.id === query.get('part') && part.componentId === component.id,
  );
  if (query.has('part') && !selectedPart) return renderInvalidVehiclePart();
  vehicleUI.component = null;
  vehicleUI.lane = null;
  vehicleUI.subsystem = null;
  vehicleUI.zoom = 1;
  $('#app').classList.add('aurora-home', 'vehicle-overview-mode');
  $('#app').classList.remove('tree-mode', 'vehicle-flow-mode', 'contran-mode');
  const all = query.get('all') === '1';
  const directoryLink = new URLSearchParams(auroraFocusLink(component).split('?')[1]);
  if (all) directoryLink.delete('all');
  else directoryLink.set('all', '1');
  const directory = all
    ? vehicleComponents
    : ['motor', 'freios', 'iluminacao', 'pneus-rodas', 'eletrica', 'bateria'].map((id) =>
        ComponentFlow.component(id),
      );
  const focusLabel = ComponentFlow.topics(component, catalog.metadata.hierarchy)
    .map((l) => l.label)
    .join(' · ');
  $('#main').innerHTML =
    `<div class="aurora-overview-grid"><section class="aurora-vehicle-column" aria-label="Exploração visual do veículo">
    <header class="aurora-heading"><h1 tabindex="-1">Sistemas do veículo</h1></header>
    <nav class="aurora-breadcrumb" aria-label="Seleção atual">${auroraIcon('home')}<span>Veículo</span><span>›</span><strong>${esc(component.label)}</strong></nav>
    <div class="aurora-car-glass">${vehicleMap()}<div class="aurora-selection-caption">${auroraIcon('shield')}<div><strong>${esc(component.label)}</strong><small>${esc(focusLabel)}</small></div><span>Selecionado</span></div></div>
    <p class="aurora-original-note">Ilustração conceitual · selecione no desenho ou nos cartões</p>
  </section>${auroraPanel(component, selectedPart)}</div>
  <section class="aurora-directory" aria-labelledby="auroraDirectory"><header><div><h2 id="auroraDirectory">Sistemas</h2><span>${vehicleVector.parts.length} conjuntos · 30 subsistemas</span></div><a href="${esc('#vehicle?' + directoryLink)}">${all ? 'Mostrar principais' : 'Ver todos os sistemas'} →</a></header><div class="aurora-directory-grid ${all ? 'expanded' : ''}">${directory
    .map(
      (c) =>
        `<a data-aurora-component="${esc(c.id)}" class="aurora-system-card ${component.id === c.id ? 'selected' : ''}" href="${esc(auroraFocusLink(c))}"><div class="aurora-system-art">${componentArt(c)}</div><strong>${esc(c.label)}</strong><small>${esc(
          ComponentFlow.topics(c, catalog.metadata.hierarchy)
            .map((l) => l.label)
            .join(' · '),
        )}</small></a>`,
    )
    .join(
      '',
    )}</div></section><details class="vehicle-other-topics"><summary>Outros assuntos do acervo</summary><nav aria-label="Assuntos sem região própria na ilustração"><a href="#vehicle?component=eletrica&subsystem=eletronica/imagens">Rádio e multimídia</a><a href="#markings">Etiquetas e VIN</a><a href="#flow">Homologação e COP</a><a href="#mover">MOVER e eficiência</a><a href="#library">Todo o acervo</a></nav></details>`;
  $('#main')
    .querySelectorAll('#vehicleDrawing [data-component-link]')
    .forEach((link) => {
      const c = ComponentFlow.component(link.dataset.componentLink);
      link.setAttribute('href', auroraFocusLink(c, link.dataset.mapPart));
      const selected = selectedPart
        ? link.dataset.mapPart === selectedPart.id
        : c.id === component.id;
      link.classList.toggle('aurora-selected', selected);
      link.setAttribute('aria-current', selected ? 'true' : 'false');
    });
  setupComponentHover();
  $('#vehiclePartSelect').addEventListener('change', (event) => {
    const part = vehicleVector.parts.find((item) => item.id === event.target.value);
    if (!part) return;
    goVehicle(auroraFocusLink(ComponentFlow.component(part.componentId), part.id));
    $('#vehiclePartSelect')?.focus({ preventScroll: true });
  });
}
// Keep all original routes and regulatory data; add the theme shell before bootstrap.
if (!location.hash) history.replaceState(null, '', '#vehicle?focus=bancos');
document.documentElement.classList.add('liquid-aurora');
$('.brand').innerHTML =
  '<svg class="aurora-logo" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 5 5 40h17l6-11M28 13l15 27H27l-7-12" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><strong>Legislação<br> Automotiva</strong>';
$('.brand').setAttribute('href', '#vehicle');
$('.brand-pill').textContent = 'Legislação';
const navIconMap = {
  vehicle: 'car',
  flow: 'flow',
  tree: 'tree',
  library: 'book',
  markings: 'tag',
  mover: 'chart',
  updates: 'clock',
};
for (const [view, icon] of Object.entries(navIconMap)) {
  const link = document.querySelector(`[data-nav="${view}"]`);
  const span = link?.querySelector('span');
  if (span) span.outerHTML = auroraIcon(icon);
}
$('.nav-source-group').open = true;
document.querySelector('[data-navigation-group="programas"] .nav-group-label').textContent =
  'Acompanhamento';
$('.topbrand').setAttribute('href', '#vehicle');
