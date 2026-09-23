---
id: NFR-004
tipo: nfr
titulo: "Latência do streaming"
dominio: desempenho
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-001 - Execucao via Oracle direto]]", "[[PAT-004 - Streaming por poll incremental de buffer]]", "[[MOC - Oracle]]"]
tags: ["desempenho"]
---
## Requisito

Saída de documentação em tempo real com poll de ~200ms do buffer; throttle de
200ms na status bar.

## Justificativa

Feedback incremental sem sobrecarregar o banco.

## Verificação

`oracleRunner.ts` (loop de poll), `statusBar.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 🔗 [[ADR-001 - Execucao via Oracle direto]] · [[PAT-004 - Streaming por poll incremental de buffer]] · [[MOC - Oracle]]
<!-- brain:auto:end -->
