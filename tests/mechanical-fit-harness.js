// Regression against the actual decoded meshes, independent of camera or CSS.
import * as THREE from 'three';
import { loadReferenceSUV, disposeModel } from '../src/guide/reference-suv.js';

async function inspect() {
  const { root, groups } = await loadReferenceSUV();
  try {
    root.updateMatrixWorld(true);
    const hood = [];
    root.traverse((mesh) => {
      if (
        mesh.isMesh &&
        /Hood/i.test(mesh.userData.sourceFile || '') &&
        !/void/i.test(mesh.userData.sourceMesh || '')
      )
        hood.push(mesh);
    });
    const engine = groups.get('engine');
    const bounds = new THREE.Box3().setFromObject(engine);
    const ray = new THREE.Raycaster();
    let checked = 0,
      minimum = Infinity,
      previousMinimum = Infinity,
      vertices = 0;
    engine.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const position = mesh.geometry.attributes.position;
      vertices += position.count;
      for (let index = 0; index < position.count; index++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(position, index)
          .applyMatrix4(mesh.matrixWorld);
        // The transmission intentionally extends behind the hood into the
        // tunnel. Check the engine's upper surfaces against actual hood paint.
        if (point.x > -1 || point.y < 0.85) continue;
        ray.set(new THREE.Vector3(point.x, 3, point.z), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObjects(hood, false)[0];
        if (!hit) continue;
        checked++;
        minimum = Math.min(minimum, hit.point.y - point.y);
        // The former installation was 65mm higher. This must fail the same
        // physical check, proving that the test detects the reported defect.
        previousMinimum = Math.min(previousMinimum, hit.point.y - (point.y + 0.065));
      }
    });
    const internalChecks = [];
    for (const [partId, group] of groups) {
      let vertexCount = 0,
        clearance = Infinity;
      group.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.userData.mechanicalExample) return;
        const position = mesh.geometry.attributes.position;
        for (let index = 0; index < position.count; index++) {
          const point = new THREE.Vector3()
            .fromBufferAttribute(position, index)
            .applyMatrix4(mesh.matrixWorld);
          if (point.x > -1 || point.y < 0.85) continue;
          ray.set(new THREE.Vector3(point.x, 3, point.z), new THREE.Vector3(0, -1, 0));
          const hit = ray.intersectObjects(hood, false)[0];
          if (!hit) continue;
          vertexCount++;
          clearance = Math.min(clearance, hit.point.y - point.y);
        }
      });
      if (vertexCount)
        internalChecks.push({ partId, checkedVertices: vertexCount, minimumClearance: clearance });
    }
    window.mechanicalFit = {
      hoodMeshes: hood.length,
      engineVertices: vertices,
      checkedVertices: checked,
      minimumClearance: minimum,
      previousMinimumClearance: previousMinimum,
      internalChecks,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    };
  } finally {
    disposeModel(root);
  }
}

inspect().catch((error) => {
  window.mechanicalFitError = String(error.stack || error);
});
