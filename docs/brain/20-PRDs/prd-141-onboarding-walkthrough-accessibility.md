---
tipo: prd
id: PRD-141
aliases: [PRD-141]
status: proposed
titulo: "Walkthrough de onboarding e auditoria de acessibilidade"
versao: "0.20.0"
data: "2026-10-30"
autor: "Gil Cleber Barboza"
versao_titulo: "0.20.0 — Observabilidade e desempenho"
verificado: 2026-10-30
regras: []
docs: ["CHANGELOG"]
tags: [prd]
---

# PRD-141 — Walkthrough de onboarding e auditoria de acessibilidade

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `package.json` (walkthroughs), `src/extension.ts`, `docs/brain/**` |
| Esforço estimado | 1–2 dias |
| Complexidade | Baixa-Média |
| Relaciona-se a | PRD-120 (ativação enxuta), PRD-119 (postura) |

## 1. Resumo

Adicionar um VS Code Walkthrough para onboarding (conexão, primeiro run,
cobertura) reusando comandos existentes, e auditar acessibilidade em QuickPicks
e notificações.

## 2. Contexto e problema

- Novos usuários enfrentam fricção na configuração inicial (conexão, grants).
- Setup diagnostics existe, mas não há guia passo a passo integrado.
- Acessibilidade (labels/aria) não foi auditada.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Declarar `contributes.walkthroughs` com passos que invocam comandos existentes.
- Auditar labels/aria em QuickPicks e notificações; corrigir lacunas.

**Não-objetivos**
- Criar comandos novos (reusar existentes).
- Mudar fluxo de execução.

## 4. Requisitos

### RF1 — Walkthrough

- Walkthrough com passos: configurar conexão, validar setup, rodar primeiro teste,
  ver cobertura.

### RF2 — Acessibilidade

- Garantir `placeHolder`/`title` em QuickPicks; notificações com texto claro.

**Não-funcionais**
- RNF1 — Sem impacto de ativação.

## 5. Solução proposta

- Adicionar seção `walkthroughs` ao `package.json`.
- Revisar pontos de `showQuickPick`/`showInformationMessage`.

## 6. Configuração

Nenhuma setting nova.

## 7. Plano de testes

- **Manual**: seguir walkthrough do zero.
- **Unitários**: n/a (UX).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Walkthrough desatualizado | Vincular a PRDs de features |

## 9. Rollout

- 0.20.0; registrar no CHANGELOG.

## 10. Critérios de aceite

- Walkthrough disponível e funcional.
- Acessibilidade auditada e corrigida.

## 11. Questões em aberto

- Incluir vídeo/GIF nos passos?

## 12. Impacto no cérebro

Ao concluir, atualizar wiki/README. Enquanto `proposed`, `regras: []`.

## Impacto nas docs

Superfícies: CHANGELOG, README, wiki.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-119-security-posture-scorecard|PRD-119]] · [[prd-120-lean-activation-lazy-setup|PRD-120]]
- 🔗 Mesma versão (0.20.0): [[prd-101-connection-pool-lifecycle|PRD-101]] · [[prd-102-trace-and-perf-instrumentation|PRD-102]] · [[prd-103-incremental-source-reindex|PRD-103]] · [[prd-106-perf-harness|PRD-106]] · [[prd-107-unprivileged-fixture|PRD-107]] · [[prd-120-lean-activation-lazy-setup|PRD-120]] · [[prd-128-event-bus-internal|PRD-128]] · [[prd-129-orchestration-strategy|PRD-129]] · [[prd-130-config-validation-typed-errors|PRD-130]] · [[prd-131-discovery-resilience-cache|PRD-131]] · [[prd-137-wallet-password-binding|PRD-137]] · [[prd-138-organization-strategy-pattern|PRD-138]] · [[prd-139-state-store-slicing-lru|PRD-139]] · [[prd-140-statusbar-settings-grouping|PRD-140]] · [[prd-142-supply-chain-provenance-typecheck-gate|PRD-142]] · [[prd-143-redos-regex-audit-input-validation|PRD-143]]
- 🚀 ⬅️ release anterior: [[prd-127-vscode-floor-1-125|PRD-127 (0.19.0)]] · ➡️ próxima release: [[prd-88-locale-aware-formatting|PRD-88 (0.21.0)]]
<!-- brain:auto:end -->
