---
tipo: prd
id: PRD-76
aliases: [PRD-76]
status: proposed
titulo: "Execução e export com reporter arbitrário"
versao: "0.14.0"
data: "2026-09-19"
autor: "Gil Cleber Barboza"
versao_titulo: "0.14.0 — Árvore, relatórios, conectividade e segurança"
verificado: 2026-09-23
tags: [prd]
---

# PRD-76 — Execução e export com reporter arbitrário

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-19 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/commands/run.ts`, `src/commands/deps.ts`, `src/config.ts`, `package.json`, `README.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Permitir escolher qualquer reporter disponível no banco (`ut_runner.
get_reporters_list`) e **exportar** a saída para o Output channel ou para um
arquivo, com parâmetros de exportação (`a_client_character_set`,
`a_color_console`). Hoje só existem reporters adicionais fixos por setting e um
reporter volátil de sessão cuja saída se mistura ao output do run. Referência de
porte: `paddi35/utplsql-for-vscode` (`src/db/reporterDao.ts`,
`src/testing/reporterProfile.ts`).

## 2. Contexto e problema

- `utplsql.additionalReporters` (`package.json:142`) é fixo e entra em **todo**
  run; não há como rodar um reporter pontual escolhido na hora.
- O reporter de sessão selecionado por `utPLSQL: Select additional reporter...`
  é consumido em `executeRunOracle` (`src/oracleRunner.ts:486`) e concatenado
  aos runners, mas sua saída cai no mesmo buffer do JUnit/documentation e é
  apenas `appendOutput` — não há arquivo, nem charset, nem cor.
- Não há item de menu no Test Explorer para "rodar com reporter".

## 3. Objetivos / Não-objetivos

**Objetivos**
- Comando `utPLSQL: Run with Reporter (Export)` com QuickPick dos reporters do
  banco.
- Rodar a seleção (cursor, item do Test Explorer ou QuickPick de objetos) com o
  reporter escolhido e gravar em Output ou arquivo (`showSaveDialog`).
- Settings `utplsql.reporter.clientCharacterSet` e
  `utplsql.reporter.colorConsole` (bind `a_client_character_set` /
  `a_color_console`).
- Item de contexto no Test Explorer (`testing/item/context`).

**Não-objetivos**
- Substituir os reporters padrão do run normal (documentation + JUnit).
- Exportar cobertura (já coberto pelo fluxo de cobertura e PRD-79).
- Editor visual de relatório (webview).

## 4. Requisitos

### RF1 — Coleta da saída do reporter

Estender `OracleRunOptions` (`src/oracleRunner.ts:383`) com
`exportReporter?: { name: string; charset?: string; colorConsole?: boolean }`.
Quando presente, o runner deve capturar **somente** a saída textual que não for
o XML do JUnit/cobertura (o reporter escolhido pode ser textual, ex.:
`ut_documentation_reporter`, `ut_teamcity_reporter`, `ut_tap_reporter`) e
devolvê-la ao caller — sem misturar com o parsing de resultados.

```typescript
export interface ReporterExportResult {
  reporter: string;
  text: string;
}
```

### RF2 — Validação e allowlist

Reutilizar `listReportersOracle` (`src/oracleRunner.ts:288`) + a validação de
identificador já existente (`/^[a-z0-9_]+$/`). Reporter inexistente ⇒ aviso e
abortar o export (não o run normal). Ver PRD-69 RF3 para a validação geral.

### RF3 — Destino

- Padrão: Output channel `utPLSQL [reporter]`.
- Opção "Salvar em arquivo…": `vscode.window.showSaveDialog` com nome sugerido
  `utplsql-<reporter>-<timestamp>.<ext>` (`ext` inferida: `.xml` para junit/
  sonar/cobertura, `.txt` para os demais).
- Cancelar durante o run descarta a saída parcial (não salva truncado), igual
  ao comportamento citado pelo concorrente.

### RF4 — UI

- Comando `utPLSQL: Run with Reporter (Export)` (`utplsql.runWithReporter`).
- Item em `testing/item/context` para itens `suite:`/`test:`.
- Fallback QuickPick de objetos descobertos quando não há cursor (mesmo padrão
  de `utplsql.runAtCursor`).

