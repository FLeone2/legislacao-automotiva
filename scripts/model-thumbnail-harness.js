// Export-only studio. It loads the approved model without editing its geometry
// or the interactive VehicleScene renderer. Presentation offsets stay here.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadReferenceSUV, disposeModel } from '../src/guide/reference-suv.js';
import { PARTS, SUV_ASSEMBLY_IDS } from '../src/guide/vehicle-parts.js';
import { ALL_SUBSYSTEMS } from '../src/guide/subsystem-coverage.js';

const labels = Object.fromEntries(PARTS.map((part) => [part.id, part.label]));
const keyFor = (ids) => [...new Set(ids)].sort().join('--');
const requests = new Map();
for (const id of SUV_ASSEMBLY_IDS) requests.set(keyFor([id]), [id]);
for (const row of ALL_SUBSYSTEMS)
  requests.set(keyFor(row.assemblyIds), [...row.assemblyIds].sort());

const notes = {
  brakes:
    'Freio dianteiro com cubo e parafusos reais da roda como contexto. A proteção traseira foi omitida para leitura da face do disco. ABS e ESC não possuem controles individuais nesta imagem.',
  brakeFluid:
    'Reservatório, cilindro mestre e circuito didáticos. A imagem não representa composição ou especificação de um fluido.',
  wheels: 'Exemplar dianteiro da roda e do pneu do modelo de referência.',
  chassis:
    'Exemplo didático da suspensão dianteira. Não representa dimensões ou arquitetura interna certificada do BMW.',
  steering:
    'Exemplar de direção do modelo; no conjunto de suspensão mostra-se a cremalheira didática.',
  glass:
    'Conjunto de vidros da referência. Limpadores, lavadores e mecanismos de acionamento não têm peças individuais reproduzidas nesta miniatura.',
  doors:
    'Exemplar de porta da referência; mecanismos e requisitos específicos continuam sendo consultados no conjunto.',
  seats:
    'Conjunto de bancos da referência; materiais, cintos e ancoragens não são todos representados como peças individuais.',
  vin: 'Elementos de identificação visuais do modelo. A miniatura não reproduz gravação VIN nem localização ou dimensões de marcações obrigatórias.',
  electronics:
    'Painel e módulos do conjunto visual; não representa um produto de telecomunicações homologado ou um circuito certificado.',
  batteryHV:
    'Módulos e conexões da bateria didática, com a tampa omitida para inspeção; não é a arquitetura certificada do BMW.',
};

function keepMesh(mesh, partId, ids) {
  if (mesh.userData.contextOccluder) return false;
  const center = mesh.userData.baseCenter;
  const name = mesh.userData.sourceMesh || mesh.name;
  if (partId === 'brakes' || partId === 'wheels') return center.x < -0.8 && center.z > 0.4;
  if (partId === 'chassis') return mesh.userData.section === 'frontSuspension';
  if (partId === 'batteryHV') return mesh.userData.section !== 'batteryCover';
  if (partId === 'body' && /Emblem/i.test(name) && center.y < 0.8 && Math.abs(center.z) > 0.8)
    return false;
  if (partId === 'electronics')
    return ids.includes('engine') ? mesh.userData.mechanicalExample : /Dashboard/i.test(name);
  if (partId === 'steering')
    return ids.includes('chassis')
      ? mesh.userData.section === 'steeringRack'
      : /SteeringWheel/i.test(name);
  if (partId === 'doors') return /Door_F_/i.test(name) && center.z > 0;
  if (partId === 'mirrors') return center.z > 0;
  if (partId === 'vin') return center.x < 0;
  if (partId === 'lights') return /Headlights/i.test(name);
  return true;
}

