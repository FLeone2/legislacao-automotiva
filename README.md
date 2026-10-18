# legislacao-automotiva
Protótipo público de consulta à legislação automotiva, com referências oficiais e ressalvas de validação.

## Navegação visual do veículo

Execute `python -m http.server 8000 --bind 127.0.0.1` e abra
`http://127.0.0.1:8000/#vehicle`.

Selecione regiões da imagem ou sistemas na lista. As seleções se acumulam e os
subsistemas disponíveis são a união dos vínculos da taxonomia. Selecionar um card
não abre o detalhe: use **Abrir ilustração**. **Limpar seleção** remove sistemas e
cards; **Limpar assuntos selecionados** atua somente sobre o detalhe. Ao remover
um sistema, cards que deixam de estar disponíveis também saem da seleção.

No detalhe, os pontos e as linhas selecionam os mesmos assuntos, com múltipla
seleção. O acervo exibido usa exclusivamente `records[].taxonomy` de
`catalog.json`, sem atribuir normas a códigos PNC ou inventar aplicabilidade.
Zoom por rolagem ou botões transforma imagem e hotspots juntos. **100% · Restaurar**
restabelece o enquadramento; a lista não participa do zoom. Não há pan.

O perfil, os sistemas, os grupos e o detalhe atual usam identificadores na URL,
permitindo recarregar, compartilhar e usar o histórico do navegador. Voltar aos
grupos conserva o perfil e os cards. O perfil continua sendo ilustrativo e não
filtra aplicabilidade jurídica.

### Arquivos e recursos

- `vehicle-navigation.js`: estado, relações, rotas e interface progressiva.
- `app.js`: mantém os pontos da imagem geral, a consulta ao acervo e os detalhes
  das normas. Integra a nova interface com as rotas existentes.
- `catalog.json`: taxonomia, nomes e vínculos regulatórios preexistentes; não foi
  modificado por esta implementação.
- `vehicle.png`: imagem geral preexistente no repositório, reutilizada. Sua autoria
  e licença não estão documentadas no projeto.
- `assets/brake-schematic.svg`: desenho vetorial conceitual original criado nesta
  implementação. Demonstra três assuntos reais da taxonomia de freios, com
  hotspots cujos identificadores são os mesmos da lista. Não representa o
  Eclipse Cross nem um desenho técnico de montagem.
- `styles.css` e `index.html`: apresentação responsiva e carregamento do módulo.

A amostra completa é **Freios e estabilidade → Frenagem, ABS e componentes →
Abrir ilustração → pontos 1, 2 e 3 → referências oficiais**. Os cards de outros
sistemas usam a localização na imagem geral como miniatura; o detalhe informa a
falta de desenho e mantém a consulta textual. Nenhuma imagem, credencial ou dado
de catálogo do ASA foi copiado. O projeto não contém catálogo comercial, preços,
PNCs, peças específicas ou imagens detalhadas dos demais sistemas. As referências
continuam sujeitas às ressalvas de vigência e classificação do próprio acervo.

### Verificação

```sh
node --test tests/vehicle-model.test.cjs
node --check app.js
node --check vehicle-navigation.js
```

Com o servidor acima em execução, Python com Playwright instalado e Chromium em
`/usr/bin/chromium`, execute:

```sh
python tests/vehicle-browser.py
```

A verificação de navegador cobre seleção gráfica/textual, união de sistemas,
seleção explícita de cards, referências, zoom/reset, retorno, histórico,
recarregamento, URL inválida, falta de dados/imagem, teclado e telas de 1440 e
390 px. Capturas são gravadas em `tests/artifacts/` (não versionadas).
