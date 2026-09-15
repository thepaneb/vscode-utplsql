# PRD-55 — Organização da árvore de testes por tag

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.15.0 |
| Arquivos afetados | `src/extension.ts`, `src/discovery.ts`, `src/types.ts`, `package.json` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Adicionar um modo de organização da árvore por **tag** (Tag > Suite > Test),
além dos modos `file` e `schema` existentes (`utplsql.organization`). O C# Dev
Kit agrupa por "Tests by Category" e o TestMate C++ tem grouping customizável.
Depende da propagação de tags do PRD-51.

## 2. Contexto e problema

`doRefresh` (`extension.ts:522`) bifurca apenas entre `buildFileTree` e
`buildSchemaTree`. Suites com tags (`fast`, `integration`) aparecem espalhadas
por arquivo/schema, sem uma visão por tag. A API nativa de Testing não oferece
agrupamento dinâmico por propriedade — precisa de um terceiro modo de
construção da árvore.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Novo valor `tag` em `utplsql.organization`.
- Árvore `Tag > Suite > Test` (suites sem tag caem em um grupo "(sem tag)").
- Teste com múltiplas tags aparece sob cada tag (duplicação intencional, como
  C# Dev Kit).

**Não-objetivos**
- Agrupar por status (Failed/Passed/Skipped) — o Test Explorer nativo já
  oferece filtro "Show Only Failures".
- Agrupamento hierárquico combinado (Schema > Tag > Suite) — follow-up.
- Edição/renomeação de tags a partir da UI.

## 4. Requisitos

### RF1 — Modo `tag`

```typescript
// extension.ts — doRefresh()
if (cfg.organization === 'schema') { /* ... */ }
else if (cfg.organization === 'tag') buildTagTree(controller, suites);
else buildFileTree(controller, suites);
```

### RF2 — `buildTagTree`

```typescript
function buildTagTree(controller, suites) {
  const byTag = new Map<string, SuiteFile[]>();
  for (const suite of suites) {
    const tags = suite.tags?.length ? suite.tags : ['(sem tag)'];
    for (const t of tags) {
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t)!.push(suite);
    }
  }
  for (const [tag, tagSuites] of sorted(byTag)) {
    const tagItem = controller.createTestItem(`tag:${tag}`, `#${tag}`, tagSuites[0].uri);
    for (const suite of tagSuites) { /* cria suiteItem + tests, idêntico ao buildFileTree */ }
    controller.items.add(tagItem);
  }
}
```

### RF3 — IDs estáveis

O `id` de suite/teste permanece `suite:<pkg>`/`test:<pkg>.<proc>` (independe da
tag), preservando `state.suiteMap` e o mapeamento resultado→teste.

### RF4 — Setting

Estender o `enum` de `utplsql.organization` com `tag` + `enumDescription`.

**Não-funcionais**
- RNF1 — Suite com várias tags duplica o subárvore (mesmo `TestItem` id não
  pode ser adicionado a dois pais — **limitação**; ver Riscos).
- RNF2 — Suites sem tags continuam acessíveis no grupo "(sem tag)".

## 5. Solução proposta

Reusar a lógica de criação de suite/teste extraída de `buildFileTree` para um
helper `createSuiteItems(controller, suite, state)` e usá-la nos três modos.

## 6. Configuração

- `utplsql.organization` ganha `tag`.
- README: atualizar tabela de config + seção Schema-mode.

## 7. Plano de testes

- **Unitários**: `buildTagTree` agrupa por tag; suite sem tag → "(sem tag)";
  tags ordenadas.
- **Integração**: `organization: tag` + refresh → árvore Tag > Suite > Test.
- **Manual**: alternar entre file/schema/tag sem perder resultados.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `TestItem` com o mesmo `id` sob duas tags é proibido pela API do VSCode | Criar **IDs de tag** (`suite:<pkg>#<tag>`) mantendo `suiteMap` apontando para a primeira ocorrência; o mapeamento resultado→teste continua por `pkg|proc`. Avaliar viabilidade antes de implementar. |
| Duplicação infla a árvore | Aceitável; padrão do C# Dev Kit. Pode virar setting `utplsql.organization.tagDedupe`. |

## 9. Rollout

- Release 0.15.0 (minor), após a PRD-51 (dependência de tags no `ItemMeta`).
- CHANGELOG: "Organização da árvore por tag".

## 10. Critérios de aceite

- `npm test` passa.
- `organization: tag` produz Tag > Suite > Test.
- Suites sem tag aparecem em "(sem tag)".
- Resultados e jump to failure continuam funcionando (IDs/mapas preservados).

## 11. Questões em aberto

- Combinação Schema > Tag > Suite? — Follow-up.
- Como tratar o risco de IDs duplicados (estratégia de id por tag) — decidir na
  implementação com spike.
