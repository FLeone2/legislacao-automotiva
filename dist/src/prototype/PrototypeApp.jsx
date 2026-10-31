import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadPrototypeCatalog, getSelectionReferences } from './catalog.js';
import { mountVehicleViewer } from './viewer.js';
import { askPrototype } from './assistant.js';
import './prototype.css';

const STORAGE_KEY = 'prototype-project-v1';
const ROUTES = ['veiculo', 'arvore', 'mapa', 'assistente', 'biblioteca'];
const NAV = [
  ['veiculo', 'Veículo', 'car'],
  ['arvore', 'Árvore', 'tree'],
  ['mapa', 'Mapa', 'map'],
  ['assistente', 'Assistente', 'chat'],
];
// Visual navigation families; these groups do not define regulatory applicability.
const TREE_FAMILIES = [
  { id: 'estrutura', label: 'Estrutura', assemblyIds: ['body', 'doors', 'glass'] },
  {
    id: 'propulsao',
    label: 'Propulsão',
    assemblyIds: ['engine', 'motorElectric', 'exhaust', 'tank', 'cooling'],
  },
  { id: 'energia', label: 'Energia', assemblyIds: ['batteryHV', 'battery12v'] },
  {
    id: 'rodagem',
    label: 'Rodagem',
    assemblyIds: ['chassis', 'steering', 'wheels', 'brakes', 'brakeFluid'],
  },
  {
    id: 'seguranca-visao',
    label: 'Segurança e visão',
    assemblyIds: ['seats', 'airbag', 'lights', 'mirrors'],
  },
  {
    id: 'eletronica-identificacao',
    label: 'Eletrônica e identificação',
    assemblyIds: ['electronics', 'vin'],
  },
];

function Icon({ name, size = 20, ...props }) {
  const paths = {
    car: (
      <>
        <path d="m5 7 2-4h10l2 4M3 8h18v9H3zM6 17v3M18 17v3M6 12h2M16 12h2" />
      </>
    ),
    tree: (
      <>
        <path d="M5 3v15h14M5 8h7M5 13h7M12 5v6M12 10v6" />
        <rect x="15" y="5" width="5" height="5" rx="1" />
        <rect x="15" y="12" width="5" height="5" rx="1" />
      </>
    ),
    map: (
      <>
        <rect x="3" y="3" width="6" height="5" rx="1" />
        <rect x="15" y="9" width="6" height="5" rx="1" />
        <rect x="3" y="16" width="6" height="5" rx="1" />
        <path d="M9 5h3v7h3M12 12v7H9" />
      </>
    ),
    chat: <path d="M20 4H4v12h5l4 4v-4h7zM8 8h8M8 12h5" />,
    library: (
      <>
        <path d="M4 4h4v16H4zM10 4h4v16h-4zM17 4l4 1-3 15-4-1z" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7M21 3l-11 11M10 5H4v15h15v-6" />
      </>
    ),
    document: (
      <>
        <path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6" />
      </>
    ),
    settings: (
      <>
        <path d="M3 6h18M3 12h18M3 18h18" />
        <circle cx="8" cy="6" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="10" cy="18" r="2" />
      </>
    ),
    focus: (
      <>
        <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    reset: (
      <>
        <path d="M3 9a9 9 0 1 1 1 9M3 3v6h6" />
      </>
    ),
    cube: (
      <>
        <path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.document}
    </svg>
  );
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
    view: ROUTES.includes(path) ? path : 'veiculo',
    part: params.get('part') || '',
    subsystem: params.get('subsystem') || '',
    node: params.get('node') || '',
    stage: params.get('stage') || '',
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : Object.values(value || {});
}
function normalizeCatalog(raw) {
  return {
    ...raw,
    acts: asArray(raw.acts),
    assemblies: asArray(raw.assemblies),
    subsystems: asArray(raw.subsystems),
    stages: asArray(raw.stages),
    serviceLinks: asArray(raw.serviceLinks),
    sources: asArray(raw.sources),
  };
}
function shortDescription(value, limit = 180) {
  const text = typeof value === 'string' ? value : '';
  return text.length > limit ? `${text.slice(0, limit).replace(/\s+\S*$/, '')}…` : text;
}
function searchable(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function assetLink(url) {
  return url && !/^(?:https?:|\/)/.test(url) ? `/${url}` : url;
}
function revealMobilePanel(selector) {
  if (!window.matchMedia('(max-width: 700px)').matches) return;
  requestAnimationFrame(() =>
    document.querySelector(selector)?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    }),
  );
}
function officialLink(act) {
  return assetLink(act.pdfUrl || act.officialUrl);
}
function statusText(value, kind) {
  const labels = {
    indicated_current: 'Vigência indicada no acervo',
    indicated_revoked: 'Revogação indicada no acervo',
    revoked: 'Revogação indicada no acervo',
    partially_revoked: 'Revogação parcial indicada',
    partially_repealed: 'Revogação parcial indicada',
    partial_revocation: 'Revogação parcial indicada',
    official_current_reference: 'Referência atual na fonte oficial',
    reference_only: 'Referência de consulta',
    index_review: 'Índice consultado; íntegra não revisada',
    directed_text_review: 'Revisão dirigida de trechos',
    full_text_reviewed: 'Íntegra revisada',
    not_reviewed: 'Revisão pendente',
    unknown: 'Não informado',
    verified_pdf: 'Cópia do PDF oficial conferida',
    official_source_only: 'Consultar a fonte oficial',
    requires_assessment: 'Requer avaliação do caso',
  };
  if (value == null) return 'Não informado';
  if (typeof value === 'string')
    return labels[value] || (value.includes('_') ? 'Consulte a fonte e as ressalvas' : value);
  return (
    value.summary ||
    value.label ||
    labels[value.state] ||
    (kind === 'legal' ? 'Consultar indicação e condições na fonte' : 'Revisão não informada')
  );
}

