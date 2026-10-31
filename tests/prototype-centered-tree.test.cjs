'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const load = (name) => import(pathToFileURL(path.join(root, name)).href);
const fixture = () => ({
  id: 'process',
  label: 'Ensaios',
  children: [
    {
      id: 'active',
      label: 'Segurança ativa',
      children: [
        {
          id: 'brakes',
          label: 'Frenagem',
          kind: 'act',
          children: [
            { id: 'brake-method', label: 'Método citado', kind: 'standard', children: [] },
          ],
        },
        { id: 'lighting', label: 'Iluminação', children: [] },
      ],
    },
    { id: 'passive', label: 'Segurança passiva', children: [] },
    { id: 'outside', label: 'Outro perfil', status: 'outside_profile', children: [] },
    { id: 'electric', label: 'Propulsão elétrica', children: [] },
  ],
});

test('tree starts at the origin and keeps branch sides stable when the profile filters nodes', async () => {
  const { layoutCenteredTree } = await load('src/prototype/CenteredTreeCanvas.layout.js');
  const tree = fixture();
  const expanded = new Set(['process']);
  const filtered = layoutCenteredTree(tree, expanded);
  const complete = layoutCenteredTree(tree, expanded, { showOutside: true });
  const center = filtered.nodes.find((node) => node.id === 'process');
  assert.deepEqual([center.x, center.y, center.side, center.depth], [0, 0, 0, 0]);
  assert.ok(filtered.nodes.some((node) => node.side < 0));
  assert.ok(filtered.nodes.some((node) => node.side > 0));
  assert.ok(!filtered.nodes.some((node) => node.id === 'outside'));
  for (const node of filtered.nodes)
    assert.equal(node.side, complete.nodes.find((record) => record.id === node.id).side);
});

test('opening a branch retains its ancestors, siblings, exact records and non-overlapping node boxes', async () => {
  const { layoutCenteredTree, indexCenteredTree, centeredTreeAncestors } = await load(
    'src/prototype/CenteredTreeCanvas.layout.js',
  );
  const tree = fixture();
  const before = JSON.stringify(tree);
  const expanded = new Set(['process', 'active', 'brakes']);
  const layout = layoutCenteredTree(tree, expanded, { selectedId: 'brake-method' });
  const index = indexCenteredTree(tree);
  assert.deepEqual(centeredTreeAncestors(index, 'brake-method'), [
    'process',
    'active',
    'brakes',
    'brake-method',
  ]);
  for (const id of ['process', 'active', 'brakes', 'brake-method', 'passive', 'electric'])
    assert.ok(layout.nodes.some((node) => node.id === id));
  for (const node of layout.nodes) assert.equal(node.node, index.get(node.id).node);
  for (const [position, node] of layout.nodes.entries())
    for (const other of layout.nodes.slice(position + 1)) {
      const overlapX = Math.abs(node.x - other.x) < (node.width + other.width) / 2;
      const overlapY = Math.abs(node.y - other.y) < (node.height + other.height) / 2;
      assert.ok(!(overlapX && overlapY), `Overlapping nodes: ${node.id}, ${other.id}`);
    }
  assert.equal(JSON.stringify(tree), before);
  const closed = layoutCenteredTree(tree, new Set(['process', 'active']));
  assert.ok(!closed.nodes.some((node) => node.id === 'brake-method'));
  assert.ok(closed.nodes.some((node) => node.id === 'brakes'));
});

test('fitting is explicit and all open-node bounds fit a desktop viewport', async () => {
  const { layoutCenteredTree, fitCenteredTree } = await load(
    'src/prototype/CenteredTreeCanvas.layout.js',
  );
  const bounds = layoutCenteredTree(fixture(), new Set(['process', 'active', 'brakes'])).bounds;
  const size = { width: 1200, height: 550 };
  const camera = fitCenteredTree(bounds, size);
  assert.ok(camera.zoom <= 1 && camera.zoom >= 0.25);
  assert.ok(camera.x + bounds.minX * camera.zoom >= 35.9);
  assert.ok(camera.x + bounds.maxX * camera.zoom <= size.width - 35.9);
  assert.ok(camera.y + bounds.minY * camera.zoom >= 35.9);
  assert.ok(camera.y + bounds.maxY * camera.zoom <= size.height - 35.9);
});

test('the actual analyst tree preserves every source node and legal qualification through layout', async () => {
  const { layoutCenteredTree, indexCenteredTree } = await load(
    'src/prototype/CenteredTreeCanvas.layout.js',
  );
  const { buildWorkflow, getWorkflowTree } = await load('src/prototype/workflow.js');
  const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const catalog = read('data/prototype/catalog.json');
  const workflow = buildWorkflow({}, read('data/prototype/workflow.json'), catalog);
  const branch = getWorkflowTree(workflow, {}, catalog, 'sa-05-active').children[0];
  const index = indexCenteredTree(branch);
  const before = JSON.stringify(branch);
  const layout = layoutCenteredTree(branch, new Set(index.keys()), { showOutside: true });
  assert.equal(layout.nodes.length, index.size);
  assert.ok(layout.nodes.some((node) => node.node.kind === 'standard'));
  assert.ok(layout.nodes.some((node) => node.node.kind === 'international_reference'));
  for (const item of layout.nodes) assert.equal(item.node, index.get(item.id).node);
  assert.equal(JSON.stringify(branch), before);
});
