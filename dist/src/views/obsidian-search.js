'use strict';

// Search projects the same canonical catalog as the library without changing its
// route, filters, selected vehicle or tree. All matching acts remain in the library.
function catalogSearchResults(query) {
  const records = catalogRecords(catalog).filter((record) => librarySearchMatch(record, query));
  const acts = records.map((record) => ({
    kind: 'record',
    id: record.id,
    title: record.title,
    description:
      recordTechnicalStandards(record, query)
        .slice(0, 1)
        .map((entry) => `${technicalCitationSummary(entry)} · em revisão`)
        .join('') ||
      (record.taxonomy || []).map(systemLabel).slice(0, 2).join(' · ') ||
      record.issuer ||
      record.agency,
    agency: record.issuer || record.agency,
  }));
  const parts = query.trim()
    ? VehicleLegislationData.parts
        .filter((part) =>
          norm([part.label, ...part.topics.map((topic) => topic.label)].join(' ')).includes(
            norm(query),
          ),
        )
        .map((part) => ({
          kind: 'part',
          id: part.id,
          componentId: part.componentId,
          title: part.label,
          description: 'Explorar assuntos e referências do conjunto',
          agency: 'Veículo',
        }))
    : [];
  const systems = query.trim()
    ? vehicleComponents
        .filter((component) => norm(component.label).includes(norm(query)))
        .map((component) => ({
          kind: 'system',
          id: component.id,
          title: component.label,
          description: 'Explorar os subsistemas',
          agency: 'Sistema',
        }))
    : [];
  return { records: records.length, entries: [...acts, ...parts, ...systems] };
}

