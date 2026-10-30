---
tipo: nota
status: concluida
modulo: prds
data: 2026-10-10
verificado: 2026-10-30
concluida: 2026-10-29
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.18.0 (planejamento)

Plano da **0.18.0 — “Fundação: segurança, testes e anti-drift”**. O status e a
versão alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-110 | Hardening defensivo: identificador SQL, redaction de logs e scripts | 0,5–1 dia | Baixa |
| 2 | PRD-104 | Cadeia de suprimentos do CI: Dependabot, pin de actions e auditoria | 0,5–1 dia | Baixa |
| 3 | PRD-113 | Ampliar o escopo do lint (Biome) para além de `src/` | 0,5–1 dia | Baixa |
| 4 | PRD-114 | Modernizar o stub de `vscode` e reduzir `any` nos testes | 2–3 dias | Média |
| 5 | PRD-98 | Anti-drift de documentação: tabelas geradas e vínculo PRD→docs | 3–5 dias | Média-Alta |
| 6 | PRD-123 | Suporte oficial ao Oracle 11g (11.2) em thick mode | 2–3 dias | Média-Alta |
| 7 | PRD-118 | Assinatura de commits e verificação de origem no `main` | 0,5 dia | Baixa |
| 8 | PRD-119 | Postura de segurança verificável: OSSF Scorecard e proteção de `main` | 0,5–1 dia | Baixa |

**PRDs:** [[prd-110-defensive-hardening|PRD-110]] ·
[[prd-104-ci-supply-chain|PRD-104]] · [[prd-113-lint-scope|PRD-113]] ·
[[prd-114-vscode-stub-modernization|PRD-114]] · [[prd-98-docs-anti-drift|PRD-98]] ·
[[prd-123-oracle-11g-support|PRD-123]] ·
[[prd-118-commit-signing|PRD-118]] · [[prd-119-security-posture-scorecard|PRD-119]]

**Tema:** **enablers** que destravam e protegem as features seguintes — segurança,
lint mais amplo, testes (stub tipado) e anti-drift de documentação. A PRD-98 evita
repetir o que aconteceu na 0.15.0 (features entregues sem atualizar README/wiki).

**Reorganização (2026-10-10):** nova versão de fundação. Recebe os itens que antes
estavam espalhados em 0.16.0 (PRD-98), 0.20.0 (PRD-104/110) e 0.23.0 (PRD-113/114),
posicionados **antes** das features que tocam os mesmos arquivos.

**Complemento (2026-10-13):** a **PRD-119** fecha o sinal externo de postura de
segurança (OSSF Scorecard + proteção do `main`), penalizado na auditoria do VSCan
do VSIX 0.15.0. É complementar à PRD-104 (*pin*/audit/CodeQL) e à PRD-118
(assinatura de commits) — mesma família de enablers de segurança.

**Complemento (2026-10-29):** a **PRD-123** entra no escopo para validar o
**Oracle 11g (11.2) em thick mode** na matriz — é a única PRD que exercita o
degrau legado do banco e fecha a auditoria de compatibilidade (`NFR-001`).

**Total estimado:** ≈ 10–15,5 dias.

## Branch de integração

A versão é integrada em **`release/v0.18.0`** (a partir da `main` em 0.17.1).
Cada PRD usa um branch próprio (`feat/prd-NNN-…`) com PR para a branch de
integração; o merge para a `main` é **um PR único** no fim. A versão é
pré-bumpada para 0.18.0 no início (package/lock/site/CHANGELOG) para manter o
`version:check` verde em todos os PRs. O CI roda também em `push` para
`release/**` (drift e testes após cada merge).

## Baseline (2026-10-29)

- Unitários/cobertura: **99,48% linhas / 93,88% branches / 99,21% funções**
  (thresholds 97/93/97).
- Matriz local: **smoke 17 passing** em **12.2, 18xe, 19ee, 21xe e 23free**
  (`--skip-bootstrap`); o 12.2 precisou de bootstrap novo (volume com senha
  antiga) — o `assert_bootstrapped` foi corrigido para não falhar em silêncio.
- **RF0 do 11g: GO** (IC 23.0 + node-oracledb 7.0.1 em thick no 11.2.0.2 XE;
  ver [[prd-123-oracle-11g-support|PRD-123]]).

## Progresso

- **PRD-110** (2026-10-29): implementada e validada. Unitários **1394 testes /
  0 falhas** (2 skips); cobertura **97,93% linhas / 93,76% branches / 97,70%
  funções** (o `scripts/**` passou a ser instrumentado pelo c8); integração
  completa no 23free **119 passing / 10 pending** + multiroot **6 passing**.
  Regras `BR-CONN-020`, `BR-EXEC-017` e `SEC-014`; triagem do CodeQL registrada na
  PRD.
- **PRD-104** (2026-10-29, PR #229): Dependabot + actions pinadas por SHA +
  `permissions` + `npm audit` gate; regra `BR-PLAT-002`; CI 22/24/26 e integração
  23free verdes.
- **PRD-113** (2026-10-29, PR #230): `biome check .` cobre manifestos, configs e
  `scripts/**`; `BR-QUAL-002` atualizada; **zero diagnósticos** no escopo;
  `npm run package` OK; suíte final **1406 testes / 0 falhas** (2 skips).
- **PRD-114** (2026-10-29, PR #231): stub de `vscode` tipado contra
  `@types/vscode`, `TestItemCollection` real, fixtures tipadas e inventário de
  APIs; **`as any` 356 → 116** (meta ≤178); `BR-TEST-003`; **1408 testes / 0
  falhas** (2 skips); typecheck 0; integração 23free verde.

## Status — concluída (0.18.0)

Release **0.18.0 “Fundação: segurança, testes e anti-drift”** publicada (tag
`v0.18.0`, 2026-10-29). Os **8 PRDs** do escopo (98, 104, 110, 113, 114, 118,
119 e 123) estão `completed` com `versao: "0.18.0"`; `package.json` = `0.18.0` e
`CHANGELOG.md` com a seção `## 0.18.0`.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.18.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
   Na branch de integração, a conclusão das PRDs é consolidada no PR de release.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.
5. PR do PRD aponta para `release/v0.18.0` (não para `main`) e usa `Refs #…`;
   o `Closes #…` fica no PR final `release/v0.18.0 → main`.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.17.0 (execução)]] · [[Roadmap - 0.19.0 (planejamento)]]
