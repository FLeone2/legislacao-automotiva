# SUV de referência e rastreabilidade normativa

A visualização usa o BMW X5 G05 2018 publicado pela BMW Car IT no repositório [digital-car-3d](https://github.com/bmwcarit/digital-car-3d), commit `6261f53b5ac63c6686039d106fbbbfb693339d72`, sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). A atribuição e a licença ficam junto ao modelo. Trata-se de referência visual, sem endosso do fabricante ou comprovação de homologação da configuração do usuário.

## Geometria e referência visual

A hierarquia da cena original foi reconstruída com seus espelhamentos e 131 instâncias: carroceria, portas, bancos, vidros, rodas, freios, direção, iluminação, retrovisores e habitáculo. O GLB mantém as malhas e as normais da fonte, sem decimação. As adaptações incluem escala visual, materiais PBR portáteis, compactação Draco, separação de conjuntos e apresentação explodida. Superfícies auxiliares de oclusão não são apresentadas como componentes na vista explodida.

O arquivo publicado tem aproximadamente 6,4 MB e contém geometria e texturas. O decodificador é local; o visitante não depende de uma CDN para carregar o modelo. `assets/models/suv/provenance.json` registra autoria, licença, fonte, commit, hashes, transformações e adaptações. `assets/models/suv/LICENSE.txt` conserva a licença do modelo; o decodificador tem sua licença Apache 2.0 própria.

As imagens anteriores `assets/vehicle-vector/previews/vehicle.webp` e `assets/vehicle-exploded.webp` orientam a organização da navegação e das separações. As 37 regiões originais continuam preservadas. A vista reúne 21 conjuntos 3D e identifica os 30 subsistemas originais, além de três complementares. Um suplemento autoral ilustra os sistemas mecânicos ausentes na fonte BMW; não representa o CAD interno dessa versão. Os recortes 2D originais e quatro vistas renderizadas do modelo atual ficam disponíveis no guia.

O motor do exemplo tem a posição montada gravada no próprio suplemento, abaixo da superfície real do capô. O carregador não aplica um deslocamento corretivo separado. O teste geométrico percorre os vértices superiores do motor contra as malhas originais do capô e exige folga visual mínima de 2 cm. Essas coordenadas pertencem à ilustração; não são cotas de engenharia. Suspensão, inversor, bateria de tração, tanque, bateria de 12 V e hidráulica dos freios incluem suportes, fixações, conexões e relevos adicionais. IDs de seleção e associações normativas permanecem os mesmos.

O suplemento publicado ocupa aproximadamente 1,16 MB. Para reproduzi-lo, execute o Blender com `scripts/models/build_mechanical_supplement.py -- --output DIRETORIO --skip-preview` e compacte o resultado com `scripts/models/compress_mechanical.mjs`. O cabeçalho desse segundo script identifica as versões das ferramentas opcionais de autoria; elas não são dependências do site. A compactação preserva a geometria sem decimação e atualiza hashes, tamanho e fontes autorais em `mechanical-provenance.json`. Após alterar o modelo ou seu carregador, recapture as imagens com `scripts/capture_model_thumbnails.py` e `scripts/capture_reference_boards.py`.

## Caminho até a evidência

A seleção segue esta cadeia:

1. Malha do SUV com `partId`, arquivo/mesh de origem e ID da instância RCA.
2. Conjunto de navegação com IDs explícitos das regiões da prancha original.
3. Associação já revisada em `data/vehicle-legislation/reviewed-map.json`.
4. Assunto, ato canônico e IDs de requisitos vinculados.
5. Dispositivo, regra, âmbito, fonte, data de revisão e limites disponíveis.

O painel separa **sobre o conjunto selecionado** e **contexto do veículo completo**. Agrupar as duas rodas ou as portas não implica herdar todas as normas do sistema. As associações são recuperadas por ID explícito; sem vínculo revisado, aparece uma lacuna. O modelo visual não cria um requisito legal.

Os estados de publicação, indicação jurídica, revisão e aplicabilidade permanecem separados. A íntegra Inmetro pendente continua pendente; revogações parciais conservam seus avisos. Não foram reativados atos excluídos nem inventados métodos ABNT.

## Condições do projeto

Categoria, propulsão, massas, lotação, origem, modalidade, uso, ano, mercado e presença de radiofrequência vêm do perfil informado pelo usuário. A geometria do BMW não preenche esses campos e não transfere especificações de uma versão comercial para o projeto. O painel mostra as condições a confrontar com os dispositivos e mantém a aplicação como **a avaliar**.

Os detalhes dos atos são carregados sob demanda apenas para os vínculos selecionados. Falha de carga mantém a distinção entre resumo disponível e evidência ainda indisponível, com tentativa de recuperação. A seleção de uma malha não muda o estado de um checklist para concluído.

## Verificações

- `tests/guide-traceability.test.cjs`: fontes explícitas, agrupamento, estados independentes, requisitos e lacunas.
- `tests/suv-reference.test.py`: checksum, licença, identidade das malhas, materiais PBR e dependências locais.
- `tests/suv-reference-browser.py`: GLB e Draco reais, seleção/árvore, fontes e dispositivos, perfil, celular, acessibilidade, erro e repetição.
- `tests/mechanical-fit-browser.py`: vértices reais do motor sob o capô, folga visual e reprodução da colisão da pose anterior.

A versão renderizada é verificada visualmente em computador e telas de 390 e 320 pixels. O build conserva o alvo Cloudflare e a publicação exclusiva de `dist`.
