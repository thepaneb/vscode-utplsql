# PRD — Suporte a múltiplos workspace folders

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Análise automatizada |
| Data | 2026-07-02 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.5.0 |
| Arquivos afetados | `src/extension.ts`, `src/runner.ts`, `src/discovery.ts`, `src/config.ts`, `src/coverage.ts` |

## 1. Resumo

Hoje a extensão ignora todos os workspace folders exceto o primeiro
(`workspaceFolders[0]`). Este PRD propõe suporte completo a **múltiplas raízes**:
descoberta, execução e cobertura independentes por folder.

## 2. Contexto e problema

```typescript
const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
```

- Em projetos VSCode com multi-root (ex.: `app/` + `shared/` + `tests/` como
  pastas separadas), apenas a primeira é considerada.
- A descoberta usa `workspace.findFiles` que já opera em todos os folders, mas
  o `root` usado para montar caminhos (`sourcePath`, resolução de arquivos de
  cobertura) é fixo no primeiro.
- A conexão Oracle e as configurações são globais — assumir que servem para
  todos os folders é razoável, mas a execução precisa respeitar o root de cada
  suite.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Descoberta de suites em **todos** os workspace folders.
- Cada suite lembra de qual folder veio (via `TestItem` ou `meta`).
- Ao executar, usar o `root` correto para cada suite (para `sourcePath`,
  `cli.cwd`, resolução de cobertura, etc.).
- Fallback: se o usuário não usa multi-root, comportamento idêntico ao atual.

**Não-objetivos**
- Configurações diferentes por folder (ex.: conexão diferente por folder).
  Seria um PRD separado (profile de settings por folder).
- Interface gráfica para selecionar folder (VSCode já gerencia).

## 4. Requisitos

### RF1 — `ItemMeta` armazena `workspaceFolder`

```typescript
type ItemMeta =
  | { kind: 'suite'; packageName: string; uri: vscode.Uri; folder: vscode.WorkspaceFolder }
  | { kind: 'test'; ...; folder: vscode.WorkspaceFolder };
```

### RF2 — `discoverWorkspace` aceita lista de folders

```typescript
export async function discoverWorkspace(
  patterns: string[],
  folders?: vscode.WorkspaceFolder[]
): Promise<Map<string, SuiteFile[]>> {
  // Se folders undefined, usa workspace.workspaceFolders
  // Retorna Map<folderIndex, SuiteFile[]>
}
```

Ou manter API simples e iterar externamente.

### RF3 — `executeRun` resolve `root` por suite

```typescript
const rootBySuite = new Map<vscode.TestItem, string>();
// Para cada suite, root = workspaceFolder.uri.fsPath
// Usa rootBySuite.get(suite) ao invés de workspaceFolder[0]
```

### RF4 — `resolveSourceUri` por folder

```typescript
resolveSourceUri(file, workspaceRoot, sourcePath, folderRoot?)
// Tenta folderRoot antes de workspaceRoot se fornecido
```

### RF5 — Comportamento inalterado para single-root

Se `workspaceFolders.length === 1`, todo o fluxo é idêntico ao atual (mesmo
caminho de código).

## 5. Solução proposta

### 5.1 Mudanças em `discovery.ts`

```typescript
export interface SuiteFile {
  uri: vscode.Uri;
  packageName: string;
  suiteDescription: string;
  tests: TestProc[];
  folder: vscode.WorkspaceFolder; // NOVO
}

export async function discoverWorkspace(
  patterns: string[],
  folders?: vscode.WorkspaceFolder[]
): Promise<SuiteFile[]> {
  const targets = folders ?? vscode.workspace.workspaceFolders ?? [];
  const results: SuiteFile[] = [];

  for (const folder of targets) {
    const relative = new vscode.RelativePattern(folder, '**/*.pks');
    const uris = await vscode.workspace.findFiles(relative, '**/node_modules/**');
    for (const uri of uris) {
      // ... parseSuite, anexa folder ao SuiteFile ...
    }
  }

  return results;
}
```

### 5.2 Mudanças em `extension.ts`

```typescript
// refresh: passa todos os workspace folders
const folders = vscode.workspace.workspaceFolders;
const suites = await discoverWorkspace(cfg.includePatterns, folders ?? undefined);

// meta.set(suiteItem, { kind:'suite', packageName, uri, folder: suite.folder });

// executeRun:
function getRoot(item: vscode.TestItem): string {
  const m = meta.get(item);
  return m?.folder?.uri?.fsPath ?? workspaceFolders?.[0]?.fsPath ?? '.';
}
```

### 5.3 Mudanças em `coverage.ts`

`resolveSourceUri` recebe parâmetro opcional `folderRoot`:

```typescript
export function resolveSourceUri(
  file: string,
  workspaceRoot: string,
  sourcePath: string,
  folderRoot?: string
): vscode.Uri | undefined {
  const base = folderRoot ?? workspaceRoot;
  const candidates = [
    file,
    path.join(base, file),
    path.join(base, sourcePath, file),
    path.join(base, sourcePath, path.basename(file))
  ];
  // ... mesma lógica ...
}
```

## 6. Configuração

Nenhuma — a extensão detecta automaticamente se há múltiplos folders.

## 7. Plano de testes

- **Unitário**: `resolveSourceUri` com `folderRoot` vs sem — verificar candidatos.
- **Unitário**: `SuiteFile.folder` definido corretamente.
- **Integração**: Abrir workspace com 2+ folders, cada um com suites — ver
  descoberta e execução.
- **Regressão**: Single-root continua funcionando sem mudanças.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Cobertura com caminhos relativos pode não resolver em folder diferente | `resolveSourceUri` com `folderRoot` correto cobre todos os casos |
| Performance: `findFiles` em N folders pode ser Nx mais lento | `discoverWorkspace` em paralelo com `Promise.all` |

## 9. Rollout

- Release 0.5.0 ou posterior: incrementar versão, `CHANGELOG.md`, criar
  **release no GitHub** (o workflow publica automaticamente).
- `CHANGELOG.md`: suporte a múltiplos workspace folders.

## 10. Critérios de aceite

- Suites em qualquer workspace folder são descobertas.
- Execução usa o root do folder correto.
- Cobertura mapeia arquivos dentro do folder de origem.
- Projetos single-root comportam-se exatamente como antes.
