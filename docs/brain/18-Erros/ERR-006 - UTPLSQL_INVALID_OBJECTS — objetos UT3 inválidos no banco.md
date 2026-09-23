---
id: ERR-006
tipo: erro
titulo: UTPLSQL_INVALID_OBJECTS — objetos UT3 inválidos no banco
dominio: setup
codigo: UTPLSQL_INVALID_OBJECTS
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/quickfix.ts:190", "src/quickfix.ts:236"]
testes: []
regras: ["BR-UI-007"]
tags: ["erro", "setup"]
---
## Sintoma

Diagnóstico aponta objetos do framework utPLSQL com status inválido no schema (ex.: UT3).

## Causa

Objetos UT_* ficaram inválidos (instalação incompleta, upgrade parcial ou dependência quebrada).

## Correção

Recompilar os objetos UT3 (o quick-fix oferece a ação; requer privilégio de compilação no schema do framework).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-UI-007 - Diagnósticos de setup e quick-fixes restritos ao source utPLSQL Setup|BR-UI-007]]
<!-- brain:auto:end -->
