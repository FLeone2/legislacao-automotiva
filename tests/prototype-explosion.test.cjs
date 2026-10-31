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

function boundsOf(rows, translated = false) {
  return {
    min: [0, 1, 2].map((axis) =>
      Math.min(...rows.map((row) => (translated ? row.targetBounds : row.bounds).min[axis])),
    ),
    max: [0, 1, 2].map((axis) =>
      Math.max(...rows.map((row) => (translated ? row.targetBounds : row.bounds).max[axis])),
    ),
  };
}

test('real GLB keeps four wheel corners, coherent road wheels and brakes closer to their axles', () => {
  const tires = pieces.filter((piece) => /Wheel_Tire/i.test(piece.sourceMesh));
  assert.equal(tires.length, 4);
  const plan = layout.createExplosionPlan(pieces);
  const wheels = plan.overview.units.filter((unit) => unit.id.startsWith('wheel-'));
  const brakes = plan.overview.units.filter((unit) => unit.id.startsWith('brake-'));
  assert.equal(wheels.length, 4);
  assert.equal(brakes.length, 4);
  for (const wheel of wheels) {
    assert.equal(wheel.nodeIds.filter((id) => tires.some((tire) => tire.nodeId === id)).length, 1);
    const offset = plan.overview.offsets.get(wheel.nodeIds[0]);
    for (const id of wheel.nodeIds)
      assert.deepEqual(
        plan.overview.offsets.get(id),
        offset,
        'rim, tire, hub and wheel fasteners travel together',
      );
    assert.equal(offset[0], 0, 'explosion does not move a wheel to a different axle');
    assert.equal(offset[1], 0);
    assert.equal(Math.sign(offset[2]), wheel.id.endsWith('left') ? 1 : -1);
    const brake = brakes.find((unit) => unit.id === wheel.id.replace('wheel-', 'brake-'));
    assert.ok(
      Math.abs(brake.offset[2]) < Math.abs(offset[2]),
      'tire opens farther than brake for inspection',
    );
  }
});

test('physical overview is stable across camera, orbit direction and portrait/landscape', () => {
  const expected = layout.createExplosionPlan(pieces);
  for (const direction of [
    [-1, 0.78, 1.35],
    [0.001, 0.11, 1],
    [0, 1, 0.001],
    [-1, 0.16, 0.001],
  ])
    for (const aspect of [0.4, 0.8, 1.7, 2.6])
      assert.deepEqual(layout.createExplosionPlan(pieces, { direction, aspect }), expected);
  assert.equal(expected.coordinateFrame, 'vehicle');
});

test('compact disassembly preserves vehicle directions instead of packing a flat or tall board', () => {
  const plan = layout.createExplosionPlan(pieces);
  const groups = new Map(plan.overview.units.map((unit) => [unit.id, unit]));
  assert.ok(groups.get('hood').offset[1] > 0);
  assert.ok(groups.get('engine').offset[0] < 0);
  assert.ok(groups.get('batteryHV').offset[1] < 0);
  for (const id of ['front-axle', 'rear-axle']) assert.ok(groups.get(id).offset[1] < 0);
  for (const id of ['door-front-left', 'door-rear-left']) assert.ok(groups.get(id).offset[2] > 0);
  for (const id of ['door-front-right', 'door-rear-right']) assert.ok(groups.get(id).offset[2] < 0);
  assert.ok(groups.get('tailgate').offset[0] > 0, 'tailgate and its window move toward the rear');
  const assembled = boundsOf(plan.overview.units),
    exploded = boundsOf(plan.overview.units, true);
  const ratio = assembled.max.map(
    (value, axis) => (exploded.max[axis] - exploded.min[axis]) / (value - assembled.min[axis]),
  );
  assert.ok(ratio[0] < 1.4, `length: ${ratio[0]}`);
  assert.ok(ratio[1] < 1.65, `height: ${ratio[1]}`);
  assert.ok(ratio[2] < 1.6, `width: ${ratio[2]}`);
  const targets = plan.overview.units.map((unit) => unit.offset);
  assert.ok(
    new Set(targets.map((offset) => offset[2])).size > 3,
    'lateral depth is retained in vehicle coordinates',
  );
});

test('second phase actually separates only selected assembly pieces and retains original IDs', () => {
  const overview = layout.createExplosionPlan(pieces).overview;
  for (const detailAssemblyId of ['batteryHV', 'engine', 'chassis', 'brakes']) {
    const plan = layout.createExplosionPlan(pieces, { detailAssemblyId });
    let moved = 0;
    for (const piece of pieces) {
      const before = overview.offsets.get(piece.nodeId),
        after = plan.detail.offsets.get(piece.nodeId);
      if (!before || !after) continue;
      if (piece.assemblyId !== detailAssemblyId) assert.deepEqual(after, before);
      else if (after.some((value, axis) => Math.abs(value - before[axis]) > 0.001)) moved++;
    }
    assert.ok(moved > 2, `${detailAssemblyId} should contain real separately movable geometry`);
    const isolated = layout.createExplosionPlan(pieces, { detailAssemblyId, isolated: true });
    const ids = new Set(isolated.detail.units.flatMap((unit) => unit.nodeIds));
    assert.ok(ids.size > 3);
    for (const id of ids)
      assert.equal(pieces.find((piece) => piece.nodeId === id).assemblyId, detailAssemblyId);
    assert.deepEqual(
      layout.createExplosionPlan(pieces, { detailAssemblyId, isolated: true }),
      isolated,
    );
  }
});

test('normalized explosion opens assemblies before detail, with continuous reversible boundaries', () => {
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
    );
    previous = phase;
  }
});
