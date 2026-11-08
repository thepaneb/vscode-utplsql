---
tipo: prd
id: PRD-149
aliases: [PRD-149]
status: proposed
titulo: "Performance mensurável e qualidade de engenharia"
versao: "0.23.0"
data: "2026-11-07"
autor: "Gil Cleber Barboza"
verificado: "2026-11-07"
regras: []
docs: ["CHANGELOG", "wiki/Architecture.md"]
tags: [prd]
---

# PRD-149 — Performance mensurável e qualidade de engenharia

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-11-07 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `src/test/perf/**`, `src/oraclePoll.ts`, `src/coverage.ts`, `src/results.ts`, `src/viewCoverage.ts`, `src/oracleRunner.ts`, `tsconfig.json`, `.github/workflows/ci.yml`, `scripts/**` |
| Esforço estimado | 3–5 dias |
| Complexidade | Média-Alta |

## 1. Resumo

Transformar os achados de performance da auditoria da 0.20.0 em trabalho
**medido**: harness que exercita `executeRunOracle` e cobertura real, thresholds
no CI, e só então as otimizações de poll, I/O de cobertura e `matchExecutedViews`.
Inclui a dívida de engenharia que hoje esconde regressões: CI Windows, `tsconfig`
mais estrito, fatiamento do restante de `oracleRunner.ts` e orçamento de bundle.

## 2. Contexto e problema

A auditoria apontou custos estruturais corretos (poll fixo de 200 ms, discovery
N+1, `readConfig()` em loop, FS síncrono na cobertura, `matchExecutedViews`
O(V×S), 24 locales eager), mas o harness atual **não mede os caminhos reais**:
o poll é mockado como 0, o XML é sintético curto e não há gate de regressão.
Otimizar antes disso é arriscado. Além disso:

- O CI de unit tests roda só em Ubuntu; os fixes de path/Windows precisam de
  cobertura real.
- `tsconfig` não tem `noUncheckedIndexedAccess`/`noUnusedLocals`.
- `oracleRunner.ts` ainda concentra pool + schema + reporters + poll + finalize.
- Scripts de release/docs duplicam leitura de `package.json`/`git` (ver PRD-126
  para a cobertura de branches; aqui fica o `scripts/lib/`).

## 3. Objetivos / Não-objetivos

**Objetivos**

- Medir os caminhos reais de run/cobertura/poll com thresholds no CI.
- Reduzir consultas de poll sem perder latência do primeiro output.
- Reduzir I/O síncrono da cobertura e recompilação de regex de views.
- Adicionar Windows ao CI de unit tests.
- Endurecer o `tsconfig` de forma incremental e mensurável.
- Reduzir a concentração de `oracleRunner.ts` e a duplicação em `scripts/`.
- Medir o bundle antes de qualquer lazy-load.

**Não-objetivos**

- Lazy-load de locales por si só (PRD-115 fatiar `i18nLocales.ts`; lazy-load só
  se a medição justificar).
- Refatoração Strategy da PRD-129 ou fatiamento do estado da PRD-139.
- Otimização de discovery N+1 (PRD-131) e `readConfig()` (PRD-130), que têm
  PRDs próprias.
- Mudanças de comportamento visível ao usuário.

## 4. Requisitos

### RF1 — Harness de perf real

- Exercitar `executeRunOracle` com fixture de banco/fake fiel, cobertura real e
  polling com latência; medir fases `discovery`, `buildTree`, `run`, `poll`,
  `parseXml`.
- Thresholds de regressão no CI (workflow de performance) com tolerância
  explícita; falha se piorar além do budget.

### RF2 — Poll adaptativo

- Poll imediato após o primeiro output e backoff adaptativo (ex.: 50ms → 200ms
  → 500ms) com teto; intervalo configurável apenas se necessário.
- Testes de que o primeiro output não atrasa e que runs longos reduzem queries.

### RF3 — Cobertura: I/O e índice

- Substituir as 36–72 verificações `existsSync`/`statSync` por arquivo por um
  índice de basenames/diretórios construído uma vez por run.
- Leitura assíncrona da fonte para `deriveDeclarationCoverage`; cache por
  versão do documento quando aplicável.

### RF4 — `matchExecutedViews` sem O(V×S) de regex

- Pré-compilar/tokenizar o SQL uma vez e comparar nomes por Set/word-boundary
  sem criar RegExp por par view×SQL.
- Manter o comportamento atual (case-insensitive, word boundary, nome com
  metacaracteres).

### RF5 — CI Windows

- Job `windows-latest` (Node 24) rodando `npm ci`, `npm run compile`,
  `npm run lint`, `npm run typecheck` e `npm run test:unit`.
- Não duplicar os gates de docs/brain no Windows.

### RF6 — `tsconfig` estrito incremental

- Habilitar `noUncheckedIndexedAccess` e `noUnusedLocals`; medir o custo em
  PRs pequenos.
