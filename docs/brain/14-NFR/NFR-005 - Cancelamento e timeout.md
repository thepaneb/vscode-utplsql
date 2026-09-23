---
id: NFR-005
tipo: nfr
titulo: "Cancelamento e timeout"
dominio: confiabilidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["confiabilidade"]
---
## Requisito

Cancelar a execução via `conn.break()` nas duas conexões + `Promise.race`;
`timeoutMinutes` opcional reusa o mesmo caminho; `utplsql:running` sempre resetado.

## Justificativa

Evitar run pendurado e liberar conexões.

## Verificação

`oracleRunner.ts`, `runner.ts`.
