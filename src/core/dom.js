'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
function externalLinkIcon() {
  return '<svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></svg>';
}
function safeLink(url, label, cls = '') {
  try {
    const u = new URL(url);
    if (!['https:', 'http:'].includes(u.protocol)) return '';
    const text = String(label ?? '').trim() || 'Abrir fonte';
    return `<a class="${cls}" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${text} ${externalLinkIcon()}</a>`;
  } catch {
    return '';
  }
}
