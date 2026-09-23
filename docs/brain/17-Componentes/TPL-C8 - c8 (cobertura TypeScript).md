---
id: TPL-C8
tipo: componente-terceiro
titulo: "c8 (cobertura TypeScript)"
dominio: tooling
fornecedor: c8
licenca: ISC
criticidade: media
risco: baixo
versao: "^12.0.0"
url: https://github.com/bcoe/c8
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["tooling"]
---
## Papel

Cobertura dos testes TypeScript via source maps (`test:coverage`), com thresholds
90% lines/statements, 85% branches, 90% functions (`.c8rc`).

## Riscos

Instrumentação quebra se o runner usar `spawnSync` (por isso não usa
`run-tests.cjs`); exclui `out/test/**`.

## Upgrade/saída

Config em `.c8rc`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Componentes]]
<!-- brain:auto:end -->
