---
id: NFR-005
aliases: [NFR-005]
tipo: nfr
titulo: "Cancelamento e timeout"
dominio: confiabilidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-010 - Perfis de conexao com senha no SecretStorage]]", "[[ADR-001 - Execucao via Oracle direto]]", "[[MOC - Oracle]]"]
requisitos: ["PRD-05/RF3"]
tags: ["confiabilidade"]
---
## Requisito

Cancelar a execução via `conn.break()` nas duas conexões + `Promise.race`;
`timeoutMinutes` opcional reusa o mesmo caminho; `utplsql:running` sempre resetado.

## Justificativa

Evitar run pendurado e liberar conexões.

## Verificação

`oracleRunner.ts`, `runner.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 🎯 Requisitos: [[prd-05-progress-cancel|PRD-05 RF3]]
- 🔗 [[ADR-010 - Perfis de conexao com senha no SecretStorage]] · [[ADR-001 - Execucao via Oracle direto]] · [[MOC - Oracle]]
<!-- brain:auto:end -->
