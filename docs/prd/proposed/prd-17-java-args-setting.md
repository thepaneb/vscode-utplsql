# PRD-17 — Flags JVM customizáveis para o modo `java`

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-13 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.8.0 |
| Arquivos afetados | `src/invocation.ts`, `src/config.ts`, `package.json`, `README.md` |

## 1. Resumo

Adicionar a setting `utplsql.javaArgs` para que usuários do modo `java`
possam passar flags JVM (`-Xmx`, `-Xms`, `-Dprop=value` etc.) à invocação
direta do `java`. Incluir defaults sensíveis (`-Xmx256m`) para que o modo
`java` tenha performance equivalente ao launcher sem configuração manual.

## 2. Contexto e problema

O modo `java` (PRD-01) monta a linha de comando do `java` sem nenhuma
flag JVM além das `-Dapp.*` obrigatórias:

```typescript
const args = [
  '-cp',
  classpath,
  '-Dapp.name=utplsql',
  `-Dapp.home=${home}`,
  `-Dapp.repo=${path.join(home, 'lib')}`,
  `-Dbasedir=${home}`,
  UTPLSQL_MAIN_CLASS,
  ...cliArgs,
];
```

O launcher (`utplsql` script) também não adiciona flags por padrão,
mas passa `$JAVA_OPTS` que o usuário pode definir no shell. No modo
`java` da extensão, não há mecanismo equivalente — o usuário não tem
como passar `-Xmx`, `-Xms`, flags de GC, ou propriedades extras sem
editar o código da extensão.

Isso é relevante porque:
- Suites grandes (`runAll`) podem exigir mais heap que o default da JVM.
- Usuários que precisam de flags de depuração (`-agentlib:jdwp`) não
  têm como ativá-las.
- A falta de `-Xmx` pode explicar diferenças de performance observadas
  entre modos em ambientes com múltiplas suites.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Adicionar setting `utplsql.javaArgs` (array de strings) com default
  `["-Xmx256m"]`.
- Inserir `javaArgs` nos args do `buildInvocation` no modo `java`.
- Incluir os defaults na definição do setting em `package.json`.

**Não-objetivos**
- Modificar o modo `launcher` (já usa `$JAVA_OPTS` do shell).
- Adicionar parsing de `JAVA_OPTS` do ambiente (seria duplicado com a
  setting).
- Alterar o comportamento do `shell: true`/`shell: false`.

## 4. Requisitos

### RF1 — Nova setting `utplsql.javaArgs`

| Setting | Tipo | Default |
|---|---|---|
| `utplsql.javaArgs` | `string[]` | `["-Xmx256m"]` |

As flags devem vir **antes** de `-cp` porque algumas flags JVM
(como `-Xmx`, `-Xms`, `-XX:+...`) exigem posição antes do classpath.

### RF2 — `InvocationConfig` estendido

```typescript
export interface InvocationConfig {
  invocation: string;
  cliPath: string;
  javaPath: string;
  cliHome: string;
  javaArgs: string[];
}
```

### RF3 — `buildInvocation` insere javaArgs

```typescript
const args = [
  ...cfg.javaArgs,
  '-cp',
  classpath,
  '-Dapp.name=utplsql',
  `-Dapp.home=${home}`,
  `-Dapp.repo=${path.join(home, 'lib')}`,
  `-Dbasedir=${home}`,
  UTPLSQL_MAIN_CLASS,
  ...cliArgs,
];
```

### RF4 — `package.json`

```json
"utplsql.javaArgs": {
  "type": "array",
  "items": { "type": "string" },
  "default": ["-Xmx256m"],
  "description": "Argumentos extras para a JVM no modo 'java' (ex.: [\"-Xmx512m\", \"-Xms128m\"]). Vazio = nenhum."
}
```

## 5. Solução proposta

### 5.1 `src/config.ts`

Adicionar `javaArgs` ao `UtConfig` e `readConfig`.

### 5.2 `src/invocation.ts`

Adicionar `javaArgs` ao `InvocationConfig` e inserir como primeiro
elemento do array de args no `buildInvocation` para o modo `java`.

### 5.3 Testes

- `config.test.ts`: verificar default `['-Xmx256m']` e valor customizado.
- `invocation.test.ts`:
  - `buildInvocation` modo `java` com `javaArgs` vazio (default).
  - `buildInvocation` modo `java` com `javaArgs` customizado —
    verificar que aparecem antes de `-cp`.
  - `buildInvocation` modo `launcher` — `javaArgs` é ignorado.

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.javaArgs` | `string[]` | `["-Xmx256m"]` | Flags JVM para o modo `java` |

## 7. Plano de testes

- **Unitários**: `config.test.ts`, `invocation.test.ts` (2 novos testes,
  1 atualizado).
- **Integração**: reaproveitar os testes de `modo java` da PRD-16.
- **Validação manual**: alternar entre modos e medir tempo do `runAll`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `-Xmx256m` pode ser pouco para projetos grandes | O usuário pode aumentar via setting; o default é conservador |
| `javaArgs` com flags mal formatadas quebra o CLI | Erro do Java aparece no stderr; o usuário vê no output do test run |
| Ordem das flags importa (algumas exigem posição) | `javaArgs` vai antes de `-cp` (posição correta para flags JVM) |

## 9. Critérios de aceite

- `readConfig()` com `javaArgs` não configurado retorna `['-Xmx256m']`.
- `buildInvocation` no modo `java` insere `javaArgs` antes de `-cp`.
- `buildInvocation` no modo `launcher` ignora `javaArgs`.
- `npm run test:unit` passa.
- `npm run test:integration` com `UTPLSQL_CONN` passa (ambos os modos).

## 10. Questões em aberto

*(Nenhuma)*
