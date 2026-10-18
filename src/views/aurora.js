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
function auroraFocusLink(component) {
  return (
    '#vehicle?' +
    new URLSearchParams({
      focus: component.id,
      type: $('#vehicleType').value,
      powertrain: $('#powertrain').value,
    })
  );
}
function auroraPanel(component) {
  const subsystems = ComponentFlow.subsystems(component, catalog.metadata.hierarchy);
  const ordered =
    component.id === 'bancos'
      ? [
          subsystems.find((s) => s.id === 'ocupantes/cintos'),
          subsystems.find((s) => s.id === 'ocupantes/airbag'),
          subsystems.find((s) => s.id === 'ocupantes/materiais'),
        ].filter(Boolean)
      : subsystems.slice(0, 3);
  const topics = ComponentFlow.topics(component, catalog.metadata.hierarchy);
  const topic = topics[0]?.topics?.[0];
  const linked =
    (topic?.recordIds || []).map((id) => catalog.records.find((r) => r.id === id)).find(Boolean) ||
    catalog.records.find((r) => componentMatches(r, component.taxonomy));
  const lane = topics[0];
  return `<aside class="aurora-explorer" aria-label="Subsistemas de ${esc(component.label)}">
    <header class="aurora-explorer-heading">${auroraIcon('shield')}<div><h2>${esc(component.label)}</h2><p>Sistema <span>→</span> Subsistema <span>→</span> Requisito</p></div></header>
    <div class="aurora-subsystem-list">${ordered.map((sub, i) => `<a class="aurora-subsystem ${i === 0 ? 'emphasis' : ''}" href="${esc(vehicleLink(component, null, sub.id))}"><span class="aurora-subsystem-art">${subsystemArt(sub)}</span><span><strong>${esc(sub.label)}</strong><small>Explorar referências e condições</small></span><b aria-hidden="true">›</b></a>`).join('')}</div>
    <p class="aurora-panel-label">Percurso regulatório</p>
    <ol class="aurora-mini-tree"><li><a href="${esc(vehicleLink(component, lane?.id))}">${auroraIcon('shield')}${esc(lane?.label || 'Referências')}</a></li><li><a href="${esc(vehicleLink(component, lane?.id))}">${auroraIcon('book')}${esc(topic?.label || 'Subsistemas associados')}</a></li><li><a href="${esc(vehicleLink(component))}">${auroraIcon('book')}Referências e requisitos</a></li></ol>
    ${linked ? `<button class="aurora-reference" data-open="${esc(linked.id)}">${auroraIcon('book')}<span><strong>${esc(linked.title)}</strong><small>Consultar fonte e condições de aplicação</small></span><span aria-hidden="true">↗</span></button>` : '<p class="aurora-reference">Nenhuma referência associada neste recorte.</p>'}
    <div class="aurora-applicability">${auroraIcon('shield')}<div><strong>Aplicabilidade a avaliar</strong><small>Confira o escopo e as condições de cada norma.</small></div></div>
    <a class="aurora-primary" href="${esc(vehicleLink(component))}">Explorar fluxograma ${auroraIcon('arrow')}</a>
    <p class="aurora-panel-foot">${subsystems.length} subsistemas · fontes oficiais para consulta</p>
  </aside>`;
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
    ComponentFlow.component(query.get('focus')) || ComponentFlow.component('bancos');
  vehicleUI.component = null;
  vehicleUI.lane = null;
  vehicleUI.subsystem = null;
  vehicleUI.zoom = 1;
  $('#app').classList.add('aurora-home', 'vehicle-overview-mode');
  $('#app').classList.remove('tree-mode', 'vehicle-flow-mode', 'contran-mode');
  const all = query.get('all') === '1';
  const directory = all
    ? vehicleComponents
    : ['motor', 'freios', 'iluminacao', 'pneus-rodas', 'eletrica', 'identificacao'].map((id) =>
        ComponentFlow.component(id),
      );
  const focusLabel = ComponentFlow.topics(component, catalog.metadata.hierarchy)
    .map((l) => l.label)
    .join(' · ');
  $('#main').innerHTML =
    `<div class="aurora-overview-grid"><section class="aurora-vehicle-column" aria-label="Exploração visual do veículo">
    <header class="aurora-heading"><h1>Do veículo à legislação.</h1><p>Selecione um sistema para explorar requisitos e fontes oficiais.</p></header>
    <nav class="aurora-breadcrumb" aria-label="Seleção atual">${auroraIcon('home')}<span>Veículo</span><span>›</span><strong>${esc(component.label)}</strong></nav>
    <div class="aurora-car-glass">${vehicleMap()}<div class="aurora-selection-caption">${auroraIcon('shield')}<div><strong>${esc(component.label)}</strong><small>${esc(focusLabel)}</small></div><span>Selecionado</span></div></div>
    <p class="aurora-original-note">Ilustração conceitual · selecione no desenho ou nos cartões</p>
  </section>${auroraPanel(component)}</div>
  <section class="aurora-directory" aria-labelledby="auroraDirectory"><header><div><h2 id="auroraDirectory">Explore os sistemas</h2><span>11 sistemas · 30 subsistemas</span></div><a href="${esc(auroraFocusLink(component) + (all ? '' : '&all=1'))}">${all ? 'Mostrar principais' : 'Ver todos os sistemas'} →</a></header><div class="aurora-directory-grid ${all ? 'expanded' : ''}">${directory
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
    )}</div></section><footer class="aurora-page-foot">Liquid Aurora · Legislação Automotiva <span>Referências oficiais · aplicabilidade por projeto</span></footer>`;
  $('#main')
    .querySelectorAll('#vehicleDrawing [data-component-link]')
    .forEach((link) => {
      const c = ComponentFlow.component(link.dataset.componentLink);
      link.setAttribute('href', auroraFocusLink(c));
      link.classList.toggle('aurora-selected', c.id === component.id);
      link.setAttribute('aria-current', c.id === component.id ? 'true' : 'false');
    });
  setupComponentHover();
}
// Keep all original routes and regulatory data; add the theme shell before bootstrap.
if (!location.hash) history.replaceState(null, '', '#vehicle?focus=bancos');
document.documentElement.classList.add('liquid-aurora');
$('.brand').innerHTML =
  '<svg class="aurora-logo" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 5 5 40h17l6-11M28 13l15 27H27l-7-12" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><strong>Legislação<br> Automotiva</strong>';
$('.brand').setAttribute('href', '#vehicle');
$('.brand-pill').textContent = 'Liquid Aurora';
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
$('.topbar').insertAdjacentHTML(
  'beforeend',
  '<button class="aurora-theme-control" data-aurora-theme aria-pressed="false"><span class="aurora-orb"></span><span>Liquid Aurora</span><span aria-hidden="true">⌄</span></button>',
);
$('.sidebar').insertAdjacentHTML(
  'beforeend',
  `<div class="aurora-sidebar-bottom">${auroraIcon('gear')}<span>Tema</span><button data-aurora-theme aria-pressed="false"><span class="aurora-orb"></span>Liquid Aurora</button></div>`,
);
document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-aurora-theme]')) return;
  const soft = document.documentElement.classList.toggle('aurora-soft');
  document.querySelectorAll('[data-aurora-theme]').forEach((button) => {
    button.setAttribute('aria-pressed', String(soft));
    button.title = soft
      ? 'Reflexos suaves — clique para intensificar'
      : 'Reflexos intensos — clique para suavizar';
  });
});
