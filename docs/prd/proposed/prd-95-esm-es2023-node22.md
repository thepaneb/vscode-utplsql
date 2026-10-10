<!-- GENERATED FROM docs/brain/20-PRDs/prd-95-esm-es2023-node22.md — DO NOT EDIT -->

# PRD-95 — Modernização do runtime: ESM, ES2023 e stdlib Node 22

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `package.json`, `esbuild.config.mjs`, `tsconfig.json`, `src/**` (pontual), `.vscode-test.mjs`, `scripts/*` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

Com o piso em **VS Code 1.101 / Node 22** (PRD-94), ficam disponíveis três
modernizações antes inviáveis: **extensões em ESM** (VS Code **1.100+**, extension
host Node), **`tsconfig` ES2023** e uso direto da **stdlib do Node 22**. Esta PRD
planeja a adoção com critérios de aceite e rollback.

## 2. Contexto e problema

- Hoje: `main: ./dist/extension.js` com esbuild **`format: 'cjs'`** (bundle
  ~803 KB) e `tsconfig` **`target/lib ES2021`**.
- O código contorna limitações de lib: `[len - 1]`/`slice(-1)` (3×),
  `new Promise((resolve…))` (4×).
- A produção **não usa** `__dirname`/`require`/`module.exports` (verificado), o
  que torna a migração para ESM de baixo atrito.
- O VS Code 1.100 anunciou **"ESM support for extensions"** (`"type": "module"`),
  válido para o **Node extension host** — exatamente o nosso caso (não usamos o
  web worker host). O 1.101 já tem adoção real.

## 3. Objetivos / Não-objetivos

**Objetivos**
- **ESM**: `"type": "module"` + esbuild `format: 'esm'`, com tree-shaking e sem
  interop CJS desnecessário.
- **ES2023**: `tsconfig` `target/lib` para ES2023 (habilita `.at()`, `.findLast`,
  `Object.hasOwn`, `.toSorted/.toReversed/.with`).
- **Stdlib Node 22** pontual: `Promise.withResolvers()`, `Map.groupBy`/
  `Object.groupBy` onde há agrupamento manual.
- Bundle **≤ atual** e suíte verde (unit + integração).

**Não-objetivos**
- Não muda o web extension host (não usado).
- Não adota `vscode.lm`/Chat nem MCP.
- Não troca `c8` por cobertura nativa (avaliar separadamente).

## 4. Requisitos

### RF1 — Extensão em ESM

`package.json` com `"type": "module"`; esbuild `format: 'esm'`; entrada
`dist/extension.js` carregada como ESM pelo host. `oracledb` (CJS) segue via
`await import('oracledb')`; `vscode` como externo.

### RF2 — TypeScript ES2023

`target`/`lib` em `ES2023`; remover os contornos listados quando houver ganho
claro (sem refatoração gratuita).

### RF3 — Stdlib Node 22

Adotar `Promise.withResolvers()` nas 4 construções manuais e, se simplificar,
`Map.groupBy`/`Object.groupBy` nos agrupamentos de cobertura/decorações.

**Não-funcionais**
- RNF1 — Bundle não maior que o atual (medir `dist/extension.js`).
- RNF2 — `@vscode/test-cli` e `vsce` funcionando com ESM.
- RNF3 — Sem regressão de comportamento (nenhuma API de VS Code/Node acima do piso).

## 5. Solução proposta

- esbuild: `format: 'esm'`, `platform: 'node'`, `target: 'node22'`.
- `package.json`: `"type": "module"` (scripts `.cjs` já são explícitos).
- `tsconfig`: `target`/`lib` ES2023; ajustar `module`/`moduleResolution` se
  necessário (esbuild é quem empacota).
- Substituições mecânicas pontuais (`.at(-1)`, `withResolvers`).

## 6. Configuração

Nenhuma setting de usuário nova.

## 7. Plano de testes

- **Unitários**: suíte atual verde após o bump de lib; testes novos só para
  eventuais refactors.
- **Integração**: `.vscode-test.mjs` (host Node) — `smoke` e E2E principais.
- **Bundle**: comparar tamanho de `dist/extension.js` antes/depois; garantir
  carregamento no Extension Development Host (`F5`).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Interop `oracledb` (CJS) em bundle ESM | Mantido `await import('oracledb')`; teste de conexão real |
| `@vscode/test-cli`/mocha com ESM | Validar cedo; alternativa: manter bundle ESM com harness CJS |
| Empacotamento (`vsce`) com `"type": "module"` | `npm run package` + instalar o `.vsix` de teste |
| Refactor amplo por “modernizar” | Limitar a substituições com ganho claro (RNF3) |

## 9. Rollout

- Release alvo: **0.23.0**.
- Sem impacto de compatibilidade (o piso já é 1.101); bullet no `CHANGELOG`.

## 10. Critérios de aceite

- Extensão ativa em ESM no host Node (F5) e no VSIX empacotado.
- Bundle **≤** 803 KB.
- `tsc`, `lint`, `test:unit` e `test:integration:smoke` verdes.
- `docs:check`/`docs-fidelity` verdes.

## 11. Questões em aberto

- Adotar cobertura nativa do Node 22 (`--experimental-test-coverage`) e remover
  `c8`? (avaliar em PRD próprio.)
- `moduleResolution: nodenext` vs `node16` após ESM?

## 12. Impacto no cérebro

Criar/atualizar regras na implementação (ex.: `BR-PLAT-002` — "extensão é ESM no
host Node") com `prds: ["PRD-95"]`; atualizar `PAT-001`/`Architecture` se a
topologia mudar.
