'use strict';
const regulatoryLegalLabels = {
  indicated_current: 'Indicada nas fontes',
  partially_repealed: 'Revogação parcial — conferir dispositivos',
  official_current_reference: 'Não confirmada integralmente',
};
const regulatoryReviewLabels = {
  reference_only: 'Referência e orientação oficiais',
  directed_text_review: 'Revisão dirigida do texto',
  index_review: 'Índice e anotações oficiais',
};
function regulatoryStatusSummary(record) {
  if (!record.legalStatus) return '';
  return `<dl class="regulatory-state-grid" aria-label="Vigência, revisão e aplicabilidade"><div><dt>Vigência</dt><dd>${esc(regulatoryLegalLabels[record.legalStatus.state] || 'A conferir')}</dd></div><div><dt>Revisão</dt><dd>${esc(regulatoryReviewLabels[record.reviewStatus.state] || 'A conferir')}</dd></div><div><dt>Aplicabilidade</dt><dd>Avaliar categoria e projeto</dd></div><div><dt>Publicação</dt><dd>${record.publication?.included ? 'Incluída no acervo de referência' : 'Fora da consulta publicada'}</dd></div></dl>`;
}
