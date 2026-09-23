---
id: ERR-004
tipo: erro
titulo: UTPLSQL_THICK_MODE — falha ao iniciar o modo thick (DPI-1047/NJS-090)
dominio: conexao
codigo: UTPLSQL_THICK_MODE
status: ativo
severidade: media
verificado: 2026-09-23
implementacao: ["src/quickfix.ts:51", "src/oracleClient.ts:34", "src/oracleClient.ts:73"]
testes: ["src/test/unit/oracleClient.test.ts"]
regras: ["BR-CONN-012"]
tags: ["erro", "conexao"]
---
## Sintoma

Bancos com NNE exigem thick; a inicialização falha com DPI-1047 (Instant Client não encontrado) ou NJS-090 (já iniciado).

## Causa

libDir ausente/incorreto, Instant Client não instalado, ou initOracleClient já chamado com outros argumentos.

## Correção

Informar o libDir do Instant Client (ou instalar); NJS-090 é tratado como sucesso (idempotente). O quick-fix aponta para as settings.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-CONN-012 - Thick opt-in, fixado na primeira chamada e idempotente|BR-CONN-012]]
<!-- brain:auto:end -->
