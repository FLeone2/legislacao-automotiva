'use strict';
function documentConsultationLinks(record) {
  const components = vehicleComponents.filter(
    (c) =>
      (record.vehicleLinks || []).some((l) => l.componentId === c.id) ||
      componentMatches(record, c.taxonomy),
  );
  return `<section class="document-consultation-links"><h3>Explore o assunto</h3><div class="consultation-shortcuts">${components.map((c) => `<a class="btn" data-close-reference href="${esc(vehicleLink(c))}">${esc(c.label)} →</a>`).join('')}<a class="btn" data-close-reference href="#flow">Etapas de homologação →</a></div><p class="scope-note">Os vínculos organizam a consulta por assunto; não confirmam aplicação automática ao veículo.</p></section>`;
}

async function openNorm(id, requirementId = null) {
  let r = catalog.records.find((x) => x.id === id);
  if (!r) return;
  if (r._summary && r.regulatorySource) {
    try {
      await loadRegulationRecord(r.regulatorySource, r.regulatoryId);
      r = catalog.records.find((x) => x.id === id);
    } catch {
      $('#dialogContent').innerHTML =
        `<h2 id="normDialogTitle">Detalhes indisponíveis</h2><p role="alert">Não foi possível carregar esta referência.</p><button class="btn" data-open="${esc(id)}">Tentar novamente</button>`;
      if (!$('#normDialog').open) $('#normDialog').showModal();
      return;
    }
  }
  $('#dialogContent').innerHTML =
    `<span class="tag">${esc(r.issuer || r.agency)}</span><h2 id="normDialogTitle">${esc(r.title)}</h2><div class="notice">${esc(r.status)}<br>${esc(r.legalApplicability)}</div><p>${esc(r.summary)}</p>${regulatoryStatusSummary(r)}${regulatoryRequirements(r)}${documentConsultationLinks(r)}<dl><dt>Disponibilidade</dt><dd>${esc(r.availability)}</dd><dt>Origem e conferência do registro</dt><dd>Registro organizado em ${esc(r.reviewDate)} · referência oficial abaixo</dd><dt>Associação temática</dt><dd>${esc((r.taxonomy || []).map(systemLabel).join(' · '))}<br>${esc(r.classificationBasis)}</dd><dt>Alterações referenciadas</dt><dd>${esc((r.amendingRefs || []).join(' · ') || 'Nenhuma referência extraída deste registro. Isso não comprova ausência de alterações.')}</dd><dt>Limites de verificação</dt><dd>${esc((r.uncertaintyNotes || []).join(' '))}</dd></dl><div class="actions">${safeLink(r.officialUrl, 'Fonte oficial', 'btn primary')}${contranRecordLink(r)}</div><p class="scope-note">Abertura da fonte oficial em nova aba. Alguns portais podem exigir navegação ou verificação adicional.</p>`;
  if (!$('#normDialog').open) $('#normDialog').showModal();
  if (requirementId)
    document.getElementById('requirement-' + requirementId)?.scrollIntoView({ block: 'center' });
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-reference]')) $('#normDialog').close();
});
