# PRD — Diagnóstico e validação com `utplsql info`

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-03 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.5.0 |
| Arquivos afetados | `src/cliInfo.ts` (novo), `src/extension.ts`, `src/runner.ts`, `package.json`, `README.md` |

## 1. Resumo

Usar o sub-command `info` do utPLSQL-cli (classe `org.utplsql.cli.Cli`) para obter as versões do CLI, da java-api e do framework utPLSQL no banco. As versões são exibidas em um comando `utplsql.showInfo` na paleta e validadas antes de cada execução, prevenindo falhas por incompatibilidade.

## 2. Contexto e problema

- Quando o CLI é muito novo ou muito velho para o framework instalado no banco, os reporters podem falhar silenciosamente.
- Hoje não há diagnóstico disponível ao usuário — se algo der errado, a mensagem de erro genérica do CLI aparece sem menção de versões.
- `utplsql info <connection>` retorna as três versões em texto simples. Exemplo:
  ```
  cli 3.1.7
  utPLSQL-java-api 3.1.7
  utPLSQL 3.1.2.1913
  ```
  Sem connection, mostra apenas as duas primeiras.
- Aproveitar essa informação para (a) exibir num comando dedicado e (b) validar antes de executar.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Criar módulo `cliInfo.ts` (puro, sem `vscode`) com `parseInfoOutput()` e `getCliInfo()`.
- Registrar comando `utplsql.showInfo` na paleta de comandos.
- Exibir as versões em um `information message` com botão "Copiar".
- Logar as versões no output do Test Run antes de cada execução.
- Emitir warning se a versão do framework for anterior a 3.1.0 (reports de cobertura podem não funcionar).

**Não-objetivos**
- Bloquear execução por incompatibilidade (só warning).
- Validar versão do JDK (responsabilidade do usuário).
- Fazer downgrade automático de args.

## 4. Requisitos

### RF1 — `parseInfoOutput(stdout)`

```typescript
// src/cliInfo.ts (puro)
export interface CliInfo {
  cliVersion: string;
  apiVersion: string;
  dbVersion?: string;  // undefined se chamado sem connection
}

export function parseInfoOutput(stdout: string): CliInfo {
  // Parse das linhas:
  // "cli 3.1.7\nutPLSQL-java-api 3.1.7\nutPLSQL 3.1.2.1913"
  const cli = stdout.match(/^cli\s+(\S+)/im)?.[1] ?? 'desconhecida';
  const api = stdout.match(/^utPLSQL-java-api\s+(\S+)/im)?.[1] ?? 'desconhecida';
  const db  = stdout.match(/^utPLSQL\s+(\S+)/im)?.[1];
  return { cliVersion: cli, apiVersion: api, dbVersion: db };
}
```

### RF2 — `getCliInfo(cfg, conn?)`

```typescript
export async function getCliInfo(
  cfg: InvocationConfig,
  conn?: string
): Promise<CliInfo | { error: string }> {
  const args = conn ? ['info', conn] : ['info'];
  const inv = buildInvocation(cfg, args);
  if (isInvocationError(inv)) return { error: inv.error };
  const result = await runCli(inv.file, inv.args, inv.shell, process.cwd(), dummyToken);
  if (result.code !== 0) return { error: result.stderr || 'info command failed' };
  return parseInfoOutput(result.stdout);
}
```

### RF3 — Comando `utplsql.showInfo`

