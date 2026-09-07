# PRD-53 — Debug de testes: variações (cursor, falhos, último)

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `src/extension.ts`, `src/state.ts`, `package.json` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |

## 1. Resumo

Hoje só existe `utplsql.debugTest`, que depura o package do arquivo ativo
(`extension.ts:318-332`). Python e Java oferecem variantes: debug at cursor,
debug dos falhos e debug da última execução. A infra já suporta: o PRD-33
entregou o debug adapter e `startDebugSession(packageName, testName?)`
(`debugger.ts:474`) já aceita um teste específico.

## 2. Contexto e problema

Para depurar um teste específico que falhou, o usuário precisa (a) localizar o
teste, (b) abrir o package e (c) rodar o debug — sem saber que
`startDebugSession` já aceita `testName`. Expor as variações reduz atrito e
reaproveita `lastFailedItems`/`lastRun` já mantidos pelo PRD-31.

## 3. Objetivos / Não-objetivos

**Objetivos**
- `utplsql.debugAtCursor` — depura o `%test`/`%suite` sob o cursor (`.pks`).
- `utplsql.debugFailed` — depura os testes que falharam na última rodada.
- `utplsql.debugLast` — repete em modo debug a última execução.

**Não-objetivos**
- Múltiplas sessões de debug simultâneas (uma por vez; picker se houver vários
  falhos).
- Breakpoints condicionais/avançados (fora do PRD-33).

## 4. Requisitos

### RF1 — Debug at cursor

Reusa `findAnnotationAtLine` (`extension.ts:760`) para achar a anotação sob o
cursor e chama `startDebugSession(packageName, procName?)`.

### RF2 — Debug failed

```typescript
vscode.commands.registerCommand('utplsql.debugFailed', async () => {
  const failed = state.getLastFailedItems();
  if (!failed.length) { /* aviso */ return; }
  const target = failed.length === 1 ? failed[0] : await pickTestItem(failed);
  const m = state.getMeta(target);
  if (!m) return;
  await startDebugSession(m.packageName, m.kind === 'test' ? m.procName : undefined);
});
```

### RF3 — Debug last

Análogo a `utplsql.rerunLast` (`extension.ts:181`), porém chamando
`startDebugSession(packageName, procName?)` conforme `lastRun.type`
(`all` → picker/primeiro; `suite`/`test`/`file` → package; `test` → package+proc).

### RF4 — Atalhos

| Comando | Atalho | When |
|---|---|---|
| `utplsql.debugAtCursor` | `Ctrl+Shift+U D` | `editorTextFocus && resourceExtname == .pks` |
| `utplsql.debugFailed` | `Ctrl+Shift+U Shift+D` | `utplsql:hasFailures` |

**Não-funcionais**
- RNF1 — Respeitar `utplsql.debugger.enabled`; avisar se desabilitado.
- RNF2 — Sem oracledb → mensagem amigável (não quebrar).

## 5. Solução proposta

Registrar os 3 comandos em `extension.ts`, reusando `startDebugSession`,
`findAnnotationAtLine`, `state.getLastFailedItems()` e `state.getLastRun()`.
Extrair `pickTestItem` (QuickPick quando há mais de um alvo).

## 6. Configuração

- Comandos `utPLSQL: Depurar teste no cursor`, `utPLSQL: Depurar testes
  falhos`, `utPLSQL: Depurar última execução`.
- Keybindings: `Ctrl+Shift+U D` / `Ctrl+Shift+U Shift+D`.

## 7. Plano de testes

- **Unitários**: seleção de alvo (um vs. vários falhos) — função pura de
  escolha; resolução de `packageName`/`procName` a partir de `LastRunState`.
- **Integração**: cursor em `%test` → debug abre no teste certo; falha → debug
  do falho; sem falhas → aviso.
- **Validação manual**: `utplsql.debugger.enabled: false` → mensagem.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Vários testes falhos → qual depurar? | QuickPick para escolher; default o primeiro. |
| Debug sem `testName` em suite grande | `startDebugSession(pkg)` cobre a suite (já existe). |
| Conflito de keybinding `Ctrl+Shift+U D` | Verificar `package.json`/README; ajustar se colidir. |

## 9. Rollout

- Release 0.14.0 (minor).
- CHANGELOG: "Debug: no cursor, nos falhos e na última execução".

## 10. Critérios de aceite

- `npm test` passa.
- `debugAtCursor` abre debug do teste sob o cursor.
- `debugFailed` abre debug do teste falho (com picker quando >1).
- `debugLast` repete a última execução em modo debug.
- Sem falhas/última execução → aviso, sem quebra.

## 11. Questões em aberto

- Debug de todos os falhos em sequência (sessões encadeadas)? — Follow-up.
- Integrar debug aos perfis de run do Test Explorer (debug profile)?
  — O VSCode exige um `TestRunProfile` com `Kind.Debug`; avaliar como follow-up.
