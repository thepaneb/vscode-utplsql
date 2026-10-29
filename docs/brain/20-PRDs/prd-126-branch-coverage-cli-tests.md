---
tipo: prd
id: PRD-126
aliases: [PRD-126]
status: proposed
titulo: "Cobertura de branches nos módulos críticos e CLIs de release"
versao: "0.23.0"
data: "2026-10-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.23.0 — Runtime, docs e qualidade residual"
verificado: "2026-10-29"
regras: []
docs: ["CHANGELOG", "wiki/Contributing.md"]
tags: [prd]
---

# PRD-126 — Cobertura de branches nos módulos críticos e CLIs de release

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-29 |
| Componente | Testes unitários + tochas de cobertura dos scripts de release |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `src/test/unit/*.test.ts`, `scripts/create-release.cjs`, `scripts/create-pr.cjs`, `.c8rc`, `docs/brain/15-Regras/BR-QUAL-001*.md`, `docs/brain/70-Wiki/Contributing.md`, `CHANGELOG.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-04 (testes), PRD-113 (lint/escopo), PRD-114 (stub), PRD-116/117 (testes diretos/property), BR-QUAL-001 |

## 1. Resumo

A cobertura global está em **97,96% linhas / 93,77% branches / 97,77%
funções**, com o threshold de branches em 93% — margem de **0,77 p.p.** Os
menores arquivos são caminhos de erro de `commands/debug`, `commands/run`,
`debugger` e `oracleRunner`, e os **CLIs de release** (`create-release` 30,5% de
linhas, `create-pr` 38,2%) não são testáveis sem refatorar o `main()`. Esta PRD
fecha esses branches, torna os CLIs injetáveis e **eleva o threshold** de
branches, travando o ganho.

## 2. Contexto e problema

### 2.1 Branch coverage é o gargalo

O threshold global (`.c8rc`) é 93% de branches; o estado atual é 93,77%. Um
único PR com caminhos novos pode derrubar o CI. Os arquivos com mais branches
descobertos (antes desta PRD):

| Arquivo | Branches | Linhas |
|---|---:|---:|
| `src/commands/debug.ts` | 89,3% | 95,1% |
| `src/compileForDebug.ts` | 89,4% | 100% |
| `src/commands/run.ts` | 89,8% | 99,3% |
| `src/debugger.ts` | 89,9% | 99,2% |
| `src/oracleRunner.ts` | 89,4% | 98,9% |
| `src/languageIdentity.ts` | 76,1% → **90,8%** | 97,4% |
| `src/commands/scaffold.ts` | 78,0% → **100%** | 100% |

Os dois últimos já receberam testes na preparação desta PRD (junto com
`oracleRunner` HTML e `debugCommands`); o restante continua abaixo de 90%.

### 2.2 Os CLIs de release não são testáveis

`create-release.cjs` e `create-pr.cjs` exportam só helpers (`parseArgs`,
`escapeRegExp`, `validateRef`). O `main()` concentra o `fetch`/`execFileSync` e
os caminhos de erro (token ausente, 404/422, `--dry-run`, remote inválido), por
isso a cobertura de linhas é 30,5%/38,2%. Sem um núcleo injetável, o teste vira
`spawn` de rede.

### 2.3 Ferramentas de docs

`docs-features-check.cjs` (79,8% branches), `docs-fidelity.cjs` (87,9%) e
`brain.cjs` (93,4%) têm caminhos de erro que o CI depende — e são justamente os
que menos têm teste.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Elevar os módulos críticos para **≥ 92% de branches** (e manter 100% de
  linhas onde já estão).
- Refatorar `create-release.cjs`/`create-pr.cjs` para um `main()` injetável e
  cobrir **≥ 80% de linhas / 75% de branches**.
- Elevar `docs-features-check`/`docs-fidelity` para **≥ 90% de branches** e
  `brain.cjs` para **≥ 95%**.
- Subir o threshold de branches do `.c8rc` para **94%** ao final (ratchet).

**Não-objetivos**
- Meta de 100% global (custo desproporcional).
- Testes de mutação (avaliar em outra PRD).
- Refatorar a lógica de release além do necessário para injetar `fetch`/`git`.
- Testar `vscode` real (o stub continua sendo a fronteira).

## 4. Requisitos

### RF1 — Fechar branches dos módulos críticos

Adicionar casos para os caminhos de erro/edge de:

- `commands/debug.ts`: `debugAtCursor` sem editor/anotação e falha ao iniciar;
  `debugFailed` com item sem meta; `debugLast` com falha; picker com item sem
  meta.
- `commands/run.ts`: os `catch` de cancelamento e os ramos de `request.include`
  vazio/`controller.items` vazio.
- `debugger.ts`: falha de `compileForDebug` no `initSession`, falha ao instalar
  breakpoint pendente e falha do `runTest` em background.
- `oracleRunner.ts`: preparação/gravação do HTML (já coberto na preparação),
  reporter HTML ausente e ramos de `findInvalidUt3Objects`/`extractScalar`.
- `compileForDebug.ts`: `debuggableFromFile` sem extensão/nome e os ramos de
  import/conexão do `compileForDebug`.

Meta: **≥ 92% de branches** em cada um; sem `any` novo.

### RF2 — CLIs de release injetáveis

Extrair de `create-release.cjs`/`create-pr.cjs` um núcleo
`run({ argv, env, fetch, execFileSync })` (ou equivalente), mantendo o CLI
atual. Testar:

- token ausente → mensagem e exit code;
- resposta 404/422 da API → erro claro, sem stack;
- `--dry-run` não chama a API;
- parsing de remote (`git@github.com:owner/repo.git` e HTTPS);
- branch atual vazia/`HEAD` e `validateRef`.

Meta: **≥ 80% linhas / 75% branches** nos dois.

### RF3 — Ferramentas de docs

Cobrir os ramos de erro de `docs-features-check` (registro vazio, JSON
inválido, LinkedIn ausente), `docs-fidelity` (enum/versão/ID fantasma) e
`brain.cjs` (JSON inválido, nota ausente, marcador desconhecido), sem quebrar a
geração.

Meta: **≥ 90% branches** nos dois primeiros e **≥ 95%** no `brain.cjs`.

### RF4 — Ratchet dos thresholds

Depois do ganho, subir `.c8rc`:

- branches **93 → 94**;
- linhas/statements **97 → 98** (se o estado permitir com margem);
- funções **97 → 98**.

Atualizar `BR-QUAL-001` com os novos valores.

**Não-funcionais**
- RNF1 — Nenhuma mudança de comportamento de runtime; os CLIs mantêm os mesmos
  argumentos/saídas.
- RNF2 — Suíte unitária continua abaixo de ~2 min no Node 24.
- RNF3 — Nenhuma dependência nova (gerador/injeção caseiros).
- RNF4 — Cobertura medida no c8 com source maps, sem `/* c8 ignore */` novo.

## 5. Solução proposta

1. Adicionar os casos de branch nos specs existentes (ou novos specs quando o
   `mock.module` exigir isolamento).
2. Refatorar os dois CLIs em “núcleo puro + adaptador de processo”, com testes
   de contrato; o `if (require.main === module)` continua chamando o adaptador.
3. Cobrir as ferramentas de docs com fixtures de JSON/arquivo inválido.
4. Subir os thresholds e rodar `brain:ci`/`docs:check`/`test:coverage`.

## 6. Configuração

Nenhuma setting/comando novo. Apenas `.c8rc` e testes.

## 7. Plano de testes

- **Unitários**: os novos casos; `test:coverage` com os thresholds elevados.
- **Contrato dos CLIs**: `main()` injetado com `fetch`/`git` falsos; casos de
  sucesso/erro/dry-run.
- **Regressão**: `npm run test:unit`, `lint`, `typecheck`, `brain:ci`,
  `docs:check`, `version:check`.
- **Manual**: rodar `npm run release:create -- --dry-run` e
  `npm run pr:create -- --dry-run` (sem rede) após a refatoração.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Refatoração dos CLIs mudar o comportamento | Testes de contrato + dry-run manual; o adaptador mantém `argv`/env |
| Casos de branch virarem testes frágeis de implementação | Testar pela API pública e por mensagens/exit code |
| Threshold 94% derrubar PRs legítimos | Subir só após o ganho; manter margem ≥ 0,5 p.p. |
| `mock.module` conflitar entre specs | Specs isolados para módulos mockados (padrão atual) |
| Tempo da suíte | Casos pequenos, sem I/O real; sem novas dependências |

## 9. Rollout

- **Release alvo:** 0.23.0.
- `CHANGELOG` com o ratchet e os CLIs testáveis.
- Se o threshold 94% não for estável, manter 93% e registrar o motivo na PRD
  (sem regredir os testes adicionados).

## 10. Critérios de aceite

- Módulos críticos ≥ 92% de branches; `languageIdentity`/`scaffold` mantidos.
- `create-release`/`create-pr` ≥ 80% linhas / 75% branches, com CLI preservado.
- `docs-features-check`/`docs-fidelity` ≥ 90% branches; `brain.cjs` ≥ 95%.
- `.c8rc` com branches 94 (ou justificativa para manter 93) e `BR-QUAL-001`
  atualizada.
- `test:unit`, `test:coverage`, `lint`, `typecheck`, `brain:ci` e `docs:check`
  verdes.

## 11. Questões em aberto

- O ratchet de linhas para 98% é seguro ou melhor manter 97% e focar em
  branches?
- Vale extrair um helper de teste para os CLIs (fake de `fetch`/`execFileSync`)
  compartilhado entre os dois?
- `oracleRunner` tem branches de integração que só aparecem com banco real;
  vale um teste de integração dedicado em vez de unitário?

## 12. Impacto no cérebro

Atualizar **`BR-QUAL-001`** (thresholds do c8) com os novos valores. RNFs sem
regra: RNF1 (comportamento dos CLIs), RNF2 (tempo), RNF3 (sem dep nova) e RNF4
(cobertura sem ignore) — verificadas pelo CI e pelos testes de contrato.

## Impacto nas docs

`wiki/Contributing.md` documenta o ratchet e os CLIs testáveis; `CHANGELOG`
registra na 0.23.0. Na conclusão, cada superfície cita `PRD-126` ou
`<!-- prd:PRD-126 -->`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-04-expand-tests|PRD-04]] · [[prd-113-lint-scope|PRD-113]] · [[prd-114-vscode-stub-modernization|PRD-114]] · [[prd-116-direct-module-tests|PRD-116]]
- 🔗 Mesma versão (0.23.0): [[prd-95-esm-es2023-node22|PRD-95]] · [[prd-97-doc-no-site|PRD-97]] · [[prd-99-brain-reuse|PRD-99]] · [[prd-112-error-handling-audit|PRD-112]] · [[prd-116-direct-module-tests|PRD-116]] · [[prd-117-split-script-property-tests|PRD-117]] · [[prd-121-auditable-package-sourcemap|PRD-121]] · [[prd-122-marketplace-trust-metadata|PRD-122]]
- 🚀 ⬅️ release anterior: [[prd-93-continuous-localization-pipeline|PRD-93 (0.22.0)]]
<!-- brain:auto:end -->
