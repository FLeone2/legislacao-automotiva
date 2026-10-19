// Procedural SUV used only for navigation. Each group carries a vehicleComponents id,
// so a 3D part, an illustration hotspot and a directory card open the same route.
// Geometry is generic and illustrative: it does not represent a real model or any
// dimension, limit or requirement.
import * as THREE from '../vendor/three/three.module.min.mjs';
import { OrbitControls } from '../vendor/three/OrbitControls.mjs';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.mjs';
import { RoundedBoxGeometry } from '../vendor/three/RoundedBoxGeometry.mjs';

const ACCENT = new THREE.Color(0xf47721);
const GHOST = new THREE.Color(0x9fb4c8);
const W = 1.84; // lower body width
const CW = 1.6; // greenhouse width
const WHEEL_Z = 0.79;
const AXLES = { front: 1.38, rear: -1.32 };
const TIRE_R = 0.36;
// Parts hidden by the shell when assembled; selecting one makes the shell translucent.
const INTERNAL = new Set([
  'bancos',
  'motor',
  'tanque',
  'freios',
  'chassi',
  'eletrica',
  'escapamento',
  'bateria',
]);
const SHELL = new Set(['carroceria', 'vidros', 'retrovisores']);

function materials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: 0xc3c8cf,
      metalness: 0.55,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.07,
    }),
    trim: std({ color: 0x1d2024, roughness: 0.62, metalness: 0.15 }),
    rubber: std({ color: 0x141517, roughness: 0.92 }),
    alloy: std({ color: 0xc4c9d0, metalness: 0.92, roughness: 0.22 }),
    steel: std({ color: 0x8c939c, metalness: 0.85, roughness: 0.34 }),
    darkSteel: std({ color: 0x4a4f56, metalness: 0.7, roughness: 0.45 }),
    chrome: std({ color: 0xe6e9ee, metalness: 1, roughness: 0.08 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x8fa9bd,
      metalness: 0.1,
      roughness: 0.04,
      transparent: true,
      opacity: 0.42,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
    }),
    lens: new THREE.MeshPhysicalMaterial({
      color: 0xeef5ff,
      roughness: 0.05,
      transparent: true,
      opacity: 0.55,
    }),
    drl: std({ color: 0xffffff, emissive: 0xdfeeff, emissiveIntensity: 1.6 }),
    tail: std({ color: 0x8e1016, emissive: 0x6a0508, emissiveIntensity: 0.9, roughness: 0.25 }),
    caliper: std({ color: 0xb3261e, roughness: 0.4, metalness: 0.3 }),
    seat: std({ color: 0x2d3035, roughness: 0.74 }),
    seatTrim: std({ color: 0x484c53, roughness: 0.7 }),
    engine: std({ color: 0x9aa1a9, metalness: 0.75, roughness: 0.38 }),
    engineCover: std({ color: 0x17191c, roughness: 0.45, metalness: 0.2 }),
    battery: std({ color: 0x33475c, metalness: 0.55, roughness: 0.42 }),
    hv: std({ color: 0xf47721, roughness: 0.5 }),
    tank: std({ color: 0x2c3036, roughness: 0.55, metalness: 0.25 }),
    screen: std({ color: 0x0b1118, emissive: 0x1b3550, emissiveIntensity: 0.8, roughness: 0.15 }),
    harness: std({ color: 0x2a2c30, roughness: 0.8 }),
    copper: std({ color: 0xb36b3c, metalness: 0.8, roughness: 0.35 }),
    radiator: std({ color: 0x3a3f46, metalness: 0.5, roughness: 0.6 }),
    spring: std({ color: 0xc8a43a, metalness: 0.6, roughness: 0.4 }),
    label: std({ color: 0xf2f2f2, roughness: 0.6 }),
  };
}

function plateTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 166;
  const g = c.getContext('2d');
  g.fillStyle = '#f7f7f7';
  g.fillRect(0, 0, 512, 166);
  g.fillStyle = '#123f9a';
  g.fillRect(0, 0, 512, 38);
  g.fillStyle = '#fff';
  g.font = 'bold 24px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('BRASIL', 256, 28);
  g.fillStyle = '#111';
  g.font = 'bold 92px Arial, sans-serif';
  g.fillText('ABC1D23', 256, 140);
  g.strokeStyle = '#222';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 506, 160);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  r.addColorStop(0, 'rgba(0,0,0,0.62)');
  r.addColorStop(0.55, 'rgba(0,0,0,0.26)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function extrude(shape, width, bevel = 0.05, thickness = 0.07) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width - thickness * 2,
    bevelEnabled: true,
    bevelThickness: thickness,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 28,
  });
  geometry.translate(0, 0, -(width - thickness * 2) / 2);
  return geometry;
}

function box(w, h, d, radius = 0.02, segments = 3) {
  return new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, w / 2, h / 2, d / 2));
}

