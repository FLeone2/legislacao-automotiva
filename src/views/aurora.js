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
// Norms shown for a system are the ones its flowchart lists, so panel and map never disagree.
const vehicleNormCache = new Map();
function vehicleNorms(component) {
  const key = component.id;
  const cached = vehicleNormCache.get(key);
  if (cached?.catalog === catalog) return cached.records;
  const records = new Map();
  const lanes = ComponentFlow.topics(component, catalog.metadata.hierarchy);
  for (const lane of lanes) {
    for (const topic of lane.topics)
      for (const r of ComponentFlow.records(topic, catalog.records))
        records.set(r.regulatoryId || r.id, r);
    for (const r of activeVehicleRecords(component, null, lane.id))
      if (!records.has(r.regulatoryId || r.id)) records.set(r.regulatoryId || r.id, r);
  }
  const list = [...records.values()].sort(
    (x, y) => Number(Boolean(y.officialAudit)) - Number(Boolean(x.officialAudit)),
  );
  vehicleNormCache.set(key, { catalog, records: list });
  return list;
}
function lensNormRows(records, agency) {
  return records
    .filter((r) => !agency || (r.issuer || r.agency) === agency)
    .map(
      (r) =>
        `<li><button type="button" data-open="${esc(r.id)}"><strong>${esc(r.title)}</strong><span><b>${esc(r.issuer || r.agency)}</b>${esc(r.status || '')}</span></button></li>`,
    )
    .join('');
}
function auroraPanel(component, tab = 'normas', agency = '') {
  const subsystems = ComponentFlow.subsystems(component, catalog.metadata.hierarchy);
  const records = vehicleNorms(component);
  const issuers = [...new Set(records.map((r) => r.issuer || r.agency))];
  const rows = lensNormRows(records, agency);
  const tabs = [
    ['normas', 'Normas', records.length],
    ['subsistemas', 'Subsistemas', subsystems.length],
  ];
  return `<aside class="aurora-explorer lens" data-component="${esc(component.id)}" aria-label="Normas e subsistemas de ${esc(component.label)}">
    <header class="lens-head"><h2>${esc(component.label)}</h2></header>
    <div class="lens-tabs" role="tablist" aria-label="Conteúdo do sistema">${tabs.map(([id, label, count]) => `<button type="button" role="tab" id="lens-tab-${id}" aria-controls="lens-panel-${id}" aria-selected="${tab === id}" tabindex="${tab === id ? 0 : -1}" data-lens-tab="${id}">${label}<span>${count}</span></button>`).join('')}</div>
    <div class="lens-panel" role="tabpanel" id="lens-panel-normas" aria-labelledby="lens-tab-normas" ${tab === 'normas' ? '' : 'hidden'}>
      ${
        records.length
          ? `<div class="lens-filter" role="group" aria-label="Filtrar por órgão"><button type="button" class="chip-toggle" aria-pressed="${!agency}" data-lens-agency="">Todas</button>${issuers.map((name) => `<button type="button" class="chip-toggle" aria-pressed="${agency === name}" data-lens-agency="${esc(name)}">${esc(name)}</button>`).join('')}</div><ul class="lens-norms">${rows}</ul><a class="lens-more" href="${esc(libraryRoute({ component: component.taxonomy }))}">Ver tudo na biblioteca ${auroraIcon('arrow')}</a>`
          : '<p class="lens-empty">Ainda não há norma cadastrada para este sistema. Nenhuma foi inferida a partir do desenho.</p>'
      }
    </div>
    <div class="lens-panel aurora-subsystem-list" role="tabpanel" id="lens-panel-subsistemas" aria-labelledby="lens-tab-subsistemas" ${tab === 'subsistemas' ? '' : 'hidden'}>${subsystems.map((sub) => `<a class="aurora-subsystem" href="${esc(vehicleLink(component, null, sub.id))}"><span class="aurora-subsystem-art">${subsystemArt(sub)}</span><strong>${esc(sub.label)}</strong></a>`).join('')}</div>
    <a class="aurora-primary" href="${esc(vehicleLink(component))}">Abrir o mapa de normas ${auroraIcon('arrow')}</a>
    <a class="aurora-library-link" href="${esc(libraryRoute({ component: component.taxonomy }))}">Biblioteca do sistema →</a>
  </aside>`;
}
function auroraChips(selectedId) {
  return vehicleComponents
    .map(
      (c) =>
        `<a data-aurora-component="${esc(c.id)}" data-component-link="${esc(c.id)}" class="aurora-system-card ${selectedId === c.id ? 'selected' : ''}" href="${esc(auroraFocusLink(c))}" ${selectedId === c.id ? 'aria-current="true"' : ''}><strong>${esc(c.short || c.label)}</strong><small>${vehicleNorms(c).length}<span class="sr-only"> normas</span></small></a>`,
    )
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
    ComponentFlow.component(query.get('focus')) || ComponentFlow.component('bancos');
  vehicleUI.component = null;
  vehicleUI.lane = null;
  vehicleUI.subsystem = null;
  vehicleUI.zoom = 1;
  $('#app').classList.add('aurora-home', 'vehicle-overview-mode');
  $('#app').classList.remove('tree-mode', 'vehicle-flow-mode', 'contran-mode');
  $('#main').innerHTML =
    `<div class="vehicle-home"><header class="home-head"><h1>Explore o veículo</h1><p class="subtitle">Escolha uma parte no desenho para ver as normas ligadas a ela.</p></header><div class="home-grid"><section class="stage-card" aria-label="Exploração visual do veículo"><div class="aurora-car-glass">${vehicleMap()}</div></section>${auroraPanel(component)}</div><nav class="aurora-directory system-chips" aria-label="Sistemas do veículo">${auroraChips(component.id)}</nav></div>`;
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
// Changing the selected system keeps the zoom, the pan and the focus: only the highlight,
// the chips and the panel are swapped, so the map never reloads.
function swapAuroraSelection(component, { push = true } = {}) {
  if (push) history.pushState(null, '', auroraFocusLink(component));
  $('#main')
    .querySelectorAll('#vehicleDrawing [data-component-link]')
    .forEach((link) => {
      const on = link.dataset.componentLink === component.id;
      link.classList.toggle('aurora-selected', on);
      link.setAttribute('aria-current', on ? 'true' : 'false');
    });
  $('#vehicleLayer .selection-layer')?.remove();
  $('#vehicleLayer .selection-pins')?.remove();
  decorateVehicleSelection(component.id);
  $('.system-chips').innerHTML = auroraChips(component.id);
  const panel = $('.lens');
  const tab = panel?.querySelector('[data-lens-tab][aria-selected="true"]')?.dataset.lensTab;
  const holder = document.createElement('div');
  holder.innerHTML = auroraPanel(component, tab || 'normas');
  panel?.replaceWith(holder.firstElementChild);
  $('.lens').classList.add('is-swapping');
}
document.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-lens-tab]');
  const agency = event.target.closest('[data-lens-agency]');
  const lens = event.target.closest('.lens');
  if (!lens || (!tab && !agency)) return;
  const component = ComponentFlow.component(lens.dataset.component);
  const current =
    tab?.dataset.lensTab ||
    lens.querySelector('[data-lens-tab][aria-selected="true"]')?.dataset.lensTab;
  const next = document.createElement('div');
  next.innerHTML = auroraPanel(component, current, agency ? agency.dataset.lensAgency : '');
  lens.replaceWith(next.firstElementChild);
  const focus = tab
    ? `[data-lens-tab="${tab.dataset.lensTab}"]`
    : `[data-lens-agency="${agency.dataset.lensAgency.replace(/"/g, '\\"')}"]`;
  document.querySelector('.lens ' + focus)?.focus({ preventScroll: true });
});
document.addEventListener('keydown', (event) => {
  const tab = event.target.closest?.('[data-lens-tab]');
  if (!tab || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  const tabs = [...tab.parentElement.querySelectorAll('[data-lens-tab]')];
  tabs[
    (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
  ].click();
  event.preventDefault();
});
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
  vehicleComponents.forEach((c) => {
    const shape = layer.querySelector(`[data-component-link="${c.id}"] path`);
    const spot = shape && pinSpot(shape);
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
    if (!active) {
      make('circle', { r: 13 }, pin);
      return;
    }
    make('circle', { class: 'pulse', r: 26 }, pin);
    make('circle', { r: 17 }, pin);
    const text = c.short || c.label;
    const width = Math.round(text.length * 17 + 44);
    const flip = spot.x > 1100;
    make(
      'rect',
      { class: 'pin-label', x: flip ? -width - 34 : 34, y: -27, width, height: 54, rx: 27 },
      pin,
    );
    const label = make(
      'text',
      { x: flip ? -width / 2 - 34 : width / 2 + 34, y: 10, 'text-anchor': 'middle' },
      pin,
    );
    label.textContent = text;
  });
}
// Keep all original routes and regulatory data; add the theme shell before bootstrap.
if (!location.hash) history.replaceState(null, '', '#vehicle?focus=bancos');
document.documentElement.classList.add('liquid-aurora');
$('.brand').innerHTML =
  '<svg class="aurora-logo" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 5 5 40h17l6-11M28 13l15 27H27l-7-12" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><strong>Legislação<br> Automotiva</strong>';
$('.brand').setAttribute('href', '#vehicle');
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
