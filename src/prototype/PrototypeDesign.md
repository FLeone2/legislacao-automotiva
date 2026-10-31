# nexo — garagem e consulta

Aplicação de trabalho com três abas: IA, Veículo e Homologação. IA abre por padrão.

- Garagem preta `#080a0d`, superfícies grafite, texto claro e seleção branca. Luz de ambiente branca; cabos e materiais físicos preservam suas cores. Sem iluminação dourada ou cobre.
- Fonte de sistema. Corpo entre 14 e 16 px, metadados legíveis de 12–13 px. Controles com foco visível e navegação por teclado.
- Marca nexo no cabeçalho; perfil técnico compartilhado à direita. Dock inferior com apenas IA, Veículo e Homologação; sem títulos promocionais, estatísticas ou níveis de jogo.
- IA: caixa de pergunta convencional, nome do modelo efetivamente disponível, respostas e fontes recolhíveis. A conversa fica acima da caixa quando houver resposta.
- Veículo: cena real Three.js, menu de conjuntos à direita, seletor completo de componentes e controles de separação/foco. Leis abaixo da cena; detalhes normativos por expansão. No celular o menu vira uma faixa horizontal acessível.
- Homologação: perfil editável, sete fases e subetapas do roteiro. O procedimento detalhado da etapa fica em expansão própria; a árvore bilateral central ocupa a área de consulta, preserva ancestrais, permite pan/zoom e oferece alternativa em lista. Fontes e qualificações continuam abaixo da seleção.
- Métodos, condicionamentos e equivalências vêm exclusivamente dos dados editoriais. Ausência é lacuna, nunca uma equivalência ou isenção presumida.
- IA abre sem baixar o modelo 3D. Após a primeira visita a Veículo, a cena continua montada e aparece apenas como fundo sob o fumê das outras abas. A área do canvas é preservada para manter a câmera. Controles de fundo ficam `inert` e fora da árvore de acessibilidade.
- Hash, seleção, perfil e câmera preservados; armazenamento separado do Guia.
