# PRD-62 — Execução de scripts SQL contra perfil de conexão

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `src/scriptRunner.ts` (novo), `src/extension.ts`, `src/connectionProfiles.ts`, `src/types.ts`, `src/oracleRunner.ts`, `src/config.ts`, `package.json`, `docs/wiki/Configurações.md`, `docs/wiki/Conexão.md`, `docs/functional/09-configuration.md` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

Permitir executar scripts SQL/PL/SQL arbitrários (migrações, seeds, setup)
contra um **perfil de conexão** previamente definido, a partir do editor ativo
ou do Explorer (arquivo ou pasta). Após invocar por qualquer ponto, o usuário
escolhe a conexão em um QuickPick. Reaproveita `utplsql.profiles` e o runner
Oracle direto (`node-oracledb`), sem depender de Java/SQLcl/sqlplus.

Campos novos no perfil:
- `description` — exibida no picker de conexão (ex. "DEV Local", "TEST CI").
- `charset` — enum `utf8 | latin1 | win1252` que controla o encoding para
  ler/decodificar arquivos de script antes de enviar ao banco. Default `utf8`.

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

### 2.1 O problema do charset

Scripts em bancos legados (ex. Windows-1252 com `ç`, `ã`, `€`) ficam
corrompidos quando o driver os lê como UTF-8. O `node-oracledb` em modo thin
**sempre usa AL32UTF8 como client charset** — não existe parâmetro de charset na
conexão. A solução é decodificar o arquivo no encoding correto antes de enviar a
string ao driver.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Adicionar `description` (opcional) ao `ConnectionProfile` e exibi-lo no
  picker de conexão.
- Adicionar `charset` (enum: `utf8`, `latin1`, `win1252`) ao `ConnectionProfile`
  para decodificar scripts no encoding correto. Default `utf8` quando ausente.
- Comandos para executar: script aberto no editor, arquivo e pasta do Explorer.
- Sempre pedir a conexão (QuickPick dos perfis) após a invocação,
  independentemente do ponto de origem.
- Execução via Oracle direto (`node-oracledb`), sequencial, com saída
  estruturada por statement em um `OutputChannel`.
- Documentar os campos dos perfis no README e wiki (tabela campo a campo).
- Atualizar a cadeia de resolução de conexão na wiki (`Conexão.md`) com
  `activeProfile` como prioridade 1.

**Não-objetivos**
- Não é um runner de testes (não usa utPLSQL, não popula o Test Explorer).
- Não é um editor SQL completo (sem IntelliSense, sem transação interativa,
  sem substituição `&var` de variáveis).
- Não suporta SQLcl/sqlplus/CLI como backend.
- Não altera charset da conexão Oracle (driver thin é sempre AL32UTF8).
- Não suporta `ALTER SESSION SET NLS_*` por profile.
- Não adiciona codepages extras (só `utf8`, `latin1`, `win1252` via
  `TextDecoder` nativo; sem `iconv-lite`).

## 4. Requisitos

### RF1 — Campos novos no perfil

```typescript
// types.ts
export type ProfileCharset = 'utf8' | 'latin1' | 'win1252';

export interface ConnectionProfile {
  id: string;
  name: string;
  connection: string;
  description?: string;    // novo — exibido no picker
  charset?: ProfileCharset; // novo — encoding dos scripts, default 'utf8'
  sourcePath?: string;
  coverageOwner?: string;
  includePatterns?: string[];
  isDefault?: boolean;
  lastUsed?: string;
}
```

- `package.json`: adicionar `description` e `charset` ao schema de
  `utplsql.profiles.items`. `charset` é um `enum: ['utf8', 'latin1', 'win1252']`.
- `selectProfile` (`connectionProfiles.ts`) exibe `description` no `detail`
  (ou como segunda linha) junto do `maskConnection`. Quando `charset` não é
  `utf8`, exibe também (ex. `"DEV • win1252"`).
- `importFromSqlDeveloper`: perfis importados não têm charset → omite.

### RF2 — Picker de conexão obrigatório pós-invocação

