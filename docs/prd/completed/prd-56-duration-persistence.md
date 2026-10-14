<!-- GENERATED FROM docs/brain/20-PRDs/prd-56-duration-persistence.md — DO NOT EDIT -->

# PRD-56 — Duração por teste e persistência de resultados

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `src/state.ts`, `src/results.ts`, `src/runner.ts`, `src/oracleRunner.ts`, `src/testTree.ts` (label com duração), `src/extension.ts`, `src/config.ts`, `package.json` (setting), 24 notas `docs/brain/60-README/` |
| Esforço estimado | 1 dia |
| Complexidade | Baixa-Média |

## 1. Resumo

Persistir o resultado da última execução (status, mensagem, duração por teste,
timestamp) no `workspaceState` e restaurá-lo ao reabrir o workspace. Hoje
`lastResults` é volátil (`state.ts:22`) e a duração, embora parseada
(`junit.ts:45`) e já repassada ao `TestRun` (`results.ts:152`), não é armazenada
no estado. PHPUnit Workbench e Go mantêm histórico/results entre sessões.

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

`TestLineResult` (`state.ts:6`) ganha `durationMs?: number` e `ts?: number`.

### RF2 — Escrita no fim do run

Em `runner.ts` (após `applyResults`) e em `oracleRunner.ts` (após
`applyResultsFromCases`), gravar via `state.persist()` usando
`context.workspaceState`. O `Memento` é entregue por **setter** na ativação
(`state.attachMemento(memento)` em `extension.ts`) — evita mudar o construtor do
`TestStateManager` e o churn em toda a suíte de testes que o instancia.

### RF3 — Restauração na ativação

`extension.ts` chama `state.restore()` antes do primeiro refresh, e reconstrói
`lastFailedItems` a partir do snapshot (mapeando ids para `TestItem` via
`suiteMap` após o discovery).

### RF4 — Duração no tooltip

Setting `utplsql.showTestDuration` (default `false`): sufixa `(1.2s)` no label
do `TestItem` de teste após a execução.

### RF5 — Documentação e i18n (gate de CI)

- A setting `utplsql.showTestDuration` precisa constar no `README.md` **e nas 23
  variantes** (o `docs-fidelity` falha o CI caso contrário) + na tabela de
  Configuration da wiki;
- nenhum comando novo → sem nls/i18n de paleta; as mensagens de runtime, se
  houver, seguem `src/i18nLocales.ts`;
- validação local na PR: `npm run docs:check` (§7).

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
  de `lastFailedItems` a partir do snapshot; snapshot com `v` incompatível é
  descartado sem lançar.
- **Integração**: rodar → reload → decorações e "Run Failed" restaurados.
- **Manual**: duração exibida no label quando a setting está ligada.
- **CI**: `npm run docs:check` (setting nas 24 notas de README) + `brain:ci`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Snapshot obsoleto aponta para testes removidos | Ignorar ids sem `TestItem` correspondente no restauro. |
| Aumento de tamanho do workspaceState | Truncar mensagens; só um snapshot. |
| Formato muda entre versões | Versionar o snapshot (`v: 1`) e descartar se incompatível. |

## 9. Rollout

- Release 0.16.0 (minor).
- CHANGELOG: "Persistência do último resultado + duração por teste".

## 10. Critérios de aceite

- `npm test` passa.
- Último resultado sobrevive a reload (decorações + "Run Failed").
- `showTestDuration` exibe duração no label.
- Snapshot obsoleto não quebra a ativação.
- `npm run docs:check` verde (setting presente nas 24 notas de README).

## 11. Questões em aberto

- Persistir em `globalState` (cross-workspace) vs `workspaceState`?
  — **Fechado:** `workspaceState` (resultados são por projeto).
- Histórico de N runs para detecção de flaky? — Follow-up.
- Injeção do `Memento` por construtor ou setter? — **Fechado em 2026-10-14:
  setter** (`state.attachMemento`), para não mexer no construtor e evitar churn
  na suíte de testes.

## 12. Impacto no cérebro

Regra criada em 2026-10-14: **`BR-QUAL-003`** — “último resultado persistido e
restaurado com snapshot versionado” — com `prds: ["PRD-56"]`, `implementacao:`
(`src/state.ts`, `src/oracleRunner.ts`, `src/results.ts`, `src/extension.ts`,
`src/testTree.ts`), `testes:` (`src/test/unit/state.test.ts`) e `requisitos:`
RF1–RF4 + RNF1/RNF2. O `regras:` deste frontmatter é derivado pelo `brain:sync`.

## 13. Implementado (2026-10-14)

Entregue na branch `feat/prd-56-duration-persistence` (regra BR-QUAL-003):

- **Snapshot versionado** (`v: 1`) em `utplsql.lastRunSnapshot` no
  `workspaceState`, com `durationMs`/`ts` por teste e mensagens truncadas em 500
  caracteres (RNF1). Formato desconhecido ou entrada inválida é descartado sem
  lançar — a ativação nunca quebra (RNF2 garantido pelo escopo do
  `workspaceState`).
- **`Memento` por setter** (`state.attachMemento`) e `restore()` **antes** do
  primeiro refresh, para o label com duração sair certo já na árvore; a
  reconstrução de `lastFailedItems` (e as decorações/context key) roda **depois**
  do primeiro refresh, quando os ids já têm itens (§12 da nota — decisão da §11).
- **Duração no label em dois pontos**: no fim do run (`applyResultsFromCases`,
  feedback imediato) e na construção do item (`testTree.ts`, cobre refresh,
  reload e resolução lazy). `withDurationSuffix` remove o sufixo anterior, então
  reaplicar não acumula.
- **Formato da duração**: `< 1s` → `850ms`; `≥ 1s` → `1.2s` (uma casa). Sem
  formatação sensível a locale — isso é o escopo da PRD-88 (0.21.0).
- **Não persistido**: `lastRun`/"Rerun Last" continua sendo apenas de sessão
  (decisão registrada; a §2 pedia decorações e "Run Failed", que são cobertos).
