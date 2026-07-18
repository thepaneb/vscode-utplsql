# PRD-12 — Cobertura de código para objetos SQL (views, queries)

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber |
| Data | 2026-07-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.8.0 |
| Arquivos afetados | `src/config.ts`, `src/viewCoverage.ts`, `src/extension.ts`, `src/runner.ts`, `docs/coverage-views.md` |

## 1. Resumo

Adicionar suporte a cobertura de código para objetos SQL (views) no Test Explorer, combinando a extensão do `type_mapping` do utPLSQL CLI com um novo serviço de rastreio via `V$SQL`, e documentar o padrão de instrumentação manual para casos críticos.

## 2. Contexto e problema

O utPLSQL coverage usa `DBMS_PROFILER`/`DBMS_PLSQL_CODE_COVERAGE`, que só instrumentam PL/SQL (package bodies, procedures, functions, triggers, type bodies). Views são objetos SQL puro — não têm linhas PL/SQL para perfilar.

Como resultado, testes que executam queries em views não geram nenhum dado de cobertura para os arquivos `.sql` correspondentes. O desenvolvedor não vê gutters, porcentagem nem qualquer indicador de que a view foi exercitada.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Fazer com que arquivos de view apareçam no relatório de cobertura do utPLSQL, mesmo que com 0 hits
- Rastrear quais views foram executadas durante o test run via `V$SQL` e reportar cobertura booleana (sim/não)
- Documentar padrão de instrumentação manual para cenários que exigem granularidade linha-a-linha

**Não-objetivos**
- Não implementa cobertura **linha-a-linha** para SQL — limitação do Oracle
- Não modifica o framework utPLSQL

## 4. Requisitos

### RF1 — type_mapping para views

Adicionar `views=VIEW` no `type_mapping` do `coverageSourceArgs` padrão.

```typescript
// config.ts
coverageSourceArgs: c.get<string[]>('coverageSourceArgs', [
  '-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$',
  '-type_subexpression=1',
  '-name_subexpression=2',
  '-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER/views=VIEW',
]),
```

Comportamento: views no schema coberto aparecem no relatório Cobertura com 0 hits em todas as linhas.

### RF2 — Serviço V$SQL

Módulo novo que consulta `V$SQL` para detectar quais views foram executadas.

```typescript
interface ViewCoverageEntry {
  uri: vscode.Uri;
  executed: boolean;
  sqlId?: string;
  executions?: number;
}
```

Fluxo:
1. `runner.ts` chama serviço pós-CLI (se `sqlCoverageEnabled=true`)
2. Serviço consulta `V$SQL` via connection string do utPLSQL
3. Match: `SQL_TEXT` normalizado ↔ arquivos `.sql` no workspace
4. Retorna `ViewCoverageEntry[]` → `run.addCoverage()`

### RF3 — Visualização

Views rastreadas aparecem como arquivos de cobertura:
- Não executada: todas as linhas em vermelho (0%)
- Executada: todas as linhas em verde (100%)
- Clicar navega para o arquivo

### RF4 — Documentação

`docs/coverage-views.md` com:
- Limitação técnica explicada
- Guia das 3 opções (type_mapping, V$SQL, instrumentação manual)
- Troubleshooting (privilégios Oracle)

## 5. Solução proposta

### 5.1 Fase 1 — config.ts
Adicionar `views=VIEW` ao `type_mapping` default.

### 5.2 Fase 2 — viewCoverage.ts
Serviço que conecta ao BD, consulta V$SQL, faz matching com views do workspace e retorna cobertura booleana.

### 5.3 Fase 3 — docs/coverage-views.md
Guia prático com exemplos.

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.sqlCoverageEnabled` | boolean | `false` | Habilita rastreio V$SQL para views |

Fase 1 (type_mapping) não requer setting — é automática.

Fase 2 requer `GRANT SELECT ON V$SQL TO <user>` no Oracle + setting `true`.

## 7. Plano de testes

- **Unitários**: matching SQL_TEXT ↔ view files, V$SQL vazio, `sqlCoverageEnabled=false`
- **Manual**: habilitar feature, rodar teste que consulta view, verificar cobertura

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| V$SQL exige SELECT — muitos não terão acesso | Feature off by default; documentar GRANT |
| V$SQL volátil (SGA pode limpar) | Best-effort; documentado |
| Falso positivo no matching | Usar FORCE_MATCHING_SIGNATURE |
| Performance | Timeout 5s na consulta |

## 9. Rollout

- Versão alvo: `0.7.0`
- Feature gateada por `sqlCoverageEnabled` (default false) — sem impacto
- CHANGELOG.md com entry na release

## 10. Critérios de aceite

- [ ] `coverageSourceArgs` default inclui `views=VIEW`
- [ ] View file aparece no relatório de cobertura (0 hits)
- [ ] `sqlCoverageEnabled=true`: views executadas mostram 100%
- [ ] `sqlCoverageEnabled=false`: comportamento inalterado
- [ ] `docs/coverage-views.md` criado
- [ ] `npm test` passa sem regressões
- [ ] `npx biome check src/` sem erros

## 11. Questões em aberto

- Conexão para V$SQL: reutilizar connection string do utPLSQL ou JDBC direto?
- Matching: considerar FORCE VIEW? Multi-schema?
- Timeout ideal para consulta V$SQL?
