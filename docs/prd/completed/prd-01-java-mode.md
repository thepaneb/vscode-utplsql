# PRD — Modo de invocação `java` (bypass do launcher)

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-06-28 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.3.0 |
| Arquivos afetados | `src/invocation.ts` (novo), `src/cli.ts`, `src/config.ts`, `src/extension.ts`, `package.json`, `README.md` |

## 1. Resumo

Adicionar um **modo de invocação opcional** em que a extensão chama a JVM **diretamente**
(`java -cp … org.utplsql.cli.Cli …`) em vez do launcher do utPLSQL-cli (`utplsql.bat`/script).
Isso elimina a camada de shell (`cmd`) e, com ela, toda a fragilidade de tratamento de
metacaracteres em argumentos. O modo `launcher` permanece o padrão.

## 2. Contexto e problema

- Hoje a extensão invoca o cli pelo **launcher** via `cp.spawn(cmd, { shell: true })`
  (ver `src/cli.ts`). No Windows isso passa pelo **`cmd`**.
- O `cmd` interpreta metacaracteres (`^`, `|`, `(`, `)`). Como a extensão passa **regexes**
  no `coverageSourceArgs` (mapeamento da cobertura), isso já causou falhas reais:
  - `^` no regex era **consumido** pelo `cmd`;
  - `|` (alternância) era interpretado como **pipe**.
- Mitigação atual: `quoteArg` cita argumentos com caracteres especiais. Funciona, mas é
  **frágil** (depende de quoting correto) e não vale para os scripts `run-tests.ps1`/`.sh`.

O launcher (`utplsql.bat`) apenas monta um classpath e chama uma classe Java:
```
java -classpath "<home>/etc;<home>/lib/*" -Dapp.home=<home> … org.utplsql.cli.Cli %*
```
Ou seja, dá para chamar a classe diretamente e **pular o `cmd`/`.bat`**.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Eliminar na raiz a fragilidade de quoting/metacaracteres ao passar regexes ao cli.
- Invocação **uniforme cross-platform** (mesmo comando `java` em Windows/Linux/macOS).
- Recurso **opt-in**, sem quebrar quem usa o launcher.

**Não-objetivos**
- Remover o modo `launcher` (continua o **padrão**).
- Um modo `auto` (detecção automática) — fica para uma iteração futura.
- Gerenciar instalação de Java ou do cli (continua responsabilidade do ambiente).

## 4. Requisitos

**Funcionais**
- **RF1** — Setting `utplsql.invocation`: `"launcher"` (default) | `"java"`.
- **RF2** — No modo `java`, montar `java -cp <etc><sep><lib>/* … org.utplsql.cli.Cli <args>` e
  executar com `shell: false` (args em array).
- **RF3** — Determinar a raiz do cli (`home`): usar `utplsql.cliHome` se definido; senão
  **derivar** de `utplsql.cliPath` (`<home>/bin/utplsql.bat` → `home = dirname(dirname(cliPath))`).
- **RF4** — Setting `utplsql.javaPath` (default `"java"`) para o executável da JVM.
- **RF5** — Se o modo for `java` e a raiz não puder ser determinada, exibir **erro claro**
  orientando a definir `utplsql.cliHome`.
- **RF6** — **Paridade funcional**: mesmos reporters, cobertura e resultados que o launcher.

**Não-funcionais**
- **RNF1** — Retrocompatível: default `launcher` → zero mudança de comportamento.
- **RNF2** — Lógica de construção do comando em **módulo puro** (sem `vscode`), testável por unidade.
- **RNF3** — **Sem novas dependências** (apenas `child_process`/`path` do Node).

## 5. Solução proposta

### 5.1 Mapeamento launcher → java
```
java -classpath "<home>/etc<sep><home>/lib/*" \
     -Dapp.name=utplsql -Dapp.home=<home> -Dapp.repo=<home>/lib -Dbasedir=<home> \
     org.utplsql.cli.Cli <args...>
```
- `<sep>` = `path.delimiter` (`;` Windows, `:` Unix).
- `lib/*` é **wildcard do Java** (não do shell) → com `shell:false` passa literal e a JVM expande.
- Classe principal: `org.utplsql.cli.Cli`.

