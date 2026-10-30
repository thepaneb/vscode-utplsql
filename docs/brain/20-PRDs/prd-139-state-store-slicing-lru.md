---
tipo: prd
id: PRD-139
aliases: [PRD-139]
status: proposed
titulo: "Fatiamento do TestStateManager e LRU no coverageStore"
versao: "0.21.0"
data: "2026-10-30"
autor: "Gil Cleber Barboza"
versao_titulo: "0.21.0 — Arquitetura, configuração e resiliência"
verificado: 2026-10-30
regras: []
docs: ["CHANGELOG"]
tags: [prd]
---

# PRD-139 — Fatiamento do TestStateManager e LRU no coverageStore

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.21.0 |
| Arquivos afetados | `src/state.ts`, `src/coverage.ts`, `src/runner.ts`, `src/test/unit/state.test.ts` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-56 (persistência de resultado), PRD-54 (cobertura global) |

## 1. Resumo

Fatiar `TestStateManager` em `CoverageStore`, `TestItemIndex` e `RunSnapshot`
compostos pelo manager (API preservada), e adicionar LRU/limpeza automática no
`coverageStore` no início de cada run, evitando acúmulo em sessões longas.

## 2. Contexto e problema

- `TestStateManager` acumula cobertura, meta, suiteMap, itemMap, lastResults e
  persistência em uma única classe.
- `coverageStore` (Map) cresce sem limite entre runs; `clearCoverage` existe mas
  não é chamado automaticamente.
- Mocks de teste precisam instanciar o manager inteiro.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Extrair `CoverageStore` (com LRU, teto configurável), `TestItemIndex`, `RunSnapshot`.
- `TestStateManager` compõe esses objetos e mantém a API pública.
- Limpar cobertura no início do run (ou LRU por entradas).

**Não-objetivos**
- Mudar a API pública do manager (compatibilidade de call sites).
- Persistir cobertura em disco.

## 4. Requisitos

### RF1 — CoverageStore com LRU

- Map com teto (ex.: 500 entradas) e evicção LRU; `clear()` mantido.

### RF2 — Composição

- `TestStateManager` delega a `CoverageStore`/`TestItemIndex`/`RunSnapshot`;
  métodos existentes continuam funcionando.

### RF3 — Limpeza automática

- `executeRun` chama `state.clearCoverage()` no início (ou equivalente).

**Não-funcionais**
- RNF1 — Cobertura ≥ thresholds.
- RNF2 — Nenhuma regressão de testes.

## 5. Solução proposta

- Criar `src/state/` com os três módulos; `state.ts` vira fachada.
- Testes focados por store.

## 6. Configuração

Nenhuma setting nova (teto interno).

## 7. Plano de testes

- **Unitários**: LRU evicção, delegação, limpeza automática.
- **Regressão**: `state.test.ts` verde.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Quebrar call sites | API preservada + `tsc --noEmit` |
| Evicção prematura | Teto generoso + testes |

## 9. Rollout

- 0.21.0; registrar no CHANGELOG.

## 10. Critérios de aceite

- Stores extraídos e compostos.
- LRU funcionando; cobertura limpa no início do run.
- Suíte verde.

## 11. Questões em aberto

- Teto de LRU configurável via setting ou fixo?

## 12. Impacto no cérebro

Ao concluir, criar regra `BR-ARCH-*` com `prds: ["PRD-139"]`. Enquanto `proposed`,
`regras: []`.

## Impacto nas docs

Superfície listada: CHANGELOG.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-54-coverage-toggle|PRD-54]] · [[prd-56-duration-persistence|PRD-56]]
- 🔗 Mesma versão (0.21.0): [[prd-128-event-bus-internal|PRD-128]] · [[prd-129-orchestration-strategy|PRD-129]] · [[prd-130-config-validation-typed-errors|PRD-130]] · [[prd-131-discovery-resilience-cache|PRD-131]] · [[prd-137-wallet-password-binding|PRD-137]] · [[prd-138-organization-strategy-pattern|PRD-138]]
- 🚀 ⬅️ release anterior: [[prd-120-lean-activation-lazy-setup|PRD-120 (0.20.0)]] · ➡️ próxima release: [[prd-88-locale-aware-formatting|PRD-88 (0.22.0)]]
<!-- brain:auto:end -->
