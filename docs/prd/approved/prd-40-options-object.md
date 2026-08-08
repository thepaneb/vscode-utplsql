# PRD-40 — Refatorar executeRunOracle: Long Parameter List → Options Object

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber |
| Data | 2026-08-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.10.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/runner.ts` |

## 1. Resumo

Substituir os 11 parâmetros posicionais de `executeRunOracle` por um objeto de opções tipado (`OracleRunOptions`), eliminando os smells "Long Parameter List" e "Data Clumps" e melhorando a legibilidade e extensibilidade da API.

## 2. Contexto e problema

A skill `code-review` identifica "Long Parameter List" e "Data Clumps" como smells de código. `executeRunOracle` (oracleRunner.ts:47-65) tem 11 parâmetros posicionais:

```typescript
export async function executeRunOracle(
  connection: string,       // config de conexão
  pathArgs: string[],        // seleção de testes
  coverage: boolean,         // ─┐
  sourcePath: string,        //  ├─ Data Clump: cobertura
  root: string,              // ─┘
  run: vscode.TestRun,       // ─┐
  state: TestStateManager,   // ─┼─ Data Clump: VSCode state
  leafTests: vscode.TestItem[], // ─┘
  token: vscode.CancellationToken,
  onComplete?: (...) => void,
  folders?: readonly vscode.WorkspaceFolder[],
): Promise<void>
```

Grupos de parâmetros que viajam juntos ("Data Clumps"):
- `(coverage, sourcePath, root)` — configuração de cobertura
- `(run, state)` — estado e output VSCode
- `(connection, pathArgs, leafTests)` — seleção do que executar

Além da assinatura longa, qualquer adição futura (ex: timeout customizado, reporter adicional) forçaria mudança na assinatura e em todos os call sites.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Criar `OracleRunOptions` interface com todas as propriedades
- Refatorar `executeRunOracle` para `executeRunOracle(options, token)`
- Atualizar o call site em `runner.ts`
- Agrupar Data Clumps em sub-interfaces (opcional, fase 2)

**Não-objetivos**
- Não refatora `executeRun` (CLI) neste PRD
- Não altera lógica de execução
- Não introduz breaking changes na API pública

## 4. Requisitos

### RF1 — Interface `OracleRunOptions`

Todas as propriedades atuais viram campos da interface, com tipos explícitos e documentação JSDoc.

### RF2 — Nova assinatura

```typescript
export async function executeRunOracle(
  options: OracleRunOptions,
  token: vscode.CancellationToken,
): Promise<void>
```

### RF3 — Call site

`runner.ts` constrói `OracleRunOptions` e passa para `executeRunOracle`.

### RF4 — Parâmetros opcionais

`onComplete` e `folders` permanecem opcionais (`?`).

**Não-funcionais**
- RNF1 — A desestruturação no início da função preserva os nomes atuais das variáveis locais

## 5. Solução proposta

### 5.1 Interface (oracleRunner.ts)

```typescript
export interface OracleRunOptions {
  /** Connection string (user/pass@//host:port/service) */
  connection: string;
  /** Path args para ut_runner.run (ex: ['package', 'package.proc']) */
  pathArgs: string[];
  /** Se true, coleta e aplica cobertura Cobertura */
  coverage: boolean;
  /** Caminho base do código-fonte para mapeamento de cobertura */
  sourcePath: string;
  /** fsPath do workspace folder raiz */
  root: string;
  /** TestRun atual do VSCode */
  run: vscode.TestRun;
  /** TestItems leaf (suites ou tests individuais) a executar */
  leafTests: vscode.TestItem[];
  /** State manager compartilhado */
  state: TestStateManager;
  /** Callback opcional ao finalizar com contagem de resultados */
  onComplete?: (passed: number, failed: number, skipped: number, errored: number, durationMs: number) => void;
  /** Workspace folders para resolução de sourceUri */
  folders?: readonly vscode.WorkspaceFolder[];
}
```

### 5.2 Uso (runner.ts)

```typescript
const oracleOpts: OracleRunOptions = {
  connection,
  pathArgs: [...pathArgs],
  coverage,
  sourcePath: cfg.sourcePath,
  root,
  run,
  leafTests,
  state,
  onComplete,
  folders,
};
await executeRunOracle(oracleOpts, token);
```

## 6. Configuração

Nenhuma nova setting.

## 7. Plano de testes

- **Unitários**: `oracleRunner.test.ts` — atualizar chamadas para `executeRunOracle(opts, token)`
- **Unitários**: `runner.test.ts` — verificar que call site compila com a nova assinatura
- **Regressão**: `node --test out/test/unit/**/*.test.js`

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Parâmetros opcionais desestruturados sem default | `onComplete` e `folders` já eram opcionais. Adicionar `= undefined` na desestruturação. |
| `folders` poderia ser derivado internamente | Manter como parâmetro por enquanto. `vscode.workspace.workspaceFolders` pode mudar entre chamadas. |
| Mudança de assinatura quebra testes de integração | Apenas `oracleRunner.test.ts` e `runner.test.ts` referenciam a função. Atualizar ambos. |

## 9. Rollout

- Versão alvo: `0.10.0` (minor)
- Breaking change: nenhum (API interna)
- Pode ser feito junto com PRD-39 (deduplicação) — mesmos arquivos

## 10. Critérios de aceite

- [ ] `OracleRunOptions` interface exportada com JSDoc
- [ ] `executeRunOracle` aceita 2 parâmetros (`options` + `token`)
- [ ] `runner.ts` constrói `OracleRunOptions` e passa como objeto
- [ ] Nomes de variáveis locais preservados na desestruturação
- [ ] `npm run compile && npm run lint && node --test` passam

## 11. Questões em aberto

- Sub-interfaces para Data Clumps (`CoverageConfig`, `RunContext`) devem ser criadas neste PRD ou em follow-up?
- `folders` pode ser derivado de `vscode.workspace.workspaceFolders` dentro da função para eliminar o parâmetro?
