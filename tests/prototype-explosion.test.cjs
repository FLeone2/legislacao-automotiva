'use strict';
const assert = require('node:assert/strict');
const { before, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const THREE = require('three');
const ROOT = path.resolve(__dirname, '..');
let layout;
let pieces;

// Read actual GLB accessor extents and node transforms. This remains CPU-only;
// browser tests separately check the perspective projection and actual drawing.
function modelPieces() {
  const rows = new Map();
  for (const relative of [
    'assets/models/suv/bmw-x5.glb',
    'assets/prototype/models/mechanical-supplement.glb',
  ]) {
    const buffer = fs.readFileSync(path.join(ROOT, relative));
    const model = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
    function visit(index, parent = new THREE.Matrix4(), inherited = {}) {
      const node = model.nodes[index];
      const local = node.matrix
        ? new THREE.Matrix4().fromArray(node.matrix)
        : new THREE.Matrix4().compose(
            new THREE.Vector3().fromArray(node.translation || [0, 0, 0]),
            new THREE.Quaternion().fromArray(node.rotation || [0, 0, 0, 1]),
            new THREE.Vector3().fromArray(node.scale || [1, 1, 1]),
          );
      const world = parent.clone().multiply(local);
      const extras = { ...inherited, ...node.extras };
      if (node.mesh !== undefined)
        for (const primitive of model.meshes[node.mesh].primitives) {
          const accessor = model.accessors[primitive.attributes.POSITION];
          assert.ok(accessor.min && accessor.max, 'published geometry must retain its real bounds');
          if (/_none|_void/i.test(extras.sourceMesh || node.name)) continue;
          const box = new THREE.Box3(
            new THREE.Vector3().fromArray(accessor.min),
            new THREE.Vector3().fromArray(accessor.max),
          ).applyMatrix4(world);
          const descriptor = layout.pieceDescriptor(
            extras,
            node.name,
            box.getCenter(new THREE.Vector3()),
            {},
          );
          if (!rows.has(descriptor.nodeId))
            rows.set(descriptor.nodeId, {
              ...descriptor,
              sourceMesh: extras.sourceMesh || node.name,
              sourceFile: extras.sourceFile || '',
              box,
            });
          else rows.get(descriptor.nodeId).box.union(box);
        }
      for (const child of node.children || []) visit(child, world, extras);
    }
    for (const node of model.scenes[model.scene || 0].nodes) visit(node);
  }
  return [...rows.values()].map(({ box, ...row }) => ({
    ...row,
    bounds: { min: box.min.toArray(), max: box.max.toArray() },
  }));
}

before(async () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/prototype/vehicle-layout.js'));
  layout = await import('data:text/javascript;base64,' + source.toString('base64'));
  pieces = modelPieces();
});

function noCollisions(stage) {
  for (let first = 0; first < stage.units.length; first++)
    for (let second = first + 1; second < stage.units.length; second++) {
      assert.equal(
        layout.rectanglesOverlap(stage.units[first].rect, stage.units[second].rect),
        false,
        `display silhouettes overlap: ${stage.units[first].id} / ${stage.units[second].id}`,
      );
    }
}

test('actual vehicle assemblies have four coherent wheel sets and separated silhouettes for every camera', () => {
  const cameras = [
    [-1, 0.78, 1.35],
    [0.001, 0.11, 1],
    [0, 1, 0.001],
    [-1, 0.16, 0.001],
  ];
  const tires = pieces.filter((piece) => /Wheel_Tire/i.test(piece.sourceMesh));
  assert.equal(tires.length, 4);
  for (const direction of cameras)
    for (const aspect of [0.8, 1.7]) {
      const plan = layout.createExplosionPlan(pieces, { direction, aspect });
      const wheels = plan.overview.units.filter((unit) => unit.id.startsWith('wheel-'));
      assert.equal(wheels.length, 4);
      for (const wheel of wheels) {
        const tireCount = wheel.nodeIds.filter((id) =>
          tires.some((tire) => tire.nodeId === id),
        ).length;
        assert.equal(tireCount, 1, 'each real road-wheel position keeps one tire');
        const offset = plan.overview.offsets.get(wheel.nodeIds[0]);
        for (const id of wheel.nodeIds)
          assert.deepEqual(
            plan.overview.offsets.get(id),
            offset,
            'rim, tire, hub, screws, brake and emblem travel as one set',
          );
      }
      noCollisions(plan.overview);
    }
});

test('second stage decomposes only the selected assembly and keeps semantic identities', () => {
  for (const detailAssemblyId of ['batteryHV', 'engine', 'chassis'])
    for (const aspect of [0.8, 1.7]) {
      const plan = layout.createExplosionPlan(pieces, { aspect, detailAssemblyId, isolated: true });
      const ids = new Set(plan.detail.units.flatMap((unit) => unit.nodeIds));
      assert.ok(ids.size > 5, 'selected subsystem retains meaningful independent parts');
      for (const id of ids)
        assert.equal(pieces.find((piece) => piece.nodeId === id).assemblyId, detailAssemblyId);
      noCollisions(plan.detail);
      assert.deepEqual(
        layout.createExplosionPlan(pieces, { aspect, detailAssemblyId, isolated: true }),
        plan,
        'layout must be deterministic across selection/navigation',
      );
    }
});

test('normalized explosion opens assemblies before detail, with continuous reversible phase boundaries', () => {
  assert.deepEqual(layout.explosionPhases(0), { assemblies: 0, detail: 0 });
  assert.deepEqual(layout.explosionPhases(0.65), { assemblies: 1, detail: 0 });
  assert.deepEqual(layout.explosionPhases(1), { assemblies: 1, detail: 1 });
  let previous = { assemblies: 0, detail: 0 };
  for (let step = 0; step <= 1000; step++) {
    const phase = layout.explosionPhases(step / 1000);
    assert.ok(phase.assemblies >= previous.assemblies && phase.detail >= previous.detail);
    if (step < 650) assert.equal(phase.detail, 0);
    assert.ok(
      phase.assemblies - previous.assemblies < 0.005 && phase.detail - previous.detail < 0.005,
      'small slider movements cannot teleport an assembly or piece',
    );
    previous = phase;
  }
});

test('portrait workbench constrains horizontal spread and uses vertical lanes', () => {
  const plan = layout.createExplosionPlan(pieces, { aspect: 0.8 });
  const rects = plan.overview.units.map((unit) => unit.rect);
  const width =
    Math.max(...rects.map((rect) => rect.maxX)) - Math.min(...rects.map((rect) => rect.minX));
  const height =
    Math.max(...rects.map((rect) => rect.maxY)) - Math.min(...rects.map((rect) => rect.minY));
  assert.ok(width <= 7.200001, `portrait assembly span is too wide: ${width}`);
  assert.ok(
    height > width,
    'phone overview should occupy a tall field, rather than a landscape strip',
  );
  noCollisions(plan.overview);
});
