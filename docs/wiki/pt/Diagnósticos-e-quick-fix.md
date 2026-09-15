# Diagnósticos e quick-fix

A extensão oferece diagnóstico automático para reduzir o atrito de
configuração e acelerar o ciclo TDD:

1. **Setup diagnostics** — validação proativa de conexão, grants e versão
   do utPLSQL, com **quick-fix actions** no Problems Panel.
2. **Compilation diagnostics** — erros de compilação PL/SQL exibidos como
   sublinhados no editor. **Não está ativo na versão atual.**

---

## Compilation diagnostics (não ativo)

> ⚠️ Esta feature **não está ligada** na versão Oracle-only atual. A setting
> `utplsql.compilationDiagnostics.enabled` continua existindo, mas **não tem
> efeito**: nenhum diagnostic é emitido e não há `DiagnosticCollection` com
> source "utPLSQL Compilation". O antigo `src/compilationDiagnostics.ts` foi
> removido na migração Oracle-only (PRD-64); `checkCompilationErrors()`
> permanece em `oracleRunner.ts`, mas **sem caller de produção**.
>
> Enquanto não for religada, compile ou rode os testes para expor os erros
> PL/SQL.

### Fluxo previsto (quando religada)

```
executeRun() → Oracle executa → erros parseados → Problems Panel
  → editor mostra sublinhados vermelhos
```

### Configuração

```jsonc
{
  // Reservada. Atualmente NÃO tem efeito na versão Oracle-only:
  "utplsql.compilationDiagnostics.enabled": false
}
```

---

## Setup diagnostics

Na ativação da extensão, o `SetupValidator` verifica proativamente problemas
comuns de configuração:

| Verificação | Diagnostic | Severity |
|---|---|---|
| utPLSQL com major version menor que 3 no banco | `UTPLSQL_OLD_VERSION` | Warning |
| Objetos inválidos no schema utPLSQL | `UTPLSQL_INVALID_OBJECTS` | Warning |

> Os códigos `UTPLSQL_BAD_CONN` e `UTPLSQL_NO_COVERAGE` ainda têm handlers de
> quick-fix em `quickfix.ts`, mas **sem produtor** no código atual:
> `UTPLSQL_BAD_CONN` nunca é emitido e o diagnostic de cobertura não é
> adicionado no fluxo de execução Oracle-only.

A verificação de objetos inválidos (`ALL_OBJECTS` para `PACKAGE`/`TYPE`/
`PACKAGE BODY` no schema utPLSQL) é best-effort: assíncrona, sem prompt de
conexão, timeout de 5s e silenciosa em falha. A configuração
`setupDiagnostics.enabled: false` suprime a verificação.

Os resultados aparecem no **Problems Panel** com source "utPLSQL Setup".

### Quick-fix actions

Cada diagnostic oferece uma **Code Action** (ícone de lâmpada ou `Ctrl+.`):

| Diagnostic | Quick-fix |
|---|---|
| Conexão inválida (`UTPLSQL_BAD_CONN`) | **Reconfigurar conexão** → abre settings em `utplsql.connection` (apenas handler — este diagnostic não é emitido hoje) |
| Grants de cobertura (`UTPLSQL_NO_COVERAGE`) | **Copiar grants de cobertura para clipboard** → copia SQL pronto para colar (apenas handler — não é emitido no fluxo Oracle) |
| Objetos inválidos no utPLSQL (`UTPLSQL_INVALID_OBJECTS`) | **Recompilar UT3** → `DBMS_UTILITY.COMPILE_SCHEMA` e re-verifica |

### Comandos

| Comando | Descrição |
|---|---|
| `utPLSQL: Validar configuração` | Roda validação completa (setup + integridade da instalação utPLSQL) e mostra resultado no Problems Panel |
| `utPLSQL: Configurar conexão` | Abre settings em `utplsql.connection` |
| `utPLSQL: Copiar grants de cobertura para clipboard` | Copia `GRANT EXECUTE ON SYS.DBMS_PROFILER` **e** `GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE` para o clipboard |

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
  → Compilation diagnostics: não ativo na versão atual

Após execução
  → Falhas de cobertura são reportadas no output da execução, não como diagnostic
```

Todos os diagnósticos são **não-bloqueantes** — os testes rodam mesmo com
warnings. Apenas erros críticos (sem conexão) impedem a execução.
