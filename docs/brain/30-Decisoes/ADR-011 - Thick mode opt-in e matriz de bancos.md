---
tipo: decisao
status: aceita
modulo: oracle
data: 2026-09-23
tags: [adr, oracle, thick, instant-client, compatibilidade]
---

# ADR-011 - Thick mode opt-in e matriz de bancos Oracle

## Contexto

O driver thin do `node-oracledb` não suporta alguns recursos/cenários (ex.: bancos
com Native Network Encryption configurada — `NJS-090`/`DPI-1047`) e o piso do
utPLSQL varia com a versão do banco (Oracle 12.2 exige piso alternativo). Forçar
thick em todos quebraria a instalação sem Instant Client.

## Decisão

1. **Thin por padrão** (sem Instant Client); **thick opt-in** via
   `oracledb.initOracleClient` quando `ORACLE_CLIENT_LIB_DIR` está configurado
   (PRD-70), com mensagem amigável quando falta.
2. **Matriz de bancos Oracle** para testes de integração (PRD-72), incluindo o
   caso 12.2 com **piso alternativo de utPLSQL** e charset de conexão (PRD-84).
3. **Detecção de versão** e validação de piso na ativação (`SetupValidator`).

## Alternativas consideradas

- **Só thin:** falha em bancos com NNE e em cenários que exigem o cliente nativo.
- **Só thick:** obriga instalar Instant Client — fricção alta de onboarding.
- **Bundlar o Instant Client:** tamanho/licença inviáveis.

## Consequências

- **Positivas:** onboarding sem cliente nativo; thick disponível para casos
  especiais; compatibilidade ampla (12.2+).
- **Negativas / trade-offs:** dois caminhos de driver para manter; a matriz de
  bancos é custosa; mensagens de erro do thick precisam ser traduzidas para ação.

## Referências

- PRDs: [[prd-70-thick-mode-nne|PRD-70]] ·
  [[prd-72-db-test-matrix|PRD-72]] ·
  [[prd-84-oracle-122-support|PRD-84]]
- Código: `src/oracleClient.ts`, `src/setupValidator.ts`
- [[ADR-001 - Execucao via Oracle direto]] · [[MOC - Oracle]] ·
  [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL]]
