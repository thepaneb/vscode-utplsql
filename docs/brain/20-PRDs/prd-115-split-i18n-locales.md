---
tipo: prd
id: PRD-115
aliases: [PRD-115]
status: proposed
titulo: "Fatiar `i18nLocales.ts` por locale"
versao: "0.23.0"
data: "2026-10-10"
autor: "Gil Cleber Barboza"
versao_titulo: "0.23.0 — Qualidade interna"
verificado: 2026-10-10
regras: []
tags: [prd]
---

# PRD-115 — Fatiar `i18nLocales.ts` por locale

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-10 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `src/i18nLocales.ts` → `src/i18n/locales/*.ts`, `src/i18n.ts`, `src/test/unit/i18n.test.ts` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-49 (i18n), PRD-91/93 (paridade/pipeline de localização), PRD-95 (build) |

## 1. Resumo

`src/i18nLocales.ts` tem **4812 linhas** — 24 catálogos (`ptBr`, `en`, …) num
único arquivo, quase **1/3 de todo o código de produção**. É um arquivo de dados
grande, com merges ruidosos e navegação difícil. Esta PRD **quebra por locale**
(um arquivo por catálogo, com um barrel) mantendo a API pública e a cobertura,
sem alterar a saída do i18n.

## 2. Contexto e problema

- Um arquivo de 4812 linhas mistura pt-BR (base) e 23 traduções; qualquer mudança
  em um locale toca o mesmo arquivo, gerando conflitos em PRs concorrentes.
- Navegação/edição (ir para `en`, comparar `pt-BR` × `es`) é custosa.
- O `brain` já trata paridade de locales; no código, a granularidade não
  acompanha.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Um arquivo por locale (`src/i18n/locales/<locale>.ts`) e um `index.ts` que
  reexporta os catálogos na ordem/nomes atuais.
- `i18n.ts` e o restante do código inalterados do ponto de vista de importação
  (bastando apontar para o barrel).
- Manter cobertura ≥ thresholds e a paridade de chaves validada por teste.

**Não-objetivos**
- Migrar catálogos para JSON/YAML ou carregá-los em runtime.
- Mudar chaves, traduções, fallback (`locale → pt-BR → chave`) ou o motor.
- Alterar `package.nls.*.json` (manifesto VSCode) — são outro artefato.

## 4. Requisitos

### RF1 — Um arquivo por locale

- Criar `src/i18n/locales/<locale>.ts` para cada catálogo, exportando o mesmo
  símbolo (`ptBr`, `en`, …, preservando a ordem e a tipagem `Record<string,string>`).
- Criar `src/i18n/locales/index.ts` (barrel) que reexporta todos.
- `src/i18nLocales.ts` pode virar um reexport do barrel (ou ser removido,
  ajustando o import em `i18n.ts`).

### RF2 — Paridade e testes

- Manter/estender o teste de paridade (toda chave do `pt-BR` presente nos demais,
  sem chaves órfãs).
- Teste que confirma que o barrel exporta exatamente os 24 catálogos esperados
  (guard contra locale esquecido no split).

### RF3 — Build e empacotamento

- Confirmar que o `esbuild` continua produzindo o bundle e que o `.vsix` não
  regride de tamanho de forma relevante (mesmo conteúdo, módulos a mais).

**Não-funcionais**
- RNF1 — Saída idêntica: as strings resolvidas não mudam (teste de snapshot das
  chaves base).
- RNF2 — Cobertura ≥ thresholds; nenhum catálogo ganha/perde chave.
- RNF3 — Tempo de build estável.

## 5. Solução proposta

- Extrair mecanicamente cada bloco `export const <locale>: Record<string,string> = {…}`
  para seu arquivo (script de uma vez), gerar o barrel e apontar o import.
- Rodar `npm run test:coverage` e um diff de chaves antes/depois para provar
  equivalência.

## 6. Configuração

Nenhuma setting/comando. Sem impacto para o usuário.

## 7. Plano de testes

- **Unitários**: `i18n.test.ts` (resolução/fallback), paridade de chaves, teste do
  barrel (24 catálogos).
- **Tooling**: `npm run compile`, `npm run bundle`, `npm run package` ok;
  cobertura verde.
- **Manual**: trocar o idioma (`utplsql.language`) e conferir uma tela.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Divergência de chaves na extração | Diff automatizado das chaves por locale antes/depois |
| Import quebrado em algum ponto | `npm run typecheck` cobre todos os usos; grep por `from './i18nLocales'` |
| Bundle inchar | Verificar tamanho do `dist/extension.js`; é o mesmo conteúdo lógico |

## 9. Rollout

- **0.23.0** ("Qualidade interna"); refactor puro.

## 10. Critérios de aceite

- Nenhum arquivo de locale acima de ~250 linhas; barrel exporta os 24 catálogos.
- Chaves/valores idênticos ao original (verificado por teste/diff).
- Suíte, cobertura e `bundle` verdes; `.vsix` funcional.

## 11. Questões em aberto

- Manter `src/i18nLocales.ts` como reexport de compatibilidade ou removê-lo?
- Aproveitar para adicionar IDs de locale derivados de arquivo (evitar lista
  duplicada em `i18n.ts`)?

## 12. Impacto no cérebro

Ao concluir, criar/ajustar a regra `BR-I18N-*` ("catálogos de locale são um
arquivo por locale, exportados por barrel") com `prds: ["PRD-115"]`,
`implementacao:` e `testes:`. Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-49-internacionalizacao|PRD-49]] · [[prd-91-doc-parity-localized-distribution|PRD-91]] · [[prd-95-esm-es2023-node22|PRD-95]]
- 🔗 Mesma versão (0.23.0): [[prd-111-decompose-oracle-runner|PRD-111]] · [[prd-112-error-handling-audit|PRD-112]] · [[prd-113-lint-scope|PRD-113]] · [[prd-114-vscode-stub-modernization|PRD-114]] · [[prd-116-direct-module-tests|PRD-116]] · [[prd-117-split-script-property-tests|PRD-117]]
- 🚀 ⬅️ release anterior: [[prd-93-continuous-localization-pipeline|PRD-93 (0.22.0)]]
<!-- brain:auto:end -->