// A slightly curved glazing panel spanning two outline points along the body width.
function glassPanel(a, b, halfWidth, inset = 0.04, offset = 0.058, curvature = 0.035) {
  const d = new THREE.Vector2().subVectors(b, a);
  const len = d.length();
  d.normalize();
  const n = new THREE.Vector2(d.y, -d.x);
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 12);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5; // along the outline
    const v = pos.getY(i) * 2; // across the width, -1..1
    const t = inset + u * (len - inset * 2);
    const bend = offset - curvature * v * v;
    pos.setXYZ(i, a.x + d.x * t + n.x * bend, a.y + d.y * t + n.y * bend, v * halfWidth);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function tube(points, radius, material, segments = 64) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 10, false), material);
}

function along(mesh, axis) {
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function place(mesh, x, y, z, explode) {
  mesh.position.set(x, y, z);
  if (explode) mesh.userData.explode = new THREE.Vector3(...explode);
  return mesh;
}

function buildBody(m) {
  const g = new THREE.Group();
  const arch = 0.44;
  const a = Math.asin(0.06 / arch);
  const lower = new THREE.Shape();
  lower.moveTo(-2.15, 0.42);
  lower.lineTo(AXLES.rear - arch * Math.cos(a), 0.42);
  lower.absarc(AXLES.rear, 0.36, arch, Math.PI - a, a, true);
  lower.lineTo(AXLES.front - arch * Math.cos(a), 0.42);
  lower.absarc(AXLES.front, 0.36, arch, Math.PI - a, a, true);
  lower.lineTo(2.2, 0.42);
  lower.quadraticCurveTo(2.31, 0.45, 2.31, 0.62);
  lower.lineTo(2.29, 0.82);
  lower.quadraticCurveTo(2.27, 0.94, 2.1, 0.97);
  lower.lineTo(1.1, 1.07);
  lower.lineTo(-1.95, 1.13);
  lower.quadraticCurveTo(-2.2, 1.12, -2.24, 1.0);
  lower.lineTo(-2.27, 0.6);
  lower.quadraticCurveTo(-2.27, 0.43, -2.15, 0.42);
  g.add(new THREE.Mesh(extrude(lower, W, 0.07, 0.12), m.paint));

  const cabin = new THREE.Shape();
  cabin.moveTo(1.12, 1.02);
  cabin.lineTo(0.28, 1.58);
  cabin.quadraticCurveTo(0.18, 1.645, 0.0, 1.65);
  cabin.lineTo(-1.72, 1.66);
  cabin.quadraticCurveTo(-1.9, 1.66, -1.95, 1.58);
  cabin.lineTo(-2.12, 1.12);
  cabin.lineTo(-2.1, 1.02);
  cabin.closePath();
  g.add(new THREE.Mesh(extrude(cabin, CW, 0.04), m.paint));

  for (const s of [-1, 1]) {
    // Pillars over the side glazing, door seams, handles and cladding.
    for (const [x, w, tilt] of [
      [-0.32, 0.09, 0],
      [-1.32, 0.08, 0.06],
    ]) {
      const pillar = place(
        new THREE.Mesh(box(w, 0.52, 0.02, 0.008), m.trim),
        x,
        1.36,
        s * (CW / 2 + 0.012),
      );
      pillar.rotation.z = tilt;
      g.add(pillar);
    }
    for (const x of [0.98, -0.3, -1.38])
      g.add(
        place(new THREE.Mesh(box(0.008, 0.56, 0.006, 0.002), m.trim), x, 0.78, s * (W / 2 + 0.003)),
      );
    for (const x of [0.12, -1.0])
      g.add(
        place(new THREE.Mesh(box(0.16, 0.035, 0.03, 0.012), m.chrome), x, 0.98, s * (W / 2 + 0.01)),
      );
    g.add(
      place(new THREE.Mesh(box(1.72, 0.1, 0.04, 0.02), m.trim), 0.03, 0.47, s * (W / 2 + 0.01)),
    );
    for (const x of [AXLES.front, AXLES.rear]) {
      const arc = Math.PI * 0.9;
      const flare = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.04, 10, 40, arc), m.trim);
      flare.rotation.z = (Math.PI - arc) / 2;
      g.add(place(flare, x, 0.36, s * (W / 2 - 0.03)));
    }
    g.add(place(new THREE.Mesh(box(1.9, 0.035, 0.05, 0.015), m.trim), -0.9, 1.69, s * 0.6));
  }
  g.add(place(new THREE.Mesh(box(0.06, 0.24, 1.06, 0.03), m.trim), 2.29, 0.7, 0));
  for (let i = 0; i < 4; i++)
    g.add(
      place(new THREE.Mesh(box(0.02, 0.012, 0.98, 0.004), m.darkSteel), 2.32, 0.6 + i * 0.065, 0),
    );
  g.add(place(new THREE.Mesh(box(0.08, 0.12, 1.5, 0.04), m.trim), 2.27, 0.47, 0));
  g.add(place(new THREE.Mesh(box(0.08, 0.13, 1.5, 0.04), m.trim), -2.25, 0.5, 0));
  return g;
}