- `exactOptionalPropertyTypes` e `noImplicitOverride` ficam para avaliação
  posterior, com PRD própria se o custo for alto.

### RF7 — Fatiar o restante de `oracleRunner.ts` e `scripts/lib`

- Extrair pool/schema/reporters do orquestrador, mantendo a API pública e os
  testes atuais.
- Criar `scripts/lib/{pkg,git}.cjs` para leitura de `package.json`/`git`
  duplicada; sem mudança de saída dos CLIs.

### RF8 — Orçamento de bundle

- Medir `dist/extension.mjs` e o `.vsix`; definir budget no CI.
- Avaliar `keepNames:false` no publish e exclusão do `.map` do VSIX; lazy-load
  de locale só depois da medição da PRD-115.

**Não-funcionais**

- RNF1 — Nenhuma regressão de comportamento; suíte/cobertura verdes.
- RNF2 — Sem dependência nova.
- RNF3 — Performance medida antes/depois, com números no PRD/CHANGELOG.

## 5. Solução proposta

- Estender `src/test/perf/` para fases reais e um runner de budget.
- `oraclePoll.ts`: backoff com `setTimeout` e reset no primeiro texto.
- `coverage.ts`/`results.ts`: índice + `fs.promises`.
- `viewCoverage.ts`: tokenização/precompilação.
- CI: matriz `os: [ubuntu-latest, windows-latest]` só para o job de unit.
- `tsconfig`: flags em duas etapas.
- `oracleRunner.ts`: mover pool/schema/reporters para módulos coesos.
- `scripts/lib`: helpers puros com testes próprios.

## 6. Configuração

Nenhuma setting nova obrigatória. Se o poll adaptativo precisar de controle,
`utplsql.pollIntervalMs` (machine, default automático) só após medição.

## 7. Plano de testes

- **Unitários**: backoff, índice de cobertura, tokenizer de views, flags do
  tsconfig (typecheck), helpers de scripts.
- **Performance**: harness com fixture real; comparar baseline × depois.
- **CI**: job Windows verde; budget de bundle.
- **Manual**: run longo com cobertura em workspace grande.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Backoff atrasar o primeiro output | Poll imediato + reset ao primeiro texto; teste de latência |
| Índice de cobertura ficar stale | Invalidar no refresh/watch; cache por run |
| `noUncheckedIndexedAccess` gerar centenas de erros | Ativar em PR dedicado, por módulo, com budget |
| Windows CI aumentar tempo/custo | Job único Node 24, sem docs; cache npm |
| Split de `oracleRunner.ts` regredir | Testes atuais como contrato; PRs pequenos |

## 9. Rollout

- 0.23.0; sem mudança visível.
- `CHANGELOG.md` com números de antes/depois.
- Atualizar `wiki/Architecture.md` com os novos módulos e o budget.

## 10. Critérios de aceite

- Harness mede `executeRunOracle`/cobertura real e falha em regressão.
- Poll reduz queries em run longo sem atrasar o primeiro output.
- Cobertura não bloqueia o extension host em workspace grande.
- `matchExecutedViews` sem RegExp por par.
- CI Windows verde.
- `tsconfig` estrito nas flags acordadas.
- `oracleRunner.ts` reduzido e `scripts/lib` com testes.
- Bundle dentro do budget.

## 11. Questões em aberto

- Budget de poll/cobertura: absoluto (ms) ou relativo ao baseline?
- Ativar `exactOptionalPropertyTypes` nesta versão ou em PRD futura?
- O job Windows roda em todo PR ou só em `release/**`/schedule?

## 12. Impacto no cérebro

Criar/ajustar regras `BR-PERF-*` (orçamento de poll/cobertura/bundle) e
`BR-QUAL-*` (CI Windows/tsconfig) com `prds: ["PRD-149"]`, `implementacao:` e
`testes:`. Se alguma RF não gerar regra, registrar **nenhuma** e justificar.

## Impacto nas docs

- `CHANGELOG`: números de performance e qualidade.
- `wiki/Architecture.md`: módulos extraídos, CI Windows e budget de bundle.
- Cada superfície deve citar `PRD-149` ou `<!-- prd:PRD-149 -->`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-115-split-i18n-locales|PRD-115]] · [[prd-126-branch-coverage-cli-tests|PRD-126]] · [[prd-129-orchestration-strategy|PRD-129]] · [[prd-130-config-validation-typed-errors|PRD-130]] · [[prd-131-discovery-resilience-cache|PRD-131]] · [[prd-139-state-store-slicing-lru|PRD-139]]
- ⚙️ Pipelines: [[PIPE-ci - CI|PIPE-ci]]
- 🚀 ⬅️ release anterior: [[prd-115-split-i18n-locales|PRD-115 (0.22.0)]] · ➡️ próxima release: [[prd-121-auditable-package-sourcemap|PRD-121 (0.24.0)]]
<!-- brain:auto:end -->
