# PRD-42 — SuiteParser: parse de annotations %disabled, %throws, %tags e lifecycle

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber |
| Data | 2026-08-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.10.0 |
| Arquivos afetados | `src/suiteParser.ts`, `src/types.ts`, `src/discovery.ts` |

## 1. Resumo

Estender `suiteParser.ts` para parsear `%disabled`, `%throws`, `%tags`, `%displayname` e annotations de lifecycle (`%beforeall`, `%beforeeach`, `%aftereach`, `%afterall`), enriquecendo `ItemMeta` e permitindo que o discovery pule suites e testes desabilitados.

## 2. Contexto e problema

A skill `oracle-utplsql` (baseada em `oracle/skills/db/devops/database-testing.md`) documenta 11 annotations do framework. O `suiteParser.ts` atual só extrai `%suite` e `%test`. As demais têm valor semântico:

| Annotation | Valor para a extensão |
|---|---|
| `%disabled` | Pular suite/test no discovery (não criar `TestItem`) |
| `%throws(-NNNNN)` | Indicar que o teste espera exceção (útil p/ CodeLens e Decorations) |
| `%tags(tag1,tag2)` | Filtrar execução por tag (runner futuro) |
| `%displayname(name)` | Nome customizado do teste (sobrescreve description) |
| `%beforeall`, `%beforeeach`, `%aftereach`, `%afterall` | Metadados de lifecycle (indicam que a suite tem setup/teardown) |

Atualmente, suites com `%disabled` ainda aparecem no Test Explorer e podem ser executadas, gerando confusão. Testes com `%throws` não indicam visualmente que esperam exceção.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Parsear `%disabled` e marcar `TestProc.disabled = true`
- Parsear `%throws(-NNNNN)` e extrair código de erro em `TestProc.expectedError`
- Parsear `%tags(tag1,tag2)` e extrair array em `TestProc.tags`
- Parsear `%displayname(name)` em `TestProc.displayName`
- Parsear lifecycle hooks como booleanos em `ParsedSuite`
- Filtrar testes/suites com `%disabled` no `discoverWorkspace`

**Não-objetivos**
- Não implementa filtro por tags no runner (PRD futuro)
- Não implementa `%context`/`%endcontext` (agrupamento hierárquico)
- Não altera `ItemMeta` retroativamente em estados existentes

## 4. Requisitos

### RF1 — `%disabled`

`TestProc.disabled?: boolean` e `ParsedSuite.disabled?: boolean`. Se `true`, `discoverWorkspace` não inclui o teste (ou a suite inteira, se for suite-level).

### RF2 — `%throws`

`TestProc.expectedError?: number`. Código de erro extraído do padrão `-- %throws(-20001)`.

### RF3 — `%tags`

`TestProc.tags?: string[]`. Array de tags extraído de `-- %tags(critical, slow)`.

### RF4 — `%displayname`

`TestProc.displayName?: string`. Se presente, `ItemMeta` usa `displayName` em vez de `description`.

### RF5 — Lifecycle hooks

`ParsedSuite.hasBeforeAll?: boolean`, `hasAfterAll?: boolean`, `hasBeforeEach?: boolean`, `hasAfterEach?: boolean`.

**Não-funcionais**
- RNF1 — Retrocompatível: testes sem annotations novas continuam funcionando
- RNF2 — Regex deve ser case-insensitive para o nome da annotation

## 5. Solução proposta

### 5.1 Novos tipos (suiteParser.ts)

```typescript
export interface TestProc {
  procName: string;
  description: string;
  line: number;
  disabled?: boolean;
  expectedError?: number;
  tags?: string[];
  displayName?: string;
}

export interface ParsedSuite {
  packageName: string;
  suiteDescription: string;
  tests: TestProc[];
  suiteLine: number;
  disabled?: boolean;
  hasBeforeAll?: boolean;
  hasAfterAll?: boolean;
  hasBeforeEach?: boolean;
  hasAfterEach?: boolean;
}
```

### 5.2 Novos regexes

