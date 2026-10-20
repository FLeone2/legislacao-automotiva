'use strict';
let catalog = { metadata: { components: [], pendingReviews: [], stages: [] }, records: [] };
const state = {
  component: 'freios',
  query: '',
  agency: '',
  filterComponent: '',
  stage: '',
  review: '',
  view: 'tree',
};
const labels = {
  freios: 'Freios',
  vidros: 'Vidros',
  iluminacao: 'Iluminação',
  emissoes: 'Emissões',
  bateria: 'Bateria',
};
const descriptions = {
  freios: 'Frenagem, estabilidade e componentes de reposição.',
  vidros: 'Vidros de segurança, transparência e visibilidade.',
  iluminacao: 'Dispositivos de iluminação e sinalização.',
  emissoes: 'Emissões, ruído, fases do PROCONVE e processo ambiental.',
  bateria: 'Propulsão elétrica e componentes de armazenamento de energia.',
};
function componentMatches(r, id) {
  if (!id) return true;
  if (id === 'bateria') id = 'propulsao/eletrica';
  if (id === 'emissoes') id = 'propulsao/emissoes';
  return (r.taxonomy || []).some((t) => t === id || t.startsWith(id + '/'));
}
function related() {
  if (state.view === 'library') return filters();
  return catalogRecords(catalog)
    .filter((r) => componentMatches(r, state.component))
    .sort((a, b) => Number(Boolean(b.officialAudit)) - Number(Boolean(a.officialAudit)));
}
function renderRelated() {
  if (!$('#relatedNorms')) return;
  const a = related();
  $('#relatedNorms').innerHTML =
    a
      .slice(0, 3)
      .map(
        (r) =>
          `<button class="related-card" data-open="${r.id}"><span class="tag">${esc(r.issuer || r.agency)}</span><strong>${esc(r.title)}</strong><small>${esc(r.status)}</small></button>`,
      )
      .join('') || '<p class="scope-note">Nenhum documento associado a este componente.</p>';
}
function flowStrip() {
  return `<section class="flow-strip"><div class="section-heading"><h2>Fluxo de homologação</h2><span class="pill">Mapa de consulta</span></div><div class="steps">${[
    [
      'Perfil do veículo',
      'Categoria, motorização, configuração e uso pretendido.',
      'PERFIL',
      'enquadramento',
    ],
    [
      'Requisitos e ensaios',
      'Consulte segurança, emissões e conformidade de componentes.',
      'IBAMA · INMETRO',
      'componentes',
    ],
    [
      'Homologação',
      'Procedimentos e documentos do processo de homologação.',
      'SENATRAN',
      'homologacao-cat',
    ],
    [
      'Eficiência e incentivos',
      'Enquadramento nos requisitos e instrumentos do programa.',
      'MOVER / MDIC',
      'mover',
    ],
  ]
    .map(
      (s, i) =>
        `<button class="step" data-flow="${s[3]}"><b><span class="number">${i + 1}</span>${s[0]}</b><p>${s[1]}</p><span class="tag ${i === 3 ? 'purple' : ''}">${s[2]}</span></button>`,
    )
    .join('')}</div></section>`;
}
function groupFor(id) {
  return catalog.metadata.hierarchy.find((g) => g.id === id.split('/')[0]);
}
function systemLabel(id) {
  const g = groupFor(id);
  return g?.children.find((c) => c.id === id)?.label || g?.label || id;
}
function systemCount(id) {
  return catalogRecords(catalog).filter((r) => componentMatches(r, id)).length;
}

function renderUpdates() {
  $('#main').innerHTML =
    `<div class="eyebrow">Rastreabilidade e controle</div><h1>Atualizações e ressalvas</h1><p><a class="btn" href="#contran">Consultar levantamento oficial CONTRAN →</a></p><p class="subtitle">Pendências conhecidas no catálogo e referências a alterações. Esta página não é um monitor automático do Diário Oficial.</p><div class="notice">As datas e o escopo de revisão constam em cada registro de CONTRAN, PROCONVE, Inmetro e Anatel. O acervo reúne ${catalogRecords(catalog).length} atos e referências de consulta. A vigência e a aplicação a um projeto exigem leitura das fontes e dos atos modificadores.</div>${consultationSources()}${catalog.metadata.pendingReviews.map((r) => `<article class="update-card"><span class="tag">CONFERÊNCIA PENDENTE</span><h3>${esc(r.title)}</h3><p>${esc(r.note)}</p><div class="actions">${safeLink(r.officialUrl, 'Consultar referência oficial', 'btn')}</div></article>`).join('')}<article class="update-card"><span class="tag">CADEIA DOCUMENTAL</span><h3>Consulte também os atos modificadores</h3><p>As referências a alterações, revogações, anexos e transições estão registradas nos detalhes de cada entrada. Uma cópia arquivada pode não conter a redação consolidada.</p><button class="btn" data-route="library">Abrir biblioteca</button></article>`;
}
function renderAI() {
  $('#main').innerHTML =
    `<div class="eyebrow">Visão de produto</div><h1>Consulta com fontes, em uma conversa</h1><p class="subtitle">Uma prévia visual do assistente que poderá apoiar a consulta normativa.</p><div class="wide-ai"><span class="pill">Somente demonstração visual</span><div class="bubble question">O que preciso verificar para homologar este veículo?</div><div class="bubble answer"><strong>O fluxo ideal do assistente</strong><p>1. Entender o perfil técnico e as datas do projeto.</p><p>2. Localizar documentos e atos modificadores no acervo.</p><p>3. Apresentar os trechos de referência e as incertezas.</p><p>4. Encaminhar decisões de aplicabilidade à revisão técnica.</p></div><div class="notice">Não há modelo de IA conectado. Nenhuma mensagem é enviada, nenhuma resposta jurídica é gerada e não há cobrança por consultas.</div><button class="btn primary" data-route="library">Explorar as fontes disponíveis →</button></div>`;
}

