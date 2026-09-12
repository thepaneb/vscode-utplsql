# PRD-64 — Migração para Oracle-Only: eliminação do utPLSQL-cli e Java

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber |
| Data | 2026-09-09 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/runner.ts`, `src/config.ts`, `src/quickfix.ts`, `src/extension.ts`, `src/types.ts`, `src/connectionProfiles.ts`, `src/i18nLocales.ts`, `src/cli.ts`, `src/cliInfo.ts`, `src/cliReporters.ts`, `src/cliEncoding.ts`, `src/invocation.ts`, `src/compilationDiagnostics.ts`, `package.json` + ~11 testes + ~40 documentos |
| Esforço estimado | 3–5 dias |
| Complexidade | Alta |

## 1. Resumo

Eliminar toda dependência do utPLSQL-cli e Java, tornando `oracledb` a única forma de interagir com o Oracle para execução de testes, descoberta, cobertura e diagnósticos. O framework utPLSQL fornece APIs PL/SQL completas (`ut_runner.get_suites_info`, `ut_runner.get_reporters_list`, `ut_runner.version`, `ut_file_mapper.build_file_mappings`) que substituem integralmente o CLI. A migração remove ~1.500 linhas de código, 11 arquivos fonte, 1 dependência npm (`iconv-lite`) e simplifica drasticamente a configuração da extensão.

## 2. Contexto e problema

A extensão possui dois modos de execução coexistentes desde a v0.1.0: CLI (utPLSQL-cli + Java) e Oracle direto (node-oracledb). O modo CLI requer instalação externa do utPLSQL-cli e Java, gera complexidade de spawn de processos (`.cmd` no Windows, metacaracteres, codepages), e mantém ~1.500 linhas de código auxiliar que duplicam funcionalidades já disponíveis via PL/SQL direto.

O modo Oracle direto (`oracleRunner.ts`) já é maduro: executa testes via `ut_runner.run()`, faz streaming em tempo real via `UT_OUTPUT_BUFFER_TMP`, suporta cobertura via `ut_coverage_cobertura_reporter`, e realiza descoberta de schema via `ALL_OBJECTS`/`ALL_SOURCE`. O framework utPLSQL expõe APIs adicionais que permitem substituir completamente o CLI:

| Funcionalidade CLI | API PL/SQL equivalente |
|---|---|
| `utplsql info` (versão) | `SELECT ut_runner.version() FROM dual` |
| `utplsql reporters` | `SELECT * FROM TABLE(ut_runner.get_reporters_list())` |
| `-source_path`, `-owner`, `-regex_expression` | `ut_file_mapper.build_file_mappings()` via `a_source_file_mappings` |
| `-t=<timeout>` | `Promise.race` com timeout no JS |
| `-D` (DBMS_OUTPUT) | `DBMS_OUTPUT.GET_LINES` na sessão de polling |
| Compilation diagnostics (parse stdout) | `DBMS_UTILITY.FORMAT_ERROR_STACK` ou `ALTER PACKAGE COMPILE` |

## 3. Objetivos / Não-objetivos

**Objetivos**
- Remover toda a infraestrutura CLI: spawn de processos, codepage Windows, invocação Java
- Remover `oracledb` de `optionalDependencies` — tornar dependência obrigatória (ou erro claro na ativação)
- Portar funcionalidades CLI faltantes no modo Oracle: extra reporters, version checking, timeout, DBMS_OUTPUT, compilation diagnostics
- Usar `ut_file_mapper.build_file_mappings()` do framework para mapeamento de cobertura (substituir heurística `mapDbPathsToFiles`)
- Usar `ut_runner.get_reporters_list()` para verificar disponibilidade de reporters antes de executar
- Simplificar configuração: remover 12+ settings CLI
- Atualizar toda documentação: README, wiki, docs funcionais, diagramas, AGENTS.md

**Não-objetivos**
- Alterar a interface do Test Explorer ou UX visual
- Modificar a lógica de descoberta workspace (`suiteParser.ts`)
- Alterar o sistema de profiles de conexão
- Modificar o debugger (`debugger.ts`) — já é Oracle-nativo
- Alterar o sistema de i18n (apenas remover chaves CLI)
- Remover o modo Oracle (já existente)

## 4. Requisitos

### RF1 — Função `getOracleInfo(conn)` para versão

Substituir `getCliInfo()` por consulta direta ao banco:

```typescript
export async function getOracleInfo(conn: OracleConnection): Promise<{
  utVersion: string | null;
  dbVersion: string | null;
}> {
  const utResult = await conn.execute(
    `SELECT ut_runner.version() FROM dual`
  );
  const dbResult = await conn.execute(
    `SELECT version FROM product_component_version
     WHERE product LIKE '%Oracle%' AND ROWNUM = 1`
  );
  return {
    utVersion: extractScalar(utResult, 'UT_RUNNER.VERSION()'),
    dbVersion: extractScalar(dbResult, 'VERSION'),
  };
}
```

### RF2 — Função `listReportersOracle(conn)` para listar reporters

Substituir `listReporters()` (que executava `utplsql reporters <conn>`):

```typescript
export async function listReportersOracle(conn: OracleConnection): Promise<string[]> {
  const result = await conn.execute(
    `SELECT reporter_object_name FROM TABLE(ut_runner.get_reporters_list())`
  );
  return (result.rows ?? []).map(r => String(extractScalar(r)));
}
```

### RF3 — Função `checkReporterExists(conn, name)` para verificar reporter

```typescript
export async function checkReporterExists(
  conn: OracleConnection,
  reporterName: string,
): Promise<boolean> {
  const reporters = await listReportersOracle(conn);
  return reporters.some(r => r.toUpperCase() === reporterName.toUpperCase());
}
```

### RF4 — Cobertura com `a_source_file_mappings` via PL/SQL

Substituir a heurística `mapDbPathsToFiles()` por uso de `ut_file_mapper.build_file_mappings()` diretamente no PL/SQL:

```sql
BEGIN
  ut_runner.run(
    a_paths => ut_varchar2_list('SCHEMA:suite'),
    a_reporters => ut_reporters(ut_coverage_cobertura_reporter()),
    a_coverage_schemes => ut_varchar2_list('OWNER'),
    a_source_file_mappings => ut_file_mapper.build_file_mappings(
      a_object_owner => 'OWNER',
      a_file_paths => ut_varchar2_list('/src/pkg1.pkb', '/src/pkg2.pks'),
      a_regex_pattern => '.*[/\\](\w+)[/\\](\w+)\.sql$',
      a_object_owner_subexpression => 2,
      a_object_name_subexpression => 4
    )
  );
