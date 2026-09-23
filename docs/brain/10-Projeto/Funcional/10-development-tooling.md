---
tipo: funcional
status: ativo
numero: 10
titulo: "10 — Development Tooling"
publicar: docs/functional/10-development-tooling.md
verificado: 2026-09-23
tags: [funcional]
---
# 10 — Development Tooling

Ferramentas e infraestrutura de desenvolvimento do projeto.

## Scripts npm

| Script | Descrição |
|---|---|
| `npm install` | Instala dependências (inclui `oracledb` em `dependencies`) |
| `npm run compile` | `tsc -p ./` → compila para `out/` |
| `npm run typecheck` | `tsc -p ./ --noEmit` (usado no CI) |
| `npm run watch` | Compilação incremental |
| `npm run lint` | `biome check src/` |
| `npm run lint:fix` | `biome check --write src/` |
| `npm run format` | `biome format --write src/` |
| `npm test` | = `test:unit` |
| `npm run test:unit` | `pretest:unit` (compile + lint) → `node scripts/run-tests.cjs` |
| `npm run test:coverage` | `compile` → `c8 node --experimental-test-module-mocks --require ./scripts/test-setup.cjs --test out/test/unit/**/*.test.js` |
| `npm run test:integration` | `pretest:integration` (compile + bundle) → `vscode-test` |
| `npm run test:integration:smoke` | idem, com `.vscode-test.smoke.mjs` (subconjunto rápido) |
| `npm run test:integration:thick` | idem, com `.vscode-test.thick.mjs` (Instant Client/thick) |
| `npm run db:matrix` | `bash scripts/db-matrix/run.sh` — testa contra Oracle 12.2/18c/19c/21c/23ai local (compose); o 12.2 usa utPLSQL `v3.1.14` (piso alternativo, PRD-84) |
| `npm run db:matrix:list` | Lista as versões da matriz |
| `npm run bundle` | `node esbuild.config.mjs` → `dist/extension.js` (**entry point real da extensão**) |
| `npm run package` | `compile && bundle && vsce package` → `.vsix` universal |
| `npm run package:win32-x64` / `:linux-x64` / `:linux-arm64` / `:darwin-arm64` | VSIX por plataforma (glue thick do alvo) |
| `npm run package:target -- <target>` | VSIX genérico por target (usado pelo `publish.yml`) |
| `npm run gen-icon` | `scripts/gen-icon.cjs` — gera o ícone |
| `npm run gen-diagram` | `scripts/gen-diagrams.cjs` — renderiza todos os SVGs de `docs/wiki/images/` para PNG de 1200px via `@resvg/resvg-js` (cross-platform) |
| `npm run brain:sync` / `brain:check` | Sincroniza/valida o vault Obsidian (`docs/brain`) |
| `npm run docs:check` | Consistência da documentação versionada (roda no CI) |
| `npm run sync-prds` | Atualiza labels/issues no GitHub |
| `npm run pr:create` | Cria pull request (`scripts/create-pr.cjs`) |
| `npm run publish` | Publicação é **exclusiva via GitHub release**; o script é o helper do workflow |

## Depurar a extensão (F5)

**F5** abre o **Extension Development Host** (`.vscode/launch.json`,
`preLaunchTask: extension: build`). No host, abra um projeto PL/SQL e use a
extensão normalmente.

> Se o canal **Extension Host** mostrar
> `TypeError: Missing dataLength in event` (`node:inspector`), é o inspetor do
> Node disparado pela *Network View* experimental do debugger JavaScript — **não
> é da extensão**. O `.vscode/launch.json` já usa
> `"experimentalNetworking": "off"`; se persistir, defina
> `"debug.javascript.enableNetworkView": false` nas User settings.

## Bundling com esbuild (PRD-45, ajustes na PRD-46)

