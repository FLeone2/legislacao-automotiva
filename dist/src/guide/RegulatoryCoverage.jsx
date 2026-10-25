import React, { useEffect, useMemo, useState } from 'react';

const SEVERITIES = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  info: 'Informativa',
};
const STATUSES = {
  open: 'Em aberto',
  fixed: 'Correção aplicada',
  candidate: 'Candidato à revisão',
  access_blocked: 'Fonte com acesso impedido',
  requires_review: 'Revisão necessária',
};
const rows = (value) => (Array.isArray(value) ? value : []);
const number = (value) =>
  typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('pt-BR').format(value)
    : '—';

function date(value) {
  const parsed = typeof value === 'string' ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(parsed)
    : null;
}

function safeHref(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value, 'https://local.invalid/');
    return ['https:', 'http:'].includes(parsed.protocol) ? value : null;
  } catch {
    return null;
  }
}

function Sources({ items }) {
  const sources = rows(items).filter((item) => safeHref(item?.url));
  return sources.length ? (
    <ul className="g-coverage-sources" aria-label="Fontes deste ponto">
      {sources.map((source, index) => (
        <li key={source.url + index}>
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.label || 'Consultar fonte'}
          </a>
        </li>
      ))}
    </ul>
  ) : null;
}

function Metric({ value, label, detail }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <strong>{number(value)}</strong>
        <small>{detail}</small>
      </dd>
    </div>
  );
}

function Subsystem({ item }) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  params.set('tab', 'explore');
  params.set('part', item.assemblyId || '');
  params.set('subsystem', item.id || '');
  params.set('tree', 'subsystems');
  return (
    <details className="g-coverage-subsystem">
      <summary>
        <span>{item.label || item.id || 'Subsistema'}</span>
        <small>
          {Array.isArray(item.actIds) ? number(item.actIds.length) : '—'} atos ·{' '}
          {Array.isArray(item.requirementIds) ? number(item.requirementIds.length) : '—'} itens
        </small>
      </summary>
      <div>
        {rows(item.gaps).length > 0 ? (
          <ul className="g-coverage-gaps">
            {item.gaps.map((gap, index) => (
              <li key={index}>{typeof gap === 'string' ? gap : gap.detail || gap.label}</li>
            ))}
          </ul>
        ) : (
          <p>
            Os vínculos registrados servem à consulta. A avaliação de aplicabilidade continua
            dependente do projeto e das evidências do caso.
          </p>
        )}
        {item.assemblyId && item.id && (
          <a className="g-text-button" href={'#guide?' + params}>
            Ver este subsistema no veículo
          </a>
        )}
      </div>
    </details>
  );
}

