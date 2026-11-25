'use strict';

// Expanded requirement tree of the homologation stage "Segurança veicular".
// Data comes only from flow-safety-tree.js (editorial input). Each item lists the
// acts and devices to consult; a link opens the full text at that device. The
// tree organizes consultation: it does not decide that an item applies.
const SafetyTreeView = (() => {
  const BADGES = {
    'nivel-1': 'N1',
    'nivel-2': 'N2',
    'nivel-3': 'N3',
    opcionais: 'OP',
    mover: 'MV',
    identificacao: 'ID',
  };

  function spec() {
    return typeof safetyTreeSpec === 'undefined' ? null : safetyTreeSpec;
  }

  function sections(group) {
    return group.subgroups || [group];
  }

  function items(group) {
    return sections(group).flatMap((section) => section.items);
  }

  function record(id) {
    return typeof catalogRecord === 'function' && typeof catalog !== 'undefined'
      ? catalogRecord(catalog, id)
      : null;
  }

  // "Resolução CONTRAN nº 915/2022 - Freios" → "Resolução CONTRAN nº 915/2022".
  function lawName(id) {
    const title = record(id)?.title;
    if (title) return title.split(/\s+[—–-]\s+/)[0].replace(/(\d+)-(\d{4})\b/, '$1/$2');
    const m = id.match(/^([a-z]+)-(\d+)-(\d{4})$/);
    return m ? `${m[1].toUpperCase()} ${m[2]}/${m[3]}` : id;
  }

  function hasText(id) {
    // Until the text index arrives, links point at the text; bind() re-renders.
    return typeof LawReader === 'undefined' || !LawReader.loadedIndex() || LawReader.has(id);
  }

  function lawHref(ref) {
    if (hasText(ref.id))
      return (
        '#lei?' +
        new URLSearchParams(ref.anchor ? { id: ref.id, trecho: ref.anchor } : { id: ref.id })
      );
    const r = record(ref.id);
    return r ? `#contran?record=${encodeURIComponent(r.id)}` : '';
  }

  function lawLink(ref) {
    const href = lawHref(ref);
    const name = esc(lawName(ref.id));
    const device = ref.device ? `<span class="st-law-device">${esc(ref.device)}</span>` : '';
    const missing = hasText(ref.id) ? '' : '<span class="st-law-flag">sem texto completo</span>';
    return href
      ? `<a href="${esc(href)}"><span class="st-law-name">${name}</span>${device}${missing}</a>`
      : `<span class="st-law-name">${name}</span>${device}${missing}`;
  }

  function itemMarkup(item) {
    const code = item.code || '';
    const laws = item.refs.length
      ? `<ul class="st-laws" aria-label="Legislação de ${esc(item.label)}">${item.refs.map((ref) => `<li>${lawLink(ref)}</li>`).join('')}</ul>`
      : `<p class="st-gap"><span aria-hidden="true">!</span> ${esc(item.gap || 'Ato atual não vinculado nesta revisão.')}</p>`;
    const notes = [
      item.condition ? `<p class="st-cond">${esc(item.condition)}</p>` : '',
      item.methods
        ? `<p class="st-cond"><strong>Métodos citados:</strong> ${esc(item.methods)}</p>`
        : '',
      item.siscatHelp ? `<p class="st-help">Ajuda do SISCAT cita: ${esc(item.siscatHelp)}</p>` : '',
    ].join('');
    const search = [
      item.label,
      code,
      ...item.refs.map((r) => lawName(r.id) + ' ' + (r.device || '')),
    ]
      .join(' ')
      .toLowerCase();
    return `<li class="st-item" data-st-search="${esc(search)}"><div class="st-item-line">${code ? `<span class="st-code">${esc(code)}</span>` : ''}<strong>${esc(item.label)}</strong><span class="st-count">${item.refs.length ? item.refs.length + (item.refs.length > 1 ? ' leis' : ' lei') : 'lacuna'}</span></div>${laws}${notes}</li>`;
  }

  function sectionMarkup(section, nested) {
    const list = `<ol class="st-items">${section.items.map(itemMarkup).join('')}</ol>`;
    if (!nested) return list;
    return `<li class="st-subgroup"><details open><summary><span class="st-title">${esc(section.label)}</span><span class="st-meta">${section.items.length} itens</span></summary>${list}</details></li>`;
  }

  function groupMarkup(group) {
    const nested = Boolean(group.subgroups);
    const body = nested
      ? `<ol class="st-subgroups">${group.subgroups.map((s) => sectionMarkup(s, true)).join('')}</ol>`
      : sectionMarkup(group, false);
    return `<li class="st-group" data-st-group="${esc(group.id)}"><details open><summary><span class="st-badge" aria-hidden="true">${esc(BADGES[group.id] || '·')}</span><span class="st-title">${esc(group.label)}</span><span class="st-meta">${items(group).length} itens</span></summary><div class="st-group-body"><p class="st-group-text">${esc(group.text)} <span class="st-source">Fonte: ${lawLink(group.source)}</span></p>${body}</div></details></li>`;
  }

  function markup(stage) {
    const data = spec();
    if (!data || stage?.id !== 'seguranca') return '';
    const all = data.groups.flatMap(items);
    const laws = new Set(all.flatMap((item) => item.refs.map((ref) => ref.id)));
    const gaps = all.filter((item) => !item.refs.length).length;
    return `<section id="safetyTree" class="safety-tree" aria-labelledby="safetyTreeTitle" tabindex="-1"><header class="safety-tree-head"><div><span class="portal-eyebrow">Etapa B · Árvore completa</span><h2 id="safetyTreeTitle">Requisitos de segurança veicular</h2><p>${esc(data.scope)}</p></div><div class="safety-tree-tools"><label><span class="portal-field-label">Filtrar a árvore</span><input id="safetyTreeFilter" type="search" placeholder="Item, lei ou artigo" autocomplete="off"></label><div class="safety-tree-buttons"><button class="btn" type="button" data-safety-open="all">Expandir tudo</button><button class="btn" type="button" data-safety-open="none">Recolher tudo</button></div></div></header><p class="safety-tree-counts"><span><strong>${data.groups.length}</strong> grupos</span><span><strong>${all.length}</strong> itens</span><span><strong>${laws.size}</strong> atos citados</span><span><strong>${gaps}</strong> sem ato vinculado</span><span id="safetyTreeStatus" role="status"></span></p><ol class="safety-tree-root">${data.groups.map(groupMarkup).join('')}</ol><p class="scope-note">${esc(data.provenance)} Revisão do levantamento: ${esc(new Date(data.reviewedAt + 'T12:00:00').toLocaleDateString('pt-BR'))}.</p></section>`;
  }

  // Groups → items → acts, as extra branches of the stage graph.
  function graphNodes(stage) {
    const data = spec();
    if (!data || stage.id !== 'seguranca') return [];
    const base = `flow:${stage.id}:st`;
    const itemNode = (item, parent) => {
      const id = `${parent}:${item.id}`;
      const children = item.refs.map((ref) => {
        const r = record(ref.id);
        return {
          id: `${id}:law:${ref.id}`,
          label: lawName(ref.id),
          subtitle: ref.device || 'Ato do item',
          icon: '▤',
          kind: 'Legislação do item',
          recordIds: r ? [r.id] : [],
          recordId: r?.id,
          text: item.condition || '',
        };
      });
      if (!children.length)
        children.push({
          id: `${id}:gap`,
          label: 'Conferência pendente',
          subtitle: item.gap || 'Ato atual não vinculado.',
          icon: '!',
          kind: 'Lacuna do item',
          recordIds: [],
          text: item.condition || item.gap || '',
        });
      return {
        id,
        label: (item.code ? item.code + ' · ' : '') + item.label,
        subtitle: `${item.refs.length} ${item.refs.length === 1 ? 'lei' : 'leis'}`,
        icon: '◇',
        kind: 'Item de segurança',
        text: item.condition || '',
        recordIds: children.flatMap((c) => c.recordIds),
        children,
      };
    };
    return data.groups.map((group) => {
      const id = `${base}:${group.id}`;
      const children = group.subgroups
        ? group.subgroups.map((section) => {
            const sid = `${base}:${section.id}`;
            const kids = section.items.map((item) => itemNode(item, sid));
            return {
              id: sid,
              label: section.label,
              subtitle: `${section.items.length} itens`,
              icon: '◇',
              kind: 'Grupo de requisitos',
              text: group.text,
              recordIds: [...new Set(kids.flatMap((k) => k.recordIds))],
              children: kids,
            };
          })
        : group.items.map((item) => itemNode(item, id));
      return {
        id,
        label: group.label,
        subtitle: `${items(group).length} itens · árvore completa`,
        icon: '◇',
        kind: 'Grupo de requisitos',
        text: group.text,
        recordIds: [...new Set(children.flatMap((c) => c.recordIds))],
        children,
      };
    });
  }

  function filter(value) {
    const root = document.getElementById('safetyTree');
    if (!root) return;
    const terms = value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    root.querySelectorAll('.st-item').forEach((item) => {
      const hit = terms.every((t) => item.dataset.stSearch.includes(t));
      item.hidden = !hit;
      if (hit) shown++;
    });
    root.querySelectorAll('.st-subgroup, .st-group').forEach((node) => {
      const any = node.querySelector('.st-item:not([hidden])');
      node.hidden = !any;
      if (terms.length && any) node.querySelector('details').open = true;
    });
    root.querySelectorAll('.st-subgroup details').forEach((d) => {
      if (terms.length && d.querySelector('.st-item:not([hidden])')) d.open = true;
    });
    document.getElementById('safetyTreeStatus').textContent = terms.length
      ? `${shown} ${shown === 1 ? 'item encontrado' : 'itens encontrados'}`
      : '';
  }

  function bind() {
    const root = document.getElementById('safetyTree');
    if (!root) return;
    root
      .querySelector('#safetyTreeFilter')
      .addEventListener('input', (e) => filter(e.target.value));
    root.querySelectorAll('[data-safety-open]').forEach((button) =>
      button.addEventListener('click', () => {
        const open = button.dataset.safetyOpen === 'all';
        root.querySelectorAll('details').forEach((d) => (d.open = open));
      }),
    );
    // Links to acts without a full text fall back once the text index is known.
    if (typeof LawReader !== 'undefined' && !LawReader.loadedIndex())
      LawReader.loadIndex().then(() => {
        if (!document.body.contains(root)) return;
        const open = [...root.querySelectorAll('details')].map((d) => d.open);
        const value = root.querySelector('#safetyTreeFilter').value;
        root.outerHTML = markup({ id: 'seguranca' });
        const next = document.getElementById('safetyTree');
        next.querySelectorAll('details').forEach((d, i) => (d.open = open[i] ?? true));
        next.querySelector('#safetyTreeFilter').value = value;
        bind();
        if (value) filter(value);
      });
  }

  return { markup, graphNodes, bind, lawName };
})();

if (typeof module !== 'undefined') module.exports = { SafetyTreeView };
