import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import source from '../../assets/models/suv/provenance.json';
import mechanicalSource from '../../assets/models/suv/mechanical-provenance.json';
import { explodeTransform } from './exploded-layout.js';
import { SUV_ASSEMBLY_IDS } from './vehicle-parts.js';

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

export async function loadReferenceSUV(progress, maxAnisotropy = 1) {
  const decoder = new DRACOLoader();
  decoder.setDecoderPath('assets/models/suv/draco/');
  decoder.setDecoderConfig({ type: 'wasm' });
  decoder.setWorkerLimit(2);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(decoder);
  try {
    const progressBySource = [0, 0];
    const sources = [source, mechanicalSource];
    const results = await Promise.allSettled(
      sources.map((asset, index) =>
        loader.loadAsync(asset.asset + '?v=' + asset.sha256.slice(0, 16), (event) => {
          progressBySource[index] = event.loaded;
          progress?.(
            Math.min(
              99,
              Math.round(
                (progressBySource.reduce((a, b) => a + b, 0) /
                  sources.reduce((sum, entry) => sum + entry.bytes, 0)) *
                  100,
              ),
            ),
          );
        }),
      ),
    );
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) {
      results
        .filter((result) => result.status === 'fulfilled')
        .forEach((result) => disposeModel(result.value.scene));
      throw failed.reason;
    }
    const models = results.map((result) => result.value);
    const root = new THREE.Group();
    root.name = 'SUV reference and didactic hybrid architecture';
    const groups = new Map(
      SUV_ASSEMBLY_IDS.map((id) => {
        const group = new THREE.Group();
        group.name = id;
        group.userData = { partId: id, offset: new THREE.Vector3() };
        root.add(group);
        return [id, group];
      }),
    );
    for (const [modelIndex, gltf] of models.entries()) {
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
        const materials = (Array.isArray(node.material) ? node.material : [node.material]).map(
          (material) => {
            const result = material.clone();
            result.envMapIntensity = 1;
            Object.values(result).forEach((value) => {
              if (!value?.isTexture) return;
              value.anisotropy = Math.max(1, Math.min(maxAnisotropy, 8));
            });
            return result;
          },
        );
        node.material = Array.isArray(node.material) ? materials : materials[0];
        const layout = explodeTransform({
          partId: id,
          sourceMesh,
          sourceFile,
          center,
          subassembly: original.section,
        });
        if (original.section === 'batteryCover') layout.offset[1] += 0.25;
        node.userData = {
          ...original,
          partId: id,
          basePosition: node.position.clone(),
          baseCenter: center,
          materialStates: materials.map(materialSnapshot),
          contextOccluder: /(?:_none|_void)/i.test(sourceMesh),
          meshOffset: new THREE.Vector3(...layout.offset),
          explodedLane: layout.lane,
          mechanicalExample: modelIndex === 1,
        };
        node.castShadow = id !== 'glass';
        node.receiveShadow = id !== 'glass';
        groups.get(id).add(node);
      }
    }
    root.updateMatrixWorld(true);
    return { root, groups };
  } finally {
    decoder.dispose();
  }
}
