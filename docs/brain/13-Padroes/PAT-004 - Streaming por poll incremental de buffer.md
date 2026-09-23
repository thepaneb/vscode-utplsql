---
id: PAT-004
aliases: [PAT-004]
tipo: padrao
titulo: "Streaming por poll incremental de buffer"
dominio: streaming
categoria: dados
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-001 - Execucao via Oracle direto]]", "[[02-test-execution]]"]
tags: ["streaming"]
---
## Intenção

Entregar saída em tempo real a partir de uma tabela compartilhada sem bloquear a
sessão que executa os testes.

## Como se aplica

`conn1` roda `ut_runner.run` (bloqueante); `conn2` faz poll de
`UT_OUTPUT_BUFFER_TMP` por `message_id > :last` a cada ~200ms, roteando linhas
para output de documentação ou para o buffer XML.

## Consequências

- **Positivas:** feedback incremental e XML final no mesmo stream.
- **Negativas:** latência de polling; estado de CDATA e separação JUnit/cobertura.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Padroes]]
- 🔗 [[ADR-001 - Execucao via Oracle direto]] · [[02-test-execution]]
<!-- brain:auto:end -->
