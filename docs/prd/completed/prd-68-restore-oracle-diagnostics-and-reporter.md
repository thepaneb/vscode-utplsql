<!-- GENERATED FROM docs/brain/20-PRDs/prd-68-restore-oracle-diagnostics-and-reporter.md — DO NOT EDIT -->

# PRD-68 — Religar diagnostics e reporter de sessão perdidos na migração Oracle-only

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber |
| Data | 2026-09-15 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/extension.ts`, `src/config.ts`, `src/state.ts`, `src/quickfix.ts`, `src/discovery.ts`, `package.json` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

A migração Oracle-only (PRD-64) removeu `src/compilationDiagnostics.ts`, `src/cli*.ts` e
`src/invocation.ts`, mas algumas funcionalidades não foram efetivamente portadas. Este
PRD religa o **diagnóstico de compilação PL/SQL** via Oracle, o **reporter adicional
volátil de sessão**, o diagnostic de **conexão inválida** e alinha a checagem de versão
e a extração de schema a comportamentos já documentados.

## 2. Contexto e problema

Comportamentos documentados que hoje não existem no código:

1. **Compilation diagnostics** — `oracleRunner.checkCompilationErrors()` (query
   `ALL_ERRORS`) existe, mas **nenhum caller** e não há `DiagnosticCollection`/source
   `"utPLSQL Compilation"`. A setting `utplsql.compilationDiagnostics.enabled` é lida em
   `config.ts:84` e ignorada.
2. **Reporter adicional volátil** — `state.setExtraReporter()` é chamado
   (`extension.ts:155`), mas `state.consumeExtraReporter()` nunca é consumido; a seleção
   do QuickPick é descartada e não entra na execução.
3. **`UTPLSQL_BAD_CONN`** — existe o handler de quick-fix (`quickfix.ts`), mas nenhum
   produtor; `validateOnActivation` retorna `[]` em falha de conexão.
4. **Threshold de versão** — o código usa `major < 3` (`quickfix.ts`), enquanto docs e a
   mensagem i18n dizem `< 3.1.0`.
5. **`extractSchemaFromPath`** — `match[1].toUpperCase()` sem guard (`discovery.ts:103`)
   lança quando o padrão não tem `{schema}`; a doc promete fallback `UNKNOWN`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Religar o diagnóstico de compilação PL/SQL no editor/Problems Panel (fonte
  `"utPLSQL Compilation"`), respeitando `utplsql.compilationDiagnostics.enabled`.
- Fazer o reporter adicional volátil valer para a próxima execução e depois ser
  descartado.
- Emitir `UTPLSQL_BAD_CONN` quando a conexão falhar na validação.
- Unificar o threshold de versão (uma constante) e alinhar a mensagem i18n.
- Guardar `extractSchemaFromPath` para retornar `UNKNOWN` (sem lançar).

**Não-objetivos**
- Reintroduzir CLI/Java (permanece Oracle-only).
- Novas funcionalidades de UI ou settings.
- Alterar o formato de conexão (TNS/Wallet seguem fora do escopo).

## 4. Requisitos

### RF1 — Diagnóstico de compilação via Oracle

`checkCompilationErrors()` deve alimentar um `vscode.DiagnosticCollection` com source
`"utPLSQL Compilation"`, mapeando cada erro para `file:line` (via `resolveStackFrameToUri`
quando aplicável). Desativado quando `utplsql.compilationDiagnostics.enabled = false`.

### RF2 — Reporter adicional volátil

Em `executeRunOracle`, consumir `state.consumeExtraReporter()` e incluí-lo na lista de
reporters da execução, com log `runner.extraReporter`. Limpar ao final (consumo único).

### RF3 — Diagnostic `UTPLSQL_BAD_CONN`

Em `validateOnActivation`, quando `getOracleInfo(conn)` falhar, emitir
`UTPLSQL_BAD_CONN` (Error) com o quick-fix já existente.

### RF4 — Threshold de versão

Centralizar o mínimo do utPLSQL (ex.: `UTPLSQL_MIN_VERSION = '3.1.0'`) e usar semver para
o aviso/quick-fix. Atualizar as mensagens i18n `runner.oldVersion`/`quickfix.oldVersion`.

### RF5 — Guard em `extractSchemaFromPath`

Se o padrão não tiver o grupo `{schema}`, retornar `UNKNOWN` (comportamento documentado)
em vez de lançar.

**Não-funcionais**
- RNF1 — Cobertura unitária para RF1, RF2, RF4 e RF5.
- RNF2 — Sem novos `console.log`; usar canais/i18n existentes.

## 5. Solução proposta

### 5.1 `oracleRunner.ts` / `extension.ts` (RF1)

Criar o `DiagnosticCollection` na ativação e passar o callback de coleta ao runner, que
chama `checkCompilationErrors(conn)` após o run e popula os diagnostics.

### 5.2 `state.ts` / `oracleRunner.ts` (RF2)

`consumeExtraReporter()` retorna e limpa; `executeRunOracle` inclui o valor em
`additionalReporters` efetivos.

### 5.3 `quickfix.ts` (RF3, RF4)

`validateOnActivation` emite `UTPLSQL_BAD_CONN` em falha; constante de versão mínima
compartilhada com `oracleRunner`/i18n.

## 6. Configuração

Nenhuma nova setting. `utplsql.compilationDiagnostics.enabled` volta a ter efeito real.

## 7. Plano de testes

- **Unitários**: `discovery.test.ts` (RF5), `quickfix.test.ts` (RF3/RF4),
  `oracleRunner.test.ts` (RF1/RF2 com mock de connection).
- **Integração**: `oracleCapabilities.test.ts` — diagnostic de compilação com objeto
  inválido real; reporter volátil aplicado.
- **Validação manual**: introduzir erro de sintaxe em `.pks` e ver o Problems Panel;
  escolher reporter pelo QuickPick e conferir no output da próxima execução.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Mapear linhas de `ALL_ERRORS` para o editor é impreciso | Reusar `resolveStackFrameToUri`; best-effort documentado |
| Reporter volátil conflitar com `additionalReporters` | Deduplicar como já ocorre com os defaults |
| Mudar o threshold de versão quebrar testes | Centralizar constante e atualizar testes |

## 9. Rollout

- Release alvo: 0.12.0 (mesma da migração).
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `npm test` passa.
- Objeto PL/SQL inválido aparece no Problems Panel com source `"utPLSQL Compilation"`.
- `utplsql.compilationDiagnostics.enabled = false` não emite diagnostics.
- Reporter escolhido no QuickPick aparece no output da próxima execução e não persiste.
- Conexão inválida gera `UTPLSQL_BAD_CONN`.
- Padrão de schema sem `{schema}` retorna `UNKNOWN` sem exceção.

## 11. Questões em aberto

- Manter `UTPLSQL_NO_COVERAGE`/`runner.applyCoverage` legado ou remover de vez?
- Threshold final: `3.1.0` (documentado) ou `3.0.0` (implementado)? Decidir e alinhar.