function ActList({ acts, empty = 'Não há referências vinculadas a esta seleção.', limit = 5 }) {
  const [showAll, setShowAll] = useState(false);
  const actKey = acts.map((act) => act.id).join(',');
  useEffect(() => setShowAll(false), [actKey]);
  if (!acts.length) return <p className="prototype-empty">{empty}</p>;
  return (
    <div className="prototype-acts">
      {(showAll ? acts : acts.slice(0, limit)).map((act) => (
        <article className="prototype-act" key={act.id}>
          {officialLink(act) ? (
            <a
              className="prototype-act-link"
              href={officialLink(act)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${act.title} — abrir ${act.pdfUrl ? 'PDF oficial' : 'fonte oficial'} em nova aba`}
            >
              <Icon name="document" size={21} />
              <span>
                <strong>{act.title}</strong>
                <span>
                  {shortDescription(act.contextualDescription || act.description, 170) ||
                    'Consulte o texto na fonte oficial.'}
                </span>
                <small>
                  {act.pdfUrl ? 'PDF oficial' : 'Fonte oficial'} <Icon name="external" size={12} />
                </small>
              </span>
              <Icon name="external" size={16} />
            </a>
          ) : (
            <div className="prototype-act-link">
              <Icon name="document" />
              <span>
                <strong>{act.title}</strong>
                <span>{shortDescription(act.contextualDescription || act.description)}</span>
                <small>Link oficial indisponível no acervo</small>
              </span>
            </div>
          )}
          <details className="prototype-act-detail">
            <summary>Sobre esta referência</summary>
            <dl>
              {act.agency && (
                <>
                  <dt>Órgão</dt>
                  <dd>{act.agency}</dd>
                </>
              )}
              {(act.legalStatus || act.legalState) && (
                <>
                  <dt>Indicação jurídica</dt>
                  <dd>{statusText(act.legalStatus || act.legalState, 'legal')}</dd>
                </>
              )}
              <dt>Revisão</dt>
              <dd>{statusText(act.reviewStatus || act.review, 'review')}</dd>
              {act.reviewStatus && typeof act.reviewStatus === 'object' && (
                <>
                  <dt>Íntegra revisada</dt>
                  <dd>
                    {act.reviewStatus.fullTextReviewed === true
                      ? 'Sim'
                      : act.reviewStatus.fullTextReviewed === false
                        ? 'Não'
                        : 'Não informada'}
                  </dd>
                  <dt>Cadeia revisada</dt>
                  <dd>
                    {act.reviewStatus.amendmentChainReviewed === true
                      ? 'Sim'
                      : act.reviewStatus.amendmentChainReviewed === false
                        ? 'Não'
                        : 'Não informada'}
                  </dd>
                </>
              )}
              {act.pdfStatus && (
                <>
                  <dt>Documento</dt>
                  <dd>{statusText(act.pdfStatus, 'pdf')}</dd>
                </>
              )}
              {act.referenceContext && (
                <>
                  <dt>Relação</dt>
                  <dd>{act.referenceContext}</dd>
                </>
              )}
              {act.contextualTopics?.length > 0 && (
                <>
                  <dt>Vínculo no acervo</dt>
                  <dd>{act.contextualTopics.join('; ')}</dd>
                </>
              )}
            </dl>
            {act.limitations && (
              <p>{Array.isArray(act.limitations) ? act.limitations.join(' ') : act.limitations}</p>
            )}
            {act.contextualNotes?.map((note, index) => (
              <p key={index}>{note}</p>
            ))}
            {act.contextualRequirementIds?.length > 0 && (
              <details className="prototype-recorded-excerpts">
                <summary>Trechos registrados ({act.contextualRequirementIds.length})</summary>
                <ul>
                  {act.contextualRequirementIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              </details>
            )}
            <p>O vínculo orienta a consulta. Confira o escopo e as condições na fonte.</p>
            {act.officialUrl && act.pdfUrl && (
              <a href={assetLink(act.officialUrl)} target="_blank" rel="noopener noreferrer">
                Ver publicação oficial <Icon name="external" size={13} />
              </a>
            )}
            {act.markdownPath && (
              <a href={assetLink(act.markdownPath)} target="_blank" rel="noopener noreferrer">
                Ficha em Markdown <Icon name="external" size={13} />
              </a>
            )}
          </details>
        </article>
      ))}
      {acts.length > limit && (
        <button
          className="prototype-text-button prototype-show-more"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Mostrar menos' : `Ver mais ${acts.length - limit} referências`}
          <Icon name="down" size={16} className={showAll ? 'is-up' : ''} />
        </button>
      )}
    </div>
  );
}

function SelectionInspector({
  selection,
  assembly,
  subsystem,
  selectedNode,
  acts,
  references,
  onAsk,
  onTree,
  onMap,
  compact = false,
}) {
  const inspector = useRef(null);
  useEffect(() => {
    if (inspector.current) inspector.current.scrollTop = 0;
  }, [selection.part, selection.subsystem, selection.node]);
  if (!assembly)
    return (
      <aside
        ref={inspector}
        className={`prototype-inspector${compact ? ' is-compact' : ''}`}
        aria-label="Referências da seleção"
      >
        <div className="prototype-selection-empty">
          <div className="prototype-empty-icon">
            <Icon name="cube" size={28} />
          </div>
          <h2>Por onde começar?</h2>
          <p>Toque em uma peça do veículo para encontrar as leis e suas fontes oficiais.</p>
          <button className="prototype-primary" onClick={onTree}>
            Escolher na árvore <Icon name="tree" size={17} />
          </button>
        </div>
        <p className="prototype-quiet-note">Modelo didático para consulta.</p>
      </aside>
    );
  const contextual = references?.parentContext || references;
  const directIds = new Set((contextual?.componentActs || []).map((act) => act.id));
  const directActs = acts.filter((act) => directIds.has(act.id));
  const contextActs = acts.filter((act) => !directIds.has(act.id));
  const primaryActs = directActs.length ? directActs : contextActs;
  return (
    <aside
      ref={inspector}
      className={`prototype-inspector${compact ? ' is-compact' : ''}`}
      aria-label="Referências da seleção"
    >
      <div className="prototype-inspector-heading">
        <p className="prototype-breadcrumb">
          {selectedNode ? assembly.label : subsystem?.systemLabel || 'Veículo'}
        </p>
        <h2>{selectedNode?.label || subsystem?.label || assembly.label}</h2>
        <p>{shortDescription(subsystem?.description || assembly.description, 180)}</p>
      </div>
      <div className="prototype-reference-heading">
        <h3>
          {directActs.length || !contextActs.length
            ? 'Leis e referências'
            : 'Referências do veículo'}
        </h3>
        <span>{primaryActs.length}</span>
      </div>
      {references?.parentContext && (
        <p className="prototype-inherited">
          Esta peça não tem vínculo próprio revisado. Veja as referências do conjunto{' '}
          {assembly.label.toLowerCase()}.
        </p>
      )}
      {!directActs.length && contextActs.length > 0 && !references?.parentContext && (
        <p className="prototype-inherited">Contexto relacionado à seleção.</p>
      )}
      <ActList acts={primaryActs} />
      {directActs.length > 0 && contextActs.length > 0 && (
        <details className="prototype-context-references">
          <summary>
            Referências do veículo completo<span>{contextActs.length}</span>
            <Icon name="down" size={15} />
          </summary>
          <ActList acts={contextActs} />
        </details>
      )}
      {onMap && (
        <button className="prototype-text-button prototype-map-context" onClick={onMap}>
          <Icon name="map" size={17} />
          Ver no mapa
          <Icon name="chevron" size={15} />
        </button>
      )}
      <button className="prototype-text-button prototype-ask-context" onClick={onAsk}>
        <Icon name="chat" size={18} />
        Perguntar sobre esta seleção
        <Icon name="arrow" size={17} />
      </button>
    </aside>
  );
}

function VehicleControls({ viewer, controls, setControls, hasSelection }) {
  const [open, setOpen] = useState(false);
  const setMode = (mode) => {
    setControls((previous) => ({ ...previous, mode }));
    viewer.current?.setMode(mode);
  };
  return (
    <div className="prototype-viewer-tools">
      <div className="prototype-mode-switch" aria-label="Montagem do veículo">
        <button
          className={controls.mode === 'assembled' ? 'is-selected' : ''}
          onClick={() => setMode('assembled')}
          aria-pressed={controls.mode === 'assembled'}
        >
          Montado
        </button>
        <button
          className={controls.mode === 'exploded' ? 'is-selected' : ''}
          onClick={() => {
            setMode('exploded');
            if (!controls.explosion) {
              setControls((v) => ({ ...v, explosion: 0.65 }));
              viewer.current?.setExplosion(0.65);
            }
          }}
          aria-pressed={controls.mode === 'exploded'}
        >
          Desmontar
        </button>
      </div>
      <div className="prototype-tool-actions">
        {hasSelection && (
          <button
            className="prototype-icon-button"
            onClick={() => viewer.current?.focusSelection()}
            aria-label="Focar peça selecionada"
            title="Focar seleção"
          >
            <Icon name="focus" />
          </button>
        )}
        <button
          className={`prototype-icon-button${open ? ' is-selected' : ''}`}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="prototype-view-options"
          aria-label="Opções de visualização"
          title="Opções de visualização"
        >
          <Icon name="settings" />
        </button>
      </div>
      {open && (
        <div id="prototype-view-options" className="prototype-view-options">
          <div className="prototype-options-heading">
            <strong>Visualização</strong>
            <button
              className="prototype-icon-button"
              onClick={() => setOpen(false)}
              aria-label="Fechar opções"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
          <label className="prototype-range-label" htmlFor="prototype-explosion">
            Separação <span>{Math.round(controls.explosion * 100)}%</span>
          </label>
          <input
            id="prototype-explosion"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={controls.explosion}
            onChange={(event) => {
              const explosion = Number(event.target.value);
              setControls((v) => ({
                ...v,
                explosion,
                mode: explosion > 0 ? 'exploded' : 'assembled',
              }));
              viewer.current?.setMode(explosion > 0 ? 'exploded' : 'assembled');
              viewer.current?.setExplosion(explosion);
            }}
          />
          <label className="prototype-select-label">
            Câmera
            <select
              value={controls.camera}
              onChange={(event) => {
                const camera = event.target.value;
                setControls((v) => ({ ...v, camera }));
                viewer.current?.setCamera(camera);
              }}
            >
              <option value="perspective">Perspectiva</option>
              <option value="side">Lateral</option>
              <option value="front">Frontal</option>
              <option value="top">Superior</option>
            </select>
          </label>
          <label className="prototype-checkbox">
            <input
              type="checkbox"
              checked={controls.isolated}
              disabled={!hasSelection}
              onChange={(event) => {
                setControls((v) => ({ ...v, isolated: event.target.checked }));
                viewer.current?.setIsolated(event.target.checked);
              }}
            />
            Isolar seleção
          </label>
          <label className="prototype-checkbox">
            <input
              type="checkbox"
              checked={controls.mode === 'cutaway'}
              onChange={(event) => setMode(event.target.checked ? 'cutaway' : 'assembled')}
            />
            Corte do veículo
          </label>
          <button
            className="prototype-text-button"
            onClick={() => {
              viewer.current?.reset();
              setControls({
                mode: 'assembled',
                explosion: 0,
                isolated: false,
                camera: 'perspective',
              });
            }}
          >
            <Icon name="reset" size={16} />
            Restaurar visualização
          </button>
        </div>
      )}
    </div>
  );
}

function TreeView({
  catalog,
  selection,
  onSelect,
  viewerParts,
  acts,
  references,
  assembly,
  subsystem,
  selectedNode,
  onAsk,
  onMap,
}) {
  const [query, setQuery] = useState('');
  const match = searchable(query);
  const choosePart = (part) => {
    onSelect(part);
    revealMobilePanel('.prototype-tree-page .prototype-inspector');
  };
  const filtered = catalog.assemblies.filter((item) =>
    searchable(
      `${item.label} ${item.description} ${TREE_FAMILIES.find((family) => family.assemblyIds.includes(item.id))?.label || ''} ${catalog.subsystems
        .filter((sub) => sub.assemblyId === item.id || item.subsystemIds?.includes(sub.id))
        .map((sub) => `${sub.label} ${sub.systemLabel}`)
        .join(' ')}`,
    ).includes(match),
  );
  return (
    <section className="prototype-page prototype-tree-page" aria-labelledby="prototype-tree-title">
      <header className="prototype-page-heading">
        <div>
          <h1 id="prototype-tree-title">Árvore do veículo</h1>
          <p>
            {catalog.subsystems.length} áreas do modelo em {catalog.assemblies.length} conjuntos.
            Explore na sua ordem.
          </p>
        </div>
      </header>
      <div className="prototype-split-layout">
        <div className="prototype-tree-browser">
          <label className="prototype-search">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Encontrar um conjunto ou subsistema"
              aria-label="Buscar na árvore"
            />
            {query && (
              <button
                className="prototype-icon-button"
                onClick={() => setQuery('')}
                aria-label="Limpar busca"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </label>
          <div className="prototype-tree-list">
            {!filtered.length && (
              <p className="prototype-empty">
                Nenhum conjunto encontrado. Tente “freios” ou “bateria”.
              </p>
            )}
            {TREE_FAMILIES.map((family) => {
              const members = filtered.filter((item) => family.assemblyIds.includes(item.id));
              if (!members.length) return null;
              const familyActive = family.assemblyIds.includes(selection.part);
              return (
                <details
                  className={`prototype-tree-family${familyActive ? ' is-active' : ''}`}
                  key={family.id}
                  open={query ? true : familyActive || undefined}
                >
                  <summary>
                    <Icon name="chevron" size={18} />
                    <span>
                      <strong>{family.label}</strong>
                      <small>
                        {members.length} {members.length === 1 ? 'conjunto' : 'conjuntos'}
                      </small>
                    </span>
                  </summary>
                  <div className="prototype-family-branches">
                    {members.map((item) => {
                      const subs = catalog.subsystems.filter(
                        (sub) => sub.assemblyId === item.id || item.subsystemIds?.includes(sub.id),
                      );
                      const pieces = viewerParts.filter(
                        (part) => part.assemblyId === item.id && part.nodeId,
                      );
                      const active = selection.part === item.id;
                      return (
                        <details
                          className={`prototype-tree-assembly${active ? ' is-active' : ''}`}
                          key={item.id}
                          open={query ? true : undefined}
                        >
                          <summary>
                            <Icon name="chevron" size={17} />
                            <span>{item.label}</span>
                            <span className="prototype-tree-count">{subs.length}</span>
                          </summary>
                          <div className="prototype-tree-children">
                            <button
                              className={`prototype-tree-item${active && !selection.subsystem && !selection.node ? ' is-selected' : ''}`}
                              onClick={() => choosePart({ assemblyId: item.id })}
                            >
                              <Icon name="cube" size={17} />
                              <span>Ver conjunto</span>
                              <Icon name="chevron" size={15} />
                            </button>
                            {subs.map((sub) => (
                              <button
                                key={sub.id}
                                className={`prototype-tree-item${selection.subsystem === sub.id ? ' is-selected' : ''}`}
                                onClick={() =>
                                  choosePart({ assemblyId: item.id, subsystemId: sub.id })
                                }
                              >
                                <span className="prototype-tree-dot" />
                                <span>{sub.label}</span>
                                <Icon name="chevron" size={15} />
                              </button>
                            ))}
                            {pieces.length > 0 && (
                              <details className="prototype-tree-pieces">
                                <summary>
                                  <Icon name="chevron" size={15} />
                                  Peças do conjunto <span>{pieces.length}</span>
                                </summary>
                                {pieces.map((piece) => (
                                  <button
                                    key={piece.nodeId}
                                    className={`prototype-tree-item${selection.node === piece.nodeId ? ' is-selected' : ''}`}
                                    onClick={() =>
                                      choosePart({ assemblyId: item.id, nodeId: piece.nodeId })
                                    }
                                  >
                                    <span className="prototype-tree-dot" />
                                    <span>{piece.label || piece.nodeId}</span>
                                    <Icon name="chevron" size={15} />
                                  </button>
                                ))}
                              </details>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
        <SelectionInspector
          selection={selection}
          assembly={assembly}
          subsystem={subsystem}
          selectedNode={selectedNode}
          acts={acts}
          references={references}
          onAsk={onAsk}
          onMap={onMap}
          onTree={() => document.querySelector('.prototype-tree-assembly summary')?.focus()}
        />
      </div>
    </section>
  );
}

function stageLayout(stages) {
  const stageIds = new Set(stages.map((stage) => stage.id));
  const depths = {};
  function depth(stage, trail = new Set()) {
    if (depths[stage.id] !== undefined) return depths[stage.id];
    if (trail.has(stage.id)) return 0;
    trail.add(stage.id);
    const deps = (stage.dependencies || [])
      .map((dep) => (typeof dep === 'string' ? dep : dep.id))
      .filter((id) => stageIds.has(id));
    return (depths[stage.id] = deps.length
      ? 1 +
        Math.max(
          ...deps.map((id) =>
            depth(
              stages.find((item) => item.id === id),
              new Set(trail),
            ),
          ),
        )
      : 0);
  }
  const columns = [];
  for (const stage of stages) {
    const d = Math.min(depth(stage), 7);
    (columns[d] ||= []).push(stage);
  }
  const positions = new Map();
  columns.forEach((column, col) =>
    column?.forEach((stage, row) =>
      positions.set(stage.id, { x: col * 270 + 22, y: row * 130 + 28 }),
    ),
  );
  return {
    columns,
    positions,
    width: Math.max(columns.length * 270, 540),
    height: Math.max(...columns.map((column) => (column?.length || 0) * 130), 260) + 32,
  };
}

function MapView({ catalog, route, onStage, onSelect, onAsk }) {
  const mapScroll = useRef(null);
  const mapDrag = useRef(null);
  const selectedAssembly = catalog.assemblies.find((item) => item.id === route.part);
  const stage = catalog.stages.find((item) => item.id === route.stage);
  const acts = catalog.acts.filter((act) => stage?.actIds?.includes(act.id));
  const stageSources = (stage?.sourceIds || [])
    .map((id) => catalog.sources.find((source) => source.id === id))
    .filter(
      (source) =>
        source &&
        !acts.some(
          (act) =>
            act.id === source.id ||
            act.aliases?.includes(source.id) ||
            source.actIds?.includes(act.id),
        ),
    )
    .map((source) => ({
      ...source,
      description: source.scope || source.description,
      officialUrl: source.url || source.officialUrl,
      evidenceType: source.evidenceType || 'official_guidance',
      referenceContext: 'Fonte de orientação e consulta',
    }));
  const tasks = stage?.tasks || [];
  const layout = useMemo(() => stageLayout(catalog.stages), [catalog.stages]);
  useEffect(() => {
    const position = layout.positions.get(route.stage);
    if (position && mapScroll.current)
      mapScroll.current.scrollTo({
        left: Math.max(0, position.x - (mapScroll.current.clientWidth - 220) / 2),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
  }, [route.stage, layout]);
  return (
    <section className="prototype-page" aria-labelledby="prototype-map-title">
      <header className="prototype-page-heading">
        <div>
          <h1 id="prototype-map-title">Mapa de homologação</h1>
          <p>Escolha uma etapa. Arraste o mapa para explorar o caminho.</p>
        </div>
        <div className="prototype-map-header-context">
          <span className="prototype-subtle-label">Roteiro de consulta; frentes em paralelo</span>
          {selectedAssembly && (
            <span className="prototype-related-caption">
              <span className="prototype-selection-dot" />
              Etapas relacionadas a {selectedAssembly.label.toLowerCase()}
            </span>
          )}
        </div>
      </header>
      <div className="prototype-map-layout">
        <div
          ref={mapScroll}
          className="prototype-map-scroll"
          tabIndex="0"
          role="region"
          aria-label="Mapa de etapas, com rolagem horizontal"
          onPointerDown={(event) => {
            if (event.pointerType !== 'mouse' || event.target.closest('button, a')) return;
            mapDrag.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.focus({ preventScroll: true });
            event.preventDefault();
          }}
          onPointerMove={(event) => {
            if (!mapDrag.current) return;
            event.currentTarget.scrollLeft =
              mapDrag.current.scrollLeft + mapDrag.current.x - event.clientX;
          }}
          onPointerUp={() => {
            mapDrag.current = null;
          }}
          onPointerCancel={() => {
            mapDrag.current = null;
          }}
        >
          <div
            className="prototype-map-canvas"
            style={{ width: layout.width, minHeight: layout.height }}
          >
            <svg
              className="prototype-map-lines"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="prototype-arrow"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <path d="M0 0 7 3.5 0 7" fill="none" stroke="currentColor" />
                </marker>
              </defs>
              {catalog.stages.flatMap((item) =>
                (item.dependencies || []).map((rawDependency) => {
                  const dependency =
                    typeof rawDependency === 'string' ? rawDependency : rawDependency.id;
                  const start = layout.positions.get(dependency);
                  const end = layout.positions.get(item.id);
                  if (!start || !end) return null;
                  const x1 = start.x + 220;
                  const y1 = start.y + 46;
                  const x2 = end.x;
                  const y2 = end.y + 46;
                  return (
                    <path
                      key={`${dependency}-${item.id}`}
                      d={`M${x1},${y1} C${x1 + 24},${y1} ${x2 - 24},${y2} ${x2 - 5},${y2}`}
                      markerEnd="url(#prototype-arrow)"
                    />
                  );
                }),
              )}
            </svg>
            {catalog.stages.map((item) => {
              const pos = layout.positions.get(item.id);
              return (
                <button
                  key={item.id}
                  className={`prototype-stage-node${route.stage === item.id ? ' is-selected' : ''}${selectedAssembly && item.assemblyIds?.includes(selectedAssembly.id) ? ' is-related' : ''}`}
                  style={{ left: pos.x, top: pos.y }}
                  onClick={() => {
                    onStage(item.id);
                    revealMobilePanel('.prototype-stage-inspector');
                  }}
                  aria-pressed={route.stage === item.id}
                >
                  <span>{item.label}</span>
                  <small>{shortDescription(item.description, 84)}</small>
                  <Icon name="chevron" size={16} />
                </button>
              );
            })}
          </div>
        </div>
        <aside
          className="prototype-inspector prototype-stage-inspector"
          aria-label="Detalhes da etapa"
        >
          {stage ? (
            <>
              <div className="prototype-inspector-heading">
                <h2>{stage.label}</h2>
                <p>{stage.description}</p>
                {stage.agency && <span className="prototype-stage-agency">{stage.agency}</span>}
              </div>
              {tasks.length > 0 && (
                <div className="prototype-stage-tasks">
                  <h3>O que consultar</h3>
                  <ul>
                    {tasks.slice(0, 3).map((task) => (
                      <li key={task.id}>{task.title}</li>
                    ))}
                  </ul>
                  <details>
                    <summary>
                      {tasks.length > 3
                        ? `Ver mais ${tasks.length - 3} ações e detalhes`
                        : 'Detalhes das ações'}
                    </summary>
                    {tasks.map((task) => (
                      <div key={task.id}>
                        <strong>{task.title}</strong>
                        <p>{task.description}</p>
                      </div>
                    ))}
                  </details>
                </div>
              )}
              {(stage.assemblyIds || []).length > 0 && (
                <details className="prototype-stage-assemblies">
                  <summary>
                    Conjuntos relacionados <Icon name="down" size={16} />
                  </summary>
                  <div>
                    {stage.assemblyIds.map((id) => {
                      const part = catalog.assemblies.find((item) => item.id === id);
                      return (
                        part && (
                          <button
                            key={id}
                            className="prototype-text-button"
                            onClick={() => onSelect({ assemblyId: id }, 'arvore')}
                          >
                            {part.label}
                            <Icon name="tree" size={15} />
                          </button>
                        )
                      );
                    })}
                  </div>
                </details>
              )}
              <div className="prototype-reference-heading">
                <h3>Leis e atos</h3>
                <span>{acts.length}</span>
              </div>
              <ActList acts={acts} empty="As fontes estão sendo organizadas para esta etapa." />
              {stageSources.length > 0 && (
                <div className="prototype-stage-guidance">
                  <div className="prototype-reference-heading">
                    <h3>Orientações e serviços</h3>
                    <span>{stageSources.length}</span>
                  </div>
                  <ActList acts={stageSources} limit={2} />
                </div>
              )}
              <button className="prototype-text-button prototype-ask-context" onClick={onAsk}>
                <Icon name="chat" size={18} />
                Perguntar sobre esta etapa
                <Icon name="arrow" size={17} />
              </button>
            </>
          ) : (
            <div className="prototype-selection-empty">
              <div className="prototype-empty-icon">
                <Icon name="map" size={28} />
              </div>
              <h2>Um caminho por vez</h2>
              <p>Selecione uma etapa no mapa. Suas referências aparecem aqui.</p>
            </div>
          )}
        </aside>
      </div>
      {catalog.serviceLinks.length > 0 && (
        <details className="prototype-services">
          <summary>
            Portais e serviços oficiais
            <Icon name="down" size={16} />
          </summary>
          <div>
            {catalog.serviceLinks.map((link, index) => (
              <a
                key={link.id || index}
                href={link.url || link.officialUrl || link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label || link.title}
                <Icon name="external" size={15} />
              </a>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function AssistantView({
  assembly,
  subsystem,
  selectedNode,
  stage,
  acts,
  profile,
  onTree,
  onMap,
  initialQuestion,
}) {
  const [question, setQuestion] = useState(initialQuestion || '');
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const textInput = useRef(null);
  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      textInput.current?.focus();
    }
  }, [initialQuestion]);
  const context = stage?.label || selectedNode?.label || subsystem?.label || assembly?.label;
  const childContext =
    selectedNode && !stage
      ? `\nPeça visual: ${selectedNode.label}. Consultar fontes do conjunto ${assembly.label}, sem atribuir vínculo normativo próprio à peça.`
      : '';
  const questionLimit = 600 - childContext.length;
  const suggestions = context
    ? [
        `Quais referências consultar sobre ${context.toLowerCase()}?`,
        'O que preciso conferir no texto oficial?',
      ]
    : ['Como consultar o CAT e a LCVM?', 'Quais referências consultar para freios?'];
  async function submit(event) {
    event?.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      setAnswer(
        await askPrototype({
          question: question.trim().slice(0, questionLimit) + childContext,
          componentId: stage ? undefined : assembly?.id,
          subsystemId: stage ? undefined : subsystem?.id,
          stageId: stage?.id,
          profile,
        }),
      );
    } catch (error) {
      setError(
        error.message ||
          'Não foi possível consultar agora. Tente novamente ou abra as referências na Biblioteca.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="prototype-page prototype-assistant-page"
      aria-labelledby="prototype-assistant-title"
    >
      <header className="prototype-page-heading">
        <div>
          <h1 id="prototype-assistant-title">Assistente</h1>
          <p>Uma pergunta, com as fontes por perto.</p>
        </div>
      </header>
      <div className="prototype-assistant-workspace">
        <div className="prototype-assistant-context">
          <Icon name={stage ? 'map' : 'cube'} size={19} />
          <span>
            {context ? `Consultando: ${context}` : 'Consulta livre'}
            {selectedNode && !stage && (
              <small className="prototype-child-source-context">
                Fontes do conjunto {assembly.label.toLowerCase()}
              </small>
            )}
          </span>
          {!context && (
            <button className="prototype-text-button" onClick={onTree}>
              Escolher peça
            </button>
          )}
        </div>
        <form onSubmit={submit} className="prototype-ask-form">
          <label htmlFor="prototype-question">O que você quer consultar?</label>
          <textarea
            id="prototype-question"
            ref={textInput}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Escreva sua pergunta…"
            rows={3}
            maxLength={questionLimit}
          />
          <div>
            <span>Respostas com links para conferir.</span>
            <button className="prototype-primary" type="submit" disabled={busy || !question.trim()}>
              {busy ? 'Consultando…' : 'Consultar'}
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </form>
        {!answer && !busy && (
          <div className="prototype-question-suggestions" aria-label="Sugestões de pergunta">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuestion(suggestion);
                  textInput.current?.focus();
                }}
              >
                {suggestion}
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        )}
        {busy && (
          <div className="prototype-answer-loading" role="status">
            <span />
            <span />
            <span />
            <p>Buscando as referências da consulta…</p>
          </div>
        )}
        {error && (
          <p className="prototype-form-error" role="alert">
            {error}
          </p>
        )}
        {answer && !busy && (
          <div className="prototype-answer" aria-live="polite">
            <div className="prototype-answer-heading">
              <Icon name={answer.mode === 'ai' ? 'chat' : 'document'} size={19} />
              <h2>{answer.mode === 'ai' ? 'Resposta com fontes' : 'Fontes para sua consulta'}</h2>
            </div>
            {answer.mode === 'sources' && (
              <p className="prototype-source-mode">
                Consulta por fontes. A IA não está ativa nesta resposta.
              </p>
            )}
            <CitedAnswer answer={answer} />
            {answer.sources?.length > 0 && <ActList acts={answer.sources} />}
            <button
              className="prototype-text-button"
              onClick={() => {
                setAnswer(null);
                textInput.current?.focus();
              }}
            >
              Fazer outra pergunta
              <Icon name="arrow" size={16} />
            </button>
          </div>
        )}
        {!context && (
          <div className="prototype-assistant-paths">
            <button className="prototype-text-button" onClick={onTree}>
              <Icon name="tree" size={18} />
              Explorar a árvore
            </button>
            <button className="prototype-text-button" onClick={onMap}>
              <Icon name="map" size={18} />
              Ver o mapa de homologação
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function CitedAnswer({ answer }) {
  const citations = new Map((answer.citations || []).map((citation) => [citation.id, citation]));
  const sources = answer.sources || [];
  return (
    <div className="prototype-answer-text">
      {answer.answer.split(/(\[[^\]\n]+\])/g).map((text, index) => {
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

function LibraryView({ catalog, onBack }) {
  const [query, setQuery] = useState('');
  const [agency, setAgency] = useState('');
  const agencies = [...new Set(catalog.acts.map((act) => act.agency).filter(Boolean))].sort();
  const results = catalog.acts.filter(
    (act) =>
      (!agency || act.agency === agency) &&
      searchable(`${act.title} ${act.description} ${act.agency}`).includes(searchable(query)),
  );
  return (
    <section
      className="prototype-page prototype-library-page"
      aria-labelledby="prototype-library-title"
    >
      <button className="prototype-text-button prototype-back-button" onClick={onBack}>
        <Icon name="back" size={17} />
        Voltar à consulta
      </button>
      <header className="prototype-page-heading">
        <div>
          <h1 id="prototype-library-title">Biblioteca</h1>
          <p>Pesquise uma referência e abra a fonte oficial.</p>
        </div>
      </header>
      <div className="prototype-library-filters">
        <label className="prototype-search">
          <Icon name="search" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, número ou assunto"
            aria-label="Buscar leis e referências"
          />
        </label>
        <label className="prototype-agency-filter">
          <span className="prototype-sr-only">Filtrar por órgão</span>
          <select value={agency} onChange={(event) => setAgency(event.target.value)}>
            <option value="">Todos os órgãos</option>
            {agencies.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="prototype-result-count" aria-live="polite">
        {results.length}{' '}
        {results.length === 1 ? 'referência encontrada' : 'referências encontradas'}
      </p>
      <ActList
        acts={results}
        limit={20}
        empty="Nenhuma referência encontrada. Tente outro nome ou número."
      />
    </section>
  );
}

function ProfilePanel({ profile, onChange, onClose }) {
  const panel = useRef(null);
  useEffect(() => {
    panel.current?.querySelector('button')?.focus();
    const handler = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div
      className="prototype-profile-panel"
      ref={panel}
      role="region"
      aria-label="Perfil da consulta"
    >
      <div className="prototype-options-heading">
        <h2>Perfil da consulta</h2>
        <button className="prototype-icon-button" onClick={onClose} aria-label="Fechar perfil">
          <Icon name="close" />
        </button>
      </div>
      <p>Opcional. Guardado apenas neste navegador.</p>
      <label>
        Nome do projeto
        <input
          value={profile.name || ''}
          onChange={(event) => onChange({ ...profile, name: event.target.value })}
          placeholder="Meu projeto"
          maxLength={80}
        />
      </label>
      <label>
        Propulsão
        <select
          value={profile.propulsion || ''}
          onChange={(event) => onChange({ ...profile, propulsion: event.target.value })}
        >
          <option value="">Não definida</option>
          <option value="combustion">Combustão</option>
          <option value="hev">Híbrido (HEV)</option>
          <option value="phev">Híbrido plug-in (PHEV)</option>
          <option value="bev">Elétrico (BEV)</option>
        </select>
      </label>
      <p className="prototype-quiet-note">
        O perfil organiza a consulta; não confirma a aplicação de uma norma.
      </p>
      <button className="prototype-primary" onClick={onClose}>
        <Icon name="check" size={17} />
        Concluir
      </button>
    </div>
  );
}

export default function PrototypeApp() {
  const [route, setRoute] = useState(parseRoute);
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerError, setViewerError] = useState('');
  const [viewerParts, setViewerParts] = useState([]);
  const [controls, setControls] = useState({
    mode: 'assembled',
    explosion: 0,
    isolated: false,
    camera: 'perspective',
  });
  const [profile, setProfile] = useState(() => readSaved().profile || {});
  const [profileOpen, setProfileOpen] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const viewport = useRef(null);
  const viewer = useRef(null);
  const routeRef = useRef(route);
  const previousView = useRef('veiculo');

  const navigate = useCallback((view, changes = {}) => {
    const current = routeRef.current;
    if (view === 'biblioteca' && current.view !== 'biblioteca') previousView.current = current.view;
    const next = { ...current, ...changes, view };
    const params = new URLSearchParams();
    if (next.part) params.set('part', next.part);
    if (next.subsystem) params.set('subsystem', next.subsystem);
    if (next.node) params.set('node', next.node);
    if (next.stage) params.set('stage', next.stage);
    const hash = `#${view}${params.size ? `?${params}` : ''}`;
    if (location.hash === hash) setRoute(next);
    else location.hash = hash;
  }, []);

  const selectPart = useCallback(
    (part, view) => {
      const current = routeRef.current;
      navigate(view || current.view, {
        part: part.assemblyId || part.id || '',
        subsystem: part.subsystemId || '',
        node: part.nodeId || '',
        stage: '',
      });
    },
    [navigate],
  );

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener('hashchange', handler);
    if (!location.hash) {
      const saved = readSaved();
      navigate('veiculo', {
        part: saved.part || '',
        subsystem: saved.subsystem || '',
        node: saved.node || '',
      });
    }
    let active = true;
    Promise.resolve(loadPrototypeCatalog())
      .then((data) => {
        if (active) setCatalog(normalizeCatalog(data));
      })
      .catch(() => {
        if (active)
          setLoadError('O catálogo não carregou. Recarregue a página para tentar novamente.');
      });
    return () => {
      active = false;
      window.removeEventListener('hashchange', handler);
    };
  }, [navigate]);

  useEffect(() => {
    routeRef.current = route;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ profile, part: route.part, subsystem: route.subsystem, node: route.node }),
      );
    } catch {
      /* Navigation remains available when browser storage is disabled. */
    }
  }, [route, profile]);

  useEffect(() => {
    if (!catalog || !viewport.current || viewer.current) return;
    try {
      viewer.current = mountVehicleViewer(viewport.current, {
        onSelect: (part) => selectPart(part, 'veiculo'),
        onReady: (details) => {
          setViewerReady(true);
          setViewerParts(asArray(viewer.current?.getParts?.() || details?.pieces));
          const current = routeRef.current;
          if (current.part)
            viewer.current?.setSelection({
              assemblyId: current.part,
              subsystemId: current.subsystem,
              nodeId: current.node,
            });
        },
        onError: () =>
          setViewerError(
            'O 3D não carregou neste navegador. Você pode consultar todas as peças pela árvore.',
          ),
        onState: (state) =>
          setControls((previous) => {
            const next = {
              mode: state.mode,
              explosion: state.explosion,
              isolated: state.isolated,
              camera: state.camera,
            };
            return previous.mode === next.mode &&
              previous.explosion === next.explosion &&
              previous.isolated === next.isolated &&
              previous.camera === next.camera
              ? previous
              : next;
          }),
      });
      if (routeRef.current.part)
        viewer.current?.setSelection({
          assemblyId: routeRef.current.part,
          subsystemId: routeRef.current.subsystem,
          nodeId: routeRef.current.node,
        });
    } catch {
      setViewerError(
        'O 3D não carregou neste navegador. Você pode consultar todas as peças pela árvore.',
      );
    }
    return () => {
      viewer.current?.destroy();
      viewer.current = null;
    };
  }, [catalog, selectPart]);

  useEffect(() => {
    viewer.current?.setSelection({
      assemblyId: route.part,
      subsystemId: route.subsystem,
      nodeId: route.node,
    });
  }, [route.part, route.subsystem, route.node]);

  const assembly = catalog?.assemblies.find((item) => item.id === route.part);
  const subsystem = catalog?.subsystems.find((item) => item.id === route.subsystem);
  const stage = catalog?.stages.find((item) => item.id === route.stage);
  const selectedNode = viewerParts.find((item) => item.nodeId === route.node);
  const references =
    catalog && assembly
      ? getSelectionReferences(catalog, {
          assemblyId: route.part,
          subsystemId: route.subsystem || undefined,
          partId: route.node || undefined,
          parentAssemblyId: route.part,
        })
      : null;
  const sourceReferences = references?.parentContext || references;
  const componentActs = (sourceReferences?.componentActs || []).map((act) => ({
    ...act,
    referenceContext: references?.parentContext
      ? `Referência do conjunto ${assembly.label}`
      : 'Componente ou conjunto selecionado',
  }));
  const seenActIds = new Set(componentActs.map((act) => act.id));
  const vehicleContextActs = (sourceReferences?.vehicleContextActs || [])
    .filter((act) => !seenActIds.has(act.id))
    .map((act) => ({
      ...act,
      referenceContext: references?.parentContext
        ? `Contexto do veículo relacionado ao conjunto ${assembly.label}`
        : 'Contexto do veículo completo',
    }));
  const acts = [...componentActs, ...vehicleContextActs];
  const relatedStage =
    assembly && catalog?.stages.find((item) => item.assemblyIds?.includes(assembly.id));
  const goToRelatedStage = relatedStage
    ? () => navigate('mapa', { stage: relatedStage.id })
    : undefined;
  const assistantActs = stage ? catalog.acts.filter((act) => stage.actIds?.includes(act.id)) : acts;
  const askContext = () => {
    const context =
      (route.view === 'mapa' ? stage?.label : '') ||
      subsystem?.label ||
      selectedNode?.label ||
      assembly?.label;
    setAssistantQuestion(
      context ? `Quais referências consultar sobre ${context.toLowerCase()}?` : '',
    );
    navigate('assistente', route.view === 'mapa' ? {} : { stage: '' });
  };
  const shortcutIds = ['engine', 'batteryHV', 'brakes', 'lights'];
  const shortcuts = catalog
    ? shortcutIds.map((id) => catalog.assemblies.find((item) => item.id === id)).filter(Boolean)
    : [];

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
          onClick={() => navigate('veiculo')}
          aria-label="Legislação Automotiva — veículo"
        >
          <Icon name="car" size={29} />
          <span>
            Legislação<span>Automotiva</span>
          </span>
        </button>
        <nav className="prototype-nav" aria-label="Navegação principal">
          {NAV.map(([id, label, icon]) => (
            <button
              key={id}
              className={route.view === id ? 'is-selected' : ''}
              aria-current={route.view === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon name={icon} size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="prototype-header-actions">
          <button
            className={`prototype-library-button${route.view === 'biblioteca' ? ' is-selected' : ''}`}
            onClick={() => navigate('biblioteca')}
            aria-label="Abrir Biblioteca"
          >
            <Icon name="library" size={19} />
            <span>Biblioteca</span>
          </button>
          <button
            className="prototype-icon-button"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Perfil da consulta"
            aria-expanded={profileOpen}
          >
            <Icon name="profile" size={19} />
          </button>
        </div>
      </header>
      {profileOpen && (
        <ProfilePanel
          profile={profile}
          onChange={setProfile}
          onClose={() => setProfileOpen(false)}
        />
      )}
      <main id="prototype-main" tabIndex="-1">
        {loadError ? (
          <div className="prototype-load-error" role="alert">
            <Icon name="info" size={25} />
            <h1>Catálogo indisponível</h1>
            <p>{loadError}</p>
            <button className="prototype-primary" onClick={() => location.reload()}>
              Recarregar
            </button>
          </div>
        ) : !catalog ? (
          <div className="prototype-app-loading" role="status">
            <div />
            <p>Preparando a bancada…</p>
          </div>
        ) : (
          <>
            <section
              className="prototype-vehicle-page"
              hidden={route.view !== 'veiculo'}
              aria-label="Bancada 3D do veículo"
            >
              <div className="prototype-stage-header">
                <div>
                  <h1>{profile.name || 'Explore o veículo'}</h1>
                  <p>Selecione uma peça. Consulte suas referências.</p>
                </div>
                <button className="prototype-text-button" onClick={() => navigate('arvore')}>
                  Abrir árvore
                  <Icon name="tree" size={17} />
                </button>
              </div>
              <div className="prototype-vehicle-layout">
                <aside className="prototype-quick-parts" aria-label="Acesso rápido aos conjuntos">
                  <span>Conjuntos</span>
                  {shortcuts.map((part) => (
                    <button
                      key={part.id}
                      className={route.part === part.id ? 'is-selected' : ''}
                      onClick={() => selectPart({ assemblyId: part.id })}
                    >
                      <Icon
                        name={
                          part.id === 'engine'
                            ? 'cube'
                            : part.id === 'batteryHV'
                              ? 'cube'
                              : part.id === 'brakes'
                                ? 'focus'
                                : 'car'
                        }
                        size={21}
                      />
                      <span>{part.label}</span>
                    </button>
                  ))}
                  <button className="prototype-all-parts" onClick={() => navigate('arvore')}>
                    <Icon name="tree" size={20} />
                    <span>Todos os conjuntos</span>
                    <Icon name="chevron" size={15} />
                  </button>
                </aside>
                <div className="prototype-vehicle-studio">
                  <VehicleControls
                    viewer={viewer}
                    controls={controls}
                    setControls={setControls}
                    hasSelection={Boolean(assembly)}
                  />
                  <div
                    className="prototype-viewport"
                    ref={viewport}
                    aria-label="Modelo 3D interativo do veículo"
                  />
                  {!viewerReady && !viewerError && (
                    <div className="prototype-viewer-loading" role="status">
                      <span />
                      <p>Carregando o veículo 3D…</p>
                    </div>
                  )}
                  {viewerError && (
                    <div className="prototype-viewer-error" role="status">
                      <Icon name="cube" size={36} />
                      <p>{viewerError}</p>
                      <button className="prototype-primary" onClick={() => navigate('arvore')}>
                        Abrir árvore
                      </button>
                    </div>
                  )}
                  <div className="prototype-studio-caption">
                    <span>
                      <Icon name="cube" size={14} />
                      Modelo didático
                    </span>
                    <span>Arraste para girar · Role para aproximar</span>
                  </div>
                  {assembly && (
                    <button
                      className="prototype-selection-chip"
                      onClick={() => viewer.current?.focusSelection()}
                    >
                      <span className="prototype-selection-dot" />
                      {selectedNode?.label || subsystem?.label || assembly.label}
                      <Icon name="focus" size={15} />
                    </button>
                  )}
                </div>
                <SelectionInspector
                  selection={route}
                  assembly={assembly}
                  subsystem={subsystem}
                  selectedNode={selectedNode}
                  acts={acts}
                  references={references}
                  onAsk={askContext}
                  onMap={goToRelatedStage}
                  onTree={() => navigate('arvore')}
                />
              </div>
            </section>
            {route.view === 'arvore' && (
              <TreeView
                catalog={catalog}
                selection={route}
                onSelect={selectPart}
                viewerParts={viewerParts}
                acts={acts}
                references={references}
                assembly={assembly}
                subsystem={subsystem}
                selectedNode={selectedNode}
                onAsk={askContext}
                onMap={goToRelatedStage}
              />
            )}
            {route.view === 'mapa' && (
              <MapView
                catalog={catalog}
                route={route}
                onStage={(id) => navigate('mapa', { stage: id })}
                onSelect={selectPart}
                onAsk={askContext}
              />
            )}
            {route.view === 'assistente' && (
              <AssistantView
                assembly={assembly}
                subsystem={subsystem}
                selectedNode={selectedNode}
                stage={stage}
                acts={assistantActs}
                profile={profile}
                onTree={() => navigate('arvore')}
                onMap={() => navigate('mapa')}
                initialQuestion={assistantQuestion}
              />
            )}
            {route.view === 'biblioteca' && (
              <LibraryView catalog={catalog} onBack={() => navigate(previousView.current)} />
            )}
          </>
        )}
      </main>
      <footer className="prototype-footer">
        <span>Protótipo de consulta</span>
        <details className="prototype-model-credits">
          <summary>Créditos do modelo</summary>
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
            . Apresentação e materiais adaptados. Subconjuntos mecânicos didáticos; não representam
            o CAD interno do fabricante.
          </p>
        </details>
        <a href="/" target="_blank" rel="noopener noreferrer">
          Abrir o portal
          <Icon name="external" size={12} />
        </a>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('prototype-root');
if (rootElement) createRoot(rootElement).render(<PrototypeApp />);