export default function RegulatoryCoverage({ src = 'data/process/regulatory-coverage.json' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(false);
    fetch(src, { signal: controller.signal, cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error('coverage');
        return response.json();
      })
      .then((result) => {
        if (!result || typeof result.summary !== 'object' || !Array.isArray(result.agencies))
          throw new Error('coverage-schema');
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [src, attempt]);

  const findings = rows(data?.findings);
  const severityOptions = [...new Set(findings.map((finding) => finding.severity).filter(Boolean))];
  const statusOptions = [...new Set(findings.map((finding) => finding.status).filter(Boolean))];
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return findings.filter(
      (finding) =>
        (severity === 'all' || finding.severity === severity) &&
        (status === 'all' || finding.status === status) &&
        (!term ||
          [finding.title, finding.detail, finding.action, ...rows(finding.affectedIds)]
            .join(' ')
            .toLocaleLowerCase('pt-BR')
            .includes(term)),
    );
  }, [data, search, severity, status]);

  if (error)
    return (
      <section className="g-coverage g-coverage-empty" data-coverage-state="error">
        <h2>Diagnóstico indisponível</h2>
        <p role="alert">Não foi possível carregar a qualidade do acervo. Tente novamente.</p>
        <button className="g-button" type="button" onClick={() => setAttempt((value) => value + 1)}>
          Tentar novamente
        </button>
      </section>
    );
  if (!data)
    return (
      <section className="g-coverage g-coverage-empty" data-coverage-state="loading">
        <h2>Cobertura regulatória</h2>
        <p role="status">Carregando o diagnóstico e seus vínculos…</p>
      </section>
    );

  const summary = data.summary || {};
  const generated = date(data.asOf);
  const monitoring = data.monitoring;
  const observed = date(monitoring?.observedAt);
  const attempted =
    typeof monitoring?.selectedUrls === 'number' &&
    typeof monitoring?.unattemptedUrls === 'number' &&
    monitoring.selectedUrls >= monitoring.unattemptedUrls
      ? monitoring.selectedUrls - monitoring.unattemptedUrls
      : null;
  const knowledgeLinks = [
    [data.knowledge?.indexUrl, 'Consultar o índice em Markdown'],
    [data.knowledge?.manifestUrl, 'Abrir o inventário para consulta por IA'],
    [data.knowledge?.auditUrl, 'Consultar o relatório do checkup'],
  ].filter(([url]) => safeHref(url));

  return (
    <section className="g-coverage" data-coverage-state="ready" aria-labelledby="g-coverage-title">
      <header className="g-coverage-heading">
        <div>
          <h2 id="g-coverage-title">Cobertura regulatória</h2>
          <p>O que foi cadastrado, o que tem evidência e o que ainda precisa de revisão.</p>
        </div>
        {generated && <p className="g-coverage-date">Diagnóstico de {generated}</p>}
      </header>

      <dl className="g-coverage-metrics">
        <Metric
          value={summary.acts}
          label="Atos cadastrados"
          detail="No universo deste diagnóstico"
        />
        <Metric
          value={summary.publicTextExcerpts}
          label="Trechos de atos públicos"
          detail="Itens estruturados a partir de texto público"
        />
        <Metric
          value={summary.officialGuidanceItems}
          label="Orientações oficiais"
          detail="Distintas dos requisitos de um ato"
        />
        <Metric
          value={summary.sources}
          label="Fontes de revisão dirigida"
          detail="Além dos localizadores dos atos"
        />
      </dl>

      <aside className="g-coverage-scope" aria-labelledby="g-coverage-scope-title">
        <h3 id="g-coverage-scope-title">Como interpretar a cobertura</h3>
        {data.scopeNote && <p>{data.scopeNote}</p>}
        <p>
          A quantidade de registros não comprova cobertura de todas as obrigações. Cadastro,
          publicação, profundidade de revisão e aplicabilidade ao veículo são avaliações distintas.
          O enquadramento depende da configuração e da data do processo.
        </p>
        <p>
          Os {number(summary.requirements)} itens estruturados incluem trechos de atos e orientações
          oficiais. Eles não são uma contagem de obrigações aplicáveis ao seu projeto.
        </p>
      </aside>

      <section className="g-coverage-section" aria-labelledby="g-coverage-agencies-title">
        <h3 id="g-coverage-agencies-title">Profundidade por órgão</h3>
        <p>
          Leitura da íntegra e revisão da cadeia de alterações permanecem identificadas
          separadamente.
        </p>
        <div
          className="g-coverage-table-scroll"
          role="region"
          aria-label="Revisão por órgão"
          tabIndex={0}
        >
          <table className="g-coverage-table">
            <thead>
              <tr>
                <th scope="col">Órgão</th>
                <th scope="col">Atos</th>
                <th scope="col">Itens estruturados</th>
                <th scope="col">Íntegra revisada</th>
                <th scope="col">Cadeia revisada</th>
                <th scope="col">Parcial ou desconhecida</th>
              </tr>
            </thead>
            <tbody>
              {data.agencies.map((agency) => (
                <tr key={agency.id || agency.label}>
                  <th scope="row">{agency.label || agency.id}</th>
                  <td>{number(agency.acts)}</td>
                  <td>{number(agency.requirements)}</td>
                  <td>{number(agency.fullTextReviewed)}</td>
                  <td>{number(agency.chainReviewed)}</td>
                  <td>{number(agency.unknownOrPartial)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="g-coverage-footnote">
          “—” indica dado não estruturado. As colunas de revisão não devem ser somadas como etapas
          concluídas.
        </p>
      </section>

      {monitoring && (
        <section className="g-coverage-section" aria-labelledby="g-coverage-monitor-title">
          <h3 id="g-coverage-monitor-title">Observação das fontes</h3>
          {monitoring.scopeNote && <p>{monitoring.scopeNote}</p>}
          {observed && <p className="g-coverage-footnote">Rodada observada em {observed}</p>}
          <dl className="g-coverage-monitoring">
            <div>
              <dt>URLs tentadas</dt>
              <dd>{number(attempted)}</dd>
            </div>
            <div>
              <dt>Respostas aceitas</dt>
              <dd>{number(monitoring.acceptedUrls)}</dd>
            </div>
            <div>
              <dt>Não validadas</dt>
              <dd>{number(monitoring.unverifiedUrls)}</dd>
            </div>
            <div>
              <dt>Ainda sem tentativa</dt>
              <dd>{number(monitoring.unattemptedUrls)}</dd>
            </div>
          </dl>
          <p className="g-coverage-footnote">
            {number(monitoring.selectedUrls)} URLs selecionadas para esta rodada. As contagens
            descrevem acesso e transferência; a revisão do conteúdo e dos efeitos jurídicos é
            registrada separadamente.
          </p>
          {monitoring.schedulerNote && (
            <p className="g-coverage-scheduler">{monitoring.schedulerNote}</p>
          )}
          <div className="g-coverage-monitor-links">
            {safeHref(monitoring.snapshotUrl) && (
              <a
                className="g-text-button"
                href={monitoring.snapshotUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar a rodada de observação
              </a>
            )}
            {safeHref(monitoring.workflowUrl) && (
              <a
                className="g-text-button"
                href={monitoring.workflowUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver o monitoramento no GitHub
              </a>
            )}
          </div>
        </section>
      )}

      <section className="g-coverage-section" aria-labelledby="g-coverage-findings-title">
        <h3 id="g-coverage-findings-title">Pontos da auditoria</h3>
        <div className="g-coverage-filters">
          <div className="g-coverage-field">
            <label htmlFor="g-coverage-search">Buscar no diagnóstico</label>
            <input
              id="g-coverage-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Assunto, ato ou vínculo"
            />
          </div>
          <div className="g-coverage-field">
            <label htmlFor="g-coverage-severity">Prioridade</label>
            <select
              id="g-coverage-severity"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
            >
              <option value="all">Todas as prioridades</option>
              {severityOptions.map((value) => (
                <option key={value} value={value}>
                  {SEVERITIES[value] || value}
                </option>
              ))}
            </select>
          </div>
          <div className="g-coverage-field">
            <label htmlFor="g-coverage-status">Situação</label>
            <select
              id="g-coverage-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Todas as situações</option>
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {STATUSES[value] || value}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="g-coverage-result-count" role="status">
          {filtered.length} de {findings.length} pontos listados
        </p>
        <div className="g-coverage-findings">
          {filtered.map((finding, index) => (
            <article className="g-coverage-finding" key={finding.id || index}>
              <div className="g-coverage-finding-state">
                {finding.severity && (
                  <span data-severity={finding.severity}>
                    Prioridade{' '}
                    {SEVERITIES[finding.severity]?.toLocaleLowerCase('pt-BR') || finding.severity}
                  </span>
                )}
                {finding.status && <span>{STATUSES[finding.status] || finding.status}</span>}
              </div>
              <h4>{finding.title}</h4>
              {finding.detail && <p>{finding.detail}</p>}
              {finding.action && (
                <p className="g-coverage-action">
                  <strong>Encaminhamento</strong> {finding.action}
                </p>
              )}
              <Sources items={finding.sourceUrls} />
            </article>
          ))}
          {!filtered.length && (
            <p className="g-coverage-no-results">
              Nenhum ponto corresponde aos filtros. Tente outro assunto ou amplie a situação e a
              prioridade.
            </p>
          )}
        </div>
      </section>

      <section className="g-coverage-section" aria-labelledby="g-coverage-subsystems-title">
        <h3 id="g-coverage-subsystems-title">Vínculos por subsistema</h3>
        <p>
          {number(summary.originalSubsystems)} identificações originais e{' '}
          {number(summary.supplementalSubsystems)} complementares. Os números abaixo representam
          associações registradas; cada aplicação exige avaliação do caso.
        </p>
        <div className="g-coverage-subsystems">
          {rows(data.subsystems).map((item) => (
            <Subsystem key={item.id} item={item} />
          ))}
        </div>
      </section>

      {knowledgeLinks.length > 0 && (
        <section
          className="g-coverage-section g-coverage-knowledge"
          aria-labelledby="g-coverage-knowledge-title"
        >
          <h3 id="g-coverage-knowledge-title">Base para consulta por IA</h3>
          <p>
            Referências com identidade, fonte e limites de revisão para acompanhar cada resposta até
            a evidência.
          </p>
          <div>
            {knowledgeLinks.map(([url, label]) => (
              <a
                className="g-text-button"
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
