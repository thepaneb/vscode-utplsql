# Changelog

## 0.2.4 

- Inclusão de instruções para funcionamento da Cobertura com o `utPLSQL-cli`.
- Inclusão dos GRANTS necessários para funcionamento do `utPLSQL` em modo DBA.

## 0.2.3

- Inclusão do logotipo


## 0.2.2

- Cobertura mapeada aos arquivos-fonte (gutters / Sonar): a extensão passa `-owner`
  (derivado da conexão, ou `utplsql.coverageOwner`) + regex/type_mapping configuráveis
  (`utplsql.coverageSourceArgs`) para a estrutura `sourcePath/<tipo>/<nome>.sql`.
- Removido o `-test_path` da cobertura (com a estrutura tipada ele zerava o relatório).

## 0.2.1

- Publicada no Marketplace.

## 0.2.0

- Lógica de parsing isolada em módulos puros (`suiteParser`, `junit`, `cobertura`) sem dependência de `vscode`.
- Testes unitários com `node --test` (parsers) e testes de integração com `@vscode/test-cli`.

## 0.1.0

- Descoberta de suites/tests via annotations `%suite` / `%test`.
- Integração com o Test Explorer (Test Results view).
- Menu de contexto no Explorer (pasta e arquivos `.pks`/`.pkb`) e no editor.
- Execução via `utPLSQL-cli` com parse do relatório JUnit.
- Cobertura visual (gutters + percentual por arquivo) via Test Coverage API,
  alimentada pelo reporter Cobertura do utPLSQL.
