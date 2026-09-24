---
id: ERR-008
aliases: [ERR-008]
tipo: erro
titulo: ALL_SOURCE inacessível na descoberta (package pulado)
dominio: descoberta
codigo: ORA-00942
status: ativo
severidade: media
verificado: 2026-09-23
implementacao: ["src/discovery.ts:189"]
testes: ["src/test/unit/discovery.test.ts"]
regras: ["BR-PARSE-007"]
tags: [erros, descoberta]
---
## Sintoma

No fallback de descoberta por banco, um package é silenciosamente ignorado e não aparece na árvore.

## Causa

ALL_SOURCE inacessível ao schema (ORA-00942) durante a leitura do fonte do package.

## Correção

Conceder acesso/grants ao dicionário; a extensão pula o package e continua (best-effort), sem abortar a descoberta.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-PARSE-007 - Fallback ALL_OBJECTS-ALL_SOURCE ignora UT_- e nunca lança|BR-PARSE-007]]
- 🧩 Código: [[COD - discovery.ts]]
- 🧪 Testes: [[TST - discovery.test.ts]]
<!-- brain:auto:end -->
