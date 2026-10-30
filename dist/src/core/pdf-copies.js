'use strict';
// Consultation copies of official documents (pdfs/manifest.json). A copy only
// helps reading: it never changes the legal state recorded for an act.
const PdfCopies = (() => {
  let items = {};
  let loading = null;
  function load() {
    if (!loading)
      loading = fetch('pdfs/manifest.json')
        .then((response) => (response.ok ? response.json() : { items: {} }))
        .then((manifest) => {
          items = manifest?.items && typeof manifest.items === 'object' ? manifest.items : {};
        })
        .catch(() => {
          items = {};
        });
    return loading;
  }
  function get(actId) {
    const item = items[actId];
    return item && typeof item.file === 'string' && /^pdfs\/[\w./-]+\.pdf$/.test(item.file)
      ? item
      : null;
  }
  function link(actId, cls = 'btn') {
    const item = get(actId);
    if (!item) return '';
    const origin = item.origin === 'html_printed' ? 'página oficial impressa em PDF' : 'PDF oficial';
    const title = `Cópia do ${origin}, obtida em ${item.retrievedAt || 'data não registrada'}`;
    return `<a class="${esc(cls)}" href="${esc(item.file)}" target="_blank" rel="noopener" title="${esc(title)}" data-pdf-copy="${esc(actId)}">Abrir PDF</a>`;
  }
  return { load, get, link };
})();
PdfCopies.load();
