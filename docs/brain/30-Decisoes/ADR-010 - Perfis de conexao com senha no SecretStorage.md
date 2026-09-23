---
tipo: decisao
status: aceita
modulo: conexao
data: 2026-09-23
tags: [adr, conexao, seguranca, secretstorage]
---

# ADR-010 - Perfis de conexão com senha no SecretStorage

## Contexto

Times alternam entre ambientes (DEV/TEST/PROD) e a connection string pode conter
senha. Guardar senha em `settings.json` é inseguro (Settings Sync, versionamento)
e trocar de ambiente manualmente é fricção. A precedência de conexão também
precisava ser determinística.

## Decisão

1. **Perfis de conexão** (`utplsql.profiles`) que sobrescrevem `connection`,
   `sourcePath`, `coverageOwner`, etc., alternáveis pela status bar/paleta.
2. **Senha nunca em settings**: extraída no save (`splitPassword`) e gravada no
   **SecretStorage** (`utplsql.profile.<id>`); a settings fica sem senha.
3. **Precedência determinística**: `setting → env UTPLSQL_CONN → cache de sessão →
   prompt`; nunca logar credenciais.
4. **Connection pooling** com degradação graciosa e cancelamento via `conn.break()`
   + `Promise.race`.

## Alternativas consideradas

- **Senha em `settings.json`:** simples, porém vaza via Settings Sync/versionamento.
- **Variáveis de ambiente apenas:** não permite alternar perfis na UI.
- **Prompt sempre:** fricção alta e sem cache de sessão.

## Consequências

- **Positivas:** troca de ambiente rápida; segredo no keychain; precedência clara.
- **Negativas / trade-offs:** migração de perfis legados (`migrateLegacyProfiles`);
  o agente/CI não tem a senha (usa `UTPLSQL_CONN`); exige stubs de SecretStorage
  nos testes.

## Referências

- PRDs: [34](../../prd/completed/prd-34-multi-connection-profiles.md) ·
  [66](../../prd/completed/prd-66-connection-robustness-logging.md)
- Código: `src/connectionProfiles.ts`, `src/config.ts`, `src/oracleClient.ts`
- [[SEC-001 - Senha Oracle nunca é gravada em settings]] ·
  regras `BR-CONN-001`…`BR-CONN-010`
