import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import VehicleScene from './VehicleScene.jsx';
import { PARTS, visibleParts } from './vehicle-parts.js';
import {
  DEFAULT_PROFILE,
  normalizeProfile,
  evaluateProfile,
  buildChecklist,
  buildFlow,
  exportProcessMarkdown,
  SOURCE_REFERENCES,
} from './process-model.js';
import { loadProjects, saveProjects, validateProject } from './storage.js';

const SYSTEM_LABELS = {
  carroceria: 'Carroceria e proteção',
  vidros: 'Vidros e visibilidade',
  bancos: 'Proteção dos ocupantes',
  chassi: 'Chassi e direção',
  'pneus-rodas': 'Pneus e rodas',
  freios: 'Freios e estabilidade',
  motor: 'Propulsão térmica',
  bateria: 'Propulsão elétrica',
  escapamento: 'Emissões e ruído',
  tanque: 'Combustível',
  eletrica: 'Eletrônica',
  iluminacao: 'Iluminação',
  retrovisores: 'Visão indireta',
  identificacao: 'Identificação',
};
const TABS = [
  ['explore', 'Explorador 3D'],
  ['flow', 'Fluxo do processo'],
  ['checklist', 'Checklist'],
  ['sources', 'Guia e fontes'],
];
const CATEGORIES = {
  M1: 'M1 · Passageiros até 8 + motorista',
  M2: 'M2 · Passageiros >8 · até 5 t',
  M3: 'M3 · Passageiros >8 · acima de 5 t',
  N1: 'N1 · Carga até 3,5 t',
  N2: 'N2 · Carga >3,5 até 12 t',
  N3: 'N3 · Carga acima de 12 t',
  O: 'O · Reboque / semirreboque',
  L: 'L · Motociclos e similares',
};
const POWERTRAINS = {
  ice: 'Combustão',
  hev: 'Híbrido HEV',
  phev: 'Híbrido plug-in PHEV',
  bev: 'Elétrico BEV',
};
const STATUS = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  done: 'Concluído',
  na: 'Não aplicável',
};
const AGENCY_ROUTES = {
  IBAMA: 'proconve',
  SENATRAN: 'contran',
  CONTRAN: 'contran',
  Inmetro: 'inmetro',
  INMETRO: 'inmetro',
  Anatel: 'anatel',
  ANATEL: 'anatel',
  MDIC: 'mover',
};
const safeSources = Array.isArray(SOURCE_REFERENCES)
  ? SOURCE_REFERENCES
  : Object.values(SOURCE_REFERENCES);
