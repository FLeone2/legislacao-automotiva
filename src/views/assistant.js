'use strict';
// "Perguntar": lexical retrieval in the browser over the published knowledge
// base and the official PDF text, then a short cited answer from Workers AI
// (functions/api/ask.js). Without the AI, the retrieved passages still help.
const Assistant = (() => {
  const STOPWORDS = new Set(
    'a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas para com sem sob sobre e ou que se ao aos à às é ser são foi como qual quais quando onde quem meu minha seu sua seus suas este esta isso isto esse essa eu voce você preciso precisa devo deve pode posso tem ter há mais menos muito qualquer cada entre até já não sim ele ela eles elas lhe me te nos vos the of and'.split(
      ' ',
    ),
  );
  const EXPANSIONS = {
    lcvm: ['licenca', 'configuracao', 'ibama', 'proconve'],
    cat: ['certificado', 'adequacao', 'transito', 'senatran'],
    siscat: ['cat', 'senatran', 'certificado'],
    pbev: ['etiquetagem', 'eficiencia', 'ence', 'inmetro'],
    ence: ['etiqueta', 'eficiencia', 'pbev'],
    cop: ['conformidade', 'producao'],
    acp: ['conformidade', 'producao', 'ibama'],
    abs: ['freio', 'frenagem', 'antitravamento'],
    esc: ['estabilidade', 'controle'],
    vin: ['identificacao', 'chassi', 'gravacao'],
    obd: ['diagnose', 'bordo', 'obdbr'],
    rde: ['trafego', 'real', 'etr'],
    hibrido: ['hev', 'phev', 'eletrico'],
    eletrico: ['bev', 'bateria', 'tracao'],
    emissoes: ['proconve', 'poluentes', 'l8'],
  };
  const STAGES = {
    ambiental: 'Ambiental',
    seguranca: 'Segurança',
    inmetro: 'Inmetro',
    pos: 'Pós-homologação',
  };
  const STAGE_ORDER = ['ambiental', 'seguranca', 'inmetro', 'pos'];
  const STAGE_HINT = {
    ambiental: 'IBAMA · PROCONVE · LCVM',
    seguranca: 'CONTRAN · SENATRAN · CAT',
    inmetro: 'Componentes · PBEV · Anatel',
    pos: 'COP · ACP · IUMPR',
  };
  const STAGE_ROUTE = {
    ambiental: '#proconve',
    seguranca: '#contran',
    inmetro: '#inmetro',
    pos: '#flow?stage=cop',
  };
  const EXAMPLES = [
    'O que é a LCVM e quem emite?',
    'Quais ensaios de emissões um híbrido precisa?',
    'Quais componentes precisam de certificado do Inmetro?',
    'Quando o controle de estabilidade (ESC) é obrigatório no M1?',
  ];
  const thread = [];
  let index = null;
  let indexLoad = null;
  let status = null;
  const pdfTexts = new Map();

  function tokens(value) {
    const words = norm(value)
      .split(/[^a-z0-9]+/)
      .filter((word) => word && (word.length > 1 || /\d/.test(word)) && !STOPWORDS.has(word));
    return words;
  }
  function queryTerms(question) {
    const base = tokens(question);
    const extra = base.flatMap((word) => EXPANSIONS[word] || []);
    return { base, all: [...new Set([...base, ...extra])] };
  }

  function prepare(data) {
    const docs = data.passages.map((passage) => {
      const words = tokens(`${passage.title} ${passage.device || ''} ${passage.text}`);
      const tf = new Map();
      for (const word of words) tf.set(word, (tf.get(word) || 0) + 1);
      return { passage, tf, length: words.length, title: new Set(tokens(passage.title)) };
    });
    const df = new Map();
    for (const doc of docs) for (const word of doc.tf.keys()) df.set(word, (df.get(word) || 0) + 1);
    const avg = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length);
    const subjects = new Map();
    for (const passage of data.passages)
      if (passage.actId && passage.kind === 'catalog_reference' && !subjects.has(passage.actId))
        subjects.set(
          passage.actId,
          passage.text
            .split(/Relações e links/)[0]
            .trim()
            .slice(0, 160),
        );
    return {
      docs,
      df,
      avg,
      subjects,
      acts: new Map(data.acts.map((act) => [act.id, act])),
    };
  }
  function idf(word) {
    const n = index.docs.length;
    const df = index.df.get(word) || 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }
  function bm25(tf, length, terms, avg) {
    const k1 = 1.3;
    const b = 0.72;
    let score = 0;
    for (const word of terms) {
      const freq = tf.get(word) || 0;
      if (!freq) continue;
      score += (idf(word) * (freq * (k1 + 1))) / (freq + k1 * (1 - b + (b * length) / avg));
    }
    return score;
  }
  function search(question) {
    const { base, all } = queryTerms(question);
    const scored = index.docs
      .map((doc) => {
        let score = bm25(doc.tf, doc.length, all, index.avg);
        for (const word of base) if (doc.title.has(word)) score += 2.2 * idf(word);
        if (doc.passage.kind === 'public_text_excerpt') score *= 1.15;
        if (doc.passage.kind === 'editorial_candidate') score *= 0.6;
        return { doc, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const perAct = new Map();
    const chosen = [];
    const related = [];
    for (const item of scored) {
      const key = item.doc.passage.actId || item.doc.passage.id;
      const seen = perAct.get(key) || 0;
      if (!seen && item.doc.passage.actId && related.length < 40) related.push(item.doc.passage);
      if (seen >= 2) continue;
      perAct.set(key, seen + 1);
      if (chosen.length < 6) chosen.push(item);
    }
    return { chosen, related, terms: all };
  }

  async function pdfWindows(actIds, terms) {
    const results = [];
    for (const actId of actIds) {
      const act = index.acts.get(actId);
      if (!act?.pdfText || !/^pdfs\/text\/[\w.-]+\.json$/.test(act.pdfText)) continue;
      let pages = pdfTexts.get(actId);
      if (!pages) {
        try {
          const response = await fetch(act.pdfText);
          if (!response.ok) continue;
          pages = (await response.json()).pages || [];
          pdfTexts.set(actId, pages);
        } catch {
          continue;
        }
      }
      let best = null;
      pages.forEach((page, pageIndex) => {
        for (let start = 0; start < page.length; start += 900) {
          const text = page.slice(start, start + 1800);
          const words = tokens(text);
          const tf = new Map();
          for (const word of words) tf.set(word, (tf.get(word) || 0) + 1);
          const score = bm25(tf, words.length, terms, 260);
          if (!best || score > best.score) best = { score, text, page: pageIndex + 1 };
        }
      });
      if (best?.score > 0)
        results.push({
          id: `${actId}:pdf:${best.page}`,
          actId,
          agency: act.agency,
          device: `PDF, página ${best.page}`,
          kind: 'official_pdf_text',
          kindLabel: 'Texto do PDF oficial',
          stage: act.stage,
          text: best.text.replace(/\s+/g, ' ').trim(),
          title: act.title,
          url: act.url,
        });
    }
    return results;
  }

  async function loadIndex() {
    if (!indexLoad)
      indexLoad = fetch('data/ai/passages.json')
        .then((response) => {
          if (!response.ok) throw new Error('Índice indisponível');
          return response.json();
        })
        .then((data) => {
          index = prepare(data);
        })
        .catch((error) => {
          indexLoad = null;
          throw error;
        });
    return indexLoad;
  }
  async function checkStatus() {
    if (status) return status;
    try {
      const response = await fetch('api/ask', { headers: { accept: 'application/json' } });
      const data = response.ok ? await response.json() : null;
      const providers = Array.isArray(data?.providers) ? data.providers : [];
      status = data?.available
        ? { available: true, providers, provider: data.default || providers[0]?.id || null }
        : { available: false, providers: [] };
    } catch {
      status = { available: false, providers: [] };
    }
    return status;
  }

  const pastQuestions = [];
  let current = null;
  let activeTab = null;
  let showAll = false;

  function lawLinks(actId, url) {
    const act = actId ? index.acts.get(actId) : null;
    const pdf =
      act?.pdf && /^pdfs\/[\w./-]+\.pdf$/.test(act.pdf)
        ? `<a class="ask-pill" href="${esc(act.pdf)}" target="_blank" rel="noopener">PDF</a>`
        : '';
    return `${pdf}${safeLink(url || act?.url, 'Fonte oficial', 'ask-pill')}`;
  }
  function renderAnswer(entry) {
    return esc(entry.answer)
      .replace(/\[(\d{1,2})\]/g, (match, n) =>
        Number(n) <= entry.passages.length
          ? `<a class="ask-cite" href="#ask-src-${n}" data-cite="ask-src-${n}" aria-label="Trecho ${n}">${n}</a>`
          : match,
      )
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }
  function renderPassages(entry) {
    return `<details class="ask-used"${entry.answer ? '' : ' open'}><summary>${entry.answer ? 'Trechos usados na resposta' : 'Trechos encontrados'} (${entry.passages.length})</summary><ol>${entry.passages
      .map(
        (p, i) =>
          `<li id="ask-src-${i + 1}"><span class="ask-n">${i + 1}</span><div><strong>${esc(p.title)}</strong><small>${esc(STAGES[p.stage] || '')} · ${esc(p.kindLabel)}${p.device ? ` · ${esc(p.device)}` : ''}</small><p>${esc(p.text.length > 320 ? p.text.slice(0, 320) + '…' : p.text)}</p><div class="ask-links">${lawLinks(p.actId, p.url)}</div></div></li>`,
      )
      .join('')}</ol></details>`;
  }
  function renderAnswerBlock() {
    const target = $('#askAnswer');
    if (!target) return;
    if (!current) {
      target.innerHTML = `<div class="ask-empty"><p>Experimente:</p><div class="ask-examples">${EXAMPLES.map((q) => `<button type="button" class="ask-example" data-ask-example="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`;
      return;
    }
    const e = current;
    const picker =
      status?.providers?.length > 1
        ? `<div class="ask-provider" role="group" aria-label="Modelo de IA">${status.providers.map((p) => `<button type="button" data-provider="${esc(p.id)}" aria-pressed="${String(p.id === status.provider)}" title="${esc(p.model)}">${esc(p.label)}</button>`).join('')}</div>`
        : '';
    const meta =
      e.state === 'loading'
        ? 'Procurando nas leis e escrevendo a resposta…'
        : e.answer
          ? `Resposta · ${esc(e.by)} · com ${e.passages.length} trechos do acervo${e.fallback ? ' · o outro modelo estava indisponível' : ''}`
          : status?.available
            ? 'Sem resposta da IA'
            : 'A IA ainda não está ligada neste endereço; veja os trechos encontrados';
    target.innerHTML = `<div class="ask-meta-line"><span class="ask-badge" aria-hidden="true">IA</span><span role="status">${meta}</span>${picker}</div>${e.answer ? `<div class="ask-answer">${renderAnswer(e)}<p class="ask-disclaimer">Não é parecer jurídico. Confira a vigência na fonte oficial.</p></div>` : ''}${e.error ? `<p class="ask-error" role="alert">${esc(e.error)}</p>` : ''}${e.passages.length ? renderPassages(e) : ''}`;
  }
  function renderLaws() {
    const target = $('#askLaws');
    const where = $('#askWhere');
    if (!target || !where) return;
    if (!current || current.state === 'loading' || !current.related.length) {
      target.innerHTML = '';
      where.innerHTML = '';
      return;
    }
    const groups = Object.fromEntries(STAGE_ORDER.map((s) => [s, []]));
    for (const passage of current.related) groups[passage.stage]?.push(passage);
    const top = STAGE_ORDER.reduce((a, b) => (groups[b].length > groups[a].length ? b : a));
    if (!activeTab || !groups[activeTab].length) activeTab = top;
    const rows = showAll ? groups[activeTab] : groups[activeTab].slice(0, 8);
    const more =
      groups[activeTab].length > 8
        ? `<button type="button" class="ask-more" data-more>${showAll ? 'Mostrar menos' : `Ver todas (${groups[activeTab].length})`}</button>`
        : '';
    target.innerHTML = `<div class="ask-tabs-head"><h2>Normas relacionadas</h2><div role="tablist" aria-label="Filtrar por etapa" class="ask-tabs">${STAGE_ORDER.map((s) => `<button type="button" role="tab" id="ask-tab-${s}" aria-controls="ask-panel" aria-selected="${String(s === activeTab)}" data-tab="${s}" ${groups[s].length ? '' : 'disabled'}>${STAGES[s]} <span>${groups[s].length}</span></button>`).join('')}</div></div><ul class="ask-law-list" id="ask-panel" role="tabpanel" aria-labelledby="ask-tab-${activeTab}">${rows
      .map(
        (p, i) =>
          `<li><span class="ask-n">${i + 1}</span><div><strong>${esc(p.title)}</strong><span>${esc(index.subjects.get(p.actId) || p.kindLabel)}</span></div><div class="ask-links">${lawLinks(p.actId, p.url)}</div></li>`,
      )
      .join('')}</ul>${more}`;
    where.innerHTML = `<p class="ask-where-title">Onde isso entra</p><ol>${STAGE_ORDER.map((s) => `<li class="${s === top ? 'on' : ''}"><span class="ask-dot ask-dot-${s}"></span><a href="${esc(STAGE_ROUTE[s])}"><strong>${STAGES[s]}</strong><small>${STAGE_HINT[s]}</small></a></li>`).join('')}</ol><a class="ask-where-link" href="#vehicle">Ver no veículo 3D →</a>`;
  }
  function renderHistory() {
    const target = $('#askHistory');
    if (!target) return;
    const previous = pastQuestions.filter((q) => q !== current?.question).slice(-4);
    target.innerHTML = previous.length
      ? `<span>Anteriores:</span>${previous.map((q) => `<button type="button" data-ask-example="${esc(q)}">${esc(q.length > 48 ? q.slice(0, 48) + '…' : q)}</button>`).join('')}`
      : '';
  }
  function renderAll() {
    renderAnswerBlock();
    renderLaws();
    renderHistory();
  }

  async function ask(question) {
    question = question.trim().slice(0, 600);
    if (question.length < 3) return;
    const input = $('#askInput');
    if (input) input.value = question;
    if (!pastQuestions.includes(question)) pastQuestions.push(question);
    const entry = { question, state: 'loading', passages: [], related: [] };
    current = entry;
    activeTab = null;
    showAll = false;
    renderAll();
    try {
      await loadIndex();
      const { chosen, related, terms } = search(question);
      const topActs = [...new Set(chosen.map((item) => item.doc.passage.actId).filter(Boolean))];
      const pdf = await pdfWindows(topActs.slice(0, 3), terms);
      entry.passages = [...chosen.map((item) => item.doc.passage), ...pdf.slice(0, 2)];
      entry.related = related;
      if (!entry.passages.length) {
        entry.error =
          'Não encontrei nada no acervo com essas palavras. Tente o nome da norma, do órgão ou da peça.';
      } else if ((await checkStatus()).available) {
        const response = await fetch('api/ask', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question, passages: entry.passages, provider: status.provider }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.answer) {
          entry.answer = data.answer;
          entry.by = `${data.providerLabel || 'IA'} · ${data.model || ''}`;
          entry.fallback = Boolean(data.fallback);
        } else
          entry.error = data.error || 'A IA não respondeu. Os trechos encontrados estão abaixo.';
      }
    } catch {
      entry.error = 'Não foi possível carregar a base de consulta. Tente recarregar a página.';
    }
    entry.state = 'done';
    if (current === entry) renderAll();
  }

  function render() {
    const q = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
    $('#main').innerHTML =
      `<div class="ask2"><form class="ask-bar" id="askForm" role="search"><label for="askInput" class="sr-only">Sua pergunta</label><input id="askInput" type="search" maxlength="600" autocomplete="off" placeholder="Pergunte em português ou digite o número de uma norma"><button class="btn primary" type="submit">Perguntar</button></form><div class="ask-history" id="askHistory"></div><div class="ask-layout"><article class="ask-main"><section id="askAnswer" class="ask-answer-block" aria-live="polite"></section><section id="askLaws" class="ask-laws"></section></article><aside class="ask-where" id="askWhere" aria-label="Onde isso entra na homologação"></aside></div><p class="simple-note">As respostas usam só as fichas, trechos e PDFs oficiais publicados aqui. Não são parecer jurídico; vigência e aplicação ao seu veículo dependem da leitura dos atos oficiais.</p></div>`;
    renderAll();
    checkStatus().then(renderAnswerBlock);
    loadIndex().catch(() => {});
    if (q && q !== current?.question) ask(q);
    else if (current) $('#askInput').value = current.question;
    $('#askForm').onsubmit = (event) => {
      event.preventDefault();
      const value = $('#askInput').value.trim();
      if (!value) return;
      history.replaceState(null, '', '#ia?' + new URLSearchParams({ q: value }));
      ask(value);
    };
    $('#main').onclick = (event) => {
      const example = event.target.closest('[data-ask-example]');
      if (example) {
        history.replaceState(
          null,
          '',
          '#ia?' + new URLSearchParams({ q: example.dataset.askExample }),
        );
        ask(example.dataset.askExample);
        return;
      }
      const tab = event.target.closest('[data-tab]');
      if (event.target.closest('[data-more]')) {
        showAll = !showAll;
        renderLaws();
        return;
      }
      if (tab) {
        activeTab = tab.dataset.tab;
        showAll = false;
        renderLaws();
        $(`#ask-tab-${activeTab}`)?.focus();
        return;
      }
      const provider = event.target.closest('[data-provider]');
      if (provider && status) {
        status.provider = provider.dataset.provider;
        renderAnswerBlock();
        return;
      }
      const cite = event.target.closest('[data-cite]');
      if (cite) {
        event.preventDefault();
        const details = $('.ask-used');
        if (details) details.open = true;
        const target = document.getElementById(cite.dataset.cite);
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        target?.classList.add('flash');
        setTimeout(() => target?.classList.remove('flash'), 1200);
      }
    };
  }
  function stageCounts() {
    if (!index) return null;
    const counts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0]));
    for (const act of index.acts.values()) if (counts[act.stage] !== undefined) counts[act.stage]++;
    return counts;
  }
  return { render, loadIndex, stageCounts, tokens, STAGES, STAGE_ORDER, STAGE_HINT, STAGE_ROUTE };
})();
function renderAssistant() {
  Assistant.render();
}
