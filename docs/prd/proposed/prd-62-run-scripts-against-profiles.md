# PRD-62 — Execução de scripts SQL contra perfil de conexão

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.17.0 |
| Arquivos afetados | `src/scriptRunner.ts` (novo), `src/extension.ts`, `src/connectionProfiles.ts`, `src/types.ts`, `src/oracleRunner.ts`, `src/config.ts`, `package.json` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

Permitir executar scripts SQL/PL/SQL arbitrários (migrações, seeds, setup)
contra um **perfil de conexão** previamente definido, a partir do editor ativo
ou do Explorer (arquivo ou pasta). Após invocar por qualquer ponto, o usuário
escolhe a conexão em um QuickPick. Reaproveita `utplsql.profiles` e o runner
Oracle direto (`node-oracledb`), sem depender de Java/SQLcl/sqlplus.

## 2. Contexto e problema

Hoje `utplsql.profiles` serve apenas ao runner de testes. Não há como rodar um
script ad hoc contra um banco escolhido — o usuário recorre a uma ferramenta
externa (SQLcl, SQL Developer, sqlplus). A infraestrutura de conexão já existe:

- `getAllProfiles()` / `selectProfile()` / `maskConnection()`
  (`connectionProfiles.ts`);
- `parseConnString()` e `ensurePool()` (`oracleRunner.ts`);
- `oracledb` como `optionalDependencies` (thin driver, já embarcado no VSIX).

Falta o **motor de execução de scripts** (split de statements + execução
sequencial) e a UI de invocação/seleção de conexão.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Adicionar `description` (opcional) ao `ConnectionProfile` e exibi-lo no
  picker de conexão.
- Comandos para executar: script aberto no editor, arquivo e pasta do Explorer.
- Sempre pedir a conexão (QuickPick dos perfis) após a invocação,
  independentemente do ponto de origem.
- Execução via Oracle direto (`node-oracledb`), sequencial, com saída
  estruturada por statement em um `OutputChannel`.

**Não-objetivos**
- Não é um runner de testes (não usa utPLSQL, não popula o Test Explorer).
- Não é um editor SQL completo (sem IntelliSense, sem transação interativa,
  sem substituição `&var` de variáveis).
- Não suporta SQLcl/sqlplus/CLI como backend.

## 4. Requisitos

### RF1 — `description` no perfil

```typescript
// types.ts
export interface ConnectionProfile {
  id: string;
  name: string;
  connection: string;
  description?: string;   // novo
  // ...demais campos existentes
}
```

- `package.json`: adicionar `description` ao schema de `utplsql.profiles.items`.
- `selectProfile` (`connectionProfiles.ts`) exibe `description` no `detail`
  (ou como segunda linha) junto do `maskConnection`.

### RF2 — Picker de conexão obrigatório pós-invocação

Todo comando de execução (RF3/RF4) chama `selectProfile(getAllProfiles())`
após a invocação. Se não houver perfis, oferece criar/importar (reusa os
comandos existentes `utplsql.newProfile` / `utplsql.importSqlDevConnections`)
ou cancela com aviso. O perfil escolhido **não** precisa ser o ativo.

### RF3 — Executar script aberto no editor

Comando `utplsql.runScript`: lê o documento ativo (`.sql`/`.pks`/`.pkb`/`.fnc`/
`.prc`/`.trg`), pede a conexão e executa o conteúdo integral.

### RF4 — Executar arquivo ou pasta do Explorer

- `utplsql.runScriptFile` (arquivo) e `utplsql.runScriptFolder` (pasta).
- Pasta: lista arquivos que casam `utplsql.scriptRunner.filePattern`, ordena
  alfabeticamente e executa em sequência.

### RF5 — Motor de execução

`scriptRunner.ts` com função pura de split:

```typescript
// scriptRunner.ts — puro (testável sem vscode)
export interface SqlStatement { text: string; index: number; line: number; }
export function splitScript(text: string): SqlStatement[];
```

- Blocos PL/SQL (`BEGIN`, `DECLARE`, `CREATE OR REPLACE ... FUNCTION/PROCEDURE/
  PACKAGE/TRIGGER/TYPE`) terminam em `/` em linha própria.
- Demais statements SQL terminam em `;`.
- Comentários (`--` e `/* */`) e literais string são preservados (não quebram
  o split).

Execução sequencial via `conn.execute(stmt, {}, { autoCommit: cfg.scriptRunnerAutoCommit })`,
com `conn.callTimeout` configurável e `token.onCancellationRequested` →
`conn.break()`.

### RF6 — Saída estruturada

