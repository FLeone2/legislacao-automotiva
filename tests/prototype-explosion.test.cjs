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

// AABB distance in the vehicle's three physical axes, not a projected screen
// rectangle. Any separating axis is sufficient; hollow body/cabin fits are not
// treated as solid collisions by this suite.
function boxDistance(a, b) {
  return Math.hypot(
    ...[0, 1, 2].map((axis) => Math.max(0, b.min[axis] - a.max[axis], a.min[axis] - b.max[axis])),
  );
}

function poseBounds(plan, ids, amount) {
  const rows = ids.map((id) => {
    const piece = pieces.find((candidate) => candidate.nodeId === id);
    assert.ok(piece, `real GLB piece exists: ${id}`);
    const offset = layout.offsetForPiece(plan, id, amount);
    return {
      bounds: {
        min: piece.bounds.min.map((value, axis) => value + offset[axis]),
        max: piece.bounds.max.map((value, axis) => value + offset[axis]),
      },
    };
  });
  return boundsOf(rows);
}

function groupBounds(plan, id, amount) {
  const group = plan.overview.units.find((unit) => unit.id === id);
  assert.ok(group, `physical assembly exists: ${id}`);
  return poseBounds(plan, group.nodeIds, amount);
}

const MAIN_CLEARANCE_PAIRS = [
  ['door-front-left', 'door-rear-left'],
  ['door-front-right', 'door-rear-right'],
  ...['left', 'right'].flatMap((side) => [
    [`door-front-${side}`, `wheel-front-${side}`],
    [`door-rear-${side}`, `wheel-rear-${side}`],
    [`wheel-front-${side}`, `brake-front-${side}`],
    [`wheel-rear-${side}`, `brake-rear-${side}`],
  ]),
  ['engine', 'cooling'],
  ['engine', 'hood'],
  ['batteryHV', 'front-axle'],
  ['batteryHV', 'rear-axle'],
  ['batteryHV', 'tank'],
  ['batteryHV', 'exhaust'],
];

function assertClearance(a, b, label, minimum = 0.015) {
  const distance = boxDistance(a, b);
  assert.ok(distance >= minimum, `${label}: ${distance.toFixed(5)} m; expected >= ${minimum} m`);
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
  for (const selection of [{}, { detailAssemblyId: 'engine' }]) {
    const expected = layout.createExplosionPlan(pieces, selection);
    for (const direction of [
      [-1, 0.78, 1.35],
      [0.001, 0.11, 1],
      [0, 1, 0.001],
      [-1, 0.16, 0.001],
    ])
      for (const aspect of [0.4, 0.8, 1.7, 2.6])
        assert.deepEqual(
          layout.createExplosionPlan(pieces, { ...selection, direction, aspect }),
          expected,
        );
    assert.equal(expected.coordinateFrame, 'vehicle');
  }
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
  const assembled = boundsOf(plan.overview.units);
  for (const detailAssemblyId of ['', 'body', 'engine']) {
    const selected = layout.createExplosionPlan(pieces, { detailAssemblyId });
    const exploded = boundsOf(selected.detail.units, true);
    const ratio = assembled.max.map(
      (value, axis) => (exploded.max[axis] - exploded.min[axis]) / (value - assembled.min[axis]),
    );
    assert.ok(ratio[0] < 1.8, `${detailAssemblyId || 'global'} length: ${ratio[0]}`);
    assert.ok(ratio[1] < 1.8, `${detailAssemblyId || 'global'} height: ${ratio[1]}`);
    assert.ok(ratio[2] < 2.4, `${detailAssemblyId || 'global'} width: ${ratio[2]}`);
  }
  const targets = plan.overview.units.map((unit) => unit.offset);
  assert.ok(
    new Set(targets.map((offset) => offset[2])).size > 3,
    'lateral depth is retained in vehicle coordinates',
  );
});

