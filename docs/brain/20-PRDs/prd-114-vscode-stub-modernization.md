---
tipo: prd
id: PRD-114
aliases: [PRD-114]
status: proposed
titulo: "Modernizar o stub de `vscode` e reduzir `any` nos testes"
versao: "0.23.0"
data: "2026-10-10"
autor: "Gil Cleber Barboza"
versao_titulo: "0.23.0 — Qualidade interna"
verificado: 2026-10-10
regras: []
tags: [prd]
---

# PRD-114 — Modernizar o stub de `vscode` e reduzir `any` nos testes

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-10 |
| Componente | Extensão `paneb.vscode-utplsql` (testes) |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `src/test/vscode-stub.ts`, `src/test/unit/*.test.ts`, `src/test/unit/vscodeApiInventory.test.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-04 (expansão de testes), PRD-37 (cobertura TS), PRD-110 (higiene) |

## 1. Resumo

Os testes unitários dependem de um **stub de `vscode` de ~975 linhas**
(`src/test/vscode-stub.ts`) e usam `any` extensivamente para casar fixtures com as
assinaturas do VSCode (`as any`, `as ItemMeta`, etc.). O stub é um ativo crítico —
se divergir da API real, os testes passam mas a extensão quebra. Esta PRD
**tipa o stub a partir de `@types/vscode`** e **elimina os `any` evitáveis** nas
fixtures, preservando o `vscodeApiInventory` como rede de segurança.

## 2. Contexto e problema

- O stub é escrito "à mão" e não é checado contra `@types/vscode`; um método com
  assinatura errada não é detectado até a integração.
- Muitos testes lançam mão de `any`/`as any` para montar `TestItem`,
  `Uri`, `TestRun`, etc. — o `biome.json` inclusive **desliga
  `noExplicitAny` só em `src/test/**`**, o que confirma o volume.
- O `vscodeApiInventory.test.ts` já mapeia quais APIs o produto usa; ele pode
  ser a fonte de verdade para cobrir o stub.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Tipar o stub com as interfaces de `@types/vscode` (ou tipos derivados), de
  forma que `tsc` acuse assinaturas incompatíveis.
- Substituir `any` de fixtures por helpers tipados reutilizáveis
  (`makeTestItem`, `makeUri`, `makeRun`, …).
- Ampliar `vscodeApiInventory` para **falhar** quando uma API usada no produto
  não existir no stub.

**Não-objetivos**
- Rodar os testes unitários contra o Extension Host (isso é papel da
  integração).
- Reescrever a suíte de testes ou mudar a estratégia de stub.
- Habilitar `noExplicitAny` em `src/test/**` de imediato (pode ficar como meta).

## 4. Requisitos

### RF1 — Stub tipado

- Cada objeto exportado pelo stub (`Uri`, `Position`, `Range`, `TestItem`,
  `TestRun`, `EventEmitter`, `window`, `workspace`, `commands`, `languages`, …)
  recebe um tipo que satisfaz a interface correspondente do `@types/vscode` (ou
  um tipo estrutural que `tsc` valide no ponto de uso do produto).
- Erros de assinatura aparecem em `npm run typecheck`, não na integração.

### RF2 — Redução de `any` nos testes

- Introduzir helpers tipados no stub (ou num `fixtures.ts`) e migrar os testes
  que hoje usam `as any` para eles, de forma incremental (arquivo a arquivo).
- Meta mensurável: reduzir a contagem de `any` em `src/test/**` a um valor-alvo
  acordado, registrando o antes/depois.

### RF3 — Rede de segurança

- Estender `vscodeApiInventory` para comparar as APIs usadas em `src/**` com o
  que o stub expõe e falhar se faltar cobertura.

**Não-funcionais**
- RNF1 — Suíte unitária continua verde e rápida (sem Extension Host).
- RNF2 — Cobertura ≥ thresholds; o stub conta como código de teste (excluído do
  c8).
- RNF3 — Sem dependência nova (`@types/vscode` já existe).

## 5. Solução proposta

- Usar `typeof import('vscode')`/interfaces de `@types/vscode` para amarrar o
  stub; onde a interface for pesada, definir um tipo estrutural mínimo que o
  stub declare implementar.
- Criar helpers de fixture tipados e migrar por arquivo, começando pelos mais
  usados (`results`, `runner`, `testTree`, `debugger`).
- Guardar a contagem inicial de `any` e travar um alvo no tester de convenção
  (ex.: `grep -c` no teste) para evitar regressão.

## 6. Configuração

Nenhuma setting/comando. Possível ajuste do override do Biome para `src/test/**`.

## 7. Plano de testes

- **Unitários**: a própria suíte (deve permanecer verde durante a migração);
  teste novo que valida que o stub cobre as APIs do inventário.
- **Typecheck**: `npm run typecheck` valida o stub contra os tipos.
- **Manual**: inspeção do diff (apenas tipos/helpers; nenhuma mudança de
  comportamento de teste).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Tipar tudo estourar o escopo | Migração incremental por arquivo; stub primeiro, testes depois |
| Tipo estrutural mascarar divergência | Preferir as interfaces reais; onde não der, documentar o motivo |
| `as any` necessário para cenários negativos | Manter `any` localizado e comentado, com meta de redução (não zero) |

## 9. Rollout

- **0.23.0** ("Qualidade interna"); sem impacto no runtime.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Stub validado por `tsc` contra `@types/vscode` (assinaturas incompatíveis
  falham o typecheck).
- Contagem de `any` em `src/test/**` reduzida ao alvo acordado e sem regressão.
- `vscodeApiInventory` falha se o stub não cobrir uma API usada.
- Suíte e cobertura verdes.

## 11. Questões em aberto

- Vale gerar o stub parcialmente a partir do inventário de APIs?
- O alvo de `any` nos testes deve ser zero ou um limite baixo e documentado?

## 12. Impacto no cérebro

Ao concluir, criar/ajustar a regra `BR-TEST-*` ("o stub de `vscode` é tipado e
coberto pelo inventário de APIs") com `prds: ["PRD-114"]`, `implementacao:` e
`testes:`. Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-04-expand-tests|PRD-04]] · [[prd-37-ts-coverage|PRD-37]] · [[prd-110-defensive-hardening|PRD-110]]
- 🔗 Mesma versão (0.23.0): [[prd-111-decompose-oracle-runner|PRD-111]] · [[prd-112-error-handling-audit|PRD-112]] · [[prd-113-lint-scope|PRD-113]] · [[prd-115-split-i18n-locales|PRD-115]] · [[prd-116-direct-module-tests|PRD-116]] · [[prd-117-split-script-property-tests|PRD-117]]
- 🚀 ⬅️ release anterior: [[prd-93-continuous-localization-pipeline|PRD-93 (0.22.0)]]
<!-- brain:auto:end -->
