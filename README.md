<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

# utPLSQL Test Runner

Integra o [utPLSQL](https://www.utplsql.org/) ao VSCode, trazendo os testes de PL/SQL para o **Test Explorer** nativo, com menu de contexto e cobertura visual.

- 🧪 **Test Explorer nativo** — suites e testes aparecem na view de testes; rode por teste, suite, arquivo ou pasta.
- 🖱️ **Menu de contexto** — clique direito em uma **pasta** ou em um arquivo **`.pks`/`.pkb`** (no Explorer ou no editor) para rodar os testes.
- ✅ **Resultados na view de testes** — verde/vermelho por teste, com a mensagem de falha do utPLSQL.
- 📊 **Cobertura visual** — gutters coloridos por linha (coberta/não coberta) e percentual por arquivo na aba **Coverage**, usando a Test Coverage API do VSCode.

## Instalação

A extensão pode ser instalada de duas formas:

1. **Pelo Marketplace:** Procure por **utPLSQL Test Runner** no painel de extensões do VSCode (`Ctrl+Shift+X`) e clique em **Instalar**.
2. **Manualmente (.vsix):** Baixe o arquivo `.vsix` da versão desejada e instale no VSCode:
   * **Via Linha de Comando:** `code --install-extension vscode-utplsql-<versao>.vsix`
   * **Via Interface:** Abra o painel de Extensões (`Ctrl+Shift+X`), clique nos três pontos `...` (canto superior direito) e selecione **Install from VSIX...**.

## Requisitos

- **Framework utPLSQL (UT3)** instalado no banco Oracle.
- **utPLSQL-cli** + **Java** instalados na máquina (a extensão chama o CLI).
- **VSCode 1.88+** (Test Coverage API).

A extensão é só o "cliente gráfico" — quem executa os testes é o banco, via CLI.

## Como funciona

```
 Test Explorer / menu de contexto
        │  (descobre %suite / %test nos .pks)
        ▼
 utplsql run <conn> -p=<suites>
   -f=ut_junit_reporter             -o=results.xml    ──► resultados na view de testes
   -f=ut_coverage_cobertura_reporter -o=coverage.xml  ──► gutters + % na aba Coverage
   -f=ut_documentation_reporter -c                    ──► log no terminal de testes
```

A extensão monta a linha de comando do CLI, lê os relatórios (JUnit + Cobertura) e os
traduz para as APIs nativas do VSCode.

## Configuração

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.connection` | `""` | Conexão Oracle. **Deixe vazio** e use a variável de ambiente `UTPLSQL_CONN` para não gravar a senha. Se ambos vazios, a extensão pergunta (guarda só na sessão). |
| `utplsql.cliPath` | `utplsql` | Caminho do executável do utPLSQL-cli (ex.: `C:\tools\utPLSQL-cli\bin\utplsql.bat`). |
| `utplsql.sourcePath` | `install` | Pasta do código de produção (para mapear a cobertura aos arquivos). |
| `utplsql.testPath` | `tests` | Pasta dos packages de teste. |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs para descobrir os specs com `%suite`/`%test`. Se seus testes estão em `.sql`, use `["**/*.sql"]`. |
| `utplsql.extraRunArgs` | `[]` | Argumentos extras para o `utplsql run`. |
| `utplsql.coverageOwner` | `""` | Schema dono dos objetos cobertos. Vazio = usa o usuário da conexão (em maiúsculas). |
| `utplsql.coverageSourceArgs` | (ver **Cobertura**) | Args do CLI que mapeiam a cobertura aos arquivos-fonte (regex + `type_mapping`). |

Exemplo (`.vscode/settings.json` do projeto):

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.sourcePath": "install",
  "utplsql.testPath": "tests"
  // utplsql.connection fica vazio -> use a variável de ambiente UTPLSQL_CONN
}
```

E, antes de abrir o VSCode (ou no perfil do PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/senha@//localhost:1521/XEPDB1"
```

## Uso

1. Abra o projeto PL/SQL (com o código e os packages de teste).
2. Compile o código e os testes no banco (extensão Oracle / SQLcl).
3. Abra a view **Testing** → as suites aparecem.
4. Rode:
   - Pelo **gutter** ao lado de cada teste/suite, ou
   - Botão **Run Tests** da view, ou
   - **Clique direito** numa pasta/arquivo → *utPLSQL: Rodar testes…* (com ou sem cobertura).
5. Para cobertura, use o perfil **Run with Coverage** (ou o item de menu "com cobertura").

## Cobertura

- Linhas **executadas** ficam verdes no gutter; **não executadas**, vermelhas.
- A aba **Test Coverage** mostra o **percentual por arquivo/pasta**.

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
> (ex.: `package`, `package_relatorio`) podem ser enumerados no `type_mapping`.

**2) Por prefixo do nome** — convenção `pkg_*`, `prc_*`, `vw_*` (independe da pasta):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // grupo 1 = nome completo (ex.: PKG_BANDEIRADO)
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
- **Windows / `cmd`:** evite **`^`** no regex (o `cmd` do `.bat` o consome) — por isso os exemplos
  usam `\w` e `[/\\]`. O **`|`** (alternância do exemplo 2) funciona pela extensão, mas **quebra**
  no `run-tests.ps1`/`.sh` e no cli direto no Windows; nesses casos prefira o mapeamento por
  diretório/extensão (sem `|`) ou enumere as pastas no `type_mapping`.

## Requisitos no banco

**Cobertura** (sempre) — habilita o profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_que_roda_os_testes>;
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

> 💡 **Ao escrever testes:** deixe uma **linha em branco** separando o `%suite` dos `%test`/procedures,
> senão o `%suite` "gruda" na procedure e o package não é reconhecido como suíte.

## Limitações conhecidas

- O mapeamento resultado→teste é feito por nome de package + nome/descrição do teste;
  descrições idênticas em packages diferentes podem gerar ambiguidade (o índice é
  escopado por package para minimizar isso).
- Considera o **primeiro** workspace folder para resolver `sourcePath`/`testPath`.
- A descoberta lê os `.pks` (specs); mantenha as annotations `%suite`/`%test` no spec.

## Licença

MIT © Gil Cleber Barboza
