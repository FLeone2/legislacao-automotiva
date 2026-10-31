// Visual names and presentation offsets, never legal applicability or CAD data.
const slug = (value) =>
  String(value || '')
    .replace(/[^a-z0-9_-]/gi, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
const point = (center) =>
  Array.isArray(center) ? center : [center?.x || 0, center?.y || 0, center?.z || 0];

export function wheelCorner(center) {
  const [x, , z] = point(center);
  return `${x < 0 ? 'front' : 'rear'}-${z > 0 ? 'left' : 'right'}`;
}

export function cornerLabel(center) {
  const [x, , z] = point(center);
  return `${x < 0 ? 'dianteiro' : 'traseiro'} ${z > 0 ? 'esquerdo' : 'direito'}`;
}

export function pieceDescriptor(extras, name, center, assemblyLabels = {}) {
  const source = extras.sourceMesh || name || '';
  const file = extras.sourceFile || '';
  const assemblyId = /SteeringWheel/i.test(source)
    ? 'steering'
    : /LicensePlates/i.test(file)
      ? 'vin'
      : extras.partId || 'body';
  if (extras.pieceId)
    return {
      nodeId: String(extras.pieceId),
      pieceId: String(extras.pieceId),
      assemblyId,
      parentAssemblyId: extras.parentAssemblyId || assemblyId,
      section: extras.section || assemblyId,
      label: extras.pieceLabel || assemblyLabels[assemblyId] || name,
      semanticPath:
        extras.semanticPath || `${assemblyId}/${extras.section || assemblyId}/${extras.pieceId}`,
    };
  const corner = cornerLabel(center);
  const position = wheelCorner(center);
  let section = assemblyId,
    label = assemblyLabels[assemblyId] || 'Peça do veículo';
  if (/Wheel_Tire/i.test(source)) {
    section = 'roadWheel';
    label = `Pneu ${corner}`;
  } else if (/Wheel_Rim/i.test(source)) {
    section = 'roadWheel';
    label = `Roda ${corner.replace('dianteiro', 'dianteira').replace('traseiro', 'traseira')}`;
  } else if (/Wheel_Connecter/i.test(source)) {
    section = 'roadWheel';
    label = `Cubo ${corner}`;
  } else if (/Wheel_Screws/i.test(source)) {
    section = 'roadWheel';
    label = `Fixação da roda ${corner}`;
  } else if (/Brake_Disk/i.test(source)) {
    section = 'wheelBrake';
    label = `Disco de freio ${corner}`;
  } else if (/Brake_Caliper/i.test(source)) {
    section = 'wheelBrake';
    label = `Pinça de freio ${corner}`;
  } else if (/Brake_Cover/i.test(source)) {
    section = 'wheelBrake';
    label = `Proteção do freio ${corner}`;
  } else if (/hood/i.test(source + file)) {
    section = 'hood';
    label = 'Capô';
  } else if (/SteeringWheel/i.test(source)) {
    section = 'steeringWheel';
    label = 'Volante e comandos';
  } else if (/Dashboard/i.test(source + file)) {
    section = 'dashboard';
    label = 'Painel de instrumentos';
  } else if (/Headlight/i.test(source + file)) {
    section = 'frontLighting';
    label = 'Conjunto do farol';
  } else if (/Taillight|RearLight/i.test(source + file)) {
    section = 'rearLighting';
    label = 'Conjunto da lanterna traseira';
  } else if (/SideMirror/i.test(source + file)) {
    section = 'mirror';
    label = `Retrovisor ${point(center)[2] > 0 ? 'esquerdo' : 'direito'}`;
  } else if (/Doors_F|Door_F/i.test(source + file)) {
    section = 'frontDoor';
    label = `Porta dianteira ${point(center)[2] > 0 ? 'esquerda' : 'direita'}`;
  } else if (/Doors_B|Door_B/i.test(source + file)) {
    section = 'rearDoor';
    label = `Porta traseira ${point(center)[2] > 0 ? 'esquerda' : 'direita'}`;
  } else if (/FrontSeat/i.test(source + file)) {
    section = 'frontSeat';
    label = `Banco dianteiro ${point(center)[2] > 0 ? 'esquerdo' : 'direito'}`;
  } else if (/RearSeat/i.test(source + file)) {
    section = 'rearSeat';
    label = 'Banco traseiro';
  } else if (/LicensePlate/i.test(source + file)) {
    section = 'identification';
    label = point(center)[0] < 0 ? 'Identificação dianteira' : 'Identificação traseira';
  } else if (assemblyId === 'glass') {
    section = 'glazing';
    label = 'Vidro do veículo';
  }
  const identity = extras.sourceRcaId
    ? slug(extras.sourceRcaId).slice(0, 12)
    : slug(extras.sourceInstance || source || name);
  return {
    nodeId: `reference-${assemblyId}-${identity}`,
    pieceId: `reference-${assemblyId}-${identity}`,
    assemblyId,
    parentAssemblyId: assemblyId,
    section,
    label,
    semanticPath: `${assemblyId}/${section}/${identity}`,
    ...(section === 'roadWheel' || section === 'wheelBrake' ? { corner: position } : {}),
  };
}

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const smooth = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const plus = (a, b) => a.map((value, index) => value + b[index]);
const minus = (a, b) => a.map((value, index) => value - b[index]);
const times = (a, scale) => a.map((value) => value * scale);
const normalized = (a) => times(a, 1 / (Math.hypot(...a) || 1));
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const middle = (bounds) => bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2);
const corners = (bounds) =>
  [bounds.min[0], bounds.max[0]].flatMap((x) =>
    [bounds.min[1], bounds.max[1]].flatMap((y) =>
      [bounds.min[2], bounds.max[2]].map((z) => [x, y, z]),
    ),
  );

