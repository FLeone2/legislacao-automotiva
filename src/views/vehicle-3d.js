'use strict';
// Interactive 3D explorer for the vehicle overview. Model parts use the same
// vehicleComponents ids and routes as the illustration hotspots and the directory,
// and the part list below the canvas is the keyboard and screen-reader alternative.
const Vehicle3D = (() => {
  const storageKey = 'legislacao-automotiva.vehicle-view';
  const views = [
    ['perspectiva', 'Perspectiva'],
    ['lateral', 'Lateral'],
    ['frente', 'Frente'],
    ['traseira', 'Traseira'],
    ['topo', 'Topo'],
  ];
  let api = null;
  let loading = null;
  let canvas = null;
  let stage = null;
  let options = {};
  let pendingFocus = null;
  let webgl = null;

  function supported() {
    if (webgl !== null) return webgl;
    try {
      const probe = document.createElement('canvas');
      webgl = Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
    } catch {
      webgl = false;
    }
    return webgl;
  }
  function remember(value) {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // The URL still carries the chosen view.
    }
  }
  function mode(query) {
    let value = query.get('vista');
    if (value === '2d' || value === '3d') remember(value);
    else {
      try {
        value = localStorage.getItem(storageKey);
      } catch {
        value = null;
      }
    }
    return value === '2d' || !supported() ? '2d' : '3d';
  }
  function markup(selected, link) {
    return `<div class="model-stage" data-model-stage><canvas class="model-canvas" id="vehicleModel" tabindex="0" role="img" aria-roledescription="modelo 3D" aria-label="Modelo 3D interativo e genérico do veículo. Setas giram, + e − aproximam, 0 enquadra e Enter abre as referências do sistema selecionado." aria-describedby="vehicleModelHelp"></canvas><div class="model-loading" role="status"><span class="model-spinner" aria-hidden="true"></span>Carregando modelo 3D…</div><div class="model-tooltip" aria-hidden="true" hidden></div><a class="model-callout" data-model-callout hidden href="#vehicle"><strong></strong><span>Ver referências →</span></a><div class="model-toolbar"><div class="model-views" role="group" aria-label="Ângulo da câmera">${views
      .map(([id, label]) => `<button type="button" data-model-view="${id}">${label}</button>`)
      .join(
        '',
      )}</div><div class="model-zoom" role="group" aria-label="Aproximação"><button type="button" data-model-zoom="out" aria-label="Afastar">−</button><button type="button" data-model-zoom="reset" aria-label="Enquadrar o veículo inteiro">⤢</button><button type="button" data-model-zoom="in" aria-label="Aproximar">+</button></div></div><div class="model-dock"><label class="model-explode"><span>Vista explodida</span><input type="range" min="0" max="100" step="1" value="50" data-model-explode><output>50%</output></label><button type="button" class="model-xray" data-model-xray aria-pressed="false" title="Deixa os demais sistemas translúcidos">Raio-X</button></div><p class="model-help" id="vehicleModelHelp">Arraste para girar · role para aproximar · botão direito move · clique duplo abre as referências</p></div><nav class="model-parts" aria-label="Componentes do modelo 3D">${vehicleComponents
      .map(
        (c) =>
          `<a href="${esc(link(c))}" data-model-part="${esc(c.id)}"${c.id === selected ? ' class="active" aria-current="true"' : ''}>${esc(c.short || c.label)}</a>`,
      )
      .join('')}</nav>`;
  }
  function go(url, focus) {
    pendingFocus = focus;
    options.navigate(url);
  }
  function component(id) {
    return ComponentFlow.component(id);
  }
  function syncExplode(value) {
    const input = stage?.querySelector('[data-model-explode]');
    if (!input) return;
    const percent = Math.round(value * 100);
    input.value = percent;
    input.setAttribute('aria-valuetext', percent ? `${percent}% afastado` : 'Montado');
    input.nextElementSibling.textContent = percent ? percent + '%' : 'Montado';
  }
  function markHovered(id) {
    document
      .querySelectorAll('#main [data-model-part], #main [data-aurora-component]')
      .forEach((el) =>
        el.classList.toggle(
          'is-hovered',
          Boolean(id) && (el.dataset.modelPart || el.dataset.auroraComponent) === id,
        ),
      );
  }
  const callbacks = {
    onHover(id, event) {
      const tip = stage?.querySelector('.model-tooltip');
      markHovered(id);
      if (!tip) return;
      if (!id || !event) {
        tip.hidden = true;
        return;
      }
      const rect = stage.getBoundingClientRect();
      tip.textContent = component(id)?.label || '';
      tip.hidden = false;
      tip.style.transform = `translate(${Math.round(event.clientX - rect.left + 14)}px, ${Math.round(event.clientY - rect.top + 16)}px)`;
    },
    onPick(id) {
      if (component(id) && id !== options.selected) go(options.link(component(id)), 'canvas');
    },
    onOpen(id) {
      if (component(id)) go(options.open(component(id)), null);
    },
    onExplode: syncExplode,
    onInteract() {
      stage?.classList.add('has-interacted');
    },
    onFrame() {
      const callout = stage?.querySelector('[data-model-callout]');
      if (!callout || !api || !options.selected) return;
      const rect = api.screenOf(options.selected);
      if (!rect?.visible) {
        callout.hidden = true;
        return;
      }
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const w = callout.offsetWidth || 180;
      const h = callout.offsetHeight || 48;
      let x = rect.right + 14;
      if (x + w > width - 12) x = rect.left - w - 14;
      x = Math.max(12, Math.min(width - w - 12, x));
      const y = Math.max(
        58,
        Math.min(height - h - 70, rect.top + (rect.bottom - rect.top) * 0.3 - h / 2),
      );
      callout.hidden = false;
      callout.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    },
  };
  function bind(root) {
    root.addEventListener('click', (event) => {
      const viewButton = event.target.closest('[data-model-view]');
      if (viewButton && api) api.view(viewButton.dataset.modelView);
      const zoom = event.target.closest('[data-model-zoom]');
      if (zoom && api) {
        if (zoom.dataset.modelZoom === 'reset') api.reset();
        else api.zoom(zoom.dataset.modelZoom === 'in' ? 0.8 : 1.25);
      }
      const xray = event.target.closest('[data-model-xray]');
      if (xray && api) {
        api.setXray(!api.xray);
        xray.setAttribute('aria-pressed', String(api.xray));
      }
      const part = event.target.closest('[data-model-part]');
      if (part && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        go(part.getAttribute('href'), 'part:' + part.dataset.modelPart);
      }
    });
    root.querySelector('[data-model-explode]').addEventListener('input', (event) => {
      api?.setExplode(event.target.value / 100, 0);
      syncExplode(event.target.value / 100);
    });
    canvas.onkeydown = (event) => {
      if (!api) return;
      const actions = {
        ArrowLeft: () => api.orbit(0.14, 0),
        ArrowRight: () => api.orbit(-0.14, 0),
        ArrowUp: () => api.orbit(0, -0.08),
        ArrowDown: () => api.orbit(0, 0.08),
        '+': () => api.zoom(0.8),
        '=': () => api.zoom(0.8),
        '-': () => api.zoom(1.25),
        0: () => api.reset(),
        Home: () => api.reset(),
        Enter: () => options.selected && callbacks.onOpen(options.selected),
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
      stage.classList.add('has-interacted');
    };
    const main = document.getElementById('main');
    const cardId = (target) =>
      target instanceof Element
        ? target.closest('[data-model-part],[data-aurora-component]')
        : null;
    const show = (el) => {
      const id = el ? el.dataset.modelPart || el.dataset.auroraComponent : null;
      markHovered(id);
      api?.highlight(id);
    };
    main.onpointerover = (event) => show(cardId(event.target));
    main.onpointerout = (event) => {
      if (cardId(event.target) !== cardId(event.relatedTarget)) show(null);
    };
    main.onfocusin = (event) => show(cardId(event.target));
    main.onfocusout = () => show(null);
  }
  function fail(root) {
    webgl = false;
    const fallback = new URLSearchParams(location.hash.split('?')[1] || '');
    fallback.set('vista', '2d');
    root.querySelector('[data-model-stage]').innerHTML =
      `<div class="model-fallback" role="status"><strong>Não foi possível iniciar o modelo 3D neste navegador.</strong><a class="btn" href="#vehicle?${esc(fallback.toString())}">Usar a ilustração →</a></div>`;
  }
  async function mount(root, settings) {
    options = settings;
    stage = root.querySelector('[data-model-stage]');
    const placeholder = stage.querySelector('canvas');
    if (canvas) placeholder.replaceWith(canvas);
    else canvas = placeholder;
    const ownStage = stage;
    bind(root);
    const callout = stage.querySelector('[data-model-callout]');
    const selected = component(settings.selected);
    if (selected) {
      callout.href = settings.open(selected);
      callout.querySelector('strong').textContent = selected.label;
    }
    if (pendingFocus === 'canvas') canvas.focus({ preventScroll: true });
    else if (pendingFocus?.startsWith('part:'))
      root
        .querySelector(`[data-model-part="${pendingFocus.slice(5)}"]`)
        ?.focus({ preventScroll: true });
    pendingFocus = null;
    const first = !api;
    try {
      loading ||= import(new URL('src/views/vehicle-3d-scene.mjs', document.baseURI).href).then(
        (module) => module.createVehicleScene(canvas, callbacks),
      );
      api = await loading;
    } catch {
      loading = null;
      if (ownStage.isConnected) fail(root);
      return;
    }
    if (!ownStage.isConnected) return;
    ownStage.classList.add('is-ready');
    root.querySelector('[data-model-xray]').setAttribute('aria-pressed', String(api.xray));
    if (first) {
      api.setExplode(0.5);
      api.select(settings.selected, { focus: false, reveal: settings.explicit });
      api.view('perspectiva', 0);
    } else api.select(settings.selected, { reveal: settings.explicit });
    syncExplode(api.explode);
    api.invalidate();
  }
  return { mode, markup, mount, supported };
})();