```typescript
const RE_DISABLED = /--\s*%disabled\b/i;
const RE_THROWS = /--\s*%throws\s*\(\s*(-?\d+)\s*\)/i;
const RE_TAGS = /--\s*%tags\s*\(\s*([^)]+)\s*\)/i;
const RE_DISPLAYNAME = /--\s*%displayname\s*\(\s*([^)]*)\s*\)/i;
const RE_BEFOREALL = /--\s*%beforeall\b/i;
const RE_AFTERALL = /--\s*%afterall\b/i;
const RE_BEFOREEACH = /--\s*%beforeeach\b/i;
const RE_AFTEREACH = /--\s*%aftereach\b/i;
```

### 5.3 Filtro no discovery

```typescript
// discovery.ts
const suite = parseSuite(uri, text);
if (suite && !suite.disabled && suite.tests.length > 0) {
  suite.tests = suite.tests.filter(t => !t.disabled);
  if (suite.tests.length > 0) {
    results.push({ ...suite, folder });
  }
}
```

## 6. Configuração

Nenhuma nova setting.

## 7. Plano de testes

- **Unitários**: `suiteParser.test.ts` — adicionar casos para cada annotation:
  - `-- %disabled` no teste → `disabled: true`
  - `-- %throws(-20001)` → `expectedError: 20001`
  - `-- %tags(fast, critical)` → `tags: ['fast', 'critical']`
  - `-- %displayname(Nome Customizado)` → `displayName: 'Nome Customizado'`
  - `-- %beforeall` no package → `hasBeforeAll: true`
- **Unitários**: `discovery.test.ts` — verificar que testes disabled não aparecem no resultado
- **Unitários**: `discovery.test.ts` — verificar que suite disabled não aparece

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regex falso-positivo: `-- %disabled` em string/comment | Regex já requer `--` no início da linha (padrão utPLSQL). Improvável em comentários de negócio. |
| `%tags` com espaços: `%tags(fast, critical)` | Regex captura tudo entre parênteses. Split por `,` + trim em cada tag. |
| `%throws` com número negativo falha no parse | Regex captura `-?\d+`. Testar com `-20001`, `20001`, `-1`. |

## 9. Rollout

- Versão alvo: `0.10.0` (minor)
- Backward-compatible: campos novos são opcionais (`?`)
- Pode ser feito independentemente dos outros PRDs

## 10. Critérios de aceite

- [x] `TestProc` com campos `disabled`, `expectedError`, `tags`, `displayName`
- [x] `ParsedSuite` com campos `disabled`, `hasBeforeAll`, `hasAfterAll`, `hasBeforeEach`, `hasAfterEach`
- [x] `discoverWorkspace` filtra testes com `disabled: true`
- [x] `discoverWorkspace` ignora suites com `disabled: true`
- [x] `suiteParser.test.ts` cobre todas as annotations novas
- [x] `npm run compile && npm run lint && node --test` passam

## 11. Decisões

**D1 — `%context`/`%endcontext` ficam de fora (já são não-objetivo)**: agrupamento
hierárquico de sub-contextos exige mudanças profundas no Test Explorer (grupos
aninhados no meio da suíte), com ganho incerto. PRD futura dedicada.

**D2 — `%suitepath` NÃO é parseado agora**: nenhum consumidor atual usa
hierarquia por suitepath — o modo `schema` deriva a organização de
`utplsql.organization.schemaPattern`, e o modo `file` usa o caminho do
arquivo. Adicionar o campo sem consumidor seria Speculative Generality. Fica
como follow-up junto com `%context` (uma futura PRD de "hierarquia avançada"
pode consumir os dois — o `suitepath` define a posição na hierarquia, o
`context` cria os grupos).

**D3 — Suites/tests `%disabled` são pulados no discovery (não criados)**:
consistente com RF1 e com o sketch da seção 5.3. Criar o `TestItem` com
`canRun = false` manteria itens na árvore sem poder executar — ruído visual e
divergência da semântica do utPLSQL (que simplesmente exclui da execução). Se
houver demanda por visibilidade dos desabilitados, uma setting dedicada pode
reexpor em follow-up.
