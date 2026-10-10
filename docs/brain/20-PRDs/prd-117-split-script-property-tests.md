---
tipo: prd
id: PRD-117
aliases: [PRD-117]
status: proposed
titulo: "Testes de propriedade do parser de scripts (`splitScript`)"
versao: "0.23.0"
data: "2026-10-10"
autor: "Gil Cleber Barboza"
versao_titulo: "0.23.0 — Runtime, docs e qualidade residual"
verificado: 2026-10-10
regras: []
tags: [prd]
---

# PRD-117 — Testes de propriedade do parser de scripts (`splitScript`)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-10 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `src/scriptRunner.ts`, `src/test/unit/scriptRunner.test.ts` (ou `splitScript.property.test.ts` novo) |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-62 (run scripts), PRD-04 (testes) |

## 1. Resumo

`splitScript` (`src/scriptRunner.ts:79-298`, ~220 linhas) é um **autômato
caractere a caractere** que separa um script SQL/PL-SQL em statements,
preservando comentários e literais, classificando PL/SQL e tratando diretivas do
SQL*Plus. É o parser mais complexo do projeto e hoje só tem testes por exemplos.
Esta PRD adiciona **testes de propriedade** (com um gerador próprio, sem
dependência nova) para expor bordas que exemplos dificilmente cobrem.

## 2. Contexto e problema

- A complexidade vem de estados interligados (`inStr`, `inIdent`, `inBlock`,
  `inLine`) e de casos como `;` dentro de literal, `--` dentro de string,
  `` `/*` `` dentro de comentário de bloco, `\n` em CRLF, `/` de terminador
  PL/SQL vs. divisão, e diretivas SQL*Plus no início do statement.
- Testes por exemplo cobrem o que o autor pensou; não provam **invariantes** para
  entradas arbitrárias (ex.: nunca lançar, nunca "perder" código, nunca quebrar
  dentro de literal/comentário).
- O parser é determinístico e puro — ideal para testes de propriedade.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Definir invariantes verificáveis de `splitScript` e testá-las sobre entradas
  geradas (aleatórias e mutações de casos reais).
- Provar robustez: nunca lança para qualquer string; terminadores e comentários
  não quebram statements indevidamente.
- Aumentar a cobertura de branches da região do parser.

**Não-objetivos**
- Trocar a implementação do parser ou "corrigir" comportamento por preferência
  (só corrigir se um invariante legítimo for violado).
- Adicionar `fast-check`/`jsverify` como dependência (gerador próprio, seed fixo).
- Testar a execução contra o banco (fora de escopo).

## 4. Requisitos

### RF1 — Invariantes

- **Totalidade**: `splitScript(x)` não lança para nenhuma entrada (strings
  arbitrárias, `\0`, CRLF, Unicode, aspas desbalanceadas).
- **Reconstrução (round-trip)**: a concatenação dos `text` dos statements, com
  os terminadores reanexados, contém o mesmo conjunto de tokens de código que a
  entrada (comentários/brancos podem ser descartados) — sem perder código.
- **Fronteira de literal/comentário**: um `;` (ou `/` de linha) dentro de
  `'...'`/`"..."`/`/* */`/`-- ...` **não** separa statements.
- **Classificação**: `plsql` é `true` sse o cabeçalho (ignorando brancos e
  comentários) casa `PLSQL_START_RE` (só quando há `;`/`/`).
- **Independência de CRLF**: `splitScript(x.replace(/\n/g,'\r\n'))` produz a
  mesma sequência de `text` normalizada que `splitScript(x)`.

### RF2 — Gerador e reprodutibilidade

- Gerador próprio (PRNG seedado) que monta scripts a partir de um alfabeto de
  tokens: keywords, identificadores, `'...'`, `"..."`, `--`, `/* */`, `;`, `/`,
  diretivas SQL*Plus, CRLF/LF.
- Falha imprime a **seed** e o input mínimo para reprodução.

### RF3 — Correções pontuais

- Se um invariante legítimo falhar, corrigir `splitScript` com um caso de
  regressão reduzido, documentando a decisão.

**Não-funcionais**
- RNF1 — Sem dependência nova; testes puros e rápidos (limite de iterações
  ajustável por env, default modesto).
- RNF2 — Cobertura de `scriptRunner.ts` ≥ thresholds; branches do parser ≥ 95%.
- RNF3 — Determinismo: mesma seed → mesmo resultado (CI estável).

## 5. Solução proposta

- Extrair/parametrizar o gerador num helper de teste (`makeScriptGen(seed)`),
  compondo fragmentos válidos e inválidos.
- Implementar cada invariante como asserção sobre N casos; ao falhar, encolher
  (shrink) manualmente para o caso mínimo e virar teste de regressão fixo.
- Manter os testes por exemplo existentes; os de propriedade são uma camada
  adicional.

## 6. Configuração

Nenhuma setting. Opcional: `UTPLSQL_FUZZ_ITERS` para controlar iterações em CI.

## 7. Plano de testes

- **Unitários**: novo bloco de propriedades + regressões reduzidas.
- **Cobertura**: medir o ganho em `scriptRunner.ts` (branches).
- **Manual**: rodar o script runner sobre um `.sql` real (SQL*Plus/`@@`,
  blocos PL/SQL) para confirmar ausência de regressão.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Teste de propriedade lento no CI | Número de iterações modesto por padrão; seed fixa |
| Invariante mal-formulado gerar falso positivo | Revisar cada invariante contra a intenção documentada no código |
| Descobrir bug e virar scope creep | Corrigir o mínimo + regressão; mudanças estruturais → PRD separada |

## 9. Rollout

- **0.23.0** ("Runtime, docs e qualidade residual"); sem mudança de comportamento esperada (salvo
  correção de bug real encontrado, registrada no `CHANGELOG.md`).

## 10. Critérios de aceite

- Invariantes do RF1 implementados e verdes sobre entradas geradas.
- Falha reprodutível por seed; sem dependência nova.
- Branches de `scriptRunner.ts` ≥ 95%; suíte total verde.

## 11. Questões em aberto

- Adotar `fast-check` futuramente (dev-dependency) ou manter o gerador próprio?
- Vale aplicar a mesma abordagem a `suiteParser.ts`/`tagFilter.ts`?

## 12. Impacto no cérebro

Ao concluir, avaliar uma regra `BR-TEST-*` ("o parser de scripts é validado por
testes de propriedade"). Se não houver regra nova, declarar **nenhuma** em
`## Impacto no cérebro`. Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-04-expand-tests|PRD-04]] · [[prd-62-run-scripts-against-profiles|PRD-62]]
- 🔗 Mesma versão (0.23.0): [[prd-95-esm-es2023-node22|PRD-95]] · [[prd-97-doc-no-site|PRD-97]] · [[prd-99-brain-reuse|PRD-99]] · [[prd-112-error-handling-audit|PRD-112]] · [[prd-116-direct-module-tests|PRD-116]]
- 🚀 ⬅️ release anterior: [[prd-93-continuous-localization-pipeline|PRD-93 (0.22.0)]]
<!-- brain:auto:end -->
