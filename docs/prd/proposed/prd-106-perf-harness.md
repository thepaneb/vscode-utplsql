<!-- GENERATED FROM docs/brain/20-PRDs/prd-106-perf-harness.md — DO NOT EDIT -->

# PRD-106 — Harness de performance: fixture em escala e medição por fases

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Testes (infra de performance) |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `test/perf/**` (novo), `scripts/**`, `.github/workflows/performance.yml` (novo), `package.json`, `docs/brain/**` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |
| Relaciona-se a | PRD-102 (instrumentação), PRD-75 (árvore lazy), NFR-004 |

## 1. Resumo

Criar um **harness de performance** com uma fixture de escala realista
(**~1000 packages / ~15.000 testes**) gerada direto no banco, e medir
descoberta, montagem da árvore, execução e parsing por fase. Hoje só temos
testes unitários/integração; não há como detectar regressões de performance.

## 2. Contexto e problema

- A extensão é usada com schemas grandes; PRD-75 (árvore lazy) já mostrou que
  escala importa, mas **não há medição**.
- Não existe fixture de escala nem workflow de perf (confirmado: sem
  `test/perf`, sem `performance.yml`).
- A PRD-102 entrega a instrumentação in-extension; falta o **harness** que a
  exercita em escala.
- Referência de porte: `paddi35/test/perf/**`, `docs/performance.md`,
  `.github/workflows/performance.yml` (fixture por `EXECUTE IMMEDIATE`, modos
  `tree`/`mixed`/`full`, JSONL de medições).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Fixture determinística (por seed) gerada no banco, sem 1000 arquivos.
- Medir fases e gravar JSONL; detectar regressões estruturais.
- Rodar sob demanda e semanalmente, **fora** do caminho crítico do PR.

**Não-objetivos**
- Assert de tempo de parede rígido (máquina-dependente).
- Rodar a fixture `full` (~horas) no CI padrão.

## 4. Requisitos

### RF1 — Fixture gerada

- `EXECUTE IMMEDIATE` a partir de hash determinístico de
  `(package, test, seed)`; outcome (pass/fail/error/disabled) e duração em faixas;
  `--%suitepath`/`--%context` para profundidade.

### RF2 — Modos

- `tree` (sleep 0, mede overhead de descoberta/eventos), `mixed` (0,1) e
  `full` (1) via multiplicador em tabela de config.

### RF3 — Medição

- `test/perf/support/timing.ts` grava uma linha JSON por medição em
  `test-results/perf-report.jsonl` (git-ignored; artefato no CI).

### RF4 — Automação

- Scripts `perf:generate`/`perf:scale`/`perf:drop`/`test:perf`.
- `.github/workflows/performance.yml` (workflow_dispatch + semanal).

**Não-funcionais**
- RNF1 — Assert só estrutural (contagens, mix) + teto generoso.
- RNF2 — Não roda no `npm test` padrão.

## 5. Solução proposta

- `test/perf/support/{perfFixture.sql,perfFixture.ts,timing.ts,cli.ts}` e
  `test/perf/*.perf.test.ts`.
- `package.json`: scripts e config de `@vscode/test-cli`/mocha de perf.
- Reusa a instrumentação da PRD-102.

## 6. Configuração

Nenhuma setting da extensão (usa `describeDB`/`UTPLSQL_CONN`).

## 7. Plano de testes

- **Perf**: `test:perf` gera a fixture, roda a suíte, remove e grava JSONL.
- **Manual**: `perf:generate -- 200 10 20 7` para checagem rápida.
- **CI**: workflow semanal verde; artefato do JSONL publicado.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Fixture demorada/custosa | Geração no banco + modos; só semanal/on-demand |
| Ambiente sem banco | `describe.skip` sem `UTPLSQL_CONN` |
| Vira gate frágil | Sem bound rígido; só teto generoso |

## 9. Rollout

- **0.19.0** (Observabilidade e desempenho), junto da PRD-102.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `perf:generate` cria ~1000 packages com seed reproduzível.
- `test:perf` roda e grava JSONL; workflow semanal existe.
- Regressão de `dedup`/árvore detectável por um teste unit font de perf.

## 11. Questões em aberto

- Portar também o teste unit de perf do `dedupPathList` (roda no CI normal)?
- Fixture `full` no workflow semanal ou só manual?

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-TEST-*` ("harness de perf gera fixture no banco
por seed e não roda no caminho crítico do PR"), com `prds: ["PRD-106"]`,
`implementacao:` e `testes:`. Enquanto `proposed`, `regras: []`.
