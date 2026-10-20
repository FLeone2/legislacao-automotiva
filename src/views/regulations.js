'use strict';
function contranFiltered(data, q) {
  const search = norm(q.get('q')),
    system = q.get('system'),
    component = q.get('component'),
    subsystem = q.get('subsystem'),
    category = q.get('category'),
    phase = q.get('phase'),
    record = q.get('record');
  return data.records.filter(
    (r) =>
      r.active === true &&
      (!record || r.id === record) &&
      (!system || r.systems.includes(system)) &&
      (!category || r.generalCategories.includes(category)) &&
      (!phase || r.phases?.includes(phase)) &&
      (!component ||
        r.vehicleLinks.some(
          (x) => x.componentId === component && (!subsystem || x.subsystemId === subsystem),
        )) &&
      (!search ||
        norm(
          `${r.number}/${r.year} ${r.number}/${String(r.year).slice(-2)} ${r.title || ''} ${r.subject} ${r.sourceStatus || ''} ${(r.topics || []).join(' ')} ${(r.requirements || []).map((x) => x.title + ' ' + x.rule).join(' ')}`,
        ).includes(search)),
  );
}
function regulatoryUrl(view, values = {}) {
  const q = new URLSearchParams(Object.entries(values).filter(([, v]) => v));
  return '#' + view + (q.size ? '?' + q : '');
}
function regulatoryContext(q) {
  return Object.fromEntries(
    ['component', 'subsystem'].filter((key) => q.get(key)).map((key) => [key, q.get(key)]),
  );
}
function regulatoryQueryFilters(q) {
  return Object.fromEntries(
    ['q', 'system', 'component', 'subsystem', 'category', 'phase', 'record']
      .filter((key) => q.get(key))
      .map((key) => [key, q.get(key)]),
  );
}
function regulatoryExportPayload(data, q, context) {
  // The initial index deliberately omits evidence-only search text. Use the
  // actual query result IDs to enrich exports, so opening details cannot turn
  // an export into a different search over the full source.
  const selected = context.recordIds
    ? data.records.filter((record) => context.recordIds.includes(record.id))
    : contranFiltered(data, q);
  if (context.recordIds && selected.length !== new Set(context.recordIds).size)
    throw new Error('A consulta mudou de versão. Recarregue a página.');
  const records = canonicalCatalogRecords(selected).map((record) => ({
    ...record,
    // Raw sources carry requirements; compact records also carry their IDs.
    // Normalize once so JSON and CSV share the same traceable references.
    requirementIds: [
      ...new Set(
        [
          ...(record.requirementIds || []),
          ...(record.requirements || []).map((requirement) => requirement.id),
        ].filter(Boolean),
      ),
    ],
  }));
  return {
    schemaVersion: 1,
    query: {
      url: context.queryUrl,
      filters: regulatoryQueryFilters(q),
      exportedAt: context.exportedAt,
      source: context.sourceUrl,
      sourceAsOf: data.metadata.asOf,
      datasetSha256: context.datasetSha256,
      resultCount: records.length,
    },
    metadata: data.metadata,
    records,
  };
}
function regulatoryExportCsv(payload) {
  const fields = [
    'id',
    'title',
    'number',
    'year',
    'subject',
    'statusLabel',
    'officialUrl',
    'systems',
    'vehicleLinks',
    'generalCategories',
    'phases',
    'legalStatus',
    'reviewStatus',
    'applicability',
    'publication',
    'temporalFlags',
    'relationships',
    'requirementIds',
  ];
  const context = {
    queryUrl: payload.query.url,
    queryFilters: payload.query.filters,
    exportedAt: payload.query.exportedAt,
    sourceAsOf: payload.query.sourceAsOf,
    sourceUrl: payload.query.source,
    datasetSha256: payload.query.datasetSha256,
    resultCount: payload.query.resultCount,
  };
  const columns = [...Object.keys(context), ...fields];
  const cell = (value) => {
    const text =
      value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    '\uFEFF' +
    [
      columns,
      ...payload.records.map((record) => columns.map((key) => ({ ...context, ...record })[key])),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n') +
    '\r\n'
  );
}
async function exportRegulatoryQuery(view, query, format, button) {
  const status = $('#regulatoryExportStatus');
  const q = new URLSearchParams(query);
  const recordIds = contranFiltered(regulatoryData[view], q).map((record) => record.id);
  button.disabled = true;
  status.textContent = 'Preparando a consulta…';
  try {
    const source = new URL(regulatoryConfig[view].url, location.href);
    const response = await fetch(source, { cache: 'no-store' });
    if (!response.ok) throw new Error('Acervo indisponível');
    const bytes = await response.arrayBuffer();
    const data = JSON.parse(new TextDecoder().decode(bytes));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const datasetSha256 = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    const payload = regulatoryExportPayload(data, q, {
      queryUrl: new URL(regulatoryUrl(view, regulatoryQueryFilters(q)), location.href).href,
      sourceUrl: source.href,
      exportedAt: new Date().toISOString(),
      datasetSha256,
      recordIds,
    });
    if (format === 'csv' && !payload.records.length) {
      status.textContent =
        'Nenhum resultado para exportar. O JSON mantém os dados da consulta vazia.';
      return;
    }
    const body =
      format === 'csv' ? regulatoryExportCsv(payload) : JSON.stringify(payload, null, 2) + '\n';
    const blob = new Blob([body], {
      type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
    });
    const download = document.createElement('a');
    download.href = URL.createObjectURL(blob);
    download.download = `consulta-${view}-${payload.query.exportedAt.slice(0, 10)}.${format}`;
    download.click();
    setTimeout(() => URL.revokeObjectURL(download.href), 1000);
    status.textContent = `${payload.records.length} referências exportadas.`;
  } catch {
    status.textContent = 'Não foi possível exportar a consulta. Tente novamente.';
  } finally {
    button.disabled = false;
  }
}
async function renderRegulations(view) {
  const route = location.hash;
  $('#app').classList.add('contran-mode');
  $('#main').innerHTML =
    `<h1>${esc(regulatoryConfig[view].title)}</h1><p role="status">Carregando as referências…</p>`;
  try {
    await loadRegulations(view);
    const guide = new URLSearchParams(location.hash.split('?')[1] || '').get('guide');
    if (guide) {
      if (state.view === view && route === location.hash) renderProcedureGuide(view, guide);
      return;
    }
    const requested = new URLSearchParams(location.hash.split('?')[1] || '').get('record');
    if (
      requested &&
      regulatoryHistoricalReferences.some((r) => r.agency === view && r.id === requested)
    ) {
      location.hash = regulatoryHistoryUrl(view, requested);
      return;
    }
    if (requested && regulatoryData[view].records.some((r) => r.id === requested))
      await loadRegulationRecord(view, requested);
    if (state.view !== view || route !== location.hash) return;
    if (regulatoryBaseCatalog) {
      catalog = installActiveRegulations(regulatoryBaseCatalog);
      delete treeModels.tree;
      delete treeModels.mover;
    }
    renderRegulatoryPage(view);
  } catch (e) {
    if (state.view !== view || route !== location.hash) return;
    $('#main').innerHTML =
      `<h1>${esc(regulatoryConfig[view].title)}</h1><p class="notice" role="alert">Não foi possível carregar as referências. Tente novamente.</p><button class="btn" data-contran-retry>Tentar novamente</button>`;
  }
}
function renderContran() {
  return renderRegulations('contran');
}
function renderProconve() {
  return renderRegulations('proconve');
}
function renderInmetro() {
  return renderRegulations('inmetro');
}
function renderAnatel() {
  return renderRegulations('anatel');
}
function renderRegulatoryPage(view) {
  const data = regulatoryData[view],
    m = data.metadata,
    config = regulatoryConfig[view],
    q = new URLSearchParams(location.hash.split('?')[1] || '');
  const rows = contranFiltered(data, q),
    pages = Math.max(1, Math.ceil(rows.length / contranPageSize)),
    page = Math.min(pages, Math.max(1, Math.floor(Number(q.get('page'))) || 1));
  const options = (list, current) =>
    list
      .map(
        ([value, label]) =>
          `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`,
      )
      .join('');
  const categories = Object.entries(m.categoryLabels).filter(([id]) =>
    data.records.some((r) => r.generalCategories.includes(id)),
  );
  const component = ComponentFlow.component(q.get('component'));
  const withoutContext = new URLSearchParams(q);
  for (const key of ['component', 'subsystem', 'page']) withoutContext.delete(key);
  const contextChip = q.get('component')
    ? `<p class="regulatory-context">Sistema: <strong>${esc(component?.label || 'Conjunto não cadastrado')}</strong>${q.get('subsystem') ? ' · ' + esc(systemLabel(q.get('subsystem'))) : ''} <a class="btn" data-regulatory-remove-context href="${esc(regulatoryUrl(view, Object.fromEntries(withoutContext)))}">Remover sistema</a>${component ? ` <a href="${esc(vehicleLink(component, null, q.get('subsystem')))}">← Voltar ao veículo</a>` : ''}</p>`
    : '';
  const notice =
    view === 'contran'
      ? `Fonte atualizada em ${esc(m.sourceModifiedText || 'data não informada')}. Consulte a fonte e as condições registradas abaixo.`
      : view === 'proconve'
        ? 'L8: automóveis e comerciais leves. P8: veículos pesados. Selecione a fase; as exigências não são intercambiáveis.'
        : esc(
            m.scopeNote ||
              'Certificação depende do produto e do escopo do ato; conferir requisitos, exclusões e transições.',
          );
  const categoryLinks = categories
    .map(
      ([id, label]) =>
        `<a class="regulatory-category ${q.get('category') === id ? 'selected' : ''}" href="${regulatoryUrl(view, { category: id })}"><strong>${esc(label)}</strong><span>${data.records.filter((r) => r.generalCategories.includes(id)).length} atos</span></a>`,
    )
    .join('');
  $('#main').innerHTML =
    `<div class="eyebrow">Acervo de referência · ${esc(config.issuer)}</div><h1>${esc(config.title)}</h1><p class="subtitle">Do sistema do veículo à norma. Assuntos transversais organizados em categorias próprias.</p>${['inmetro', 'anatel'].includes(view) ? '<p><a class="btn" href="#markings">Etiquetas, selos e VIN →</a></p>' : ''}<div class="contran-source"><div><strong>Revisão: ${esc((m.publicationDate || m.asOf).split('-').reverse().join('/'))}</strong><span>${notice}</span></div>${safeLink(m.sourceUrl, 'Fonte oficial', 'btn')}</div><div class="contran-counts"><div><strong>${m.activeCount}</strong><span>${view === 'inmetro' ? 'referências atuais na consulta' : 'atos na consulta ativa'}</span></div><div><strong>${m.systemLinkedCount}</strong><span>ligados a sistemas</span></div><div><strong>${m.generalCategoryCount}</strong><span>em categorias gerais</span></div><div><strong>${categories.length}</strong><span>categorias transversais</span></div></div>${view === 'proconve' ? `<nav class="regulatory-phases" aria-label="Fase PROCONVE"><a href="#proconve">Todas as fases mapeadas</a><a href="#proconve?phase=L8">L8 · veículos leves</a><a href="#proconve?phase=P8">P8 · veículos pesados</a></nav>` : ''}${contextChip}<details class="regulatory-categories" ${!component && !q.get('record') ? 'open' : ''}><summary>Assuntos sem relação direta com um sistema físico</summary><div>${categoryLinks || '<p>Não há categoria geral neste recorte.</p>'}</div></details><form class="contran-filters" id="contranFilters"><label>Buscar norma ou assunto<input id="contranSearch" type="search" placeholder="Número, ano, assunto…" value="${esc(q.get('q') || '')}"></label><label>Sistema do veículo<select id="contranSystem">${options([['', 'Todos os sistemas'], ...catalog.metadata.components.filter((c) => SYSTEM_CONTRAN_LABELS[c.id]).map((c) => [c.id, c.label])], q.get('system') || '')}</select></label><label>Categoria geral<select id="contranCategory">${options([['', 'Todas as categorias'], ...categories], q.get('category') || '')}</select></label>${
      view === 'proconve'
        ? `<label>Fase<select id="regulatoryPhase">${options(
            [
              ['', 'Todas as fases'],
              ['L8', 'L8 · leves'],
              ['P8', 'P8 · pesados'],
            ],
            q.get('phase') || '',
          )}</select></label>`
        : '<p class="regulatory-filter-note">Consulte a situação de vigência, o nível de revisão e as condições de aplicação em cada referência.</p>'
    }<button class="btn primary" type="submit">Pesquisar</button><button class="btn" type="button" data-contran-clear>Limpar</button></form>${regulatoryProcedureDirectory(view)}<div class="contran-results-heading"><p id="contranResultCount" role="status">${rows.length} resultados · página ${page} de ${pages}</p><div><button class="btn" data-regulatory-export="csv">Exportar consulta · CSV ↓</button><button class="btn" data-regulatory-export="json">Consulta e evidências · JSON ↓</button><a href="${config.csv}" download>Acervo completo · CSV (${data.records.length}) ↓</a><a href="${config.url}" download>Acervo completo · JSON ↓</a><span id="regulatoryExportStatus" role="status"></span></div></div><div class="contran-records">${
      rows
        .slice((page - 1) * contranPageSize, page * contranPageSize)
        .map(contranCard)
        .join('') ||
      `<div class="empty"><h2>Nenhum ato ativo neste recorte</h2><p>${q.get('record') ? 'O registro solicitado não integra a consulta ativa.' : 'Altere a busca, o sistema ou a categoria.'}</p><button class="btn" data-contran-clear>Limpar filtros</button></div>`
    }</div><nav class="contran-pagination" aria-label="Páginas do acervo"><button class="btn" data-contran-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>← Anterior</button><span>Página ${page} de ${pages}</span><button class="btn" data-contran-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Próxima →</button></nav><details class="contran-method"><summary>Fontes, critérios e condições de aplicação</summary><p>${esc(m.publicationPolicy || 'Atos vigentes relacionados às fases identificadas nas fontes oficiais.')}</p><ul>${m.limits.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p>Categoria, datas, combustível, anexos, exceções e transições devem ser considerados antes de aplicar um requisito ao veículo.</p></details>`;
  $('#contranFilters').onsubmit = (e) => {
    e.preventDefault();
    const next = regulatoryContext(q);
    for (const [key, id] of [
      ['q', 'contranSearch'],
      ['system', 'contranSystem'],
      ['category', 'contranCategory'],
      ['phase', 'regulatoryPhase'],
    ])
      if ($('#' + id)?.value) next[key] = $('#' + id).value;
    location.hash = regulatoryUrl(view, next);
  };
  document.querySelectorAll('[data-regulatory-export]').forEach((button) => {
    button.onclick = () =>
      exportRegulatoryQuery(view, q.toString(), button.dataset.regulatoryExport, button);
  });
  for (const id of ['contranSystem', 'contranCategory', 'regulatoryPhase'])
    if ($('#' + id)) $('#' + id).onchange = () => $('#contranFilters').requestSubmit();
}
function regulatoryBindings(record) {
  return (
    record.vehicleLinks
      .map((link) => {
        const c = ComponentFlow.component(link.componentId);
        return c
          ? `<a href="${esc(vehicleLink(c, record.regulatoryDomain === 'environmental' ? 'ambiental' : null, link.subsystemId))}">${esc(c.label)}${link.subsystemId ? ' · ' + esc(systemLabel(link.subsystemId)) : ''} →</a>`
          : '';
      })
      .join('') ||
    record.generalCategories
      .map(
        (id) =>
          `<a href="${regulatoryUrl(state.view, { category: id })}">${esc(regulatoryData[state.view].metadata.categoryLabels[id])}</a>`,
      )
      .join('')
  );
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-contran-open]')) $('#normDialog')?.close();
  if (e.target.closest('[data-contran-retry]')) {
    renderRegulations(state.view);
    return;
  }
  if (e.target.closest('[data-contran-clear]')) {
    location.hash = state.view;
    return;
  }
  const page = e.target.closest('[data-contran-page]');
  if (page && !page.disabled) {
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    q.set('page', page.dataset.contranPage);
    location.hash = state.view + '?' + q;
  }
});

