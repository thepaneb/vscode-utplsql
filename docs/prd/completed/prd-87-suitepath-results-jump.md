<!-- GENERATED FROM docs/brain/20-PRDs/prd-87-suitepath-results-jump.md — DO NOT EDIT -->

# PRD-87 — Resultados e jump-to-failure em suítes com `%suitepath`

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-25 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `src/junit.ts`, `src/results.ts`, `src/test/unit/junit.test.ts`, `src/test/unit/results.test.ts`, `src/test/integration/jumpToFailureE2E.test.ts`, `CHANGELOG.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

O reporter JUnit do utPLSQL **aninha `<testsuite>` conforme o `--%suitepath`** da
suíte. O `parseJUnit` lia apenas o primeiro nível, então toda suíte com
`%suitepath` aparecia como **"No JUnit result found"** no Test Explorer —
marcada como `skipped`, sem resultado e sem "Go to Error". Além disso, o frame
real de falha do utPLSQL vem como **um nome qualificado único**
(`"UT3.PKG.PROC"`), formato que o regex de stack e o filtro de frames internos
não aceitavam. Esta PRD corrige o parser nos dois pontos.

## 2. Contexto e problema

Descoberto por um E2E que roda uma suíte real que falha de propósito
(`fixtures/test_math_fail.pks`) contra o banco. O teste esperava
`message.location` apontando para o `.pks`, e recebeu `skipped` sem mensagem.

Duas causas independentes:

- **`parseJUnit`** (`src/junit.ts`) percorria `doc.testsuites.testsuite` e lia
  `suite.testcase` — um nível. Com `%suitepath`, a estrutura real é
  `<testsuite>` dentro de `<testsuite>`, então os testcases internos eram
  invisíveis ao parser.
- **`parseStackFrames`/`isUserFrame`** (`src/junit.ts`) e
  **`resolveStackFrameToUri`** (`src/results.ts`) assumiam o formato
  `at "OBJ"."PROC", line N`, mas o utPLSQL emite
  `at "SCHEMA.PACKAGE.PROCEDURE", line N` (nome único). Pior: o filtro de
  frames internos rejeitava qualquer `objectName` começando com `UT3.` — o que
  também descartava testes de usuário instalados no schema compartilhado.

Sondagem no banco real (utPLSQL 3.2.3 / Oracle Free 23ai) confirmou os dois
formatos e o aninhamento.

## 3. Objetivos / Não-objetivos

**Objetivos**
- `parseJUnit` percorre `testsuite` aninhado recursivamente, preservando a ordem
  (testcases do nível atual antes dos aninhados).
- `parseStackFrames` aceita o frame real de nome único qualificado.
- `isUserFrame` filtra por **segmento** (`UT_`, `UT$`, `UT3_`, `UT3$`), sem
  descartar o schema de instalação `UT3` inteiro.
- `resolveStackFrameToUri` extrai o package do frame (2 segmentos → último;
  3+ → penúltimo) e resolve para `<package>.pks`.

**Não-objetivos**
- Não muda o reporter nem a query do buffer.
- Não altera o mapeamento resultado→teste (`matching.ts`).

## 4. Requisitos

### RF1 — Parse recursivo do JUnit

`parseJUnit` deve descer todos os níveis de `<testsuite>`, mantendo o nível atual
antes dos aninhados.

### RF2 — Frame real do utPLSQL

`parseStackFrames` deve reconhecer `at "SCHEMA.PKG.PROC", line N` além dos
formatos existentes.

### RF3 — Filtro de frames por segmento

`isUserFrame` deve rejeitar objetos internos (`UT_SUITE_MANAGER`) e aceitar
código do usuário no schema de instalação (`UT3.TEST_MATH_FAIL.PROC`).

### RF4 — Resolução do package

`resolveStackFrameToUri` deriva o package do frame e o usa para achar a suíte em
cache ou `<package>.pks` no workspace, produzindo a `location` do "Go to Error".

**Não-funcionais**
- RNF1 — Sem regressão nos formatos antigos de stack.
- RNF2 — Cobertura pelas suítes unitária e de integração (E2E contra banco real).

## 5. Solução proposta

- `parseJUnit`: travessia recursiva com `collectSuites`, processando os
  testcases de cada nível antes dos filhos.
- `parseStackFrames`: regex estendida para o nome único qualificado.
- `isUserFrame`: teste por segmento do nome do objeto.
- `resolveStackFrameToUri`: helper `packageFromFrameObject` (1 → ele, 2 → último,
  3+ → penúltimo) e comparação por `packageName`.

## 6. Configuração

Nenhuma.

## 7. Plano de testes

- **Unitários**: `junit.test.ts` (aninhado de 1 e vários níveis, frame real,
  filtro por segmento) e `results.test.ts` (extração do package, resolução).
- **Integração**: `jumpToFailureE2E.test.ts` — cria uma suíte descartável que
  falha, roda `executeRunOracle` e exige `failed`, `lastResults`,
  `lastFailedItems` e `message.location` na linha do `%test`. Passou nas 5
  versões da matriz de bancos.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão no formato antigo de stack | Testes unitários preservam os casos existentes |
| Falso positivo de `isUserFrame` no schema UT3 | Filtro por segmento + E2E com objeto interno |

## 9. Rollout

- Release alvo: 0.13.0.
- Bullet no `CHANGELOG.md` e documentação do vault (`08-jump-to-failure`,
  `03-results-and-reporting`, wiki `Editor-integration`).

## 10. Critérios de aceite

- `parseJUnit` devolve os testcases de uma suíte com `%suitepath`.
- `message.location` existe e aponta para o `.pks` correto.
- `utplsql:hasFailures` reflete a falha real.
- `npm run test:unit` e `npm run test:integration` verdes.

## 11. Questões em aberto

- Nenhuma.
