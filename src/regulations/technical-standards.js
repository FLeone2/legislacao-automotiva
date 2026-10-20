'use strict';

// Search identity is typographic, never a claim of equivalence or legal force.
const TechnicalStandards = (() => {
  const normalize = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\b(\d{1,2})\.(\d{3})\b/g, '$1$2')
      .replace(/\babnt\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  const matches = (citation, query) => {
    const words = normalize(query).split(' ').filter(Boolean);
    if (!words.length) return false;
    const terms = new Set(
      normalize(
        [
          citation.designation,
          citation.literal,
          citation.edition,
          ...(citation.aliases || []),
        ].join(' '),
      ).split(' '),
    );
    return words.every((word) => terms.has(word));
  };
  const forRecord = (record, entries) => {
    const ids = new Set([record.id, record.regulatoryId, ...(record.aliases || [])]);
    return entries.filter((citation) => ids.has(citation.actId));
  };
  return { normalize, matches, forRecord };
})();

let technicalStandardsIndex = [];
let technicalStandardsLoad = null;
let technicalStandardsError = false;
function loadTechnicalStandards() {
  if (!technicalStandardsLoad)
    technicalStandardsLoad = fetch('data/site/technical-standards.json')
      .then((response) => {
        if (!response.ok) throw new Error('Citações indisponíveis');
        return response.json();
      })
      .then((index) => {
        if (index.schemaVersion !== 1 || !Array.isArray(index.records))
          throw new Error('Índice de citações inválido');
        technicalStandardsIndex = index.records;
        technicalStandardsError = false;
      })
      .catch(() => {
        technicalStandardsLoad = null;
        technicalStandardsError = true;
      });
  return technicalStandardsLoad;
}
function recordTechnicalStandards(record, query = null) {
  const entries = TechnicalStandards.forRecord(record, technicalStandardsIndex);
  return query === null
    ? entries
    : entries.filter((entry) => TechnicalStandards.matches(entry, query));
}
function technicalCitationSummary(entry) {
  const clause =
    entry.clause.length > 140 ? entry.clause.slice(0, 140).trimEnd() + '…' : entry.clause;
  return `${entry.literal} · ${clause}`;
}
function technicalStandardsNotice() {
  return technicalStandardsError
    ? '<p class="notice" role="status">Busca por NBRs indisponível neste momento. Os demais campos do acervo continuam disponíveis. <button class="text-button" data-standards-retry>Tentar novamente</button></p>'
    : '';
}
function technicalStandardsDetails(record) {
  const entries = recordTechnicalStandards(record);
  if (!entries.length) return technicalStandardsNotice();
  return `<details class="technical-citations"><summary>Normas técnicas citadas · ${entries.length} vínculos em revisão</summary><p class="scope-note">Levantamento documental de 20/10/2026. A citação não confirma a edição vigente nem a aplicação ao veículo. Confira as alternativas e a cadeia do dispositivo.</p>${entries
    .map(
      (entry) =>
        `<section><h4>${esc(entry.literal)} · ${esc(entry.edition)}</h4><p>${esc(entry.clause)}<br>${esc(entry.scope)}</p><p>${esc(entry.nature)}</p><p class="scope-note">Situação registrada no levantamento: ${esc(entry.sourceLegalState)}<br>Fonte: ${esc(entry.sourceClass)} · ${esc(entry.sourceVerification)}</p>${entry.notes ? `<p class="scope-note">${esc(entry.notes)}</p>` : ''}${safeLink(entry.sourceUrl, 'Conferir citação na fonte')}</section>`,
    )
    .join('')}</details>`;
}
if (typeof document !== 'undefined')
  document.addEventListener('click', async (event) => {
    if (!event.target.closest('[data-standards-retry]')) return;
    await loadTechnicalStandards();
    if ($('#searchDialog').open) renderCatalogSearchResults();
    if ($('#normDialog').open && $('#normDialog').dataset.recordId)
      openNorm($('#normDialog').dataset.recordId);
    if (state.view === 'library') updateList();
  });
if (typeof module !== 'undefined') module.exports = TechnicalStandards;
