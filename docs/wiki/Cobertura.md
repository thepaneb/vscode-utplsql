# Cobertura de código

A extensão alimenta a **Test Coverage API** do VSCode, mostrando cobertura
diretamente no editor e na aba Coverage.

- Linhas **executadas** → gutter verde 🟢
- Linhas **não executadas** → gutter vermelho 🔴
- Aba **Test Coverage** → percentual por arquivo/pasta

![Gutters de cobertura verde e vermelho no editor](images/editor-coverage-gutters.png)

![Painel Test Coverage com percentuais por arquivo](images/coverage-panel.png)

## Como funciona

O CLI é chamado com flags extras de cobertura:

```
utplsql run <conn> -p=<suites>
  -f=ut_coverage_cobertura_reporter -o=coverage.xml
  -source_path=<utplsql.sourcePath>
  -owner=<schema>
  ... coverageSourceArgs
```

A extensão lê o XML Cobertura e mapeia cada objeto coberto ao arquivo-fonte
usando `resolveSourceUri` (absoluto → workspace → sourcePath).

## Mapeamento da cobertura aos arquivos

O `type_mapping` traduz o tipo capturado pelo regex no tipo Oracle.
Três convenções comuns:

### 1) Por diretório

Estrutura: `sourcePath/<tipo>/<nome>.sql`

Exemplo de projeto:
```
install/
├── packages/
│   └── calculadora.sql
├── functions/
│   └── dobro.sql
└── procedures/
    └── log_auditoria.sql
```

```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",
  "-name_subexpression=2",
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```

### 2) Por prefixo do nome

Convenção: `pkg_*`, `prc_*`, `fnc_*`

Exemplo:
```
install/
├── pkg_calculadora.sql
├── fnc_dobro.sql
└── prc_auditoria.sql
```

```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",
  "-type_subexpression=2",
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

### 3) Por extensão tipada

Convenção: `*.pkb`, `*.fnc`, `*.prc`

Exemplo:
```
install/
├── calculadora.pkb
├── dobro.fnc
└── auditoria.prc
```

```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",
  "-type_subexpression=2",
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

## Notas importantes

- **Packages → `PACKAGE BODY`**: a cobertura é coletada no **corpo** do package,
  não na spec.
- **Windows e metacaracteres**: no modo `launcher`, o `cmd` consome `^` e
  interpreta `|` como pipe. Use `utplsql.invocation: "java"` para usar regex
  completo (veja [Modo de invocação](Modo-de-invocação)).
- **Validação dinâmica**: antes de rodar cobertura, a extensão verifica se
  `UT_COVERAGE_COBERTURA_REPORTER` existe no banco. Se não, cobertura é pulada
  com aviso — a execução nunca é bloqueada.

## Depurando regex de cobertura

Ative `utplsql.dbmsOutput: true` e inspecione o output do CLI no terminal da
view de testes. O utPLSQL loga quais objetos foram mapeados e quais falharam:

```
-- objetos mapeados pelo regex:
--   CALCULADORA → PACKAGE BODY → install/packages/calculadora.sql
--   DOBRO → FUNCTION → install/functions/dobro.sql
--   LOG_AUDITORIA → (não mapeado — nenhum arquivo correspondeu)
```

![Log de mapeamento de cobertura no terminal](images/output-coverage-mapping.png)
