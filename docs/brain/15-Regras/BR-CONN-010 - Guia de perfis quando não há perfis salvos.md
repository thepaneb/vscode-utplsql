---
id: BR-CONN-010
aliases: [BR-CONN-010]
tipo: regra
titulo: Guia de perfis quando não há perfis salvos
dominio: conexao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:260", "src/connectionProfiles.ts:277"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
prds: ["PRD-34", "PRD-62"]
requisitos: ["PRD-34/RF4", "PRD-62/RF1"]
tags: ["conexao"]
---
## Enunciado

Se pickProfileOrGuide é chamada sem perfis, então oferece novo perfil ou importar do SQL Developer (executando utplsql.newProfile / utplsql.importSqlDevConnections) e, após a escolha, refaz o picker; se ainda não houver perfis retorna undefined.

## Pré-condições

Fluxo pós-invocação (PRD-62) quando não existe perfil configurado.

## Exceções

Com perfis existentes delega diretamente ao QuickPick; aviso cancelado ou criação não efetivada retorna undefined.

## Justificativa

Guiar o primeiro uso sem bloquear a extensão, reutilizando os comandos existentes.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]] · [[prd-62-run-scripts-against-profiles|PRD-62]]
- 🎯 Requisitos: [[prd-34-multi-connection-profiles|PRD-34 RF4]] · [[prd-62-run-scripts-against-profiles|PRD-62 RF1]]
- ↩️ Referenciada por: [[09-configuration]]
<!-- brain:auto:end -->
