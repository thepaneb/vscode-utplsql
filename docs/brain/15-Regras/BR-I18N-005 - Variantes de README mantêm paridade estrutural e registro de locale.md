---
id: BR-I18N-005
aliases: [BR-I18N-005]
tipo: regra
titulo: Variantes de README mantêm paridade estrutural e registro de locale
dominio: i18n
status: ativo
severidade: media
fonte: codigo
verificado: 2026-11-25
implementacao: ["scripts/docs-fidelity.cjs:360", "scripts/docs-fidelity.cjs:391", "scripts/docs-fidelity.cjs:525", "scripts/docs-fidelity.cjs:537", "scripts/docs-check.cjs:51", "scripts/docs-check.cjs:91"]
testes: ["src/test/unit/docsFidelity.test.ts"]
prds: ["PRD-91"]
requisitos: ["PRD-91/RF1", "PRD-91/RF2"]
tags: ["i18n", "docs"]
---
## Enunciado

Cada `README.<locale>.md` mantém, em relação ao `README.md`, o mesmo multiset de
bullets de feature, a tabela de Comandos e o conjunto completo de links de
idioma; o número de variantes é derivado de `package.nls.*.json`. Todo locale
ativo tem uma entrada (status, revisor e cobertura) em
`docs/brain/12-I18n/Registro de locales.md`.

## Pré-condições

README mestre e variantes gerados do vault; `docs:fidelity` roda dentro do
`docs:check` no CI.

## Exceções

Paridade é **estrutural**, não semântica: a prosa traduzida pode variar; tokens
de código (settings/comandos) e links são a fonte da comparação.

## Justificativa

Evita que uma feature ou comando exista só no README em inglês e mantém um
responsável explícito por locale.

## Conexões

- 🗺️ [[MOC - Regras]]
- 🗺️ [[MOC - I18n]]
- 📄 PRDs: [[prd-91-doc-parity-localized-distribution|PRD-91]]
- 🎯 Requisitos: [[prd-91-doc-parity-localized-distribution|PRD-91 RF1]] ·
  [[prd-91-doc-parity-localized-distribution|PRD-91 RF2]]
