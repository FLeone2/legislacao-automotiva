# Validação deste salvamento

O salvamento acrescenta somente a pesquisa arquivada em `docs/pesquisa-seguranca/2026-11-02/` e a exclusão desse arquivo documental do formatador em `.prettierignore`. O aplicativo, os dados publicados, o modelo 3D e `dist/` não foram editados.

## Conferências realizadas

- Cada arquivo copiado tem tamanho e SHA-256 registrados no manifesto. Arquivos binários preservam os bytes originais.
- Os dois Excel estão presentes. O anterior mantém as respostas já preenchidas, e o residual tem dez perguntas e campos de resposta em branco.
- As seis pendências originais estão representadas. A segurança integral não foi marcada como fechada.
- Os documentos da revisão de novembro têm 137 fontes preservadas, com 127 PDFs, cinco DOCs e cinco HTMLs, além das fichas Markdown e dos dados da análise.
- As imagens antigas estão identificadas como propostas de outubro, anteriores à revisão MOVER/Inmetro de novembro.
- `scripts/check_project.py` passou: estados independentes, publicações, vínculos e sintaxe do aplicativo existente.

## Limitações dos testes do aplicativo existente

O ambiente Windows de salvamento apresentou falhas nos testes atuais do projeto, fora das alterações documentais: 138 dos 140 testes Node passaram; houve divergência de hash nos textos publicados e ausência de `npx` em uma rotina de regeneração. A conferência de prévias acusou divergência de hash da fonte `vehicle`, e a verificação de formatação apontou 91 arquivos existentes. A suíte Python parou em `guide-database.test.py` com falha/erro.

Esses resultados não foram ocultados nem corrigidos alterando arquivos do site ou linhas de base. Não se afirma que a suíte completa do aplicativo passou. A validação deste checkpoint é documental e de integridade; a pesquisa e os protótipos permanecem separados da publicação do site.
