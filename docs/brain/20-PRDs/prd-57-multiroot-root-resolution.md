---
tipo: prd
id: PRD-57
aliases: [PRD-57]
status: completed
titulo: "Multi-root: resolução de `root`/`sourcePath` por folder"
versao: "0.16.0"
data: "2026-09-06"
autor: "Gil Cleber Barboza"
versao_titulo: "0.16.0 — Produtividade e resultados"
verificado: 2026-10-14
regras: ["BR-COB-007"]
tags: [prd]
---

# PRD-57 — Multi-root: resolução de `root`/`sourcePath` por folder

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `src/runner.ts`, `src/oracleRunner.ts`, `src/coverage.ts`, `src/config.ts`, 24 notas `docs/brain/60-README/` (Known limitations) |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Corrigir a resolução de `root` (raiz do workspace) e `sourcePath` para
considerar o folder do pacote em execução, em vez de sempre o primeiro folder
(`runner.ts:139`). O PRD-06 já tornou o discovery/cobertura multi-root, mas a
execução ainda usa `folders[0]`. Jest, Python e Go tratam multi-root por
folder.

## 2. Contexto e problema

`executeRun` usa `const root = folders[0].uri.fsPath` para `sourcePath` e
cobertura (`runner.ts:139`). Em workspaces multi-folder, testes de um segundo
folder resolvem a cobertura contra a raiz errada. `applyCoverageFromXml` já
itera `folders` (`results.ts:199–214`), mas o `sourcePath` é global e relativo ao
primeiro folder.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Derivar `root` por suite/package a partir de `meta.folder`.
- Permitir `sourcePath` relativo a cada folder (não só ao primeiro).
- Manter comportamento idêntico para workspace com um único folder.

**Não-objetivos**
- `sourcePath` distinto por folder via settings separadas (follow-up; hoje um
  único `utplsql.sourcePath` global, relativo ao folder de cada pacote).
- Re-fatorar todo o discovery (já multi-root no PRD-06).

## 4. Requisitos

### RF1 — `root` por folder

Quando `request.include` traz itens de um único folder, usar `meta.folder.uri.fsPath`
como `root`. Quando há múltiplos folders, agrupar por folder e resolver
cobertura com o folder correto de cada objeto.

### RF2 — `sourcePath` resolvido contra o folder do item

A resolução de cobertura (`coverage.ts` / `applyCoverageFromXml`) deve resolver
`sourcePath` contra o folder do item (não globalmente contra `folders[0]`).

### RF3 — Sem quebra em single-root

Workspace com um folder → comportamento idêntico ao atual (regressão zero).

### RF4 — Documentação (gate de CI)

- Remover/atualizar a limitação "Considers the **first** workspace folder to
  resolve `sourcePath`" da seção **Known limitations** no `README.md` **e nas 23
  variantes** (notas em `docs/brain/60-README/`; o texto é traduzido);
- atualizar a página de cobertura/troubleshooting da wiki, se citar a limitação;
- validação local na PR: `npm run docs:check` (§7).

**Não-funcionais**
- RNF1 — Não alterar a assinatura pública de `executeRun`/`executeRunOracle`
  além do necessário.
- RNF2 — Cobrir com testes de integração multi-root — **a fixture já existe**:
  `src/test/integration/fixtures/e2e-multiroot.code-workspace` +
  `.vscode-test.multiroot.mjs` (PRD-06).

## 5. Solução proposta

- `runner.ts`: substituir `folders[0]` pela resolução de `root` por folder
  (helper `resolveRoot(items, folders)`).
- `oracleRunner.ts`/`coverage.ts`: receber `root`/`sourcePath` já resolvidos por
  folder (o `executeRunOracle` já aceita `folders`).

## 6. Configuração

Nenhuma setting nova. A limitação correspondente do README (seção *Known
limitations*) é removida nas 24 notas — ver RF4.

## 7. Plano de testes

- **Unitários**: `resolveRoot(items, folders)` (pura, em `matching.ts` ou módulo
  próprio) escolhe o folder correto para itens de um folder e retorna fallback
  para múltiplos; caso de zero folders.
- **Integração**: **a fixture já existe** —
  `src/test/integration/fixtures/e2e-multiroot.code-workspace` com
  `.vscode-test.multiroot.mjs`: workspace com 2 folders + cobertura → gutters
  mapeiam para o folder certo de cada pacote.
- **Manual**: single-root inalterado.
- **CI**: `npm run docs:check` (limitação removida nas 24 notas) + `brain:ci`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão no mapeamento de cobertura single-root | Teste de regressão dedicado + comportamento idêntico quando um único folder. |
| `sourcePath` relativo ambíguo em multi-root | Resolver contra o folder do pacote; documentar. |