function clearFilters() {
  state.query = '';
  state.agency = '';
  state.filterComponent = '';
  state.stage = '';
  state.review = '';
  $('#globalSearch').value = '';
  navigate('library');
}

document.addEventListener('click', (e) => {
  const part = e.target.closest('[data-part]');
  if (part) {
    selectSystem(part.dataset.part);
    return;
  }
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.selectSystem) {
    selectSystem(b.dataset.selectSystem);
    return;
  }
  if (b.dataset.component) {
    state.component = b.dataset.component;
    renderVehicle();
    renderRelated();
  }
  if (b.dataset.open) openNorm(b.dataset.open, b.dataset.requirement || null);
  if (b.dataset.route) navigate(b.dataset.route);
  if (b.dataset.componentLibrary) {
    state.filterComponent = b.dataset.componentLibrary;
    state.query = '';
    state.agency = '';
    state.stage = '';
    navigate(libraryRoute({ component: state.filterComponent }).slice(1));
  }
  if (b.dataset.flow) {
    state.stage = b.dataset.flow;
    navigate('flow');
  }
  if (b.dataset.stageLibrary) {
    clearState();
    state.stage = b.dataset.stageLibrary;
    navigate(libraryRoute({ stage: state.stage }).slice(1));
  }
  if (['clearFilters', 'clearEmpty'].includes(b.id)) clearFilters();
});
function clearState() {
  state.query = '';
  state.agency = '';
  state.filterComponent = '';
  state.stage = '';
  state.review = '';
  $('#globalSearch').value = '';
}
const originalAssistantMarkup = $('#aiPanel').innerHTML;
function restoreAssistantPanel() {
  $('#aiPanel').setAttribute('aria-label', 'Orientações de consulta');
  $('#aiPanel').innerHTML = originalAssistantMarkup;
  if (state.view === 'library')
    $('#aiPanel .related-head h3').textContent = 'Referências desta consulta';
  $('#relatedLibrary').onclick = () => {
    navigate((state.view === 'library' ? libraryRoute(libraryValues()) : '#library').slice(1));
  };
}
$('#relatedLibrary').onclick = () => {
  clearState();
  state.filterComponent = state.component;
  navigate(libraryRoute({ component: state.filterComponent }).slice(1));
};
$('#closeDialog').onclick = () => $('#normDialog').close();
$('#normDialog').addEventListener('click', (e) => {
  if (e.target === $('#normDialog')) {
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      e.target.close();
  }
});
document.addEventListener('keydown', (e) => {
  const part = e.target.closest('[data-part]');
  if (part && ['Enter', ' '].includes(e.key)) {
    e.preventDefault();
    selectSystem(part.dataset.part, true);
    return;
  }
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    e.preventDefault();
    openCatalogSearch(true);
  }
});
for (const id of ['vehicleType', 'powertrain'])
  $('#' + id).onchange = () => {
    if (state.view === 'vehicle') {
      saveVehicleRoute();
      renderVehicle();
    }
    const t = $('#toast');
    t.textContent = 'Perfil visual atualizado. O catálogo não foi filtrado por aplicabilidade.';
    t.style.display = 'block';
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => (t.style.display = 'none'), 4500);
  };
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
});
initializeRegulatoryStore()
  .then((index) => {
    regulatoryBaseCatalog = index.base;
    catalog = installActiveRegulations(index.base);
    render();
  })
  .catch(() => {
    $('#main').innerHTML =
      '<h1>Não foi possível carregar o acervo</h1><p role="alert">O índice de consulta não está disponível. Recarregue a página para tentar novamente.</p><button class="btn" onclick="location.reload()">Tentar novamente</button>';
  });
