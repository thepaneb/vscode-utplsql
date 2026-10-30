---
tipo: prd
id: PRD-143
aliases: [PRD-143]
status: proposed
titulo: "Auditoria de ReDoS/regex e validação de entrada"
versao: "0.20.0"
data: "2026-10-30"
autor: "Gil Cleber Barboza"
versao_titulo: "0.20.0 — Observabilidade e desempenho"
verificado: 2026-10-30
regras: []
docs: ["CHANGELOG"]
tags: [prd]
---

# PRD-143 — Auditoria de ReDoS/regex e validação de entrada

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `src/suiteParser.ts`, `src/codelens.ts`, `src/languageIdentity.ts`, `src/scriptRunner.ts`, `src/test/unit/*` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-110 (hardening defensivo), PRD-109 (language identity) |

## 1. Resumo

Auditar regex com backtracking aninhado nos parsers, limitar tamanho de arquivo
antes de parse e validar entradas de glob/config como dados, mitigando ReDoS e
injeção de padrões.

## 2. Contexto e problema

- Parsers (`suiteParser`, `codelens`, `languageIdentity`) aplicam regex sobre
  arquivos potencialmente grandes.
- `buildWatcherGlob`/`buildLanguageSelector` consomem `discoveryLanguageIds` e
  `workspaceAssociations` sem validação de metacaracteres.
- Sem limite de tamanho, um arquivo enorme pode travar a extensão.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Auditar e documentar regex de risco; simplificar quando possível.
- Limitar tamanho de arquivo antes de parse (ex.: 1MB).
- Validar entradas de glob/config como dados.

**Não-objetivos**
- Trocar o parser por AST.
- Mudar comportamento de parsing para arquivos válidos.

## 4. Requisitos

### RF1 — Limite de tamanho

- Pular parse (com log) para arquivos acima do limite.

### RF2 — Auditoria de regex

- Inventariar regex; adicionar testes de ReDoS (strings patológicas com timeout).

### RF3 — Validação de entrada

- Sanitizar `discoveryLanguageIds` e associations antes de montar globs.

**Não-funcionais**
- RNF1 — Cobertura ≥ thresholds.
- RNF2 — Sem regressão de parsing.

## 5. Solução proposta

- Helper `safeParseFile(path, regex)` com limite.
- Testes de ReDoS em `*.test.ts`.

## 6. Configuração

Nenhuma setting nova (limite interno, talvez configurável).

## 7. Plano de testes

- **Unitários**: arquivos grandes ignorados; regex não catastrófica.
- **Manual**: abrir arquivo grande e verificar que não trava.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Falso positivo no limite | Limite generoso (1MB) + log |
| Regressão de parsing | Testes de golden files |

## 9. Rollout

- 0.20.0; registrar no CHANGELOG.

## 10. Critérios de aceite

- Limite aplicado; regex auditadas.
- Testes de ReDoS verdes.

## 11. Questões em aberto

- Tornar o limite configurável?

## 12. Impacto no cérebro

Ao concluir, criar regra `SEC-015` (ou equivalente) com `prds: ["PRD-143"]`.
Enquanto `proposed`, `regras: []`.

## Impacto nas docs

Superfície listada: CHANGELOG.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-109-language-identity|PRD-109]] · [[prd-110-defensive-hardening|PRD-110]]
- 🔗 Mesma versão (0.20.0): [[prd-101-connection-pool-lifecycle|PRD-101]] · [[prd-102-trace-and-perf-instrumentation|PRD-102]] · [[prd-103-incremental-source-reindex|PRD-103]] · [[prd-106-perf-harness|PRD-106]] · [[prd-107-unprivileged-fixture|PRD-107]] · [[prd-120-lean-activation-lazy-setup|PRD-120]] · [[prd-128-event-bus-internal|PRD-128]] · [[prd-129-orchestration-strategy|PRD-129]] · [[prd-130-config-validation-typed-errors|PRD-130]] · [[prd-131-discovery-resilience-cache|PRD-131]] · [[prd-137-wallet-password-binding|PRD-137]] · [[prd-138-organization-strategy-pattern|PRD-138]] · [[prd-139-state-store-slicing-lru|PRD-139]] · [[prd-140-statusbar-settings-grouping|PRD-140]] · [[prd-141-onboarding-walkthrough-accessibility|PRD-141]] · [[prd-142-supply-chain-provenance-typecheck-gate|PRD-142]]
- 🚀 ⬅️ release anterior: [[prd-127-vscode-floor-1-125|PRD-127 (0.19.0)]] · ➡️ próxima release: [[prd-88-locale-aware-formatting|PRD-88 (0.21.0)]]
<!-- brain:auto:end -->
