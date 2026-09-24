---
tipo: prd
id: PRD-86
aliases: [PRD-86]
status: completed
titulo: "Debugger honra stopOnException (break_exception)"
versao: "0.13.0"
data: "2026-09-24"
autor: "Gil Cleber Barboza"
verificado: 2026-09-24
tags: [prd]
---

# PRD-86 — Debugger honra stopOnException (break_exception)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-24 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `src/dbmsDebug.ts`, `src/debugger.ts`, `docs/wiki/Debugger.md` (gerado), `docs/functional/11-debugger.md` (gerado), `CHANGELOG.md` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa-Média |

## 1. Resumo

A setting `utplsql.debugger.stopOnException` existia desde a PRD-33, mas **nunca
teve efeito**: o adapter guardava o valor sem lê-lo e o `CONTINUE` do
`DBMS_DEBUG` era emitido sem o breakflag `break_exception`, então o debuggee
nunca suspendia em exceções — com ou sem a setting. Esta PRD corrige o cliente
para propagar `DBMS_DEBUG.break_exception` quando `stopOnException` é `true`,
fazendo a setting funcionar de fato.

## 2. Contexto e problema

A documentação (`docs/brain/10-Projeto/Funcional/11-debugger.md`, README)
descreve `utplsql.debugger.stopOnException` como "Para quando uma exceção não
tratada é levantada" (default `true`). Na prática:

- `UtplsqlDebugAdapter.handleMessage('launch')` grava `this.config.stopOnException`
  (`src/debugger.ts`), mas **nenhum ponto do adapter o consulta**;
- `DbmsDebugClient.run()` montava os `breakflags` apenas por ação
  (`continue=0`, `over=break_next_line`, `into=break_any_call`,
  `out=break_any_return`) — **sem** `DBMS_DEBUG.break_exception`;
- o `CASE` de `v_stopped` já reconhecia `reason_exception`/`reason_handler`, mas
  como o flag não era pedido, o `CONTINUE` retornava direto `exiting` mesmo com
  a exceção levantada.

Sondagem no banco real (utPLSQL 3.2.3 / Oracle Free 23ai) confirmou: um package
que faz `RAISE_APPLICATION_ERROR` retorna `exiting` no primeiro `CONTINUE`
(flags=0) e `exception` quando `break_exception` é somado aos flags.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Fazer `utplsql.debugger.stopOnException` ter efeito real.
- Expor `break_exception` no `DbmsDebugClient` (parâmetro opcional nas ações de
  continuação/step).
- Distinguir a parada por exceção (`reason='exception'` no DAP) da parada por
  breakpoint (`reason='breakpoint'`).

**Não-objetivos**
- Não adiciona UI nova (a setting e o comando já existem).
- Não para em `reason_handler` por padrão (só em `reason_exception`).
- Não muda o comportamento de breakpoints nem o entry-stop.

## 4. Requisitos

### RF1 — `break_exception` no cliente

`DbmsDebugClient.continueRun/stepInto/stepOver/stepOut` aceitam
`breakOnException?: boolean` (default `false`). Quando `true`, o `CONTINUE` soma
`DBMS_DEBUG.break_exception` aos `breakflags`.

### RF2 — StopReason distingue exceção

`StopReason` ganha `'exception'`. O `run()` expõe `v_is_exc` (reason_exception
ou reason_handler) e retorna `'exception'` quando suspenso por exceção,
`'break'` caso contrário.

### RF3 — Adapter honra a setting

`waitForNextStop` passa `this.config?.stopOnException !== false` ao cliente. O
`reportStop` emite `stopped` com `reason='exception'`; se
`stopOnException === false` e o evento for exceção, segue como `no_break`.

**Não-funcionais**
- RNF1 — Com `stopOnException=false` o comportamento é idêntico ao anterior
  (não suspende em exceções).
- RNF2 — `stopOnException` default `true`: passa a suspender em exceções (o que
  a documentação já prometia).
- RNF3 — Cobertura unitária e E2E; thresholds mantidos.

## 5. Solução proposta

- `src/dbmsDebug.ts`: `run(action, breakOnException)` soma
  `DBMS_DEBUG.break_exception`; `v_is_exc` vira OUT bind; `StopReason` inclui
  `'exception'`.
- `src/debugger.ts`: `waitForNextStop` calcula `breakOnException` do config;
  `reportStop` trata `'exception'` (para ou segue conforme a setting) e envia
  `reason='exception'` ao DAP.

## 6. Configuração

Nenhuma setting nova — `utplsql.debugger.stopOnException` (default `true`) passa
a funcionar como documentado.

## 7. Plano de testes

- **Unitários**:
  - `dbmsDebug.test.ts`: `isException=1` → `'exception'`; `isException=0` →
    `'break'`; `continueRun(true)` envia `breakOnException: 1` no bind.
  - `debugger.test.ts`: exceção suspende quando `stopOnException=true` (default)
    e é ignorada quando `false`.
- **Integração** (`debuggerExceptionE2E.test.ts`, banco real):
  - `breakOnException=true` suspende em `reason_exception` (frame na linha do
    `RAISE`);
  - `breakOnException=false` vai direto a `exiting`.
- **Validação manual**: launch config com `stopOnException` ligado/desligado num
  teste que falha.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Passar a parar em exceções quebra o fluxo de quem não esperava | Comportamento já documentado como default; `stopOnException=false` mantém o antigo |
| `break_handler` poluir a parada | Não é solicitado; só `break_exception` |
| Exceções tratadas internamente pelo utPLSQL gerarem paradas extras | `stopOnException` é opt-out; usuário pode desligar |

## 9. Rollout

- Correção entra na **0.13.0** (versão em desenvolvimento).
- `CHANGELOG.md` (bullet de correção).
- Docs geradas do vault (`11-debugger.md`).

## 10. Critérios de aceite

- `continueRun(true)` retorna `'exception'` na exceção real; `false` retorna
  `'exiting'` (verificado no banco).
- `stopOnException=false` não emite `stopped` por exceção.
- `npm run compile`, `lint`, `test:unit`, `test:coverage` e a suíte de
  integração passam.

## 11. Questões em aberto

- Parar também em `reason_handler` (entrada no handler)? Inclinação: **não** por
  padrão (ruído); pode virar setting no futuro.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-33-plsql-debugger-integration|PRD-33]]
<!-- brain:auto:end -->
