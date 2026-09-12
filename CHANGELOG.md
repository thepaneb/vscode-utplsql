# Changelog

## 0.12.0

- **Execução de scripts SQL contra perfis (PRD-62)**: rode scripts
  SQL/PL/SQL (migrações, seeds, setup) contra um perfil de conexão via
  `utPLSQL: Executar script` (editor), `utPLSQL: Executar arquivo de script`
  e `utPLSQL: Executar pasta de scripts` (Explorer) — QuickPick de conexão
  após a invocação, saída por statement no OutputChannel "utPLSQL Script".
  Perfis ganham `description` (exibida no picker) e `charset`
  (`utf8`/`latin1`/`win1252`, para ler arquivos no encoding correto).
  Settings `utplsql.scriptRunner.*` (`stopOnError`, `autoCommit`,
  `filePattern`, `dbmsOutput`, `timeoutSeconds`).

- **Perfis de conexão (PRD-34)**: salve e alterne entre múltiplas conexões
  Oracle (`utplsql.profiles` + `utplsql.activeProfile`) com configurações por
  perfil (`sourcePath`, `coverageOwner`, `includePatterns`, além de
  `description` e `charset`).
  Comandos: Switch/New/Manage Connection Profile e Import do SQL Developer.
  Status bar mostra o perfil ativo; sem perfil, comportamento inalterado.
- **Function Coverage derivada (PRD-48)**: a view Test Coverage agora mostra
  `% de declarações` por arquivo — declarações `PROCEDURE`/`FUNCTION` são
  derivadas do fonte (hits por escopo) e emitidas como `DeclarationCoverage`
  junto dos gutters por linha. Sem regressão nos percentuais existentes.
- **Cobertura de views (PRD-12)**: `type_mapping` default inclui `views=VIEW`
  (views aparecem no relatório com 0 hits); novo setting
  `utplsql.sqlCoverageEnabled` rastreia views executadas via `V$SQL`
  (cobertura booleana, off por default). Guia em `docs/wiki/Cobertura.md`.
- **PL/SQL Debugger (PRD-33)**: debug de testes utPLSQL via `DBMS_DEBUG` —
  breakpoints em `.pks`/`.pkb`, Step Into/Over/Out, Continue/Stop e inspeção
  de variáveis locais (Debug Adapter `type: "utplsql"` + comando
  `utplsql.debugTest`). Requer `node-oracledb` + grants `DBMS_DEBUG`/
  `DEBUG CONNECT SESSION`. Settings `utplsql.debugger.*`. Integração com
  banco real pendente de validação (suíte `describeDB`).
- **Internacionalização (PRD-49)**: setting `utplsql.language`
  (`auto` | 24 locais — 15 nativos do VSCode + 9 da comunidade) para as
  mensagens de runtime: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr,
  it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi; títulos de
  comandos via `package.nls` (seguem o idioma do editor). `auto` em editor
  `pt*` reproduz as mensagens atuais.

## 0.11.0

- **Correções de primeira execução de cobertura no Windows (launcher CLI)**:
  - *Escaping de args no cmd.exe*: o branch Windows de `runCli` passava os args
    crus para `cmd.exe /d /c`, e metacaracteres (`|`, `(`, `)`, `&` — comuns em
    `-regex_expression` e em `-type_mapping` com espaço) eram interpretados pelo
    shell (ex.: `'view' não é reconhecido como um comando`), quebrando o run com
    cobertura no modo CLI. Agora, quando algum arg precisa, a invocação usa um
    `.cmd` intermediário com escaping de batch (`%` → `%%`, aspas ao redor de
    args fora do conjunto seguro) — validado E2E no cmd.exe real com os args de
    cobertura.
  - *`callTimeout` vazado em conexões do pool*: `findInvalidUt3Objects` (5s) e
    `discoverSchemaFromDb` (10s) setavam `conn.callTimeout` e devolviam a
    conexão ao pool com o timeout ativo (o node-oracledb não reseta). A
    primeira execução após ativar a extensão herdava os 5s → `NJS-123: call
    timeout of 5000 ms exceeded` no meio do run → fallback para CLI. Ambos
    restauram o timeout anterior no `finally`, e `acquireRunnerConnections`
    zera `callTimeout` ao check-out.
