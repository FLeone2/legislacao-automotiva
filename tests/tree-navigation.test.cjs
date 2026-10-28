const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
  const listeners = {};
  const elements = {
    '#main': { dataset: {}, innerHTML: '', setAttribute() {} },
    '#app': { classList: { remove() {}, toggle() {} } },
    '#globalSearch': { value: 'freios' },
    '#graphViewport': { clientWidth: 300, clientHeight: 300, scrollTop: 0, scrollLeft: 0 },
    '#graphWorld': { style: { width: '550px', height: '2000px' } },
    '#graphSpace': { style: {} },
    '#graphZoom': {},
  };
  const context = vm.createContext({
    URLSearchParams,
    state: { view: 'tree', query: 'freios' },
    location: { hash: '#tree' },
    catalog: { records: [{ id: 'act', regulatoryId: 'canonical', title: 'Fonte de freios' }] },
    $: (id) => elements[id],
    esc: (text) =>
      String(text ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;'),
    document: {
      addEventListener(type, listener) {
        listeners[type] = listener;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    requestAnimationFrame: (fn) => fn(),
    history: {
      pushState(_a, _b, route) {
        context.location.hash = route;
      },
      replaceState(_a, _b, route) {
        context.location.hash = route;
      },
    },
    ...Object.fromEntries(
      [
        'updateNavigation',
        'renderRelated',
        'restoreAssistantPanel',
        'renderVehicle',
        'renderKnowledge',
        'renderFlow',
        'renderUpdates',
        'renderAI',
        'renderContran',
        'renderProconve',
        'renderInmetro',
        'renderAnatel',
        'renderMarkings',
        'renderRegulatoryHistory',
      ].map((name) => [name, () => {}]),
    ),
  });
  context.catalogRecord = (_catalog, id) =>
    ['act', 'canonical', 'legacy-act'].includes(id) ? context.catalog.records[0] : null;
  vm.runInContext(fs.readFileSync('tree.js', 'utf8'), context);
  vm.runInContext(
    `
    treeModels.tree = indexTree({ id: 'root', label: 'Visão geral', recordIds: ['act'], children: [
      { id: 'seguranca', label: 'Segurança', recordIds: ['act'], children: [
        { id: 'seg-freios', aliases: ['old-brakes'], label: 'Freios', recordIds: ['act', 'legacy-act'], children: [
          { id: 'seg-freios-normas', label: 'Normas', recordIds: ['act'] }
        ] },
        { id: 'seg-luz', label: 'Iluminação', recordIds: [] }
      ] }
    ] });
    treeModels.mover = indexTree({ id: 'mover-root', label: 'MOVER', recordIds: ['act'], children: [
      { id: 'mover/requisitos-act', aliases: ['mover/requisitos-legacy-act'], label: 'Fonte de freios', recordIds: ['act'], recordId: 'act' }
    ] });
  `,
    context,
  );
  return { context, elements, listeners, run: (code) => vm.runInContext(code, context) };
}
const plain = (value) => JSON.parse(JSON.stringify(value));

test('shared tree URLs restore node ancestors, tab and textual presentation', () => {
  const { run } = fixture();
  const route = run(
    `regulatoryTreeRoute('tree', {selected:'seg-freios-normas',tab:'documents',presentation:'list'})`,
  );
  run(`restoreRegulatoryTreeRoute('tree', ${JSON.stringify(route)})`);
  assert.deepEqual(plain(run('treeUI.tree.path')), [
    'root',
    'seguranca',
    'seg-freios',
    'seg-freios-normas',
  ]);
  assert.equal(run('treeUI.tree.tab'), 'documents');
  assert.equal(run('treeUI.tree.presentation'), 'list');
  assert.equal(run('treeUI.tree.invalidNode'), false);
});

test('MOVER record aliases canonicalize; invalid or hostile node IDs safely show the root', () => {
  const { run, context } = fixture();
  run(
    `restoreRegulatoryTreeRoute('mover', '#mover?node=mover%2Frequisitos-legacy-act&tab=documents')`,
  );
  assert.equal(run('treeUI.mover.selected'), 'mover/requisitos-act');
  assert.equal(context.location.hash, '#mover?node=mover%2Frequisitos-act&tab=documents');
  run(
    `restoreRegulatoryTreeRoute('tree', '#tree?node=%22%3E%3Cscript%3E&tab=other&presentation=other')`,
  );
  assert.equal(run('treeUI.tree.selected'), 'root');
  assert.equal(run('treeUI.tree.invalidNode'), true);
  assert.equal(run('treeUI.tree.tab'), 'summary');
  assert.equal(run('treeUI.tree.presentation'), 'graph');
  run(`restoreRegulatoryTreeRoute('tree', '#tree?node=constructor')`);
  assert.equal(run('treeUI.tree.selected'), 'root');
  assert.equal(run('treeUI.tree.invalidNode'), true);
  run(`restoreRegulatoryTreeRoute('tree', '#tree')`);
  assert.equal(run('treeUI.tree.invalidNode'), false);
});

test('focused branch excludes ancestors from the drawing and collapse works', () => {
  const { run } = fixture();
  run(`restoreRegulatoryTreeRoute('tree', '#tree?node=seg-freios')`);
  assert.deepEqual(plain(run('treeColumns(treeModels.tree,treeUI.tree).map(c=>c.map(n=>n.id))')), [
    ['seg-freios'],
    ['seg-freios-normas'],
  ]);
  const graph = run('graphMarkup(treeModels.tree,treeUI.tree)');
  assert.ok(graph.includes('data-tree-node="seg-freios-normas"'));
  assert.ok(!graph.includes('data-tree-node="root"'));
  run(`treeUI.tree.path.pop()`);
  assert.equal(run('treeColumns(treeModels.tree,treeUI.tree).length'), 1);
});

test('original vehicle and flow layouts retain their ancestor columns', () => {
  const { run } = fixture();
  assert.deepEqual(
    plain(
      run(
        `treeColumns(treeModels.tree,{path:['root','seguranca','seg-freios'],selected:'seg-freios'}).map(c=>c.map(n=>n.id))`,
      ),
    ),
    [['root'], ['seguranca'], ['seg-freios', 'seg-luz'], ['seg-freios-normas']],
  );
});

test('branch fit keeps readable scale and full flow fit remains available', () => {
  const { run, elements } = fixture();
  run('applyGraphZoom(true)');
  assert.equal(run('treeUI.tree.zoom'), 0.9);
  assert.equal(elements['#graphZoom'].textContent, '90%');
  run(`treeUI.flow={zoom:1};state.view='flow';applyGraphZoom(true)`);
  assert.equal(run('treeUI.flow.zoom'), 0.35);
});

test('text presentation uses the same canonical references and labels gaps without claiming exemption', () => {
  const { run } = fixture();
  run(`restoreRegulatoryTreeRoute('tree', '#tree?node=seg-freios')`);
  let html = run('treeListMarkup(treeModels.tree,treeUI.tree)');
  assert.equal((html.match(/data-open="act"/g) || []).length, 1);
  assert.ok(html.includes('data-tree-node="seg-freios-normas"'));
  run(`restoreRegulatoryTreeRoute('tree', '#tree?node=seg-luz')`);
  html = run('treeListMarkup(treeModels.tree,treeUI.tree)');
  assert.match(html, /não indica isenção/);
});

test('keyboard branch navigation preserves user zoom and updates the shareable node', () => {
  const { run, listeners, context } = fixture();
  run(
    `restoreRegulatoryTreeRoute('tree','#tree?node=seg-freios');treeUI.tree.zoom=1.3;treeUI.tree.fit=false;renderTree=()=>{}`,
  );
  const button = { dataset: { treeNode: 'seg-freios' } };
  const event = (key) => ({
    key,
    preventDefault() {},
    target: { closest: (selector) => (selector === '[data-tree-node]' ? button : null) },
  });
  listeners.keydown(event('ArrowRight'));
  assert.equal(run('treeUI.tree.selected'), 'seg-freios-normas');
  assert.equal(run('treeUI.tree.zoom'), 1.3);
  assert.match(context.location.hash, /node=seg-freios-normas/);
  button.dataset.treeNode = 'seg-freios-normas';
  listeners.keydown(event('ArrowLeft'));
  assert.equal(run('treeUI.tree.selected'), 'seg-freios');
});

test('leaving library clears residual header text; restoring its URL restores the query', async () => {
  const { context, elements, run } = fixture();
  context.renderLibrary = () => {
    context.state.query = new URLSearchParams(context.location.hash.split('?')[1]).get('q') || '';
    elements['#globalSearch'].value = context.state.query;
  };
  vm.runInContext(fs.readFileSync('src/core/router.js', 'utf8'), context);
  context.location.hash = '#flow';
  await run('render()');
  assert.equal(context.state.query, '');
  assert.equal(elements['#globalSearch'].value, '');
  context.location.hash = '#library?q=freios';
  await run('render()');
  assert.equal(context.state.query, 'freios');
  assert.equal(elements['#globalSearch'].value, 'freios');
});

test('a delayed optional preview cannot paint over a newer destination', async () => {
  for (const route of ['tree', 'vehicle', 'flow', 'library']) {
    const { context, elements, run } = fixture();
    let finishPreview;
    const pending = new Promise((resolve) => {
      finishPreview = resolve;
    });
    context.ensureVehiclePreviews = () => pending;
    context.renderGuide = () => {
      elements['#main'].innerHTML = 'Current guide';
    };
    vm.runInContext(fs.readFileSync('src/core/router.js', 'utf8'), context);
    context.location.hash = '#' + route;
    const obsolete = run('render()');
    context.location.hash = '#guide';
    await run('render()');
    finishPreview();
    await obsolete;
    assert.equal(elements['#main'].innerHTML, 'Current guide', route);
    assert.equal(elements['#main'].dataset.renderedRoute, '#guide', route);
  }
});
