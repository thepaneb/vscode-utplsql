# PRD-12 — Cobertura de código para objetos SQL (views, queries)

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber |
| Data | 2026-07-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.7.0 |
| Arquivos afetados | `src/config.ts`, `src/coverage.ts`, `src/viewCoverage.ts`, `src/extension.ts`, `src/runner.ts`, `docs/coverage-views.md` |

## 1. Resumo

Adicionar suporte a cobertura de código para objetos SQL (views, queries avulsas) no Test Explorer, combinando a extensão do `type_mapping` do utPLSQL CLI com um novo serviço de rastreio via `V$SQL`, e documentar o padrão de instrumentação manual para casos críticos.

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

### RF2 — Serviço V$SQL

Módulo novo que consulta `V$SQL` para detectar quais views foram executadas durante o test run.

### RF3 — Visualização

Views rastreadas aparecem como arquivos de cobertura no Test Explorer (0% ou 100% por view).

### RF4 — Documentação

`docs/coverage-views.md` com limitação técnica + guia das 3 opções.

## 5. Solução proposta

### 5.1 Fase 1 — type_mapping (config.ts)
```typescript
'-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER/views=VIEW'
```

### 5.2 Fase 2 — viewCoverage.ts
Serviço que:
1. Conecta BD via CLI
2. Consulta V$SQL pelos SQL_IDs do intervalo
3. Match SQL_TEXT ↔ .sql files no workspace
4. Retorna `ViewCoverageEntry[]` com `executed: boolean`

### 5.3 Fase 3 — Documentação

## 6. Configuração
- `utplsql.sqlCoverageEnabled` (boolean, default `false`)

## 7. Plano de testes
- Unitários: matching SQL_TEXT ↔ view files, V$SQL vazio
- Manual: habilitar feature, rodar teste que consulta view

## 8. Riscos
- V$SQL requer privilégio SELECT (mitigação: feature off by default + docs)
- V$SQL volátil (mitigação: best-effort, documentado)
- Falso positivo no matching (mitigação: FORCE_MATCHING_SIGNATURE)

## 9. Rollout
- Versão alvo: 0.7.0
- Feature gateada (default false)

## 10. Critérios de aceite
- [ ] coverageSourceArgs inclui views=VIEW
- [ ] View aparece no relatório de cobertura
- [ ] sqlCoverageEnabled=true mostra views executadas como 100%
- [ ] sqlCoverageEnabled=false não altera comportamento
- [ ] docs/coverage-views.md criado
- [ ] npm test + biome check passam

## 11. Questões em aberto
- Conexão para V$SQL: reutilizar connection string do utPLSQL?
- Matching: multi-schema? FORCE VIEW?
- Performance da consulta V$SQL (timeout 5s?)
