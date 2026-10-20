'use strict';
const libraryReviewLabels = {
  directed: 'Revisão dirigida do texto',
  reference: 'Referência ou índice',
  pending: 'Conferência pendente',
};
function libraryRoute(values = {}) {
  const q = new URLSearchParams(Object.entries(values).filter(([, v]) => v));
  return '#library' + (q.size ? '?' + q : '');
}
function libraryReview(record) {
  if (record.reviewStatus?.state === 'directed_text_review') return 'directed';
  if (['reference_only', 'index_review'].includes(record.reviewStatus?.state)) return 'reference';
  return 'pending';
}
function libraryValues() {
  return {
    q: state.query,
    agency: state.agency,
    component: state.filterComponent,
    stage: state.stage,
    review: state.review,
    page: state.libraryPage > 1 ? state.libraryPage : '',
  };
}
function filters() {
  return catalog.records.filter(
    (r) =>
      (!state.agency || r.agency === state.agency) &&
      componentMatches(r, state.filterComponent) &&
      (!state.stage || (r.stages || []).includes(state.stage)) &&
      (!state.review || libraryReview(r) === state.review) &&
      norm(
        [
          r.title,
          r.summary,
          r.agency,
          r.issuer,
          ...(r.componentLabels || []),
          ...(r.taxonomy || []).map(systemLabel),
          ...(r.amendingRefs || []),
          ...(r.topics || []),
          ...(r.requirements || []).map((x) => x.title + ' ' + x.rule),
        ].join(' '),
      ).includes(norm(state.query)),
  );
}
const libraryDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' });
function libraryDateText(value) {
  const date = value ? new Date(value + 'T00:00:00Z') : null;
  return date && !Number.isNaN(date.getTime()) ? libraryDate.format(date) : 'não informada';
}
function documentCard(r) {
  const themes = [...new Set((r.taxonomy || []).map(systemLabel))].slice(0, 3);
  return `<article class="document"><header class="document-top"><span class="tag">${esc(r.issuer || r.agency)}</span><span class="status">${esc(r.status)}</span></header><h3>${esc(r.title)}</h3><p class="document-summary">${esc(r.summary)}</p><ul class="document-themes" aria-label="Assuntos">${(themes.length ? themes : ['Assunto transversal']).map((t) => `<li>${esc(t)}</li>`).join('')}</ul><p class="document-context">Registro revisado em ${esc(libraryDateText(r.reviewDate))} · ${esc(libraryReviewLabels[libraryReview(r)])}</p><div class="links"><button data-open="${esc(r.id)}">Ver resumo, escopo e alterações</button>${safeLink(r.officialUrl, 'Fonte oficial')}</div></article>`;
}
function updateList() {
  const rows = filters();
  const pages = Math.max(1, Math.ceil(rows.length / 30));
  state.libraryPage = Math.max(1, Math.min(pages, state.libraryPage || 1));
  const start = (state.libraryPage - 1) * 30;
  const visible = rows.slice(start, start + 30);
  $('#libraryPagination').innerHTML =
    pages > 1
      ? `<a class="btn" href="${esc(libraryRoute({ ...libraryValues(), page: state.libraryPage > 1 ? state.libraryPage - 1 : pages }))}">${state.libraryPage > 1 ? '← Anterior' : 'Última página'}</a><span>Página ${state.libraryPage} de ${pages}</span><a class="btn" href="${esc(libraryRoute({ ...libraryValues(), page: state.libraryPage < pages ? state.libraryPage + 1 : '' }))}">${state.libraryPage < pages ? 'Próxima →' : 'Primeira página'}</a>`
      : '';
  const total = catalog.records.length;
  $('#resultCount').textContent =
    (rows.length === total ? `${total} referências` : `${rows.length} de ${total} referências`) +
    (pages > 1 ? ` · página ${state.libraryPage} de ${pages}` : '');
  $('#documents').innerHTML =
    visible.map(documentCard).join('') ||
    '<div class="empty"><h3>Nenhum resultado com estes filtros</h3><p>Tente outro termo ou limpe os filtros.</p><button class="btn" id="clearEmpty">Limpar filtros</button></div>';
  if (state.view === 'library' && $('#relatedNorms')) renderRelated();
  const url = libraryRoute(libraryValues());
  $('#libraryPermalink').href = url;
  const chips = [
    [state.query && `Busca: ${state.query}`, 'query'],
    [state.agency, 'agency'],
    [state.filterComponent && systemLabel(state.filterComponent), 'filterComponent'],
    [state.stage && catalog.metadata.stages.find((x) => x.id === state.stage)?.label, 'stage'],
    [state.review && libraryReviewLabels[state.review], 'review'],
  ].filter(([label]) => label);
  $('#libraryChips').innerHTML = chips
    .map(
      ([label, key]) =>
        `<button class="chip" type="button" data-clear-filter="${key}" aria-label="Remover filtro: ${esc(label)}">${esc(label)}<span aria-hidden="true">×</span></button>`,
    )
    .join('');
  $('#clearFilters').hidden = !chips.length;
}
function consultationSources() {
  return `<details class="consultation-sources"><summary id="consultationSourcesTitle">Fontes e revisão</summary><p>Os recortes abaixo reúnem referências por órgão. As contagens não representam cobertura integral da legislação nem confirmação de aplicação ao veículo.</p><div class="consultation-source-grid">${Object.entries(
    regulatoryConfig,
  )
    .map(
      ([id, config]) =>
        `<a class="btn" href="#${id}">${esc(config.label)} · ${regulatoryData[id]?.records?.length ?? 'consultar'} referências →</a>`,
    )
    .join(
      '',
    )}<a class="btn" href="#mover">MOVER e assuntos relacionados →</a><a class="btn" href="#markings">Etiquetas, selos e VIN →</a></div><details><summary>Como interpretar a revisão e a vigência</summary><p>Revisão dirigida examina trechos do texto; referência ou índice identifica uma fonte com revisão limitada. Nenhuma das duas equivale a revisão integral. Vigência, publicação no acervo e aplicação ao veículo são informações distintas. As datas informam a conferência registrada, não um monitoramento em tempo real.</p><p>As 55 resoluções CONTRAN excluídas por orientação editorial permanecem fora da consulta ativa. Essa exclusão não comprova, por si só, um ato revogador. Consulte as ressalvas e os atos modificadores de cada referência.</p></details></details>`;
}
function renderLibrary() {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  state.query = q.get('q') || '';
  state.libraryPage = Math.max(1, Math.floor(Number(q.get('page'))) || 1);
  state.agency = ['SENATRAN', 'IBAMA', 'INMETRO', 'ANATEL', 'MOVER'].includes(q.get('agency'))
    ? q.get('agency')
    : '';
  const component = q.get('component') || '';
  state.filterComponent = catalog.metadata.hierarchy.some(
    (g) => g.id === component || g.children.some((c) => c.id === component),
  )
    ? component
    : '';
  state.stage = catalog.metadata.stages.some((s) => s.id === q.get('stage')) ? q.get('stage') : '';
  state.review = Object.hasOwn(libraryReviewLabels, q.get('review')) ? q.get('review') : '';
  $('#globalSearch').value = state.query;
  const selected = (s) => (s ? ' selected' : '');
  const field = (label, control) =>
    `<label class="filter-field"><span>${label}</span>${control}</label>`;
  $('#main').innerHTML =
    `<header class="page-head"><h1>Biblioteca de legislação</h1><p class="subtitle">Pesquise por número, tema ou órgão e combine os filtros para chegar à norma certa.</p></header><section class="filter-panel" aria-label="Pesquisa e filtros"><div class="filter-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><input id="librarySearch" type="search" aria-label="Pesquisar na biblioteca" placeholder="Nome, número da norma ou assunto…" autocomplete="off" spellcheck="false" value="${esc(state.query)}"></div><div class="filter-row">${field('Órgão ou programa', `<select id="agencyFilter"><option value="">Todos</option>${['SENATRAN', 'IBAMA', 'INMETRO', 'ANATEL', 'MOVER'].map((a) => `<option${selected(state.agency === a)}>${a}</option>`).join('')}</select>`)}${field('Componente ou tema', `<select id="componentFilter"><option value="">Todos</option>${catalog.metadata.hierarchy.map((g) => `<optgroup label="${esc(g.label)}"><option value="${g.id}"${selected(state.filterComponent === g.id)}>${esc(g.label)} · todos os assuntos</option>${g.children.map((c) => `<option value="${c.id}"${selected(state.filterComponent === c.id)}>${esc(c.label)}</option>`).join('')}</optgroup>`).join('')}</select>`)}${field('Etapa da homologação', `<select id="stageFilter"><option value="">Todas</option>${catalog.metadata.stages.map((c) => `<option value="${c.id}"${selected(state.stage === c.id)}>${esc(c.label)}</option>`).join('')}</select>`)}${field(
      'Profundidade da revisão',
      `<select id="reviewFilter"><option value="">Todas</option>${Object.entries(
        libraryReviewLabels,
      )
        .map(
          ([id, label]) =>
            `<option value="${id}"${selected(state.review === id)}>${esc(label)}</option>`,
        )
        .join('')}</select>`,
    )}</div><div class="filter-foot"><div class="filter-chips" id="libraryChips"></div><button class="btn quiet" id="clearFilters" type="button">Limpar filtros</button></div></section><div class="results-head"><p class="count-line" id="resultCount" role="status" aria-live="polite"></p><div class="results-actions"><a id="libraryPermalink" href="#library">Abrir este link</a><button class="btn quiet" id="copyLibraryLink" type="button">Copiar link</button><span id="libraryCopyStatus" role="status"></span></div></div><div class="document-list" id="documents"></div><nav id="libraryPagination" class="pagination" aria-label="Páginas da biblioteca"></nav><details class="consultation-help"><summary>Como interpretar os resultados</summary><p>Pesquise o número da norma ou termos como bancos, emissões, rádio e VIN. Categorias transversais reúnem temas que não pertencem a uma peça do veículo.</p><p>Os filtros organizam informações; não determinam quais obrigações se aplicam a um veículo. Confira categoria, datas, configuração e exceções no texto oficial.</p></details>${consultationSources()}<p class="scope-note">CONTRAN, PROCONVE, Inmetro e Anatel: conferência registrada em 18/10/2026, com profundidades distintas. Consulte os detalhes de cada referência e as <a href="#updates">pendências de atualização</a>.</p>`;
  updateList();
  $('#librarySearch').addEventListener('input', (e) => {
    state.query = e.target.value;
    state.libraryPage = 1;
    $('#globalSearch').value = state.query;
    history.replaceState(null, '', libraryRoute(libraryValues()));
    updateList();
  });
  for (const [id, key] of [
    ['agencyFilter', 'agency'],
    ['componentFilter', 'filterComponent'],
    ['stageFilter', 'stage'],
    ['reviewFilter', 'review'],
  ]) {
    $('#' + id).addEventListener('change', (e) => {
      state[key] = e.target.value;
      state.libraryPage = 1;
      history.pushState(null, '', libraryRoute(libraryValues()));
      updateList();
    });
  }
  $('#libraryChips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-clear-filter]');
    if (!chip) return;
    const key = chip.dataset.clearFilter === 'query' ? 'query' : chip.dataset.clearFilter;
    state[key] = '';
    if (key === 'query') $('#globalSearch').value = '';
    state.libraryPage = 1;
    history.pushState(null, '', libraryRoute(libraryValues()));
    renderLibrary();
    $('#librarySearch').focus({ preventScroll: true });
  });
  $('#copyLibraryLink').onclick = async () => {
    const url = new URL(libraryRoute(libraryValues()), location.href).href;
    try {
      await navigator.clipboard.writeText(url);
      $('#libraryCopyStatus').textContent = 'Link copiado.';
    } catch {
      $('#libraryCopyStatus').textContent =
        'Use “Link desta consulta” para abrir ou copiar o endereço pelo navegador.';
    }
  };
}
