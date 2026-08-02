# Diagnósticos e quick-fix

A extensão oferece dois tipos de diagnóstico automático para reduzir o atrito
de configuração e acelerar o ciclo TDD:

1. **Compilation diagnostics** — erros de compilação PL/SQL capturados do output
   dos testes e exibidos como sublinhados no editor.
2. **Setup diagnostics** — validação proativa de CLI, conexão, grants e versão
   do utPLSQL, com **quick-fix actions** no Problems Panel.

---

## Compilation diagnostics

Após cada execução de testes, a extensão analisa o output do CLI em busca de
erros de compilação Oracle (`PLS-*`, `ORA-06550`) e os exibe como
`vscode.Diagnostic` no editor.

### Como funciona

```
executeRun() → CLI executa → stdout contém erros de compilação
  → parseCompilationErrors() → resolveFiles() → apply()
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

O output do CLI conterá:
```
Package TEST_FOO compiled with errors
ORA-06550: line 12, column 5:
PLS-00103: Encountered the symbol "END"
```

A extensão extrai isso e mostra no editor:
- **Arquivo:** `tests/test_foo.pks`
- **Linha 12, coluna 5** — sublinhado vermelho
- **Problems Panel:** `[PLS-00103] Encountered the symbol "END"` (source: "utPLSQL Compilation")

### Configuração

```jsonc
{
  // Habilitado por padrão. Desabilite se não quiser os sublinhados:
  "utplsql.compilationDiagnostics.enabled": false
}
```

### Limitações

- Funciona apenas no modo CLI (parse do stdout). Oracle direto usa mecanismo
  similar internamente.
- Mapeia erros para arquivos `.pks`/`.pkb` no workspace. Código externo
  (ex.: packages padrão Oracle) é ignorado.

---

## Setup diagnostics

Na ativação da extensão, o `SetupValidator` verifica proativamente problemas
comuns de configuração:

| Verificação | Diagnostic | Severity |
|---|---|---|
| CLI não encontrado | `UTPLSQL_NO_CLI` | Error |
| Java não encontrado (modo java) | `UTPLSQL_NO_JAVA` | Error |
| Conexão Oracle inválida | `UTPLSQL_BAD_CONN` | Error |
| utPLSQL < 3.1.0 no banco | `UTPLSQL_OLD_VERSION` | Warning |
| Cobertura falhou (pós-execução) | `UTPLSQL_NO_COVERAGE` | Warning |

Os resultados aparecem no **Problems Panel** com source "utPLSQL Setup".

### Quick-fix actions

Cada diagnostic oferece uma **Code Action** (ícone de lâmpada 💡 ou `Ctrl+.`):

| Diagnostic | Quick-fix |
|---|---|
| CLI não encontrado | **Configurar utplsql.cliPath** → abre settings.json |
| Conexão inválida | **Reconfigurar conexão** → abre settings em `utplsql.connection` |
| Grants de cobertura | **Copiar grants para clipboard** → copia SQL pronto para colar |

### Comandos

| Comando | Descrição |
|---|---|
| `utPLSQL: Validar configuração` | Roda validação completa e mostra resultado no Problems Panel |
| `utPLSQL: Configurar conexão` | Abre settings em `utplsql.connection` |
| `utPLSQL: Copiar grants de cobertura` | Copia `GRANT EXECUTE ON DBMS_PROFILER ...` para clipboard |

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

```
Abrir workspace
  → Setup diagnostics: CLI OK? Conexão OK? Versão OK?
  → Se problemas: Problems Panel + quick-fix actions

Rodar testes
  → Compilation diagnostics: erros PL/SQL no editor

Após execução
  → Se cobertura falhou: diagnostic com grants
```

Todos os diagnósticos são **não-bloqueantes** — os testes rodam mesmo com
warnings. Apenas erros críticos (sem CLI, sem conexão) impedem a execução.
