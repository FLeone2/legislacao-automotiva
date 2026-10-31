# Protótipo de consulta 3D

Abra `/prototipo/` no mesmo domínio do portal. Esta página é uma área isolada para validar a navegação; mantém os projetos do Guia original separados. Os dados locais do protótipo usam a chave `prototype-project-v1`.

## Percurso

Selecione a geometria real do SUV, consulte nome e descrição das referências, abra o documento oficial em outra aba e retorne à mesma seleção. Veículo, árvore, mapa e assistente compartilham a seleção. A árvore expande conjuntos, subsistemas e peças; as etapas relacionadas se destacam no mapa. A câmera e o canvas permanecem montados ao trocar as abas.

O modelo tem quatro posições de rodas. A carroceria de referência é o BMW X5 G05 licenciado por BMW Car IT sob CC BY 4.0. Subconjuntos híbridos e mecânicos são exemplos didáticos, não CAD interno do fabricante. Explosão e corte são recursos de consulta, sem validação de engenharia ou simulação de ensaios. Consulte `prototype-models.md` para autoria, hashes e validações de encaixe.

## Dados e documentos

`node scripts/build-prototype-data.cjs` gera `data/prototype/catalog.json` das fontes canônicas e dos vínculos existentes. O catálogo contém 294 atos, 21 conjuntos e 33 áreas do modelo (30 subsistemas da prancha e três complementares). Não certifica cobertura integral. Metadados independentes de publicação, indicação jurídica, revisão e aplicabilidade são preservados; fichas integrais do acervo continuam nos caminhos originais de JSON/Markdown publicados.

Filhos geométricos não recebem associações jurídicas próprias por herança. A interface rotula as referências do conjunto de origem e separa componentes de contexto do veículo. Métodos privados e lacunas de revisão permanecem pendentes.

`data/prototype/pdf-review.json` documenta seis arquivos oficiais conferidos, relativos a cinco atos: Portaria SENATRAN 990/2022, Resoluções CONTRAN 915/2022 e 954/2022, CONAMA 490/2018 e 492/2018. Original e republicação de 990 ficam separados. O acesso/hash não altera a revisão jurídica. Para os demais atos, o botão leva à fonte oficial e não promete um PDF. `python scripts/fetch-prototype-pdfs.py` permite refazer a recuperação de forma auditável. Não se reproduzem normas ABNT privadas.

## Assistente

`POST /api/prototype-ask` aceita pergunta, IDs de seleção e perfil; não confia em trechos normativos enviados pelo navegador. Recupera evidências da base versionada no servidor, usa o binding Workers AI existente, limita a espera e valida os IDs citados. Não adiciona provedor pago nem chave ao cliente.

Sem binding, cota, resposta válida ou disponibilidade, a consulta continua com fontes relacionadas e informa que aquela resposta não foi gerada por IA. A checagem de IDs não valida semanticamente toda afirmação do modelo. O assistente é consultivo e exige conferência das condições no texto oficial.

## Serviços oficiais

As páginas públicas de LCVM, LCM e CAT e as telas públicas de login do Infoserv 2 e SISCAT foram consultadas em 31/10/2026. Não há autenticação, protocolo ou integração com os órgãos. O mapa é um roteiro consultivo. Campos e anexos internos dependem da conferência de telas autenticadas que o usuário fornecerá.

## Construção e verificação

- `npm ci` e `npm run build`: geram os bundles e o `dist` allowlisted, com URLs de assets versionadas pelo conteúdo.
- `node scripts/build-prototype-data.cjs --check`: confere a reprodução do catálogo.
- `node --test tests/prototype-*.test.cjs`: verifica vínculos e consulta de fontes, citações, indisponibilidade e contexto.
- `python tests/prototype-browser.py`: percorre seleção por raycast, quatro rodas, câmera persistente, PDFs, árvore, mapa, assistente e telas de 390/320 px.

O protótipo permanece em branch de revisão. Não mesclar automaticamente na main.
