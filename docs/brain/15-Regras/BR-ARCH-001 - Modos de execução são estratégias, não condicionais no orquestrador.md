---
id: BR-ARCH-001
aliases: [BR-ARCH-001]
tipo: regra
titulo: Modos de execução são estratégias, não condicionais no orquestrador
dominio: arquitetura
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-11
implementacao: ["src/runStrategy.ts", "src/runner.ts"]
testes: ["src/test/unit/runStrategy.test.ts", "src/test/unit/runner.test.ts", "src/test/unit/runCommandsExec.test.ts"]
prds: ["PRD-129"]
requisitos: ["PRD-129/RF1", "PRD-129/RF2", "PRD-129/RF3", "PRD-129/RNF1", "PRD-129/RNF2", "PRD-129/RNF3"]
tags: ["arquitetura", "execucao"]
---
## Enunciado

`executeRun` é um dispatcher: seleciona `NormalRun`, `CoverageRun`, `ExportRun`
ou `DebugRun` a partir de `(coverage, exportReporter, debug)` e delega
`prepare`/`run`/`finalize`. As estratégias montam somente o escopo de cobertura,
o reporter de export e o pós-processamento (SQL coverage), sem alterar o
protocolo Oracle, a serialização de runs ou o `RunAbortedError`.

## Controle

`src/runStrategy.ts` define a interface e as quatro implementações puras;
`executeRun` mantém a API pública e os callbacks legados, preserva
`outcome`/serialização da PRD-148 e só pós-processa quando a estratégia manda.
Nenhuma estratégia passa de ~120 linhas.

## Justificativa

Remover condicionais aninhadas de modo de execução e permitir testar cada modo
sem banco nem `vscode` em runtime.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-129-orchestration-strategy|PRD-129]]
- 🎯 Requisitos: [[prd-129-orchestration-strategy|PRD-129 RF1]] · [[prd-129-orchestration-strategy|PRD-129 RF2]] · [[prd-129-orchestration-strategy|PRD-129 RF3]] · [[prd-129-orchestration-strategy|PRD-129 RNF1]] · [[prd-129-orchestration-strategy|PRD-129 RNF2]] · [[prd-129-orchestration-strategy|PRD-129 RNF3]]
- 🧩 Código: [[COD - runStrategy.ts]] · [[COD - runner.ts]]
- 🧪 Testes: [[TST - runStrategy.test.ts]] · [[TST - runner.test.ts]] · [[TST - runCommandsExec.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-129-orchestration-strategy|PRD-129]]
<!-- brain:auto:end -->
