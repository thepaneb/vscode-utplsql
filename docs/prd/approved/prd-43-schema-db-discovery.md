# PRD-43 — Schema-mode: descoberta de suites via ALL_OBJECTS e ALL_SOURCE

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber |
| Data | 2026-08-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.11.0 |
| Arquivos afetados | `src/discovery.ts`, `src/oracleRunner.ts`, `src/extension.ts`, `src/config.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

Complementar a descoberta de suites no modo schema (`organization: 'schema'`) com queries ao banco de dados via `ALL_OBJECTS` e `ALL_SOURCE`, permitindo executar testes de schemas cujos arquivos `.pks` não estão disponíveis localmente.

## 2. Contexto e problema

A skill `oracle-schema-discovery` (baseada em `oracle/skills/db/agent/schema-discovery.md`) documenta queries de introspecção de schema. O `discovery.ts` atual só lê `.pks` do filesystem. No modo schema, os testes são organizados por schema (`db/HR/package.pks`), mas nem sempre os arquivos estão disponíveis localmente:

- **Shared install**: schemas compartilhados em um único banco, código-fonte em repositório separado
- **CI/CD**: o ambiente de CI tem o banco mas não o código-fonte completo
- **Ambientes remotos**: conexão com banco de produção/homologação sem clone local

A skill recomenda usar `ALL_OBJECTS` para descobrir objetos diretamente do banco, complementando (não substituindo) a descoberta filesystem.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Adicionar `discoverSchemaFromDb(connStr, schema, folders)` que consulta `ALL_OBJECTS`
- Para packages encontrados, ler `ALL_SOURCE` para extrair texto da package specification
- Parsear com `parseSuiteText` existente
- Combinar resultados com descoberta filesystem: local tem prioridade sobre DB

**Não-objetivos**
- Não substitui a descoberta filesystem
- Não implementa descoberta automática de schemas (usuário configura `organizationSchemaPattern`)
- Não suporta URIs virtuais para jump to failure (apenas execução)
- Não faz cache dos resultados entre sessões

## 4. Requisitos

### RF1 — Query ALL_OBJECTS

```sql
SELECT object_name FROM all_objects
WHERE owner = :schema AND object_type = 'PACKAGE' AND status = 'VALID'
```

### RF2 — Query ALL_SOURCE

```sql
SELECT text FROM all_source
WHERE owner = :schema AND name = :pkg AND type = 'PACKAGE'
ORDER BY line
```

### RF3 — Merge com filesystem

Se arquivo `.pks` local existe para o schema+package, usa ele (prioridade filesystem). Se não, usa resultado do DB.

### RF4 — Feature gate

Só ativo quando `organization: 'schema'` e `runnerMode !== 'cli'`. Se `runnerMode: 'auto'` com fallback CLI, a descoberta DB é feita apenas se Oracle disponível.

### RF5 — Uri virtual

Packages descobertos via DB usam URI scheme `utplsql-db:/` (ex: `utplsql-db:/HR/UT_PKG_ORDERS.pks`). O TestItem é criado como `canRun: true`.

**Não-funcionais**
- RNF1 — Se `ALL_SOURCE` não estiver acessível (ORA-00942), fallback silencioso para filesystem
- RNF2 — Timeout de 10 segundos para queries de descoberta

## 5. Solução proposta

### 5.1 discovery.ts — nova função

```typescript
export async function discoverSchemaFromDb(
  connStr: string,
  schema: string,
  folders: readonly vscode.WorkspaceFolder[],
): Promise<SuiteFile[]> {
  const parsed = parseConnString(connStr);
  let conn;
  try {
    const oracledb = await import('oracledb');
    conn = await oracledb.getConnection(parsed);
    const pkgs = await conn.execute(
      `SELECT object_name FROM all_objects
       WHERE owner = :schema AND object_type = 'PACKAGE' AND status = 'VALID'`,
      { schema: schema.toUpperCase() }
    );
    const results: SuiteFile[] = [];
    for (const row of (pkgs.rows ?? []) as [string][]) {
      const pkgName = row[0];
      // Pular packages que começam com UT_ (são suites de teste, não código)
      if (/^UT_/i.test(pkgName)) continue;
      const source = await conn.execute(
        `SELECT text FROM all_source
         WHERE owner = :schema AND name = :name AND type = 'PACKAGE'
         ORDER BY line`,
        { schema: schema.toUpperCase(), name: pkgName }
      );
      const text = (source.rows as [string][]).map(r => r[0]).join('');
      const parsed = parseSuiteText(text);
      if (parsed && parsed.tests.length > 0) {
        const uri = vscode.Uri.parse(`utplsql-db:/${schema}/${pkgName}.pks`);
        results.push({ uri, ...parsed, folder: folders[0] });
      }
    }
    return results;
  } catch {
    return []; // fallback silencioso
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}
```

### 5.2 Integração com discoverWorkspace

```typescript
// extension.ts — doRefresh()
const fileSuites = await discoverWorkspace(patterns, folders);
if (cfg.organization === 'schema' && cfg.runnerMode !== 'cli') {
  const connStr = await resolveConnection();
  if (connStr) {
    const schemas = extractSchemasFromPattern(folders, cfg.organizationSchemaPattern);
    for (const schema of schemas) {
      const dbSuites = await discoverSchemaFromDb(connStr, schema, folders);
      // Merge: fileSuites têm prioridade (não sobrescrever)
      for (const dbSuite of dbSuites) {
        if (!fileSuites.some(fs => fs.packageName === dbSuite.packageName)) {
          fileSuites.push(dbSuite);
        }
      }
    }
  }
}
```

## 6. Configuração

Usa settings existentes:
- `utplsql.organization` — deve ser `'schema'`
- `utplsql.organizationSchemaPattern` — padrão para extrair schema do path

## 7. Plano de testes

- **Unitários**: `discovery.test.ts` — mock da conexão Oracle, verificar `discoverSchemaFromDb` retorna suites
- **Unitários**: `discovery.test.ts` — mock com zero packages, verificar array vazio
- **Unitários**: `discovery.test.ts` — mock com package sem `%suite`, verificar filtrado
- **Unitários**: `discovery.test.ts` — mock com `ALL_SOURCE` inacessível, verificar array vazio (sem erro)
- **Integração**: schema-mode com DB real, verificar merge filesystem + DB

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `ALL_SOURCE` grande (packages com milhares de linhas) | Limitar a 10000 linhas na query (`FETCH FIRST 10000 ROWS ONLY`). Truncar com warning no log. |
| Permissão negada em `ALL_SOURCE` (ORA-00942) | `try/catch` retorna array vazio. Sem diagnostic — o desenvolvedor vê menos suites, não erro falso. |
| URI virtual `utplsql-db:/` não suportado por CodeLens/Decorations | CodeLens e Decorations registram `{ scheme: 'file', pattern: '**/*.pks' }`. URIs virtuais não acionam esses providers — limitação documentada. |
| Performance: N packages × M linhas cada | Execução async, fora do hot path. Em schema com 100 packages, ~2-3s. Aceitável para refresh. |

## 9. Rollout

- Versão alvo: `0.11.0` (minor)
- Feature gateada por `organization: 'schema'` existente (não afeta modo `file`)
- Depende de PRD-38 (Connection Pooling) para reutilizar pool

## 10. Critérios de aceite

- [ ] `discoverSchemaFromDb` retorna suites de packages no schema
- [ ] Merge com filesystem: local tem prioridade, DB complementa
- [ ] Fallback silencioso se `ALL_SOURCE` não acessível
- [ ] Packages `UT_*` (suites de teste) são ignorados na descoberta DB
- [ ] `npm run compile && npm run lint && node --test` passam
- [ ] Documentada limitação: URIs virtuais não têm CodeLens/Decorations

## 11. Questões em aberto

- Suporte a `ALL_SOURCE` para package bodies também (para coverage em PRD futuro)?
- Cache da descoberta DB: invalidar no refresh manual ou cache por 5 minutos?
- Schemas múltiplos: como extrair lista de schemas do `organizationSchemaPattern` quando o padrão é `db/{schema}/**` e múltiplos folders?
- Jump to failure em packages descobertos via DB: abrir editor virtual readonly com conteúdo do `ALL_SOURCE`?
