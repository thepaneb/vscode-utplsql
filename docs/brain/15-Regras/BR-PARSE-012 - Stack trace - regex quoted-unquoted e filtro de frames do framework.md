---
id: BR-PARSE-012
tipo: regra
titulo: Stack trace - regex quoted/unquoted e filtro de frames do framework
dominio: resultados
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/junit.ts:96", "src/junit.ts:99", "src/junit.ts:103", "src/junit.ts:114", "src/junit.ts:117", "src/junit.ts:118"]
testes: ["src/test/unit/junit.test.ts"]
prds: ["PRD-29"]
tags: ["resultados"]
---
## Enunciado

parseStackFrames extrai frames de at OBJ.PROC, line N (primeiro grupo) e de at OBJ, line N, ignorando o nome da procedure; isUserFrame aceita apenas objectName cujo prefixo (case-insensitive) não é UT_, UT$, UT3_, UT3$ ou UT3. e exige line > 0.

## Pré-condições

Corpo de texto de nó failure/error do JUnit.

## Exceções

Corpo vazio ou sem frames retorna undefined; frames internos do framework ou com line 0 são descartados.

## Justificativa

O stack do Oracle muda de formato conforme quoting/schema; filtrar as camadas do utPLSQL é pré-requisito para o Go to Error apontar para o código do usuário.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-29-jump-to-failing-assertion|PRD-29]]
<!-- brain:auto:end -->
