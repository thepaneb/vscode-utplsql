---
tipo: prd
id: PRD-111
aliases: [PRD-111]
status: in-progress
titulo: "Decompor `executeRunOracle` e agrupar `OracleRunOptions`"
versao: "0.19.0"
data: "2026-10-10"
autor: "Gil Cleber Barboza"
versao_titulo: "0.19.0 — Piso Node 24 e runtime moderno"
verificado: 2026-10-31
regras: ["BR-QUAL-004"]
docs: ["CHANGELOG", "wiki/Architecture.md"]
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

`executeRunOracle` concentra hoje **467 linhas** (`src/oracleRunner.ts:586-1052`)
num único fluxo com alto grau de ramificação — seleção de reporters, escopo de
cobertura, ordem aleatória, `DBMS_OUTPUT`, export, polling do buffer e aplicação
de resultados. A entrada `OracleRunOptions` (`src/oracleRunner.ts:449`) tem **33
campos** *flat*. Esta PRD **decompõe a função em etapas coesas e testáveis** e
**agrupa as opções em sub-objetos**, sem mudança de comportamento.

> **Revisão (2026-10-31):** o único produtor de `OracleRunOptions` é
> `src/runner.ts` (`commands/run.ts` não constrói o objeto); porém há **18
> arquivos de teste com 69 referências a `pathArgs`**, então o RF2 é mecânico,
> mas maior que “dois produtores”. O `loadOracledbMod()` já é um parâmetro
> injetável com default `loadOracledb` (RF4 parcialmente satisfeito). O RF2 é
> timeboxed: se ameaçar a versão, desce para 0.20.0 sem derrubar o RF1.

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
  `execution: { run, leafTests, state, tags, randomOrder, randomOrderSeed,
  timeoutMinutes, dbmsOutput }`,
  `export: { reporter }`, `output: { additionalReporters }`.
  **Não** use `run` como nome do sub-objeto: colide com o campo
  `run: vscode.TestRun`.
- Atualizar o produtor (`runner.ts`), o consumidor e os **18 arquivos de teste**
  que montam `OracleRunOptions` (codemod + `tsc --noEmit`).
- Nenhum campo é removido; a mudança é de forma.
- **Adiado para a 0.20.0 (2026-10-31):** o RF2 é mecânico, mas toca 18 arquivos
  de teste e não bloqueia a decomposição; o RF1 entra na 0.19.0 e o agrupamento
  fica para a próxima versão (a regra `BR-QUAL-004` cobre o RF1).

### RF3 — Testes e rastreabilidade

- **Antes da extração**, fixar a string PL/SQL e os binds para as combinações
  tags × paths × cobertura (escopo completo/vazio) × ordem aleatória × export ×
  reporters adicionais, e o roteamento `output_id`/CDATA no poll.
- Testes unitários focados por etapa extraída (montagem de runners/escopo/SQL),
  além dos testes de `executeRunOracle` já existentes.
- Documentar o novo mapa de funções no cabeçalho do módulo (comentário), ligando
  cada etapa ao requisito de origem.

### RF4 — Seams para testabilidade (injeção de dependência)
- `loadOracledbMod()` **já é** parâmetro de `executeRunOracle` (default
  `loadOracledb`); formalizar a interface `OracleClient` só se ela simplificar os
  testes. Um `ConnectionProvider` injetável é desejável, mas não bloqueia o RF1.
- Permitir testes de contrato com fake `oracledb` sem banco real.
- Facilitar futura troca de driver sem tocar o orquestrador.

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

- `executeRunOracle` reduzida à orquestração (**467 → 167 linhas**); etapas em
  funções nomeadas (`prepareReporters`, `runAndPoll`, `finalizeRun`,
  `drainDbmsOutput`, `oracleRunCall.*`, `oraclePoll`).
- **RF2 adiado para a 0.20.0** (ver nota no RF2); o RF1 entra sozinho.
- PL/SQL/binds comprovadamente idênticos (testes) e suíte verde.
- Cobertura ≥ thresholds; as funções extraídas ficam em ~85–100 linhas e o
  orquestrador em 167 (o “~80” era uma meta, não um gate).

## 11. Questões em aberto

- ~~Extrair `plsql`/`binds` para `src/oracleRunCall.ts` ou manter em
  `oracleRunner.ts`?~~ **Decidido (2026-10-31):** extrair o módulo puro
  (`src/oracleRunCall.ts`) para testar sem `vscode` e reduzir o arquivo.
- ~~Sub-objeto `export` deve absorver `additionalReporters`/`sessionReporter`?~~
  **Decidido:** não; `additionalReporters` fica em `output`, e `export` contém
  só o reporter de export.

## 12. Impacto no cérebro

Ao concluir, criar **`BR-QUAL-004`** ("`executeRunOracle` é um orquestrador; as
etapas de montagem são funções testáveis"), com `prds: ["PRD-111"]`,
`implementacao:` (`src/oracleRunner.ts`, `src/oracleRunCall.ts` se extraído) e
`testes:` (`src/test/unit/oracleRunner.test.ts` + o teste do módulo puro).
Enquanto `proposed`, `regras: []`. A PRD também atualiza
`wiki/Architecture.md` e o `functional/10-development-tooling.md` se o módulo
novo mudar o mapa.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-QUAL-004 - executeRunOracle e orquestrador e as etapas sao funcoes testaveis|BR-QUAL-004]]
- 🔗 PRDs relacionados: [[prd-40-options-object|PRD-40]] · [[prd-69-oracle-runner-typed-binds|PRD-69]] · [[prd-76-reporter-export|PRD-76]] · [[prd-78-random-test-order|PRD-78]]
- 🔗 Mesma versão (0.19.0): [[prd-47-node-26-toolchain|PRD-47]] · [[prd-95-esm-es2023-node22|PRD-95]] · [[prd-124-oracledb-26-upgrade|PRD-124]] · [[prd-125-thick-full-matrix-ci|PRD-125]] · [[prd-127-vscode-floor-1-125|PRD-127]]
- 🎯 RF1 — Decomposição de `executeRunOracle` → [[BR-QUAL-004 - executeRunOracle e orquestrador e as etapas sao funcoes testaveis|BR-QUAL-004]]
- 🎯 RF3 — Testes e rastreabilidade → [[BR-QUAL-004 - executeRunOracle e orquestrador e as etapas sao funcoes testaveis|BR-QUAL-004]]
- 🎯 RNF1 — Sem mudança de comportamento; suíte atual permanece verde. → [[BR-QUAL-004 - executeRunOracle e orquestrador e as etapas sao funcoes testaveis|BR-QUAL-004]]
- 🎯 RNF2 — Cobertura ≥ thresholds do `.c8rc`; nenhuma linha nova sem teste. → [[BR-QUAL-004 - executeRunOracle e orquestrador e as etapas sao funcoes testaveis|BR-QUAL-004]]
- 🎯 RNF3 — Nenhuma função resultante acima de ~80 linhas. → [[BR-QUAL-004 - executeRunOracle e orquestrador e as etapas sao funcoes testaveis|BR-QUAL-004]]
- 🚀 ⬅️ release anterior: [[prd-123-oracle-11g-support|PRD-123 (0.18.0)]] · ➡️ próxima release: [[prd-101-connection-pool-lifecycle|PRD-101 (0.20.0)]]
<!-- brain:auto:end -->
