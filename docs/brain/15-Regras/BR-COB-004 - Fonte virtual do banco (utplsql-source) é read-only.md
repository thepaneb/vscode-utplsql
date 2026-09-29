---
id: BR-COB-004
aliases: [BR-COB-004]
tipo: regra
titulo: Fonte virtual do banco (utplsql-source) é read-only
dominio: cobertura
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/virtualSource.ts:11", "src/dbSourceProvider.ts:173", "src/dbSourceProvider.ts:187"]
testes: ["src/test/unit/dbSourceProvider.test.ts", "src/test/unit/virtualSource.test.ts"]
prds: ["PRD-80"]
requisitos: ["PRD-80/RF1"]
tags: ["cobertura", "seguranca"]
---
## Enunciado

O provider `utplsql-source:/<SCHEMA>/<OBJ>.<ext>` serve o texto de `ALL_SOURCE` (qualquer tipo de objeto) como documento **read-only**, em memória e com cache por sessão; nunca grava no banco nem no disco. O scheme legado `utplsql-db:` é um alias.

## Pré-condições

Conexão resolvida (sem prompt) e driver `oracledb` disponível.

## Exceções

Sem schema, o owner é o usuário da conexão; sem objeto acessível (`ALL_SOURCE` negado), retorna vazio (fallback silencioso).

## Justificativa

Permitir jump-to-failure e cobertura sem fontes locais, sem introduzir superfície de escrita.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-80-virtual-db-source|PRD-80]]
- 🎯 Requisitos: [[prd-80-virtual-db-source|PRD-80 RF1]]
- 🧩 Código: [[COD - virtualSource.ts]] · [[COD - dbSourceProvider.ts]]
- 🧪 Testes: [[TST - dbSourceProvider.test.ts]] · [[TST - virtualSource.test.ts]]
- ↩️ Referenciada por: [[SEC-013 - Fonte virtual do banco é read-only|SEC-013]]
<!-- brain:auto:end -->