async function initialize() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setDrawingBufferSize(1024, 768, 2);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x0e131b, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe4edff, 0x20262c, 1.05));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  const environment = pmrem.fromScene(studio, 0.025);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.7;
  studio.dispose();
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff1e5, 3.1);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.normalBias = 0.008;
  key.shadow.bias = -0.0001;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xb3d7ff, 2);
  rim.position.set(4, 3, -4);
  scene.add(rim);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.2 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const { root, groups } = await loadReferenceSUV(null, renderer.capabilities.getMaxAnisotropy());
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, 0.01, 100);

  function capture(id) {
    const ids = requests.get(id);
    if (!ids) throw new Error('Unknown thumbnail request: ' + id);
    const selected = [];
    const contextIds = ids.includes('brakes') && !ids.includes('wheels') ? ['wheels'] : [];
    groups.forEach((group, partId) => {
      group.position.set(0, 0, 0);
      group.visible = ids.includes(partId) || contextIds.includes(partId);
      group.traverse((mesh) => {
        if (!mesh.isMesh) return;
        mesh.position.copy(mesh.userData.basePosition);
        mesh.visible = group.visible && keepMesh(mesh, partId, ids);
        if (mesh.visible && partId === 'brakes' && /Brake_Cover/i.test(mesh.userData.sourceMesh))
          mesh.visible = false;
        if (
          mesh.visible &&
          contextIds.includes(partId) &&
          !/Wheel_Connecter|Wheel_Screws/i.test(mesh.userData.sourceMesh)
        )
          mesh.visible = false;
        if (mesh.visible && partId === 'brakes' && /Brake_Disk/i.test(mesh.userData.sourceMesh)) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => {
            material.flatShading = true;
            material.needsUpdate = true;
          });
        }
        if (mesh.visible) selected.push(mesh);
      });
    });
    if (!selected.length) throw new Error('No real selected mesh: ' + id);
    const translations = {};
    // Multiple independent systems are presented together, not as a certified
    // installation. Their exact display translations are recorded in provenance.
    if (ids.length > 1 && !ids.includes('chassis')) {
      root.updateMatrixWorld(true);
      const order = ['engine', 'motorElectric', 'batteryHV', 'electronics', 'exhaust'];
      const packing = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      const boxes = packing.map((partId) => {
        const box = new THREE.Box3();
        selected
          .filter((mesh) => mesh.userData.partId === partId)
          .forEach((mesh) => {
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
          });
        return box;
      });
      const sizes = boxes.map((box) => box.getSize(new THREE.Vector3()));
      const topHeight = Math.max(...sizes.slice(0, 2).map((size) => size.y));
      packing.forEach((partId, index) => {
        const box = boxes[index];
        const center = box.getCenter(new THREE.Vector3());
        const x = index === 2 ? 0 : index === 0 ? -(sizes[1].x + 0.3) / 2 : (sizes[0].x + 0.3) / 2;
        const y = index === 2 ? -(topHeight + sizes[index].y) / 2 - 0.3 : 0;
        const offset = new THREE.Vector3(x, y, 0).sub(center);
        groups.get(partId).position.copy(offset);
        translations[partId] = offset.toArray();
      });
    }
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    const corners = [];
    for (const mesh of selected) {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      bounds.union(box);
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
    const target = bounds.getCenter(new THREE.Vector3());
    const direction = (
      ids.includes('brakes')
        ? new THREE.Vector3(-0.35, 0.3, 1.8)
        : new THREE.Vector3(ids.length === 1 && ids[0] === 'electronics' ? 1 : -1, 0.6, 1.5)
    ).normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right).normalize();
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let distance = 0.1;
    const point = new THREE.Vector3();
    for (const mesh of selected) {
      const positions = mesh.geometry.getAttribute('position');
      for (let index = 0; index < positions.count; index++) {
        point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld).sub(target);
        distance = Math.max(
          distance,
          point.dot(direction) + Math.abs(point.dot(right)) / (tangent * camera.aspect * 0.92),
          point.dot(direction) + Math.abs(point.dot(up)) / (tangent * 0.9),
        );
      }
    }
    camera.position.copy(target).addScaledVector(direction, distance * 1.04);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    floor.position.y = bounds.min.y - 0.04;
    const size = bounds.getSize(new THREE.Vector3()).length();
    const lightDirection = new THREE.Vector3(-5, 8, 5).normalize();
    key.target.position.copy(target);
    key.position.copy(target).addScaledVector(lightDirection, Math.max(10, size * 1.5));
    key.target.updateMatrixWorld();
    key.updateMatrixWorld();
    key.shadow.updateMatrices(key);
    const lightBounds = new THREE.Box3();
    for (const point of corners) {
      lightBounds.expandByPoint(point.clone().applyMatrix4(key.shadow.camera.matrixWorldInverse));
      const ground = point
        .clone()
        .addScaledVector(lightDirection, -(point.y - floor.position.y) / lightDirection.y);
      lightBounds.expandByPoint(ground.applyMatrix4(key.shadow.camera.matrixWorldInverse));
    }
    Object.assign(key.shadow.camera, {
      left: lightBounds.min.x - 0.2,
      right: lightBounds.max.x + 0.2,
      bottom: lightBounds.min.y - 0.2,
      top: lightBounds.max.y + 0.2,
      near: Math.max(0.1, -lightBounds.max.z - 0.2),
      far: Math.max(1, -lightBounds.min.z + 0.2),
    });
    key.shadow.camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const allMeshes = ids.flatMap((partId) =>
      groups.get(partId).children.filter((mesh) => mesh.isMesh),
    );
    const modelSources = [
      ...new Set(
        selected.map((mesh) =>
          mesh.userData.mechanicalExample ? 'authored-mechanics' : 'bmw-x5-g05',
        ),
      ),
    ].sort();
    return {
      dataUrl: renderer.domElement.toDataURL('image/png'),
      id,
      assemblyIds: ids,
      contextAssemblyIds: contextIds,
      labels: ids.map((partId) => labels[partId]),
      modelSources,
      mechanicalExample: selected.some((mesh) => mesh.userData.mechanicalExample),
      subset: selected.length < allMeshes.length,
      selectedMeshIds: selected.map((mesh) => mesh.name).sort(),
      selectedMeshes: selected
        .map((mesh) => ({
          id: mesh.name,
          assemblyId: mesh.userData.partId,
          sourceMesh: mesh.userData.sourceMesh,
          sourceFile: mesh.userData.sourceFile,
          section: mesh.userData.section || null,
          mechanicalExample: mesh.userData.mechanicalExample,
          role: contextIds.includes(mesh.userData.partId) ? 'context' : 'selection',
          flatShading: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).some(
            (material) => material.flatShading,
          ),
          baseCenter: mesh.userData.baseCenter.toArray(),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      displayTranslations: translations,
      camera: { position: camera.position.toArray(), target: target.toArray(), fov: camera.fov },
      notes: ids.map((partId) => notes[partId]).filter(Boolean),
    };
  }
  window.thumbnailStudio = {
    capture,
    catalog: {
      requests: [...requests.keys()].sort(),
      assemblies: SUV_ASSEMBLY_IDS.map((id) => ({
        id,
        label: labels[id],
        imageId: keyFor([id]),
        assemblyIds: [id],
      })),
      subsystems: ALL_SUBSYSTEMS.map((row) => ({
        id: row.id,
        label: row.label,
        canonical: row.canonical,
        exampleOnly: Boolean(row.exampleOnly),
        imageId: keyFor(row.assemblyIds),
        assemblyIds: [...row.assemblyIds].sort(),
      })),
    },
    dispose() {
      disposeModel(scene);
      key.shadow.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}

initialize().catch((error) => {
  window.thumbnailError = String(error);
});
