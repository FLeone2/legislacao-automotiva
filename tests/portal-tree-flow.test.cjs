const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { homologationFlowSpec, HomologationFlow } = require('../flow-data.js');
const { buildFlow, DEFAULT_PROFILE } = require('../src/guide/process-model.js');
const { createPortalContext } = require('../src/core/portal-context.js');

function fixture() {
  const panel = { innerHTML: '', setAttribute() {} };
  const inserted = [];
  const previews = [];
  const routes = [];
  const portal = createPortalContext();
  portal.setActiveProjectId('saved-project');
  const context = vm.createContext({
    URLSearchParams,
    state: { view: 'tree' },
    catalog: { records: [] },
    homologationFlowSpec,
    HomologationFlow,
    esc: (value) =>
      String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;'),
    auroraIcon: () => '<svg aria-hidden="true"></svg>',
    PortalContext: {
      guideRoute(params) {
        routes.push(params);
        return portal.guideRoute(params);
      },
    },
    vehicleModelArt(selection, className) {
      previews.push(selection);
      return `<figure class="portal-model-preview ${className}">3D</figure>`;
    },
    $: (selector) =>
      selector === '#flowDetailPanel .detail-scroll'
        ? { insertAdjacentHTML: (_position, html) => inserted.push(html) }
        : panel,
    document: { addEventListener() {} },
  });
  for (const file of ['tree.js', 'homologation-flow.js'])
    vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  const run = (code) => vm.runInContext(code, context);
  run(`treeModels.tree = indexTree({
    id: 'root', label: 'Visão geral', recordIds: [], children: [
      { id: 'seg-freios', label: 'Freios', recordIds: [], children: [
        { id: 'seg-freios-normas', label: 'Normas', recordIds: [] }
      ] },
      { id: 'unmapped', label: 'Freios', recordIds: [] }
    ]
  });`);
  return { run, context, panel, inserted, previews, routes };
}

test('conceptual stages open valid process fronts through the shared project context', () => {
  const { run, context, routes } = fixture();
  const fronts = new Set(buildFlow(DEFAULT_PROFILE).nodes.map((node) => node.id));
  run(`flowUI.powertrain = 'phev'`);
  for (const stage of homologationFlowSpec.stages) {
    context.destination = stage;
    const route = run('flowGuideRoute(destination)');
    const params = new URLSearchParams(route.split('?')[1]);
    assert.equal(params.get('project'), 'saved-project');
    assert.equal(params.get('tab'), 'flow');
    assert.ok(fronts.has(params.get('stage')), stage.id);
    assert.equal(params.has('powertrain'), false, 'A consultation recut cannot edit the profile');
  }
  assert.equal(run('flowUI.powertrain'), 'phev');
  assert.equal(routes.length, homologationFlowSpec.stages.length);
  assert.equal(
    new URLSearchParams(run(`flowGuideRoute({id:'preparacao'})`).split('?')[1]).get('stage'),
    'projeto',
  );
  assert.equal(
    new URLSearchParams(run(`flowGuideRoute({id:'coastdown'})`).split('?')[1]).get('stage'),
    'ambiente',
  );
  for (const id of ['unknown', 'constructor'])
    assert.equal(
      new URLSearchParams(run(`flowGuideRoute({id:${JSON.stringify(id)}})`).split('?')[1]).has(
        'stage',
      ),
      false,
    );
});

test('tree previews follow explicit IDs while references and textual presentation remain intact', () => {
  const { run, panel, previews } = fixture();
  const references = run('JSON.stringify(treeModels.tree)');
  run(`treeUI.tree.selected='seg-freios-normas';renderTreeDetails()`);
  assert.equal(previews[0].assemblyId, 'brakes');
  assert.match(panel.innerHTML, /tree-selection-preview/);
  assert.match(panel.innerHTML, /Nenhuma referência cadastrada/);
  const context = run(
    `treeGuideContext(treeModels.tree,treeModels.tree.nodes['seg-freios'],false)`,
  );
  assert.match(context, /part=brakes/);
  assert.match(context, /profile=edit/);
  assert.match(context, /project=saved-project/);
  run(`treeUI.tree.tab='documents';renderTreeDetails()`);
  assert.doesNotMatch(panel.innerHTML, /tree-selection-preview/);
  assert.equal(previews.length, 1);
  assert.equal(
    run(`treeGuideSelection(treeModels.tree.nodes.unmapped,treeModels.tree)`),
    undefined,
    'An identical label does not establish a visual mapping',
  );
  assert.equal(run('JSON.stringify(treeModels.tree)'), references);
  assert.match(run('treeListMarkup(treeModels.tree,treeUI.tree)'), /data-tree-list/);
});

test('activity preview retains its vehicle link and official consultation actions', () => {
  const { run, context, inserted, previews } = fixture();
  context.activity = HomologationFlow.stage('seguranca').activities.find(
    (row) => row.id === 'freios',
  );
  run(`flowUI.stage='seguranca';treeModels.flow={nodes:{selected:{flowActivity:activity}}};
    treeUI.flow.selected='selected';treeUI.flow.tab='summary';renderFlowActivityContext()`);
  assert.equal(previews[0].componentId, 'freios');
  assert.match(inserted[0], /flow-selection-preview/);
  assert.match(inserted[0], /#vehicle\?component=freios/);
  assert.match(inserted[0], /tab=checklist/);
  assert.match(inserted[0], /stage=seguranca/);
  run(`treeUI.flow.tab='documents';renderFlowActivityContext()`);
  assert.doesNotMatch(inserted[1], /flow-selection-preview/);
  assert.match(inserted[1], /#vehicle\?component=freios/);
  context.activity = HomologationFlow.stage('aprovacoes').activities.find(
    (row) => row.id === 'lcvm',
  );
  run(`flowUI.stage='aprovacoes';treeUI.flow.tab='summary';
    treeModels.flow.nodes.selected.flowActivity=activity;renderFlowActivityContext()`);
  assert.match(inserted[2], /Explorar o assunto/);
  for (const link of context.activity.officialLinks)
    assert.ok(inserted[2].includes(context.esc(link.url)), link.url);
});
