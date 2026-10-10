<!-- GENERATED FROM docs/brain/20-PRDs/prd-116-direct-module-tests.md — DO NOT EDIT -->

# PRD-116 — Testes diretos dos módulos sem cobertura dedicada

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-10 |
| Componente | Extensão `paneb.vscode-utplsql` (testes) |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `src/test/unit/annotation.test.ts` (novo), `src/test/unit/charset.test.ts` (novo), `src/test/unit/i18nLocales.test.ts` (novo) |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-04 (expansão de testes), PRD-115 (split do i18n) |

## 1. Resumo

Quatro módulos de produção **não têm teste direto** próprio: `annotation.ts`,
`charset.ts`, `i18nLocales.ts` e `types.ts`. Os três primeiros têm lógica pura
(não apenas dados/tipos) e hoje são exercitados só de forma indireta; `types.ts`
é só de tipos (não testável em runtime). Esta PRD **adiciona testes diretos** aos
três primeiros e **documenta** por que `types.ts` não recebe teste.

## 2. Contexto e problema

- `annotation.ts` (`findAnnotationAtLine`) é a base de *Run at Cursor*/variantes
  de debug (PRD-53); erros de borda (cursor antes do `%suite`, annotation
  inválida, CRLF) não têm teste focado.
- `charset.ts` (`decodeBytes`) decide o encoding usado ao ler scripts; a lógica de
  BOM e a diferença `latin1` × `windows-1252` merecem casos explícitos.
- `i18nLocales.ts` é dado, mas a **paridade de chaves** e a ausência de chaves
  órfãs são invariantes que um teste direto de catálogo torna visíveis (hoje o
  `i18n.test.ts` cobre indiretamente).
- `types.ts` é *type-only*: não tem comportamento para testar em runtime.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Testes unitários diretos para `annotation.ts`, `charset.ts` e para os
  invariantes dos catálogos em `i18nLocales.ts`.
- Registrar oficialmente `types.ts` como não-testável (exceção justificada).

**Não-objetivos**
- Reescrever os módulos ou mudar seu comportamento (só testar o atual).
- Atingir "cobertura 100% de arquivos por teste dedicado" como meta cega — a
  decisão é por valor de risco, não por métrica.

## 4. Requisitos

### RF1 — `annotation.ts`

- Casos: cursor na linha do `%suite`; entre `%suite` e um `%test`; na linha do
  `%test`; antes do primeiro annotation (→ `undefined`); texto sem annotations;
  múltiplas tests escolhe a de maior `line ≤ cursor`.

### RF2 — `charset.ts`

- Casos: `utf8` com e sem BOM; `latin1` (byte 0xE9 → `é`; BOM não removido);
  `win1252` (0x80 → `€`, distinto de latin1); charset ausente/inválido → `utf8`.

### RF3 — `i18nLocales.ts`

- Invariantes dos catálogos: todo locale tem **todas** as chaves do `pt-BR`
  (sem chaves órfãs), todos os valores são strings não vazias, e o conjunto de
  locales é o esperado.
- Consolidar/evitar duplicação com o `i18n.test.ts` (referência cruzada, sem
  repetir toda a matriz).

**Não-funcionais**
- RNF1 — Testes puros (`node --test`), sem `vscode`/banco.
- RNF2 — Cobertura dos três módulos igual ou maior; thresholds mantidos.
- RNF3 — `types.ts` documentado como isento (comentário/nota), sem teste vazio.

## 5. Solução proposta

- Adicionar três arquivos de teste unitário puros, no estilo dos existentes.
- Para `i18nLocales.ts`, escrever um teste de paridade parametrizado (24 locales
  alimentam a mesma bateria de asserções), evitando código repetitivo.

## 6. Configuração

Nenhuma.

## 7. Plano de testes

- **Unitários**: os novos `annotation.test.ts`, `charset.test.ts`,
  `i18nLocales.test.ts`.
- **Cobertura**: `npm run test:coverage` mantendo os thresholds; conferir que
  `annotation`/`charset` sobem de cobertura direta.
- **Manual**: nenhum (puro).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Duplicar cobertura já exercitada | Focar em bordas não cobertas; manter o `i18n.test.ts` como está |
| Teste de paridade frágil a novo locale | Parametrizar; o teste passa a valer para o locale novo automaticamente |
| `types.ts` "sem teste" parecer dívida | Registrar a justificativa explicitamente na seção de aceite |

## 9. Rollout

- **0.23.0** ("Qualidade interna"); sem impacto no runtime.

## 10. Critérios de aceite

- `annotation.ts`, `charset.ts` e `i18nLocales.ts` com teste direto e verde.
- `types.ts` documentado como isento (type-only), sem teste artificial.
- Cobertura ≥ thresholds.

## 11. Questões em aberto

- Vale um teste de paridade compartilhado (helper) entre `i18n` e
  `i18nLocales` em vez de dois testes?
- Incluir `package.nls.*.json` no teste de paridade (manifesto VSCode)?

## 12. Impacto no cérebro

Ao concluir, avaliar se cabe uma regra `BR-TEST-*` ("módulos puros têm teste
direto; isenções são documentadas"). Se não houver regra nova, declarar
**nenhuma** em `## Impacto no cérebro`. Enquanto `proposed`, `regras: []`.