function contranCard(r) {
  if (r._summary) return regulatorySummaryCard(r);
  const label = r.title || `Resolução CONTRAN nº ${r.number}/${r.year}`;
  const relations = r.relationships.filter((x) => x.kind !== 'referencia'),
    incoming = r.incomingEffects || [];
  const relationLabels = {
    revoga: 'revoga',
    revoga_parcialmente: 'revoga parcialmente',
    revogada_por: 'revogada por',
    revogada_parcialmente_por: 'revogada parcialmente por',
    altera: 'altera',
    alterada_por: 'alterada por',
    suspende: 'suspende',
    suspensa_por: 'suspensa por',
    referenda: 'referenda',
    aprova: 'aprova',
  };
  const evidence = [...new Set(r.statusEvidence || [])];
  return `<article class="contran-record" data-contran-record="${esc(r.id)}"><div class="contran-record-top"><h2>${esc(label)}</h2><span class="contran-status ${r.currentIndication ? 'indicated' : r.status === 'revogada' ? 'repealed' : 'pending'}">${esc(r.statusLabel)}</span></div><p class="contran-subject">${esc(r.subject)}</p>${regulatoryStatusSummary(r)}${r.mechanism ? `<p class="regulatory-mechanism"><strong>Mecanismo:</strong> ${esc(r.mechanism)}</p>` : ''}${r.fullTextReviewed === false ? '<p class="notice">Referência e orientação oficiais conferidas. A íntegra consolidada do regulamento e suas exceções ainda precisam de revisão.</p>' : ''}<div class="regulatory-system-links">${regulatoryBindings(r)}</div>${regulatoryRequirements(r)}<div class="contran-tags">${(r.phases || []).map((p) => `<span>PROCONVE ${esc(p)}</span>`).join('')}${r.systems.map((s) => `<span>${esc(SYSTEM_CONTRAN_LABELS[s] || s)}</span>`).join('')}<span>${r.origin === 'historical_archive' ? 'Arquivo anterior a 1998' : `Publicação: ${esc(r.publicationDate?.split('-').reverse().join('/') || r.sourcePublicationText || 'não informada')}`}</span>${r.actNature === 'modificadora' ? '<span>Ato modificador</span>' : r.actNature === 'revogatoria' ? '<span>Ato revogatório</span>' : ''}</div>${r.amendedBasesRevoked?.length ? '<p class="contran-temporal">Este ato altera base indicada como revogada. Não utilizar a alteração isoladamente como requisito atual.</p>' : ''}<div class="contran-actions">${safeLink(r.officialUrl, r.origin === 'historical_archive' ? 'Arquivo histórico oficial (ZIP)' : 'Texto oficial', 'btn')}${r.relatedLinks
    .filter((x) => /anexo|retifica|compilad|integral|circular|\(i|\(xv/i.test(x.label))
    .map((x) => safeLink(x.url, esc(x.label), 'contran-extra-link'))
    .join(
      '',
    )}</div><details class="contran-evidence" ${new URLSearchParams(location.hash.split('?')[1] || '').get('record') === r.id ? 'open' : ''}><summary>Ver evidências, alterações e ressalvas</summary><dl><dt>Situação registrada na fonte</dt><dd>${esc(r.sourceStatus)}</dd><dt>Fundamento da situação indicada</dt><dd>${evidence.length ? evidence.map((x) => `<blockquote>${esc(x)}</blockquote>`).join('') : 'Nenhuma evidência conclusiva de vigência atual foi localizada. Não se presumiu vigência pela presença no arquivo.'}</dd>${r.entryIntoForceEvidence?.length ? `<dt>Cláusula de entrada em vigor localizada</dt><dd>${r.entryIntoForceEvidence.map((x) => `<blockquote>${esc(x)}</blockquote>`).join('')}</dd>` : ''}<dt>Relações documentais anotadas</dt><dd>${relations.length ? relations.map((x) => `<p>${esc(relationLabels[x.kind] || x.kind)} ${safeLink(x.url, esc(x.label))}</p>`).join('') : 'Nenhuma relação adicional estruturada nesta linha; isso não comprova ausência de alterações.'}</dd>${incoming.length ? `<dt>Outros atos que afetam esta referência</dt><dd>${incoming.map((x) => `<p>${safeLink(x.sourceUrl, esc(x.sourceTitle || x.sourceId))} · ${esc(relationLabels[x.kind] || x.kind)}<br>${esc(x.evidence)}</p>`).join('')}</dd>` : ''}<dt>Conferência do documento</dt><dd>${r.documentCheck.state === 'extraido' ? 'Texto extraído do recurso oficial.' : 'Texto integral não extraído nesta rodada.'}${r.documentCheck.sha256 ? `<br><small class="contran-hash">SHA-256: ${esc(r.documentCheck.sha256)}</small>` : ''}${r.archivePath ? `<br>Arquivo no ZIP: ${esc(r.archivePath)}` : ''}</dd><dt>Ressalvas</dt><dd>${(r.notes || []).map((n) => `<p>${esc(n)}</p>`).join('')}<p>${esc(r.classificationBasis)}</p></dd></dl></details></article>`;
}