function buildGlass(m) {
  const g = new THREE.Group();
  const V = (x, y) => new THREE.Vector2(x, y);
  g.add(
    place(
      new THREE.Mesh(glassPanel(V(1.12, 1.02), V(0.28, 1.58), CW / 2 - 0.08), m.glass),
      0,
      0,
      0,
      [0.4, 0.12, 0],
    ),
  );
  g.add(
    place(
      new THREE.Mesh(
        glassPanel(V(-1.95, 1.58), V(-2.12, 1.12), CW / 2 - 0.1, 0.03, 0.05, 0.02),
        m.glass,
      ),
      0,
      0,
      0,
      [-0.4, 0.12, 0],
    ),
  );
  const side = new THREE.Shape();
  side.moveTo(1.0, 1.12);
  side.lineTo(0.3, 1.55);
  side.quadraticCurveTo(0.2, 1.59, 0.1, 1.59);
  side.lineTo(-1.7, 1.6);
  side.quadraticCurveTo(-1.86, 1.6, -1.9, 1.54);
  side.lineTo(-2.04, 1.15);
  side.closePath();
  const geometry = new THREE.ShapeGeometry(side, 16);
  for (const s of [-1, 1]) {
    g.add(place(new THREE.Mesh(geometry, m.glass), 0, 0, s * (CW / 2 + 0.005), [0, 0, s * 0.42]));
  }
  const roof = new THREE.Mesh(box(1.2, 0.012, 1.0, 0.005), m.glass);
  g.add(place(roof, -0.7, 1.705, 0, [0, 0.3, 0]));
  return g;
}

function buildMirrors(m) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const housing = place(
      new THREE.Mesh(box(0.17, 0.12, 0.22, 0.045), m.paint),
      0.84,
      1.18,
      s * 1.02,
      [0, 0, s * 0.45],
    );
    const face = place(
      new THREE.Mesh(box(0.01, 0.09, 0.18, 0.004), m.chrome),
      0.755,
      1.18,
      s * 1.02,
      [0, 0, s * 0.45],
    );
    const stalk = place(new THREE.Mesh(box(0.1, 0.05, 0.12, 0.02), m.trim), 0.86, 1.13, s * 0.91, [
      0,
      0,
      s * 0.45,
    ]);
    g.add(housing, face, stalk);
  }
  g.add(place(new THREE.Mesh(box(0.04, 0.07, 0.24, 0.02), m.trim), 0.36, 1.5, 0, [0, -0.1, 0]));
  return g;
}

function buildLights(m) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const lamp = place(new THREE.Mesh(box(0.17, 0.1, 0.42, 0.035), m.lens), 2.2, 0.9, s * 0.6, [
      0.75,
      0.28,
      s * 0.1,
    ]);
    lamp.rotation.y = s * 0.28;
    const drl = place(new THREE.Mesh(box(0.03, 0.018, 0.38, 0.008), m.drl), 2.255, 0.875, s * 0.6, [
      0.75,
      0.28,
      s * 0.1,
    ]);
    drl.rotation.y = s * 0.28;
    const fog = along(
      new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 20), m.drl),
      'x',
    );
    place(fog, 2.3, 0.5, s * 0.66, [0.75, 0.05, 0]);
    const tail = place(new THREE.Mesh(box(0.1, 0.13, 0.32, 0.035), m.tail), -2.23, 1.0, s * 0.64, [
      -0.75,
      0.28,
      s * 0.1,
    ]);
    tail.rotation.y = -s * 0.3;
    g.add(lamp, drl, fog, tail);
  }
  g.add(place(new THREE.Mesh(box(0.04, 0.03, 0.4, 0.01), m.tail), -1.98, 1.64, 0, [-0.5, 0.9, 0]));
  return g;
}

function buildWheels(m) {
  const g = new THREE.Group();
  const profile = [];
  for (let i = 0; i <= 16; i++) {
    const t = (i / 16) * Math.PI;
    profile.push(new THREE.Vector2(TIRE_R - 0.035 + Math.sin(t) * 0.035, -0.12 + (i / 16) * 0.24));
  }
  profile.unshift(new THREE.Vector2(0.245, -0.11));
  profile.push(new THREE.Vector2(0.245, 0.11));
  const tireGeometry = new THREE.LatheGeometry(profile, 64);
  const barrel = new THREE.CylinderGeometry(0.245, 0.245, 0.2, 48, 1, true);
  const lip = new THREE.TorusGeometry(0.235, 0.014, 10, 48);
  const spokeGeometry = box(0.19, 0.045, 0.03, 0.012);
  const hub = new THREE.CylinderGeometry(0.06, 0.07, 0.04, 24);
  for (const x of [AXLES.front, AXLES.rear])
    for (const s of [-1, 1]) {
      const wheel = new THREE.Group();
      wheel.add(along(new THREE.Mesh(tireGeometry, m.rubber), 'z'));
      wheel.add(along(new THREE.Mesh(barrel, m.darkSteel), 'z'));
      wheel.add(place(new THREE.Mesh(lip, m.alloy), 0, 0, 0.095));
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(spokeGeometry, m.alloy);
        const angle = (i / 5) * Math.PI * 2;
        spoke.position.set(Math.cos(angle) * 0.13, Math.sin(angle) * 0.13, 0.09);
        spoke.rotation.z = angle;
        wheel.add(spoke);
      }
      wheel.add(place(along(new THREE.Mesh(hub, m.alloy), 'z'), 0, 0, 0.095));
      wheel.position.set(x, TIRE_R, s * WHEEL_Z);
      if (s < 0) wheel.rotation.y = Math.PI;
      wheel.userData.explode = new THREE.Vector3(0, 0, s * 0.8);
      g.add(wheel);
    }
  return g;
}

