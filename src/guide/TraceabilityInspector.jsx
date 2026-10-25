import React, { useEffect, useState } from 'react';

const reviewLabel = (record) =>
  record.reviewStatus?.fullTextReviewed === false
    ? 'Íntegra pendente'
    : record.reviewStatus?.state === 'directed_text_review'
      ? 'Revisão dirigida'
      : record.reviewStatus?.state === 'reference_only'
        ? 'Referência oficial'
        : 'Consultar profundidade de revisão';
const profileValues = {
  ice: 'Combustão',
  hev: 'Híbrido HEV',
  phev: 'Híbrido PHEV',
  bev: 'Elétrico BEV',
  general: 'Geral · detalhar aplicação',
  urban: 'Exclusivamente urbano',
  school: 'Escolar',
  oem: 'Montagem original',
  replacement: 'Reposição',
  national: 'Nacional',
  imported: 'Importado',
  series: 'Série',
  limited: 'Quantidades limitadas',
  modification: 'Modificação',
  component: 'Componente',
  flex: 'Flex',
  gasoline: 'Gasolina',
  diesel: 'Diesel',
  electric: 'Eletricidade',
};
function TraceRecord({ record, bridge }) {
  return (
    <article className="g-trace-record">
      <div className="g-trace-record-head">
        <span className="g-tag">{record.agency || 'Fonte do acervo'}</span>
        <span className="g-trace-state">{reviewLabel(record)}</span>
      </div>
      <button className="g-reference" onClick={() => bridge.openRecord(record.id)}>
        <strong>{record.title}</strong>
        <span aria-hidden="true">↗</span>
      </button>
      <div className="g-trace-meta">
        <span>{record.statusLabel || 'Indicação jurídica na ficha'}</span>
        <span>Conferência: {record.reviewedAt || 'Data não estruturada'}</span>
      </div>
      {record.provisions?.length > 0 && (
        <div className="g-trace-provisions">
          {record.provisions.map((p) => (
            <div key={p.id}>
              <strong>{p.reference || 'Dispositivo a conferir na fonte'}</strong>
              <p>{typeof p.rule === 'string' ? p.rule : p.rule?.summary || p.title}</p>
              {p.scope && (
                <p>
                  <strong>Âmbito:</strong> {p.scope}
                </p>
              )}
              <code>{p.requirementId}</code>
            </div>
          ))}
        </div>
      )}
      {record.requirementIds?.length > 0 && !record.provisions?.length && (
        <p className="g-note">
          IDs vinculados: {record.requirementIds.join(' · ')}. Detalhes ainda não disponíveis.
        </p>
      )}
      <details className="g-trace-limits">
        <summary>Condições, evidências e limites</summary>
        <p>A aplicação depende da categoria, configuração, datas e exceções do projeto.</p>
        {record.applicability?.conditions?.length > 0 && (
          <ul>
            {record.applicability.conditions.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        )}
        {record.limits?.length > 0 && (
          <ul>
            {record.limits.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        )}
        <p className="g-note">
          {record.requirementIds?.length
            ? record.requirementIds.length + ' requisito(s) individual(is) vinculado(s).'
            : 'Vínculo ao ato; não há requisito individual estruturado neste conjunto.'}
        </p>
        {record.mappingEvidence?.map((e, i) => (
          <p className="g-trace-origin" key={i}>
            <code>{e.legacyPartId}</code> → <code>{e.topicId}</code>
            {e.basis && <span>{e.basis}</span>}
          </p>
        ))}
      </details>
      {record.officialUrl && (
        <a
          className="g-text-button"
          href={record.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Consultar fonte oficial ↗
        </a>
      )}
    </article>
  );
}
export default function TraceabilityInspector({ part, profile, bridge }) {
  const [trace, setTrace] = useState(() => bridge.traceability(part, profile));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setTrace(bridge.traceability(part, profile));
    setLoading(true);
    setError('');
    bridge
      .loadTraceability(part, profile)
      .then((value) => {
        if (active) setTrace(value);
      })
      .catch(() => {
        if (active) {
          setTrace(bridge.traceability(part, profile));
          setError('Parte dos detalhes não carregou. Os vínculos revisados continuam disponíveis.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [part, profile, bridge, retry]);
  return (
    <section className="g-traceability" aria-label="Rastreabilidade normativa do conjunto">
      <div className="g-trace-heading">
        <div>
          <span className="g-eyebrow">MODELO → CONJUNTO → DISPOSITIVO → FONTE</span>
          <h3>Rastreabilidade das referências</h3>
        </div>
        <span className="g-tag">
          {trace.counts.acts} atos · {trace.counts.requirements} requisitos vinculados
        </span>
      </div>
      <details className="g-trace-conditions">
        <summary>Condições do projeto a confrontar com os dispositivos</summary>
        <p>
          Dados informados no perfil. Nenhuma obrigação é confirmada apenas pela seleção no modelo.
        </p>
        <dl>
          {trace.conditions.map((condition) => (
            <div key={condition.field}>
              <dt>{condition.label}</dt>
              <dd>
                {condition.state === 'not_informed'
                  ? 'Não informado'
                  : typeof condition.value === 'boolean'
                    ? condition.value
                      ? 'Sim'
                      : 'Não'
                    : profileValues[condition.value] || String(condition.value)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <div className="g-trace-layout">
        <aside className="g-trace-reference">
          <a href="#vehicle" aria-label="Abrir prancha original do veículo">
            <img
              src={trace.referenceImage}
              alt={'Referência do site original: ' + part.label}
              loading="lazy"
            />
          </a>
          <span className="g-tag">REFERÊNCIA DO SITE ORIGINAL</span>
          <p>{part.label}</p>
          <small>Conjunto visual ligado às associações revisadas da prancha original.</small>
          <details>
            <summary>Conjuntos de origem</summary>
            {trace.visual.referenceImages.map((ref) => (
              <a
                key={ref.legacyPartId}
                href={'#vehicle?part=' + encodeURIComponent(ref.legacyPartId)}
              >
                <code>{ref.legacyPartId}</code>
              </a>
            ))}
          </details>
        </aside>
        <div className="g-trace-relations">
          {loading && (
            <p className="g-note" role="status">
              Carregando dispositivos e evidências do conjunto…
            </p>
          )}
          {error && (
            <p className="g-note" role="status">
              {error}{' '}
              <button className="g-text-button" onClick={() => setRetry((x) => x + 1)}>
                Tentar novamente
              </button>
            </p>
          )}
          {trace.relations.map((relation) => (
            <section className="g-trace-relation" key={relation.kind} data-relation={relation.kind}>
              <h4>
                <span className={'g-relation-dot g-relation-' + relation.kind} />
                {relation.label}
              </h4>
              <p className="g-note">
                {relation.kind === 'component'
                  ? 'Referências explicitamente associadas aos conjuntos selecionados.'
                  : 'Requisitos ou referências que dependem do veículo completo e da configuração.'}
              </p>
              {relation.topics.map((topic, topicIndex) => (
                <details className="g-trace-topic" key={topic.id} open={topicIndex === 0}>
                  <summary>
                    <span>{topic.label}</span>
                    <small>
                      {topic.lane === 'ambiental' ? 'Ambiental' : 'Segurança'} ·{' '}
                      {topic.records.length} atos
                    </small>
                  </summary>
                  {topic.records.map((record) => (
                    <TraceRecord key={record.canonicalId} record={record} bridge={bridge} />
                  ))}
                  {topic.gaps.map((gap, i) => (
                    <p key={i} className="g-trace-gap">
                      {gap}
                    </p>
                  ))}
                </details>
              ))}
            </section>
          ))}
          {trace.gaps.map((gap, i) => (
            <p className="g-trace-gap" key={i}>
              {gap}
            </p>
          ))}
        </div>
      </div>
      <p className="g-trace-assessment">
        A seleção recupera referências; a decisão de aplicabilidade continua pendente de revisão do
        perfil técnico. O SUV de referência não certifica a conformidade do projeto.
      </p>
    </section>
  );
}
