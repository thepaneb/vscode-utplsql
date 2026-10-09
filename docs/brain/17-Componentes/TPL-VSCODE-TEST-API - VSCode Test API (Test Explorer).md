---
id: TPL-VSCODE-TEST-API
aliases: [TPL-VSCODE-TEST-API]
tipo: componente-terceiro
titulo: "VSCode Test API (Test Explorer)"
dominio: plataforma
fornecedor: Microsoft
licenca: MIT
criticidade: critica
risco: medio
versao: "engines.vscode ^1.101.0"
status: ativo
verificado: 2026-09-23
implementacao: ["src/extension.ts", "src/testTree.ts"]
testes: []
regras: [BR-UI-013]
relacionado: ["[[ADR-009 - Integracao nativa ao Test Explorer]]", "[[MOC - Testes]]", "[[TPL-VSCODE-API - API do VS Code usada]]"]
tags: ["plataforma"]
---
## Papel

Superfície nativa usada pela extensão: `TestController`, `TestItem`,
`TestMessage.location`, CodeLens, Diagnostics, StatusBar.

## Riscos

Mudanças de API entre versões do VSCode; `.pks` não tem language ID (registro por
pattern). `controller.items.get()` não alcança suites aninhadas (usar `suiteMap`).

## Upgrade/saída

Plataforma-alvo; acompanhar `engines.vscode`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Componentes]]
- 📐 Regras: [[BR-UI-013 - Integracao nativa ao Test Explorer via a API de testes do VS Code|BR-UI-013]]
- 🧩 Código: [[COD - extension.ts]] · [[COD - testTree.ts]]
- 🔗 [[ADR-009 - Integracao nativa ao Test Explorer]] · [[MOC - Testes]] · [[TPL-VSCODE-API - API do VS Code usada]]
- ↩️ Referenciada por: [[BR-UI-013 - Integracao nativa ao Test Explorer via a API de testes do VS Code|BR-UI-013]] · [[NFR-003 - Compatibilidade com VSCode|NFR-003]] · [[TPL-VSCODE-API - API do VS Code usada|TPL-VSCODE-API]]
<!-- brain:auto:end -->
