---
id: BR-ERR-001
aliases: [BR-ERR-001]
tipo: regra
titulo: Erros de domínio são tipados e carregam chave de mensagem
dominio: erros
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-11
implementacao: ["src/errors.ts", "src/oracleRunner.ts", "src/runner.ts", "src/commands/run.ts", "src/commands/debug.ts", "src/commands/utility.ts"]
testes: ["src/test/unit/errors.test.ts", "src/test/unit/oracleRunner.test.ts", "src/test/unit/runner.test.ts"]
prds: ["PRD-130"]
requisitos: ["PRD-130/RF2", "PRD-130/RF3", "PRD-130/RF4"]
relacionado: ["[[ERR-010 - Erro genérico do ut_runner.run (runner.oracleError)]]"]
tags: ["erros", "arquitetura"]
---
## Enunciado

Falhas de conexão/autenticação, timeout e reporter ausente usam a hierarquia
`UtplsqlError` (`src/errors.ts`) com `code` estável e `userMessageKey` do
catálogo i18n. `mapOracleError` preserva a causa original (`cause`) e
`formatUserError` redige a conexão antes de exibir. `UtplsqlVersionError` e
`ConfigurationError` existem para callers, mas a validação de versão continua
como diagnóstico (`quickfix.ts`) e configuração inválida faz fallback com warn.

## Controle

`src/errors.ts` define `UtplsqlError`, `OracleConnectionError`,
`UtplsqlVersionError`, `ReporterNotFoundError`, `ConfigurationError` e
`TimeoutError`. `oracleRunner.ts` mapeia ORA-12541/12514/12545/12170/03113/
03135 (conexão), ORA-01017/28000/28001 (autenticação) e NJS-040/DPI-1067
(timeout); `prepareReporters` lança `ReporterNotFoundError`; `runner.ts` e os
comandos usam `formatUserError` em vez de `e.message` cru.

## Justificativa

Permitir tratamento preciso por tipo, mensagens localizadas e diagnóstico sem
vazar credenciais, sem quebrar `RunAbortedError`/`instanceof` existentes.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-130-config-validation-typed-errors|PRD-130]]
- 🎯 Requisitos: [[prd-130-config-validation-typed-errors|PRD-130 RF2]] · [[prd-130-config-validation-typed-errors|PRD-130 RF3]] · [[prd-130-config-validation-typed-errors|PRD-130 RF4]]
- 🧩 Código: [[COD - errors.ts]] · [[COD - oracleRunner.ts]] · [[COD - runner.ts]] · [[COD - run.ts]] · [[COD - debug.ts]] · [[COD - utility.ts]]
- 🧪 Testes: [[TST - errors.test.ts]] · [[TST - oracleRunner.test.ts]] · [[TST - runner.test.ts]]
- 🔗 [[ERR-010 - Erro genérico do ut_runner.run (runner.oracleError)]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-130-config-validation-typed-errors|PRD-130]]
<!-- brain:auto:end -->
