# PRD-41 — Verificação de instalação do utPLSQL na ativação

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber |
| Data | 2026-08-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.11.0 |
| Arquivos afetados | `src/quickfix.ts`, `src/oracleRunner.ts`, `src/extension.ts` |

## 1. Resumo

Adicionar verificação de objetos inválidos no schema UT3 durante a ativação da extensão, gerando diagnósticos `utPLSQL Setup` quando o framework não está corretamente instalado, e oferecendo quick-fix para recompilar o schema.

## 2. Contexto e problema

A skill `oracle-utplsql` (baseada em `oracle/skills/db/devops/database-testing.md`) recomenda verificar objetos inválidos após instalação do utPLSQL:

```sql
SELECT object_name, object_type, status FROM all_objects
WHERE owner = 'UT3' AND object_type IN ('PACKAGE','TYPE') AND status = 'INVALID'
```

Atualmente o `oracleRunner.ts` só descobre o prefixo do schema (`discoverUtplsqlSchema` consultando `ALL_SYNONYMS`) mas **não verifica** se a instalação está íntegra. Erros de compilação em pacotes UT3 só são detectados no momento da execução, causando falhas enigmáticas (timeouts, XML vazio, "Oracle runner Nms" sem resultados).

O `SetupValidator` existente (`quickfix.ts`) já verifica CLI, Java, conexão e versão. Esta PRD adiciona a verificação de integridade do utPLSQL a esse validator.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Adicionar `validateUtplsqlInstall()` ao `SetupValidator`
- Executar na ativação quando `runnerMode !== 'cli'` e conexão disponível
- Gerar diagnostic `utPLSQL Setup` com severity `Warning` listando objetos inválidos
- Oferecer quick-fix: "Recompilar schema UT3" (`DBMS_UTILITY.COMPILE_SCHEMA`)

**Não-objetivos**
- Não reinstala o utPLSQL automaticamente
- Não verifica grants de `DBMS_PROFILER` (já coberto pelo coverage gate)
- Não faz refresh automático de objetos inválidos

## 4. Requisitos

### RF1 — Query de validação

Executar `SELECT object_name, object_type FROM all_objects WHERE owner = :schema AND status = 'INVALID' AND object_type IN ('PACKAGE','TYPE','PACKAGE BODY')`.

O schema é determinado via `discoverUtplsqlSchema` (prefixo existente) ou fallback `'UT3'`.

### RF2 — Diagnostic

Se houver objetos inválidos, gerar `vscode.Diagnostic` com:
- **Source**: `"utPLSQL Setup"`
- **Severity**: `Warning`
- **Message**: `"Schema UT3 contém N objetos inválidos: PKG1 (PACKAGE BODY), PKG2 (TYPE)"`
- **Range**: linha 0 do output channel (ou arquivo dummy)

### RF3 — Quick-fix

Code Action "Recompilar UT3" que executa:

```sql
BEGIN DBMS_UTILITY.COMPILE_SCHEMA(schema => 'UT3', compile_all => FALSE); END;
```

Após recompilação, re-verificar objetos inválidos e limpar diagnostic se resolvido.

### RF4 — Feature gate

Respeitar `utplsql.setupDiagnosticsEnabled` (default `true`). Se `false`, não executa a verificação.

**Não-funcionais**
- RNF1 — A query não deve bloquear a ativação da extensão (execução async)
- RNF2 — Timeout de 5 segundos para a query de validação

## 5. Solução proposta

### 5.1 quickfix.ts — SetupValidator

```typescript
static async validateUtplsqlInstall(): Promise<void> {
  const cfg = readConfig();
  if (!cfg.setupDiagnosticsEnabled) return;
  if (cfg.runnerMode === 'cli') return;

  const connStr = await resolveConnectionInternal(); // sem prompt
  if (!connStr) return;

  try {
    const parsed = parseConnString(connStr);
    const conn = await oracledb.getConnection(parsed);
    try {
      const prefix = await discoverUtplsqlSchema(conn);
      const schema = prefix.replace(/\.$/, '') || 'UT3';
      const result = await conn.execute(
        `SELECT object_name, object_type FROM all_objects
         WHERE owner = :schema AND status = 'INVALID'
         AND object_type IN ('PACKAGE','TYPE','PACKAGE BODY')`,
        { schema },
        { timeout: 5000 }
      );
      const rows = result.rows as [string, string][];
      if (rows && rows.length > 0) {
        const names = rows.map(r => `${r[0]} (${r[1]})`).join(', ');
        // aplicar diagnostic
      } else {
        // limpar diagnostic de validação anterior
      }
    } finally {
      await conn.close();
    }
  } catch {
    // ALL_OBJECTS pode não estar acessível — ignorar
  }
}
```

### 5.2 extension.ts — ativação

Adicionar `SetupValidator.validateUtplsqlInstall()` após `validateOnActivation()` existente. Executar de forma assíncrona (não bloqueia `activate`).

## 6. Configuração

Usa a setting existente `utplsql.setupDiagnosticsEnabled` (default `true`).

## 7. Plano de testes

- **Unitários**: `quickfix.test.ts` — mock da conexão retornando 2 objetos inválidos, verificar diagnostic gerado
- **Unitários**: `quickfix.test.ts` — mock retornando 0 objetos, verificar nenhum diagnostic
- **Unitários**: `quickfix.test.ts` — mock da conexão lançando erro (ALL_OBJECTS inacessível), verificar catch silencioso
- **Validação manual**: Instalar utPLSQL com package body inválido, ativar extensão, ver warning no Problems panel

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Query `all_objects` lenta em bancos com muitos objetos | Filtro `owner = 'UT3'` limita escopo a dezenas de objetos. Timeout de 5s. |
| Conexão Oracle demorada atrasa ativação | Execução async, não bloqueia `activate()`. Diagnostic aparece após ~1-2s. |
| Shared install com grants limitados (ORA-00942) | `try/catch` silencioso — sem diagnostic é melhor que falso erro. |
| `DBMS_UTILITY.COMPILE_SCHEMA` requer privilégio | Quick-fix documenta que requer `ALTER ANY PROCEDURE` ou execução como UT3. |

## 9. Rollout

- Versão alvo: `0.11.0` (minor)
- Feature gateada por setting existente `setupDiagnosticsEnabled`
- Depende de PRD-38 (Connection Pooling) para reutilizar pool na verificação

## 10. Critérios de aceite

- [ ] Objetos inválidos no schema UT3 geram diagnostic `utPLSQL Setup`
- [ ] Quick-fix "Recompilar UT3" disponível como Code Action
- [ ] `setupDiagnosticsEnabled: false` suprime verificação
- [ ] `runnerMode: 'cli'` pula verificação
- [ ] Timeout de 5s na query
- [ ] `npm run compile && npm run lint && node --test` passam

## 11. Questões em aberto

- Verificar também schemas `UT3_*` de shared install (ex: `UT3_HR`, `UT3_FINANCE`)?
- A query `all_objects` requer `SELECT ANY DICTIONARY` ou o owner UT3 concede acesso?
- Deve-se verificar também a versão do utPLSQL (já feito em `getCliInfo`)?
