# legislacao-automotiva

Protótipo público de consulta à legislação automotiva, com referências oficiais e ressalvas de validação.

## Navegação do veículo aos fluxogramas

Execute `python -m http.server 8000 --bind 127.0.0.1` e abra
`http://127.0.0.1:8000/#vehicle`.

Clique em um componente no desenho ou no card equivalente. A consulta abre um
fluxograma com os assuntos e referências do componente. Bancos abre Segurança;
motor e tanque oferecem caminhos separados de Segurança e Ambiental. O perfil do
veículo permanece no cabeçalho. As imagens são ilustrativas, sem modelo ou VIN.

- **Bancos:** ancoragem/cintos/apoios de cabeça, materiais e inflamabilidade,
  proteção e retenção. O ramo de espuma mostra a referência de inflamabilidade
  já cadastrada e uma lacuna explícita para normas ABNT NBR ainda não mapeadas.
- **Motor:** conformidade de componentes, emissões, OBD e catalisadores.
- **Tanque:** referência de tanques/alteração de capacidade, emissões
  evaporativas/RVEP e lacuna específica para o circuito do cânister.
- **Demais componentes:** fluxogramas derivados dos vínculos temáticos existentes
  na taxonomia: freios, suspensão, vidros, iluminação, carroceria, retrovisores,
  rodas, elétrica e escapamento.

As conexões organizam assuntos e não representam uma sequência obrigatória de
homologação. O acervo inclui categorias distintas de veículos; perfil visual,
componente e ramo não confirmam aplicabilidade, vigência ou requisitos técnicos.
Nenhuma norma foi inferida de PNCs, de imagens ou do catálogo ASA. Referências
legais existentes não foram substituídas por dados gerados.

Os ramos abrem por clique ou teclado. Selecionar um documento mostra resumo,
rastreabilidade e link para a fonte do acervo. Lacunas não recebem normas de
outros assuntos como preenchimento. A URL guarda componente, ramo, nó e perfil;
histórico, recarregamento e retorno ao veículo funcionam sem perder o contexto.

A imagem geral tem zoom/reset e regiões vetoriais sobre a mesma transformação.
Desenho e cards compartilham os mesmos identificadores. O realce acompanha mouse
e foco de teclado. A transição de tela respeita preferência por movimento
reduzido. O fluxograma tem controles próprios de zoom e enquadramento.

## Arquivos e origem dos recursos

- `catalog.json`: acervo e taxonomia preexistentes, mantidos nesta implementação.
- `vehicle-data.js`: componentes, polígonos e vínculos entre assuntos e registros
  do acervo. Ligações específicas de bancos/motor/tanque citam IDs do catálogo;
  demais ramos usam sua taxonomia existente.
- `vehicle-navigation.js`: desenho interativo, cards, rotas e montagem dos
  fluxogramas por componente.
- `tree.js`: motor de fluxogramas já existente, reaproveitado para a nova consulta.
- `app.js`, `index.html`, `styles.css`: integração e interface responsiva.
- `assets/vehicle-exploded.webp`: ilustração original de um SUV genérico em vista
  explodida, gerada por IA para esta experiência. Os demais sistemas usam suas pranchas próprias, descritas na seção de cobertura.
- `assets/bancos.webp`, `motor.webp`, `tanque.webp`: três ilustrações detalhadas
  originais, geradas por IA, sem marcas ou dados de catálogo de fabricantes.
- `assets/image-provenance.json`: prompts, método e origem dos 16 recursos.
  PNGs originais foram preservados no ambiente de geração; os recursos da aplicação
  foram somente convertidos para WebP com ImageMagick, qualidade 88. As quatro imagens iniciais somavam aproximadamente 785 KiB; a ampliação
  completa e a estratégia de carregamento estão detalhadas na seção de cobertura.
- `vehicle.png`: imagem da versão anterior, mantida para histórico do projeto,
  sem uso na nova visão do veículo. Autoria/licença não documentadas no acervo.

O ASA é referência de interação. Nenhum recurso gráfico, sessão, credencial,
catálogo comercial ou número de peça foi copiado dele. Os desenhos gerados são
conceituais; não são representações de engenharia de um Eclipse Cross nem
instruções para montagem, manutenção ou homologação.

## Testes

```sh
node --test tests/vehicle-model.test.cjs
node --check app.js
node --check tree.js
node --check vehicle-navigation.js
node --check vehicle-data.js
```

Com o servidor local em execução, Python com Playwright instalado e Chromium em
`/usr/bin/chromium`:

```sh
python tests/vehicle-browser.py
```

