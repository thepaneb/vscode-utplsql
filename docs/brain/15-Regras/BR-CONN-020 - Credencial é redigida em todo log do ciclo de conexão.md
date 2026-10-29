---
id: BR-CONN-020
aliases: [BR-CONN-020]
tipo: regra
titulo: Credencial é redigida em todo log do ciclo de conexão
dominio: conexao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-29
implementacao: ["src/redact.ts", "src/oracleRunner.ts", "src/runner.ts", "src/discovery.ts", "src/scriptRunner.ts", "src/connectionProfiles.ts", "scripts/db-matrix/run.sh", "scripts/create-pr.cjs", "scripts/create-release.cjs"]
testes: ["src/test/unit/redact.test.ts", "src/test/unit/connectionRedaction.test.ts", "src/test/unit/scriptsHardening.test.ts"]
prds: ["PRD-110"]
requisitos: ["PRD-110/RF2", "PRD-110/RF3"]
tags: ["conexao", "seguranca"]
---
## Enunciado

Nenhuma mensagem de erro/log do ciclo de conexão contém `user/password@host`: os
call sites aplicam `redactConnection(msg, connection)`, que substitui apenas a
ocorrência exata da connection conhecida pela versão mascarada (sem heurística
que corrompa o texto). Os scripts de desenvolvimento também não usam `eval`
sobre `--tests` e não imprimem a connection sem máscara.

## Pré-condições

Funções que recebem a connection string (`ensurePool`, `withOracleConnection`,
`findInvalidUt3Objects`, `discoverDbSuites`, `discoverSchemaFromDb`,
`executeRunOracle`, `runner`). Funções que só recebem uma conexão já aberta não
têm a senha em escopo.

## Exceções

Connection vazia ou sem senha: a mensagem fica intacta. O helper não usa regex
sobre a mensagem, então não altera textos legítimos que contenham `/` ou `@`.

## Justificativa

Cumprir a `SEC-008` e fechar o alerta `js/clear-text-logging` do CodeQL: a senha
nunca aparece em log, saída de run ou mensagem de erro (CWE-532).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-110-defensive-hardening|PRD-110]]
- 🎯 Requisitos: [[prd-110-defensive-hardening|PRD-110 RF2]] · [[prd-110-defensive-hardening|PRD-110 RF3]]
- 🧩 Código: [[COD - redact.ts]] · [[COD - oracleRunner.ts]] · [[COD - runner.ts]] · [[COD - discovery.ts]] · [[COD - scriptRunner.ts]] · [[COD - connectionProfiles.ts]] · [[COD - run.sh]] · [[COD - create-pr.cjs]] · [[COD - create-release.cjs]]
- 🧪 Testes: [[TST - redact.test.ts]] · [[TST - connectionRedaction.test.ts]] · [[TST - scriptsHardening.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-110-defensive-hardening|PRD-110]]
<!-- brain:auto:end -->
