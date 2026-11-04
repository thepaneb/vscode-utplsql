---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-10
verificado: 2026-10-31
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.19.0 (planejamento)

Plano da **0.19.0 — “Piso Node 24 e runtime moderno”**. O status e a versão alvo
são a **fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade | Situação |
|---|---|---|---|---|---|
| 1 | PRD-127 | Piso de VS Code 1.125 e runtime Node 24 | 3–5 dias | Média-Alta | aprovada |
| 2 | PRD-47 | Node 24 no toolchain e Node 26 no CI | 0,5 dia | Baixa | aprovada |
| 3 | PRD-95 | Modernização do runtime: ESM (`.mjs`), ES2024 e stdlib Node 24 | 2–3 dias | Média | aprovada |
| 4 | PRD-111 | Decompor `executeRunOracle` e agrupar `OracleRunOptions` | 3–4 dias | Média-Alta | aprovada |
| 5 | PRD-124 | Upgrade para node-oracledb 26 com matriz e packaging validados | 2–3 dias | Média-Alta | aprovada (RF0 primeiro) |
| 6 | PRD-125 | Suíte completa em thick e matriz de bancos no CI | 1,5–3 dias | Média | parcial (thick-full na 0.20.0) |

**PRDs:** [[prd-127-vscode-floor-1-125|PRD-127]] ·
[[prd-47-node-26-toolchain|PRD-47]] · [[prd-95-esm-es2023-node22|PRD-95]] ·
[[prd-111-decompose-oracle-runner|PRD-111]] ·
[[prd-124-oracledb-26-upgrade|PRD-124]] ·
[[prd-125-thick-full-matrix-ci|PRD-125]]