É possível verificar outra publicação com
`VEHICLE_TEST_URL=https://servidor/caminho/ python tests/vehicle-browser.py`.
Os testes cobrem regiões reais do SVG, limites internos/externos das rodas em
desktop, zoom e celular, zoom/reset, bancos/motor/tanque, documentos
e lacunas, retorno/histórico/URL, teclado, tela de 390 px, ausência de dados e
imagem, além das seis páginas já existentes. Capturas são salvas em
`tests/artifacts/` e não são versionadas.

## Publicação de teste

A versão é uma aplicação estática e funciona no GitHub Pages com a raiz do
repositório como origem. `.nojekyll` evita processamento de arquivos pelo Jekyll.
O código de teste está na branch `feat/navegacao-visual-sistemas` (PR #1).
A ativação automática do Pages foi recusada pelo GitHub com HTTP 403
(`Resource not accessible by integration`); nenhum site foi publicado.
Para ativar pelo GitHub: Settings → Pages → Deploy from a branch →
`feat/navegacao-visual-sistemas` → `/ (root)` → Save. Depois abra a URL
fornecida pelo GitHub com `/#vehicle` ao final.

## Cobertura integral dos sistemas cadastrados

A navegação cobre **11 sistemas físicos e os 30 subsistemas definidos na taxonomia
atual do projeto**, sem subsistema ausente. Essa contagem descreve o acervo atual;
não afirma que uma taxonomia de 30 itens esgote todas as configurações possíveis
de veículos.

| Sistema do acervo | Subsistemas com entrada visual e fluxograma |
| --- | --- |
| Vidros e visibilidade | Vidros e transparência; limpadores e lavadores; acionamento de janelas |
| Pneus e rodas | Pneus e estepe; rodas e requisitos |
| Freios e estabilidade | Frenagem/ABS/componentes; controle de estabilidade; fluido de freio |
| Iluminação e sinalização | Dispositivos e instalação; componentes de iluminação |
| Proteção dos ocupantes | Cintos/ancoragem/apoios; airbags; retenção infantil; materiais do habitáculo |
| Carroceria e proteção externa | Impactos e pedestres; portas/dobradiças/fechaduras; acessórios e proteção externa |
| Retrovisores e visão traseira | Espelhos e visão indireta; monitoramento traseiro |
| Propulsão e emissões | Emissões e ensaios; propulsão elétrica/bateria; combustíveis e eficiência; componentes do motor |
| Eletrônica e comandos | Diagnóstico/OBD; telas e imagens; comandos/sinal sonoro |
| Identificação do veículo | Placas; identificação e marcações; rotulagem e informação |
| Suspensão e direção | Componentes de suspensão e direção |

A visão geral oferece 14 acessos físicos/temáticos (alguns pertencem ao mesmo
sistema do acervo). Todos agora usam arte detalhada própria. Ao abrir um sistema,
a área **Subsistemas** apresenta o desenho com regiões clicáveis e cards textuais.
Selecionar um deles abre seu fluxograma específico, e o endereço guarda
`component`, `subsystem`, `lane`, `node` e o perfil. Voltar ao fluxograma completo
mantém o sistema.

Foram adicionadas **12 pranchas geradas por IA**, totalizando **16 arquivos de
imagem**. As ilustrações dos 30 subsistemas são recortes de exibição SVG das
pranchas correspondentes, com coordenadas explícitas em `subsystemBoards` e
`specialSubsystemArt` de `vehicle-data.js`. Os originais não são recortados nem
alterados: os SVGs recortam somente a exibição. Isso mantém a coerência entre a
vista do sistema e as miniaturas/detalhes dos seus subsistemas. Os prompts e os
caminhos dos PNGs originais estão em `assets/image-provenance.json`.

Os 16 WebPs somam aproximadamente 2,9 MiB; imagens dos cards usam carregamento
sob demanda. A imagem geral permanece uma ilustração genérica de referência, com
entrada auxiliar identificada para a bateria elétrica.

O teste `ComponentFlow.coverage()` exige zero lacunas de navegação. Ele não conta
uma norma não cadastrada como cobertura legal: uma referência ausente permanece
uma lacuna explícita no fluxograma, incluindo NBRs de espuma e o ramo ambiental
de bateria. Não há associação automática de normas de outros temas para preencher
um ramo vazio.

Além das verificações anteriores, execute:

```sh
python tests/subsystem-browser.py
```

Essa suíte percorre os 30 subsistemas, confere cada ilustração e o conjunto exato
de registros esperado, testa cliques reais nas regiões do desenho de subsistemas,
retorno, recarregamento, teclado e layout móvel. As capturas incluem freios em
vista completa e airbags na tela de subsistema.
