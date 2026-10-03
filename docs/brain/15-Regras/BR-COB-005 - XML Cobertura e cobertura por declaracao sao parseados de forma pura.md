---
id: BR-COB-005
aliases: [BR-COB-005]
tipo: regra
titulo: XML Cobertura e cobertura por declaração são parseados de forma pura
dominio: cobertura
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-29
implementacao: ["src/cobertura.ts:18", "src/plsqlDeclarations.ts:86", "src/plsqlDeclarations.ts:101"]
testes: ["src/test/unit/cobertura.test.ts", "src/test/unit/plsqlDeclarations.test.ts"]
prds: ["PRD-12", "PRD-48"]
tags: ["cobertura"]
---
## Enunciado

O XML do reporter Cobertura é interpretado por `parseCobertura` (linhas/`hits` por
arquivo — módulo puro, sem `vscode`) e as declarações PL/SQL por
`parsePlsqlDeclarations`/`deriveDeclarationCoverage` (cobertura por
function/procedure), ambos consumidos por `results.ts` (`applyCoverageFromXml`).

## Pré-condições

XML de cobertura presente no buffer (`BR-EXEC-009`) e fonte resolvida
(`BR-COB-002`).

## Exceções

XML ausente/malformado → nenhuma cobertura aplicada (best-effort, `PAT-005`); sem
declarações reconhecidas, a cobertura por declaração fica vazia.

## Justificativa

Manter parsing puro e testável (fora do host) para a cobertura de linhas e de
declarações exibida no editor.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-12-sql-coverage|PRD-12]] · [[prd-48-function-coverage|PRD-48]]
- 🧩 Código: [[COD - cobertura.ts]] · [[COD - plsqlDeclarations.ts]]
- 🧪 Testes: [[TST - cobertura.test.ts]] · [[TST - plsqlDeclarations.test.ts]]
- ↩️ Referenciada por: [[04-code-coverage]] · [[ADR-008 - Cobertura a partir do Cobertura XML e VSQL|ADR-008]] · [[ENT-004 - Coverage|ENT-004]] · [[prd-12-sql-coverage|PRD-12]] · [[prd-48-function-coverage|PRD-48]]
<!-- brain:auto:end -->