---
id: SEC-014
aliases: [SEC-014]
tipo: seguranca
titulo: Identificador de schema é validado antes de concatenar no SQL
dominio: sql
status: ativo
severidade: media
verificado: 2026-10-29
implementacao: ["src/oracleIdentifiers.ts", "src/oracleRunner.ts"]
testes: ["src/test/unit/oracleIdentifiers.test.ts", "src/test/unit/oracleRunner.test.ts"]
regras: ["BR-EXEC-017"]
prds: ["PRD-110"]
requisitos: ["PRD-110/RF1"]
tags: ["seguranca", "sql"]
---
## Enunciado

O prefixo de schema descoberto em `ALL_SYNONYMS.TABLE_OWNER` só é concatenado no
SQL (`DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_TMP`, `SELECT ... FROM
${utSchema}UT_OUTPUT_BUFFER_TMP`) depois de validado como identificador Oracle
(`^[A-Z0-9_$#]+\.$` ou vazio). Valor fora do padrão é tratado como **sem
prefixo**, com `warn` sanitizado que não ecoa o valor cru.

## Controle

`sanitizeSchemaPrefix` em `src/oracleIdentifiers.ts` é chamado em
`discoverUtplsqlSchema` e novamente no ponto de uso do `oracleRunner.ts`
(defesa em profundidade). Nenhum identificador dinâmico chega ao `execute()`
sem passar pelo helper.

## Justificativa

Fechar o vetor teórico de um banco hostil com owner atípico (identificador
citado com aspas, `;`, espaço etc.) e manter o invariante “nenhum valor
concatenado no PL/SQL” declarado no `SECURITY.md`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📄 PRDs: [[prd-110-defensive-hardening|PRD-110]]
- 📐 Regras: [[BR-EXEC-017 - Prefixo de schema validado antes de concatenar no SQL|BR-EXEC-017]]
- 🎯 Requisitos: [[prd-110-defensive-hardening|PRD-110 RF1]]
- 🧩 Código: [[COD - oracleIdentifiers.ts]] · [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleIdentifiers.test.ts]] · [[TST - oracleRunner.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-110-defensive-hardening|PRD-110]]
<!-- brain:auto:end -->
