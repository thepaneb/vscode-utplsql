---
id: BR-PARSE-002
tipo: regra
titulo: RE_PACKAGE aceita schema qualificado, BODY e identificador entre aspas
dominio: parser
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/suiteParser.ts:26", "src/suiteParser.ts:55", "src/suiteParser.ts:59", "src/codelens.ts:5"]
testes: ["src/test/unit/suiteParser.test.ts"]
prds: ["PRD-24", "PRD-42"]
tags: ["parser"]
---
## Enunciado

O nome do package é o grupo 2 da regex de CREATE PACKAGE: o qualificador de schema (grupo 1) é descartado e a regex aceita CREATE OR REPLACE, PACKAGE BODY e aspas duplas.

## Pré-condições

Texto contendo CREATE PACKAGE em qualquer casing/variante.

## Exceções

Identificadores só com caracteres de palavra (sem $/#); se a regex não casar, retorna null.

## Justificativa

O Test Explorer precisa do nome lógico do package, não do schema, e deve reconhecer bodies e instalações qualificadas.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-24-codelens-integration|PRD-24]] · [[prd-42-suiteparser-annotations|PRD-42]]
- ↩️ Referenciada por: [[01-test-discovery]]
<!-- brain:auto:end -->
