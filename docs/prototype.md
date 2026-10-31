# Protótipo de consulta e homologação

Abra `/prototipo/` no mesmo domínio do portal. Esta página é uma área isolada para validar a navegação; mantém os projetos do Guia original separados. Os dados locais do protótipo usam a chave `prototype-project-v1`.

## Percurso

Há três abas: **IA**, **Veículo** e **Homologação**, no dock inferior da interface nexo. IA abre por padrão com a caixa de pergunta e o nome do modelo disponível. O modelo 3D só é baixado na primeira visita a Veículo; depois a câmera e o canvas permanecem montados ao trocar as abas. A seleção, a etapa e o perfil acompanham a consulta. A garagem usa fundo preto, luz branca direcionada e superfícies escuras; IA e Homologação usam uma camada fumê, com a cena preservada atrás quando já foi carregada.

Em Veículo, selecione a geometria real do SUV, escolha um conjunto no menu à direita ou busque um componente pelo seletor acessível. As leis aparecem abaixo da cena, com nome, descrição e documento. A explosão desloca os meshes reais nos eixos do veículo, preservando a direção de montagem. Todo o curso de Separação amplia a abertura, mesmo sem seleção; o trecho final também detalha o conjunto escolhido. Os afastamentos consideram os limites geométricos dos conjuntos, com folgas entre portas e rodas, capô e motor, e os conjuntos sob o assoalho. Portas abrem para os respectivos lados, suspensão e bateria separam-se para baixo, e o motor se afasta pela frente do cofre. Os deslocamentos não se reorganizam ao girar a câmera. Quatro posições de rodagem são preservadas; foco, rotação e isolamento permitem examinar oclusões naturais da perspectiva.

Homologação organiza 19 etapas em sete fases. Cada etapa conserva entradas, ações, preparação, ensaios, resultados, documentos, encaminhamento e dependências, acessíveis em “Procedimento da etapa”. O perfil começa vazio: LP/LC não é deduzido de M1/N1 nem do SUV ilustrativo. Os filtros indicam compatibilidade preliminar com as condições estruturadas; não certificam incidência jurídica. Segurança pode avançar em paralelo à frente ambiental. A árvore sob a etapa começa no centro e expande para os dois lados, conservando os ancestrais e o zoom. Permite percorrer ensaio → ato → norma técnica e referência internacional. Oferece também lista, pan, zoom, foco e navegação por teclado.

O detalhamento ambiental de ensaios é voltado aos leves. Pesados recebem encaminhamento P8/LCVM; motociclos e similares, PROMOT/LCM. Nas etapas administrativas esses perfis mostram o serviço próprio e a pendência de detalhamento, sem herdar o pacote L8 ou indicar dispensa.

O modelo tem quatro posições de rodas. A carroceria de referência é o BMW X5 G05 licenciado por BMW Car IT sob CC BY 4.0. Subconjuntos híbridos e mecânicos são exemplos didáticos, não CAD interno do fabricante. Explosão e corte são recursos de consulta, sem validação de engenharia ou simulação de ensaios. Consulte `prototype-models.md` para autoria, hashes e validações de encaixe.

## Dados e documentos

`node scripts/build-prototype-data.cjs` gera `data/prototype/catalog.json` das fontes canônicas e dos vínculos existentes. O catálogo contém 294 atos, 21 conjuntos e 33 áreas do modelo (30 subsistemas da prancha e três complementares). Não certifica cobertura integral. Metadados independentes de publicação, indicação jurídica, revisão e aplicabilidade são preservados; fichas integrais do acervo continuam nos caminhos originais de JSON/Markdown publicados.

Filhos geométricos não recebem associações jurídicas próprias por herança. A interface rotula as referências do conjunto de origem e separa componentes de contexto do veículo. Métodos privados e lacunas de revisão permanecem pendentes.

O banco documental tem **23 documentos oficiais, 13 PDFs e 10 textos HTML**, referentes a 21 atos canônicos e um manual histórico. A Portaria 990 tem original e republicação separados. Os textos integrais extraídos estão em `knowledge/prototype/`; 1.320 trechos servem à recuperação no servidor. O manual de 2011 e a variante original de 990 ficam fora da recuperação automática corrente. Há PDFs verificados para 11 atos da coleção; os demais botões abrem a fonte oficial. Ficha em Markdown e texto integral extraído são links distintos. Detalhes, hashes, limites e atualização estão em [prototype-pdf-bank.md](prototype-pdf-bank.md).

`data/prototype/workflow-emissions.json` e `workflow-safety.json` são as entradas editoriais do roteiro. `scripts/build-prototype-workflow.cjs` gera sua projeção consultiva, preservando dispositivos, fontes e lacunas. Os níveis de controle 1/2/3 da Portaria 990 não são fases cronológicas nem níveis de desempenho MOVER. Referências estrangeiras não implicam equivalência ou reutilização automática de laudos. As justificativas estão nos documentos `prototype-workflow-emissions.md` e `prototype-workflow-safety.md`.

## Assistente

`POST /api/prototype-ask` aceita pergunta, IDs de seleção e perfil; não confia em trechos normativos enviados pelo navegador. Recupera evidências da base versionada no servidor, incluindo as novas etapas e trechos dos documentos públicos. Extração automática continua identificada como não revisada/não consolidada; não promove estado jurídico. O roteiro de trabalho é contexto de planejamento, distinto do texto legal. Usa o binding Workers AI existente e `PROTOTYPE_AI_MODEL`, limita a espera e valida os IDs citados. Não adiciona provedor pago nem chave ao cliente.

Consultas de níveis 1/2/3 preservam o numeral, deduplicam a identidade documental e consultam os controles de relatório estruturados. A recuperação busca o cabeçalho e a continuação dos quadros do Anexo XI, em vez de escolher uma página isolada por correspondência genérica. Respostas aceitam listas em blocos curtos, com fontes verificadas; o contexto e o tempo de espera continuam limitados. A consulta não pesquisa a internet em tempo real e não fornece fórmulas de atos cuja íntegra ainda não foi indexada.

Sem binding, cota, resposta válida ou disponibilidade, a consulta continua com fontes relacionadas e informa que aquela resposta não foi gerada por IA. A checagem de IDs não valida semanticamente toda afirmação do modelo. O assistente é consultivo e exige conferência das condições no texto oficial.

## Serviços oficiais

As páginas públicas de LCVM, LCM e CAT e as telas públicas de login do Infoserv 2 e SISCAT foram consultadas em 31/10/2026. Não há autenticação, protocolo ou integração com os órgãos. O mapa é um roteiro consultivo. Campos e anexos internos dependem da conferência de telas autenticadas que o usuário fornecerá.

## Construção e verificação

- `npm ci` e `npm run build`: geram os bundles e o `dist` allowlisted, com URLs de assets versionadas pelo conteúdo.
- `node scripts/build-prototype-data.cjs --check`: confere a reprodução do catálogo.
- `node scripts/build-prototype-workflow.cjs --check` e `python scripts/prototype_knowledge_build.py --check`: conferem roteiro e banco documental.
- `node --test tests/prototype-*.test.cjs`: verifica vínculos e consulta de fontes, citações, indisponibilidade e contexto.
- `python tests/prototype-browser.py`: percorre as três abas, carregamento adiado do 3D, seleção por raycast, quatro rodas, câmera persistente, espaçamento, PDFs/Markdown, perfis diesel/PHEV/BEV, etapas, árvore por teclado e telas de 390/320 px. Inclui axe em oito telas.

O protótipo permanece em branch de revisão. Não mesclar automaticamente na main.