END;
```

### RF5 — Extra reporters via PL/SQL

Incluir `cfg.additionalReporters` na lista de reporters do PL/SQL call:

```typescript
const runners = ['ut_documentation_reporter()', 'ut_junit_reporter()'];
if (coverage) {
  runners.push('ut_coverage_cobertura_reporter()');
}
// Extra reporters do config
for (const r of cfg.additionalReporters) {
  const name = r.toLowerCase().replace(/\(\)$/, '');
  if (!runners.some(existing => existing.startsWith(name))) {
    runners.push(`${name}()`);
  }
}
```

### RF6 — Compilation diagnostics via Oracle

Substituir o parse de stdout do CLI por compilação direta:

```typescript
export async function checkCompilationErrors(
  conn: OracleConnection,
  schema: string,
): Promise<CompilationError[]> {
  const result = await conn.execute(
    `SELECT name, type, line, position, text
     FROM ALL_ERRORS
     WHERE owner = :schema
       AND type IN ('PACKAGE','PACKAGE BODY','FUNCTION','PROCEDURE','TRIGGER')
       AND attribute = 'ERROR'
     ORDER BY name, type, sequence`,
    { schema },
  );
  return (result.rows ?? []).map(r => ({
    name: String(r.NAME),
    type: String(r.TYPE),
    line: Number(r.LINE),
    position: Number(r.POSITION),
    text: String(r.TEXT),
  }));
}
```

### RF7 — Timeout configurável no modo Oracle

Adicionar suporte a timeout via `Promise.race`:

```typescript
const timeoutMs = cfg.timeoutMinutes * 60 * 1000;
const timeoutPromise = new Promise<boolean>((resolve) => {
  setTimeout(() => {
    conn1.break().catch(() => {});
    conn2.break().catch(() => {});
    resolve(true);
  }, timeoutMs);
});

