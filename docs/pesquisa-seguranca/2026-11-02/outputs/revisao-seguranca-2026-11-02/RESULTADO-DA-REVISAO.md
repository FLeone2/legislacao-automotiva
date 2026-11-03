# Resultado da revisão de segurança

Data de corte: **2 de novembro de 2026**.

**As pesquisas desta rodada foram consolidadas e a base está pronta para orientar o novo desenho informativo do fluxo e da árvore. Ainda não há fundamento para declarar toda a segurança normativa integralmente fechada.** As pendências agora estão delimitadas por assunto e não impedem representar os requisitos já conferidos.

## Recorte confirmado

Automóvel de passageiros novo, fabricado no Brasil, categoria M1, **até sete ocupantes no total, incluindo o motorista**. PBT usual até 3.500 kg, com ramo próprio para M1 elétrico acima disso. A definição de M1 da 915/2022, art. 2º, não estabelece esse teto geral de massa; cada legislação mantém seu próprio corte. Não há desconto automático da massa de bateria nos requisitos de segurança.

O aplicativo será de consulta: obrigação → condição de aplicação → legislação → comprovação → parte/sistema no 3D. Datas do projeto/CAT e de fabricação continuam relevantes, mesmo sem aprovar relatórios. Todas as propulsões devem caber na arquitetura, com cobertura específica e lacunas visíveis.

## O que a pesquisa acrescentou

1. **MOVER/InTec.** Decreto 12.435/2025, Anexo IV, e GM/MDIC 215/2025, Anexos I/II, acrescentam uma camada de requisitos por MMV e metas ponderadas da empresa. Foram estruturados os 28 itens A/B/C/D, inclusive TPMS, ADDW, sensor de ponto cego e aviso de cinto para todos os passageiros, que não tinham linha própria entre as 36 capturadas. Grupo D permanece condicionado à definição técnica. Esses 28 vínculos se sobrepõem a temas existentes: não são 28 novos ensaios obrigatórios universais.
2. **Inmetro.** Identificados os mecanismos de engate/quebra-mato (declaração do fornecedor, com diferenças de registro), pneus/extintores/componentes e cilindros GNV (certificação nos respectivos regulamentos), instalação e requalificação GNV (regras de serviço) e inspeção veicular. Não se deve resumir todos os mecanismos à palavra “certificação”.
3. **Atualizações efetivas.** Pneus: 845/2025 + retificação de 06/02/2026. Selos: 314/2025 + 409/2026. Inspeção GNV: 384/2023 + histórico 634/2023 + 106/2025. A 106 revogou o art. 5º da 147/2022 e restabeleceu efeitos; não revogou a portaria inteira.
4. **Ancoragens.** 951/2022 + 997/2023 continuam como base atual confirmada; separar bancos/apoios, cintos/ancoragens e ISOFIX. Relatório conjunto depende da cobertura do requisito, sem criar uma exigência separada pelo simples nome antigo da tela.

## Correções práticas para a consulta

| Assunto | Como mostrar |
|---|---|
| Quebra-mato | Não é exclusivo de polícia; há exceções específicas. Inmetro 400/2020 exige declaração/autoverificação do fornecedor. Registro/plaqueta entre 215/2006 e risco I da 282/2020 permanece ressalva administrativa. |
| Engate | Acessório e original de fábrica têm escopos diferentes. Separar relatório de protótipo do engate, registro do fornecedor e capacidade declarada do veículo. |
| Pneus | DOT + logotipo não bastam para a cadeia de conformidade; conferir certificação, registro, marcações e aplicação. ENCE em pneu para montadora tem condição própria. |
| Extintor | Instalação facultativa para automóvel, mas local adequado para suporte é dever do fabricante. Produto instalado não se torna regular apenas por autodeclaração do veículo. |
| GNV | Separar componentes, cilindro, instalação, inspeção e requalificação. O original de fábrica também aparece expressamente nos regulamentos. |
| UN R / FMVSS / ISO | Usar alternativas expressamente admitidas e seu escopo; a hierarquia do MOVER não é autorização irrestrita para substituir qualquer relatório CAT. |
| PBT do elétrico | Manter M1 e reenquadrar cada obrigação pela massa real e pelo texto da regra; não criar “isenção por bateria”. |
| Linhas antigas do SISCAT | Preservar o que foi observado e mostrar a base atual ao lado. Não criar nem dispensar entrega independente sem fundamento. |