**Tema:** **plataforma e runtime primeiro**, refatorações depois. A PRD-127 sobe o
piso para VS Code 1.125 / Node 24.15.0 e audita `src/` e `scripts/` contra as APIs
e deprecações do Node 24 (RF5); a PRD-47 mantém o toolchain em Node 24 e cobre o
26 no CI; a PRD-95 aproveita o novo runtime para ESM (`.mjs`) e ES2024.
Só então vêm as refatorações que reduzem retrabalho: PRD-111 decompõe
`executeRunOracle` **antes** da instrumentação da PRD-102 (observabilidade), a
PRD-124 sobe o driver Oracle com matriz/packaging validados (issue #242), a
PRD-125 valida a suíte completa em thick (incluindo o 11g). A PRD-115 (fatiar os
catálogos i18n) migrou para a 0.22.0, onde abre o bloco de localização.

**Reorganização (2026-10-29):** a PRD-124 entrou após a PRD-111 (o runner já
decomposto reduz o conflito no upgrade do driver) e antes da PRD-102 (0.20.0).

**Reorganização (2026-10-30):** a 0.19.0 passa a abrir com o novo piso de
plataforma. A **PRD-127** (VS Code 1.125 / Node 24) e a **PRD-47** (toolchain
24 + CI 26) entram antes da **PRD-95**, que migra de 0.23.0 para cá e adota ESM
`.mjs` + ES2024. A ordem 127 → 47 → 95 é deliberada: o build/tipos precisam do
piso antes de modernizar o runtime.

**Reorganização (2026-10-30, nivelamento):** a **PRD-115** saiu para a 0.22.0,
que passou a concentrar todo o bloco de localização (115 + 88–93). A 0.19.0 fica
só com plataforma/runtime; a ordem 127 → 47 → 95 continua intacta. A **PRD-127**
passou a incluir a auditoria de compatibilidade/otimização para Node 24 (RF5),
com 3–5 dias.

**Revisão (2026-10-31):** revisão PRD a PRD contra o código da 0.18.0:

- **PRD-127/47 juntas no mesmo PR**: o piso `engines.node >=24` e a saída do
  Node 22 do CI precisam entrar juntos para não deixar um estado contraditório.
- **PRD-95**: o `vsce@4.0.0` empacota `main: ./dist/extension.mjs` (probe
  validado); o issue #1273 do vsce é sobre `main` **sem** extensão. A regra de
  ESM é **`BR-PLAT-005`** (a `BR-PLAT-002` já existe). O `dist/` precisa ser
  limpo antes do bundle. O cap do bundle é **942.777 bytes** (920,7 KiB).
- **PRD-111**: a função está em `src/oracleRunner.ts:586-1052` (**467 linhas**),
  a interface em `:449` (**33 campos**), e há **18 arquivos/69 referências** a
  `pathArgs` nos testes — o RF2 é maior que “2 produtores”. O `loadOracledbMod`
  já é injetável; a regra nova é **`BR-QUAL-004`**.
- **PRD-124**: o v7.0.0 (jun/2026) **já removou** Client < 19c; o 0.19.0 **não**
  anuncia uma nova quebra de piso de Client. O que muda no v26 é o nome padrão
  `libclntsh.so`/`libclntsh.dylib` e a remoção do pré-compilado macOS Intel.
- **PRD-125**: RF1/RF2 **já foram entregues** no commit `cd0fa51`
  (`.vscode-test.thick-full.mjs`, scripts, `run.sh --thick-full`, teste e docs).
  Restam a validação 23free/11g, o ajuste do `thickMode.test` (conflito de
  inicialização global) e a política de CI.
- **Roadmap**: adicionadas as seções de branch de integração, baseline,
  progresso e contingência; a estimativa sobe para **13–20 dias** (≈12–18 com o
  spike da 124 em paralelo).

**Total estimado:** ≈ 13–20 dias (≈12–18 com o spike do RF0 em paralelo).

## Branch de integração

A versão é integrada em **`release/v0.19.0`** (a partir da `main` em 0.18.0).
Cada PRD usa um branch próprio (`feat/prd-NNN-…`) com PR para a branch de
integração; o merge para a `main` é **um PR único** no fim e exige **aprovação
explícita do mantenedor**. A versão é pré-bumpada para 0.19.0 no início
(package/lock/site/CHANGELOG) para manter o `version:check` verde em todos os
PRs. O CI roda também em `push` para `release/**` (drift e testes após cada
merge).

## Baseline (2026-10-31)

- Unitários: **1471 testes / 1467 pass / 4 skip**.
- Cobertura: **97,97% linhas / 93,77% branches / 97,77% funções**
  (thresholds 97/93/97 — margem curta; cada função nova precisa de teste).
- Bundle CJS: **942.777 bytes** (920,7 KiB) em `dist/extension.js`.
- Docs: `docs:check`, `docs:fidelity`, `version:check`, `brain:rules:lines` e
  `brain:gaps` verdes; `.nvmrc` 24; CI em 22/24/26.

## Ordem de execução

1. **PRD-127 + PRD-47** (um PR, dois commits): piso, tipos, esbuild, docs,
   matriz 24/26 e auditoria Node 24.
2. **PRD-95**: ESM `.mjs`, ES2024 e stdlib; `BR-PLAT-005`.
3. **PRD-111**: caracterização, decomposição e agrupamento das opções;
   `BR-QUAL-004`.
4. **PRD-124**: RF0 (spike GO/NO-GO) em paralelo à PRD-95; merge do bump depois
   da PRD-111; `BR-CONN-021`.
5. **PRD-125**: validar 23free/11g, excluir `thickMode.test` do thick-full e
   integrar a política de CI.
6. Fechamento: `completed` + `versao: "0.19.0"`, `Registro de features`,
   `brain:ci`/`docs:check` e PR final `release/v0.19.0 → main` (aprovação).

## Progresso

- **Fase 0** (2026-10-31): branch `release/v0.19.0`, pre-bump para 0.19.0,
  `CHANGELOG` inicial e revisão das PRDs.
- **PRD-127 + PRD-47** (2026-10-31): piso `^1.125.0`, Node 24, `@types/vscode`
  1.125.0, `@types/node ^24.19.0`, esbuild `node24`, CI `[24, 26]` com docs/
  auditoria só no 24, README ×24/wiki/site/CONTRIBUTING, NFR/TPL/BR atualizados
  e auditoria Node 24 registrada. `lib` do `tsconfig` subiu para ES2022 por causa
  dos dois `.at(-1)` já existentes nos testes (a PRD-95 sobe para ES2024).
  Gates: **1472 testes / 1468 pass / 4 skip**, cobertura **97,97/93,75/97,77**,
  `docs:check`, `docs:fidelity`, `brain:rules:lines` e `version:check` verdes;
  `npm run package` gerou o VSIX 0.19.0 com `engines` 1.125/24. Falta a
  instalação manual do VSIX no 1.125 e no stable (gate do PR).
- **PRD-95** (2026-10-31): bundle ESM `dist/extension.mjs` (`format: 'esm'`,
  `target: node24`, `dist` limpo antes), `main`/launch/`vsixIgnore` atualizados,
  `tsconfig` ES2024, 3× `.at(-1)` e 4× `Promise.withResolvers`, `timers/promises`
  no poll/timeout do debugger, regra **`BR-PLAT-005`** e teste
  `esbuildConfig.test.ts`. Bundle **941.039 bytes** na primeira medição e
  **701.347 bytes** após `minify`/`keepNames` (≤ 942.777); VSIX 0.19.0 empacota
  `dist/extension.mjs`; unitários **1475/1471 pass/4 skip** e cobertura
  **97,97/93,72/97,92**.
- **PRD-111 (RF1)** (2026-10-31): `executeRunOracle` caiu de **467 para 167
  linhas**; `src/oracleRunCall.ts` (builders puros), `src/oraclePoll.ts` (poll
  de 200 ms), `prepareReporters`, `runAndPoll`, `finalizeRun` e
  `drainDbmsOutput`; regra **`BR-QUAL-004`**; testes novos
  `oracleRunCall.test.ts`/`oraclePoll.test.ts`. Suíte **1486/1482 pass/4 skip**,
  cobertura **98,01/93,75/97,95**. O **RF2** (agrupar `OracleRunOptions`) foi
  adiado para a 0.20.0 (mecânico, 18 arquivos de teste).
- **PRD-124 (GO)** (2026-10-31): spike **GO** com `oracledb@26.0.0` +
  `@types/oracledb@26.0.1`; 23free full (125+6), 11g thick (4/4), 12.2/21xe
  smoke (17 cada); unitários/cobertura verdes. Os 9 VSIX foram gerados (glue
  correta em 4 alvos, 5 thin-only sem `.node`); universal **1.863.487 B vs
  1.858.770 B** do 0.18.0 (**+0,25%**). Regra **`BR-CONN-021`**; `BR-CONN-019`
  ganhou o requisito de `libclntsh.so`/`.dylib` com nome padrão. A falha inicial
  de `DPI-1047` era o `.env.dbmatrix` sem quotes no caminho Windows.
- **PRD-125 (parcial)** (2026-11-01): RF1/RF2 (config/scripts), RF4 (CI) e docs
  entregues; o `--thick-full` ficou **experimental** com exclusões explícitas
  (thin-only, UI/comandos, `thickMode`, debugger standalone). Diagnóstico: os
  testes de UI falham pelo workspace temporário (não é produto); `schemaRun`
  cancelamento, `tagsStreaming`, `thickLegacyE2E` e `v012/v013/v014` **passam
  isolados**; o run completo completou uma vez com **79 passing / 8 pending / 4
  failing** (debugger `NJS-500`/`ORA-12547` + cascata no profile), e em outra
  ficou instável/hangou. O banco está saudável (93/200 processes). A
  estabilidade do host longo (pool/debugger) fica para a **0.20.0**
  (PRD-101/102; issue **#288**); o 11g permanece no smoke (4/4).

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`; **nenhuma
   mudança de comportamento observável**.
3. Ao concluir: `status: completed` + `versao: "0.19.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.
5. PR do PRD aponta para `release/v0.19.0` (não para `main`) e usa `Refs #…`;
   o `Closes #…` fica no PR final `release/v0.19.0 → main`.

## Contingência

Se o escopo apertar, as primeiras a descer para a 0.20.0 são o **RF2 da
PRD-111** (agrupamento das opções, que é mecânico e toca 18 arquivos de teste) e
o **full do 11g na PRD-125** (mantendo o smoke documentado). PRD-127/47/95 ficam
juntas porque tocam o mesmo build/docs; a PRD-124 é **NO-GO** se o 11g thick
falhar sem correção viável, e o 0.19.0 segue com o driver 7.0.1.

**PRD-124 — GO/NO-GO:** o spike `spike/oracledb-26` (branch descartável) roda
antes do merge e responde aos cinco eixos (23free full, 11xe thick, 12.2 smoke,
21xe smoke e unitários). O resultado fica registrado nesta versão e na issue
#248; o spike não é mergeado.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.18.0 (planejamento)]] · [[Roadmap - 0.20.0 (planejamento)]]
