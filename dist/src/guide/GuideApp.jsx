import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import VehicleScene from './VehicleScene.jsx';
import TraceabilityInspector from './TraceabilityInspector.jsx';
import RegulatoryCoverage from './RegulatoryCoverage.jsx';
import VehicleExplorer from './VehicleExplorer.jsx';
import { needsRegulatoryReview, recordCheckReview } from './review-state.js';
import { PARTS, visibleParts, sceneKind } from './vehicle-parts.js';
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
import {
  ALL_SUBSYSTEMS,
  SUBSYSTEMS,
  SUPPLEMENTAL_SUBSYSTEMS,
  coverageReport,
  subsystemSelection,
} from './subsystem-coverage.js';

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
  propulsao: 'Propulsão e emissões',
  ocupantes: 'Proteção dos ocupantes',
  eletronica: 'Eletrônica e comandos',
};
const TABS = [
  ['explore', 'Explorador 3D'],
  ['flow', 'Fluxo do processo'],
  ['checklist', 'Checklist'],
  ['sources', 'Guia e fontes'],
  ['coverage', 'Cobertura regulatória'],
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
const DEMO_PROFILE = Object.freeze({ ...DEFAULT_PROFILE, name: 'Veículo de demonstração' });
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
    subsystem: ALL_SUBSYSTEMS.some((row) => row.id === p.get('subsystem'))
      ? p.get('subsystem')
      : '',
    tree:
      p.get('tree') === 'assemblies' || (!p.get('subsystem') && p.has('part') && !p.has('tree'))
        ? 'assemblies'
        : 'subsystems',
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
      (filter === 'all' ||
        (filter === 'review'
          ? needsRegulatoryReview(checks[x.id])
          : (checks[x.id]?.status || 'pending') === filter)),
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
            <option value="review">Revalidar base normativa</option>
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
        const stale = needsRegulatoryReview(check);
        return (
          <article
            key={item.id}
            className={'g-check-item g-status-' + (stale ? 'review' : check.status)}
          >
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
                <span className="g-status-label">
                  {stale ? 'Revalidar base' : STATUS[check.status]}
                </span>
              </summary>
              <div className="g-check-body">
                {stale && (
                  <div className="g-note" role="status">
                    <p>
                      A conclusão foi registrada em uma base anterior ou sem versão. Confira fontes,
                      condições e evidências nesta revisão antes de considerá-la atual.
                    </p>
                    <button
                      type="button"
                      className="g-text-button"
                      disabled={!project}
                      onClick={() => onChange(item.id, check, true)}
                    >
                      Registrar nova conferência desta tarefa
                    </button>
                    <small>
                      Registro manual de trabalho; não constitui aprovação de conformidade.
                    </small>
                  </div>
                )}
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
                      onChange={(e) =>
                        onChange(item.id, { ...check, status: e.target.value }, true)
                      }
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
                  <span id={'g-note-label-' + item.id}>
                    Notas e justificativa
                    {check.status === 'na' ? ' · obrigatória para não aplicável' : ''}
                  </span>
                  <textarea
                    aria-labelledby={'g-note-label-' + item.id}
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
  const [subsystemId, setSubsystemId] = useState(initialRoute.subsystem);
  const [treeMode, setTreeMode] = useState(initialRoute.tree);
  const [stage, setStage] = useState(initialRoute.stage);
  const [exploded, setExploded] = useState(false);
  const projectDisclosure = useRef(null);
  const treeDisclosure = useRef(null);
  // Native details owns its toggle state. Mirroring its queued toggle event in
  // React can leave a fast search hidden behind a recently closed disclosure.
  const bindProjectDisclosure = useCallback((node) => {
    projectDisclosure.current = node;
    if (node) node.open = !window.matchMedia('(max-width: 900px)').matches;
  }, []);
  const bindTreeDisclosure = useCallback((node) => {
    treeDisclosure.current = node;
    if (node) node.open = !window.matchMedia('(max-width: 650px)').matches;
  }, []);
  const [partSearch, setPartSearch] = useState('');
  const [editing, setEditing] = useState(() => {
    const requested = new URLSearchParams(location.hash.split('?')[1] || '').get('profile');
    return ['new', 'edit'].includes(requested) ? requested : null;
  });
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
  useEffect(() => {
    bridge.setActiveProjectId?.(project?.id || '');
  }, [project?.id, bridge]);
  const profile = project?.profile || DEMO_PROFILE;
  const evaluation = useMemo(() => evaluateProfile(profile), [profile]);
  const items = useMemo(() => buildChecklist(profile), [profile]);
  const checks = project?.checks || {};
  const selectedSubsystem = useMemo(() => subsystemSelection(subsystemId), [subsystemId]);
  const availableParts = visibleParts(profile.category, profile.powertrain);
  const part =
    PARTS.find((row) => row.id === (selectedSubsystem?.assemblyId || partId)) ||
    availableParts[0] ||
    PARTS[0];
  const inspectionPart = useMemo(
    () => (selectedSubsystem ? { ...part, ...selectedSubsystem } : part),
    [part, selectedSubsystem],
  );
  const normalizedSearch = partSearch.toLocaleLowerCase('pt-BR');
  const treeRows = treeMode === 'subsystems' ? ALL_SUBSYSTEMS : availableParts;
  const filtered = treeRows.filter((row) =>
    (row.label + ' ' + (row.systemLabel || SYSTEM_LABELS[row.system] || row.system) + ' ' + row.id)
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedSearch),
  );
  const systems = [...new Set(filtered.map((row) => row.system))];
  const selectedTreeSystem =
    treeMode === 'subsystems'
      ? selectedSubsystem?.system ||
        ALL_SUBSYSTEMS.find((row) => row.assemblyId === part.id)?.system
      : part.system;
  const coverage = coverageReport();
  const done = items.filter(
    (x) => checks[x.id]?.status === 'done' && !needsRegulatoryReview(checks[x.id]),
  ).length;
  const na = items.filter(
    (x) => checks[x.id]?.status === 'na' && !needsRegulatoryReview(checks[x.id]),
  ).length;
  const staleCount = items.filter((x) => needsRegulatoryReview(checks[x.id])).length;
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
    const projectLayout = window.matchMedia('(max-width: 900px)');
    const treeLayout = window.matchMedia('(max-width: 650px)');
    const syncProject = () => {
      if (projectDisclosure.current) projectDisclosure.current.open = !projectLayout.matches;
    };
    const syncTree = () => {
      if (treeDisclosure.current) treeDisclosure.current.open = !treeLayout.matches;
    };
    projectLayout.addEventListener('change', syncProject);
    treeLayout.addEventListener('change', syncTree);
    return () => {
      projectLayout.removeEventListener('change', syncProject);
      treeLayout.removeEventListener('change', syncTree);
    };
  }, []);
  useEffect(() => {
    const sync = () => {
      const r = readRoute();
      setTab(r.tab);
      setPartId(r.part);
      setSubsystemId(r.subsystem);
      setTreeMode(r.tree);
      setStage(r.stage);
      if (r.project) setProjectId(r.project);
      const requested = new URLSearchParams(location.hash.split('?')[1] || '').get('profile');
      setEditing(['new', 'edit'].includes(requested) ? requested : null);
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const route = (changes) => {
    const current = {
      tab,
      part: partId,
      stage,
      project: projectId,
      subsystem: subsystemId,
      tree: treeMode,
      ...changes,
    };
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
    setSubsystemId('');
    setTreeMode('assemblies');
    route({ part: id, subsystem: '', tree: 'assemblies' });
  }
  function selectSubsystem(id) {
    const selection = subsystemSelection(id);
    if (!selection) return;
    setSubsystemId(id);
    setPartId(selection.assemblyId);
    setTreeMode('subsystems');
    route({ part: selection.assemblyId, subsystem: id, tree: 'subsystems' });
  }
  function selectTreeMode(mode) {
    setTreeMode(mode);
    if (treeDisclosure.current) treeDisclosure.current.open = true;
    setPartSearch('');
    route({ tree: mode });
  }
  function updateCheck(id, next, confirmed = false) {
    if (!project) return;
    if (next.status === 'na' && !next.note?.trim()) {
      setNotice('Antes de marcar como não aplicável, escreva a justificativa nas notas do item.');
      return;
    }
    setProjects((old) =>
      old.map((p) =>
        p.id === projectId
          ? {
              ...p,
              updatedAt: new Date().toISOString(),
              checks: { ...p.checks, [id]: recordCheckReview(p.checks[id], next, confirmed) },
            }
          : p,
      ),
    );
    setNotice('');
  }
  function closeProfile() {
    setEditing(null);
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    params.delete('profile');
    history.replaceState(null, '', '#guide' + (params.size ? '?' + params : ''));
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
        closeProfile();
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
    closeProfile();
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
          <h1>Homologação veicular.</h1>
          <p>Do componente ao veículo completo. Consulte as regras e organize seu processo.</p>
        </div>
        <button className="g-button g-primary" onClick={() => setEditing('new')}>
          <Icon name="plus" /> Novo processo
        </button>
      </header>
      <div className="g-workspace">
        <aside className="g-project-sidebar">
          <details className="g-project-disclosure" ref={bindProjectDisclosure}>
            <summary>
              <span>
                <strong>{profile.name}</strong>
                <small>
                  {profile.category} · {POWERTRAINS[profile.powertrain] || profile.powertrain}
                </small>
              </span>
              <span className="g-disclosure-action">Perfil e opções</span>
            </summary>
            <div className="g-project-disclosure-body">
              <div className="g-sidebar-heading">
                <Icon name="file" />
                <span>Seu processo</span>
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
                    <Icon name="arrow" />
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
            </div>
          </details>
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
          {staleCount > 0 && (
            <p className="g-note" role="status">
              {staleCount} conclusão(ões) precisam de revalidação após atualização da base
              normativa. As notas e referências de evidência foram preservadas.
            </p>
          )}
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
                        <h2>Explore o veículo.</h2>
                      </div>
                    </div>
                    <VehicleScene
                      selectedPart={part.id}
                      selectedSubsystem={selectedSubsystem}
                      onSelect={selectPart}
                      exploded={exploded}
                      category={profile.category}
                      powertrain={profile.powertrain}
                    />
                    {sceneKind(profile.category) === 'car' && (
                      <div className="g-model-attribution">
                        Referência visual:{' '}
                        <a
                          href="https://github.com/bmwcarit/digital-car-3d"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          BMW X5 G05 · BMW Car IT
                        </a>{' '}
                        ·{' '}
                        <a
                          href="assets/models/suv/LICENSE.txt"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          CC BY 4.0
                        </a>
                        . Materiais, compressão e separação adaptados. A geometria não preenche os
                        dados técnicos do projeto. Conjuntos internos: exemplo híbrido didático
                        baseado nas pranchas 2D.
                      </div>
                    )}
                    {sceneKind(profile.category) === 'car' && (
                      <details className="g-model-boards">
                        <summary>
                          Pranchas 2D do modelo <span>4 vistas</span>
                        </summary>
                        <div>
                          {[
                            ['assembled', 'Montado em perspectiva'],
                            ['side', 'Vista lateral'],
                            ['top', 'Vista superior'],
                            ['exploded', 'Conjuntos em vista explodida'],
                          ].map(([id, label]) => (
                            <a
                              key={id}
                              href={'assets/models/suv/reference-views/' + id + '.webp'}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={'assets/models/suv/reference-views/' + id + '.webp'}
                                alt={'Modelo 3D de referência: ' + label}
                                loading="lazy"
                              />
                              <span>{label} ↗</span>
                            </a>
                          ))}
                        </div>
                      </details>
                    )}
                    <div className="g-canvas-footer">
                      <label className="g-switch">
                        <input
                          type="checkbox"
                          checked={exploded}
                          onChange={(e) => setExploded(e.target.checked)}
                        />
                        <span /> Vista explodida
                      </label>
                      <a href="#vehicle?view=reference">Consultar referência 2D ↗</a>
                    </div>
                  </section>
                  <aside className="g-parts-panel">
                    <h3 className="g-parts-title">Componentes</h3>
                    <div className="g-tree-modes" role="group" aria-label="Modo da árvore">
                      <button
                        type="button"
                        aria-pressed={treeMode === 'subsystems'}
                        onClick={() => selectTreeMode('subsystems')}
                      >
                        Subsistemas <b>{ALL_SUBSYSTEMS.length}</b>
                      </button>
                      <button
                        type="button"
                        aria-pressed={treeMode === 'assemblies'}
                        onClick={() => selectTreeMode('assemblies')}
                      >
                        Conjuntos 3D <b>{availableParts.length}</b>
                      </button>
                    </div>
                    <p className="g-tree-coverage" role="status">
                      <strong>
                        {coverage.covered}/{SUBSYSTEMS.length}
                      </strong>{' '}
                      originais identificados · <strong>{SUPPLEMENTAL_SUBSYSTEMS.length}</strong>{' '}
                      complementares
                    </p>
                    <label className="g-sr-only" htmlFor="g-part-search">
                      Buscar componente
                    </label>
                    <input
                      id="g-part-search"
                      placeholder={
                        treeMode === 'subsystems' ? 'Buscar subsistema…' : 'Buscar conjunto…'
                      }
                      type="search"
                      value={partSearch}
                      onChange={(e) => {
                        setPartSearch(e.target.value);
                        if (e.target.value && treeDisclosure.current)
                          treeDisclosure.current.open = true;
                      }}
                    />
                    <details className="g-tree-disclosure" ref={bindTreeDisclosure}>
                      <summary>
                        <span>
                          {treeMode === 'subsystems'
                            ? 'Árvore de subsistemas'
                            : 'Árvore de conjuntos 3D'}
                        </span>
                        <small>{treeRows.length} opções</small>
                      </summary>
                      <nav
                        aria-label={
                          treeMode === 'subsystems'
                            ? 'Sistemas e subsistemas'
                            : 'Sistemas e componentes'
                        }
                        className="g-parts-tree"
                        data-tree-mode={treeMode}
                      >
                        {systems.map((system) => (
                          <details
                            key={system}
                            open={selectedTreeSystem === system || !!partSearch}
                          >
                            <summary>
                              {filtered.find((row) => row.system === system)?.systemLabel ||
                                SYSTEM_LABELS[system] ||
                                system}
                              <small>
                                {filtered.filter((row) => row.system === system).length}
                              </small>
                            </summary>
                            {filtered
                              .filter((row) => row.system === system)
                              .map((row) => (
                                <button
                                  key={row.id}
                                  type="button"
                                  data-subsystem={treeMode === 'subsystems' ? row.id : undefined}
                                  data-assembly={
                                    treeMode === 'subsystems' ? row.assemblyId : row.id
                                  }
                                  aria-pressed={
                                    treeMode === 'subsystems'
                                      ? subsystemId === row.id
                                      : part.id === row.id
                                  }
                                  onClick={() =>
                                    treeMode === 'subsystems'
                                      ? selectSubsystem(row.id)
                                      : selectPart(row.id)
                                  }
                                >
                                  <span className="g-tree-line" />
                                  <span className="g-tree-label">{row.label}</span>
                                  {treeMode === 'subsystems' && !row.canonical && (
                                    <small className="g-tree-example">Exemplo</small>
                                  )}
                                  <Icon name="arrow" />
                                </button>
                              ))}
                          </details>
                        ))}
                      </nav>
                      {!filtered.length && (
                        <p className="g-note">
                          Nenhum {treeMode === 'subsystems' ? 'subsistema' : 'conjunto'} encontrado.
                        </p>
                      )}
                    </details>
                    {treeMode === 'subsystems' && (
                      <p className="g-tree-scope-note">
                        Identificação e consulta do acervo. O perfil técnico determina quais
                        condições precisam de avaliação.
                      </p>
                    )}
                    <button
                      type="button"
                      className="g-text-button g-selection-jump"
                      onClick={() => {
                        const heading = document.getElementById('g-selected-component');
                        heading?.scrollIntoView({
                          block: 'start',
                          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            ? 'auto'
                            : 'smooth',
                        });
                        heading?.focus({ preventScroll: true });
                      }}
                    >
                      Ver seleção e referências
                    </button>
                  </aside>
                </div>
                <section className="g-part-inspector" aria-live="polite">
                  <div className="g-inspector-title">
                    <p className="g-selection-system">
                      {selectedSubsystem?.systemLabel ||
                        SYSTEM_LABELS[inspectionPart.system] ||
                        inspectionPart.system}
                    </p>
                    <h2 id="g-selected-component" tabIndex={-1}>
                      {inspectionPart.label}
                    </h2>
                    <p>{inspectionPart.description}</p>
                    {selectedSubsystem && (
                      <p className="g-selection-origin">
                        <code>{selectedSubsystem.subsystemId}</code> ·{' '}
                        {selectedSubsystem.canonical
                          ? 'Subsistema original'
                          : 'Complemento didático'}
                      </p>
                    )}
                    <a
                      className="g-text-button"
                      href={
                        '#library?component=' + encodeURIComponent(inspectionPart.taxonomy || '')
                      }
                    >
                      Consultar assunto na biblioteca <Icon name="arrow" />
                    </a>
                  </div>
                </section>
                <TraceabilityInspector part={inspectionPart} profile={profile} bridge={bridge} />
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
            {tab === 'coverage' && <RegulatoryCoverage />}
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
          initial={editing === 'edit' && project ? profile : null}
          onClose={closeProfile}
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

export function mountVehicle(element, bridge, context) {
  const root = createRoot(element);
  const update = (value) =>
    flushSync(() =>
      root.render(
        <GuideBoundary>
          <VehicleExplorer bridge={bridge} context={value} />
        </GuideBoundary>,
      ),
    );
  update(context);
  return { update, unmount: () => root.unmount() };
}