function regulatoryRequirements(record, onlyTopics = null) {
  const rows = (record.requirements || []).filter(
    (r) => !onlyTopics || r.topics?.some((t) => onlyTopics.includes(t)),
  );
  if (!rows.length) return '';
  return `<section class="regulatory-requirements" aria-label="Requisitos e enquadramento"><h3>O que verificar neste ato</h3>${rows.map((r) => `<article id="requirement-${esc(r.id)}" data-canonical-requirement="${esc(r.id)}"><h4>${esc(r.title)}</h4><small class="requirement-id">${esc(r.id)}</small><p>${esc(r.rule)}</p><p class="requirement-scope"><strong>Aplicação:</strong> ${esc(r.scope)}</p><details><summary>${esc(r.clause)} · trecho da fonte</summary><blockquote>${esc(r.evidence)}</blockquote>${r.sourceUrl ? safeLink(r.sourceUrl, 'Fonte deste requisito') : ''}</details>${r.verificationPlan ? `<p class="requirement-scope"><strong>Método e evidências de ensaio:</strong> ${esc(r.verificationPlan.note)}</p>` : ''}${requirementContextLinks(r)}</article>`).join('')}</section>`;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-markings-retry]')) renderMarkings();
  const section = e.target.closest('[data-markings-section]');
  if (section)
    document.getElementById('markings-' + section.dataset.markingsSection)?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
});

