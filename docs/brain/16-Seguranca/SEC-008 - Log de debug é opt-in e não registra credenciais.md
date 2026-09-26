---
id: SEC-008
aliases: [SEC-008]
tipo: seguranca
titulo: Log de debug é opt-in e não registra credenciais
dominio: segredos
status: ativo
severidade: media
verificado: 2026-09-23
implementacao: ["src/logger.ts:6", "src/logger.ts:12"]
testes: ["src/test/unit/logger.test.ts"]
regras: ["BR-CONN-014"]
tags: ["seguranca"]
---
## Enunciado

logger.debug só emite quando UTPLSQL_DEBUG=1; logger.warn sempre emite; nenhum log inclui credenciais (connection strings passam mascaradas).

## Controle

Gate por variável de ambiente no módulo logger (puro, sem vscode).

## Justificativa

Diagnóstico acionável sob demanda sem poluir o output nem vazar segredos em uso normal.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📐 Regras: [[BR-CONN-014 - Log de debug é opt-in por variável de ambiente|BR-CONN-014]]
- 🧩 Código: [[COD - logger.ts]]
- 🧪 Testes: [[TST - logger.test.ts]]
<!-- brain:auto:end -->
