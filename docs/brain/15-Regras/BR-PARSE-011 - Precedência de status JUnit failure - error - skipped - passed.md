---
id: BR-PARSE-011
aliases: [BR-PARSE-011]
tipo: regra
titulo: Precedência de status JUnit failure > error > skipped > passed
dominio: resultados
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/junit.ts:39", "src/junit.ts:41", "src/junit.ts:44", "src/junit.ts:52", "src/junit.ts:56", "src/junit.ts:60"]
testes: ["src/test/unit/junit.test.ts"]
prds: ["PRD-11", "PRD-29"]
requisitos: ["PRD-11/RF5"]
tags: ["resultados"]
---
## Enunciado

parseJUnit deriva o status pela presença de nós na ordem failure (failed), error, skipped, senão passed; classname usa @classname do testcase e cai para @name da testsuite; name usa @name do testcase (default vazio); time ausente vira 0 e time não numérico vira durationMs undefined.

## Pré-condições

XML do ut_junit_reporter (testsuites/testsuite/testcase; aceita testsuite único ou raiz testsuite).

## Exceções

failure/error com corpo alimentam stackFrames; extractMessage junta @message e o texto; failure vazio pode resultar message vazia ou undefined.

## Justificativa

O XML pode trazer múltiplas tags; a ordem define o status correto e o fallback de classname garante casamento com o package.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-11-streaming-results|PRD-11]] · [[prd-29-jump-to-failing-assertion|PRD-29]]
- 🎯 Requisitos: [[prd-11-streaming-results|PRD-11 RF5]]
- ↩️ Referenciada por: [[03-results-and-reporting]]
<!-- brain:auto:end -->
