# Plano de execução — PRD-65 (schema-mode + segurança)

| Campo | Valor |
|---|---|
| Data | 2026-09-15 |
| Branch | `release/v0.12.0` |
| PRD | [prd-65-schema-mode-security-fixes](../../docs/prd/approved/prd-65-schema-mode-security-fixes.md) |
| Versão alvo | 0.12.0 |
| Esforço | 2–3 dias · Complexidade Média-Alta |

## Estado de partida

- Modo `file` e `schema` funcionam; suites só-DB usam URI virtual
  `utplsql-db:/<SCHEMA>/<PKG>.pks` (`discovery.ts`) sem `TextDocumentContentProvider`.
- `DecorationManager.update` resolve por `findTestItem` (2 níveis) — não alcança
  `test:*` no modo schema (4 níveis).
- `saveProfiles` grava `utplsql.profiles` (com senha) em `ConfigurationTarget.Global`.
- `parseConnString` (regex `([^/]+)/([^@]+)@...`) rejeita `/`/`@` em credenciais.
- `SetupValidator.validateOnActivation()` chama `resolveConnection()` → prompt na ativação.
- Gates atuais: compile, lint, ~350 unit, coverage (65/80/70), integração com banco.

## Ordem de execução (risco crescente — um commit por etapa)

| Ordem | Requisito | Arquivos | Esforço | Risco | Por quê |
|---|---|---|---|---|---|
| 1 | RF4 — split de credenciais (1º `/`, último `@`; `connectString` opaco) | `oracleRunner.ts`, `connectionProfiles.ts` | 0,5 dia | Baixo | Base para RF3 e para a PRD-66 RF3; puro e testável |
| 2 | RF5 — ativação sem prompt (`resolveConnectionNoPrompt`) | `quickfix.ts` | 2 h | Baixo | Isolado |
| 3 | RF2 — decorações via resolver de `state` | `decorations.ts`, `extension.ts` | 0,5 dia | Médio | Não pode regredir o modo `file` |
| 4 | RF1 — provider `utplsql-db` + fallback por `meta.uri` em `resolveStackFrameToUri` | `discovery.ts`, `extension.ts`, `results.ts` | 1 dia | Médio-Alto | Exige pool/ALL_SOURCE; integração real |
| 5 | RF3 — senhas em `SecretStorage` + migração de perfis legados | `connectionProfiles.ts`, `extension.ts`, `state.ts` | 1 dia | Alto | Muda o formato de `utplsql.profiles`; migração idempotente |

> RF4 antes de RF3: o formato do perfil sem senha depende do split robusto.
> RF3 por último: é a mudança de maior impacto (persistência + migração).

## Comandos e gates por etapa

Cada etapa fecha com `npm run compile && npm run lint && npm run test:unit`
verde + o gate específico. Falha não resolvível rápido ⇒ reverter o commit da
etapa e seguir.

### 1. RF4 — credenciais

```sh
node --test out/test/unit/oracleRunner.test.js out/test/unit/connectionProfiles.test.js
# casos: senha com '/', com '@', ambos, sem porta, sem '//'
```

### 2. RF5 — ativação

```sh
node --test out/test/unit/quickfix.test.js
```

### 3. RF2 — decorações

```sh
node --test out/test/unit/decorations.test.js
# árvore 4 níveis (schema → package → suite → test) + regressão modo file
```

### 4. RF1 — provider

```sh
node --test out/test/unit/results.test.js
npm run test:integration        # describeDB: refresh schema mode + Go to Error
```

### 5. RF3 — SecretStorage

```sh
node --test out/test/unit/connectionProfiles.test.js   # fake SecretStorage
npm run test:unit && npm run test:coverage
# manual: importar SQL Developer → settings.json sem senha; perfil legado migra
```

## Dependências e interações

- **PRD-66 RF3** reaproveita o split de RF4 (não duplicar a lógica).
- **PRD-66 RF5** (`withOracleConnection`) deve ser usado pelo provider de RF1 —
  coordenar para não reimplementar aquisição de conexão.
- **PRD-67 RF1** refatora `extension.ts`; fazer esta PRD antes para evitar rebase.
- Mudança de formato de `utplsql.profiles` exige atualizar **README + wiki
  Configuration** (skill `docs-fidelity`).

## Rotina de conclusão da PRD

1. Mover `docs/prd/approved/prd-65-*.md` → `docs/prd/completed/` (Status → Concluído).
2. `docs/prd/index.md`: linha 65 → 🟢 Concluídos (Versão 0.12.0) + árvore Estrutura.
3. `CHANGELOG.md`: entry na 0.12.0.
4. `npm run docs:check && npm run brain:sync && npm run brain:check`.
5. `sync-prds` (label `prd:completed`, fecha a issue #84).

## Observações

- Migração de senha: migrar no primeiro uso e **limpar** a settings; se o secret
  falhar, manter e avisar (não perder acesso).
- Suites só-DB sem `ALL_SOURCE`: manter URI virtual e exibir aviso.
