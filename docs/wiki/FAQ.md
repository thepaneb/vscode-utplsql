# FAQ

## Geral

### Meus testes não aparecem no Test Explorer

Verifique:
1. Os arquivos têm extensão coberta por `utplsql.includePatterns` (default: `**/*.pks`)
2. As annotations `%suite` e `%test` estão no **spec** (`.pks`), não no body
3. Há uma **linha em branco** entre `%suite` e o primeiro `%test`/procedure
4. Rode `utPLSQL: Atualizar testes` para forçar rediscovery

### Posso usar com Oracle XE?

Sim. O utPLSQL funciona com Oracle XE 18c+. A cobertura requer os grants
de `DBMS_PROFILER` (veja [Requisitos no banco](Requisitos-no-banco)).

### Funciona com Oracle Cloud (Autonomous Database)?

Sim. Use o formato Wallet na string de conexão:

```
user/pass@tcps://adb.region.oraclecloud.com:1522/service?wallet_location=/path/to/wallet
```

Veja [Conexão](Conexão) para detalhes.

### A extensão funciona no Linux? E no macOS?

Sim. A extensão é multiplataforma. O `cliPath` precisa apontar para o
executável do utPLSQL-cli no seu sistema. No Linux/macOS, é comum ser
um script shell (sem `.bat`).

### Preciso do Java mesmo no modo `launcher`?

Sim. O utPLSQL-cli é uma aplicação Java — o launcher (`utplsql.bat` ou
`utplsql`) invoca a JVM internamente. O Java precisa estar instalado e
no PATH.

---

## Cobertura

### Cobertura sempre dá 0%

As causas mais comuns:
1. Falta `GRANT EXECUTE ON DBMS_PROFILER` — execute os grants
2. Reporter de cobertura não instalado — atualize o utPLSQL
3. Regex em `coverageSourceArgs` não casa — ative `dbmsOutput` para depurar
4. `sourcePath` aponta para uma pasta que não contém os fontes

Veja [Troubleshooting](Troubleshooting) para diagnóstico detalhado.

### Como sei se o regex de cobertura está funcionando?

Ative `utplsql.dbmsOutput: true` e veja o output do CLI no terminal da
view de testes. O utPLSQL loga quais objetos SQL foram mapeados para
arquivos.

### Posso mapear cobertura de objetos que não são packages?

Sim. O `type_mapping` suporta `FUNCTION`, `PROCEDURE`, `TRIGGER`, `VIEW`,
`PACKAGE BODY`, etc. Configure conforme sua convenção de arquivos no
`coverageSourceArgs`. Veja [Cobertura](Cobertura) para exemplos.

### A cobertura funciona sem o reporter de cobertura?

Não. Se `UT_COVERAGE_COBERTURA_REPORTER` não existir no banco, a cobertura
é **automaticamente desabilitada** com um aviso no output. Os testes rodam
normalmente, mas sem cobertura.

---

## Conexão e segurança

### Como não expor minha senha no settings.json?

Use a variável de ambiente `UTPLSQL_CONN` em vez da setting
`utplsql.connection`. Defina antes de abrir o VSCode:

```bash
export UTPLSQL_CONN="user/pass@//host:1521/service"
code .
```

### Posso usar wallet do Oracle sem senha?

Sim, se sua wallet estiver configurada com autenticação SSO (Single Sign-On):

```
user@tcps://host:1522/service?wallet_location=/path/to/wallet
```

Sem o `/pass` no formato — o Oracle autentica via certificado.

---

## Modo de invocação

### Qual a diferença prática entre `launcher` e `java`?

No Windows, o modo `launcher` passa pelo `cmd`, que **altera metacaracteres**
no regex da cobertura. O modo `java` evita isso. No Linux/macOS, a diferença
é menor porque o shell não consome `^`.

Se você **não** usa regex complexo no `coverageSourceArgs`, o modo `launcher`
funciona perfeitamente. Se usa `^`, `$` ou `|` no regex, mude para `java`.

### Como migrar do launcher para java?

```jsonc
{
  "utplsql.invocation": "java",
  // cliHome é derivado automaticamente do cliPath na maioria dos casos
  // se cliPath for "C:\tools\utPLSQL-cli\bin\utplsql.bat",
  // cliHome será "C:\tools\utPLSQL-cli" automaticamente
}
```

A maioria das configurações não muda — apenas `invocation` + `javaPath`
se o Java não estiver no PATH.

---

## CI/CD e desenvolvimento

### Dá pra usar com GitHub Actions?

Sim. Exponha a env var `UTPLSQL_CONN` como secret e configure as settings
no job:

```yaml
- uses: actions/checkout@v7
- run: npm ci
- run: npm run compile
- run: npm test
  env:
    UTPLSQL_CONN: ${{ secrets.UTPLSQL_CONN }}
```

### Por que meus testes de integração são pulados?

Os testes com banco real (`describeDB` em `extension.test.ts`) exigem
três variáveis de ambiente definidas no `.env`:

```bash
UTPLSQL_CONN=...
UTPLSQL_CLI_PATH=...
UTPLSQL_CLI_HOME=...
```

Sem elas, `describeDB` é automaticamente pulado com `describe.skip`.

### Posso publicar a extensão localmente?

Use `npm run package` para gerar um `.vsix` para testes internos. A
publicação no Marketplace é feita **exclusivamente** via GitHub release
(pelo workflow `publish.yml`).

```bash
npm run package
# gera: vscode-utplsql-0.7.1.vsix
code --install-extension vscode-utplsql-0.7.1.vsix
```
