# PRD-24 — CodeLens Integration

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.8.0 |
| Arquivos afetados | `src/extension.ts`, `src/runner.ts`, `src/state.ts`, `src/suiteParser.ts`, `package.json` |

## 1. Resumo

Adicionar botões CodeLens "Run" e "Run with Coverage" acima de cada anotação
`%suite` e `%test` em arquivos `.pks`, permitindo executar suites/testes
diretamente do editor, sem precisar navegar no Test Explorer ou usar a paleta
de comandos. Toda extensão de teste popular (Jest, Python, Go, Java, Test
Explorer UI) oferece CodeLens — sua ausência é a maior barreira de
discoverability do vscode-utplsql.

## 2. Contexto e problema

Atualmente o usuário só consegue executar testes de 3 formas:
1. Clicar no ícone ▶ do Test Explorer (não visível se o painel estiver fechado)
2. Usar a paleta de comandos (`utplsql.runAll`, `utplsql.runFile`, etc.)
3. Menu de contexto no Explorer (botão direito no arquivo `.pks`)

Nenhuma dessas formas oferece execução _inline_ no editor. Quando o usuário está
lendo um arquivo `.pks` e vê um `%suite` ou `%test`, a ação natural seria clicar
em um botão ao lado para executar aquele teste específico. dbFlux resolve isso
com keybindings (`Alt+Shift+T` para o package atual). Nexo SQL Studio tem
integração com Test Explorer mas também não tem CodeLens.

## 3. Objetivos / Não-objetivos

**Objetivos**
- CodeLens "▶ Run" e "▶ Run with Coverage" sobre cada `%suite`
- CodeLens "▶ Run" e "▶ Run with Coverage" sobre cada `%test`
- Suporte a multi-root workspace (cada lens executa no contexto do folder correto)
- Atualização dos lenses após execução (refrescar status)
- Configuração para desabilitar CodeLens (`utplsql.codeLens.enabled`)

**Não-objetivos**
- CodeLens "Debug" (depende de PRD-33 — PL/SQL Debugger)
- CodeLens em arquivos `.pkb` (testes são definidos na spec)
- CodeLens em outros tipos de anotação utPLSQL (`%beforeall`, `%context`, etc.)

## 4. Requisitos

### RF1 — CodeLens provider registrado

```typescript
// src/codelens.ts (novo)
class UtplsqlCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
    // Parseia o documento em busca de %suite e %test
    // Retorna array de CodeLens com comandos run/runCoverage
  }

  resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens {
    // Adiciona tooltip com nome da suite/teste
  }
}
```

Registro em `extension.ts`:
```typescript
const codeLensProvider = new UtplsqlCodeLensProvider(state);
context.subscriptions.push(
  vscode.languages.registerCodeLensProvider(
    { language: 'plsql', pattern: '**/*.pks' },
    codeLensProvider
  )
);
```

### RF2 — CodeLens para `%suite`

Cada linha contendo `%suite(<descrição>)` recebe dois CodeLens:

- `▶ Run Suite` — executa `-p=<packageName>` via `runner.ts`
- `▶ Run Suite with Coverage` — idem, com profile Coverage

O comando invocado é registrado em `package.json`:
```json
"commands": [
  {
    "command": "utplsql.runLens",
    "title": "Run Lens",
    "arguments": [
      { "type": "suite", "packageName": "...", "folder": "..." }
    ]
  }
]
```

### RF3 — CodeLens para `%test`

Cada linha contendo `%test(<descrição>)` recebe dois CodeLens:

- `▶ Run Test` — executa `-p=<packageName>.<procName>`
- `▶ Run Test with Coverage` — idem, com coverage

O `procName` é extraído da procedure imediatamente após o `%test`.

### RF4 — Setting `utplsql.codeLens.enabled`

```json
"utplsql.codeLens.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Show Run/Run with Coverage CodeLens above %suite and %test annotations."
}
```

### RF5 — Atualização dos lenses

Após cada execução de testes, `_onDidChangeCodeLenses.fire()` é chamado para
forçar o VSCode a re-consultar o provider. Isso garante que o estado visual
reflita a última execução.

**Não-funcionais**
- RNF1 — Parsing do documento deve ser O(n) e cacheado por versão do documento
  (`document.version`).
- RNF2 — CodeLens não deve bloquear a thread principal (regex leve, sem I/O).
- RNF3 — Lenses devem ser registrados apenas para `**/*.pks` para evitar
  consumo desnecessário em arquivos não relacionados.

## 5. Solução proposta

### 5.1 `src/codelens.ts` (novo módulo puro)

O módulo é dividido em duas partes:

1. **Parsing** (puro, sem `vscode`): `parseCodeLensItems(text: string, uri: string)` →
   `Array<{ line: number; type: 'suite' | 'test'; name: string; packageName: string; procName?: string }>`
2. **Provider** (depende de `vscode`): implementa `CodeLensProvider`, usa o
   parser para gerar lenses.

