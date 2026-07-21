# PRD-28 — PL/SQL Compilation Diagnostics

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.9.0 |
| Arquivos afetados | `src/compilationDiagnostics.ts` (novo), `src/extension.ts`, `src/runner.ts`, `package.json` |

## 1. Resumo

Após executar testes utPLSQL (que implicitamente compilam os pacotes),
capturar erros de compilação do Oracle (`SHOW ERRORS` / `USER_ERRORS`) e
exibi-los como VSCode Diagnostics no Problems Panel e como sublinhados no
editor. Tanto dbFlux quanto Nexo SQL Studio já oferecem diagnóstico de
compilação; esta funcionalidade fecha o ciclo TDD: editar → compilar/testar →
ver erros no editor → corrigir.

## 2. Contexto e problema

Atualmente, se um pacote de teste tem erro de compilação, o utPLSQL CLI reporta
o erro apenas no Output Panel (documentation reporter) ou como falha genérica
no Test Explorer. O usuário precisa:

1. Ler a mensagem de erro no Output Panel
2. Anotar o número da linha
3. Navegar manualmente até o arquivo e linha

dbFlux resolve isso com a setting `FocusProblemPanelWhenExists` — após
compilar, foca o Problems Panel automaticamente. Nexo SQL Studio tem "live
code validation" que mostra erros em tempo real.

Para o vscode-utplsql, a abordagem mais natural é: após executar testes,
consultar `USER_ERRORS` (ou parsear a saída do `ut_documentation_reporter`)
e criar `vscode.Diagnostic` para cada erro de compilação.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Detectar erros de compilação PL/SQL após execução de testes
- Exibir erros como VSCode Diagnostics (Problems Panel + sublinhados no editor)
- Mapear erros para o arquivo `.pks` ou `.pkb` correto
- Suporte a multi-root (diagnostic associado ao folder correto)
- Desabilitável via setting (`utplsql.compilationDiagnostics.enabled`)

**Não-objetivos**
- Live validation (diagnóstico em tempo real durante edição) — requer conexão
  Oracle persistente, escopo de PRD-11 (streaming)
- Diagnóstico de warnings PL/SQL (apenas erros que impedem execução)
- Compilação independente de testes (só após execução utPLSQL)
- Suporte a outros objetos que não packages (triggers, types, etc.)

## 4. Requisitos

### RF1 — Consulta de erros via CLI

Após `executeRun`, verificar se o stderr contém erros de compilação
(ORA-06550, PLS-00103, etc.) ou executar `utplsql info` com validação.

Abordagem mais confiável: o `ut_documentation_reporter` já emite warnings de
compilação no stdout. A extensão pode parsear essas linhas:

```
WARNING - ORA-24344: success with compilation error
Package B3TR_MIGRATOR compiled with errors
PLS-00201: identifier 'SOME_MISSING' must be declared
```

### RF2 — `src/compilationDiagnostics.ts` (novo)

```typescript
import * as vscode from 'vscode';

interface CompilationError {
  line: number;
  column: number;
  code: string;
  message: string;
  fileUri?: vscode.Uri;
}

export class CompilationDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('utplsql-compilation');
  }

  parseFromOutput(output: string): CompilationError[] {
    const errors: CompilationError[] = [];
    // Regex para padrões Oracle:
    // PLS-00201: identifier 'X' must be declared
    // ORA-06550: line 12, column 5: PLS-00201: ...
    const plsRegex = /^(PLS-\d+):\s*(.+)/gm;
    const oraLineRegex = /ORA-\d+:\s*line\s+(\d+),\s*column\s+(\d+)/i;

    // ... parsing logic ...
    return errors;
  }

  resolveFiles(errors: CompilationError[], state: TestStateManager): void {
    // Mapeia erros para URIs de arquivos .pks/.pkb no workspace
    for (const err of errors) {
      if (!err.fileUri) {
        err.fileUri = findFileForError(err, state);
      }
    }
  }

  apply(errors: CompilationError[]) {
    this.diagnosticCollection.clear();

    const byUri = new Map<string, vscode.Diagnostic[]>();
    for (const err of errors) {
      if (!err.fileUri) continue;
      const key = err.fileUri.toString();
      if (!byUri.has(key)) byUri.set(key, []);

      const range = new vscode.Range(err.line - 1, err.column - 1, err.line - 1, 999);
      const diagnostic = new vscode.Diagnostic(
        range,
        `[${err.code}] ${err.message}`,
        vscode.DiagnosticSeverity.Error,
      );
      diagnostic.source = 'utPLSQL Compilation';
      byUri.get(key)!.push(diagnostic);
    }

    for (const [uri, diagnostics] of byUri) {
      this.diagnosticCollection.set(vscode.Uri.parse(uri), diagnostics);
    }
  }

  clear() {
    this.diagnosticCollection.clear();
  }

  dispose() {
    this.diagnosticCollection.dispose();
  }
}
```

