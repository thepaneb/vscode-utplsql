---
id: BR-PARSE-001
aliases: [BR-PARSE-001]
tipo: regra
titulo: Arquivo só é suite utPLSQL se tiver %suite E CREATE PACKAGE
dominio: parser
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/suiteParser.ts:50", "src/suiteParser.ts:51", "src/suiteParser.ts:55", "src/suiteParser.ts:57"]
testes: ["src/test/unit/suiteParser.test.ts", "src/test/unit/discovery.test.ts"]
prds: ["PRD-42"]
tags: ["parser"]
---
## Enunciado

parseSuiteText retorna null a menos que o texto contenha a annotation %suite e também um CREATE [OR REPLACE] PACKAGE; a presença isolada de %suite sem declaração de package não é suficiente.

## Pré-condições

Texto completo do arquivo .pks/.pkb (ou package vindo de ALL_SOURCE prefixado com CREATE OR REPLACE).

## Exceções

Arquivo vazio, sem %suite ou sem CREATE PACKAGE retornam null; nesses casos a suíte não entra na árvore.

## Justificativa

Evita falsos positivos de trechos que apenas citam %suite e garante que o nome do package seja resolvível.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-42-suiteparser-annotations|PRD-42]]
- 🧩 Código: [[COD - suiteParser.ts]]
- 🧪 Testes: [[TST - suiteParser.test.ts]] · [[TST - discovery.test.ts]]
- ↩️ Referenciada por: [[01-test-discovery]] · [[GLOSS-001 - Suite|GLOSS-001]]
<!-- brain:auto:end -->
