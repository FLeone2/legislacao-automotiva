'use strict';
let guideBundlePromise;
let guideRoot;
let guideMountSequence = 0;
const guideBridge = {
  records(part) {
    const records = catalogRecords(catalog);
    if (part.legacyPart && typeof VehicleLegislation !== 'undefined')
      return VehicleLegislation.records(part.legacyPart, records);
    return [];
  },
  openRecord(id) {
    openNorm(id);
  },
};
function disposeGuide() {
  guideMountSequence += 1;
  if (guideRoot) guideRoot.unmount();
  guideRoot = null;
  document.getElementById('app').classList.remove('guide-mode');
}
async function renderGuide() {
  const sequence = ++guideMountSequence;
  document.getElementById('app').classList.add('guide-mode');
  const main = document.getElementById('main');
  main.innerHTML = '<div class="guide-loading" role="status">Carregando o guia profissional…</div>';
  try {
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
    await guideBundlePromise;
    if (state.view !== 'guide' || sequence !== guideMountSequence) return;
    main.innerHTML = '<div id="guideRoot"></div>';
    guideRoot = HomologationGuide.mount(main.firstElementChild, guideBridge);
  } catch {
    if (state.view !== 'guide' || sequence !== guideMountSequence) return;
    main.innerHTML =
      '<h1>Guia indisponível</h1><p role="alert">Não foi possível carregar o ambiente de projeto.</p><button class="btn" onclick="renderGuide()">Tentar novamente</button><a class="btn" href="#library">Consultar biblioteca</a>';
  }
}
