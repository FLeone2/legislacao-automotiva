import React, { useEffect, useMemo, useState } from 'react';
import VehicleScene from './VehicleScene.jsx';
import TraceabilityInspector from './TraceabilityInspector.jsx';
import { PARTS, visibleParts, sceneKind } from './vehicle-parts.js';
import { ALL_SUBSYSTEMS, subsystemSelection } from './subsystem-coverage.js';
import { loadProjects } from './storage.js';
import { vehicleSelection, vehicleModeRoute, vehicleVisualProfile } from './vehicle-route.js';

function activeProfile(bridge) {
  try {
    const id = bridge.activeProjectId?.();
    return loadProjects(window.localStorage).projects.find((project) => project.id === id) || null;
  } catch {
    return null;
  }
}

export default function VehicleExplorer({ context, bridge }) {
  const { query, legacyParts, components } = context;
  const selected = useMemo(
    () => vehicleSelection(query, legacyParts, components),
    [query, legacyParts, components],
  );
  const selectedSubsystem = useMemo(() => subsystemSelection(query.subsystem), [query.subsystem]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState(query.tree === 'assemblies' ? 'assemblies' : 'subsystems');
  const [project, setProject] = useState(() => activeProfile(bridge));
  useEffect(() => {
    const sync = () => setProject(activeProfile(bridge));
    window.addEventListener('portal:project-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('portal:project-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, [bridge]);
  useEffect(() => {
    setMode(
      query.tree === 'assemblies' || (!query.tree && query.assembly) ? 'assemblies' : 'subsystems',
    );
  }, [query.tree, query.assembly]);
  const visual = vehicleVisualProfile(context.visualType, context.visualPowertrain);
  const profile = project?.profile || {};
  const assemblies = visibleParts(visual.category, visual.powertrain);
  const rows = mode === 'assemblies' ? assemblies : ALL_SUBSYSTEMS;
  const filtered = rows.filter((row) =>
    (row.label + ' ' + row.id + ' ' + (row.systemLabel || row.system))
      .toLocaleLowerCase('pt-BR')
      .includes(search.toLocaleLowerCase('pt-BR')),
  );
  const systems = [...new Set(filtered.map((row) => row.system))];
  const selectedSystems = new Set(
    selectedSubsystem
      ? [selectedSubsystem.system]
      : rows
          .filter(
            (row) =>
              selected &&
              (row.id === selected.assemblyId ||
                row.assemblyId === selected.assemblyId ||
                row.assemblyIds?.includes(selected.assemblyId)),
          )
          .map((row) => row.system),
  );
  const exploded = query.exploded === '1';
  const navigate = (changes) => bridge.navigateVehicle(changes);
  const chooseAssembly = (id) => {
    const assembly = PARTS.find((row) => row.id === id);
    if (!assembly) return;
    const component = components.find(
      (row) => row.id === assembly.system || row.legacyPartIds.includes(assembly.legacyPart),
    );
    navigate({
      assembly: id,
      focus: component?.id || '',
      component: '',
      part: '',
      subsystem: '',
      lane: '',
      node: '',
      topic: '',
      tree: 'assemblies',
    });
  };
  const chooseSubsystem = (id) => {
    const subsystem = subsystemSelection(id);
    if (!subsystem) return;
    const origin = legacyParts.find((row) => subsystem.legacyParts.includes(row.id));
    navigate({
      subsystem: id,
      assembly: '',
      focus: origin?.componentId || '',
      component: '',
      part: '',
      lane: '',
      node: '',
      topic: '',
      tree: 'subsystems',
    });
  };
  const selectedComponent = components.find(
    (row) =>
      row.id ===
      (query.component ||
        query.focus ||
        legacyParts.find((part) => part.id === query.part)?.componentId),
  );
  const consultation = new URLSearchParams(query);
  consultation.delete('focus');
  if (selectedComponent) consultation.set('component', selectedComponent.id);
  const assemblyRoute = Boolean(
    query.assembly || (query.part && !legacyParts.some((part) => part.id === query.part)),
  );
  if (assemblyRoute) {
    consultation.delete('assembly');
    consultation.delete('part');
    consultation.delete('node');
    consultation.delete('topic');
  }
  const guideRoute = (params) =>
    bridge.guideRoute?.(params) || '#guide?' + new URLSearchParams(params);

  return (
    <div className="g-app portal-vehicle-explorer" data-vehicle-mode="3d">
      <header className="portal-vehicle-heading">
        <div>
          <h1 tabIndex="-1">Explore o veículo.</h1>
          <p>Selecione um conjunto ou subsistema para consultar suas referências.</p>
        </div>
        <nav className="portal-vehicle-modes" aria-label="Apresentação do veículo">
          <a href={vehicleModeRoute(query)} aria-current="page">
            Modelo 3D
          </a>
          <a href={vehicleModeRoute(query, true)}>Referência 2D</a>
        </nav>
      </header>
      <div className="portal-vehicle-filters" aria-label="Perfil visual de consulta">
        <label>
          Categoria visual
          <select
            value={context.visualType}
            onChange={(event) => navigate({ type: event.target.value })}
          >
            {context.visualTypes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Motorização visual
          <select
            value={context.visualPowertrain}
            onChange={(event) => navigate({ powertrain: event.target.value })}
          >
            {context.visualPowertrains.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <p className="g-note">
          {project
            ? 'Condições técnicas do processo: ' + project.profile.name
            : 'Sem processo ativo: categoria, massas, assentos e demais condições técnicas não informadas.'}{' '}
          A visualização não preenche o perfil técnico.
        </p>
      </div>
      <div className="g-explorer-grid">
        <section className="g-visual-panel" aria-label="Modelo 3D do veículo">
          <VehicleScene
            selectedPart={selected?.assemblyId || ''}
            selectedSubsystem={selectedSubsystem}
            onSelect={chooseAssembly}
            exploded={exploded}
            category={visual.category}
            powertrain={visual.powertrain}
          />
          <div className="g-canvas-footer">
            <label className="g-switch">
              <input
                type="checkbox"
                checked={exploded}
                onChange={(event) => navigate({ exploded: event.target.checked ? '1' : '' })}
              />
              <span /> Vista explodida
            </label>
            {selected && (
              <button
                className="g-text-button"
                onClick={() =>
                  navigate({
                    component: '',
                    focus: '',
                    part: '',
                    subsystem: '',
                    assembly: '',
                    lane: '',
                    node: '',
                    topic: '',
                  })
                }
              >
                Limpar seleção
              </button>
            )}
          </div>
          {sceneKind(visual.category) === 'car' && (
            <p className="g-model-attribution">
              Referência visual:{' '}
              <a
                href="https://github.com/bmwcarit/digital-car-3d"
                target="_blank"
                rel="noopener noreferrer"
              >
                BMW X5 G05 · BMW Car IT
              </a>{' '}
              ·{' '}
              <a href="assets/models/suv/LICENSE.txt" target="_blank" rel="noopener noreferrer">
                CC BY 4.0
              </a>
              . Materiais, compressão e separação adaptados. Conjuntos internos: exemplo híbrido
              autoral didático.
            </p>
          )}
        </section>
        <aside className="g-parts-panel">
          <h2 className="g-parts-title">Componentes</h2>
          <div className="g-tree-modes" role="group" aria-label="Modo da árvore">
            <button
              aria-pressed={mode === 'subsystems'}
              onClick={() => {
                setMode('subsystems');
                setSearch('');
                navigate({ tree: 'subsystems' });
              }}
            >
              Subsistemas <b>{ALL_SUBSYSTEMS.length}</b>
            </button>
            <button
              aria-pressed={mode === 'assemblies'}
              onClick={() => {
                setMode('assemblies');
                setSearch('');
                navigate({ tree: 'assemblies' });
              }}
            >
              Conjuntos 3D <b>{assemblies.length}</b>
            </button>
          </div>
          <label className="g-sr-only" htmlFor="portal-part-search">
            Buscar componente
          </label>
          <input
            id="portal-part-search"
            type="search"
            value={search}
            placeholder="Buscar por nome ou identificador…"
            onChange={(event) => setSearch(event.target.value)}
          />
          <nav
            className="g-parts-tree"
            data-tree-mode={mode}
            aria-label={mode === 'subsystems' ? 'Sistemas e subsistemas' : 'Sistemas e componentes'}
          >
            {systems.map((system) => (
              <details key={system} open={Boolean(search) || selectedSystems.has(system)}>
                <summary>
                  {filtered.find((row) => row.system === system)?.systemLabel ||
                    components.find((row) => row.id === system)?.label ||
                    system}
                </summary>
                {filtered
                  .filter((row) => row.system === system)
                  .map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      data-subsystem={mode === 'subsystems' ? row.id : undefined}
                      data-assembly={mode === 'assemblies' ? row.id : row.assemblyId}
                      aria-pressed={
                        mode === 'subsystems'
                          ? query.subsystem === row.id
                          : selected?.assemblyId === row.id
                      }
                      onClick={() =>
                        mode === 'subsystems' ? chooseSubsystem(row.id) : chooseAssembly(row.id)
                      }
                    >
                      {row.label}
                    </button>
                  ))}
              </details>
            ))}
            {!filtered.length && <p role="status">Nenhum componente encontrado.</p>}
          </nav>
        </aside>
      </div>
      {selected ? (
        <>
          <section className="g-part-inspector" aria-label="Seleção atual">
            <div className="g-inspector-title">
              <h2>{selected.label}</h2>
            </div>
            <p>{selected.description}</p>
            <div className="portal-vehicle-consultation">
              {selectedComponent && (!query.component || assemblyRoute) && (
                <a className="g-button" href={'#vehicle?' + consultation}>
                  {assemblyRoute
                    ? 'Consultar o sistema completo: ' + selectedComponent.label
                    : 'Abrir árvore de referências'}
                </a>
              )}
              <a className="g-text-button" href={bridge.libraryRoute(selected)}>
                Consultar na biblioteca
              </a>
              <a className="g-text-button" href={guideRoute({ tab: 'checklist' })}>
                Checklist do processo
              </a>
            </div>
          </section>
          <TraceabilityInspector
            part={selected}
            profile={profile}
            bridge={bridge}
            modelKind={sceneKind(visual.category)}
          />
        </>
      ) : (
        <p className="g-note" role="status">
          Nenhum conjunto selecionado. A árvore textual oferece os mesmos caminhos de consulta do
          modelo.
        </p>
      )}
      <nav className="portal-vehicle-system-links" aria-label="Consulta por sistema">
        {components.map((component) => (
          <a
            key={component.id}
            href={vehicleModeRoute({
              ...query,
              component: component.id,
              focus: '',
              part: '',
              subsystem: '',
              assembly: '',
              lane: '',
              node: '',
              topic: '',
            })}
          >
            {component.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
