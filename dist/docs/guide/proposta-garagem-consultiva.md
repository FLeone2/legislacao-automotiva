# Proposta de navegação: garagem consultiva

**Estado: proposta para avaliação, ainda não publicada.** As imagens e o protótipo
de apresentação são artefatos de estudo; este documento não afirma que o novo
frontend está implementado. A validação própria do modelo 3D verifica encaixe,
seleção e preservação dos vínculos; não representa aprovação legal do conjunto.

## Objetivo

Facilitar a consulta de legislação e a organização de um processo de homologação.
O veículo 3D continua como ponto de partida. A referência aos menus de jogos está
na orientação contínua: localizar, selecionar, entender e continuar. A aparência
permanece sóbria, com hierarquia, espaço e tipografia de sistema inspirados nas
referências Apple já estudadas.

## Problemas identificados na organização atual

- A navegação global e as cinco abas do Guia repetem Explorador e Fluxo, exigindo
  que a pessoa compreenda duas organizações para tarefas semelhantes.
- A Base regulatória mostra contagens e explicações extensas antes da busca.
- A Biblioteca apresenta vários filtros simultâneos, mesmo para consultas simples.
- As fichas repetem muitos metadados antes de explicar o vínculo com o assunto.
- A consulta assistida possui acesso permanente, embora não haja IA conectada.

São observações da estrutura e do conteúdo. Não constituem uma auditoria completa
de acessibilidade ou uma medição de desempenho.

## Decisões da proposta

Quatro entradas persistentes: **Explorar veículo, Meu processo, Consultar normas e
Fontes**. O cabeçalho mostra consulta livre ou o processo realmente selecionado.
A ação principal de cada tela indica o próximo passo; voltar conserva o contexto.

O explorador reúne carro 3D, árvore sincronizada e painel da seleção. As abas do
painel apresentam conjuntos, referências e condições registradas. O modo montado
é a entrada; a explosão é acionada pela pessoa. A referência histórica 2D continua
disponível com identificação própria.

Consultar normas começa por três caminhos: veículo, assunto ou órgão. A busca
aparece antes das contagens. Assunto e órgão são filtros rápidos; outros critérios
ficam em “Mais filtros”. A lista permanece visível quando a norma abre em painel
de detalhe, com resumo, condições, alterações, revisão e fonte oficial.

Meu processo reúne perfil, fluxo, checklist e evidências. O fluxo ocupa uma única
área, acessível tanto pelo Guia quanto pela rota antiga de Homologação. A consulta
livre permanece disponível; com processo ativo, o fluxo usa seu perfil técnico
real. “Concluído” descreve organização do trabalho, sem aprovação jurídica.

Fontes reúne cobertura, revisões, base Markdown e histórico. Downloads e hashes
ficam próximos à ficha correspondente, sem ocupar a entrada de uma consulta comum.
O acesso à consulta assistida informa sua disponibilidade real.

## Referência e aplicação são decisões diferentes

Selecionar uma peça revela os vínculos cadastrados para consulta. Isso não torna
todas as referências obrigatórias para o veículo. Aplicabilidade exige conferir
categoria, configuração, datas, condições e exceções no dispositivo pertinente.

Cada ficha distingue publicação no acervo, indicação jurídica, profundidade de
revisão e aplicação ao caso. Uma orientação de serviço não se transforma em ato
normativo. Candidatos, exclusões editoriais e pendências continuam identificados;
uma ausência no resultado não comprova dispensa.

A ação “Registrar referência” deve ser explícita e preservar fonte, dispositivo,
data e revisão disponíveis. Alterar a seleção ou o filtro não muda evidências,
status de checklist ou perfil técnico. Relações visuais não criam relações legais.

Os conteúdos LP/LC, Infoserv e SISCAT exigem a conferência específica das fontes
oficiais antes de qualquer nova afirmação jurídica. A proposta visual não resolve
essas distinções por inferência.

## Mapa de rotas e imagens

As 14 rotas de conteúdo existentes permanecem destinos compatíveis. A numeração
abaixo organiza as 22 imagens desktop da proposta; não define novas URLs públicas.
O alias `#ai` continua levando à Biblioteca.

