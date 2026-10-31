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
const plus = (a, b) => a.map((value, index) => value + b[index]);
const minus = (a, b) => a.map((value, index) => value - b[index]);
const times = (a, scale) => a.map((value) => value * scale);
const middle = (bounds) => bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2);

export function explosionPhases(amount) {
  return {
    assemblies: smooth(clamp01(amount) / 0.65),
    detail: smooth((clamp01(amount) - 0.65) / 0.35),
  };
}

/** Physical sets share one displacement in the vehicle's own coordinate frame.
 * X is longitudinal (front < 0), Y is height, Z is lateral (left > 0).
 * Camera, viewport and orbit never participate in placement. */
export function explosionGroup(piece) {
  const center = middle(piece.bounds);
  const name = `${piece.section} ${piece.sourceMesh || ''} ${piece.sourceFile || ''}`;
  if (piece.assemblyId === 'brakes') return `brake-${wheelCorner(center)}`;
  if (
    piece.assemblyId === 'wheels' ||
    (piece.assemblyId === 'body' &&
      /emblem/i.test(name) &&
      Math.abs(center[2]) > 0.8 &&
      center[1] < 0.8)
  )
    return `wheel-${wheelCorner(center)}`;
  if (piece.assemblyId === 'body' && /emblem/i.test(name) && Math.abs(center[2]) < 0.2) {
    if (center[0] < -2.2) return 'hood';
    if (center[0] > 2.2) return 'tailgate';
  }
  if (/Tailgate|RearWindow/i.test(name)) return 'tailgate';
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

function groupRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const id = row.groupId;
    if (!groups.has(id))
      groups.set(id, {
        id,
        nodeIds: [],
        assemblyIds: new Set(),
        bounds: { min: [...row.bounds.min], max: [...row.bounds.max] },
      });
    const group = groups.get(id);
    group.nodeIds.push(row.nodeId);
    group.assemblyIds.add(row.assemblyId);
    for (let axis = 0; axis < 3; axis++) {
      group.bounds.min[axis] = Math.min(group.bounds.min[axis], row.bounds.min[axis]);
      group.bounds.max[axis] = Math.max(group.bounds.max[axis], row.bounds.max[axis]);
    }
  }
  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// The first pose opens the real assemblies enough for inspection. The second
// continues along their vehicle axes, accounting for the actual GLB bounds.
// These are presentation displacements, not a validated service procedure.
function assemblyOffset(group, expanded = false) {
  const center = middle(group.bounds),
    side = Math.sign(center[2]) || 1;
  if (group.id.startsWith('wheel-')) return [0, 0, side * (expanded ? 0.72 : 0.58)];
  if (group.id.startsWith('brake-')) return [0, -0.015, side * (expanded ? 0.35 : 0.24)];
  if (group.id.startsWith('door-'))
    return [
      (group.id.includes('-front-') ? -1 : 1) * (expanded ? 0.24 : 0.15),
      0.035,
      side * (expanded ? 1.35 : 1.1),
    ];
  const compact = {
    body: [0, 0.055, 0],
    hood: [-0.1, 1.0, 0],
    tailgate: [0.52, 0.15, 0],
    glazing: [0, 0.34, 0],
    cabin: [0, 0.055, 0],
    'front-axle': [-0.035, -0.19, 0],
    'rear-axle': [0.035, -0.19, 0],
    engine: [-2.43, 0.1, 0],
    cooling: [-1.6, 0.1, -1.42],
    motorElectric: [-0.14, -0.1, -1.38],
    batteryHV: [0, -0.65, 0],
    exhaust: [0, -0.7, 0.55],
    tank: [1.2, -0.55, -1.33],
    battery12v: [-0.55, 0.18, 0.9],
    electronics: [-0.4, 0.3, -1.55],
    brakeFluid: [-1.3, -0.2, 1.1],
    steering: [0, 0.055, 0],
  };
  const full = {
    body: [0, 0.085, 0],
    hood: [0.12, 1.05, 0],
    tailgate: [0.92, 0.22, 0],
    glazing: [0, 0.6, 0],
    cabin: [0, 0.085, 0],
    'front-axle': [-0.035, -0.2, 0],
    'rear-axle': [0.035, -0.2, 0],
    engine: [-2.82, 0.16, 0],
    cooling: [-1.9, 0.1, -1.42],
    motorElectric: [-0.2, -0.15, -1.62],
    batteryHV: [0, -0.9, 0],
    exhaust: [0.1, -0.7, 0.68],
    tank: [1.28, -0.55, -1.33],
    battery12v: [-0.75, 0.25, 1.0],
    electronics: [-0.7, 0.35, -1.65],
    brakeFluid: [-1.5, -0.25, 1.2],
    steering: [0, 0.085, 0],
  };
  return (
    (expanded ? full : compact)[group.id] || [
      Math.sign(center[0]) * 0.12,
      expanded ? 0.2 : 0.12,
      side * (expanded ? 0.2 : 0.12),
    ]
  );
}

