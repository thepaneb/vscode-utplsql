---
tipo: prd
id: PRD-111
aliases: [PRD-111]
status: proposed
titulo: "Decompor `executeRunOracle` e agrupar `OracleRunOptions`"
versao: "0.19.0"
data: "2026-10-10"
autor: "Gil Cleber Barboza"
versao_titulo: "0.19.0 — Refatoração de fundo"
verificado: 2026-10-10
regras: []
tags: [prd]
---

# PRD-111 — Decompor `executeRunOracle` e agrupar `OracleRunOptions`

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-10 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/runner.ts`, `src/results.ts`, `src/test/unit/oracleRunner*.test.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |
| Relaciona-se a | PRD-40 (options object), PRD-69 (binds tipados), PRD-76 (export), PRD-78/79 (ordem/escopo) |

## 1. Resumo

`executeRunOracle` concentra hoje **~380 linhas** (`src/oracleRunner.ts:564-950`)
num único fluxo com alto grau de ramificação — seleção de reporters, escopo de
cobertura, ordem aleatória, `DBMS_OUTPUT`, export, polling do buffer e aplicação
de resultados. A entrada `OracleRunOptions` (`src/oracleRunner.ts:433`) tem ~30
campos *flat*. Esta PRD **decompõe a função em etapas coesas e testáveis** e
**agrupa as opções em sub-objetos**, sem mudança de comportamento.

## 2. Contexto e problema

- **Função monolítica.** `executeRunOracle` mistura orquestração de conexões,
  montagem de PL/SQL/binds, streaming do buffer e *pós-processamento*. Toda
  feature nova (PRDs 76, 78, 79, 82, 102…) adiciona mais um `if`/bloco ao mesmo
  corpo, elevando o custo de leitura e o risco de regressão.
- **Options bag achatado.** Os ~30 campos de `OracleRunOptions` são passados
  "soltos" por `runner.ts`/`commands/run.ts`; agrupar por domínio reduz erros de
  preenchimento e facilita evolução.
- **Testes acoplados.** Os testes atuais exercitam a função inteira via
  `loadOracledbMod` injetado; extrair etapas permite testes focados por etapa.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Extrair de `executeRunOracle` funções nomeadas, puras ou quase puras, para:
  montar reporters, montar o escopo de cobertura, montar os parâmetros de ordem
  aleatória, montar o PL/SQL/binds, fazer o *poll* do buffer e pós-processar
  (parse + aplicar resultados/cobertura).
- Agrupar `OracleRunOptions` em sub-objetos (`coverage`, `run`, `export`,
  `output`) mantendo compatibilidade de leitura nos call sites.
- Preservar 100% do comportamento e manter a cobertura ≥ thresholds.

**Não-objetivos**
- Trocar o protocolo de polling (`UT_OUTPUT_BUFFER_TMP`) ou o modelo de
  conexões (conn1/conn2).
- Alterar o formato do PL/SQL gerado ou a semântica dos binds.
- Introduzir dependências novas.

## 4. Requisitos

### RF1 — Decomposição de `executeRunOracle`

- Extrair, no mínimo: `buildReporterList(...)`, `buildCoverageScope(...)`,
  `buildRandomOrderParams(...)`, `buildRunCall(...)`, `pollOutputStream(...)` e
  `finalizeRun(...)`.
- `executeRunOracle` passa a ser um orquestrador curto que compõe essas etapas.
- O comportamento observável (PL/SQL gerado, binds, ordem de mensagens de saída)
  permanece idêntico.

### RF2 — Agrupamento de `OracleRunOptions`

- Reorganizar em sub-objetos, por exemplo:
  `coverage: { enabled, owner, schemes, includeObjects, excludeObjects, ... }`,
  `run: { tags, randomOrder, randomOrderSeed, timeoutMinutes, dbmsOutput }`,
  `export: { reporter }`.
- Atualizar os produtores (`runner.ts`, `commands/run.ts`) e o único consumidor.
- Nenhum campo é removido; a mudança é de forma.

