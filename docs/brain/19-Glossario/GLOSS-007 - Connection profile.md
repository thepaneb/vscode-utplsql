---
id: GLOSS-007
aliases: [GLOSS-007]
tipo: glossario
titulo: "Connection profile"
dominio: conexao
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-CONN-004"]
relacionado: ["[[ENT-005 - ConnectionProfile]]", "[[09-configuration]]"]
tags: ["conexao"]
---
## Definição

Perfil nomeado de conexão (`utplsql.profiles`) que pode sobrescrever
`sourcePath`/`coverageOwner`/`includePatterns`; a senha fica no SecretStorage.

## Onde aparece

`connectionProfiles.ts`, `config.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-CONN-004 - Perfil sobrescreve apenas sourcePath, coverageOwner e includePatterns|BR-CONN-004]]
- 🔗 [[ENT-005 - ConnectionProfile]] · [[09-configuration]]
<!-- brain:auto:end -->
