'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports)
    module.exports = { createPortalContext: factory };
  if (root?.document) root.PortalContext = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (runtime = {}) {
  const ACTIVE_KEY = 'homologation-active-project-v1';
  const PROJECTS_KEY = 'homologation-projects-v1';
  const guideFields = new Set(['tab', 'stage', 'part', 'subsystem', 'tree', 'profile']);
  const idValue = (id) =>
    typeof id === 'string' && id.length > 0 && id.length <= 100 && id !== 'demo' ? id : '';
  const storage = () => {
    try {
      return runtime.localStorage;
    } catch {
      return null;
    }
  };
  const savedId = () => {
    try {
      return idValue(storage()?.getItem(ACTIVE_KEY));
    } catch {
      return '';
    }
  };
  let activeId = savedId();

  function localSummary() {
    try {
      const store = storage();
      if (!store) return { unavailable: true };
      const raw = store.getItem(PROJECTS_KEY);
      if (!raw) return { project: null };
      if (raw.length > 2_000_000) return { unavailable: true };
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows) || rows.length > 50) return { unavailable: true };
      // Only a display name is read here. React's existing project validator
      // remains responsible for loading technical profiles and checklists.
      const row = rows.find((p) => p?.id === activeId && p?.schemaVersion === 1);
      if (!row) return { project: null };
      if (typeof row.profile?.name !== 'string' || row.profile.name.length > 200)
        return { unavailable: true };
      return { project: { id: activeId, name: row.profile.name } };
    } catch {
      return { unavailable: true };
    }
  }

  function guideRoute(params = {}) {
    const query = new URLSearchParams();
    for (const key of guideFields)
      if (params[key] !== undefined && params[key] !== null && String(params[key]))
        query.set(key, String(params[key]));
    const project = Object.hasOwn(params, 'project') ? params.project : activeId;
    if (project === 'demo') query.set('project', 'demo');
    else if (idValue(project)) query.set('project', project);
    return '#guide' + (query.size ? '?' + query : '');
  }

  function renderBar(view) {
    const doc = runtime.document;
    if (!doc) return;
    const bar = doc.getElementById('portalContextBar');
    if (!bar) return;
    const currentView = view || (runtime.location?.hash || '#guide').slice(1).split('?')[0];
    bar.hidden = !currentView || currentView === 'guide';
    for (const link of doc.querySelectorAll('[data-nav="guide"], .brand'))
      link.setAttribute('href', guideRoute());
    bar.replaceChildren();
    if (bar.hidden) return;
    const { project, unavailable } = localSummary();
    const text = doc.createElement('div');
    text.className = 'portal-context-text';
    const title = doc.createElement('strong');
    title.textContent = project?.name || (activeId ? 'Processo a recuperar' : 'Consulta livre');
    const detail = doc.createElement('small');
    detail.textContent = unavailable
      ? 'Processos locais indisponíveis. A consulta às fontes continua disponível.'
      : project
        ? 'Perfil e checklist deste processo · salvo neste navegador'
        : activeId
          ? 'Importe o backup no Guia para acessar o perfil e as evidências.'
          : 'Explore as referências ou defina o perfil do seu veículo.';
    text.append(title, detail);
    const actions = doc.createElement('div');
    actions.className = 'portal-context-actions';
    const link = doc.createElement('a');
    link.className = 'btn';
    link.href =
      project || activeId ? guideRoute({ tab: 'checklist' }) : guideRoute({ profile: 'new' });
    link.textContent = project
      ? 'Continuar processo'
      : activeId
        ? 'Recuperar processo'
        : 'Novo processo';
    actions.append(link);
    bar.append(text, actions);
  }

  function announce() {
    if (runtime.dispatchEvent && runtime.CustomEvent)
      runtime.dispatchEvent(
        new runtime.CustomEvent('portal:project-change', { detail: { projectId: activeId } }),
      );
  }

  function setActiveProjectId(id) {
    const next = idValue(id);
    const changed = activeId !== next;
    activeId = next;
    try {
      const store = storage();
      if (store?.getItem(ACTIVE_KEY) !== next) store?.setItem(ACTIVE_KEY, next);
    } catch {
      // This preference never overwrites project data or prevents consultation.
    }
    renderBar();
    if (changed) announce();
    return activeId;
  }

  function rememberRoute(hash = '') {
    const query = new URLSearchParams(hash.split('?')[1] || '');
    if (query.has('project')) setActiveProjectId(query.get('project'));
  }

  runtime.addEventListener?.('storage', (event) => {
    if (event.key === ACTIVE_KEY || event.key === PROJECTS_KEY || event.key === null) {
      activeId = savedId();
      renderBar();
      announce();
    }
  });
  return {
    activeProjectId: () => activeId,
    setActiveProjectId,
    rememberRoute,
    guideRoute,
    renderBar,
  };
});
