---
id: DEP-oracledb
aliases: [DEP-oracledb]
tipo: dependencia
status: ativo
titulo: "oracledb (node-oracledb)"
nome: oracledb
versao: "^26.0.0"
escopo: runtime
licenca: "Apache-2.0 OR UPL-1.0"
criticidade: alta
risco: "Driver nativo (glue por plataforma no VSIX); thick exige Instant Client; thin não cobre NNE"
alternativas: [utplsql-cli, SQLcl]
tags: [dependencia, runtime, oracle]
decisoes: [ADR-001, ADR-011]
regras: [BR-CONN-012, BR-EXEC-001, BR-DEP-001, BR-CONN-021]
---

# DEP-oracledb — oracledb (node-oracledb)

## Papel no projeto

É o **coração da execução**: conexão Oracle direta (thin por padrão, thick
opt-in), pool, streaming de resultados (`conn1` executa, `conn2` faz poll do
buffer) e os binds de `ut_runner.run`. Substituiu o utPLSQL-cli.

## Riscos

- **Nativo**: o VSIX carrega o *glue* por plataforma (thick+thin em 4 alvos,
  thin-only nos demais); um target sem binário só roda bancos sem NNE.
- **Thin não cobre NNE** — exige `oracleClientMode = thick` + Instant Client
  **19c+**; desde o v26 o thick carrega `libclntsh.so`/`libclntsh.dylib` pelo
  **nome padrão** (nomes versionados não são carregados).
- Breaking changes entre majors (ex.: mudanças de pool/`callTimeout`); o major
  26 é deliberado (PRD-124).

## Alternativas

- utPLSQL-cli (descartado — via CLI/Java, ver PRD); SQLcl (não usado).

## Referências

- `package.json` · `src/oracleRunner.ts` · `src/oracleClient.ts`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-CONN-012 - Thick opt-in, fixado na primeira chamada e idempotente|BR-CONN-012]] · [[BR-EXEC-001 - Execução usa duas conexões dedicadas (conn1 runner, conn2 poll)|BR-EXEC-001]] · [[BR-DEP-001 - Runtime deps em dependencies e nota DEP- para cada dep direta|BR-DEP-001]] · [[BR-CONN-021 - Major do driver Oracle so entra com matriz e packaging validados|BR-CONN-021]]
- 🧭 Decisões: [[ADR-001 - Execucao via Oracle direto|ADR-001]] · [[ADR-011 - Thick mode opt-in e matriz de bancos|ADR-011]]
- ↩️ Referenciada por: [[BR-DEP-001 - Runtime deps em dependencies e nota DEP- para cada dep direta|BR-DEP-001]]
<!-- brain:auto:end -->
