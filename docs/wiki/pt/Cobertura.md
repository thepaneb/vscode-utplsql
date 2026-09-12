# Cobertura de código

A extensão alimenta a **Test Coverage API** do VSCode, mostrando cobertura
diretamente no editor e na aba Coverage.

- Linhas **executadas** → gutter verde 🟢
- Linhas **não executadas** → gutter vermelho 🔴
- Aba **Test Coverage** → percentual por arquivo/pasta

![Gutters de cobertura verde e vermelho no editor](../images/editor-coverage-gutters.png)

![Painel Test Coverage com percentuais por arquivo](../images/coverage-panel.png)

## Como funciona

A execução é feita diretamente no Oracle via `node-oracledb` — sem CLI externo.
O reporter `ut_coverage_cobertura_reporter` gera o XML dentro do banco.
O mapeamento de objetos cobertos para arquivos-fonte é resolvido pela função
`ut_file_mapper.build_file_mappings()` no próprio Oracle, que retorna o
caminho de cada objeto coberto. A extensão lê o XML Cobertura e usa esses
mapeamentos (com fallback para `resolveSourceUri`) para associar cada objeto
ao arquivo-fonte no workspace.

## Cobertura por declaração (Function Coverage)

Além da cobertura linha-a-linha (gutters), a aba **Test Coverage** exibe o
percentual de **declarações** (`PROCEDURE`/`FUNCTION`) executadas por arquivo.
A extensão deriva as declarações do próprio fonte e emite `DeclarationCoverage`
para a Test Coverage API:

- **Aba Test Coverage** → % de declarações por arquivo/pasta
- **Gutters por linha** → sem regressão: a cobertura linha-a-linha continua
  sendo emitida normalmente

## Mapeamento da cobertura aos arquivos

O mapeamento de cobertura para arquivos-fonte é feito internamente pelo Oracle
via `ut_file_mapper.build_file_mappings()`. A função retorna o caminho
absoluto de cada objeto coberto, que a extensão mapeia para o workspace local
usando `resolveSourceUri` (absoluto → workspace → sourcePath).

## Notas importantes

- **Packages → `PACKAGE BODY`**: a cobertura é coletada no **corpo** do package,
  não na spec.
- **Validação dinâmica**: antes de rodar cobertura, a extensão verifica se
  `UT_COVERAGE_COBERTURA_REPORTER` existe no banco. Se não, cobertura é pulada
  com aviso — a execução nunca é bloqueada.

## Cobertura de views (objetos SQL)

O `DBMS_PROFILER`/`DBMS_PLSQL_CODE_COVERAGE` só instrumenta PL/SQL — views não
têm linhas para perfilar. Opções:

1. **`type_mapping` com `views=VIEW`** (padrão): as views do schema coberto
   aparecem no relatório com **0 hits** (arquivo listado, não executado).
   Estrutura esperada: `sourcePath/views/<nome>.sql`.
2. **Rastreio via `V$SQL`** (`utplsql.sqlCoverageEnabled: true`): após o run a
   extensão consulta `V$SQL` e marca cada view como **executada** (100%, verde)
   ou **não executada** (0%, vermelho). O arquivo recebe gutter **por linha**
   (todas verdes ou todas vermelhas — cobertura booleana, não há hits reais
   por linha em SQL). Requer `GRANT SELECT ON V$SQL`.
   Best-effort: falha de acesso/timeout não quebra a execução.
3. **Instrumentação manual**: para granularidade linha-a-linha, converta a
   query em um **package function** que retorna a view/cursor — o corpo entra
   na cobertura PL/SQL normal.

## Depurando o mapeamento de cobertura

Confira a **Log Output** no painel de output do VSCode. O mapeamento de
objetos para arquivos (`ut_file_mapper` + `resolveSourceUri`) é registrado
ali, incluindo quais objetos foram mapeados e quais falharam:

```
--   CALCULADORA → PACKAGE BODY → install/packages/calculadora.sql
--   DOBRO → FUNCTION → install/functions/dobro.sql
--   LOG_AUDITORIA → (não mapeado — nenhum arquivo correspondeu)
```

![Log de mapeamento de cobertura no terminal](../images/output-coverage-mapping.png)
