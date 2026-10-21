---
id: TPL-VSCODE-API
aliases: [TPL-VSCODE-API]
tipo: componente-terceiro
titulo: "API do VS Code (inventário de uso)"
dominio: plataforma
fornecedor: Microsoft
licenca: MIT
criticidade: critica
risco: medio
versao: "engines.vscode ^1.101.0"
status: ativo
verificado: 2026-09-29
implementacao: ["scripts/vscode-api-inventory.cjs", "package.json:11", "package.json:824"]
testes: ["src/test/unit/vscodeApiInventory.test.ts"]
regras: [BR-PLAT-001]
relacionado: ["[[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]]", "[[NFR-003 - Compatibilidade com VSCode]]"]
tags: ["plataforma"]
---
## Papel

Inventário de **todas as APIs do VS Code** usadas no código de produção
(`src/**`, fora de testes), com onde cada símbolo é **diretamente referenciado**.
Dimensiona o acoplamento à plataforma e dá o contrato de API para upgrades.

Escopo: uso via alias `vscode.*` (o projeto importa sempre como
`import * as vscode from 'vscode'`, inclusive `import type *`). Cobre namespaces
(`vscode.window`), membros (`vscode.window.showInputBox`), tipos e enums
(`vscode.Uri`, `vscode.DiagnosticSeverity`).

## Runtime (Node do host)

A extensão roda no **Node embutido no VS Code** (Extension Host) — **não** no Node
do dev/CI. Fonte: `.nvmrc` do repositório do VS Code por tag + versão do Electron.

| VS Code | Electron | Node do host |
|---|---|---|
| 1.88 | 28 | 18.18 (EOL abr/2025) |
| 1.90 | 29 | 20.9 |
| 1.100 | 34 | 20.19 |
| **1.101** | 35 | **22.15** |
| 1.102 | 35 | 22.15 |

Piso atual: **1.101** (Node 22 = LTS mais antigo em suporte; EOL abr/2027).
`engines.node`, `@types/node` e o `esbuild target` devem casar com o Node do
host — o `docs-fidelity` cobra essa coerência.

## Regra de compatibilidade

`engines.vscode` define o **piso**; `@types/vscode` fica **pinado no piso**
(exato, sem caret) para o compilador **recusar** qualquer API acima dele. O
`docs-fidelity` cobra essa igualdade.

## Inventário (gerado)

<!-- brain:auto:start:vscode-api -->
**`engines.vscode`:** `^1.101.0` · **`@types/vscode`:** `1.101.0` · **107 símbolos · 555 referências**

