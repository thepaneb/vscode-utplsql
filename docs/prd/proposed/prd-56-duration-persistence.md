# PRD-56 — Duração por teste e persistência de resultados

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.15.0 |
| Arquivos afetados | `src/state.ts`, `src/results.ts`, `src/runner.ts`, `src/extension.ts` |
| Esforço estimado | 1 dia |
| Complexidade | Baixa-Média |

## 1. Resumo

Persistir o resultado da última execução (status, mensagem, duração por teste,
timestamp) no `workspaceState` e restaurá-lo ao reabrir o workspace. Hoje
`lastResults` é volátil (`state.ts:21-22`) e a duração, embora parseada
(`junit.ts:42`), não é armazenada no estado. PHPUnit Workbench e Go mantêm
histórico/results entre sessões.

## 2. Contexto e problema

Ao recarregar o VSCode, as decorações ✓/✗ e o estado "last failed" somem. O
usuário precisa rodar tudo de novo só para saber o que falhou na sessão
anterior. A duração por teste é reportada ao `TestRun` (nativa, exibida no
painel), mas não fica disponível para consulta posterior (ex.: "qual teste
está mais lento?").

## 3. Objetivos / Não-objetivos

**Objetivos**
- Gravar no `workspaceState` um snapshot do último run: `id → {status,
  message, durationMs, timestamp}`.
- Restaurar `lastResults` e `lastFailedItems` na ativação (para decorações e
  "Run Failed").
- Expor duração por teste no tooltip/label (opcional, setting).

**Não-objetivos**
- Histórico completo de múltiplas execuções (só o último snapshot).
- Gráficos/linhas de tendência de duração.
- Persistir cobertura (dados grandes).

## 4. Requisitos

### RF1 — Snapshot serializável

```typescript
// state.ts
interface PersistedResult { status: TestStatus; message?: string; durationMs?: number; ts: number; }
type PersistedRun = Record<string, PersistedResult>; // key = test item id
```

`TestLineResult` (`state.ts:5`) ganha `durationMs?: number` e `ts?: number`.

### RF2 — Escrita no fim do run

Em `runner.ts` (após `applyResults`) e em `oracleRunner.ts` (após
`applyResultsFromCases`), gravar via `state.persist(memento)` usando
`context.workspaceState`. O `TestStateManager` passa a receber o
`Memento` na ativação (`extension.ts`).

### RF3 — Restauração na ativação

`extension.ts` chama `state.restore(memento)` antes do primeiro refresh, e
reconstrói `lastFailedItems` a partir do snapshot (mapeando ids para
`TestItem` via `suiteMap` após o discovery).

### RF4 — Duração no tooltip

Setting `utplsql.showTestDuration` (default `false`): sufixa `(1.2s)` no label
do `TestItem` de teste após a execução.

**Não-funcionais**
- RNF1 — Snapshot leve (sem mensagens gigantes: truncar em N caracteres).
- RNF2 — Ignorar snapshots de um workspace diferente (key por workspace).

## 5. Solução proposta

Estender `TestStateManager` com `persist()`/`restore()` e `durationMs`/`ts` em
`TestLineResult`; injetar `context.workspaceState` via construtor ou setter.
Preencher `durationMs` em `applyResultsFromCases` (já recebido por parâmetro).

## 6. Configuração

- Setting `utplsql.showTestDuration` (bool).

## 7. Plano de testes

- **Unitários**: persist/restore round-trip; truncamento de mensagem; restauro
  de `lastFailedItems` a partir do snapshot.
- **Integração**: rodar → reload → decorações e "Run Failed" restaurados.
- **Manual**: duração exibida no label quando a setting está ligada.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Snapshot obsoleto aponta para testes removidos | Ignorar ids sem `TestItem` correspondente no restauro. |
| Aumento de tamanho do workspaceState | Truncar mensagens; só um snapshot. |
| Formato muda entre versões | Versionar o snapshot (`v: 1`) e descartar se incompatível. |

## 9. Rollout

- Release 0.15.0 (minor).
- CHANGELOG: "Persistência do último resultado + duração por teste".

## 10. Critérios de aceite

- `npm test` passa.
- Último resultado sobrevive a reload (decorações + "Run Failed").
- `showTestDuration` exibe duração no label.
- Snapshot obsoleto não quebra a ativação.

## 11. Questões em aberto

- Persistir em `globalState` (cross-workspace) vs `workspaceState`?
  — `workspaceState` (resultados são por projeto).
- Histórico de N runs para detecção de flaky? — Follow-up.
