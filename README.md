<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

# utPLSQL Test Runner

Integra o [utPLSQL](https://www.utplsql.org/) ao VSCode, trazendo os testes de PL/SQL para o **Test Explorer** nativo, com menu de contexto e cobertura visual.

- 🧪 **Test Explorer nativo** — suites e testes aparecem na view de testes; rode por teste, suite, arquivo ou pasta.
- 🔍 **CodeLens** — botões Run/Run with Coverage sobre `%suite` e `%test` no editor, sem sair do código.
- ⌨️ **Atalhos de teclado** — prefixo `Ctrl+Shift+U` + tecla para os comandos principais (R = Run All, T = Run File, L = Rerun Last, etc.).
- 🖱️ **Menu de contexto** — clique direito em uma **pasta** ou em um arquivo **`.pks`/`.pkb`** (no Explorer ou no editor) para rodar os testes.
- 📊 **Cobertura visual** — gutters coloridos por linha (coberta/não coberta) e percentual por arquivo na aba **Coverage**.
- ✅ **Decorações inline** — ícones ✓/✗/⚠ no editor após execução, com tooltip da falha e overview ruler.
- 📌 **Status Bar** — indicador com contagem pass/fail, duração e progresso em tempo real.
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only com um atalho.
- 🚀 **Oracle direto (via node-oracledb)** — streaming em tempo real, sem esperar o batch terminar.
- 🔧 **Diagnósticos de setup** — validação proativa de CLI, conexão, grants e versão com quick-fix.
- 🧩 **Schema-aware tree** — organize testes por Schema > Package > Suite > Test no Test Explorer.
- 🎯 **Jump to failure** — navegação direta para a linha da asserção que falhou (via "Go to Error" nativo).

## Instalação

A extensão pode ser instalada de duas formas:

1. **Pelo Marketplace:** Procure por **utPLSQL Test Runner** no painel de extensões do VSCode (`Ctrl+Shift+X`) e clique em **Instalar**.
2. **Manualmente (.vsix):** Baixe o arquivo `.vsix` da versão desejada e instale no VSCode:
   * **Via Linha de Comando:** `code --install-extension vscode-utplsql-<versao>.vsix`
   * **Via Interface:** Abra o painel de Extensões (`Ctrl+Shift+X`), clique nos três pontos `...` (canto superior direito) e selecione **Install from VSIX...**.

## Requisitos

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** instalado no banco Oracle.
- **Para o modo CLI:** [**utPLSQL-cli**](https://github.com/utPLSQL/utPLSQL-cli/releases) + **Java** instalados na máquina (a extensão chama o CLI).
- **Para o modo Oracle direto:** nada além do banco — o VSIX já inclui o driver `oracledb` thin (sem Instant Client).
- **VSCode 1.88+** (Test Coverage API).

A extensão é só o "cliente gráfico" — quem executa os testes é o banco: via
CLI (utPLSQL-cli + Java) ou direto (node-oracledb, `runnerMode: auto` por padrão).

## Conexão

A extensão precisa de uma string de conexão Oracle para rodar os testes. A
resolução segue esta ordem:

1. **Setting `utplsql.connection`** — lido do `settings.json` do projeto/usuário.
2. **Variável de ambiente `UTPLSQL_CONN`** — definida antes de abrir o VSCode.
3. **Cache da sessão** — se o usuário já digitou a conexão via prompt.
4. **Prompt ao usuário** — pergunta e mantém só na sessão atual.

⚠️ **Recomendação de segurança:** a string de conexão contém senha. **NÃO** use o
setting `utplsql.connection` em ambientes compartilhados (o settings.json pode
ser versionado ou visível a outros). Em vez disso, **use a variável de ambiente
`UTPLSQL_CONN`**:

```powershell
# PowerShell
$env:UTPLSQL_CONN = "usuario/senha@//host:1521/servico"
code .
```

```bash
# Bash
export UTPLSQL_CONN="usuario/senha@//host:1521/servico"
code .
```

Se nem o setting nem a env var estiverem definidos, a extensão pergunta a
conexão e a mantém apenas em memória durante a sessão — use o comando
**utPLSQL: Limpar conexão da sessão** (palette de comandos) para limpá-la.

**Formatos aceitos:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias` (requer `TNS_ADMIN` configurado)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/caminho/wallet`

## Como funciona

Dois modos de execução estão disponíveis:

![Arquitetura de execução — dois modos](docs/wiki/images/diagram-arquitetura.png)

### Modo Oracle direto (v0.9.0) — `runnerMode: auto` ou `oracle`

![Modo Oracle direto — streaming](docs/wiki/images/diagram-streaming.png)

Sem arquivos temporários, sem esperar o batch. Resultados aparecem no
Test Explorer **conforme cada teste termina**.

### Modo CLI — `runnerMode: cli` (fallback)

![Modo CLI — batch](docs/wiki/images/diagram-cli.png)

A extensão monta a linha de comando do CLI ou conecta via Oracle direto, lê os
relatórios (JUnit + Cobertura) e os traduz para as APIs nativas do VSCode. O
modo `auto` (padrão) tenta Oracle direto e cai para CLI se `node-oracledb` não
estiver instalado. Use `runnerMode: cli` para forçar CLI sempre.

## Configuração

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.connection` | `""` | Conexão Oracle. **Deixe vazio** e use a variável de ambiente `UTPLSQL_CONN` para não gravar a senha. Se ambos vazios, a extensão pergunta (guarda só na sessão). |
| `utplsql.cliPath` | `utplsql` | Caminho do executável do utPLSQL-cli (ex.: `C:\tools\utPLSQL-cli\bin\utplsql.bat`). |
| `utplsql.sourcePath` | `install` | Pasta do código de produção (para mapear a cobertura aos arquivos). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs para descobrir os specs com `%suite`/`%test`. Se seus testes estão em `.sql`, use `["**/*.sql"]`. |
| `utplsql.extraRunArgs` | `[]` | Argumentos extras para o `utplsql run`. |
| `utplsql.coverageOwner` | `""` | Schema dono dos objetos cobertos. Vazio = usa o usuário da conexão (em maiúsculas). |
| `utplsql.coverageSourceArgs` | (ver **Cobertura**) | Args do CLI que mapeiam a cobertura aos arquivos-fonte. |
| `utplsql.invocation` | `launcher` | Como chamar o CLI: `launcher` (via `.bat`/script, padrão) ou `java` (JVM direto, **sem shell**). Veja **Modo de invocação**. |
| `utplsql.javaPath` | `java` | Executável do Java (PATH ou caminho completo). Usado só no modo `java`. |
| `utplsql.cliHome` | `""` | Raiz do utPLSQL-cli (pasta com `bin/` e `lib/`). Vazio = derivado do `cliPath`. Usado só no modo `java`. |
| `utplsql.timeoutMinutes` | `60` | Timeout em minutos para o CLI. A flag `-t` só é enviada se o valor for diferente de `60`. |
| `utplsql.dbmsOutput` | `false` | Habilita `DBMS_OUTPUT` na sessão de teste. A flag `-D` só é enviada quando `true`. |
| `utplsql.quiet` | `false` | Suprime logs informativos do CLI. A flag `-q` só é enviada quando `true`. |
| `utplsql.failureExitCode` | `1` | Código de saída em caso de falha. A flag `--failure-exit-code` só é enviada se o valor for diferente de `1`. `0` faz o CLI sempre sair com sucesso. |
| `utplsql.additionalReporters` | `[]` | Reporters adicionais para incluir em toda execução (ex.: `["ut_coverage_html_reporter"]`). Os padrões (documentation, junit, cobertura) são sempre incluídos e não precisam ser listados. |
| `utplsql.codeLens.enabled` | `true` | Exibe botões CodeLens Run/Run with Coverage sobre `%suite` e `%test`. |
| `utplsql.statusBar.enabled` | `true` | Exibe indicador de status dos testes na barra de status. |
| `utplsql.decorations.enabled` | `true` | Exibe decorações de pass/fail nas linhas `%suite` e `%test` após execução. |
| `utplsql.runnerMode` | `auto` | Modo de execução: `auto` (Oracle direto via node-oracledb, fallback CLI), `cli` (sempre via linha de comando), `oracle` (sempre Oracle direto). |
| `utplsql.oraclePoolMin` | `2` | Conexões mínimas mantidas no pool do Oracle runner (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Conexões máximas no pool do Oracle runner (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Incremento ao expandir o pool do Oracle runner (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Segundos entre health checks das conexões ociosas do pool (node-oracledb). `0` = ping a cada checkout. |
| `utplsql.javaArgs` | `["-Xmx256m"]` | Flags JVM para o modo `java` (ex.: `["-Xmx512m", "-Xms128m"]`). Inseridas antes de `-cp`. |
| `utplsql.organization` | `file` | Organização da árvore: `file` (por caminho) ou `schema` (Schema > Package > Suite > Test). No modo `schema` com `runnerMode` Oracle (`auto`/`oracle`), suites também são descobertas do banco (`ALL_OBJECTS`/`ALL_SOURCE`) quando os arquivos `.pks` não estão no workspace — com URI virtual `utplsql-db:/` (sem CodeLens/decorations/jump to failure). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Padrão glob para extrair schema do caminho. Use `{schema}` como placeholder. No modo `schema`, os diretórios abaixo da base do padrão (ex.: `db/*`) definem os schemas consultados no banco. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Exibe erros de compilação PL/SQL como sublinhados no editor e Problems Panel (modo CLI). |
| `utplsql.setupDiagnostics.enabled` | `true` | Exibe diagnósticos de configuração (CLI, conexão, grants, versão) e de **integridade da instalação utPLSQL** (objetos inválidos no schema UT3, com quick-fix "Recompilar UT3") com quick-fix actions. |
| `utplsql.profiles` | `[]` | Perfis de conexão Oracle salvos (nome, connection, e overrides de `sourcePath`/`coverageOwner`/`invocation`/`cliPath`/etc.) para alternar entre ambientes. |
| `utplsql.activeProfile` | `""` | ID do perfil ativo (`utplsql.profiles`). Quando definido, sobrescreve `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Rastreia views executadas via `V$SQL` (cobertura booleana). Requer `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Habilita o debug PL/SQL de testes (`DBMS_DEBUG`). Requer `node-oracledb` + grants. |
| `utplsql.debugger.stopOnException` | `true` | Pausa em exceções PL/SQL durante o debug. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (s) da sessão de debug. |
| `utplsql.language` | `auto` | Idioma das mensagens de runtime: `auto` (segue o VSCode: `pt*` → pt-br, `zh*` → zh-cn, `es*` → es, `ja*` → ja, `de*` → de, `fr*` → fr; senão en), ou `pt-br`, `en`, `es`, `zh-cn`, `ja`, `de`, `fr`. |

Exemplo (`.vscode/settings.json` do projeto):

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.sourcePath": "install",
  // utplsql.connection fica vazio -> use a variável de ambiente UTPLSQL_CONN
}
```

E, antes de abrir o VSCode (ou no perfil do PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/senha@//localhost:1521/XEPDB1"
```

### Para contribuidores

Crie um arquivo `.env` na raiz do projeto (gitignorado) com as variáveis de
ambiente usadas pelos testes de integração:

```bash
UTPLSQL_CONN=seu_user/senha@//host:1521/service
UTPLSQL_CLI_PATH=/caminho/para/utplsql
UTPLSQL_CLI_HOME=/caminho/para/utplsql-cli
```

### Modo de invocação (`launcher` vs `java`)

Por padrão (`utplsql.invocation = "launcher"`) a extensão chama o launcher
`utplsql`/`utplsql.bat`. No Windows isso passa pelo `cmd`, que **consome/interpreta
metacaracteres** (`^` vira escape, `|` vira pipe) — o que atrapalha regex em
`coverageSourceArgs`.

O modo `java` chama a JVM **direto** (`java -cp <home>/etc;<home>/lib/* …
org.utplsql.cli.Cli`), **sem shell**. Os argumentos vão para o processo como um array,
sem `cmd` no meio, então `^` e `|` passam **literais** — você pode usar `^âncoras$` e
`(a|b|c)` no regex sem contornos.

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat", // cliHome é derivado daqui
  // "utplsql.cliHome": "C:\\tools\\utPLSQL-cli",  // só se cliPath for um comando do PATH
  // "utplsql.javaPath": "java"                     // PATH, ou caminho completo do java.exe
}
```

> O modo `java` replica fielmente o que o `.bat` faz (mesmo classpath e mesmas
> propriedades `-D`); a única diferença é não passar pelo `cmd`. Requer o `java` no PATH
> (ou em `utplsql.javaPath`) e que a raiz do CLI seja resolvível — ou via `cliPath`
> apontando para `…/bin/utplsql(.bat)`, ou definindo `cliHome`.

## Uso

1. Abra o projeto PL/SQL (com o código e os packages de teste).
2. Compile o código e os testes no banco (extensão Oracle / SQLcl).
3. Abra a view **Testing** → as suites aparecem.
4. Rode:
   - Pelo **CodeLens** — botões ▶ Run/Run with Coverage sobre cada `%suite` e `%test` no editor.
   - Pelo **gutter** ao lado de cada teste/suite, ou
   - Pelos **atalhos de teclado** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File, etc.), ou
   - Botão **Run Tests** da view Test Explorer, ou
   - **Clique direito** numa pasta/arquivo → *utPLSQL: Rodar testes…* (com ou sem cobertura).
5. Após a execução, veja:
   - **Decorações inline** (✓/✗/⚠) no editor ao lado das anotações de teste.
   - **Status Bar** com contagem pass/fail e duração total.
   - **Test Explorer** com resultados detalhados.
6. Para cobertura, use o perfil **Run with Coverage** (ou o item de menu "com cobertura").
7. Para repetir execuções rapidamente:
   - `Ctrl+Shift+U L` — **Rerun Last** (repete a última execução, com ou sem coverage).
   - `Ctrl+Shift+U U` — **Run at Cursor** (executa o `%test`/`%suite` sob o cursor).
   - `Ctrl+Shift+U X` — **Run Failed Only** (executa apenas os testes que falharam).
8. **Para Oracle direto (streaming):** nada a instalar — o VSIX já inclui o driver `oracledb` thin. O modo `auto` cai para CLI se o Oracle não estiver acessível.
9. Para diagnóstico, use `utPLSQL: Mostrar informações` na palette — exibe versões CLI/API/DB com opção de copiar.
10. **utPLSQL: Selecionar reporter adicional...** — QuickPick com reporters disponíveis no banco.
11. **utPLSQL: Cancelar execução** — interrompe a execução em andamento (`Escape` durante execução).
12. **utPLSQL: Atualizar testes** — força rediscovery dos `.pks`.

> 💡 **Ao escrever testes:** o parser é dirigido por tokens — basta ter `%suite`
> e a declaração `create package` no arquivo, e cada `%test` seguido do seu
> `PROCEDURE`. Não há requisito de linhas em branco.

### Annotations suportadas (v0.10.0+)

Além de `%suite` e `%test`, o discovery entende:

| Annotation | Efeito no Test Explorer |
|---|---|
| `-- %disabled` | Suíte ou teste **não aparece** na árvore (pulado no discovery) |
| `-- %throws(-20001)` | Marca que o teste espera a exceção 20001 (metadado `expectedError`) |
| `-- %tags(fast, critical)` | Tags do teste (metadado; filtro por tag é roadmap) |
| `-- %displayname(Nome)` | Nome customizado exibido no lugar da descrição do `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Marca a suíte com lifecycle hooks (metadado) |

Annotations são case-insensitive. No header da suíte (entre `%suite` e o
primeiro `%test`) aplicam à suíte; após o `%test`, aplicam ao teste.

## Comandos

Todos os comandos da extensão (palette `Ctrl+Shift+P` prefixo `utPLSQL:`):

| Comando | Descrição | Atalho via UI |
|---|---|---|
| `utPLSQL: Rodar todos os testes` | Executa todas as suites do workspace | Botão ▶ na view Testing |
| `utPLSQL: Rodar testes deste arquivo` | Executa suites do `.pks`/`.pkb` ativo | Clique direito → arquivo |
| `utPLSQL: Rodar testes deste arquivo com cobertura` | Idem, perfil com cobertura | Clique direito → arquivo |
| `utPLSQL: Rodar testes desta pasta` | Executa suites da pasta selecionada | Clique direito → pasta |
| `utPLSQL: Rodar testes desta pasta com cobertura` | Idem, perfil com cobertura | Clique direito → pasta |
| `utPLSQL: Atualizar testes` | Força rediscovery dos `.pks` | — |
| `utPLSQL: Cancelar execução` | Interrompe o CLI em execução | — |
| `utPLSQL: Mostrar informações do utPLSQL` | Versões CLI/API/DB com opção de copiar | — |
| `utPLSQL: Selecionar reporter adicional...` | QuickPick com reporters do banco | — |
| `utPLSQL: Limpar conexão da sessão` | Remove a conexão do cache da sessão | — |
| `utPLSQL: Rerun Last` | Repete a última execução | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Executa o teste sob o cursor | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Reexecuta apenas testes falhos | `Ctrl+Shift+U X` |
| `utPLSQL: Validar configuração` | Roda validação completa do setup (CLI, Java, conexão, instalação UT3) e mostra resultados | — |
| `utPLSQL: Configurar conexão` | Abre settings em `utplsql.connection` | — |
| `utPLSQL: Copiar grants de cobertura para clipboard` | Copia grants SQL para clipboard | — |
| `utPLSQL: Mostrar Test Explorer` | Foca a view Testing | — |
| `utPLSQL: Alternar perfil de conexão...` | Alterna o perfil de conexão ativo (QuickPick) | Clique na status bar (com perfil ativo) |
| `utPLSQL: Novo perfil de conexão...` | Wizard para criar e ativar um perfil | — |
| `utPLSQL: Gerenciar perfis de conexão` | Abre settings em `utplsql.profiles` | — |
| `utPLSQL: Importar conexões do SQL Developer` | Importa conexões do SQL Developer (connections.xml) | — |
| `utPLSQL: Depurar teste (PL/SQL)` | Inicia sessão de debug do teste sob o arquivo ativo | — |

> **Recompilar UT3** (`utplsql.recompileUt3`) **não** é um comando da paleta — é
> um quick-fix interno do diagnostic "utPLSQL Setup" (objetos inválidos no
> schema utPLSQL).

## Keybindings

Todos os atalhos usam o prefixo `Ctrl+Shift+U` (`Cmd+Shift+U` no Mac):

| Atalho | Comando |
|---|---|
| `Ctrl+Shift+U R` | Rodar todos os testes |
| `Ctrl+Shift+U T` | Rodar testes do arquivo |
| `Ctrl+Shift+U Shift+T` | Rodar testes do arquivo com cobertura |
| `Ctrl+Shift+U F` | Atualizar testes (refresh) |
| `Ctrl+Shift+U I` | Mostrar informações do utPLSQL |
| `Ctrl+Shift+U C` | Limpar conexão da sessão |
| `Ctrl+Shift+U L` | Rerun last (último teste) |
| `Ctrl+Shift+U U` | Run at cursor (teste sob cursor) |
| `Ctrl+Shift+U X` | Run failed only (apenas falhas) |
| `Escape` | Cancelar execução |

## Cobertura

- Linhas **executadas** ficam verdes no gutter; **não executadas**, vermelhas.
- A aba **Test Coverage** mostra o **percentual por arquivo/pasta**.

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

A extensão passa `-source_path` (= `utplsql.sourcePath`) e mapeia os objetos cobertos
aos arquivos-fonte via `utplsql.coverageSourceArgs` (regex + `type_mapping`). O `-owner`
é derivado da conexão (ou de `utplsql.coverageOwner`).

### Mapeamento da cobertura aos arquivos (`coverageSourceArgs`)

O `type_mapping` traduz o "tipo" capturado pelo regex no tipo Oracle. Três convenções comuns:

**1) Por diretório** — estrutura `sourcePath/<tipo>/<nome>.sql` (pastas `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // grupo 1 = pasta (tipo)
  "-name_subexpression=2",   // grupo 2 = arquivo (nome do objeto)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Funciona em qualquer profundidade (o `.*` absorve os módulos acima). Nomes de pasta variados
> (ex.: `package`, `pkg`, `pacote`) podem ser enumerados no `type_mapping`.

**2) Por prefixo do nome** — convenção `pkg_*`, `prc_*`, `vw_*` (independe da pasta):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // grupo 1 = nome completo (ex.: PKG_EXEMPLO)
  "-type_subexpression=2",   // grupo 2 = prefixo (tipo)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Por extensão tipada** — arquivos `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (independe da pasta):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // grupo 1 = nome
  "-type_subexpression=2",   // grupo 2 = extensão (tipo)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Notas importantes:**
- **Packages → `PACKAGE BODY`** (não `PACKAGE`): a cobertura é coletada no **corpo** do package.
- **Windows / metacaracteres no regex:** no modo `launcher` (padrão), o `.bat` passa pelo `cmd`,
  que **consome o `^`** e **interpreta o `|` como pipe** — por isso os exemplos acima usam `\w` e
  `[/\\]` (sem `^`), e o `|` do exemplo 2 só funciona dentro da extensão. **Solução:** use **`utplsql.invocation = "java"`** (ver
  [Modo de invocação](#modo-de-invocação-launcher-vs-java)) — sem `cmd` no meio, `^` e `|` passam
  literais e você fica livre para escrever o regex normalmente.
- **Windows / `cmd`:** evite **`^`** no regex (o `cmd` do `.bat` o consome) — por isso os exemplos
  usam `\w` e `[/\\]`.

## Reporters

A extensão sempre inclui três reporters padrão:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (resultados → Test Explorer) e
`ut_coverage_cobertura_reporter` (cobertura, se disponível).

**Validação dinâmica** — antes de rodar com cobertura, a extensão consulta
o banco via `utplsql reporters <conn>`. Se
`UT_COVERAGE_COBERTURA_REPORTER` não existir no banco (ex.: utPLSQL
desatualizado), a cobertura é pulada com um aviso no output. A execução
dos testes nunca é bloqueada.

**Reporters adicionais fixos** — setting `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Os três reporters padrão são deduplicados automaticamente, mesmo se
listados aqui.

**Reporter volátil por sessão** — comando **utPLSQL: Selecionar reporter
adicional...** abre um QuickPick com a lista dinâmica do banco. O reporter
escolhido é usado na execução seguinte e descartado após (não persiste
nas settings).

## Requisitos no banco

**Cobertura** (sempre) — habilita o profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_que_roda_os_testes>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_que_roda_os_testes>;
```
Sem isso, os testes rodam mas a cobertura sai **vazia**.

**Descoberta de testes em OUTROS schemas** (install **compartilhado** do utPLSQL, ex.: owner `UT3`):
para o framework enxergar e parsear os testes dos schemas de aplicação, o owner do utPLSQL precisa
**ler o dicionário** desses schemas:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` sozinho NÃO basta** — precisa dos grants **diretos** nessas views
  (por causa do `dbms_assert.sql_object_name` em contexto definer).
- É preciso também o **gatilho de DDL** do utPLSQL instalado (mantém o cache de annotations em dia).
- Verificação (como o owner): `SELECT ut_metadata.get_source_view_name FROM dual;` deve retornar `dba_source`.

> Em install **por schema** (utPLSQL no mesmo schema dos testes), esses grants cross-schema **não**
> são necessários — o framework lê o próprio source.

## Limitações conhecidas

- O mapeamento resultado→teste é feito por nome de package + nome/descrição do teste;
  descrições idênticas em packages diferentes podem gerar ambiguidade (o índice é
  escopado por package para minimizar isso).
- Considera o **primeiro** workspace folder para resolver `sourcePath`.
- A descoberta lê os `.pks` (specs); mantenha as annotations `%suite`/`%test` no spec.

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| Suites não aparecem | CLI não encontrado | Rode `utPLSQL: Validar configuração` para diagnóstico |
| Cobertura vazia | Falta `GRANT EXECUTE ON DBMS_PROFILER` | Execute grants em [Requisitos](#requisitos-no-banco) ou use `utPLSQL: Copiar grants de cobertura para clipboard` |
| Cobertura vazia | Oracle 19c exige grants adicionais | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Desempenho lento | Suites grandes exigem mais heap JVM | Aumente `utplsql.javaArgs` (ex.: `["-Xmx1024m"]`) |
| Erro de compilação sem indicação | Código com erro de sintaxe PL/SQL | Ative `utplsql.compilationDiagnostics.enabled` (default ativo); veja Problems Panel |
| Erro de conexão | String malformada ou DB inacessível | Use `utPLSQL: Validar configuração` |
| Timeout ao executar | Testes demoram mais que `timeoutMinutes` | Aumente `utplsql.timeoutMinutes` |
| Regex de cobertura não casa | `cmd` do Windows consome `^` e `\|` | Use `utplsql.invocation: "java"` (veja [Modo de invocação](#modo-de-invocação-launcher-vs-java)) |
| `%suite` não reconhecido | Falta `%suite`/`create package` no arquivo, ou `%test` sem `PROCEDURE` | Verifique o spec; rode `utPLSQL: Atualizar testes` |
| "relatório não gerado" | CLI não conseguiu gerar XML de saída | Verifique permissões de escrita em `%TEMP%` e grants do utPLSQL |
| CodeLens não aparece | `editor.codeLens` desabilitado ou conflito | Habilite `"editor.codeLens": true`; verifique `utplsql.codeLens.enabled` |
| Atalhos não funcionam | Conflito com outra extensão ou atalho do VSCode | Vá em File → Preferences → Keyboard Shortcuts e busque `utplsql` para redefinir |

## Licença

MIT © Gil Cleber Barboza
