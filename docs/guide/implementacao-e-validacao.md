# Entrega do ambiente de homologação

## Escopo implementado

Entrada `/#guide`, com seleção 3D real e alternativa textual, inspector de referências do acervo, fluxo React Flow, perfil técnico, checklist adaptativo e guias por órgão. Os modelos 3D são esquemáticos, não CAD dimensional. A matriz de segurança tem dez frentes condicionais por categoria/uso e não pretende esgotar relatórios para qualquer configuração.

A base contém 294 atos canônicos já publicados, 393 aliases e 25 fontes da pesquisa dirigida. Sete relações por identidade/URL explícita conectam fontes aos atos; não há correspondência automática por palavras do título. As novas fontes permanecem distintas de atos promovidos à consulta ativa.

Os processos e as referências a evidências são locais. Não há backend, compartilhamento automático, upload de laudos, IA conectada ou protocolo no Infoserv/SISCAT. O backup JSON transfere um processo entre navegadores; o Markdown fornece o roteiro legível. Importações incompletas não recebem valores técnicos de exemplo. Um histórico de perfil e as notas permanecem após revalidação, sem status concluído reaproveitado.

## Arquitetura

O portal clássico e seus desenhos foram preservados. A ilha React, React Flow e Three.js é empacotada com esbuild em `assets/guide` e carrega sob demanda por `src/guide/bridge.js`. CSS usa o sistema Obsidian existente, foco visível e alternativas de movimento reduzido. Dependências e licenças acompanham o artefato; não depende de CDN.

O build Python mantém a lista de publicação e acrescenta os guias e os dados estruturados do processo. `dist` continua o único artefato do Cloudflare Pages. Nenhuma credencial ou política de exclusão foi alterada.

## Validação executada em 25/10/2026

- `npm run build:data`: geração dos dados existentes; banco adicional conferido com `python scripts/build_guide_database.py --check`.
- `npm run check`: contratos, sintaxe, orçamento de dados e derivados das imagens originais.
- `npm test`: 76 testes JavaScript e todas as suítes Python, incluindo seis testes do banco normativo. Sem falhas.
- `npm run format:check`: JavaScript/JSX/MJS/CSS/HTML e Python.
- `npm run test:browser`: suítes anteriores passaram; a nova `tests/guide-browser.py` foi executada separadamente após os ajustes finais e também passou. A descoberta por padrão a inclui nas próximas execuções e na CI.
- `npm run test:a11y`: verificações do portal anterior sem violações; a nova suíte do guia verifica os quatro painéis, em computador/celular e claro/escuro, sem violações axe WCAG A/AA.
- `npm run test:visual`: todas as cinco referências preservadas dentro da tolerância; nenhuma baseline foi alterada.
- `npm run build` e `tests/publication.test.py`: artefato determinístico, URLs por conteúdo e fronteira de publicação conferidos.

O navegador verificou seleção por raycast e árvore, explosão, navegação por teclado, diagrama/lista, criação, notas, evidência, justificativa de não aplicável, reload, importação/exportação, mudança de perfil, preservação das rotas antigas, celular sem overflow e armazenamento bloqueado. Os resultados locais ficam em `tests/artifacts/guide` (ignorados pelo Git).

## Limites de pesquisa e de entrega

O acervo não foi convertido em consolidação jurídica integral. Permanecem os limites das fontes Inmetro, métodos privados não consultados e cadeias de alteração não integralmente revistas. O índice e o checklist nunca transformam uma lacuna em dispensa. Fontes oficiais autenticadas e procedimentos dos sistemas devem ser conferidos na operação concreta.

A entrega deve permanecer em branch/PR para revisão; o AGENTS.md determina não fazer merge automático e manter o alvo de publicação existente. Uma aprovação de CI ou um build local não é evidência de atualização do domínio de produção.
