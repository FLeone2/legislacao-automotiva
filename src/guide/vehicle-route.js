// Visual URL adaptation only. Regulatory consultation retains exact legacy IDs.
import { PARTS } from './vehicle-parts.js';
import { subsystemSelection } from './subsystem-coverage.js';
import modelPreviews from '../core/model-previews.js';

const { componentAssembly, legacyAssembly } = modelPreviews;

export function vehicleSelection(query = {}, legacyParts = [], components = []) {
  const legacy = legacyParts.find((row) => row.id === query.part);
  const component = components.find((row) => row.id === (query.component || query.focus));
  const subsystem = subsystemSelection(query.subsystem);
  const explicitAssembly =
    query.assembly || (PARTS.some((row) => row.id === query.part) ? query.part : '');
  const assemblyId =
    subsystem?.assemblyId ||
    (legacy && legacyAssembly(legacy.id)) ||
    explicitAssembly ||
    (component && componentAssembly(component.id));
  const assembly = PARTS.find((row) => row.id === assemblyId);
  if (!assembly) return null;
  const assemblyOrigins = [
    ...new Set([...(assembly.legacyParts || []), assembly.legacyPart].filter(Boolean)),
  ];
  const origins = legacy
    ? [legacy.id]
    : subsystem
      ? subsystem.legacyParts
      : component && !explicitAssembly
        ? component.legacyPartIds || []
        : assemblyOrigins;
  return {
    ...assembly,
    ...(subsystem || {}),
    id: assembly.id,
    assemblyId: assembly.id,
    assemblyIds: subsystem?.assemblyIds || [assembly.id],
    label:
      subsystem?.label ||
      legacy?.label ||
      (!explicitAssembly && component?.label) ||
      assembly.label,
    legacyPart: null,
    legacyPartIds: [],
    legacyParts: origins,
    subsystemIds:
      subsystem?.subsystemIds ||
      (query.subsystem ? [query.subsystem] : assembly.subsystemIds || []),
    ...(legacy
      ? {
          referenceAsset: legacy.displayAsset || legacy.asset,
          referenceArt: null,
          description: 'Peça de origem selecionada; consulte seus vínculos específicos no acervo.',
        }
      : {}),
  };
}

export function vehicleModeRoute(query = {}, reference = false) {
  const params = new URLSearchParams(query);
  for (const [key, value] of [...params]) if (!value) params.delete(key);
  if (reference) {
    // Modern assembly IDs are not historic 2D regions. Keep the assembly so
    // returning to 3D restores the exact selection; let the source board open
    // without inventing a one-to-one historic piece for it.
    if (PARTS.some((part) => part.id === params.get('part'))) {
      params.set('assembly', params.get('part'));
      params.delete('part');
    }
    params.set('view', 'reference');
  } else params.delete('view');
  return '#vehicle' + (params.size ? '?' + params : '');
}

export function vehicleVisualProfile(type, powertrain) {
  const category =
    {
      'SUV / passeio': 'M1',
      'Comercial leve': 'N1',
      Ônibus: 'M3',
      Caminhão: 'N3',
      Motocicleta: 'L',
    }[type] || 'M1';
  const drive = { Híbrido: 'hev', Combustão: 'ice', Elétrico: 'bev' }[powertrain] || 'hev';
  return { category, powertrain: drive };
}