function regulatorySummaryCard(record) {
  const title = record.title || `Resolução CONTRAN nº ${record.number}/${record.year}`;
  return `<article class="contran-record" data-contran-record="${esc(record.id)}"><div class="contran-record-top"><h2>${esc(title)}</h2><span class="contran-status pending">${esc(record.statusLabel)}</span></div><p class="contran-subject">${esc(record.subject)}</p>${regulatoryStatusSummary(record)}<div class="regulatory-system-links">${regulatoryBindings(record)}</div><div class="contran-tags">${(record.phases || []).map((p) => `<span>PROCONVE ${esc(p)}</span>`).join('')}</div><div class="contran-actions">${safeLink(record.officialUrl, 'Texto oficial', 'btn')}</div><details class="contran-evidence" data-lazy-record="${esc(record.id)}" data-lazy-source="${state.view}"><summary>Ver requisitos, evidências e alterações</summary><div class="record-lazy-content" role="status">Abra para consultar os detalhes.</div></details></article>`;
}
async function expandRegulatoryRecord(details) {
  if (details.dataset.loading === 'true') return;
  details.dataset.loading = 'true';
  const panel = details.querySelector('.record-lazy-content');
  panel.textContent = 'Carregando requisitos e evidências…';
  try {
    const record = await loadRegulationRecord(
      details.dataset.lazySource,
      details.dataset.lazyRecord,
    );
    if (!details.isConnected) return;
    const holder = document.createElement('div');
    holder.innerHTML = contranCard(record);
    const replacement = holder.firstElementChild;
    replacement.querySelector('.contran-evidence').open = true;
    details.closest('.contran-record').replaceWith(replacement);
    replacement.querySelector('summary').focus({ preventScroll: true });
  } catch {
    details.dataset.loading = 'false';
    panel.innerHTML =
      '<p role="alert">Não foi possível carregar os detalhes.</p><button class="btn" data-record-retry>Tentar novamente</button>';
  }
}
document.addEventListener(
  'toggle',
  (event) => {
    const details = event.target;
    if (details.matches?.('[data-lazy-record]') && details.open) expandRegulatoryRecord(details);
  },
  true,
);
document.addEventListener('click', (event) => {
  const retry = event.target.closest('[data-record-retry]');
  if (retry) expandRegulatoryRecord(retry.closest('[data-lazy-record]'));
});