- `"main": "./dist/extension.js"` — bundle único gerado por `esbuild.config.mjs`
- `vscode` e `oracledb` são **externos** (`await import('oracledb')` preservado)
- `fast-xml-parser` (e deps puras) é embutido no bundle — incluindo as transitivas
  do fast-xml-parser v5 (`@nodable/entities`, `anynum`, `fast-xml-builder`,
  `is-unsafe`, `path-expression-matcher`, `xml-naming`). Não há `iconv-lite`: o
  charset é tratado com `TextDecoder`/`Buffer` nativos (`src/charset.ts`)
- `.vscodeignore` exclui `out/**`, `oracledb/plugins/**` (auth IAM/OCI — fora do
  escopo), docs não-licença do oracledb e as deps puras já embutidas. A regra
  `node_modules/oracledb/build/**/*.txt` **mantém as glues thick `.node`** no VSIX
  (`+~2,5 MB`, PRD-70)
- Os VSIXs por plataforma (`package:target`) embarcam apenas a glue do alvo;
  alvos thin-only vão sem nenhum `.node`

## TypeScript Coverage (c8)

### Configuração (`.c8rc`)

```json
{
  "exclude": ["out/test/**", "src/test/**"],
  "reporter": ["text", "lcov", "html"],
  "check-coverage": true,
  "lines": 90,
  "branches": 85,
  "functions": 90,
  "statements": 90
}
```

- `out/test/**` excluído (testes compilados), `src/test/**` excluído (fonte dos testes)
- Source maps habilitados (`"sourceMap": true` no `tsconfig.json`)
- `npm run test:coverage` roda `c8` diretamente no `node --test` (não via wrapper `spawnSync`)

### Output

- Terminal: tabela de cobertura (`text`)
- `coverage/lcov.info`: compatível com ferramentas CI
- `coverage/index.html`: relatório navegável
- `coverage/` no `.gitignore` e `.vscodeignore`

### Coverage atual (aprox. — pode variar por PRD)

| Métrica | Threshold | Atual (v0.12.1) |
|---|---|---|
| Lines | 90% | 98.6% |
| Branches | 85% | 91.2% |
| Functions | 90% | 98.3% |
| Statements | 90% | 98.6% |

## Testes unitários

### Estrutura

```
src/test/
├── unit/                       (34 arquivos .test.ts + setup.ts)
│   ├── cobertura / codelens / config / connectionProfiles / coverage
│   ├── dbSourceProvider / dbmsDebug / debounce / debugger / decorations
│   ├── discovery / i18n / junit / logger / matching / oracleClient / oracleRunner
│   ├── oracledb-default-absent / oracledb-missing-catch / packageTarget
│   ├── plsqlDeclarations / quickfix / quickfixActivation / rerun / results / runner
│   ├── scriptRunner / selectReporterCommand / state / statusBar / suiteParser
│   ├── testTree / viewCoverage
│   └── setup.ts
├── integration/                (extension host; banco via describeDB)
│   ├── extension.test.ts
│   ├── dbPaths / schemaRun / debuggerE2E / debuggerStandaloneFn
│   ├── thickMode / oracleCapabilities / prd70-sqlplus / v012-features / helpers.ts
│   └── fixtures/
└── vscode-stub.ts              (mock da API vscode)
```

### Runner

`scripts/run-tests.cjs`:
1. Encontra recursivamente `out/test/unit/**/*.test.js`
2. Executa `node --experimental-test-module-mocks --require scripts/test-setup.cjs --test <files>`

`scripts/test-setup.cjs`: carrega `out/test/vscode-stub.js` como mock global.

> ⚠️ `node --test <diretório>` **falha**. Sempre use glob `out/test/unit/**/*.test.js`.

### Rodar um teste específico

```bash
node --test out/test/unit/junit.test.js
node --test --test-name-pattern "duração" out/test/unit/**/*.test.js
```

Para pular lint: `node scripts/run-tests.cjs`

## vscode-stub (`src/test/vscode-stub.ts`)

Mock completo da API `vscode` para testes unitários. Duas camadas:
1. **Por teste**: `import './setup.js'` na primeira linha do `.test.ts`
2. **Runner global**: `scripts/test-setup.cjs` carrega o stub

### Componentes mockados