function buildBrakes(m) {
  const g = new THREE.Group();
  const disc = new THREE.CylinderGeometry(0.175, 0.175, 0.026, 40);
  const hat = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 24);
  for (const x of [AXLES.front, AXLES.rear])
    for (const s of [-1, 1]) {
      const corner = new THREE.Group();
      corner.add(along(new THREE.Mesh(disc, m.steel), 'z'));
      corner.add(along(new THREE.Mesh(hat, m.darkSteel), 'z'));
      const caliper = new THREE.Mesh(box(0.1, 0.15, 0.08, 0.025), m.caliper);
      caliper.position.set(-0.13, 0.08, 0.01);
      caliper.rotation.z = -0.55;
      corner.add(caliper);
      corner.position.set(x, TIRE_R, s * (WHEEL_Z - 0.03));
      corner.userData.explode = new THREE.Vector3(0, 0, s * 0.45);
      g.add(corner);
    }
  // Master cylinder, reservoir and ABS/ESC modulator in the engine bay.
  g.add(
    place(
      along(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 16), m.steel), 'x'),
      1.06,
      0.98,
      -0.42,
      [0.2, 0.65, 0],
    ),
  );
  g.add(
    place(new THREE.Mesh(box(0.1, 0.07, 0.1, 0.02), m.label), 1.06, 1.03, -0.42, [0.2, 0.65, 0]),
  );
  g.add(
    place(
      new THREE.Mesh(box(0.14, 0.12, 0.14, 0.02), m.darkSteel),
      1.15,
      0.88,
      0.5,
      [0.2, 0.65, 0],
    ),
  );
  return g;
}

function helix(x, z, height, radius, turns) {
  const points = [];
  for (let i = 0; i <= turns * 24; i++) {
    const t = i / 24;
    points.push([
      x + Math.cos(t * Math.PI * 2) * radius,
      0.42 + (t / turns) * height,
      z + Math.sin(t * Math.PI * 2) * radius,
    ]);
  }
  return points;
}

function buildChassis(m) {
  const g = new THREE.Group();
  for (const x of [AXLES.front, AXLES.rear])
    for (const s of [-1, 1]) {
      g.add(tube(helix(x, s * 0.6, 0.34, 0.06, 6), 0.011, m.spring, 160));
      g.add(
        place(
          new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 14), m.darkSteel),
          x,
          0.62,
          s * 0.6,
        ),
      );
      const arm = place(
        new THREE.Mesh(box(0.08, 0.04, 0.46, 0.015), m.darkSteel),
        x + 0.05,
        0.33,
        s * 0.44,
      );
      arm.rotation.y = s * 0.12;
      g.add(arm);
    }
  for (const s of [-1, 1])
    g.add(place(new THREE.Mesh(box(3.6, 0.07, 0.09, 0.02), m.darkSteel), 0.1, 0.42, s * 0.5));
  g.add(place(new THREE.Mesh(box(0.14, 0.07, 1.1, 0.02), m.darkSteel), AXLES.front, 0.36, 0));
  g.add(
    place(
      along(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 18), m.darkSteel), 'z'),
      AXLES.rear,
      0.36,
      0,
    ),
  );
  // Steering: rack, column and wheel on the left (Brazilian left-hand drive).
  g.add(
    place(
      along(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 16), m.steel), 'z'),
      AXLES.front - 0.16,
      0.44,
      0,
    ),
  );
  g.add(
    tube(
      [
        [AXLES.front - 0.16, 0.46, -0.38],
        [0.95, 0.75, -0.38],
        [0.62, 1.02, -0.38],
      ],
      0.022,
      m.steel,
      24,
    ),
  );
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 12, 40), m.trim);
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.z = 0.45;
  g.add(place(wheel, 0.58, 1.06, -0.38, [0, 0.7, 0]));
  const hub = along(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 20), m.trim), 'x');
  hub.rotation.y = 0.45;
  g.add(place(hub, 0.58, 1.06, -0.38, [0, 0.7, 0]));
  return g;
}

