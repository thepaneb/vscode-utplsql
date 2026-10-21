---
tipo: nota
status: ativo
titulo: "Mapa — testes da matriz de bancos"
modulo: testes
data: 2026-10-20
verificado: 2026-10-20
implementacao: ["scripts/db-matrix/run.sh", "scripts/db-matrix/bootstrap.sh", "scripts/db-matrix/wait-ready.sh", "scripts/db-matrix/summary.cjs", "scripts/db-matrix/parse-version.cjs", "docker/db-matrix/compose.yaml", ".github/workflows/integration.yml"]
testes: ["src/test/unit/matrixConfig.test.ts", "src/test/unit/dbMatrixSummary.test.ts"]
tags: [teste, matriz]
---
# Mapa — testes da matriz de bancos

Cobertura da orquestração em [[PIPE-integration - Integration (Oracle)]].

## Versões

A lista canônica fica em `scripts/db-matrix/matrix.env`:

`12.2` (utPLSQL 3.1.x) · `18xe` · `19ee` · `21xe` · `23free`.

O CI anônimo roda só `18xe`, `21xe` e `23free`; `12.2`/`19ee` exigem
`ORACLE_AUTH_USER`/`ORACLE_AUTH_TOKEN`. Localmente, com as credenciais, as 5
versões rodam.

## Modos do `run.sh`

| Flag | O que roda |
|---|---|
| `--smoke` | Capacidades Oracle + debugger + `v017-features` (rápido) |
| `--full` | Integração completa + multi-root por banco |
| `--thick` | Thick smoke: Instant Client + conexão (host isolado) |
| `--tests <cmd>` | Comando customizado |

## Garantias cobertas por teste

- `--skip-bootstrap` valida `UT3.UT_RUNNER` e o schema `UTPLSQL_TEST` antes de
  rodar; volume stale/credencial errada falha com mensagem acionável
  (evita o `ORA-01017` em cascata).
- `trap cleanup` derruba o container em falha/interrupção e preserva o volume
  nomeado; `--keep-db` desliga o cleanup.
- A conexão é mascarada no log (`UT3/***@…`), nunca a senha.
- Logs por versão em `docker/db-matrix/.cache/logs/<label>.log`.
- Resumo JSONL/Markdown em
  `docker/db-matrix/.cache/matrix-summary-<timestamp>.{jsonl,md}`, com
  testes/pass/fail/pending e duração por banco; o CI publica como artifact.
- `--continue-on-error` segue para o próximo banco, mantendo o resultado de
  cada um no resumo.
- O smoke inclui `v017-features` (CodeLens/associações/snippets/HTML de
  cobertura) além das capacidades e do debugger.

## Testes

- `src/test/unit/matrixConfig.test.ts` — schema do `matrix.env`, piso 12.2,
  flags do `run.sh`, preflight, máscara de senha, resumo, smoke e workflow.
- `src/test/unit/dbMatrixSummary.test.ts` — parser Node/Mocha, JSONL, Markdown
  e CLI do `summary.cjs` (sem números inventados; formato desconhecido → `?`).

## Comandos

```sh
scripts/db-matrix/run.sh --list
scripts/db-matrix/run.sh --only 23free --smoke
scripts/db-matrix/run.sh --only 18xe,21xe,23free --full
scripts/db-matrix/run.sh --only 23free --skip-bootstrap --full
```

## Conexões

- 🗺️ [[MOC - Testes]]
- 🔧 [[PIPE-integration - Integration (Oracle)]]
- 📄 [[TST - matrixConfig.test.ts]] · [[TST - dbMatrixSummary.test.ts]]
- 🧩 [[COD - run.sh]] · [[COD - summary.cjs]] · [[COD - bootstrap.sh]]
