<!-- GENERATED FROM docs/brain/20-PRDs/prd-148-execution-state-reliability.md — DO NOT EDIT -->

# PRD-148 — Confiabilidade de execução e estado após a auditoria 0.20.0

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber Barboza |
| Data | 2026-11-07 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.1 (patch lane) |
| Arquivos afetados | `src/commands/run.ts`, `src/runner.ts`, `src/autoRun.ts`, `src/compilationDiagnostics.ts`, `src/state.ts`, `src/testTree.ts`, `src/discovery.ts`, `src/matching.ts`, `src/scriptRunner.ts`, `src/connectionProfiles.ts`, `src/dbmsDebug.ts`, `src/debugger.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

Fechar o residual de confiabilidade identificado na auditoria da 0.20.0 que
**não** é um falso-verde imediato: serialização de runs, auto-run “replace”,
diagnósticos de compilação completos, restauração no schema mode, fusão de
suites, ordem de atividade Oracle, IDs com schema e robustez de parsers de
entrada. As correções P0 de timeout/activity/tag/jump/cobertura spec-body já
entram na própria 0.20.0 e não são duplicadas aqui.

## 2. Contexto e problema

A auditoria de 2026-11-07 (4 relatórios + consolidações) encontrou, além dos
P0 já corrigidos, um conjunto de falhas de lifecycle e de estado que degradam
a confiança no Test Explorer:

- Um novo run cancela o anterior mas não espera o unwind; o buffer
  `UT_OUTPUT_BUFFER_TMP` é compartilhado e o `finalizeRun` antigo pode aplicar
  resultados depois do novo.
- `autoRunQueue = "replace"` registra o URI em `deferred`, mas ninguém o
  consome quando o run termina — o comportamento efetivo é `skip`.
- Diagnósticos de compilação só mapeiam suites e usam a linha do body no
  `.pks`; erros de packages de produção são descartados.
- Após reload no schema mode, os ids `test:pkg.proc` ainda não existem e
  `restoreLastFailed`/`hasFailures` ficam vazios.
- `mergeSuiteLists` substitui os testes do arquivo pelos do banco, perdendo
  testes só-arquivo e mutando o input.
- `scriptRunner`/`quickfix` abrem conexão antes de `beginOracleActivity`.
- IDs de suite/teste não incluem o schema; em multi-schema com o mesmo package
  há dedupe silencioso.
- Parsers de entrada têm casos de borda: `SET TRANSACTION`/`SET ROLE`,
  entidades/porta no `connections.xml` do SQL Developer, dedupe de reporter
  por prefixo e casos JUnit duplicados.

## 3. Objetivos / Não-objetivos

**Objetivos**

- Garantir que dois runs nunca se sobreponham no buffer/estado.
- Fazer o auto-run `replace` reagendar de fato ao fim do run.
- Publicar diagnósticos de compilação no arquivo e no tipo corretos.
- Restaurar falhas no schema mode após reload.
- Preservar a união arquivo+banco na descoberta.
- Alinhar a atividade Oracle ao padrão “begin antes de adquirir”.
- Tornar os IDs únicos por schema.
- Endurecer os parsers de entrada listados.

**Não-objetivos**

- Refatoração Strategy da PRD-129, event bus da PRD-128 ou fatiamento do
  `TestStateManager` da PRD-139.
- Otimizações de performance da PRD-149 (poll/discovery/cobertura).
- Hardening de segurança da PRD-144 (entidades XML, symlinks, redação).
- Mudar a UX de jump-to-failure (PRD-132); o filtro `UT_*` já foi antecipado.

## 4. Requisitos

### RF1 — Serialização de runs

- `runWithProgress` mantém a promise do run atual e aguarda o anterior antes de
  iniciar outro (ou aplica uma fila explícita).
- `isRunning()` reflete “promise pendente”, não apenas o token vivo.
- O `run.end()` e o `finalizeRun` do run antigo sempre precedem o novo `DELETE`
  do buffer.

### RF2 — Auto-run “replace” com flush real

- `createAutoRunner` expõe `notifyRunFinished()`/`flush()`; o runner chama ao
  terminar.
- URIs em `deferred` são reavaliadas e executadas se `isRunning()` voltou a
  falso; o teste que codifica “precisa de novo save” é atualizado.

### RF3 — Diagnósticos de compilação completos

- Indexar suites e objetos de produção por nome (Map, não `find` em loop).
- Escolher `.pks`/`.pkb`/`.typ`/`.tpb` por `err.type`.
- Publicar erros de packages de produção no arquivo correspondente, quando
  resolvível; sem arquivo, manter o diagnóstico na suite.

### RF4 — Restore no schema mode

- Reconstruir `lastFailedItems` quando o package/suite for resolvido, ou
  calcular `hasFailures` a partir de `lastResults` sem depender de itens
  materializados.
- O comando “Run Failed” e o debug usam a referência atual, não ids mortos.

### RF5 — Fusão arquivo+banco preservando a união

- `mergeSuiteLists` devolve a união por `packageName`/`procName`, preservando
  testes só-arquivo e sem mutar o input.
- Teste com suite só-arquivo, só-banco e mista.

### RF6 — Ordem de atividade Oracle

- `scriptRunner.connectOracle`: `beginOracleActivity` antes de `ensurePool`.
- `quickfix.recompileUt3`: envolver a conexão em atividade e encerrar no
  `finally`.
- Teste de que `closeIdleOraclePool` não fecha o pool entre checkout e begin.

### RF7 — IDs com schema

- `suiteId`/test ids incluem o schema quando disponível
  (`suite:<schema>:<pkg>`, `test:<schema>:<pkg>.<proc>`).
- Lookups antigos continuam funcionando para árvores file/tag.
- Teste multi-schema com o mesmo package em dois owners.

### RF8 — Robustez de parsers de entrada

- `SET` só é diretiva SQL*Plus quando seguido de opção de cliente
  (`SERVEROUTPUT`, `DEFINE`, `ECHO`, `TIMING`, …); `SET TRANSACTION`/`SET ROLE`
  executam normalmente.
- `parseSqlDevConnections` decodifica entidades XML e assume porta 1521 quando
  ausente.
- Dedupe de reporters compara o nome exato, não prefixo.
- Caso JUnit duplicado não chama `run.passed/failed` duas vezes no mesmo item.

### RF9 — Testes e regressão

- Testes unitários para RF1–RF8; preferir fakes/injeção a banco real.
- Rodar em Windows (Node 24) os testes de path/IDs; o CI Linux não cobre.

**Não-funcionais**

- RNF1 — Sem dependência nova; sem mudança de protocolo Oracle.
- RNF2 — Cobertura ≥ thresholds do `.c8rc`.
- RNF3 — Nenhuma nova chave de i18n se a mensagem existente servir; se
  inevitável, atualizar os 24 catálogos.

## 5. Solução proposta

- `commands/run.ts`: `currentRunPromise` + `await` do anterior; `isRunning()`
  olha a promise.
- `autoRun.ts`: `flush()` chamado no `finally` do runner.
- `compilationDiagnostics.ts`: índice `Map<package, meta[]>` e resolução por
  tipo.
- `state.ts`/`testTree.ts`: restore sob demanda ou context key derivado de
  `lastResults`; IDs com schema.
- `discovery.ts`: fusão sem mutação.
- `scriptRunner.ts`/`quickfix.ts`: atividade antes da conexão.
- `connectionProfiles.ts`/`scriptRunner.ts`/`matching.ts`: casos RF8.

## 6. Configuração

Nenhuma setting nova. `utplsql.autoRunQueue` mantém `skip|replace`; o
comportamento de `replace` passa a cumprir a descrição.

## 7. Plano de testes

- **Unitários**: dois runs concorrentes; auto-run replace; diagnóstico de
  package de produção/body; restore schema; fusão; multi-schema; SET
  TRANSACTION; SQL Developer com `&amp;`/porta vazia; reporter prefixo; caso
  JUnit duplicado.
- **Integração**: run + cancelamento + novo run; schema mode após reload.
- **Manual**: salvar `.pks` durante run com `autoRunQueue=replace`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Serializar runs aumentar a latência percebida | Cancelar o anterior e aguardar apenas o unwind; mensagem de “aguardando run anterior” se necessário |
| IDs com schema quebrarem comandos/CodeLens | Manter lookup canônico e testes de regressão file/tag/schema |
| Diagnósticos de produção apontarem arquivo errado | Resolver por `err.type` e só publicar quando o arquivo existir |
| Auto-run replace criar loop | Flush só quando `isRunning()` for falso; teste de um único reagendamento |

## 9. Rollout

- Patch lane **0.20.1** (ou 0.21.0 se a janela de patch não existir).
- `CHANGELOG.md`: bloco de correções de confiabilidade.
- Sem migração de settings/estado; snapshots antigos continuam válidos.

## 10. Critérios de aceite

- Dois runs nunca aplicam resultados fora de ordem.
- `autoRunQueue=replace` executa o pendente ao fim do run.
- Diagnósticos de produção e body aparecem no arquivo correto.
- `restoreLastFailed` funciona no schema mode após reload.
- `mergeSuiteLists` preserva a união e não muta o input.
- IDs não colidem entre schemas.
- `SET TRANSACTION`/`SET ROLE` executam.
- Suíte, typecheck, lint e cobertura verdes.

## 11. Questões em aberto

- 0.20.1 como patch lane ou incorporar na 0.21.0?
- Diagnósticos de produção sem arquivo local: publicar na suite ou omitir?
- O flush do auto-run deve coalescer múltiplos URIs ou executar em ordem?

## 12. Impacto no cérebro

Criar/ajustar regras `BR-EXEC-*` (serialização/outcome), `BR-STATE-*`
(restore/IDs) e `BR-DISC-*` (união arquivo+banco) com `prds: ["PRD-148"]`,
`implementacao:` e `testes:`. Se alguma RF não gerar regra, registrar
**nenhuma** na implementação e justificar.

## Impacto nas docs

- `CHANGELOG`: correções da 0.20.1.
- `wiki/Architecture.md`: serialização de runs, IDs com schema e restore.
- `wiki/Troubleshooting.md`: auto-run replace e diagnósticos de compilação.
- Cada superfície deve citar `PRD-148` ou `<!-- prd:PRD-148 -->`.