function buildEngine(m) {
  const g = new THREE.Group();
  g.add(place(new THREE.Mesh(box(0.5, 0.4, 0.6, 0.05), m.engine), 1.7, 0.72, 0.08));
  g.add(place(new THREE.Mesh(box(0.44, 0.08, 0.56, 0.03), m.engineCover), 1.7, 0.96, 0.08));
  for (let i = 0; i < 4; i++)
    g.add(
      place(
        new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 14), m.copper),
        1.7,
        1.01,
        -0.13 + i * 0.14,
      ),
    );
  for (let i = 0; i < 4; i++)
    g.add(
      tube(
        [
          [1.95, 0.8, -0.13 + i * 0.14],
          [2.04, 0.82, -0.13 + i * 0.14],
          [2.06, 0.9, 0.08],
        ],
        0.025,
        m.steel,
        16,
      ),
    );
  g.add(
    place(
      along(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.42, 28), m.engine), 'z'),
      1.64,
      0.6,
      -0.44,
    ),
  );
  g.add(place(new THREE.Mesh(box(0.04, 0.36, 0.9, 0.02), m.radiator), 2.12, 0.7, 0));
  for (const s of [-1, 1])
    g.add(
      place(
        along(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 12), m.steel), 'z'),
        AXLES.front,
        TIRE_R,
        s * 0.42,
      ),
    );
  return g;
}

function buildExhaust(m) {
  const g = new THREE.Group();
  g.add(
    tube(
      [
        [1.5, 0.6, 0.3],
        [1.42, 0.38, 0.34],
        [1.1, 0.25, 0.44],
        [0.2, 0.235, 0.56],
        [-0.6, 0.235, 0.6],
        [-1.4, 0.26, 0.6],
        [-1.85, 0.3, 0.42],
        [-2.22, 0.32, 0.42],
      ],
      0.032,
      m.steel,
      120,
    ),
  );
  const cat = along(
    new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 8, 20), m.darkSteel),
    'x',
  );
  g.add(place(cat, 0.72, 0.238, 0.5));
  g.add(place(new THREE.Mesh(box(0.46, 0.15, 0.3, 0.06), m.darkSteel), -1.72, 0.3, 0.42));
  g.add(
    place(
      along(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 20), m.chrome), 'x'),
      -2.27,
      0.32,
      0.42,
    ),
  );
  return g;
}

function buildTank(m) {
  const g = new THREE.Group();
  g.add(place(new THREE.Mesh(box(0.6, 0.22, 0.92, 0.07), m.tank), -1.0, 0.36, -0.02));
  g.add(
    tube(
      [
        [-1.15, 0.42, 0.42],
        [-1.4, 0.6, 0.72],
        [-1.6, 0.9, 0.9],
      ],
      0.03,
      m.harness,
      30,
    ),
  );
  const cap = along(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 24), m.paint), 'z');
  g.add(place(cap, -1.62, 0.92, W / 2 + 0.012, [0, 0, 0.35]));
  g.add(
    place(
      new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 18), m.trim),
      -1.62,
      0.48,
      -0.6,
    ),
  );
  return g;
}

function buildBattery(m) {
  const g = new THREE.Group();
  g.add(place(new THREE.Mesh(box(1.42, 0.1, 1.16, 0.035), m.battery), 0.1, 0.39, 0));
  for (let i = 0; i < 6; i++)
    g.add(
      place(new THREE.Mesh(box(0.012, 0.02, 1.06, 0.004), m.darkSteel), -0.5 + i * 0.24, 0.45, 0),
    );
  for (const z of [-0.08, 0.08])
    g.add(
      tube(
        [
          [0.8, 0.42, z],
          [1.2, 0.5, z],
          [1.45, 0.86, -0.3 + z],
        ],
        0.018,
        m.hv,
        40,
      ),
    );
  g.add(place(new THREE.Mesh(box(0.22, 0.1, 0.28, 0.02), m.battery), 1.5, 0.92, -0.32));
  g.add(
    place(
      along(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.22, 28), m.battery), 'z'),
      1.48,
      0.5,
      -0.14,
    ),
  );
  return g;
}

function buildElectrics(m) {
  const g = new THREE.Group();
  g.add(place(new THREE.Mesh(box(0.42, 0.22, 1.46, 0.07), m.trim), 0.8, 1.0, 0));
  g.add(place(new THREE.Mesh(box(0.02, 0.17, 0.3, 0.01), m.screen), 0.585, 1.16, 0.02));
  g.add(place(new THREE.Mesh(box(0.02, 0.1, 0.26, 0.01), m.screen), 0.62, 1.15, -0.38));
  g.add(place(new THREE.Mesh(box(0.22, 0.05, 0.16, 0.012), m.darkSteel), 1.9, 0.98, 0.58));
  const battery = place(new THREE.Mesh(box(0.2, 0.18, 0.27, 0.02), m.trim), 1.95, 0.87, -0.58);
  g.add(battery);
  g.add(
    place(
      new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 10), m.tail),
      1.95,
      0.975,
      -0.66,
    ),
  );
  g.add(
    tube(
      [
        [1.9, 0.98, 0.5],
        [1.4, 1.0, 0.55],
        [1.05, 1.0, 0.5],
        [0.9, 1.02, 0.3],
      ],
      0.016,
      m.harness,
      40,
    ),
  );
  g.add(
    tube(
      [
        [1.95, 0.9, -0.45],
        [1.6, 0.98, -0.6],
        [1.1, 0.98, -0.55],
      ],
      0.014,
      m.harness,
      30,
    ),
  );
  return g;
}

