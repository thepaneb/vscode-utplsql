---
id: BR-PARSE-018
aliases: [BR-PARSE-018]
tipo: regra
titulo: TestMessage de falha ganha expectedOutput/actualOutput quando há Expected:/Actual:
dominio: resultados
status: ativo
severidade: baixa
fonte: codigo
verificado: 2026-10-02
implementacao: ["src/junit.ts:105", "src/junit.ts:117", "src/junit.ts:147", "src/results.ts:149", "src/results.ts:152", "src/results.ts:153"]
testes: ["src/test/unit/junit.test.ts", "src/test/unit/results.test.ts"]
prds: ["PRD-52"]
requisitos: ["PRD-52/RF1", "PRD-52/RF2", "PRD-52/RNF1", "PRD-52/RNF2"]
tags: ["resultados", "diff"]
---

# BR-PARSE-018 — TestMessage de falha ganha expectedOutput/actualOutput quando há Expected:/Actual:

## Enunciado

`parseExpectedActual` extrai `Expected:`/`Actual:` (case-insensitive, multilinha)
da mensagem de falha; `applyResultsFromCases`, no status `failed`, só preenche
`msg.expectedOutput`/`msg.actualOutput` quando ambos existem, mantendo `message`
e `location` (BR-PARSE-014) intactos.

## Pré-condições

Status `failed` com `c.message` apresentando os dois marcadores.

## Exceções

Mensagem sem os marcadores (ou só um deles) ⇒ campos não definidos e nenhuma
exceção (parse defensivo); status `error` não recebe diff.

## Justificativa

Ativa o diff nativo do painel de testes sem UI própria nem custo de BD.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-52-inline-diff-expected-actual|PRD-52]]
- 🎯 Requisitos: [[prd-52-inline-diff-expected-actual|PRD-52 RF1]] · [[prd-52-inline-diff-expected-actual|PRD-52 RF2]] · [[prd-52-inline-diff-expected-actual|PRD-52 RNF1]] · [[prd-52-inline-diff-expected-actual|PRD-52 RNF2]]
- 🧩 Código: [[COD - junit.ts]] · [[COD - results.ts]]
- 🧪 Testes: [[TST - junit.test.ts]] · [[TST - results.test.ts]]
- ↩️ Referenciada por: [[Editor-integration]] · [[prd-52-inline-diff-expected-actual|PRD-52]]
<!-- brain:auto:end -->
