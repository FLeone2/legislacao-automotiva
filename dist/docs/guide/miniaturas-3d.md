# Miniaturas reais dos conjuntos 3D

O painel **Referências** apresenta renderizações das malhas dos modelos 3D atuais.
São 26 imagens WebP de 1024 × 768 pixels, reutilizadas por 21 conjuntos e 33
subsistemas com a mesma seleção explícita. A imagem histórica em 2D permanece no
disclosure **Referência histórica 2D**. Nenhuma lei, associação ou regra de
aplicabilidade é alterada por esta apresentação.

## Geração e conferência

Na raiz do projeto, com as dependências de desenvolvimento e o Chromium do
Playwright instalados:

```sh
python scripts/capture_model_thumbnails.py
python scripts/capture_model_thumbnails.py --check
python tests/model-thumbnails.test.py
```

Para rever um enquadramento sem substituir o manifesto publicado:

```sh
python scripts/capture_model_thumbnails.py --only brakes engine chassis batteryHV--engine--motorElectric --output /tmp/model-thumbnail-review
```

O script inicia um servidor temporário, compila um estúdio de exportação isolado,
carrega os GLBs através de `reference-suv.js` e renderiza as malhas reais em WebGL.
Não usa geração de imagens. A captura de 2048 × 1536 recebe redução Lanczos para
1024 × 768 e codificação WebP com transparência. Câmera, iluminação e seleção são
fixas; IDs, ordenação e mapeamento são determinísticos. Variações de GPU, navegador
ou codificador podem mudar os bytes de uma nova renderização. Por isso o
manifesto identifica a versão do Chromium e os hashes dos arquivos efetivamente
entregues; `--check` confere o snapshot sem abrir o navegador.

O estúdio não importa `VehicleScene.jsx`, não modifica a geometria ou os materiais
do GLB em disco e não altera o renderizador interativo. As translações utilizadas
para compor conjuntos independentes ficam somente na exportação. Elas não
representam instalação física homologada ou escala de projeto.

## Contrato dos arquivos

- `assets/models/suv/thumbnails/index.json`: índice leve consumido pela interface,
  com seleções de conjuntos e subsistemas, imagens, dimensões, hashes e limites.
- `assets/models/suv/thumbnails/provenance.json`: fontes dos modelos, créditos,
  adaptações, hashes das entradas, hash do índice e registro de cada imagem.
- `scripts/model-thumbnail-harness.js`: enquadramento, seleção de exemplares e
  iluminação usados exclusivamente na exportação.
- `src/guide/model-thumbnails.js`: resolução da seleção para a imagem. Recusa
  mapeamentos incompatíveis e categorias cujo modelo não seja o SUV.

Cada imagem registra `assemblyIds` da seleção, `selectedMeshIds`, os metadados
originais de cada malha, sua função (`selection` ou `context`),
`contextAssemblyIds`, deslocamentos de apresentação, câmera e limites. Os hashes
incluem os GLBs, suas fichas de origem, o carregador, os mapeamentos, as funções
de disposição e os scripts de exportação. O manifesto não inclui o renderizador
interativo, que não participa desta captura.

A interface só resolve a imagem quando os conjuntos explícitos do subsistema
coincidem integralmente com os conjuntos de seleção da imagem. Malhas de contexto
não ampliam a seleção nem suas referências jurídicas. As miniaturas são do SUV:
ao selecionar outro tipo de veículo, a interface informa que a miniatura daquele
modelo ainda não foi exportada.

## Enquadramentos e limites importantes

- **Freios:** exemplar dianteiro do modelo BMW. O cubo e os parafusos reais da
  roda aparecem como contexto registrado separadamente. A proteção traseira foi
  omitida para expor a face do disco e o material clonado do disco usa
  `flatShading` somente no estúdio. ABS e ESC não são peças individuais da imagem.
- **Fluido de freio:** usa a geometria didática de reservatório, cilindro mestre
  e circuito, sem reutilizar a imagem do disco. Não representa composição ou
  especificação do fluido.
- **Rodas, portas, retrovisores e faróis:** mostram exemplares das malhas
  existentes, sem reduzir a cobertura de subsistemas da árvore.
- **Suspensão:** exemplar dianteiro do suplemento autoral. A seleção combinada
  de chassi e direção acrescenta a cremalheira didática. Não reproduz a arquitetura
  interna certificada do BMW.
- **Motor e powertrain híbrido:** exemplos mecânicos autorais. No conjunto
  híbrido, motor térmico, motor elétrico e bateria são apresentados juntos, com
  deslocamentos de leitura registrados; não são uma instalação certificada.
- **Bateria de tração:** tampa omitida para mostrar os módulos didáticos.
- **Limpadores, mecanismos das janelas, cintos, ancoragens, OBD e VIN:** quando
  não possuem geometria individual, a legenda informa que a imagem é do conjunto
  relacionado. Não se cria uma peça ausente ou uma certificação pela imagem.

Os testes verificam a existência das malhas no GLB, a seleção dos 33 subsistemas,
a separação entre contexto e seleção, os hashes, os créditos e pixels WebP
decodificáveis. O teste de navegador de subsistemas também compara a miniatura
principal ao manifesto e preserva a conferência dos recortes históricos em 2D.

## Atribuição e adaptações

Os derivados do modelo **BMW X5 G05 2018** conservam os créditos de **BMW Car IT**
e contribuidores do projeto
[bmwcarit/digital-car-3d](https://github.com/bmwcarit/digital-car-3d), sob
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
As miniaturas são adaptações por isolamento de malhas, seleção de exemplares,
enquadramento, iluminação, composição e codificação. O ajuste de material do
disco e o contexto do cubo estão descritos acima e no manifesto. Os créditos e
links também aparecem junto às imagens derivadas no painel.

O suplemento mecânico é uma **ilustração autoral didática do projeto**, baseada
nas pranchas 2D existentes. O manifesto diferencia essa fonte da referência BMW.
Uma imagem que reúne as duas fontes mantém os dois créditos. A aparência de uma
peça, o uso do modelo BMW ou sua seleção não comprovam ensaio, homologação,
conformidade ou aplicabilidade de uma norma.
