# Subsistemas identificados e vista explodida

O guia conserva os **30 subsistemas físicos originais, com seus IDs e títulos**, e acrescenta três identificações complementares: arrefecimento, bateria auxiliar e powertrain híbrido de exemplo. O total de navegação é 33; isso é distinto dos 21 conjuntos geométricos usados para selecionar e destacar as malhas.

`src/guide/subsystem-coverage.js` registra a paridade com `catalog.json`, os conjuntos correspondentes, as regiões originais, os recortes das pranchas e os pontos de navegação. `coverageReport()` aponta ausências reais; aumentar rótulos ou duplicar entradas não preenche uma falta entre os 30 originais.

## Modelo mecânico complementar

O modelo BMW original contém principalmente carroceria e habitáculo. O suplemento autoral em `mechanical-supplement.glb` acrescenta:

- Motor térmico e transmissão, com cárter, cabeçote, coletores, acessórios e polias.
- Suspensão dianteira e traseira, braços, subchassis, amortecedores e molas, além da caixa de direção.
- Motor elétrico, inversor, cabos de alta tensão e bateria modular com tampa separada.
- Radiador/ventilação, escapamento, tanque, bateria auxiliar, reservatório de freio, módulos e chicote ilustrativos.

São exemplos didáticos baseados nas pranchas 2D já existentes. Não são especificações, arquitetura certificada ou CAD dos componentes internos do BMW de referência. A geometria do exemplo não preenche a ficha técnica do projeto. Seus metadados preservam `partId`, seção e prancha de origem; o arquivo tem aproximadamente 1 MB em Draco. `mechanical-provenance.json` registra hashes, referências, autoria e código de geração.

Os fontes autorais ficam em `scripts/models`. A geração bruta pode ser feita no Blender:

```sh
blender --background --python scripts/models/build_mechanical_supplement.py -- --output /tmp/mechanical-export
```

O GLB publicado é compactado com Draco, sem decimação, e usa o decodificador local já existente. A geração não é necessária para instalar, testar ou publicar o site; o artefato revisado permanece versionado.

## Explosão e inspeção

`src/guide/exploded-layout.js` define deslocamentos completos por malha e subassembly. A posição montada é preservada; não há soma duplicada de deslocamento do grupo e da malha. Rodas, pequenos acabamentos e espelhos acompanham seus conjuntos. Suspensão, motor térmico, parte elétrica e bateria ocupam faixas distintas.

A câmera enquadra os volumes visíveis de cada malha, respeitando os espaços dos controles. O canvas cresce na vista explodida. **Focar conjunto** isola a seleção e ajusta sua escala; no powertrain híbrido, os três conjuntos principais são destacados juntos. A legenda do subsistema acompanha um ponto consultivo, sem afirmar posição dimensional de instalação ou localização legal de uma gravação.

## Referências 2D

As pranchas anteriores continuam intactas. Cada subsistema abre o mesmo recorte de referência que possuía na consulta 2D. As vistas adicionais de perspectiva, lateral, superior e explosão em `assets/models/suv/reference-views` são exportadas diretamente do canvas WebGL atual, sem sobreposição de controles HTML nem geração de imagens por IA.

`python scripts/capture_reference_boards.py` produz as quatro vistas e seus hashes. A atualização é explícita, fora da CI. O arquivo de proveniência registra os modelos e o código da câmera/layout usados no momento da captura.

## Rastreabilidade normativa

O descritor selecionado limita a consulta ao subsistema explícito. Fluido de freio, por exemplo, não herda o pacote de frenagem/ABS só porque ambos usam o conjunto de freios. Uma referência ausente continua como lacuna; química de bateria, métodos privados, vigência integral e aplicabilidade não são inferidos da imagem ou do novo modelo.

A seleção conserva o perfil, os estados jurídicos, a profundidade de revisão e os requisitos canônicos. URLs guardam `subsystem`, `part` e `tree`; voltar, recarregar e trocar o modo da árvore mantêm um caminho verificável entre seleção, recorte e evidência.
