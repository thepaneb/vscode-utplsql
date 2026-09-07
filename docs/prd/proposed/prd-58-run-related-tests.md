# PRD-58 — Run Related Tests

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `src/extension.ts`, `src/matching.ts`, `package.json` |
| Esforço estimado | 1 dia |
| Complexidade | Média |

## 1. Resumo

Executar as suites de teste relacionadas ao arquivo de produção ativo, via
convenção de nomenclatura `ut_<objeto>` (e fallback por cobertura). Jest tem
"Run Related Tests". Permite, num `.pkb`/`.sql` de produção, rodar os testes
que o cobrem sem navegar até eles.

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

```typescript
vscode.commands.registerCommand('utplsql.runRelated', async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const base = path.basename(editor.document.fileName).replace(/\.(pks|pkb|sql|fnc|prc)$/i, '');
  const candidates = [`ut_${base}`, base];
  const metas = collectAllItems(controller).map(i => state.getMeta(i)).filter(Boolean) as ItemMeta[];
  const suites = metas.filter(m =>
    m.kind === 'suite' &&
    candidates.some(c => m.packageName.toLowerCase() === c.toLowerCase() ||
      m.packageName.toLowerCase().endsWith(c.toLowerCase())),
  );
  const include = suites.map(m => state.getSuiteItem(`suite:${m.packageName.toLowerCase()}`)).filter(Boolean) as vscode.TestItem[];
  if (!include.length) { /* aviso */ return; }
  await runWithProgress(controller, new vscode.TestRunRequest(include, undefined, state.runProfile), undefined, false, state);
});
```

### RF2 — Função pura de matching

Extrair `relatedSuiteMetas(items, fileName)` para um módulo testável
(`matching.ts` ou novo `relatedTests.ts`).

**Não-funcionais**
- RNF1 — Case-insensitive; sem correspondência → aviso amigável.

## 5. Solução proposta

Novo comando + função pura `relatedSuiteMetas`. Reusa `collectAllItems`,
`state.getSuiteItem` e `runWithProgress`.

## 6. Configuração

- Comando `utPLSQL: Rodar testes relacionados`.
- Keybinding opcional `Ctrl+Shift+U R` já usado (Run All); usar `Ctrl+Shift+U Shift+R` se desejado.

## 7. Plano de testes

- **Unitários**: `relatedSuiteMetas` com `ut_` prefixo, igualdade exata, sem
  match, extensão variada.
- **Integração**: editar `app_pkg.pkb` → `runRelated` executa `ut_app_pkg`.

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

## 11. Questões em aberto

- Mapear por cobertura (PRD futuro) para além da convenção de nome.
- Rodar "related" com cobertura (PRD-54)?