export function explosionPhases(amount) {
  return {
    assemblies: smooth(clamp01(amount) / 0.65),
    detail: smooth((clamp01(amount) - 0.65) / 0.35),
  };
}

/** Display groups keep real physical sets together; they never change part IDs. */
export function explosionGroup(piece) {
  const center = middle(piece.bounds);
  const name = `${piece.section} ${piece.sourceMesh || ''} ${piece.sourceFile || ''}`;
  const corner = wheelCorner(center);
  if (
    piece.assemblyId === 'wheels' ||
    piece.assemblyId === 'brakes' ||
    (piece.assemblyId === 'body' &&
      /emblem/i.test(name) &&
      Math.abs(center[2]) > 0.8 &&
      center[1] < 0.8)
  )
    return `wheel-${corner}`;
  if (/Doors_[FB]|Door_[FB]|frontDoor|rearDoor/i.test(name) || piece.assemblyId === 'mirrors') {
    const front = /Doors_F|Door_F|frontDoor/i.test(name) || piece.assemblyId === 'mirrors';
    return `door-${front ? 'front' : 'rear'}-${center[2] >= 0 ? 'left' : 'right'}`;
  }
  if (piece.assemblyId === 'body' && /hood|cap[oô]/i.test(name)) return 'hood';
  if (['body', 'lights', 'vin'].includes(piece.assemblyId)) return 'body';
  if (piece.assemblyId === 'glass') return 'glazing';
  if (
    piece.assemblyId === 'seats' ||
    piece.assemblyId === 'airbag' ||
    /steeringWheel|Dashboard|Interior_/i.test(name)
  )
    return 'cabin';
  if (piece.assemblyId === 'chassis' || /steeringRack|tie.?rod/i.test(name))
    return /rearSuspension|rear-/i.test(name) ? 'rear-axle' : 'front-axle';
  return piece.assemblyId;
}

export function rectanglesOverlap(a, b, gap = 0) {
  return (
    a.maxX + gap > b.minX && b.maxX + gap > a.minX && a.maxY + gap > b.minY && b.maxY + gap > a.minY
  );
}

function unitAnchor(unit, basis, aspect, detail) {
  const portrait = aspect < 1;
  const center = middle(unit.bounds);
  let anchor;
  if (detail) {
    anchor = [dot(center, basis.right) * 2.4, dot(center, basis.up) * 2.4];
    if (/battery-cover|cam-cover/.test(unit.id)) anchor[1] += 1.7;
  } else {
    const anchors = {
      body: [0, 2.6],
      hood: [-3.8, 4.5],
      glazing: [0.5, 5.2],
      cabin: [0.15, 0.35],
      'door-front-left': [3.8, 1.8],
      'door-rear-left': [3.8, -0.1],
      'door-front-right': [-3.8, 1.8],
      'door-rear-right': [-3.8, -0.1],
      'front-axle': [-1.4, -1.45],
      'rear-axle': [1.4, -1.45],
      engine: [-5.7, 1.2],
      cooling: [-5.7, -1],
      exhaust: [-5.7, -3.2],
      batteryHV: [5.7, -2.4],
      motorElectric: [5.7, 0],
      tank: [0.5, -4],
      battery12v: [5.8, 2.8],
      electronics: [5.8, 4],
      brakeFluid: [-5.8, 3.4],
      steering: [0.5, 0.4],
    };
    anchor = anchors[unit.id] || [dot(center, basis.right) * 2, dot(center, basis.up) * 2];
    if (unit.id.startsWith('wheel-'))
      anchor = [dot(center, basis.right) * 2.25, dot(center, basis.up) * 2.25 - 2.4];
  }
  return [anchor[0] * (portrait ? 0.25 : 1.15), anchor[1] * (portrait ? 1.12 : 0.78)];
}