Todo comando de execução (RF3/RF4) chama `selectProfile(getAllProfiles())`
após a invocação. Se não houver perfis, oferece criar/importar (reusa os
comandos existentes `utplsql.newProfile` / `utplsql.importSqlDevConnections`)
ou cancela com aviso. O perfil escolhido **não** precisa ser o ativo.

### RF3 — Executar script aberto no editor

Comando `utplsql.runScript`: lê o documento ativo (`.sql`/`.pks`/`.pkb`/`.fnc`/
`.prc`/`.trg`), pede a conexão e executa o conteúdo integral. O texto já vem
decodificado do VSCode (`document.getText()`) — charset do profile não se aplica
aqui (aplica-se só a `runScriptFile`/`runScriptFolder`).

### RF4 — Executar arquivo ou pasta do Explorer

- `utplsql.runScriptFile` (arquivo) e `utplsql.runScriptFolder` (pasta).
- Pasta: lista arquivos que casam `utplsql.scriptRunner.filePattern`, ordena
  alfabeticamente e executa em sequência.
- Arquivo lido como bytes (`fs.readFileSync` sem encoding) e decodificado via
  `decodeScript(bytes, profile.charset)`.

### RF5 — Motor de execução

`scriptRunner.ts` com funções puras (testáveis sem vscode):

```typescript
// scriptRunner.ts — puro (testável sem vscode)
export type ProfileCharset = 'utf8' | 'latin1' | 'win1252';
export interface SqlStatement { text: string; index: number; line: number; }
export function splitScript(text: string): SqlStatement[];
export function decodeScript(bytes: Uint8Array, charset?: ProfileCharset): string;
```

**`splitScript`** — blocos PL/SQL (`BEGIN`, `DECLARE`, `CREATE OR REPLACE ...
FUNCTION/PROCEDURE/PACKAGE/TRIGGER/TYPE`) terminam em `/` em linha própria.
Demais statements SQL terminam em `;`. Comentários (`--` e `/* */`) e literais
string são preservados (não quebram o split).

**`decodeScript`** — converte bytes em string JS:
- `utf8` → `TextDecoder('utf-8', { fatal: false })` (remove BOM se presente).
- `latin1` → `TextDecoder('iso-8859-1')`.
- `win1252` → `TextDecoder('windows-1252')` (cobre `€` 0x80, aspas curvas
  0x80-0x9F — `latin1` ≠ `win1252` neste intervalo).
- Ausente/inválido → `utf8` (fail-safe).
- Sem `iconv-lite` — `TextDecoder` é nativo do Node.

Execução sequencial via `conn.execute(stmt, {}, { autoCommit: cfg.scriptRunnerAutoCommit })`,
com `conn.callTimeout` configurável e `token.onCancellationRequested` →
`conn.break()`.

### RF6 — Saída estruturada

`OutputChannel` dedicado ("utPLSQL Script"): para cada statement, linha
`[N] (ok|erro) <duração>ms — <resumo>` + mensagem de erro completa quando
falhar; `rowsAffected` quando aplicável; linhas de `DBMS_OUTPUT` quando
`utplsql.scriptRunner.dbmsOutput` estiver ativo (usando
`DBMS_OUTPUT.ENABLE` + `DBMS_OUTPUT.GET_LINE`).

Ao ler arquivo do Explorer, logar o charset usado no OutputChannel
(ex. `[1] arquivo.sql (win1252)`).

### RF7 — Política de erro

`utplsql.scriptRunner.stopOnError` (default `true`): para na primeira falha ou
continua registrando as demais. Nunca expõe a senha (usa `maskConnection`).

**Não-funcionais**
- RNF1 — Senha nunca é logada ou ecoada no output.
- RNF2 — Execução cancelável (`CancellationToken` + `conn.break()`).
- RNF3 — Sem `oracledb` disponível → mensagem amigável e aborta.
- RNF4 — `splitScript` e `decodeScript` são puros e cobertos por testes unitários.

## 5. Solução proposta

### 5.1 `scriptRunner.ts` (novo)