| Símbolo | Refs | Arquivos |
|---|---|---|
| `vscode.TestItem` | 55 | `src/commands/debug.ts`, `src/commands/run.ts`, `src/decorations.ts`, `src/matching.ts` +5 |
| `vscode.commands.registerCommand` | 38 | `src/commands/connection.ts`, `src/commands/debug.ts`, `src/commands/profile.ts`, `src/commands/run.ts` +3 |
| `vscode.Uri` | 33 | `src/commands/debug.ts`, `src/commands/run.ts`, `src/commands/scaffold.ts`, `src/commands/script.ts` +9 |
| `vscode.window.showInformationMessage` | 29 | `src/commands/connection.ts`, `src/commands/debug.ts`, `src/commands/profile.ts`, `src/commands/run.ts` +5 |
| `vscode.window.showWarningMessage` | 25 | `src/commands/debug.ts`, `src/commands/profile.ts`, `src/commands/run.ts`, `src/commands/scaffold.ts` +4 |
| `vscode.window.showErrorMessage` | 22 | `src/commands/connection.ts`, `src/commands/debug.ts`, `src/commands/run.ts`, `src/commands/scaffold.ts` +4 |
| `vscode.WorkspaceFolder` | 20 | `src/debugger.ts`, `src/discovery.ts`, `src/oracleRunner.ts`, `src/results.ts` +3 |
| `vscode.commands.executeCommand` | 18 | `src/commands/connection.ts`, `src/commands/profile.ts`, `src/commands/run.ts`, `src/config.ts` +4 |
| `vscode.TestController` | 14 | `src/commands/deps.ts`, `src/runner.ts`, `src/testTree.ts` |
| `vscode.TestRunRequest` | 12 | `src/commands/run.ts`, `src/runner.ts` |
| `vscode.Uri.parse` | 12 | `src/commands/run.ts`, `src/compilationDiagnostics.ts`, `src/discovery.ts`, `src/quickfix.ts` +1 |
| `vscode.ExtensionContext` | 10 | `src/commands/connection.ts`, `src/commands/debug.ts`, `src/commands/profile.ts`, `src/commands/run.ts` +6 |
| `vscode.window.activeTextEditor` | 10 | `src/commands/debug.ts`, `src/commands/run.ts`, `src/commands/scaffold.ts`, `src/commands/script.ts` |
| `vscode.workspace.fs` | 10 | `src/commands/debug.ts`, `src/commands/run.ts`, `src/commands/scaffold.ts`, `src/commands/script.ts` +1 |
| `vscode.CodeAction` | 8 | `src/commands/scaffold.ts`, `src/quickfix.ts` |
| `vscode.Range` | 8 | `src/codelens.ts`, `src/compilationDiagnostics.ts`, `src/decorations.ts`, `src/quickfix.ts` +1 |
| `vscode.ThemeColor` | 8 | `src/decorations.ts` |
| `vscode.Uri.file` | 8 | `src/commands/scaffold.ts`, `src/commands/script.ts`, `src/coverage.ts`, `src/extension.ts` +1 |
| `vscode.window.showQuickPick` | 8 | `src/commands/connection.ts`, `src/commands/debug.ts`, `src/commands/profile.ts`, `src/commands/run.ts` +1 |
| `vscode.CancellationToken` | 7 | `src/codelens.ts`, `src/commands/run.ts`, `src/oracleRunner.ts`, `src/quickfix.ts` +2 |
| `vscode.Location` | 7 | `src/results.ts` |
| `vscode.window.showInputBox` | 7 | `src/commands/profile.ts`, `src/commands/scaffold.ts`, `src/config.ts` |
| `vscode.workspace.workspaceFolders` | 7 | `src/commands/run.ts`, `src/commands/scaffold.ts`, `src/discovery.ts`, `src/results.ts` +2 |
| `vscode.Diagnostic` | 6 | `src/compilationDiagnostics.ts`, `src/quickfix.ts` |
| `vscode.Uri.joinPath` | 6 | `src/commands/debug.ts`, `src/commands/run.ts`, `src/commands/scaffold.ts`, `src/commands/script.ts` +2 |
| `vscode.DecorationOptions` | 5 | `src/decorations.ts` |
| `vscode.FileCoverageDetail` | 5 | `src/results.ts`, `src/state.ts`, `src/viewCoverage.ts` |
| `vscode.TextDocument` | 5 | `src/codelens.ts`, `src/commands/scaffold.ts`, `src/languageIdentity.ts`, `src/quickfix.ts` |
| `vscode.workspace` | 5 | `src/config.ts`, `src/connectionProfiles.ts`, `src/languageIdentity.ts` |
| `vscode.CodeActionKind.QuickFix` | 4 | `src/quickfix.ts` |
| `vscode.CodeLens` | 4 | `src/codelens.ts` |
| `vscode.FileType.Directory` | 4 | `src/commands/debug.ts`, `src/commands/script.ts`, `src/discovery.ts` |
| `vscode.languages.registerCodeActionsProvider` | 4 | `src/commands/scaffold.ts`, `src/extension.ts` |
| `vscode.OverviewRulerLane.Right` | 4 | `src/decorations.ts` |
| `vscode.Position` | 4 | `src/results.ts`, `src/viewCoverage.ts` |
| `vscode.TestRun` | 4 | `src/oracleRunner.ts`, `src/results.ts`, `src/viewCoverage.ts` |
| `vscode.window.createTextEditorDecorationType` | 4 | `src/decorations.ts` |
| `vscode.workspace.getConfiguration` | 4 | `src/config.ts`, `src/connectionProfiles.ts` |
| `vscode.CancellationTokenSource` | 3 | `src/commands/run.ts` |
| `vscode.DebugConfiguration` | 3 | `src/debugger.ts` |
| `vscode.DiagnosticSeverity.Error` | 3 | `src/compilationDiagnostics.ts`, `src/quickfix.ts` |
| `vscode.DiagnosticSeverity.Warning` | 3 | `src/quickfix.ts` |
| `vscode.Disposable` | 3 | `src/decorations.ts`, `src/extension.ts`, `src/statusBar.ts` |
| `vscode.OutputChannel` | 3 | `src/commands/run.ts`, `src/commands/script.ts` |
| `vscode.TestMessage` | 3 | `src/results.ts`, `src/runner.ts` |
| `vscode.window.createOutputChannel` | 3 | `src/commands/run.ts`, `src/commands/script.ts`, `src/extension.ts` |
| `vscode.CodeActionKind.Refactor` | 2 | `src/commands/scaffold.ts` |
| `vscode.CodeActionProvider` | 2 | `src/commands/scaffold.ts`, `src/quickfix.ts` |
| `vscode.ConfigurationTarget.Global` | 2 | `src/connectionProfiles.ts` |
| `vscode.DebugAdapterDescriptorFactory` | 2 | `src/commands/debug.ts`, `src/debugger.ts` |
| `vscode.DebugConfigurationProvider` | 2 | `src/commands/debug.ts`, `src/debugger.ts` |
| `vscode.DiagnosticCollection` | 2 | `src/compilationDiagnostics.ts`, `src/quickfix.ts` |
| `vscode.DocumentFilter` | 2 | `src/languageIdentity.ts` |
| `vscode.DocumentSelector` | 2 | `src/commands/scaffold.ts`, `src/languageIdentity.ts` |
| `vscode.env.clipboard` | 2 | `src/commands/connection.ts`, `src/commands/utility.ts` |
| `vscode.env.language` | 2 | `src/config.ts`, `src/connectionProfiles.ts` |
| `vscode.EventEmitter` | 2 | `src/codelens.ts`, `src/debugger.ts` |
| `vscode.FileCoverage.fromDetails` | 2 | `src/results.ts`, `src/viewCoverage.ts` |
| `vscode.FileType` | 2 | `src/commands/debug.ts`, `src/discovery.ts` |
| `vscode.FileType.File` | 2 | `src/commands/debug.ts`, `src/commands/script.ts` |
| `vscode.languages.createDiagnosticCollection` | 2 | `src/compilationDiagnostics.ts`, `src/quickfix.ts` |
| `vscode.Memento` | 2 | `src/state.ts` |
| `vscode.ProgressLocation.Notification` | 2 | `src/commands/run.ts`, `src/commands/script.ts` |
| `vscode.ProviderResult` | 2 | `src/debugger.ts` |
| `vscode.SecretStorage` | 2 | `src/connectionProfiles.ts` |
| `vscode.StatementCoverage` | 2 | `src/results.ts`, `src/viewCoverage.ts` |
| `vscode.StatusBarItem` | 2 | `src/statusBar.ts` |
| `vscode.TestRunProfile` | 2 | `src/state.ts` |
| `vscode.window.createStatusBarItem` | 2 | `src/statusBar.ts` |
| `vscode.window.showSaveDialog` | 2 | `src/commands/run.ts`, `src/coverage.ts` |
| `vscode.window.withProgress` | 2 | `src/commands/run.ts`, `src/commands/script.ts` |
| `vscode.workspace.registerTextDocumentContentProvider` | 2 | `src/dbSourceProvider.ts` |
| `vscode.CodeActionContext` | 1 | `src/quickfix.ts` |
| `vscode.CodeLensProvider` | 1 | `src/codelens.ts` |
| `vscode.debug.registerDebugAdapterDescriptorFactory` | 1 | `src/commands/debug.ts` |
| `vscode.debug.registerDebugConfigurationProvider` | 1 | `src/commands/debug.ts` |
| `vscode.debug.startDebugging` | 1 | `src/debugger.ts` |
| `vscode.DebugAdapter` | 1 | `src/debugger.ts` |
| `vscode.DebugAdapterDescriptor` | 1 | `src/debugger.ts` |
| `vscode.DebugAdapterInlineImplementation` | 1 | `src/debugger.ts` |
| `vscode.DebugSession` | 1 | `src/debugger.ts` |
| `vscode.DeclarationCoverage` | 1 | `src/results.ts` |
| `vscode.DiagnosticSeverity` | 1 | `src/quickfix.ts` |
| `vscode.env.openExternal` | 1 | `src/coverage.ts` |
| `vscode.Event` | 1 | `src/debugger.ts` |
| `vscode.extensions.all` | 1 | `src/languageIdentity.ts` |
| `vscode.FileStat` | 1 | `src/commands/debug.ts` |
| `vscode.languages.registerCodeLensProvider` | 1 | `src/extension.ts` |
| `vscode.MarkdownString` | 1 | `src/decorations.ts` |
| `vscode.open` | 1 | `src/quickfix.ts` |
| `vscode.StatusBarAlignment.Left` | 1 | `src/statusBar.ts` |
| `vscode.StatusBarAlignment.Right` | 1 | `src/statusBar.ts` |
| `vscode.TestRunProfileKind.Coverage` | 1 | `src/extension.ts` |
| `vscode.TestRunProfileKind.Run` | 1 | `src/extension.ts` |
| `vscode.tests.createTestController` | 1 | `src/extension.ts` |
| `vscode.TextDocumentContentProvider` | 1 | `src/dbSourceProvider.ts` |
| `vscode.TextEditor` | 1 | `src/decorations.ts` |
| `vscode.window.onDidChangeActiveTextEditor` | 1 | `src/extension.ts` |
| `vscode.window.showTextDocument` | 1 | `src/commands/scaffold.ts` |
| `vscode.window.visibleTextEditors` | 1 | `src/decorations.ts` |
| `vscode.workspace.asRelativePath` | 1 | `src/commands/scaffold.ts` |
| `vscode.workspace.createFileSystemWatcher` | 1 | `src/extension.ts` |
| `vscode.workspace.findFiles` | 1 | `src/discovery.ts` |
| `vscode.workspace.getWorkspaceFolder` | 1 | `src/commands/debug.ts` |
| `vscode.workspace.onDidChangeConfiguration` | 1 | `src/extension.ts` |
| `vscode.workspace.onDidSaveTextDocument` | 1 | `src/extension.ts` |
| `vscode.workspace.openTextDocument` | 1 | `src/commands/scaffold.ts` |
<!-- brain:auto:end -->

