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
      ...(new URLSearchParams(location.hash.split('?')[1] || '').get('all') === '1'
        ? { all: '1' }
        : {}),
    })
  );
}
function auroraPanel(component) {
  const subsystems = ComponentFlow.subsystems(component, catalog.metadata.hierarchy);
  return `<aside class="aurora-explorer" aria-label="Subsistemas de ${esc(component.label)}">
    <header class="aurora-explorer-heading"><h2>${esc(component.label)}</h2></header>
    <div class="aurora-subsystem-list">${subsystems.map((sub) => `<a class="aurora-subsystem" href="${esc(vehicleLink(component, null, sub.id))}"><span class="aurora-subsystem-art">${subsystemArt(sub)}</span><strong>${esc(sub.label)}</strong></a>`).join('')}</div>
    <a class="aurora-primary" href="${esc(vehicleLink(component))}">Ver referências ${auroraIcon('arrow')}</a>
    <a class="aurora-library-link" href="${esc(libraryRoute({ component: component.taxonomy }))}">Biblioteca do sistema →</a>
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
  const directoryLink = new URLSearchParams(auroraFocusLink(component).split('?')[1]);
  if (all) directoryLink.delete('all');
  else directoryLink.set('all', '1');
  const directory = all
    ? vehicleComponents
    : ['motor', 'freios', 'iluminacao', 'pneus-rodas', 'eletrica', 'identificacao'].map((id) =>
        ComponentFlow.component(id),
      );
  const focusLabel = ComponentFlow.topics(component, catalog.metadata.hierarchy)
    .map((l) => l.label)
    .join(' · ');
  const coverage = ComponentFlow.coverage(catalog.metadata.hierarchy);
  $('#main').innerHTML =
    `<div class="aurora-overview-grid"><section class="aurora-vehicle-column" aria-label="Exploração visual do veículo">
    <header class="aurora-heading"><h1>Sistemas do veículo</h1></header>
    <nav class="aurora-breadcrumb" aria-label="Seleção atual">${auroraIcon('home')}<span>Veículo</span><span>›</span><strong>${esc(component.label)}</strong></nav>
    <div class="aurora-car-glass">${vehicleMap()}<div class="aurora-selection-caption">${auroraIcon('shield')}<div><strong>${esc(component.label)}</strong><small>${esc(focusLabel)}</small></div><span>Selecionado</span></div></div>
    <p class="aurora-original-note">Ilustração conceitual · selecione no desenho ou nos cartões</p>
  </section>${auroraPanel(component)}</div>
  <section class="aurora-directory" aria-labelledby="auroraDirectory"><header><div><h2 id="auroraDirectory">Sistemas</h2><span>${vehicleComponents.length} componentes · ${coverage.systems} sistemas · ${coverage.covered} subsistemas</span></div><a href="${esc('#vehicle?' + directoryLink)}">${all ? 'Mostrar principais' : 'Ver todos os sistemas'} →</a></header><div class="aurora-directory-grid ${all ? 'expanded' : ''}">${directory
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
  decorateVehicleSelection(component.id);
  setupComponentHover();
}
// Selection is drawn inside the zoomed layer, over the image and under the hotspots,
// so highlight, pins and hit areas share one transform. It never takes pointer events.
function decorateVehicleSelection(selectedId) {
  const layer = $('#vehicleLayer');
  if (!layer) return;
  const NS = 'http://www.w3.org/2000/svg';
  const make = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  };
  const selected = vehicleComponents.find((c) => c.id === selectedId);
  const group = make('g', {
    class: 'selection-layer',
    'pointer-events': 'none',
    'aria-hidden': 'true',
  });
  const defs = make('defs', {}, group);
  const glow = make(
    'filter',
    { id: 'selectionGlow', x: '-20%', y: '-20%', width: '140%', height: '140%' },
    defs,
  );
  make('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '5', result: 'blur' }, glow);
  const merge = make('feMerge', {}, glow);
  make('feMergeNode', { in: 'blur' }, merge);
  make('feMergeNode', { in: 'SourceGraphic' }, merge);
  make(
    'path',
    { class: 'selection-fade', 'fill-rule': 'evenodd', d: `M0 0H1536V1024H0Z ${selected.path}` },
    group,
  );
  make('path', { class: 'selection-edge', d: selected.path, filter: 'url(#selectionGlow)' }, group);
  const hotspots = layer.querySelector('[data-component-link]');
  layer.insertBefore(group, hotspots);
  const pins = make(
    'g',
    { class: 'selection-pins', 'pointer-events': 'none', 'aria-hidden': 'true' },
    layer,
  );
  vehicleComponents.forEach((c, index) => {
    const shape = layer.querySelector(`[data-component-link="${c.id}"] path`);
    const spot = shape && !c.external ? pinSpot(shape) : null;
    if (!spot) return;
    const active = c.id === selectedId;
    const pin = make(
      'g',
      {
        class: `selection-pin${active ? ' active' : ''}`,
        transform: `translate(${spot.x} ${spot.y})`,
      },
      pins,
    );
    make('circle', { r: active ? 17 : 12 }, pin);
    const label = make('text', { 'text-anchor': 'middle', dy: active ? 6 : 4.5 }, pin);
    label.textContent = String(index + 1);
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

// A point inside the shape nearest its centre of mass, so a pin never floats beside a part.
function pinSpot(shape) {
  const box = shape.getBBox();
  const step = Math.max(4, Math.min(box.width, box.height) / 14);
  const inside = [];
  for (let x = box.x; x <= box.x + box.width; x += step)
    for (let y = box.y; y <= box.y + box.height; y += step)
      if (shape.isPointInFill(new DOMPoint(x, y))) inside.push({ x, y });
  if (!inside.length) return null;
  const mean = {
    x: inside.reduce((t, p) => t + p.x, 0) / inside.length,
    y: inside.reduce((t, p) => t + p.y, 0) / inside.length,
  };
  const margin = (p) => {
    let least = Infinity;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      for (let d = step; d < 40; d += step)
        if (!shape.isPointInFill(new DOMPoint(p.x + dx * d, p.y + dy * d))) {
          least = Math.min(least, d);
          break;
        }
    return Math.min(least, 40);
  };
  const best = inside
    .map((p) => ({ p, score: margin(p) * 4 - Math.hypot(p.x - mean.x, p.y - mean.y) }))
    .sort((a, b) => b.score - a.score)[0];
  return { x: Math.round(best.p.x), y: Math.round(best.p.y) };
}
