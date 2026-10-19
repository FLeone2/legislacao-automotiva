'use strict';

function regulatoryHistoryUrl(agency, id) {
  return '#history?' + new URLSearchParams({ agency, record: id });
}

function historicalSearchLinks(query) {
  const normalizeCitation = (value) =>
    norm(value).replace(/(\d+)[\s./-]+((?:19|20)\d{2})/g, '$1/$2');
  const needle = normalizeCitation(query).trim();
  if (!needle) return '';
  const matches = regulatoryHistoricalReferences.filter((record) =>
    normalizeCitation(record.title + ' ' + record.id).includes(needle),
  );
  if (!matches.length) return '';
  return `<aside class="historical-search" aria-label="Referências históricas"><strong>Histórico · fora da consulta atual</strong><div class="consultation-shortcuts">${matches.map((record) => `<a href="${esc(regulatoryHistoryUrl(record.agency, record.id))}">${esc(record.title)} →</a>`).join('')}</div></aside>`;
}

function historicalCurrentLink(id) {
  id = typeof id === 'string' ? id : id?.id || id?.actId || '';
  if (!id) return '';
  if (id.startsWith('contran-'))
    return `<a class="btn" href="#contran?record=${esc(id)}">${esc(id.replace('contran-', 'CONTRAN ').replace(/-(\d{4})$/, '/$1'))} →</a>`;
  const record = catalogRecord(catalog, id);
  return record && record.publication?.included !== false
    ? `<button class="btn" data-open="${esc(record.id)}">${esc(record.title)} →</button>`
    : '';
}

async function renderRegulatoryHistory() {
  const route = location.hash;
  const query = new URLSearchParams(route.split('?')[1] || '');
  const agency = query.get('agency') || '';
  const id = query.get('record') || '';
  $('#main').innerHTML =
    '<h1>Referência histórica</h1><p role="status">Carregando o histórico…</p>';
  try {
    const record = await loadHistoricalRecord(agency, id);
    if (route !== location.hash || state.view !== 'history') return;
    const title = record.title || `Resolução CONTRAN nº ${record.number}/${record.year}`;
    const current = [
      ...new Set(
        [
          ...(record.relatedCurrentActIds || []),
          ...(Array.isArray(record.replacedBy)
            ? record.replacedBy
            : record.replacedBy
              ? [record.replacedBy]
              : []),
          ...(record.successorId ? [record.successorId] : []),
        ]
          .map((value) => (typeof value === 'string' ? value : value?.id || value?.actId))
          .filter(Boolean),
      ),
    ];
    const sources = record.sources || record.repealChain?.sources || [];
    const chain = Array.isArray(record.repealChain)
      ? record.repealChain
      : record.repealChain
        ? [record.repealChain]
        : [];
    const evidence = chain
      .map(
        (effect) =>
          `<li>${esc(effect.evidence || effect.description || effect.note || effect.clause || '')}${effect.sourceUrl ? safeLink(effect.sourceUrl, 'Fonte do efeito') : ''}</li>`,
      )
      .join('');
    const basis = record.legalStatus?.basis
      ? `<p class="scope-note">${esc(record.legalStatus.basis)}</p>`
      : '';
    const limits = [
      ...new Set([
        ...(record.limitations || []),
        ...(record.reviewStatus?.gaps || []),
        ...(record.uncertaintyNotes || []),
      ]),
    ];
    const limitations = limits.length
      ? `<details><summary>Limites da revisão</summary><ul>${limits.map((limit) => `<li>${esc(limit)}</li>`).join('')}</ul></details>`
      : '';
    $('#main').innerHTML =
      `<article class="regulatory-history"><div class="eyebrow">Histórico normativo</div><h1>${esc(title)}</h1><p class="notice"><strong>${esc(record.statusLabel || record.status || 'Registro histórico')}</strong><br>Fora da consulta atual. Esta ficha preserva a referência e a cadeia documentada.</p><p>${esc(record.subject || record.summary || '')}</p>${regulatoryStatusSummary(record)}${basis}${limitations}${record.effectiveDate ? `<p><strong>Data de efeito registrada:</strong> ${esc(record.effectiveDate)}</p>` : ''}${evidence ? `<section><h2>Efeito e cadeia revisados</h2><ul>${evidence}</ul></section>` : ''}${current.length ? `<section><h2>Consultar as referências atuais</h2><div class="consultation-shortcuts">${current.map(historicalCurrentLink).join('')}</div></section>` : ''}${sources.length ? `<details><summary>Fontes do histórico</summary>${sources.map((source) => `<p>${safeLink(source.url || source.sourceUrl, esc(source.clause || source.label || 'Fonte oficial'))}</p>${source.excerpt ? `<blockquote>${esc(source.excerpt)}</blockquote>` : ''}`).join('')}</details>` : ''}<div class="actions">${safeLink(record.officialUrl, 'Documento original', 'btn')}<a class="btn" href="#library">Biblioteca atual →</a></div></article>`;
  } catch {
    if (route !== location.hash || state.view !== 'history') return;
    $('#main').innerHTML =
      '<h1>Histórico indisponível</h1><p role="status">Este registro não integra o histórico publicado ou não foi possível carregá-lo.</p><button class="btn" data-history-retry>Tentar novamente</button><a class="btn" href="#library">Biblioteca atual →</a>';
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-history-retry]')) renderRegulatoryHistory();
});

