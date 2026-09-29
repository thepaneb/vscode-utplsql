---
tipo: prd
id: PRD-{NN}
status: proposed
titulo: "{Título curto e descritivo}"
versao: "{x.y.z}"
data: "{YYYY-MM-DD}"
autor: "{Nome}"
verificado: "{YYYY-MM-DD}"
regras: [] # derivado por brain:sync (BR-*/SEC-* que citam esta PRD)
tags: [prd]
---

# PRD-{NN} — {Título curto e descritivo}

| Campo | Valor |
|---|---|
| Autor | {Nome} |
| Data | {YYYY-MM-DD} |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | {x.y.z} |
| Arquivos afetados | `{caminho/arquivo.ts}`, `{caminho/arquivo2.ts}` |
| Esforço estimado | {0,5–1 dia \| 1–2 dias \| 2–3 dias \| ...} |
| Complexidade | {Baixa \| Média \| Média-Alta \| Alta} |

## 1. Resumo

{Parágrafo único com o essencial: o que será feito e por que em 2-3 frases.}

## 2. Contexto e problema

{Descrição do problema atual. Por que a mudança é necessária?}

## 3. Objetivos / Não-objetivos

**Objetivos**
- {Objetivo específico 1}

**Não-objetivos**
- {O que fica explicitamente fora do escopo}

## 4. Requisitos

### RF1 — {Título do requisito funcional}

{Descrição detalhada.}

**Não-funcionais**
- RNF1 — {Requisito não-funcional 1}

## 5. Solução proposta

{Descrição da implementação, decisões de design.}

## 6. Configuração

{Novas settings, comandos, menus — ou "Nenhuma".}

## 7. Plano de testes

- **Unitários**: {o que testar e como}
- **Integração**: {o que testar e como}
- **Validação manual**: {cenários}

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| {Risco 1} | {Mitigação 1} |

## 9. Rollout

- {Release alvo e estratégia}
- {CHANGELOG.md}

## 10. Critérios de aceite

- {Critério 1 — verificável}

## 11. Questões em aberto

- {Dúvidas não resolvidas}

## 12. Impacto no cérebro

{Regras/SEC criadas ou alteradas por esta PRD — ex.: `BR-CONN-016`, `SEC-011`.
O campo `regras:` do frontmatter é derivado por `npm run brain:sync` a partir do
`prds:` das regras. Se a PRD não exigir regra alguma, escreva explicitamente
**nenhuma** nesta seção (o CI cobra a seção quando `regras: []`).}

## Conexões

<!-- brain:auto:start:conexoes -->
<!-- brain:auto:end -->
