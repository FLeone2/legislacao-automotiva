import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import prototypeCatalog from './catalog.js';
import { askPrototype, getPrototypeAssistantStatus } from './assistant.js';
import { loadPrototypeWorkflow, buildWorkflow, getWorkflowTree } from './workflow.js';
import './prototype.css';

const { loadPrototypeCatalog, getSelectionReferences } = prototypeCatalog;
const STORAGE_KEY = 'prototype-project-v1';
const NAV = [
  ['ia', 'IA'],
  ['veiculo', 'Veículo'],
  ['homologacao', 'Homologação'],
];
const ROUTE_ALIASES = {
  assistente: 'ia',
  mapa: 'homologacao',
  arvore: 'homologacao',
  biblioteca: 'homologacao',
};
const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODEL_LABELS = {
  [DEFAULT_MODEL]: 'Llama 3.3 70B',
  '@cf/mistralai/mistral-small-3.1-24b-instruct': 'Mistral Small 3.1',
};
const CATEGORY_OPTIONS = [
  '',
  'M1',
  'M2',
  'M3',
  'N1',
  'N2',
  'N3',
  'O1',
  'O2',
  'O3',
  'O4',
  'L1',
  'L2',
  'L3',
  'L4',
  'L5',
  'L6',
  'L7',
];
const PROPULSIONS = [
  ['', 'Não definida'],
  ['combustion', 'Combustão'],
  ['hev', 'Híbrido (HEV)'],
  ['phev', 'Híbrido plug-in (PHEV)'],
  ['bev', 'Elétrico (BEV)'],
];

function Icon({ name, size = 20, ...props }) {
  const paths = {
    car: 'M5 7 7 3h10l2 4M3 8h18v9H3zM6 17v3M18 17v3M6 12h2M16 12h2',
    chevron: 'm9 5 7 7-7 7',
    down: 'm6 9 6 6 6-6',
    close: 'm6 6 12 12M18 6 6 18',
    search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-1 5 6 6',
    external: 'M14 3h7v7M21 3 10 14M10 5H4v15h15v-6',
    document: 'M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6',
    settings: 'M3 6h3m4 0h11M3 12h11m4 0h3M3 18h5m4 0h9M6 3v6M14 9v6M8 15v6',
    focus: 'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    reset: 'M3 9a9 9 0 1 1 1 9M3 3v6h6',
    cube: 'm12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    send: 'M12 20V4m-6 6 6-6 6 6',
    back: 'M20 12H4m6-6-6 6 6 6',
    check: 'm5 12 4 4L19 6',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    tree: 'M5 3v15h14M5 8h12M5 13h12M17 6v4M17 11v4M19 16v4',
    profile: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.document} />
    </svg>
  );
}
function asArray(value) {
  return Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : Object.values(value || {});
}
function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}
function parseRoute() {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query || '');
  return {
    view: NAV.some(([id]) => id === path) ? path : ROUTE_ALIASES[path] || 'ia',
    part: params.get('part') || '',
    subsystem: params.get('subsystem') || '',
    node: params.get('node') || '',
    stage: params.get('stage') || '',
    branch: params.get('branch') || '',
  };
}
function assetLink(url) {
  return url && !/^(?:https?:|\/)/.test(url) ? `/${url}` : url;
}
function officialLink(record) {
  return assetLink(record?.pdfUrl || record?.officialUrl || record?.url || record?.href);
}
function searchable(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function concise(value, limit = 180) {
  const text = typeof value === 'string' ? value : '';
  return text.length > limit ? `${text.slice(0, limit).replace(/\s+\S*$/, '')}…` : text;
}
function statusText(value) {
  const labels = {
    indicated_current: 'Vigência indicada no acervo',
    indicated_revoked: 'Revogação indicada',
    partially_repealed: 'Revogação parcial indicada',
    partially_revoked: 'Revogação parcial indicada',
    partial_revocation: 'Revogação parcial indicada',
    official_current_reference: 'Referência atual na fonte oficial',
    reference_only: 'Referência de consulta',
    index_review: 'Índice consultado; íntegra não revisada',
    directed_text_review: 'Revisão dirigida de trechos',
    verified_pdf: 'Cópia do PDF oficial conferida',
    official_source_only: 'Fonte oficial',
    unknown: 'Não informado',
    requires_assessment: 'Depende do enquadramento',
  };
  if (value == null) return 'Não informado';
  if (typeof value === 'string')
    return labels[value] || (value.includes('_') ? 'Consultar condições na fonte' : value);
  return value.summary || value.label || labels[value.state] || 'Consultar condições na fonte';
}
function normalizeCatalog(raw) {
  return {
    ...raw,
    acts: asArray(raw.acts),
    assemblies: asArray(raw.assemblies),
    subsystems: asArray(raw.subsystems),
    stages: asArray(raw.stages),
    sources: asArray(raw.sources),
    serviceLinks: asArray(raw.serviceLinks),
  };
}
function resolveActs(catalog, ids = []) {
  return [...new Set(ids)]
    .map((id) => catalog.acts.find((act) => act.id === id || act.aliases?.includes(id)))
    .filter(Boolean);
}
function textOf(value) {
  return typeof value === 'string'
    ? value
    : value?.label ||
        value?.title ||
        value?.designation ||
        value?.literal ||
        value?.reference ||
        value?.text ||
        value?.description ||
        value?.rule ||
        value?.purpose ||
        value?.device ||
        '';
}
function humanConditions(value, profileFields = []) {
  if (value == null) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => humanConditions(item, profileFields));
  const aliases = {
    powertrain: 'propulsion',
    massKg: 'grossMassKg',
    usage: 'use',
    componentApplication: 'componentMarket',
  };
  const labels = {
    environmentFamily: 'Família ambiental',
    environmentClass: 'Classe ambiental',
    category: 'Categoria',
    propulsion: 'Propulsão',
    fuel: 'Combustível',
    vehicleType: 'Tipo de veículo',
    grossMassKg: 'PBT / MTMA (kg)',
  };
  const knownValues = {
    environmentFamily: {
      light: 'Veículos leves',
      heavy: 'Veículos pesados',
      promot: 'Motociclos e similares',
      machine: 'Máquinas',
    },
    environmentClass: { LP: 'Leve de passageiros (LP)', LC: 'Leve comercial (LC)' },
    fuel: { ethanol: 'Etanol' },
  };
  const token = (item) => searchable(item).replace(/[\s_-]/g, '');
  const result = [];
  for (const [originalKey, expected] of Object.entries(value)) {
    const key = aliases[originalKey] || originalKey;
    if (key === 'notes') {
      result.push(...asArray(expected).filter((item) => typeof item === 'string'));
      continue;
    }
    if (key === 'requiresAssessment') {
      if (expected === true)
        result.push('Condição a confirmar no perfil e no dispositivo aplicável.');
      continue;
    }
    if (key === 'massRange' && expected && typeof expected === 'object') {
      const rangeKey = aliases[expected.field] || expected.field;
      const field = profileFields.find((field) => field.key === rangeKey);
      const label = field?.label || labels[rangeKey];
      if (!label) continue;
      const bounds = [
        ['minInclusive', 'a partir de'],
        ['minExclusive', 'acima de'],
        ['maxInclusive', 'até'],
        ['maxExclusive', 'abaixo de'],
      ]
        .filter(([name]) => typeof expected[name] === 'number' && Number.isFinite(expected[name]))
        .map(([name, prefix]) => `${prefix} ${expected[name].toLocaleString('pt-BR')}`);
      if (bounds.length) result.push(`${label}: ${bounds.join('; ')}.`);
      continue;
    }
    const field = profileFields.find((field) => field.key === key);
    const label = field?.label || labels[key];
    if (!label) continue;
    const values = asArray(expected)
      .map((item) => {
        const option = field?.options?.find((option) => token(option.value) === token(item));
        if (option) return option.label;
        if (knownValues[key]?.[item]) return knownValues[key][item];
        if (key === 'category' && /^[MNOL][1-7]?$/i.test(String(item)))
          return String(item).toUpperCase();
        if (typeof item === 'boolean') return item ? 'Sim' : 'Não';
        if (typeof item === 'number' && Number.isFinite(item)) return item.toLocaleString('pt-BR');
        return null;
      })
      .filter(Boolean);
    if (values.length) result.push(`${label}: ${values.join(', ')}.`);
  }
  return result;
}
function verificationText(value) {
  const labels = {
    public_service_guidance: 'Orientação pública do serviço.',
    technical_dossier_plan_with_historical_annex_reference:
      'Planejamento do dossiê com referência a anexo histórico.',
    mixed_public_act_and_historical_dossier_reference:
      'Texto público do ato e referência histórica de dossiê.',
    public_act_targeted_provisions: 'Dispositivos do ato público em revisão dirigida.',
  };
  if (Array.isArray(value)) return value.map(verificationText).join(' ');
  const text = textOf(value);
  return labels[text] || (text.includes('_') ? 'Base documental a conferir.' : text);
}

