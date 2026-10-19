'use strict';
const treeUI = {
  tree: {
    path: ['root', 'seguranca', 'seg-freios'],
    selected: 'seg-freios',
    zoom: 1,
    tab: 'summary',
    fit: true,
  },
  mover: {
    path: ['mover-root', 'mover/requisitos'],
    selected: 'mover/requisitos',
    zoom: 1,
    tab: 'summary',
    fit: true,
  },
};
let treeModels = {};
const facetCopy = {
  aplicabilidade: {
    title: 'Aplicabilidade',
    icon: '▤',
    text: 'Confira categoria regulamentar, configuração técnica, datas de fabricação ou importação, novo projeto, exceções e transições nos atos relacionados. O perfil visual não decide a aplicabilidade.',
  },
  ensaios: {
    title: 'Ensaios',
    icon: '⚗︎',
    text: 'Localize nas fontes os métodos, condições e critérios de ensaio previstos para o objeto. O protótipo não extraiu nem validou uma lista obrigatória de ensaios para este projeto.',
  },
  evidencias: {
    title: 'Evidências',
    icon: '▱',
    text: 'Verifique nos atos e no procedimento competente quais documentos e comprovações são exigidos. Não há laudos, certificados ou fichas técnicas do veículo anexados a este protótipo.',
  },
  normas: {
    title: 'Normas',
    icon: '▤',
    text: 'Leia os textos oficiais, anexos, retificações e atos modificadores. Uma associação temática não confirma a vigência integral nem a aplicação ao projeto.',
  },
};
function uniqueIds(ids) {
  return [...new Set(ids)];
}
function recordIdsFor(filter) {
  return catalog.records.filter(filter).map((r) => r.id);
}
function taxonomyIds(key) {
  return recordIdsFor((r) => componentMatches(r, key));
}
function makeSystem(id, label, key, icon = '◇') {
  const ids = taxonomyIds(key);
  return {
    id,
    label,
    subtitle: `${ids.length} referências · ${systemLabel(key)}`,
    icon,
    recordIds: ids,
    kind: 'Sistema / tema',
    taxonomy: key,
    children: Object.entries(facetCopy).map(([k, c]) => ({
      id: id + '-' + k,
      label: c.title,
      icon: c.icon,
      subtitle: k === 'normas' ? `${ids.length} referências` : 'Conferência nas fontes',
      recordIds: ids,
      kind: 'Dimensão de consulta',
      facet: k,
      text: c.text,
    })),
  };
}
function branch(id, label, subtitle, icon, children, kind = 'Área de consulta') {
  return {
    id,
    label,
    subtitle,
    icon,
    children,
    kind,
    recordIds: uniqueIds(children.flatMap((c) => c.recordIds || [])),
  };
}
function buildTreeModels() {
  const general = [
    branch('enquadramento', 'Enquadramento', 'Perfil, categorias e processo', '▤', [
      makeSystem('enc-regras', 'Categorias e regras gerais', 'regras-gerais'),
      makeSystem('enc-id', 'Identificação e registro', 'identificacao'),
      makeSystem('enc-hom', 'CAT, CSV e certificação', 'processos/homologacao'),
    ]),
    branch('ambiental', 'Ambiental', 'Emissões, diagnóstico e produção', '♧', [
      makeSystem('amb-emissoes', 'Emissões e ensaios', 'propulsao/emissoes'),
      makeSystem('amb-obd', 'Diagnóstico OBD', 'eletronica/obd'),
      makeSystem('amb-empresa', 'Emissões corporativas', 'corporativo/ambiental'),
      makeSystem('amb-producao', 'Conformidade de produção', 'processos/producao'),
    ]),
    branch('seguranca', 'Segurança', 'CONTRAN / SENATRAN', '◇', [
      makeSystem('seg-freios', 'Freios', 'freios', '◉'),
      makeSystem('seg-luz', 'Iluminação', 'iluminacao', '◐'),
      makeSystem('seg-ocupantes', 'Proteção dos ocupantes', 'ocupantes', '♙'),
      branch('seg-estrutura', 'Estrutura e visibilidade', 'Outros sistemas de segurança', '▱', [
        makeSystem('seg-corpo', 'Carroceria e proteção', 'carroceria'),
        makeSystem('seg-vidros', 'Vidros e limpadores', 'vidros'),
        makeSystem('seg-espelhos', 'Retrovisores e visão', 'retrovisores'),
        makeSystem('seg-pneus', 'Pneus e rodas', 'pneus-rodas'),
      ]),
    ]),
    branch('conformidade', 'Conformidade', 'Produtos, componentes e regras', '☑', [
      makeSystem('conf-produtos', 'Conformidade de produtos', 'processos/conformidade'),
      makeSystem('conf-chassi', 'Suspensão e direção', 'chassi'),
      makeSystem('conf-motor', 'Componentes do motor', 'propulsao/componentes'),
      makeSystem('conf-comandos', 'Eletrônica e comandos', 'eletronica'),
    ]),
    branch('eficiencia', 'Eficiência e inovação', 'MOVER e temas relacionados', '◈', [
      makeSystem('efi-programas', 'Programas e incentivos', 'corporativo/mover'),
      makeSystem('efi-sustentavel', 'Eficiência e sustentabilidade', 'corporativo/eficiencia'),
      makeSystem('efi-energia', 'Combustíveis e eficiência', 'propulsao/combustiveis'),
      makeSystem('efi-eletrica', 'Propulsão elétrica', 'propulsao/eletrica'),
    ]),
  ];
  let root = branch(
    'root',
    'Homologação veicular',
    'Mapa de consulta',
    '▱',
    general,
    'Visão geral',
  );
  const covered = new Set(root.recordIds);
  const missing = catalog.records.filter((r) => !covered.has(r.id));
  if (missing.length) {
    const extra = {
      id: 'revisar',
      label: 'Outras referências',
      subtitle: 'Classificação complementar',
      icon: '▤',
      kind: 'Revisão temática',
      recordIds: missing.map((r) => r.id),
      text: 'Referências ainda não associadas aos ramos principais. A classificação precisa de revisão.',
    };
    root.children.push(extra);
    root.recordIds = uniqueIds([...root.recordIds, ...extra.recordIds]);
  }
  treeModels.tree = indexTree(root);
  const spec = catalog.metadata.moverTree;
  const moverNode = (g) => ({
    id: g.id,
    label: g.label,
    subtitle: g.kind,
    icon: g.icon || '◈',
    kind: g.kind,
    text: g.description,
    recordIds: g.recordIds,
    children: g.children
      ? g.children.map(moverNode)
      : g.recordIds.map((id) => {
          const r = catalog.records.find((x) => x.id === id);
          return {
            id: g.id + '-' + id,
            label: r.title,
            subtitle: r.issuer || r.agency,
            icon: '▤',
            kind: g.kind,
            recordIds: [id],
            recordId: id,
            text: r.summary,
          };
        }),
  });
  const moverChildren = spec.groups.map(moverNode);
  treeModels.mover = indexTree(
    branch(
      'mover-root',
      'Políticas automotivas',
      'MOVER · requisitos e instrumentos',
      '◈',
      moverChildren,
      'Recorte temático MOVER',
    ),
  );
}
function indexTree(root) {
  const nodes = {};
  function visit(n, parent) {
    n.parent = parent;
    nodes[n.id] = n;
    (n.children || []).forEach((c) => visit(c, n.id));
  }
  visit(root, null);
  return { root, nodes };
}
function activeTree() {
  return treeModels[
    state.view === 'vehicle'
      ? 'vehicle'
      : state.view === 'flow'
        ? 'flow'
        : state.view === 'mover'
          ? 'mover'
          : 'tree'
  ];
}
function activeTreeUI() {
  return treeUI[
    state.view === 'vehicle'
      ? 'vehicle'
      : state.view === 'flow'
        ? 'flow'
        : state.view === 'mover'
          ? 'mover'
          : 'tree'
  ];
}
function nodeTrail(id, model = activeTree()) {
  const chain = [];
  let n = model.nodes[id];
  while (n) {
    chain.unshift(n.id);
    n = model.nodes[n.parent];
  }
  return chain;
}
function treeColumns(model, ui) {
  const cols = [[model.root]];
  for (const id of ui.path) {
    const n = model.nodes[id];
    if (!n?.children?.length) break;
    if (!cols[cols.length - 1].some((x) => x.id === id)) break;
    cols.push(n.children);
  }
  return cols;
}
function selectTreeNode(id, toggle = false) {
  const model = activeTree(),
    ui = activeTreeUI(),
    node = model.nodes[id];
  if (!node) return;
  const trail = nodeTrail(id);
  const expanded = ui.path.includes(id) && node.children?.length;
  ui.path = toggle && expanded ? trail.slice(0, -1) : trail;
  ui.selected = id;
  ui.tab = 'summary';
  ui.fit = true;
  if (state.view === 'vehicle') {
    const laneNode = trail[1];
    if (laneNode) vehicleUI.lane = laneNode.split(':')[2];
  }
  if (state.view === 'flow') persistFlowNode();
  renderTree(state.view);
  const btn = document.querySelector(`.node-main[data-tree-node="${id}"]`);
  if (btn) btn.focus({ preventScroll: true });
}
function graphMarkup(model, ui) {
  const columns = treeColumns(model, ui),
    pitch = 210,
    nodeW = 176,
    nodeH = 70,
    gapY = 90;
  const height = Math.max(490, ...columns.map((c) => c.length * gapY + 35)),
    width = columns.length * pitch + 22;
  const pos = {};
  columns.forEach((col, i) =>
    col.forEach(
      (n, j) => (pos[n.id] = { x: 20 + i * pitch, y: (height - col.length * gapY) / 2 + j * gapY }),
    ),
  );
  let paths = '';
  for (let i = 1; i < columns.length; i++) {
    const parent = model.nodes[ui.path[i - 1]],
      p = pos[parent.id];
    for (const n of columns[i]) {
      const q = pos[n.id],
        active = ui.path.includes(n.id) || ui.selected === n.id;
      paths += `<path class="${active ? 'chosen' : ''}" d="M ${p.x + nodeW} ${p.y + nodeH / 2} C ${p.x + nodeW + 22} ${p.y + nodeH / 2}, ${q.x - 24} ${q.y + nodeH / 2}, ${q.x} ${q.y + nodeH / 2}"/>`;
    }
  }
  const nodes = columns
    .flat()
    .map((n) => {
      const p = pos[n.id],
        selected = ui.selected === n.id,
        onPath = ui.path.includes(n.id),
        expanded = onPath && Boolean(n.children?.length);
      return `<article class="graph-node ${selected ? 'selected' : ''} ${onPath ? 'on-path' : ''} ${n.id === model.root.id ? 'root-node' : ''}" style="left:${p.x}px;top:${p.y}px;width:${nodeW}px;height:${nodeH}px"><button class="node-main" data-tree-node="${n.id}" aria-current="${selected ? 'true' : 'false'}" title="${esc(n.label)}"><span class="node-copy"><strong>${esc(n.label)}</strong><small>${esc(n.subtitle || n.kind || '')}</small></span></button>${n.children?.length ? `<button class="node-toggle" data-tree-toggle="${n.id}" aria-label="${expanded ? 'Recolher' : 'Expandir'} ${esc(n.label)}" aria-expanded="${expanded}">${expanded ? '−' : '+'}</button>` : ''}</article>`;
    })
    .join('');
  const mini = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">${paths}${columns
    .flat()
    .map((n) => {
      const p = pos[n.id];
      return `<rect x="${p.x}" y="${p.y}" width="${nodeW}" height="${nodeH}" rx="9" fill="${ui.selected === n.id ? 'var(--accent)' : ui.path.includes(n.id) ? '#77777e' : '#34373a'}"/>`;
    })
    .join('')}</svg>`;
  return `<div class="graph-viewport" id="graphViewport" tabindex="0" aria-label="Árvore navegável. Use os botões para expandir e a rolagem para explorar."><div class="graph-space" id="graphSpace" style="width:${width}px;height:${height}px"><div class="graph-world" id="graphWorld" style="width:${width}px;height:${height}px"><svg class="graph-links" width="${width}" height="${height}" aria-hidden="true">${paths}</svg>${nodes}</div></div></div><div class="graph-controls"><button data-graph-action="out" aria-label="Diminuir zoom">−</button><output id="graphZoom">100%</output><button data-graph-action="in" aria-label="Aumentar zoom">+</button><span></span><button data-graph-action="fit" aria-label="Ajustar árvore à tela">⛶</button><button data-graph-action="back" aria-label="Voltar um nível">↶</button></div><div class="graph-mini" title="Visão geral da árvore">${mini}<span>Visão geral</span></div>`;
}
function renderTree(mode) {
  if (mode === 'flow') {
    renderFlow();
    return;
  }
  if (mode === 'vehicle') {
    renderVehicleFlow();
    return;
  }
  if (!treeModels.tree) buildTreeModels();
  const mover = mode === 'mover',
    model = treeModels[mode],
    ui = treeUI[mode];
  if (!model.nodes[ui.selected]) {
    ui.selected = model.root.id;
    ui.path = [model.root.id];
  }
  const selected = model.nodes[ui.selected];
  $('#main').innerHTML =
    `<div class="tree-page-head"><div class="eyebrow">${mover ? 'Políticas automotivas · MOVER' : 'Árvore regulatória · Brasil'}</div><h1>${mover ? 'MOVER' : 'Legislação por assunto'}</h1><p class="subtitle">${mover ? 'Explore requisitos, incentivos e procedimentos em seus próprios ramos.' : ''}</p><div class="tree-context"><span>🇧🇷 Brasil</span><span>Âmbito federal</span><span>${mover ? '13 referências temáticas' : catalog.records.length + ' entradas documentais'}</span><span class="context-note">Consulta temática · aplicabilidade a verificar</span></div></div><div class="tree-breadcrumb" aria-label="Caminho selecionado">${nodeTrail(
      selected.id,
      model,
    )
      .map((id) => `<button data-tree-node="${id}">${esc(model.nodes[id].label)}</button>`)
      .join(
        '<span>›</span>',
      )}</div><section class="graph-shell" aria-label="${mover ? 'Árvore de políticas automotivas MOVER' : 'Árvore de consulta regulatória'}">${graphMarkup(model, ui)}</section><div class="tree-footer"><span>ⓘ</span><span>Use + para expandir os assuntos.</span><button data-graph-action="reset">Recomeçar</button></div>${mover ? '<p class="tree-caveat">Recorte temático: 13 registros, incluindo referência do CNPE. Grupos podem compartilhar atos. A Portaria 277/2026 permanece como referência pendente, sem virar uma 14ª entrada.</p>' : ''}`;
  renderTreeDetails();
  setupGraph();
}
function treeDocument(r) {
  return `<button class="tree-doc" data-open="${r.id}"><span class="tag">${esc(r.issuer || r.agency)}</span><strong>${esc(r.title)}</strong><small>${esc(r.status)}</small><span class="doc-arrow">›</span></button>`;
}
function renderTreeDetails() {
  const detailPanel = state.view === 'flow' ? $('#flowDetailPanel') : $('#aiPanel');
  detailPanel.setAttribute('aria-label', 'Detalhes da árvore regulatória');
  const model = activeTree(),
    ui = activeTreeUI(),
    n = model.nodes[ui.selected];
  const records = n.recordIds.map((id) => catalog.records.find((r) => r.id === id)).filter(Boolean);
  const one = n.recordId ? records[0] : null;
  const trail = nodeTrail(n.id, model)
    .slice(1, -1)
    .map((id) => model.nodes[id].label);
  const text =
    n.text ||
    `${n.label} reúne ${records.length} referências para consulta. Expanda os ramos ou abra os documentos para verificar objeto, condições, datas e alterações.`;
  const tabs = `<div class="detail-tabs" role="tablist" aria-label="Detalhes"><button role="tab" aria-selected="${ui.tab === 'summary'}" data-tree-tab="summary" class="${ui.tab === 'summary' ? 'active' : ''}">Resumo</button><button role="tab" aria-selected="${ui.tab === 'documents'}" data-tree-tab="documents" class="${ui.tab === 'documents' ? 'active' : ''}">Documentos <span>${records.length}</span></button></div>`;
  detailPanel.innerHTML = `<div class="tree-detail-top"><small>${esc(trail.join(' / ') || 'Visão geral')}</small><span class="pill">${esc(n.kind || 'Tema selecionado')}</span><h2>${esc(n.label)}</h2></div>${tabs}<div class="detail-scroll">${ui.tab === 'documents' ? `<p class="detail-intro">${records.length} referências associadas. Abra cada registro para ver a rastreabilidade.</p>${records.map(treeDocument).join('') || '<p class="notice">Nenhuma referência classificada neste ramo.</p>'}` : `<p class="detail-intro">${esc(text)}</p><details class="tree-accordion" open><summary>▤ Aplicabilidade</summary><p>${state.view === 'mover' ? 'Confirmar objeto, sujeitos alcançados, datas, condições de enquadramento e anexos. Incentivos e obrigações empresariais não são requisitos universais de cada veículo.' : 'Confirmar categoria, configuração, datas, exceções e anexos. O portal organiza referências por assunto; não determina automaticamente o enquadramento de um veículo específico.'}</p></details><details class="tree-accordion" open><summary>▱ Base documental</summary><p>${one ? 'Consulte o ato e os seus modificadores na fonte.' : 'As referências abaixo são pontos de partida para a revisão técnica.'}</p>${records.slice(0, 3).map(treeDocument).join('')}${records.length > 3 ? `<button class="text-button" data-tree-tab="documents">Ver as ${records.length} referências →</button>` : ''}</details><details class="tree-accordion" open><summary>◷ Vigência e alterações</summary><div class="tree-warning">! ${esc(one?.status || 'Validação normativa pendente')}</div><p>Leia a redação atual, retificações e regras de transição. A organização do catálogo não certifica vigência.</p></details>${state.view === 'mover' ? `<details class="tree-accordion"><summary>◇ Ressalva do recorte MOVER</summary><p>Requisitos, incentivos e habilitação são instrumentos distintos. O vínculo temático não implica elegibilidade nem benefício automático.</p><p>Portaria GM/MDIC 277/2026: inteiro teor e efeitos ainda pendentes de conferência.</p><button class="text-button" data-route="updates">Consultar ressalvas →</button></details>` : ''}`}</div><div class="tree-detail-footer"><small>Acervo de referência de 18/10/2026. Confira o nível de revisão e o enquadramento em cada referência.</small>${one ? `<button class="btn primary" data-open="${one.id}" data-requirement="${esc(n.requirementId || '')}">Abrir detalhes da referência ↗</button>` : `<button class="btn primary" data-tree-tab="documents">Consultar documentos ↗</button>`}</div>`;
}
function applyGraphZoom(fit = false) {
  const ui = activeTreeUI(),
    v = $('#graphViewport'),
    w = $('#graphWorld'),
    s = $('#graphSpace');
  if (!v || !w) return;
  const width = parseFloat(w.style.width),
    height = parseFloat(w.style.height);
  if (fit)
    ui.zoom = Math.max(
      0.35,
      Math.min(1, (v.clientWidth - 16) / width, (v.clientHeight - 16) / height),
    );
  ui.zoom = Math.max(0.35, Math.min(1.6, ui.zoom));
  w.style.transform = `scale(${ui.zoom})`;
  s.style.width = width * ui.zoom + 'px';
  s.style.height = height * ui.zoom + 'px';
  $('#graphZoom').textContent = Math.round(ui.zoom * 100) + '%';
  if (fit) {
    v.scrollLeft = 0;
    v.scrollTop = 0;
  }
}
function setupGraph() {
  const ui = activeTreeUI();
  const v = $('#graphViewport');
  if (!v) return;
  requestAnimationFrame(() => {
    // Ignore work scheduled by a graph that navigation has since removed.
    if (!v.isConnected || $('#graphViewport') !== v || activeTreeUI() !== ui) return;
    const viewport = v;
    if (ui.fit && viewport.clientWidth < 540) {
      ui.zoom = 0.9;
      applyGraphZoom(false);
      const node = document.querySelector(
        `.node-main[data-tree-node="${ui.selected}"]`,
      )?.parentElement;
      if (node)
        viewport.scrollLeft = Math.max(
          0,
          parseFloat(node.style.left) * ui.zoom - (viewport.clientWidth - 176 * ui.zoom) / 2,
        );
    } else applyGraphZoom(ui.fit);
    ui.fit = false;
  });
  let drag = null;
  v.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY, left: v.scrollLeft, top: v.scrollTop };
    v.setPointerCapture(e.pointerId);
    v.classList.add('dragging');
  });
  v.addEventListener('pointermove', (e) => {
    if (!drag) return;
    v.scrollLeft = drag.left - (e.clientX - drag.x);
    v.scrollTop = drag.top - (e.clientY - drag.y);
  });
  const stop = () => {
    drag = null;
    v.classList.remove('dragging');
  };
  v.addEventListener('pointerup', stop);
  v.addEventListener('pointercancel', stop);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.treeNode) {
    selectTreeNode(b.dataset.treeNode);
    return;
  }
  if (b.dataset.treeToggle) {
    selectTreeNode(b.dataset.treeToggle, true);
    return;
  }
  if (b.dataset.treeTab) {
    activeTreeUI().tab = b.dataset.treeTab;
    renderTreeDetails();
    if (state.view === 'flow') renderFlowActivityContext();
    return;
  }
  if (b.dataset.graphAction) {
    const ui = activeTreeUI(),
      a = b.dataset.graphAction;
    if (a === 'in' || a === 'out') {
      ui.zoom += a === 'in' ? 0.15 : -0.15;
      applyGraphZoom();
    } else if (a === 'fit') applyGraphZoom(true);
    else if (a === 'back') {
      const n = activeTree().nodes[ui.selected];
      if (n.parent) selectTreeNode(n.parent);
    } else if (a === 'reset') {
      ui.path = [activeTree().root.id];
      ui.selected = activeTree().root.id;
      ui.tab = 'summary';
      ui.fit = true;
      if (state.view === 'flow') persistFlowNode();
      renderTree(state.view);
    }
  }
});
document.addEventListener('keydown', (e) => {
  const tab = e.target.closest('.detail-tabs [role=tab]');
  if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    e.preventDefault();
    activeTreeUI().tab = ['Home', 'ArrowLeft'].includes(e.key) ? 'summary' : 'documents';
    renderTreeDetails();
    if (state.view === 'flow') renderFlowActivityContext();
    document.querySelector('.detail-tabs button.active')?.focus();
    return;
  }
  const b = e.target.closest('[data-tree-node]');
  if (!b) return;
  const n = activeTree().nodes[b.dataset.treeNode];
  if (e.key === 'ArrowRight' && n.children?.length) {
    e.preventDefault();
    selectTreeNode(n.id);
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    selectTreeNode(n.parent || n.id);
  }
});