```typescript
import * as vscode from 'vscode';
import { TestStateManager } from './state';

const SUITE_REGEX = /^--%suite\s*\(\s*(.+?)\s*\)/im;
const TEST_REGEX = /^--%test\s*\(\s*(.+?)\s*\)/im;
const PROCEDURE_REGEX = /procedure\s+(\w+)/i;

export function parseCodeLensItems(
  text: string,
  uri: vscode.Uri,
  packageName: string
): CodeLensItem[] {
  const lines = text.split('\n');
  const items: CodeLensItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const suiteMatch = SUITE_REGEX.exec(lines[i]);
    if (suiteMatch) {
      items.push({
        line: i,
        type: 'suite',
        description: suiteMatch[1].trim(),
        packageName,
      });
      continue;
    }

    const testMatch = TEST_REGEX.exec(lines[i]);
    if (testMatch) {
      const procName = findProcedureName(lines, i);
      if (procName) {
        items.push({
          line: i,
          type: 'test',
          description: testMatch[1].trim(),
          packageName,
          procName,
        });
      }
    }
  }

  return items;
}

function findProcedureName(lines: string[], startLine: number): string | null {
  for (let i = startLine + 1; i < lines.length; i++) {
    const m = PROCEDURE_REGEX.exec(lines[i]);
    if (m) return m[1];
    if (/^--%/.test(lines[i])) return null; // próxima anotação, sem procedure
  }
  return null;
}
```

### 5.2 Comando `utplsql.runLens`

Registrado em `extension.ts`, recebe os argumentos do CodeLens e chama
`runForUri` ou `runForUri` com `runSingleTest`:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('utplsql.runLens', async (args: {
    type: 'suite' | 'test';
    packageName: string;
    procName?: string;
    folder?: string;
    coverage?: boolean;
  }) => {
    const uri = findUriForPackage(args.packageName, state, args.folder);
    if (!uri) return;

    if (args.type === 'test' && args.procName) {
      await runSingleTest(uri, args.packageName, args.procName, args.coverage, state);
    } else {
      await runForUri(uri, args.coverage);
    }
  })
);
```

### 5.3 `package.json` — contributes.commands

```json
{
  "command": "utplsql.runLens",
  "title": "%utplsql.commands.runLens.title%",
  "category": "utPLSQL"
}
```

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.codeLens.enabled` | boolean | `true` | Exibe botões CodeLens Run/Run with Coverage sobre `%suite` e `%test` |

## 7. Plano de testes

- **Unitários** (`src/test/unit/codelens.test.ts`):
  - Testar `parseCodeLensItems` com conteúdo de `.pks` completo:
    - Detecta `%suite` com descrição correta
    - Detecta `%test` + procedure name correta
    - Ignora arquivos sem anotações
    - Trata `%suite` sem `%test` (suite sem testes)
    - Trata `%test` sem procedure (ignora)
  - Testar `findProcedureName` com vários layouts de código
- **Integração**:
  - Verificar que lenses aparecem ao abrir `.pks` com anotações utPLSQL
  - Verificar que lenses NÃO aparecem em `.pks` sem anotações
  - Verificar que lenses NÃO aparecem em `.pkb`
- **Manual**:
  - Clicar "Run Suite" → executa corretamente
  - Clicar "Run Test" → executa apenas o teste específico
  - Clicar "Run with Coverage" → executa com cobertura
  - Toggle setting `utplsql.codeLens.enabled` → lenses somem/reaparecem

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Parsing incorreto de `%suite`/`%test` com descrições complexas (parênteses aninhados) | Usar regex simples com `(.+?)` para capturar até o `)` mais próximo; documentar limitação |
| Performance: re-parsing a cada keystroke | Cache por `document.version`; invalidar no `onDidChangeTextDocument` |
| Múltiplos providers CodeLens podem colidir (outras extensões PL/SQL) | CodeLens é aditivo; VSCode mescla lenses de múltiplos providers no mesmo documento |
| `procName` não encontrado (procedure depois de comentários/blocos) | `findProcedureName` avança até achar `procedure` ou próxima anotação `%` |

## 9. Rollout

- Release 0.8.0 (minor) — nova funcionalidade de UX
- Habilitado por default (`utplsql.codeLens.enabled = true`)
- CHANGELOG: "CodeLens: botões Run/Run with Coverage sobre %suite e %test no editor"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- CodeLens aparece em arquivos `.pks` com anotações utPLSQL
- CodeLens NÃO aparece em `.pkb` ou `.pks` sem anotações
- Clicar "Run Suite" executa o pacote de testes correto
- Clicar "Run Test" executa apenas o procedimento específico
- Setting `utplsql.codeLens.enabled: false` remove todos os lenses
- Multi-root: lenses em arquivos de folders diferentes funcionam corretamente

## 11. Questões em aberto

- Vale a pena mostrar duração da última execução no CodeLens? (ex: "▶ Run Suite (1.2s)")
- Como exibir status da última execução no CodeLens? (ícone check/X)
  — Depende de PRD-26 (Inline decorations)
- Interação com PRD-29 (Jump to failure): o CodeLens poderia ter um terceiro
  botão "Go to failure" quando há testes falhando?
