# AGENTS.md

This file provides guidance to Agents when working with code in this repository.

## O que é

Extensão do VSCode que integra o framework de testes **utPLSQL** (Oracle PL/SQL) à
interface gráfica: descobre suites pelas annotations `%suite`/`%test`, roda os testes
via `utPLSQL-cli`, mostra os resultados no **Test Explorer** nativo e a **cobertura**
(gutters + % por arquivo) via Test Coverage API. A extensão é só o cliente gráfico —
quem executa os testes é o banco Oracle, via CLI.

## Ambiente / Node

Requer **Node 24+** (`tsc`, test runner e `vsce`). No Windows sem admin, dá para usar a
distribuição portátil (`winget install OpenJS.NodeJS.LTS`, ou o `.zip` do nodejs.org num
diretório do usuário adicionado ao PATH).

## Comandos

```powershell
npm install              # dependências
npm run compile          # tsc -> out/ (valida tipos)
npm run watch            # compilação incremental
npm run test:unit        # testes puros dos parsers (rápido, offline)
npm run test:integration # sobe o VSCode real (baixa ~280 MB em .vscode-test/)
npm test                 # = test:unit
npm run package          # gera o .vsix (precisa de @vscode/vsce instalado)
```

Rodar **um único** arquivo/teste unitário:

```powershell
node --test out/test/unit/junit.test.js          # um arquivo
node --test --test-name-pattern "duração" "out/test/unit/**/*.test.js"   # por nome
```

> Importante: `node --test <diretório>` **falha** (tenta carregar a pasta
> como módulo). Sempre use o **glob** `"out/test/unit/**/*.test.js"` — é por isso que
> o script `test:unit` está escrito assim. Compile antes (`pretest:unit` já faz isso).

Depurar a extensão: **F5** (config em `.vscode/launch.json`) abre um Extension
Development Host. Abra nele um projeto PL/SQL com utPLSQL para ver as suites.

## Publicação

**A publicação no Marketplace é feita exclusivamente pelo workflow do GitHub**
(`.github/workflows/publish.yml`): basta criar uma **release** no GitHub que o
workflow empacota, publica e anexa o `.vsix` automaticamente.

⚠️ **NÃO use `npm run publish` ou `npx vsce publish` localmente.**\
O único comando válido localmente é `npm run package` para gerar o `.vsix` para
testes ou distribuição interna.

## Arquitetura

Fluxo: descoberta → `utplsql run` → parse dos relatórios → APIs nativas do VSCode.

```
discovery (acha .pks)
  → executeRun monta: utplsql run <conn> -p=<suites>
       -f=ut_junit_reporter -o=results.xml            → parseJUnit  → run.passed/failed
       -f=ut_coverage_cobertura_reporter -o=cov.xml    → parseCobertura → run.addCoverage
       -f=ut_documentation_reporter -c (stdout)        → run.appendOutput (log)
```

`src/extension.ts` é o orquestrador: cria o `TestController`, dois `RunProfile`
(Run e Coverage), registra os comandos/menus, e contém `executeRun` (monta args do
CLI, dispara, mapeia resultados e cobertura).

**Separação crítica — módulos puros vs. módulos que dependem de `vscode`:**
A lógica de parsing fica em módulos **sem `import vscode`** para ser testável com
`node --test` fora do host do VSCode. Ao mexer em parsing, mantenha essa fronteira.

| Puro (testável com node) | Depende de `vscode` |
|---|---|
| `suiteParser.ts` (regex de `%suite`/`%test`) | `discovery.ts` (varre o workspace, embrulha em `SuiteFile`) |
| `junit.ts` (parse JUnit) | `coverage.ts` (`resolveSourceUri`) |
| `cobertura.ts` (parse Cobertura) | `cli.ts`, `config.ts`, `extension.ts` |
| `invocation.ts` | |

Os testes unitários só importam os módulos puros; o teste de integração
(`src/test/integration`) roda dentro do VSCode e valida ativação + comandos.

## Pontos de atenção (não óbvios)

- **Mapeamento resultado→teste** (`applyResults` em `extension.ts`) é heurístico:
  casa por `package` (último segmento do `classname` do JUnit) + nome/descrição do
  teste, com fallback por nome. Se o formato do JUnit do utPLSQL divergir, é aqui
  que se ajusta (`lastSegment` e o índice).
- **Cobertura precisa de mapeamento de arquivos**: a extensão passa
  `-source_path` (= setting `utplsql.sourcePath`) para o CLI emitir caminhos de
  arquivo no Cobertura; `resolveSourceUri` tenta absoluto → workspace → sourcePath.
  No banco (Oracle 19c), a cobertura exige `GRANT EXECUTE ON SYS.DBMS_PROFILER` —
  sem isso o relatório sai vazio.
- **Conexão**: nunca é logada. Resolução em `config.ts`: setting `utplsql.connection`
  → env `UTPLSQL_CONN` → cache de sessão → prompt. Prefira a env var.
- **Coverage profile**: runs disparados por comando/menu precisam carregar o
  `coverageProfileRef` no `TestRunRequest`, senão `loadDetailedCoverage` (gutters)
  não é chamado.
- **Engine**: requer VSCode `^1.88` (Test Coverage API estável).
- `node --test` exige `@types/node` ^24+ e Node 24+.
- **Publicação**: apenas via workflow do GitHub (release). Não rodar `npm run publish` localmente.

## PRDs

Os PRDs ficam em `docs/prd/` com um `index.md` que serve como catálogo e
roadmap. **Sempre mantenha o `index.md` atualizado** ao criar, mover ou
concluir PRDs:
- Novo PRD em `proposed/` → adicionar na tabela **Propostos** e na árvore de
  **Estrutura**.
- PRD concluído → mover o arquivo para `completed/`, remover de **Propostos**,
  adicionar em **Concluídos** com a versão de entrega.
- O número sequencial (`prd-<NN>-`) deve ser o próximo disponível.

### Sincronizar PRDs com GitHub Issues

O script `scripts/sync-prds.cjs` cria/atualiza issues no GitHub a partir dos
arquivos locais. Requer `GITHUB_TOKEN` com escopo `issues:write`.

```bash
GITHUB_TOKEN=ghp_xxx npm run sync-prds
```

O script:
- Lê todos os PRDs de `proposed/`, `approved/` e `completed/`.
- Cria issues para PRDs ainda não sincronizados (título `PRD-<NN>: <titulo>`,
  body com o conteúdo do PRD).
- Atualiza a label (`prd:proposed`/`prd:approved`/`prd:completed`) quando o
  status muda.
- Mantém um cache em `docs/prd/.prd-issues.json` (gitignored).

### Rastreabilidade Commits/PR ↔ Issues

Use as **keywords do GitHub** no corpo do commit ou PR para fechar issues automaticamente no merge:

```
feat: implement CI pipeline with Biome linter (PRD-03)

Closes #3
```

| Keyword | Efeito |
|---|---|
| `Closes #N` | Fecha a issue N no merge do PR |
| `Fixes #N` | Fecha a issue N (semântica de bugfix) |
| `Refs #N` | Referência apenas, sem fechar |

**Convenção do projeto:**
- O título do commit deve conter `(PRD-<NN>)` no final.
- O corpo (ou descrição do PR) deve conter `Closes #<issue-number>` se a issue
  do PRD existir.
- Para múltiplas issues num mesmo commit: `Closes #3, #4, #7`.
- Issues de PRDs concluídos também são fechadas pelo `sync-prds.cjs` (fallback).