function RecordDetails({ record }) {
  const review = record.reviewStatus || record.review;
  return (
    <details className="prototype-record-details">
      <summary>Detalhes</summary>
      <dl>
        {record.referenceContext && (
          <>
            <dt>Relação</dt>
            <dd>{record.referenceContext}</dd>
          </>
        )}
        {record.contextualTopics?.length > 0 && (
          <>
            <dt>Recorte</dt>
            <dd>{record.contextualTopics.join('; ')}</dd>
          </>
        )}
        {record.agency && (
          <>
            <dt>Órgão</dt>
            <dd>{record.agency}</dd>
          </>
        )}
        {(record.legalStatus || record.legalState) && (
          <>
            <dt>Indicação jurídica</dt>
            <dd>{statusText(record.legalStatus || record.legalState)}</dd>
          </>
        )}
        <dt>Revisão</dt>
        <dd>{statusText(review)}</dd>
        {review && typeof review === 'object' && (
          <>
            <dt>Íntegra revisada</dt>
            <dd>
              {review.fullTextReviewed === true
                ? 'Sim'
                : review.fullTextReviewed === false
                  ? 'Não'
                  : 'Não informada'}
            </dd>
            <dt>Cadeia revisada</dt>
            <dd>
              {review.amendmentChainReviewed === true
                ? 'Sim'
                : review.amendmentChainReviewed === false
                  ? 'Não'
                  : 'Não informada'}
            </dd>
          </>
        )}
      </dl>
      {asArray(record.limitations).map((note, index) => (
        <p key={index}>{textOf(note)}</p>
      ))}
      {record.contextualNotes?.map((note, index) => (
        <p key={index}>{note}</p>
      ))}
      <div className="prototype-document-links">
        {record.officialUrl && record.pdfUrl && (
          <a href={assetLink(record.officialUrl)} target="_blank" rel="noopener noreferrer">
            Publicação oficial <Icon name="external" size={13} />
          </a>
        )}
        {record.markdownPath && (
          <a href={assetLink(record.markdownPath)} target="_blank" rel="noopener noreferrer">
            Ficha em Markdown <Icon name="external" size={13} />
          </a>
        )}
        {record.fullTextMarkdownPath && (
          <a
            href={assetLink(record.fullTextMarkdownPath)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Texto em Markdown
            <Icon name="external" size={13} />
          </a>
        )}
      </div>
    </details>
  );
}
function ActList({ acts = [], limit = 5, empty = 'Nenhuma referência vinculada a esta seleção.' }) {
  const [all, setAll] = useState(false);
  const key = acts.map((act) => act.id).join(',');
  useEffect(() => setAll(false), [key]);
  if (!acts.length) return <p className="prototype-empty">{empty}</p>;
  return (
    <div className="prototype-acts">
      {(all ? acts : acts.slice(0, limit)).map((act) => (
        <article className="prototype-act" key={act.id}>
          {officialLink(act) ? (
            <a
              className="prototype-act-link"
              href={officialLink(act)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${act.title || act.label} — abrir ${act.pdfUrl ? 'PDF oficial' : 'fonte oficial'} em nova aba`}
            >
              <Icon name="document" size={20} />
              <span>
                <strong>{act.title || act.label}</strong>
                <span>{concise(act.contextualDescription || act.description || act.scope)}</span>
              </span>
              <span className="prototype-document-type">
                {act.pdfUrl ? 'PDF' : 'Fonte'}
                <Icon name="external" size={13} />
              </span>
            </a>
          ) : (
            <div className="prototype-act-link">
              <Icon name="document" size={20} />
              <span>
                <strong>{act.title || act.label}</strong>
                <span>{concise(act.description || act.scope)}</span>
              </span>
            </div>
          )}
          <RecordDetails record={act} />
        </article>
      ))}
      {acts.length > limit && (
        <button className="prototype-text-button prototype-more" onClick={() => setAll(!all)}>
          {all ? 'Mostrar menos' : `Ver mais ${acts.length - limit}`}
          <Icon name="down" size={15} />
        </button>
      )}
    </div>
  );
}
function CitedAnswer({ answer }) {
  const citations = new Map((answer.citations || []).map((citation) => [citation.id, citation]));
  const sources = answer.sources || [];
  return (
    <div className="prototype-answer-text">
      {String(answer.answer || '')
        .split(/(\[[^\]\n]+\])/g)
        .map((text, index) => {
          const citation = citations.get(text.slice(1, -1));
          if (!text.startsWith('[') || !citation || !officialLink(citation)) return text;
          const number = sources.findIndex((source) => source.id === citation.id) + 1;
          return (
            <a
              key={index}
              href={officialLink(citation)}
              target="_blank"
              rel="noopener noreferrer"
              title={citation.title}
              aria-label={`Conferir fonte: ${citation.title}`}
            >
              [{number || 'fonte'}]
            </a>
          );
        })}
    </div>
  );
}

function AssistantView({
  profile,
  context,
  assembly,
  subsystem,
  selectedNode,
  stage,
  initialQuestion,
}) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [includeContext, setIncludeContext] = useState(Boolean(context));
  const input = useRef(null);
  const controller = useRef(null);
  useEffect(() => {
    const abort = new AbortController();
    getPrototypeAssistantStatus({ signal: abort.signal })
      .then((value) => {
        setStatus(value);
        if (value.model) setModel(value.model);
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const next = typeof initialQuestion === 'string' ? initialQuestion : initialQuestion?.text;
    if (next) {
      setQuestion(next);
      setIncludeContext(Boolean(context));
      input.current?.focus();
    }
  }, [initialQuestion]);
  useEffect(() => () => controller.current?.abort(), []);
  const activeStage = includeContext && context === 'stage' ? stage : null;
  const activeAssembly = includeContext && context === 'component' ? assembly : null;
  const childContext =
    activeAssembly && selectedNode
      ? `\nPeça visual: ${selectedNode.label}. Usar fontes do conjunto ${activeAssembly.label}; a peça não tem vínculo normativo próprio revisado.`
      : '';
  const questionLimit = Math.max(200, 600 - childContext.length);
  const models = status?.models?.length ? status.models : [status?.model || DEFAULT_MODEL];
  async function submit(event) {
    event.preventDefault();
    if (busy || question.trim().length < 4) return;
    const submitted = question.trim();
    setQuestion('');
    setBusy(true);
    setError('');
    controller.current = new AbortController();
    try {
      const answer = await askPrototype(
        {
          question: submitted.slice(0, questionLimit) + childContext,
          model,
          componentId: activeAssembly?.id,
          subsystemId: activeAssembly ? subsystem?.id : undefined,
          stageId: activeStage?.id,
          profile,
        },
        { signal: controller.current.signal },
      );
      setMessages((items) => [...items, { id: Date.now(), question: submitted, answer }]);
    } catch (error) {
      setQuestion((current) => current || submitted);
      if (error.name !== 'AbortError')
        setError(error.message || 'Não foi possível consultar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="prototype-ia" aria-label="IA">
      <form className="prototype-composer" onSubmit={submit}>
        <label className="prototype-sr-only" htmlFor="prototype-question">
          Pergunta
        </label>
        <textarea
          id="prototype-question"
          ref={input}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Pergunte sobre a legislação automotiva"
          rows={3}
          maxLength={questionLimit}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form.requestSubmit();
            }
          }}
        />
        <div className="prototype-composer-toolbar">
          <label className="prototype-model-selector">
            <span className="prototype-sr-only">Modelo</span>
            {models.length === 1 ? (
              <span className="prototype-model-name">
                {status?.available === false
                  ? 'Fontes do acervo'
                  : MODEL_LABELS[status?.model || model] || status?.model || model}
              </span>
            ) : (
              <select
                aria-label="Modelo de IA"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                disabled={!status || status.available === false}
              >
                {models.map((option) => {
                  const id = typeof option === 'string' ? option : option.id;
                  return (
                    <option key={id} value={id}>
                      {typeof option === 'object'
                        ? option.label || MODEL_LABELS[id] || id
                        : MODEL_LABELS[id] || id}
                    </option>
                  );
                })}
              </select>
            )}
          </label>
          {context && (
            <details className="prototype-query-context">
              <summary>
                Contexto
                <Icon name="down" size={13} />
              </summary>
              <label>
                <input
                  type="checkbox"
                  checked={includeContext}
                  onChange={(event) => setIncludeContext(event.target.checked)}
                />
                {context === 'stage'
                  ? stage?.label
                  : selectedNode?.label || subsystem?.label || assembly?.label}
              </label>
              {selectedNode && <small>Fontes do conjunto {assembly?.label}</small>}
            </details>
          )}
          <button
            className="prototype-send"
            type={busy ? 'button' : 'submit'}
            disabled={!busy && question.trim().length < 4}
            onClick={busy ? () => controller.current?.abort() : undefined}
            aria-label={busy ? 'Interromper consulta' : 'Enviar pergunta'}
          >
            {busy ? <span className="prototype-stop" /> : <Icon name="send" size={20} />}
          </button>
        </div>
      </form>
      {error && (
        <p className="prototype-form-error" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <div className="prototype-answer-loading" role="status" aria-label="Consultando">
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="prototype-conversation" aria-live="polite">
        {messages
          .slice()
          .reverse()
          .map((item) => (
            <article key={item.id} className="prototype-message">
              <div className="prototype-user-question">{item.question}</div>
              <div className="prototype-message-response">
                {item.answer.mode === 'sources' && (
                  <p className="prototype-source-mode">
                    Consulta por fontes; IA indisponível nesta resposta.
                  </p>
                )}
                <CitedAnswer answer={item.answer} />
                {item.answer.sources?.length > 0 && (
                  <details className="prototype-response-sources">
                    <summary>
                      Fontes ({item.answer.sources.length})<Icon name="down" size={15} />
                    </summary>
                    <ActList acts={item.answer.sources} />
                  </details>
                )}
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}

function VehicleTools({ viewer, controls, hasSelection }) {
  const [advanced, setAdvanced] = useState(false);
  const changeMode = (mode) => {
    viewer.current?.setIsolated(false);
    viewer.current?.setMode(mode);
    if (mode === 'exploded') viewer.current?.setExplosion(0.65);
  };
  return (
    <div className="prototype-viewer-tools">
      <div className="prototype-mode-switch">
        <button
          onClick={() => changeMode('assembled')}
          className={controls.mode === 'assembled' ? 'is-selected' : ''}
          aria-pressed={controls.mode === 'assembled'}
        >
          Montado
        </button>
        <button
          onClick={() => changeMode('exploded')}
          className={controls.mode === 'exploded' ? 'is-selected' : ''}
          aria-pressed={controls.mode === 'exploded'}
        >
          Desmontado
        </button>
      </div>
      <div className="prototype-tool-actions">
        {hasSelection && (
          <button
            className="prototype-icon-button"
            onClick={() => viewer.current?.focusSelection()}
            aria-label="Focar seleção"
          >
            <Icon name="focus" />
          </button>
        )}
        <button
          className={`prototype-icon-button${advanced ? ' is-selected' : ''}`}
          onClick={() => setAdvanced(!advanced)}
          aria-label="Opções do veículo"
          aria-expanded={advanced}
        >
          <Icon name="settings" />
        </button>
      </div>
      {advanced && (
        <div className="prototype-view-options">
          <div className="prototype-options-heading">
            <strong>Visualização</strong>
            <button
              className="prototype-icon-button"
              onClick={() => setAdvanced(false)}
              aria-label="Fechar opções"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
          <label className="prototype-range-label">
            Separação<span>{Math.round(controls.explosion * 100)}%</span>
            <input
              type="range"
              aria-label="Separação dos conjuntos"
              min="0"
              max="1"
              step=".01"
              value={controls.explosion}
              onChange={(event) => viewer.current?.setExplosion(Number(event.target.value))}
            />
          </label>
          <label>
            Câmera
            <select
              value={controls.camera}
              onChange={(event) => viewer.current?.setCamera(event.target.value)}
            >
              <option value="perspective">Perspectiva</option>
              <option value="side">Lateral</option>
              <option value="front">Frontal</option>
              <option value="top">Superior</option>
            </select>
          </label>
          {hasSelection && (
            <button
              className="prototype-text-button"
              onClick={() => {
                viewer.current?.setIsolated(true);
                viewer.current?.setExplosion(1);
              }}
            >
              Detalhar seleção
              <Icon name="cube" size={17} />
            </button>
          )}
          <label className="prototype-checkbox">
            <input
              type="checkbox"
              checked={controls.isolated}
              onChange={(event) => viewer.current?.setIsolated(event.target.checked)}
              disabled={!hasSelection}
            />
            Isolar seleção
          </label>
          <label className="prototype-checkbox">
            <input
              type="checkbox"
              checked={controls.mode === 'cutaway'}
              onChange={(event) =>
                viewer.current?.setMode(event.target.checked ? 'cutaway' : 'assembled')
              }
            />
            Corte
          </label>
          <button className="prototype-text-button" onClick={() => viewer.current?.reset()}>
            <Icon name="reset" size={16} />
            Restaurar
          </button>
        </div>
      )}
    </div>
  );
}
function ComponentPicker({ catalog, parts, route, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState('');
  const selected =
    parts.find((part) => part.nodeId === route.node) ||
    catalog.subsystems.find((sub) => sub.id === route.subsystem) ||
    catalog.assemblies.find((part) => part.id === route.part);
  const filtered = catalog.assemblies.filter((part) =>
    searchable(
      `${part.label} ${part.description} ${catalog.subsystems
        .filter((sub) => sub.assemblyId === part.id)
        .map((sub) => sub.label)
        .join(' ')}`,
    ).includes(searchable(query)),
  );
  const choose = (selection) => {
    onSelect(selection, true);
    setOpen(false);
  };
  return (
    <div className="prototype-component-picker">
      <button
        className="prototype-picker-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Icon name="cube" size={17} />
        <span>{selected?.label || 'Selecionar componente'}</span>
        <Icon name="down" size={14} />
      </button>
      {open && (
        <div className="prototype-picker-popover">
          <div className="prototype-options-heading">
            <label className="prototype-search">
              <Icon name="search" size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar componente"
                aria-label="Buscar componente"
                autoFocus
              />
            </label>
            <button
              className="prototype-icon-button"
              onClick={() => setOpen(false)}
              aria-label="Fechar componentes"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
          <div className="prototype-picker-items">
            {filtered.map((part) => (
              <div key={part.id} className="prototype-picker-assembly">
                <div>
                  <button
                    className={route.part === part.id ? 'is-selected' : ''}
                    onClick={() => choose({ assemblyId: part.id })}
                  >
                    {part.label}
                  </button>
                  <button
                    className="prototype-icon-button"
                    onClick={() => setExpanded(expanded === part.id ? '' : part.id)}
                    aria-label={`Subsistemas de ${part.label}`}
                    aria-expanded={expanded === part.id}
                  >
                    <Icon
                      name="chevron"
                      size={15}
                      className={expanded === part.id ? 'is-down' : ''}
                    />
                  </button>
                </div>
                {expanded === part.id && (
                  <div className="prototype-picker-children">
                    {catalog.subsystems
                      .filter(
                        (sub) => sub.assemblyId === part.id || part.subsystemIds?.includes(sub.id),
                      )
                      .map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => choose({ assemblyId: part.id, subsystemId: sub.id })}
                        >
                          {sub.label}
                        </button>
                      ))}
                    <details>
                      <summary>Peças</summary>
                      {parts
                        .filter((piece) => piece.assemblyId === part.id)
                        .map((piece) => (
                          <button
                            key={piece.nodeId}
                            onClick={() => choose({ assemblyId: part.id, nodeId: piece.nodeId })}
                          >
                            {piece.label}
                          </button>
                        ))}
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function VehicleReferences({ assembly, subsystem, selectedNode, references, onAsk, onWorkflow }) {
  if (!assembly) return null;
  const source = references?.parentContext || references;
  const direct = source?.componentActs || [];
  const context = source?.vehicleContextActs || [];
  return (
    <div className="prototype-vehicle-references" id="prototype-vehicle-references">
      <div className="prototype-selection-heading">
        <h2>{selectedNode?.label || subsystem?.label || assembly.label}</h2>
        <div>
          <button className="prototype-text-button" onClick={onAsk}>
            Perguntar à IA
            <Icon name="arrow" size={16} />
          </button>
          {onWorkflow && (
            <button className="prototype-text-button" onClick={onWorkflow}>
              Homologação
              <Icon name="chevron" size={15} />
            </button>
          )}
        </div>
      </div>
      {references?.parentContext && (
        <details className="prototype-selection-scope">
          <summary>Referências do conjunto {assembly.label.toLowerCase()}</summary>
          <p>Esta peça visual não tem vínculo normativo próprio revisado.</p>
        </details>
      )}
      <ActList
        acts={
          direct.length
            ? direct
            : context.map((act) => ({ ...act, referenceContext: 'Contexto de veículo completo' }))
        }
      />
      {direct.length > 0 && context.length > 0 && (
        <details className="prototype-context-references">
          <summary>
            Referências do veículo completo
            <Icon name="down" size={15} />
          </summary>
          <ActList
            acts={context.map((act) => ({
              ...act,
              referenceContext: 'Contexto de veículo completo',
            }))}
          />
        </details>
      )}
    </div>
  );
}

function ProfileForm({ profile, fields, onChange }) {
  const set = (key, value) => onChange({ ...profile, [key]: value });
  const numeric = (key, event) =>
    set(key, event.target.value === '' ? null : Number(event.target.value));
  if (fields?.length)
    return (
      <div className="prototype-profile-fields">
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            {field.options?.length ? (
              <select
                value={profile[field.key] == null ? '' : String(profile[field.key])}
                onChange={(event) =>
                  set(
                    field.key,
                    field.type === 'boolean'
                      ? event.target.value === ''
                        ? null
                        : event.target.value === 'true'
                      : event.target.value,
                  )
                }
              >
                {!field.options.some(
                  (option) =>
                    (typeof option === 'object' ? option.value : option) == null ||
                    (typeof option === 'object' ? option.value : option) === '',
                ) && <option value="">Não informado</option>}
                {field.options.map((option) => {
                  const value = typeof option === 'object' ? option.value : option;
                  const label = typeof option === 'object' ? option.label : option;
                  return (
                    <option key={String(value ?? '')} value={value == null ? '' : String(value)}>
                      {label}
                    </option>
                  );
                })}
              </select>
            ) : field.type === 'boolean' ? (
              <select
                value={profile[field.key] == null ? '' : String(profile[field.key])}
                onChange={(event) =>
                  set(field.key, event.target.value === '' ? null : event.target.value === 'true')
                }
              >
                <option value="">Não informado</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                min={field.min}
                max={field.max}
                step={field.step || (field.type === 'number' ? '1' : undefined)}
                inputMode={field.type === 'number' ? 'decimal' : undefined}
                value={profile[field.key] ?? ''}
                onChange={(event) =>
                  field.type === 'number'
                    ? numeric(field.key, event)
                    : set(field.key, event.target.value)
                }
              />
            )}
          </label>
        ))}
      </div>
    );
  const field = (label, key, options) => (
    <label>
      {label}
      <select value={profile[key] ?? ''} onChange={(event) => set(key, event.target.value)}>
        {options.map((option) => {
          const [value, text] = Array.isArray(option) ? option : [option, option || 'Não definida'];
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </label>
  );
  return (
    <div className="prototype-profile-fields">
      {field('Categoria', 'category', CATEGORY_OPTIONS)}
      {field('Propulsão', 'propulsion', PROPULSIONS)}
      {field('Combustível', 'fuel', [
        ['', 'Não definido'],
        ['gasoline', 'Gasolina'],
        ['ethanol', 'Etanol'],
        ['flex', 'Flex'],
        ['diesel', 'Diesel'],
        ['cng', 'GNV'],
        ['electric', 'Elétrico'],
        ['other', 'Outro'],
      ])}
      {field('Origem', 'origin', [
        ['', 'Não definida'],
        ['national', 'Nacional'],
        ['imported', 'Importado'],
      ])}
      {field('Classe ambiental', 'environmentalClass', [
        ['', 'A enquadrar'],
        ['LP', 'Leve de passageiros (LP)'],
        ['LC', 'Leve comercial (LC)'],
        ['heavy', 'Pesado'],
        ['PROMOT', 'Motociclo / PROMOT'],
        ['machine', 'Máquina / LCVM'],
      ])}
      {field('Operação', 'operation', [
        ['', 'Não definida'],
        ['new', 'Novo veículo'],
        ['importation', 'Importação'],
        ['modification', 'Transformação'],
        ['production', 'Produção / continuidade'],
      ])}
      <label>
        PBT (kg)
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={profile.grossMassKg ?? ''}
          onChange={(event) => numeric('grossMassKg', event)}
        />
      </label>
      <label>
        Massa em ordem de marcha (kg)
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={profile.massRunningKg ?? ''}
          onChange={(event) => numeric('massRunningKg', event)}
        />
      </label>
      <label>
        Carga útil (kg)
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={profile.payloadKg ?? ''}
          onChange={(event) => numeric('payloadKg', event)}
        />
      </label>
      <label>
        Lotação
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={profile.seats ?? ''}
          onChange={(event) => numeric('seats', event)}
        />
      </label>
      <label>
        Ano-modelo
        <input
          type="number"
          min="1900"
          max="2100"
          step="1"
          inputMode="numeric"
          value={profile.modelYear ?? ''}
          onChange={(event) => numeric('modelYear', event)}
        />
      </label>
      {field('Uso', 'use', [
        ['', 'Não definido'],
        ['passenger', 'Passageiros'],
        ['cargo', 'Carga'],
        ['urban', 'Urbano'],
        ['school', 'Escolar'],
        ['special', 'Especial'],
      ])}
      <label>
        Derivado de veículo de passageiros
        <select
          value={profile.derivedFromPassenger == null ? '' : String(profile.derivedFromPassenger)}
          onChange={(event) =>
            set(
              'derivedFromPassenger',
              event.target.value === '' ? null : event.target.value === 'true',
            )
          }
        >
          <option value="">Não informado</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </label>
      <label>
        Uso fora de estrada
        <select
          value={profile.offroad == null ? '' : String(profile.offroad)}
          onChange={(event) =>
            set('offroad', event.target.value === '' ? null : event.target.value === 'true')
          }
        >
          <option value="">Não informado</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </label>
      {field('Aplicação dos componentes', 'componentApplication', [
        ['', 'Não definida'],
        ['oem', 'Montagem original (OEM)'],
        ['replacement', 'Reposição'],
      ])}
    </div>
  );
}

function EvidenceGroup({ label, items, defaultOpen = false }) {
  const values = (Array.isArray(items) ? items : items == null ? [] : [items])
    .flat(Infinity)
    .filter(Boolean);
  if (!values.length) return null;
  return (
    <details className="prototype-evidence-group" open={defaultOpen || undefined}>
      <summary>
        {label}
        <Icon name="down" size={15} />
      </summary>
      <div>
        {values.map((item, index) =>
          typeof item === 'string' ? (
            <p key={index}>{item}</p>
          ) : (
            <div className="prototype-evidence-item" key={item.id || index}>
              {(item.title || item.label || item.designation || item.literal || item.reference) && (
                <strong>
                  {item.title || item.label || item.designation || item.literal || item.reference}
                  {item.edition ? ` (${item.edition})` : ''}
                </strong>
              )}
              {item.description && <p>{item.description}</p>}
              {item.scope && <p>{item.scope}</p>}
              {item.purpose && <p>{item.purpose}</p>}
              {item.device && <p>{item.device}</p>}
              {item.editionCited && <p>Edição citada: {item.editionCited}</p>}
              {item.text && <p>{item.text}</p>}
              {item.method && <p>{textOf(item.method)}</p>}
              {item.conditions && <p>{asArray(item.conditions).map(textOf).join('; ')}</p>}
              {item.limits && <p>{asArray(item.limits).map(textOf).join('; ')}</p>}
              {item.limitations && <p>{asArray(item.limitations).map(textOf).join(' ')}</p>}
              {officialLink(item) && (
                <a href={officialLink(item)} target="_blank" rel="noopener noreferrer">
                  Fonte oficial
                  <Icon name="external" size={13} />
                </a>
              )}
            </div>
          ),
        )}
      </div>
    </details>
  );
}
function requirementsFor(step, catalog) {
  if (Array.isArray(step.requirements)) return step.requirements;
  return (step.tasks || []).map((task) => ({
    ...task,
    label: task.label || task.title,
    actIds: task.actIds || [],
  }));
}
function buildDocumentTree(step, catalog) {
  if (step.tree?.children) return step.tree;
  const actNode = (act) => ({
    id: `act:${act.id}`,
    label: act.title,
    kind: 'act',
    act,
    actIds: [act.id],
    children: [...asArray(act.technicalStandards), ...asArray(act.standards)].map(
      (standard, index) => ({
        id: `standard:${standard.id || act.id + index}`,
        label: standard.label || standard.title || standard.reference,
        kind: 'standard',
        standard,
        children: asArray(standard.equivalents).map((equivalent, n) => ({
          id: `equivalent:${equivalent.id || index + '-' + n}`,
          label: textOf(equivalent),
          kind: 'equivalent',
          standard: equivalent,
          children: [],
        })),
      }),
    ),
  });
  const requirements = requirementsFor(step, catalog);
  const children = requirements.length
    ? requirements.map((requirement) => ({
        ...requirement,
        id: `requirement:${requirement.id}`,
        label: requirement.label || requirement.title,
        kind: 'requirement',
        children: resolveActs(catalog, requirement.actIds || []).map(actNode),
      }))
    : resolveActs(catalog, step.actIds || []).map(actNode);
  return { id: `stage:${step.id}`, label: step.label || step.title, kind: 'stage', children };
}
function indexNodes(root) {
  const nodes = new Map();
  function walk(node, parent = null) {
    const value = { ...node, parent, children: asArray(node.children) };
    nodes.set(value.id, value);
    value.children.forEach((child) => walk(child, value.id));
  }
  walk(root);
  return nodes;
}
function LegislationTree({ step, tree, catalog, standards = [], profileFields = [], onAsk }) {
  const root = useMemo(
    () =>
      tree?.children?.length === 1 ? tree.children[0] : tree || buildDocumentTree(step, catalog),
    [tree, step, catalog],
  );
  const nodes = useMemo(() => indexNodes(root), [root]);
  const [selectedId, setSelectedId] = useState(root.id);
  const [presentation, setPresentation] = useState('graph');
  const [query, setQuery] = useState('');
  const [showOutside, setShowOutside] = useState(false);
  const currentNode = useRef(null);
  const focusNext = useRef(false);
  useEffect(() => {
    setSelectedId(root.id);
    setQuery('');
  }, [root.id]);
  const selected = nodes.get(selectedId) || nodes.get(root.id);
  const trail = [];
  let current = selected;
  while (current) {
    trail.unshift(current);
    current = nodes.get(current.parent);
  }
  const outsideCount = selected.children.filter((node) => node.status === 'outside_profile').length;
  const children = selected.children.filter(
    (node) =>
      (showOutside || node.status !== 'outside_profile') &&
      searchable(`${node.label} ${node.description || ''}`).includes(searchable(query)),
  );
  const childHeight = 94;
  const height = Math.max(280, children.length * childHeight + 24);
  const records = selected.act
    ? [selected.act]
    : selected.kind === 'source'
      ? [
          {
            ...selected,
            title: selected.label,
            officialUrl: selected.url,
            evidenceType: selected.evidenceType ?? null,
          },
        ]
      : resolveActs(catalog, selected.actIds || []);
  const sources = (selected.sourceIds || (selected.kind === 'stage' ? step.sourceIds : []) || [])
    .map((id) => catalog.sources.find((source) => source.id === id))
    .filter(
      (source) =>
        source &&
        !records.some((record) => record.id === source.id || record.aliases?.includes(source.id)),
    )
    .map((source) => ({
      ...source,
      officialUrl: source.url || source.officialUrl,
      description: source.scope || source.description,
    }));
  const standardRecord =
    selected.standard ||
    standards.find((standard) => selected.standardIds?.includes(standard.id)) ||
    selected;
  const methodReferences = asArray(selected.methodRefs)
    .map((reference) =>
      typeof reference === 'string'
        ? standards.find((standard) => standard.id === reference)
        : reference,
    )
    .filter(Boolean);
  const conditionState =
    selected.scopeReferral?.label ||
    (selected.status === 'outside_profile'
      ? 'Fora deste roteiro'
      : selected.status || selected.requirementMode
        ? 'Condição a confirmar'
        : null);
  const choose = (node) => {
    focusNext.current = true;
    setSelectedId(node.id);
  };
  useEffect(() => {
    if (focusNext.current) {
      currentNode.current?.focus({ preventScroll: true });
      focusNext.current = false;
    }
  }, [selectedId]);
  return (
    <div className="prototype-legislation-tree">
      <div className="prototype-tree-toolbar">
        <nav aria-label="Ramo da legislação" className="prototype-tree-breadcrumb">
          {trail.map((node, index) => (
            <React.Fragment key={node.id}>
              {index > 0 && <Icon name="chevron" size={13} />}
              <button
                onClick={() => choose(node)}
                aria-current={selected.id === node.id ? 'location' : undefined}
              >
                {node.label}
              </button>
            </React.Fragment>
          ))}
        </nav>
        <div className="prototype-tree-presentation">
          {outsideCount > 0 && (
            <button aria-pressed={showOutside} onClick={() => setShowOutside(!showOutside)}>
              Outros perfis
            </button>
          )}
          <button aria-pressed={presentation === 'graph'} onClick={() => setPresentation('graph')}>
            Diagrama
          </button>
          <button aria-pressed={presentation === 'list'} onClick={() => setPresentation('list')}>
            Lista
          </button>
        </div>
      </div>
      {presentation === 'graph' ? (
        <div
          className="prototype-regulatory-graph"
          tabIndex="0"
          role="region"
          aria-label="Árvore de legislação expansível"
        >
          <div
            className="prototype-graph-space"
            style={{ height, width: children.length ? 690 : 340 }}
          >
            <svg className="prototype-graph-links" width="690" height={height} aria-hidden="true">
              {children.map((node, index) => (
                <path
                  key={node.id}
                  d={`M286 68 C320 68 330 ${index * childHeight + 68} 364 ${index * childHeight + 68}`}
                />
              ))}
            </svg>
            <div className="prototype-graph-node is-current" style={{ left: 20, top: 24 }}>
              <span tabIndex="-1" ref={currentNode} className="prototype-node-main">
                {selected.label}
              </span>
              {selected.parent && (
                <button
                  className="prototype-node-expand"
                  onClick={() => choose(nodes.get(selected.parent))}
                  aria-label="Voltar ao ramo anterior"
                >
                  <Icon name="back" size={17} />
                </button>
              )}
            </div>
            {children.map((node, index) => (
              <div
                className="prototype-graph-node"
                key={node.id}
                style={{ left: 364, top: index * childHeight + 24 }}
              >
                <button className="prototype-node-main" onClick={() => choose(node)}>
                  {node.label}
                </button>
                <button
                  className="prototype-node-expand"
                  onClick={() => choose(node)}
                  aria-label={`${node.children?.length ? 'Expandir' : 'Abrir'} ${node.label}`}
                >
                  <Icon name={node.children?.length ? 'plus' : 'chevron'} size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="prototype-tree-text-list">
          {selected.parent && (
            <button
              className="prototype-text-button"
              onClick={() => choose(nodes.get(selected.parent))}
            >
              <Icon name="back" size={16} />
              Um nível acima
            </button>
          )}
          {children.map((node) => (
            <button className="prototype-tree-list-node" key={node.id} onClick={() => choose(node)}>
              <span>{node.label}</span>
              <Icon name={node.children?.length ? 'plus' : 'chevron'} size={17} />
            </button>
          ))}
        </div>
      )}
      <div className="prototype-tree-node-content">
        {selected.reportControlLevel != null && (
          <p className="prototype-condition-state">
            Controle de relatório: nível {selected.reportControlLevel}
          </p>
        )}
        {conditionState && <p className="prototype-condition-state">{conditionState}</p>}
        {selected.description && <p>{selected.description}</p>}
        <EvidenceGroup
          label="Condições"
          items={humanConditions(selected.conditions || selected.preconditions, profileFields)}
        />
        <EvidenceGroup
          label="Requisitos e evidências"
          items={selected.requirements || selected.evidence}
        />
        <EvidenceGroup label="Entradas" items={selected.inputs} />
        <EvidenceGroup label="Preparação e condicionamento" items={selected.preconditioning} />
        <EvidenceGroup label="Métodos referenciados" items={methodReferences} />
        <EvidenceGroup label="Momento e condições" items={selected.timing} />
        <EvidenceGroup label="Resultados e registros" items={selected.outputs} />
        <EvidenceGroup label="Fontes do procedimento" items={selected.sources} />
        {records.length > 0 && <ActList acts={records} />}
        {sources.length > 0 && (
          <details className="prototype-context-references">
            <summary>
              Fontes oficiais
              <Icon name="down" size={15} />
            </summary>
            <ActList acts={sources} />
          </details>
        )}
        {(selected.standard ||
          ['standard', 'international_reference', 'equivalent'].includes(selected.kind)) && (
          <div className="prototype-standard-detail">
            <strong>{selected.label}</strong>
            {(standardRecord.description || selected.scope) && (
              <p>{standardRecord.description || selected.scope}</p>
            )}
            {standardRecord.editionCited && <p>Edição citada: {standardRecord.editionCited}</p>}
            {selected.clause && <p>{selected.clause}</p>}
            {officialLink(selected.standard || selected) && (
              <a
                href={officialLink(selected.standard || selected)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar referência
                <Icon name="external" size={13} />
              </a>
            )}
            <EvidenceGroup
              label="Qualificações"
              items={standardRecord.limitations || selected.notes}
            />
          </div>
        )}
        {selected.limitations?.length > 0 && (
          <EvidenceGroup label="Qualificações" items={selected.limitations} />
        )}
        <button
          className="prototype-text-button prototype-tree-ask"
          onClick={() => onAsk(selected.label)}
        >
          Perguntar à IA
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}
function HomologationView({ catalog, workflow, profile, onProfileChange, route, onStage, onAsk }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const steps = asArray(workflow?.steps?.length ? workflow.steps : catalog.stages);
  const phases =
    workflow?.steps?.length && workflow?.phases?.length
      ? workflow.phases
      : steps.map((step) => ({ id: step.id, label: step.label || step.title, stepIds: [step.id] }));
  const selected = steps.find((step) => step.id === route.stage) || steps[0];
  const selectedPhase = phases.find((phase) => phase.stepIds?.includes(selected?.id)) || phases[0];
  const phaseSteps = selectedPhase
    ? steps.filter((step) => selectedPhase.stepIds.includes(step.id))
    : [];
  const tree = useMemo(
    () => (workflow && selected ? getWorkflowTree(workflow, profile, catalog, selected.id) : null),
    [workflow, profile, catalog, selected],
  );
  const profileParts = [
    profile.category,
    workflow?.profileFields
      ?.find((field) => field.key === 'propulsion')
      ?.options?.find((option) => option.value === profile.propulsion)?.label ||
      PROPULSIONS.find(([value]) => value === profile.propulsion)?.[1],
    workflow?.classification?.shortLabel,
  ].filter((value) => value && value !== 'Não definida');
  const stageList = useRef(null);
  useEffect(() => {
    stageList.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }, [selectedPhase?.id]);
  return (
    <section className="prototype-homologation" aria-label="Homologação">
      <div className="prototype-technical-profile">
        <button
          className="prototype-profile-trigger"
          onClick={() => setProfileOpen(!profileOpen)}
          aria-expanded={profileOpen}
        >
          <Icon name="profile" size={17} />
          <span>
            Perfil técnico{profileParts.length > 0 && <small>{profileParts.join(' · ')}</small>}
          </span>
          <Icon name={profileOpen ? 'minus' : 'plus'} size={17} />
        </button>
        {profileOpen && (
          <>
            <ProfileForm
              profile={profile}
              fields={workflow?.profileFields}
              onChange={onProfileChange}
            />
            {workflow?.missing?.length > 0 && (
              <EvidenceGroup label="Dados a completar" items={workflow.missing} />
            )}
            {workflow?.evaluation?.warnings?.length > 0 && (
              <EvidenceGroup label="Conferir perfil" items={workflow.evaluation.warnings} />
            )}
            {workflow?.classification?.particularities?.length > 0 && (
              <EvidenceGroup
                label="Enquadramento ambiental"
                items={workflow.classification.particularities}
              />
            )}
          </>
        )}
      </div>
      <nav className="prototype-linear-flow" aria-label="Etapas de homologação" ref={stageList}>
        <ol>
          {phases.map((phase, index) => (
            <li key={phase.id}>
              <button
                onClick={() => onStage(phase.stepIds?.[0])}
                className={selectedPhase?.id === phase.id ? 'is-selected' : ''}
                aria-current={selectedPhase?.id === phase.id ? 'step' : undefined}
              >
                <span className="prototype-step-number">{index + 1}</span>
                <span>{phase.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {phaseSteps.length > 1 && (
        <div
          className="prototype-step-selector"
          role="group"
          aria-label={`Ações de ${selectedPhase.label}`}
        >
          {phaseSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => onStage(step.id)}
              aria-pressed={selected?.id === step.id}
            >
              {step.label || step.title}
            </button>
          ))}
        </div>
      )}
      {selected && (
        <>
          {selected.dependencyLinks?.length > 0 && (
            <div
              className="prototype-step-dependencies"
              role="group"
              aria-label="Etapas anteriores"
            >
              <span>Antes</span>
              {selected.dependencyLinks.map((dependency) => (
                <button key={dependency.id} onClick={() => onStage(dependency.id)}>
                  {dependency.label}
                  <Icon name="chevron" size={13} />
                </button>
              ))}
            </div>
          )}
          {!selected.scopeReferral && (
            <div className="prototype-stage-work">
              <EvidenceGroup label="Entradas" items={selected.inputs} />
              <EvidenceGroup
                key={`actions:${selected.id}`}
                label="Ações"
                items={selected.actions}
                defaultOpen
              />
              <EvidenceGroup
                label="Preparação e condicionamento"
                items={selected.preconditioning || selected.preconditions}
              />
              <EvidenceGroup label="Ensaios e procedimentos" items={selected.tests} />
              <EvidenceGroup label="Resultados" items={selected.results} />
              <EvidenceGroup label="Documentos" items={selected.documents} />
              <EvidenceGroup label="Encaminhamento" items={selected.handover} />
              <EvidenceGroup label="Conferência dos relatórios" items={selected.reportChecklist} />
              {selected.fieldGroups?.length > 0 && (
                <details className="prototype-evidence-group prototype-infoserv-fields">
                  <summary>
                    Dados para o Infoserv
                    <Icon name="down" size={15} />
                  </summary>
                  <div>
                    {selected.fieldGroups.map((group) => (
                      <div key={group.id}>
                        <EvidenceGroup label={group.title || group.label} items={group.fields} />
                        {group.verification && <p>{verificationText(group.verification)}</p>}
                        {group.currentUiVerified === false && (
                          <p>Interface atual não verificada.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
          <LegislationTree
            key={selected.id}
            step={selected}
            tree={tree}
            catalog={catalog}
            standards={workflow?.standards}
            profileFields={workflow?.profileFields}
            onAsk={(label) => onAsk(selected, label)}
          />
        </>
      )}
    </section>
  );
}

export default function PrototypeApp() {
  const [route, setRoute] = useState(parseRoute);
  const [catalog, setCatalog] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [parts, setParts] = useState([]);
  const [ready, setReady] = useState(false);
  const [viewerRequested, setViewerRequested] = useState(() => parseRoute().view === 'veiculo');
  const [viewerError, setViewerError] = useState('');
  const [controls, setControls] = useState({
    mode: 'assembled',
    explosion: 0,
    isolated: false,
    camera: 'perspective',
  });
  const [profile, setProfile] = useState(() => readSaved().profile || {});
  const [assistantContext, setAssistantContext] = useState(null);
  const [assistantQuestion, setAssistantQuestion] = useState(null);
  const viewport = useRef(null);
  const viewer = useRef(null);
  const focusAfterSelection = useRef(false);
  const routeRef = useRef(route);
  const navigate = useCallback((view, changes = {}) => {
    const next = { ...routeRef.current, ...changes, view };
    const params = new URLSearchParams();
    for (const key of ['part', 'subsystem', 'node', 'stage', 'branch'])
      if (next[key]) params.set(key, next[key]);
    const hash = `#${view}${params.size ? `?${params}` : ''}`;
    if (location.hash === hash) setRoute(next);
    else location.hash = hash;
  }, []);
  const selectPart = useCallback(
    (selection, focus = false) => {
      focusAfterSelection.current = Boolean(
        focus &&
        window.matchMedia('(max-width: 700px)').matches &&
        viewer.current?.getState().mode === 'exploded',
      );
      const current = routeRef.current;
      if (
        focusAfterSelection.current &&
        current.part === (selection.assemblyId || '') &&
        current.subsystem === (selection.subsystemId || '') &&
        current.node === (selection.nodeId || '')
      ) {
        viewer.current?.setSelection(selection);
        viewer.current?.focusSelection();
        focusAfterSelection.current = false;
      }
      navigate('veiculo', {
        part: selection.assemblyId || '',
        subsystem: selection.subsystemId || '',
        node: selection.nodeId || '',
      });
    },
    [navigate],
  );
  useEffect(() => {
    const handle = () => {
      const next = parseRoute();
      const [path] = location.hash.replace(/^#\/?/, '').split('?');
      if (ROUTE_ALIASES[path]) {
        const params = new URLSearchParams(location.hash.split('?')[1] || '');
        history.replaceState(null, '', `#${next.view}${params.size ? `?${params}` : ''}`);
      }
      setRoute(next);
    };
    window.addEventListener('hashchange', handle);
    const [path] = location.hash.replace(/^#\/?/, '').split('?');
    if (ROUTE_ALIASES[path]) {
      const next = parseRoute();
      const params = new URLSearchParams(location.hash.split('?')[1] || '');
      history.replaceState(null, '', `#${next.view}${params.size ? `?${params}` : ''}`);
      setRoute(next);
    } else if (!location.hash) {
      const saved = readSaved();
      history.replaceState(null, '', '#ia');
      setRoute({
        ...parseRoute(),
        part: saved.part || '',
        subsystem: saved.subsystem || '',
        node: saved.node || '',
      });
    }
    let active = true;
    loadPrototypeCatalog()
      .then((value) => {
        if (active) setCatalog(normalizeCatalog(value));
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });
    loadPrototypeWorkflow()
      .then((value) => {
        if (active && value) setWorkflowData(value);
      })
      .catch(() => {});
    return () => {
      active = false;
      window.removeEventListener('hashchange', handle);
    };
  }, []);
  useEffect(() => {
    routeRef.current = route;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ profile, part: route.part, subsystem: route.subsystem, node: route.node }),
      );
    } catch {}
  }, [route, profile]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (route.view === 'veiculo') setViewerRequested(true);
  }, [route.view]);
  useEffect(() => {
    if (!viewerRequested || !catalog || !viewport.current || viewer.current) return;
    let disposed = false;
    let instance = null;
    import('./viewer.js')
      .then(({ mountVehicleViewer }) => {
        if (disposed || !viewport.current) return;
        instance = mountVehicleViewer(viewport.current, {
          onSelect: selectPart,
          onReady: (details) => {
            if (disposed) return;
            setReady(true);
            setParts(asArray(instance?.getParts?.() || details.pieces));
            const current = routeRef.current;
            if (current.part)
              instance?.setSelection({
                assemblyId: current.part,
                subsystemId: current.subsystem,
                nodeId: current.node,
              });
          },
          onError: () => {
            if (!disposed) setViewerError('O 3D não carregou. Use a seleção de componentes.');
          },
          onState: (state) => {
            if (!disposed)
              setControls((previous) => {
                const next = {
                  mode: state.mode,
                  explosion: state.explosion,
                  isolated: state.isolated,
                  camera: state.camera,
                };
                return Object.keys(next).every((key) => previous[key] === next[key])
                  ? previous
                  : next;
              });
          },
        });
        viewer.current = instance;
        const current = routeRef.current;
        if (current.part)
          instance.setSelection({
            assemblyId: current.part,
            subsystemId: current.subsystem,
            nodeId: current.node,
          });
      })
      .catch(() => {
        if (!disposed) setViewerError('O 3D não carregou. Use a seleção de componentes.');
      });
    return () => {
      disposed = true;
      instance?.destroy();
      if (viewer.current === instance) viewer.current = null;
    };
  }, [viewerRequested, catalog, selectPart]);
  useEffect(() => {
    viewer.current?.setSelection({
      assemblyId: route.part,
      subsystemId: route.subsystem,
      nodeId: route.node,
    });
    if (focusAfterSelection.current) {
      focusAfterSelection.current = false;
      viewer.current?.focusSelection();
    }
  }, [route.part, route.subsystem, route.node]);
  const workflow = useMemo(
    () => (catalog && workflowData ? buildWorkflow(profile, workflowData, catalog) : null),
    [profile, workflowData, catalog],
  );
  const assembly = catalog?.assemblies.find((item) => item.id === route.part);
  const subsystem = catalog?.subsystems.find((item) => item.id === route.subsystem);
  const selectedNode = parts.find((part) => part.nodeId === route.node);
  const stage = asArray(workflow?.steps || catalog?.stages).find((item) => item.id === route.stage);
  const references =
    catalog && assembly
      ? getSelectionReferences(catalog, {
          assemblyId: route.part,
          subsystemId: route.subsystem || undefined,
          partId: route.node || undefined,
          parentAssemblyId: route.part,
        })
      : null;
  const askPart = () => {
    setAssistantContext('component');
    setAssistantQuestion({
      text: `Quais referências consultar sobre ${(selectedNode?.label || subsystem?.label || assembly.label).toLowerCase()}?`,
      id: Date.now(),
    });
    navigate('ia');
  };
  const askStage = (step, label) => {
    setAssistantContext('stage');
    setAssistantQuestion({
      text: `O que devo consultar sobre ${(label || step.label || step.title).toLowerCase()}?`,
      id: Date.now(),
    });
    navigate('ia', { stage: step.id });
  };
  const relatedStage =
    assembly &&
    asArray(workflow?.steps || catalog?.stages).find((step) =>
      step.assemblyIds?.includes(assembly.id),
    );
  return (
    <div className="prototype-app">
      <a
        className="prototype-skip-link"
        href="#prototype-main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('prototype-main')?.focus();
        }}
      >
        Ir para o conteúdo
      </a>
      <header className="prototype-header">
        <button
          className="prototype-brand"
          onClick={() => navigate('ia')}
          aria-label="Legislação Automotiva"
        >
          <Icon name="car" size={26} />
          <span>Legislação Automotiva</span>
        </button>
        <nav className="prototype-nav" aria-label="Navegação principal">
          {NAV.map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'ia') setAssistantContext(null);
                navigate(id);
              }}
              aria-current={route.view === id ? 'page' : undefined}
              className={route.view === id ? 'is-selected' : ''}
            >
              {label}
            </button>
          ))}
        </nav>
        <a
          className="prototype-portal-link"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir portal"
        >
          <Icon name="external" size={18} />
        </a>
      </header>
      <main id="prototype-main" tabIndex="-1">
        {loadError ? (
          <div className="prototype-load-error" role="alert">
            <p>{loadError}</p>
            <button className="prototype-primary" onClick={() => location.reload()}>
              Recarregar
            </button>
          </div>
        ) : !catalog ? (
          <div className="prototype-app-loading" role="status" aria-label="Carregando">
            <span />
            <span />
          </div>
        ) : (
          <>
            <section hidden={route.view !== 'ia'}>
              <AssistantView
                profile={profile}
                context={assistantContext}
                assembly={assembly}
                subsystem={subsystem}
                selectedNode={selectedNode}
                stage={stage}
                initialQuestion={assistantQuestion}
              />
            </section>
            <section
              className="prototype-vehicle-page"
              hidden={route.view !== 'veiculo'}
              aria-label="Veículo"
            >
              <div className="prototype-vehicle-studio">
                <VehicleTools
                  viewer={viewer}
                  controls={controls}
                  hasSelection={Boolean(assembly)}
                />
                <div
                  className="prototype-viewport"
                  ref={viewport}
                  aria-label="Modelo 3D interativo do veículo"
                />
                <div className="prototype-vehicle-selection">
                  <ComponentPicker
                    catalog={catalog}
                    parts={parts}
                    route={route}
                    onSelect={selectPart}
                  />
                  {assembly && (
                    <button
                      className="prototype-icon-button"
                      onClick={() => navigate('veiculo', { part: '', subsystem: '', node: '' })}
                      aria-label="Limpar seleção"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </div>
                {!ready && !viewerError && (
                  <div
                    className="prototype-viewer-loading"
                    role="status"
                    aria-label="Carregando veículo"
                  >
                    <span />
                  </div>
                )}
                {viewerError && (
                  <p className="prototype-viewer-error" role="status">
                    {viewerError}
                  </p>
                )}
              </div>
              <VehicleReferences
                assembly={assembly}
                subsystem={subsystem}
                selectedNode={selectedNode}
                references={references}
                onAsk={askPart}
                onWorkflow={
                  relatedStage
                    ? () => navigate('homologacao', { stage: relatedStage.id })
                    : undefined
                }
              />
            </section>
            {route.view === 'homologacao' && (
              <HomologationView
                catalog={catalog}
                workflow={workflow}
                profile={profile}
                onProfileChange={setProfile}
                route={route}
                onStage={(id) => navigate('homologacao', { stage: id, branch: '' })}
                onAsk={askStage}
              />
            )}
          </>
        )}
      </main>
      <footer className="prototype-footer">
        <details className="prototype-model-credits">
          <summary>Créditos</summary>
          <p>
            BMW X5 G05 por{' '}
            <a
              href="https://github.com/bmwcarit/digital-car-3d"
              target="_blank"
              rel="noopener noreferrer"
            >
              BMW Car IT
            </a>
            ,{' '}
            <a href="/assets/models/suv/LICENSE.txt" target="_blank" rel="noopener noreferrer">
              CC BY 4.0
            </a>
            . Materiais adaptados. Subconjuntos mecânicos didáticos; não representam o CAD interno
            do fabricante.
          </p>
        </details>
      </footer>
    </div>
  );
}
const rootElement = document.getElementById('prototype-root');
if (rootElement) createRoot(rootElement).render(<PrototypeApp />);