function buildSeats(m) {
  const g = new THREE.Group();
  const seat = (x, z, width, headrests) => {
    g.add(place(new THREE.Mesh(box(0.52, 0.12, width, 0.05), m.seat), x, 0.62, z));
    const back = place(new THREE.Mesh(box(0.13, 0.62, width, 0.05), m.seat), x - 0.27, 0.96, z);
    back.rotation.z = 0.18;
    g.add(back);
    for (const hz of headrests) {
      const head = place(
        new THREE.Mesh(box(0.1, 0.15, 0.25, 0.04), m.seatTrim),
        x - 0.34,
        1.34,
        z + hz,
      );
      head.rotation.z = 0.18;
      g.add(head);
    }
  };
  seat(0.05, -0.38, 0.5, [0]);
  seat(0.05, 0.38, 0.5, [0]);
  seat(-1.0, 0, 1.36, [-0.45, 0, 0.45]);
  return g;
}

function buildIdentification(m) {
  const g = new THREE.Group();
  const texture = plateTexture();
  const plate = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.45, metalness: 0.1 });
  const geometry = new THREE.PlaneGeometry(0.4, 0.13);
  const front = place(new THREE.Mesh(geometry, plate), 2.335, 0.6, 0, [1.05, 0, 0]);
  front.rotation.y = Math.PI / 2;
  const rear = place(new THREE.Mesh(geometry, plate), -2.305, 0.78, 0, [-1.05, 0, 0]);
  rear.rotation.y = -Math.PI / 2;
  g.add(front, rear);
  // VIN window marking and door-pillar label.
  const vin = place(
    new THREE.Mesh(box(0.1, 0.006, 0.07, 0.002), m.label),
    1.03,
    1.11,
    -0.6,
    [0, 1.3, -0.2],
  );
  const pillar = place(
    new THREE.Mesh(box(0.07, 0.05, 0.004, 0.001), m.label),
    -0.32,
    0.86,
    -(W / 2 + 0.006),
    [0, 1.25, -0.3],
  );
  g.add(vin, pillar);
  return g;
}

const BUILDERS = {
  carroceria: [buildBody, [0, 1.25, 0]],
  vidros: [buildGlass, [0, 1.8, 0]],
  retrovisores: [buildMirrors, [0, 1.25, 0]],
  iluminacao: [buildLights, [0, 0, 0]],
  'pneus-rodas': [buildWheels, [0, 0, 0]],
  freios: [buildBrakes, [0, 0, 0]],
  chassi: [buildChassis, [0, -0.18, 0]],
  motor: [buildEngine, [0.85, 0.35, 0]],
  escapamento: [buildExhaust, [0, -0.6, 0]],
  tanque: [buildTank, [-0.3, -0.48, 0]],
  bateria: [buildBattery, [0, -0.95, 0]],
  eletrica: [buildElectrics, [0, 0.85, 0]],
  bancos: [buildSeats, [0, 0.55, 0]],
  identificacao: [buildIdentification, [0, 0, 0]],
};

