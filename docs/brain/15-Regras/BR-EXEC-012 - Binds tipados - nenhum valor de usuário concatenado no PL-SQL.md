---
id: BR-EXEC-012
aliases: [BR-EXEC-012]
tipo: regra
titulo: Binds tipados - nenhum valor de usuário concatenado no PL/SQL
dominio: execucao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-11-26
implementacao: ["src/oracleRunCall.ts", "src/oracleRunner.ts"]
testes: ["src/test/unit/oracleRunCall.test.ts", "src/test/unit/oracleRunner.test.ts"]
prds: ["PRD-69"]
requisitos: ["PRD-69/RF1"]
interno: true
tags: ["execucao", "seguranca"]
---
## Enunciado

Se o PL/SQL do run é montado, então pathArgs, tags, coverageSchemes e parâmetros de escopo vão como binds tipados (`UT_VARCHAR2_LIST` para listas, STRING/NUMBER/BOOLEAN para escalares); listas vazias viram o literal null sem bind. O tipo da coleção é qualificado com o schema descoberto (`UT3.UT_VARCHAR2_LIST`) quando o utPLSQL está em outro schema.

## Pré-condições

pathArgs/coverage/randomOrder conforme configuração; o SQL é BEGIN ${utSchema}ut_runner.run(...) END;.

## Exceções

pathArgs vazio usa a_paths => null; sem cobertura, a_coverage_schemes => null; a_tags vazio é bind STRING com val null; randomSeed 0/ausente vira bind NUMBER null.

## Justificativa

Evita injeção (nenhum texto de usuário entra no SQL) e o bind ambíguo de coleção vazia; o tipo qualificado funciona em install próprio (prefixo vazio) e shared install (ex.: `UT3.UT_VARCHAR2_LIST`), sem depender de synonyms locais.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-69-oracle-runner-typed-binds|PRD-69]]
- 🎯 Requisitos: [[prd-69-oracle-runner-typed-binds|PRD-69 RF1]]
- 🧩 Código: [[COD - oracleRunCall.ts]] · [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunCall.test.ts]] · [[TST - oracleRunner.test.ts]]
- ↩️ Referenciada por: [[02-test-execution]] · [[SEC-005 - Nenhum valor de usuário é concatenado no PL-SQL|SEC-005]] · [[prd-69-oracle-runner-typed-binds|PRD-69]]
<!-- brain:auto:end -->
