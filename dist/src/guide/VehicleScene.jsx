import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { renderDefinition } from './render-definition.js';
import {
  loadReferenceSUV,
  materialSnapshot,
  disposeModel,
  SUV_REFERENCE,
} from './reference-suv.js';
import { EXPLOSION_VIEW } from './exploded-layout.js';
import { PARTS, sceneKind, visibleParts } from './vehicle-parts.js';

const COLOR = {
  shell: 0x466884,
  metal: 0x8694a8,
  dark: 0x26303b,
  tire: 0x101318,
  glass: 0x263c50,
  orange: 0xffb287,
  green: 0x80bda4,
};

// A purpose-built navigation model; these geometries contain no CAD dimensions.
function createVehicle(category, powertrain) {
  const root = new THREE.Group();
  const groups = new Map();
  const kind = sceneKind(category);
  const visible = new Set(visibleParts(category, powertrain).map((part) => part.id));
  const isMoto = kind === 'moto';
  const long = kind === 'bus' || kind === 'truck' || kind === 'trailer';
  const length = long ? 6 : 4.5;
  const width = isMoto ? 0.5 : 1.9;
  const front = -length / 2;
  const rear = length / 2;
  const axle = long ? 2.1 : 1.48;
  const cabinX = kind === 'truck' ? -1.8 : -0.02;

  function group(id, explode) {
    if (!groups.has(id)) {
      const item = new THREE.Group();
      item.userData.partId = id;
      item.userData.offset = new THREE.Vector3(...explode);
      item.visible = visible.has(id);
      item.userData.available = item.visible;
      root.add(item);
      groups.set(id, item);
    }
    return groups.get(id);
  }

  function mesh(id, geometry, position, color = COLOR.metal, opts = {}) {
    const painted = ['body', 'doors', 'mirrors'].includes(id);
    const transparent = opts.opacity !== undefined && opts.opacity < 1;
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: opts.roughness ?? (painted ? 0.26 : id === 'seats' ? 0.85 : 0.42),
      metalness:
        opts.metalness ?? (painted ? 0.72 : ['seats', 'airbag', 'glass'].includes(id) ? 0 : 0.48),
      clearcoat: opts.clearcoat ?? (painted ? 1 : 0),
      clearcoatRoughness: opts.clearcoatRoughness ?? 0.16,
      transparent,
      opacity: opts.opacity ?? 1,
      depthWrite: !transparent,
      side: opts.side ?? THREE.DoubleSide,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      envMapIntensity: opts.envMapIntensity ?? 1,
      ...(opts.bumpMap ? { bumpMap: opts.bumpMap, bumpScale: opts.bumpScale ?? 0.008 } : {}),
    });
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    item.userData.basePosition = item.position.clone();
    item.userData.partId = id;
    item.userData.originalColor = color;
    item.userData.originalOpacity = material.opacity;
    item.userData.originalEmissive = material.emissive.clone();
    item.userData.originalEmissiveIntensity = material.emissiveIntensity;
    item.userData.materialStates = [materialSnapshot(material)];
    item.castShadow = !transparent;
    item.receiveShadow = !transparent;
    if (opts.rotation) item.rotation.set(...opts.rotation);
    group(id, opts.explode || [0, 0, 0]).add(item);
    if (opts.edges === true) {
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 24),
        new THREE.LineBasicMaterial({ color: 0x99b2c2, transparent: true, opacity: 0.2 }),
      );
      item.add(edges);
    }
    return item;
  }

  function box(id, size, position, color, opts) {
    return mesh(
      id,
      new RoundedBoxGeometry(...size, 3, Math.min(...size) * 0.18),
      position,
      color,
      opts,
    );
  }

  function rod(id, from, to, radius, color, opts = {}) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const delta = end.clone().sub(start);
    const item = mesh(
      id,
      new THREE.CylinderGeometry(radius, radius, delta.length(), 12),
      start.clone().add(end).multiplyScalar(0.5).toArray(),
      color,
      { ...opts, edges: false },
    );
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return item;
  }

  // A closed tire profile and open alloy rim leave the brake disc visible.
  function wheel(x, z) {
    const wheelStart = groups.get('wheels').children.length;
    const brakeStart = groups.get('brakes').children.length;
    const side = Math.sign(z) || 1;
    const halfWidth = isMoto ? 0.075 : 0.145;
    const tireProfile = [
      [0.31, -0.83],
      [0.36, -1],
      [0.435, -1],
      [0.475, -0.78],
      [0.499, -0.45],
      [0.504, 0],
      [0.499, 0.45],
      [0.475, 0.78],
      [0.435, 1],
      [0.36, 1],
      [0.31, 0.83],
      [0.31, -0.83],
    ].map(([radius, depth]) => new THREE.Vector3(radius, depth * halfWidth, 0));
    const curve = new THREE.CatmullRomCurve3(tireProfile);
    const profile = curve.getPoints(54).map((p) => new THREE.Vector2(p.x, p.y));
    mesh('wheels', new THREE.LatheGeometry(profile, 72), [x, 0.51, z], COLOR.tire, {
      rotation: [Math.PI / 2, 0, 0],
      roughness: 0.9,
      metalness: 0,
      edges: false,
    });
    for (const groove of [-0.067, 0, 0.067]) {
      mesh(
        'wheels',
        new THREE.TorusGeometry(0.502, 0.0028, 5, 72),
        [x, 0.51, z + groove],
        0x07090c,
        { roughness: 1, metalness: 0 },
      );
    }
    // Sidewall rings, machined rim lips, valve and five pairs of swept spokes.
    for (const face of [-1, 1]) {
      const outer = z + face * (halfWidth + 0.004);
      mesh('wheels', new THREE.TorusGeometry(0.424, 0.003, 5, 64), [x, 0.51, outer], 0x22262b, {
        roughness: 0.9,
        metalness: 0,
      });
      mesh(
        'wheels',
        new THREE.TorusGeometry(0.309, 0.014, 8, 64),
        [x, 0.51, z + face * 0.111],
        0xc3cbd0,
        { roughness: 0.2, metalness: 0.94 },
      );
    }
    mesh(
      'wheels',
      new THREE.CylinderGeometry(0.303, 0.303, 0.205, 64, 1, true),
      [x, 0.51, z],
      0x444d59,
      { rotation: [Math.PI / 2, 0, 0], roughness: 0.3, metalness: 0.85 },
    );
    const faceZ = z + side * 0.125;
    for (let index = 0; index < 5; index++) {
      const angle = (index * Math.PI * 2) / 5 + 0.12;
      for (const offset of [-0.055, 0.055]) {
        const spoke = box(
          'wheels',
          [0.246, 0.025, 0.026],
          [x + Math.cos(angle + offset) * 0.18, 0.51 + Math.sin(angle + offset) * 0.18, faceZ],
          0xbdc6cf,
          { roughness: 0.2, metalness: 0.93 },
        );
        spoke.rotation.z = angle + offset;
      }
      const lugAngle = angle + 0.1;
      mesh(
        'wheels',
        new THREE.CylinderGeometry(0.012, 0.012, 0.016, 8),
        [x + Math.cos(lugAngle) * 0.061, 0.51 + Math.sin(lugAngle) * 0.061, faceZ + side * 0.02],
        0xbec5ca,
        { rotation: [Math.PI / 2, 0, 0], roughness: 0.18, metalness: 1 },
      );
    }
    mesh(
      'wheels',
      new THREE.CylinderGeometry(0.087, 0.087, 0.033, 32),
      [x, 0.51, faceZ],
      0x56616d,
      { rotation: [Math.PI / 2, 0, 0], roughness: 0.24, metalness: 0.9 },
    );
    mesh(
      'wheels',
      new THREE.CylinderGeometry(0.039, 0.039, 0.036, 24),
      [x, 0.51, faceZ + side * 0.01],
      0xa9b7c3,
      { rotation: [Math.PI / 2, 0, 0], roughness: 0.2, metalness: 1 },
    );
    mesh(
      'brakes',
      new THREE.CylinderGeometry(0.248, 0.248, 0.025, 64),
      [x, 0.51, z - side * 0.034],
      0x879198,
      { rotation: [Math.PI / 2, 0, 0], roughness: 0.38, metalness: 0.88 },
    );
    mesh(
      'brakes',
      new THREE.CylinderGeometry(0.108, 0.108, 0.043, 24),
      [x, 0.51, z - side * 0.034],
      0x414a52,
      { rotation: [Math.PI / 2, 0, 0], roughness: 0.5, metalness: 0.7 },
    );
    box('brakes', [0.105, 0.225, 0.081], [x - 0.182, 0.585, z + side * 0.012], 0xbf6348, {
      roughness: 0.34,
      metalness: 0.35,
    });
    groups
      .get('wheels')
      .children.slice(wheelStart)
      .forEach((item) => {
        item.userData.meshOffset = new THREE.Vector3(0, 0, side * 0.75);
      });
    groups
      .get('brakes')
      .children.slice(brakeStart)
      .forEach((item) => {
        item.userData.meshOffset = new THREE.Vector3(0, 0, side * 0.38);
      });
  }

  group('wheels', [0, -0.08, 0]);
  group('brakes', [0, -0.05, 0]);
  group('chassis', [0, -0.14, 0]);
  group('body', [0, 1.25, 0]);
  group('doors', [0.1, 0.4, 1.5]);
  group('glass', [0, 1.65, 0.18]);
  group('seats', [0.1, 0.85, -0.2]);
  group('airbag', [-0.25, 1.05, 1.1]);
  group('steering', [-0.7, 0.3, -0.7]);
  group('engine', [-1.0, 0.45, 0.3]);
  group('motorElectric', [-0.8, -0.15, -0.7]);
  group('batteryHV', [0, -0.75, 0]);
  group('battery12v', [-0.85, 0.45, -0.85]);
  group('tank', [0.7, -0.2, -0.95]);
  group('exhaust', [0.35, -0.45, 0.85]);
  group('lights', [-0.7, 0.4, 0]);
  group('mirrors', [-0.1, 0.4, -1.05]);
  group('electronics', [-0.5, 0.9, 0]);
  group('vin', [-0.6, 0.6, 0.9]);

  if (kind === 'car') return { root, groups, visible };

  if (isMoto) {
    wheel(-1.05, 0);
    wheel(1.05, 0);
    rod('chassis', [-0.7, 1.2, 0], [0.65, 0.65, 0], 0.065, COLOR.shell);
    rod('chassis', [-0.7, 1.2, 0], [0.65, 1.05, 0], 0.065, COLOR.shell);
    rod('chassis', [0.65, 1.05, 0], [0.65, 0.65, 0], 0.065, COLOR.shell);
    rod('chassis', [0.65, 0.65, 0], [1.05, 0.51, 0], 0.05, COLOR.metal);
    rod('steering', [-1.05, 0.51, -0.1], [-0.72, 1.45, -0.1], 0.04, COLOR.metal);
    rod('steering', [-1.05, 0.51, 0.1], [-0.72, 1.45, 0.1], 0.04, COLOR.metal);
    rod('steering', [-0.72, 1.45, -0.42], [-0.72, 1.45, 0.42], 0.04, COLOR.dark);
    box('body', [0.68, 0.12, 0.48], [0.42, 1.09, 0], COLOR.shell);
    const tank = mesh('tank', new THREE.SphereGeometry(0.35, 20, 12), [-0.25, 1.2, 0], COLOR.green);
    tank.scale.set(1.15, 0.65, 0.7);
    box('seats', [0.7, 0.11, 0.4], [0.47, 1.2, 0], COLOR.dark);
    box('engine', [0.5, 0.4, 0.4], [-0.1, 0.71, 0], COLOR.metal);
    box('batteryHV', [0.65, 0.32, 0.35], [0.05, 0.73, 0], COLOR.green);
    box('motorElectric', [0.3, 0.27, 0.3], [0.7, 0.57, 0], COLOR.green);
    rod('exhaust', [-0.2, 0.6, 0.22], [0.9, 0.48, 0.28], 0.07, COLOR.metal);
    mesh('lights', new THREE.CylinderGeometry(0.13, 0.13, 0.08, 24), [-0.91, 1.24, 0], 0xd6e7e8, {
      rotation: [0, 0, Math.PI / 2],
    });
    box('lights', [0.09, 0.1, 0.21], [0.89, 1.07, 0], 0xc46d5d);
    [-1, 1].forEach((side) => {
      rod('mirrors', [-0.7, 1.45, side * 0.3], [-0.72, 1.68, side * 0.5], 0.015, COLOR.metal);
      box('mirrors', [0.14, 0.09, 0.03], [-0.72, 1.68, side * 0.5], COLOR.glass);
    });
    box('electronics', [0.12, 0.07, 0.22], [-0.7, 1.45, 0], COLOR.glass);
    box('battery12v', [0.2, 0.22, 0.16], [0.5, 0.93, 0], COLOR.dark);
    box('vin', [0.13, 0.06, 0.02], [-0.64, 1.2, 0.08], COLOR.orange);
  } else {
    for (const x of [-axle, axle]) {
      for (const z of [-1, 1]) wheel(x, z);
      rod('chassis', [x, 0.47, -0.87], [x, 0.47, 0.87], 0.065, COLOR.metal);
    }
    box('chassis', [length - 0.18, 0.12, 0.14], [0, 0.54, -0.64], COLOR.metal);
    box('chassis', [length - 0.18, 0.12, 0.14], [0, 0.54, 0.64], COLOR.metal);
    for (let x = front + 0.4; x < rear; x += 0.7)
      box('chassis', [0.09, 0.1, 1.37], [x, 0.54, 0], COLOR.metal);
    box('chassis', [length - 0.15, 0.065, width - 0.1], [0, 0.65, 0], COLOR.dark);

    if (kind === 'trailer') {
      box('body', [length, 0.2, width], [0, 0.93, 0], COLOR.shell);
      for (const side of [-1, 1])
        box('body', [length, 0.58, 0.07], [0, 1.28, (side * width) / 2], COLOR.shell, {
          opacity: 0.75,
        });
      box('body', [0.08, 0.6, width], [rear - 0.04, 1.28, 0], COLOR.shell);
      rod('chassis', [front, 0.7, -0.6], [front - 1.1, 0.7, 0], 0.055, COLOR.metal);
      rod('chassis', [front, 0.7, 0.6], [front - 1.1, 0.7, 0], 0.055, COLOR.metal);
    } else if (kind === 'bus') {
      box('body', [length, 0.55, width], [0, 1.03, 0], COLOR.shell, { opacity: 0.45 });
      box('body', [length, 0.1, width], [0, 2.6, 0], COLOR.shell);
      for (const side of [-1, 1]) {
        box('glass', [length - 0.22, 0.75, 0.035], [0, 2, side * 0.96], COLOR.glass, {
          opacity: 0.38,
        });
        for (let x = front + 0.13; x < rear; x += 0.8)
          box('body', [0.06, 1.9, 0.06], [x, 1.65, side * 0.91], COLOR.shell);
      }
      box('glass', [0.04, 1.05, width - 0.16], [front - 0.025, 2, 0], COLOR.glass, {
        opacity: 0.4,
      });
      box('doors', [0.8, 1.72, 0.055], [front + 0.6, 1.7, 0.98], COLOR.shell, { opacity: 0.7 });
    } else if (kind === 'truck') {
      box('body', [1.8, 0.6, width], [-1.97, 1.02, 0], COLOR.shell, { opacity: 0.5 });
      box('body', [1.8, 0.12, width], [-1.97, 2.3, 0], COLOR.shell);
      box('glass', [0.04, 0.86, width - 0.15], [front + 0.12, 1.8, 0], COLOR.glass, {
        opacity: 0.4,
      });
      for (const side of [-1, 1]) {
        box('doors', [1.15, 0.65, 0.06], [-1.9, 1.25, side * 0.97], COLOR.shell, { opacity: 0.65 });
        box('glass', [1.15, 0.64, 0.035], [-1.9, 1.9, side * 0.97], COLOR.glass, { opacity: 0.4 });
      }
      box('body', [3.8, 0.16, width], [0.9, 0.97, 0], COLOR.shell);
      for (const side of [-1, 1])
        box('body', [3.8, 0.55, 0.065], [0.9, 1.28, side * 0.96], COLOR.shell, { opacity: 0.62 });
    }

    if (kind !== 'trailer') {
      const rows =
        kind === 'bus' ? [-1.8, -0.8, 0.2, 1.2, 2.2] : kind === 'truck' ? [-1.8] : [-0.34, 0.72];
      rows.forEach((x) =>
        [-0.46, 0.46].forEach((z) => {
          box('seats', [0.48, 0.16, 0.56], [x, 0.95, z], COLOR.dark);
          box('seats', [0.12, 0.52, 0.54], [x + 0.22, 1.25, z], COLOR.dark, {
            rotation: [0, 0, -0.12],
          });
          box('seats', [0.13, 0.19, 0.32], [x + 0.25, 1.61, z], COLOR.dark);
          rod('seats', [x + 0.16, 1.5, z - 0.22], [x - 0.16, 1.02, z + 0.22], 0.012, 0x88978f);
        }),
      );
      const dashX = kind === 'truck' ? -2.35 : kind === 'bus' ? -2.55 : -0.94;
      box('electronics', [0.3, 0.24, 1.42], [dashX, 1.25, 0], COLOR.dark);
      box('electronics', [0.08, 0.18, 0.3], [dashX + 0.17, 1.4, 0], COLOR.glass);
      const steering = mesh(
        'steering',
        new THREE.TorusGeometry(0.19, 0.025, 10, 24),
        [dashX + 0.35, 1.38, 0.44],
        COLOR.metal,
        { rotation: [0, Math.PI / 2 - 0.3, 0], edges: false },
      );
      steering.userData.partId = 'steering';
      rod('steering', [dashX + 0.1, 1.22, 0.44], [dashX + 0.35, 1.38, 0.44], 0.04, COLOR.dark);
      const bag = mesh(
        'airbag',
        new THREE.SphereGeometry(0.12, 20, 12),
        [dashX + 0.4, 1.39, 0.44],
        0x2d343b,
        { roughness: 0.8, metalness: 0 },
      );
      bag.scale.x = 0.25;
      box('engine', [0.65, 0.46, 0.8], [front + 0.68, 0.86, -0.09], COLOR.metal);
      for (let index = 0; index < 5; index++)
        box('engine', [0.06, 0.12, 0.65], [front + 0.46 + index * 0.1, 1.13, -0.09], COLOR.dark);
      box('motorElectric', [0.45, 0.38, 0.5], [front + 1.05, 0.65, -0.22], COLOR.green);
      rod('motorElectric', [front + 1.03, 0.75, 0.05], [0, 0.56, 0.2], 0.025, COLOR.orange);
      box('batteryHV', [long ? 2.4 : 1.65, 0.19, 1.28], [0.35, 0.48, 0], COLOR.green);
      for (let x = -0.3; x <= 1; x += 0.23)
        box('batteryHV', [0.025, 0.012, 1.15], [x, 0.582, 0], 0xb9d3c2);
      box('tank', [0.62, 0.28, 0.8], [rear - 1.1, 0.62, -0.15], 0x636f77);
      rod('exhaust', [front + 0.7, 0.44, 0.51], [rear - 0.1, 0.44, 0.51], 0.045, COLOR.metal);
      box('exhaust', [0.48, 0.16, 0.24], [0.35, 0.44, 0.51], COLOR.metal);
      box('exhaust', [0.64, 0.19, 0.36], [rear - 0.7, 0.44, 0.51], COLOR.metal);
      box('battery12v', [0.31, 0.3, 0.34], [front + 0.7, 0.88, 0.63], COLOR.dark);
      [-0.09, 0.09].forEach((z) =>
        box(
          'battery12v',
          [0.045, 0.05, 0.045],
          [front + 0.7, 1.05, 0.63 + z],
          z > 0 ? COLOR.orange : COLOR.metal,
        ),
      );
      if (kind !== 'car')
        for (const side of [-1, 1]) {
          rod(
            'mirrors',
            [cabinX - 0.8, 1.45, side * 0.91],
            [cabinX - 0.9, 1.51, side * 1.1],
            0.025,
            COLOR.dark,
          );
          box('mirrors', [0.24, 0.15, 0.1], [cabinX - 0.85, 1.53, side * 1.13], COLOR.glass);
        }
    }
    if (kind !== 'car')
      for (const side of [-1, 1]) {
        box('lights', [0.055, 0.16, 0.44], [front - 0.03, 1, side * 0.63], 0xd6e4dc);
        box('lights', [0.055, 0.17, 0.34], [rear + 0.03, 1, side * 0.71], 0xba625b);
      }
    box('vin', [0.32, 0.1, 0.02], [front + 1.1, 0.89, width / 2 + 0.025], COLOR.orange);
  }
  root.updateMatrixWorld(true);
  return { root, groups, visible };
}

