<!-- GENERATED FROM docs/brain/20-PRDs/prd-101-connection-pool-lifecycle.md — DO NOT EDIT -->

# PRD-101 — Ciclo de vida de conexões: fechar pools ociosos após a execução

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/runner.ts`, `src/extension.ts`, `src/config.ts`, `package.json`, `docs/brain/**` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-38 (pooling), PRD-66 (robustez), PRD-95 (runtime) |

## 1. Resumo

Fechar os **pools ociosos** assim que a última operação (run, cobertura,
export ou discovery) termina, de modo que nenhuma sessão Oracle sobreviva à
execução. Hoje o pool único fica em cache até troca de perfil/desativação, o que
impede `DROP USER` do usuário de teste sem recarregar o VS Code.

## 2. Contexto e problema

- `src/oracleRunner.ts` mantém um pool único em `currentPool`; ele só é fechado
  em `ensurePool` (troca de perfil) ou `closeOraclePool`. Não há fechamento ao
  fim do run.
- Consequência prática (issue #105 do projeto de referência): o DBA não consegue
  dropar o usuário enquanto o VS Code mantém sessões ociosas.
- Referência de porte: `paddi35/fix/close-pool-after-run-105`
  (`utplsql.connections.closeAfterRun`, ref-count de runs, `pool.close(0)` só em
  pool com `connectionsInUse === 0`). Lá o pool é por perfil; aqui é único, o
  que simplifica o ref-count.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Um setting que liga/desliga o fechamento ao fim da execução.
- Contar operações concorrentes para não fechar pool usado por outra operação.
- Fechar apenas pools **sem conexão em uso**.

**Não-objetivos**
- Mudar a estratégia de pool (min/max/increment seguem iguais).
- Fechar pool durante uma operação em andamento.
- Alterar a resolução de conexão/perfil (PRD-34/PRD-82).

## 4. Requisitos

### RF1 — Setting

- `utplsql.oraclePoolCloseAfterRun` (boolean). Default a decidir na implementação
  (a favor de `true`, alinhado ao substrato de referência; documentar a
  reconexão extra por execução quando ligado).

### RF2 — Ref-count de operações

- `beginRunActivity()`/`endRunActivity()` (ou equivalente) incrementa/decrementa
  um contador global cobrindo **run, cobertura, export e discovery**.
- Ao chegar a zero com o setting ligado, fechar cada pool ocioso
  (`connectionsInUse === 0`).

### RF3 — Segurança de ciclo de vida

- Remover o pool do cache **antes** do `close()` assíncrono, para um `getPool()`
  concorrente criar um novo em vez de receber um fechando.
- Nunca derrubar conexão em uso; integrar com o cancelamento (`conn.break`,
  `recyclePool`) da PRD-66.

### RF4 — Observabilidade

- Logar no canal `utPLSQL` ("pool fechado após a execução" / falha ao fechar).
- Respeitar SEC-002 (nunca logar credenciais).

**Não-funcionais**
- RNF1 — Com o setting **desligado**, comportamento idêntico ao atual (sem
  regressão de latência).
- RNF2 — Sem novas dependências.

## 5. Solução proposta

- `src/oracleRunner.ts`: extrair `closeIdlePools()` + ref-count; `ensurePool`
  permanece.
- `src/runner.ts` / chamadas de descoberta/cobertura/export: envolver o corpo
  com `beginRunActivity()` no início e `await endRunActivity()` no `finally`.
- `src/config.ts` + `package.json`: o setting.

## 6. Configuração

- `utplsql.oraclePoolCloseAfterRun` (boolean).

## 7. Plano de testes

- **Unitários**: ref-count (fechar só no último `end`; não fechar pool com
  conexão em uso; `end` duplicado conta uma vez).
- **Integração** (`describeDB`): após um run, `v$session` não tem sessão do pool;
  um run concorrente não tem o pool fechado por baixo.
- **Manual**: com o setting ligado, `DROP USER` após o run; com desligado, o pool
  permanece (comportamento anterior).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Fechar pool em uso | Só fechar `connectionsInUse === 0`; remover do cache antes do close |
| Reabertura a cada run (latência) | Setting desligável; documentar o trade-off |
| Corrida com cancelamento | Reusar `recyclePool`/ref-count; testes de cancelamento |

## 9. Rollout

- **0.20.0** ("Observabilidade e desempenho").
- Registrar no `CHANGELOG.md`; publicação via GitHub release.

## 10. Critérios de aceite

- Com o setting ligado, nenhuma sessão do pool sobrevive ao fim do run.
- Dois runs concorrentes não têm pool fechado indevidamente.
- Com o setting desligado, nenhuma mudança de comportamento.
- `npm test`/`lint` verdes; cobertura ≥ thresholds.

## 11. Questões em aberto

- Default `true` (como o de referência) ou `false` (preserva a latência atual)?
- Fechar também após **discovery** isolada, ou só após run/export?
- Reaproveitar nome `utplsql.connections.closeAfterRun` por familiaridade?

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-CONN-*` ("pool ocioso é fechado ao fim da
execução; nunca conexão em uso"), com `prds: ["PRD-101"]`, `implementacao:` e
`testes:`. Enquanto `proposed`, `regras: []`.
