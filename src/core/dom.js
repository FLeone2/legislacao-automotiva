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
function safeLink(url, label, cls = '') {
  try {
    const u = new URL(url);
    if (!['https:', 'http:'].includes(u.protocol)) return '';
    return `<a class="${cls}" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  } catch {
    return '';
  }
}
