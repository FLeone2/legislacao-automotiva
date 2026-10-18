'use strict';
function navigate(view) {
  if (location.hash === '#' + view) render();
  else location.hash = view;
}

function render() {
  $('#app').classList.remove('homologation-flow-mode');
  state.view = location.hash.slice(1).split('?')[0] || 'tree';
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
    ].includes(state.view)
  )
    state.view = 'tree';
  $('#app').classList.toggle(
    'contran-mode',
    ['contran', 'proconve', 'inmetro', 'anatel', 'markings'].includes(state.view),
  );
  updateNavigation(state.view);
  $('#app').classList.toggle('tree-mode', ['tree', 'mover', 'flow'].includes(state.view));
  if (state.view !== 'vehicle') {
    $('#app').classList.remove('vehicle-flow-mode', 'vehicle-overview-mode');
  }
  if (['tree', 'mover'].includes(state.view)) {
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
  ({
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
  })[state.view]();
  renderRelated();
}
