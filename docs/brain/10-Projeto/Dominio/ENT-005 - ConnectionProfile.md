---
id: ENT-005
aliases: [ENT-005]
tipo: entidade
titulo: "ConnectionProfile"
dominio: conexao
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-CONN-004"]
relacionado: ["[[GLOSS-007 - Connection profile]]", "[[09-configuration]]"]
tags: ["conexao"]
---
## Definição

Configuração nomeada de conexão e escopo (sourcePath/coverageOwner/includePatterns),
com senha no SecretStorage.

## Atributos

id, name, connection, charset, sourcePath, coverageOwner, includePatterns,
isDefault.

## Onde aparece

`connectionProfiles.ts`, `types.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Dominio]]
- 📐 Regras: [[BR-CONN-004 - Perfil sobrescreve apenas sourcePath, coverageOwner e includePatterns|BR-CONN-004]]
- 🔗 [[GLOSS-007 - Connection profile]] · [[09-configuration]]
<!-- brain:auto:end -->
