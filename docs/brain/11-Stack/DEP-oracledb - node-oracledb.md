---
id: DEP-oracledb
aliases: [DEP-oracledb]
tipo: dependencia
status: ativo
titulo: "oracledb (node-oracledb)"
nome: oracledb
versao: "^7.0.1"
escopo: runtime
licenca: "Apache-2.0 OR UPL-1.0"
criticidade: alta
risco: "Driver nativo (glue por plataforma no VSIX); thick exige Instant Client; thin não cobre NNE"
alternativas: [utplsql-cli, SQLcl]
tags: [dependencia, runtime, oracle]
---

# DEP-oracledb — oracledb (node-oracledb)

## Papel no projeto

É o **coração da execução**: conexão Oracle direta (thin por padrão, thick
opt-in), pool, streaming de resultados (`conn1` executa, `conn2` faz poll do
buffer) e os binds de `ut_runner.run`. Substituiu o utPLSQL-cli.

## Riscos

- **Nativo**: o VSIX carrega o *glue* por plataforma (thick+thin em 4 alvos,
  thin-only nos demais); um target sem binário só roda bancos sem NNE.
- **Thin não cobre NNE** — exige `oracleClientMode = thick` + Instant Client.
- Breaking changes entre majors (ex.: mudanças de pool/`callTimeout`).

## Alternativas

- utPLSQL-cli (descartado — via CLI/Java, ver PRD); SQLcl (não usado).

## Referências

- `package.json` · `src/oracleRunner.ts` · `src/oracleClient.ts`
