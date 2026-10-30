---
id: BR-PLAT-004
aliases: [BR-PLAT-004]
tipo: regra
titulo: OSSF Scorecard é publicado e o main é protegido
dominio: plataforma
status: ativo
severidade: media
fonte: convencao
verificado: 2026-10-30
implementacao: [".github/workflows/scorecard.yml", "CONTRIBUTING.md"]
testes: ["src/test/unit/workflowPolicy.test.ts"]
prds: ["PRD-119"]
requisitos: ["PRD-119/RF1", "PRD-119/RF2", "PRD-119/RF3", "PRD-119/RNF1"]
tags: ["plataforma", "seguranca", "governanca"]
---
## Enunciado

O CI publica o **OSSF Scorecard** (`.github/workflows/scorecard.yml`,
`publish_results: true`, SARIF no Security tab) semanalmente e em mudanças de
branch protection. A proteção do `main` está ativa: **PR obrigatório (0
aprovações)**, checks **`build (22)`/`build (24)`/`build (26)`/`CodeQL`**,
**commits assinados** (`BR-PLAT-003`), sem force-push/exclusão e com
`enforce_admins` ligado. **Histórico linear não é adotado** — o projeto usa
merge commits.

**Estado atual (2026-10-30):** `required_status_checks` com os 4 checks,
`required_signatures=true`, `required_linear_history=false` (merge commits),
`enforce_admins=true` e 0 aprovações obrigatórias.

## Pré-condições

Repositório público, `id-token: write`, ação pinada por SHA (PRD-104) e
branch protection/ruleset configurado no GitHub (fora do repositório).

## Exceções

Checks de baixo valor para o projeto (Fuzzing, CII Best Practices) podem ser
dispensados com justificativa no Security tab. Com `enforce_admins` ligado não
há bypass de admin; uma exceção exige alterar a proteção de forma explícita e
documentada.

## Justificativa

Dar a terceiros (VSCan, Marketplace, adotantes) um sinal auditável de postura de
segurança e impedir push direto/force-push no `main`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-119-security-posture-scorecard|PRD-119]]
- 🎯 Requisitos: [[prd-119-security-posture-scorecard|PRD-119 RF1]] · [[prd-119-security-posture-scorecard|PRD-119 RF2]] · [[prd-119-security-posture-scorecard|PRD-119 RF3]] · [[prd-119-security-posture-scorecard|PRD-119 RNF1]]
- 🧩 Código: [[COD - scorecard.yml]] · [[COD - CONTRIBUTING.md]]
- 🧪 Testes: [[TST - workflowPolicy.test.ts]]
- ↩️ Referenciada por: [[Contributing]] · [[prd-119-security-posture-scorecard|PRD-119]]
<!-- brain:auto:end -->
