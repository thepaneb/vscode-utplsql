---
tipo: prd
id: PRD-91
aliases: [PRD-91]
status: proposed
titulo: "Paridade de documentação e distribuição localizada"
versao: "0.21.0"
data: "2026-09-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.21.0 — Localização (formatação, plurais e paridade)"
verificado: 2026-09-29
regras: []
tags: [prd]
---

# PRD-91 — Paridade de documentação e distribuição localizada

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.21.0 |
| Arquivos afetados | `scripts/docs-fidelity.cjs`, `src/test/unit/docsFidelity.test.ts`, `docs/brain/12-I18n/` (registro), `docs/brain/60-README/*`, `README*`, `docs/wiki/`, `.opencode/skills/docs-fidelity` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

O `docs:check` valida que as variantes de README **existem e estão linkadas**, mas
**não** cobra paridade de conteúdo: um bullet de feature pode existir no
`README.md` e faltar nas 23 variantes. Esta PRD fecha esse gate, cria um
**registro de locales** no cérebro com status/revisor, e formaliza a
**distribuição localizada** (Marketplace renderiza o README; wiki em inglês; posts
pt/en) e a **política de priorização** de locales por adoção.

## 2. Contexto e problema

- `scripts/docs-check.cjs` (`checkReadme`) só confere existência/links das
  variantes — **sem** comparar bullets, settings ou comandos.
- Na 0.14.0, os 5 bullets novos e depois 3 retroativos tiveram de ser inseridos
  manualmente em 24 arquivos; nada no CI garantia que as variantes ficassem iguais.
- Não há um inventário de locales (quem revisa, cobertura, status) — os `LOC-*`
  existem, mas sem métrica de manutenção.
- A "distribuição" (listagem do Marketplace, wiki, posts) é tratada fora do
  fluxo de fidelidade.

## 3. Objetivos / Não-objetivos

**Objetivos**
- **Gate de paridade estrutural** README ↔ 23 variantes: mesmo número de bullets
  de feature, mesmas tabelas-chave (settings/comandos) e mesmos links.
- **Registro de locales** em `docs/brain/12-I18n/` (status, revisor, cobertura,
  pendências), consumível por `docs-fidelity`.
- **Distribuição localizada**: garantir README (renderizado pelo Marketplace),
  wiki e posts alinhados ao que a UI entrega.
- **Política de priorização**: manter/encerrar locales com base em instalação por
  região (painel do Marketplace).

**Não-objetivos**
- Não integra TMS (PRD-93).
- Não traduz a listagem nativa do Marketplace (não há API de listagem por locale);
  o caminho é o README + wiki.

## 4. Requisitos

### RF1 — Paridade estrutural das variantes

`docs-fidelity` compara, por variante: contagem de bullets de feature, presença
das tabelas de settings/comandos e conjunto de links de idioma.

### RF2 — Registro de locales

`12-I18n/` ganha um índice (ou campo nas `LOC-*`) com status, revisor e
cobertura; `docs-fidelity` cobra a existência do registro para cada locale ativo.

### RF3 — Distribuição

Checklist/roteiro para README, wiki e posts refletirem as features atuais; o
`README.md` gerado é a fonte exibida pelo Marketplace.

### RF4 — Priorização por adoção

Documento de política: como decidir manter/adicionar/encerrar locale a partir de
instalações por região e custo de manutenção.

**Não-funcionais**
- RNF1 — Gate determinístico (falha o CI quando divergir).
- RNF2 — Sem tradução automática frágil; paridade **estrutural**, não semântica.

## 5. Solução proposta

- Estender `docs-fidelity.cjs` com `checkReadmeParity()` e testes em
  `docsFidelity.test.ts`.
- Índice em `docs/brain/12-I18n/` (MOC + notas `LOC-*`).
- Atualizar a skill `docs-fidelity` com o passo de paridade.

## 6. Configuração

Nenhuma.

## 7. Plano de testes

- **Unitários**: `docsFidelity.test.ts` — variante com bullet a menos falha;
  variante completa passa.
- **CI**: `npm run docs:check`/`docs:fidelity` cobrindo o novo gate.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Tradução "válida" divergir em estrutura | Gate estrutural, não semântico |
| Manutenção de 23 variantes virar gargalo | Registro + priorização por adoção |
| Falsos positivos em tabelas | Comparar por seção/chave, não por linha literal |

## 9. Rollout

- Release alvo: 0.21.0.
- Bullet no `CHANGELOG.md`; skill `docs-fidelity` atualizada.

## 10. Critérios de aceite

- `docs:check` falha se uma variante não tiver o mesmo conjunto de bullets.
- Registro de locales existe para os 24 e é cobrado.
- Política de priorização publicada no cérebro.

## 11. Questões em aberto

- Comparar paridade também no **conteúdo** das tabelas (não só presença)?

## 12. Impacto no cérebro

Esperado criar `BR-I18N-005` (paridade estrutural das variantes de README) e o
registro de locales (NFR/ENT a definir), com `prds: ["PRD-91"]`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-93-continuous-localization-pipeline|PRD-93]]
- 🔗 Mesma versão (0.21.0): [[prd-88-locale-aware-formatting|PRD-88]] · [[prd-89-pseudo-localization-gate|PRD-89]] · [[prd-90-message-plurals-cldr|PRD-90]]
- 🚀 ⬅️ release anterior: [[prd-107-unprivileged-fixture|PRD-107 (0.20.0)]] · ➡️ próxima release: [[prd-92-rtl-new-locales|PRD-92 (0.22.0)]]
<!-- brain:auto:end -->
