---
id: SEC-004
tipo: seguranca
titulo: Segredos locais ficam fora do controle de versão
dominio: segredos
status: ativo
severidade: critica
verificado: 2026-09-23
implementacao: [".gitignore"]
testes: []
regras: []
tags: ["seguranca"]
---
## Enunciado

O repositório nunca versiona .env (tokens Oracle/GitHub/Obsidian) nem o data.json do plugin Local REST API (que contém a API key do vault).

## Controle

.gitignore ignora .env e docs/brain/.obsidian/plugins/obsidian-local-rest-api/data.json; o MCP do opencode usa {env:OBSIDIAN_API_KEY}, não o valor.

## Justificativa

O vault passou a ser versionado; sem as regras, o token do MCP e credenciais vazariam no git.

