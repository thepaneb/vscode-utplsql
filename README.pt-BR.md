<!-- GENERATED FROM docs/brain/60-README/README.pt-BR.md — DO NOT EDIT -->

<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · **Português** · [Italiano](README.it.md) · [Română](README.ro.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [Čeština](README.cs.md) · [Български](README.bg.md) · [Српски](README.sr.md) · [Türkçe](README.tr.md) · [Ελληνικά](README.el.md) · [Magyar](README.hu.md) · [Bahasa Indonesia](README.id.md) · [Tiếng Việt](README.vi.md) · [ไทย](README.th.md) · [English (UK)](README.en-GB.md)

</div>

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
- 🔧 **Diagnósticos de setup** — validação proativa de conexão, grants e versão com quick-fix.
- 🧩 **Schema-aware tree** — organize testes por Schema > Package > Suite > Test no Test Explorer.
- 🎯 **Jump to failure** — navegação direta para a linha da asserção que falhou (via "Go to Error" nativo).
- 🔌 **Perfis de conexão** — salve e alterne entre múltiplos ambientes (DEV/TEST/PROD) com configurações por perfil, via status bar ou command palette.
- 📜 **Scripts SQL** — execute o script atual, um arquivo do Explorer ou uma pasta inteira no perfil de conexão ativo (respeita o charset, com `DBMS_OUTPUT` e `stopOnError`).
- 📈 **Cobertura por declaração e de views** — a aba Coverage mostra `% de declarações` (PROCEDURE/FUNCTION) por arquivo e rastreia views executadas via `V$SQL`.
- 🏷️ **Tags e ordem aleatória** — filtre testes com `utplsql.tags` (ex.: `fast & !integration`) e execute em ordem aleatória com seed reproduzível (`utplsql.run.randomOrder`).
- 🎯 **Escopo de cobertura** — inclua/exclua objetos e regex de schema/objeto (`utplsql.coverage.*`) para remover ruído do framework e incluir objetos alcançados dinamicamente.
- 🗄️ **Descoberta DB-first** — monte a árvore a partir de `ut_runner.get_suites_info` e reconstrua o cache de anotações pela paleta.
- 🐛 **Debug PL/SQL** — breakpoints e step debugging de testes utPLSQL via `DBMS_DEBUG` (Debug Adapter nativo).
- 🌍 **i18n — 24 idiomas** — `utplsql.language` segue o VSCode (24 locales: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Instalação

A extensão pode ser instalada de duas formas:

1. **Pelo Marketplace:** Procure por **utPLSQL Test Runner** no painel de extensões do VSCode (`Ctrl+Shift+X`) e clique em **Instalar**.
2. **Manualmente (.vsix):** Baixe o arquivo `.vsix` da versão desejada e instale no VSCode:
   * **Via Linha de Comando:** `code --install-extension vscode-utplsql-<versao>.vsix`
   * **Via Interface:** Abra o painel de Extensões (`Ctrl+Shift+X`), clique nos três pontos `...` (canto superior direito) e selecione **Install from VSIX...**.

## Requisitos

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** instalado no banco Oracle.
- **VSCode 1.88+** (Test Coverage API).

A extensão conecta-se diretamente ao banco Oracle via `node-oracledb` (driver thin, sem Instant Client). O VSIX já inclui o pacote `oracledb`.

**Compatibilidade Oracle / utPLSQL:**

| Oracle | utPLSQL | Observações |
|---|---|---|
| 18c+ | v3.2.x (18c+) / v3.1.x | Recomendado; charset `AL32UTF8`. |
| 12.2 | apenas v3.1.x | O v3.2.x não compila (`PLS-00222`). O charset `WE8DEC` da imagem perde caracteres não representáveis (ex.: `€`); o driver thin ignora `NLS_LANG`. |

## Conexão

A extensão precisa de uma string de conexão Oracle para rodar os testes. A
resolução segue esta ordem:

1. **Perfil de conexão ativo** — `utplsql.activeProfile` apontando para um perfil em `utplsql.profiles` (sobrescreve tudo abaixo).
2. **Setting `utplsql.connection`** — lido do `settings.json` do projeto/usuário.
3. **Variável de ambiente `UTPLSQL_CONN`** — definida antes de abrir o VSCode.
4. **Cache da sessão** — se o usuário já digitou a conexão via prompt.
5. **Prompt ao usuário** — pergunta e mantém só na sessão atual.

Perfis de conexão (`utplsql.profiles`) também podem sobrescrever `sourcePath`, `coverageOwner`, etc. por ambiente — veja `utplsql.activeProfile` na tabela de configuração.

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

A extensão conecta-se diretamente ao banco Oracle via `node-oracledb`, faz streaming dos resultados em tempo real e os traduz para as APIs nativas do VSCode.

Sem arquivos temporários, sem esperar o batch. Resultados aparecem no
Test Explorer **conforme cada teste termina**.

## Configuração

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.connection` | `""` | Conexão Oracle. **Deixe vazio** e use a variável de ambiente `UTPLSQL_CONN` para não gravar a senha. Se ambos vazios, a extensão pergunta (guarda só na sessão). |
| `utplsql.sourcePath` | `install` | Pasta do código de produção (para mapear a cobertura aos arquivos). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs para descobrir os specs com `%suite`/`%test`. Se seus testes estão em `.sql`, use `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Schema dono dos objetos cobertos. Vazio = usa o usuário da conexão (em maiúsculas). |
| `utplsql.coverage.schemes` | `[]` | Schemas cobertos (`a_coverage_schemes`). Vazio = usuário da conexão (ou `utplsql.coverageOwner`). |
| `utplsql.coverage.includeObjects` | `[]` | Objetos a incluir na cobertura, como `OWNER.NAME` (ex.: `["APP.MEU_PKG"]`). Útil para objetos alcançados só dinamicamente. |
| `utplsql.coverage.excludeObjects` | `[]` | Objetos a excluir da cobertura, como `OWNER.NAME` (ex.: `["UT3.UT_COVERAGE"]`). |
| `utplsql.coverage.includeSchemaExpr` | `""` | Regex de schemas a incluir na cobertura (ex.: `^APP$`). |
| `utplsql.coverage.includeObjectExpr` | `""` | Regex de objetos a incluir na cobertura. |
| `utplsql.coverage.excludeSchemaExpr` | `""` | Regex de schemas a excluir da cobertura. |
| `utplsql.coverage.excludeObjectExpr` | `""` | Regex de objetos a excluir da cobertura (ex.: `^UT_` para o framework utPLSQL). |
| `utplsql.timeoutMinutes` | `60` | Timeout em minutos para a execução dos testes. |
| `utplsql.dbmsOutput` | `false` | Habilita `DBMS_OUTPUT` na sessão de teste. Útil para depuração. |
| `utplsql.additionalReporters` | `[]` | Reporters adicionais para incluir em toda execução (ex.: `["ut_coverage_html_reporter"]`). Os padrões (documentation, junit) são sempre incluídos e não precisam ser listados. |
| `utplsql.tags` | `""` | Expressão de tags do utPLSQL para filtrar quais testes executam (ex.: `fast & !integration`). Vazio executa todos. |
| `utplsql.run.randomOrder` | `false` | Executa os testes em ordem aleatória, para revelar dependências de ordem entre eles. |
| `utplsql.run.randomOrderSeed` | `0` | Seed da ordem aleatória. `0` = sorteada pelo banco (não reproduzível); > 0 reproduz a mesma ordem. |
| `utplsql.codeLens.enabled` | `true` | Exibe botões CodeLens Run/Run with Coverage sobre `%suite` e `%test`. |
| `utplsql.statusBar.enabled` | `true` | Exibe indicador de status dos testes na barra de status. |
| `utplsql.decorations.enabled` | `true` | Exibe decorações de pass/fail nas linhas `%suite` e `%test` após execução. |
| `utplsql.oraclePoolMin` | `2` | Conexões mínimas mantidas no pool do Oracle runner (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Conexões máximas no pool do Oracle runner (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Incremento ao expandir o pool do Oracle runner (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Segundos entre health checks das conexões ociosas do pool (node-oracledb). `0` = ping a cada checkout. |
| `utplsql.oracleClientMode` | `thin` | Modo do driver: `thin` (JavaScript puro, sem cliente nativo) ou `thick` (usa o Oracle Instant Client). Use `thick` apenas em bancos que exigem NNE (Native Network Encryption); requer `utplsql.oracleClientLibDir` e recarregar a janela. |
| `utplsql.oracleClientLibDir` | `""` | Diretório do Oracle Instant Client. Obrigatório quando `utplsql.oracleClientMode` é `thick` (ex.: `C:\oracle\instantclient_23_5`). |
| O debug não para no breakpoint | Package sem debug info ou grants de debug ausentes | Compile com `PLSQL_OPTIMIZE_LEVEL <= 1` (ou `ALTER PACKAGE ... COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) e conceda `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. Breakpoints em `test_*.pkb` podem não parar (o utPLSQL executa os testes via SQL dinâmico); coloque-os no código sob teste. |
| `utplsql.oracleClientConfigDir` | `""` | Diretório de configuração Oracle (TNS_ADMIN) com `sqlnet.ora`/`tnsnames.ora`. Opcional; usado apenas pelo driver thick. |
| `utplsql.organization` | `file` | Organização da árvore: `file` (por caminho) ou `schema` (Schema > Package > Suite > Test). No modo `schema`, suites também são descobertas do banco (`ut_runner.get_suites_info`, com fallback para `ALL_OBJECTS`/`ALL_SOURCE`) quando os arquivos `.pks` não estão no workspace — URI virtual `utplsql-db:/` (execução e jump to failure funcionam; sem CodeLens/decorations). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Padrão glob para extrair schema do caminho. Use `{schema}` como placeholder. No modo `schema`, os diretórios abaixo da base do padrão (ex.: `db/*`) definem os schemas consultados no banco. |
| `utplsql.discovery.source` | `auto` | Fonte da árvore no modo `schema`: `auto` usa a API do banco (`ut_runner.get_suites_info`) e cai para `ALL_SOURCE`/arquivos quando indisponível; `database` exige a API; `file` desliga a descoberta via banco. |
| `utplsql.refreshDebounceMs` | `300` | Debounce (ms) para agrupar eventos do watcher de arquivos `.pks`/`.pkb` antes de atualizar o Test Explorer. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Mostra erros de compilação PL/SQL do banco de dados (`ALL_ERRORS`) como sublinhados no editor e no Problems Panel (origem "utPLSQL Compilation"). |
| `utplsql.setupDiagnostics.enabled` | `true` | Exibe diagnósticos de configuração (conexão, grants, versão) e de **integridade da instalação utPLSQL** (objetos inválidos no schema UT3, com quick-fix "Recompilar UT3") com quick-fix actions. |
| `utplsql.profiles` | `[]` | Perfis de conexão Oracle salvos (nome, connection, e overrides de `sourcePath`/`coverageOwner`/etc.) para alternar entre ambientes. **As senhas ficam no keychain do SO (VS Code SecretStorage), não nas configurações** — o campo `connection` armazena apenas `user@//host:port/service`. Perfis legados com senha embutida são migrados automaticamente no primeiro uso. (Referência completa dos campos: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | ID do perfil ativo (`utplsql.profiles`). Quando definido, sobrescreve `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Rastreia views executadas via `V$SQL` (cobertura booleana). Requer `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Habilita o debug PL/SQL de testes (`DBMS_DEBUG`). Requer `node-oracledb` + grants. Compile o package alvo com debug info (`PLSQL_OPTIMIZE_LEVEL <= 1`) e conceda `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. |
| `utplsql.debugger.stopOnException` | `true` | Pausa em exceções PL/SQL durante o debug. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (s) da sessão de debug. |
| `utplsql.debugger.compileOnDebug` | `false` | Compila o objeto com informação de debug (`ALTER … COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) antes de iniciar a sessão de debug. |
| `utplsql.scriptRunner.stopOnError` | `true` | Para a execução do script na primeira falha (`false` = continua registrando as demais). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` em cada statement do script. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs para listar arquivos na execução de pasta de scripts. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captura e exibe `DBMS_OUTPUT` durante a execução do script. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Timeout (s) por statement do script (`callTimeout`). |
| `utplsql.language` | `auto` | Idioma das mensagens de runtime. `auto` segue o VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; senão en). Cobre os **24 locales**. |

Exemplo (`.vscode/settings.json` do projeto):

```jsonc
{
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
```

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
8. Para diagnóstico, use `utPLSQL: Mostrar informações` na palette — exibe versões API/DB com opção de copiar.
9. **utPLSQL: Selecionar reporter adicional...** — QuickPick com reporters disponíveis no banco.
10. **utPLSQL: Cancelar execução** — interrompe a execução em andamento (`Escape` durante execução).
11. **utPLSQL: Atualizar testes** — força rediscovery dos `.pks`.

> 💡 **Ao escrever testes:** o parser é dirigido por tokens — basta ter `%suite`
> e a declaração `create package` no arquivo, e cada `%test` seguido do seu
> `PROCEDURE`. Não há requisito de linhas em branco.

### Annotations suportadas (v0.10.0+)

Além de `%suite` e `%test`, o discovery entende:

| Annotation | Efeito no Test Explorer |
|---|---|
| `-- %disabled` | Suíte ou teste **não aparece** na árvore (pulado no discovery) |
| `-- %throws(-20001)` | Marca que o teste espera a exceção 20001 (metadado `expectedError`) |
| `-- %tags(fast, critical)` | Tags do teste; filtre a execução com a setting `utplsql.tags` (ex.: `fast & !integration`) |
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
| `utPLSQL: Cancelar execução` | Interrompe a execução em andamento | — |
| `utPLSQL: Mostrar informações do utPLSQL` | Versões API/DB com opção de copiar | — |
| `utPLSQL: Selecionar reporter adicional...` | QuickPick com reporters do banco | — |
| `utPLSQL: Limpar conexão da sessão` | Remove a conexão do cache da sessão | — |
| `utPLSQL: Rerun Last` | Repete a última execução | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Executa o teste sob o cursor | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Reexecuta apenas testes falhos | `Ctrl+Shift+U X` |
| `utPLSQL: Validar configuração` | Roda validação completa do setup (conexão, instalação UT3) e mostra resultados | — |
| `utPLSQL: Configurar conexão` | Abre settings em `utplsql.connection` | — |
| `utPLSQL: Copiar grants de cobertura para clipboard` | Copia grants SQL para clipboard | — |
| `utPLSQL: Mostrar Test Explorer` | Foca a view Testing | — |
| `utPLSQL: Alternar perfil de conexão...` | Alterna o perfil de conexão ativo (QuickPick) | Clique na status bar (com perfil ativo) |
| `utPLSQL: Novo perfil de conexão...` | Wizard para criar e ativar um perfil | — |
| `utPLSQL: Gerenciar perfis de conexão` | Abre settings em `utplsql.profiles` | — |
| `utPLSQL: Importar conexões do SQL Developer` | Importa conexões do SQL Developer (connections.xml) | — |
| `utPLSQL: Depurar teste (PL/SQL)` | Inicia sessão de debug do teste sob o arquivo ativo | — |
| `utPLSQL: Compilar para debug` | Compila o objeto do arquivo/pasta selecionado com informação de debug | — |
| `utPLSQL: Reconstruir cache de anotações` | Reconstrói o cache de anotações do utPLSQL no banco e atualiza a árvore | — |
| `utPLSQL: Executar script` | Executa o script aberto no editor contra um perfil de conexão | Clique direito → arquivo de script |
| `utPLSQL: Executar arquivo de script` | Executa um arquivo de script do Explorer (decodificado no charset do perfil) | Clique direito → arquivo |
| `utPLSQL: Executar pasta de scripts` | Executa os scripts da pasta em ordem alfabética | Clique direito → pasta |

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



A cobertura é reportada via `ut_coverage_cobertura_reporter` e mapeada aos arquivos-fonte
automaticamente usando o setting `utplsql.sourcePath` e o schema `utplsql.coverageOwner`.
A extensão resolve objetos `package`, `package body`, `function`, `procedure`,
`type body`, `trigger` e `view`, testando `.sql`, `.pks`, `.pkb`, `.prc`, `.fnc`,
`.trg`, `.tpb` e `.bdy` sob as pastas de código-fonte.

## Reporters

A extensão sempre inclui **dois** reporters padrão:
`ut_documentation_reporter` (stdout) e
`ut_junit_reporter` (resultados → Test Explorer). O
`ut_coverage_cobertura_reporter` é adicionado **apenas ao rodar com cobertura**.

**Validação dinâmica** — antes de rodar com cobertura, a extensão consulta
o banco via `TABLE(ut_runner.get_reporters_list())` para verificar se `UT_COVERAGE_COBERTURA_REPORTER`
existe. Se não existir (ex.: utPLSQL desatualizado), a cobertura é pulada com um aviso no output. A execução
dos testes nunca é bloqueada.

**Reporters adicionais fixos** — setting `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Os reporters padrão são automaticamente deduplicados, mesmo se
listados aqui.

**Reporter volátil por sessão** — comando **utPLSQL: Selecionar reporter
adicional...** abre um QuickPick com a lista dinâmica do banco. O reporter
escolhido é guardado na sessão, mas a seleção **não é aplicada** na versão
Oracle-only atual.

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
| Suites não aparecem | Problema de conexão | Rode `utPLSQL: Validar configuração` para diagnóstico |
| Cobertura vazia | Falta `GRANT EXECUTE ON DBMS_PROFILER` | Execute grants em [Requisitos](#requisitos-no-banco) ou use `utPLSQL: Copiar grants de cobertura para clipboard` |
| Cobertura vazia | Oracle 19c exige grants adicionais | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Erro de compilação sem indicação | Código com erro de sintaxe PL/SQL | Mantenha `utplsql.compilationDiagnostics.enabled` ativado (padrão); os erros de `ALL_ERRORS` aparecem no Problems Panel após uma execução |
| Erro de conexão | String malformada ou DB inacessível | Use `utPLSQL: Validar configuração` |
| Timeout ao executar | Testes demoram mais que `timeoutMinutes` | Aumente `utplsql.timeoutMinutes` |
| `%suite` não reconhecido | Falta `%suite`/`create package` no arquivo, ou `%test` sem `PROCEDURE` | Verifique o spec; rode `utPLSQL: Atualizar testes` |
| CodeLens não aparece | `editor.codeLens` desabilitado ou conflito | Habilite `"editor.codeLens": true`; verifique `utplsql.codeLens.enabled` |
| Atalhos não funcionam | Conflito com outra extensão ou atalho do VSCode | Vá em File → Preferences → Keyboard Shortcuts e busque `utplsql` para redefinir |
| Precisa de diagnósticos | Não está claro o que a extensão está fazendo internamente | Defina `UTPLSQL_DEBUG=1` antes de iniciar o VSCode para logs de diagnóstico opt-in (contexto de falhas de conexão/discovery/cobertura) no console do Extension Host |

## Aviso legal

Este é um projeto comunitário independente. Não possui afiliação, endosso ou patrocínio da equipe do framework utPLSQL nem da Oracle Corporation. utPLSQL e Oracle são marcas registradas de seus respectivos proprietários.

## Licença

MIT © Gil Cleber Barboza