## Relatório completo

`npm run vscode:api` imprime símbolo → `arquivo:linha` (produção). A nota lista
apenas **arquivos** (não linhas) para não sofrer *drift* a cada edição.

```sh
npm run vscode:api            # tabela completa (símbolo -> arquivo:linha)
npm run vscode:api -- --json  # JSON
```

## Riscos

- Usar API acima do piso sem perceber (por isso o pin dos tipos).
- Tipos não capturam **mudança de comportamento** (só assinatura/remoção).
- `.pks` não tem language ID (registro por pattern) — ver
  [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]].

## Upgrade/saída

Subir o piso exige atualizar `engines.vscode` **e** `@types/vscode` juntos
(o `docs-fidelity` falha se ficarem diferentes) e revalidar este inventário.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Componentes]]
- 📐 Regras: [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]]
- 🧩 Código: [[COD - vscode-api-inventory.cjs]] · [[COD - package.json]]
- 🧪 Testes: [[TST - vscodeApiInventory.test.ts]]
- 🔗 [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]] · [[NFR-003 - Compatibilidade com VSCode]]
- ↩️ Referenciada por: [[BR-PLAT-001 - Piso de VS Code e runtime Node do host sao coerentes|BR-PLAT-001]] · [[NFR-003 - Compatibilidade com VSCode|NFR-003]] · [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)|TPL-VSCODE-TEST-API]]
<!-- brain:auto:end -->