Registrar em `extension.ts`:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('utplsql.showInfo', async () => {
    const cfg = readConfig();
    let info = await getCliInfo(cfg);
    if ('error' in info) {
      vscode.window.showErrorMessage(`utPLSQL info: ${info.error}`);
      return;
    }
    let msg = `CLI: ${info.cliVersion}\nAPI: ${info.apiVersion}`;
    if (info.dbVersion) msg += `\nDB:  ${info.dbVersion}`;
    const copy = await vscode.window.showInformationMessage(msg, 'Copiar');
    if (copy) vscode.env.clipboard.writeText(msg);
  })
);
```

### RF4 — Validação pré-execução

Em `runner.ts`, antes de montar os args:
```typescript
const info = await getCliInfo(cfg, connection);
if ('error' in info) {
  run.appendOutput(`[aviso] Não foi possível obter info do CLI: ${info.error}\r\n`);
} else {
  run.appendOutput(
    `[info] CLI ${info.cliVersion} | API ${info.apiVersion}` +
    (info.dbVersion ? ` | DB utPLSQL ${info.dbVersion}` : '') + '\r\n'
  );
  if (info.dbVersion && semverLt(info.dbVersion, '3.1.0')) {
    run.appendOutput('[aviso] utPLSQL no banco é anterior a 3.1.0 — cobertura pode não funcionar.\r\n');
  }
}
```

Nota: usado `semverLt` — comparação simples de string ou uso de `semver` (já presente indiretamente via TypeScript). Evitar dependência nova: comparar numericamente o major.minor.

**Não-funcionais**
- RNF1 — `parseInfoOutput` é função pura, testável sem `vscode` nem CLI real.
- RNF2 — `getCliInfo` usa `runCli` e `buildInvocation` existentes.
- RNF3 — A validação nunca bloqueia a execução (só avisa).

## 5. Solução proposta

### 5.1 `src/cliInfo.ts` (novo, puro)

- `parseInfoOutput(stdout): CliInfo` — regex por linha, tolerante a espaços extras.
- `getCliInfo(cfg: InvocationConfig, conn?: string): Promise<CliInfo | { error: string }>` — monta args `['info']` ou `['info', conn]`, chama `buildInvocation` + `runCli`, retorna parsed.
- Reusa `dummyToken` = `{ isCancellationRequested: false, onCancellationRequested: () => {} }`.

### 5.2 `src/extension.ts`

Registrar comando `utplsql.showInfo` no `activate()`.

### 5.3 `src/runner.ts`

Adicionar chamada a `getCliInfo` no início de `executeRun`, logar resultado, validar versão.

### 5.4 `package.json`

```json
{
  "command": "utplsql.showInfo",
  "title": "Mostrar informações do utPLSQL",
  "category": "utPLSQL"
}
```

## 6. Configuração

Nenhuma nova setting. O comando `utplsql.showInfo` aparece na paleta de comandos.

## 7. Plano de testes

- **Unitários** (`src/test/unit/cliInfo.test.ts`):
  - `parseInfoOutput` com saída completa (CLI + API + DB).
  - `parseInfoOutput` sem DB (apenas CLI + API).
  - `parseInfoOutput` com saída vazia → versões "desconhecida".
- **Integração** (`src/test/unit/runner.test.ts`): mock `getCliInfo` para retornar versão antiga e verificar que o warning aparece no output.
- **Manual**: executar `utPLSQL: Mostrar informações do utPLSQL` na paleta — deve mostrar versões. Executar testes com banco compatível e incompatível.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `info` sub-command não existe em versões antigas do CLI (< 3.1.1) | `getCliInfo` retorna `{ error }`; a execução prossegue sem warning |
| Usuário sem conexão não vê versão do DB | `info` sem connection mostra CLI + API; ao executar testes (que têm connection) mostra completa |
| Latência extra antes de cada execução | `getCliInfo` é uma chamada rápida ao CLI; tipicamente < 1s |

## 9. Rollout

- Release 0.5.0 (minor).
- Atualizar `CHANGELOG.md`: novo comando `utPLSQL: Mostrar informações do utPLSQL` + validação de versão pré-execução.
- Publicar via release no GitHub.

## 10. Critérios de aceite

- `npm test` passa com novos testes unitários.
- `utplsql.showInfo` mostra as versões em information message.
- Output do Test Run inicia com as versões do CLI/API/DB.
- Warning visível se DB utPLSQL < 3.1.0.
- Se CLI não suporta `info`, execução segue normalmente sem warning.

## 11. Questões em aberto

- Usar `semver` library para comparação robusta de versões? Por ora comparação numérica simples (split por `.` e compara ints) — evita dependência.
- Exibir na status bar (ex.: `utPLSQL v3.1.7`)? Pode ser um PRD futuro.
- E se `info` demorar (conexão lenta)? O CLI tem timeout interno; a extensão não precisa adicionar um extra.
