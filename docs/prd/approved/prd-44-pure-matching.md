# PRD-44 — Extrair matching resultado→teste para funções puras testáveis

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber |
| Data | 2026-08-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.11.0 |
| Arquivos afetados | `src/matching.ts`, `src/runner.ts`, `src/oracleRunner.ts`, `src/test/unit/matching.test.ts` |

## 1. Resumo

Extrair a lógica de matching `TestCaseResult → vscode.TestItem` para funções puras em `matching.ts`, removendo a dependência de `state.getMeta()` e `WeakMap` do algoritmo, permitindo testes unitários com `node --test` e alinhando com a skill `tdd` que exige testes em seams públicas.

## 2. Contexto e problema

A skill `tdd` (mattpocock, `.agents/skills/tdd/SKILL.md`) exige que testes sejam escritos em **seams públicas** — interfaces onde se observa comportamento sem acessar internos. O algoritmo de matching (`applyResults`/`applyResultsFromCases`) acessa `state.getMeta()` via `WeakMap`, tornando-o não testável sem mock complexo do `TestStateManager`.

A lógica de matching é determinística:
1. Para cada `TestCaseResult`, extrai `classname` (package) e `name` (test)
2. Constrói índice `Map<pkg|proc, TestItem>` a partir dos `leafTests`
3. Fallback: busca por nome em todos os leafTests

Essa lógica deveria ser uma função pura que recebe arrays/objetos e retorna um `Map`, sem depender de `state` ou `WeakMap`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Criar `buildMatchIndex(entries)` — função pura que retorna `Map<string, vscode.TestItem>`
- Mover `findByNameOnly` para `matching.ts` como função pura
- `applyResultsFromCases` usa o índice pré-construído
- Adicionar testes unitários para ambas as funções

**Não-objetivos**
- Não altera o algoritmo de matching (mesma lógica, apenas extraída)
- Não altera a assinatura pública de `applyResults` ou `applyResultsFromCases`
- Não introduz novo módulo (usa `matching.ts` existente)

## 4. Requisitos

### RF1 — `buildMatchIndex`

Função pura que recebe `Array<{ item: vscode.TestItem; meta: ItemMeta }>` e retorna `Map<string, vscode.TestItem>` com chaves:
- `pkg|procName` (lowercase)
- `pkg|description` (lowercase, trimmed)

### RF2 — `findByNameOnly` puro

Já existe em `runner.ts:424-438`. Mover para `matching.ts`, mantendo a mesma lógica. Recebe `Array<{ item: vscode.TestItem; meta: ItemMeta }>` e `name: string`.

### RF3 — Call sites

`runner.ts` e `oracleRunner.ts` constroem `entries` a partir de `leafTests` + `state.getMeta()` e passam para `buildMatchIndex`. O loop de matching usa o índice.

### RF4 — Testes unitários

`matching.test.ts` com cobertura para:
- Índice com 2 testes no mesmo package
- Índice com 0 testes
- `findByNameOnly` encontrando por `procName`
- `findByNameOnly` encontrando por `description`
- `findByNameOnly` com descrição com espaços (trim)
- `findByNameOnly` não encontrando

**Não-funcionais**
- RNF1 — Performance: `entries.map()` cria array intermediário. Overhead negligível para < 1000 testes.
- RNF2 — Sem regressão de comportamento: testes existentes em `runner.test.ts` e `oracleRunner.test.ts` continuam passando

## 5. Solução proposta

### 5.1 matching.ts — novas funções

```typescript
import type { ItemMeta } from './types';

export interface MatchEntry {
  item: vscode.TestItem;
  meta: ItemMeta;
}

export function buildMatchIndex(
  entries: MatchEntry[],
): Map<string, vscode.TestItem> {
  const index = new Map<string, vscode.TestItem>();
  for (const { item, meta } of entries) {
    if (meta.kind !== 'test') continue;
    const pkg = meta.packageName.toLowerCase();
    index.set(`${pkg}|${meta.procName.toLowerCase()}`, item);
    index.set(`${pkg}|${meta.description.toLowerCase().trim()}`, item);
  }
  return index;
}

export function findByNameOnly(
  entries: MatchEntry[],
  name: string,
): vscode.TestItem | undefined {
  const lower = name.toLowerCase().trim();
  for (const { item, meta } of entries) {
    if (meta.kind !== 'test') continue;
    if (
      meta.procName.toLowerCase() === lower ||
      meta.description.toLowerCase().trim() === lower
    ) {
      return item;
    }
  }
  return undefined;
}
```

