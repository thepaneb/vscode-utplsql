# PRD — Reporters dinâmicos com `utplsql reporters`

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-03 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.6.0 |
| Arquivos afetados | `src/cliReporters.ts` (novo), `src/extension.ts`, `src/runner.ts`, `package.json`, `README.md` |

## 1. Resumo

Usar o sub-command `reporters` do utPLSQL-cli (classe `org.utplsql.cli.Cli`) para listar dinamicamente os reporters disponíveis no banco. Isso permite validar se `ut_coverage_cobertura_reporter` existe antes de rodar cobertura, e oferecer ao usuário um QuickPick para selecionar reporters adicionais — inclusive custom reporters PL/SQL.

## 2. Contexto e problema

- Hoje a extensão **hardcoda** três reporters: `ut_documentation_reporter`, `ut_junit_reporter` e `ut_coverage_cobertura_reporter`.
- Quando o banco não tem o reporter de cobertura (ex.: utPLSQL < 3.1.0 sem o pacote instalado), a cobertura falha silenciosamente: o CLI não gera o XML e a extensão mostra "relatório não gerado — verifique GRANT EXECUTE ON SYS.DBMS_PROFILER". A mensagem é genérica e não ajuda.
- Usuários com **custom reporters** PL/SQL não conseguem usá-los pela extensão — só via `extraRunArgs`.
- O CLI expõe o comando `utplsql reporters <connection>` que consulta `ut_reporter` e lista todos os reporters disponíveis, incluindo custom.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Criar módulo `cliReporters.ts` (puro) com `parseReportersOutput()` e `listReporters()`.
- Validar antes de rodar com cobertura se `ut_coverage_cobertura_reporter` existe; se não, emitir warning claro e pular a flag de cobertura.
- Comando `utplsql.selectReporter` com QuickPick dos reporters disponíveis; o selecionado é passado como `-f=<reporter>` adicional.
- Nova setting `utplsql.additionalReporters` (array de strings) para reporters extras fixos sem QuickPick a cada execução.

**Não-objetivos**
- Alterar os três reporters padrão (documentation + junit + cobertura) — continuam obrigatórios.
- Remover suporte a reporters que não aparecem na lista (ex.: futuros).
- Fazer cache da lista de reporters (a lista pode mudar entre deploys).

## 4. Requisitos

### RF1 — `parseReportersOutput(stdout)`

```typescript
// src/cliReporters.ts (puro)
export function parseReportersOutput(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('['));
}

// Exemplo de saída esperada:
//
// UT_DOCUMENTATION_REPORTER
// UT_JUNIT_REPORTER
// UT_COVERAGE_COBERTURA_REPORTER
// UT_COVERAGE_HTML_REPORTER
// MY_CUSTOM_REPORTER
```

### RF2 — `listReporters(cfg, conn)`

```typescript
export async function listReporters(
  cfg: InvocationConfig,
  conn: string
): Promise<string[] | { error: string }> {
  const args = ['reporters', conn];
  const inv = buildInvocation(cfg, args);
  if (isInvocationError(inv)) return { error: inv.error };
  const result = await runCli(inv.file, inv.args, inv.shell, process.cwd(), dummyToken);
  if (result.code !== 0) return { error: result.stderr || 'reporters command failed' };
  return parseReportersOutput(result.stdout);
}
```

### RF3 — Validação de cobertura

Em `runner.ts`, antes de adicionar `-f=ut_coverage_cobertura_reporter`:

```typescript
if (coverage) {
  const reporters = await listReporters(cfg, connection);
  if ('error' in reporters) {
    run.appendOutput(`[aviso] Não foi possível listar reporters: ${reporters.error}\r\n`);
    run.appendOutput('[aviso] Continuando sem cobertura.\r\n');
  } else if (!reporters.some(r => r.toUpperCase() === 'UT_COVERAGE_COBERTURA_REPORTER')) {
    run.appendOutput(
      '\r\n[aviso] Reporter UT_COVERAGE_COBERTURA_REPORTER não disponível no banco.\r\n' +
      'Cobertura desabilitada. Verifique se o pacote utPLSQL está atualizado.\r\n'
    );
  } else {
    // adiciona flags de cobertura (comportamento atual)
    args.push('-f=ut_coverage_cobertura_reporter', `-o=${coveragePath}`);
    args.push(`-source_path=${cfg.sourcePath}`);
    // ...
  }
}
```

### RF4 — Setting `utplsql.additionalReporters`

```typescript
// package.json
"utplsql.additionalReporters": {
  "type": "array",
  "items": { "type": "string" },
  "default": [],
  "description": "Reporters adicionais para incluir em toda execução (ex.: [\"ut_coverage_html_reporter\"]). Os reporters padrão (documentation, junit e cobertura) são sempre incluídos."
}
```

