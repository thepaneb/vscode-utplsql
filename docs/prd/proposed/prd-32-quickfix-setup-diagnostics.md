# PRD-32 — Quick-Fix Setup Diagnostics

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.9.0 |
| Arquivos afetados | `src/quickfix.ts` (novo), `src/extension.ts`, `src/config.ts`, `src/runner.ts`, `package.json` |

## 1. Resumo

Detectar proativamente problemas comuns de configuração (CLI ausente, conexão
inválida, grants Oracle faltando, versão utPLSQL incompatível) e oferecer
ações corretivas (quick-fix) via notificações, Code Actions e diagnósticos no
Problems Panel. Extensões como Jest e Java Test Runner implementam quick-fix
diagnostics para reduzir o atrito de first-run e erros de configuração.

## 2. Contexto e problema

Atualmente, erros de configuração resultam em falhas silenciosas ou mensagens
genéricas no Output Panel. Exemplos comuns:

1. **CLI não encontrado**: `utplsql` não está no PATH → erro "command not found"
2. **Conexão inválida**: string de conexão errada → CLI falha sem mensagem clara
3. **Grants faltando**: `ORA-01031: insufficient privileges` ou cobertura não
   funciona sem `DBMS_PROFILER`
4. **Versão incompatível**: utPLSQL < 3.1.0 → cobertura não funciona
5. **Java não encontrado** (modo `java`): `java` não está no PATH

O usuário iniciante enfrenta essas barreiras sem orientação. O Jest oferece
quick-fix chooser para setup errors com botões "Fix" e "Learn more". Java
Test Runner mostra "Configure Java Runtime" quando o JDK não é encontrado.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Validar configuração ao iniciar a extensão e antes de cada execução
- Detectar CLI ausente e oferecer ação "Configure utplsql.cliPath"
- Detectar conexão inválida e oferecer ação "Reconfigure connection"
- Detectar grants faltando e mostrar instruções específicas
- Detectar versão incompatível e sugerir upgrade
- Exibir diagnósticos como `vscode.Diagnostic` no Problems Panel
- Oferecer Code Actions (quick-fix) quando possível

**Não-objetivos**
- Verificação proativa em tempo real (só na ativação e pré-execução)
- Correção automática de problemas (só sugestões e links)
- Diagnóstico de performance (ex.: timeout muito baixo para o ambiente)
- Wizard de configuração interativo (pode ser feature futura)

## 4. Requisitos

### RF1 — Validação na ativação da extensão

```typescript
// src/quickfix.ts (novo)
export class SetupValidator {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('utplsql-setup');
  }

  async validateOnActivation(): Promise<SetupDiagnostic[]> {
    const diagnostics: SetupDiagnostic[] = [];

    // 1. Verificar CLI
    const cliPath = getCliPath();
    if (!await fileExists(cliPath)) {
      diagnostics.push({
        code: 'UTPLSQL_NO_CLI',
        severity: vscode.DiagnosticSeverity.Error,
        message: `utPLSQL CLI not found at "${cliPath}"`,
        quickFix: {
          title: 'Configure utplsql.cliPath',
          command: 'utplsql.configureCliPath',
        },
        helpUrl: 'https://github.com/utPLSQL/utPLSQL-cli#installation',
      });
    }

    // 2. Verificar conexão (se configurada)
    const connection = getConnection();
    if (connection && cliExists) {
      const info = await validateConnection(connection, cliPath);
      if (!info.valid) {
        diagnostics.push({
          code: 'UTPLSQL_BAD_CONN',
          severity: vscode.DiagnosticSeverity.Error,
          message: `Cannot connect to database: ${info.error}`,
          quickFix: {
            title: 'Reconfigure connection',
            command: 'utplsql.configureConnection',
          },
        });
      } else if (info.dbVersion && semverLt(info.dbVersion, '3.1.0')) {
        diagnostics.push({
          code: 'UTPLSQL_OLD_VERSION',
          severity: vscode.DiagnosticSeverity.Warning,
          message: `utPLSQL database version ${info.dbVersion} is older than 3.1.0. Coverage may not work.`,
          quickFix: {
            title: 'How to upgrade utPLSQL',
            command: 'vscode.open',
            arguments: [vscode.Uri.parse('https://github.com/utPLSQL/utPLSQL/releases')],
          },
        });
      }
    }

    return diagnostics;
  }

  applyDiagnostics(diagnostics: SetupDiagnostic[]) {
    // Agrupa por severity e mostra no Problems Panel
    // (usando um arquivo virtual de configuração como "target")
  }
}
```

### RF2 — Validação pré-execução

Antes de `executeRun`:

```typescript
// runner.ts — executeRun()
const preflightErrors = await setupValidator.validateBeforeRun(connection, cliPath);
if (preflightErrors.length > 0) {
  for (const err of preflightErrors) {
    if (err.code === 'UTPLSQL_NO_CLI') {
      const action = await vscode.window.showErrorMessage(
        err.message,
        err.quickFix!.title,
        'Run Anyway',
      );
      if (action !== 'Run Anyway') return;
    }
  }
}
```

### RF3 — Detecção de grants faltando

Após execução com falha de cobertura (padrão já detectado em `runner.ts`),
adicionar diagnóstico específico:

```typescript
if (coverageEnabled && coverageFiles.length === 0) {
  diagnostics.push({
    code: 'UTPLSQL_NO_COVERAGE',
    severity: vscode.DiagnosticSeverity.Warning,
    message: 'Coverage report not generated. Ensure the following grants are in place:',
    details: [
      'GRANT EXECUTE ON SYS.DBMS_PROFILER TO <your_schema>;',
      'GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <your_schema>;',
    ],
    quickFix: {
      title: 'Copy grants to clipboard',
      command: 'utplsql.copyGrantsToClipboard',
      arguments: [coverageGrants],
    },
  });
}
```

