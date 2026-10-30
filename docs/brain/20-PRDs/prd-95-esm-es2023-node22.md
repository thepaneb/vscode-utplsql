---
tipo: prd
id: PRD-95
aliases: [PRD-95]
status: proposed
titulo: "Modernização do runtime: ESM (.mjs), ES2024 e stdlib Node 24"
versao: "0.19.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.19.0 — Piso Node 24 e runtime moderno"
verificado: "2026-10-30"
regras: []
docs: ["CHANGELOG", "wiki/Architecture.md"]
tags: [prd]
---

# PRD-95 — Modernização do runtime: ESM (.mjs), ES2024 e stdlib Node 24

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` (build e runtime) |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `package.json`, `esbuild.config.mjs`, `tsconfig.json`, `.vscode/launch.json`, `src/**` (pontual), `.vscode-test.mjs`, `scripts/*` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-127 (piso Node 24), PRD-94 (piso anterior), PRD-115 (split de i18n), PAT-001, ADR-004 |

## 1. Resumo

Com o piso em **VS Code 1.125 / Node 24.15.0** (PRD-127), adotar três
modernizações: **bundle de produção em ESM** via `.mjs` (o VS Code aceita
`"type": "module"` **ou** o sufixo `.mjs`), **`tsconfig` ES2024** e uso direto da
**stdlib do Node 24** (`Promise.withResolvers`, `Object.groupBy`, `.at`,
`.toSorted`, `timers/promises`). O harness de testes continua CJS — só o bundle
publicado vira ESM.

## 2. Contexto e problema

- Hoje: `main: ./dist/extension.js` com esbuild **`format: 'cjs'`** (bundle
  **921 KB** na 0.18.0) e `tsconfig` **`target/lib ES2021`**.
- O código contorna limitações de lib: `[len - 1]` (3×) e
  `new Promise((resolve…))` (4×); não usa `__dirname`/`require`/`module.exports`
  na produção.
- O VS Code 1.100 anunciou **"ESM support for extensions"** no Node extension
  host. A documentação/implementação aceita `"type": "module"` **ou** um `main`
  com sufixo `.mjs` — o que permite ESM só no bundle, sem converter os 109
  `require()` nem o stub de `vscode` dos testes.
- Node 24 (V8 13.6) suporta **ES2024**: `Promise.withResolvers`,
  `Object.groupBy`/`Map.groupBy`, `Array.prototype.toSorted`, `.at`, entre outros.
- O piso 1.125 remove o bloqueio de runtime que existia na 1.101/Node 22.

## 3. Objetivos / Não-objetivos

**Objetivos**
- **ESM**: bundle de produção `dist/extension.mjs` com esbuild `format: 'esm'`,
  tree-shaking e `main` apontando para `.mjs`; testes seguem CJS.
- **ES2024**: `tsconfig` `target/lib` para ES2024 e remoção dos contornos com
  ganho claro.
- **Stdlib Node 24** pontual: `Promise.withResolvers()`, `timers/promises`,
  `Map.groupBy`/`Object.groupBy`, `.at()`/`.toSorted()`.
- Bundle **≤ 921 KB** e suíte verde (unit + integração).

**Não-objetivos**
- Não muda o web extension host (não usado).
- Não adota `vscode.lm`/Chat nem MCP.
- Não troca `c8` por cobertura nativa (avaliar em PRD/spike separado).
- Não adota `"type": "module"` no `package.json` nem reescreve os testes CJS.
- Não muda o piso (PRD-127) nem o comportamento observável.

## 4. Requisitos

### RF1 — Extensão em ESM via `.mjs`

- `package.json`: `main: "./dist/extension.mjs"`.
- esbuild: `format: 'esm'`, `outfile: 'dist/extension.mjs'`,
  `platform: 'node'`, `target: 'node24'`, externos `vscode` e `oracledb`.
- `oracledb` (CJS) segue via `await import('oracledb')`; `vscode` como externo.
- **Não** adicionar `"type": "module"`: o `tsc` continua emitindo CJS em `out/`
  para os testes e o `@vscode/test-cli`/Mocha seguem CJS.
- `.vscode/launch.json`: incluir `dist/**/*.mjs` em `outFiles`.

### RF2 — TypeScript ES2024

- `target: "ES2024"`, `lib: ["ES2024"]`; manter `module: "node16"` (saída CJS
  para testes) e `moduleResolution: "node16"`.
- Usar `.at(-1)`, `.toSorted()`, `Object.groupBy`/`Map.groupBy` e
  `Promise.withResolvers()` onde reduzir código; remover os contornos listados.
- Não introduzir APIs ES2025 (ex.: métodos de `Set`) sem necessidade.

### RF3 — Stdlib Node 24

- Trocar as 4 construções manuais de `Promise` por `Promise.withResolvers()`
  (`debugger.ts` 3× e `oracleRunner.ts` 1×).
- Usar `timers/promises` no polling de 200 ms do `oracleRunner` e no timeout do
  debugger, preservando cancelamento/`unref` quando aplicável.
- Substituir `[len - 1]` por `.at(-1)` em `results.ts`, `scriptRunner.ts` e
  `virtualSource.ts`.
- `Map.groupBy`/`Object.groupBy` apenas nos agrupamentos em que o código ficar
  mais simples (ex.: `compilationDiagnostics`, `quickfix`, `testTree`,
  `discovery`, `dbSourceProvider`).

**Não-funcionais**
- RNF1 — Bundle não maior que o atual (**921 KB**; medir `dist/extension.mjs`).
- RNF2 — `@vscode/test-cli`, Mocha, `tsc` e `vsce` funcionando; testes intactos.
- RNF3 — Sem regressão de comportamento e sem API de VS Code/Node acima do piso.
- RNF4 — `npm run package` gera VSIX com `.mjs` e ativa no floor 1.125.

## 5. Solução proposta

- esbuild:
  ```js
  {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.mjs',
    platform: 'node',
    format: 'esm',
    target: 'node24',
    external: ['vscode', 'oracledb'],
    sourcemap: true,
  }
  ```
- `package.json`: `main: './dist/extension.mjs'`; manter scripts `.cjs`.
- `tsconfig`: `target/lib ES2024`; `module`/`moduleResolution` `node16` para o
  build CJS de testes.
- Substituições mecânicas pontuais (`.at(-1)`, `withResolvers`,
  `timers/promises`, `toSorted`).
- Medir o bundle antes/depois; se o ESM não reduzir, manter e registrar.

Decisão de design: **não** usar `"type": "module"`. O sufixo `.mjs` é suportado
pelo host e evita o efeito colateral de reinterpretar todos os `.js` de `out/`
como ESM, o que quebraria o stub de `vscode` e os 109 `require()` dos testes.

## 6. Configuração

Nenhuma setting de usuário nova.

## 7. Plano de testes

- **Unitários**: suíte atual verde após o bump de lib; testes novos só para
  eventuais refactors.
- **Integração**: `.vscode-test.mjs` (host Node) — `smoke` e E2E principais,
  incluindo ativação do bundle `.mjs`.
- **Bundle**: comparar tamanho de `dist/extension.mjs` vs 921 KB; garantir
  carregamento no Extension Development Host (F5) e no VSIX.
- **Packaging**: `npm run package` + instalar o `.vsix` no 1.125 e no stable.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Host não carregar `.mjs` no 1.125 | Validar F5 + VSIX cedo; fallback `"type": "module"` com testes CJS em `out/` isolado |
| Interop `oracledb` (CJS) em bundle ESM | Mantido `await import('oracledb')`; teste de conexão real |
| `@vscode/test-cli`/Mocha | Testes continuam CJS; só o bundle é ESM |
| `vsce` com `.mjs` | `npm run package` + instalação do VSIX |
| Bundle maior | Medição antes/depois; ESM/tree-shaking deve reduzir ou empatar |
| Refactor amplo por “modernizar” | Limitar a substituições com ganho claro (RNF3) |

## 9. Rollout

- Release alvo: **0.19.0**.
- Sem impacto de compatibilidade além do piso (1.125); bullet no `CHANGELOG`.
- PRD-115 pode se beneficiar depois (`splitting`/lazy de locale), mas não é
  pré-requisito.

## 10. Critérios de aceite

- Extensão ativa a partir de `dist/extension.mjs` no host Node (F5) e no VSIX.
- `dist/extension.mjs` **≤ 921 KB**.
- `tsc`, `lint`, `test:unit`, `test:coverage` e `test:integration:smoke` verdes.
- `oracledb` carrega por `import()` em thin e thick.
- `docs:check`/`docs-fidelity` verdes; `CHANGELOG` atualizado.

## 11. Questões em aberto

- Ativar `splitting` + lazy-load do catálogo i18n com a PRD-115? (medir antes)
- Adotar cobertura nativa do Node 24 e remover `c8`? (spike separado)
- `moduleResolution: nodenext` vs `node16` após o ESM? (só se o build de testes
  mudar)

## 12. Impacto no cérebro

Criar **`BR-PLAT-002`** — “bundle de produção é ESM (`.mjs`); testes/`out`
continuam CJS” — com `prds: ["PRD-95"]`, `implementacao:` e `testes:`; atualizar
**`BR-PLAT-001`** se o `esbuild target` mudar de novo e a nota
`TPL-VSCODE-API`/`Architecture` com a topologia do bundle. RNFs sem regra:
RNF1 (bundle), RNF2 (harness), RNF3 (comportamento) e RNF4 (VSIX) — verificados
por testes/packaging.

## Impacto nas docs

`CHANGELOG` (0.19.0) e `wiki/Architecture.md` (bundle `.mjs`, testes CJS);
`docs/functional`/README não mudam (sem feature de usuário). Na conclusão, cada
superfície cita `PRD-95` ou `<!-- prd:PRD-95 -->`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-94-vscode-floor-1-101|PRD-94]] · [[prd-115-split-i18n-locales|PRD-115]] · [[prd-127-vscode-floor-1-125|PRD-127]]
- 🔗 Mesma versão (0.19.0): [[prd-47-node-26-toolchain|PRD-47]] · [[prd-111-decompose-oracle-runner|PRD-111]] · [[prd-115-split-i18n-locales|PRD-115]] · [[prd-124-oracledb-26-upgrade|PRD-124]] · [[prd-125-thick-full-matrix-ci|PRD-125]] · [[prd-127-vscode-floor-1-125|PRD-127]]
- 🚀 ⬅️ release anterior: [[prd-123-oracle-11g-support|PRD-123 (0.18.0)]] · ➡️ próxima release: [[prd-101-connection-pool-lifecycle|PRD-101 (0.20.0)]]
<!-- brain:auto:end -->
