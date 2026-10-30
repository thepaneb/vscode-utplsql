<!-- GENERATED FROM docs/brain/20-PRDs/prd-133-rate-limiting-keybindings.md — DO NOT EDIT -->

# PRD-133 — Rate limiting e granularidade de atalhos

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `src/commands/run.ts`, `package.json`, `src/test/unit/commands*.test.ts` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-27 (keybindings) |

## 1. Resumo

Prevenir **cliques duplos** em comandos pesados (run all, run folder, export) com um
**guard de execução** (lock) e revisar **keybindings/contextos** para evitar
conflitos e cobrir bem os modos (file/schema/tag).

## 2. Contexto e problema

- Já existe `isRunning()` e cancelamento, mas comandos UI-triggered podem ser
  disparados várias vezes antes do `currentRunToken` ser setado.
- Keybindings usam `when` clauses que podem não cobrir todos os modos (modo schema
  tem ids diferentes).
- Complementa PRD-27 (default keybindings).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Guard sincrono no início de `runWithProgress` que rejeita invocações concorrentes
  com mensagem amigável.
- Auditoria de `when` clauses: documentar matriz e corrigir lacunas.
- Adicionar keybindings faltantes para modos schema/tag quando aplicável.

**Não-objetivos**
- Mudar os atalhos existentes.
- Introduzir fila de execução (já coberto por `autoRunQueue`).

## 4. Requisitos

### RF1 — Lock concorrente
- `runWithProgress` adquire um lock síncrono antes de criar o
  `CancellationTokenSource`; se já houver run em andamento, exibe mensagem amigável
  e retorna.

### RF2 — Liberação do lock
- Lock é liberado no `finally` de `runWithProgress` (inclusive em erro/cancelamento).

### RF3 — Revisão de when clauses
- Auditoria de `when` clauses: documentar matriz (comando × modo × contexto) no
  vault; corrigir lacunas (ex.: `runAtCursor` em modo schema, `runFile` em `.sql`).

### RF4 — Testes
- Testes de concorrência (invocação dupla retorna sem iniciar 2ª execução).

**Não-funcionais**
- RNF1 — Sem regressão de UX.
- RNF2 — Cobertura ≥ thresholds.

## 5. Solução proposta

- Adicionar flag/lock em `registerRunCommands`.
- Revisar `package.json` keybindings/menus.
- Documentar matriz no vault.

## 6. Configuração

Nenhuma setting nova.

## 7. Plano de testes

- **Unitários**: teste de lock concorrente.
- **Integração**: disparar comando duas vezes rápido e verificar execução única.
- **Manual**: testar atalhos em modos file/schema/tag.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Lock não liberado em erro | `finally` garantido; teste de exceção |
| Mudança de `when` quebrar atalho existente | Manter atalhos atuais; apenas adicionar contextos faltantes; teste manual |

## 9. Rollout

- **0.23.0** ("Docs e qualidade residual"); `CHANGELOG.md`.

## 10. Critérios de aceite

- Lock concorrente funcional.
- Matriz de `when` documentada.
- Cobertura ≥ thresholds; suíte verde.

## 11. Questões em aberto

- O lock deve ser global ou por tipo de comando (permitir run + export simultâneos)?

## 12. Impacto no cérebro

Criar regra `BR-UX-*` ("comandos pesados são serializados por lock") com
`prds: ["PRD-133"]`, `implementacao:` e `testes:`. Enquanto `proposed`,
`regras: []`.

## Impacto nas docs

`CHANGELOG`.
