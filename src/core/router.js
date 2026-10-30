'use strict';
function navigate(view) {
  if (location.hash === '#' + view) render();
  else location.hash = view;
}

let renderSequence = 0;
async function render() {
  const renderId = ++renderSequence;
  const main = $('#main');
  if (
    typeof disposeGuide === 'function' &&
    !(typeof keepVehicleExplorer === 'function' && keepVehicleExplorer())
  )
    disposeGuide();
  const previousView = main.dataset.view;
  const previousRoute = main.dataset.renderedRoute;
  main.setAttribute('aria-busy', 'true');
  try {
    if (typeof preserveVisualProfile === 'function') preserveVisualProfile();
    $('#app').classList.remove('homologation-flow-mode', 'aurora-home', 'simple-mode');
    for (const handler of [
      'onpointerover',
      'onpointerout',
      'onpointerleave',
      'onfocusin',
      'onfocusout',
    ])
      main[handler] = null;
    state.view = location.hash.slice(1).split('?')[0] || 'inicio';
    if (state.view === 'ai') {
      history.replaceState(null, '', '#ia');
      state.view = 'ia';
    }
    if (
      ![
        'inicio',
        'ia',
        'guide',
        'tree',
        'mover',
        'vehicle',
        'library',
        'knowledge',
        'flow',
        'updates',
        'ai',
        'contran',
        'proconve',
        'inmetro',
        'anatel',
        'markings',
        'history',
      ].includes(state.view)
    )
      state.view = 'inicio';
    main.dataset.view = state.view;
    if (typeof PortalContext !== 'undefined') {
      PortalContext.rememberRoute(location.hash);
      PortalContext.renderBar(state.view);
    }
    $('#app').classList.toggle(
      'contran-mode',
      ['contran', 'proconve', 'inmetro', 'anatel', 'markings'].includes(state.view),
    );
    updateNavigation(state.view === 'history' ? 'library' : state.view);
    // The header search belongs to the library. Its URL is the source of truth
    // when returning; a previous term must not appear to filter another screen.
    if (state.view !== 'library') {
      state.query = '';
      $('#globalSearch').value = '';
    }
    $('#app').classList.toggle('tree-mode', ['tree', 'mover', 'flow'].includes(state.view));
    if (state.view !== 'vehicle') {
      $('#app').classList.remove('vehicle-flow-mode', 'vehicle-overview-mode');
    }
    if (['tree', 'mover'].includes(state.view)) {
      if (typeof ensureVehiclePreviews === 'function') await ensureVehiclePreviews();
      if (renderId !== renderSequence) return;
      restoreRegulatoryTreeRoute(state.view);
      renderTree(state.view);
      return;
    }
    if (state.view === 'guide') {
      await renderGuide();
      return;
    }
    if (state.view === 'inicio' || state.view === 'ia') {
      $('#app').classList.add('simple-mode');
      (state.view === 'inicio' ? renderHome : renderAssistant)();
      return;
    }
    if (state.view === 'vehicle') {
      if (typeof ensureVehiclePreviews === 'function') await ensureVehiclePreviews();
      if (renderId !== renderSequence) return;
      await renderVehicle();
      return;
    }
    if (state.view === 'flow') {
      if (typeof ensureVehiclePreviews === 'function') await ensureVehiclePreviews();
      if (renderId !== renderSequence) return;
      renderFlow();
      return;
    }
    restoreAssistantPanel();
    if (typeof ensureVehiclePreviews === 'function') await ensureVehiclePreviews();
    if (renderId !== renderSequence) return;
    await {
      vehicle: renderVehicle,
      library: renderLibrary,
      knowledge: renderKnowledge,
      flow: renderFlow,
      updates: renderUpdates,
      ai: renderAI,
      contran: renderContran,
      proconve: renderProconve,
      inmetro: renderInmetro,
      anatel: renderAnatel,
      markings: renderMarkings,
      history: renderRegulatoryHistory,
    }[state.view]();
    renderRelated();
  } finally {
    if (renderId === renderSequence) {
      main.dataset.renderedRoute = location.hash;
      main.setAttribute('aria-busy', 'false');
      if (
        previousView &&
        typeof main.animate === 'function' &&
        document.documentElement.dataset.input !== 'keyboard' &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        const changedView = previousView !== state.view;
        const target = changedView ? main : main.querySelector('.aurora-explorer');
        if (target && (changedView || previousRoute !== location.hash))
          target.animate(
            [
              { opacity: 0, transform: 'translateY(8px)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: changedView ? 320 : 220, easing: 'cubic-bezier(.22,1,.36,1)' },
          );
      }
    }
  }
}
