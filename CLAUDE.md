# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Extensão do VSCode que integra o framework de testes **utPLSQL** (Oracle PL/SQL) à
interface gráfica: descobre suites pelas annotations `%suite`/`%test`, roda os testes
via `utPLSQL-cli`, mostra os resultados no **Test Explorer** nativo e a **cobertura**
(gutters + % por arquivo) via Test Coverage API. A extensão é só o cliente gráfico —
quem executa os testes é o banco Oracle, via CLI.

## Ambiente / Node

Node **não está** no PATH padrão deste ambiente — foi instalado de forma portátil
(sem admin) em `C:\Users\gil.barboza\tools\node-v24.18.0-win-x64`. Em terminais novos
ele já vem do PATH do usuário; se um comando reclamar que `node`/`npm` não existe,
prefixe a sessão com:

```powershell
$env:Path = "C:\Users\gil.barboza\tools\node-v24.18.0-win-x64;$env:Path"
```

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

> Importante: `node --test <diretório>` **falha** no Node 24 (tenta carregar a pasta
> como módulo). Sempre use o **glob** `"out/test/unit/**/*.test.js"` — é por isso que
> o script `test:unit` está escrito assim. Compile antes (`pretest:unit` já faz isso).

Depurar a extensão: **F5** (config em `.vscode/launch.json`) abre um Extension
Development Host. Abra nele um projeto PL/SQL com utPLSQL para ver as suites.

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
- `node --test` exige `@types/node` ^20+ e Node 18+.
