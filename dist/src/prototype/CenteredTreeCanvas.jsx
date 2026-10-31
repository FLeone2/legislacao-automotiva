import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  centeredTreeAncestors,
  fitCenteredTree,
  indexCenteredTree,
  layoutCenteredTree,
} from './CenteredTreeCanvas.layout.js';
import './CenteredTreeCanvas.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.75;

function NodeIcon({ kind }) {
  const reference = ['standard', 'international_reference', 'equivalent'].includes(kind);
  return (
    <svg className="centered-tree-node-icon" viewBox="0 0 24 24" aria-hidden="true">
      {reference ? (
        <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" />
      ) : kind === 'act' || kind === 'source' ? (
        <path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6M9 16h6" />
      ) : kind === 'test' ? (
        <path d="M8 5H5v16h14V5h-3M8 3h8v4H8V3M8 12h8M8 16h5" />
      ) : (
        <path d="m12 3 8 4v6c0 4-4 7-8 9-4-2-8-5-8-9V7l8-4Z" />
      )}
    </svg>
  );
}

/** A presentation-only, keyboard-accessible canvas. It never joins legal data. */
export default function CenteredTreeCanvas({
  root,
  selectedId,
  onSelect,
  showOutside = false,
  query = '',
  focusRef,
}) {
  const region = useRef(null);
  const instructionsId = useId();
  const buttons = useRef(new Map());
  const drag = useRef(null);
  const pointerFocus = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const [size, setSize] = useState(sizeRef.current);
  const [expanded, setExpanded] = useState(() => new Set(root?.id ? [root.id] : []));
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [dragging, setDragging] = useState(false);
  const index = useMemo(() => indexCenteredTree(root), [root]);
  const currentId = index.has(selectedId) ? selectedId : root?.id;
  const layout = useMemo(
    () => layoutCenteredTree(root, expanded, { showOutside, query, selectedId: currentId }),
    [root, expanded, showOutside, query, currentId],
  );
  const positioned = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout]);

  useLayoutEffect(() => {
    const element = region.current;
    if (!element) return undefined;
    const measure = () => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      const previous = sizeRef.current;
      if (!next.width || !next.height) return;
      if (next.width === previous.width && next.height === previous.height) return;
      sizeRef.current = next;
      setSize(next);
      setView((value) => ({
        ...value,
        x: value.x + (next.width - previous.width) / 2,
        y: value.y + (next.height - previous.height) / 2,
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setExpanded(new Set(root?.id ? [root.id] : []));
    const currentSize = sizeRef.current;
    setView({ x: currentSize.width / 2, y: currentSize.height / 2, zoom: 1 });
  }, [root?.id]);

  // Breadcrumb selection and keyboard navigation can target a collapsed child.
  // Reveal its ancestors, preserving the user's current zoom and camera.
  useEffect(() => {
    const ancestors = centeredTreeAncestors(index, currentId).slice(0, -1);
    setExpanded((previous) => {
      if (ancestors.every((id) => previous.has(id))) return previous;
      return new Set([...previous, ...ancestors]);
    });
  }, [index, currentId]);

  const ensureVisible = useCallback(
    (id) => {
      const node = positioned.get(id);
      const currentSize = sizeRef.current;
      if (!node || !currentSize.width) return;
      setView((value) => {
        const margin = 24;
        const left = value.x + (node.x - node.width / 2) * value.zoom;
        const right = value.x + (node.x + node.width / 2) * value.zoom;
        const top = value.y + (node.y - node.height / 2) * value.zoom;
        const bottom = value.y + (node.y + node.height / 2) * value.zoom;
        const x =
          left < margin
            ? margin - left
            : right > currentSize.width - margin
              ? currentSize.width - margin - right
              : 0;
        const y =
          top < margin
            ? margin - top
            : bottom > currentSize.height - 64
              ? currentSize.height - 64 - bottom
              : 0;
        return x || y ? { ...value, x: value.x + x, y: value.y + y } : value;
      });
    },
    [positioned],
  );

  useLayoutEffect(() => {
    if (currentId !== root?.id) ensureVisible(currentId);
  }, [currentId, root?.id, ensureVisible]);

  const zoomAt = useCallback((factor, point = null) => {
    const currentSize = sizeRef.current;
    const center = point || { x: currentSize.width / 2, y: currentSize.height / 2 };
    setView((value) => {
      const zoom = clamp(value.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = zoom / value.zoom;
      return {
        zoom,
        x: center.x - (center.x - value.x) * ratio,
        y: center.y - (center.y - value.y) * ratio,
      };
    });
  }, []);

  useEffect(() => {
    const element = region.current;
    if (!element) return undefined;
    function wheel(event) {
      if (event.target.closest('.centered-tree-controls')) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const box = element.getBoundingClientRect();
        zoomAt(Math.exp(-event.deltaY * 0.004), {
          x: event.clientX - box.left,
          y: event.clientY - box.top,
        });
      } else {
        setView((value) => ({
          ...value,
          x: value.x - (event.shiftKey ? event.deltaY : event.deltaX),
          y: value.y - (event.shiftKey ? 0 : event.deltaY),
        }));
      }
    }
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [zoomAt]);

  const choose = useCallback(
    (record) => {
      if (record.hasChildren) setExpanded((previous) => new Set([...previous, record.id]));
      onSelect?.(record.node);
    },
    [onSelect],
  );
  function toggle(record) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(record.id)) next.delete(record.id);
      else next.add(record.id);
      return next;
    });
    if (
      record.expanded &&
      centeredTreeAncestors(index, currentId).includes(record.id) &&
      currentId !== record.id
    )
      onSelect?.(record.node);
  }
  function focusNode(id) {
    const record = positioned.get(id);
    if (!record) return;
    ensureVisible(id);
    buttons.current.get(id)?.focus({ preventScroll: true });
  }
  function nodeKey(event, record) {
    let target = null;
    if (event.key === 'Home') target = root.id;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const siblings = layout.nodes
        .filter((node) => node.parent === record.parent && node.side === record.side)
        .sort((left, right) => left.y - right.y);
      const position = siblings.findIndex((node) => node.id === record.id);
      target = siblings[position + (event.key === 'ArrowDown' ? 1 : -1)]?.id;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const side = event.key === 'ArrowLeft' ? -1 : 1;
      if (record.side === 0)
        target = layout.nodes.find((node) => node.parent === record.id && node.side === side)?.id;
      else if (side === record.side) {
        if (record.hasChildren && !record.expanded) {
          setExpanded((previous) => new Set([...previous, record.id]));
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        target = layout.nodes.find((node) => node.parent === record.id)?.id;
      } else target = record.parent;
    }
    if (target) {
      event.preventDefault();
      event.stopPropagation();
      focusNode(target);
    }
  }
  function centerRoot() {
    const currentSize = sizeRef.current;
    setView((value) => ({ ...value, x: currentSize.width / 2, y: currentSize.height / 2 }));
  }
  function fit() {
    setView(fitCenteredTree(layout.bounds, sizeRef.current));
  }
  function canvasKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '+' || event.key === '=') zoomAt(1.2);
    else if (event.key === '-') zoomAt(1 / 1.2);
    else if (event.key === '0') centerRoot();
    else if (event.key.toLowerCase() === 'f') fit();
    else if (event.target === event.currentTarget && event.key.startsWith('Arrow')) {
      const directions = {
        ArrowLeft: [60, 0],
        ArrowRight: [-60, 0],
        ArrowUp: [0, 60],
        ArrowDown: [0, -60],
      };
      const delta = directions[event.key];
      if (!delta) return;
      setView((value) => ({ ...value, x: value.x + delta[0], y: value.y + delta[1] }));
    } else return;
    event.preventDefault();
  }

  return (
    <div
      ref={region}
      className={`centered-tree prototype-regulatory-graph${dragging ? ' is-dragging' : ''}`}
      role="region"
      aria-label="Árvore de legislação expansível"
      aria-describedby={instructionsId}
      tabIndex={0}
      onKeyDown={canvasKey}
      onPointerDown={(event) => {
        if (event.button !== 0 || event.target.closest('button, a, input, select')) return;
        pointerFocus.current = null;
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          view: viewRef.current,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        setView({
          ...start.view,
          x: start.view.x + event.clientX - start.x,
          y: start.view.y + event.clientY - start.y,
        });
      }}
      onPointerUp={() => {
        drag.current = null;
        pointerFocus.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        drag.current = null;
        pointerFocus.current = null;
        setDragging(false);
      }}
    >
      <p id={instructionsId} className="centered-tree-sr-only">
        Arraste para mover a árvore. Use os botões para ampliar e enquadrar. No teclado, Tab e setas
        percorrem os ramos; Enter abre o nó. Mais e menos alteram o zoom; zero centraliza a raiz e F
        enquadra os ramos abertos.
      </p>
      <div
        className="centered-tree-stage"
        data-root-id={root?.id}
        data-zoom={view.zoom.toFixed(4)}
        data-pan-x={view.x.toFixed(1)}
        data-pan-y={view.y.toFixed(1)}
        data-ready={size.width > 0}
      >
        <div
          className="centered-tree-world prototype-graph-space"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
        >
          <svg className="centered-tree-links" width="1" height="1" aria-hidden="true">
            {layout.edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.path}
                className={edge.selectedPath ? 'is-selected-path' : undefined}
              />
            ))}
          </svg>
          {layout.nodes.map((record) => (
            <div
              key={record.id}
              className={`prototype-graph-node centered-tree-node centered-tree-node--${record.node.kind || 'branch'}${record.side === 0 ? ' is-root' : ''}${record.id === currentId ? ' is-current' : ''}${record.node.status === 'outside_profile' ? ' is-outside' : ''}`}
              data-node-id={record.id}
              data-side={record.side === 0 ? 'root' : record.side < 0 ? 'left' : 'right'}
              data-depth={record.depth}
              style={{ left: record.x, top: record.y, width: record.width, height: record.height }}
            >
              <button
                ref={(element) => {
                  if (element) buttons.current.set(record.id, element);
                  else buttons.current.delete(record.id);
                  if (record.id === currentId && focusRef) focusRef.current = element;
                }}
                type="button"
                className="prototype-node-main"
                aria-label={record.node.label}
                aria-current={record.id === currentId ? 'true' : undefined}
                title={record.node.label}
                onPointerDown={() => {
                  pointerFocus.current = record.id;
                }}
                onClick={() => choose(record)}
                onFocus={() => {
                  // Native pointer focus happens between pointerdown and click.
                  // Moving the button here would leave pointerup on another
                  // element and cancel selection. Keyboard/programmatic focus
                  // still reveals off-screen nodes; pointer selection is framed
                  // by the currentId layout effect after its click completes.
                  if (pointerFocus.current !== record.id) ensureVisible(record.id);
                }}
                onBlur={() => {
                  if (pointerFocus.current === record.id) pointerFocus.current = null;
                }}
                onKeyDown={(event) => nodeKey(event, record)}
              >
                <NodeIcon kind={record.node.kind} />
                <span>{record.node.label}</span>
              </button>
              {record.hasChildren && (
                <button
                  className="prototype-node-expand centered-tree-toggle"
                  type="button"
                  aria-label={`${record.expanded ? 'Recolher' : 'Expandir'} ${record.node.label}`}
                  aria-expanded={record.expanded}
                  title={record.expanded ? 'Recolher ramo' : 'Expandir ramo'}
                  onClick={() => toggle(record)}
                >
                  <span aria-hidden="true">{record.expanded ? '−' : '+'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="centered-tree-controls" role="group" aria-label="Vista da árvore">
        <button
          type="button"
          onClick={() => zoomAt(1 / 1.2)}
          aria-label="Reduzir árvore"
          title="Reduzir árvore"
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          type="button"
          onClick={() => zoomAt(1.2)}
          aria-label="Ampliar árvore"
          title="Ampliar árvore"
        >
          <span aria-hidden="true">+</span>
        </button>
        <button type="button" onClick={fit} aria-label="Enquadrar árvore" title="Enquadrar árvore">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={centerRoot}
          aria-label="Centralizar raiz"
          title="Centralizar raiz"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v4m0 10v4M3 12h4m10 0h4M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
