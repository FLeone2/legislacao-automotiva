import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import source from '../../assets/models/suv/provenance.json';

export const SUV_REFERENCE = source;
export function materialSnapshot(material) {
  return {
    color: material.color?.clone() || new THREE.Color(0xffffff),
    emissive: material.emissive?.clone() || new THREE.Color(0),
    emissiveIntensity: material.emissiveIntensity || 0,
    opacity: material.opacity,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
  };
}
export function disposeModel(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root?.traverse((item) => {
    if (item.geometry) geometries.add(item.geometry);
    for (const material of (Array.isArray(item.material) ? item.material : [item.material]).filter(
      Boolean,
    )) {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value?.isTexture) textures.add(value);
      });
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

export async function loadReferenceSUV(progress) {
  const decoder = new DRACOLoader();
  decoder.setDecoderPath('assets/models/suv/draco/');
  decoder.setDecoderConfig({ type: 'wasm' });
  decoder.setWorkerLimit(2);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(decoder);
  try {
    const gltf = await loader.loadAsync(
      source.asset + '?v=' + source.sha256.slice(0, 16),
      (event) => progress?.(event.total ? Math.round((event.loaded / event.total) * 100) : null),
    );
    const root = new THREE.Group();
    root.name = 'BMW X5 G05 · reference assemblies';
    const offsets = {
      body: [0, 0.82, 0],
      doors: [0, 0.14, 0],
      glass: [0, 1.36, 0],
      seats: [0, 0.48, 0],
      steering: [-0.15, 0.55, 0],
      wheels: [0, 0, 0],
      brakes: [0, 0, 0],
      lights: [0, 0.12, 0],
      mirrors: [0, 0.18, 0],
      electronics: [0, 0.24, 0],
      vin: [0, 0.12, 0],
    };
    const groups = new Map(
      Object.entries(offsets).map(([id, offset]) => {
        const group = new THREE.Group();
        group.name = id;
        group.userData = { partId: id, offset: new THREE.Vector3(...offset) };
        root.add(group);
        return [id, group];
      }),
    );
    gltf.scene.updateMatrixWorld(true);
    const meshes = [];
    gltf.scene.traverse((node) => {
      if (node.isMesh) meshes.push(node);
    });
    for (const node of meshes) {
      const original = node.userData;
      const sourceMesh = original.sourceMesh || node.name;
      const sourceFile = original.sourceFile || '';
      const id = /SteeringWheel/i.test(sourceMesh)
        ? 'steering'
        : /LicensePlates/i.test(sourceFile)
          ? 'vin'
          : groups.has(original.partId)
            ? original.partId
            : 'body';
      const matrix = node.matrixWorld.clone();
      const center = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      node.removeFromParent();
      matrix.decompose(node.position, node.quaternion, node.scale);
      node.updateMatrix();
      const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
      const materials = sourceMaterials.map((material) => {
        const result = material.clone();
        result.envMapIntensity = 1;
        return result;
      });
      node.material = Array.isArray(node.material) ? materials : materials[0];
      node.userData = {
        ...original,
        partId: id,
        basePosition: node.position.clone(),
        materialStates: materials.map(materialSnapshot),
        contextOccluder: /(?:_none|_void)/i.test(sourceMesh),
      };
      const side = Math.sign(center.z) || 1;
      if (/Hood_/i.test(sourceMesh)) node.userData.meshOffset = new THREE.Vector3(-0.5, 0.35, 0);
      if (id === 'doors')
        node.userData.meshOffset = new THREE.Vector3(
          /Tailgate/i.test(sourceMesh) ? 0.65 : 0,
          0,
          /Tailgate/i.test(sourceMesh) ? 0 : side * 0.85,
        );
      if (id === 'wheels') node.userData.meshOffset = new THREE.Vector3(0, 0, side * 0.8);
      if (id === 'brakes') node.userData.meshOffset = new THREE.Vector3(0, 0, side * 0.4);
      if (id === 'mirrors') node.userData.meshOffset = new THREE.Vector3(0, 0, side * 0.65);
      if (id === 'lights' || id === 'vin')
        node.userData.meshOffset = new THREE.Vector3(Math.sign(center.x) * 0.4, 0, 0);
      node.castShadow = id !== 'glass';
      node.receiveShadow = id !== 'glass';
      groups.get(id).add(node);
    }
    root.updateMatrixWorld(true);
    return { root, groups };
  } finally {
    decoder.dispose();
  }
}
