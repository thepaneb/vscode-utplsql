---
id: BR-PARSE-012
aliases: [BR-PARSE-012]
tipo: regra
titulo: Stack trace - regex quoted/unquoted e filtro de frames do framework
dominio: resultados
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-25
implementacao: ["src/junit.ts:112", "src/junit.ts:116", "src/junit.ts:120", "src/junit.ts:133", "src/junit.ts:137", "src/junit.ts:138", "src/junit.ts:139"]
testes: ["src/test/unit/junit.test.ts", "src/test/integration/jumpToFailureE2E.test.ts"]
prds: ["PRD-29"]
requisitos: ["PRD-29/RF1", "PRD-29/RF5"]
tags: ["resultados"]
---
## Enunciado

parseStackFrames extrai frames de at "SCHEMA.PKG"."PROC", line N (primeiro grupo), de at "SCHEMA.PKG.PROC", line N (terceiro grupo, formato emitido pelo utPLSQL) e de at OBJ.PROC, line N (quarto grupo), ignorando o nome da procedure; isUserFrame exige line > 0 e rejeita o frame apenas quando algum segmento do objectName, em maiúsculas, começa com UT_, UT$, UT3_ ou UT3$ — o schema em si não filtra, logo frames do usuário no schema de instalação (UT3) passam.

## Pré-condições

Corpo de texto de nó failure/error do JUnit.

## Exceções

Corpo vazio ou sem frames retorna undefined; frames com line 0 são descartados; segmentos de objeto do framework (UT_RUNNER, UT_SUITE_MANAGER, UT3.UT_ASSERT.ANY_PROC) descartam o frame mesmo qualificados com o schema.

## Justificativa

O stack do Oracle muda de formato conforme quoting/schema — o utPLSQL usa o nome único qualificado, o backtrace do DBMS_UTILITY usa as duas strings; filtrar as camadas do utPLSQL por segmento, e não pelo objectName inteiro, é pré-requisito para o Go to Error apontar para o código do usuário sem descartar testes que vivem no próprio schema de instalação.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-29-jump-to-failing-assertion|PRD-29]]
- 🎯 Requisitos: [[prd-29-jump-to-failing-assertion|PRD-29 RF1]] · [[prd-29-jump-to-failing-assertion|PRD-29 RF5]]
- 🧩 Código: [[COD - junit.ts]]
- 🧪 Testes: [[TST - junit.test.ts]] · [[TST - jumpToFailureE2E.test.ts]]
- ↩️ Referenciada por: [[03-results-and-reporting]] · [[08-jump-to-failure]]
<!-- brain:auto:end -->