function regulatoryProcedureDirectory(source) {
  const guides = regulatoryData[source]?.metadata.procedureGuidance || [];
  if (!guides.length) return '';
  return `<details class="procedure-directory"><summary>Procedimentos e canais oficiais</summary><div class="consultation-shortcuts">${guides.map((guide) => `<a class="btn" href="#${source}?guide=${esc(guide.id)}">${esc(guide.label)} →</a>`).join('')}</div></details>`;
}

function renderProcedureGuide(source, id) {
  const guide = regulatoryData[source]?.metadata.procedureGuidance?.find(
    (entry) => entry.id === id,
  );
  if (!guide) {
    $('#main').innerHTML =
      `<h1>Procedimento não encontrado</h1><p role="status">Este guia não está cadastrado no recorte consultivo.</p><a class="btn" href="#${esc(source)}">Voltar ao acervo →</a>`;
    return;
  }
  const related = (guide.relatedActIds || [])
    .map((actId) => catalogRecord(catalog, actId))
    .filter((record) => record && record.publication?.included !== false);
  $('#main').innerHTML =
    `<article class="regulatory-procedure-guide" data-procedure-guide="${esc(id)}"><div class="eyebrow">Orientação oficial de serviço</div><h1>${esc(guide.label)}</h1><p>${esc(guide.scope)}</p>${guide.who ? `<p><strong>Quem consulta este caminho:</strong> ${esc(guide.who)}</p>` : ''}${guide.channel ? `<p><strong>Canal:</strong> ${safeLink(guide.channel.url, esc(guide.channel.label))}</p>` : ''}${guide.documents?.length ? `<section><h2>Informações indicadas no serviço</h2><ul>${guide.documents.map((document) => `<li>${esc(document)}</li>`).join('')}</ul></section>` : ''}${guide.conditions?.length ? `<section><h2>Condições do caminho</h2><ul>${guide.conditions.map((condition) => `<li>${esc(condition)}</li>`).join('')}</ul></section>` : ''}${guide.note ? `<p class="notice">${esc(guide.note)}</p>` : ''}${related.length ? `<section><h2>Referências relacionadas</h2><div class="consultation-shortcuts">${related.map((record) => `<button class="btn" data-open="${esc(record.id)}">${esc(record.title)} →</button>`).join('')}</div></section>` : ''}<details><summary>Fontes e escopo da orientação</summary>${(guide.sources || []).map((item) => `<p>${safeLink(item.url, esc(item.clause || 'Fonte oficial'))}</p>${item.excerpt ? `<blockquote>${esc(item.excerpt)}</blockquote>` : ''}`).join('')}<p>Revisão: ${esc(guide.reviewedAt)}. Esta orientação de serviço é distinta de uma regra jurídica ou de um checklist completo.</p></details>${regulatoryProcedureDirectory(source)}<div class="actions"><a class="btn" href="#${esc(source)}">Acervo ${esc(regulatoryConfig[source].label)} →</a><a class="btn" href="#flow?stage=aprovacoes">Fluxo de homologação →</a></div></article>`;
}
