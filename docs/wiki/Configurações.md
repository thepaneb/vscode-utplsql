# Configurações (settings)

Todas as settings da extensão, com prefixo `utplsql.`. Configure no
`settings.json` do usuário ou do workspace (`.vscode/settings.json`).

## Conexão

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.connection` | `""` | Conexão Oracle. Deixe vazio e use `UTPLSQL_CONN` para não gravar senha. |
| `utplsql.profiles` | `[]` | Perfis de conexão salvos (veja tabela de campos abaixo). |
| `utplsql.activeProfile` | `""` | Perfil de conexão ativo. Vazio = usa `connection`/`UTPLSQL_CONN`. |

### Campos do perfil (`utplsql.profiles`)

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `id` | string | Sim (auto-gerado) | — | UUID do perfil. |
| `name` | string | Sim | — | Nome amigável (ex. "DEV Local"). |
| `connection` | string | Sim | — | String de conexão (`user/pass@//host:port/service`). |
| `description` | string | Não | — | Descrição exibida no picker de conexão. |
| `charset` | enum | Não | `utf8` | Encoding para ler arquivos de script: `utf8`, `latin1` ou `win1252`. |
| `sourcePath` | string | Não | herda do global | Sobrescreve `utplsql.sourcePath`. |
| `coverageOwner` | string | Não | herda do global | Sobrescreve `utplsql.coverageOwner`. |
| `includePatterns` | string[] | Não | herda do global | Sobrescreve `utplsql.includePatterns`. |
| `isDefault` | boolean | Não | `false` | Marca perfil como padrão ao carregar workspace. |
| `lastUsed` | string | Não | — | Timestamp ISO do último uso. |

Exemplo:

```jsonc
// .vscode/settings.json ou settings do usuário
{
  "utplsql.activeProfile": "dev",
  "utplsql.profiles": [
    {
      "id": "a1b2c3d4-...",
      "name": "DEV Local",
      "connection": "app/senha@//localhost:1521/XEPDB1",
      "description": "Banco local de desenvolvimento",
      "charset": "utf8",
      "sourcePath": "src"
    },
    {
      "id": "e5f6g7h8-...",
      "name": "LEGADO Windows",
      "connection": "legacy/senha@//db-antigo:1521/LEGADO",
      "description": "Banco legado Windows-1252",
      "charset": "win1252",
      "sourcePath": "legacy/src"
    }
  ]
}
```

## Execução de scripts SQL

Roda scripts SQL/PL/SQL arbitrários (migrações, seeds, setup) contra um perfil
de conexão escolhido num QuickPick após a invocação — pelo editor
(`utplsql.runScript`), por arquivo (`utplsql.runScriptFile`) ou por pasta
(`utplsql.runScriptFolder`) no Explorer. A saída vai para o OutputChannel
"utPLSQL Script", um statement por linha. Veja [Comandos](Comandos).

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.scriptRunner.stopOnError` | `true` | Para na primeira falha (`false` = continua registrando as demais). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` em cada statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs para listar arquivos na execução de pasta. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captura e exibe `DBMS_OUTPUT` durante a execução. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Timeout em segundos por statement (`callTimeout`). |

O `charset` do perfil vale para `runScriptFile`/`runScriptFolder` (arquivo lido
como bytes e decodificado). No `runScript` (editor) o texto já vem decodificado
pelo VSCode — o charset do perfil não se aplica.

## Cobertura

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.sourcePath` | `install` | Pasta do código de produção para mapear cobertura. |
| `utplsql.coverageOwner` | `""` | Schema dos objetos cobertos. Vazio = usuário da conexão. |
| `utplsql.sqlCoverageEnabled` | `false` | Rastreia views (objetos SQL) via `V$SQL` após o run, marcando-as como executadas/não executadas. Requer `GRANT SELECT ON V$SQL`. Best-effort. |

## Debug PL/SQL

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.debugger.enabled` | `true` | Habilita o debug de testes PL/SQL via DBMS_DEBUG (Debug Adapter `utplsql`). |
| `utplsql.debugger.stopOnException` | `true` | Pausa a execução quando uma exceção não tratada é lançada. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout em segundos da sessão de debug. |

## Descoberta de testes

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs para descobrir specs. Use `["**/*.sql"]` se seus testes estão em `.sql`. |

## Pool do Oracle runner

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.oraclePoolMin` | `2` | Conexões mínimas mantidas no pool (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Conexões máximas no pool. |
| `utplsql.oraclePoolIncrement` | `1` | Incremento ao expandir o pool. |
| `utplsql.oraclePoolPingInterval` | `60` | Segundos entre health checks das conexões ociosas do pool. `0` = ping a cada checkout. |

O pool é criado **lazy** na primeira execução Oracle, é recriado quando a
conexão muda e fechado ao desativar a extensão. Veja [Execução Oracle direta](Execução-Oracle-direta).

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
| `utplsql.compilationDiagnostics.enabled` | `true` | Exibe erros de compilação PL/SQL como sublinhados e no Problems Panel. |
| `utplsql.setupDiagnostics.enabled` | `true` | Exibe diagnósticos de setup (conexão, grants, versão) e de integridade da instalação utPLSQL (objetos inválidos, quick-fix "Recompilar UT3") com quick-fix. |

## Organização da árvore

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.organization` | `file` | `file` (por caminho) ou `schema` (Schema > Package > Suite > Test). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Padrão glob para extrair schema do caminho. Use `{schema}` como placeholder. |

No modo `schema` com conexão configurada (sem prompt), o refresh também
descobre suites direto do banco (`ALL_OBJECTS`/`ALL_SOURCE`) para schemas cujos
arquivos não estão no workspace — os schemas consultados são os diretórios
abaixo da base do padrão (ex.: `db/*`) e os schemas das suites locais.
Veja [Organização da árvore](Organização-da-árvore).

## Idioma (i18n)

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.language` | `auto` | Idioma da interface da extensão. `auto` segue o idioma do VSCode. Valores: `auto`, `pt-br`, `en`, `en-gb`, `es`, `zh-cn`, `zh-tw`, `ja`, `de`, `fr`, `it`, `ko`, `ru`, `tr`, `pl`, `cs`, `hu`, `bg`, `el`, `id`, `ro`, `sr`, `th`, `uk`, `vi`. |

## Hierarquia de settings

O VSCode aplica settings nesta ordem (a última sobrescreve):

1. **Default** — valor padrão da extensão
2. **User** — `%APPDATA%/Code/User/settings.json`
3. **Workspace** — `.vscode/settings.json` do projeto
4. **Workspace Folder** — quando multi-root

Recomendação: coloque `sourcePath` no **workspace** (varia por projeto).
Deixe `connection` **fora** do settings.json (use env var).

## Exemplo completo

```jsonc
// .vscode/settings.json
{
  // Cobertura (específico do projeto)
  "utplsql.sourcePath": "install",

  // Conexão: NÃO coloque aqui — use env var UTPLSQL_CONN
  // "utplsql.connection": "DEV/senha@//host:1521/XEPDB1"  ← EVITE

  // Reporters extras (opcional)
  "utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
}
```
