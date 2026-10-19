'use strict';
const flowUI = { stage: null, powertrain: 'todos' };
treeUI.flow = { path: [], selected: null, zoom: 1, tab: 'summary', fit: true };
function flowRoute(stage, node, powertrain = flowUI.powertrain) {
  const q = new URLSearchParams();
  if (stage) q.set('stage', stage);
  if (node) q.set('node', node);
  if (powertrain !== 'todos') q.set('powertrain', powertrain);
  return '#flow' + (q.size ? '?' + q : '');
}
function flowActivityRecords(activity) {
  const primary = HomologationFlow.references(activity, catalogRecords(catalog), flowUI.powertrain),
    ids = new Set(primary.map((r) => r.regulatoryId).filter(Boolean));
  const indexed = new Map(
    Object.values(regulatoryData).flatMap((d) => (d?.records || []).map((r) => [r.id, r])),
  );
  const queue = [...ids];
  for (let i = 0; i < queue.length; i++)
    for (const effect of indexed.get(queue[i])?.incomingEffects || []) {
      if (indexed.has(effect.sourceId) && !ids.has(effect.sourceId)) {
        ids.add(effect.sourceId);
        queue.push(effect.sourceId);
      }
    }
  return [
    ...new Map(
      [...primary, ...catalogRecords(catalog).filter((r) => ids.has(r.regulatoryId))].map((r) => [
        r.regulatoryId || r.id,
        r,
      ]),
    ).values(),
  ];
}
function flowStageTree(stage) {
  const children = HomologationFlow.activities(stage, flowUI.powertrain).map((activity) => {
    const id = `flow:${stage.id}:${activity.id}`,
      records = flowActivityRecords(activity);
    const requested = (activity.refs || []).filter((ref) =>
      HomologationFlow.matchesPowertrain(activity.referencePowertrains?.[ref], flowUI.powertrain),
    );
    const missing = [
      ...requested.filter((ref) => !catalogRecord(catalog, ref)),
      ...(activity.recordIds || []).filter((ref) => !catalogRecord(catalog, ref)),
    ];
    const leaves = records.map((record) => ({
      id: `${id}:law:${record.regulatoryId || record.id}`,
      label: record.title,
      subtitle:
        (record.issuer || record.agency) +
        (record.phases?.length ? ' · ' + record.phases.join(' / ') : ''),
      icon: '▤',
      kind: 'Referência da atividade',
      recordIds: [record.id],
      recordId: record.id,
      children: requirementNodesForRecord(record, `${id}:law:${record.regulatoryId || record.id}`),
      text: record.summary,
    }));
    [
      ...(activity.gaps || []),
      ...(missing.length
        ? [
            'Referências previstas para esta atividade não estão disponíveis no acervo carregado: ' +
              missing.join(', ') +
              '.',
          ]
        : []),
    ].forEach((gap, i) =>
      leaves.push({
        id: `${id}:gap:${i}`,
        label: 'Conferência pendente',
        subtitle: gap,
        icon: '!',
        kind: 'Lacuna desta atividade',
        recordIds: [],
        text: gap,
      }),
    );
    if (!leaves.length)
      leaves.push({
        id: `${id}:empty`,
        label: 'Sem referência disponível',
        subtitle: 'Nenhuma referência associada a esta atividade.',
        icon: '!',
        recordIds: [],
        kind: 'Lacuna desta atividade',
        text: 'Ainda não há referência associada a esta atividade no acervo carregado.',
      });
    return {
      id,
      label: activity.label,
      subtitle: `${records.length} referências${activity.gaps?.length ? ' · conferência parcial' : ''}`,
      icon: '◇',
      kind: 'Atividade da etapa',
      text: activity.text + (activity.relation ? ' ' + activity.relation : ''),
      recordIds: records.map((r) => r.id),
      children: leaves,
      flowActivity: activity,
    };
  });
  if (!children.length)
    children.push({
      id: `flow:${stage.id}:empty`,
      label: 'Sem atividade neste recorte',
      icon: '!',
      subtitle: 'Escolha outro powertrain ou todas as configurações.',
      kind: 'Recorte de consulta',
      recordIds: [],
      text: 'Esta etapa não tem atividade mapeada para o recorte escolhido.',
    });
  return indexTree({
    ...branch(
      `flow:${stage.id}`,
      stage.label,
      stage.short,
      stage.icon,
      children,
      'Etapa de homologação',
    ),
    text: stage.purpose,
    outputs: stage.outputs,
  });
}
function flowMap() {
  const selected = flowUI.stage;
  const links = [
    ['M165 300H185', 'reading'],
    ['M330 300H350', 'reading'],
    ['M495 300H515V115H540', 'parallel'],
    ['M515 300H540', 'parallel'],
    ['M515 300V480H540', 'parallel'],
    ['M690 115H710', 'reading'],
    ['M860 115H880', 'reading'],
    ['M1030 115H1045V300H1060', 'converge'],
    ['M1030 300H1060', 'converge'],
    ['M1030 480H1045V300', 'converge'],
    ['M1205 300H1225', 'reading'],
    ['M1297 370V410', 'reading'],
    ['M1297 550V580', 'production'],
    ['M540 632H257V370', 'feedback'],
    ['M1132 580V370', 'feedback'],
  ];
  return `<div class="homologation-map-toolbar"><span><i class="flow-dot environment"></i> Ambiental e eficiência <i class="flow-dot safety"></i> Segurança <i class="flow-dot components"></i> Conformidade</span><div class="flow-map-tools"><button data-flow-map-fit>Ajustar mapa</button><output id="flowMapZoom">100%</output><button data-flow-map-size>Tamanho original</button></div></div><div class="homologation-map-viewport" tabindex="0" aria-label="Mapa de homologação. Role horizontalmente para explorar ou escolha uma etapa abaixo."><div class="homologation-map"><svg viewBox="0 0 1400 720" class="homologation-connectors" aria-hidden="true"><defs><marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>${links.map(([path, kind]) => `<path d="${path}" class="flow-connection ${kind}" marker-end="url(#flowArrow)"/>`).join('')}<text x="540" y="23">AMBIENTAL E EFICIÊNCIA</text><text x="540" y="208">FRENTES TÉCNICAS EM PARALELO</text><text x="28" y="632" class="flow-feedback-label">Desvios e mudanças</text><text x="28" y="652" class="flow-feedback-label">retornam ao projeto</text><text x="28" y="672" class="flow-feedback-label">e às aprovações pertinentes.</text></svg>${homologationFlowSpec.stages.map((stage) => `<button class="homologation-step ${stage.tone} ${selected === stage.id ? 'selected' : ''}" style="--flow-x:${stage.x};--flow-y:${stage.y};--flow-w:${stage.w};--flow-h:${stage.h}" data-flow-stage="${stage.id}" aria-expanded="${selected === stage.id}" aria-controls="flowExplorer"><span class="homologation-step-kicker"><b>${stage.number}</b><span aria-hidden="true">${stage.icon}</span></span><strong>${stage.label}</strong><small>${stage.short}</small><span class="homologation-step-open">${selected === stage.id ? 'Etapa selecionada' : 'Ver atividades'} <span aria-hidden="true">${selected === stage.id ? '−' : '+'}</span></span></button>`).join('')}</div></div>`;
}
function renderFlow() {
  const mapViewport = document.querySelector('.homologation-map-viewport');
  const mapState = mapViewport
    ? {
        scale: parseFloat(
          mapViewport.querySelector('.homologation-map').style.getPropertyValue('--flow-scale'),
        ),
        left: mapViewport.scrollLeft,
        top: mapViewport.scrollTop,
      }
    : null;
  $('#aiPanel').replaceChildren();
  $('#app').classList.add('homologation-flow-mode');
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  flowUI.powertrain = homologationFlowSpec.powertrains.some((p) => p.id === q.get('powertrain'))
    ? q.get('powertrain')
    : 'todos';
  const stage = HomologationFlow.stage(q.get('stage'));
  flowUI.stage = stage?.id || null;
  if (stage) {
    const sameTree = treeModels.flow?.root.id === `flow:${stage.id}`;
    treeModels.flow = flowStageTree(stage);
    const model = treeModels.flow,
      ui = treeUI.flow,
      requested = q.get('node');
    const node = model.nodes[requested] ? requested : model.root.id;
    if (!sameTree || ui.selected !== node || !ui.path.every((id) => model.nodes[id])) {
      ui.tab = 'summary';
      ui.fit = true;
      ui.path = nodeTrail(node, model);
    }
    ui.selected = node;
  }
  $('#main').innerHTML =
    `<header class="homologation-heading"><div><p class="eyebrow">Do projeto à produção</p><h1>Fluxo de homologação</h1><p>Entenda as etapas e explore os assuntos e as fontes oficiais relacionados a cada atividade.</p></div><div class="homologation-guide"><span>01 · Escolha a etapa</span><span>02 · Expanda a atividade</span><span>03 · Consulte a fonte</span></div></header><div class="homologation-profile"><label>Recorte de powertrain<select id="flowPowertrain">${homologationFlowSpec.powertrains.map((p) => `<option value="${p.id}" ${p.id === flowUI.powertrain ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></label><label>Ir para uma etapa<select id="flowStagePicker"><option value="">Escolha no mapa ou nesta lista</option>${homologationFlowSpec.stages.map((s) => `<option value="${s.id}" ${stage?.id === s.id ? 'selected' : ''}>${s.number} · ${esc(s.label)}</option>`).join('')}</select></label><p>Organiza as atividades mapeadas. Categoria, fase, combustível e datas ainda precisam ser confirmados.</p><a href="#vehicle">Explorar por sistema do veículo →</a></div>${q.has('stage') && !stage ? '<p class="notice" role="status">Etapa não encontrada. Escolha uma etapa no mapa.</p>' : ''}<section class="homologation-map-shell" aria-label="Fluxo visual de homologação">${flowMap()}</section><p class="homologation-reading-note">As setas organizam a leitura do processo; as frentes podem avançar em paralelo. COP é planejada desde a engenharia e executada na produção. Coastdown e amaciamento são atividades distintas.</p><section id="flowExplorer" class="homologation-explorer" aria-label="Árvore da etapa selecionada" tabindex="-1">${
      stage
        ? `<header class="homologation-explorer-heading"><div><span class="eyebrow">Etapa ${stage.number} · ${esc(stage.short)}</span><h2>${esc(stage.label)}</h2><p>${esc(stage.purpose)}</p></div><button class="btn" data-flow-overview>Voltar ao mapa ↑</button></header><div class="homologation-outputs"><strong>Assuntos e documentos da etapa</strong>${stage.outputs.map((o) => `<span>${esc(o)}</span>`).join('')}</div><div class="tree-breadcrumb" aria-label="Caminho da atividade">${nodeTrail(
            treeUI.flow.selected,
            treeModels.flow,
          )
            .map(
              (id) =>
                `<button data-tree-node="${id}">${esc(treeModels.flow.nodes[id].label)}</button>`,
            )
            .join(
              '<span>›</span>',
            )}</div><div class="homologation-explorer-layout"><div><section class="graph-shell" aria-label="Etapa, atividades e legislações">${graphMarkup(treeModels.flow, treeUI.flow)}</section><div class="tree-footer"><span>Expanda uma atividade pelo + ou pelo título para ver as normas e as lacunas.</span><button data-graph-action="reset">Recolher árvore</button></div></div><aside id="flowDetailPanel" class="homologation-detail" aria-label="Detalhes da atividade"></aside></div>`
        : '<div class="homologation-empty"><span aria-hidden="true">↖</span><h2>Por qual etapa você quer começar?</h2><p>Selecione no mapa para expandir atividades, referências e pontos ainda pendentes de conferência.</p></div>'
    }</section><p class="scope-note">Referências e lacunas do acervo disponível. A relação de documentos não é exaustiva; confirme o enquadramento e as exigências nas fontes oficiais.</p>`;
  $('#flowPowertrain').onchange = (e) => goFlow(stage?.id, null, e.target.value, false);
  $('#flowStagePicker').onchange = (e) => goFlow(e.target.value || null);
  setupFlowMap(mapState);
  if (stage) {
    renderTreeDetails();
    setupGraph();
    renderFlowActivityContext();
  }
  $('#main').dataset.renderedRoute = location.hash;
}
function renderFlowActivityContext() {
  const n = treeModels.flow.nodes[treeUI.flow.selected],
    activity = n.flowActivity;
  if (!activity) return;
  const links = [
    activity.route ? `<a class="btn" href="${esc(activity.route)}">Explorar o assunto →</a>` : '',
    ...(activity.consultationLinks || []).map(
      (link) => `<a class="btn" href="${esc(link.route)}">${esc(link.label)} →</a>`,
    ),
    ...(activity.officialLinks || []).map(
      (link) =>
        `<a class="btn" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ↗</a>`,
    ),
    activity.vehicleComponent
      ? `<a class="btn" href="#vehicle?component=${esc(activity.vehicleComponent)}">Ver no veículo →</a>`
      : '',
  ].join('');
  if (links)
    $('#flowDetailPanel .detail-scroll')?.insertAdjacentHTML(
      'afterbegin',
      `<div class="homologation-activity-links">${links}</div>`,
    );
}
function goFlow(stage, node = null, powertrain = flowUI.powertrain, scroll = true) {
  if (!node) treeUI.flow.selected = null;
  history.pushState(null, '', flowRoute(stage, node, powertrain));
  renderFlow();
  const target = scroll ? $('#flowExplorer') : $('#flowPowertrain');
  target?.focus({ preventScroll: true });
  if (scroll)
    requestAnimationFrame(() => {
      if (!target?.isConnected) return;
      target.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    });
}
function persistFlowNode() {
  history.replaceState(null, '', flowRoute(flowUI.stage, treeUI.flow.selected));
}
document.addEventListener('click', (e) => {
  const stage = e.target.closest('[data-flow-stage]');
  if (stage) {
    goFlow(stage.dataset.flowStage);
    return;
  }
  if (e.target.closest('[data-flow-overview]')) {
    document.querySelector('.homologation-step.selected')?.focus({ preventScroll: true });
    document.querySelector('.homologation-map-shell')?.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }
});

let flowMapObserver = null;
function setupFlowMap(savedState = null) {
  flowMapObserver?.disconnect();
  const viewport = document.querySelector('.homologation-map-viewport');
  let lastWidth = viewport.clientWidth;
  const defaultScale = (width) => (width >= 850 ? Math.min(1, width / 1400) : 0.95);
  setFlowMapScale(savedState?.scale || defaultScale(lastWidth));
  if (savedState) {
    viewport.scrollLeft = savedState.left;
    viewport.scrollTop = savedState.top;
  }
  const resize = () => {
    if (!viewport.isConnected || viewport.clientWidth === lastWidth) return;
    lastWidth = viewport.clientWidth;
    setFlowMapScale(defaultScale(lastWidth));
  };
  flowMapObserver = new ResizeObserver(resize);
  flowMapObserver.observe(viewport);
}
function setFlowMapScale(scale) {
  const map = document.querySelector('.homologation-map');
  if (!map) return;
  map.style.setProperty('--flow-scale', scale);
  $('#flowMapZoom').textContent = Math.round(scale * 100) + '%';
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-flow-map-fit]'))
    setFlowMapScale(
      Math.max(0.2, document.querySelector('.homologation-map-viewport').clientWidth / 1400),
    );
  if (e.target.closest('[data-flow-map-size]')) setFlowMapScale(1);
});