| Rota atual | Telas da proposta | Destino e continuidade |
| --- | --- | --- |
| `#guide` | 01 Início; 02 Explorador; 03 Fluxo; 04 Checklist; 05 Fontes; 06 Cobertura; 07 Perfil | Entrada do processo; abas antigas apontam para as mesmas tarefas no novo espaço. |
| `#vehicle` | 02 Explorador 3D | Um único explorador, compartilhado com o processo quando houver perfil real. |
| `#flow` | 03 Fluxo de homologação | Mesma área do fluxo do Guia, eliminando a duplicação de navegação. |
| `#library` | 08 Biblioteca; 09 Norma; 10 Busca | Consulta e detalhe com contexto preservado. |
| `#knowledge` | 11 Base regulatória | Fichas, Markdown, natureza da fonte e proveniência. |
| `#tree` | 12 Árvore de sistemas | Alternativa textual estruturada, ligada à mesma consulta. |
| `#mover` | 13 MDIC e MOVER | Consulta especializada, sem converter habilitação em obrigação de produto. |
| `#updates` | 14 Atualizações das fontes | Observação técnica das fontes separada da revisão jurídica. |
| `#contran` | 15 CONTRAN e SENATRAN; 22 SISCAT | Atos, requisitos e orientação de serviço com escopos distintos. |
| `#proconve` | 16 IBAMA e PROCONVE; 21 Infoserv | Consulta por enquadramento e orientação do canal oficial. |
| `#inmetro` | 17 Inmetro | Componentes, conformidade e eficiência, com limites de revisão. |
| `#anatel` | 18 Anatel | Equipamentos e telecomunicações, com escopo próprio. |
| `#markings` | 19 Identificações e marcações | VIN, etiquetas e selos separados por finalidade. |
| `#history` | 20 Histórico das referências | Referência histórica claramente fora da consulta atual. |

Os estados **07 Perfil**, **09 Norma** e **10 Busca** integram essas áreas.
As telas **21 Infoserv** e **22 SISCAT** apresentam separadamente os procedimentos
acessados pelas consultas por órgão. Três imagens mobile completam o conjunto:
**23 Explorador**, **24 Biblioteca** e **25 Checklist**.

Numa implementação futura, um adaptador de rotas conservará parâmetros como
`project`, `tab`, `part`, `subsystem`, `tree`, `stage`, `record`, `guide`, filtros e
paginação. Os links antigos chegarão à tarefa equivalente, sem apagar parâmetros
ou modificar dados locais. `#vehicle?view=reference` conservará os contornos 2D.
O histórico do navegador deverá restaurar seleção, filtros e retorno ao documento.

## Construção visual e interação

- Fonte de sistema e medida de leitura confortável. Como objetivo da implementação
  definitiva: títulos de 36–40 px no desktop e 28–32 px no celular; corpo de 16 px
  com entrelinha 1,5; metadados de 13–14 px. Esses valores não descrevem cada
  elemento do protótipo visual, que também utiliza corpo de 15 px.
- Ritmo de 8, 12, 16, 24, 32 e 48 px; agrupamento por proximidade e divisórias
  discretas. Painéis apenas quando separam tarefas ou contextos.
- Branco e grafite como base; azul para ação. Alertas trazem texto e significado
  explícitos. Cores de seleção não indicam conformidade.
- Desktop com navegação lateral, conteúdo flexível e detalhe contextual; celular
  com carro primeiro, árvore expansível e detalhe acessível por toque.
- Alvos de 44 px, teclado, foco visível e alternativa textual ao 3D. Transições
  curtas e interrompíveis; preferências de movimento e contraste respeitadas.

## Referências e verificação

Foram lidas as referências fixadas de **frontend-design**, **apple-design**,
**Impeccable 4.7.1** e **webapp-testing** listadas, com origem e licença, em
[Frontend consultivo e referências de design](frontend-apple-e-skills.md#skills-verificadas).
O launcher Impeccable não está disponível: o contexto foi lido diretamente em
`PRODUCT.md`, `DESIGN.md` e no código. Anatomy não está instalado neste ambiente.

As imagens permitem avaliar composição e leitura. A implementação futura exigirá
testes de navegação, retorno, seleção sincronizada, dados preservados, teclado,
mobile, estados vazios/erro e acessibilidade, além das verificações do repositório.
Uma imagem ou proposta de design não certifica o acervo nem a homologação.
