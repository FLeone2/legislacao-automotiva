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
    ambiental: 'Etapa 1 · Ambiental',
    transito: 'Etapa 2 · Trânsito',
    paralelo: 'Em paralelo · sua responsabilidade',
    fornecedor: 'Fornecedor · Inmetro e Anatel',
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
    return { docs, df, avg, acts: new Map(data.acts.map((act) => [act.id, act])) };
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
    for (const item of scored) {
      const key = item.doc.passage.actId || item.doc.passage.id;
      if ((perAct.get(key) || 0) >= 2) continue;
      perAct.set(key, (perAct.get(key) || 0) + 1);
      chosen.push(item);
      if (chosen.length === 6) break;
    }
    return { chosen, terms: all };
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
      status = data?.available ? { available: true, model: data.model } : { available: false };
    } catch {
      status = { available: false };
    }
    return status;
  }

  function sourceLinks(passage) {
    const act = passage.actId ? index.acts.get(passage.actId) : null;
    const pdf =
      act?.pdf && /^pdfs\/[\w./-]+\.pdf$/.test(act.pdf)
        ? `<a href="${esc(act.pdf)}" target="_blank" rel="noopener">Abrir PDF${passage.kind === 'official_pdf_text' ? ` (p. ${esc(passage.device.replace(/\D+/g, ''))})` : ''}</a>`
        : '';
    return `${pdf}${safeLink(passage.url || act?.url, 'Fonte oficial')}${passage.actId ? `<a href="${esc('#library?' + new URLSearchParams({ q: passage.title || '' }))}">Ver na biblioteca</a>` : ''}`;
  }
  function renderSources(entry) {
    return `<ol class="ask-sources">${entry.passages
      .map(
        (passage, i) =>
          `<li id="ask-${entry.id}-${i + 1}"><div class="ask-source-head"><span class="ask-n">${i + 1}</span><strong>${esc(passage.title)}</strong></div><div class="ask-chips"><span class="ask-stage ask-stage-${esc(passage.stage)}">${esc(STAGES[passage.stage] || passage.stage)}</span><span class="ask-kind">${esc(passage.kindLabel)}${passage.device ? ` · ${esc(passage.device)}` : ''}</span></div><p>${esc(passage.text.length > 340 ? passage.text.slice(0, 340) + '…' : passage.text)}</p><div class="ask-links">${sourceLinks(passage)}</div></li>`,
      )
      .join('')}</ol>`;
  }
  function renderAnswer(entry) {
    const html = esc(entry.answer)
      .replace(/\[(\d{1,2})\]/g, (match, n) =>
        Number(n) <= entry.passages.length
          ? `<a class="ask-cite" href="#ask-${entry.id}-${n}" data-cite="ask-${entry.id}-${n}" aria-label="Trecho ${n}">${n}</a>`
          : match,
      )
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
      .join('');
    return html;
  }
  function renderEntry(entry) {
    const body =
      entry.state === 'loading'
        ? '<p class="ask-wait" role="status">Procurando nas leis e escrevendo a resposta…</p>'
        : `${entry.answer ? `<div class="ask-answer">${renderAnswer(entry)}</div>` : ''}${entry.error ? `<p class="ask-error" role="alert">${esc(entry.error)}</p>` : ''}${entry.passages.length ? `<h3 class="ask-sources-title">${entry.answer ? 'Trechos usados na resposta' : 'Trechos encontrados'}</h3>${renderSources(entry)}` : ''}`;
    return `<article class="ask-entry" data-entry="${entry.id}"><p class="ask-question">${esc(entry.question)}</p>${body}</article>`;
  }
  function renderThread() {
    const target = $('#askThread');
    if (!target) return;
    target.innerHTML = thread.length
      ? thread.slice().reverse().map(renderEntry).join('')
      : `<div class="ask-empty"><p>Experimente uma destas perguntas:</p><div class="ask-examples">${EXAMPLES.map((q) => `<button type="button" class="ask-example" data-ask-example="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`;
  }
  function renderStatus() {
    const target = $('#askStatus');
    if (!target || !status) return;
    target.className = `ask-status ${status.available ? 'on' : 'off'}`;
    target.textContent = status.available
      ? 'IA ligada · Cloudflare Workers AI (gratuito)'
      : 'IA ainda não ligada neste endereço · mostramos os trechos encontrados';
  }

  async function ask(question) {
    question = question.trim().slice(0, 600);
    if (question.length < 3) return;
    const entry = { id: thread.length + 1, question, state: 'loading', passages: [] };
    thread.push(entry);
    renderThread();
    try {
      await loadIndex();
      const { chosen, terms } = search(question);
      const topActs = [...new Set(chosen.map((item) => item.doc.passage.actId).filter(Boolean))];
      const pdf = await pdfWindows(topActs.slice(0, 3), terms);
      entry.passages = [...chosen.slice(0, 6).map((item) => item.doc.passage), ...pdf.slice(0, 2)];
      if (!entry.passages.length) {
        entry.error =
          'Não encontrei nada no acervo com essas palavras. Tente o nome da norma, do órgão ou da peça.';
      } else if ((await checkStatus()).available) {
        const response = await fetch('api/ask', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question, passages: entry.passages }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.answer) entry.answer = data.answer;
        else entry.error = data.error || 'A IA não respondeu. Os trechos encontrados estão abaixo.';
      }
    } catch {
      entry.error = 'Não foi possível carregar a base de consulta. Tente recarregar a página.';
    }
    entry.state = 'done';
    renderThread();
    $(`[data-entry="${entry.id}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function render() {
    $('#main').innerHTML =
      `<div class="simple-page ask-page"><header class="simple-head"><p class="simple-eyebrow">Perguntar</p><h1 class="simple-title">Pergunte às leis do acervo</h1><p class="simple-lead">A resposta usa só as fichas, os trechos e os PDFs oficiais publicados aqui, sempre com o número do trecho. É um protótipo: confira na fonte antes de decidir.</p><p class="ask-status" id="askStatus" role="status">Verificando a IA…</p></header><form class="ask-form" id="askForm"><label for="askInput" class="sr-only">Sua pergunta</label><textarea id="askInput" rows="2" maxlength="600" placeholder="Ex.: O que preciso para tirar a LCVM de um SUV híbrido importado?"></textarea><button class="btn primary" type="submit">Perguntar</button></form><section id="askThread" class="ask-thread" aria-live="polite"></section><p class="simple-note">As respostas não são parecer jurídico. Uma ficha de resumo não é o texto do ato. Vigência, alterações e aplicação ao seu veículo dependem da leitura dos atos oficiais.</p></div>`;
    renderThread();
    checkStatus().then(renderStatus);
    loadIndex().catch(() => {});
    const form = $('#askForm');
    const input = $('#askInput');
    form.onsubmit = (event) => {
      event.preventDefault();
      const value = input.value;
      input.value = '';
      ask(value);
    };
    input.onkeydown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    };
    $('#askThread').onclick = (event) => {
      const example = event.target.closest('[data-ask-example]');
      if (example) ask(example.dataset.askExample);
      const cite = event.target.closest('[data-cite]');
      if (cite) {
        event.preventDefault();
        const target = document.getElementById(cite.dataset.cite);
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        target?.classList.add('flash');
        setTimeout(() => target?.classList.remove('flash'), 1200);
      }
    };
  }
  return { render, search: (q) => search(q), loadIndex, tokens };
})();
function renderAssistant() {
  Assistant.render();
}
