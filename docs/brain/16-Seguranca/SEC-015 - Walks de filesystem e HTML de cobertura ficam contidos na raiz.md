---
id: SEC-015
aliases: [SEC-015]
tipo: seguranca
titulo: Walks de filesystem e HTML de cobertura ficam contidos na raiz
dominio: path-traversal
status: ativo
severidade: media
verificado: 2026-11-07
implementacao: ["src/pathContainment.ts", "src/viewCoverage.ts", "src/discovery.ts", "src/coverage.ts"]
testes: ["src/test/unit/pathContainment.test.ts", "src/test/unit/viewCoverage.test.ts", "src/test/unit/coverageHtml.test.ts"]
regras: ["BR-COB-009"]
prds: ["PRD-144"]
requisitos: ["PRD-144/RF2", "PRD-144/RF3"]
tags: ["seguranca", "path-traversal"]
---
## Enunciado

Caminhos derivados de settings do workspace (`sourcePath`,
`organization.schemaPattern`) e o alvo do HTML de cobertura são resolvidos e
comparados com a raiz do workspace/folder. Candidatos fora da raiz são
ignorados; symlinks que apontam para fora não são seguidos, e o diretório
`test-results/` é validado por `realpath` antes de `mkdir`/`rm`/`write`.

## Controle

`src/pathContainment.ts` centraliza `isInside` (path.relative), `isReallyInside`
(realpath) e `hasTraversalSegment`; `discoverViewFiles` usa `withFileTypes` e
ignora symlinks; `discoverSchemasFromFolders` rejeita `..`/absoluto (inclusive
Windows) e confere a contenção; `assertCoverageHtmlPathSafe` valida o diretório
do HTML.

## Justificativa

O workspace e o XML do reporter são entradas não confiáveis; sem contenção, um
`sourcePath`/`schemaPattern` malicioso ou um `test-results` symlinkado poderia
ler, apagar ou gravar fora do projeto.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📄 PRDs: [[prd-144-security-runtime-hardening|PRD-144]]
- 📐 Regras: [[BR-COB-009 - Walks de workspace e HTML de cobertura são contidos na raiz|BR-COB-009]]
- 🎯 Requisitos: [[prd-144-security-runtime-hardening|PRD-144 RF2]] · [[prd-144-security-runtime-hardening|PRD-144 RF3]]
- 🧩 Código: [[COD - pathContainment.ts]] · [[COD - viewCoverage.ts]] · [[COD - discovery.ts]] · [[COD - coverage.ts]]
- 🧪 Testes: [[TST - pathContainment.test.ts]] · [[TST - viewCoverage.test.ts]] · [[TST - coverageHtml.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-144-security-runtime-hardening|PRD-144]]
<!-- brain:auto:end -->