### RF4 — Code Actions (quick-fix)

```typescript
// src/quickfix.ts
class UtplsqlCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'utPLSQL Setup') continue;

      // Cada diagnostic tem um quickFix associado
      const fix = diagnostic.quickFix;
      if (fix) {
        const action = new vscode.CodeAction(fix.title, vscode.CodeActionKind.QuickFix);
        action.command = {
          command: fix.command,
          title: fix.title,
          arguments: fix.arguments,
        };
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    return actions;
  }
}
```

### RF5 — Comandos auxiliares

| Comando | Descrição |
|---|---|
| `utplsql.configureCliPath` | Abre settings em `utplsql.cliPath` |
| `utplsql.configureConnection` | Abre settings em `utplsql.connection` ou mostra input box |
| `utplsql.copyGrantsToClipboard` | Copia grants SQL para clipboard |
| `utplsql.validateSetup` | Roda validação completa e mostra resultados |

**Não-funcionais**
- RNF1 — Validação de conexão não armazena ou loga a string de conexão.
- RNF2 — Validação pré-execução deve ser rápida (< 2s) para não atrasar runs.
  Usar `utplsql info` (PRD-09) que já é otimizado.
- RNF3 — Diagnostics de setup são exibidos no Problems Panel como source
  "utPLSQL Setup".

## 5. Solução proposta

### 5.1 `src/quickfix.ts`

Novo módulo vscode-dependente contendo:
- `SetupValidator`: validação proativa (ativação + pré-run)
- `UtplsqlCodeActionProvider`: quick-fix via Code Actions
- `SetupDiagnostic`: interface com `code`, `severity`, `message`, `quickFix`, `helpUrl`

### 5.2 Fluxo

```
ativação da extensão
  → validateOnActivation()
  → aplicar diagnostics no Problems Panel
  → usuário vê problemas e clica em quick-fix

pré-execução (executeRun)
  → validateBeforeRun()
  → se erro crítico (sem CLI, sem conexão): mostrar dialog com ações
  → se warning (grants, versão): mostrar output + diagnostic

pós-execução (applyResults)
  → se cobertura falhou: adicionar diagnostic com grants
  → se todos os testes deram erro de compilação: sugerir PRD-28 (diagnostics)
```

### 5.3 Integração com PRD-09 (utplsql info)

Reusar `cliInfo.ts` para validação de conexão e versão. Se `utplsql info`
falhar, o próprio módulo já reporta — o quickfix só encapsula em diagnostics.

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.setupDiagnostics.enabled` | boolean | `true` | Exibe diagnósticos de configuração no Problems Panel |

## 7. Plano de testes

- **Unitários** (`src/test/unit/quickfix.test.ts`):
  - `SetupValidator.validateOnActivation`: CLI não encontrado → diagnostic UTPLSQL_NO_CLI
  - `SetupValidator.validateOnActivation`: conexão inválida → diagnostic UTPLSQL_BAD_CONN
  - `SetupValidator.validateOnActivation`: versão < 3.1.0 → diagnostic UTPLSQL_OLD_VERSION
  - `validateBeforeRun` retorna array vazio quando tudo OK
- **Integração**:
  - Remover `utplsql` do PATH → diagnostic no Problems Panel
  - Configurar conexão inválida → dialog de erro com opção "Reconfigure"
  - Executar sem grants de cobertura → diagnostic com instruções
- **Manual**:
  - Clicar quick-fix "Configure utplsql.cliPath" → abre settings
  - Clicar "Copy grants to clipboard" → grants copiados
  - Problems Panel mostra source "utPLSQL Setup" para diagnostics

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Validação de conexão pode expor senha em logs | Usar `resolveConnection` que já protege; nunca logar connection string |
| `validateOnActivation` pode ser lento com conexão Oracle remota | Timeout de 5s; se falhar, assumir que é problema de rede — não mostrar falso positivo |
| Múltiplos problemas simultâneos podem sobrecarregar o usuário com notificações | Agrupar diagnostics no Problems Panel; mostrar no máximo 1 dialog por categoria de erro |
| Falsos positivos (ex.: CLI existe mas não é executável) | Verificar `fs.accessSync(cliPath, fs.constants.X_OK)` |

## 9. Rollout

- Release 0.9.0 (minor) — melhoria de first-run experience
- Habilitado por default
- CHANGELOG: "Setup diagnostics: validação proativa de CLI, conexão, grants e
  versão com quick-fix actions no Problems Panel"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- Sem CLI → diagnostic UTPLSQL_NO_CLI no Problems Panel
- Conexão inválida → dialog com ação "Reconfigure connection"
- Versão utPLSQL < 3.1.0 → warning visível
- Cobertura falha por grants → diagnostic com instruções SQL
- Quick-fix "Configure utplsql.cliPath" abre settings.json
- Quick-fix "Copy grants to clipboard" funciona
- `utplsql.setupDiagnostics.enabled: false` desabilita tudo

## 11. Questões em aberto

- Periodicidade: re-validar a cada execução, a cada ativação do workspace,
  ou ambos? — Ambos: ativação completa + pré-execução leve.
- Suporte a i18n das mensagens de erro? — Escopo futuro; inicialmente inglês.
- Diagnostic de "Java não encontrado" quando modo é `java` e `java` não está
  no PATH? — Sim, adicionar como parte da validação de CLI no modo java.