### 5.2 `src/invocation.ts` (novo, puro)
```ts
export interface Spawn { file: string; args: string[]; shell: boolean; }
export function resolveCliHome(cfg): string | undefined { /* cliHome || derivar do cliPath */ }
export function buildInvocation(cfg, cliArgs: string[]): Spawn | { error: string } {
  // invocation !== 'java'  -> { file: cliPath, args: cliArgs, shell: true }
  // invocation === 'java'  -> { file: javaPath, args: ['-cp', cp, ...props, 'org.utplsql.cli.Cli', ...cliArgs], shell: false }
}
```

### 5.3 `src/cli.ts`
`runCli(file, args, shell, cwd, token, onStdout)` ramifica:
- `shell: true` → `cmd = [file, ...args].map(quoteArg).join(' ')` + `spawn(cmd, { shell:true })` (launcher).
- `shell: false` → `spawn(file, args, { shell:false })` (java direto).
O restante (stdout/stderr/cancel/close) é idêntico.

### 5.4 `src/extension.ts`
```ts
const inv = buildInvocation(cfg, args);
if ('error' in inv) { vscode.window.showErrorMessage(inv.error); return; }
await runCli(inv.file, inv.args, inv.shell, root, token, onStdout);
```

### 5.5 `src/config.ts`
Adicionar `invocation`, `javaPath`, `cliHome` ao `UtConfig`/`readConfig`.

## 6. Configuração (novas settings)

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.invocation` | enum `"launcher"`/`"java"` | `"launcher"` | Como invocar o cli. `java` chama a JVM direto (sem shell). |
| `utplsql.javaPath` | string | `"java"` | Executável do Java (PATH ou caminho completo). Usado só no modo `java`. |
| `utplsql.cliHome` | string | `""` | Raiz do utPLSQL-cli. Vazio = derivado do `cliPath`. Usado só no modo `java`. |

## 7. Plano de testes

- **Unitários** (`src/test/unit/invocation.test.ts`, sem DB/sem `vscode`):
  - `resolveCliHome`: `.../bin/utplsql.bat` → raiz; `"utplsql"` (sem path) → `undefined`; `cliHome` tem precedência.
  - `buildInvocation` modo `launcher`: `{ shell:true, file=cliPath, args=cliArgs }`.
  - `buildInvocation` modo `java`: args iniciam com `-cp`; classpath contém `etc` + `lib/*`;
    contém `org.utplsql.cli.Cli`; `shell:false`.
  - `buildInvocation` modo `java` sem raiz determinável: retorna `{ error }`.
- **Integração** (existente): ativação + comandos continuam.
- **Validação manual** (com banco): rodar cobertura no modo `java` com regex contendo `^`/`|`
  e confirmar que mapeia **sem** o `quoteArg`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Acoplamento ao empacotamento do cli (classe `org.utplsql.cli.Cli`, layout `lib/`/`etc`) | Estável no utPLSQL-cli 3.x; documentar. Só o modo `java` quebra se mudar — `launcher` segue intacto. |
| `java` fora do PATH | Mensagem de erro citando `utplsql.javaPath`. |
| Raiz do cli não-derivável (`cliPath="utplsql"`) | Erro claro pedindo `utplsql.cliHome`. |
| Regressão no modo padrão | `launcher` permanece default e inalterado. |

## 9. Rollout

- Default `launcher` (sem impacto). `java` é opt-in via setting.
- Validar com `npm test` (unit) + `npm run package`.
- Publicar via **release no GitHub** (→ 0.2.4) — o workflow `.github/workflows/publish.yml`
  empacota e publica automaticamente. `npm run publish` local é bloqueado.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Default inalterado: com `invocation` ausente/`launcher`, comportamento idêntico ao atual.
- Modo `java`: roda testes + cobertura com paridade ao launcher; regex com `^`/`|` funciona **sem** quoting.
- `resolveCliHome`/`buildInvocation` cobertos por testes unitários.
- README documenta as settings e quando usar cada modo.

## 11. Questões em aberto

- Vale um modo `auto` (preferir `java` quando a raiz é derivável)? — adiar.
- Expor `JAVA_OPTS`/props extras como setting? — só se houver demanda.