function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return {
      getItem() {
        throw Error();
      },
      setItem() {
        throw Error();
      },
    };
  }
}
function download(name, text, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function readRoute() {
  const p = new URLSearchParams(location.hash.split('?')[1] || '');
  return {
    tab: TABS.some(([id]) => id === p.get('tab')) ? p.get('tab') : 'explore',
    part: PARTS.some((x) => x.id === p.get('part')) ? p.get('part') : 'brakes',
    stage: p.get('stage') || '',
    project: p.get('project') || '',
  };
}
function SourceLinks({ ids = [] }) {
  const rows = safeSources.filter((x) => ids.includes(x.id));
  return (
    <div className="g-source-links">
      {rows.map((x) => (
        <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer">
          {x.title} ↗
        </a>
      ))}
      {ids.length > 0 && !rows.length && (
        <span>Referência no guia de fontes; conferir dispositivo.</span>
      )}
    </div>
  );
}
function Icon({ name }) {
  const paths = {
    plus: 'M12 5v14M5 12h14',
    box: 'm12 3 9 5v9l-9 5-9-5V8l9-5Zm0 0v19M3 8l9 5 9-5',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    check: 'm5 12 4 4L19 6',
    file: 'M14 2H6v20h12V6l-4-4Zm0 0v5h5M9 12h6m-6 4h6',
    tree: 'M5 3v14h14M5 8h14M13 3v5m0 9v4',
    export: 'M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.file} />
    </svg>
  );
}

function ProfileForm({ initial, onSave, onClose }) {
  const [p, setP] = useState(
    initial
      ? { ...DEFAULT_PROFILE, ...initial }
      : {
          ...DEFAULT_PROFILE,
          name: '',
          massKg: null,
          massRunningKg: null,
          payloadKg: null,
          seats: null,
          radio: null,
        },
  );
  const dialog = useRef();
  useEffect(() => {
    dialog.current.showModal();
    return () => dialog.current?.close();
  }, []);
  const update = (key, value) => setP((x) => ({ ...x, [key]: value }));
  const select = (key, label, options) => (
    <label>
      {label}
      <select aria-label={label} value={p[key] ?? ''} onChange={(e) => update(key, e.target.value)}>
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  const number = (key, label, required = false, min = 0) => (
    <label>
      {label}
      <input
        type="number"
        aria-label={label}
        min={min}
        max={key === 'year' ? 2100 : 1000000}
        step="1"
        required={required}
        value={p[key] ?? ''}
        onChange={(e) => update(key, e.target.value === '' ? null : Number(e.target.value))}
      />
    </label>
  );
  return (
    <dialog ref={dialog} className="g-modal" aria-labelledby="g-profile-title" onCancel={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(normalizeProfile(p));
        }}
      >
        <div className="g-modal-head">
          <div>
            <span className="g-eyebrow">ENQUADRAMENTO DO PROJETO</span>
            <h2 id="g-profile-title">
              {initial ? 'Editar perfil técnico' : 'Iniciar novo processo'}
            </h2>
          </div>
          <button
            type="button"
            className="g-icon-button"
            onClick={onClose}
            aria-label="Fechar perfil"
          >
            ×
          </button>
        </div>
        <p>
          O perfil organiza as verificações. Dados desconhecidos ficam como pendências de
          enquadramento.
        </p>
        <label>
          Nome do processo
          <input
            autoFocus
            required
            maxLength={200}
            value={p.name || ''}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Ex.: Plataforma urbana · modelo 2027"
          />
        </label>
        <div className="g-form-grid">
          {select('category', 'Categoria técnica', CATEGORIES)}
          {select('powertrain', 'Propulsão', POWERTRAINS)}
          {select('purpose', 'Natureza do processo', {
            series: 'Fabricação / comercialização em série',
            limited: 'Quantidades limitadas · enquadrar',
            modification: 'Transformação / modificação',
            component: 'Projeto de componente',
          })}
          {select('origin', 'Origem', { national: 'Nacional', imported: 'Importado' })}
          {select('usage', 'Uso do veículo', {
            general: 'Geral · detalhar na matriz',
            urban: 'Transporte exclusivamente urbano',
            school: 'Transporte escolar',
          })}
          {select('fuel', 'Combustível', {
            flex: 'Flex',
            gasoline: 'Gasolina',
            diesel: 'Diesel',
            electric: 'Eletricidade',
          })}
          {number('year', 'Ano de introdução previsto', true, 1900)}
          {number('massKg', 'Massa máxima / PBT (kg)')}
          {number('massRunningKg', 'Massa em ordem de marcha (kg)')}
          {number('payloadKg', 'Carga útil (kg)')}
          {number('seats', 'Assentos incluindo motorista')}
          {select('derivedFromPassenger', 'Derivado de veículo de passageiros?', {
            '': 'Não informado',
            true: 'Sim',
            false: 'Não',
          })}
          {select('offroad', 'Enquadramento fora de estrada?', {
            '': 'Não informado',
            true: 'A verificar pelos critérios normativos',
            false: 'Não',
          })}
          {select('componentMarket', 'Destino do componente', {
            oem: 'Montagem original / OEM',
            replacement: 'Reposição',
          })}
        </div>
        {select('radio', 'Equipamentos de radiofrequência (Bluetooth, Wi-Fi, celular, radar)', {
          '': 'Não informado · verificar configuração',
          true: 'Sim',
          false: 'Não',
        })}
        <p className="g-note">
          Categoria, carroceria, uso especial, datas e versão precisam ser confrontados com a fonte.
          O perfil não emite homologação.
        </p>
        <footer>
          <button className="g-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="g-button g-primary" type="submit">
            {initial ? 'Atualizar perfil' : 'Criar processo e checklist'} <Icon name="arrow" />
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function FlowPanel({ profile, selectedStage, onSelect, items, checks }) {
  const flow = useMemo(() => buildFlow(profile), [profile]);
  const nodes = flow.nodes.map((n, i) => {
    const stageItems = items.filter((x) => x.stage === n.id);
    const done = stageItems.filter((x) => checks[x.id]?.status === 'done').length;
    return {
      id: n.id,
      position: n.position ||
        {
          enquadramento: { x: 300, y: 0 },
          projeto: { x: 300, y: 130 },
          ambiente: { x: 0, y: 290 },
          seguranca: { x: 300, y: 290 },
          componentes: { x: 600, y: 290 },
          dossie: { x: 300, y: 470 },
          cat: { x: 300, y: 610 },
          producao: { x: 300, y: 750 },
          cop: { x: 300, y: 890 },
        }[n.id] || { x: 300, y: i * 140 },
      data: {
        label: (
          <>
            <span className="g-node-agency">{n.agency || 'PROJETO'}</span>
            <strong>{n.title}</strong>
            {stageItems.length > 0 && (
              <small>
                {done}/{stageItems.length} itens concluídos
              </small>
            )}
          </>
        ),
      },
      selected: selectedStage === n.id,
      style: { borderColor: selectedStage === n.id ? '#ffb287' : undefined },
      type: 'default',
    };
  });
  const edges = flow.edges.map((e) => ({
    ...e,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#777d89' },
    style: { stroke: '#777d89', strokeWidth: 1.5 },
    label: e.label,
  }));
  const active = flow.nodes.find((x) => x.id === selectedStage) || flow.nodes[0];
  return (
    <div className="g-flow-layout">
      <section className="g-flow-canvas" aria-label="Mapa interativo de homologação">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, n) => onSelect(n.id)}
          minZoom={0.25}
          maxZoom={1.5}
          colorMode={document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}
          proOptions={{ hideAttribution: false }}
          ariaLabelConfig={{
            'controls.zoomIn': 'Aumentar mapa',
            'controls.zoomOut': 'Diminuir mapa',
            'controls.fitView': 'Ajustar mapa',
            'node.a11yDescription.default': 'Pressione Enter para selecionar uma etapa.',
          }}
        >
          <Background gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </section>
      <aside className="g-flow-aside">
        <span className="g-eyebrow">ETAPAS E DEPENDÊNCIAS</span>
        <h2>Da definição à produção.</h2>
        <p className="g-muted">
          As frentes podem ocorrer em paralelo. As setas organizam o dossiê e não impõem precedência
          legal universal.
        </p>
        <nav aria-label="Etapas do processo" className="g-stage-list">
          {flow.nodes.map((n, i) => (
            <button key={n.id} aria-pressed={active?.id === n.id} onClick={() => onSelect(n.id)}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {n.title}
            </button>
          ))}
        </nav>
        {active && (
          <div className="g-stage-detail">
            <span className="g-tag">{active.agency || 'Projeto'}</span>
            <h3>{active.title}</h3>
            <p>{active.description}</p>
            {items
              .filter((x) => x.stage === active.id)
              .map((x) => (
                <p className="g-note" key={x.id}>
                  {x.title}
                </p>
              ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function Checklist({ items, checks, onChange, project }) {
  const [agency, setAgency] = useState('all');
  const [filter, setFilter] = useState('all');
  const visible = items.filter(
    (x) =>
      (agency === 'all' || x.agency === agency) &&
      (filter === 'all' || (checks[x.id]?.status || 'pending') === filter),
  );
  return (
    <section className="g-checklist">
      <div className="g-section-heading">
        <div>
          <span className="g-eyebrow">DOSSIÊ DE HOMOLOGAÇÃO</span>
          <h2>Uma evidência para cada decisão.</h2>
        </div>
        <div className="g-filter-row">
          <label className="g-sr-only" htmlFor="g-agency-filter">
            Filtrar checklist por órgão
          </label>
          <select id="g-agency-filter" value={agency} onChange={(e) => setAgency(e.target.value)}>
            <option value="all">Todos os órgãos</option>
            {[...new Set(items.map((x) => x.agency))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <label className="g-sr-only" htmlFor="g-status-filter">
            Filtrar checklist por status
          </label>
          <select id="g-status-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            {Object.entries(STATUS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="g-muted">
        {project
          ? 'Registre o trabalho e a referência à evidência. “Concluído” é um controle de trabalho, sem aprovação automática.'
          : 'Exemplo de roteiro. Inicie um processo para registrar status, justificativas e evidências.'}
      </p>
      <p role="status" className="g-note">
        {visible.length} de {items.length} verificações exibidas
      </p>
      {visible.map((item, i) => {
        const check = checks[item.id] || { status: 'pending', note: '', evidence: '' };
        return (
          <article key={item.id} className={'g-check-item g-status-' + check.status}>
            <details>
              <summary>
                <span className="g-item-index">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <span className="g-tag">
                    {item.agency} ·{' '}
                    {item.applicability === 'required'
                      ? 'Providência do processo'
                      : item.applicability === 'conditional'
                        ? 'Condicional'
                        : 'Revisão necessária'}
                  </span>
                  <h3>{item.title}</h3>
                  <span className="g-muted">{item.reason}</span>
                </div>
                <span className="g-status-label">{STATUS[check.status]}</span>
              </summary>
              <div className="g-check-body">
                <p>{item.description}</p>
                {item.evidence?.length > 0 && (
                  <>
                    <h4>Evidências a organizar</h4>
                    <ul>
                      {item.evidence.map((s, j) => (
                        <li key={j}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>
                      ))}
                    </ul>
                  </>
                )}
                <SourceLinks ids={item.sourceIds} />
                <div className="g-form-grid">
                  <label>
                    Status
                    <select
                      disabled={!project}
                      value={check.status}
                      onChange={(e) => onChange(item.id, { ...check, status: e.target.value })}
                    >
                      {Object.entries(STATUS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Referência da evidência
                    <input
                      disabled={!project}
                      maxLength={1000}
                      placeholder="Identificação do relatório, revisão ou local do arquivo"
                      value={typeof check.evidence === 'string' ? check.evidence : ''}
                      onChange={(e) => onChange(item.id, { ...check, evidence: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Notas e justificativa
                  {check.status === 'na' ? ' · obrigatória para não aplicável' : ''}
                  <textarea
                    disabled={!project}
                    maxLength={10000}
                    rows={3}
                    value={check.note || ''}
                    onChange={(e) => onChange(item.id, { ...check, note: e.target.value })}
                  />
                </label>
              </div>
            </details>
          </article>
        );
      })}
      {!visible.length && <div className="g-empty">Nenhuma verificação com esses filtros.</div>}
    </section>
  );
}

function SourcesPanel({ evaluation }) {
  return (
    <section className="g-sources">
      <div className="g-section-heading">
        <div>
          <span className="g-eyebrow">CONSULTA PROFISSIONAL</span>
          <h2>Entenda o caso. Confira a fonte.</h2>
        </div>
        <a href="#library" className="g-button">
          Abrir acervo completo <Icon name="arrow" />
        </a>
      </div>
      <div className="g-knowledge-grid">
        <article>
          <span className="g-tag">IBAMA · EMISSÕES</span>
          <h3>LP, LC e a rota ambiental</h3>
          <p>
            LP é leve de passageiros; LC é leve comercial. O enquadramento ambiental usa critérios
            próprios e não corresponde automaticamente à categoria M1 ou N1.
          </p>
          <p>
            Para as fases L7/L8, verifique massa máxima, massa em ordem de marcha, assentos, carga
            útil e derivação. Um SUV não se torna LC pelo nome comercial.
          </p>
          <p>
            LCVM atende veículos e motores no PROCONVE; LCM pertence ao PROMOT. Licença ambiental,
            anuência de importação/LPCO e CAT são entregas distintas.
          </p>
          <a href="docs/guide/emissoes.md" target="_blank" rel="noopener noreferrer">
            Ler guia de emissões ↗
          </a>
        </article>
        <article>
          <span className="g-tag">SENATRAN · SEGURANÇA</span>
          <h3>Relatórios conforme o veículo</h3>
          <p>
            Categoria, PBT, carroceria, uso, configuração e datas alteram o conjunto de
            comprovações. A matriz do Anexo XI da Portaria 990/2022 organiza os níveis de
            declaração, segurança ativa e passiva.
          </p>
          <p>
            Verifique a resolução vigente de cada requisito e os módulos do SISCAT. A condição de
            SGQ e o tipo de transformação também mudam os documentos do processo.
          </p>
          <a href="docs/guide/seguranca-siscat.md" target="_blank" rel="noopener noreferrer">
            Ler guia de segurança e SISCAT ↗
          </a>
        </article>
        <article>
          <span className="g-tag">COMPONENTES E PROGRAMAS</span>
          <h3>Peça nova, integração e mercado</h3>
          <p>
            Considere função, material, montagem original ou reposição, mecanismo Inmetro e
            equipamento final com radiofrequência. Um módulo Anatel homologado não representa
            dispensa automática da integração.
          </p>
          <p>
            Habilitação, eficiência e compromissos MOVER precisam de enquadramento próprio no MDIC.
            Não equivalem ao CAT.
          </p>
          <a href="docs/guide/orgaos-e-componentes.md" target="_blank" rel="noopener noreferrer">
            Consultar órgãos e projeto de componentes ↗
          </a>
        </article>
      </div>
      <div className="g-rule-callout">
        <strong>Emissões · o que este perfil indica</strong>
        <p>{evaluation.emissions.label}</p>
        {evaluation.emissions.particularities?.map((x, i) => (
          <p key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</p>
        ))}
      </div>
      <div className="g-rule-callout">
        <strong>Segurança · {evaluation.safety.label}</strong>
        {evaluation.safety.particularities?.map((x, i) => (
          <p key={i}>{x}</p>
        ))}
        <SourceLinks ids={evaluation.safety.sourceIds} />
      </div>
      <div className="g-filter-row" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <a
          className="g-button"
          href="data/process/knowledge-index.json"
          download="base-normativa.json"
        >
          Baixar base normativa JSON <Icon name="export" />
        </a>
        <a
          className="g-button"
          href="docs/guide/banco-normativo.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          Estrutura e atualização da base ↗
        </a>
      </div>
      <h3>Referências do roteiro</h3>
      <p className="g-muted">
        Fontes para triagem e organização do trabalho. A profundidade de revisão dos atos do acervo
        continua indicada em cada ficha.
      </p>
      <div className="g-official-sources">
        {safeSources.map((s) => (
          <article key={s.id}>
            <span className="g-tag">{s.agency}</span>
            <h4>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title} ↗
              </a>
            </h4>
            <p>{s.device || s.scope}</p>
            {s.checkedAt && (
              <small>
                Consulta: {s.checkedAt} · {s.evidenceType || 'fonte oficial'}
              </small>
            )}
            {s.limitations && (
              <small>
                {Array.isArray(s.limitations) ? s.limitations.join(' ') : s.limitations}
              </small>
            )}
          </article>
        ))}
      </div>
      <a href="docs/guide/evidence-review.md" target="_blank" rel="noopener noreferrer">
        Consultar registro de pesquisa e limites ↗
      </a>
    </section>
  );
}

function GuideApp({ bridge }) {
  const initial = useMemo(() => loadProjects(safeStorage()), []);
  const initialRoute = useMemo(readRoute, []);
  const [projects, setProjects] = useState(initial.projects);
  const [projectId, setProjectId] = useState(initialRoute.project || initial.projects[0]?.id || '');
  const [tab, setTab] = useState(initialRoute.tab);
  const [partId, setPartId] = useState(initialRoute.part);
  const [stage, setStage] = useState(initialRoute.stage);
  const [exploded, setExploded] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(
    initial.error ||
      (initialRoute.project &&
      initialRoute.project !== 'demo' &&
      !initial.projects.some((p) => p.id === initialRoute.project)
        ? 'Este processo não está salvo neste navegador. Importe o backup JSON para recuperar seu perfil e evidências.'
        : ''),
  );
  const firstPersistence = useRef(true);
  const [storageError, setStorageError] = useState(initial.error || '');
  const fileInput = useRef();
  const project = projects.find((x) => x.id === projectId);
  const profile = project?.profile || { ...DEFAULT_PROFILE, name: 'Veículo de demonstração' };
  const evaluation = useMemo(() => evaluateProfile(profile), [profile]);
  const items = useMemo(() => buildChecklist(profile), [profile]);
  const checks = project?.checks || {};
  const part =
    visibleParts(profile.category, profile.powertrain).find((x) => x.id === partId) ||
    visibleParts(profile.category, profile.powertrain)[0] ||
    PARTS[0];
  const records = useMemo(() => bridge.records(part), [part, bridge]);
  const availableParts = visibleParts(profile.category, profile.powertrain);
  const filtered = availableParts.filter((x) =>
    (x.label + ' ' + x.system)
      .toLocaleLowerCase('pt-BR')
      .includes(partSearch.toLocaleLowerCase('pt-BR')),
  );
  const systems = [...new Set(filtered.map((x) => x.system))];
  const done = items.filter((x) => checks[x.id]?.status === 'done').length;
  const na = items.filter((x) => checks[x.id]?.status === 'na').length;
  const activeCount = items.length - na;
  const progress = activeCount ? Math.round((done / activeCount) * 100) : 0;
  useEffect(() => {
    if (firstPersistence.current) {
      firstPersistence.current = false;
      return;
    }
    const error = saveProjects(safeStorage(), projects);
    setStorageError(error || '');
  }, [projects]);
  useEffect(() => {
    const sync = () => {
      const r = readRoute();
      setTab(r.tab);
      setPartId(r.part);
      setStage(r.stage);
      if (r.project) setProjectId(r.project);
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const route = (changes) => {
    const current = { tab, part: partId, stage, project: projectId, ...changes };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(current)) if (v) p.set(k, v);
    history.pushState(null, '', '#guide?' + p);
  };
  function selectTab(id) {
    setTab(id);
    route({ tab: id });
  }
  function selectPart(id) {
    setPartId(id);
    route({ part: id });
  }
  function updateCheck(id, next) {
    if (!project) return;
    if (next.status === 'na' && !next.note?.trim()) {
      setNotice('Antes de marcar como não aplicável, escreva a justificativa nas notas do item.');
      return;
    }
    setProjects((old) =>
      old.map((p) =>
        p.id === projectId
          ? { ...p, updatedAt: new Date().toISOString(), checks: { ...p.checks, [id]: next } }
          : p,
      ),
    );
    setNotice('');
  }
  function saveProfile(value) {
    if (editing === 'edit' && project) {
      setProjects((old) =>
        old.map((p) =>
          p.id === project.id
            ? {
                ...p,
                profile: value,
                profileHistory: [
                  ...(p.profileHistory || []),
                  { profile: p.profile, changedAt: new Date().toISOString() },
                ].slice(-20),
                checks: Object.fromEntries(
                  Object.entries(p.checks).map(([id, check]) => [
                    id,
                    {
                      ...check,
                      status: 'pending',
                      note: ('Revalidar após alteração do perfil. ' + (check.note || '')).slice(
                        0,
                        10000,
                      ),
                    },
                  ]),
                ),
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
      setNotice(
        'Perfil atualizado. Reavalie as evidências e os itens concluídos: as condições podem ter mudado.',
      );
    } else {
      if (projects.length >= 50) {
        setNotice(
          'Limite de 50 processos neste navegador. Exporte os backups antes de iniciar outro.',
        );
        setEditing(null);
        return;
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID?.() || 'processo-' + Date.now();
      const p = {
        schemaVersion: 1,
        id,
        profile: value,
        createdAt: now,
        updatedAt: now,
        checks: {},
      };
      setProjects((old) => [p, ...old]);
      setProjectId(id);
      route({ project: id, tab: 'checklist' });
      setTab('checklist');
      setNotice('Processo criado. Revise o enquadramento antes de iniciar os protocolos.');
    }
    setEditing(null);
  }
  async function importProject(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (projects.length >= 50)
        throw Error('Limite de 50 processos. Exporte os backups antes de importar outro.');
      if (file.size > 2000000) throw Error('O arquivo excede 2 MB.');
      const value = validateProject(JSON.parse(await file.text()));
      value.profile = normalizeProfile(value.profile);
      if (projects.some((p) => p.id === value.id)) {
        value.id = crypto.randomUUID?.() || 'import-' + Date.now();
        value.profile.name = (value.profile.name + ' · cópia importada').slice(0, 200);
      }
      setProjects((old) => [value, ...old]);
      setProjectId(value.id);
      route({ project: value.id, tab: 'checklist' });
      setTab('checklist');
      setNotice(
        'Processo importado. Confira o perfil e as referências antes de reutilizar evidências.',
      );
    } catch (error) {
      setNotice(error.message);
    } finally {
      e.target.value = '';
    }
  }
  const exportMarkdown = () =>
    download(
      'checklist-homologacao.md',
      exportProcessMarkdown(
        project || { schemaVersion: 1, profile, checks: {}, createdAt: new Date().toISOString() },
      ),
      'text/markdown;charset=utf-8',
    );
  return (
    <div className="g-app">
      <header className="g-page-heading">
        <div>
          <div className="g-eyebrow">
            <span className="g-live-dot" /> ENGENHARIA E CONFORMIDADE · BRASIL
          </div>
          <h1>
            Homologação, <em>por inteiro.</em>
          </h1>
          <p>
            Do primeiro componente ao dossiê do veículo. Encontre o caminho, entenda as condições e
            organize suas evidências.
          </p>
        </div>
        <button className="g-button g-primary" onClick={() => setEditing('new')}>
          <Icon name="plus" /> Novo processo
        </button>
      </header>
      <div className="g-workspace">
        <aside className="g-project-sidebar">
          <div className="g-sidebar-heading">
            <Icon name="file" />
            <span>AMBIENTE DE PROJETO</span>
          </div>
          <label className="g-project-label" htmlFor="g-project-select">
            Processo ativo
          </label>
          <select
            id="g-project-select"
            aria-label="Processo ativo"
            value={project?.id || ''}
            onChange={(e) => {
              setProjectId(e.target.value || 'demo');
              route({ project: e.target.value || 'demo' });
            }}
          >
            <option value="">Explorar demonstração</option>
            {projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.profile.name}
              </option>
            ))}
          </select>
          <div className="g-profile-summary">
            <span className="g-tag">{project ? 'PROCESSO LOCAL' : 'DEMONSTRAÇÃO'}</span>
            <h2>{profile.name}</h2>
            <dl>
              <div>
                <dt>Categoria</dt>
                <dd>{profile.category}</dd>
              </div>
              <div>
                <dt>Propulsão</dt>
                <dd>{POWERTRAINS[profile.powertrain] || profile.powertrain}</dd>
              </div>
              <div>
                <dt>PBT / massa máx.</dt>
                <dd>
                  {profile.massKg
                    ? Number(profile.massKg).toLocaleString('pt-BR') + ' kg'
                    : 'Não informado'}
                </dd>
              </div>
              <div>
                <dt>Introdução</dt>
                <dd>{profile.year || 'A definir'}</dd>
              </div>
            </dl>
            <button
              className="g-button g-full"
              onClick={() => setEditing(project ? 'edit' : 'new')}
            >
              {project ? 'Editar perfil técnico' : 'Definir meu veículo'} <Icon name="arrow" />
            </button>
          </div>
          <div className="g-progress">
            <div>
              <span>Organização do dossiê</span>
              <strong>{progress}%</strong>
            </div>
            <progress value={progress} max="100" aria-label="Progresso do checklist" />
            <small>
              {done} concluídos · {items.length - done - na} pendentes · {na} não aplicáveis
            </small>
          </div>
          <nav className="g-agencies" aria-label="Consultas por órgão">
            <span className="g-sidebar-heading">FRENTES REGULATÓRIAS</span>
            {[
              ['IBAMA', 'Emissões e ruído', 'proconve'],
              ['SENATRAN', 'Segurança e CAT', 'contran'],
              ['Inmetro', 'Componentes e eficiência', 'inmetro'],
              ['Anatel', 'Radiofrequência', 'anatel'],
              ['MDIC', 'MOVER e habilitação', 'mover'],
            ].map(([name, label, route]) => (
              <a key={name} href={'#' + route}>
                <span className={'g-agency-dot g-agency-' + name.toLowerCase()} />
                <div>
                  <strong>{name}</strong>
                  <small>{label}</small>
                </div>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </nav>
          <div className="g-local-actions">
            <button className="g-text-button" onClick={exportMarkdown}>
              <Icon name="export" /> Exportar checklist .md
            </button>
            <button
              className="g-text-button"
              disabled={!project}
              onClick={() =>
                download(
                  'processo-homologacao.json',
                  JSON.stringify(project, null, 2),
                  'application/json',
                )
              }
            >
              <Icon name="export" /> Backup do processo .json
            </button>
            <button className="g-text-button" onClick={() => fileInput.current.click()}>
              Importar processo .json
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={importProject}
            />
            {initial.raw && (
              <button
                className="g-text-button"
                onClick={() =>
                  download('processos-recuperacao.json', initial.raw, 'application/json')
                }
              >
                Baixar dados para recuperação
              </button>
            )}
            <small>
              Salvo somente neste navegador. Faça um backup JSON para transferir ou conservar o
              processo.
            </small>
          </div>
        </aside>
        <div className="g-workspace-main">
          {(notice || storageError) && (
            <div className="g-feedback" role="status">
              {notice}
              {storageError && <p>{storageError}</p>}
              <button aria-label="Fechar aviso" onClick={() => setNotice('')}>
                ×
              </button>
            </div>
          )}
          <div className="g-tabs" role="tablist" aria-label="Ambiente de homologação">
            {TABS.map(([id, label], i) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                aria-controls={'g-panel-' + id}
                id={'g-tab-' + id}
                tabIndex={tab === id ? 0 : -1}
                onKeyDown={(e) => {
                  if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
                    e.preventDefault();
                    const index =
                      e.key === 'Home'
                        ? 0
                        : e.key === 'End'
                          ? TABS.length - 1
                          : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
                    selectTab(TABS[index][0]);
                    document.getElementById('g-tab-' + TABS[index][0]).focus();
                  }
                }}
                onClick={() => selectTab(id)}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                {label}
                {id === 'checklist' && <b>{items.length}</b>}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={'g-panel-' + tab}
            aria-labelledby={'g-tab-' + tab}
            className="g-tabpanel"
          >
            {tab === 'explore' && (
              <>
                <div className="g-explorer-grid">
                  <section className="g-visual-panel">
                    <div className="g-canvas-header">
                      <div>
                        <span className="g-eyebrow">ANATOMIA DO VEÍCULO</span>
                        <h2>Explore cada sistema.</h2>
                      </div>
                      <span className="g-canvas-badge">3D interativo</span>
                    </div>
                    <VehicleScene
                      selectedPart={part.id}
                      onSelect={selectPart}
                      exploded={exploded}
                      category={profile.category}
                      powertrain={profile.powertrain}
                    />
                    <div className="g-canvas-footer">
                      <label className="g-switch">
                        <input
                          type="checkbox"
                          checked={exploded}
                          onChange={(e) => setExploded(e.target.checked)}
                        />
                        <span /> Vista explodida
                      </label>
                      <a href="#vehicle">Consultar desenho original ↗</a>
                    </div>
                  </section>
                  <aside className="g-parts-panel">
                    <div className="g-sidebar-heading">
                      <Icon name="tree" /> ÁRVORE DE COMPONENTES
                    </div>
                    <label className="g-sr-only" htmlFor="g-part-search">
                      Buscar componente
                    </label>
                    <input
                      id="g-part-search"
                      placeholder="Buscar componente…"
                      type="search"
                      value={partSearch}
                      onChange={(e) => setPartSearch(e.target.value)}
                    />
                    <nav aria-label="Sistemas e componentes" className="g-parts-tree">
                      {systems.map((system) => (
                        <details
                          key={system}
                          open={
                            filtered.some((p) => p.system === system && p.id === part.id) ||
                            !!partSearch
                          }
                        >
                          <summary>{SYSTEM_LABELS[system] || system}</summary>
                          {filtered
                            .filter((x) => x.system === system)
                            .map((x) => (
                              <button
                                key={x.id}
                                aria-pressed={part.id === x.id}
                                onClick={() => selectPart(x.id)}
                              >
                                <span className="g-tree-line" />
                                {x.label}
                                <span aria-hidden="true">↗</span>
                              </button>
                            ))}
                        </details>
                      ))}
                    </nav>
                    {!filtered.length && <p className="g-note">Nenhum componente encontrado.</p>}
                  </aside>
                </div>
                <section className="g-part-inspector" aria-live="polite">
                  <div className="g-inspector-title">
                    <span className="g-eyebrow">
                      SELEÇÃO SINCRONIZADA · {SYSTEM_LABELS[part.system] || part.system}
                    </span>
                    <h2>{part.label}</h2>
                    <p>{part.description}</p>
                    <a
                      className="g-text-button"
                      href={'#library?component=' + encodeURIComponent(part.taxonomy || '')}
                    >
                      Consultar assunto na biblioteca <Icon name="arrow" />
                    </a>
                  </div>
                  <div className="g-part-norms">
                    <div className="g-section-heading">
                      <h3>Referências associadas</h3>
                      <span className="g-tag">{records.length} no acervo</span>
                    </div>
                    {records.length ? (
                      records.slice(0, 4).map((r) => (
                        <button
                          key={r.id}
                          className="g-reference"
                          onClick={() => bridge.openRecord(r.id)}
                        >
                          <span className="g-tag">{r.issuer || r.agency}</span>
                          <strong>{r.title}</strong>
                          <span aria-hidden="true">↗</span>
                        </button>
                      ))
                    ) : (
                      <p className="g-note">
                        Não há vínculo específico revisado para este conjunto. A ausência no acervo
                        não significa ausência de obrigação.
                      </p>
                    )}
                    <p className="g-note">
                      Vínculo temático: confira escopo, datas, montagem e o requisito específico
                      antes de aplicar ao projeto.
                    </p>
                  </div>
                </section>
              </>
            )}
            {tab === 'flow' && (
              <FlowPanel
                profile={profile}
                selectedStage={stage}
                onSelect={(id) => {
                  setStage(id);
                  route({ stage: id });
                }}
                items={items}
                checks={checks}
              />
            )}{' '}
            {tab === 'checklist' && (
              <Checklist items={items} checks={checks} project={project} onChange={updateCheck} />
            )}{' '}
            {tab === 'sources' && <SourcesPanel evaluation={evaluation} />}
          </div>
          <div className="g-context-strip">
            <div>
              <span className="g-tag">ENQUADRAMENTO AMBIENTAL</span>
              <strong>{evaluation.emissions.label}</strong>
            </div>
            <div>
              <span className="g-tag">SEGURANÇA / SISCAT</span>
              <strong>{evaluation.safety.label}</strong>
            </div>
            <button className="g-text-button" onClick={() => selectTab('sources')}>
              Entender particularidades <Icon name="arrow" />
            </button>
          </div>
          {(evaluation.warnings?.length > 0 || evaluation.missing?.length > 0) && (
            <details className="g-pending">
              <summary>
                {evaluation.warnings.length + evaluation.missing.length} pontos de atenção neste
                perfil
              </summary>
              <ul>
                {[...evaluation.warnings, ...evaluation.missing].map((x, i) => (
                  <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
      <footer className="g-page-footer">
        <span>Guia consultivo · Fontes e limites por referência</span>
        <span>
          O roteiro não protocola pedidos no Infoserv ou no SISCAT. A decisão final depende da
          análise técnica do caso.
        </span>
      </footer>
      {editing && (
        <ProfileForm
          initial={editing === 'edit' ? profile : null}
          onClose={() => setEditing(null)}
          onSave={saveProfile}
        />
      )}
    </div>
  );
}
class GuideBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: false };
  }
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="g-empty" role="alert">
        <h1>Não foi possível abrir o ambiente</h1>
        <p>Recarregue a página. Os processos salvos no navegador são preservados.</p>
        <a href="#library">Consultar biblioteca</a>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function mount(element, bridge) {
  const root = createRoot(element);
  root.render(
    <GuideBoundary>
      <GuideApp bridge={bridge} />
    </GuideBoundary>,
  );
  return root;
}
