# Changelog

## 0.7.0

- Reporters dinâmicos (PRD-10):
  - Novo módulo puro `cliReporters.ts` com `parseReportersOutput` e `listReporters`.
  - Validação dinâmica antes da cobertura: se `UT_COVERAGE_COBERTURA_REPORTER`
    não existir no banco, cobertura é pulada com aviso (nunca bloqueia execução).
  - Nova setting `utplsql.additionalReporters` para reporters extras fixos.
  - Novo comando `utplsql.selectReporter` com QuickPick dos reporters disponíveis
    no banco; o selecionado é usado na execução seguinte e descartado após.
- README atualizado: seção Reporters, comandos e settings faltantes documentados.

## 0.6.0

- Infraestrutura de testes com Oracle real (PRD-13, PRD-14, PRD-15):
  - Container Oracle 23ai Free com utPLSQL v3.2.3 instalado no schema UT3.
  - Schema utplsql_test com 3 packages de teste (test_betwnvarchar, test_math, test_employees).
  - Script `src/test/integration/fixtures/setup.sh` para configurar todo o ambiente.
  - Testes de integração expandidos em `extension.test.ts` com dependência condicional
    ao banco real via `UTPLSQL_CONN`.

## 0.5.3

- Correção no discovery: `RelativePattern` removido, `findFiles` agora usa glob simples
  `**/*.pks` compatível com Windows.

## 0.5.2

- Correção no discovery: padrão glob `**/*.pks` agora busca recursivamente em subpastas.
- runForFolder/runForUri aguardam refresh concluir antes de filtrar.

## 0.5.1

- Correção no filtro de pastas para Windows (trailing separator + race condition em refresh).

## 0.5.0

- Progresso notificável + cancelamento (PRD-05): barra de progresso com contagem,
  `utplsql.cancelRun` para abortar execução.
- Suporte a multi-root workspace (PRD-06): descoberta de suites escopo por pasta,
  cobertura resolve arquivos na pasta correta, `ItemMeta` com campo `folder`.
- Settings avançados do CLI (PRD-08): `timeoutMinutes`, `dbmsOutput`, `quiet`,
  `failureExitCode`.
- Diagnóstico `utplsql info` (PRD-09): exibe versões CLI/API/DB com `semverLt`.
- Filtragem URI→suites extraída para `matching.ts` com 12 testes unitários.
- Cobertura de `src/` em 76% (+110 testes, 0 falhas).
- Testes funcionam no Test Explorer do VSCode (setup independente de `--require`).

## 0.4.0

- Pipeline CI + Linter com Biome (PRD-03): workflow `ci.yml`, scripts `lint`/`format`, auto-formatação de todo `src/`.
- Expansão da cobertura de testes (PRD-04): 5 novos arquivos de teste unitário, `applyResults` com fallback via `appendOutput`, infra de mock para `vscode`.
- Upgrade Node 24 + TypeScript 6.0 (PRD-07): `.nvmrc`, `@types/node ^24`, `typescript ^6.0.3`, `engines.node ^24`.

## 0.3.0

- Novo modo de invocação **`java`** (`utplsql.invocation`): chama a JVM direto
  (`java -cp <home>/etc;<home>/lib/* org.utplsql.cli.Cli`) **sem shell**, em vez do
  launcher `utplsql.bat`. Evita o `cmd` do Windows e o tratamento de metacaracteres
  (`^`, `|`) — argumentos de regex em `coverageSourceArgs` passam literais.
- Settings novas: `utplsql.javaPath` (executável do Java) e `utplsql.cliHome`
  (raiz do utPLSQL-cli; vazio = derivado do `cliPath`). O modo `launcher` segue padrão.

## 0.2.5 

- Refinamento das instruções.

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
