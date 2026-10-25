# Banco de referências do guia

O banco é um índice consultivo de fontes e atos do acervo publicado. Ele organiza os dados para pesquisa, rastreabilidade e uso por ferramentas. **Não é uma consolidação jurídica completa e não declara a aplicabilidade a um veículo.**

O arquivo portátil é `data/process/knowledge-index.json`, gerado por `scripts/build_guide_database.py`, com contrato em `schemas/guide-database.schema.json`. O JSON tem orçamento máximo de 300.000 bytes e é determinístico: as mesmas entradas produzem os mesmos bytes. Datas de consulta pertencem às fontes; regenerar o arquivo não atualiza uma revisão normativa.

## Estrutura e identidade

| Tabela | Conteúdo e interpretação |
| --- | --- |
| `sources` | Fontes oficiais de emissões e segurança/processos; data, natureza da evidência, escopo e limitações. Uma orientação de serviço não vira lei revisada. |
| `acts` | Uma entrada por identidade canônica do acervo consultivo atual, com URL e estados independentes. Fontes novas do guia não importam automaticamente atos para este conjunto. |
| `aliases` | IDs de entradas antigas apontando para a identidade canônica. Permite conservar bookmarks sem contar a mesma referência várias vezes. |
| `actSources` | Vínculos por ID canônico idêntico ou URL oficial idêntica. Este vínculo comprova identidade da referência, não incidência de todos os seus requisitos. |

Cada fonte e ato tem `provenance.path` e JSON Pointer para sua entrada original. O cabeçalho preserva SHA-256 de todas as entradas do gerador. URLs de fontes e atos precisam usar HTTPS e domínio governamental `.gov.br`, sem credenciais. A validação rejeita IDs duplicados, URLs de fontes duplicadas e referências quebradas.

## Estados independentes preservados

`legalStatus`, `reviewStatus`, `applicability` e `publication` são copiados sem promoção de estado. Os campos ausentes em registros legados ficam `null`; o texto de um título, uma data ou a presença na biblioteca não substitui uma revisão.

As referências Inmetro mantêm `fullTextReviewed: false` quando essa é a indicação original. Avisos de revogação parcial permanecem no estado próprio. As 55 exclusões editoriais do responsável, as exclusões oficiais e os históricos selecionados são verificados contra o conjunto de atos. Nenhum deles é reativado por uma nova associação.

As entradas vêm de:

- `data/process/official-sources.json`: pesquisa dirigida de emissões.
- `data/process/safety-sources.json`: pesquisa dirigida de segurança, SISCAT e órgãos correlatos.
- `data/site/index.json`: resumos já publicados das quatro consultas por órgão e referências legadas retidas na biblioteca canônica.
- `data/contran/publication-policy.json` e `publication-decisions.json`: controles de exclusão.

Inventários brutos e cópias históricas não são usados para preencher lacunas. O gerador não baixa leis, não altera catálogos e não inventa edições ABNT, métodos ou limites. As referências a requisitos apontam para IDs existentes; os detalhes continuam no acervo original.

## Gerar e conferir

```sh
python scripts/build_guide_database.py
python scripts/build_guide_database.py --check
python tests/guide-database.test.py
```

Após alterar fontes editoriais ou regenerar `data/site/index.json`, gere novamente este índice antes do build estático. O teste confere schema, determinismo, integridade das relações, exclusões e preservação de estados.

## SQLite opcional para consulta local

O build padrão não cria binários. Para abrir em ferramentas SQL, escolha explicitamente um arquivo novo fora do artefato publicado:

```sh
python scripts/build_guide_database.py --sqlite /tmp/homologacao-conhecimento.sqlite
```

O exportador preserva as tabelas, os IDs, chaves estrangeiras e o JSON completo de cada registro. Ele recusa arquivo de destino existente e qualquer destino dentro de `dist`. Não versionar o SQLite; o JSON e o script são a origem reproduzível.

Exemplos de consultas:

```sql
SELECT id, title, official_url
FROM acts
WHERE agency = 'proconve';

SELECT a.title, s.title AS source_title, s.url
FROM act_sources AS link
JOIN acts AS a ON a.id = link.act_id
JOIN sources AS s ON s.id = link.source_id;
```

Para manutenção, siga a [skill de revisão normativa](../../.agents/skills/revisao-normativa/SKILL.md), registre evidência e limites no arquivo editorial correto e regenere os dados. Índice, FAQ, ato original e texto consolidado continuam naturezas de evidência distintas.
