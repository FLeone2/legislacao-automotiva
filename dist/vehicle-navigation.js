'use strict';
const vehicleUI = { component: null, lane: null, subsystem: null, zoom: 1 };
function vehicleContext() {
  return `${$('#vehicleType').value} · ${$('#powertrain').value}`;
}
function selectedVehiclePart(
  component,
  query = new URLSearchParams(location.hash.split('?')[1] || ''),
) {
  const id = query.get('part');
  return VehicleLegislation.part(id, component.id)
    ? vehicleVector.parts.find((part) => part.id === id)
    : null;
}
function renderInvalidVehiclePart() {
  $('#app').classList.remove(
    'tree-mode',
    'vehicle-flow-mode',
    'vehicle-overview-mode',
    'aurora-home',
  );
  $('#main').innerHTML =
    '<h1 tabindex="-1">Conjunto não encontrado</h1><p role="status">Escolha um conjunto da ilustração para consultar suas referências.</p><a class="btn" data-vehicle-back href="#vehicle">Voltar ao veículo</a>';
}
function vehicleTopicLink(component, part, topic) {
  const query = new URLSearchParams(
    vehicleLink(component, topic.lane, topic.subsystemId).split('?')[1],
  );
  query.set('part', part.id);
  query.set('topic', topic.id);
  return '#vehicle?' + query;
}
function vehicleMappedLanes(component, subsystem, part) {
  if (!part && component.id !== 'bateria')
    return subsystem
      ? ComponentFlow.subsystemLanes(component, subsystem)
      : ComponentFlow.topics(component, catalog.metadata.hierarchy);
  const parts = part ? [part] : component.mapParts;
  const lanes = new Map();
  const seen = new Set();
  for (const item of parts)
    for (const topic of VehicleLegislation.topics(item.id, { subsystemId: subsystem?.id })) {
      const signature = JSON.stringify([
        topic.label,
        topic.lane,
        topic.relation,
        topic.links.map((link) => [link.actId, link.requirementIds]),
      ]);
      if (seen.has(signature)) continue;
      seen.add(signature);
      if (!lanes.has(topic.lane))
        lanes.set(topic.lane, {
          id: topic.lane,
          label: topic.lane === 'ambiental' ? 'Ambiental' : 'Segurança e conformidade',
          topics: [],
        });
      lanes.get(topic.lane).topics.push(topic);
    }
  return [...lanes.values()];
}
function vehicleTopicRecords(topic) {
  return topic.links
    ? VehicleLegislation.recordsForTopic(topic, catalog.records)
    : ComponentFlow.records(topic, catalog.records);
}
function vehicleMappingNotes(links = []) {
  return [...new Set(links.map((link) => link.note?.trim()).filter(Boolean))].join(' ');
}
function componentArt(c, cls = '') {
  const asset = c.overviewAsset || c.asset;
  return asset
    ? `<img class="${cls}" src="${asset}" alt="Ilustração de ${esc(c.label)}" decoding="async" loading="lazy">`
    : `<svg class="${cls}" viewBox="${c.crop}" role="img" aria-label="${esc(c.label)}"><image href="assets/vehicle-exploded.webp" width="1536" height="1024"/></svg>`;
}
function vehicleLink(c, lane, subsystem) {
  const q = new URLSearchParams({ component: c.id });
  if (lane) q.set('lane', lane);
  if (subsystem) q.set('subsystem', subsystem);
  q.set('type', $('#vehicleType').value);
  q.set('powertrain', $('#powertrain').value);
  if (new URLSearchParams(location.hash.split('?')[1] || '').get('all') === '1') q.set('all', '1');
  const partId = new URLSearchParams(location.hash.split('?')[1] || '').get('part');
  if (vehicleVector.parts.some((part) => part.id === partId && part.componentId === c.id))
    q.set('part', partId);
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
  const hotspots = vehicleVector.parts
    .map((part) => {
      const component = ComponentFlow.component(part.componentId);
      const q = new URLSearchParams(vehicleLink(component).split('?')[1]);
      q.set('part', part.id);
      return `<a id="${esc(part.id)}" href="#vehicle?${esc(q)}" data-component-link="${component.id}" data-map-part="${esc(part.id)}" data-map-label="${esc(part.label)}" aria-label="${esc(part.label)}"><path id="${esc(part.contourId)}" class="component-region" d="${part.path}" fill-rule="evenodd" pointer-events="all"><title>${esc(part.label)}</title></path></a>`;
    })
    .join('');
  return `<div class="catalog-stage"><svg id="vehicleDrawing" viewBox="${vehicleVector.viewBox}" role="group" aria-label="Vista explodida do veículo híbrido: selecione um conjunto"><g id="vehicleLayer"><image id="vehicleVectorArt" href="${vehicleVector.displayAsset || vehicleVector.asset}" width="${vehicleVector.width}" height="${vehicleVector.height}"/>${hotspots}</g></svg><div class="vehicle-drawing-bar"><output id="componentHover" class="component-hover" aria-live="polite">Selecione um conjunto</output><div class="vehicle-drawing-tools"><button data-vehicle-zoom="out" aria-label="Diminuir imagem do veículo">−</button><button data-vehicle-zoom="reset" aria-label="Restaurar imagem do veículo"><output id="vehicleImageZoom">100%</output></button><button data-vehicle-zoom="in" aria-label="Ampliar imagem do veículo">+</button></div></div></div>`;
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
  if (q.has('part') && (!c || !selectedVehiclePart(c, q))) return renderInvalidVehiclePart();
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
  const part = selectedVehiclePart(c, q);
  const availableSubsystems = part
    ? VehicleLegislation.subsystems(part.id, catalog.metadata.hierarchy)
    : ComponentFlow.subsystems(c, catalog.metadata.hierarchy);
  const sub = availableSubsystems.find((x) => x.id === q.get('subsystem'));
  vehicleUI.part = part?.id || null;
  vehicleUI.subsystem = sub?.id || null;
  const lanes = vehicleMappedLanes(c, sub, part);
  const lane = lanes.find((x) => x.id === q.get('lane')) || lanes[0];
  vehicleUI.lane = lane.id;
  const laneNodes = lanes.map((l) =>
    branch(
      `component:${c.id}:${l.id}`,
      l.label,
      'Caminho de consulta',
      l.id === 'ambiental' ? '♧' : '◇',
      l.topics.map((t) => {
        const records = vehicleTopicRecords(t),
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
          text: vehicleMappingNotes(r.vehicleMappingLinks) || r.summary,
        }));
        (t.gaps || []).forEach((gap, i) =>
          leaves.push({
            id: `${id}:gap:${i}`,
            label:
              t.gapReview?.state === 'no_specific_reference_in_collection'
                ? 'Sem referência neste acervo'
                : t.gapReview?.state === 'not_classified'
                  ? 'Classificação pendente'
                  : 'Pesquisa pendente',
            subtitle: gap,
            icon: '!',
            kind: t.gapReview?.summary || 'Lacuna do acervo',
            recordIds: [],
            text: [
              gap,
              t.gapReview?.reviewedAt ? `Conferência do recorte: ${t.gapReview.reviewedAt}.` : '',
              t.gapReview?.nextAction || '',
            ]
              .filter(Boolean)
              .join(' '),
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
          subtitle: `${records.length} referências${t.relation === 'vehicle' ? ' · contexto do veículo' : t.relation === 'component' ? ' · sobre o conjunto' : ''}${t.gaps?.length ? ' · mapeamento parcial' : ''}`,
          icon: '◇',
          kind: 'Assunto do componente',
          recordIds: records.map((r) => r.id),
          text:
            vehicleMappingNotes(t.links) ||
            t.text ||
            t.gaps?.join(' ') ||
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
    const extra =
      part || c.id === 'bateria'
        ? []
        : activeVehicleRecords(c, sub, laneId).filter((r) => !present.has(r.regulatoryId));
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
    sub?.label || part?.label || c.label,
    'Componente selecionado',
    '▱',
    laneNodes,
    'Componente do veículo',
  );
  treeModels.vehicle = indexTree(root);
  const lid = `component:${c.id}:${lane.id}`,
    first = treeModels.vehicle.nodes[lid].children[0];
  const topic = treeModels.vehicle.nodes[`${lid}:${q.get('topic')}`];
  const node = q.get('node') || topic?.id;
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
    part = selectedVehiclePart(c),
    sub = (
      part
        ? VehicleLegislation.subsystems(part.id, catalog.metadata.hierarchy)
        : ComponentFlow.subsystems(c, catalog.metadata.hierarchy)
    ).find((x) => x.id === vehicleUI.subsystem),
    lanes = vehicleMappedLanes(c, sub, part);
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  q.set('component', c.id);
  q.set('lane', vehicleUI.lane);
  q.set('node', ui.selected);
  if (sub) q.set('subsystem', sub.id);
  else q.delete('subsystem');
  history.replaceState(null, '', '#vehicle?' + q);
  $('#main').innerHTML =
    `<nav class="component-breadcrumb" aria-label="Caminho selecionado"><a href="${esc(auroraFocusLink(c, part?.id))}" data-vehicle-back>← Voltar ao veículo</a><span> / </span><strong>${esc(c.label)}</strong></nav><header class="component-flow-heading"><div class="component-hero-art">${part ? `<img src="${esc(part.displayAsset || part.asset)}" alt="${esc(part.label)}">` : sub ? subsystemArt(sub) : componentArt(c)}</div><div><p class="vehicle-kicker">${part ? esc(c.label) : esc(vehicleContext())}</p><h1 tabindex="-1">${esc(sub?.label || part?.label || c.label)}</h1></div></header>${part ? vehiclePartTopicNavigation(c, part, sub?.id) : subsystemExplorer(c, sub)}<nav class="component-lanes" aria-label="Área regulatória">${lanes.map((l) => `<a href="${esc(vehicleLink(c, l.id, sub?.id))}" data-component-link="${c.id}" class="${vehicleUI.lane === l.id ? 'active' : ''}" ${vehicleUI.lane === l.id ? 'aria-current="page"' : ''}>${esc(l.label)}</a>`).join('')}</nav><div class="tree-breadcrumb" aria-label="Ramo do fluxograma">${nodeTrail(
      ui.selected,
      model,
    )
      .map((id) => `<button data-tree-node="${esc(id)}">${esc(model.nodes[id].label)}</button>`)
      .join(
        '<span>›</span>',
      )}</div><section class="graph-shell component-graph" aria-label="Fluxograma de normas de ${esc(part?.label || c.label)}">${graphMarkup(model, ui)}</section><div class="tree-footer"><span>Abra um assunto para consultar suas referências.</span><button data-graph-action="reset">Recolher</button></div><p class="contran-component-link">${activeVehicleSourceLinks(c, sub, part?.id)}</p><p class="scope-note">Associação para consulta. Confira escopo, configuração e datas na fonte oficial.</p>`;
  renderTreeDetails();
  setupGraph();
  $('#main').dataset.renderedRoute = location.hash;
}
function vehiclePartTopicNavigation(component, part, subsystemId) {
  const all = vehicleLink(component);
  return `<nav class="vehicle-part-topics" aria-label="Assuntos de ${esc(part.label)}"><a href="${esc(all)}" ${!subsystemId ? 'aria-current="page"' : ''}>Todos os assuntos do conjunto</a>${VehicleLegislation.subsystems(
    part.id,
    catalog.metadata.hierarchy,
  )
    .map(
      (sub) =>
        `<a data-subsystem-link="${esc(sub.id)}" href="${esc(vehicleLink(component, null, sub.id))}" ${subsystemId === sub.id ? 'aria-current="page"' : ''}>${esc(sub.label)}</a>`,
    )
    .join('')}</nav>`;
}
function setupComponentHover() {
  const main = $('#main');
  if (!$('.catalog-stage')) return;
  const show = (link) => {
    main
      .querySelectorAll('[data-component-link]')
      .forEach((el) => el.classList.toggle('is-hovered', el === link));
    const component = ComponentFlow.component(link?.dataset.componentLink);
    if ($('#componentHover'))
      $('#componentHover').textContent =
        link?.dataset.mapLabel || component?.label || 'Selecione um conjunto';
  };
  const componentLink = (target) =>
    target instanceof Element ? target.closest('[data-component-link]') : null;
  main.onpointerover = (event) => show(componentLink(event.target));
  main.onpointerout = (event) => {
    if (componentLink(event.target) !== componentLink(event.relatedTarget)) show(null);
  };
  main.onfocusin = (event) => show(componentLink(event.target));
  main.onfocusout = () => show(null);
  main.onpointerleave = () => show(null);
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const zoom = e.target.closest('[data-vehicle-zoom]');
    if (zoom) {
      vehicleUI.zoom =
        zoom.dataset.vehicleZoom === 'reset'
          ? 1
          : Math.max(
              1,
              Math.min(
                2.4,
                Math.round(
                  (vehicleUI.zoom + (zoom.dataset.vehicleZoom === 'in' ? 0.2 : -0.2)) * 10,
                ) / 10,
              ),
            );
      const partId = new URLSearchParams(location.hash.split('?')[1] || '').get('part');
      const anchor = vehicleVector.parts.find((part) => part.id === partId)?.testPoint || [
        768, 512,
      ];
      $('#vehicleLayer').setAttribute(
        'transform',
        `translate(${anchor[0]} ${anchor[1]}) scale(${vehicleUI.zoom}) translate(${-anchor[0]} ${-anchor[1]})`,
      );
      $('#vehicleImageZoom').textContent = Math.round(vehicleUI.zoom * 100) + '%';
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
        '.component-card-art,.component-hero-art,.catalog-stage,.subsystem-explorer,.aurora-system-art,.aurora-subsystem-art',
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