| Namespace | Funções mockadas |
|---|---|
| `Uri` | `file()`, `parse()` (com detecção de scheme), `joinPath()` |
| `workspace` | `getConfiguration()`, `findFiles()`, `fs.readFile()`, `fs.readDirectory()`, `workspaceFolders` |
| `window` | `showInputBox()`, `showErrorMessage()`, `createTextEditorDecorationType()`, `createStatusBarItem()`, `visibleTextEditors` |
| `commands` | `executeCommand()` |
| Classes | `TestMessage`, `TestRun`, `TestItem`, `Range`, `Position`, `Diagnostic`, `DiagnosticCollection`, `FileCoverage`, `StatementCoverage`, `MarkdownString`, `DecorationOptions`, `RelativePattern`, `Location` |
| Enums | `StatusBarAlignment`, `OverviewRulerLane`, `DiagnosticSeverity`, `FileType` |

### Helpers

| Função | Uso |
|---|---|
| `__setConfigValue(key, value)` | Simula settings |
| `__resetConfigValues()` | Limpa settings |
| `__setInputBoxResult(value)` | Simula input do usuário |
| `__setMockFile(pattern, path, content)` | Simula arquivo no workspace |
| `__setMockFileError(path, hasError)` | Simula erro de leitura |
| `__resetMockFiles()` | Limpa arquivos mockados |
| `__setMockDirectoryEntries(path, entries)` | Simula entradas de `fs.readDirectory` |
| `__resetMockDirectoryEntries()` | Limpa diretórios mockados |
| `__setWorkspaceFolders(folders)` | Simula workspace folders |
| `__setVisibleEditors(editors)` | Simula editores visíveis |

> Ao adicionar novos imports de `vscode` em módulos de produção, **adicione o stub
> correspondente** em `vscode-stub.ts`. Se esquecer, testes que importam o módulo
> quebram com `TypeError: X is not a constructor`.

## Testes de integração

Setup em `.vscode-test.mjs`. Sobe instância VSCode via `@vscode/test-cli`.

Testes com banco (`describeDB`) exigem `.env` na raiz com:
- `UTPLSQL_CONN` — string de conexão Oracle

Sem `.env`, `describeDB` é pulado (`describe.skip`).

## CI

Workflow `.github/workflows/ci.yml` (push/PR para `main`):
- Node 22/24 matrix
- `npm ci` → `npm run docs:check` → `npm run lint` → `npm run typecheck` →
  `npm run test:coverage` (enforça os thresholds do c8)

`.github/workflows/publish.yml` (release publicada no GitHub):
- Job **verify** (1×): `compile`, `lint`, `test:unit`
- Job **publish** em **matriz** sobre 9 targets (4 com glue thick:
  `win32-x64`/`linux-x64`/`linux-arm64`/`darwin-arm64`; 5 thin-only:
  `win32-arm64`/`darwin-x64`/`linux-armhf`/`alpine-x64`/`alpine-arm64`)
  - `npm run package:target -- <target>` gera o VSIX do alvo
  - `npm run publish -- --packagePath …` publica no Marketplace (`VSCE_PAT`)
  - `gh release upload <tag> *.vsix` anexa o artefato à release

## PRDs

Documentação de requisitos em `docs/prd/`. Catálogo em `index.md`.

```bash
GITHUB_TOKEN="$(echo "$GITHUB_TOKEN" | tr -d '\r')" npm run sync-prds
```

> ⚠️ O token costuma vir com `\r` (CR) no final. Use `tr -d '\r'`.

## Estilo (Biome)

`biome.json`:
- Indent: space 2, lineWidth 100
- `quoteStyle: single`, `semicolons: always`, `trailingCommas: all`
- Linter: preset `recommended` + `organizeImports: on`

## Publicação

**Exclusivamente via GitHub workflow** (`publish.yml`, disparado na release).
Não rode `npm run publish`/`vsce publish` localmente — `npm run publish:patch`
inclusive falha de propósito. Comando local válido: `npm run package` (gera `.vsix`).

## Node

`.nvmrc` → `24`. CI testa 22/24 (Node 20 atingiu EOL). Requer Node 22+ local.
