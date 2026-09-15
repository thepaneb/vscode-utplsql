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
O reporter `ut_coverage_cobertura_reporter` gera o XML dentro do banco,
identificando cada objeto coberto como `<tipo> <schema>.<objeto>`
(ex.: `package body UT3.CALC`). A extensão mapeia esses nomes para os arquivos-fonte
locais usando o setting `utplsql.sourcePath` e o schema `utplsql.coverageOwner`.

## Cobertura por declaração (Function Coverage)

Além da cobertura linha-a-linha (gutters), a aba **Test Coverage** exibe o
percentual de **declarações** (`PROCEDURE`/`FUNCTION`) executadas por arquivo.
A extensão deriva as declarações do próprio fonte e emite `DeclarationCoverage`
para a Test Coverage API:

- **Aba Test Coverage** → % de declarações por arquivo/pasta
- **Gutters por linha** → sem regressão: a cobertura linha-a-linha continua
  sendo emitida normalmente

## Mapeamento da cobertura aos arquivos

A extensão mapeia o `filename` do Cobertura (ex.: `package body UT3.CALC`) para o
layout local (`packages/CALC.sql`, `functions/FN.sql`, `procedures/PR.sql`,
`types/TY.sql`, `triggers/TR.sql`, `views/VW.sql`) e o resolve com
`resolveSourceUri` (absoluto → workspace → `sourcePath`), testando as extensões
`.sql`, `.pks`, `.pkb`, `.prc`, `.fnc`, `.trg`, `.tpb` e `.bdy`. A extensão **não**
usa `ut_file_mapper.build_file_mappings()` (que espera uma lista de **arquivos**, não
a pasta `sourcePath`).

## Notas importantes

- **Packages → `PACKAGE BODY`**: a cobertura é coletada no **corpo** do package,
  não na spec.
- **Validação dinâmica**: antes de rodar cobertura, a extensão verifica se
  `UT_COVERAGE_COBERTURA_REPORTER` existe no banco. Se não, cobertura é pulada
  com aviso — a execução nunca é bloqueada.

## Cobertura de views (objetos SQL)

O `DBMS_PROFILER`/`DBMS_PLSQL_CODE_COVERAGE` só instrumenta PL/SQL — views não
têm linhas para perfilar e não entram no relatório Cobertura. Opções:

1. **Rastreio via `V$SQL`** (`utplsql.sqlCoverageEnabled: true`): após o run a
   extensão consulta `V$SQL` e marca cada view como **executada** (100%, verde)
   ou **não executada** (0%, vermelho). O arquivo recebe gutter **por linha**
   (todas verdes ou todas vermelhas — cobertura booleana, não há hits reais
   por linha em SQL). Requer `GRANT SELECT ON V$SQL`.
   Best-effort: falha de acesso/timeout não quebra a execução.
2. **Instrumentação manual**: para granularidade linha-a-linha, converta a
   query em um **package function** que retorna a view/cursor — o corpo entra
   na cobertura PL/SQL normal.

## Depurando o mapeamento de cobertura

Não há Output channel dedicado nem log por objeto. A extensão só anexa uma
mensagem genérica ao output da execução quando **nenhum** arquivo pôde ser
mapeado:

```
[cobertura] nenhum arquivo mapeado. Ajuste "utplsql.sourcePath" para a pasta do código-fonte.
```

Quando o mapeamento funciona, o resultado aparece no editor (gutters
verdes/vermelhos) e na aba **Test Coverage**.
