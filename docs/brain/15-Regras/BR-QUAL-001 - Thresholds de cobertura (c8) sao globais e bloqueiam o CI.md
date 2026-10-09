---
id: BR-QUAL-001
aliases: [BR-QUAL-001]
tipo: regra
titulo: Thresholds de cobertura (c8) são globais e bloqueiam o CI
dominio: qualidade
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-10-09
implementacao: [".c8rc"]
testes: []
relacionado: ["[[NFR-007 - Cobertura de testes TypeScript]]", "[[TPL-C8 - c8 (cobertura TypeScript)]]", "[[DEP-c8]]"]
tags: ["qualidade"]
---
## Enunciado

Se `npm run test:coverage` roda, então o c8 exige, **globalmente**: 97% lines, 97%
statements, **93% branches** e 97% functions; abaixo disso o processo sai com erro
e o CI falha.

## Pré-condições

`.c8rc` com `check-coverage: true`; execução via `c8 node --test` (sem `spawnSync`,
que bloquearia a instrumentação).

## Exceções

Sem `per-file`; exclui `out/test/**` e `src/test/**`. Branches tem folga menor
(93%) que as demais métricas.

## Justificativa

Protege os módulos puros/canônicos de refatorações (ver NFR-007). O Codecov
acompanha o alvo de projeto (97%).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 🧩 Código: [[COD - .c8rc]]
- 🔗 [[NFR-007 - Cobertura de testes TypeScript]] · [[TPL-C8 - c8 (cobertura TypeScript)]] · [[DEP-c8]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[DEP-c8]]
<!-- brain:auto:end -->