const translated = (bounds, offset) => ({
  min: plus(bounds.min, offset),
  max: plus(bounds.max, offset),
});
const unionBounds = (rows) => ({
  min: [0, 1, 2].map((axis) => Math.min(...rows.map((row) => row.min[axis]))),
  max: [0, 1, 2].map((axis) => Math.max(...rows.map((row) => row.max[axis]))),
});

// Major loose assemblies use explicit physical escape directions. Hollow body
// and cabin bounds are intentionally not treated as solid collision boxes.
function constrainMacro(groups, initial) {
  const offsets = new Map([...initial].map(([id, offset]) => [id, [...offset]]));
  const byId = new Map(groups.map((group) => [group.id, group]));
  function beyond(a, b, axis, sign, gap = 0.12) {
    if (!byId.has(a) || !byId.has(b)) return;
    const first = translated(byId.get(a).bounds, offsets.get(a));
    const second = translated(byId.get(b).bounds, offsets.get(b));
    const clearance =
      sign > 0 ? first.min[axis] - second.max[axis] : second.min[axis] - first.max[axis];
    if (clearance < gap) offsets.get(a)[axis] += sign * (gap - clearance);
  }
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? 1 : -1;
    for (const door of [`door-front-${side}`, `door-rear-${side}`])
      for (const wheel of [`wheel-front-${side}`, `wheel-rear-${side}`])
        beyond(door, wheel, 2, sign);
    beyond(`door-rear-${side}`, `door-front-${side}`, 0, 1);
    for (const axle of ['front', 'rear'])
      beyond(`wheel-${axle}-${side}`, `brake-${axle}-${side}`, 2, sign);
  }
  beyond('hood', 'engine', 1, 1, 0.16);
  // The bumper is a solid obstruction: extract the powertrain through the
  // front plane, without treating the hollow cabin as a solid body volume.
  beyond('engine', 'body', 0, -1, 0.14);
  beyond('cooling', 'body', 0, -1, 0.14);
  beyond('cooling', 'engine', 2, -1, 0.16);
  for (const axle of ['front-axle', 'rear-axle']) beyond('batteryHV', axle, 1, -1);
  beyond('tank', 'wheel-rear-right', 0, 1);
  beyond('tank', 'batteryHV', 2, -1);
  beyond('tank', 'body', 2, -1);
  beyond('exhaust', 'batteryHV', 2, 1);
  return offsets;
}

const DETAILED_ASSEMBLIES = new Set([
  'engine',
  'batteryHV',
  'chassis',
  'brakes',
  'motorElectric',
  'cooling',
  'battery12v',
  'electronics',
  'tank',
  'exhaust',
  'brakeFluid',
]);

function engineDetailOffsets(rows) {
  const offsets = new Map(rows.map((row) => [row.nodeId, [0, 0, 0]]));
  const byId = new Map(rows.map((row) => [row.nodeId, row]));
  const block = byId.get('engine-block');
  if (!block) return offsets;
  function tier(ids, lowerMax, gap) {
    const chosen = ids.map((id) => byId.get(id)).filter(Boolean);
    if (!chosen.length) return lowerMax;
    const shift = lowerMax + gap - Math.min(...chosen.map((row) => row.bounds.min[1]));
    for (const row of chosen) offsets.get(row.nodeId)[1] = shift;
    return Math.max(...chosen.map((row) => row.bounds.max[1] + shift));
  }
  const pistons = rows.filter((row) => /engine-piston-/.test(row.nodeId)).map((row) => row.nodeId);
  let top = tier(pistons, block.bounds.max[1], 0.11);
  top = tier(['engine-head'], top, 0.11);
  top = tier(['engine-camshafts'], top, 0.08);
  top = tier(['engine-cam-cover'], top, 0.08);
  tier(
    rows.filter((row) => /ignition|oil-cap/.test(row.nodeId)).map((row) => row.nodeId),
    top,
    0.08,
  );
  const sump = byId.get('engine-sump');
  if (sump) offsets.get(sump.nodeId)[1] = block.bounds.min[1] - 0.11 - sump.bounds.max[1];
  const crank = byId.get('engine-crankshaft');
  if (crank)
    offsets.set(crank.nodeId, [0, -0.05, block.bounds.min[2] - 0.11 - crank.bounds.max[2]]);
  for (const row of rows) {
    if (/engine-transmission|bellhousing/.test(row.nodeId))
      offsets.set(row.nodeId, [0.38, -0.03, 0]);
    else if (/timing-cover|accessory-drive|coolant-outlet/.test(row.nodeId))
      offsets.set(row.nodeId, [-0.3, 0, 0]);
    else if (/intake-manifold|throttle|oil-filter/.test(row.nodeId))
      offsets.set(row.nodeId, [0, 0, -0.36]);
    else if (/exhaust-manifold|exhaust-connection|alternator|dipstick/.test(row.nodeId))
      offsets.set(row.nodeId, [0, 0, 0.36]);
    else if (/engine-mounts/.test(row.nodeId)) offsets.set(row.nodeId, [0, -0.18, 0]);
  }
  return offsets;
}

