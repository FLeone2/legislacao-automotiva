'use strict';

// Apply the saved palette before styles load, without depending on storage access.
(() => {
  const key = 'legislacao-automotiva.theme';
  const themes = new Set(['dark', 'light', 'aurora']);
  const normalize = (value) => (themes.has(value) ? value : 'dark');
  const apply = (value) => {
    const theme = normalize(value);
    document.documentElement.dataset.theme = theme;
    const picker = document.getElementById('themeSelect');
    if (picker) picker.value = theme;
  };

  let saved;
  try {
    saved = localStorage.getItem(key);
  } catch {
    // The current page can still change theme when storage is unavailable.
  }
  apply(saved);

  document.addEventListener('DOMContentLoaded', () => {
    const picker = document.getElementById('themeSelect');
    picker.value = document.documentElement.dataset.theme;
    picker.addEventListener('change', () => {
      apply(picker.value);
      try {
        localStorage.setItem(key, picker.value);
      } catch {
        // Keep the selected theme for this page, including route changes.
      }
    });
  });

  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) apply(event.newValue);
  });
})();
