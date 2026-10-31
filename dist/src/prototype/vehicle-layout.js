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

// These offsets express a restrained presentation disassembly, not a validated
// service procedure or exploded CAD. The actual GLB geometry is translated;
// its source position, node identity and axle/corner remain intact.
function assemblyOffset(group) {
  const center = middle(group.bounds);
  if (group.id.startsWith('wheel-')) return [0, 0, Math.sign(center[2]) * 0.58];
  if (group.id.startsWith('brake-')) return [0, -0.015, Math.sign(center[2]) * 0.24];
  if (group.id.startsWith('door-'))
    return [group.id.includes('-front-') ? -0.035 : 0.035, 0.035, Math.sign(center[2]) * 0.48];
  const offsets = {
    body: [0, 0.055, 0],
    hood: [-0.13, 0.48, 0],
    tailgate: [0.32, 0.12, 0],
    glazing: [0, 0.34, 0],
    cabin: [0, 0.22, 0],
    'front-axle': [-0.035, -0.28, 0],
    'rear-axle': [0.035, -0.28, 0],
    engine: [-0.43, 0.16, 0],
    cooling: [-0.38, 0.1, 0],
    motorElectric: [-0.14, 0.03, 0.4],
    batteryHV: [0, -0.42, 0],
    exhaust: [0, -0.28, 0.15],
    tank: [0.08, -0.32, -0.13],
    battery12v: [-0.12, 0.16, 0.23],
    electronics: [-0.04, 0.3, -0.25],
    brakeFluid: [0, 0.22, 0.12],
    steering: [0, 0.18, 0],
  };
  return offsets[group.id] || [Math.sign(center[0]) * 0.1, 0.12, Math.sign(center[2]) * 0.12];
}

function detailOffset(piece, assemblyBounds) {
  const center = middle(piece.bounds),
    parentCenter = middle(assemblyBounds),
    local = minus(center, parentCenter),
    name = `${piece.nodeId} ${piece.section}`;
  // Keep direction tied to where the piece is installed, rather than sending
  // every small object to a camera-facing grid. Specific covers open vertically.
  let offset = times(local, 0.7);
  if (piece.assemblyId === 'batteryHV') {
    offset = [local[0] * 0.4, local[1] * 0.6, local[2] * 0.55];
    if (/battery-cover|service-disconnect/.test(name)) offset[1] += 0.52;
    else if (/battery-module/.test(name)) offset[1] += 0.19;
    else if (/busbar|bms|junction/.test(name)) offset[1] += 0.32;
    else if (/cooling-plate/.test(name)) offset[1] += 0.08;
  } else if (piece.assemblyId === 'engine') {
    offset = [local[0] * 0.6, local[1] * 0.8, local[2] * 0.75];
    if (/cam-cover|ignition|oil-cap/.test(name)) offset[1] += 0.5;
    else if (/engine-head|camshafts/.test(name)) offset[1] += 0.25;
    else if (/piston/.test(name)) offset[1] += 0.15;
    else if (/sump/.test(name)) offset[1] -= 0.14;
    else if (/transmission|bellhousing/.test(name)) offset[0] += 0.2;
  } else if (piece.assemblyId === 'chassis') {
    const axleCenter = piece.nodeId.startsWith('rear-') ? 1.42 : -1.58;
    offset = [(center[0] - axleCenter) * 0.45, local[1] * 0.35, center[2] * 0.5];
    if (/spring|strut-mount/.test(name)) offset[1] += 0.16;
    if (/control-arm|subframe/.test(name)) offset[1] -= 0.1;
  } else if (piece.assemblyId === 'brakes') {
    const outward = Math.sign(center[2]);
    offset = /caliper/i.test(piece.sourceMesh || '')
      ? [-0.06, 0.08, outward * 0.22]
      : [0, 0, outward * (/cover/i.test(piece.sourceMesh || '') ? 0.03 : 0.1)];
  }
  return offset.map((value) => Math.max(-0.65, Math.min(0.65, value)));
}

function withOffsets(groups, offsetFor) {
  const offsets = new Map();
  const units = groups.map((group) => {
    const offset = offsetFor(group);
    group.nodeIds.forEach((id) => offsets.set(id, [...offset]));
    return {
      ...group,
      assemblyIds: [...group.assemblyIds],
      offset,
      targetBounds: {
        min: plus(group.bounds.min, offset),
        max: plus(group.bounds.max, offset),
      },
      // A fixed vehicle-side diagnostic; unlike the old packing rectangle this
      // is not used to place anything or to promise separation at every orbit.
      rect: {
        minX: group.bounds.min[0] + offset[0],
        maxX: group.bounds.max[0] + offset[0],
        minY: group.bounds.min[1] + offset[1],
        maxY: group.bounds.max[1] + offset[1],
      },
    };
  });
  return { units, offsets, coordinateFrame: 'vehicle' };
}

export function createExplosionPlan(
  pieces,
  { detailAssemblyId = '', nodeId = '', isolated = false } = {},
) {
  const eligible = pieces.filter(
    (piece) => !piece.contextOccluder && piece.section !== 'engineInternal',
  );
  const groups = groupRows(eligible.map((piece) => ({ ...piece, groupId: explosionGroup(piece) })));
  const overview = withOffsets(groups, assemblyOffset);
  let detail = overview;
  if (detailAssemblyId) {
    const assemblyRows = pieces.filter((piece) => piece.assemblyId === detailAssemblyId);
    const parentBounds = {
      min: [0, 1, 2].map((axis) =>
        Math.min(...assemblyRows.map((piece) => piece.bounds.min[axis])),
      ),
      max: [0, 1, 2].map((axis) =>
        Math.max(...assemblyRows.map((piece) => piece.bounds.max[axis])),
      ),
    };
    const detailedRows = pieces.filter(
      (piece) =>
        !piece.contextOccluder &&
        (!isolated ||
          (piece.assemblyId === detailAssemblyId && (!nodeId || piece.nodeId === nodeId))),
    );
    const detailGroups = groupRows(
      detailedRows.map((piece) => ({
        ...piece,
        groupId:
          piece.assemblyId === detailAssemblyId &&
          (!nodeId || piece.nodeId === nodeId) &&
          piece.assemblyId !== 'wheels'
            ? `detail-${piece.nodeId}`
            : explosionGroup(piece),
      })),
    );
    const byId = new Map(pieces.map((piece) => [piece.nodeId, piece]));
    const byGroup = new Map(overview.units.map((group) => [group.id, group]));
    detail = withOffsets(detailGroups, (group) => {
      const piece = byId.get(group.nodeIds[0]);
      const base =
        byGroup.get(explosionGroup(piece))?.offset ||
        assemblyOffset({ ...group, id: explosionGroup(piece) });
      return group.id.startsWith('detail-')
        ? plus(base, detailOffset(piece, parentBounds))
        : [...base];
    });
  }
  return { overview, detail, coordinateFrame: 'vehicle' };
}