/** Deterministic box packing in the chosen camera plane, with real mesh extents. */
function packUnits(rows, { direction, aspect, detail = false }) {
  const forward = normalized(direction);
  const right = normalized(cross([0, 1, 0], forward));
  const up = normalized(cross(forward, right));
  const basis = { forward, right, up };
  const byId = new Map();
  for (const row of rows) {
    const id = row.groupId;
    if (!byId.has(id))
      byId.set(id, {
        id,
        nodeIds: [],
        assemblyIds: new Set(),
        bounds: { min: [...row.bounds.min], max: [...row.bounds.max] },
      });
    const unit = byId.get(id);
    unit.nodeIds.push(row.nodeId);
    unit.assemblyIds.add(row.assemblyId);
    for (let axis = 0; axis < 3; axis++) {
      unit.bounds.min[axis] = Math.min(unit.bounds.min[axis], row.bounds.min[axis]);
      unit.bounds.max[axis] = Math.max(unit.bounds.max[axis], row.bounds.max[axis]);
    }
  }
  const priority = (unit) =>
    unit.id === 'body'
      ? 0
      : unit.id === 'glazing'
        ? 1
        : unit.id === 'cabin'
          ? 2
          : unit.id === 'hood'
            ? 3
            : 4;
  const units = [...byId.values()].sort(
    (a, b) => priority(a) - priority(b) || a.id.localeCompare(b.id),
  );
  const packed = [],
    offsets = new Map();
  const gap = detail ? 0.2 : 0.34;
  for (const unit of units) {
    const center = middle(unit.bounds);
    const local = corners(unit.bounds).map((corner) => minus(corner, center));
    const radiusX = Math.max(0.12, ...local.map((p) => Math.abs(dot(p, right))));
    const radiusY = Math.max(0.11, ...local.map((p) => Math.abs(dot(p, up))));
    // Inflate the silhouette for perspective, rather than relying on centers or
    // world-axis distances which let large suspension and cabin parts intersect.
    const halfWidth = radiusX * 1.18 + 0.06,
      halfHeight = radiusY * 1.18 + 0.06;
    const desired = unitAnchor(unit, basis, aspect, detail);
    // A phone needs a tall workbench. Horizontal anchors alone are insufficient:
    // collision repair must also stay within that narrower silhouette.
    const portraitLimit = aspect < 1 ? Math.max(3.6, halfWidth + 0.01) : Infinity;
    const xs = aspect < 1 ? [desired[0], 0] : [desired[0]],
      ys = [desired[1]];
    if (Number.isFinite(portraitLimit))
      xs.push(-portraitLimit + halfWidth, portraitLimit - halfWidth);
    for (const other of packed) {
      xs.push(other.rect.minX - gap - halfWidth, other.rect.maxX + gap + halfWidth);
      ys.push(other.rect.minY - gap - halfHeight, other.rect.maxY + gap + halfHeight);
    }
    let winner = null;
    for (const x of xs)
      for (const y of ys) {
        const rect = {
          minX: x - halfWidth,
          maxX: x + halfWidth,
          minY: y - halfHeight,
          maxY: y + halfHeight,
        };
        if (rect.minX < -portraitLimit - 1e-8 || rect.maxX > portraitLimit + 1e-8) continue;
        if (packed.some((other) => rectanglesOverlap(rect, other.rect, gap - 1e-8))) continue;
        const dx = (x - desired[0]) / Math.max(0.6, aspect),
          dy = y - desired[1];
        const score = dx * dx + dy * dy + 0.004 * (x * x + y * y);
        if (!winner || score < winner.score - 1e-10) winner = { x, y, rect, score };
      }
    if (!winner) throw new Error(`No non-overlapping display position for ${unit.id}`);
    const target = plus(times(right, winner.x), times(up, winner.y));
    const offset = minus(target, center);
    unit.nodeIds.forEach((id) => offsets.set(id, [...offset]));
    packed.push({
      id: unit.id,
      nodeIds: unit.nodeIds,
      assemblyIds: [...unit.assemblyIds],
      rect: winner.rect,
      offset,
      bounds: unit.bounds,
    });
  }
  return { units: packed, offsets, basis, gap };
}

export function createExplosionPlan(
  pieces,
  {
    direction = [-1, 0.78, 1.35],
    aspect = 1.5,
    detailAssemblyId = '',
    nodeId = '',
    isolated = false,
  } = {},
) {
  const eligible = pieces.filter(
    (piece) => !piece.contextOccluder && piece.section !== 'engineInternal',
  );
  const overview = packUnits(
    eligible.map((piece) => ({ ...piece, groupId: explosionGroup(piece) })),
    { direction, aspect },
  );
  let detail = overview;
  if (detailAssemblyId) {
    const detailedRows = pieces.filter(
      (piece) =>
        !piece.contextOccluder &&
        (!isolated ||
          (piece.assemblyId === detailAssemblyId && (!nodeId || piece.nodeId === nodeId))),
    );
    detail = packUnits(
      detailedRows.map((piece) => {
        const chosen =
          piece.assemblyId === detailAssemblyId && (!nodeId || piece.nodeId === nodeId);
        const coherentWheel = chosen && ['wheels', 'brakes'].includes(piece.assemblyId);
        return {
          ...piece,
          groupId: chosen && !coherentWheel ? `detail-${piece.nodeId}` : explosionGroup(piece),
        };
      }),
      { direction, aspect, detail: isolated },
    );
  }
  return { overview, detail };
}
