# Configurações (settings)

Todas as settings da extensão, com prefixo `utplsql.`. Configure no
`settings.json` do usuário ou do workspace (`.vscode/settings.json`).

## Conexão e CLI

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.connection` | `""` | Conexão Oracle. Deixe vazio e use `UTPLSQL_CONN` para não gravar senha. |
| `utplsql.cliPath` | `utplsql` | Caminho do utPLSQL-cli. Ex.: `C:\tools\utPLSQL-cli\bin\utplsql.bat` |

## Cobertura

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.sourcePath` | `install` | Pasta do código de produção para mapear cobertura. |
| `utplsql.coverageOwner` | `""` | Schema dos objetos cobertos. Vazio = usuário da conexão. |
| `utplsql.coverageSourceArgs` | (regex) | Args CLI que mapeiam objetos aos arquivos. Veja [Cobertura](Cobertura). |

## Descoberta de testes

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs para descobrir specs. Use `["**/*.sql"]` se seus testes estão em `.sql`. |

## Invocação

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.invocation` | `launcher` | `launcher` (via .bat/script) ou `java` (JVM direto). Veja [Modo de invocação](Modo-de-invocação). |
| `utplsql.javaPath` | `java` | Executável Java. Só no modo `java`. |
| `utplsql.javaArgs` | `["-Xmx256m"]` | Flags JVM no modo `java` (ex.: `["-Xmx512m", "-Xms128m"]`). Inseridas antes de `-cp`. |
| `utplsql.cliHome` | `""` | Raiz do utPLSQL-cli. Vazio = derivado do `cliPath`. Só no modo `java`. |
| `utplsql.runnerMode` | `auto` | Modo de execução: `auto` (Oracle direto via node-oracledb, fallback CLI), `cli` (sempre CLI), `oracle` (sempre Oracle direto). |

## Pool do Oracle runner

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.oraclePoolMin` | `2` | Conexões mínimas mantidas no pool (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Conexões máximas no pool. |
| `utplsql.oraclePoolIncrement` | `1` | Incremento ao expandir o pool. |
| `utplsql.oraclePoolPingInterval` | `60` | Segundos entre health checks das conexões ociosas do pool. `0` = ping a cada checkout. |

O pool é criado **lazy** na primeira execução Oracle, é recriado quando a
conexão muda e fechado ao desativar a extensão. Veja [Execução Oracle direta](Execução-Oracle-direta).

## Flags do CLI

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.timeoutMinutes` | `60` | Timeout em minutos. Flag `-t` só é enviada se `!== 60`. |
| `utplsql.dbmsOutput` | `false` | Habilita `DBMS_OUTPUT`. Flag `-D` só quando `true`. |
| `utplsql.quiet` | `false` | Suprime logs. Flag `-q` só quando `true`. |
| `utplsql.failureExitCode` | `1` | Código de saída em falha. Flag só se `!== 1`. `0` = sempre sucesso. |
| `utplsql.extraRunArgs` | `[]` | Argumentos extras para `utplsql run`. |

## Reporters

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.additionalReporters` | `[]` | Reporters extras incluídos em toda execução. Veja [Reporters](Reporters). |

## Interface (CodeLens, Status Bar, Decorações)

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.codeLens.enabled` | `true` | Botões CodeLens Run/Run with Coverage sobre `%suite` e `%test`. |
| `utplsql.statusBar.enabled` | `true` | Indicador de status na barra de status (pass/fail + duração). |
| `utplsql.decorations.enabled` | `true` | Ícones inline ✓/✗/⚠ no editor após execução. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Exibe erros de compilação PL/SQL como sublinhados e no Problems Panel (modo CLI). |
| `utplsql.setupDiagnostics.enabled` | `true` | Exibe diagnósticos de setup (CLI, conexão, grants, versão) e de integridade da instalação utPLSQL (objetos inválidos, quick-fix "Recompilar UT3") com quick-fix. |

## Organização da árvore

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.organization` | `file` | `file` (por caminho) ou `schema` (Schema > Package > Suite > Test). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Padrão glob para extrair schema do caminho. Use `{schema}` como placeholder. |

No modo `schema` com `runnerMode` `auto`/`oracle` e conexão configurada (sem
prompt), o refresh também descobre suites direto do banco (`ALL_OBJECTS`/
`ALL_SOURCE`) para schemas cujos arquivos não estão no workspace — os schemas
consultados são os diretórios abaixo da base do padrão (ex.: `db/*`) e os
schemas das suites locais. Veja [Organização da árvore](Organização-da-árvore).

## Hierarquia de settings

O VSCode aplica settings nesta ordem (a última sobrescreve):

1. **Default** — valor padrão da extensão
2. **User** — `%APPDATA%/Code/User/settings.json`
3. **Workspace** — `.vscode/settings.json` do projeto
4. **Workspace Folder** — quando multi-root

Recomendação: coloque `cliPath`, `sourcePath` e `coverageSourceArgs` no
**workspace** (variam por projeto). Deixe `connection` **fora** do
settings.json (use env var).

## Exemplo completo

```jsonc
// .vscode/settings.json
{
  // CLI e cobertura (específicos do projeto)
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.sourcePath": "install",
  "utplsql.invocation": "java",
  "utplsql.coverageSourceArgs": [
    "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
    "-type_subexpression=1",
    "-name_subexpression=2",
    "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE"
  ],

  // Conexão: NÃO coloque aqui — use env var UTPLSQL_CONN
  // "utplsql.connection": "DEV/senha@//host:1521/XEPDB1"  ← EVITE

  // Reporters extras (opcional)
  "utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"],

  // Flags do CLI (opcional)
  "utplsql.timeoutMinutes": 120,
  "utplsql.dbmsOutput": true
}
```
