---
tipo: prd
id: PRD-73
aliases: [PRD-73]
status: completed
titulo: "Compilar objeto para debug (comando + menus)"
versao: "0.12.1"
data: "2026-09-18"
autor: "Gil Cleber Barboza"
verificado: 2026-09-23
tags: [prd]
---

# PRD-73 — Compilar objeto para debug (comando + menus)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-18 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.1 |
| Arquivos afetados | `package.json`, `package.nls.json` + `package.nls.<locale>.json` (24), `src/commands/debug.ts`, `src/oracleRunner.ts`, `src/i18nLocales.ts`, `README.md` (+ 23 variantes), `docs/wiki/Debugger.md`, `docs/wiki/Database-requirements.md`, `docs/functional/11-debugger.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Baixa-Média |

## 1. Resumo

Adicionar um comando **`utPLSQL: Compile for Debug`** que compila o objeto
Oracle correspondente ao arquivo/pasta selecionado com informação de debug
(`ALTER … COMPILE DEBUG`), disponível na paleta, no menu de contexto do editor e
no do Explorer. Opcionalmente, uma setting faz a extensão compilar
automaticamente antes de iniciar uma sessão de debug. Isso elimina o passo
manual mais fácil de esquecer, que hoje faz o debug "não parar" no breakpoint.

## 2. Contexto e problema

O debugger (`DBMS_DEBUG`, PRD-33/PRD-71) só para em breakpoints se o pacote-alvo
tiver sido compilado com informação de debug (`PLSQL_OPTIMIZE_LEVEL <= 1`, ou
`ALTER PACKAGE … COMPILE DEBUG`). Hoje:

- a extensão apenas **avisa** nos docs (`docs/wiki/Debugger.md`,
  `Database-requirements.md`) e na tela de setup — o usuário precisa rodar o
  `ALTER` no SQLcl/SQL Developer por conta própria;
- quando o objeto não tem debug info, o sintoma é opaco: a sessão de debug
  inicia e termina sem parar, e o Console mostra apenas mensagens
  `[utplsql-debug]` de anexo/exiting;
- a extensão já tem o padrão de recompilação interna (`utplsql.recompileUt3` →
  `DBMS_UTILITY.COMPILE_SCHEMA`) e um menu de contexto para scripts, então o
  mecanismo é familiar.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Novo comando `utplsql.compileForDebug` na paleta, no menu do editor e no
  Explorer (arquivo e pasta).
- Compilar o(s) objeto(s) com informação de debug usando a conexão/perfil ativo,
  reusando o pool existente.
- Feedback claro: notificação de sucesso, ou erro do Oracle no Problems/Output.
- Setting `utplsql.debugger.compileOnDebug` (default `false`) para compilar o
  pacote automaticamente antes de `utPLSQL: Debug test (PL/SQL)` /
  `utplsql.debugTest`.

**Não-objetivos**
- Não altera o comportamento do usuário anônimo/objeto sem permissão de `ALTER`
  (erro é reportado, não contornado).
- Não substitui `utplsql.recompileUt3` (que recompila o schema utPLSQL).
- Não faz binding de `PLSQL_OPTIMIZE_LEVEL` global/`ALTER SYSTEM`.
- Não cria/edita objetos nem sincroniza arquivos locais com o banco.

## 4. Requisitos

### RF1 — Comando `utplsql.compileForDebug`

Origem do alvo:
- **Editor**: arquivo ativo (`.pks`/`.pkb`/`.fnc`/`.prc`/`.trg`/`.sql`).
- **Explorer (arquivo)**: arquivo selecionado.
- **Explorer (pasta)**: todos os arquivos com extensão de objeto na pasta
  (recursivo? não — apenas o primeiro nível, consistente com `runScriptFolder`).

Derivação do alvo (função pura):

```typescript
type DebuggableKind = 'package' | 'function' | 'procedure' | 'trigger';

// .pks/.pkb → package; .fnc → function; .prc → procedure; .trg → trigger
function debuggableFromFile(filePath: string): { kind: DebuggableKind; name: string } | undefined;

