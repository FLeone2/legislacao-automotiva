'use strict';
const auroraIcons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chat: '<path d="M5 3h14a2 2 0 0 1 2 2v12H9l-6 4V5a2 2 0 0 1 2-2Z"/><path d="M7 8h10M7 12h7"/>',

  car: '<path d="m5 8 2-4h10l2 4M4 9h16v8H4zM6 17v3m12-3v3M7 12h2m6 0h2"/>',
  flow: '<rect x="8" y="2" width="8" height="5" rx="1"/><path d="M12 7v5M5 16v-4h14v4"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/>',
  tree: '<path d="M12 3v7m-7 3v-3h14v3M5 17v4m14-4v4"/><circle cx="12" cy="3" r="2"/><circle cx="5" cy="15" r="2"/><circle cx="19" cy="15" r="2"/>',
  book: '<path d="M4 3h11l5 5v13H4zM15 3v6h5M8 13h8m-8 4h8"/>',
  tag: '<path d="m3 13 10-10h7v7L10 20z"/><circle cx="16" cy="7" r="1"/>',
  shield: '<path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  chart: '<path d="M4 20V10h4v10m4 0V4h4v16m4 0V8h2v12"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  gear: '<path d="m9 3-1 3-3 1 1 3-3 2 3 2-1 3 3 1 1 3 3-1 3 1 1-3 3-1-1-3 3-2-3-2 1-3-3-1-1-3-3 1z"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="m3 10 9-7 9 7M6 9v12h12V9m-8 12v-7h4v7"/>',
};
function auroraIcon(id, className = '') {
  return `<svg class="aurora-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${auroraIcons[id] || auroraIcons.book}</svg>`;
}

document.querySelectorAll('[data-icon]').forEach((node) => {
  node.innerHTML = auroraIcon(node.dataset.icon);
});
