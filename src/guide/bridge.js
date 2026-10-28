'use strict';
let guideBundlePromise;
let guideRoot;
let guideMountSequence = 0;
let guideMountKind = '';
const guideBridge = {
  activeProjectId() {
    return typeof PortalContext === 'undefined' ? '' : PortalContext.activeProjectId();
  },
  setActiveProjectId(id) {
    if (typeof PortalContext !== 'undefined') PortalContext.setActiveProjectId(id);
  },
  guideRoute(params) {
    return typeof PortalContext === 'undefined'
      ? '#guide?' + new URLSearchParams(params)
      : PortalContext.guideRoute(params);
  },
  records(part) {
    if (typeof VehicleLegislation === 'undefined') return [];
    return GuideTraceability.records(part, catalogRecords(catalog), VehicleLegislation);
  },
  traceability(part, profile) {
    return GuideTraceability.create({
      resolver: VehicleLegislation,
      catalogRecords: catalogRecords(catalog),
      reviewedAt:
        typeof VehicleLegislationData === 'undefined' ? null : VehicleLegislationData.asOf,
    })(part, profile);
  },
  async loadTraceability(part, profile) {
    const records = guideBridge.records(part);
    await Promise.all(
      records
        .filter((record) => record._summary && record.regulatorySource)
        .map((record) =>
          loadRegulationRecord(record.regulatorySource, record.regulatoryId || record.id),
        ),
    );
    return guideBridge.traceability(part, profile);
  },
  openRecord(id) {
    openNorm(id);
  },
  navigateVehicle(changes) {
    const query = new URLSearchParams(location.hash.split('?')[1] || '');
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === null || value === undefined) query.delete(key);
      else query.set(key, value);
    }
    history.pushState(null, '', '#vehicle' + (query.size ? '?' + query : ''));
    // The persistent textual tree keeps its keyboard focus and scroll position.
    return render();
  },
  libraryRoute(part) {
    return libraryRoute(
      part.legacyParts?.length === 1
        ? { part: part.legacyParts[0], subsystem: part.subsystemId }
        : { component: part.taxonomy || part.system, subsystem: part.subsystemId },
    );
  },
};
function ensureVehiclePreviews() {
  return typeof VehicleModelPreviews === 'undefined'
    ? Promise.resolve(null)
    : VehicleModelPreviews.ensure();
}
function vehicleModelArt(selection, className = '') {
  return typeof VehicleModelPreviews === 'undefined'
    ? ''
    : VehicleModelPreviews.art(selection, className);
}
function loadGuideBundle() {
  if (!guideBundlePromise)
    guideBundlePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = document.getElementById('guideBundle').href;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        guideBundlePromise = null;
        reject(new Error('bundle'));
      };
      document.body.append(script);
    });
  return guideBundlePromise;
}
function keepVehicleExplorer() {
  const [view, search = ''] = location.hash.slice(1).split('?');
  return Boolean(
    view === 'vehicle' &&
    new URLSearchParams(search).get('view') !== 'reference' &&
    guideMountKind === 'vehicle' &&
    guideRoot &&
    document.getElementById('vehicleExplorerRoot'),
  );
}
function disposeGuide() {
  guideMountSequence += 1;
  if (guideRoot) guideRoot.unmount();
  guideRoot = null;
  guideMountKind = '';
  document.getElementById('app').classList.remove('guide-mode', 'vehicle-explorer-mode');
}
async function renderGuide() {
  const sequence = ++guideMountSequence;
  document.getElementById('app').classList.add('guide-mode');
  const main = document.getElementById('main');
  main.innerHTML = '<div class="guide-loading" role="status">Carregando o guia profissional…</div>';
  try {
    await loadGuideBundle();
    if (state.view !== 'guide' || sequence !== guideMountSequence) return;
    main.innerHTML = '<div id="guideRoot"></div>';
    guideRoot = HomologationGuide.mount(main.firstElementChild, guideBridge);
    guideMountKind = 'guide';
  } catch {
    if (state.view !== 'guide' || sequence !== guideMountSequence) return;
    main.innerHTML =
      '<h1>Guia indisponível</h1><p role="alert">Não foi possível carregar o ambiente de projeto.</p><button class="btn" onclick="renderGuide()">Tentar novamente</button><a class="btn" href="#library">Consultar biblioteca</a>';
  }
}

function vehicleExplorerContext() {
  const query = Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));
  return {
    query,
    legacyParts: vehicleVector.parts.map(({ id, label, componentId, displayAsset, asset }) => ({
      id,
      label,
      componentId,
      displayAsset,
      asset,
    })),
    components: vehicleComponents.map(({ id, label, taxonomy, mapParts }) => ({
      id,
      label,
      taxonomy,
      legacyPartIds: mapParts.map((part) => part.id),
    })),
    visualType: document.getElementById('vehicleType').value,
    visualPowertrain: document.getElementById('powertrain').value,
    visualTypes: [...document.getElementById('vehicleType').options].map((option) => option.value),
    visualPowertrains: [...document.getElementById('powertrain').options].map(
      (option) => option.value,
    ),
  };
}

function updateVehicleExplorerRoute() {
  if (keepVehicleExplorer()) guideRoot.update(vehicleExplorerContext());
}

async function renderVehicleExplorer() {
  const sequence = ++guideMountSequence;
  const main = document.getElementById('main');
  document.getElementById('app').classList.add('vehicle-explorer-mode');
  if (keepVehicleExplorer()) {
    guideRoot.update(vehicleExplorerContext());
    return true;
  }
  main.innerHTML = '<p class="guide-loading" role="status">Carregando o explorador 3D…</p>';
  try {
    await loadGuideBundle();
    if (state.view !== 'vehicle' || sequence !== guideMountSequence) return false;
    main.innerHTML =
      '<div id="vehicleExplorerRoot"></div><section id="vehicleConsultationRoot" aria-label="Árvore de referências da seleção"></section>';
    guideRoot = HomologationGuide.mountVehicle(
      main.firstElementChild,
      guideBridge,
      vehicleExplorerContext(),
    );
    guideMountKind = 'vehicle';
    return true;
  } catch {
    if (state.view !== 'vehicle' || sequence !== guideMountSequence) return false;
    main.innerHTML =
      '<h1>Explorador indisponível</h1><p role="alert">Não foi possível carregar o ambiente 3D. As consultas textuais continuam disponíveis.</p><button class="btn" onclick="renderVehicle()">Tentar novamente</button><a class="btn" href="#vehicle?view=reference">Abrir referência 2D</a><a class="btn" href="#library">Consultar biblioteca</a>';
    return false;
  }
}