function detailOffset(piece, assemblyBounds, engineOffsets) {
  if (piece.assemblyId === 'engine') return engineOffsets.get(piece.nodeId) || [0, 0, 0];
  const center = middle(piece.bounds),
    local = minus(center, middle(assemblyBounds));
  const name = `${piece.nodeId} ${piece.section}`;
  if (piece.assemblyId === 'batteryHV') {
    // Slide the lid forward under the bay before opening modules. This avoids
    // pushing an opaque lid upward through the vehicle's floor.
    if (/battery-cover|service-disconnect/.test(name)) return [-2.5, 0, 0];
    const offset = [local[0] * 0.4, 0, local[2] * 0.35];
    if (/battery-module/.test(name)) offset[1] = 0.19;
    else if (/busbar|bms|junction/.test(name)) offset[1] = 0.27;
    else if (/cooling-plate/.test(name)) offset[1] = 0.08;
    return offset;
  }
  if (piece.assemblyId === 'chassis') {
    const axleCenter = piece.nodeId.startsWith('rear-') ? 1.42 : -1.58;
    const offset = [(center[0] - axleCenter) * 0.35, local[1] * 0.25, center[2] * 0.42];
    if (/spring|strut-mount/.test(name)) offset[1] += 0.13;
    if (/control-arm|subframe/.test(name)) offset[1] -= 0.08;
    return offset;
  }
  if (piece.assemblyId === 'brakes') {
    if (/caliper/i.test(piece.sourceMesh || '')) return [-0.08, 0.35, 0];
    return [0, 0, Math.sign(center[2]) * (/cover/i.test(piece.sourceMesh || '') ? -0.04 : 0.08)];
  }
  return times(local, 0.45).map((value) => Math.max(-0.4, Math.min(0.4, value)));
}

function withOffsets(groups, offsetFor) {
  const offsets = new Map();
  const groupOffsets = new Map();
  const units = groups.map((group) => {
    const offset = offsetFor(group);
    group.nodeIds.forEach((id) => offsets.set(id, [...offset]));
    groupOffsets.set(group.id, [...offset]);
    return {
      ...group,
      assemblyIds: [...group.assemblyIds],
      offset,
      targetBounds: translated(group.bounds, offset),
      rect: {
        minX: group.bounds.min[0] + offset[0],
        maxX: group.bounds.max[0] + offset[0],
        minY: group.bounds.min[1] + offset[1],
        maxY: group.bounds.max[1] + offset[1],
      },
    };
  });
  return { units, offsets, groupOffsets, coordinateFrame: 'vehicle' };
}

export function blendExplosionOffsets(overview, expanded, detail, amount, phase = 'default') {
  const { assemblies, detail: spread } = explosionPhases(amount);
  const start = phase === 'battery-lid' ? 0.65 : phase === 'battery-parts' ? 0.9 : 0.78;
  const end = phase === 'battery-lid' ? 0.9 : 1;
  const parts = phase === 'none' ? 0 : smooth((clamp01(amount) - start) / (end - start));
  const a = point(overview),
    b = point(expanded),
    c = point(detail);
  return a.map(
    (value, axis) => value * assemblies + (b[axis] - value) * spread + (c[axis] - b[axis]) * parts,
  );
}

