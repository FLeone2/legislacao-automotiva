# Monitoramento e operação da base regulatória

O monitor observa mudanças técnicas em fontes oficiais e identifica citações ainda ausentes do inventário. A análise normativa, os quatro estados do acervo e a decisão de aplicabilidade continuam no fluxo editorial documentado na [skill de revisão normativa](../../.agents/skills/revisao-normativa/SKILL.md).

## Fontes e alcance

`scripts/check_regulatory_updates.py` lê os registros atuais de `data/process/official-sources.json` e `safety-sources.json`. O manifesto `data/monitor/sources.json` complementa esses registros com páginas oficiais de localização:

- [Legislação de emissões do Ibama](https://www.gov.br/ibama/pt-br/assuntos/emissoes-e-residuos/emissoes/legislacao-emissoes).
- [Índice de resoluções CONTRAN](https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/resolucoes-contran), já registrado nas fontes do guia.
- [Entrada pública da Legislação Inmetro](https://www.gov.br/inmetro/pt-br/centrais-de-conteudo/sistemas/legislacao).
- [Regulamentação da certificação Anatel](https://www.gov.br/anatel/pt-br/regulado/certificacao-de-produtos/regulamentacao).
- [Legislação do Programa MOVER](https://www.gov.br/mdic/pt-br/assuntos/sdic/setor-automotivo/programa-mover-1/legislacao-programa-mover) e [Portarias GM/MDIC de 2026](https://www.gov.br/mdic/pt-br/acesso-a-informacao/institucional/atos-normativos/gabinete-do-ministro/portarias/2026).

Essas páginas permitem localizar atos e links para publicações, inclusive no DOU. O monitor não varre todo o Diário Oficial nem os sistemas autenticados de cada órgão. O inventário de fontes é finito e precisa de revisão conforme categoria, componentes, uso e período do projeto. Nenhum procedimento técnico privado é copiado ou inferido.

O modo `--include-catalog`, usado no workflow, acrescenta as URLs oficiais de **todos os atos publicados** em `knowledge-index.json`. Requisições com a mesma URL são agrupadas, preservando cada ID e sua natureza em `references`. Compartilhar uma URL de índice não comprova identidade ou revisão dos atos citados. `catalogActsSelected` informa o número de atos selecionados; `catalogActSourceUrlsAvailable` apenas informa disponibilidade técnica de suas URLs, sem equivaler a textos íntegros conferidos.

## Duas verificações independentes

1. **Mudança de conteúdo:** compara hash do documento e do conteúdo útil, usa ETag/Last-Modified e preserva a última observação válida. Em HTML, navegação e scripts são desconsiderados; texto útil e links oficiais entram no hash. Em PDF, o hash é dos bytes, sem presumir leitura integral ou mudança jurídica.
2. **Conciliação do inventário:** compara citações qualificadas do índice com as identidades já cadastradas. O extrator inicial cobre Portarias GM/MDIC relevantes ao setor automotivo, com órgão, tipo, número e ano explícitos. Minutas e consultas públicas ficam separadas. A expansão para outros formatos de índice exige extrator e evidência próprios.

A conciliação roda também quando o hash está igual ou o servidor responde `304`: usa as âncoras/citações preservadas no snapshot. Assim, um índice que já continha uma Portaria ausente da base continua apontando a lacuna, mesmo sem publicar novos bytes naquele dia. O vínculo a outra Portaria cadastrada é uma pista de relevância do índice; não prova o conteúdo, o efeito ou a vigência da nova citação.

Candidatas já registradas em `data/mover/reviewed-map.json#/candidates` continuam como `registered_candidate_review_pending`. Cadastrá-las fora da publicação ativa não as transforma em atos revisados nem apaga sua pendência. O extrator mantém separado um ato interministerial MDIC/MCTI que tenha o mesmo número e ano de uma Portaria GM/MDIC.

Alguns links oficiais do índice ainda usam HTTP e há marcação que separa uma letra de uma palavra do título, como `P<a>ORTARIA...</a>`. O parser recompõe apenas essa adjacência literal e preserva o rótulo original. Um href HTTP oficial pode ser registrado como evidência com uma variante HTTPS marcada `https_variant_not_fetched`; o monitor não faz requisições HTTP nem afirma ter verificado a variante apenas por gerá-la.

## Disponibilidade não é revisão

Na conferência de 25/10/2026, páginas Anatel de atos redirecionaram com HTTP 200 para `/aviso/manutencao-sistemas.html`. O catálogo de produtos regulados do Inmetro também apresentou redirecionamento para login. O monitor verifica URL final e sinais de manutenção, autenticação e bloqueio; esses retornos ficam indisponíveis e preservam a última base válida.

HTTP 200, 304 ou hash inalterado não confirmam que todo o arcabouço está coberto. Bloqueio, timeout, 403/503 ou página de manutenção também não significam ausência de novidades. `observedAt` registra a coleta técnica; não substitui `checkedAt`, data de revisão normativa ou início de vigência.

URLs de documentos `.pdf` no portal podem retornar uma página HTML legítima de visualização. Nesse caso, o monitor resolve uma única vez o link HTTPS de `@@display-file/file` ou `@@download/file` explicitamente declarado no preview, no mesmo portal e com o prefixo do mesmo arquivo. Só os bytes do PDF entram na base do documento; a página de visualização não substitui o arquivo. O ETag do PDF é usado no download, sem validar o preview com o ETag de outro recurso.

## Executar e guardar evidências

```sh
python scripts/check_regulatory_updates.py \
  --state /tmp/regulatory-monitor/state.json \
  --report /tmp/regulatory-monitor/report.json \
  --summary /tmp/regulatory-monitor/summary.md \
  --snapshot-dir /tmp/regulatory-monitor/snapshots \
  --include-catalog --workers 4 --time-budget 600 --snapshot-budget-mib 20
```

O estado inclui snapshots normalizados, URLs finais, hashes, metadados HTTP, citações e fila de alterações ainda não revisadas. `--snapshot-dir` também guarda os bytes recebidos em arquivos `.bin` nomeados por SHA-256, para inspeção como dados. Respostas de manutenção podem ser preservadas como evidência da falha; não entram como nova base normativa. Os arquivos ficam fora do artefato publicado, e os destinos de escrita em dados, documentos do portal e `dist` são recusados.

Os snapshots brutos têm orçamento configurável (20 MiB por execução no workflow). `rawSnapshots.skippedForBudget` informa respostas não arquivadas por esse limite; seus hashes e estados de observação continuam no relatório. Isso limita armazenamento de artefatos sem alegar arquivamento integral de todos os PDFs.

Os limites são 5 MiB por resposta, 15 segundos de timeout HTTP, cinco redirects, até quatro trabalhadores e apenas HTTPS em domínios governamentais `.gov.br`. Cada redirect é validado; destinos DNS privados ou reservados são recusados. A coleta conserva proxy e confiança TLS do ambiente. Links descobertos são registrados, sem seguir URLs arbitrárias recursivamente.

`--time-budget` limita o início da coleta de novas fontes. Requisições já iniciadas podem terminar redirects e o download declarado dentro dos timeouts individuais. Fontes que ficaram fora do orçamento têm `reason: not_attempted_time_budget`, entram em `notAttempted` e mantêm o resultado como coleta parcial. Nunca são tratadas como sem novidades. `--source-id` permite selecionar uma fonte ou ID canônico para diagnóstico; o relatório registra explicitamente o escopo filtrado. Ao mudar o algoritmo de normalização, incrementar `NORMALIZATION_VERSION`: snapshots antigos exigem uma nova resposta completa, em vez de produzir falsa mudança jurídica por alteração do próprio monitor.

Resultado do comando:

| Código | Interpretação |
| --- | --- |
| `0` | Fontes selecionadas observadas sem mudança pendente detectada. Não é atestado de cobertura ou validade. |
| `2` | Coleta parcial/indisponível ou configuração inválida; conferir relatório e repetir a fonte quando possível. |
| `3` | Há mudança de conteúdo ainda não revisada ou citação relevante ausente do inventário. |

Alterações de conteúdo permanecem na fila também nas execuções seguintes sem mudança. Após registrar a revisão e suas evidências, reconheça a candidata com referência verificável:

```sh
python scripts/check_regulatory_updates.py \
  --state /tmp/regulatory-monitor/state.json \
  --acknowledge 'id-da-fonte:hash-da-candidata' \
  --review-reference 'URL ou commit da revisão registrada'
```

Reconhecer a candidata apenas encerra o alerta técnico. Atualizar o catálogo exige alterar a entrada editorial correta, preservar `legalStatus`, `reviewStatus`, `applicability` e `publication`, revisar o dispositivo e gerar os dados. Uma citação ausente do inventário só deixa de aparecer após a conciliação de sua identidade; reconhecer um alerta de hash não a oculta.

## Agendamento e ativação real

`.github/workflows/regulatory-monitor.yml` está preparado para rodar diariamente às 09h17 UTC e manualmente, com catálogo completo, quatro trabalhadores e orçamento de 900 segundos para iniciar coletas. Ele restaura o último estado em cache, preserva bases válidas e fila pendente, publica resumo no job e guarda evidências por 14 dias. O SHA de `actions/cache` está fixado e foi conferido no repositório oficial. Fontes indisponíveis ou pendências deixam o job com resultado que exige atenção, em vez de sinalizar cobertura completa. Não há alteração automática de normas ou envio de mensagens por e-mail, Slack ou issues.

**O workflow já integra `main`, com agenda diária às 09h17 UTC.** A execução depende de o GitHub Actions permanecer habilitado e da disponibilidade do serviço; a configuração da agenda não comprova que uma coleta terminou. Confira os relatórios em [execuções do monitor](https://github.com/FLeone2/legislacao-automotiva/actions/workflows/regulatory-monitor.yml). O monitor não promove candidatos nem publica alterações normativas automaticamente. O cache pode expirar ou ser removido; nesse caso a próxima coleta cria novas bases iniciais e precisa ser conciliada com os relatórios anteriores. Para operação contínua de longo prazo, guardar estado e evidências em armazenamento durável com backup e controlar quem pode reconhecer candidatas.

Disponibilidade dos portais, alteração do formato dos índices, limites dos provedores e revisão dos candidatos exigem acompanhamento. O mecanismo fornece detecção e rastreabilidade auditáveis; não pode garantir atualização absoluta de todas as normas nem substituir revisão da cadeia normativa.

## Conferência automatizada

```sh
python tests/regulatory-updates.test.py
```

Os testes usam transporte injetado e verificam 304, mudança de link, estado preservado sob falha, manutenção com 200, redirects, DNS privado, limite de bytes, fila persistente e lacuna de inventário mesmo em índice sem alteração.
