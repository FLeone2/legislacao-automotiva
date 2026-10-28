# Legislação Automotiva

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Portal consultivo e informativo para agregar referências de legislação automotiva
brasileira e direcionar às fontes pertinentes. A pessoa pode partir do desenho do
veículo, de uma etapa da homologação, da biblioteca ou da Base regulatória. O
ambiente de projeto organiza perfis e checklists condicionais sem certificar a
aplicabilidade final de uma norma a um veículo concreto.

## Capabilities and Constraints

- Aplicação estática em HTML, CSS e JavaScript clássico, com geração determinística
  por Python. Repositório oficial: FLeone2/legislacao-automotiva; Cloudflare Pages
  publica somente `dist`.
- Consulta principal 3D em `#vehicle`, reutilizando a cena aprovada do Guia, com
  33 subsistemas, 21 conjuntos e seleção textual. O desenho fornecido, seus 37
  contornos e coordenadas permanecem em `#vehicle?view=reference`. Árvores
  expansíveis, zoom, retorno e URLs compartilháveis conservam seus papéis.
- Fluxo conceitual com frentes paralelas, atividades, atos e requisitos reais;
  recortes por propulsão preservam diferenças entre combustão, HEV, PHEV e BEV.
- Biblioteca, consultas por órgão/fase, filtros, paginação, CSV/JSON, fontes e
  histórico usam o mesmo acervo canônico publicado.
- Publicação, indicação jurídica, profundidade da revisão e aplicabilidade são
  independentes. As exclusões editoriais e as lacunas documentais permanecem.
- Guia de projeto com 3D Three.js, árvore sincronizada, fluxo React Flow e checklist
  local com notas, evidências e backup. O perfil orienta a triagem, sem homologação automática.
- A barra de contexto acompanha o processo selecionado no Guia entre consultas,
  sem alterar seu perfil ou evidências nem converter um perfil visual em técnico.
- A Base regulatória (`#knowledge`) apresenta 294 fichas de atos, 40 fontes e dois
  candidatos separados, com busca, qualificações, Markdown e proveniência. O
  build gera índices JSON/JSONL e permite uma cópia SQLite FTS5 local opcional.
- Monitoramento diário de fontes registra observações para revisão humana;
  alterações técnicas não promovem automaticamente candidatos ou conclusões legais.
- Não há API remota da base, PostgreSQL ou assistente de IA conectado; a interface
  informa a disponibilidade real.

## Brand Commitments

O responsável aprovou o Obsidian do pacote
`Codex_Obsidian_Implementacao_Publicacao.zip`. O HTML executável, seis capturas,
vídeo e manifesto fornecidos documentam a composição original. O
Figma anterior e a primeira proposta clara não são a referência. O responsável
pediu expressamente preservar as expansões em árvore.

O refinamento minimalista iniciado no `#guide`, inspirado no design Apple,
agora se estende a todas as áreas do portal: fonte de sistema, hierarquia clara,
ações azuis, superfícies planas e miniaturas derivadas das malhas 3D aprovadas.
Essa evolução conserva temas, acessibilidade, árvores e consultas legadas. As
referências estão em `docs/guide/frontend-apple-e-skills.md`; a direção atual e
seus limites estão em `docs/guide/design-portal-unificado.md`.

## Evidence on Hand

Ativos vetoriais, previews, relações canônicas e qualificações regulatórias já
versionados. O pacote aprovado foi conferido pelos dez hashes do manifesto e
permanece fora do artefato publicado. As normas técnicas privadas e os métodos
de ensaio ausentes não devem ser inventados.

## Accessibility & Inclusion

Teclado, foco visível, alternativa textual ao desenho, contraste, toque, redução
de movimento/transparência e acesso ao conteúdo completo em telas pequenas.
