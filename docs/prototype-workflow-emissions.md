# Fluxo ambiental — leitura dirigida para o protótipo

Entrada editorial: `data/prototype/workflow-emissions.json`. O arquivo organiza oito etapas, dez blocos de ensaio/declaração e treze referências técnicas. Não altera atos, requisitos ou estados jurídicos do acervo. O enquadramento permanece no avaliador canônico; os filtros são portas de consulta, não novos algoritmos de incidência.

A sequência é: confirmar enquadramento → fechar configuração e laboratório → definir carga de estrada → preparar veículo → executar o pacote aplicável → validar resultados → preparar/submeter no Infoserv → conferir LCVM e entregar ao CAT. Um fluxo linear de trabalho não transforma todos os ensaios em uma sequência física obrigatória. Testemunho, métodos e alternativas precisam ser confirmados no caso.

## Evidência efetivamente consultada

Foram lidos os dispositivos indicados dos textos públicos arquivados no repositório: CONAMA 492/2018 e 490/2018; IN IBAMA 11/2014, 22/2020, 26/2020, 29/2020, 3/2021, 23/2020, 3/2023, 16/2025 e 20/2025. O registro JSON conserva URL, dispositivo, chave do arquivo, hash original e data de recuperação. É leitura dirigida; não se certifica revisão integral da cadeia ou vigência consolidada.

Também foram recuperadas em 31/10/2026 as páginas públicas de [LCVM](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/licenca-para-veiculos-motores-ou-maquinas-lcvm-proconve) e [híbridos](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/calculo-de-eficiencia-energetica-de-veiculos-hibridos), além do [Manual PROCONVE/PROMOT](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/arquivos/manual%20proconve%20promot_portugues.pdf). A edição do manual é **2011**, comprovada nas páginas iniciais. Seus anexos B1/B3 (pp. 343–349) ajudam a preparar dados e esquemas, mas não comprovam os campos internos atuais do Infoserv 2. Não houve autenticação no sistema.

## Decisões que mudam o roteiro

- **LP/LC não é M1/N1:** CONAMA 492/2018 art. 35 insere a definição do art. 1-A da CONAMA 15/1995; art. 36 trata de veículos fora de estrada. “SUV” ou 4 x 4 isoladamente não resolve o enquadramento. O código existente do projeto é a autoridade operacional da triagem.
- **Diesel precisa de porta independente de admissibilidade de combustível.** O arquivo não reconstitui a cadeia ANP/DNC, não autoriza nem proíbe automaticamente LP/M1 diesel. A equipe de segurança também pode ter documentação própria de jipe diesel; não confundir essa documentação com classificação ambiental.
- **Estrada não é universalmente compulsório para diesel:** IN 11/2014 art. 1º § 1º torna facultativa a determinação ali prevista quando do ensaio com gasool A11H50 e óleo diesel. O art. 1º §§ 2º–4º e a redação dada pela IN 3/2023 descrevem informações de autonomia/emissões e ajuste do dinamômetro. Outro programa pode ter escopo próprio; não transformar facultatividade em dispensa geral de energia/eficiência.
- **FTP-75/urbano, Highway/HWFET e ETR/RDE são blocos distintos.** Os nomes usuais são de navegação; os métodos incorporados e suas edições precisam ser confirmados. Não há sequência automática “diesel → FTP-75 → HWFET/RDE”.
- **ETR tem preparação específica:** IN 3/2021 Anexo 2.4–2.7 trata de transmissão padrão, correções/regeneração e vedação de intervenção/recarga após pré-condicionamento até o início do ETR. Partes 2.15 e 7 tratam de capacidade técnica/rota; ler junto à IN 3/2023 e às retificações. Não copiar para todos os demais ensaios.
- **Híbridos:** IN 3/2023 art. 2º referencia a versão mais recente da NBR 16567. A página de planilha ainda cita 2016; não congelar essa edição. Registrar modos pertinentes de carga sustentada/redução de carga, urbano/estrada, e condição de recarga externa quando houver.
- **BEV:** CONAMA 492 art. 6º permite comprovação do nível de emissão zero por declaração nas condições do dispositivo. Isso não é dispensa administrativa automática nem elimina ruído/energia e outras frentes. Não associar escapamento térmico ou SHED por analogia.
- **Médias e cálculos:** CONAMA 492 art. 13 §§ 1º–3º traz repetições/médias específicas de flex e bicombustível. Não impor duas corridas a todo diesel, não misturar FTP/HWFET/ETR numa média genérica e não confundir resultados da configuração com médias corporativas L8. IN 22/2020 art. 9º trata de NMOG igual a NMHC para diesel; sua cadeia e retificações continuam relevantes.
- **OBD não é um bloqueio cronológico universal anterior à LCVM:** IN 23/2020 art. 11 exige registro das características e admite, na hipótese prevista, conclusão de ensaios após certificação, com documentação/conclusão antes da comercialização. IUMPR e seus prazos posteriores (IN 16/2025 e IN 20/2025) são controles distintos.
- **P8 e PROMOT:** recebem encaminhamento próprio, sem pacote L8 herdado. CONAMA 490 art. 23 permite uma alternativa P8 estritamente condicionada para LC com 3.500 < PBT < 3.856 kg, motor derivado de mestre pesado e autorização prévia do Ibama; não é conversão automática de classe ambiental.

## Métodos, equivalências e lacunas

Os atos públicos identificam NBR 6601, 7024, 16567, 16927, 17011, 16898, 14008, 13776, 12026, 15598 e 8689 em condições próprias. IN 3/2023 atualiza referências para versões mais recentes ou sucedâneas. A referência 10312 e SAE J 1634:2017 foi localizada apenas na orientação oficial da Portaria Inmetro 169/2023; sua íntegra consolidada permanece pendente e a natureza voluntária do PBEV é preservada.

Não foram inventados tempos de estabilização/soak, distâncias, fases, velocidades, amostras, fórmulas ou faixas de SOC de normas privadas. O fluxo tem campos para receber o procedimento licenciado e os resultados do laboratório. Isso permite detalhar a execução sem fingir que um título de NBR contém o método inteiro.

CONAMA 492 art. 21 § 2º cita os regulamentos europeus 2016/427 e 2016/646 como referências de origem para ETR, até regulamentação/norma brasileira referenciada; IN 3/2023 aponta NBR 17011. Art. 23 § 1º cita UNECE R 83 Rev.5 para Ki. A apresentação é de referência expressa/condicionada, não equivalência genérica “Euro 6=L8”, nem aceitação automática de relatório europeu.

“Raio-X” ficou como termo a esclarecer pelo usuário. Highway/HWFET e ETR/RDE foram separados no arquivo, sem escolher um deles por inferência.

## Conferência estrutural

JSON UTF-8 validado: oito IDs únicos de etapa; todas as referências de fonte e norma técnica dos dez testes resolvem no próprio arquivo. Nenhum arquivo canônico foi modificado ou regenerado. Os arquivos de pesquisa ficaram em `/workspace/artifacts/workflow-emissions/`.