Em `runner.ts`:
```typescript
for (const r of cfg.additionalReporters) {
  args.push('-f=' + r);
}
```

### RF5 — Comando `utplsql.selectReporter`

QuickPick com os reporters disponíveis. O selecionado é adicionado como reporter adicional **apenas na execução atual** (não persiste).

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('utplsql.selectReporter', async () => {
    const conn = await resolveConnection();
    if (!conn) return;
    const cfg = readConfig();
    const reporters = await listReporters(cfg, conn);
    if ('error' in reporters) {
      vscode.window.showErrorMessage(`Falha ao listar reporters: ${reporters.error}`);
      return;
    }
    const selected = await vscode.window.showQuickPick(reporters, {
      placeHolder: 'Selecione um reporter adicional para esta execução'
    });
    if (selected) {
      // Armazena em estado volátil para a próxima execução
      state.setExtraReporter(selected);
      vscode.window.showInformationMessage(`Reporter "${selected}" será usado na próxima execução.`);
    }
  })
);
```

**Não-funcionais**
- RNF1 — `parseReportersOutput` é função pura.
- RNF2 — Validação de cobertura nunca bloqueia execução — se falhar, pula cobertura com warning.
- RNF3 — `additionalReporters` não duplica reporters já inclusos (validação simples).

## 5. Solução proposta

### 5.1 `src/cliReporters.ts` (novo, puro)

Contém `parseReportersOutput()` e `listReporters()`, análogo a `cliInfo.ts`.

### 5.2 `src/runner.ts`

- Adicionar `additionalReporters` ao `UtConfig`.
- Bloco de validação de cobertura com fallback.
- Loop de `additionalReporters` ao montar args.

### 5.3 `src/extension.ts`

Registrar comando `utplsql.selectReporter`. O reporter selecionado é guardado no `state` (classe `TestStateManager` ou similar) para ser consumido na próxima execução.

### 5.4 `src/state.ts`

Adicionar campo opcional `extraReporter?: string` + getter/setter.

### 5.5 `package.json`

```json
{
  "command": "utplsql.selectReporter",
  "title": "Selecionar reporter adicional...",
  "category": "utPLSQL"
}
```

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.additionalReporters` | string[] | `[]` | Reporters extras incluídos em toda execução |

Novo comando: `utPLSQL: Selecionar reporter adicional...`

## 7. Plano de testes

- **Unitários** (`src/test/unit/cliReporters.test.ts`):
  - `parseReportersOutput` com lista completa, vazia, com linhas comentadas.
- **Unitários** (`src/test/unit/runner.test.ts`):
  - Mock `listReporters` retornando lista sem cobertura → args não contêm `-f=ut_coverage_cobertura_reporter`.
  - Mock `listReporters` retornando erro → cobertura pulada com warning.
  - `additionalReporters` vazio vs. preenchido.
- **Manual**:
  - `utPLSQL: Selecionar reporter adicional...` mostra QuickPick com reporters.
  - Rodar com cobertura em banco sem o reporter → warning e sem cobertura.
  - `additionalReporters` com custom reporter → flag `-f=<custom>` aparece no output.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `listReporters` adiciona latência extra | A validação de cobertura já precisa de conexão — a latência é a mesma do `info`. Opcional: cache na sessão com TTL curto (5 min). |
| Custom reporters com parâmetros extras | `-f=<nome>` funciona para reporters básicos; parâmetros como `-o=` exigem o formato atual (ainda dá via `extraRunArgs`). |
| Reporter selecionado no QuickPick não persiste | Comportamento intencional — evita poluir settings do workspace. Se quiser fixo, usa `additionalReporters`. |

## 9. Rollout

- Release 0.6.0 (minor).
- Atualizar `CHANGELOG.md`: validação dinâmica de cobertura, comando selecionar reporter, setting `additionalReporters`.
- Publicar via release no GitHub.

## 10. Critérios de aceite

- `npm test` passa.
- Rodar cobertura sem o reporter no banco → warning no output e execução sem cobertura.
- `additionalReporters` com entries → args contêm `-f=<entry>`.
- QuickPick `utplsql.selectReporter` lista reporters e o selecionado é usado na execução.

## 11. Questões em aberto

- Cache da lista de reporters na sessão? Pode ser adicionado depois se a latência for perceptível.
- E se o usuário quiser múltiplos reporters adicionais numa execução só? `additionalReporters` cobre o caso fixo; o QuickPick atual seleciona um. Suporte a multi-select pode vir em iteração futura.
- O formato de saída do `reporters` command varia entre versões do CLI? O comando foi introduzido na v3.1.1 — validar manualmente com algumas versões.