`OutputChannel` dedicado ("utPLSQL Script"): para cada statement, linha
`[N] (ok|erro) <duração>ms — <resumo>` + mensagem de erro completa quando
falhar; `rowsAffected` quando aplicável; linhas de `DBMS_OUTPUT` quando
`utplsql.scriptRunner.dbmsOutput` estiver ativo (usando
`DBMS_OUTPUT.ENABLE` + `DBMS_OUTPUT.GET_LINE`).

### RF7 — Política de erro

`utplsql.scriptRunner.stopOnError` (default `true`): para na primeira falha ou
continua registrando as demais. Nunca expõe a senha (usa `maskConnection`).

**Não-funcionais**
- RNF1 — Senha nunca é logada ou ecoada no output.
- RNF2 — Execução cancelável (`CancellationToken` + `conn.break()`).
- RNF3 — Sem `oracledb` disponível → mensagem amigável e aborta.
- RNF4 — `splitScript` é puro e coberto por testes unitários.

## 5. Solução proposta

### 5.1 `scriptRunner.ts` (novo)

- `splitScript(text)` — puro.
- `executeScript({ connection, statements, output, token, options })` — abre
  conexão via `ensurePool`/`parseConnString` (reuso de `oracleRunner.ts`) e
  executa em sequência, escrevendo no `OutputChannel`.

### 5.2 `connectionProfiles.ts`

`selectProfile` passa a exibir `description`; adicionar helper opcional
`pickProfileOrGuide()` (perfis vazios → sugestão de criar/importar).

### 5.3 `extension.ts`

- Registrar `utplsql.runScript`, `utplsql.runScriptFile`,
  `utplsql.runScriptFolder`.
- Criar e gerenciar o `OutputChannel` "utPLSQL Script".
- Menus: `editor/context` (arquivos suportados) e `explorer/context`
  (arquivo e pasta).

### 5.4 `config.ts` + `package.json`

Novas settings (ver §6).

## 6. Configuração

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.scriptRunner.stopOnError` | `true` | Para na primeira falha (`false` = continua). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` em cada statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs para execução de pasta. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captura e exibe `DBMS_OUTPUT`. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | `callTimeout` por statement. |

Comandos: `utPLSQL: Executar script`, `utPLSQL: Executar arquivo de script`,
`utPLSQL: Executar pasta de scripts`. Menus de contexto no editor e Explorer.

## 7. Plano de testes

- **Unitários** (`scriptRunner.test.ts`): `splitScript` com PL/SQL (`/`), SQL
  (`;`), comentários e literais; casos de borda (vazio, sem terminador).
- **Unitários**: `selectProfile` renderiza `description`; `maskConnection` não
  vaza senha.
- **Integração** (com banco, `describeDB`): executar um `.sql` com DDL + DML;
  verificar rows/erros; `stopOnError` false continua após falha.
- **Validação manual**: rodar script do editor → picker → output; rodar pasta;
  cancelar durante execução; sem perfis → sugestão de criar/importar.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Split incorreto de statements (PL/SQL `;` interno vs `/`) | `splitScript` puro + fixtures; heurística por tipo de bloco; documentar limitações. |
| Transações: commit parcial em script grande | `autoCommit` configurável; sem gerenciamento transacional interativo (não-objetivo). |
| Buffer de `DBMS_OUTPUT` estourando | `DBMS_OUTPUT.ENABLE(NULL)` (ilimitado) + leitura incremental. |
| Vazamento de senha | `maskConnection` em todo output/erro; testes dedicados. |
| `oracledb` indisponível | Fallback com mensagem amigável (sem CLI — é Oracle direto por design). |

## 9. Rollout

- Release 0.17.0 (minor).
- CHANGELOG: "Execução de scripts SQL contra perfis de conexão".
- README: nova seção + tabela de config, Comandos, Troubleshooting.

## 10. Critérios de aceite

- `npm test` passa.
- Perfil aceita `description` e exibe no picker.
- `utplsql.runScript` executa o script aberto após escolher a conexão.
- `utplsql.runScriptFile`/`runScriptFolder` funcionam pelo Explorer.
- Saída por statement no OutputChannel; senha mascarada.
- Sem perfis → fluxo guia para criar/importar.
- `stopOnError`/`autoCommit`/`dbmsOutput` respeitados.

## 11. Questões em aberto

- Suportar variáveis de substituição (`&var`/`&&var`) com prompt? — Follow-up.
- Executar script por perfil ativo sem picker (setting "usar perfil ativo")?
  — Follow-up; hoje sempre pergunta.
- Suporte a scripts com `SQL*Plus`-specifics (`SET`, `SPOOL`)? — Fora de escopo
  (Oracle direto, não sqlplus).
- Comando "executar a seleção atual do editor"? — Follow-up.
