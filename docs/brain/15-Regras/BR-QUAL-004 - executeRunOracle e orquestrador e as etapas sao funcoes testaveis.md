---
id: BR-QUAL-004
aliases: [BR-QUAL-004]
tipo: regra
titulo: executeRunOracle é orquestrador e as etapas são funções testáveis
dominio: qualidade
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-10-31
implementacao: ["src/oracleRunner.ts", "src/oracleRunCall.ts", "src/oraclePoll.ts"]
testes: ["src/test/unit/oracleRunCall.test.ts", "src/test/unit/oraclePoll.test.ts", "src/test/unit/oracleRunner.test.ts"]
prds: ["PRD-111"]
requisitos: ["PRD-111/RF1", "PRD-111/RF3", "PRD-111/RNF1", "PRD-111/RNF2", "PRD-111/RNF3"]
relacionado: ["[[ADR-006 - Modulos puros vs dependentes de vscode]]", "[[PAT-001 - Módulos puros vs dependentes de vscode]]"]
tags: ["qualidade", "refatoracao"]
---
## Enunciado

`executeRunOracle` é um **orquestrador**: a montagem de reporters, escopo de
cobertura, ordem aleatória e do `BEGIN ut_runner.run(...)` fica em funções
nomeadas e testáveis (`src/oracleRunCall.ts`); o poll de 200 ms do
`UT_OUTPUT_BUFFER_TMP` fica em `src/oraclePoll.ts`; a conexão, o `execute` e o
`run.appendOutput` ficam no orquestrador. O comportamento observável (PL/SQL,
binds, ordem das mensagens) não muda.

## Pré-condições

`OracleRunOptions` e os helpers de conexão (`acquireRunnerConnections`) existem;
os testes de caracterização do PL/SQL e do poll passam.

## Exceções

O agrupamento de `OracleRunOptions` em sub-objetos (RF2) foi adiado para a
0.20.0; a regra cobre a decomposição (RF1) e os testes por etapa.

## Justificativa

Reduzir o custo de leitura e o risco de regressão de um fluxo com muitas
ramificações, sem alterar o protocolo de conexão nem o SQL gerado.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-111-decompose-oracle-runner|PRD-111]]
- 🎯 Requisitos: [[prd-111-decompose-oracle-runner|PRD-111 RF1]] · [[prd-111-decompose-oracle-runner|PRD-111 RF3]] · [[prd-111-decompose-oracle-runner|PRD-111 RNF1]] · [[prd-111-decompose-oracle-runner|PRD-111 RNF2]] · [[prd-111-decompose-oracle-runner|PRD-111 RNF3]]
- 🧩 Código: [[COD - oracleRunner.ts]] · [[COD - oracleRunCall.ts]] · [[COD - oraclePoll.ts]]
- 🧪 Testes: [[TST - oracleRunCall.test.ts]] · [[TST - oraclePoll.test.ts]] · [[TST - oracleRunner.test.ts]]
- 🔗 [[ADR-006 - Modulos puros vs dependentes de vscode]] · [[PAT-001 - Módulos puros vs dependentes de vscode]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[prd-111-decompose-oracle-runner|PRD-111]]
<!-- brain:auto:end -->
