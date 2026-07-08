# PRD — Opções CLI avançadas expostas como settings

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-03 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.5.0 |
| Arquivos afetados | `package.json`, `src/config.ts`, `src/runner.ts`, `README.md` |

## 1. Resumo

Expor como settings do VSCode quatro opções do `utplsql run` que o CLI jar já suporta mas a extensão ignora: timeout (`-t`), DBMS output (`-D`), modo quiet (`-q`) e código de saída em falha (`--failure-exit-code`). Isso permite que o usuário controle esses parâmetros sem usar o `extraRunArgs`.

## 2. Contexto e problema

- Hoje a extensão só passa ao CLI os argumentos necessários para reporters, cobertura e paths.
- Quem precisa de timeout, DBMS output ou controle de exit code precisa usar `extraRunArgs`, que é uma lista genérica sem validação.
- O `-D` (DBMS output) é particularmente útil para debugar testes que usam `DBMS_OUTPUT.PUT_LINE`.
- O timeout de 60 min (default do CLI) não é configurável — ideal para projetos grandes com cobertura que podem levar mais tempo, ou para CI onde se quer timeout mais curto.

O CLI aceita estas flags desde a v3.1.6:
```
-t, --timeout           Timeout em minutos (default 60)
-D, --dbms_output       Habilita DBMS_OUTPUT na sessão do TestRunner
-q, --quiet             Suprime logs do CLI no stdout
--failure-exit-code     Código de saída em caso de falha (default 1)
```

## 3. Objetivos / Não-objetivos

**Objetivos**
- Adicionar settings tipadas para timeout, dbms_output, quiet, failure-exit-code.
- Montar os argumentos correspondentes em `runner.ts` dinamicamente.
- Respeitar `extraRunArgs` como sobrescrita (último word).

**Não-objetivos**
- Remover `extraRunArgs` (continua válido para flags não cobertas).
- Adicionar todas as flags do CLI (ex.: `-scc`, `--exclude`/`--include` ficam para PRDs futuros).
- Validar a conexão Oracle ou o próprio CLI.

## 4. Requisitos

### RF1 — Setting `utplsql.timeoutMinutes`

```typescript
// package.json
"utplsql.timeoutMinutes": {
  "type": "number",
  "default": 60,
  "minimum": 1,
  "maximum": 1440,
  "description": "Timeout em minutos para o utPLSQL-cli (flag -t)."
}
```

### RF2 — Setting `utplsql.dbmsOutput`

```typescript
// package.json
"utplsql.dbmsOutput": {
  "type": "boolean",
  "default": false,
  "description": "Habilita DBMS_OUTPUT na sessão de teste (flag -D). Útil para debugar."
}
```

### RF3 — Setting `utplsql.quiet`

```typescript
// package.json
"utplsql.quiet": {
  "type": "boolean",
  "default": false,
  "description": "Suprime logs informativos do CLI (flag -q). Útil para CI ou output mais limpo."
}
```

### RF4 — Setting `utplsql.failureExitCode`

```typescript
// package.json
"utplsql.failureExitCode": {
  "type": "number",
  "default": 1,
  "minimum": 0,
  "maximum": 255,
  "description": "Código de saída quando há falha (flag --failure-exit-code). 0 faz o CLI sempre exitar com sucesso."
}
```

### RF5 — Montagem dos args em runner.ts

```typescript
// src/runner.ts
if (cfg.timeoutMinutes !== 60) {
  args.push(`-t=${cfg.timeoutMinutes}`);
}
if (cfg.dbmsOutput) {
  args.push('-D');
}
if (cfg.quiet) {
  args.push('-q');
}
if (cfg.failureExitCode !== 1) {
  args.push(`--failure-exit-code=${cfg.failureExitCode}`);
}
// extraRunArgs por último (sobrescreve)
args.push(...cfg.extraRunArgs);
```

### RF6 — UtConfig atualizada

```typescript
export interface UtConfig {
  // ... existentes
  timeoutMinutes: number;
  dbmsOutput: boolean;
  quiet: boolean;
  failureExitCode: number;
}
```