### RF5 — Parâmetros

Bind/arg do reporter: `a_client_character_set` (default `""`) e
`a_color_console` (default `false`). Onde o reporter aceitar `ut_output_reporter
_base`, montar `ut_coverage_*`/`ut_*_reporter(...)` com os argumentos corretos;
documentar que cor só faz sentido para reporters textuais.

**Não-funcionais**
- RNF1 — Export não altera os resultados no Test Explorer.
- RNF2 — Saída grande não deve bloquear a UI (usar o mesmo streaming/polling).
- RNF3 — Sem novas chaves i18n além das estritamente necessárias (paridade nos
  24 catálogos).

## 5. Solução proposta

### 5.1 `src/oracleRunner.ts`

- Adicionar `exportReporter` ao options e ramificar: quando presente, o runner
  usa `runners = [ut_<name>_reporter(...)]` e roteia todo texto para o retorno,
  sem aplicar `applyResultsFromCases`/cobertura.

### 5.2 `src/commands/run.ts`

- `registerRunCommands` registra `utplsql.runWithReporter`: resolve alvo
  (cursor/item/QuickPick) → QuickPick de reporter (de `listReportersOracle`) →
  escolha Output/Arquivo → `runWithProgress` com a opção de export → grava.

### 5.3 `package.json` / `README.md`

- Comando, menu e as duas settings. README: seção "Reporters" atualizada
  (hoje diz que a seleção de sessão "não é aplicada" — corrigir).

## 6. Configuração

- Comando `utPLSQL: Run with Reporter (Export)`.
- Settings: `utplsql.reporter.clientCharacterSet` (string, default `""`),
  `utplsql.reporter.colorConsole` (bool, default `false`).
- Menu `testing/item/context`.

## 7. Plano de testes

- **Unitários**: montagem da chamada com `exportReporter` (nome, charset,
  color) e sem cobertura; reporter inexistente ⇒ erro tratado; inferência de
  extensão.
- **Integração** (`describeDB`): export de `ut_documentation_reporter` gera
  texto com o resultado da suíte; `ut_junit_reporter` gera XML parseável.
- **Manual**: exportar para arquivo; cancelar no meio não salva parcial.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Separar saída do reporter escolhido do XML do JUnit | No fluxo de export, não incluir `ut_junit_reporter`/cobertura; só o reporter alvo. |
| Reporter que exige parâmetros diferentes | Allowlist de nomes conhecidos; para desconhecidos, chamar sem argumentos e logar. |
| Nome do reporter concatenado no PL/SQL | Manter a validação por regex (já existente) — nenhum valor livre. |
| Arquivo sobrescrito sem intenção | `showSaveDialog` com confirmação nativa. |

## 9. Rollout

- Release 0.14.0 (minor).
- `CHANGELOG.md`: "Execução e export com reporter arbitrário".

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- `utPLSQL: Run with Reporter (Export)` executa e grava a saída em Output ou
  arquivo.
- Reporter inexistente não aborta o run normal.
- README/wiki atualizados; `docs:check` verde.

## 11. Questões em aberto

- Múltiplos reporters por export (um arquivo por reporter) ou um só?
- Exportar automaticamente também ao final do run normal (opt-in)?
- Limite de tamanho antes de oferecer salvar em vez de Output?

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-69-oracle-runner-typed-binds|PRD-69]] · [[prd-79-coverage-scope|PRD-79]]
- 🔗 Mesma versão (0.14.0): [[prd-47-node-26-toolchain|PRD-47]] · [[prd-75-lazy-test-tree|PRD-75]] · [[prd-80-virtual-db-source|PRD-80]] · [[prd-81-security-hardening|PRD-81]] · [[prd-82-tns-wallet|PRD-82]]
- 🚀 ⬅️ release anterior: [[prd-87-suitepath-results-jump|PRD-87 (0.13.0)]] · ➡️ próxima release: [[prd-50-auto-run-on-save|PRD-50 (0.15.0)]]
<!-- brain:auto:end -->
