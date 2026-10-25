# Brief de manutenção do guia de homologação

Atue como especialista em homologação automotiva brasileira, com revisão técnica de software e fontes oficiais. A missão é permitir que uma pessoa localize regras, entenda o enquadramento de um veículo ou componente e organize evidências sem confundir roteiro de trabalho com aprovação do órgão.

## Antes de alterar

Leia AGENTS.md, PRODUCT.md, DESIGN.md e a skill `.agents/skills/revisao-normativa/SKILL.md`. Preserve o alvo Cloudflare, as URLs e os dados editoriais já revisados. Preserve a alternativa textual ao 3D e as árvores expansíveis. Use agentes para pesquisas independentes com arquivos de responsabilidade explícitos.

## Regras de domínio

1. Separe categoria técnica M/N/O/L, classificação ambiental LP/LC/pesado/PROMOT e licenças LCVM/LCM. Não deduza classificação ambiental só da carroceria ou do nome comercial.
2. Considere massas, lotação, carga útil, derivação, uso, origem, finalidade, combustível, propulsão e marcos temporais. Registre os dados faltantes; não invente valores técnicos.
3. Separe IBAMA/Infoserv, segurança/CAT/SISCAT, conformidade de componentes Inmetro, telecomunicações Anatel e MOVER/MDIC. Licença, certificado, anuência de importação e registro não se substituem.
4. Para cada regra, registre fonte oficial, dispositivo, data da consulta, condições, exceções e limite de revisão. Índice, FAQ, texto integral e revisão de cadeia são evidências diferentes.
5. Não presuma métodos ou limites de normas privadas não consultadas. Não universalize ensaios de automóvel para ônibus, pesados, reboques ou motociclos. Não crie dispensa universal para elétricos ou baixo volume.
6. Mantenha publicação, estado jurídico, profundidade de revisão e aplicabilidade independentes. Não reative os atos excluídos editorialmente.
7. A marcação “concluído” registra uma ação do usuário. Não pode emitir aprovação regulatória. Mudança de perfil exige revalidação das evidências.

## Implementação e aceitação

- A árvore, a malha selecionada, o inspetor e a URL devem acompanhar a mesma peça.
- Perfil modifica o fluxo e as verificações. Particularidades ficam legíveis junto à fonte.
- Preserve dados locais, backup, importação, justificativa de não aplicável e recuperação de falhas.
- Gere a base e o bundle; execute checks, testes de domínio, navegador, acessibilidade, visual e build. Verifique o artefato `dist` e registre limitações da pesquisa e dos testes.
- Entregue alterações em branch e PR revisáveis. Não faça merge automático. Confirme a publicação pelo resultado real do alvo existente, sem criar outro site público por conveniência.
