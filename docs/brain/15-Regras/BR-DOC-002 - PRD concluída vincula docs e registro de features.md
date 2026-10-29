---
id: BR-DOC-002
aliases: [BR-DOC-002]
tipo: regra
titulo: PRD concluída vincula docs e registro de features
dominio: documentacao
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-10-29
implementacao: ["scripts/brain-rules.cjs", "scripts/docs-features-check.cjs", "docs/brain/10-Projeto/Registro de features.md", "docs/brain/_templates/template-prd.md"]
testes: ["src/test/unit/brainRules.test.ts", "src/test/unit/docsFeaturesCheck.test.ts"]
prds: ["PRD-98"]
requisitos: ["PRD-98/RF3", "PRD-98/RF4", "PRD-98/RF5", "PRD-98/RF6"]
tags: ["documentacao", "prd"]
---
## Enunciado

PRD concluída com `versao >= 0.18.0` declara `docs:` com as superfícies tocadas
e a seção `## Impacto nas docs`; cada superfície lista precisa mencionar o ID da
PRD (ou `<!-- prd:PRD-NN -->`). Toda PRD concluída na versão precisa de uma
entrada no `Registro de features`; para features de usuário (`interno: false`),
o gate `docs:features-check` exige bullet no README, âncora nas 23 variantes,
menção na wiki e, quando `docs/linkedin` existir localmente, posts pt/en + cards.

## Pré-condições

`brain:rules` e `docs:features-check` rodam no `docs:check`/CI; o registro é uma
nota do vault (`10-Projeto/Registro de features.md`).

## Exceções

PRDs anteriores a 0.18.0 são ignoradas (baseline). Enablers de
infraestrutura/testes podem usar `interno: true` no registro, dispensando
README/wiki/posts; o CHANGELOG continua obrigatório. `docs/linkedin` é local e
não versionado — a checagem de posts/cards só ocorre quando o diretório existe.

## Justificativa

Fechar o ciclo PRD → docs → release: nenhuma PRD concluída fica sem CHANGELOG,
superfície documental ou (quando aplicável) feature registrada.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-98-docs-anti-drift|PRD-98]]
- 🎯 Requisitos: [[prd-98-docs-anti-drift|PRD-98 RF3]] · [[prd-98-docs-anti-drift|PRD-98 RF4]] · [[prd-98-docs-anti-drift|PRD-98 RF5]] · [[prd-98-docs-anti-drift|PRD-98 RF6]]
- 🧩 Código: [[COD - brain-rules.cjs]] · [[COD - docs-features-check.cjs]] · [[COD - Registro de features.md]] · [[COD - template-prd.md]]
- 🧪 Testes: [[TST - brainRules.test.ts]] · [[TST - docsFeaturesCheck.test.ts]]
- ↩️ Referenciada por: [[Contributing]] · [[prd-98-docs-anti-drift|PRD-98]]
<!-- brain:auto:end -->
