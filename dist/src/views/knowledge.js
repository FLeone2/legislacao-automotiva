'use strict';

// This screen reads the generated consultation index. It never writes legal
// states, selects requirements or promotes editorial candidates into acts.
const RegulatoryKnowledge = (() => {
  const kinds = {
    acts: 'Atos do acervo',
    sources: 'Fontes do guia',
    candidates: 'Candidatos à revisão',
  };
  const reviewLabels = {
    directed_text_review: 'Revisão dirigida de trechos',
    index_review: 'Revisão de índice',
    reference_only: 'Referência identificada',
    official_act_targeted_review: 'Revisão dirigida de dispositivos',
    official_guidance: 'Orientação oficial',
    official_index: 'Índice oficial',
    official_service: 'Serviço oficial',
    official_original_text: 'Texto oficial de origem',
    official_act_archived_targeted_review: 'Revisão dirigida de texto oficial arquivado',
    repository_directed_review: 'Revisão dirigida registrada no acervo',
    official_indexed_excerpt: 'Trecho de índice oficial',
  };
  const normalize = (value) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  function route(values = {}) {
    const query = new URLSearchParams(
      Object.entries(values).filter(([, value]) => value && value !== 'all'),
    );
    return '#knowledge' + (query.size ? '?' + query : '');
  }
  function markdownPath(record, kind, manifest) {
    const folder = { acts: 'acts', sources: 'sources', candidates: 'candidates' }[kind];
    if (!folder || !/^[a-z0-9][a-z0-9-]*$/.test(record?.id || '')) return '';
    const path = `${folder}/${record.id}.md`;
    return Object.hasOwn(manifest.artifacts || {}, path) ? 'knowledge/' + path : '';
  }
  function rows(index, candidates) {
    return [
      ...(index.tables?.acts || []).map((record) => ({ ...record, kind: 'acts' })),
      ...(index.tables?.sources || []).map((record) => ({ ...record, kind: 'sources' })),
      ...candidates.map((record) => ({ ...record, kind: 'candidates' })),
    ];
  }
  function review(record) {
    return record.kind === 'sources' ? record.evidenceType || '' : record.reviewStatus?.state || '';
  }
  function filter(records, values) {
    const terms = normalize(values.q).trim().split(/\s+/).filter(Boolean);
    return records.filter(
      (record) =>
        (!values.kind || values.kind === 'all' || values.kind === record.kind) &&
        (!values.agency || normalize(record.agency) === normalize(values.agency)) &&
        (!values.review || review(record) === values.review) &&
        (!terms.length ||
          terms.every((term) =>
            normalize(
              [
                record.id,
                record.title,
                record.agency,
                record.scope,
                record.device,
                record.ementa,
                ...(record.requirementIds || []),
                ...(record.phases || []),
              ].join(' '),
            ).includes(term),
          )),
    );
  }
  function values(search) {
    const query = new URLSearchParams(search);
    return {
      q: query.get('q') || '',
      kind: Object.hasOwn(kinds, query.get('kind')) ? query.get('kind') : '',
      agency: (query.get('agency') || '').toUpperCase(),
      review: query.get('review') || '',
      page: Number.isFinite(Number(query.get('page')))
        ? Math.max(1, Math.floor(Number(query.get('page'))) || 1)
        : 1,
    };
  }
  return { kinds, reviewLabels, route, markdownPath, rows, review, filter, values };
})();

