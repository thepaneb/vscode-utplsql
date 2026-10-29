---
id: BR-PLAT-003
aliases: [BR-PLAT-003]
tipo: regra
titulo: Commits no main são assinados e verificados
dominio: plataforma
status: ativo
severidade: media
fonte: convencao
verificado: 2026-10-29
implementacao: ["CONTRIBUTING.md"]
testes: []
prds: ["PRD-118"]
requisitos: ["PRD-118/RF1", "PRD-118/RF2", "PRD-118/RF3"]
tags: ["plataforma", "seguranca", "governanca"]
---
## Enunciado

O `main` exige **commits assinados** (SSH de preferência, ou GPG). O mantenedor
configura `gpg.format ssh`, `user.signingkey`, `commit.gpgsign` e
`tag.gpgsign`; a chave pública é cadastrada no GitHub como **Signing Key**. Um
commit novo aparece como **Verified** e `git log --show-signature` mostra
`Good signature`.

## Pré-condições

Chave SSH existente e Branch protection/ruleset do `main` com “Require signed
commits” (configuração do GitHub, fora do repositório).

## Exceções

Merges criados pelo GitHub e commits do Dependabot são assinados pela própria
plataforma. Bypass pontual só para bot legítimo, documentado no PR.

## Justificativa

Tornar verificável a origem de cada commit publicável, sem reescrever o
histórico antigo e sem exigir GPG adicional quando a chave SSH já existe.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-118-commit-signing|PRD-118]]
- 🎯 Requisitos: [[prd-118-commit-signing|PRD-118 RF1]] · [[prd-118-commit-signing|PRD-118 RF2]] · [[prd-118-commit-signing|PRD-118 RF3]]
- 🧩 Código: [[COD - CONTRIBUTING.md]]
- ↩️ Referenciada por: [[Contributing]] · [[prd-118-commit-signing|PRD-118]]
<!-- brain:auto:end -->
