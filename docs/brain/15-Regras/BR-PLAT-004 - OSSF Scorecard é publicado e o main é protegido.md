---
id: BR-PLAT-004
aliases: [BR-PLAT-004]
tipo: regra
titulo: OSSF Scorecard é publicado e o main é protegido
dominio: plataforma
status: ativo
severidade: media
fonte: convencao
verificado: 2026-10-29
implementacao: [".github/workflows/scorecard.yml", "CONTRIBUTING.md"]
testes: ["src/test/unit/workflowPolicy.test.ts"]
prds: ["PRD-119"]
requisitos: ["PRD-119/RF1", "PRD-119/RF2", "PRD-119/RF3"]
tags: ["plataforma", "seguranca", "governanca"]
---
## Enunciado

O CI publica o **OSSF Scorecard** (`.github/workflows/scorecard.yml`,
`publish_results: true`, SARIF no Security tab) semanalmente e em mudanças de
branch protection. O `main` é protegido: PR obrigatório, checks `ci`/`integration`
e CodeQL, sem force-push/exclusão, histórico linear e commits assinados
(`BR-PLAT-003`). A proteção é compatível com mantenedor único (sem autoaprovação).

## Pré-condições

Repositório público, `id-token: write`, ação pinada por SHA (PRD-104) e
branch protection/ruleset configurado no GitHub (fora do repositório).

## Exceções

Checks de baixo valor para o projeto (Fuzzing, CII Best Practices) podem ser
dispensados com justificativa no Security tab. Bypass de admin documentado.

## Justificativa

Dar a terceiros (VSCan, Marketplace, adotantes) um sinal auditável de postura de
segurança e impedir push direto/force-push no `main`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-119-security-posture-scorecard|PRD-119]]
- 🎯 Requisitos: [[prd-119-security-posture-scorecard|PRD-119 RF1]] · [[prd-119-security-posture-scorecard|PRD-119 RF2]] · [[prd-119-security-posture-scorecard|PRD-119 RF3]]
- 🧩 Código: [[COD - scorecard.yml]] · [[COD - CONTRIBUTING.md]]
- 🧪 Testes: [[TST - workflowPolicy.test.ts]]
- ↩️ Referenciada por: [[Contributing]] · [[prd-119-security-posture-scorecard|PRD-119]]
<!-- brain:auto:end -->
