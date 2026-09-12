# Diagnósticos e quick-fix

A extensão oferece dois tipos de diagnóstico automático para reduzir o atrito
de configuração e acelerar o ciclo TDD:

1. **Compilation diagnostics** — erros de compilação PL/SQL capturados via
   query `ALL_ERRORS` e exibidos como sublinhados no editor.
2. **Setup diagnostics** — validação proativa de conexão, grants e versão
   do utPLSQL, com **quick-fix actions** no Problems Panel.

---

## Compilation diagnostics

Após cada execução de testes, a extensão consulta a view `ALL_ERRORS` do banco
de dados Oracle em busca de erros de compilação e os exibe como
`vscode.Diagnostic` no editor.

### Como funciona

```
executeRun() → Oracle executa → conn1 coleta erros via ALL_ERRORS
  → compilationDiagnostics.parseFromOutput() → resolveFiles() → apply()
  → VSCode Problems Panel mostra os erros
  → Editor mostra sublinhados vermelhos
```

### Exemplo

Se um pacote de teste tem erro de sintaxe:

```sql
create or replace package test_foo as
  -- %suite(Foo)
  procedure bar;
end;
-- falta o END; no body
```

A query `ALL_ERRORS` retornará:
```
TEST_FOO  PACKAGE BODY  12  5  PLS-00103: Encountered the symbol "END"
```

A extensão extrai isso e mostra no editor:
- **Arquivo:** `tests/test_foo.pks`
- **Linha 12, coluna 5** — sublinhado vermelho
- **Problems Panel:** `[PLS-00103] Encountered the symbol "END"` (source: "utPLSQL Compilation")

![Compilation diagnostics](../images/diagnostics-squiggles.png)

### Configuração

```jsonc
{
  // Habilitado por padrão. Desabilite se não quiser os sublinhados:
  "utplsql.compilationDiagnostics.enabled": false
}
```

### Limitações

- Mapeia erros para arquivos `.pks`/`.pkb` no workspace. Código externo
  (ex.: packages padrão Oracle) é ignorado.

---

## Setup diagnostics

Na ativação da extensão, o `SetupValidator` verifica proativamente problemas
comuns de configuração:

| Verificação | Diagnostic | Severity |
|---|---|---|
| Conexão Oracle inválida | `UTPLSQL_BAD_CONN` | Error |
| utPLSQL < 3.1.0 no banco | `UTPLSQL_OLD_VERSION` | Warning |
| Objetos inválidos no schema utPLSQL | `UTPLSQL_INVALID_OBJECTS` | Warning |
| Cobertura falhou (pós-execução) | `UTPLSQL_NO_COVERAGE` | Warning |

A verificação de objetos inválidos (`ALL_OBJECTS` para `PACKAGE`/`TYPE`/
`PACKAGE BODY` no schema utPLSQL) é best-effort: assíncrona, sem prompt de
conexão, timeout de 5s e silenciosa em falha. A configuração
`setupDiagnostics.enabled: false` suprime a verificação.

Os resultados aparecem no **Problems Panel** com source "utPLSQL Setup".

### Quick-fix actions

Cada diagnostic oferece uma **Code Action** (ícone de lâmpada ou `Ctrl+.`):

| Diagnostic | Quick-fix |
|---|---|
| Conexão inválida | **Reconfigurar conexão** → abre settings em `utplsql.connection` |
| Grants de cobertura | **Copiar grants para clipboard** → copia SQL pronto para colar |
| Objetos inválidos no utPLSQL | **Recompilar UT3** → `DBMS_UTILITY.COMPILE_SCHEMA` e re-verifica |

### Comandos

| Comando | Descrição |
|---|---|
| `utPLSQL: Validar configuração` | Roda validação completa (setup + integridade da instalação utPLSQL) e mostra resultado no Problems Panel |
| `utPLSQL: Configurar conexão` | Abre settings em `utplsql.connection` |
| `utPLSQL: Copiar grants de cobertura` | Copia `GRANT EXECUTE ON DBMS_PROFILER ...` para clipboard |

> **Recompilar UT3** não é um comando da paleta — é um quick-fix
> (`utplsql.recompileUt3`, interno) disponível apenas no diagnostic
> `UTPLSQL_INVALID_OBJECTS`.

### Configuração

```jsonc
{
  // Habilitado por padrão. Desabilite para remover os diagnósticos:
  "utplsql.setupDiagnostics.enabled": false
}
```

---

## Interação entre os diagnósticos

O fluxo completo de diagnóstico cobre todo o ciclo de vida:

![Ciclo de vida dos diagnósticos](../images/diagram-diagnosticos.png)

```
Abrir workspace
  → Setup diagnostics: Conexão OK? Versão OK? Instalação utPLSQL íntegra?
  → Se problemas: Problems Panel + quick-fix actions

Rodar testes
  → Compilation diagnostics: erros PL/SQL no editor

Após execução
  → Se cobertura falhou: diagnostic com grants
```

Todos os diagnósticos são **não-bloqueantes** — os testes rodam mesmo com
warnings. Apenas erros críticos (sem conexão) impedem a execução.