- `decodeScript(bytes, charset)` — puro.
- `splitScript(text)` — puro.
- `executeScript({ connection, statements, output, token, options })` — abre
  conexão via `ensurePool`/`parseConnString` (reuso de `oracleRunner.ts`) e
  executa em sequência, escrevendo no `OutputChannel`.

### 5.2 `connectionProfiles.ts`

- `selectProfile`: exibe `description` no `detail`; quando `charset` não é
  `utf8`, acrescenta ao lado (ex. `"DEV • win1252"`).
- Adicionar helper opcional `pickProfileOrGuide()` (perfis vazios → sugestão
  de criar/importar).

### 5.3 `extension.ts`

- Registrar `utplsql.runScript`, `utplsql.runScriptFile`,
  `utplsql.runScriptFolder`.
- Wizard `newProfile` (~linha 407): QuickPick opcional de charset após
  `sourcePath` (default `utf8`, pode pular).
- Criar e gerenciar o `OutputChannel` "utPLSQL Script".
- Menus: `editor/context` (arquivos suportados) e `explorer/context`
  (arquivo e pasta).

### 5.4 `config.ts` + `package.json`

Novas settings (ver §6). Schema de `utplsql.profiles.items` expandido com
`description`, `charset`.

### 5.5 Documentação

- Wiki `Configurações.md`: tabela campo a campo dos perfis (nome, tipo,
  obrigatório?, default, descrição) + exemplo JSONC de dois perfis.
- Wiki `Conexão.md`: adicionar `activeProfile` no topo da tabela de prioridade
  (antes de `utplsql.connection`).
- README: expandir linha de `utplsql.profiles` na tabela de config com link
  para a seção da wiki (evitar duplicar tabela em 20+ traduções).

## 6. Configuração

### Settings do scriptRunner

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.scriptRunner.stopOnError` | `true` | Para na primeira falha (`false` = continua). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` em cada statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs para execução de pasta. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captura e exibe `DBMS_OUTPUT`. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | `callTimeout` por statement. |

### Campos do perfil (schema `utplsql.profiles.items`)

| Campo | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `id` | string | Sim (auto-gerado) | — | UUID do perfil. |
| `name` | string | Sim | — | Nome amigável (ex. "DEV Local"). |
| `connection` | string | Sim | — | String de conexão (`user/pass@//host:port/service`). |
| `description` | string | Não | — | Descrição exibida no picker de conexão. |
| `charset` | enum | Não | `utf8` | Encoding para ler scripts: `utf8`, `latin1` ou `win1252`. |
| `sourcePath` | string | Não | herda do global | Sobrescreve `utplsql.sourcePath`. |
| `coverageOwner` | string | Não | herda do global | Sobrescreve `utplsql.coverageOwner`. |
| `includePatterns` | string[] | Não | herda do global | Sobrescreve `utplsql.includePatterns`. |
| `isDefault` | boolean | Não | `false` | Marca perfil como padrão ao carregar workspace. |
| `lastUsed` | string | Não | — | Timestamp ISO da última uso. |

### Exemplo JSONC

```jsonc
// .vscode/settings.json ou settings do usuário
{
  "utplsql.activeProfile": "dev",
  "utplsql.profiles": [
    {
      "id": "a1b2c3d4-...",
      "name": "DEV Local",
      "connection": "app/senha@//localhost:1521/XEPDB1",
      "description": "Banco local de desenvolvimento",
      "charset": "utf8",
      "sourcePath": "src"
    },
    {
      "id": "e5f6g7h8-...",
      "name": "LEGADO Windows",
      "connection": "legacy/senha@//db-antigo:1521/LEGADO",
      "description": "Banco legado Windows-1252",
      "charset": "win1252",
      "sourcePath": "legacy/src"
    }
  ]
}
```

### Comandos

| Comando | Título |
|---|---|
| `utplsql.runScript` | utPLSQL: Executar script |
| `utplsql.runScriptFile` | utPLSQL: Executar arquivo de script |
| `utplsql.runScriptFolder` | utPLSQL: Executar pasta de scripts |

Menus de contexto no editor e Explorer.

## 7. Plano de testes

