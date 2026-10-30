<!-- GENERATED FROM docs/brain/20-PRDs/prd-128-event-bus-internal.md — DO NOT EDIT -->

# PRD-128 — Event bus interno e desacoplamento de callbacks de execução

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.21.0 |
| Arquivos afetados | `src/runner.ts`, `src/oracleRunner.ts`, `src/state.ts`, `src/statusBar.ts`, `src/decorations.ts`, `src/commands/run.ts`, `src/test/unit/*.test.ts` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-102 (observabilidade), PRD-111 (decomposição do oracleRunner) |

## 1. Resumo

Hoje a execução propaga resultados por **callbacks ad hoc** (`onComplete`,
`onCoverageResult`, `onCoverageHtmlReport`, `onSuiteStart`) espalhados em
`executeRun`/`executeRunOracle` e nos consumidores. Esta PRD introduz um **event bus
tipado e síncrono** (emitter interno) para os eventos de run, desacoplando a UI da
lógica de execução e facilitando testes e futuras extensões.

## 2. Contexto e problema

- `runner.ts` e `oracleRunner.ts` recebem 4+ callbacks opcionais com semânticas
  parcialmente sobrepostas; adicionar um novo consumidor exige mudar a assinatura de
  `executeRun`/`executeRunOracle`.
- `commands/run.ts` monta os callbacks inline (`onSuiteStart`, `onComplete` do
  status bar), acoplando o orquestrador da UI ao formato da execução.
- Sem um ponto central de eventos, testes de integração precisam mockar vários
  callbacks para validar efeitos colaterais.
- A PRD-111 já decompõe `executeRunOracle` em etapas; esta PRD complementa expondo
  os efeitos colaterais como eventos, não como parâmetros.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Criar um `RunEventBus` (ou reusar um emitter tipado) com eventos:
  `suite:start`, `run:start`, `run:complete`, `coverage:generated`,
  `coverage:html:written`, `run:cancelled`, `run:error`.
- Substituir os callbacks opcionais por `emit`/`on` no bus, mantendo a API pública
  de `executeRun`/`executeRunOracle` compatível via adapter.
- Permitir múltiplos assinantes (status bar, decorações, diagnósticos) sem alterar
  o núcleo de execução.

**Não-objetivos**
- Tornar o bus assíncrono ou cross-process (permanece in-process, síncrono).
- Mudar o protocolo de streaming Oracle (`UT_OUTPUT_BUFFER_TMP`).
- Substituir o `vscode.TestRun`/Test Explorer (o bus é complementar).

## 4. Requisitos

### RF1 — Definição do bus

- Módulo `src/runEvents.ts` (puro, sem `vscode`) com tipos de eventos e um
  `createRunEventBus()` que retorna `{ on, off, emit, dispose }`.
- Eventos tipados com payload mínimo (contagens, duração, uris, erro redigido).

### RF2 — Integração

- `executeRun`/`executeRunOracle` recebem um `bus` (ou usam um bus default criado
  em `extension.ts` e injetado via `CommandDeps`) e emitem os eventos correspondentes
  aos callbacks atuais.
- Os callbacks atuais passam a ser **adapters** registrados no bus em
  `commands/run.ts` e `extension.ts`, preservando comportamento.

### RF3 — Desacoplamento da UI

- Status bar, decorações e `refreshCompilationDiagnostics` passam a assinar o bus
  em vez de serem chamados diretamente no fluxo de run.
- `extension.ts` registra os assinantes na ativação e os descarta no `deactivate`.

### RF4 — Testabilidade

- Testes podem criar um bus e assertar eventos emitidos sem mockar `vscode`.
- O bus não deve reter referências após `dispose` (sem leak).

**Não-funcionais**
- RNF1 — Sem mudança de comportamento observável; suíte verde.
- RNF2 — Cobertura ≥ thresholds; bus coberto por testes unitários.
- RNF3 — Nenhum listener registrado fora do ciclo de vida da extensão.

## 5. Solução proposta

- Extrair `src/runEvents.ts` com o emitter tipado (inspirado em `EventEmitter`
  do Node, mas tipado e sem dependência de `vscode`).
- Injetar o bus em `CommandDeps` e nos runners; manter os callbacks atuais como
  adapters temporários para compatibilidade.
- Registrar assinantes em `extension.ts` (status bar, decorações, diagnósticos).

## 6. Configuração

Nenhuma setting nova.

## 7. Plano de testes

- **Unitários**: `runEvents.test.ts` cobrindo emit/on/off, múltiplos assinantes,
  dispose e tipagem; regressão dos runners com bus mockado.
- **Integração**: run real com status bar/decorações reagindo aos eventos.
- **Manual**: verificar que decorações e status bar atualizam como antes.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Ordem de eventos diferente da atual | Manter ordem de emissão idêntica aos callbacks atuais; testes fixam a sequência |
| Leak de listeners em refresh/re-run | `dispose` no finally de cada run; teste de contagem de listeners |
| Bus síncrono bloquear o host | Emit síncrono apenas para efeitos leves; I/O pesado continua assíncrono nos assinantes |

## 9. Rollout

- **0.21.0** ("Arquitetura, configuração e resiliência"); sem mudança visível.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Bus tipado em `src/runEvents.ts` com testes.
- Callbacks atuais tornam-se adapters; comportamento idêntico.
- Status bar/decorações/diagnósticos assinam o bus.
- Cobertura ≥ thresholds; suíte verde.

## 11. Questões em aberto

- O bus deve ser singleton global ou instância por `CommandDeps`?
- Expor eventos para extensões terceiras via `vscode.EventEmitter` público?

## 12. Impacto no cérebro

Ao concluir, criar a regra `BR-ARCH-*` ("efeitos colaterais de run passam pelo
event bus tipado, não por callbacks ad hoc") com `prds: ["PRD-128"]`,
`implementacao:` e `testes:`. Enquanto `proposed`, `regras: []`.

## Impacto nas docs

`CHANGELOG` e `wiki/Architecture.md` descrevem o bus e a lista de eventos.
