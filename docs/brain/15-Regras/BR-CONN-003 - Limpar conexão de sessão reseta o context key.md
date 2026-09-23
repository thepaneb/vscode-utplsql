---
id: BR-CONN-003
tipo: regra
titulo: Limpar conexão de sessão reseta o context key
dominio: conexao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/config.ts:224", "src/config.ts:227"]
testes: ["src/test/unit/config.test.ts"]
prds: ["PRD-34"]
tags: ["conexao"]
---
## Enunciado

Se clearSessionConnection() é invocado, então o cache de sessão é descartado e o context key utplsql:connected é setado como false.

## Pré-condições

Comando utplsql.clearConnection ou reset entre testes.

## Exceções

Não afeta setting, variável de ambiente nem perfil ativo, que continuam resolvendo normalmente.

## Justificativa

Permitir trocar/limpar credenciais digitadas em sessão e refletir o estado na UI (menus que dependem de utplsql:connected).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]]
- ↩️ Referenciada por: [[SEC-003 - Senha digitada em sessão só vive em memória|SEC-003]]
<!-- brain:auto:end -->
