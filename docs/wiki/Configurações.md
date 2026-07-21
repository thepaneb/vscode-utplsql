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
| `utplsql.cliHome` | `""` | Raiz do utPLSQL-cli. Vazio = derivado do `cliPath`. Só no modo `java`. |

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
