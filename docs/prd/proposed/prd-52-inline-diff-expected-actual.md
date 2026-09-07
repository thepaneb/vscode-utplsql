# PRD-52 — Diff inline esperado × obtido nas falhas

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `src/results.ts`, `src/junit.ts`, `src/test/unit/results.test.ts` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |

## 1. Resumo

Ao falhar, popular `vscode.TestMessage.expectedOutput`/`actualOutput` com os
valores "Expected"/"Actual" reportados pelo utPLSQL, ativando o diff visual
nativo do painel de resultados do VSCode. Jest (diff inline no `expect`) e
PHPUnit (highlight da linha) fazem o equivalente.

## 2. Contexto e problema

Hoje a falha aparece como texto puro em `TestMessage.message`
(`results.ts:114-127`), com "Go to Error" nativo. O utPLSQL já emite, no
`ut_documentation_reporter`/`ut_junit_reporter`, os valores `Actual:` e
`Expected:` das asserções `ut.expect(x).to_equal(y)`. O VSCode expõe
`TestMessage.expectedOutput`/`actualOutput`, que renderizam um diff
lado a lado — sem custo de UI própria. Só falta parsear e preencher.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Extrair pares `Expected`/`Actual` da mensagem de falha (JUnit `failure`).
- Preencher `TestMessage.expectedOutput` e `actualOutput` quando ambos existirem.
- Manter `message` e `location` atuais (retrocompatível).

**Não-objetivos**
- Renderização de diff customizada (usa o diff nativo do VSCode).
- Parsear matchers complexos (`.to_be_true`, coleções) — só quando o texto
  expõe blocos `Expected:`/`Actual:`.
- Diff em erros (não-falhas de asserção).

## 4. Requisitos

### RF1 — Parse do par Expected/Actual

Função pura em `junit.ts` (ou novo `diff.ts`):

```typescript
export interface ExpectedActual { expected?: string; actual?: string; }

export function parseExpectedActual(message: string): ExpectedActual {
  // reconhece as convenções de saída do ut_documentation_reporter:
  //   "Expected: ..." / "Actual: ..." (case-insensitive, possivelmente multilinha)
}
```

### RF2 — Preencher `TestMessage`

Em `applyResultsFromCases` (`results.ts:112-127`), para `status === 'failed'`:

```typescript
const msg = new vscode.TestMessage(c.message ?? 'Falhou');
const ea = parseExpectedActual(c.message ?? '');
if (ea.expected !== undefined && ea.actual !== undefined) {
  msg.expectedOutput = ea.expected;
  msg.actualOutput = ea.actual;
}
```

**Não-funcionais**
- RNF1 — Parse defensivo: nunca lança; mensagens sem `Expected:`/`Actual:`
  seguem como hoje.
- RNF2 — Multilinha: `Actual:`/`Expected:` podem ocupar várias linhas.

## 5. Solução proposta

Adicionar `parseExpectedActual` como função pura (testável sem `vscode`) e
usá-la em `applyResultsFromCases`. O restante é API nativa.

## 6. Configuração

Nenhuma setting/command novo.

## 7. Plano de testes

- **Unitários** (`junit.test.ts` ou `diff.test.ts`):
  - mensagem com `Expected: X` e `Actual: Y` → ambos extraídos.
  - multilinha e case-insensitive.
  - mensagem sem os marcadores → `{}` vazio.
  - valor numérico, null, string vazia.
- **Integração**: falha de `to_equal` exibe diff no painel de resultados.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Formato do reporter muda entre versões utPLSQL | Parse tolerante (regex flexível) + testes com fixtures reais de JUnit. |
| Diff nativo depende da versão do VSCode | `expectedOutput`/`actualOutput` existem desde 1.78 (engines já é `^1.88`). |

## 9. Rollout

- Release 0.14.0 (minor) — pode entrar junto da PRD-51.
- CHANGELOG: "Diff inline esperado × obtido nas falhas de asserção".

## 10. Critérios de aceite

- `npm test` passa.
- Falhas com `Expected:`/`Actual:` exibem diff nativo.
- Falhas sem esses marcadores seguem exibindo `message` normalmente.
- `location` (jump to failure) preservado.

## 11. Questões em aberto

- Suportar também o formato `ut.expect(a).to_equal(b)` com `a`/`b` inline?
  — Se o reporter expuser ambos, adicionar fallback.
- Diff em `error` (exceção) — não é asserção; fora de escopo.
