# PRD-51 — Execução e seleção por Tag (`%tags`)

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `src/types.ts`, `src/extension.ts`, `src/suiteParser.ts`, `src/state.ts`, `package.json` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Permitir filtrar/executar testes por `%tags(...)`. O parser já extrai tags por
teste (`suiteParser.ts:32,107`), mas elas são descartadas — não chegam ao
`ItemMeta` e não há UI. JUnit/TestNG (tags), PHPUnit (`--group`) e C#
(`TestCategory`/`Trait`) oferecem o equivalente.

## 2. Contexto e problema

O README registra explicitamente "filtro por tag é roadmap". Tags como
`fast`, `critical`, `integration` são comuns em projetos utPLSQL, mas hoje o
usuário não pode rodar "só os testes `fast`" nem enxergar as tags no Test
Explorer. O trabalho pesado (parse) já está feito no PRD-42; falta propagar e
expor.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Propagar `tags` para o `ItemMeta` (teste e suíte).
- Parsear também tags de **suíte** (header, antes do primeiro `%test`) — hoje
  só tags de teste são capturadas.
- Comando `utplsql.runByTag` com QuickPick das tags disponíveis (inclusão
  e/ou exclusão).
- Exibir tag no tooltip/label do `TestItem` (opcional, configurável).

**Não-objetivos**
- Agrupamento visual por tag na árvore (PRD-55).
- Sintaxe avançada de tags (`--%tags(fast -slow)`) com expressões booleanas —
  só inclusão simples + prefixo `!` para exclusão.
- Persistência de filtros entre sessões.

## 4. Requisitos

### RF1 — Tags no `ItemMeta`

```typescript
// types.ts
export type ItemMeta =
  | { kind: 'suite'; packageName: string; uri: vscode.Uri; folder: vscode.WorkspaceFolder; tags?: string[] }
  | { kind: 'test'; /* ... */ tags?: string[] };
```

`buildFileTree`/`buildSchemaTree` (`extension.ts:570,610`) preenchem `tags` a
partir de `suite.tests[i].tags` (teste) e `suite.tags` (suíte, novo campo).

### RF2 — Tags de suíte no parser

`suiteParser.ts` passa a capturar `%tags(...)` no header (entre `%suite` e o
primeiro `%test`), expondo `ParsedSuite.tags?: string[]`, propagado via
`discovery.ts` (`SuiteFile.tags`) e `buildFileTree`/`buildSchemaTree`.

### RF3 — Comando `utplsql.runByTag`

QuickPick multi-seleção com a união das tags descobertas; prefixo `!` em uma
tag a exclui. Filtra `collectAllItems` e monta `TestRunRequest` com os
`TestItem` de teste/suíte casados.

```typescript
// extension.ts
vscode.commands.registerCommand('utplsql.runByTag', async () => {
  const tags = collectAllTags(state); // distinct tags de todos os metas
  const picked = await vscode.window.showQuickPick(tags.map(t => `#${t}`), {
    canPickMany: true,
    placeHolder: t(locale, 'ext.tag.placeholder'),
  });
  const include = filterItemsByTags(state, picked.map(stripBang));
  if (!include.length) { /* aviso */ return; }
  await runWithProgress(controller, new vscode.TestRunRequest(include, undefined, state.runProfile), undefined, false, state);
});
```

`filterItemsByTags` como função pura em um módulo testável (ex.: `tagFilter.ts`).

### RF4 — Tooltip com tags

Opcional via `utplsql.showTagsInTree` (default `false`): sufixo `[tag1, tag2]`
no `label` do `TestItem`.

**Não-funcionais**
- RNF1 — Case-insensitive na comparação de tags.
- RNF2 — Sem tags em um `TestItem` ⇒ ele é incluído apenas quando nenhum
  filtro de inclusão é especificado (compatível com o comportamento atual).

## 5. Solução proposta

### 5.1 `suiteParser.ts` + `discovery.ts`

Novo campo `tags?: string[]` em `ParsedSuite`/`SuiteFile` (header) e já
existente por teste. Ajustar `parseSuiteText` para associar `%tags` no header à
suíte.

### 5.2 `types.ts` + `extension.ts`

`tags` em `ItemMeta`; preencher em `buildFileTree` e `buildSchemaTree`.

### 5.3 `tagFilter.ts` (novo, puro)

```typescript
export function filterItemsByTags(
  items: { item: vscode.TestItem; tags: string[] }[],
  include: string[],
  exclude: string[],
): vscode.TestItem[];
```

### 5.4 `extension.ts` + `package.json`

Registrar `utplsql.runByTag` e a setting `utplsql.showTagsInTree`.

## 6. Configuração

- Comando `utPLSQL: Rodar testes por tag...`.
- Settings: `utplsql.showTagsInTree` (bool). Nenhum keybinding obrigatório.

## 7. Plano de testes

- **Unitários** (`suiteParser.test.ts`): `%tags` no header → `suite.tags`;
  `%tags` após `%test` → `tests[].tags`.
- **Unitários** (`tagFilter.test.ts`): inclusão, exclusão (`!`), case-insensitive,
  item sem tag incluído quando filtro vazio.
- **Integração**: suite com `%tags(fast)` → `Run by tag "fast"` executa só ela.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Tags de suíte vs de teste com semântica divergente | Suíte herda/agrupa; item de teste sem tag própria herda tags da suíte no filtro. |
| QuickPick com muitas tags | Deduplicar + ordenar; mostrar contagem. |
| `!` como prefixo de exclusão colide com nome de tag | Documentar `!` como convenção de exclusão (igual JUnit). |

## 9. Rollout

- Release 0.14.0 (minor).
- CHANGELOG: "Run by tag (`%tags`) com QuickPick inclusão/exclusão".

## 10. Critérios de aceite

- `npm test` passa.
- `ItemMeta` carrega tags (suíte e teste).
- `utplsql.runByTag` executa só os testes da(s) tag(s) selecionada(s).
- Tag com `!` é excluída.
- Sem tags → comportamento atual preservado.

## 11. Questões em aberto

- Combinar tag + cobertura (variação `utplsql.runByTagCoverage`)?
  — Sim, alinhado à PRD-54 (toggle global de cobertura).
- Expressões de tags (`tag1 AND tag2`)? — Follow-up.
