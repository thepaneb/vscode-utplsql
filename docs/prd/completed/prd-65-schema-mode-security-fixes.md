# PRD-65 — Correções críticas de schema-mode e segurança

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-15 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `src/results.ts`, `src/discovery.ts`, `src/decorations.ts`, `src/state.ts`, `src/extension.ts`, `src/connectionProfiles.ts`, `src/quickfix.ts`, `src/config.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

Corrigir lacunas críticas do modo schema que impedem navegação e feedback visual
(decorações inline e "Go to Error" para suites descobertas apenas no banco) e
eliminar o armazenamento de senhas em texto puro nas settings. Inclui correções
no parse de credenciais e a remoção do prompt de conexão na ativação.

## 2. Contexto e problema

- **Jump to failure em suites só-DB**: `resolveStackFrameToUri` funciona nos
  dois modos para suites com arquivo físico (`state.cachedItems` é populado por
  `buildFileTree` em `extension.ts:731` e `buildSchemaTree` em
  `extension.ts:813`). Porém suites mescladas do banco (`mergeDbSuites` →
  `discoverSchemaFromConn`) usam URI virtual `utplsql-db:/<SCHEMA>/<PKG>.pks`
  (`discovery.ts:174`) e **não há** `registerTextDocumentContentProvider` para
  esse scheme — o "Go to Error" aponta para um documento que não abre. O
  fallback de workspace (`results.ts:68-73`) devolve `<root>/<pkg>.pks`, ignorando
  layout aninhado.
- **Decorações no schema mode**: `DecorationManager.update` resolve itens via
  `findTestItem` (`decorations.ts:142-151`), que percorre apenas 2 níveis. No modo
  schema a árvore é schema → package → suite → test (4 níveis), então
  `test:*` nunca é encontrado e nenhum resultado é decorado. O primitive correto
  já existe (`state.getSuiteItem`, usado em `extension.ts:842`).
- **Senhas em texto puro**: `saveProfiles` grava o array `utplsql.profiles`
  inteiro — incluindo a senha de `user/pass@...` — em `ConfigurationTarget.Global`
  (`connectionProfiles.ts:109-113`). `newProfile` (`extension.ts:429-467`) e o
  import do SQL Developer (`connectionProfiles.ts:66`) alimentam senhas em texto
  puro que acabam em `settings.json`.
- **Credenciais com caracteres especiais**: `parseConnString`
  (`oracleRunner.ts:16`, regex `([^/]+)/([^@]+)@...`) e o importador
  (`connectionProfiles.ts:66`) assumem que usuário/senha não contêm `/` ou `@`.
- **Prompt na ativação**: `SetupValidator.validateOnActivation()` chama
  `resolveConnection()` (`quickfix.ts:38`), que abre um input box de senha na
  ativação quando não há conexão configurada.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Tornar "Go to Error" funcional para suites descobertas apenas no banco.
- Restaurar as decorações inline de resultado no modo schema.
- Remover senhas das settings, movendo-as para `SecretStorage`.
- Aceitar credenciais com `/` e `@` sem quebrar o parse.
- Impedir prompt de conexão durante a ativação.

**Não-objetivos**
- Suporte a wallet/TLS e TNS aliases completos (fica na PRD-66, RF3).
- Redesenho amplo de UX de perfis (ex.: editar/excluir perfis).
- Refatoração de `extension.ts` (PRD-67).

## 4. Requisitos

### RF1 — Provider de conteúdo para o scheme `utplsql-db`

Registrar um `TextDocumentContentProvider` para `utplsql-db` que busca o fonte do
package em `ALL_SOURCE` (read-only) usando os helpers de conexão/pool existentes,
permitindo que o "Go to Error" abra suites só-DB na linha correta.

O fallback de workspace de `resolveStackFrameToUri` deve procurar entre os
`uri`s das suites descobertas (por `packageName`) em todos os workspace folders
antes de sintetizar `<root>/<pkg>.pks`.

```typescript
// src/results.ts — fallback proposto
const metas = state.cachedItems.map((i) => state.getMeta(i)).filter(Boolean);
const match = metas.find(
  (m) => m?.kind === 'suite' && m.packageName.toLowerCase() === objName,
);
if (match?.uri) return new vscode.Location(match.uri, pos);
```

### RF2 — Decorações resolvidas via `state` no schema mode

`DecorationManager` deve resolver o `TestItem` a partir do `id` por um mapa de
estado confiável (ex.: `state.getSuiteItem`/meta), em vez do walk de 2 níveis de
`findTestItem`. O caminho de arquivo (`file`) deve continuar idêntico.

### RF3 — Senhas em `SecretStorage`

- Perfis passam a guardar a senha em `context.secrets` (chave por `profile.id`);
  `utplsql.profiles` mantém apenas `user@host:port/service`/metadados.
- `saveProfiles`/`newProfile`/import gravam no secret e mascaram na exibição.
- Migração: na primeira leitura de um perfil legado com senha inline, gravar no
  secret e reescrever a settings sem a senha.

### RF4 — Split de credenciais robusto

Separar credenciais no **primeiro** `/` e no **último** `@`, sem re-encodar o
`connectString` (que deve ser entregue ao `oracledb` inalterado). Aplicar em
`parseConnString` (`oracleRunner.ts`) e no importador
(`connectionProfiles.ts`).

### RF5 — Ativação sem prompt

`validateOnActivation` usa `resolveConnectionNoPrompt()`; o prompt permanece
apenas em comandos explícitos (`runAll`, `showInfo`, `selectReporter`, …).

**Não-funcionais**
- RNF1 — Modo arquivo (`file`) sem regressão.
- RNF2 — Nenhuma senha em texto puro em `settings.json` após migração.
- RNF3 — `npm test`, `npm run lint` e `npm run test:coverage` verdes nos
  thresholds atuais (65% linhas, 80% branches, 70% funções).

## 5. Solução proposta

### 5.1 Provider `utplsql-db` (`src/discovery.ts` / `src/extension.ts`)

Registrar em `activate` um `TextDocumentContentProvider`
(`context.subscriptions`), com cache em memória por URI e reuso de
`ensurePool`/`parseConnString`. Resolver o schema/package a partir do path
virtual (`utplsql-db:/<SCHEMA>/<PKG>.pks`).

### 5.2 Decorações (`src/decorations.ts`)

Injetar `state` ou um resolver `(id) => TestItem | undefined` no
`DecorationManager`; usar o mapa de suites/meta. Remover o walk de árvore.

### 5.3 SecretStorage (`src/connectionProfiles.ts`, `src/extension.ts`)

Trocar `saveProfiles` por funções que recebem `context.secrets`; criar
`upsertProfile`, `getProfileConnection(profile)` que recompõe a connection com a
senha do secret no momento da conexão. Ajustar os chamadores em `extension.ts`.

### 5.4 Credenciais (`src/oracleRunner.ts`, `src/connectionProfiles.ts`)

```typescript
// split no primeiro '/' e no último '@'
const at = connStr.lastIndexOf('@');
const cred = at >= 0 ? connStr.slice(0, at) : connStr;
const connectString = at >= 0 ? connStr.slice(at + 1) : '';
const slash = cred.indexOf('/');
const user = slash >= 0 ? cred.slice(0, slash) : cred;
const password = slash >= 0 ? cred.slice(slash + 1) : '';
```

### 5.5 Ativação (`src/quickfix.ts`)

Trocar `resolveConnection()` por `resolveConnectionNoPrompt()` em
`validateOnActivation`.

## 6. Configuração

- `utplsql.profiles`: formato dos itens muda (sem senha) — **migração
  automática** no primeiro uso; documentar no README.
- Nenhum comando novo.

## 7. Plano de testes

- **Unitários**:
  - `resolveStackFrameToUri` com suite virtual + fallback por `meta.uri`.
  - Decorações com árvore de 4 níveis (schema → package → suite → test).
  - `parseConnString` com `/` e `@` na senha; importador com `sid`/`serviceName`.
  - Perfis: gravação sem senha + recomposição via secret (fake `SecretStorage`).
- **Integração** (`describeDB`): refresh em schema mode + "Go to Error" abrindo
  `utplsql-db:`.
- **Manual**: ativar workspace com `.pks` e sem conexão → sem prompt; importar
  SQL Developer → settings sem senha.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Migração de perfis corromper configuração existente | Migrar de forma idempotente; manter senha só se o secret falhar e avisar. |
| Provider `utplsql-db` expor dados sensíveis | Conteúdo read-only do `ALL_SOURCE` do schema descoberto; sem credenciais. |
| Regressão no modo arquivo | Testes existentes de `resolveStackFrameToUri`/decorations mantidos. |

## 9. Rollout

- Release 0.12.0 (minor).
- CHANGELOG: "Correções de schema-mode (decorações e go-to-error) e senhas em
  SecretStorage".

## 10. Critérios de aceite

- `npm test`, `npm run lint`, `npm run test:coverage` verdes.
- "Go to Error" abre suite só-DB no schema mode; decorações aparecem no schema.
- Nenhuma senha em texto puro em `settings.json` (novo perfil e migrado).
- Credenciais com `/`/`@` conectam corretamente.
- Ativação não exibe prompt de conexão.

## 11. Questões em aberto

- Migrar senhas legadas automaticamente ou exigir re-entrada? (Recomendado:
  migrar no primeiro uso e limpar a settings.)
- Suites só-DB devem abrir read-only mesmo sem `ALL_SOURCE` acessível? (Nesse
  caso, manter o URI virtual e exibir aviso.)
