'use strict';

// A visual lookup only. This module never supplies legal source parts, laws,
// requirements or applicability. Callers retain their reviewed resolver scope.
var VehicleModelPreviews = (() => {
  const indexUrl = 'assets/models/suv/thumbnails/index.json';
  const componentRepresentatives = Object.freeze({
    carroceria: 'body',
    vidros: 'glass',
    bancos: 'seats',
    chassi: 'chassis',
    'pneus-rodas': 'wheels',
    freios: 'brakes',
    motor: 'engine',
    bateria: 'batteryHV',
    escapamento: 'exhaust',
    tanque: 'tank',
    eletrica: 'electronics',
    iluminacao: 'lights',
    retrovisores: 'mirrors',
    identificacao: 'vin',
  });
  const assemblySystems = Object.freeze({
    body: 'carroceria',
    doors: 'carroceria',
    glass: 'vidros',
    seats: 'bancos',
    airbag: 'bancos',
    chassis: 'chassi',
    steering: 'chassi',
    wheels: 'pneus-rodas',
    brakes: 'freios',
    brakeFluid: 'freios',
    engine: 'motor',
    cooling: 'motor',
    motorElectric: 'bateria',
    batteryHV: 'bateria',
    exhaust: 'escapamento',
    tank: 'tanque',
    battery12v: 'eletrica',
    electronics: 'eletrica',
    lights: 'iluminacao',
    mirrors: 'retrovisores',
    vin: 'identificacao',
  });
  // Exact historic navigation IDs, mapped to related existing geometry. These
  // many-to-one visual associations must never be reversed to recover laws.
  const legacyRepresentatives = Object.freeze({
    peca_01_painel_teto: 'body',
    peca_02_vidro_lateral_dianteiro: 'glass',
    peca_03_parabrisa: 'glass',
    peca_04_vidro_lateral_superior: 'glass',
    peca_05_vidro_triangular_superior: 'glass',
    peca_06_vidro_traseiro: 'glass',
    peca_07_vidro_lateral_traseiro: 'glass',
    peca_08_banco_traseiro: 'seats',
    peca_09_bancos_dianteiros_console: 'seats',
    peca_10_carroceria: 'body',
    peca_11_capo: 'body',
    peca_12_farol_lado_oposto: 'lights',
    peca_13_farol_lado_visivel: 'lights',
    peca_14_parachoque_dianteiro: 'body',
    peca_15_lanterna_traseira_1: 'lights',
    peca_16_lanterna_traseira_2: 'lights',
    peca_17_parachoque_traseiro: 'body',
    peca_18_vidro_lateral_inferior: 'glass',
    peca_19_vidro_porta_dianteira: 'glass',
    peca_20_vidro_porta_traseira: 'glass',
    peca_21_porta_dianteira: 'doors',
    peca_22_porta_traseira: 'doors',
    peca_23_retrovisor: 'mirrors',
    peca_24_motor_combustao_transmissao: 'engine',
    peca_25_motor_eletrico_inversor_cabos: 'motorElectric',
    peca_26_bateria_tracao: 'batteryHV',
    peca_27_bateria_12v: 'battery12v',
    peca_28_chicote_eletrico: 'electronics',
    peca_29_radiador: 'cooling',
    peca_30_tanque_tubo_combustivel: 'tank',
    peca_31_escapamento: 'exhaust',
    peca_32_suspensao_dianteira_direcao: 'chassis',
    peca_33_suspensao_traseira: 'chassis',
    peca_34_roda_dianteira: 'wheels',
    peca_35_freio_dianteiro: 'brakes',
    peca_36_roda_traseira: 'wheels',
    peca_37_freio_traseiro: 'brakes',
  });
  const own = (object, key) =>
    object && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : null;
  const given = (value) => value !== undefined && value !== null && value !== '';
  const validIds = (ids) =>
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.every((id) => typeof id === 'string' && own(assemblySystems, id));
  const keyFor = (ids) => [...new Set(ids)].sort().join('--');
  const escape = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
    );
  let cachedIndex = null;
  let loadingIndex = null;

  function componentAssembly(id) {
    return typeof id === 'string' ? own(componentRepresentatives, id) : null;
  }
  function legacyAssembly(id) {
    if (typeof id !== 'string') return null;
    const assembly = own(legacyRepresentatives, id);
    if (!assembly) return null;
    if (
      typeof VehicleVector !== 'undefined' &&
      !VehicleVector.parts?.some((part) => part.id === id)
    )
      return null;
    return assembly;
  }
  function validIndex(index) {
    return Boolean(
      index &&
      index.kind === 'actual_model_mesh_previews' &&
      index.sceneKind === 'car' &&
      index.images &&
      index.assemblies &&
      index.subsystems,
    );
  }
  function activeIndex(index) {
    const value = index === undefined ? cachedIndex : index;
    return validIndex(value) ? value : null;
  }
  function ensure() {
    if (!loadingIndex)
      loadingIndex = (async () => {
        try {
          const response = await fetch(indexUrl, { credentials: 'same-origin' });
          if (!response.ok) return null;
          const index = await response.json();
          cachedIndex = validIndex(index) ? index : null;
          return cachedIndex;
        } catch {
          return null;
        }
      })();
    return loadingIndex;
  }
  function optionsFor(input) {
    if (typeof input !== 'string') return input && typeof input === 'object' ? input : {};
    if (own(legacyRepresentatives, input)) return { legacyPartId: input };
    if (own(assemblySystems, input)) return { assemblyId: input };
    if (own(componentRepresentatives, input)) return { componentId: input };
    return { subsystemId: input };
  }
  function selection(input = {}, index) {
    const options = optionsFor(input);
    const source = activeIndex(index);
    const legacyId = given(options.legacyPartId) ? options.legacyPartId : null;
    const legacyIdAssembly = legacyId ? legacyAssembly(legacyId) : null;
    if (legacyId && !legacyIdAssembly) return null;
    if (given(options.componentId) && !componentAssembly(options.componentId)) return null;
    if (
      given(options.assemblyId) &&
      given(options.componentId) &&
      assemblySystems[options.assemblyId] !== options.componentId
    )
      return null;
    if (
      legacyId &&
      given(options.componentId) &&
      assemblySystems[legacyIdAssembly] !== options.componentId
    )
      return null;
    let entry = null;
    let ids;
    if (given(options.subsystemId)) {
      entry = own(source?.subsystems, options.subsystemId);
      if (!entry || !validIds(entry.assemblyIds)) return null;
      ids = [...entry.assemblyIds];
    } else if (legacyId) {
      ids = [legacyIdAssembly];
    } else if (given(options.assemblyIds)) {
      if (!validIds(options.assemblyIds)) return null;
      ids = [...options.assemblyIds];
    } else {
      const id = options.assemblyId || componentAssembly(options.componentId);
      if (!own(assemblySystems, id)) return null;
      ids = [id];
    }
    if (given(options.assemblyIds)) {
      if (!validIds(options.assemblyIds) || keyFor(options.assemblyIds) !== keyFor(ids))
        return null;
    }
    if (given(options.assemblyId) && !ids.includes(options.assemblyId)) return null;
    const assemblyId = options.assemblyId || ids[0];
    const historic =
      typeof VehicleVector === 'undefined'
        ? null
        : VehicleVector.parts?.find((part) => part.id === legacyId);
    return {
      assemblyId,
      assemblyIds: [...new Set(ids)].sort(),
      subsystemId: entry ? options.subsystemId : null,
      legacyPartId: legacyId,
      componentId: options.componentId || (legacyId ? assemblySystems[legacyIdAssembly] : null),
      label:
        options.label ||
        historic?.label ||
        entry?.label ||
        (legacyId ? legacyId : own(source?.assemblies, assemblyId)?.label || assemblyId),
      visualOnly: true,
    };
  }
  function resolve(input = {}, index) {
    const source = activeIndex(index);
    if (!source) return null;
    const selected = selection(input, source);
    if (!selected) return null;
    const entry = selected.subsystemId
      ? own(source.subsystems, selected.subsystemId)
      : selected.assemblyIds.length === 1
        ? own(source.assemblies, selected.assemblyId)
        : null;
    const image = own(source.images, entry?.imageId || keyFor(selected.assemblyIds));
    if (
      !image ||
      !validIds(image.assemblyIds) ||
      keyFor(image.assemblyIds) !== keyFor(selected.assemblyIds) ||
      !/^assets\/models\/suv\/thumbnails\/[a-zA-Z0-9-]+\.webp$/.test(image.asset) ||
      !/^[a-f0-9]{64}$/.test(image.sha256) ||
      image.width !== 1024 ||
      image.height !== 768
    )
      return null;
    const example = Boolean(image.mechanicalExample || entry?.exampleOnly);
    const notes = Array.isArray(image.notes) ? [...image.notes] : [];
    if (selected.legacyPartId)
      notes.unshift(
        `Imagem do conjunto 3D relacionado a ${selected.label}; não é uma reprodução individual exata da peça solicitada.`,
      );
    return {
      ...image,
      assemblyIds: [...image.assemblyIds],
      contextAssemblyIds: [...(image.contextAssemblyIds || [])],
      labels: [...(image.labels || [])],
      modelSources: [...(image.modelSources || [])],
      notes,
      selection: selected,
      assetUrl: image.asset + '?v=' + image.sha256.slice(0, 16),
      caption: example
        ? 'Exemplo ilustrativo do conjunto 3D'
        : image.subset
          ? 'Exemplo do conjunto 3D'
          : 'Conjunto 3D relacionado',
    };
  }
  function art(input = {}, className = '', index) {
    const image = resolve(input, index);
    if (!image) return '';
    const bmw = image.modelSources.includes('bmw-x5-g05');
    const authored = image.modelSources.includes('authored-mechanics');
    const credits = [
      ...(bmw
        ? [
            '<a href="https://github.com/bmwcarit/digital-car-3d" target="_blank" rel="noopener noreferrer">BMW Car IT</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · Renderização adaptada',
          ]
        : []),
      ...(authored ? ['Geometria mecânica autoral didática'] : []),
    ];
    return `<figure class="portal-model-preview${className ? ' ' + escape(className) : ''}" data-model-preview="${escape(image.id)}" data-model-assemblies="${escape(image.assemblyIds.join(','))}"><img src="${escape(image.assetUrl)}" alt="${escape(image.caption + ': ' + image.labels.join(' · ') + '. Seleção: ' + image.selection.label)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async"><figcaption><strong>${escape(image.caption)}</strong>${image.notes.length ? `<p>${escape(image.notes.join(' '))}</p>` : ''}${credits.length ? `<small>${credits.join(' · ')}</small>` : ''}</figcaption></figure>`;
  }
  return Object.freeze({ ensure, resolve, art, selection, componentAssembly, legacyAssembly });
})();

if (typeof module !== 'undefined') module.exports = VehicleModelPreviews;
