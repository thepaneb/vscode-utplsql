# Modo de invocação

A extensão suporta dois modos para chamar o utPLSQL-cli: `launcher` (padrão)
e `java`.

## Comparação

| | `launcher` | `java` |
|---|---|---|
| **Como chama** | `utplsql.bat` / script | `java -cp ... org.utplsql.cli.Cli` |
| **Passa pelo shell?** | Sim (`cmd` no Windows) | Não (invocação direta) |
| **Metacaracteres** | `^` e `\|` são consumidos/interpretados | Literais |
| **Configuração extra** | Nenhuma | `javaPath`, `cliHome` |
| **Recomendado para** | Uso simples, sem regex | Regex no `coverageSourceArgs` |

## Modo `launcher` (padrão)

```jsonc
{
  "utplsql.invocation": "launcher"
}
```

A extensão executa o binário do CLI (definido em `cliPath`) e deixa o shell do
sistema tratar da invocação. No Windows, o `utplsql.bat` passa pelo `cmd`,
que **consome `^`** (escape) e **interpreta `|`** (pipe).

Isso atrapalha regex em `coverageSourceArgs` — você não pode usar `^` nem `|`
livremente.

## Modo `java`

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.javaPath": "java",
  "utplsql.cliHome": "C:\\tools\\utPLSQL-cli"
}
```

A extensão chama a JVM **direto**:

```
java -cp <cliHome>/etc;<cliHome>/lib/* org.utplsql.cli.Cli run <conn> -p=<suites> ...
```

Sem `cmd` no meio, os argumentos vão como array para o processo. `^` e `|`
passam **literais** — você pode usar `^âncoras$` e `(a|b|c)` no regex sem
contornos.

### Resolução do `cliHome`

1. Se `utplsql.cliHome` estiver definido → usa direto
2. Senão, deriva do `cliPath`: `path.dirname(path.dirname(cliPath))`
   - `C:\tools\utPLSQL-cli\bin\utplsql.bat` → `C:\tools\utPLSQL-cli`

> Se o `cliPath` for só um comando do PATH (ex.: `utplsql`), defina `cliHome`
> manualmente.

### `javaPath`

O executável Java. Pode ser:
- Um comando no PATH: `"java"`
- Caminho absoluto: `"C:\\Program Files\\Java\\jdk-21\\bin\\java.exe"`

## Exemplo: regex que funciona só no modo `java`

```jsonc
// ❌ Quebra no launcher (cmd consome ^ e |)
"utplsql.coverageSourceArgs": [
  "-regex_expression=^.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_mapping=packages=PACKAGE BODY|functions=FUNCTION|procedures=PROCEDURE"
]

// ✅ Funciona no java
"utplsql.coverageSourceArgs": [
  "-regex_expression=^.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_mapping=packages=PACKAGE BODY|functions=FUNCTION|procedures=PROCEDURE"
]
```

Com `utplsql.invocation: "java"`, ambos funcionam.

## Depurando

Ative `utplsql.quiet: false` e inspecione o output do CLI no terminal da view
de testes. O CLI loga os argumentos que recebeu — compare com o esperado.

![Output do CLI com argumentos recebidos](images/output-cli-args.png)

> O modo `java` replica o que o `.bat` faz (mesmo classpath e propriedades
> `-D`); a única diferença é não passar pelo `cmd`.