// "ALTER PACKAGE "OWNER"."PKG" COMPILE DEBUG"
function compileForDebugSql(kind: DebuggableKind, owner: string, name: string): string;
```

Para `.sql` (ambíguo), tentar em ordem `package` → `procedure` → `function` →
`trigger` e parar no primeiro que não retornar `ORA-04043` (objeto não existe).

### RF2 — Owner do objeto

Reusar a resolução já usada por cobertura/diagnósticos:
- modo `schema` + `utplsql.organization.schemaPattern`: extrair o schema do
  caminho (já existe `extractSchemaFromPath`);
- caso contrário: usuário da conexão em maiúsculas (`connectionUser()`),
  tolerando connection sem senha.

### RF3 — Execução e feedback

- Resolver conexão (`resolveConnection`, com prompt) e reusar `ensurePool`.
- Executar o(s) `ALTER` sequencialmente; o primeiro erro aborta (exceto o
  fallback de tipo do `.sql`).
- Sucesso: `showInformationMessage` com o objeto compilado.
- Falha: `showErrorMessage` com a mensagem do Oracle + output no canal
  `utPLSQL` (sem logar a connection).
- Após compilar, opcionalmente re-consultar `checkCompilationErrors` para o
  objeto e publicar no Problems Panel (reuso do PRD-68) — best-effort.

### RF4 — `compileOnDebug`

Setting `utplsql.debugger.compileOnDebug` (boolean, default `false`). Quando
`true`, o fluxo do `utplsql.debugTest` (e a launch config via
`resolveDebugConfiguration`, quando derivável) chama o mesmo caminho de
compilação antes de `startDebugSession`.

### RF5 — Menus e i18n

- `contributes.commands`: `utplsql.compileForDebug` com título `%nls%`.
- `contributes.menus`:
  - `commandPalette` (sempre),
  - `editor/context` (when `resourceExtname =~ /\\.(pks|pkb|fnc|prc|trg|sql)$/`),
  - `explorer/context` (quando o recurso é um arquivo/pasta compatível).
- Strings de UI em `package.nls.json` + `package.nls.<locale>.json` (24 locales)
  e mensagens de runtime nos catálogos `i18nLocales.ts`.

**Não-funcionais**
- RNF1 — Nunca logar credenciais; usar `maskConnection`/`safeArgs`.
- RNF2 — Compilação best-effort: falha não derruba a ativação nem o debug
  (apenas notifica); com `compileOnDebug=false` o comportamento atual é idêntico.
- RNF3 — Manter thresholds de cobertura (90/85/90) e paridade dos 24 catálogos
  de i18n.
- RNF4 — Reutilizar o pool do runner; a conexão é devolvida ao pool no fim.

## 5. Solução proposta

### 5.1 Novo módulo de compilação de debug

Extrair para `src/compileForDebug.ts` (mistura pura + impura, como
`compilationDiagnostics.ts`):

```typescript
export function debuggableFromFile(filePath: string): DebuggableKind | undefined;
export function compileForDebugSql(kind: DebuggableKind, owner: string, name: string): string;
export async function compileObjectsForDebug(
  targets: { kind: DebuggableKind; owner: string; name: string }[],
): Promise<{ ok: string[]; failed: { name: string; error: string }[] }>;
```

- `compileObjectsForDebug` importa `oracledb` dinamicamente, resolve a conexão,
  usa `ensurePool` e executa os `ALTER`; nunca lança (retorna o resultado).
- A parte pura (`debuggableFromFile`, `compileForDebugSql`) é testável com
  `node --test`.

### 5.2 Comando e menus (`src/commands/debug.ts`)

Registrar `utplsql.compileForDebug` no `registerDebug`, derivar alvos do
argumento de contexto (`uri`) ou do editor ativo, e chamar
`compileObjectsForDebug`. O menu do Explorer passa a URI via `arguments`.

### 5.3 `compileOnDebug`

Em `startDebugSession`, se `readConfig().debuggerCompileOnDebug`, chamar
`compileObjectsForDebug` para o `packageName` antes de `startDebugging`
(aguardando o resultado; em falha, seguir para o debug com aviso).

## 6. Configuração

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.debugger.compileOnDebug` | `false` | Compila o objeto com debug info antes de iniciar a sessão de debug |

