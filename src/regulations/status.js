'use strict';
const regulatoryLegalLabels = {
  indicated_current: 'Indicada nas fontes',
  partially_repealed: 'Revogação parcial — conferir dispositivos',
  official_current_reference: 'Não confirmada integralmente',
  repealed: 'Revogada · registro histórico',
  revoked: 'Revogada · registro histórico',
};
const regulatoryReviewLabels = {
  reference_only: 'Referência e orientação oficiais',
  directed_text_review: 'Revisão dirigida do texto',
  index_review: 'Índice e anotações oficiais',
};
function regulatoryStatusSummary(record) {
  if (!record.legalStatus) return '';
  const review = record.reviewStatus || {};
  const reviewScope = review.scope || review.reviewScope;
  const scope = Array.isArray(reviewScope) ? reviewScope.join(' · ') : reviewScope;
  return `<dl class="regulatory-state-grid" aria-label="Vigência, revisão e aplicabilidade"><div><dt>Vigência</dt><dd>${esc(regulatoryLegalLabels[record.legalStatus.state] || 'A conferir')}</dd></div><div><dt>Revisão</dt><dd>${esc(regulatoryReviewLabels[review.state] || 'A conferir')}${review.reviewedAt ? `<small>Conferência: ${esc(review.reviewedAt)}</small>` : ''}</dd></div><div><dt>Aplicabilidade</dt><dd>Avaliar categoria e projeto</dd></div><div><dt>Publicação</dt><dd>${record.publication?.included ? 'Incluída no acervo de referência' : 'Fora da consulta atual'}</dd></div></dl>${!record._summary && (scope || review.summary) ? `<p class="scope-note">${esc(scope || review.summary)}</p>` : ''}${regulatoryTimeline(record)}${!record._summary ? regulatoryConsultation(record) : ''}`;
}

function regulatoryMilestoneState(
  flag,
  asOf = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(flag.date || '') || !/^\d{4}-\d{2}-\d{2}$/.test(asOf))
    return null;
  const date = new Date(flag.date + 'T12:00:00Z');
  const now = new Date(asOf + 'T12:00:00Z');
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== flag.date ||
    !Number.isFinite(now.getTime()) ||
    now.toISOString().slice(0, 10) !== asOf
  )
    return null;
  const days = Math.round((date - now) / 86400000);
  return {
    days,
    state: days < 0 ? 'past' : days === 0 ? 'today' : days <= 30 ? 'upcoming' : 'future',
    label:
      days < 0
        ? 'Data passada'
        : days === 0
          ? 'Hoje'
          : days <= 30
            ? `Em ${days} ${days === 1 ? 'dia' : 'dias'}`
            : 'Data futura',
  };
}

function regulatoryTimeline(record) {
  const flags = (record.temporalFlags || []).filter(
    (flag) => flag.date && regulatoryMilestoneState(flag),
  );
  if (!flags.length) return '';
  return `<section class="regulatory-timeline" aria-label="Marcos e condições temporais"><h3>Datas e condições</h3><ul>${flags
    .map((flag) => {
      const state = regulatoryMilestoneState(flag);
      const conditions = [
        ...new Set([
          ...(typeof flag.scope === 'string' ? [flag.scope] : flag.scope?.conditions || []),
          ...(flag.conditions || []),
        ]),
      ];
      const categories = flag.scope?.categories || [];
      return `<li data-temporal-id="${esc(flag.id)}"><div><time datetime="${esc(flag.date)}">${esc(flag.date.split('-').reverse().join('/'))}</time><span class="temporal-state ${state.state}">${esc(state.label)}</span></div><strong>${esc(flag.label || flag.note || 'Marco do dispositivo')}</strong>${categories.length ? `<p>${esc(categories.join(' · '))}</p>` : ''}${conditions.length ? `<ul>${conditions.map((condition) => `<li>${esc(condition)}</li>`).join('')}</ul>` : ''}${safeLink(flag.source?.url || flag.sourceUrl, esc(flag.source?.clause || flag.clause || 'Fonte deste marco'))}</li>`;
    })
    .join(
      '',
    )}</ul><p class="scope-note">Cada data se refere às condições indicadas. Ela não determina, isoladamente, a situação do ato ou de um veículo.</p></section>`;
}

function regulatoryConsultation(record) {
  const consultation = record.consultation || {};
  const tracks = record.consultationTracks || [];
  const conditions = consultation.conditions || [];
  const exclusions = consultation.exclusions || [];
  const limitations = consultation.limitations || [];
  const sources = consultation.sources || [];
  if (!consultation.summary && !conditions.length && !tracks.length) return '';
  return `<section class="regulatory-consultation"><h3>Escopo da consulta</h3>${consultation.summary ? `<p>${esc(consultation.summary)}</p>` : ''}${conditions.length ? `<ul>${conditions.map((condition) => `<li>${esc(condition)}</li>`).join('')}</ul>` : ''}${exclusions.length ? `<details><summary>Exceções e exclusões</summary><ul>${exclusions.map((condition) => `<li>${esc(condition)}</li>`).join('')}</ul></details>` : ''}${tracks
    .map(
      (track) =>
        `<details data-consultation-track="${esc(track.id)}"><summary>${esc(track.label)}</summary><p>${esc(track.scope)}</p>${track.reviewGaps?.length ? `<ul>${track.reviewGaps.map((gap) => `<li>${esc(gap)}</li>`).join('')}</ul>` : ''}${(
          track.relatedRecordIds || []
        )
          .map((id) => {
            const related = typeof catalogRecord === 'function' ? catalogRecord(catalog, id) : null;
            return related && related.publication?.included !== false
              ? `<button class="btn" data-open="${esc(related.id)}">${esc(related.title)} →</button>`
              : '';
          })
          .join('')}</details>`,
    )
    .join(
      '',
    )}${sources.length ? `<details><summary>Dispositivos e fontes deste resumo</summary>${sources.map((source) => `<p>${safeLink(source.url || source.sourceUrl, esc(source.clause || 'Fonte oficial'))}</p>${source.excerpt ? `<blockquote>${esc(source.excerpt)}</blockquote>` : ''}`).join('')}</details>` : ''}${limitations.length ? `<p class="scope-note">${esc(limitations.join(' '))}</p>` : ''}</section>`;
}

if (typeof module !== 'undefined') module.exports = { regulatoryMilestoneState };
