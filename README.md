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
  explodida, gerada por IA para esta experiência. As miniaturas de outros sistemas
  usam recortes de exibição SVG dessa mesma imagem.
- `assets/bancos.webp`, `motor.webp`, `tanque.webp`: três ilustrações detalhadas
  originais, geradas por IA, sem marcas ou dados de catálogo de fabricantes.
- `assets/image-provenance.json`: prompts, método e origem dos quatro recursos.
  PNGs originais foram preservados no ambiente de geração; os recursos da aplicação
  foram somente convertidos para WebP com ImageMagick, qualidade 88. O conjunto
  carregado tem aproximadamente 785 KiB, contra cerca de 8 MiB dos originais.
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
Os testes cobrem regiões reais do SVG, zoom/reset, bancos/motor/tanque, documentos
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
