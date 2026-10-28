'use strict';
async function renderMarkings() {
  $('#main').innerHTML =
    '<header class="portal-header"><div><div class="eyebrow portal-eyebrow">Identificação e rastreabilidade</div><h1 class="portal-title">Etiquetas, selos e VIN</h1><p class="portal-summary" role="status">Carregando as referências de identificação…</p></div></header>';
  const results = await Promise.allSettled([
    ...Object.keys(regulatoryConfig).map(loadRegulations),
    portalLoadVehiclePreviews(),
  ]);
  const candidates = Object.entries(regulatoryData).flatMap(([source, data]) =>
    (data?.records || [])
      .filter((r) =>
        (r.requirements || []).some((q) =>
          q.topics?.some((t) => ['vin', 'etiquetas', 'placas'].includes(t)),
        ),
      )
      .map((r) => ({ source, id: r.id })),
  );
  const detailResults = await Promise.allSettled(
    candidates.map((r) => loadRegulationRecord(r.source, r.id)),
  );
  if (state.view !== 'markings') return;
  if (regulatoryBaseCatalog) {
    catalog = installActiveRegulations(regulatoryBaseCatalog);
    delete treeModels.tree;
    delete treeModels.mover;
  }
  const unavailable = [...results, ...detailResults].some((r) => r.status === 'rejected');
  const groups = [
    {
      id: 'placas',
      label: 'Placas de identificação (PIV)',
      text: 'Placa externa e QR Code seguem seu próprio regime. PIV não substitui VIN, ETA nem selo de componente.',
    },
    {
      id: 'vin',
      label: 'VIN, ETA e identificação do veículo',
      text: 'Estrutura, gravações, etiquetas de identificação e marcação nos vidros. A fabricação/importação e a categoria definem o regime aplicável.',
    },
    {
      id: 'etiquetas',
      label: 'Etiquetas e selos por finalidade',
      text: 'ETA, informações de pesos/capacidades, etiqueta de eficiência, selo de conformidade e identificação Anatel cumprem funções distintas.',
    },
  ];
  const all = Object.entries(regulatoryData).flatMap(([source, data]) =>
    (data?.records || []).filter((r) => !r._summary).map((r) => ({ ...r, source })),
  );
  $('#main').innerHTML =
    `<header class="portal-header"><div><div class="eyebrow portal-eyebrow">Identificação e rastreabilidade</div><h1 class="portal-title">Etiquetas, selos e VIN</h1><p class="subtitle portal-summary">A identificação certa para cada finalidade: veículo, componente ou equipamento de telecomunicações.</p></div>${portalConsultationActions()}</header><div class="portal-context-card">${portalVehicleArt({ assemblyId: 'vin', label: 'Identificação do veículo' }, 'portal-context-preview')}<div class="portal-context-meta"><h2>Do veículo à sua identificação</h2><p>Explore os vínculos de consulta e confira o escopo de cada marcação.</p><div class="portal-context-actions"><a class="btn" href="#vehicle?component=identificacao&subsystem=identificacao%2Frotulagem">Explorar no veículo →</a></div></div></div>${unavailable ? '<p class="notice portal-consultation-note" role="alert">Uma fonte não carregou. Os resultados abaixo estão incompletos. <button class="btn" data-markings-retry>Tentar novamente</button></p>' : ''}<nav class="regulatory-phases portal-section-nav" aria-label="Assuntos de identificação">${groups.map((g) => `<button class="btn" data-markings-section="${g.id}">${g.label}</button>`).join('')}</nav>${groups
      .map((g) => {
        const rows = all.filter((r) => r.requirements?.some((x) => x.topics?.includes(g.id)));
        return `<section id="markings-${g.id}" class="markings-group portal-section" aria-labelledby="markings-title-${g.id}"><div class="portal-section-heading"><h2 id="markings-title-${g.id}">${g.label}</h2><p>${g.text}</p></div><div class="portal-list">${rows.map((r) => `<article class="contran-record portal-list-item" data-marking-record="${esc(r.id)}"><div class="eyebrow">${esc(regulatoryConfig[r.source].label)}</div><h3>${esc(r.title || 'Resolução CONTRAN nº ' + r.number + '/' + r.year)}</h3>${regulatoryRequirements(r, [g.id])}<div class="actions portal-actions"><a class="btn" href="${regulatoryUrl(r.source, { record: r.id })}">Ato, alterações e sistemas relacionados →</a>${safeLink(r.officialUrl, 'Fonte oficial', 'btn')}</div></article>`).join('') || '<p class="notice portal-inline-empty">Nenhuma referência carregada para este assunto. Consulte a cobertura regulatória antes de concluir que há dispensa.</p>'}</div></section>`;
      })
      .join(
        '',
      )}<p class="scope-note">Mapa de consulta dos requisitos localizados nas fontes. Ele não substitui projeto de etiqueta, aprovação do organismo competente ou conferência de todas as normas aplicáveis. Registros sem confirmação e fontes não localizadas permanecem fora da consulta ativa.</p>`;
}