export function offsetForPiece(plan, nodeId, amount) {
  const groupId = plan.membership.get(nodeId);
  const overview = plan.overview.offsets.get(nodeId) ||
    plan.overview.groupOffsets.get(groupId) || [0, 0, 0];
  const expanded =
    plan.expanded.offsets.get(nodeId) || plan.expanded.groupOffsets.get(groupId) || overview;
  const detail = plan.detail.offsets.get(nodeId) || expanded;
  return blendExplosionOffsets(
    overview,
    expanded,
    detail,
    amount,
    plan.detailPhases.get(nodeId) || 'none',
  );
}

export function createExplosionPlan(
  pieces,
  { detailAssemblyId = '', nodeId = '', isolated = false } = {},
) {
  const eligible = pieces.filter(
    (piece) => !piece.contextOccluder && piece.section !== 'engineInternal',
  );
  const groups = groupRows(eligible.map((piece) => ({ ...piece, groupId: explosionGroup(piece) })));
  const overviewOffsets = constrainMacro(
    groups,
    new Map(groups.map((group) => [group.id, assemblyOffset(group)])),
  );
  const fullOffsets = constrainMacro(
    groups,
    new Map(groups.map((group) => [group.id, assemblyOffset(group, true)])),
  );
  const overview = withOffsets(groups, (group) => overviewOffsets.get(group.id));
  const membership = new Map(pieces.map((piece) => [piece.nodeId, explosionGroup(piece)]));
  const detailPhases = new Map();
  const chosen = DETAILED_ASSEMBLIES.has(detailAssemblyId)
    ? pieces.filter(
        (piece) => piece.assemblyId === detailAssemblyId && (!nodeId || piece.nodeId === nodeId),
      )
    : [];
  const parentRows = pieces.filter((piece) => piece.assemblyId === detailAssemblyId);
  const parentBounds = parentRows.length
    ? unionBounds(parentRows.map((piece) => piece.bounds))
    : { min: [0, 0, 0], max: [0, 0, 0] };
  const engineOffsets = engineDetailOffsets(parentRows);
  const local = new Map(
    chosen.map((piece) => [piece.nodeId, detailOffset(piece, parentBounds, engineOffsets)]),
  );
  for (const piece of chosen)
    detailPhases.set(
      piece.nodeId,
      piece.assemblyId === 'batteryHV'
        ? /battery-cover|service-disconnect/.test(piece.nodeId)
          ? 'battery-lid'
          : 'battery-parts'
        : 'default',
    );
  if (detailAssemblyId === 'engine' && chosen.length) {
    // Keep the hood above the original bay and behind the extracted engine;
    // its inner tiers open later, clear of both the hood and front bumper.
    const engineBounds = unionBounds(
      parentRows.map((piece) =>
        translated(
          piece.bounds,
          plus(fullOffsets.get('engine'), local.get(piece.nodeId) || [0, 0, 0]),
        ),
      ),
    );
    const hood = groups.find((group) => group.id === 'hood');
    if (hood)
      fullOffsets.get('hood')[0] = Math.max(
        fullOffsets.get('hood')[0],
        engineBounds.max[0] + 0.16 - hood.bounds.min[0],
      );
    const cooling = groups.find((group) => group.id === 'cooling');
    if (cooling)
      fullOffsets.get('cooling')[2] = Math.min(
        fullOffsets.get('cooling')[2],
        engineBounds.min[2] - 0.16 - cooling.bounds.max[2],
      );
  }
  const expanded = withOffsets(groups, (group) => fullOffsets.get(group.id));
  const detailRows = pieces.filter(
    (piece) =>
      !piece.contextOccluder &&
      (piece.section !== 'engineInternal' || detailAssemblyId === 'engine') &&
      (!isolated ||
        (piece.assemblyId === detailAssemblyId && (!nodeId || piece.nodeId === nodeId))),
  );
  const detailGroups = groupRows(
    detailRows.map((piece) => ({
      ...piece,
      groupId: local.has(piece.nodeId) ? `detail-${piece.nodeId}` : explosionGroup(piece),
    })),
  );
  const byId = new Map(pieces.map((piece) => [piece.nodeId, piece]));
  const detail = withOffsets(detailGroups, (group) => {
    const piece = byId.get(group.nodeIds[0]);
    const base = fullOffsets.get(explosionGroup(piece)) || [0, 0, 0];
    return plus(base, local.get(piece.nodeId) || [0, 0, 0]);
  });
  return { overview, expanded, detail, membership, detailPhases, coordinateFrame: 'vehicle' };
}
