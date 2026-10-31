import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import baseSource from '../../assets/models/suv/provenance.json';
import { PARTS } from '../guide/vehicle-parts.js';
import { ALL_SUBSYSTEMS } from '../guide/subsystem-coverage.js';
import { disposeModel, materialSnapshot } from '../guide/reference-suv.js';
import { pieceDescriptor, explosionOffset, wheelCorner } from './vehicle-layout.js';

const ASSEMBLIES = new Map(PARTS.map((part) => [part.id, part]));
const LABELS = Object.fromEntries(PARTS.map((part) => [part.id, part.label]));
const SUBSYSTEMS = new Map(ALL_SUBSYSTEMS.map((item) => [item.id, item]));
const INTERNAL_ASSEMBLIES = new Set([
  'engine',
  'motorElectric',
  'batteryHV',
  'battery12v',
  'tank',
  'exhaust',
  'electronics',
  'seats',
  'airbag',
  'steering',
  'cooling',
  'brakeFluid',
  'chassis',
]);
const clamp = (value) =>
  Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0));
const NOOP = () => {};
// The prototype lives at /prototipo/; the existing allowlisted assets live at
// the publishing root, independently of that route's trailing slash.
const assetUrl = (path) => new URL('/' + path.replace(/^\/+/, ''), location.origin).href;

function inheritedExtras(node) {
  const hierarchy = [];
  for (let item = node; item; item = item.parent) hierarchy.unshift(item.userData || {});
  return Object.assign({}, ...hierarchy);
}