| Comando | Descrição | Onde |
|---|---|---|
| `utplSQL: Compile for Debug` | Compila o objeto do arquivo/pasta com `COMPILE DEBUG` | Paleta, menu do editor, menu do Explorer |

Sem keybinding novo por padrão (evitar conflito); pode ser adicionado depois.

## 7. Plano de testes

- **Unitários** (`src/test/unit/compileForDebug.test.ts`):
  - `debuggableFromFile` para cada extensão (`.pks`, `.pkb`, `.fnc`, `.prc`,
    `.trg`, `.sql`, desconhecida → `undefined`);
  - `compileForDebugSql` com owner/nome em maiúsculas e com aspas;
  - fluxo de `compileObjectsForDebug` com conexão fake (sucesso, `ORA-04043` no
    fallback de `.sql`, erro genérico);
  - `debuggerCompileOnDebug` lida em `config.test.ts`.
- **Integração** (banco real, `describeDB`):
  - compilar `test_hello` com debug e verificar
    `ALL_PLSQL_OBJECT_SETTINGS.PLSQL_DEBUG`/status `VALID` (ou executar o
    debugger E2E e confirmar parada em breakpoint).
- **Validação manual**:
  - menu no editor e no Explorer (arquivo/pasta) em um pacote sem debug info;
  - com `compileOnDebug=true`, breakpoint no `%test` para corretamente;
  - usuário sem `ALTER` no objeto → mensagem de erro clara.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `.sql` não indica o tipo do objeto | Fallback `package → procedure → function → trigger` ignorando `ORA-04043`; erro real é reportado |
| Schema do objeto ≠ usuário da conexão | Respeitar `schemaPattern` no modo schema; documentar que diffs exigem `coverageOwner`/perfil adequado |
| Recompilar em produção sem querer | Ação explícita (comando/menu) e `compileOnDebug` default `false` |
| Objeto inválido quebra após o `ALTER` | Apenas recompila com debug (não altera código); publicar erro no Problems via PRD-68 |

## 9. Rollout

- Feature de patch → **0.12.1** (junto dos PRDs 70/71/72).
- Atualizar README (tabela de config + Comandos + Troubleshooting), as 23
  variantes, `docs/wiki/Debugger.md`, `Database-requirements.md` e
  `docs/functional/11-debugger.md`.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `npm run compile`, `npm run lint`, `npm run test:unit` e
  `npm run test:coverage` passam (thresholds mantidos).
- Comando disponível na paleta, no editor e no Explorer; compila `.pks`/`.pkb`
  e detecta tipo de `.fnc`/`.prc`/`.trg`.
- `PLSQL_DEBUG` do objeto fica habilitado (verificado no banco).
- `compileOnDebug=true` faz o breakpoint parar sem passo manual.
- `compileOnDebug=false` mantém o comportamento atual inalterado.
- `npm run docs:check`, `brain:sync` e `brain:check` verdes.

## 11. Questões em aberto

- Incluir também `ALTER SESSION SET PLSQL_OPTIMIZE_LEVEL = 1` (para compilações
  futuras dentro da sessão do pool)? Inclinação: **não** — usar somente
  `COMPILE DEBUG` para não vazar estado na sessão do pool.
- Pasta: recursivo ou apenas primeiro nível? Inclinação: primeiro nível.
- Recompilar o **body** apenas (`COMPILE DEBUG BODY`) ou pacote inteiro?
  Inclinação: pacote inteiro, para cobrir spec+body.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-33-plsql-debugger-integration|PRD-33]] · [[prd-68-restore-oracle-diagnostics-and-reporter|PRD-68]] · [[prd-71-debugger-dbms-debug-fix|PRD-71]]
- 🚀 ⬅️ release anterior: [[prd-68-restore-oracle-diagnostics-and-reporter|PRD-68 (0.12.0)]] · ➡️ próxima release: [[prd-69-oracle-runner-typed-binds|PRD-69 (0.13.0)]]
<!-- brain:auto:end -->
