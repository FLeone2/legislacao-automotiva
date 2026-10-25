'use strict';

// Presentation coordinates in metres, not an assembly/disassembly procedure.
// Each offset is complete and is added once to the mesh's assembled world pose.
// Keep all meshes of an authored mechanical subassembly in the same lane.
const EXPLOSION_LANES = Object.freeze([
  { id: 'structure', label: 'Carroceria e proteção' },
  { id: 'glazing', label: 'Vidros e visibilidade' },
  { id: 'cabin', label: 'Habitáculo e proteção dos ocupantes' },
  { id: 'lateral', label: 'Portas, visão indireta e comandos' },
  { id: 'running-gear', label: 'Suspensão, direção, rodas e freios' },
  { id: 'thermal', label: 'Motor, transmissão e arrefecimento' },
  { id: 'hybrid', label: 'Tração elétrica e alta tensão' },
  { id: 'underbody', label: 'Energia, combustível e escapamento' },
  { id: 'identification', label: 'Iluminação e identificação' },
]);

const EXPLOSION_VIEW = Object.freeze({
  // Look towards the front left, with enough elevation to read the lower lanes.
  direction: [-1, 0.85, 1.15],
  targetBias: [0, 0.1, 0],
  padding: 1.13,
  // Screen-space space reserved for caption, orientation controls and footer.
  inset: { top: 62, bottom: 58, left: 24, right: 24 },
  suggestedHeight: { desktop: 620, mobile: 540 },
});

function vector(value) {
  if (Array.isArray(value))
    return value.slice(0, 3).map((number) => (Number.isFinite(number) ? number : 0));
  return ['x', 'y', 'z'].map((axis) => (Number.isFinite(value?.[axis]) ? value[axis] : 0));
}

function axle(x, name) {
  if (/front|dianteir/i.test(name)) return -1;
  if (/rear|traseir/i.test(name)) return 1;
  return x < -0.45 ? -1 : x > 0.45 ? 1 : 0;
}

function explodeTransform({
  partId = '',
  sourceMesh = '',
  sourceFile = '',
  center = [0, 0, 0],
  subassembly = '',
} = {}) {
  const [x, y, z] = vector(center);
  const side = Math.abs(z) > 0.05 ? Math.sign(z) : 1;
  const name = `${subassembly} ${sourceMesh} ${sourceFile}`;
  const axleSide = axle(x, subassembly || sourceMesh);
  const axleShift = axleSide < 0 ? -0.6 : axleSide > 0 ? 0.7 : 0;
  // The near wheels sit beyond the exposed axle, leaving both coilovers readable.
  const wheelSpread = side > 0 ? 3.1 : 1.5;
  const result = (offset, lane, label) => ({ offset, lane, label });

  switch (partId) {
    case 'body':
      if (/emblem/i.test(name) && Math.abs(z) > 0.8 && y < 0.8)
        return result([axleShift, -0.05, side * wheelSpread], 'running-gear', 'Centro da roda');
      if (/hood|cap[oô]/i.test(name)) return result([-1.1, 1.8, 0.35], 'structure', 'Capô');
      return result([0.35, 1.25, -0.4], 'structure', 'Carroceria');

    case 'doors':
      if (/tailgate|hatch|tampa.*traseir/i.test(name))
        return result([1.2, 0.65, -0.45], 'lateral', 'Tampa traseira');
      return result([0.05, 0.25, side * 1.65], 'lateral', 'Portas');

    case 'glass':
      if (/RearWindow|rear.window|Tailgate|vidro.*traseir/i.test(name))
        return result([0.95, 1.7, -0.6], 'glazing', 'Vidro traseiro');
      if (/Door_[FB].*glass|door.*window|vidro.*porta/i.test(name))
        return result([0.05, 1.15, side * 1.65], 'glazing', 'Vidros das portas');
      if (/2sided_dark|roof|sunroof|panoram|teto/i.test(name))
        return result([0.35, 2.55, -0.35], 'glazing', 'Vidro do teto');
      return result([-0.55, 2.2, -0.55], 'glazing', 'Para-brisa e vidros fixos');

    case 'seats':
      return result([-0.1, 1.15, 1.6], 'cabin', 'Bancos e retenção');
    case 'airbag':
      return result([-0.4, 1.4, 1.7], 'cabin', 'Retenção suplementar');
    case 'steering':
      if (/steeringRack|tie.?rod|cremalheira/i.test(name))
        return result([axleShift, -0.25, 2.4], 'running-gear', 'Caixa de direção e terminais');
      return result([-0.9, 0.85, 1.25], 'cabin', 'Direção e comandos');
    case 'electronics':
      if (/dashboard|painel/i.test(name))
        return result([-1.1, 0.85, 1.65], 'cabin', 'Painel e eletrônica');
      if (/Interior_/i.test(name)) return result([0, 0.1, 0], 'cabin', 'Habitáculo');
      return result([-0.6, 0.65, 1.35], 'cabin', 'Eletrônica e conectividade');

    case 'chassis':
      return result(
        [axleShift, -0.25, 2.4],
        'running-gear',
        axleSide < 0 ? 'Suspensão dianteira' : axleSide > 0 ? 'Suspensão traseira' : 'Chassi',
      );
    case 'wheels':
      return result([axleShift, -0.05, side * wheelSpread], 'running-gear', 'Pneus e rodas');
    case 'brakes':
      return result(
        [axleShift - 0.2, 0.25, side * (side > 0 ? 1.5 : 0.95)],
        'running-gear',
        'Freios',
      );
    case 'brakeFluid':
      return result([-1.2, 0.9, -1.2], 'running-gear', 'Fluido, reservatório e cilindro mestre');

    case 'engine':
      return result([-1.55, 0.1, 0.05], 'thermal', 'Motor e transmissão — exemplo');
    case 'cooling':
      return result([-1.85, 0, 0.5], 'thermal', 'Arrefecimento');
    case 'motorElectric':
      return result([-2.35, 0.95, 2.2], 'hybrid', 'Motor elétrico e inversor — exemplo');
    case 'batteryHV':
      return result([0.85, -0.9, 1.35], 'hybrid', 'Bateria de tração — exemplo');
    case 'battery12v':
      return result([-1.1, 0.55, 1.2], 'underbody', 'Bateria de baixa tensão');
    case 'tank':
      return result([0.9, -0.1, -1.5], 'underbody', 'Tanque e alimentação');
    case 'exhaust':
      return result([0, -0.35, -0.5], 'underbody', 'Escapamento e pós-tratamento');

    case 'lights':
      if (/SideMirror|Doors_F/i.test(name) && Math.abs(z) > 0.9 && x > -1.2 && x < 0.2)
        return result([-0.35, 0.6, side * 1.7], 'lateral', 'Repetidores laterais');
      return result(
        [x < 0 ? -1.2 : 0.95, x < 0 ? 0.55 : 0.4, side * 0.7],
        'identification',
        x < 0 ? 'Iluminação dianteira' : 'Iluminação traseira',
      );
    case 'mirrors':
      return result([-0.35, 0.6, side * 1.7], 'lateral', 'Retrovisores');
    case 'vin':
      return result(
        [x < 0 ? -1.5 : 0.9, x < 0 ? -0.1 : 0, x < 0 ? 1 : -1.2],
        'identification',
        'Identificação e placas',
      );
    default:
      return result([0, 0.2, 0], 'structure', 'Conjunto de referência');
  }
}

if (typeof module !== 'undefined')
  module.exports = { EXPLOSION_LANES, EXPLOSION_VIEW, explodeTransform };
