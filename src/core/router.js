'use strict';
function navigate(view) {
  if (location.hash === '#' + view) render();
  else location.hash = view;
}

let renderSequence = 0;
async function render() {
  const renderId = ++renderSequence;
  const main = $('#main');
  main.setAttribute('aria-busy', 'true');
  try {
    $('#app').classList.remove('homologation-flow-mode', 'aurora-home');
    for (const handler of [
      'onpointerover',
      'onpointerout',
      'onpointerleave',
      'onfocusin',
      'onfocusout',
    ])
      main[handler] = null;
    state.view = location.hash.slice(1).split('?')[0] || 'tree';
    if (state.view === 'ai') {
      history.replaceState(null, '', '#library');
      state.view = 'library';
    }
    if (
      ![
        'tree',
        'mover',
        'vehicle',
        'library',
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
      state.view = 'tree';
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
      restoreRegulatoryTreeRoute(state.view);
      renderTree(state.view);
      return;
    }
    if (state.view === 'vehicle') {
      renderVehicle();
      return;
    }
    if (state.view === 'flow') {
      renderFlow();
      return;
    }
    restoreAssistantPanel();
    await {
      vehicle: renderVehicle,
      library: renderLibrary,
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
    }
  }
}
