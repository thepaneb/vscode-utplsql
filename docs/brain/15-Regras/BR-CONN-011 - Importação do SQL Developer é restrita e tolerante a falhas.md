---
id: BR-CONN-011
tipo: regra
titulo: Importação do SQL Developer é restrita e tolerante a falhas
dominio: conexao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:45", "src/connectionProfiles.ts:98", "src/connectionProfiles.ts:280"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
prds: ["PRD-34"]
requisitos: ["PRD-34/RF6"]
tags: ["conexao"]
---
## Enunciado

Se a extensão importa conexões, então procura connections.xml apenas em subpastas que casam /^system/ dentro de ~/.sqldeveloper e do APPDATA do SQL Developer, ignorando base inexistente; XML malformado retorna lista vazia e References sem name/userName ou sem host são descartadas.

## Pré-condições

Comando utplsql.importSqlDevConnections ou pickProfileOrGuide/import.

## Exceções

Diretório sem connections.xml retorna undefined; porta/serviço ausentes geram connection com campos vazios; erros de IO não lançam.

## Justificativa

Importar perfis do SQL Developer sem varrer o disco inteiro e sem quebrar quando o formato/arquivo não existir.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]]
- 🎯 Requisitos: [[prd-34-multi-connection-profiles|PRD-34 RF6]]
- ↩️ Referenciada por: [[09-configuration]]
<!-- brain:auto:end -->
