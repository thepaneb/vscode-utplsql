# Changelog

## 0.11.0

- **Matching resultado→teste como função pura** (PRD-44): `buildMatchIndex` e
  `findByNameOnly` extraídos para `matching.ts` como funções puras (`MatchEntry[]`
  → `Map`/item), sem dependência de `TestStateManager`/`WeakMap`. `applyResultsFromCases`
  em `results.ts` constrói `entries` antes do loop de matching (nenhum acesso a
  `state.getMeta()` dentro do loop). Sem mudança de comportamento. +10 testes unitários
  em `matching.test.ts`; cobertura de `matching.ts` em 100%.

## 0.10.0

- **Connection pooling no Oracle runner** (PRD-38): pool lazy gerenciado por `ensurePool`
  (keyed pela connection string — recriado quando a conexão muda), fechado no
  `deactivate()` com drenagem de 10s. `acquireRunnerConnections` usa `pool.getConnection()`
  com fallback para conexão raw quando o pool não está disponível. `oracledb.outFormat =
  OUT_FORMAT_OBJECT` global, com acessos de rows por propriedade nomeada (`TABLE_OWNER`,
  `MESSAGE_ID`, `TEXT`). `poolPingInterval` valida conexões ociosas no checkout (ping interno
  do Thin driver — sem `SELECT 1 FROM DUAL` explícito). Novas settings:
  `utplsql.oraclePoolMin` (2), `utplsql.oraclePoolMax` (10), `utplsql.oraclePoolIncrement` (1),
  `utplsql.oraclePoolPingInterval` (60). Testes unitários do pool + teste de integração com
  banco real (reuso do pool entre execuções).
- **Refatoração: código compartilhado entre runners** (PRD-39): novo módulo `src/results.ts`
  com as funções canônicas `applyResultsFromCases`, `applyCoverageFromXml`, `countResults` e
  `resolveStackFrameToUri` (antes duplicadas entre `runner.ts` e `oracleRunner.ts`).
  `runner.ts` mantém wrappers CLI (leitura de arquivo + setup diagnostics); `oracleRunner.ts`
  importa de `results.ts`. `matching.ts` permanece puro. Comportamento unificado: o modo CLI
  ganha "Go to Error" (stackFrames → `message.location`) e o modo Oracle ganha o aviso de
  testes sem match no JUnit. −380/+439 linhas, 7 testes unitários novos, cobertura 72.6%.
- **Refatoração: Options Object no Oracle runner** (PRD-40): `executeRunOracle` passa a receber
  `OracleRunOptions` (interface tipada com JSDoc) + `token` — os 11 parâmetros posicionais
  viram um objeto com desestruturação preservando os nomes locais. Call site em `runner.ts`
  constrói o objeto. Sem mudança de comportamento.
- **SuiteParser: annotations estendidas** (PRD-42): `parseSuiteText` passa a extrair
  `%disabled` (suite/teste), `%throws(-NNNNN)` (`expectedError`, valor absoluto),
  `%tags(a,b)` (`tags[]`), `%displayname(name)` (sobrescreve a descrição na árvore) e os
  lifecycle hooks `%beforeall`/`%beforeeach`/`%aftereach`/`%afterall` (booleanos na suíte).
  `discoverWorkspace` pula suites e testes desabilitados. Annotations case-insensitive;
  bloco no header da suíte aplica à suíte, bloco entre `%test` e procedure aplica ao teste.
- **Wiki: checklist manual de screenshots + diagramas** (PRD-23, reconciliada): automação de
  captura descartada (qualidade insatisfatória) em favor de checklist manual de 23 itens em
  `docs/wiki/images/README.md` + fixtures preservadas. Quatro diagramas vetoriais novos
  (`diagram-arquitetura`, `diagram-conexao`, `diagram-streaming`, `diagram-diagnosticos`)
  referenciados no README e na wiki. Script `npm run gen-diagram` reescrito em
  `scripts/gen-diagrams.cjs` (`@resvg/resvg-js`, cross-platform) — renderiza todos os SVGs
  para PNG de 1200px sem dependências de sistema.

## 0.9.0

