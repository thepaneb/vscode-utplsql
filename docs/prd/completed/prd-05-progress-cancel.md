# PRD-05 — Feedback de progresso e cancelamento na UX

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Análise automatizada |
| Data | 2026-07-02 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.5.0 |
| Arquivos afetados | `src/extension.ts`, `src/runner.ts`, `src/config.ts`, `src/cli.ts`, `package.json` |

## 1. Resumo

Melhorar a experiência do usuário durante execuções longas: barra de progresso
no VSCode (`withProgress`), indicação visual do status atual, suporte real a
cancelamento, e redução da exposição da connection string em linha de comando.

## 2. Contexto e problema

- Execuções com cobertura em várias suites podem levar **minutos** sem nenhum
  feedback visual além do output no Test Explorer.
- O `CancellationToken` só serve para matar o processo filho (`child.kill()`);
  não há barra de progresso (`vscode.window.withProgress`).
- O comando `utplsql.runAll` cria um **novo** `CancellationTokenSource` mas não
  o armazena — não há como cancelar pelo VSCode.
- A connection string é passada como argumento CLI (`utplsql run user/pass@host`),
  visível em `/proc/<pid>/cmdline` (Linux) ou via ferramentas de processo (Windows).
- `clearSessionConnection()` existe em `config.ts` mas **não há comando registrado**
  para o usuário chamar.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Envolver toda execução em `vscode.window.withProgress` com título descritivo.
- Exibir mensagem locacional durante o run (ex.: "Executando suite X (3/12)").
- Permitir cancelamento via botão "Cancel" na barra de progresso.
- Armazenar `CancellationTokenSource` no `context.subscriptions` para
  `utplsql.cancelRun`.
- Adicionar comando `utplsql.clearConnection` para limpar a conexão da sessão.
- Orientar no README o uso de `UTPLSQL_CONN` (env var) como alternativa mais
  segura que argumento CLI.

**Não-objetivos**
- Criptografar a connection string em trânsito (é responsabilidade do Oracle Net).
- Remover o suporte a connection como argumento CLI (backward compat).
- Adicionar botão na status bar (futuro).

## 4. Requisitos

### RF1 — Barra de progresso (`withProgress`)

```typescript
await vscode.window.withProgress({
  location: vscode.ProgressLocation.Notification,
  title: 'utPLSQL: Rodando testes...',
  cancellable: true
}, async (progress, token) => {
  // token vinculado ao CancellationTokenSource da extensão
  // progress.report({ message: 'Suite app.test_exemplo (3/12)' });
  await executeRun(controller, request, token, coverage, ...);
});
```

### RF2 — Reports de progresso incrementais

- `progress.report({ message: `Suite ${i+1}/${total}` })` a cada suite iniciada.
- `progress.report({ message: 'Parseando resultados...' })` ao finalizar.

### RF3 — Cancelamento gerenciado

- `context.subscriptions` guarda o `CancellationTokenSource` ativo.
- `utplsql.cancelRun` command chama `source.cancel()` se houver run ativo.
- Ao iniciar novo run, cancela o anterior (se houver).

### RF4 — Comando `utplsql.clearConnection`

- Registra comando que chama `clearSessionConnection()`.
- Mostra `vscode.window.showInformationMessage('Conexão limpa da sessão.')`.
- Adiciona entrada no `package.json` `contributes.commands`.

### RF5 — Segurança da connection string

- README: seção "Conexão" recomenda usar `UTPLSQL_CONN` (env var) como método
  principal, e **não** usar o setting `utplsql.connection` em ambientes
  compartilhados.
- A string nunca é logada (já implementado) — manter.

## 5. Solução proposta

### 5.1 `extension.ts` — withProgress wrapper

```typescript
let currentRunToken: vscode.CancellationTokenSource | undefined;

async function runWithProgress(controller, request, coverage, context) {
  // Cancela run anterior se houver
  currentRunToken?.cancel();
  currentRunToken = new vscode.CancellationTokenSource();
  context.subscriptions.push(currentRunToken);

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'utPLSQL',
    cancellable: true
  }, async (progress, token) => {
    token.onCancellationRequested(() => currentRunToken?.cancel());
    const total = estimateTotalTests(controller, request);
    let done = 0;
    const onSuiteStart = () => {
      done++;
      progress.report({ message: `${done}/${total}` });
    };
    await executeRun(controller, request, currentRunToken.token, coverage, onSuiteStart);
  });
}
```

### 5.2 `runner.ts` — hook de progress

`executeRun` aceita um callback `onSuiteStart?: () => void` chamado a cada suite.

### 5.3 `package.json` — novo comando

```json
{
  "command": "utplsql.cancelRun",
  "title": "Cancelar execução",
  "category": "utPLSQL"
},
{
  "command": "utplsql.clearConnection",
  "title": "Limpar conexão da sessão",
  "category": "utPLSQL"
}
```

## 6. Configuração

Nenhuma nova setting.

## 7. Plano de testes

- **Unitário**: `executeRun` com callback `onSuiteStart` — verificar que é
  chamado N vezes.
- **Manual**: rodar `Run with Coverage` em projeto com 10+ suites — barra de
  progresso deve aparecer e atualizar contagem.
- **Cancelamento**: clicar "Cancel" na barra — processo CLI deve ser morto e run
  finalizado com status incompleto.
- **Limpar conexão**: executar comando palette `utPLSQL: Limpar conexão da sessão` —
  próxima execução deve pedir conexão de novo.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `withProgress` em notificação pode ser fechado pelo usuário | Progresso é perdido mas execução continua em background |
| Cancelamento pode deixar tmp dir sujo | `finally` no `executeRun` garante `rmSync` |
| Múltiplos runs simultâneos | Novo run sempre cancela o anterior |

## 9. Rollout

- Release 0.5.0: incrementar versão no `package.json`, atualizar `CHANGELOG.md`,
  criar **release no GitHub** (o workflow publica automaticamente).
- `CHANGELOG.md` lista: barra de progresso, comando cancelar, comando limpar conexão.

## 10. Critérios de aceite

- `withProgress` aparece e atualiza a mensagem durante execução.
- Clicar "Cancel" interrompe o processo e o run termina.
- `utplsql.cancelRun` na palette cancela o run atual.
- `utplsql.clearConnection` limpa o cache e força prompt na próxima execução.
- README recomenda env var `UTPLSQL_CONN` como método principal.