while (true) {
  const done = await Promise.race([
    runnerPromise.then(() => true),
    cancelled.then(() => true),
    timeoutPromise,
    new Promise<boolean>((r) => setTimeout(() => r(false), 200)),
  ]);
  if (done) break;
}
```

### RF8 — DBMS_OUTPUT capture no modo Oracle

Capturar DBMS_OUTPUT durante o polling (opcional, quando `cfg.dbmsOutput` for `true`):

```typescript
if (cfg.dbmsOutput) {
  await conn2.execute(
    `DECLARE
       l_lines DBMS_OUTPUT.CHARARR;
       l_num   NUMBER;
     BEGIN
       DBMS_OUTPUT.GET_LINES(l_lines, l_num);
     END;`,
  );
  // Forward lines to run.appendOutput()
}
```

### RF9 — Remoção de arquivos CLI

Remover os seguintes arquivos fonte:
- `src/cli.ts` (270 linhas)
- `src/cliInfo.ts` (44 linhas)
- `src/cliReporters.ts` (30 linhas)
- `src/cliEncoding.ts` (59 linhas)
- `src/invocation.ts` (81 linhas)
- `src/compilationDiagnostics.ts` (178 linhas)

Remover testes:
- `src/test/unit/cli.test.ts`
- `src/test/unit/cliInfo.test.ts`
- `src/test/unit/cliReporters.test.ts`
- `src/test/unit/cliEncoding.test.ts`
- `src/test/unit/invocation.test.ts`

Remover dependência npm: `iconv-lite`

### RF10 — Simplificação de `config.ts`

Remover do interface `UtConfig`:
- `cliPath`, `invocation`, `javaPath`, `javaArgs`, `cliHome`
- `extraRunArgs`, `coverageSourceArgs`
- `failureExitCode`, `quiet`
- `runnerMode` (sempre Oracle)

Manter com uso:
- `sourcePath`, `coverageOwner` (usados por coverage)
- `additionalReporters` (usados via PL/SQL)
- `timeoutMinutes` (usado por timeout Oracle)
- `dbmsOutput` (usado por DBMS_OUTPUT capture)

### RF11 — Simplificação de `runner.ts`

Remover toda a branch CLI (linhas 179-316):
- Remover imports: `cli`, `cliInfo`, `cliReporters`, `compilationDiagnostics`, `invocation`
- Remover `getCliInfo()` call
- Remover `compilationDiagnostics.clear()`
- Remover construção de args CLI
- Remover `buildInvocation`, `runCli`, `applyResults` (file-based)
- Remover cleanup de `tmpDir`
- Manter: `executeRunOracle` + `applySqlCoverage`

### RF12 — Atualização de `quickfix.ts`

Remover:
- `checkCli()`, `UTPLSQL_NO_CLI`, `UTPLSQL_NO_JAVA` diagnostics
- `getCliInfo()` call e `semverLt()` check

Adicionar:
- Verificação de versão via `getOracleInfo()` (checar `version_compatibility_check`)

Manter:
- `validateUtplsqlInstall()`, `recompileUt3()`, connection check
- `UTPLSQL_BAD_CONN`, `UTPLSQL_NO_COVERAGE`, `UTPLSQL_INVALID_OBJECTS`

### RF13 — Atualização de `extension.ts`

Remover:
- Import e uso de `compilationDiagnostics`
- Command `utplsql.selectReporter` (usa `listReporters` CLI)
- Command `utplsql.showInfo` → reescrever usando `getOracleInfo()`
- Guard `if (cfg.runnerMode !== 'cli')` na discovery

### RF14 — Atualização de `types.ts` e `connectionProfiles.ts`

Remover de `ConnectionProfile`: `invocation`, `cliPath`, `cliHome`, `javaPath`
Remover de `mergeProfileConfig()`: linhas de merge desses campos

### RF15 — Settings `package.json`

Remover settings:
- `utplsql.cliPath`
- `utplsql.invocation`
- `utplsql.javaPath`
- `utplsql.javaArgs`
- `utplsql.cliHome`
- `utplsql.timeoutMinutes` (renomear para `utplsql.callTimeout`)
- `utplsql.quiet`
- `utplsql.failureExitCode`
- `utplsql.extraRunArgs`
- `utplsql.coverageSourceArgs`
- `utplsql.runnerMode`

Remover de `utplsql.profiles` items: `invocation`, `cliPath`, `cliHome`, `javaPath`

Atualizar descriptions de `compilationDiagnostics.enabled` e `setupDiagnostics.enabled`

### RF16 — Atualização de `i18nLocales.ts`

Remover chaves em todos os idiomas:
- `cli.notFound`
- `runner.infoCli`, `runner.cliInfo`, `runner.oldVersion`, `runner.oracleUnavailable`
- `runner.reporterListFailed`, `runner.reporterListNoCoverage`, `runner.reporterMissing`
- `runner.extraReporter`, `runner.invocationError`
- `quickfix.noCli`, `quickfix.noCliAction`, `quickfix.noJava`, `quickfix.noJavaAction`
- `quickfix.oracledbMissing`

### RF17 — Documentação

Atualizar (~40 arquivos):
- `README.md` + 23 traduções: Requirements, Configuration, Invocation mode, Coverage, Troubleshooting
- `AGENTS.md`: arquitetura, módulos, context keys
- `CONTRIBUTING.md`: requisitos de dev
- `SECURITY.md`: vetores de ataque
- Wiki (docs/wiki/): 16+ páginas
- Diagramas SVG: remover `diagram-cli.svg`, redesenhar `diagram-arquitetura.svg`
- Docs funcionais (docs/functional/): 8 arquivos
- PRDs: mover 5 PRDs CLI para deprecated
- `.github/PULL_REQUEST_TEMPLATE.md`

**Não-funcionais**
- RNF1 — `npm run compile && npm run lint` deve passar sem erros
- RNF2 — Cobertura de testes TypeScript (c8) não deve diminuir
- RNF3 — O VSIX resultante não deve conter `iconv-lite`
- RNF4 — A extensão deve funcionar sem Java instalado
- RNF5 — A extensão deve funcionar sem utPLSQL-cli instalado
- RNF6 — `oracledb` deve ser declarado como dependência (não mais optional)

## 5. Solução proposta

### 5.1 `oracleRunner.ts` — Novas funções e runner melhorado

Adicionar 4 novas funções:
- `getOracleInfo(conn)` — consultar `ut_runner.version()` e `product_component_version`
- `listReportersOracle(conn)` — consultar `ut_runner.get_reporters_list()`
- `checkReporterExists(conn, name)` — wrapper boolean
- `checkCompilationErrors(conn, schema)` — consultar `ALL_ERRORS`

Melhorar `executeRunOracle()`:
- Usar `a_coverage_schemes` no PL/SQL call
- Usar `a_source_file_mappings` com `ut_file_mapper.build_file_mappings()`
- Incluir extra reporters de `cfg.additionalReporters`
- Adicionar timeout via `Promise.race`
- Adicionar DBMS_OUTPUT capture (opcional)
- Verificar reporter de cobertura antes de executar

Remover `mapDbPathsToFiles()` (substituída por `ut_file_mapper`)

### 5.2 `runner.ts` — Simplificação para Oracle-only

- Remover toda a branch CLI (linhas 179-316)
- Remover imports CLI
- `executeRun()` sempre chama `executeRunOracle()`
- Adicionar version check via `getOracleInfo()` no início da execução
- Adicionar compilation diagnostics via `checkCompilationErrors()` no final

### 5.3 `config.ts` — Settings reduzidos

Interface `UtConfig` reduzida para:
```typescript
interface UtConfig {
  sourcePath: string;
  includePatterns: string[];
  coverageOwner: string;
  additionalReporters: string[];
  timeoutMinutes: number;
  dbmsOutput: boolean;
  oraclePoolMin: number;
  oraclePoolMax: number;
  oraclePoolIncrement: number;
  oraclePoolPingInterval: number;
  codeLensEnabled: boolean;
  statusBarEnabled: boolean;
  decorationsEnabled: boolean;
  compilationDiagnosticsEnabled: boolean;
  organization: 'file' | 'schema';
  organizationSchemaPattern: string;
  setupDiagnosticsEnabled: boolean;
  sqlCoverageEnabled: boolean;
  debuggerEnabled: boolean;
  debuggerStopOnException: boolean;
  debuggerTimeoutSeconds: number;
  language: ExtensionLocale;
}
```

### 5.4 `quickfix.ts` — Diagnósticos simplificados

- Remover `checkCli()`, `UTPLSQL_NO_CLI`, `UTPLSQL_NO_JAVA`
- Substituir `getCliInfo()` por `getOracleInfo()` para version check
- Manter: `validateUtplsqlInstall()`, `recompileUt3()`, connection diagnostics

### 5.5 `extension.ts` — Commands simplificados

- Remover `selectReporter` command
- Reescrever `showInfo` para usar `getOracleInfo()`
- Remover `compilationDiagnostics` subscription

### 5.6 Remoção de arquivos

Deletar 11 arquivos (6 fonte + 5 testes):
- `src/cli.ts`, `src/cliInfo.ts`, `src/cliReporters.ts`, `src/cliEncoding.ts`, `src/invocation.ts`, `src/compilationDiagnostics.ts`
- `src/test/unit/cli.test.ts`, `cliInfo.test.ts`, `cliReporters.test.ts`, `cliEncoding.test.ts`, `invocation.test.ts`

### 5.7 Documentação

Reescrever seções CLI em ~40 arquivos de documentação. Movimentizar PRDs CLI para `deprecated/`. Deletar `diagram-cli.svg`. Redesenhar `diagram-arquitetura.svg`.

## 6. Configuração

**Settings removidos** (11):
`cliPath`, `invocation`, `javaPath`, `javaArgs`, `cliHome`, `timeoutMinutes` (renomeado para `callTimeout`), `quiet`, `failureExitCode`, `extraRunArgs`, `coverageSourceArgs`, `runnerMode`

**Settings mantidos:**
`dbmsOutput`, `sourcePath`, `coverageOwner`, `additionalReporters`, `timeoutMinutes`/`callTimeout`, todos os oracle pool settings, todos os UI settings

**Commands modificados:**
- `utplsql.showInfo` → mostra versão utPLSQL + Oracle DB (sem CLI)
- `utplsql.selectReporter` → removido

**Profile properties removidos**: `invocation`, `cliPath`, `cliHome`, `javaPath`

## 7. Plano de testes

- **Unitários**: Criar testes para `getOracleInfo`, `listReportersOracle`, `checkReporterExists`, `checkCompilationErrors`. Atualizar testes existentes de `runner.ts`, `quickfix.ts`, `config.ts`
- **Integração**: Testar execução completa de testes via Oracle-only com banco real. Verificar que coverage, reporters, e version check funcionam
- **Validação manual**:
  - Ativar extensão sem Java/CLI instalado → deve funcionar
  - Executar suite de testes → resultado correto no Test Explorer
  - Verificar coverage → cobertura mapeada corretamente
  - Rodar `Show Info` → versão utPLSQL + Oracle exibida
  - Verificar diagnostics → erros de compilação aparecem no Problems Panel
  - Verificar timeout → execução cancelada após timeout

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `ut_file_mapper.build_file_mappings()` pode não existir em instalações antigas | Fallback: manter `mapDbPathsToFiles()` como backup, logar warning |
| Usuários com `runnerMode: cli` perdem funcionalidade | Documentar migration guide no CHANGELOG; mensagem na ativação |
| Compilation diagnostics via `ALL_ERRORS` pode não ter a mesma granularidade | Comparar output com CLI; `ALL_ERRORS` tem mais dados (position, sequence) |
| `oracledb` obrigatório pode quebrar para quem não tem Oracle Access | Mensagem clara na ativação: "Esta extensão requer node-oracledb e acesso a Oracle" |
| PRDs referenciados ficam órfãos | Mover para `deprecated/` com nota de substituição |
| ~40 arquivos de documentação para atualizar | Priorizar README + wiki; docs funcionais podem ser atualizadas em PR separado |

## 9. Rollout

- **Release alvo**: 0.12.0 (minor — breaking change documentado)
- **Estratégia**: Publicar como minor com nota de breaking change no CHANGELOG
- **BREAKING CHANGE**: Settings `cliPath`, `invocation`, `javaPath`, `javaArgs`, `cliHome`, `runnerMode` e"profile.*.invocation", "profile.*.cliPath", "profile.*.cliHome", "profile.*.javaPath" são ignorados (settings removidos)
- **CHANGELOG.md**: Entrada no topo documentando remoção de CLI e novas funcionalidades Oracle
- **Migration guide**: Incluir na seção BREAKING CHANGES do CHANGELOG

## 10. Critérios de aceite

- [ ] `npm run compile && npm run lint` passa sem erros
- [ ] `npm run test:unit` passa
- [ ] `npm run test:coverage` passa com thresholds mantidos
- [ ] Arquivos `cli.ts`, `cliInfo.ts`, `cliReporters.ts`, `cliEncoding.ts`, `invocation.ts`, `compilationDiagnostics.ts` deletados
- [ ] 5 arquivos de teste CLI deletados
- [ ] `iconv-lite` removido de `package.json` e `node_modules`
- [ ] `oracledb` movido de `optionalDependencies` para `dependencies`
- [ ] `runnerMode` setting removido
- [ ] 11+ settings CLI removidos do `package.json`
- [ ] `getOracleInfo()` retorna versão utPLSQL e Oracle DB
- [ ] `listReportersOracle()` retorna lista de reporters
- [ ] Cobertura usa `a_source_file_mappings` via PL/SQL
- [ ] Extra reporters incluídos no PL/SQL call
- [ ] Timeout funciona via `Promise.race`
- [ ] Compilation diagnostics via `ALL_ERRORS`
- [ ] Extensão ativa sem Java/CLI instalado
- [ ] README.md atualizado (Requirements, Configuration, Coverage, Troubleshooting)
- [ ] AGENTS.md atualizado
- [ ] Wiki atualizada (16+ páginas)
- [ ] Diagrama SVG redesenhado
- [ ] PRDs CLI movidos para deprecated

## 11. Questões em aberto

- `timeoutMinutes` deve ser renomeado para `callTimeout` (em ms) ou mantido como minutos?
- `dbmsOutput` deve ser `true` por padrão no Oracle-only ou manter `false`?
- `quiet` e `failureExitCode` devem ser removidos ou mantidos como noop com warning?
- `compilationDiagnostics.enabled` deve ser renomeado (não é mais CLI-specific)?
- O PRD-61 (auto-provisionamento CLI) deve ser movido para deprecated ou deletado?
- Docs de análise (`analise.md`, `analise-comparativa.md`) devem ser mantidos como histórico?
- LinkedIn post #10 (diagnosticos-setup) deve ser atualizado?
