---
tipo: prd
id: PRD-102
aliases: [PRD-102]
status: proposed
titulo: "Observabilidade: tracing e instrumentação de desempenho"
versao: "0.19.0"
data: "2026-10-09"
autor: "Gil Cleber Barboza"
versao_titulo: "0.19.0 — Observabilidade e desempenho"
verificado: 2026-10-09
regras: []
tags: [prd]
---

# PRD-102 — Observabilidade: tracing e instrumentação de desempenho

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `src/logger.ts`, `src/perf.ts` (novo), `src/oracleRunner.ts`, `src/discovery.ts`, `src/extension.ts`, `src/config.ts`, `package.json`, `docs/brain/**` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-66 (logging), NFR-004 (latência do streaming), PRD-74 (db-first discovery) |

## 1. Resumo

Adicionar **tracing** opt-in (`utplsql.trace`) e **instrumentação de desempenho**
(`utplsql.perf.*`) para diagnosticar descoberta, árvore, execução, polling e parse
em suites grandes. Inclui **gatear o log verboso** que hoje despeja listas de
ids/SQL no canal de saída a cada run.

## 2. Contexto e problema

- `src/logger.ts` já tem níveis e um *sink* para o `LogOutputChannel`, mas **não
  há setting** de trace — só `UTPLSQL_DEBUG=1` para o `console`.
- Não há medição de tempo por fase (descoberta, montagem da árvore, run, polling
  de buffer, parse de XML), o que torna difícil investigar lentidão (NFR-004).
- O log verboso por evento do run não é gateado: um "Run All" grande pode emitir
  uma linha com todos os ids/SQL de uma vez (issue #23 do projeto de referência).
- Referência de porte: `paddi35/src/perf.ts`, `perfReportPath.ts`,
  `runLogging.ts`, `docs/performance.md`, branches `fix/23-gate-run-logging`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Setting `utplsql.trace` para log verboso por evento, **off** por padrão.
- Medir fases com `utplsql.perf.enabled` e, opcionalmente, gravar linhas JSON em
  `utplsql.perf.reportFile`.
- Gatear o log verboso existente por trás do trace.

**Não-objetivos**
- Não criar um painel visual de métricas.
- Não enviar telemetria externa (nada sai da máquina).
- Não substituir o `logger` — estendê-lo.

## 4. Requisitos

### RF1 — Trace

- `utplsql.trace` (boolean, default `false`): emite linhas por evento
  (pré/pós-teste, SQL gerado) no `LogOutputChannel`. Com off, o canal fica limpo.

### RF2 — Gate do log verboso

- Mover os `appendLine` de ids/SQL do run para trás de `utplsql.trace`, evitando
  a emissão monolítica no início de "Run All".

### RF3 — Perf

- `utplsql.perf.enabled` (boolean, default `false`) mede fases e emite
  `info` no canal.
- `utplsql.perf.reportFile` (string): quando definido, cada medição vira uma
  linha JSON no arquivo.
- Fases mínimas: discovery, buildTree, run, poll, parseXml.

### RF4 — Documentação e segurança

- Documentar em nota do vault + página de wiki; nunca logar credenciais
  (SEC-002) nem a connection string não mascarada.

**Não-funcionais**
- RNF1 — Overhead desprezível com as settings desligadas.
- RNF2 — `perf.ts` puro e testável; sem dependências novas.

## 5. Solução proposta

- `src/perf.ts` (novo, puro): `createPerfProbe(enabled, sink)` com
  `start/end` por fase e serialização JSON (testável sem `vscode`).
- `src/logger.ts`: adicionar um nível/canal de trace já gateado.
- `src/oracleRunner.ts`/`src/discovery.ts`: instrumentar as fases e gatear os
  logs verbosos.
- `src/extension.ts`: inicializar o probe a partir do `readConfig()`.

## 6. Configuração

- `utplsql.trace`, `utplsql.perf.enabled`, `utplsql.perf.reportFile`.

## 7. Plano de testes

- **Unitários**: `perf.test.ts` (probe agrega tempos, respeita `enabled`,
  serializa linhas JSON válidas); `logger`/trace gate.
- **Integração**: run com `perf.enabled` produz fases; com `trace` off, o canal
  não recebe a lista de ids/SQL.
- **Manual**: `perf.reportFile` gera um arquivo com uma linha JSON por fase.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Log verboso vazar dados sensíveis | Nunca logar SQL com binds de senha; revisar SEC-002 |
| Overhead quando ligado | Só medir fronteiras de fase; doc do custo |
| Report file crescer sem limite | Documentar; usuário escolhe o caminho |

## 9. Rollout

- **0.19.0** ("Observabilidade e desempenho").
- Registrar no `CHANGELOG.md`; publicação via GitHub release.

## 10. Critérios de aceite

- `utplsql.trace` liga/desliga o log por evento; off = canal limpo.
- `utplsql.perf` reporta as 5 fases; `perf.reportFile` gera JSON válido.
- Nenhuma credencial nos logs; `npm test`/`lint` verdes.

## 11. Questões em aberto

- Reusar `UTPLSQL_DEBUG=1` como sinônimo de `utplsql.trace`?
- Formato do `perf.reportFile`: JSON Lines (paddi35) ou JSON único?
- Incluir a fase de cobertura (parse XML/mapeamento) no escopo?

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-LOG-*` ("tracing e perf são opt-in e nunca
registram credenciais"), com `prds: ["PRD-102"]`, `implementacao:` e `testes:`;
referenciar `SEC-002`. Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-66-connection-robustness-logging|PRD-66]] · [[prd-74-db-first-discovery|PRD-74]]
- 🔗 Mesma versão (0.19.0): [[prd-101-connection-pool-lifecycle|PRD-101]] · [[prd-103-incremental-source-reindex|PRD-103]] · [[prd-106-perf-harness|PRD-106]] · [[prd-107-unprivileged-fixture|PRD-107]]
- 🚀 ⬅️ release anterior: [[prd-109-language-identity|PRD-109 (0.18.0)]] · ➡️ próxima release: [[prd-104-ci-supply-chain|PRD-104 (0.20.0)]]
<!-- brain:auto:end -->
