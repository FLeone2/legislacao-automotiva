'use strict';
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
}
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
  if (event.target.closest('.sidebar a[href^="#"]')) closeNavigation();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.querySelector('.sidebar.nav-open')) {
    closeNavigation();
    $('#navigationToggle').focus();
  }
});
