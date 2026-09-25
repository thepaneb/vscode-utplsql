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
versao: "engines.vscode ^1.88.0"
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
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
- ↩️ Referenciada por: [[NFR-003 - Compatibilidade com VSCode|NFR-003]]
<!-- brain:auto:end -->