**Não-funcionais**
- RNF1 — Defaults idênticos ao comportamento atual (60 min, sem DBMS, não quiet, exit code 1).
- RNF2 — Nenhuma dependência nova.
- RNF3 — As settings respeitam os limites mín/máx do CLI (`minimum`/`maximum` no schema).

## 5. Solução proposta

### 5.1 package.json — schema das 4 properties

Adicionar ao `contributes.configuration.properties` seguindo o padrão existente. Usar `minimum`/`maximum` para validação nativa do VSCode.

### 5.2 src/config.ts — UtConfig + readConfig

```typescript
export interface UtConfig {
  cliPath: string;
  sourcePath: string;
  includePatterns: string[];
  extraRunArgs: string[];
  coverageOwner: string;
  coverageSourceArgs: string[];
  invocation: string;
  javaPath: string;
  cliHome: string;
  // novos
  timeoutMinutes: number;
  dbmsOutput: boolean;
  quiet: boolean;
  failureExitCode: number;
}

export function readConfig(): UtConfig {
  const c = vscode.workspace.getConfiguration('utplsql');
  return {
    // ... existentes
    timeoutMinutes: c.get<number>('timeoutMinutes', 60),
    dbmsOutput: c.get<boolean>('dbmsOutput', false),
    quiet: c.get<boolean>('quiet', false),
    failureExitCode: c.get<number>('failureExitCode', 1),
  };
}
```

### 5.3 src/runner.ts — montagem condicional dos args

Inserir o bloco de args após a montagem dos reporters (linha 86) e antes de `args.push(...cfg.extraRunArgs)`.

## 6. Configuração

| Setting | Tipo | Default | Validação | Descrição |
|---|---|---|---|---|
| `utplsql.timeoutMinutes` | number | 60 | 1-1440 | Timeout em minutos (`-t`) |
| `utplsql.dbmsOutput` | boolean | false | — | Habilita DBMS_OUTPUT (`-D`) |
| `utplsql.quiet` | boolean | false | — | Suprime logs do CLI (`-q`) |
| `utplsql.failureExitCode` | number | 1 | 0-255 | Código de saída em falha (`--failure-exit-code`) |

## 7. Plano de testes

- **Unitários** (`src/test/unit/config.test.ts`): `readConfig()` com cada setting no default e com valores customizados.
- **Unitários** (`src/test/unit/runner.test.ts`): verificar que os args corretos são montados para cada combinação de settings. Como `executeRun` depende de VSCode, testar a lógica de montagem extraindo-a para uma função pura ou testando via módulo separado.
- **Validação manual**:
  - `utplsql.timeoutMinutes = 5`: execução longa deve falhar com timeout.
  - `utplsql.dbmsOutput = true`: output deve conter linhas de DBMS_OUTPUT.
  - `utplsql.quiet = true`: menos linhas de logging no output do Test Explorer.
  - `utplsql.failureExitCode = 0`: CLI sai com código 0 mesmo com testes falhando (o VSCode ainda marca como falha pelo JUnit).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Default `timeoutMinutes = 60` pode ser muito curto para projetos enormes | Máximo 1440 (24h); usuário ajusta conforme necessidade |
| `failureExitCode = 0` mascara falha no nível de processo | O JUnit reporter ainda marca testes como passed/failed — o exit code só afeta scripts externos |
| Quiet mode e `dbmsOutput` simultâneos podem confundir | A ordem de args garante `-q -D`; o CLI prioriza a última flag |

## 9. Rollout

- Release 0.5.0 (minor), junto com PRD-05 e PRD-06 se viável.
- Atualizar `CHANGELOG.md` com as 4 novas settings.
- Publicar via release no GitHub (workflow automático).

## 10. Critérios de aceite

- `npm test` passa.
- Com defaults, comportamento idêntico ao anterior (args extras não são emitidos).
- Cada setting produz a flag CLI correspondente.
- Settings aparecem no auto-complete do VSCode com descrição e validação.
- README documenta as novas settings.

## 11. Questões em aberto

- Vale expor `-scc` (skip-compatibility-check) como setting? O CLI já faz a verificação automaticamente — adiar até relato de quebra.
- `-t` aceita minutos, não segundos. O CLI usa `long` internamente — suficiente.
