'use strict';
const vehicleUI = { component: null, lane: null, subsystem: null, zoom: 1, panX: 0, panY: 0 };
function vehicleContext() {
  return `${$('#vehicleType').value} · ${$('#powertrain').value}`;
}
function componentArt(c, cls = '') {
  return c.asset
    ? `<img class="${cls}" src="${c.asset}" alt="Ilustração conceitual de ${esc(c.label)}" decoding="async" loading="lazy">`
    : `<svg class="${cls}" viewBox="${c.crop}" role="img" aria-label="${esc(c.label)}"><image href="assets/vehicle-exploded.webp" width="1536" height="1024"/></svg>`;
}
function vehicleLink(c, lane, subsystem) {
  const q = new URLSearchParams({ component: c.id });
  if (lane) q.set('lane', lane);
  if (subsystem) q.set('subsystem', subsystem);
  q.set('type', $('#vehicleType').value);
  q.set('powertrain', $('#powertrain').value);
  if (new URLSearchParams(location.hash.split('?')[1] || '').get('all') === '1') q.set('all', '1');
  return '#vehicle?' + q;
}
function saveVehicleRoute() {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  q.set('type', $('#vehicleType').value);
  q.set('powertrain', $('#powertrain').value);
  history.replaceState(null, '', '#vehicle?' + q);
}
function selectSystem(id) {
  const c = ComponentFlow.component(id) || vehicleComponents.find((x) => x.taxonomy === id);
  if (c) goVehicle(vehicleLink(c));
}
function goVehicle(url) {
  const update = () => {
    history.pushState(null, '', url);
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#main h1')?.focus({ preventScroll: true });
  };
  update();
}
function vehicleMap() {
  return `<div class="catalog-stage"><svg id="vehicleDrawing" viewBox="0 0 1536 1024" role="group" aria-label="Veículo ilustrado: selecione um componente"><g id="vehicleLayer"><image href="assets/vehicle-exploded.webp" width="1536" height="1024"/><rect x="106" y="528" width="174" height="48" rx="6" fill="white" stroke="#8a9cad"/><text x="193" y="558" text-anchor="middle" font-size="18" fill="#425b72">Bateria elétrica ↗</text><rect x="1100" y="785" width="415" height="230" rx="14" fill="white" stroke="#dde4ec" stroke-width="2"/><image href="assets/tanque.webp" x="1110" y="785" width="395" height="205" preserveAspectRatio="xMidYMid meet"/><text x="1307" y="1000" text-anchor="middle" fill="#536579" font-size="20" font-family="Arial">Tanque e circuito de vapores</text>${vehicleComponents.map((c) => `<a href="${esc(vehicleLink(c))}" data-component-link="${c.id}" aria-label="Explorar normas: ${esc(c.label)}"><path class="component-region" d="${c.path}"><title>${esc(c.label)}</title></path></a>`).join('')}</g></svg><div class="vehicle-drawing-tools"><button data-vehicle-zoom="out" aria-label="Diminuir imagem do veículo">−</button><button data-vehicle-zoom="reset" aria-label="Restaurar imagem do veículo"><output id="vehicleImageZoom">100%</output></button><button data-vehicle-zoom="in" aria-label="Ampliar imagem do veículo">+</button></div><output id="componentHover" class="component-hover" aria-live="polite">Selecione um componente do veículo</output><p class="catalog-caption">Ilustração conceitual · SUV genérico. Selecione no desenho ou nos componentes abaixo.</p></div>`;
}
function renderVehicle() {
  $('#main').onpointerover = null;
  $('#main').onfocusin = null;
  $('#main').onpointerleave = null;
  $('#main').onpointerout = null;
  $('#main').onfocusout = null;
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  for (const [key, id] of [
    ['type', 'vehicleType'],
    ['powertrain', 'powertrain'],
  ]) {
    const value = q.get(key);
    if (value && [...$('#' + id).options].some((o) => o.value === value)) $('#' + id).value = value;
  }
  const c = ComponentFlow.component(q.get('component'));
  vehicleUI.component = c?.id || null;
  $('#app').classList.toggle('tree-mode', Boolean(c));
  $('#app').classList.toggle('vehicle-flow-mode', Boolean(c));
  $('#app').classList.toggle('vehicle-overview-mode', !c);
  if (c) {
    initializeComponentTree(c, q);
    renderVehicleFlow();
    return;
  }
  restoreAssistantPanel();
  $('#main').innerHTML =
    `<header class="vehicle-page-heading"><div><p class="vehicle-kicker">Exploração por componentes</p><h1 tabindex="-1">O veículo como ponto de partida.</h1><p>Escolha uma parte para explorar suas legislações e normas.</p></div><div class="vehicle-profile"><span>Perfil de consulta</span><strong>${esc(vehicleContext())}</strong></div></header>${q.has('component') ? '<p class="notice" role="status">Componente não encontrado. Escolha uma das opções do veículo.</p>' : ''}${vehicleMap()}<section class="component-directory" aria-labelledby="componentDirectory"><div class="section-heading"><h2 id="componentDirectory">Qual componente você quer explorar?</h2><span>${ComponentFlow.coverage(catalog.metadata.hierarchy).systems} sistemas · ${ComponentFlow.coverage(catalog.metadata.hierarchy).covered} subsistemas</span></div><div class="component-cards">${vehicleComponents
      .map(
        (c) =>
          `<a class="component-card" href="${esc(vehicleLink(c))}" data-component-link="${c.id}"><div class="component-card-art">${componentArt(c)}</div><div class="component-card-copy"><strong>${esc(c.label)}</strong><span>${ComponentFlow.topics(
            c,
            catalog.metadata.hierarchy,
          )
            .map((l) => l.label)
            .join(
              ' · ',
            )}</span></div><span class="component-card-arrow" aria-hidden="true">↗</span></a>`,
      )
      .join(
        '',
      )}</div></section><p class="scope-note">A seleção organiza a consulta por assunto. O perfil ilustrativo não determina aplicabilidade. As ilustrações são próprias, geradas para navegação, e não identificam um modelo real.</p>`;
  vehicleUI.zoom = 1;
  setupComponentHover();
}
function initializeComponentTree(c, q) {
  const sub = ComponentFlow.subsystems(c, catalog.metadata.hierarchy).find(
    (x) => x.id === q.get('subsystem'),
  );
  vehicleUI.subsystem = sub?.id || null;
  const lanes = sub
    ? ComponentFlow.subsystemLanes(c, sub)
    : ComponentFlow.topics(c, catalog.metadata.hierarchy);
  const lane = lanes.find((x) => x.id === q.get('lane')) || lanes[0];
  vehicleUI.lane = lane.id;
  const laneNodes = lanes.map((l) =>
    branch(
      `component:${c.id}:${l.id}`,
      l.label,
      'Caminho de consulta',
      l.id === 'ambiental' ? '♧' : '◇',
      l.topics.map((t) => {
        const records = ComponentFlow.records(t, catalog.records),
          id = `component:${c.id}:${l.id}:${t.id}`;
        const leaves = records.map((r) => ({
          id: `${id}:record:${r.id}`,
          label: r.title,
          subtitle: (r.issuer || r.agency) + (r.phases?.length ? ' · ' + r.phases.join(' / ') : ''),
          icon: '▤',
          kind: 'Referência do acervo',
          recordId: r.id,
          children: requirementNodesForRecord(r, `${id}:record:${r.id}`),
          recordIds: [r.id],
          text: r.summary,
        }));
        (t.gaps || []).forEach((gap, i) =>
          leaves.push({
            id: `${id}:gap:${i}`,
            label: 'Mapeamento pendente',
            subtitle: gap,
            icon: '!',
            kind: 'Lacuna do acervo',
            recordIds: [],
            text: gap,
          }),
        );
        if (!leaves.length)
          leaves.push({
            id: `${id}:empty`,
            label: 'Sem referência cadastrada',
            subtitle: 'Pesquisa e validação pendentes',
            icon: '!',
            kind: 'Lacuna do acervo',
            recordIds: [],
            text: 'Ainda não há referência associada a este assunto no acervo. Nenhuma norma foi inferida a partir da ilustração.',
          });
        return {
          id,
          label: t.label,
          subtitle: `${records.length} referências${t.gaps?.length ? ' · mapeamento parcial' : ''}`,
          icon: '◇',
          kind: 'Assunto do componente',
          recordIds: records.map((r) => r.id),
          text:
            t.text ||
            'Associação temática já registrada no acervo. Verifique o objeto, as condições e os anexos nas fontes.',
          children: leaves,
        };
      }),
    ),
  );
  for (const lane of laneNodes) {
    const laneId = lane.id.split(':').pop(),
      present = new Set(
        lane.recordIds
          .map((id) => catalog.records.find((r) => r.id === id)?.regulatoryId)
          .filter(Boolean),
      );
    const extra = activeVehicleRecords(c, sub, laneId).filter((r) => !present.has(r.regulatoryId));
    if (extra.length) {
      const id = `${lane.id}:official`;
      const children = extra.map((r) => ({
        id: `${id}:record:${r.id}`,
        label: r.title,
        subtitle: r.phases?.length ? `${r.issuer} · ${r.phases.join(' / ')}` : r.issuer,
        icon: '▤',
        kind: 'Norma do acervo ativo',
        recordId: r.id,
        children: requirementNodesForRecord(r, `${id}:record:${r.id}`),
        recordIds: [r.id],
        text: r.summary,
      }));
      lane.children.push({
        id,
        label: 'Normas vigentes relacionadas',
        subtitle: `${extra.length} referências oficiais`,
        icon: '§',
        kind: 'Vínculos oficiais do sistema',
        recordIds: extra.map((r) => r.id),
        children,
      });
      lane.recordIds = uniqueIds([...lane.recordIds, ...extra.map((r) => r.id)]);
    }
  }
  const root = branch(
    `component:${c.id}`,
    sub?.label || c.label,
    'Componente selecionado',
    '▱',
    laneNodes,
    'Componente do veículo',
  );
  treeModels.vehicle = indexTree(root);
  const lid = `component:${c.id}:${lane.id}`,
    first = treeModels.vehicle.nodes[lid].children[0];
  const node = q.get('node');
  const valid =
    node &&
    treeModels.vehicle.nodes[node] &&
    (node === root.id || node === lid || node.startsWith(lid + ':'));
  treeUI.vehicle = {
    path: valid ? nodeTrail(node, treeModels.vehicle) : [root.id, lid, first.id],
    selected: valid ? node : first.id,
    zoom: 1,
    tab: 'summary',
    fit: true,
  };
}
function renderVehicleFlow() {
  const c = ComponentFlow.component(vehicleUI.component);
  if (!c) return renderVehicle();
  const model = treeModels.vehicle,
    ui = treeUI.vehicle,
    sub = ComponentFlow.subsystems(c, catalog.metadata.hierarchy).find(
      (x) => x.id === vehicleUI.subsystem,
    ),
    lanes = sub
      ? ComponentFlow.subsystemLanes(c, sub)
      : ComponentFlow.topics(c, catalog.metadata.hierarchy);
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  q.set('component', c.id);
  q.set('lane', vehicleUI.lane);
  q.set('node', ui.selected);
  if (sub) q.set('subsystem', sub.id);
  else q.delete('subsystem');
  history.replaceState(null, '', '#vehicle?' + q);
  $('#main').innerHTML =
    `<nav class="component-breadcrumb" aria-label="Caminho selecionado"><a href="${esc(auroraFocusLink(c))}" data-vehicle-back>← Voltar ao veículo</a><span> / </span><strong>${esc(c.label)}</strong></nav><header class="component-flow-heading"><div class="component-hero-art">${sub ? subsystemArt(sub) : componentArt(c)}</div><div><p class="vehicle-kicker">${esc(vehicleContext())}</p><h1 tabindex="-1">${esc(sub?.label || c.label)}</h1><p>Do componente ao assunto.<br>Do assunto à fonte.</p></div></header>${subsystemExplorer(c, sub)}<nav class="component-lanes" aria-label="Área regulatória">${lanes.map((l) => `<a href="${esc(vehicleLink(c, l.id, sub?.id))}" data-component-link="${c.id}" class="${vehicleUI.lane === l.id ? 'active' : ''}" ${vehicleUI.lane === l.id ? 'aria-current="page"' : ''}><span>${l.id === 'ambiental' ? '♧' : '◇'}</span>${esc(l.label)}</a>`).join('')}</nav><div class="tree-breadcrumb" aria-label="Ramo do fluxograma">${nodeTrail(
      ui.selected,
      model,
    )
      .map((id) => `<button data-tree-node="${esc(id)}">${esc(model.nodes[id].label)}</button>`)
      .join(
        '<span>›</span>',
      )}</div><section class="graph-shell component-graph" aria-label="Fluxograma de normas de ${esc(c.label)}">${graphMarkup(model, ui)}</section><div class="tree-footer"><span>ⓘ</span><span>Abra os ramos e selecione uma norma. Arraste o fundo ou deslize para navegar. Conexões indicam associação temática.</span><button data-graph-action="reset">Recomeçar</button></div><p class="contran-component-link">${activeVehicleSourceLinks(c, sub)}</p><p class="scope-note">O acervo não certifica vigência ou aplicabilidade. Lacunas, inclusive normas NBR ainda não cadastradas, aparecem como mapeamento pendente.</p>`;
  renderTreeDetails();
  setupGraph();
}
// Zoom keeps the SVG point under the cursor fixed; panning is clamped to the drawing.
function setVehicleZoom(value, anchor) {
  const layer = $('#vehicleLayer');
  if (!layer) return;
  const previous = vehicleUI.zoom;
  const zoom = Math.max(1, Math.min(3, Math.round(value * 100) / 100));
  if (anchor && zoom !== previous) {
    const k = zoom / previous;
    vehicleUI.panX = (anchor.x - 768) * (1 - k) + vehicleUI.panX * k;
    vehicleUI.panY = (anchor.y - 512) * (1 - k) + vehicleUI.panY * k;
  }
  vehicleUI.zoom = zoom;
  panVehicle(0, 0);
}
function panVehicle(dx, dy) {
  const layer = $('#vehicleLayer');
  if (!layer) return;
  const limitX = 768 * (vehicleUI.zoom - 1),
    limitY = 512 * (vehicleUI.zoom - 1);
  vehicleUI.panX = Math.max(-limitX, Math.min(limitX, vehicleUI.panX + dx));
  vehicleUI.panY = Math.max(-limitY, Math.min(limitY, vehicleUI.panY + dy));
  if (vehicleUI.zoom === 1) vehicleUI.panX = vehicleUI.panY = 0;
  layer.setAttribute(
    'transform',
    `translate(${768 + vehicleUI.panX} ${512 + vehicleUI.panY}) scale(${vehicleUI.zoom}) translate(-768 -512)`,
  );
  $('#vehicleDrawing').classList.toggle('is-zoomed', vehicleUI.zoom > 1);
  $('#vehicleImageZoom').textContent = Math.round(vehicleUI.zoom * 100) + '%';
}
function setupVehicleGestures() {
  const svg = $('#vehicleDrawing');
  if (!svg) return;
  vehicleUI.panX = vehicleUI.panY = 0;
  const toSvg = (x, y) => {
    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  };
  const pointers = new Map();
  let drag = null,
    pinch = null,
    moved = false;
  svg.addEventListener(
    'wheel',
    (event) => {
      if (vehicleUI.zoom === 1 && event.deltaY > 0) return;
      event.preventDefault();
      setVehicleZoom(
        vehicleUI.zoom * Math.exp(-event.deltaY * 0.0015),
        toSvg(event.clientX, event.clientY),
      );
    },
    { passive: false },
  );
  svg.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: vehicleUI.zoom };
      drag = null;
    } else if (vehicleUI.zoom > 1) drag = { x: event.clientX, y: event.clientY };
  });
  svg.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const center = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
      setVehicleZoom((pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.distance, center);
      moved = true;
      return;
    }
    if (!drag) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) < 5) return;
    if (!moved) svg.setPointerCapture(event.pointerId);
    moved = true;
    const scale = 1536 / svg.getBoundingClientRect().width;
    panVehicle(dx * scale, dy * scale);
    drag = { x: event.clientX, y: event.clientY };
    svg.classList.add('is-panning');
  });
  const end = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) drag = null;
    svg.classList.remove('is-panning');
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  // A pan or pinch must not also open the hotspot under the pointer.
  svg.addEventListener(
    'click',
    (event) => {
      if (!moved) return;
      moved = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
}
function setupComponentHover() {
  const main = $('#main');
  if (!$('.catalog-stage')) return;
  setupVehicleGestures();
  const show = (id) => {
    main
      .querySelectorAll('[data-component-link]')
      .forEach((el) => el.classList.toggle('is-hovered', el.dataset.componentLink === id));
    const component = ComponentFlow.component(id);
    if ($('#componentHover'))
      $('#componentHover').textContent = component?.label || 'Selecione um sistema';
  };
  const componentLink = (target) =>
    target instanceof Element ? target.closest('[data-component-link]') : null;
  main.onpointerover = (event) => show(componentLink(event.target)?.dataset.componentLink);
  main.onpointerout = (event) => {
    if (componentLink(event.target) !== componentLink(event.relatedTarget)) show(null);
  };
  main.onfocusin = (event) => show(componentLink(event.target)?.dataset.componentLink);
  main.onfocusout = () => show(null);
  main.onpointerleave = () => show(null);
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const zoom = e.target.closest('[data-vehicle-zoom]');
    if (zoom) {
      if (zoom.dataset.vehicleZoom === 'reset') setVehicleZoom(1);
      else setVehicleZoom(vehicleUI.zoom + (zoom.dataset.vehicleZoom === 'in' ? 0.2 : -0.2));
      return;
    }
    const link = e.target.closest('[data-component-link],[data-vehicle-back]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    goVehicle(link.getAttribute('href'));
  });
  document.addEventListener(
    'error',
    (e) => {
      if (!e.target.matches?.('img,image')) return;
      const parent = e.target.closest(
        '.component-card-art,.component-hero-art,.catalog-stage,.subsystem-explorer',
      );
      if (!parent || parent.querySelector('.image-unavailable')) return;
      const note = document.createElement('p');
      note.className = 'image-unavailable';
      note.setAttribute('role', 'status');
      note.textContent = 'Imagem indisponível. Use o nome do componente para navegar.';
      parent.append(note);
    },
    true,
  );
  window.addEventListener('popstate', () => {
    if (location.hash.startsWith('#vehicle')) render();
  });
}
function subsystemArt(sub) {
  const a = ComponentFlow.art(sub, catalog.metadata.hierarchy);
  return a
    ? `<svg viewBox="${a.x} ${a.y} ${a.width} ${a.height}" role="img" aria-label="Ilustração conceitual: ${esc(sub.label)}"><svg x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" viewBox="${a.x} ${a.y} ${a.width} ${a.height}" style="width:${a.width}px;height:${a.height}px;overflow:hidden"><image href="${a.asset}" width="1536" height="1024"/></svg></svg>`
    : '<p class="image-unavailable">Sem ilustração cadastrada</p>';
}
function subsystemExplorer(c, selected) {
  const subs = ComponentFlow.subsystems(c, catalog.metadata.hierarchy);
  const art = subs.map((sub) => ComponentFlow.art(sub, catalog.metadata.hierarchy));
  const shared = art.length > 1 && art.every((a) => a?.asset === art[0]?.asset);
  return `<details class="subsystem-explorer" ${selected ? '' : 'open'}><summary><span>Subsistemas de ${esc(c.label)}</span><span>${subs.length} ${selected ? '· ' + esc(selected.label) : '· escolha no desenho ou nos cards'}</span></summary><div class="subsystem-explorer-content">${shared ? `<svg class="subsystem-board" viewBox="0 0 1536 1024" role="group" aria-label="Subsistemas ilustrados de ${esc(c.label)}"><image href="${art[0].asset}" width="1536" height="1024"/>${subs.map((sub, i) => `<a href="${esc(vehicleLink(c, null, sub.id))}" data-subsystem-link="${esc(sub.id)}" aria-label="Abrir fluxograma de ${esc(sub.label)}"><rect x="${art[i].x + 8}" y="${art[i].y + 8}" width="${art[i].width - 16}" height="${art[i].height - 16}" class="subsystem-region ${selected?.id === sub.id ? 'selected' : ''}"><title>${esc(sub.label)}</title></rect></a>`).join('')}</svg>` : ''}<div class="subsystem-cards">${subs.map((sub) => `<a class="subsystem-card ${selected?.id === sub.id ? 'active' : ''}" href="${esc(vehicleLink(c, null, sub.id))}" data-subsystem-link="${esc(sub.id)}" ${selected?.id === sub.id ? 'aria-current="page"' : ''}><div>${subsystemArt(sub)}</div><strong>${esc(sub.label)}</strong><small>Explorar normas ↗</small></a>`).join('')}</div></div></details>${selected ? `<a class="subsystem-parent" href="${esc(vehicleLink(c))}" data-component-link="${c.id}">← Fluxograma completo de ${esc(c.label)}</a>` : ''}`;
}
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-subsystem-link]');
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  goVehicle(link.getAttribute('href'));
});
