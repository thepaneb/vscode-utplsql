---
id: BR-PARSE-008
tipo: regra
titulo: DB-first com gate de versão 3.1.3 e modos de fonte auto/database/file
dominio: descoberta
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/discovery.ts:219", "src/discovery.ts:220", "src/discovery.ts:409", "src/discovery.ts:410", "src/discovery.ts:412", "src/discovery.ts:413", "src/discovery.ts:415", "src/discovery.ts:416", "src/testTree.ts:183"]
testes: ["src/test/unit/discovery.test.ts", "src/test/unit/testTree.test.ts"]
tags: ["descoberta"]
---
## Enunciado

discoverDbSuites usa ut_runner.get_suites_info apenas quando a versão do utPLSQL é >= 3.1.3 (ou desconhecida); se a API retornar linhas, elas são a fonte; caso contrário cai para ALL_SOURCE, exceto quando discovery.source é database (sem fallback, retorna vazio); com discovery.source file o banco nem é consultado.

## Pré-condições

Versão obtida via getOracleInfo; conector acessível; schemas candidatos deduplicados de paths e pastas.

## Exceções

Nunca lança; qualquer erro do banco retorna vazio; versão antiga nunca chama get_suites_info; callTimeout é fixado em 10s e restaurado em finally.

## Justificativa

Garante compatibilidade com versões antigas do framework e dá controle explícito da origem da verdade, sem quebrar a descoberta em falhas transitórias.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
