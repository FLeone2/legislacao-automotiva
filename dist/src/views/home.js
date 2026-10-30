'use strict';
// Início: the homologation journey in order (environmental → traffic → production)
// with what runs in parallel. A consultation map, not an automatic obligation.
const HOME_STAGES = [
  {
    id: 'ambiental',
    step: '1',
    label: 'Ambiental',
    title: 'Licença ambiental — LCVM',
    text: 'Ensaios de emissões, consumo e OBD acompanhados pelo agente técnico. O IBAMA licencia a configuração do veículo.',
    who: 'IBAMA + agente técnico (CETESB ou credenciado)',
    where: 'Infoserv',
    output: 'LCVM',
    next: 'Libera a etapa 2 e entrega o consumo medido ao PBEV.',
    laws: '#proconve',
    flow: '#flow?stage=aprovacoes',
  },
  {
    id: 'transito',
    step: '2',
    label: 'Trânsito',
    title: 'Adequação ao trânsito — CAT',
    text: 'Ensaios de segurança por sistema e dossiê. Os ensaios podem começar antes; o protocolo usa a LCVM.',
    who: 'SENATRAN · ITL quando cabível',
    where: 'SISCAT',
    output: 'CAT + código no RENAVAM',
    next: 'Recebe os certificados dos fornecedores e libera a produção.',
    laws: '#contran',
    flow: '#flow?stage=cat',
  },
  {
    id: 'producao',
    step: '3',
    label: 'Produção',
    title: 'Conformidade da produção',
    text: 'Cada veículo produzido continua igual ao aprovado: COP, ACP do IBAMA, IUMPR e controles em uso.',
    who: 'Sua qualidade · IBAMA (ACP)',
    where: 'Linha, auditorias e relatórios',
    output: 'Produção conforme o aprovado',
    next: 'Mudou o produto? Volte à etapa 1 ou 2, conforme o que mudou.',
    laws: '#flow?stage=cop',
    flow: '#flow?stage=cop',
  },
];
const HOME_PARALLEL = [
  {
    owner: 'Sua responsabilidade',
    tone: 'own',
    items: [
      ['PBEV · etiqueta ENCE do veículo', 'Usa o consumo medido na etapa 1.', '#inmetro?record=inmetro-169-2023'],
      ['VIN, ETA e etiquetas', 'Definidos com o código da etapa 2.', '#markings'],
      ['MOVER', 'Compromissos e relatórios do programa.', '#mover'],
    ],
  },
  {
    owner: 'Do fornecedor — você confere o certificado',
    tone: 'supplier',
    items: [
      ['Componentes · Inmetro', 'Pneus, rodas, vidros, fluido de freio…', '#inmetro'],
      ['Rádio e conectividade · Anatel', 'Multimídia, TPMS, chave RF, módulo celular.', '#anatel'],
    ],
  },
];
function renderHome() {
  const stages = HOME_STAGES.map(
    (s) =>
      `<li class="home-stage home-stage-${s.id}"><div class="home-stage-top"><span class="home-step" aria-hidden="true">${s.step}</span><span class="home-stage-label">Etapa ${s.step} · ${esc(s.label)}</span></div><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p><dl><dt>Quem</dt><dd>${esc(s.who)}</dd><dt>Onde</dt><dd>${esc(s.where)}</dd><dt>Resultado</dt><dd><strong>${esc(s.output)}</strong></dd></dl><p class="home-next">${esc(s.next)}</p><div class="home-actions"><a class="btn primary" href="${esc(s.laws)}">Ver normas</a><a class="btn" href="${esc(s.flow)}">Ver no fluxo</a></div></li>`,
  ).join('');
  const parallel = HOME_PARALLEL.map(
    (group) =>
      `<section class="home-lane home-lane-${group.tone}"><h3>${esc(group.owner)}</h3><ul>${group.items.map(([title, text, href]) => `<li><a href="${esc(href)}"><strong>${esc(title)}</strong><span>${esc(text)}</span></a></li>`).join('')}</ul></section>`,
  ).join('');
  $('#main').innerHTML =
    `<div class="simple-page home-page"><header class="simple-head"><p class="simple-eyebrow">Homologação no Brasil</p><h1 class="simple-title">Três etapas, uma de cada vez.</h1><p class="simple-lead">Ambiental, trânsito e produção seguem em sequência. Componentes e etiquetas correm em paralelo, cada um com seu responsável.</p><form class="home-search" id="homeSearch" role="search"><label for="homeSearchInput" class="sr-only">Buscar norma</label><input id="homeSearchInput" type="search" placeholder="Buscar norma, número ou assunto" autocomplete="off"><button class="btn" type="submit">Buscar</button><a class="btn primary" href="#ia">Perguntar à IA</a></form></header><ol class="home-stages">${stages}</ol><h2 class="home-section-title">Em paralelo</h2><div class="home-lanes">${parallel}</div><h2 class="home-section-title">Outras formas de consultar</h2><div class="home-tools"><a href="#vehicle"><strong>Pelo veículo 3D</strong><span>Clique numa peça e veja as normas.</span></a><a href="#flow"><strong>Mapa completo do fluxo</strong><span>Todas as etapas e atividades, com zoom.</span></a><a href="#guide"><strong>Meu projeto</strong><span>Perfil do veículo e checklist salvo no navegador.</span></a><a href="#knowledge"><strong>Base regulatória</strong><span>Fichas em Markdown, fontes e PDFs.</span></a></div><p class="simple-note">A ordem mostrada é a ordem de trabalho. Exigências, vigência e aplicação ao seu veículo precisam ser confirmadas nos atos oficiais de cada etapa.</p></div>`;
  $('#homeSearch').onsubmit = (event) => {
    event.preventDefault();
    const q = $('#homeSearchInput').value.trim();
    location.hash = q ? 'library?' + new URLSearchParams({ q }) : 'library';
  };
}
