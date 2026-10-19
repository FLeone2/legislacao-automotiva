'use strict';
async function renderMarkings() {
  $('#main').innerHTML =
    '<h1>Etiquetas, selos e VIN</h1><p role="status">Carregando as referências…</p>';
  const results = await Promise.allSettled(Object.keys(regulatoryConfig).map(loadRegulations));
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
    `<div class="eyebrow">Identificação e rastreabilidade</div><h1>Etiquetas, selos e VIN</h1><p class="subtitle">Veja qual marcação pertence ao veículo, ao componente ou ao equipamento de telecomunicações.</p><p><a class="btn" href="#vehicle?component=identificacao&subsystem=identificacao%2Frotulagem">Explorar no veículo →</a></p>${unavailable ? '<p class="notice" role="alert">Uma fonte não carregou. Os resultados abaixo estão incompletos. <button class="btn" data-markings-retry>Tentar novamente</button></p>' : ''}<nav class="regulatory-phases" aria-label="Assuntos de identificação">${groups.map((g) => `<button class="btn" data-markings-section="${g.id}">${g.label}</button>`).join('')}</nav>${groups
      .map((g) => {
        const rows = all.filter((r) => r.requirements?.some((x) => x.topics?.includes(g.id)));
        return `<section id="markings-${g.id}" class="markings-group"><h2>${g.label}</h2><p>${g.text}</p>${rows.map((r) => `<article class="contran-record" data-marking-record="${esc(r.id)}"><div class="eyebrow">${esc(regulatoryConfig[r.source].label)}</div><h3>${esc(r.title || 'Resolução CONTRAN nº ' + r.number + '/' + r.year)}</h3>${regulatoryRequirements(r, [g.id])}<div class="actions"><a class="btn" href="${regulatoryUrl(r.source, { record: r.id })}">Ato, alterações e sistemas relacionados →</a>${safeLink(r.officialUrl, 'Fonte oficial', 'btn')}</div></article>`).join('') || '<p class="notice">Nenhuma referência carregada para este assunto.</p>'}</section>`;
      })
      .join(
        '',
      )}<p class="scope-note">Mapa de consulta dos requisitos localizados nas fontes. Ele não substitui projeto de etiqueta, aprovação do organismo competente ou conferência de todas as normas aplicáveis. Registros sem confirmação e fontes não localizadas permanecem fora da consulta ativa.</p>`;
}
