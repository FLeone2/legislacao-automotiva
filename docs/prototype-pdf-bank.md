# Banco de textos públicos do protótipo

O banco separado em `knowledge/prototype/` acrescenta textos de documentos públicos às fichas canônicas que já existiam. Não substitui `knowledge/acts/`, não modifica os estados editoriais e não certifica a cobertura integral da legislação.

O primeiro conjunto tem **23 documentos, referentes a 21 atos canônicos e um manual histórico**: 13 arquivos PDF e 10 textos HTML oficiais do Ibama. A Portaria SENATRAN 990/2022 tem duas variantes documentais, original e republicação. O índice contém 1.320 trechos automáticos. Os 294 registros da coleção consultiva continuam separados desses contadores de documentos recuperados.

## Fontes incluídas

| Grupo | Documentos |
| --- | --- |
| CONAMA | Resoluções 490/2018 e 492/2018, em PDF oficial |
| IBAMA, PDF | IN 26/2020 e IN 6/2025, com cópias públicas e hashes conferidos |
| IBAMA, HTML oficial | IN 11/2014, 22/2020, 3/2023, 16/2025, 20/2020, 3/2021, 23/2020, 20/2021, 18/2023 e 5/2024 |
| SENATRAN | Portaria 990/2022 original e republicação de 19/08/2022 |
| CONTRAN | Resoluções 749/2018, 882/2021, 915/2022, 954/2022, 968/2022 e 970/2022 |
| Orientação histórica | Manual Proconve/Promot de 2011, disponibilizado pelo Ibama; 586 páginas PDF |

O [índice de documentos](../knowledge/prototype/README.md) liga cada fonte ao Markdown extraído. Os documentos HTML não são apresentados como PDF. Um redirecionamento para a visualização de arquivo do portal oficial só é aceito depois de conferir cabeçalho `%PDF-`, identidade do título/número/ano e hash dos bytes.

O manual de 2011 permanece como referência histórica para consulta humana. Ele **não integra a recuperação automática de obrigações atuais nem valida campos do Infoserv 2**. A variante original da Portaria 990 também fica fora do índice automático; a republicação primária é indexada. As variantes continuam disponíveis para comparação documental.

## Arquivos e responsabilidades

- `data/prototype/texts-manifest.json`: recibos de obtenção, URLs oficiais, formato real, hash, data e evidência de identidade.
- `data/prototype/document-texts/*.json`: entradas congeladas de extração, com páginas do PDF ou texto do contêiner oficial de legislação do Ibama.
- `data/prototype/document-receipts/*.html.gz`: bytes HTML originais comprimidos para conferência offline do hash; não há HTML ativo servido como uma tela do aplicativo.
- `knowledge/prototype/*.md`: texto extraído, frontmatter, fonte, hash e âncoras por página PDF. Tabelas simples ficam em Markdown; tabelas com células mescladas conservam a estrutura HTML em bloco de código.
- `knowledge/prototype/manifest.json`: lista explícita `artifacts` com SHA-256 de cada Markdown publicável.
- `data/prototype/document-chunks.json`: documentos e trechos citáveis para recuperação no servidor.

Os arquivos de entrada de extração/recibos não precisam ser publicados para operar a consulta. O artefato público pode conter apenas os Markdown registrados, os PDFs verificados e o índice gerado. A construção usa os recibos locais para verificar integridade antes de exportar.

## Contrato para a IA

O índice contém `{schemaVersion, revision, knowledgeRevision, documents, chunks, unavailable, counts}`. `documents` preserva os estados completos `publication`, `legalStatus`, `reviewStatus` e `applicability` da ficha canônica, inclusive valores nulos. Mantém também a revisão original, o tipo da extração, as limitações e a indicação de anotações de alteração no HTML. Esses metadados não se repetem em cada trecho.

Cada `chunk` contém `id`, `actId`, `sourceId`, `documentId`, `title`, `text`, `page`, `kind`, `url`, `pdfUrl`, `markdownPath`, `documentSha256`, `device` e intervalo de caracteres. O vínculo de propriedade é exato: um trecho pertence a um documento e a seu ato/fonte, sem atribuir obrigações a todos os componentes relacionados. PDFs têm link `#page=N`; fontes HTML mantêm `page: null` e nunca ganham uma página PDF fictícia.

Os tipos `public_pdf_machine_extraction` e `public_html_machine_extraction` identificam **texto recuperado automaticamente, não um requisito revisado**. A IA deve preferir requisitos/trechos já revisados, usar o texto novo para localizar a passagem pertinente e expor a necessidade de conferir a cadeia quando ela não estiver consolidada. Anotações de revogação/redação do HTML podem estar próximas de redações antigas; uma correspondência lexical sozinha não determina qual redação se aplica.

Nenhuma edição, limite, sequência de ensaio, média ou método ABNT é deduzido de um título. Normas técnicas privadas não são baixadas ou reproduzidas. A extração não executa OCR nem reconstrói imagens, fórmulas ou diagramas; esses elementos exigem consulta ao original.

## Atualização e reprodução

Aquisição de fontes é uma tarefa separada, com rede e `pdftotext`:

```sh
python scripts/prototype_knowledge_fetch.py
python scripts/prototype_knowledge_fetch.py --refresh
```

Sem `--refresh`, um recibo verificado e suas entradas válidas são reutilizados. Uma nova obtenção pode alterar o hash/data da fonte, mas **não altera sua revisão jurídica**.

O build normal é offline, usa apenas a biblioteca padrão do Python e não executa `pdftotext`:

```sh
python scripts/prototype_knowledge_build.py
python scripts/prototype_knowledge_build.py --check
python tests/prototype-knowledge.test.py
```

O teste verifica reprodução e hashes, preservação literal dos estados canônicos, exclusão do manual histórico e da variante não primária do índice automático, propriedade/página de cada trecho e rejeição de extração/recibo adulterados ou de ato fora da coleção ativa.