- **Execução Oracle direta com streaming** (PRD-11): novo `runnerMode` (`auto`, `cli`, `oracle`). Modo `auto` conecta via `node-oracledb` (thin driver, opcional) e faz polling incremental de `UT_OUTPUT_BUFFER_TMP` — cada teste aparece no Test Explorer em tempo real. Fallback automático para CLI se `oracledb` não estiver disponível. Suporte a shared install via `discoverUtplsqlSchema` (schema prefixado nas queries). Reporters (doc, JUnit, coverage) escrevem na mesma tabela VARCHAR2 — sem dependência de `UT_OUTPUT_CLOB_BUFFER_TMP`.
- **Flags JVM customizáveis** (PRD-17): nova setting `utplsql.javaArgs` (array, default `["-Xmx256m"]`). Flags inseridas antes de `-cp` no modo `java`. Permite `-Xmx`, `-Xms`, `-Dprop=value` sem editar código.
- **Compilation diagnostics** (PRD-28): `CompilationDiagnostics` captura erros `PLS-*`/`ORA-06550` do stdout do CLI e os exibe como sublinhados no editor e `vscode.Diagnostic` no Problems Panel (source: "utPLSQL Compilation"). Mapeia para arquivos `.pks`/`.pkb` via `resolveFiles`. Setting `utplsql.compilationDiagnostics.enabled` (default `true`).
- **Jump to failing assertion** (PRD-29): `parseStackFrames` extrai stack traces do JUnit XML (`at "SCHEMA.PKG"."PROC", line 42`), `resolveStackFrameToUri` mapeia para arquivo fonte. `message.location` populado nos `TestMessage`s de falha/erro — VSCode habilita botão "Go to Error" nativo. Frames internos (`UT_*`) filtrados automaticamente.
- **Schema-aware test organization** (PRD-30): nova setting `utplsql.organization` (`file` | `schema`, default `file`). Modo `schema` agrupa testes em hierarquia **Schema > Package > Suite > Test** no Test Explorer. `extractSchemaFromPath` extrai schema via regex glob configurável em `utplsql.organization.schemaPattern` (placeholder `{schema}`, default `db/{schema}/**`). Suporte a `UNKNOWN` para arquivos fora do padrão.
- **Quick-fix setup diagnostics** (PRD-32): `SetupValidator` valida CLI, Java, conexão e versão utPLSQL na ativação da extensão. `UtplsqlCodeActionProvider` oferece Code Actions (quick-fix) no Problems Panel: "Configurar utplsql.cliPath", "Reconfigurar conexão", "Copiar grants". Novos comandos: `utplsql.validateSetup`, `utplsql.configureConnection`, `utplsql.copyGrantsToClipboard`. Setting `utplsql.setupDiagnostics.enabled` (default `true`).
- **Cobertura TypeScript com c8** (PRD-37): script `test:coverage` com `c8`, `.c8rc` com thresholds 65/80/70 (lines/branches/functions), reporters `text` + `lcov` + `html`. Exclusão de `src/test/**` e `out/test/**`. Coverage atual: **69.4% lines** (241 testes).
- **Testes de cobertura expandidos**: `decorations.test.ts` +5 testes, `statusBar.test.ts` +5 testes, `discovery.test.ts` +3 testes, `compilationDiagnostics.test.ts` +1 teste. Infra de mock expandida em `vscode-stub.ts` (`StatusBarItem`, `__setMockFileError`, `__setVisibleEditors`, `Uri.joinPath`).
- **Documentação completa**: novas páginas wiki (Execução Oracle direta, Diagnósticos e quick-fix, Organização da árvore). FAQ +9 perguntas, Troubleshooting +4 entradas, README com diagrama dual CLI/Oracle, sidebar reorganizada.

## 0.8.0

- CodeLens Integration (PRD-24): botões Run/Run with Coverage sobre `%suite` e `%test` no editor.
- Status Bar Indicator (PRD-25): indicador com contagem pass/fail, duração, tooltip e barra de progresso.
- Inline Test Result Decorations (PRD-26): ícones ✓/✗/⚠ no editor após execução, overview ruler, tooltip com falha.
- Default Keybindings (PRD-27): 9 atalhos `Ctrl+Shift+U` + tecla para comandos frequentes.
- Smart Re-run Patterns (PRD-31): Rerun Last (`Ctrl+Shift+U L`), Run at Cursor (`Ctrl+Shift+U U`), Run Failed Only (`Ctrl+Shift+U X`).

## 0.7.2

- Correção: parse de reporters com formato utPLSQL 3.2.x — nomes com sufixo `:` e
  descrições indentadas não eram reconhecidos, desabilitando cobertura silenciosamente (PRD-36).
- Flag `coverageEnabled` impede diagnóstico falso de "GRANT EXECUTE" quando o reporter
  de cobertura não está disponível.
- Correção: relatório de cobertura não gerado no Windows com modo `launcher` (PRD-35):
  bypass do wrap duplo de quoting entre `quoteArg` e o Node.js no `cmd.exe`.
- Blindagem de testes para `quoteArg` com caminhos Windows, padrões regex e strings com `=`.
- Diagnóstico aprimorado em `applyCoverage` quando o arquivo de cobertura não existe.
- Log de argumentos CLI (sem connection) para facilitar debugging.

## 0.7.1

- Alinhamento `engines.node` com CI (PRD-18): requisito relaxado de `^24.0.0` para `>=20.0.0`.
- Normalização do sistema de PRDs (PRD-19): H1s padronizados (`# PRD-NN —`), tabela Concluídos
  ordenada numericamente, títulos alinhados com os arquivos fonte.
- Limpeza de dependências e configurações (PRD-20): `c8` removido (não utilizado), padrões
  de exclusão do Biome corrigidos (`/**` para diretórios), tipos `mocha` isolados no escopo
  de integração.
- Workflow da wiki sincroniza imagens (PRD-22): diretório `docs/wiki/images/` copiado
  automaticamente para o repositório wiki.

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
- Testes de integração para ambos os modos de invocação (PRD-16): cobertura de `launcher`
  e `java` nos testes com banco real, validação dos argumentos de linha de comando.

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

- Refatoração de `extension.ts` (PRD-02): módulos puros (`suiteParser`, `junit`, `cobertura`) sem dependência de `vscode`.
- Pipeline CI + Linter com Biome (PRD-03): workflow `ci.yml`, scripts `lint`/`format`, auto-formatação de todo `src/`.
- Expansão da cobertura de testes (PRD-04): 5 novos arquivos de teste unitário, `applyResults` com fallback via `appendOutput`, infra de mock para `vscode`.
- Upgrade Node 24 + TypeScript 6.0 (PRD-07): `.nvmrc`, `@types/node ^24`, `typescript ^6.0.3`, `engines.node ^24`.

## 0.3.0

- Novo modo de invocação **`java`** (PRD-01): chama a JVM direto
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
