# Exemplos de configuração (receitas)

Snippets prontos para copiar nos cenários mais comuns. Toda chave tem o prefixo
`utplsql.`; a referência completa está em [Configurações](Configurações).

> **Nunca guarde senhas no `settings.json`.** Use a variável de ambiente
> `UTPLSQL_CONN` (ou perfis de conexão) — veja [Configuração da conexão](Conexão).

Precedência recomendada: coloque `sourcePath` e valores específicos do projeto no
`.vscode/settings.json` do **workspace**; deixe dados de máquina/credenciais nas
settings do **usuário** ou em variáveis de ambiente.

## 1. Dev local sem senha (recomendado)

```jsonc
// .vscode/settings.json
{
  "utplsql.sourcePath": "src"
}
```

```sh
# informe a conexão fora do settings.json
export UTPLSQL_CONN="app/senha@//localhost:1521/XEPDB1"
```

PowerShell: `$env:UTPLSQL_CONN = "app/senha@//localhost:1521/XEPDB1"`.

## 2. Vários ambientes com perfis

```jsonc
// settings do usuário (contém credenciais — não commite)
{
  "utplsql.activeProfile": "dev",
  "utplsql.profiles": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "DEV Local",
      "connection": "app/senha@//localhost:1521/XEPDB1",
      "description": "Desenvolvimento local",
      "charset": "utf8",
      "sourcePath": "src",
      "isDefault": true
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "HOMOLOG",
      "connection": "app/senha@//homolog:1521/APP",
      "sourcePath": "src",
      "coverageOwner": "APP"
    }
  ]
}
```

Troque em tempo de execução com o comando `utplsql.switchProfile`.

## 3. Banco legado com arquivos Windows-1252

Quando os arquivos `.sql` estão em Windows-1252, defina o `charset` do perfil para
o `runScriptFile`/`runScriptFolder` decodificar corretamente:

```jsonc
{
  "utplsql.profiles": [
    {
      "id": "33333333-3333-3333-3333-333333333333",
      "name": "LEGADO (win1252)",
      "connection": "legacy/senha@//db-antigo:1521/LEGADO",
      "charset": "win1252",
      "sourcePath": "legacy/src"
    }
  ]
}
```

## 4. Testes em arquivos `.sql`

```jsonc
{
  "utplsql.includePatterns": ["**/*.sql"]
}
```

## 5. Árvore no modo schema (Schema > Package > Suite > Test)

```jsonc
{
  "utplsql.organization": "schema",
  "utplsql.organization.schemaPattern": "db/{schema}/**"
}
```

Com conexão configurada, o refresh também descobre suites no banco para schemas
sem arquivos locais. Veja [Organização da árvore](Organização-da-árvore).

## 6. Cobertura de outro owner + cobertura de views (SQL)

```jsonc
{
  "utplsql.sourcePath": "src",
  "utplsql.coverageOwner": "APP",
  "utplsql.sqlCoverageEnabled": true
}
```

`sqlCoverageEnabled` requer `GRANT SELECT ON V$SQL` e é best-effort. Veja
[Cobertura de código](Cobertura).

## 7. Execução de scripts SQL (migrações, seeds)

```jsonc
{
  "utplsql.scriptRunner.stopOnError": true,
  "utplsql.scriptRunner.autoCommit": true,
  "utplsql.scriptRunner.filePattern": "**/*.{sql,pks,pkb,fnc,prc,trg}",
  "utplsql.scriptRunner.dbmsOutput": false,
  "utplsql.scriptRunner.timeoutSeconds": 300
}
```

Invocado pelo editor (`utplsql.runScript`) ou por arquivo/pasta no Explorer.
Veja [Comandos](Comandos).

## 8. Suítes longas + saída de debug

```jsonc
{
  "utplsql.timeoutMinutes": 120,
  "utplsql.dbmsOutput": true
}
```

`timeoutMinutes` cancela a execução ao expirar (default `60`); `dbmsOutput` anexa
o `DBMS_OUTPUT` capturado da sessão de teste à saída da execução.

## 9. Workspace silencioso (menos ruído visual)

Útil para screenshots ou quando você só usa o Test Explorer:

```jsonc
{
  "utplsql.codeLens.enabled": false,
  "utplsql.decorations.enabled": false,
  "utplsql.statusBar.enabled": false
}
```

## 10. Ajuste do pool para execuções pesadas

```jsonc
{
  "utplsql.oraclePoolMin": 2,
  "utplsql.oraclePoolMax": 20,
  "utplsql.oraclePoolIncrement": 2,
  "utplsql.oraclePoolPingInterval": 60
}
```

Veja [Execução Oracle direta](Execução-Oracle-direta).

## 11. Reporters extras (ex.: cobertura HTML)

```jsonc
{
  "utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
}
```

## 12. Forçar o idioma da interface

```jsonc
{
  "utplsql.language": "pt-br"
}
```

`auto` (default) segue o idioma do VSCode. A lista completa de locales está em
[Configurações](Configurações).

## 13. Workspace multi-root (settings por pasta)

Em um arquivo `.code-workspace`, restrinja as settings a uma pasta:

```jsonc
{
  "folders": [{ "path": "projeto-a" }, { "path": "projeto-b" }],
  "settings": {
    "[projeto-a]": {
      "utplsql.sourcePath": "projeto-a/src",
      "utplsql.organization": "schema",
      "utplsql.organization.schemaPattern": "projeto-a/db/{schema}/**"
    },
    "[projeto-b]": {
      "utplsql.sourcePath": "projeto-b/src"
    }
  }
}
```

## Veja também

- [Configurações](Configurações) — referência completa e precedência
- [Configuração da conexão](Conexão)
- [Cobertura de código](Cobertura)
- [Organização da árvore](Organização-da-árvore)
- [Reporters customizados](Reporters)
- [Comandos](Comandos)
