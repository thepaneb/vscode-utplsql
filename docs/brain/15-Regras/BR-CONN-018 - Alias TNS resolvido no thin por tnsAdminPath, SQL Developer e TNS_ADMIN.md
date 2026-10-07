---
id: BR-CONN-018
aliases: [BR-CONN-018]
tipo: regra
titulo: Alias TNS é resolvido no thin por tnsAdminPath, SQL Developer e TNS_ADMIN
dominio: conexao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/tnsnames.ts:19", "src/tnsnames.ts:98", "src/oracleRunner.ts:76", "src/config.ts:131"]
testes: ["src/test/unit/tnsnames.test.ts", "src/test/unit/oracleRunnerTns.test.ts", "src/test/integration/v014-tns.test.ts"]
prds: ["PRD-82"]
requisitos: ["PRD-82/RF1", "PRD-82/RF3"]
tags: ["conexao"]
---
## Enunciado

Se o `connectString` for um alias TNS e houver diretório resolvido, o `connectString` é trocado pelo descriptor do `tnsnames.ora`. O diretório é resolvido na ordem: setting `utplsql.connections.tnsAdminPath` → valor **user/machine** de `sqldeveloper.connections.tnsConfiguration.path` → `TNS_ADMIN`. Easy Connect / TNS opaco permanece inalterado.

## Pré-condições

`ensurePool` (thin) com um `connectString` no formato de alias (`^[A-Za-z][A-Za-z0-9_.$-]*$`).

## Exceções

Sem `tnsAdminPath` ou sem alias, o valor original é usado; `tnsnames.ora` ausente/ilegível mantém o valor original (nunca lança).

## Justificativa

Permitir aliases TNS no driver thin sem depender de `TNS_ADMIN` global — apontado pela extensão e nunca pelo workspace (valor user/machine).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-82-tns-wallet|PRD-82]]
- 🎯 Requisitos: [[prd-82-tns-wallet|PRD-82 RF1]] · [[prd-82-tns-wallet|PRD-82 RF3]]
- 🧩 Código: [[COD - tnsnames.ts]] · [[COD - oracleRunner.ts]] · [[COD - config.ts]]
- 🧪 Testes: [[TST - tnsnames.test.ts]] · [[TST - oracleRunnerTns.test.ts]] · [[TST - v014-tns.test.ts]]
- ↩️ Referenciada por: [[Connection]] · [[prd-82-tns-wallet|PRD-82]]
<!-- brain:auto:end -->