### RF3 — Integração com `runner.ts`

Após `executeRun`:
```typescript
// runner.ts — após parse do output
if (compilationOutput && config.compilationDiagnosticsEnabled) {
  const errors = compilationDiagnostics.parseFromOutput(compilationOutput);
  compilationDiagnostics.resolveFiles(errors, state);
  compilationDiagnostics.apply(errors);
}
```

### RF4 — Setting `utplsql.compilationDiagnostics.enabled`

```json
"utplsql.compilationDiagnostics.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Show PL/SQL compilation errors as VSCode Diagnostics after test execution."
}
```

**Não-funcionais**
- RNF1 — Diagnostics usam `vscode.DiagnosticCollection` nativo, sem dependências.
- RNF2 — Parsing de erros deve ser robusto a variações de locale do Oracle.
- RNF3 — Limpar diagnostics ao iniciar nova execução (evitar erros stale).

## 5. Solução proposta

### 5.1 Fonte de dados

Duas fontes possíveis para detectar erros de compilação:

1. **Output do `ut_documentation_reporter`** (stdout do CLI): o reporter já
   emite warnings de compilação. Vantagem: zero queries extras.
2. **Query `USER_ERRORS`** via `utplsql info` (PRD-09): mais preciso, mas
   requer conexão Oracle adicional.

Recomendação: **parse do stdout** (abordagem 1). Se o output não contiver
erros de compilação, não fazer nada. É simples, não adiciona latência e
cobre a maioria dos casos.

### 5.2 Fluxo

```
executeRun() → CLI executa → stdout/stderr contém erros de compilação
  → parseCompilationErrors() → resolveFiles() → apply()
  → VSCode Problems Panel mostra erros
  → Editor mostra sublinhados vermelhos
```

### 5.3 Limpeza

- Ao iniciar nova execução: `compilationDiagnostics.clear()`
- Ao fechar o workspace: `compilationDiagnostics.dispose()`

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.compilationDiagnostics.enabled` | boolean | `true` | Exibe erros de compilação PL/SQL como VSCode Diagnostics após execução |

## 7. Plano de testes

- **Unitários** (`src/test/unit/compilationDiagnostics.test.ts`):
  - `parseFromOutput`: validar parsing de `PLS-*`, `ORA-06550 line N, column M`
  - `parseFromOutput`: zero erros com output sem problemas
  - `parseFromOutput`: múltiplos erros no mesmo arquivo
  - `apply`: agrupamento correto por URI
- **Integração** (com banco real):
  - Criar package com erro de compilação → executar testes → ver diagnostics
  - Corrigir erro → executar novamente → diagnostics desaparecem
- **Manual**:
  - Erro de sintaxe → sublinhado vermelho no editor
  - Problems Panel mostra erros com source "utPLSQL Compilation"
  - Nova execução limpa diagnostics antigos

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Formato do output varia entre versões do Oracle/utPLSQL | Regex flexível com múltiplos padrões; fallback: não mostrar diagnostics |
| Erros em objetos que não têm arquivo local (ex.: packages do sistema) | `resolveFiles` só mapeia arquivos no workspace; resto é ignorado |
| Muitos erros poluem o Problems Panel | Diagnostics são agrupados por arquivo; o VSCode colapsa arquivos automaticamente |
| Parsing confunde warnings com erros | Filtrar apenas `PLS-*` e `ORA-*` de erro; ignorar `SP2-*`, `PLS-00000` |

## 9. Rollout

- Release 0.9.0 (minor) — nova funcionalidade
- Habilitado por default
- CHANGELOG: "Compilation diagnostics: erros PL/SQL detectados durante execução
  de testes são exibidos como sublinhados no editor e no Problems Panel"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- Erros de compilação no pacote de teste → sublinhados no `.pks`/`.pkb`
- Problems Panel mostra erros com source "utPLSQL Compilation"
- Clique no erro no Problems Panel → navega para linha correta no editor
- Testes sem erros de compilação → sem diagnostics
- Nova execução limpa diagnostics anteriores
- `utplsql.compilationDiagnostics.enabled: false` desabilita tudo

## 11. Questões em aberto

- Suporte a warnings? (PLS-* de nível warning, ex.: PLW-06009)
  — Recomendação: configurável via setting adicional (`compilationDiagnostics.severity`).
- Como mapear erros do corpo do package (`.pkb`) quando o teste executa
  pela spec (`.pks`)? — `resolveFiles` precisa conhecer a relação spec/body.
- Interação com PRD-11 (streaming): com Oracle direto, pode-se query
  `USER_ERRORS` em tempo real — mais preciso que parse de stdout.
