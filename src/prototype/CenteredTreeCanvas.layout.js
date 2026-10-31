// Presentation-only geometry: legal records, source identities and applicability
// stay on the original nodes. The vehicle profile never originates here.
export const TREE_GEOMETRY = Object.freeze({ width: 236, height: 86, column: 300, gap: 20 });

const childrenOf = (node) => (Array.isArray(node?.children) ? node.children : []);
const searchable = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function indexCenteredTree(root) {
  const index = new Map();
  function visit(node, parent = null, depth = 0) {
    if (!node?.id || index.has(node.id)) return;
    index.set(node.id, { node, parent, depth });
    childrenOf(node).forEach((child) => visit(child, node.id, depth + 1));
  }
  visit(root);
  return index;
}

export function centeredTreeAncestors(index, id) {
  const result = [];
  const seen = new Set();
  let current = index.get(id);
  while (current && !seen.has(current.node.id)) {
    seen.add(current.node.id);
    result.unshift(current.node.id);
    current = index.get(current.parent);
  }
  return result;
}

export function layoutCenteredTree(
  root,
  expanded = new Set(),
  { showOutside = false, query = '', selectedId = root?.id } = {},
) {
  if (!root?.id) return { nodes: [], edges: [], bounds: null };
  const index = indexCenteredTree(root);
  const selectedPath = new Set(centeredTreeAncestors(index, selectedId));
  const needle = searchable(query).trim();
  const matched = new Map();
  function includesMatch(node) {
    if (matched.has(node.id)) return matched.get(node.id);
    const allowed = showOutside || node.status !== 'outside_profile' || selectedPath.has(node.id);
    const value =
      allowed &&
      (!needle ||
        searchable(`${node.label} ${node.description || ''}`).includes(needle) ||
        childrenOf(node).some(includesMatch));
    matched.set(node.id, value);
    return value;
  }
  const visibleChildren = (node) => childrenOf(node).filter(includesMatch);
  const isOpen = (node) => expanded.has(node.id) || (needle && includesMatch(node));
  const heightCache = new Map();
  function subtreeHeight(node) {
    if (heightCache.has(node.id)) return heightCache.get(node.id);
    const children = isOpen(node) ? visibleChildren(node) : [];
    const height = Math.max(
      TREE_GEOMETRY.height + TREE_GEOMETRY.gap,
      children.reduce((sum, child) => sum + subtreeHeight(child), 0),
    );
    heightCache.set(node.id, height);
    return height;
  }
  const nodes = [];
  const edges = [];
  function place(node, side, depth, y, parent = null) {
    const children = visibleChildren(node);
    const record = {
      node,
      id: node.id,
      parent,
      side,
      depth,
      x: side * depth * TREE_GEOMETRY.column,
      y,
      width: TREE_GEOMETRY.width,
      height: TREE_GEOMETRY.height,
      hasChildren: children.length > 0,
      expanded: Boolean(isOpen(node)),
      selectedPath: selectedPath.has(node.id),
    };
    nodes.push(record);
    if (!isOpen(node)) return;
    let cursor = y - children.reduce((sum, child) => sum + subtreeHeight(child), 0) / 2;
    children.forEach((child) => {
      const height = subtreeHeight(child);
      const childY = cursor + height / 2;
      edges.push({ id: `${node.id}:${child.id}`, from: node.id, to: child.id, side });
      place(child, side, depth + 1, childY, node.id);
      cursor += height;
    });
  }
  // The root stays at the world origin even when one side grows. Each branch's
  // side follows its original source order, so filtering does not mirror it.
  const rootChildren = visibleChildren(root);
  nodes.push({
    node: root,
    id: root.id,
    parent: null,
    side: 0,
    depth: 0,
    x: 0,
    y: 0,
    width: TREE_GEOMETRY.width,
    height: TREE_GEOMETRY.height,
    hasChildren: rootChildren.length > 0,
    expanded: Boolean(isOpen(root)),
    selectedPath: true,
  });
  if (isOpen(root)) {
    for (const side of [-1, 1]) {
      const branches = rootChildren.filter(
        (node) =>
          (childrenOf(root).findIndex((child) => child.id === node.id) % 2 ? 1 : -1) === side,
      );
      let cursor = -branches.reduce((sum, child) => sum + subtreeHeight(child), 0) / 2;
      branches.forEach((child) => {
        const height = subtreeHeight(child);
        edges.push({ id: `${root.id}:${child.id}`, from: root.id, to: child.id, side });
        place(child, side, 1, cursor + height / 2, root.id);
        cursor += height;
      });
    }
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const links = edges.map((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    const startX = from.x + (edge.side * from.width) / 2;
    const endX = to.x - (edge.side * to.width) / 2;
    const middle = (startX + endX) / 2;
    return {
      ...edge,
      selectedPath: selectedPath.has(edge.to),
      path: `M ${startX} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${endX} ${to.y}`,
    };
  });
  return {
    nodes,
    edges: links,
    bounds: {
      minX: Math.min(...nodes.map((node) => node.x - node.width / 2)),
      maxX: Math.max(...nodes.map((node) => node.x + node.width / 2)),
      minY: Math.min(...nodes.map((node) => node.y - node.height / 2)),
      maxY: Math.max(...nodes.map((node) => node.y + node.height / 2)),
    },
  };
}

export function fitCenteredTree(bounds, size, padding = 36) {
  if (!bounds || !size.width || !size.height) return { x: 0, y: 0, zoom: 1 };
  const zoom = Math.max(
    0.25,
    Math.min(
      1,
      (size.width - padding * 2) / (bounds.maxX - bounds.minX),
      (size.height - padding * 2) / (bounds.maxY - bounds.minY),
    ),
  );
  return {
    x: size.width / 2 - ((bounds.minX + bounds.maxX) / 2) * zoom,
    y: size.height / 2 - ((bounds.minY + bounds.maxY) / 2) * zoom,
    zoom,
  };
}
