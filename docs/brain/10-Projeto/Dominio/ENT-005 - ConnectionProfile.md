---
id: ENT-005
tipo: entidade
titulo: "ConnectionProfile"
dominio: conexao
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
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
<!-- brain:auto:end -->