export default function VehicleScene({
  selectedPart,
  selectedSubsystem = null,
  onSelect,
  exploded = false,
  category = 'M1',
  powertrain = 'ICE',
}) {
  const hostRef = useRef(null);
  const calloutRef = useRef(null);
  const [isolated, setIsolated] = useState(false);
  const api = useRef(null);
  const latest = useRef({ selectedPart, selectedSubsystem, onSelect, exploded, isolated });
  latest.current = { selectedPart, selectedSubsystem, onSelect, exploded, isolated };
  const [failure, setFailure] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadProgress, setLoadProgress] = useState(null);
  const isReference = sceneKind(category) === 'car';
  const modelPowertrain = isReference ? 'reference' : powertrain;
  const selected = PARTS.find((part) => part.id === selectedPart);
  const available = visibleParts(category, powertrain);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    setReady(false);
    setFailure(false);
    setLoading(isReference);
    setLoadProgress(null);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      setFailure(true);
      return undefined;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0e131b, 0);
    const canvas = renderer.domElement;
    canvas.style.cssText =
      'display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px';
    canvas.setAttribute(
      'aria-label',
      'Veículo 3D interativo. Arraste para girar; use setas para girar, mais e menos para aproximar. Selecione componentes também pela árvore textual.',
    );
    canvas.tabIndex = 0;
    host.append(canvas);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xe4edff, 0x20262c, 1.05));
    const pmrem = new THREE.PMREMGenerator(renderer);
    const studio = new RoomEnvironment();
    const environment = pmrem.fromScene(studio, 0.025);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.7;
    studio.dispose();
    pmrem.dispose();
    const keyLight = new THREE.DirectionalLight(0xfff1e5, 3.1);
    keyLight.position.set(-5, 8, 5);
    keyLight.castShadow = true;
    const definition = renderDefinition({
      width: host.clientWidth,
      height: host.clientHeight,
      devicePixelRatio: window.devicePixelRatio,
      deviceMemory: navigator.deviceMemory,
      maxRenderbufferSize: renderer
        .getContext()
        .getParameter(renderer.getContext().MAX_RENDERBUFFER_SIZE),
    });
    keyLight.shadow.mapSize.set(definition.shadowSize, definition.shadowSize);
    Object.assign(keyLight.shadow.camera, {
      left: -5,
      right: 5,
      top: 5,
      bottom: -5,
      near: 0.1,
      far: 25,
    });
    keyLight.shadow.normalBias = 0.015;
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);
    scene.add(keyLight.target);
    const rim = new THREE.DirectionalLight(0xb3d7ff, 2);
    rim.position.set(4, 3, -4);
    scene.add(rim);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 150);
    const isLong = ['truck', 'bus', 'trailer'].includes(sceneKind(category));
    const distance = isLong ? 1.25 : 1;
    const initial = new THREE.Vector3(-4.7 * distance, 2.8 * distance, 4.7 * distance);
    camera.position.copy(initial);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 1, 0);
    controls.minDistance = 0.65;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2 + 0.06;
    controls.enablePan = true;
    controls.enableDamping = false;
    controls.update();
    let { root, groups } = createVehicle(category, powertrain);
    scene.add(root);

    const grid = new THREE.GridHelper(16, 32, 0x31414e, 0x263441);
    grid.position.y = 0.002;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.32 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.005;
    floor.receiveShadow = true;
    scene.add(floor);
    grid.material.transparent = true;
    grid.material.opacity = 0.13;
    scene.add(grid);
    let disposed = false;
    const render = () => {
      if (!disposed) {
        renderer.render(scene, camera);
        positionCallout();
      }
    };
    let previousExploded = false;
    let previousIsolation = false;
    let previousSelection = '';
    let cameraMode = 'perspective';
    function visibleBounds() {
      const box = new THREE.Box3();
      box.corners = [];
      root.updateMatrixWorld(true);
      root.traverse((item) => {
        if (!item.isMesh || !item.visible) return;
        let parent = item.parent;
        while (parent) {
          if (!parent.visible) return;
          parent = parent.parent;
        }
        if (!item.geometry.boundingBox) item.geometry.computeBoundingBox();
        const worldBox = item.geometry.boundingBox.clone().applyMatrix4(item.matrixWorld);
        box.union(worldBox);
        for (const x of [worldBox.min.x, worldBox.max.x])
          for (const y of [worldBox.min.y, worldBox.max.y])
            for (const z of [worldBox.min.z, worldBox.max.z])
              box.corners.push(new THREE.Vector3(x, y, z));
      });
      return box;
    }
    function fitCamera(mode = cameraMode) {
      const box = visibleBounds();
      if (box.isEmpty()) return;
      const target = box.getCenter(new THREE.Vector3());
      const direction =
        mode === 'top'
          ? new THREE.Vector3(0, 1, 0.001)
          : mode === 'side'
            ? new THREE.Vector3(0.001, 0.08, 1)
            : new THREE.Vector3(
                ...(latest.current.exploded ? EXPLOSION_VIEW.direction : [-1, 0.4, 1]),
              );
      direction.normalize();
      const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
      const up = direction.clone().cross(right).normalize();
      const top = latest.current.exploded ? 62 : 52,
        bottom = 60;
      const usableY = Math.max(0.45, 1 - (top + bottom) / Math.max(host.clientHeight, 1));
      const usableX = Math.max(0.5, 1 - 40 / Math.max(host.clientWidth, 1));
      const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      let required = 1;
      for (const corner of box.corners) {
        const point = corner.clone().sub(target);
        const depth = point.dot(direction);
        required = Math.max(
          required,
          depth + Math.abs(point.dot(right)) / (tangent * camera.aspect * usableX),
          depth + Math.abs(point.dot(up)) / (tangent * usableY),
        );
      }
      controls.target.copy(target);
      camera.position
        .copy(target)
        .addScaledVector(direction, required * (latest.current.exploded ? 1.08 : 1.05));
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      controls.update();
      floor.position.y = Math.min(-0.005, box.min.y - 0.06);
      grid.position.y = floor.position.y + 0.002;
      fitShadow(box);
    }
    function fitShadow(box) {
      // Keep the approved light direction while giving small isolated parts the
      // same shadow detail as the whole vehicle. Include their floor projections.
      const center = box.getCenter(new THREE.Vector3());
      const lightDirection = new THREE.Vector3(-5, 8, 5).normalize();
      const size = box.getSize(new THREE.Vector3()).length();
      keyLight.target.position.copy(center);
      keyLight.position.copy(center).addScaledVector(lightDirection, Math.max(10, size * 1.5));
      keyLight.target.updateMatrixWorld();
      keyLight.updateMatrixWorld();
      keyLight.shadow.updateMatrices(keyLight);
      const lightBounds = new THREE.Box3();
      const inverse = keyLight.shadow.camera.matrixWorldInverse;
      for (const corner of box.corners) {
        lightBounds.expandByPoint(corner.clone().applyMatrix4(inverse));
        const ground = corner.clone();
        ground.addScaledVector(lightDirection, -(corner.y - floor.position.y) / lightDirection.y);
        lightBounds.expandByPoint(ground.applyMatrix4(inverse));
      }
      const padding = Math.max(0.15, size * 0.035);
      Object.assign(keyLight.shadow.camera, {
        left: lightBounds.min.x - padding,
        right: lightBounds.max.x + padding,
        bottom: lightBounds.min.y - padding,
        top: lightBounds.max.y + padding,
        near: Math.max(0.1, -lightBounds.max.z - padding),
        far: Math.max(1, -lightBounds.min.z + padding),
      });
      keyLight.shadow.camera.updateProjectionMatrix();
    }
    function positionCallout() {
      const element = calloutRef.current;
      const subsystem = latest.current.selectedSubsystem;
      if (!element || !subsystem) {
        if (element) element.style.display = 'none';
        return;
      }
      const group = groups.get(subsystem.assemblyId || latest.current.selectedPart);
      let nearest = null,
        best = Infinity;
      const assembled = new THREE.Vector3(...(subsystem.anchor || [0, 1, 0]));
      group?.traverse((item) => {
        if (!item.isMesh || !item.visible) return;
        const center = item.userData.baseCenter || item.userData.basePosition;
        const distance = center.distanceToSquared(assembled);
        if (distance < best) {
          best = distance;
          nearest = item;
        }
      });
      if (!nearest) {
        element.style.display = 'none';
        return;
      }
      const point = assembled.clone();
      if (latest.current.exploded && nearest.userData.meshOffset)
        point.add(nearest.userData.meshOffset);
      point.project(camera);
      element.style.display = point.z > 1 ? 'none' : 'block';
      element.style.left =
        Math.max(12, Math.min(host.clientWidth - 12, (point.x * 0.5 + 0.5) * host.clientWidth)) +
        'px';
      element.style.top =
        Math.max(64, Math.min(host.clientHeight - 64, (-point.y * 0.5 + 0.5) * host.clientHeight)) +
        'px';
    }
    function sync(forceFit = false) {
      const poseChanged = previousExploded !== latest.current.exploded;
      const isolationChanged = previousIsolation !== latest.current.isolated;
      const selectionKey =
        latest.current.selectedSubsystem?.subsystemId || latest.current.selectedPart;
      const selectionChanged = previousSelection !== selectionKey;
      const selectedIds = new Set(
        latest.current.selectedSubsystem?.assemblyIds || [latest.current.selectedPart],
      );
      const cutaway =
        !latest.current.exploded &&
        [
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
        ].includes(latest.current.selectedPart);

      const highlighted = new Set();
      let highlightedMeshes = 0;
      groups.forEach((part, id) => {
        part.visible =
          part.userData.available !== false && (!latest.current.isolated || selectedIds.has(id));
        part.position.copy(latest.current.exploded ? part.userData.offset : new THREE.Vector3());
        part.traverse((item) => {
          if (!item.isMesh) return;
          item.visible = !((latest.current.exploded || cutaway) && item.userData.contextOccluder);
          item.position.copy(item.userData.basePosition);
          if (latest.current.exploded && item.userData.meshOffset)
            item.position.add(item.userData.meshOffset);
          const active = selectedIds.has(id);
          if (active && part.visible && item.visible) {
            highlighted.add(id);
            highlightedMeshes++;
          }
          const materials = Array.isArray(item.material) ? item.material : [item.material];
          materials.forEach((material, index) => {
            const original = item.userData.materialStates[index];
            material.color?.copy(original.color);
            if (active)
              material.color?.lerp(
                new THREE.Color(COLOR.orange),
                id === 'wheels' || id === 'glass' || item.userData.mechanicalExample ? 0.08 : 0.16,
              );
            material.emissive?.copy(active ? new THREE.Color(0x6c3215) : original.emissive);
            material.emissiveIntensity = active
              ? item.userData.mechanicalExample
                ? 0.04
                : 0.08
              : original.emissiveIntensity;
            const reveal = cutaway && ['body', 'doors', 'glass'].includes(id);
            const transparent = reveal || original.transparent;
            if (material.transparent !== transparent) {
              material.transparent = transparent;
              material.needsUpdate = true;
            }
            material.opacity = reveal ? Math.min(original.opacity, 0.1) : original.opacity;
            material.depthWrite = reveal ? false : original.depthWrite;
            item.castShadow = !reveal && id !== 'glass';
          });
        });
      });
      canvas.dataset.highlightedAssemblies = [...highlighted].join(',');
      canvas.dataset.highlightedMeshes = String(highlightedMeshes);
      canvas.dataset.subsystem = latest.current.selectedSubsystem?.subsystemId || '';
      canvas.dataset.availableAssemblies = [...groups]
        .filter(([, group]) => group.children.some((child) => child.isMesh))
        .map(([id]) => id)
        .join(',');
      root.updateMatrixWorld(true);
      if (
        forceFit ||
        poseChanged ||
        isolationChanged ||
        (latest.current.isolated && selectionChanged)
      )
        fitCamera();
      previousExploded = latest.current.exploded;
      previousIsolation = latest.current.isolated;
      previousSelection = selectionKey;
      render();
    }
    function resize() {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      const settings = renderDefinition({
        width,
        height,
        devicePixelRatio: window.devicePixelRatio,
        deviceMemory: navigator.deviceMemory,
        maxRenderbufferSize: renderer
          .getContext()
          .getParameter(renderer.getContext().MAX_RENDERBUFFER_SIZE),
      });
      renderer.setDrawingBufferSize(width, height, settings.pixelRatio);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      fitCamera();
      render();
    }
    controls.addEventListener('change', render);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener('resize', resize);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function hit(event) {
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      return raycaster
        .intersectObject(root, true)
        .find(
          (intersection) =>
            intersection.object.isMesh &&
            intersection.object.visible &&
            intersection.object.parent.visible &&
            intersection.object.material.opacity >= 0.2,
        )?.object.userData.partId;
    }
    let pointerStart = null;
    function down(event) {
      pointerStart = { x: event.clientX, y: event.clientY };
    }
    function up(event) {
      if (
        pointerStart &&
        Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 7
      ) {
        const id = hit(event);
        if (id) latest.current.onSelect?.(id);
      }
      pointerStart = null;
    }
    function move(event) {
      if (event.buttons) return;
      const id = hit(event);
      canvas.style.cursor = id ? 'pointer' : 'grab';
      setHovered(id || null);
    }
    function leave() {
      setHovered(null);
    }
    function view(mode) {
      if (mode === 'focus') {
        setIsolated((value) => !value);
        return;
      }
      cameraMode = mode;
      if (mode === 'perspective' && latest.current.isolated) setIsolated(false);
      fitCamera(mode);
      render();
    }
    function keyboard(event) {
      if (
        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Escape'].includes(
          event.key,
        )
      )
        return;
      event.preventDefault();
      if (event.key === 'Escape') {
        view('perspective');
        return;
      }
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      if (event.key === 'ArrowLeft') spherical.theta -= 0.12;
      if (event.key === 'ArrowRight') spherical.theta += 0.12;
      if (event.key === 'ArrowUp') spherical.phi = Math.max(0.1, spherical.phi - 0.12);
      if (event.key === 'ArrowDown') spherical.phi = Math.min(Math.PI / 2, spherical.phi + 0.12);
      if (event.key === '+' || event.key === '=')
        spherical.radius = Math.max(0.65, spherical.radius * 0.9);
      if (event.key === '-') spherical.radius = Math.min(50, spherical.radius * 1.1);
      camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target));
      controls.update();
      render();
    }
    function contextLost(event) {
      event.preventDefault();
      setFailure(true);
      setReady(false);
    }
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('keydown', keyboard);
    canvas.addEventListener('webglcontextlost', contextLost);
    api.current = { sync, view };
    sync();
    resize();
    if (isReference) {
      loadReferenceSUV((value) => {
        if (!disposed) setLoadProgress(value);
      }, renderer.capabilities.getMaxAnisotropy())
        .then((model) => {
          if (disposed) {
            disposeModel(model.root);
            return;
          }
          scene.remove(root);
          disposeModel(root);
          root = model.root;
          groups = model.groups;
          scene.add(root);
          setLoading(false);
          sync(true);
          resize();
          setReady(true);
        })
        .catch(() => {
          if (!disposed) {
            setLoading(false);
            setFailure(true);
            setReady(false);
          }
        });
    } else {
      setLoading(false);
      setReady(true);
    }
    return () => {
      disposed = true;
      api.current = null;
      observer.disconnect();
      window.removeEventListener('resize', resize);
      controls.removeEventListener('change', render);
      controls.dispose();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('keydown', keyboard);
      canvas.removeEventListener('webglcontextlost', contextLost);
      disposeModel(scene);
      keyLight.shadow.dispose();
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [category, modelPowertrain, attempt]);

  useEffect(() => {
    api.current?.sync();
  }, [selectedPart, selectedSubsystem, exploded, isolated, ready]);

  return (
    <div
      className="g3d"
      data-g3d-ready={ready && !failure ? 'true' : 'false'}
      data-model={isReference ? 'bmw-x5-g05' : 'schematic'}
      data-exploded={String(exploded)}
      data-isolated={String(isolated)}
      style={{ position: 'relative', width: '100%', minHeight: 440, height: '100%' }}
    >
      <div ref={hostRef} className="g3d-stage" style={{ position: 'absolute', inset: 0 }} />
      <div
        className="g3d-caption"
        style={{ position: 'absolute', top: 16, left: 18, pointerEvents: 'none' }}
      >
        <span>
          {isReference ? 'BMW X5 G05 · MODELO DE REFERÊNCIA' : 'MODELO ESQUEMÁTICO · '}
          {!isReference &&
            (sceneKind(category) === 'moto'
              ? 'MOTOCICLETA'
              : sceneKind(category) === 'trailer'
                ? 'REBOQUE'
                : sceneKind(category) === 'bus'
                  ? 'ÔNIBUS'
                  : sceneKind(category) === 'truck'
                    ? 'CAMINHÃO'
                    : 'VEÍCULO LEVE')}
        </span>
        <p>Selecione um conjunto para consultar sua rastreabilidade.</p>
      </div>
      {loading && (
        <div className="g3d-loading" role="status">
          <span className="g3d-loading-ring" />
          <strong>Carregando SUV de referência</strong>
          <span>
            {loadProgress === null ? 'Preparando malhas e materiais…' : loadProgress + '%'}
          </span>
        </div>
      )}
      {failure && (
        <div
          className="g3d-fallback"
          style={{ position: 'relative', padding: '80px 24px 70px', minHeight: 440 }}
        >
          <p role="status">
            Não foi possível carregar o modelo 3D. A seleção dos conjuntos e suas referências
            continua disponível.
          </p>
          <button className="g-button" onClick={() => setAttempt((x) => x + 1)}>
            Tentar carregar o modelo novamente
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {available.map((part) => (
              <button
                type="button"
                key={part.id}
                onClick={() => onSelect?.(part.id)}
                aria-pressed={selectedPart === part.id}
              >
                {part.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {!failure && !loading && (
        <div
          className="g3d-views"
          aria-label="Orientação da vista 3D"
          style={{ position: 'absolute', bottom: 44, right: 14, display: 'flex', gap: 5 }}
        >
          <button
            type="button"
            onClick={() => api.current?.view('perspective')}
            aria-label="Restaurar vista em perspectiva"
          >
            3/4
          </button>
          <button type="button" onClick={() => api.current?.view('side')}>
            Lateral
          </button>
          <button type="button" onClick={() => api.current?.view('top')}>
            Superior
          </button>
          <button
            type="button"
            onClick={() => api.current?.view('focus')}
            aria-pressed={isolated}
            aria-label={
              isolated ? 'Mostrar todos os conjuntos' : 'Isolar e focar o conjunto selecionado'
            }
          >
            {isolated ? 'Visão geral' : 'Focar conjunto'}
          </button>
        </div>
      )}
      {ready && selectedSubsystem && (
        <div
          ref={calloutRef}
          className="g3d-subsystem-callout"
          data-subsystem={selectedSubsystem.subsystemId}
          aria-hidden="true"
        >
          <span>{selectedSubsystem.label}</span>
        </div>
      )}
      {!failure && hovered && (
        <div
          className="g3d-hover"
          style={{ position: 'absolute', left: 18, bottom: 47, pointerEvents: 'none' }}
        >
          {PARTS.find((part) => part.id === hovered)?.label}
        </div>
      )}
      <div
        className="g3d-footer"
        style={{
          position: 'absolute',
          bottom: 12,
          left: 18,
          right: 18,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        <span>Arraste para girar · Role para aproximar</span>
        <span aria-live="polite">{selected ? selected.label : 'Escolha um componente'}</span>
      </div>
      <span className="sr-only">
        Representação de navegação sem escala ou dimensões de projeto. Componentes ilustrados não
        determinam obrigações legais.
      </span>
    </div>
  );
}