- **Unitários** (`scriptRunner.test.ts`):
  - `splitScript` com PL/SQL (`/`), SQL (`;`), comentários e literais;
    casos de borda (vazio, sem terminador).
  - `decodeScript` com fixture `çãõ € ""` em cada charset;
    `latin1` vs `win1252` divergem em bytes 0x80-0x9F;
    ausente/inválido → `utf8`; BOM removido; vazio não quebra.
- **Unitários** (`connectionProfiles.test.ts`):
  - `selectProfile` renderiza `description` e `charset` (quando não `utf8`).
  - `maskConnection` não vaza senha.
- **Integração** (com banco, `describeDB`):
  - Executar um `.sql` com DDL + DML; verificar rows/erros.
  - `stopOnError` false continua após falha.
  - Script com caracteres acentuados via perfil `win1252`.
- **Validação manual**:
  - Rodar script do editor → picker → output.
  - Rodar arquivo/pasta do Explorer → charset no output.
  - Cancelar durante execução.
  - Sem perfis → sugestão de criar/importar.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Split incorreto de statements (PL/SQL `;` interno vs `/`) | `splitScript` puro + fixtures; heurística por tipo de bloco; documentar limitações. |
| Transações: commit parcial em script grande | `autoCommit` configurável; sem gerenciamento transacional interativo (não-objetivo). |
| Buffer de `DBMS_OUTPUT` estourando | `DBMS_OUTPUT.ENABLE(NULL)` (ilimitado) + leitura incremental. |
| Vazamento de senha | `maskConnection` em todo output/erro; testes dedicados. |
| `oracledb` indisponível | Fallback com mensagem amigável (sem CLI — é Oracle direto por design). |
| Encoding incorreto (arquivo charset diferente do marcado) | Log do charset usado no OutputChannel + Troubleshooting na wiki; sem auto-detecção (não confiável). |
| Editor vs arquivo divergem encoding | Documentar: editor usa encoding do VSCode; profile vale para `runScriptFile`/`runScriptFolder`. |

## 9. Rollout

- Release 0.12.0 (minor).
- CHANGELOG: "Execução de scripts SQL contra perfis de conexão (com charset
  por perfil e campos `description`/`charset` nos profiles)".
- README: expandir linha de `utplsql.profiles` com link para wiki.
- Wiki: nova seção em `Configurações.md` com tabela campo a campo dos perfis;
  atualizar `Conexão.md` com `activeProfile` na cadeia de resolução.

## 10. Critérios de aceite

- `npm test` passa.
- Perfil aceita `description` e `charset` e ambos são exibidos no picker.
- `utplsql.runScript` executa o script aberto após escolher a conexão.
- `utplsql.runScriptFile`/`runScriptFolder` funcionam pelo Explorer.
- Script com `win1252` e caracteres `çãõ €` executa sem corrupção quando
  profile marca `win1252`; corrompe com `utf8` (reproduzível — prova que o
  campo faz efeito).
- Saída por statement no OutputChannel; charset usado logado; senha mascarada.
- Sem perfis → fluxo guia para criar/importar.
- `stopOnError`/`autoCommit`/`dbmsOutput` respeitados.
- Perfil sem `charset` comporta-se como hoje (`utf8` — compatibilidade retroativa).
- Wiki `Configurações.md` documenta todos os campos do perfil.
- Wiki `Conexão.md` inclui `activeProfile` na tabela de prioridade.

## 11. Questões em aberto

- Suportar variáveis de substituição (`&var`/`&&var`) com prompt? — Follow-up.
- Executar script por perfil ativo sem picker (setting "usar perfil ativo")?
  — Follow-up; hoje sempre pergunta.
- Suporte a scripts com `SQL*Plus`-specifics (`SET`, `SPOOL`)? — Fora de escopo
  (Oracle direto, não sqlplus).
- Comando "executar a seleção atual do editor"? — Follow-up.
- Codepages adicionais (CP860, EBCDIC)? — Fora de escopo; `TextDecoder` nativo
  suporta `utf8`, `latin1`, `win1252`. Se necessário no futuro, adicionar
  `iconv-lite` como dependência.
