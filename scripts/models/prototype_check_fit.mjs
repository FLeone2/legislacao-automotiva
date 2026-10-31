// Read the actual Draco-decoded meshes and check their assembled hood clearance.
// Usage: node scripts/models/prototype_check_fit.mjs AUTHORING_TOOLCHAIN_DIR
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requireTool = createRequire(
  resolve(process.argv[2] || '/workspace/suv-studio', 'package.json'),
);
const { NodeIO } = requireTool('@gltf-transform/core');
const { ALL_EXTENSIONS } = requireTool('@gltf-transform/extensions');
const draco = requireTool('draco3dgltf');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco.createDecoderModule(),
});

const meshes = (document, accept) => {
  const result = [];
  for (const node of document.getRoot().listNodes()) {
    if (!node.getMesh() || !accept(node.getExtras())) continue;
    for (const primitive of node.getMesh().listPrimitives()) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(primitive.getAttribute('POSITION').getArray(), 3),
      );
      if (primitive.getIndices())
        geometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray(), 1));
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
      mesh.matrix.fromArray(node.getWorldMatrix());
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrixWorld(true);
      mesh.userData = node.getExtras();
      result.push(mesh);
    }
  }
  return result;
};

const base = await io.read(resolve(root, 'assets/models/suv/bmw-x5.glb'));
const supplement = await io.read(
  resolve(root, 'assets/prototype/models/mechanical-supplement.glb'),
);
const hood = meshes(
  base,
  (extras) => /Hood/i.test(extras.sourceFile || '') && !/void/i.test(extras.sourceMesh || ''),
);
const mechanical = meshes(supplement, () => true);
const ray = new THREE.Raycaster();
const point = new THREE.Vector3();
const origin = new THREE.Vector3();
const direction = new THREE.Vector3(0, -1, 0);
const checks = new Map();
for (const mesh of mechanical) {
  const position = mesh.geometry.attributes.position;
  const row = checks.get(mesh.userData.partId) || {
    partId: mesh.userData.partId,
    checkedVertices: 0,
    minimumClearance: Infinity,
  };
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    if (point.x > -1 || point.y < 0.85) continue;
    ray.set(origin.set(point.x, 3, point.z), direction);
    const hit = ray.intersectObjects(hood, false)[0];
    if (!hit) continue;
    row.checkedVertices++;
    row.minimumClearance = Math.min(row.minimumClearance, hit.point.y - point.y);
  }
  checks.set(row.partId, row);
}
const results = [...checks.values()].filter((row) => row.checkedVertices);
if (hood.length < 2) throw new Error('Reference hood meshes missing');
const engine = checks.get('engine');
if (!engine || engine.checkedVertices < 1000 || engine.minimumClearance < 0.02)
  throw new Error(`Engine fit failed: ${JSON.stringify(engine)}`);
for (const row of results) {
  if (row.minimumClearance < 0.005)
    throw new Error(`Mechanical fit failed: ${JSON.stringify(row)}`);
}
console.log(JSON.stringify({ hoodMeshes: hood.length, mechanicalChecks: results }, null, 2));
