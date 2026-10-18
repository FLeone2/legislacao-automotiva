'use strict';
function filters() {
  return catalog.records.filter(
    (r) =>
      (!state.agency || r.agency === state.agency) &&
      componentMatches(r, state.filterComponent) &&
      (!state.stage || (r.stages || []).includes(state.stage)) &&
      norm(
        [
          r.title,
          r.summary,
          r.agency,
          ...(r.componentLabels || []),
          ...(r.taxonomy || []).map(systemLabel),
          ...(r.amendingRefs || []),
          ...(r.topics || []),
          ...(r.requirements || []).map((x) => x.title + ' ' + x.rule),
        ].join(' '),
      ).includes(norm(state.query)),
  );
}

function documentCard(r) {
  return `<article class="document"><div class="row"><span class="tag">${esc(r.issuer || r.agency)}</span><span class="status">${esc(r.status)}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p><div class="links"><button data-open="${r.id}">Detalhes e rastreabilidade →</button>${safeLink(r.officialUrl, 'Fonte oficial')}</div></article>`;
}

function updateList() {
  const rows = filters();
  $('#resultCount').textContent =
    `${rows.length} de ${catalog.records.length} entradas documentais · referências oficiais para consulta`;
  $('#documents').innerHTML =
    rows.map(documentCard).join('') ||
    '<div class="empty"><h3>Nenhum resultado com estes filtros</h3><p>Tente outro termo ou limpe os filtros.</p><button class="btn" id="clearEmpty">Limpar filtros</button></div>';
}

function renderLibrary() {
  const selected = (s) => (s ? ' selected' : '');
  $('#main').innerHTML =
    `<div class="eyebrow">Acervo de referência</div><h1>Biblioteca de legislação</h1><p class="subtitle">Referências de legislação automotiva organizadas por assunto. Vigência e aplicabilidade precisam ser confirmadas no texto oficial atualizado.</p><div class="library-toolbar"><input id="librarySearch" aria-label="Pesquisar na biblioteca" placeholder="Nome, número da norma ou assunto…" value="${esc(state.query)}"><select id="agencyFilter" aria-label="Filtrar órgão ou programa"><option value="">Órgãos e programas</option>${['SENATRAN', 'IBAMA', 'INMETRO', 'ANATEL', 'MOVER'].map((a) => `<option${selected(state.agency === a)}>${a}</option>`).join('')}</select><select id="componentFilter" aria-label="Filtrar componente"><option value="">Todos os componentes</option>${catalog.metadata.hierarchy.map((g) => `<optgroup label="${esc(g.label)}"><option value="${g.id}"${selected(state.filterComponent === g.id)}>Todo o sistema / tema</option>${g.children.map((c) => `<option value="${c.id}"${selected(state.filterComponent === c.id)}>${esc(c.label)}</option>`).join('')}</optgroup>`).join('')}</select><select id="stageFilter" aria-label="Filtrar etapa"><option value="">Todas as etapas</option>${catalog.metadata.stages.map((c) => `<option value="${c.id}"${selected(state.stage === c.id)}>${esc(c.label)}</option>`).join('')}</select><button class="btn" id="clearFilters">Limpar</button></div><div class="count-line" id="resultCount"></div><div class="document-list" id="documents"></div><p class="scope-note">CONTRAN, PROCONVE, Inmetro e Anatel: revisão dirigida em 18/10/2026. A aplicação ao veículo depende de enquadramento. Links levam somente a fontes oficiais.</p>`;
  updateList();
  $('#librarySearch').addEventListener('input', (e) => {
    state.query = e.target.value;
    updateList();
  });
  $('#agencyFilter').addEventListener('change', (e) => {
    state.agency = e.target.value;
    updateList();
  });
  $('#componentFilter').addEventListener('change', (e) => {
    state.filterComponent = e.target.value;
    updateList();
  });
  $('#stageFilter').addEventListener('change', (e) => {
    state.stage = e.target.value;
    updateList();
  });
}
