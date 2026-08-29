# 10 — Development Tooling

Ferramentas e infraestrutura de desenvolvimento do projeto.

## Scripts npm

| Script | Descrição |
|---|---|
| `npm install` | Instala dependências (inclui `oracledb` como optional) |
| `npm run compile` | `tsc -p ./` → compila para `out/` |
| `npm run watch` | Compilação incremental |
| `npm run lint` | `biome check src/` |
| `npm run lint:fix` | `biome check --write src/` |
| `npm run format` | `biome format --write src/` |
| `npm test` | = `test:unit` |
| `npm run test:unit` | `pretest:unit` (compile + lint) → `node scripts/run-tests.cjs` |
| `npm run test:coverage` | `compile` → `c8 node --require ./scripts/test-setup.cjs --test out/test/unit/**/*.test.js` |
| `npm run test:integration` | `pretest:integration` (compile + bundle) → `vscode-test` |
| `npm run bundle` | `node esbuild.config.mjs` → `dist/extension.js` (**entry point real da extensão**) |
| `npm run package` | `compile && bundle && vsce package` → `.vsix` |
| `npm run sync-prds` | Atualiza labels/issues no GitHub |
| `npm run gen-diagram` | `scripts/gen-diagrams.cjs` — renderiza todos os SVGs de `docs/wiki/images/` para PNG de 1200px via `@resvg/resvg-js` (cross-platform) |

## Bundling com esbuild (PRD-45)

- `"main": "./dist/extension.js"` — bundle único gerado por `esbuild.config.mjs`
- `vscode` e `oracledb` são **externos** (`await import('oracledb')` preservado)
- `fast-xml-parser`/`iconv-lite` (e deps puras) são embutidas no bundle
- `.vscodeignore` exclui `out/**`, os binários nativos do oracledb
  (`oracledb/build/**`) e as deps puras já embutidas — VSIX ~950 KB

## TypeScript Coverage (c8)

### Configuração (`.c8rc`)

```json
{
  "exclude": ["out/test/**", "src/test/**"],
  "reporter": ["text", "lcov", "html"],
  "check-coverage": true,
  "lines": 65,
  "branches": 80,
  "functions": 70,
  "statements": 65
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

| Métrica | Threshold | Atual (v0.11.0) |
|---|---|---|
| Lines | 65% | 78.1% |
| Branches | 80% | 86.5% |
| Functions | 70% | 88.7% |
| Statements | 65% | 78.1% |

## Testes unitários

### Estrutura

```
src/test/
├── unit/
│   ├── cli.test.ts
│   ├── cliEncoding.test.ts
│   ├── cliInfo.test.ts
│   ├── cliReporters.test.ts
│   ├── cobertura.test.ts
│   ├── codelens.test.ts
│   ├── compilationDiagnostics.test.ts
│   ├── config.test.ts
│   ├── coverage.test.ts
│   ├── decorations.test.ts
│   ├── discovery.test.ts
│   ├── invocation.test.ts
│   ├── junit.test.ts
│   ├── matching.test.ts
│   ├── oracleRunner.test.ts
│   ├── quickfix.test.ts
│   ├── rerun.test.ts
│   ├── results.test.ts
│   ├── runner.test.ts
│   ├── setup.ts
│   ├── state.test.ts
│   ├── statusBar.test.ts
│   └── suiteParser.test.ts
├── integration/
│   └── extension.test.ts
├── fixtures/           (Oracle DB fixtures)
└── vscode-stub.ts      (mock da API vscode)
```

### Runner

`scripts/run-tests.cjs`:
1. Encontra recursivamente `out/test/unit/**/*.test.js`
2. Executa `node --require scripts/test-setup.cjs --test <files>`

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
- `UTPLSQL_CLI_PATH` — caminho do executável utPLSQL-cli
- `UTPLSQL_CLI_HOME` — raiz do CLI (obrigatório no modo `java`)

Sem `.env`, `describeDB` é pulado (`describe.skip`).

## CI

Workflow `.github/workflows/ci.yml`:
- Node 22/24 matrix
- `npm ci` → `npm test` (o `pretest:unit` do `npm test` já roda compile + lint)

`.github/workflows/publish.yml`:
- Disparado ao publicar release no GitHub
- Roda compile, lint, `test:unit`, bundle, `npm run publish` (marketplace via
  `VSCE_PAT`) e upload do `.vsix` como asset

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

**Exclusivamente via GitHub workflow**. `npm run publish` local é bloqueado.
Comando local válido: `npm run package` (gera `.vsix`).

## Node

`.nvmrc` → `24`. CI testa 22/24 (Node 20 atingiu EOL). Requer Node 22+ local.
