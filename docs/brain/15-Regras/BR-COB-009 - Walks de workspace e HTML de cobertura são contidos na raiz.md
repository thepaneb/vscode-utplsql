---
id: BR-COB-009
aliases: [BR-COB-009]
tipo: regra
titulo: Walks de workspace e HTML de cobertura são contidos na raiz
dominio: cobertura
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-11-07
implementacao: ["src/pathContainment.ts", "src/viewCoverage.ts", "src/discovery.ts", "src/coverage.ts"]
testes: ["src/test/unit/pathContainment.test.ts", "src/test/unit/viewCoverage.test.ts", "src/test/unit/coverageHtml.test.ts"]
prds: ["PRD-144"]
requisitos: ["PRD-144/RF2", "PRD-144/RF3"]
tags: ["cobertura", "seguranca", "path-traversal"]
---
## Enunciado

Caminhos derivados de settings do workspace (`sourcePath`,
`organization.schemaPattern`) e o alvo do HTML de cobertura precisam resolver
para dentro da raiz do workspace/folder. Symlinks que apontam para fora não são
seguidos; `test-results/` é validado por `realpath` antes de
`mkdir`/`rm`/`write`.

## Pré-condições

Workspace confiável com `utplsql.sourcePath`, `organization.schemaPattern` ou
`coverage.htmlReport` ativos.

## Exceções

Caminhos inexistentes ou inacessíveis são ignorados (best-effort) sem lançar.

## Justificativa

Settings de workspace e XML do reporter são entradas não confiáveis; sem
contenção, um `..`/absoluto/symlink poderia ler, apagar ou gravar fora do
projeto.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-144-security-runtime-hardening|PRD-144]]
- 🎯 Requisitos: [[prd-144-security-runtime-hardening|PRD-144 RF2]] · [[prd-144-security-runtime-hardening|PRD-144 RF3]]
- 🧩 Código: [[COD - pathContainment.ts]] · [[COD - viewCoverage.ts]] · [[COD - discovery.ts]] · [[COD - coverage.ts]]
- 🧪 Testes: [[TST - pathContainment.test.ts]] · [[TST - viewCoverage.test.ts]] · [[TST - coverageHtml.test.ts]]
- ↩️ Referenciada por: [[Coverage]] · [[SEC-015 - Walks de filesystem e HTML de cobertura ficam contidos na raiz|SEC-015]] · [[prd-144-security-runtime-hardening|PRD-144]]
<!-- brain:auto:end -->
