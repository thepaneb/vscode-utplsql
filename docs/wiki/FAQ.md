# FAQ

## Geral

### Meus testes não aparecem no Test Explorer

Verifique:
1. Os arquivos têm extensão coberta por `utplsql.includePatterns` (default: `**/*.pks`)
2. As annotations `%suite` e `%test` estão no **spec** (`.pks`), não no body
3. O arquivo tem a declaração `create package` e ao menos um `%test` seguido de `PROCEDURE`
4. Rode `utPLSQL: Atualizar testes` para forçar rediscovery
5. Rode `utPLSQL: Validar configuração` para diagnóstico automático de CLI, conexão e grants

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

### Os botões Run/Run with Coverage não aparecem sobre %suite/%test

Verifique se `utplsql.codeLens.enabled` está `true` (é o default). Também
confira que `editor.codeLens` não está desabilitado em settings do VSCode.

### O que significam os ícones nas linhas após executar os testes?

Após cada execução, a extensão mostra decorações inline no editor:
- ✓ verde — teste passou
- ✗ vermelho — teste falhou (tooltip mostra a mensagem de erro)
- ⚠ amarelo — teste pulado (skipped) ou com erro

Passe o mouse sobre o ícone para ver a mensagem de falha. Desabilite com
`utplsql.decorations.enabled: false`.

### Quais são os atalhos de teclado?

Use o prefixo `Ctrl+Shift+U` + uma tecla mnemônica. Os principais:

| Atalho | Ação |
|---|---|
| `Ctrl+Shift+U R` | Rodar todos os testes |
| `Ctrl+Shift+U T` | Rodar testes do arquivo |
| `Ctrl+Shift+U F` | Atualizar (refresh) |
| `Ctrl+Shift+U L` | Rerun last (último teste) |
| `Ctrl+Shift+U U` | Run at cursor |
| `Ctrl+Shift+U X` | Run failed only |
| `Escape` | Cancelar execução |

Para ver todos, vá em File → Preferences → Keyboard Shortcuts e busque `utplsql`.

### Como reexecutar apenas os testes que falharam?

Use `Ctrl+Shift+U X` (Run Failed Only) ou o comando `utPLSQL: Run Failed Tests`
na palette. A extensão armazena quais testes falharam na última execução e os
reexecuta isoladamente.

### Como executar o teste que está sob o cursor?

Com um arquivo `.pks` aberto, pressione `Ctrl+Shift+U U` (Run at Cursor).
A extensão procura a anotação `%suite` ou `%test` acima do cursor e executa
apenas aquele teste/suite.

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
# gera: vscode-utplsql-0.11.0.vsix
code --install-extension vscode-utplsql-0.11.0.vsix
```

---

## Oracle direto (streaming)

### Qual a diferença entre CLI e Oracle direto?

O modo CLI (tradicional) executa o `utplsql` como processo externo e só mostra
resultados quando o batch termina. O modo Oracle direto (v0.9.0+) conecta no
banco via `node-oracledb` e mostra cada teste **em tempo real** no Explorer.

### Preciso instalar algo para usar o Oracle direto?

Não — o VSIX já inclui o driver `oracledb` **thin** (puro JavaScript, sem
Instant Client). Em desenvolvimento, `node-oracledb` é uma dependência
opcional (`optionalDependencies`); sem ela, o modo `auto` usa CLI
automaticamente. Use `runnerMode: cli` para forçar CLI sempre.

### Funciona com shared install (UT3)?

Sim, mas requer grants nas tabelas de buffer:
```sql
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP TO PUBLIC;
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_INFO_TMP TO PUBLIC;
```
Sem esses grants, use `runnerMode: cli` ou `auto` (fallback automático).

---

## Diagnósticos

### Como vejo erros de compilação PL/SQL no editor?

É automático. Após rodar testes, a extensão analisa o output do CLI. Se houver
erros como `PLS-00201` ou `ORA-06550`, eles aparecem como **sublinhados
vermelhos** no arquivo `.pks`/`.pkb` e no **Problems Panel** (source: "utPLSQL
Compilation"). Desabilite com `utplsql.compilationDiagnostics.enabled: false`.

### Como valido se minha configuração está correta?

Rode `utPLSQL: Validar configuração` (palette `Ctrl+Shift+P`). A extensão
verifica CLI, Java (modo java), conexão Oracle, versão do utPLSQL e a
**integridade da instalação** (objetos inválidos no schema utPLSQL). Os
resultados aparecem no Problems Panel com **quick-fix actions** (ícone 💡) —
incluindo **"Recompilar UT3"** quando há objetos inválidos.

### Como consigo os grants de cobertura sem digitar?

Use `utPLSQL: Copiar grants de cobertura para clipboard` — copia o SQL pronto
para o clipboard. Cole no SQL*Plus/SQL Developer como DBA.

---

## Organização da árvore

### Como organizar os testes por schema?

Mude `utplsql.organization` para `schema` e configure `organization.schemaPattern`:

```jsonc
{
  "utplsql.organization": "schema",
  "utplsql.organization.schemaPattern": "db/{schema}/**"
}
```

Com estrutura `db/APP/tests/` e `db/LOGIC/tests/`, o Test Explorer mostra
`Schema: APP` e `Schema: LOGIC` como nós raiz. Veja [Organização da árvore](Organização-da-árvore).

### Os testes aparecem mesmo sem os arquivos `.pks` no workspace?

Sim — com `runnerMode` `auto`/`oracle` e conexão configurada, o refresh também
descobre suites direto do banco (`ALL_OBJECTS`/`ALL_SOURCE`) para os schemas
dos diretórios abaixo da base do `schemaPattern` (ex.: `db/*`). Essas suites
aparecem com URI virtual (`utplsql-db:/`) e executam normalmente, mas **não**
têm CodeLens, decorações inline nem jump to failure.

### Funciona com multi-root?

Sim. Cada workspace folder mantém seus próprios schemas. O `schemaPattern` é
aplicado ao caminho relativo dentro de cada folder.

---

## Navegação e produtividade

### Como pular direto para a linha da asserção que falhou?

Quando um teste falha, o VSCode mostra um botão **"Go to Error"** no Test
Explorer (ícone de seta). Clicar nele abre o arquivo `.pks`/`.pkb` na linha
exata da falha. Funciona automaticamente — a extensão extrai o stack trace do
JUnit e resolve para o arquivo fonte.

### Modo `java` está lento com muitas suites?

Aumente a memória da JVM com `utplsql.javaArgs`:
```jsonc
"utplsql.javaArgs": ["-Xmx1024m", "-Xms256m"]
```
O default é `-Xmx256m`. Ajuste conforme o tamanho do seu projeto.
