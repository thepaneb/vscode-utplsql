---
id: BR-EXEC-012
tipo: regra
titulo: Binds tipados - nenhum valor de usuário concatenado no PL/SQL
dominio: execucao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:593", "src/oracleRunner.ts:596", "src/oracleRunner.ts:598", "src/oracleRunner.ts:604", "src/oracleRunner.ts:677"]
testes: ["src/test/unit/oracleRunner.test.ts:922", "src/test/unit/oracleRunner.test.ts:953", "src/test/unit/oracleRunner.test.ts:979", "src/test/unit/oracleRunner.test.ts:1264"]
prds: ["PRD-69"]
requisitos: ["PRD-69/RF1"]
tags: ["execucao", "seguranca"]
---
## Enunciado

Se o PL/SQL do run é montado, então pathArgs, tags, coverageSchemes e parâmetros de escopo vão como binds tipados (UT_VARCHAR2_LIST para listas, STRING/NUMBER/BOOLEAN para escalares); listas vazias viram o literal null sem bind.

## Pré-condições

pathArgs/coverage/randomOrder conforme configuração; o SQL é BEGIN ut_runner.run(...) END;.

## Exceções

pathArgs vazio usa a_paths => null; sem cobertura, a_coverage_schemes => null; a_tags vazio é bind STRING com val null; randomSeed 0/ausente vira bind NUMBER null.

## Justificativa

Evita injeção (nenhum texto de usuário entra no SQL) e o bind ambíguo de coleção vazia; o synonym UT_VARCHAR2_LIST sem prefixo funciona em install próprio e shared.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-69-oracle-runner-typed-binds|PRD-69]]
- 🎯 Requisitos: [[prd-69-oracle-runner-typed-binds|PRD-69 RF1]]
- ↩️ Referenciada por: [[SEC-005 - Nenhum valor de usuário é concatenado no PL-SQL|SEC-005]]
<!-- brain:auto:end -->