- **Atualização de dependências major** (PRD-46): `oracledb` 6.10.0 → **7.0.1**
  (+ `@types/oracledb` 7.0.2), `fast-xml-parser` 4.5.7 → **5.11.1**, `iconv-lite`
  → **0.7.3** e `typescript` → **7.0.2** (compilador nativo) — sem mudanças de
  código além do `.vscodeignore`. A v5 do fast-xml-parser trouxe transitivas
  (`@nodable/entities`, `anynum`, `fast-xml-builder`, `is-unsafe`,
  `path-expression-matcher`, `xml-naming`) que já vão embutidas no bundle
  esbuild — podadas do VSIX. `oracledb/plugins` (auth IAM/OCI/Azure) e docs
  não-licença também podados (extensão usa só conexão user/pass). VSIX: 153 →
  151 arquivos, 952 → 989 KB (+3.9%), thin-only. `engines.node` segue `>= 22`
  (piso do host do VSCode) e `@types/node` foi alinhado ao piso (`^22`) — o
  bundle executa no Node 22 do host. Node 26 no toolchain fica para a PRD-47
  (pós-LTS, out/2026). Validado: 350 unit, coverage 89.65%, 26 integração com
  banco real (pool/streaming/cobertura/PRD-43), `vsce ls` sem `.node`.
- **Descoberta de suites via banco no modo schema** (PRD-43): com `organization: schema`
  e `runnerMode` Oracle (`auto`/`oracle`), o refresh agora complementa a descoberta de
  arquivos consultando `ALL_OBJECTS`/`ALL_SOURCE` (`discoverSchemaFromDb` em
  `discovery.ts`) — útil para shared installs, CI e ambientes sem o código `.pks`
  local. Schemas candidatos vêm da união dos schemas das suites locais com os
  diretórios abaixo da base do `organization.schemaPattern` (`discoverSchemasFromFolders`,
  ex.: `db/*`). Prioridade filesystem no merge (match por `packageName`, case-insensitive).
  Packages `UT_*` (framework) são ignorados; `FETCH FIRST 10000 ROWS` + `console.warn`
  de truncamento; `callTimeout` de 10s; fallback silencioso quando `ALL_SOURCE` é
  inacessível ou o Oracle está indisponível (`import('oracledb')` falha → `[]`). Pool do
  PRD-38 reutilizado; `resolveConnectionNoPrompt` (refresh não pergunta conexão).
  Suites descobertas via DB usam URI virtual `utplsql-db:/SCHEMA/PKG.pks`
  (`SuiteFile.dbSchema`); limitação documentada: essas suites não têm CodeLens,
  Decorations nem jump to failure (só execução). +16 testes unitários; +3 testes de
  integração com banco real, incluindo refresh E2E em modo schema.
- **Verificação de instalação do utPLSQL na ativação** (PRD-41): o `SetupValidator`
  agora valida a integridade do schema UT3 (objetos inválidos em `ALL_OBJECTS` para
  `PACKAGE`/`TYPE`/`PACKAGE BODY`) na ativação e no comando `Validar configuração`.
  Best-effort: async, sem prompt de conexão (`resolveConnectionNoPrompt`), timeout de
  5s (`callTimeout`), `try/catch` silencioso, pool do PRD-38 reutilizado
  (`findInvalidUt3Objects` em `oracleRunner.ts`). Diagnostic `UTPLSQL_INVALID_OBJECTS`
  (source "utPLSQL Setup", Warning) com quick-fix **"Recompilar UT3"**
  (`utplsql.recompileUt3` → `DBMS_UTILITY.COMPILE_SCHEMA`), que re-verifica e limpa o
  diagnostic se resolvido. Gates: `setupDiagnosticsEnabled: false` e `runnerMode: cli`
  suprimem a verificação. +14 testes unitários; provider de Code Actions também
  registrado para o scheme `utplsql-setup`.
- **Bundling com esbuild + poda do node-oracledb no VSIX** (PRD-45): `main` agora
  aponta para `dist/extension.js` (bundle único, `fast-xml-parser`/`iconv-lite`
  embutidos; `vscode` e `oracledb` externos — `await import('oracledb')` preservado).
  Novo script `npm run bundle` (`esbuild.config.mjs`); `package` e `vscode:prepublish`
  encadeiam `compile && bundle`; `pretest:integration` também. `.vscodeignore` exclui
  `out/**`, os binários nativos (`oracledb/build/**`), `examples/`/`package/` do
  oracledb e as deps puras já embutidas. VSIX: 281 → 153 arquivos, ~2.1 MB → 949 KB,
  **warning de performance do vsce eliminado**. Validado: integração com banco real
  (thin mode **sem** binários nativos), fallback CLI com oracledb removido, `vsce ls`
  sem `.node` e sem `out/`.
- **Melhorias nos workflows CI/CD** (PRD-21): `ci.yml` e `publish.yml` unificados em
  `actions/checkout@v7` + `actions/setup-node@v7`. Passos redundantes de compile/lint
  removidos do CI (`npm test` já dispara `pretest:unit`). Publish usa `npm run package`
  e `npm run publish` em vez de `npx @vscode/vsce`; novo `scripts/publish.cjs` mantém o
  bloqueio local (publicação continua exclusiva via release) e bypassa quando
  `CI=true` (setado pelo GitHub Actions). `.vscodeignore` passa a excluir `install/**`
  (pasta local gitignored, impedia o `vsce package` quando continha `.env`).
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
