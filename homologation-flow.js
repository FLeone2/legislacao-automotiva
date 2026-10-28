'use strict';
const flowUI = { stage: null, powertrain: 'todos' };
treeUI.flow = { path: [], selected: null, zoom: 1, tab: 'summary', fit: true };
// The conceptual map is more detailed than the process checklist. These links
// open the corresponding work front; they do not equate their legal scope.
const flowGuideStages = {
  enquadramento: 'enquadramento',
  construcao: 'projeto',
  preparacao: 'projeto',
  coastdown: 'ambiente',
  laboratorio: 'ambiente',
  aprovacoes: 'ambiente',
  seguranca: 'seguranca',
  componentes: 'componentes',
  dossie: 'dossie',
  cat: 'cat',
  producao: 'producao',
  cop: 'cop',
};
function flowGuideRoute(stage, tab = 'flow') {
  const mapped = Object.hasOwn(flowGuideStages, stage?.id) ? flowGuideStages[stage.id] : '';
  return treeGuideRoute({ tab, ...(mapped ? { stage: mapped } : {}) });
}
function flowGuideContext(stage) {
  return `<section class="portal-context-card flow-guide-context" aria-label="Organizar um processo"><div><span class="portal-eyebrow">Do mapa ao seu projeto</span><h2>${stage ? esc(stage.label) + ' no processo' : 'Um roteiro para a configuração do veículo'}</h2><p>Explore as referências no mapa. No guia, informe o perfil técnico e acompanhe as frentes e o checklist do processo.</p></div><nav class="portal-context-actions" aria-label="Continuar no guia"><a class="portal-context-link" href="${esc(flowGuideRoute(stage))}">${stage ? 'Abrir esta frente no processo' : 'Abrir fluxo do processo'} ${auroraIcon('arrow')}</a><a class="portal-context-link" href="${esc(flowGuideRoute(stage, 'checklist'))}">Perfil e checklist ${auroraIcon('arrow')}</a><a class="portal-context-link" href="${esc(treeGuideRoute({ tab: 'coverage' }))}">Cobertura e lacunas ${auroraIcon('arrow')}</a></nav></section>`;
}
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
      children: requirementNodesForRecord(
        activity.requirementRefs
          ? {
              ...record,
              activityRequirementIds: activity.requirementRefs[catalogIdentity(record)] || [],
            }
          : record,
        `${id}:law:${record.regulatoryId || record.id}`,
      ),
      requirementId: activity.requirementRefs?.[catalogIdentity(record)]?.[0] || null,
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
// Presentation coordinates from the approved Obsidian comp. Canonical stages,
// activities and relationships continue to come exclusively from flow-data.js.
const flowPresentation = {
  enquadramento: [20, 226, 155, 139],
  construcao: [202, 226, 155, 139],
  preparacao: [384, 226, 155, 139],
  coastdown: [600, 75, 140, 130],
  laboratorio: [756, 75, 140, 130],
  aprovacoes: [912, 75, 140, 130],
  seguranca: [600, 242, 452, 122],
  componentes: [600, 399, 452, 122],
  dossie: [1080, 226, 155, 139],
  cat: [1262, 226, 155, 139],
  producao: [1262, 399, 155, 118],
  cop: [600, 568, 817, 94],
};
function flowMap() {
  const selected = flowUI.stage;
  const links = [
    ['M175 290H202', 'reading'],
    ['M357 290H384', 'reading'],
    ['M539 290H574V130H600', 'environment'],
    ['M539 290H600', 'safety'],
    ['M574 290V452H600', 'components'],
    ['M740 130H756', 'environment'],
    ['M896 130H912', 'environment'],
    ['M1052 130H1067V290H1080', 'environment'],
    ['M1052 290H1080', 'safety'],
    ['M1052 452H1067V290H1080', 'components'],
    ['M1235 290H1262', 'reading'],
    ['M1339 364V399', 'reading'],
    ['M1339 517V568', 'production'],
    ['M600 622H280V365', 'feedback'],
    ['M1158 568V365', 'feedback'],
  ];
  return `<div class="homologation-map-toolbar"><span><i class="flow-dot"></i>Visão geral do processo</span><div class="flow-map-tools glass"><button data-flow-map-zoom="out" aria-label="Diminuir mapa">−</button><button data-flow-map-size aria-label="Tamanho original do mapa"><output id="flowMapZoom">100%</output></button><button data-flow-map-zoom="in" aria-label="Ampliar mapa">+</button><button data-flow-map-fit>Ajustar</button></div></div><div class="homologation-map-viewport" tabindex="0" aria-label="Mapa de homologação. Role horizontalmente para explorar ou escolha uma etapa abaixo."><div class="homologation-map"><svg viewBox="0 0 1456 680" class="homologation-connectors" aria-hidden="true"><defs><marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>${links.map(([path, kind]) => `<path d="${path}" class="flow-connection ${kind}" marker-end="url(#flowArrow)"/>`).join('')}<text x="600" y="60">Ambiental e eficiência</text><text x="600" y="235">Frentes técnicas em paralelo</text><text x="24" y="550" class="flow-feedback-label">Desvios e mudanças</text><text x="24" y="570" class="flow-feedback-label">retornam ao projeto</text><text x="24" y="590" class="flow-feedback-label">e às aprovações pertinentes.</text></svg>${homologationFlowSpec.stages.map((stage) => `<button class="homologation-step ${stage.tone} ${selected === stage.id ? 'selected' : ''}" style="--flow-x:${flowPresentation[stage.id]?.[0] ?? stage.x};--flow-y:${flowPresentation[stage.id]?.[1] ?? stage.y};--flow-w:${flowPresentation[stage.id]?.[2] ?? stage.w};--flow-h:${flowPresentation[stage.id]?.[3] ?? stage.h}" data-flow-stage="${stage.id}" aria-expanded="${selected === stage.id}" aria-controls="flowExplorer"><span class="homologation-step-kicker"><b>${stage.number}</b><span aria-hidden="true">${stage.icon}</span></span><strong>${stage.label}</strong><small>${stage.short}</small><span class="homologation-step-open">${selected === stage.id ? 'Etapa selecionada' : 'Ver atividades'} <span aria-hidden="true">${selected === stage.id ? '−' : '+'}</span></span></button>`).join('')}</div></div>`;
}
function flowRequirementForRecord(node, record) {
  if (node.requirementId) return node.requirementId;
  const activity = nodeTrail(node.id, treeModels.flow)
    .map((id) => treeModels.flow.nodes[id])
    .find((ancestor) => ancestor.flowActivity)?.flowActivity;
  return activity?.requirementRefs?.[catalogIdentity(record)]?.[0] || '';
}
function flowContextPanel(stage) {
  if (!stage) return '';
  const model = treeModels.flow;
  const node = model.nodes[treeUI.flow.selected] || model.root;
  const records = treeNodeRecords(node);
  return `<aside class="flow-context-panel glass" data-entering="${flowUI.entering}" aria-label="Etapa selecionada"><div class="inspector-meta"><span>Etapa selecionada</span><button class="icon-action" data-flow-close aria-label="Fechar painel da etapa">${auroraIcon('close')}</button></div><h2>${esc(stage.label)}</h2><p class="flow-context-subtitle">${esc(stage.short)}</p><div class="flow-context-scroll"><h3>Atividades</h3><nav aria-label="Atividades de ${esc(stage.label)}">${model.root.children.map((activity) => `<button data-flow-activity="${esc(activity.id)}" aria-current="${nodeTrail(node.id, model).includes(activity.id) ? 'true' : 'false'}">${esc(activity.label)}<span aria-hidden="true">${nodeTrail(node.id, model).includes(activity.id) ? '−' : '+'}</span></button>`).join('')}</nav>${node.id !== model.root.id ? `<section class="flow-context-summary"><h3>${esc(node.label)}</h3><p>${esc(node.text || '')}</p></section>` : ''}<h3>Referências de consulta${records.length > 3 ? ` · 3 de ${records.length}` : ''}</h3><div class="inspector-references">${
    records
      .slice(0, 3)
      .map(
        (record) =>
          `<button class="inspector-reference" data-open="${esc(record.id)}" data-requirement="${esc(flowRequirementForRecord(node, record))}"><strong>${esc(record.title)}</strong>${auroraIcon('arrow')}</button>`,
      )
      .join('') ||
    '<p class="scope-note">Nenhuma referência associada neste recorte. Confira as lacunas da atividade.</p>'
  }</div></div><a class="portal-context-link flow-context-process" href="${esc(flowGuideRoute(stage))}">Abrir esta frente no processo ${auroraIcon('arrow')}</a><button class="btn primary" data-flow-tree>Explorar a árvore ${auroraIcon('arrow')}</button></aside>`;
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
  flowUI.entering = Boolean(stage && flowUI.stage !== stage.id);
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
    `<header class="homologation-heading portal-page-heading"><div><span class="portal-eyebrow">Consulta por etapa</span><h1>Homologação.</h1><p>Do enquadramento à produção. Explore cada frente e suas referências.</p></div><div class="view-heading-actions"><button class="btn" data-flow-close>Mapa completo</button><button class="btn" data-flow-find>${auroraIcon('search')} Encontrar uma etapa</button></div></header>${flowGuideContext(stage)}<div class="homologation-profile"><label><span class="portal-field-label">Recorte de powertrain</span><select id="flowPowertrain">${homologationFlowSpec.powertrains.map((p) => `<option value="${p.id}" ${p.id === flowUI.powertrain ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></label><label><span class="portal-field-label">Ir para uma etapa</span><select id="flowStagePicker"><option value="">Ir para uma etapa</option>${homologationFlowSpec.stages.map((s) => `<option value="${s.id}" ${stage?.id === s.id ? 'selected' : ''}>${s.number} · ${esc(s.label)}</option>`).join('')}</select></label><p>Etapa → atividade → referência <span class="portal-context-meta">O recorte da consulta não altera o perfil do processo.</span></p></div>${q.has('stage') && !stage ? '<p class="notice" role="status">Etapa não encontrada. Escolha uma etapa no mapa.</p>' : ''}<section id="flowExplorer" tabindex="-1" class="homologation-map-shell ${stage ? 'inspecting' : ''}" aria-label="Fluxo visual de homologação">${flowMap()}${flowContextPanel(stage)}</section><p class="homologation-reading-note">As setas organizam a consulta; não determinam precedência legal universal. As frentes podem avançar em paralelo. COP é planejada desde o projeto e executada na produção.</p><section id="flowTreeExplorer" class="homologation-explorer" aria-label="Árvore da etapa selecionada" tabindex="-1">${
      stage
        ? `<header class="homologation-explorer-heading"><div><span class="eyebrow portal-eyebrow">Etapa ${stage.number} · ${esc(stage.short)}</span><h2>${esc(stage.label)}</h2><p>${esc(stage.purpose)}</p></div><button class="btn" data-flow-overview>Voltar ao mapa ↑</button></header><div class="homologation-outputs"><strong>Assuntos e documentos da etapa</strong>${stage.outputs.map((o) => `<span>${esc(o)}</span>`).join('')}</div><div class="tree-breadcrumb" aria-label="Caminho da atividade">${nodeTrail(
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
        : '<p class="homologation-empty">Selecione uma etapa para explorar as atividades e suas referências.</p>'
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
    `<a class="btn" href="${esc(flowGuideRoute(HomologationFlow.stage(flowUI.stage), 'checklist'))}">Organizar no checklist →</a>`,
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
  const visual =
    treeUI.flow.tab === 'summary' &&
    activity.vehicleComponent &&
    typeof vehicleModelArt === 'function'
      ? vehicleModelArt(
          { componentId: activity.vehicleComponent, label: activity.label },
          'flow-selection-preview',
        )
      : '';
  if (links || visual)
    $('#flowDetailPanel .detail-scroll')?.insertAdjacentHTML(
      'afterbegin',
      `${visual}<div class="homologation-activity-links portal-context-actions">${links}</div>`,
    );
}
function goFlow(stage, node = null, powertrain = flowUI.powertrain, scroll = true) {
  if (!node) treeUI.flow.selected = null;
  history.pushState(null, '', flowRoute(stage, node, powertrain));
  renderFlow();
  const target = scroll ? $('#flowExplorer') : $('#flowPowertrain');
  target?.focus({ preventScroll: true });
  // Focus the selected context without scrolling the overview out of view.
}
function persistFlowNode() {
  history.replaceState(null, '', flowRoute(flowUI.stage, treeUI.flow.selected));
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-flow-close]')) {
    const selectedStage = flowUI.stage;
    goFlow(null, null, flowUI.powertrain, false);
    document.querySelector(`[data-flow-stage="${selectedStage}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (e.target.closest('[data-flow-find]')) {
    $('#flowStagePicker').focus();
    return;
  }
  if (e.target.closest('[data-flow-tree]')) {
    $('#flowTreeExplorer').focus({ preventScroll: true });
    $('#flowTreeExplorer').scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    return;
  }
  const activity = e.target.closest('[data-flow-activity]');
  if (activity) {
    const model = activeTree();
    const collapse = nodeTrail(treeUI.flow.selected, model).includes(activity.dataset.flowActivity);
    goFlow(
      flowUI.stage,
      collapse ? model.root.id : activity.dataset.flowActivity,
      flowUI.powertrain,
      false,
    );
    document
      .querySelector(`[data-flow-activity="${activity.dataset.flowActivity}"]`)
      ?.focus({ preventScroll: true });
    return;
  }
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
  const defaultScale = (width) => (width >= 850 ? Math.min(1, width / 1456) : 0.95);
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
  const zoom = e.target.closest('[data-flow-map-zoom]');
  if (zoom) {
    const current =
      parseFloat(
        document.querySelector('.homologation-map').style.getPropertyValue('--flow-scale'),
      ) || 1;
    setFlowMapScale(
      Math.max(0.2, Math.min(1.5, current + (zoom.dataset.flowMapZoom === 'in' ? 0.1 : -0.1))),
    );
  }
  if (e.target.closest('[data-flow-map-fit]'))
    setFlowMapScale(
      Math.max(0.2, document.querySelector('.homologation-map-viewport').clientWidth / 1456),
    );
  if (e.target.closest('[data-flow-map-size]')) setFlowMapScale(1);
});
