---
id: BR-CONN-012
tipo: regra
titulo: Thick opt-in, fixado na primeira chamada e idempotente
dominio: conexao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleClient.ts:34", "src/oracleClient.ts:81"]
testes: ["src/test/unit/oracleClient.test.ts"]
prds: ["PRD-70"]
tags: ["conexao"]
---
## Enunciado

Se ensureOracleClient é chamada, então o modo é fixado na primeira invocação (thin quando mode não é thick) e nunca muda depois; thick exige libDir não vazio e initOracleClient disponível, senão entra em estado failed com erro amigável sem lançar.

## Pré-condições

Chamada no início do pool (ensurePool) em processo novo.

## Exceções

Erro NJS-090 (já iniciado com outros argumentos) é tratado como sucesso thick; configDir só é repassado se não vazio; falhas como DPI-1047 armazenam lastError e são reapresentadas nas chamadas seguintes.

## Justificativa

O thick só é necessário para bancos com NNE e não pode ser reconfigurado em runtime; evitar crash e dar mensagem acionável ao usuário.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-70-thick-mode-nne|PRD-70]]
- ↩️ Referenciada por: [[ERR-004 - UTPLSQL_THICK_MODE — falha ao iniciar o modo thick (DPI-1047-NJS-090)|ERR-004]]
<!-- brain:auto:end -->