const catalogSearchUI = { entries: [], selected: 0, opener: null, loading: false };
function selectCatalogSearchResult(index) {
  const options = [...document.querySelectorAll('[data-search-result]')];
  if (!options.length) {
    $('#globalSearch').removeAttribute('aria-activedescendant');
    $('#searchResults').removeAttribute('aria-activedescendant');
    return;
  }
  catalogSearchUI.selected = (index + options.length) % options.length;
  options.forEach((option, position) => {
    option.setAttribute('aria-selected', String(position === catalogSearchUI.selected));
  });
  const selected = options[catalogSearchUI.selected];
  $('#globalSearch').setAttribute('aria-activedescendant', selected.id);
  $('#searchResults').setAttribute('aria-activedescendant', selected.id);
  selected.scrollIntoView({ block: 'nearest' });
}
function renderCatalogSearchResults() {
  const query = $('#globalSearch').value;
  const results = catalogSearchResults(query);
  catalogSearchUI.entries = results.entries.slice(0, 12);
  $('#searchTechnicalStatus').innerHTML = technicalStandardsNotice();
  $('#searchStatus').textContent = results.entries.length
    ? `${results.records} referências${results.entries.length > results.records ? ` · ${results.entries.length - results.records} conjuntos ou sistemas` : ''}${results.entries.length > 12 ? ' · primeiros 12 resultados' : ''}`
    : 'Nenhum resultado. Tente outro número ou assunto.';
  $('#searchResults').innerHTML = catalogSearchUI.entries
    .map(
      (entry, index) =>
        `<button class="search-result" id="search-result-${index}" data-search-result="${index}" role="option" aria-selected="${index === 0}" tabindex="-1"><span class="result-mark">${auroraIcon(entry.kind === 'record' ? 'book' : 'car')}</span><span class="result-copy"><strong>${esc(entry.title)}</strong><small>${esc(entry.description)}</small></span><em>${esc(entry.agency)}</em>${auroraIcon('arrow')}</button>`,
    )
    .join('');
  $('#searchAllResults').href = libraryRoute({ q: query });
  $('#searchAllResults').textContent = `Ver ${results.records} referências na biblioteca →`;
  selectCatalogSearchResult(0);
}
async function openCatalogSearch(keyboard = false, query = null) {
  const dialog = $('#searchDialog');
  if ($('#assistantDialog').open) $('#assistantDialog').close();
  if (!dialog.open) {
    catalogSearchUI.opener = document.activeElement;
    dialog.dataset.keyboard = String(keyboard);
    dialog.showModal();
  }
  if (query !== null) $('#globalSearch').value = query;
  $('#globalSearch').focus({ preventScroll: true });
  if (!catalogRecords(catalog).length) {
    $('#searchStatus').textContent = 'Carregando o acervo…';
    catalogSearchUI.loading = true;
    try {
      const index = await initializeRegulatoryStore();
      regulatoryBaseCatalog = index.base;
      catalog = installActiveRegulations(index.base);
    } catch {
      if (dialog.open) {
        $('#searchStatus').textContent = 'Não foi possível carregar o acervo.';
        $('#searchResults').innerHTML =
          '<button class="btn" data-search-retry>Tentar novamente</button>';
      }
      return;
    } finally {
      catalogSearchUI.loading = false;
    }
  }
  catalogSearchUI.loading = true;
  await loadTechnicalStandards();
  catalogSearchUI.loading = false;
  if (dialog.open) renderCatalogSearchResults();
}
function closeCatalogSearch() {
  $('#searchDialog').close();
  restoreCatalogSearchFocus();
}
function restoreCatalogSearchFocus() {
  if (document.querySelector('dialog[open]')) return;
  const opener = catalogSearchUI.opener;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
  else $('#searchTrigger').focus({ preventScroll: true });
}
function openCatalogSearchResult(index) {
  const entry = catalogSearchUI.entries[index];
  if (!entry) return;
  closeCatalogSearch();
  if (entry.kind === 'record') openNorm(entry.id);
  else if (entry.kind === 'part')
    location.hash = auroraFocusLink(ComponentFlow.component(entry.componentId), entry.id);
  else location.hash = auroraFocusLink(ComponentFlow.component(entry.id));
}
$('#searchTrigger').addEventListener('click', () => openCatalogSearch());
$('#closeSearch').addEventListener('click', closeCatalogSearch);
$('#globalSearch').addEventListener('input', () => {
  if (!catalogSearchUI.loading) renderCatalogSearchResults();
});
$('#searchDialog').addEventListener('close', restoreCatalogSearchFocus);
$('#searchDialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeCatalogSearch();
});
$('#searchDialog').addEventListener('click', (event) => {
  const result = event.target.closest('[data-search-result]');
  if (result) openCatalogSearchResult(Number(result.dataset.searchResult));
  if (event.target.closest('[data-search-retry]')) openCatalogSearch();
  if (event.target.closest('#searchAllResults')) closeCatalogSearch();
  if (event.target === event.currentTarget) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      closeCatalogSearch();
  }
});
$('#searchDialog').addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !event.isComposing) {
    event.preventDefault();
    closeCatalogSearch();
    return;
  }
  if (
    !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) ||
    event.isComposing ||
    ![$('#globalSearch'), $('#searchResults')].includes(event.target)
  )
    return;
  event.preventDefault();
  if (event.key === 'Enter') openCatalogSearchResult(catalogSearchUI.selected);
  else selectCatalogSearchResult(catalogSearchUI.selected + (event.key === 'ArrowDown' ? 1 : -1));
});
document.addEventListener('keydown', (event) => {
  if (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    event.key.toLowerCase() === 'k' &&
    !event.isComposing &&
    !event.target.isContentEditable &&
    event.target.tagName !== 'TEXTAREA'
  ) {
    event.preventDefault();
    if ($('#searchDialog').open) closeCatalogSearch();
    else openCatalogSearch(true);
  }
});
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-assistant]')) $('#assistantDialog').showModal();
  if (event.target.closest('[data-assistant-close]')) $('#assistantDialog').close();
  if (event.target.closest('[data-open-search]')) openCatalogSearch();
});
window.addEventListener('hashchange', () => {
  if ($('#searchDialog').open) closeCatalogSearch();
  if ($('#assistantDialog').open) $('#assistantDialog').close();
});
document
  .querySelectorAll('#searchDialog [data-icon], #assistantDialog [data-icon]')
  .forEach((node) => {
    node.innerHTML = auroraIcon(node.dataset.icon);
  });
