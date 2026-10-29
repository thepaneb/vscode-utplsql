---
id: BR-EXEC-017
aliases: [BR-EXEC-017]
tipo: regra
titulo: Prefixo de schema é validado antes de concatenar no SQL
dominio: execucao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-29
implementacao: ["src/oracleIdentifiers.ts", "src/oracleRunner.ts"]
testes: ["src/test/unit/oracleIdentifiers.test.ts", "src/test/unit/oracleRunner.test.ts"]
prds: ["PRD-110"]
requisitos: ["PRD-110/RF1"]
tags: ["execucao", "seguranca", "sql"]
---
## Enunciado

O prefixo descoberto em `ALL_SYNONYMS.TABLE_OWNER` só chega ao SQL depois de
`sanitizeSchemaPrefix`: aceita `^[A-Z0-9_$#]+\.$` ou vazio; qualquer outro valor
vira vazio (sem prefixo), com `warn` que não ecoa o valor cru. A validação ocorre
em `discoverUtplsqlSchema` e novamente no ponto de uso do `executeRunOracle`.

## Pré-condições

Conexões com `ut_runner` acessível (shared install) ou sem o synonym (modo sem
prefixo, comportamento histórico).

## Exceções

Owner com aspas/identificador não padrão é tratado como shared install sem
prefixo; o run segue com `UT_OUTPUT_BUFFER_TMP` não qualificado.

## Justificativa

Manter o invariante “nenhum valor concatenado no PL/SQL” do `SECURITY.md` sem
quebrar instalações shared legítimas (`UT3.`).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-110-defensive-hardening|PRD-110]]
- 🎯 Requisitos: [[prd-110-defensive-hardening|PRD-110 RF1]]
- 🧩 Código: [[COD - oracleIdentifiers.ts]] · [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleIdentifiers.test.ts]] · [[TST - oracleRunner.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[SEC-014 - Identificador de schema validado antes de concatenar no SQL|SEC-014]] · [[prd-110-defensive-hardening|PRD-110]]
<!-- brain:auto:end -->
