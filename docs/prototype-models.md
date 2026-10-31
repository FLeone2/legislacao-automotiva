# Modelos da bancada 3D

O protótipo combina a carroceria SUV de referência já existente com um suplemento mecânico autoral. O suplemento é uma ilustração didática de sistemas híbridos, sem representar a arquitetura interna real do BMW X5 e sem constituir CAD, especificação dimensional ou evidência de homologação.

## Arquivos e atribuição

- `assets/models/suv/bmw-x5.glb`: referência visual de BMW Car IT e colaboradores de `bmwcarit/digital-car-3d`, licença **CC-BY-4.0**. A licença completa e a proveniência original permanecem em `assets/models/suv/LICENSE.txt` e `provenance.json`.
- `assets/prototype/models/mechanical-supplement.glb`: geometria mecânica genérica criada no projeto, derivada dos scripts autorais da revisão `ba37f60338c0565384e7e31f6e8115c4545d06ce`, com módulos e peças selecionáveis acrescentados para este protótipo.
- `assets/prototype/models/mechanical-provenance.json`: hashes SHA-256, tamanho, limites, referências visuais, origem dos scripts e ajustes de instalação.
- `assets/prototype/models/semantic-pieces.json`: inventário dos componentes selecionáveis e seus limites.

O GLB do SUV e o suplemento mecânico global continuam com os mesmos bytes. O SUV contém **quatro pneus de rodagem**. O suplemento não acrescenta rodas nem estepe.

## Contrato geométrico

Os dois arquivos usam a mesma escala visual proporcional, eixo Y para cima e frente em X negativo. O motor já incorpora translação `[0, -0.185, 0]` e o radiador `[0, -0.045, 0]`; o visualizador não deve aplicar esses ajustes novamente.

Cada componente é um grupo com filhos por material. Tanto o grupo quanto seus meshes carregam `partId`, `section`, `pieceId`, `pieceLabel`, `semanticPath` e `parentAssemblyId`. `partId` e `parentAssemblyId` referenciam os conjuntos existentes. `pieceId` é a chave estável de seleção. Os detalhes de fabricação são consolidados apenas dentro da mesma peça, preservando a seleção individual dos dez módulos da bateria, dos quatro conjuntos de suspensão e das peças do motor.

Exemplos: `battery-module-01`, `battery-cooling-plate`, `battery-hv-connectors`, `front-left-spring`, `front-left-damper`, `front-left-knuckle`, `engine-cam-cover` e `engine-ignition-coil-01`.

A seção `engineInternal` contém quatro conjuntos ilustrativos de pistão e biela, um virabrequim e comandos de válvulas. Esses componentes podem ficar ocultos na vista montada e ser revelados para estudo junto com a retirada das peças externas. São componentes estáticos ilustrativos; não simulam um ciclo mecânico.

## Reprodução e validação

Blender 4.3.2 gera o intermediário sem compressão. A ferramenta opcional Node utiliza `@gltf-transform/core`, `extensions` e `functions` 4.5.1 e `draco3dgltf` 1.5.9 em um diretório de autoria separado. Nenhuma dependência adicional é necessária no navegador além do decodificador Draco existente.

```sh
blender --background --python scripts/models/prototype_build_mechanical.py -- --output /tmp/prototipo-bancada-mechanical-export --skip-preview
node scripts/models/prototype_compress_mechanical.mjs /tmp/prototipo-bancada-mechanical-export assets/prototype/models /workspace/suv-studio
python scripts/models/prototype_validate_models.py
node scripts/models/prototype_check_fit.mjs /workspace/suv-studio
```

A validação confere quatro pneus no modelo base, preservação dos arquivos globais, hashes de autoria, campos semânticos em todos os meshes, dez módulos de bateria, peças de suspensão nos quatro cantos, quatro bobinas e seis componentes internos do motor. A compressão Draco preserva a topologia; não há decimação.

## Verificação desta revisão

O suplemento exportado tem **102 componentes semânticos**, **283 meshes por material** e **1.403.808 bytes**. Seu SHA-256 é `867525b78d79da28f8f00591cd92a15b61e4559e33f5645ff3799869922112a9`.

Uma verificação com os GLBs efetivamente decodificados lança raios contra os dois meshes do capô de referência. Foram conferidos 10.114 vértices superiores do motor, com folga visual mínima de `0.030574` na escala da cena. A folga mínima do conjunto de arrefecimento é `0.011944`. Suspensão, bateria auxiliar e eletrônica também passaram pelo limite mínimo de `0.005`. Esses valores confirmam o encaixe visual desta ilustração, sem equivalência a tolerâncias ou dimensões de engenharia.