test('selected detail separates real assembly parts beyond the full global pose and retains IDs', () => {
  const full = layout.createExplosionPlan(pieces).detail;
  for (const detailAssemblyId of ['batteryHV', 'engine', 'chassis', 'brakes']) {
    const plan = layout.createExplosionPlan(pieces, { detailAssemblyId });
    let moved = 0;
    for (const piece of pieces) {
      const before = full.offsets.get(piece.nodeId),
        after = plan.detail.offsets.get(piece.nodeId);
      if (!before || !after) continue;
      if (
        piece.assemblyId === detailAssemblyId &&
        after.some((value, axis) => Math.abs(value - before[axis]) > 0.001)
      )
        moved++;
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

test('each door keeps its real glass, painted panel and trim together when selecting coherent assemblies', () => {
  const cohorts = [
    ...['F', 'B'].flatMap((location) =>
      [-1, 1].map((side) =>
        pieces.filter(
          (piece) =>
            piece.sourceFile.includes(`Doors_${location}.gltf`) &&
            Math.sign((piece.bounds.min[2] + piece.bounds.max[2]) / 2) === side,
        ),
      ),
    ),
    pieces.filter((piece) => piece.sourceFile.includes('Tailgate.gltf')),
  ];
  for (const cohort of cohorts) {
    assert.ok(cohort.some((piece) => piece.assemblyId === 'doors'));
    assert.ok(cohort.some((piece) => piece.assemblyId === 'glass'));
    assert.ok(cohort.some((piece) => /paint/i.test(piece.sourceMesh)));
    assert.ok(cohort.some((piece) => /interior|plastic|chrome/i.test(piece.sourceMesh)));
  }
  for (const detailAssemblyId of ['body', 'glass', 'lights', 'mirrors', 'wheels', 'doors']) {
    const selected = layout.createExplosionPlan(pieces, { detailAssemblyId });
    for (const amount of [0.65, 0.97, 1])
      for (const cohort of cohorts) {
        const first = layout.offsetForPiece(selected, cohort[0].nodeId, amount);
        for (const piece of cohort) {
          const actual = layout.offsetForPiece(selected, piece.nodeId, amount);
          assert.ok(
            Math.hypot(...actual.map((value, axis) => value - first[axis])) < 0.0000001,
            `${detailAssemblyId}: ${piece.nodeId} remains attached to its door panel at ${amount}`,
          );
        }
      }
  }
});

test('unselected 65, 97 and 100 percent continue moving the real assemblies', () => {
  const plan = layout.createExplosionPlan(pieces);
  for (const groupId of ['hood', 'engine', 'batteryHV', 'door-front-left', 'wheel-front-left']) {
    const group = plan.overview.units.find((unit) => unit.id === groupId);
    assert.ok(group, groupId);
    const id = group.nodeIds[0];
    const samples = [0, 0.5, 0.65, 0.97, 1].map((amount) =>
      layout.offsetForPiece(plan, id, amount),
    );
    assert.ok(samples[0].every((value) => Math.abs(value) < 0.0000001));
    assert.ok(Math.hypot(...samples[1]) > 0.02, `${groupId}: 50% moves geometry`);
    assert.ok(
      Math.hypot(...samples[3].map((value, axis) => value - samples[2][axis])) > 0.02,
      `${groupId}: 65→97% must not plateau without a selection`,
    );
    assert.ok(
      Math.hypot(...samples[4].map((value, axis) => value - samples[3][axis])) > 0.00001,
      `${groupId}: 97→100% remains continuous and active`,
    );
  }
});

test('independent assemblies have real geometric clearance at 65, 97 and 100 percent', () => {
  const plan = layout.createExplosionPlan(pieces);
  for (const amount of [0.65, 0.97, 1])
    for (const [left, right] of MAIN_CLEARANCE_PAIRS)
      assertClearance(
        groupBounds(plan, left, amount),
        groupBounds(plan, right, amount),
        `${left} / ${right} at ${amount}`,
      );
});

test('engine and cooling extract completely beyond the solid front fascia plane', () => {
  // The source model merges the bumper/grille by material with Exterior_Paint
  // and Exterior_non-Paint. Only their foremost X plane is used here, never the
  // hollow cabin AABB as a solid obstacle. Front lighting and plate are included.
  const frontBody = pieces.filter(
    (piece) =>
      /Exterior_(?:non-)?Paint\.gltf$|Headlights\.gltf$/i.test(piece.sourceFile) ||
      /LicensePlate_F/.test(piece.sourceMesh),
  );
  assert.ok(frontBody.length > 5, 'real GLB front fascia, headlight and plate geometry exists');
  for (const detailAssemblyId of ['', 'body', 'engine']) {
    const plan = layout.createExplosionPlan(pieces, { detailAssemblyId });
    for (const amount of [0.65, 0.97, 1]) {
      const plane = poseBounds(
        plan,
        frontBody.map((piece) => piece.nodeId),
        amount,
      ).min[0];
      for (const assemblyId of ['engine', 'cooling']) {
        const members = pieces.filter(
          (piece) =>
            piece.assemblyId === assemblyId &&
            (piece.section !== 'engineInternal' || detailAssemblyId === 'engine'),
        );
        const box = poseBounds(
          plan,
          members.map((piece) => piece.nodeId),
          amount,
        );
        assert.ok(
          box.max[0] + 0.015 <= plane,
          `${assemblyId} at ${amount} (${detailAssemblyId || 'no selection'}): rear edge ${box.max[0]} must clear front fascia plane ${plane}`,
        );
      }
    }
  }
});

test('removed fuel tank clears the exterior side plane instead of crossing the rear body', () => {
  for (const detailAssemblyId of ['', 'body', 'engine', 'batteryHV']) {
    const plan = layout.createExplosionPlan(pieces, { detailAssemblyId });
    for (const amount of [0.65, 0.97, 1]) {
      const tank = groupBounds(plan, 'tank', amount);
      const sidePlane = groupBounds(plan, 'body', amount).min[2];
      assert.ok(
        tank.max[2] + 0.015 <= sidePlane,
        `tank at ${amount} (${detailAssemblyId || 'no selection'}): outer edge ${tank.max[2]} must clear body side plane ${sidePlane}`,
      );
    }
  }
});

test('detailed brakes and suspension springs stay clear of their neighboring road wheels', () => {
  const brakes = layout.createExplosionPlan(pieces, { detailAssemblyId: 'brakes' });
  const chassis = layout.createExplosionPlan(pieces, { detailAssemblyId: 'chassis' });
  for (const amount of [0.97, 1])
    for (const axle of ['front', 'rear'])
      for (const side of ['left', 'right']) {
        const corner = `${axle}-${side}`;
        assertClearance(
          groupBounds(brakes, `brake-${corner}`, amount),
          groupBounds(brakes, `wheel-${corner}`, amount),
          `detailed brake / wheel ${corner} at ${amount}`,
        );
        assertClearance(
          poseBounds(chassis, [`${corner}-spring`], amount),
          groupBounds(chassis, `wheel-${corner}`, amount),
          `detailed spring / wheel ${corner} at ${amount}`,
        );
      }
});

test('engine internals lift out of their original housings and clear the hood in detailed view', () => {
  const plan = layout.createExplosionPlan(pieces, { detailAssemblyId: 'engine' });
  const pairs = [
    ['engine-head', 'engine-block'],
    ['engine-cam-cover', 'engine-head'],
    ...[1, 2, 3, 4].flatMap((number) => [
      ['engine-block', `engine-piston-${String(number).padStart(2, '0')}`],
      ['engine-cam-cover', `engine-ignition-coil-${String(number).padStart(2, '0')}`],
    ]),
  ];
  for (const amount of [0.97, 1]) {
    for (const [left, right] of pairs)
      assertClearance(
        poseBounds(plan, [left], amount),
        poseBounds(plan, [right], amount),
        `${left} / ${right} at ${amount}`,
      );
    assertClearance(
      poseBounds(plan, ['engine-head'], amount),
      groupBounds(plan, 'hood', amount),
      `engine-head / hood at ${amount}`,
    );
  }
});

test('detailed battery opens its cover without crossing modules or neighboring assemblies', () => {
  const plan = layout.createExplosionPlan(pieces, { detailAssemblyId: 'batteryHV' });
  const modules = pieces.filter((piece) => /^battery-module-/.test(piece.nodeId));
  assert.equal(modules.length, 10);
  for (const amount of [0.97, 1]) {
    for (const module of modules)
      assertClearance(
        poseBounds(plan, ['battery-cover'], amount),
        poseBounds(plan, [module.nodeId], amount),
        `battery-cover / ${module.nodeId} at ${amount}`,
      );
    for (const neighbor of ['front-axle', 'rear-axle', 'tank', 'exhaust'])
      assertClearance(
        groupBounds(plan, 'batteryHV', amount),
        groupBounds(plan, neighbor, amount),
        `detailed batteryHV / ${neighbor} at ${amount}`,
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
