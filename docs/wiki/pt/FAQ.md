# FAQ

## Geral

### Meus testes não aparecem no Test Explorer

Verifique:
1. Os arquivos têm extensão coberta por `utplsql.includePatterns` (default: `**/*.pks`)
2. As annotations `%suite` e `%test` estão no **spec** (`.pks`), não no body
3. O arquivo tem a declaração `create package` e ao menos um `%test` seguido de `PROCEDURE`
4. Rode `utPLSQL: Atualizar testes` para forçar rediscovery
5. Rode `utPLSQL: Validar configuração` para diagnóstico automático de conexão e grants

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

Sim. A extensão é multiplataforma.

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
3. `sourcePath` aponta para uma pasta que não contém os fontes ou a
   estrutura `sourcePath/<tipo>/<nome>.sql` não confere — confira o Log
   Output da extensão (canal `utPLSQL`)

Veja [Troubleshooting](Troubleshooting) para diagnóstico detalhado.

### Como sei se o mapeamento de cobertura está funcionando?

Confira o Log Output da extensão (canal `utPLSQL`): o mapeamento de objetos
para arquivos (`ut_file_mapper.build_file_mappings()` + `resolveSourceUri`)
é registrado ali, incluindo quais objetos foram mapeados e quais falharam.

### Posso mapear cobertura de objetos que não são packages?

Sim. O `type_mapping` padrão cobre `PACKAGE BODY`, `FUNCTION`, `PROCEDURE`,
`TRIGGER`, `VIEW`, etc. Basta manter a convenção de arquivos
`sourcePath/<tipo>/<nome>.sql` (ex.: `install/views/minha_view.sql`).
Veja [Cobertura](Cobertura) para exemplos.

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
a variável de ambiente definida no `.env`:

```bash
UTPLSQL_CONN=...
```

Sem ela, `describeDB` é automaticamente pulado com `describe.skip`.

### Posso publicar a extensão localmente?

Use `npm run package` para gerar um `.vsix` para testes internos. A
publicação no Marketplace é feita **exclusivamente** via GitHub release
(pelo workflow `publish.yml`).

```bash
npm run package
# gera: vscode-utplsql-0.12.0.vsix
code --install-extension vscode-utplsql-0.12.0.vsix
```

---

## Oracle direto (streaming)

### Preciso instalar algo para usar o Oracle direto?

Não — o VSIX já inclui o driver `oracledb` **thin** (puro JavaScript, sem
Instant Client).

### Funciona com shared install (UT3)?

Sim, mas requer grants nas tabelas de buffer:
```sql
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP TO PUBLIC;
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_INFO_TMP TO PUBLIC;
```
Sem esses grants, a execução direta não funcionará — configure um schema
dedicado para utPLSQL.

---

## Diagnósticos

### Como vejo erros de compilação PL/SQL no editor?

É automático. Após rodar testes, a extensão consulta os erros de compilação
no banco (`ALL_ERRORS`). Se houver
erros como `PLS-00201` ou `ORA-06550`, eles aparecem como **sublinhados
vermelhos** no arquivo `.pks`/`.pkb` e no **Problems Panel** (source: "utPLSQL
Compilation"). Desabilite com `utplsql.compilationDiagnostics.enabled: false`.

### Como valido se minha configuração está correta?

Rode `utPLSQL: Validar configuração` (palette `Ctrl+Shift+P`). A extensão
verifica conexão Oracle, versão do utPLSQL e a
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

Sim — com conexão configurada, o refresh também
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
