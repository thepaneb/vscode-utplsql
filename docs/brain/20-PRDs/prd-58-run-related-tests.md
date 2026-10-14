---
tipo: prd
id: PRD-58
aliases: [PRD-58]
status: approved
titulo: "Run Related Tests"
versao: "0.16.0"
data: "2026-09-06"
autor: "Gil Cleber Barboza"
versao_titulo: "0.16.0 — Produtividade e resultados"
verificado: 2026-10-14
regras: []
tags: [prd]
---

# PRD-58 — Run Related Tests

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `src/commands/run.ts` (registro em `createRunCommands`), `src/matching.ts` (função pura), `package.json` (comando + keybinding), `package.nls.json` + 23 `package.nls.*.json`, `src/i18nLocales.ts`, 24 notas `docs/brain/60-README/`, `docs/brain/70-Wiki/Commands.md` |
| Esforço estimado | 1 dia |
| Complexidade | Média |

## 1. Resumo

Executar as suites de teste relacionadas ao arquivo de produção ativo, via
convenção de nomenclatura `ut_<objeto>`. Jest tem "Run Related Tests". Permite,
num `.pkb`/`.sql` de produção, rodar os testes que o cobrem sem navegar até eles.
O mapeamento por cobertura fica como follow-up (§11).

## 2. Contexto e problema

O usuário edita `app_pkg.pkb` (produção) e quer rodar os testes
correspondentes (`ut_app_pkg`). Hoje ele precisa localizar a suite manualmente.
Não há mapeamento objeto→teste além da convenção de nome utPLSQL (`ut_<pkg>`).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Comando `utplsql.runRelated` no editor (`.pks`/`.pkb`/`.sql`/`.fnc`/`.prc`).
- Mapear o nome do arquivo para a(s) suite(s) `ut_<nome>` (e `<nome>`).
- Executar as suites relacionadas encontradas.

**Não-objetivos**
- Mapeamento por cobertura (qual teste cobre qual linha) — follow-up avançado.
- Análise de dependências de `ALL_DEPENDENCIES`.

## 4. Requisitos

### RF1 — Comando e heurística

O registro real dos comandos vive em `src/commands/**` (o `extension.ts` só
delega em `registerRunCommands(deps)`), e `runWithProgress` é a closure local de
`createRunCommands` — o snippet usa a API atual:

```typescript
// src/commands/run.ts — dentro de createRunCommands(deps)
const runRelated = async (): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const items = await collectAllItems(controller, state); // (controller, state, deps?)
  const suites = relatedSuiteMetas(items, editor.document.fileName); // pura
  const include = suites
    .map((m) => state.getSuiteItem(`suite:${m.packageName.toLowerCase()}`))
    .filter((i): i is vscode.TestItem => Boolean(i));
  if (!include.length) {
    vscode.window.showWarningMessage(t(locale, 'ext.runRelated.none'));
    return;
  }
  await runWithProgress(new vscode.TestRunRequest(include), undefined, false);
};
// registro: vscode.commands.registerCommand('utplsql.runRelated', () => runRelated())
```

### RF2 — Função pura de matching

`relatedSuiteMetas(items, fileName)` em `src/matching.ts` (já reúne os helpers por
folder, como `filterSuitesByFolder`), testável sem `vscode`:

- normaliza a extensão (`.pks|.pkb|.sql|.fnc|.prc`) e deriva `base`;
- candidatos `[`ut_${base}`, `${base}`]`, case-insensitive;
- casa por igualdade e por `endsWith` no `packageName` de `kind === 'suite'`.

### RF3 — Documentação e i18n (gate de CI)

- Comando novo → `package.nls.json` + **23** locales, catálogo em
  `src/i18nLocales.ts` (o aviso `ext.runRelated.none`), tabela de Commands do
  README (24 notas) e `docs/brain/70-Wiki/Commands.md`;
- keybinding novo → tabela de Keybindings do README (24 notas);
- validação local na PR: `npm run docs:check` (§7).

**Não-funcionais**
- RNF1 — Case-insensitive; sem correspondência → aviso amigável.

## 5. Solução proposta

Novo comando em `createRunCommands` (`src/commands/run.ts`) + função pura
`relatedSuiteMetas` em `src/matching.ts`. Reusa `collectAllItems`
(`src/testTree.ts`), `state.getSuiteItem` e a closure `runWithProgress`.

## 6. Configuração

- Comando `utplsql.runRelated` (`utPLSQL: Rodar testes relacionados`).
- Keybinding **decidido em 2026-10-14**: `ctrl+shift+u shift+r` (mac
  `cmd+shift+u shift+r`), `when: editorTextFocus && utplsql:connected` — o
  `ctrl+shift+u r` já é do Run All e o padrão `shift+<tecla>` já é usado
  (`runFileCoverage`).

## 7. Plano de testes

- **Unitários**: `relatedSuiteMetas` (em `matching.test.ts`) — prefixo `ut_`,
  igualdade exata, `endsWith`, case-insensitive, extensões `.pks/.pkb/.sql/.fnc/.prc`,
  sem match.
- **Integração**: editar `app_pkg.pkb` → `runRelated` executa `ut_app_pkg`.
- **CI**: `npm run docs:check` (comando + keybinding nas 24 notas e na wiki) +
  `brain:ci`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Convenção `ut_` não universal | Fallback para nome exato + `endsWith`; avisar quando zero matches. |
| Multiplas suites casadas | Executa todas as encontradas. |

## 9. Rollout

- Release 0.16.0 (minor).
- CHANGELOG: "Run Related Tests (por convenção ut_<objeto>)".

## 10. Critérios de aceite

- `npm test` passa.
- `runRelated` acha e executa `ut_<nome>` do arquivo ativo.
- Sem match → aviso.
- `npm run docs:check` verde (comando + keybinding nas 24 notas de README e na
  wiki).

## 11. Questões em aberto

- Mapear por cobertura (PRD futuro) para além da convenção de nome. — Follow-up
  declarado nos não-objetivos.
- Rodar "related" com cobertura (PRD-54)? — **Fechado em 2026-10-14: não** — o
  comando usa o perfil de run padrão; cobertura continua sendo decisão do usuário
  pelo toggle (`BR-UI-012`).

## 12. Impacto no cérebro

Na conclusão, criar a regra candidata **`BR-UI-014`** — “`utplsql.runRelated`
casa as suites pela convenção `ut_<objeto>` (case-insensitive, com fallback por
nome) e avisa quando não há correspondência” — com `prds: ["PRD-58"]`,
`implementacao:` (`src/commands/run.ts`, `src/matching.ts`) e `testes:`
(`src/test/unit/matching.test.ts`). Enquanto `approved`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-54-coverage-toggle|PRD-54]]
- 🔗 Mesma versão (0.16.0): [[prd-56-duration-persistence|PRD-56]] · [[prd-57-multiroot-root-resolution|PRD-57]]
- 🚀 ⬅️ release anterior: [[prd-96-public-landing-page-github-pages|PRD-96 (0.15.0)]] · ➡️ próxima release: [[prd-105-snippets|PRD-105 (0.17.0)]]
<!-- brain:auto:end -->