### 5.2 runner.ts / oracleRunner.ts — call sites

```typescript
// Antes (dentro de applyResultsFromCases):
const index = new Map<string, vscode.TestItem>();
for (const t of leafTests) {
  const m = state.getMeta(t);
  if (m?.kind !== 'test') continue;
  const pkg = m.packageName.toLowerCase();
  index.set(`${pkg}|${m.procName.toLowerCase()}`, t);
  index.set(`${pkg}|${m.description.toLowerCase().trim()}`, t);
}
// ... loop de matching com index.get() + findByNameOnly inline

// Depois:
const entries: MatchEntry[] = leafTests.map(t => ({
  item: t,
  meta: state.getMeta(t)!,
}));
const index = buildMatchIndex(entries);
// ... loop de matching:
for (const c of cases) {
  const pkg = lastSegment(c.classname).toLowerCase();
  const name = c.name.toLowerCase().trim();
  const item = index.get(`${pkg}|${name}`) ?? findByNameOnly(entries, c.name);
  // ...
}
```

### 5.3 Remoção de findByNameOnly de runner.ts

`findByNameOnly` em `runner.ts:424-438` é removida (movida para `matching.ts`). `runner.ts` importa de `matching.ts`.

## 6. Configuração

Nenhuma nova setting.

## 7. Plano de testes

- **Unitários** (novo arquivo `matching.test.ts`):
  - `buildMatchIndex` com 2 testes no package `UT_PKG` → 4 chaves no índice
  - `buildMatchIndex` com 0 entradas → Map vazio
  - `buildMatchIndex` com entrada `kind: 'suite'` → ignorada
  - `findByNameOnly` por `procName` → encontra
  - `findByNameOnly` por `description` → encontra
  - `findByNameOnly` com descrição com trailing space → encontra (trim)
  - `findByNameOnly` nome não existe → `undefined`
- **Regressão**: `runner.test.ts` e `oracleRunner.test.ts` — verificar que testes existentes passam

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `state.getMeta(t)!` com `!` pode lançar se meta for undefined | `MatchEntry` exige `ItemMeta`, não `ItemMeta | undefined`. Call site filtra `meta.kind !== 'test'` antes de popular entries. |
| Performance com muitos testes (>1000) | `leafTests.map()` é O(n). Índice `Map.get()` é O(1). Overhead total < 1ms para 1000 testes. |
| Case sensitivity: `toLowerCase()` já aplicado | Comportamento existente mantido. Nenhuma alteração. |

## 9. Rollout

- Versão alvo: `0.11.0` (minor)
- Pode ser feito junto com PRD-39 (deduplicação) — afeta os mesmos arquivos
- Backward-compatible: APIs públicas não mudam

## 10. Critérios de aceite

- [ ] `buildMatchIndex` exportada de `matching.ts`
- [ ] `findByNameOnly` movida para `matching.ts` e exportada
- [ ] `MatchEntry` interface exportada de `matching.ts`
- [ ] Testes unitários em `matching.test.ts` para ambas as funções
- [ ] `runner.ts` e `oracleRunner.ts` usam `buildMatchIndex` e `findByNameOnly` de `matching.ts`
- [ ] `findByNameOnly` original removida de `runner.ts`
- [ ] Nenhum acesso a `state.getMeta()` dentro do loop de matching
- [ ] `npm run compile && npm run lint && node --test out/test/unit/**/*.test.js` passam

## 11. Questões em aberto

- A interface `MatchEntry` deve ser exportada ou interna ao módulo?
- `buildMatchIndex` deve aceitar um `Map<string, vscode.TestItem>` pré-existente para merge com outros índices (ex: suites de múltiplos folders)?
- O fallback `findByNameOnly` usa `description.toLowerCase().trim()`. Manter `.trim()` ou normalizar na construção do índice?
