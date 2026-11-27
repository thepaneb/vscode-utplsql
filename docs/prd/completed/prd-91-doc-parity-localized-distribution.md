<!-- GENERATED FROM docs/brain/20-PRDs/prd-91-doc-parity-localized-distribution.md — DO NOT EDIT -->

# PRD-91 — Paridade de documentação e distribuição localizada

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.22.0 |
| Arquivos afetados | `scripts/docs-fidelity.cjs`, `scripts/docs-check.cjs`, `src/test/unit/docsFidelity.test.ts`, `docs/brain/12-I18n/` (registro), `docs/brain/60-README/*`, `README*`, `docs/wiki/`, `.opencode/skills/docs-fidelity` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

O `docs:check` valida que as variantes de README **existem e estão linkadas**, mas
**não** cobra paridade de estrutura/conteúdo: um bullet de feature ou um comando
pode existir no `README.md` e faltar nas 23 variantes. O `docs-fidelity` já cobre
as **settings** (item 9), mas não bullets, comandos nem o conjunto de links de
idioma. Esta PRD estende esse gate, cria um **registro de locales** no cérebro com
status/revisor, e formaliza a **distribuição localizada** (Marketplace renderiza o
README; wiki em inglês; posts pt/en) e a **política de priorização** de locales por
adoção.

## 2. Contexto e problema

- `scripts/docs-check.cjs` (`checkReadme`) só confere existência/links das
  variantes — **sem** comparar bullets, comandos ou o conjunto de links de
  idioma. O `docs-fidelity` já compara settings, mas não o resto.
- `scripts/docs-check.cjs:81` tem o número **23 hardcoded**; com `ar`/`he`
  (PRD-92) isso vira 25 e precisa ser derivado.
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

`docs-fidelity` compara, por variante, **tokens normalizados** (ids
`utplsql.*`, links de idioma e âncoras de feature) e a estrutura por seção, não a
prosa traduzida; settings continuam cobertas pelo item 9. O `docs-check` deixa de
ter o número de variantes hardcoded e passa a derivá-lo de `package.nls.*.json`.

### RF2 — Registro de locales

`12-I18n/Registro de locales.md` (nota **manual** — as `LOC-*` são geradas pelo
`brain:sync`) com status, revisor, cobertura e pendências; `docs-fidelity` cobra
uma entrada para cada locale ativo.

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

- Estender `docs-fidelity.cjs` com `checkReadmeParity()` (tokens/âncoras) e testes
  em `docsFidelity.test.ts`; remover o `23` hardcoded do `docs-check`.
- Registro manual em `docs/brain/12-I18n/Registro de locales.md` (MOC + `LOC-*`
  continuam geradas).
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

- Release alvo: 0.22.0.
- Bullet no `CHANGELOG.md`; skill `docs-fidelity` atualizada.

## 10. Critérios de aceite

- `docs:check` falha se uma variante não tiver o mesmo conjunto de bullets.
- Registro de locales existe para os 24 e é cobrado.
- Política de priorização publicada no cérebro.

## 11. Decisões (2026-11-25)

- Paridade por **multiset de bullets de feature (emoji)**, presença da tabela de
  Comandos e conjunto completo de links de idioma; settings já são cobertas pelo
  item 9 do `docs-fidelity`. **Não** comparar prosa traduzida (falso positivo
  semântico).
- O registro de locales é uma **nota manual** (`12-I18n/Registro de locales.md`),
  porque as `LOC-*` são geradas; donos/revisores são compartilhados com a PRD-93.
- O número de variantes deixa de ser literal no `docs-check` e passa a derivar de
  `package.nls.*.json` (já prepara a PRD-92).
- O gate roda no `docs-fidelity`/`docs:check`, sem job novo no CI.

## 12. Impacto no cérebro

Criada a regra `BR-I18N-005` (paridade estrutural das variantes + registro de
locale) com `prds: ["PRD-91"]`; o registro está em
`12-I18n/Registro de locales.md` e a política em `12-I18n/Política de locales.md`.

RNFs sem regra: RNF1, RNF2 (cobertos pelos testes/gates de qualidade).

## 13. Impacto nas docs

- `CHANGELOG` — bullet do gate de paridade e do registro de locales (PRD-91).
- `wiki/Contributing.md` — passo de paridade das variantes e como manter o
  registro (PRD-91).