### RF3 — Testes e rastreabilidade

- Testes unitários focados por etapa extraída (montagem de runners/escopo/SQL),
  além dos testes de `executeRunOracle` já existentes.
- Documentar o novo mapa de funções no cabeçalho do módulo (comentário), ligando
  cada etapa ao requisito de origem.

**Não-funcionais**
- RNF1 — Sem mudança de comportamento; suíte atual permanece verde.
- RNF2 — Cobertura ≥ thresholds do `.c8rc`; nenhuma linha nova sem teste.
- RNF3 — Nenhuma função resultante acima de ~80 linhas.

## 5. Solução proposta

- Mover para funções de módulo (puras quando possível) as etapas de montagem,
  deixando o *I/O* (conexão, `execute`, `appendOutput`) no orquestrador.
- `pollOutputStream(conn2, utSchema, { onXml, onText, isDone })` encapsula o
  laço de 200 ms, o roteamento CDATA e o *break*; recebe callbacks para manter
  testabilidade sem `vscode`.
- Converter o objeto `options` para os sub-objetos e ajustar os call sites; os
  testes que constroem `OracleRunOptions` são atualizados mecanicamente.

## 6. Configuração

Nenhuma setting, comando ou menu novo.

## 7. Plano de testes

- **Unitários**: `oracleRunner*.test.ts` cobrindo cada etapa extraída
  (reporters válidos/desconhecidos, escopo de cobertura completo/vazio, PL/SQL
  com/sem `paths`/`schemes`/ordem aleatória, roteamento CDATA no poll) e a
  regressão de `executeRunOracle` com `oracledb` mockado.
- **Integração**: run real (Oracle 23ai Free) sem regressão — comparar saída,
  resultados e cobertura antes/depois.
- **Manual**: "Run with Coverage", export de reporter e run com tags.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão sutil no PL/SQL gerado | Testes que fixam a string gerada para cada combinação de flags antes da refatoração |
| Reorganizar options quebrar call sites fora do módulo | `tsc --noEmit` + busca por todos os usos de `OracleRunOptions` |
| Extração mascarar dependência de estado (`currentPool`) | Manter o estado no orquestrador; etapas puras recebem o que precisam |

## 9. Rollout

- **0.19.0** ("Refatoração de fundo"); sem mudança visível ao usuário.
- Registrar no `CHANGELOG.md` (seção interna/refactor).

## 10. Critérios de aceite

- `executeRunOracle` reduzida à orquestração; etapas em funções nomeadas.
- `OracleRunOptions` com sub-objetos por domínio e call sites atualizados.
- PL/SQL/binds comprovadamente idênticos (testes) e suíte verde.
- Cobertura ≥ thresholds; nenhuma função > ~80 linhas na região refatorada.

## 11. Questões em aberto

- Extrair também a montagem de `plsql`/`binds` para um módulo dedicado
  (`src/oracleRunCall.ts`) ou manter em `oracleRunner.ts`?
- Sub-objeto `export` deve absorver `additionalReporters`/`sessionReporter`?

## 12. Impacto no cérebro

Ao concluir, criar a regra `BR-QUAL-*` ("`executeRunOracle` é um orquestrador; as
etapas de montagem são funções testáveis"), com `prds: ["PRD-111"]`,
`implementacao:` e `testes:`. Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-40-options-object|PRD-40]] · [[prd-69-oracle-runner-typed-binds|PRD-69]] · [[prd-76-reporter-export|PRD-76]] · [[prd-78-random-test-order|PRD-78]]
- 🔗 Mesma versão (0.19.0): [[prd-115-split-i18n-locales|PRD-115]]
- 🚀 ⬅️ release anterior: [[prd-114-vscode-stub-modernization|PRD-114 (0.18.0)]] · ➡️ próxima release: [[prd-101-connection-pool-lifecycle|PRD-101 (0.20.0)]]
<!-- brain:auto:end -->