## Resultado documental

- 19 respostas do Excel incorporadas à conferência, sem alterar o arquivo preenchido.
- Captura anterior preservada: 10 guias e 36 linhas de ensaios, além de 12 linhas Nível 1 complementadas pela fonte oficial e 35 requisitos complementares.
- 137 arquivos de fonte preservados: 127 PDF, 5 DOC e 5 HTML; cada um com ficha Markdown e hash. Páginas do DOU contam como arquivos, não como leis distintas.
- 28 vínculos MOVER estruturados, com grupos, métodos citados, condições e correspondência com o SISCAT.
- 14 subitens GNV estruturados, incluindo os nove componentes expressamente listados na 111/2022, cilindro e etapas de instalação/uso.
- Inventário v2 e 59 registros iniciais para consulta com IA, mantendo condições e fontes. Isso não implementa ainda a busca por IA nem certifica todos os métodos internacionais/privados.

## Estrutura que o novo desenho deve respeitar

1. **Enquadrar o veículo:** tipo, categoria, lugares, massas, propulsão, datas e exceções.
2. **Exibir obrigações individuais do veículo:** construção, segurança ativa/passiva, sistemas e acessórios instalados.
3. **Orientar o dossiê CAT/SISCAT:** documentos administrativos, declarações e relatórios que correspondam aos requisitos aplicáveis. Não confundir a lista de arquivos da interface com o universo legal.
4. **Exibir MOVER/rotulagem:** presença e características por MMV; controle separado das metas anuais da fabricante.
5. **Consultar o veículo em uso:** inspeções/manutenção e modificações posteriores, com ramo separado da homologação original.
6. **Ligar ao 3D:** relações de conhecimento por peça/sistema; o fluxo continua acessível sem carregar o modelo. IDs de malha reais ainda serão conferidos na implementação.

## O que falta para o fechamento integral

As seis ressalvas estão descritas em [PENDENCIAS-RESIDUAIS.md](PENDENCIAS-RESIDUAIS.md): entrega autônoma de linhas legadas; registro/plaqueta do quebra-mato; redação C2 e definição do Grupo D; atualização temporal e métodos incorporados; propulsões especiais/diesel; validação de outros perfis e malhas 3D. Cada uma indica exatamente qual afirmação ainda não pode ser automática.

Os desenhos anteriores de 31/10 são versões históricas: ainda não refletem toda esta revisão MOVER/Inmetro. O próximo desenho deverá usar o inventário v2, sem apresentar as ressalvas como resolvidas.

## Arquivos principais

- [Conferência das suas 19 respostas](CONFIRMACOES-REVISADAS.md).
- [Requisitos e metas MOVER](MOVER-REQUISITOS.md).
- [Componentes e etapas GNV](GNV-REQUISITOS.md).
- [Disponibilidade de fontes, PDFs e Markdown](DISPONIBILIDADE-DOCUMENTOS.md).
- [Inventário estruturado v2](inventario-seguranca-v2.json).
- [Critérios de uso na base de IA](base-ia/LEIA-ME.md).

Fontes centrais: [Decreto 12.435/2025, Anexo IV](legislacoes/decreto-12435-2025-dou-p5.md); [GM/MDIC 215/2025](legislacoes/mdic-215-2025-dou-p26.md); [Inmetro 409/2026](legislacoes/inmetro-409-2026-dou-p110.md); [Inmetro 106/2025](legislacoes/inmetro-106-2025-dou-p16.md). As fichas ligam ao arquivo oficial e ao dispositivo conferido.
