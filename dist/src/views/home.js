'use strict';
// Início: one question box first (AI over the published laws), then the four
// consultation areas. A consultation map, not an automatic obligation.
const HOME_EXAMPLES = [
  'Quem emite a LCVM?',
  'ESC é obrigatório no M1?',
  'Resolução CONTRAN 954/2022',
  'Etiqueta PBEV',
];
function renderHome() {
  const { STAGES, STAGE_ORDER, STAGE_HINT, STAGE_ROUTE } = Assistant;
  const areas = STAGE_ORDER.map(
    (s) =>
      `<li><a href="${esc(STAGE_ROUTE[s])}"><span class="home-area-name"><span class="ask-dot ask-dot-${s}" aria-hidden="true"></span>${esc(STAGES[s])}</span><span class="home-area-hint">${esc(STAGE_HINT[s])}</span><span class="home-area-count" data-count="${s}"></span></a></li>`,
  ).join('');
  $('#main').innerHTML =
    `<div class="home-a"><section class="home-a-hero"><h1>O que você precisa homologar?</h1><p>Pergunte em português ou digite o número de uma norma.</p><form class="ask-bar home-a-bar" id="homeAsk" role="search"><label for="homeAskInput" class="sr-only">Pergunta ou norma</label><input id="homeAskInput" type="search" maxlength="600" autocomplete="off" placeholder="Ex.: o que preciso para a LCVM de um SUV híbrido importado?"><button class="btn primary" type="submit">Perguntar</button></form><div class="ask-examples home-a-examples">${HOME_EXAMPLES.map((q) => `<a class="ask-example" href="${esc('#ia?' + new URLSearchParams({ q }))}">${esc(q)}</a>`).join('')}</div></section><nav class="home-a-areas" aria-label="Áreas da homologação"><ol>${areas}</ol><p>Prefere explorar? <a href="#vehicle">Veículo 3D</a> · <a href="#flow">Fluxo completo</a> · <a href="#library">Todas as leis</a></p></nav></div>`;
  $('#homeAsk').onsubmit = (event) => {
    event.preventDefault();
    const q = $('#homeAskInput').value.trim();
    if (q) location.hash = 'ia?' + new URLSearchParams({ q });
  };
  Assistant.loadIndex()
    .then(() => {
      const counts = Assistant.stageCounts();
      if (!counts) return;
      document.querySelectorAll('[data-count]').forEach((el) => {
        const n = counts[el.dataset.count];
        el.textContent = n ? `${n} ${n === 1 ? 'norma' : 'normas'}` : '';
      });
    })
    .catch(() => {});
}