let regulatoryKnowledgePromise;
async function loadRegulatoryKnowledge() {
  if (!regulatoryKnowledgePromise) {
    regulatoryKnowledgePromise = Promise.all([
      fetch('knowledge/manifest.json').then(knowledgeJSONResponse),
      fetch('data/process/knowledge-index.json').then(knowledgeJSONResponse),
      fetch('knowledge/candidates.jsonl').then(async (response) => {
        if (!response.ok) throw new Error('Candidate index unavailable');
        return (await response.text())
          .split(/\r?\n/)
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line));
      }),
    ])
      .then(([manifest, index, candidates]) => {
        if (
          !manifest.revision ||
          !manifest.artifacts ||
          !Array.isArray(index.tables?.acts) ||
          !Array.isArray(index.tables?.sources) ||
          !Array.isArray(candidates)
        )
          throw new Error('Invalid knowledge index');
        if (
          manifest.counts.acts !== index.tables.acts.length ||
          manifest.counts.sourceCards !== index.tables.sources.length ||
          manifest.counts.candidates !== candidates.length
        )
          throw new Error('Knowledge index revision mismatch');
        return { manifest, index, rows: RegulatoryKnowledge.rows(index, candidates) };
      })
      .catch((error) => {
        regulatoryKnowledgePromise = undefined;
        throw error;
      });
  }
  return regulatoryKnowledgePromise;
}
async function knowledgeJSONResponse(response) {
  if (!response.ok) throw new Error('Knowledge index unavailable');
  return response.json();
}
function knowledgeMarkdownLink(record, manifest) {
  const path = RegulatoryKnowledge.markdownPath(record, record.kind, manifest);
  return path
    ? `<a class="btn" href="${esc(path)}" target="_blank" rel="noopener noreferrer">Ficha Markdown ${externalLinkIcon()}</a>`
    : '';
}
function knowledgeRecordCard(record, manifest) {
  const source = record.kind === 'sources';
  const candidate = record.kind === 'candidates';
  const review =
    RegulatoryKnowledge.reviewLabels[RegulatoryKnowledge.review(record)] ||
    'Profundidade da revisão não informada';
  const publication = candidate
    ? 'Candidato · fora do catálogo ativo'
    : source
      ? 'Fonte de consulta · não constitui novo ato'
      : record.publication?.included === true
        ? 'Incluído no acervo de consulta'
        : record.publication?.included === false
          ? 'Excluído da consulta ativa'
          : 'Condição editorial de publicação não informada';
  const legal = source
    ? 'O tipo de fonte não determina vigência.'
    : candidate
      ? 'Vigência e aplicação ainda não estabelecidas nesta base.'
      : record.statusLabel || 'Indicação de vigência não informada';
  const date = source ? record.checkedAt : record.reviewDate || record.reviewStatus?.reviewedAt;
  const details = source ? record.scope : candidate ? record.ementa : '';
  const limitations = source
    ? record.limitations
    : candidate
      ? (record.requiredReview || []).join(' ')
      : 'A íntegra do ato não está incluída nesta ficha. A aplicação exige análise da categoria, configuração, datas e exceções do projeto.';
  return `<article class="document portal-list-item knowledge-record" data-knowledge-id="${esc(record.id)}" data-knowledge-kind="${esc(record.kind)}"><div class="row portal-record-meta"><span class="tag">${esc(String(record.agency || '').toUpperCase())}</span><span class="status">${esc(publication)}</span></div><h3>${esc(record.title)}</h3>${details ? `<p>${esc(details)}</p>` : ''}<dl class="knowledge-record-states"><div><dt>${source ? 'Tipo de evidência' : 'Indicação legal'}</dt><dd>${esc(source ? review : legal)}</dd></div><div><dt>${source ? 'Conferência da fonte' : 'Revisão'}</dt><dd>${esc(source ? legal : review)}${date ? ` · conferência registrada em ${esc(date)}` : ''}${!source && record.reviewStatus?.fullTextReviewed !== true ? '<br>Revisão integral não comprovada.' : ''}</dd></div>${source && record.device ? `<div><dt>Dispositivo consultado</dt><dd>${esc(record.device)}</dd></div>` : ''}</dl>${limitations ? `<p class="document-context">${esc(limitations)}</p>` : ''}<div class="portal-actions">${knowledgeMarkdownLink(record, manifest)}${safeLink(record.officialUrl || record.url, 'Fonte oficial')}${!source && !candidate ? `<a href="${esc('#library?' + new URLSearchParams({ q: record.title }))}">Consultar na biblioteca →</a>` : ''}</div>${record.provenance?.path ? `<details class="knowledge-provenance"><summary>Rastreabilidade da ficha</summary><p>Identificador: <code>${esc(record.id)}</code><br>Origem editorial: <code>${esc(record.provenance.path)}${esc(record.provenance.pointer || '')}</code></p>${RegulatoryKnowledge.markdownPath(record, record.kind, manifest) ? `<p>SHA-256 do Markdown: <code>${esc(manifest.artifacts[RegulatoryKnowledge.markdownPath(record, record.kind, manifest).replace(/^knowledge\//, '')])}</code></p>` : ''}</details>` : ''}</article>`;
}
function knowledgeDownloads(manifest) {
  const files = [
    ['README.md', 'Índice e contrato da base'],
    ['records.jsonl', 'Atos em JSONL'],
    ['sources.jsonl', 'Fontes em JSONL'],
    ['chunks.jsonl', 'Trechos citáveis'],
    ['relations.jsonl', 'Relações com proveniência'],
    ['candidates.jsonl', 'Candidatos separados'],
  ];
  return files
    .filter(([path]) => Object.hasOwn(manifest.artifacts, path))
    .map(
      ([path, label]) =>
        `<a href="knowledge/${path}" target="_blank" rel="noopener noreferrer">${label} ${externalLinkIcon()}</a>`,
    )
    .join('');
}
async function renderKnowledge() {
  const openingRoute = location.hash;
  $('#main').innerHTML =
    '<header class="portal-header"><div><div class="portal-eyebrow">Legislação com fontes</div><h1 class="portal-title">Base regulatória</h1><p class="portal-summary" role="status">Carregando o índice de atos e fichas Markdown…</p></div></header>';
  let data;
  try {
    data = await loadRegulatoryKnowledge();
  } catch {
    if (location.hash !== openingRoute || state.view !== 'knowledge') return;
    $('#main').innerHTML =
      `<header class="portal-header"><h1 class="portal-title">Base regulatória</h1></header><section class="empty portal-empty"><h2>Não foi possível carregar o índice</h2><p>Você pode tentar novamente ou acessar os arquivos publicados diretamente.</p><button class="btn" id="knowledgeRetry">Tentar novamente</button><a href="knowledge/README.md" target="_blank" rel="noopener noreferrer">Abrir o índice Markdown ${externalLinkIcon()}</a></section>`;
    $('#knowledgeRetry').onclick = renderKnowledge;
    return;
  }
  if (location.hash !== openingRoute || state.view !== 'knowledge') return;
  const { manifest, rows } = data;
  let values = RegulatoryKnowledge.values(location.hash.split('?')[1] || '');
  const agencies = [
    ...new Set(rows.map((record) => String(record.agency || '').toUpperCase()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const reviews = [...new Set(rows.map(RegulatoryKnowledge.review).filter(Boolean))].sort();
  if (!agencies.includes(values.agency)) values.agency = '';
  if (!reviews.includes(values.review)) values.review = '';
  const option = (value, label, selected) =>
    `<option value="${esc(value)}"${selected === value ? ' selected' : ''}>${esc(label)}</option>`;
  const counts = manifest.counts;
  $('#main').innerHTML =
    `<div class="knowledge-page" data-knowledge-revision="${esc(manifest.revision)}"><header class="portal-header"><div><div class="portal-eyebrow">Fontes, dispositivos e rastreabilidade</div><h1 class="portal-title">Base regulatória</h1><p class="portal-summary">A legislação por trás do guia. Consulte as fichas, confira as evidências e leve as referências para o seu projeto.</p></div><nav class="portal-actions" aria-label="Usar a base no projeto"><a class="btn" href="${esc(portalGuideRoute('coverage'))}">Cobertura e pendências →</a><a href="${esc(portalGuideRoute('checklist'))}">Checklist do processo</a><a href="#updates">Atualizações</a></nav></header><dl class="knowledge-counts" aria-label="Conteúdo desta revisão"><div><dt>Fichas de atos</dt><dd>${esc(counts.acts)}</dd></div><div><dt>Fontes do guia</dt><dd>${esc(counts.sourceCards)}</dd></div><div><dt>Trechos normativos</dt><dd>${esc(counts.normativeExcerpts)}</dd></div><div><dt>Orientações oficiais</dt><dd>${esc(counts.officialGuidanceItems)}</dd></div></dl><p class="scope-note">${esc(manifest.scopeNote)} Atos excluídos permanecem fora desta coleção; exclusão editorial não comprova revogação. As referências históricas cadastradas podem ser localizadas pela busca na <a href="#library">Biblioteca</a>. As fichas Markdown reúnem metadados, trechos e relações; não contêm a íntegra de cada lei. Revisão, indicação de vigência, publicação no acervo e aplicação ao veículo são informações distintas.</p><section class="portal-panel portal-filter-panel" aria-label="Pesquisar a base regulatória"><div class="portal-section-heading"><h2>Encontre uma referência</h2><p>Busque por título, número, identificador ou escopo das fontes.</p></div><div class="library-toolbar portal-filters"><input id="knowledgeSearch" type="search" aria-label="Pesquisar a base regulatória" placeholder="Ex.: CONAMA 492, freios, LCVM…" value="${esc(values.q)}"><select id="knowledgeKind" aria-label="Filtrar tipo de referência">${option('', 'Atos e fontes; candidatos em separado', values.kind)}${Object.entries(
      RegulatoryKnowledge.kinds,
    )
      .map(([key, label]) => option(key, label, values.kind))
      .join(
        '',
      )}</select><select id="knowledgeAgency" aria-label="Filtrar órgão da base">${option('', 'Todos os órgãos', values.agency)}${agencies.map((agency) => option(agency, agency, values.agency)).join('')}</select><select id="knowledgeReview" aria-label="Filtrar revisão ou natureza da fonte">${option('', 'Todas as revisões e naturezas de fonte', values.review)}${reviews.map((review) => option(review, RegulatoryKnowledge.reviewLabels[review] || 'Revisão não classificada: ' + review, values.review)).join('')}</select><button class="btn" id="knowledgeClear">Limpar filtros</button></div><a id="knowledgePermalink" href="#knowledge">Link desta consulta</a></section><section class="portal-results" aria-labelledby="knowledgeResultsHeading"><div class="portal-section-heading"><h2 id="knowledgeResultsHeading">Atos e fontes de consulta</h2><p id="knowledgeCount" role="status" aria-live="polite"></p></div><div id="knowledgeRecords" class="document-list portal-list"></div><nav id="knowledgePagination" class="portal-actions portal-pagination" aria-label="Páginas da base regulatória"></nav></section><section id="knowledgeCandidates" class="knowledge-candidates" aria-labelledby="knowledgeCandidatesHeading"><div class="portal-section-heading"><h2 id="knowledgeCandidatesHeading">Candidatos à revisão</h2><p>Referências identificadas no monitoramento editorial. Permanecem fora do catálogo ativo e não geram obrigações no checklist.</p></div><p id="knowledgeCandidateCount" role="status"></p><div id="knowledgeCandidateRecords" class="document-list portal-list"></div></section><section class="knowledge-access portal-context-card" aria-labelledby="knowledgeAccessTitle"><h2 id="knowledgeAccessTitle">Arquivos preparados para consulta por IA</h2><p>As fichas Markdown e os índices JSONL estão publicados com identificadores, fontes, dispositivos, hashes e limites de revisão. Esta versão oferece busca no índice e acesso aos arquivos. Uma API multiusuário, pesquisa vetorial e assistente conectado ainda não estão implantados.</p><nav class="portal-actions" aria-label="Arquivos da base regulatória">${knowledgeDownloads(manifest)}<a href="knowledge/manifest.json" target="_blank" rel="noopener noreferrer">Manifesto e hashes ${externalLinkIcon()}</a></nav><details class="knowledge-provenance"><summary>Versão e atualização da base</summary><p>Revisão publicada: <code>${esc(manifest.revision)}</code></p><p>O monitoramento registra acesso e mudanças técnicas nas fontes. A análise editorial deve confirmar alterações, dispositivos e efeitos antes de atualizar requisitos. Uma resposta HTTP ou um hash não comprovam vigência nem revisão integral.</p><p><a href="docs/guide/arquitetura-base-regulatoria.md" target="_blank" rel="noopener noreferrer">Arquitetura e estrutura do banco ${externalLinkIcon()}</a></p></details></section></div>`;
  function update() {
    const matches = RegulatoryKnowledge.filter(rows, values);
    const published = matches.filter((record) => record.kind !== 'candidates');
    const candidates = matches.filter((record) => record.kind === 'candidates');
    const pages = Math.max(1, Math.ceil(published.length / 20));
    values.page = Math.min(pages, values.page);
    const start = (values.page - 1) * 20;
    const visible = published.slice(start, start + 20);
    $('#knowledgeCount').textContent = published.length
      ? `${published.length} fichas encontradas · exibindo ${start + 1}–${start + visible.length}`
      : 'Nenhum ato ou fonte com estes filtros.';
    $('#knowledgeRecords').innerHTML =
      visible.map((record) => knowledgeRecordCard(record, manifest)).join('') ||
      '<div class="empty portal-empty"><h3>Nenhuma ficha encontrada</h3><p>Experimente o número da norma ou remova um filtro. A ausência de uma referência não comprova dispensa de obrigação.</p><button class="btn" data-knowledge-clear>Limpar filtros</button></div>';
    $('#knowledgePagination').innerHTML =
      pages > 1
        ? `${values.page > 1 ? `<a class="btn" href="${esc(RegulatoryKnowledge.route({ ...values, page: values.page - 1 }))}">← Anterior</a>` : ''}<span>Página ${values.page} de ${pages}</span>${values.page < pages ? `<a class="btn" href="${esc(RegulatoryKnowledge.route({ ...values, page: values.page + 1 }))}">Próxima →</a>` : ''}`
        : '';
    $('#knowledgeCandidates').hidden = !!values.kind && values.kind !== 'candidates';
    $('#knowledgeCandidateCount').textContent =
      `${candidates.length} candidatos com estes filtros · ${counts.candidates} identificados nesta revisão`;
    $('#knowledgeCandidateRecords').innerHTML =
      candidates.map((record) => knowledgeRecordCard(record, manifest)).join('') ||
      '<p class="scope-note">Nenhum candidato encontrado com estes filtros.</p>';
    $('#knowledgePermalink').href = RegulatoryKnowledge.route(values);
  }
  function clear() {
    values = { q: '', kind: '', agency: '', review: '', page: 1 };
    for (const selector of [
      'knowledgeSearch',
      'knowledgeKind',
      'knowledgeAgency',
      'knowledgeReview',
    ])
      $('#' + selector).value = '';
    history.pushState(null, '', RegulatoryKnowledge.route(values));
    update();
    $('#knowledgeSearch').focus();
  }
  $('#knowledgeSearch').addEventListener('input', (event) => {
    values.q = event.target.value;
    values.page = 1;
    history.replaceState(null, '', RegulatoryKnowledge.route(values));
    update();
  });
  for (const [id, field] of [
    ['knowledgeKind', 'kind'],
    ['knowledgeAgency', 'agency'],
    ['knowledgeReview', 'review'],
  ]) {
    $('#' + id).addEventListener('change', (event) => {
      values[field] = event.target.value;
      values.page = 1;
      history.pushState(null, '', RegulatoryKnowledge.route(values));
      update();
    });
  }
  $('#knowledgeClear').onclick = clear;
  $('#knowledgeRecords').onclick = (event) => {
    if (event.target.closest('[data-knowledge-clear]')) clear();
  };
  update();
}

if (typeof module !== 'undefined' && module.exports) module.exports = { RegulatoryKnowledge };