/** Mount one persistent, event-rendered real 3D viewer. IDs describe visual parts. */
export function mountVehicleViewer(container, callbacks = {}) {
  if (!container || typeof container.append !== 'function')
    throw new TypeError('A área do visualizador não foi encontrada.');
  const onSelect = callbacks.onSelect || NOOP;
  const onReady = callbacks.onReady || NOOP;
  const onError = callbacks.onError || NOOP;
  const onState = callbacks.onState || NOOP;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const state = {
    ready: false,
    mode: 'assembled',
    explosion: 0,
    isolated: false,
    camera: 'perspective',
    selection: { assemblyId: '', subsystemId: '', nodeId: '' },
    wheelCount: 0,
  };
  let destroyed = false;
  let renderer, canvas, scene, camera, controls, environment, floor, keyLight;
  let root;
  let resizeObserver;
  let frame = 0;
  let hoverFrame = 0;
  let cameraTween = null;
  let currentExplosion = 0;
  let lastTime = 0;
  let focused = false;
  let pressed = null;
  let hovered = null;
  let viewportSize = { width: 0, height: 0 };
  let hasFramedModel = false;
  let wasHidden = false;
  const meshes = [];
  const pieces = new Map();
  const roadWheels = new Map();
  const projected = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const lightDirection = new THREE.Vector3(-5, 8, 5).normalize();

  function selectionIds() {
    const sub = SUBSYSTEMS.get(state.selection.subsystemId);
    return new Set(
      sub?.assemblyIds ||
        (sub?.assemblyId ? [sub.assemblyId] : [state.selection.assemblyId]).filter(Boolean),
    );
  }
  function selected(item) {
    return state.selection.nodeId
      ? item.userData.nodeId === state.selection.nodeId
      : selectionIds().has(item.userData.partId);
  }
  function pieceCenter(piece, amount = currentExplosion) {
    const box = new THREE.Box3();
    piece.meshes.forEach((item) => {
      const b = item.geometry.boundingBox.clone().applyMatrix4(item.matrixWorld);
      const delta = item.userData.explosionOffset.clone().multiplyScalar(amount - currentExplosion);
      box.union(b.translate(delta));
    });
    return box.getCenter(new THREE.Vector3());
  }
  function getParts() {
    return [...pieces.values()].map(({ meshes: partMeshes, ...part }) => ({
      ...part,
      subsystemIds: [...part.subsystemIds],
      meshCount: partMeshes.length,
    }));
  }
  function getState() {
    const result = {
      ...state,
      selection: { ...state.selection },
      actualExplosion: currentExplosion,
      pieceCount: pieces.size,
      meshCount: meshes.length,
      wheelPositions: [...roadWheels.entries()].map(([corner, value]) => ({
        corner,
        position: [...value],
      })),
    };
    if (camera && controls) {
      result.cameraPosition = camera.position.toArray();
      result.cameraTarget = controls.target.toArray();
      result.viewport = {
        ...viewportSize,
        visibleWidth: container.clientWidth,
        visibleHeight: container.clientHeight,
        aspect: camera.aspect,
      };
      result.drawingBuffer = canvas ? { width: canvas.width, height: canvas.height } : null;
    }
    if (canvas && root) {
      root.updateMatrixWorld(true);
      const width = container.clientWidth,
        height = container.clientHeight;
      result.pickPoints = [...pieces.values()]
        .filter((piece) => piece.meshes.some((item) => item.visible))
        .map((piece) => {
          projected.copy(pieceCenter(piece)).project(camera);
          return {
            nodeId: piece.nodeId,
            assemblyId: piece.assemblyId,
            x: ((projected.x + 1) * width) / 2,
            y: ((1 - projected.y) * height) / 2,
            inView:
              projected.z > -1 &&
              projected.z < 1 &&
              Math.abs(projected.x) < 1 &&
              Math.abs(projected.y) < 1,
          };
        });
    }
    return result;
  }
  function notify() {
    if (destroyed) return;
    container.dataset.ready = String(state.ready);
    container.dataset.prototypeReady = String(state.ready);
    if (canvas)
      Object.assign(canvas.dataset, {
        ready: String(state.ready),
        mode: state.mode,
        explosion: String(state.explosion),
        actualExplosion: String(currentExplosion),
        isolated: String(state.isolated),
        selectedAssembly: state.selection.assemblyId,
        selectedSubsystem: state.selection.subsystemId,
        selectedNode: state.selection.nodeId,
        wheelCount: String(state.wheelCount),
        pieceCount: String(pieces.size),
        meshCount: String(meshes.length),
        highlightedMeshes: String(meshes.filter((item) => item.visible && selected(item)).length),
      });
    // Diagnostics with projected coordinates are computed only on explicit getState.
    onState({
      ...state,
      selection: { ...state.selection },
      actualExplosion: currentExplosion,
      pieceCount: pieces.size,
    });
  }
  function render() {
    if (
      destroyed ||
      !renderer ||
      !camera ||
      container.clientWidth < 2 ||
      container.clientHeight < 2
    )
      return;
    renderer.render(scene, camera);
  }
  function pose() {
    meshes.forEach((item) =>
      item.position
        .copy(item.userData.basePosition)
        .addScaledVector(item.userData.explosionOffset, currentExplosion),
    );
    root?.updateMatrixWorld(true);
    if (canvas) canvas.dataset.actualExplosion = String(currentExplosion);
  }
  function tick(time) {
    frame = 0;
    if (destroyed) return;
    const dt = Math.min(64, lastTime ? time - lastTime : 16);
    lastTime = time;
    let ongoing = false;
    const delta = state.explosion - currentExplosion;
    if (Math.abs(delta) > 0.0001) {
      currentExplosion = motionPreference.matches
        ? state.explosion
        : currentExplosion + delta * (1 - Math.exp(-dt / 65));
      if (Math.abs(state.explosion - currentExplosion) < 0.0005) currentExplosion = state.explosion;
      else ongoing = true;
      pose();
    }
    if (cameraTween) {
      const progress = motionPreference.matches ? 1 : Math.min(1, (time - cameraTween.start) / 260);
      const eased = 1 - (1 - progress) ** 4;
      camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.position, eased);
      controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.target, eased);
      controls.update();
      if (progress === 1) cameraTween = null;
      else ongoing = true;
    }
    render();
    // OrbitControls can request a frame during camera.update. Keep one pending
    // frame so an interrupted camera tween never starts parallel render loops.
    if (ongoing && !frame) frame = requestAnimationFrame(tick);
    if (!ongoing) lastTime = 0;
  }
  function requestRender() {
    if (!destroyed && !frame) frame = requestAnimationFrame(tick);
  }
  function visibleBounds(selectionOnly = false, amount = state.explosion) {
    const box = new THREE.Box3();
    const corners = [];
    root?.updateMatrixWorld(true);
    meshes.forEach((item) => {
      if (!item.visible || (selectionOnly && !selected(item))) return;
      const bounds = item.geometry.boundingBox.clone().applyMatrix4(item.matrixWorld);
      bounds.translate(
        item.userData.explosionOffset.clone().multiplyScalar(amount - currentExplosion),
      );
      box.union(bounds);
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
    });
    return { box, corners };
  }
  function fitShadow({ box, corners }) {
    if (!keyLight || box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()).length();
    const target = box.getCenter(new THREE.Vector3());
    keyLight.target.position.copy(target);
    keyLight.position.copy(target).addScaledVector(lightDirection, Math.max(10, size * 1.5));
    keyLight.target.updateMatrixWorld();
    keyLight.updateMatrixWorld();
    keyLight.shadow.updateMatrices(keyLight);
    floor.position.y = box.min.y - Math.max(0.025, size * 0.004);
    const bounds = new THREE.Box3();
    for (const corner of corners) {
      bounds.expandByPoint(corner.clone().applyMatrix4(keyLight.shadow.camera.matrixWorldInverse));
      const ground = corner
        .clone()
        .addScaledVector(lightDirection, -(corner.y - floor.position.y) / lightDirection.y);
      bounds.expandByPoint(ground.applyMatrix4(keyLight.shadow.camera.matrixWorldInverse));
    }
    const pad = Math.max(0.15, size * 0.04);
    Object.assign(keyLight.shadow.camera, {
      left: bounds.min.x - pad,
      right: bounds.max.x + pad,
      top: bounds.max.y + pad,
      bottom: bounds.min.y - pad,
      near: Math.max(0.1, -bounds.max.z - pad),
      far: Math.max(5, -bounds.min.z + pad),
    });
    keyLight.shadow.camera.updateProjectionMatrix();
  }
  function framingDistance(corners, target, direction, aspect, width, height) {
    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right).normalize();
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const usableY = Math.max(0.64, 1 - 112 / height);
    const usableX = width < 500 ? 0.88 : 0.93;
    let distance = 0.25;
    for (const corner of corners) {
      const point = corner.clone().sub(target);
      distance = Math.max(
        distance,
        point.dot(direction) + Math.abs(point.dot(right)) / (tangent * aspect * usableX),
        point.dot(direction) + Math.abs(point.dot(up)) / (tangent * usableY),
      );
    }
    return distance * 1.035;
  }
  function fit({ immediate = false, selectionOnly = focused || state.isolated } = {}) {
    if (!root || !container.clientWidth || !container.clientHeight) return;
    let bounds = visibleBounds(selectionOnly);
    if (bounds.box.isEmpty()) bounds = visibleBounds(false);
    if (bounds.box.isEmpty()) return;
    hasFramedModel = true;
    const target = bounds.box.getCenter(new THREE.Vector3());
    const direction = (
      state.camera === 'top'
        ? new THREE.Vector3(0, 1, 0.001)
        : state.camera === 'side'
          ? new THREE.Vector3(0.001, 0.11, 1)
          : state.camera === 'front'
            ? new THREE.Vector3(-1, 0.16, 0.001)
            : new THREE.Vector3(...(state.explosion > 0 ? [-1, 0.78, 1.35] : [-1, 0.44, 1]))
    ).normalize();
    const distance = framingDistance(
      bounds.corners,
      target,
      direction,
      camera.aspect,
      container.clientWidth,
      container.clientHeight,
    );
    const position = target.clone().addScaledVector(direction, distance);
    controls.minDistance = Math.max(0.1, distance * 0.08);
    controls.maxDistance = Math.max(15, distance * 4);
    if (immediate || motionPreference.matches || !state.ready) {
      cameraTween = null;
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
    } else
      cameraTween = {
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        position,
        target,
        start: performance.now(),
      };
    fitShadow(bounds);
    requestRender();
  }
  function applyVisualState() {
    if (!root) return;
    const ids = selectionIds();
    const hasSelection = Boolean(state.selection.assemblyId || state.selection.nodeId);
    const internalSelection = pieces.get(state.selection.nodeId)?.section === 'engineInternal';
    const batterySelection =
      state.selection.nodeId.startsWith('battery-') &&
      pieces.get(state.selection.nodeId)?.section === 'tractionBattery';
    const reveal =
      state.mode === 'cutaway' ||
      (hasSelection &&
        INTERNAL_ASSEMBLIES.has(state.selection.assemblyId) &&
        state.explosion === 0 &&
        !state.isolated);
    meshes.forEach((item) => {
      const data = item.userData;
      const active = selected(item);
      const isInternal = data.section === 'engineInternal';
      item.visible =
        (!state.isolated || active) &&
        !((state.explosion > 0 || reveal || state.isolated) && data.contextOccluder) &&
        (!isInternal ||
          state.mode === 'cutaway' ||
          state.explosion > 0 ||
          (active && Boolean(state.selection.nodeId)));
      const engineShell =
        internalSelection &&
        ['engine-block', 'engine-head', 'engine-cam-cover'].includes(data.nodeId);
      const batteryShell = batterySelection && data.section === 'batteryCover';
      const wheelShell =
        state.selection.assemblyId === 'brakes' &&
        state.explosion === 0 &&
        data.partId === 'wheels';
      const shell =
        engineShell ||
        batteryShell ||
        wheelShell ||
        (reveal && !ids.has(data.partId) && ['body', 'doors', 'glass'].includes(data.partId));
      const materials = Array.isArray(item.material) ? item.material : [item.material];
      materials.forEach((material, index) => {
        const original = data.materialStates[index];
        material.color?.copy(original.color);
        if (active)
          material.color?.lerp(new THREE.Color(0xf26a32), data.mechanicalExample ? 0.08 : 0.13);
        material.emissive?.copy(active ? new THREE.Color(0x8c3413) : original.emissive);
        material.emissiveIntensity = active ? 0.09 : original.emissiveIntensity;
        const transparent = shell || original.transparent;
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
        material.opacity = shell ? Math.min(original.opacity, 0.075) : original.opacity;
        material.depthWrite = shell ? false : original.depthWrite;
        item.castShadow = !shell && data.partId !== 'glass';
      });
    });
    pose();
    notify();
    requestRender();
  }
  function setSelection(selection = {}) {
    if (destroyed) return;
    let assemblyId = selection.assemblyId || '';
    let subsystemId = selection.subsystemId || '';
    let nodeId = selection.nodeId || '';
    const subsystem = SUBSYSTEMS.get(subsystemId);
    if (subsystemId && !subsystem) subsystemId = '';
    if (subsystem && !assemblyId) assemblyId = subsystem.assemblyId;
    const piece = pieces.get(nodeId);
    if (piece) assemblyId = piece.assemblyId;
    else if (nodeId && state.ready) nodeId = '';
    if (assemblyId && !ASSEMBLIES.has(assemblyId)) return;
    if (
      subsystem &&
      assemblyId &&
      !(subsystem.assemblyIds || [subsystem.assemblyId]).includes(assemblyId)
    )
      subsystemId = '';
    state.selection = { assemblyId, subsystemId, nodeId };
    focused = false;
    if (!assemblyId) state.isolated = false;
    applyVisualState();
    if (state.isolated) fit();
  }
  function setMode(mode) {
    if (destroyed || !['assembled', 'exploded', 'cutaway'].includes(mode)) return;
    const changed = state.mode !== mode;
    state.mode = mode;
    state.explosion = mode === 'exploded' ? state.explosion || 0.65 : 0;
    focused = false;
    applyVisualState();
    if (changed) fit();
    requestRender();
  }
  function setExplosion(value) {
    if (destroyed) return;
    state.explosion = clamp(value);
    if (state.explosion > 0) state.mode = 'exploded';
    else if (state.mode === 'exploded') state.mode = 'assembled';
    focused = false;
    applyVisualState();
    fit();
    requestRender();
  }
  function setIsolated(value) {
    if (destroyed) return;
    state.isolated = Boolean(value && (state.selection.assemblyId || state.selection.nodeId));
    focused = false;
    applyVisualState();
    fit();
  }
  function setCamera(value) {
    if (destroyed || !['perspective', 'side', 'top', 'front'].includes(value)) return;
    state.camera = value;
    notify();
    fit();
  }
  function focusSelection() {
    if (destroyed || !state.selection.assemblyId) return;
    focused = true;
    fit({ selectionOnly: true });
  }
  function reset() {
    if (destroyed) return;
    state.mode = 'assembled';
    state.explosion = 0;
    state.isolated = false;
    state.camera = 'perspective';
    focused = false;
    applyVisualState();
    fit();
  }
  function resize() {
    if (destroyed || !renderer) return;
    const width = container.clientWidth,
      height = container.clientHeight;
    // Hidden tabs retain the drawing buffer and exact user camera. Showing the
    // same viewport again is not a request to refit the original perspective.
    if (width < 2 || height < 2) {
      wasHidden = true;
      return;
    }
    const returning = wasHidden;
    wasHidden = false;
    if (width === viewportSize.width && height === viewportSize.height) {
      if (returning) render();
      return;
    }
    const previousViewport = { ...viewportSize };
    viewportSize = { width, height };
    const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
    const pixelRatio = Math.min(
      Math.max(lowMemory ? 1.25 : 1.5, devicePixelRatio || 1),
      lowMemory ? 1.5 : 2,
      Math.sqrt((lowMemory ? 1800000 : 3500000) / (width * height)),
    );
    renderer.setPixelRatio(Math.max(1, pixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // A page can load directly into another tab: model-ready does not mean its
    // first visible camera has been framed yet.
    if (root && !hasFramedModel) fit({ immediate: true });
    else if (root) {
      // For a real size change preserve orbit direction, target and relative
      // zoom; only compensate for the narrower field of a portrait viewport.
      const offset = camera.position.clone().sub(controls.target);
      const direction = offset.clone().normalize();
      let bounds = visibleBounds(focused || state.isolated);
      if (bounds.box.isEmpty()) bounds = visibleBounds(false);
      const oldDistance = framingDistance(
        bounds.corners,
        controls.target,
        direction,
        previousViewport.width / previousViewport.height,
        previousViewport.width,
        previousViewport.height,
      );
      const newDistance = framingDistance(
        bounds.corners,
        controls.target,
        direction,
        camera.aspect,
        width,
        height,
      );
      offset.multiplyScalar(newDistance / oldDistance);
      cameraTween = null;
      camera.position.copy(controls.target).add(offset);
      controls.update();
      requestRender();
    }
    // setSize clears the drawing buffer. Paint in this resize transaction so a
    // screenshot, tab return or touch frame never presents the empty buffer.
    render();
  }
  function pick(event) {
    if (!root || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      meshes.filter((item) => item.visible && !item.userData.contextOccluder),
      false,
    );
    const hit = hits.find(({ object }) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      return materials.some((material) => material.opacity > 0.12);
    });
    return hit ? pieces.get(hit.object.userData.nodeId) : null;
  }
  function choose(piece) {
    if (!piece) return;
    setSelection({ assemblyId: piece.assemblyId, nodeId: piece.nodeId });
    onSelect({
      assemblyId: piece.assemblyId,
      nodeId: piece.nodeId,
      section: piece.section,
      label: piece.label,
    });
  }
  function keydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        '+',
        '=',
        '-',
        '_',
        'Home',
        '0',
        'f',
        'F',
        'Enter',
      ].includes(event.key)
    )
      event.preventDefault();
    if (event.key === 'Home' || event.key === '0') return reset();
    if (event.key === 'f' || event.key === 'F') return focusSelection();
    if (event.key === 'Enter') return choose(hovered);
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(event.key)
    )
      return;
    cameraTween = null;
    const offset = camera.position.clone().sub(controls.target);
    if (['+', '=', '-', '_'].includes(event.key))
      offset.multiplyScalar(['+', '='].includes(event.key) ? 0.9 : 1.1);
    else {
      const spherical = new THREE.Spherical().setFromVector3(offset);
      if (event.key === 'ArrowLeft') spherical.theta += 0.12;
      if (event.key === 'ArrowRight') spherical.theta -= 0.12;
      if (event.key === 'ArrowUp') spherical.phi = Math.max(0.08, spherical.phi - 0.1);
      if (event.key === 'ArrowDown')
        spherical.phi = Math.min(Math.PI / 2 + 0.03, spherical.phi + 0.1);
      offset.setFromSpherical(spherical);
    }
    camera.position.copy(controls.target).add(offset);
    controls.update();
    requestRender();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    listeners.abort();
    resizeObserver?.disconnect();
    motionPreference.removeEventListener?.('change', requestRender);
    cancelAnimationFrame(frame);
    cancelAnimationFrame(hoverFrame);
    controls?.dispose();
    disposeModel(root);
    floor?.geometry.dispose();
    floor?.material.dispose();
    keyLight?.shadow.dispose();
    environment?.dispose();
    renderer?.renderLists.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    canvas?.remove();
    pieces.clear();
    meshes.length = 0;
    delete container.__vehicleViewer;
    container.dataset.ready = 'false';
    container.dataset.prototypeReady = 'false';
  }
  const api = {
    setSelection,
    setMode,
    setExplosion,
    setIsolated,
    setCamera,
    focusSelection,
    reset,
    getState,
    getParts,
    destroy,
  };
  container.__vehicleViewer = api;
  container.dataset.ready = 'false';
  container.dataset.prototypeReady = 'false';

  async function initialize() {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      // This studio renders on demand. Retain its last real frame when a tab
      // hides it or a browser captures a resized viewport before the next paint.
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    // Variance filtering gives the studio light an area-like soft penumbra.
    // PCFSoftShadowMap ignores DirectionalLight.shadow.radius.
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.setClearColor(0xedf0f2, 0);
    canvas = renderer.domElement;
    canvas.style.cssText =
      'display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute(
      'aria-label',
      'Veículo 3D interativo. Arraste para girar. Use setas para girar, mais e menos para aproximar, F para focar e Home para restaurar. As mesmas peças estão disponíveis na árvore textual.',
    );
    canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown + - F Home');
    container.append(canvas);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.015, 200);
    camera.position.set(-5, 3, 5);
    controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.85, 0);
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI / 2 + 0.03;
    controls.addEventListener('change', requestRender);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const studio = new RoomEnvironment();
    environment = pmrem.fromScene(studio, 0.055);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.82;
    studio.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xe4edff, 0x343a40, 1.16));
    keyLight = new THREE.DirectionalLight(0xfff1e5, 2.4);
    keyLight.castShadow = true;
    keyLight.position.set(-5, 8, 5);
    keyLight.shadow.mapSize.set(
      navigator.deviceMemory <= 4 ? 512 : 1024,
      navigator.deviceMemory <= 4 ? 512 : 1024,
    );
    keyLight.shadow.normalBias = 0.012;
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.radius = 7;
    keyLight.shadow.blurSamples = 8;
    scene.add(keyLight, keyLight.target);
    const rim = new THREE.DirectionalLight(0xb3d7ff, 1.4);
    rim.position.set(4, 3, -4);
    scene.add(rim);
    floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener('resize', resize, { signal: listeners.signal });
    resize();
    motionPreference.addEventListener?.('change', requestRender);
    canvas.addEventListener('keydown', keydown, { signal: listeners.signal });
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        pressed = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, moved: false };
        cameraTween = null;
      },
      { signal: listeners.signal },
    );
    canvas.addEventListener(
      'pointerup',
      (event) => {
        if (!pressed || event.pointerId !== pressed.pointerId) return;
        const moved =
          pressed.moved || Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) >= 6;
        pressed = null;
        if (!moved) choose(pick(event));
      },
      { signal: listeners.signal },
    );
    canvas.addEventListener(
      'pointercancel',
      () => {
        pressed = null;
      },
      { signal: listeners.signal },
    );
    canvas.addEventListener(
      'pointerleave',
      () => {
        hovered = null;
        canvas.style.cursor = 'grab';
      },
      { signal: listeners.signal },
    );
    canvas.addEventListener(
      'pointermove',
      (event) => {
        if (pressed) {
          if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) >= 6)
            pressed.moved = true;
          return;
        }
        if (hoverFrame) return;
        const point = { clientX: event.clientX, clientY: event.clientY };
        hoverFrame = requestAnimationFrame(() => {
          hoverFrame = 0;
          if (!destroyed) {
            hovered = pick(point);
            canvas.style.cursor = hovered ? 'pointer' : 'grab';
          }
        });
      },
      { signal: listeners.signal },
    );
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        if (!destroyed) {
          event.preventDefault();
          onError(new Error('A renderização 3D foi interrompida. Continue pela árvore textual.'));
        }
      },
      { signal: listeners.signal },
    );
    const response = await fetch(assetUrl('assets/prototype/models/mechanical-provenance.json'));
    if (!response.ok)
      throw new Error(`Não foi possível carregar o inventário do modelo (${response.status}).`);
    const mechanicalSource = await response.json();
    if (destroyed) return;
    const decoder = new DRACOLoader();
    decoder.setDecoderPath(assetUrl('assets/models/suv/draco/'));
    decoder.setDecoderConfig({ type: 'wasm' });
    decoder.setWorkerLimit(2);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(decoder);
    const sourceList = [
      baseSource,
      { ...mechanicalSource, asset: 'assets/prototype/models/mechanical-supplement.glb' },
    ];
    const results = await Promise.allSettled(
      sourceList.map((asset) =>
        loader.loadAsync(assetUrl(asset.asset) + '?v=' + asset.sha256.slice(0, 16)),
      ),
    );
    decoder.dispose();
    if (destroyed || results.some((result) => result.status === 'rejected')) {
      results
        .filter((result) => result.status === 'fulfilled')
        .forEach((result) => disposeModel(result.value.scene));
      if (!destroyed) throw results.find((result) => result.status === 'rejected').reason;
      return;
    }
    root = new THREE.Group();
    root.name = 'Bancada 3D — referência e subconjuntos didáticos';
    for (const [modelIndex, result] of results.entries()) {
      const gltf = result.value;
      gltf.scene.updateMatrixWorld(true);
      const nodes = [];
      gltf.scene.traverse((node) => {
        if (node.isMesh) nodes.push(node);
      });
      for (const node of nodes) {
        const extras = inheritedExtras(node);
        const center = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
        const descriptor = pieceDescriptor(extras, node.name, center, LABELS);
        if (!ASSEMBLIES.has(descriptor.assemblyId)) descriptor.assemblyId = 'body';
        const world = node.matrixWorld.clone();
        node.removeFromParent();
        world.decompose(node.position, node.quaternion, node.scale);
        const materials = (Array.isArray(node.material) ? node.material : [node.material]).map(
          (original) => {
            const material = original.clone();
            material.envMapIntensity = 1;
            // Metallic automotive paint has a diffuse body under its clearcoat;
            // reducing mirror-like reflection makes the CAD panels read as paint.
            if (modelIndex === 0 && /_Paint$/i.test(material.name)) {
              material.metalness = 0.57;
              material.roughness = 0.31;
              material.clearcoat = 0.85;
              material.clearcoatRoughness = 0.21;
              material.envMapIntensity = 1.05;
            }
            Object.values(material).forEach((value) => {
              if (value?.isTexture)
                value.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            });
            return material;
          },
        );
        node.material = Array.isArray(node.material) ? materials : materials[0];
        node.geometry.computeBoundingBox();
        node.userData = {
          ...extras,
          partId: descriptor.assemblyId,
          nodeId: descriptor.nodeId,
          section: descriptor.section,
          basePosition: node.position.clone(),
          baseCenter: center.clone(),
          materialStates: materials.map(materialSnapshot),
          explosionOffset: new THREE.Vector3(
            ...explosionOffset({
              ...descriptor,
              sourceMesh: extras.sourceMesh,
              sourceFile: extras.sourceFile,
              center,
            }),
          ),
          contextOccluder: /(?:_none|_void)/i.test(extras.sourceMesh || node.name),
          mechanicalExample: modelIndex === 1,
        };
        node.castShadow = descriptor.assemblyId !== 'glass';
        node.receiveShadow = descriptor.assemblyId !== 'glass';
        root.add(node);
        meshes.push(node);
        if (!pieces.has(descriptor.nodeId))
          pieces.set(descriptor.nodeId, {
            ...descriptor,
            subsystemIds: ALL_SUBSYSTEMS.filter((sub) =>
              (sub.assemblyIds || [sub.assemblyId]).includes(descriptor.assemblyId),
            ).map((sub) => sub.id),
            meshes: [],
          });
        pieces.get(descriptor.nodeId).meshes.push(node);
        if (modelIndex === 0 && /Wheel_Tire/i.test(extras.sourceMesh || ''))
          roadWheels.set(wheelCorner(center), center.toArray());
      }
    }
    state.wheelCount = roadWheels.size;
    if (state.wheelCount !== 4)
      throw new Error(
        `O inventário de rodas precisa conter quatro posições; foram encontradas ${state.wheelCount}.`,
      );
    scene.add(root);
    root.updateMatrixWorld(true);
    if (state.selection.nodeId && !pieces.has(state.selection.nodeId)) state.selection.nodeId = '';
    applyVisualState();
    currentExplosion = state.explosion;
    pose();
    fit({ immediate: true });
    render();
    state.ready = true;
    notify();
    if (!destroyed)
      onReady({
        pieces: getParts(),
        assemblyIds: [...new Set(meshes.map((item) => item.userData.partId))],
        wheelCount: state.wheelCount,
      });
  }
  Promise.resolve()
    .then(initialize)
    .catch((error) => {
      if (!destroyed) {
        container.dataset.error = 'true';
        onError(error);
      }
    });
  return api;
}
