'use strict';
document.addEventListener('keydown', () => {
  document.documentElement.dataset.input = 'keyboard';
});
document.addEventListener('pointerdown', () => {
  document.documentElement.dataset.input = 'pointer';
});
function updateNavigation(view) {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const selected = link.dataset.nav === view;
    link.classList.toggle('active', selected);
    if (selected) {
      link.setAttribute('aria-current', 'page');
      const group = link.closest('details');
      if (group) group.open = true;
    } else link.removeAttribute('aria-current');
  });
  const primary = ['vehicle', 'flow', 'library'].indexOf(view);
  document.querySelector('.primary-nav').dataset.secondary = String(primary < 0);
  document.querySelector('.primary-nav')?.style.setProperty('--nav-index', Math.max(0, primary));
}
const visualProfileControls = document.getElementById('visualProfileControls');
const visualCategoryControl = document.getElementById('vehicleType').closest('label');
function placeVisualCategory() {
  if (matchMedia('(max-width: 650px)').matches)
    document.getElementById('contextProfiles').append(visualCategoryControl);
  else
    visualProfileControls.insertBefore(
      visualCategoryControl,
      visualProfileControls.querySelector('.profile-hint'),
    );
}
function preserveVisualProfile() {
  if (visualProfileControls)
    document.getElementById('contextProfiles').append(visualProfileControls);
}
function mountVisualProfile() {
  document.getElementById('vehicleProfileMount')?.append(visualProfileControls);
  placeVisualCategory();
}
window.addEventListener('resize', placeVisualCategory);
function closeNavigation() {
  document.querySelector('.sidebar').classList.remove('nav-open');
  $('#navigationToggle').setAttribute('aria-expanded', 'false');
}
$('#navigationToggle').addEventListener('click', () => {
  const expanded = $('#navigationToggle').getAttribute('aria-expanded') === 'true';
  $('#navigationToggle').setAttribute('aria-expanded', String(!expanded));
  document.querySelector('.sidebar').classList.toggle('nav-open', !expanded);
});
document.addEventListener('click', (event) => {
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    $('#main').focus();
  }
  if (event.target.closest('[data-nav]')) closeNavigation();
  if (!event.target.closest('.sidebar, #navigationToggle')) closeNavigation();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.sidebar.nav-open')) {
    closeNavigation();
    $('#navigationToggle').focus();
  }
});
