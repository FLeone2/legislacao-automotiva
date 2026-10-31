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

export function explosionOffset({
  assemblyId,
  section = '',
  nodeId = '',
  sourceMesh = '',
  sourceFile = '',
  center,
}) {
  const [x, y, z] = point(center);
  const side = z >= 0 ? 1 : -1;
  const axle = x < -0.45 ? -0.18 : x > 0.45 ? 0.18 : 0;
  const name = `${section} ${nodeId} ${sourceMesh} ${sourceFile}`;
  switch (assemblyId) {
    case 'body':
      if (/emblem/i.test(name) && Math.abs(z) > 0.8 && y < 0.8) return [axle, 0.02, side * 1.38];
      if (/hood|cap[oô]/i.test(name)) return [-0.7, 1.65, -0.15];
      return [0.2, 1.1, -0.25];
    case 'doors':
      return [0.05, 0.15, side * 1.12];
    case 'glass':
      return [/rear|traseir/i.test(name) ? 0.4 : -0.2, 1.95, side * 0.3];
    case 'wheels':
      return [axle, 0.02, side * 1.38];
    case 'brakes':
      return [axle - 0.08, 0.08, side * 0.65];
    case 'chassis':
      if (/spring/i.test(name)) return [axle, 0.23, side * 0.23];
      if (/damper|shock/i.test(name)) return [axle - 0.13, 0, side * 0.15];
      return [axle, -0.05, 0.18];
    case 'steering':
      return /steeringRack|cremalheira|tie-rod/i.test(name)
        ? [-0.2, -0.1, 0.65]
        : [-0.5, 0.85, 0.95];
    case 'seats':
      return [0.05, 0.95, 1.05];
    case 'airbag':
      return [-0.2, 1.2, 1.3];
    case 'engine':
      if (/cam-cover|head-cover/i.test(name)) return [-1.05, 0.64, 0.1];
      if (/engineInternal|piston|crankshaft/i.test(name)) return [-1.05, 0.2, 0.68];
      return [-1.05, 0.16, 0.1];
    case 'motorElectric':
      return [-1.45, 0.7, 1.35];
    case 'batteryHV': {
      const base = [0.45, -0.4, 1.05];
      if (/batteryCover|battery-lid|battery-cover/i.test(name))
        return [base[0], base[1] + 0.72, base[2]];
      if (/cooling-plate/i.test(name)) return [base[0], base[1] - 0.15, base[2]];
      if (/battery-module/i.test(name))
        return [base[0] + (x > 0 ? 0.1 : -0.1), base[1] + 0.16, base[2] + (z > 0 ? 0.08 : -0.08)];
      return base;
    }
    case 'battery12v':
      return [-0.7, 0.55, 0.95];
    case 'cooling':
      return [-1.5, 0.05, 0.45];
    case 'brakeFluid':
      return [-0.8, 0.75, -0.95];
    case 'tank':
      return [0.65, -0.15, -1.05];
    case 'exhaust':
      return [0, -0.25, -0.75];
    case 'electronics':
      return /dashboard|painel/i.test(name) ? [-0.45, 0.85, 0.9] : [-0.15, 0.65, 1];
    case 'lights':
      return [x < 0 ? -0.75 : 0.65, 0.35, side * 0.45];
    case 'mirrors':
      return [-0.1, 0.4, side * 1.2];
    case 'vin':
      return [x < 0 ? -0.8 : 0.7, 0.05, 0.7];
    default:
      return [0, 0, 0];
  }
}