const VIEWS = {
  perspectiva: [1, 0.48, 1.18],
  lateral: [0.001, 0.12, 1],
  frente: [1, 0.22, 0.001],
  traseira: [-1, 0.3, 0.25],
  topo: [0.001, 1, 0.0001],
};

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createVehicleScene(canvas, options = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 8, 5);
  scene.add(key, new THREE.HemisphereLight(0xdfe8f5, 0x2a2622, 0.55));

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = true;
  controls.minDistance = 2.2;
  controls.maxDistance = 18;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.zoomToCursor = true;
  controls.rotateSpeed = 0.75;

  const m = materials();
  const model = new THREE.Group();
  scene.add(model);
  const groups = new Map();
  const pickable = [];
  for (const [id, [build, offset]] of Object.entries(BUILDERS)) {
    const group = build(m);
    group.userData = { id, explode: new THREE.Vector3(...offset) };
    group.traverse((object) => {
      object.userData.part = id;
      if (object.isMesh) {
        object.material = object.material.clone();
        const mat = object.material;
        mat.userData.base = {
          opacity: mat.opacity,
          transparent: mat.transparent,
          emissive: mat.emissive.clone(),
          emissiveIntensity: mat.emissiveIntensity,
        };
        pickable.push(object);
      }
      if (object !== group && object.userData.explode === undefined) object.userData.explode = null;
      object.userData.home = object.position.clone();
    });
    groups.set(id, group);
    model.add(group);
  }
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 3.4),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  scene.add(shadow);

  const state = { explode: 0, hovered: null, selected: null, xray: false, reveal: true };
  let explodeTween = null;
  let cameraTween = null;
  let needsRender = true;
  let frame = 0;

  function applyExplode(value) {
    state.explode = value;
    model.position.y = value * 0.95;
    for (const group of groups.values()) {
      group.position.copy(group.userData.explode).multiplyScalar(value);
      group.traverse((object) => {
        if (object === group || !object.userData.explode) return;
        object.position.copy(object.userData.home).addScaledVector(object.userData.explode, value);
      });
    }
    shadow.material.opacity = 1 - value * 0.55;
    shadow.scale.setScalar(1 + value * 0.35);
    needsRender = true;
  }

  function paint() {
    const internal = state.reveal && state.selected && INTERNAL.has(state.selected);
    for (const [id, group] of groups) {
      const hovered = id === state.hovered;
      const selected = id === state.selected;
      const ghost =
        !selected &&
        !hovered &&
        ((state.xray && state.selected) || (internal && SHELL.has(id) && state.explode < 0.65));
      group.traverse((object) => {
        if (!object.isMesh) return;
        const mat = object.material;
        const base = mat.userData.base;
        const transparent = ghost || base.transparent;
        if (mat.transparent !== transparent) mat.needsUpdate = true;
        mat.transparent = transparent;
        mat.opacity = ghost
          ? Math.min(base.opacity, 1) * (SHELL.has(id) && !state.xray ? 0.16 : 0.1)
          : base.opacity;
        mat.depthWrite = !ghost && !base.transparent;
        if (selected || hovered) {
          mat.emissive.copy(ACCENT);
          mat.emissiveIntensity = selected ? (hovered ? 0.62 : 0.48) : 0.3;
        } else if (ghost) {
          mat.emissive.copy(GHOST);
          mat.emissiveIntensity = 0.35;
        } else {
          mat.emissive.copy(base.emissive);
          mat.emissiveIntensity = base.emissiveIntensity;
        }
      });
    }
    needsRender = true;
  }

  function isGhost(id) {
    if (id === state.selected) return false;
    if (state.xray && state.selected) return true;
    return (
      state.reveal &&
      state.selected &&
      INTERNAL.has(state.selected) &&
      SHELL.has(id) &&
      state.explode < 0.65
    );
  }

  function boundsAt(explode, id) {
    const previous = state.explode;
    applyExplode(explode);
    model.updateMatrixWorld(true);
    const box3 = new THREE.Box3().setFromObject(id ? groups.get(id) : model);
    applyExplode(previous);
    return box3;
  }

  function flyTo(target, position, duration = 750) {
    if (reduced || !duration) {
      controls.target.copy(target);
      camera.position.copy(position);
      controls.update();
      cameraTween = null;
      needsRender = true;
      return;
    }
    cameraTween = {
      start: performance.now(),
      duration,
      fromTarget: controls.target.clone(),
      fromPosition: camera.position.clone(),
      target,
      position,
    };
  }

  // Smallest distance at which every corner of the box fits the viewport margins.
  function frameBox(box3, direction, duration, margin = 1.02) {
    const center = box3.getCenter(new THREE.Vector3());
    const d = direction.clone().normalize();
    const up = Math.abs(d.y) > 0.98 ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, d).normalize();
    const trueUp = new THREE.Vector3().crossVectors(d, right);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const tanH = tanV * camera.aspect;
    let distance = controls.minDistance;
    for (const x of [box3.min.x, box3.max.x])
      for (const y of [box3.min.y, box3.max.y])
        for (const z of [box3.min.z, box3.max.z]) {
          const c = new THREE.Vector3(x, y, z).sub(center);
          const toward = c.dot(d);
          distance = Math.max(
            distance,
            toward + Math.abs(c.dot(right)) / (tanH * margin),
            toward + Math.abs(c.dot(trueUp)) / (tanV * margin * 0.86),
          );
        }
    distance = Math.min(distance, controls.maxDistance);
    // Overlays sit at the top and bottom; nudge the subject slightly upwards on screen.
    const target = center.clone().addScaledVector(trueUp, -distance * tanV * 0.04);
    flyTo(target, target.clone().addScaledVector(d, distance), duration);
  }

  function currentDirection() {
    return camera.position.clone().sub(controls.target).normalize();
  }

  function setExplode(value, duration = 900) {
    value = THREE.MathUtils.clamp(value, 0, 1);
    if (reduced || !duration) {
      explodeTween = null;
      applyExplode(value);
      paint();
      return;
    }
    explodeTween = { start: performance.now(), duration, from: state.explode, to: value };
  }

  function view(name, duration) {
    const direction = new THREE.Vector3(...(VIEWS[name] || VIEWS.perspectiva));
    frameBox(boundsAt(explodeTween?.to ?? state.explode), direction, duration);
  }

  function select(id, { focus = true, duration, reveal = true } = {}) {
    state.selected = groups.has(id) ? id : null;
    state.reveal = reveal;
    paint();
    if (focus && state.selected) {
      const explode = explodeTween?.to ?? state.explode;
      const box3 = boundsAt(explode, state.selected);
      // Keep part of the vehicle around the selected system for orientation.
      const context = boundsAt(explode).getSize(new THREE.Vector3()).multiplyScalar(0.42);
      const size = box3.getSize(new THREE.Vector3()).max(context);
      frameBox(
        new THREE.Box3().setFromCenterAndSize(box3.getCenter(new THREE.Vector3()), size),
        currentDirection(),
        duration,
      );
    }
  }

  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(
      offset.length() * factor,
      controls.minDistance,
      controls.maxDistance,
    );
    flyTo(controls.target.clone(), controls.target.clone().add(offset.setLength(distance)), 280);
  }

  function orbit(dTheta, dPhi) {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += dTheta;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + dPhi, 0.05, controls.maxPolarAngle);
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    needsRender = true;
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickable, false);
    const hit = hits.find((h) => !isGhost(h.object.userData.part)) || hits[0];
    return hit?.object.userData.part || null;
  }

  function hover(id, event) {
    if (state.hovered !== id) {
      state.hovered = id;
      paint();
      canvas.style.cursor = id ? 'pointer' : '';
    }
    options.onHover?.(id, event);
  }

  let down = null;
  let lastPick = null;
  canvas.addEventListener('pointerdown', (event) => {
    down = { x: event.clientX, y: event.clientY };
    cameraTween = null;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.buttons) {
      if (state.hovered) hover(null, event);
      return;
    }
    hover(pick(event), event);
  });
  canvas.addEventListener('pointerleave', () => hover(null));
  // Double activation is detected here: the canvas may be re-parented between clicks.
  canvas.addEventListener('pointerup', (event) => {
    if (!down) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = null;
    if (moved > 6 || event.button !== 0) return;
    const id = pick(event);
    const now = performance.now();
    if (id && lastPick && lastPick.id === id && now - lastPick.time < 450) {
      lastPick = null;
      options.onOpen?.(id);
      return;
    }
    lastPick = id ? { id, time: now } : null;
    if (id) options.onPick?.(id);
  });
  controls.addEventListener('change', () => (needsRender = true));
  controls.addEventListener('start', () => {
    cameraTween = null;
    options.onInteract?.();
  });

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    if (
      canvas.width !== Math.round(width * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(height * renderer.getPixelRatio())
    ) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      needsRender = true;
    }
  }

  // Projected screen rectangle of a system, used to place its callout beside it.
  function screenOf(id) {
    const group = groups.get(id);
    if (!group) return null;
    const box3 = new THREE.Box3().setFromObject(group);
    const rect = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    let visible = false;
    for (const x of [box3.min.x, box3.max.x])
      for (const y of [box3.min.y, box3.max.y])
        for (const z of [box3.min.z, box3.max.z]) {
          const p = new THREE.Vector3(x, y, z).project(camera);
          if (p.z < 1) visible = true;
          const sx = (p.x * 0.5 + 0.5) * canvas.clientWidth;
          const sy = (-p.y * 0.5 + 0.5) * canvas.clientHeight;
          rect.left = Math.min(rect.left, sx);
          rect.right = Math.max(rect.right, sx);
          rect.top = Math.min(rect.top, sy);
          rect.bottom = Math.max(rect.bottom, sy);
        }
    return { ...rect, visible };
  }

  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (!canvas.isConnected) return;
    resize();
    if (explodeTween) {
      const t = Math.min(1, (now - explodeTween.start) / explodeTween.duration);
      applyExplode(explodeTween.from + (explodeTween.to - explodeTween.from) * ease(t));
      paint();
      options.onExplode?.(state.explode);
      if (t >= 1) explodeTween = null;
    }
    if (cameraTween) {
      const t = Math.min(1, (now - cameraTween.start) / cameraTween.duration);
      const k = ease(t);
      controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.target, k);
      camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.position, k);
      needsRender = true;
      if (t >= 1) cameraTween = null;
    }
    if (controls.update()) needsRender = true;
    if (needsRender) {
      renderer.render(scene, camera);
      needsRender = false;
      options.onFrame?.();
    }
  }

  applyExplode(0);
  paint();
  resize();
  view('perspectiva', 0);
  frame = requestAnimationFrame(tick);

  return {
    ids: [...groups.keys()],
    select,
    setExplode,
    get explode() {
      return explodeTween?.to ?? state.explode;
    },
    setXray(value) {
      state.xray = Boolean(value);
      paint();
    },
    get xray() {
      return state.xray;
    },
    highlight(id) {
      if (state.hovered === id) return;
      state.hovered = groups.has(id) ? id : null;
      paint();
    },
    view,
    zoom,
    orbit,
    reset() {
      view('perspectiva');
    },
    screenOf,
    invalidate() {
      needsRender = true;
    },
    dispose() {
      cancelAnimationFrame(frame);
      controls.dispose();
      renderer.dispose();
    },
  };
}
