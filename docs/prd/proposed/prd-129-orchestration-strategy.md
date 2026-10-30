<!-- GENERATED FROM docs/brain/20-PRDs/prd-129-orchestration-strategy.md — DO NOT EDIT -->

# PRD-129 — Orquestrador de execução com Strategy

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `src/runner.ts`, `src/commands/run.ts`, `src/oracleRunner.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |
| Relaciona-se a | PRD-76 (export), PRD-78 (ordem aleatória), PRD-79 (escopo), PRD-111 (decomposição) |

## 1. Resumo

Extrair estratégias de execução (`NormalRun`, `CoverageRun`, `ExportRun`, `DebugRun`)
de `executeRun`/`executeRunOracle`, eliminando condicionais aninhados (`exporting`,
`coverageEnabled`, `htmlEnabled`) e facilitando extensão futura.

## 2. Contexto e problema

- `executeRun` e `executeRunOracle` ramificam em vários modos (run normal,
  cobertura, export, debug) com flags booleanas; cada feature nova adiciona `if`.
- `runner.ts` já tem `collectRunTargets`/`deriveLastRun` puros; a orquestração
  principal ainda é monolítica.
- Complementa PRD-111 (decomposição do oracleRunner) elevando o nível de
  abstração.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Definir interface `RunStrategy` com métodos `prepare`, `run`, `finalize`;
  implementar estratégias para os 4 modos.
- `executeRun` vira dispatcher que seleciona a estratégia a partir de
  `(coverage, exportReporter, debug)`.
- Estratégias testáveis isoladamente (montagem de reporters/escopo/SQL) sem
  `vscode`.

**Não-objetivos**
- Mudar o protocolo Oracle.
- Alterar formato do PL/SQL gerado ou a semântica dos binds.
- Introduzir dependências novas.

## 4. Requisitos

### RF1 — Interface e estratégias
- `src/runStrategy.ts` com interface `RunStrategy` e 4 implementações; cada uma
  encapsula seleção de reporters, escopo de cobertura, pós-processamento.

### RF2 — Dispatcher
- `executeRun` seleciona a estratégia a partir de `(coverage, exportReporter, debug)`
  e delega; o modo debug pode reusar `NormalRun` com hooks.

### RF3 — Testabilidade
- Estratégias testáveis isoladamente sem `vscode`; comportamento observável
  idêntico (PL/SQL/binds/mensagens).

**Não-funcionais**
- RNF1 — Sem mudança de comportamento; suíte verde.
- RNF2 — Cobertura ≥ thresholds.
- RNF3 — Nenhuma estratégia acima de ~120 linhas.

## 5. Solução proposta

- Extrair `src/runStrategy.ts`; refatorar `executeRun` para dispatcher.
- Manter `executeRunOracle` como executor de baixo nível invocado pela estratégia
  selecionada.

## 6. Configuração

Nenhuma setting nova.

## 7. Plano de testes

- **Unitários**: `runStrategy.test.ts` cobrindo seleção de estratégia e montagem por
  modo; regressão de `executeRun`/`executeRunOracle`.
- **Integração**: run normal, cobertura, export e debug sem regressão.
- **Manual**: "Run with Coverage", export de reporter, debug.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão sutil no PL/SQL gerado | Testes que fixam a string gerada para cada combinação de flags antes da refatoração |
| Strategy ocultar estado compartilhado | Estado no dispatcher; estratégias recebem o que precisam (injeção explícita) |
| Debug reusar hooks frágeis | Strategy debug explícita, não herança implícita |

## 9. Rollout

- **0.20.0** ("Observabilidade e desempenho"); sem mudança visível.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Dispatcher seleciona estratégia correta.
- PL/SQL/binds comprovadamente idênticos (testes).
- Cobertura ≥ thresholds; nenhuma estratégia > ~120 linhas.

## 11. Questões em aberto

- A estratégia debug deve viver neste módulo ou em `commands/debug.ts`?
- Vale manter `exporting` flag no executor de baixo nível por compatibilidade?

## 12. Impacto no cérebro

Ao concluir, criar a regra `BR-ARCH-*` ("modos de execução são estratégias, não
condicionais") com `prds: ["PRD-129"]`, `implementacao:` e `testes:`. Enquanto
`proposed`, `regras: []`.

## Impacto nas docs

`CHANGELOG` e `wiki/Architecture.md` descrevem o padrão Strategy.