## 9. Rollout

- Release 0.16.0 (minor).
- CHANGELOG: "Multi-root: cobertura resolve root/sourcePath por folder".

## 10. Critérios de aceite

- `npm test` passa.
- Cobertura em multi-root mapeia corretamente por folder.
- Single-root inalterado.
- Limitação removida do README nas 24 notas (`npm run docs:check` verde).

## 11. Questões em aberto

- Permitir `sourcePath` por folder via `utplsql.profiles` ou settings por
  folder? — Follow-up (PRD-34 já tem overrides por perfil).
- O helper `resolveRoot` vai para `matching.ts` ou um módulo novo? — Decisão do
  implementador; hoje `matching.ts` já reúne os helpers de matching por folder
  (`filterSuitesByFolder`).

## 12. Impacto no cérebro

Regra criada em 2026-10-14: **`BR-COB-007`** — “a cobertura resolve
`root`/`sourcePath` pelo folder do pacote em execução; single-root permanece
inalterado” — com `prds: ["PRD-57"]`, `implementacao:` (`src/matching.ts`,
`src/runner.ts`, `src/viewCoverage.ts`, `src/results.ts`), `testes:`
(`src/test/unit/matching.test.ts` + `src/test/integration/multiRootE2E.test.ts`) e
`requisitos:` RF1–RF3 + RNF1/RNF2. O `regras:` deste frontmatter é derivado pelo
`brain:sync`.

## 13. Implementado (2026-10-14)

Entregue na branch `feat/prd-57-multiroot-root` (regra BR-COB-007):

- **`resolveRunRoots(metas, folders)`** em `src/matching.ts` (puro): as raízes do
  run saem do `folder` de cada `TestItem` (RF1); sem informação de folder cai em
  todos os folders (e single-root resulta numa raiz só — RF3).
- **`OracleRunOptions.root` removido** (RF1/RNF1): o valor era repassado a
  `applyCoverageFromXml` num parâmetro que já era **ignorado** (`_root`), que
  também saiu. Nenhuma assinatura pública ganhou obrigatoriedade.
- **RF2 já era parcialmente verdadeiro**: `applyCoverageFromXml` iterava os
  folders e resolvia `sourcePath` relativo a cada um — o que estava errado era o
  `root` da **cobertura de views**. Agora `applySqlCoverage` recebe `roots:
  string[]`, descobre as views em cada raiz (união sem repetição) e mantém apenas
  as views sob a pasta analisada.
- **Testes**: 5 casos unitários para `resolveRunRoots` (um folder, dois folders,
  sem meta/folder desconhecido, single-root, sem folders) e um caso no
  `multiRootE2E` (as 2 pastas entram na resolução). Os testes que montavam
  `OracleRunOptions`/`SqlCoverageOptions` foram ajustados (`root` → `roots`, ou
  remoção da opção onde ela deixou de existir).
- **Follow-up registrado** (§11): `discoverDbSuites`/`discoverSchemaFromDb`
  (descoberta **no banco**, modo schema) ainda atribuem as suites ao primeiro
  folder — é escopo da PRD-06 e não-objetivo declarado aqui.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-COB-007 - Cobertura resolve root e sourcePath pelo folder do pacote em execucao|BR-COB-007]]
- 🔗 PRDs relacionados: [[prd-06-multiroot|PRD-06]] · [[prd-34-multi-connection-profiles|PRD-34]]
- 🔗 Mesma versão (0.16.0): [[prd-58-run-related-tests|PRD-58]]
- 🎯 RF1 — `root` por folder → [[BR-COB-007 - Cobertura resolve root e sourcePath pelo folder do pacote em execucao|BR-COB-007]]
- 🎯 RF2 — `sourcePath` resolvido contra o folder do item → [[BR-COB-007 - Cobertura resolve root e sourcePath pelo folder do pacote em execucao|BR-COB-007]]
- 🎯 RF3 — Sem quebra em single-root → [[BR-COB-007 - Cobertura resolve root e sourcePath pelo folder do pacote em execucao|BR-COB-007]]
- 🎯 RNF1 — Não alterar a assinatura pública de `executeRun`/`executeRunOracle` → [[BR-COB-007 - Cobertura resolve root e sourcePath pelo folder do pacote em execucao|BR-COB-007]]
- 🎯 RNF2 — Cobrir com testes de integração multi-root — **a fixture já existe**: → [[BR-COB-007 - Cobertura resolve root e sourcePath pelo folder do pacote em execucao|BR-COB-007]]
- 🚀 ⬅️ release anterior: [[prd-96-public-landing-page-github-pages|PRD-96 (0.15.0)]] · ➡️ próxima release: [[prd-105-snippets|PRD-105 (0.17.0)]]
<!-- brain:auto:end -->
