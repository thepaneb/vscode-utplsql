---
id: PAT-007
aliases: [PAT-007]
tipo: padrao
titulo: "Stub de vscode em duas camadas"
dominio: teste
categoria: teste
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-006 - Modulos puros vs dependentes de vscode]]", "[[10-development-tooling]]"]
tags: [testes]
---
## Intenção

Testar módulos que importam `vscode` sem Extension Host.

## Como se aplica

`src/test/vscode-stub.ts` fornece a API mínima; carregado por teste
(`import './setup.js'`) e globalmente (`--require scripts/test-setup.cjs`). Ao
adicionar import de `vscode` em produção, adicionar o stub correspondente.

## Consequências

- **Positivas:** cobertura alta sem subir o VSCode.
- **Negativas:** o stub precisa acompanhar a API usada.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Padroes]]
- 🔗 [[ADR-006 - Modulos puros vs dependentes de vscode]] · [[10-development-tooling]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[NFR-007 - Cobertura de testes TypeScript|NFR-007]]
<!-- brain:auto:end -->
