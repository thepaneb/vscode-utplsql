---
id: BR-PARSE-011
aliases: [BR-PARSE-011]
tipo: regra
titulo: Precedência de status JUnit failure > error > skipped > passed
dominio: resultados
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-25
implementacao: ["src/junit.ts:34", "src/junit.ts:40", "src/junit.ts:42", "src/junit.ts:52", "src/junit.ts:56", "src/junit.ts:60", "src/junit.ts:64", "src/junit.ts:71", "src/junit.ts:75"]
testes: ["src/test/unit/junit.test.ts", "src/test/integration/jumpToFailureE2E.test.ts"]
prds: ["PRD-11", "PRD-29"]
requisitos: ["PRD-11/RF5"]
tags: ["resultados"]
---
## Enunciado

parseJUnit percorre recursivamente os testsuite aninhados — o ut_junit_reporter aninha um nível por schema, package e suite, com os testcase no nível mais interno — e emite os testcases do nível atual antes dos aninhados; o status de cada um é derivado pela presença de nós na ordem failure (failed), error, skipped, senão passed; classname usa @classname do testcase e cai para @name da testsuite; name usa @name do testcase (default vazio); time ausente vira 0 e time não numérico vira durationMs undefined.

## Pré-condições

XML do ut_junit_reporter (testsuites/testsuite/testcase, com testesuite aninhado em qualquer profundidade; aceita testsuite único ou raiz testsuite).

## Exceções

failure/error com corpo alimentam stackFrames; extractMessage junta @message e o texto; failure vazio pode resultar message vazia ou undefined; testsuite sem testcase e sem aninhamento não gera resultado.

## Justificativa

O XML pode trazer múltiplas tags; a ordem define o status correto e o fallback de classname garante casamento com o package. Percorrer a hierarquia é obrigatório porque, sem descendência, os testcases do nível interno (formato de --%suitepath e de instalação compartilhada) se perdem e todo teste é reportado como sem resultado JUnit.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-11-streaming-results|PRD-11]] · [[prd-29-jump-to-failing-assertion|PRD-29]]
- 🎯 Requisitos: [[prd-11-streaming-results|PRD-11 RF5]]
- 🧩 Código: [[COD - junit.ts]]
- 🧪 Testes: [[TST - junit.test.ts]] · [[TST - jumpToFailureE2E.test.ts]]
- ↩️ Referenciada por: [[03-results-and-reporting]]
<!-- brain:auto:end -->
