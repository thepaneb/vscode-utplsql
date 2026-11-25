<!-- GENERATED FROM docs/brain/20-PRDs/prd-115-split-i18n-locales.md — DO NOT EDIT -->

# PRD-115 — Fatiar `i18nLocales.ts` por locale

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-10 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.22.0 |
| Arquivos afetados | `src/i18nLocales.ts` → `src/i18n/locales/*.ts`, `src/i18n.ts`, `src/test/unit/i18n.test.ts`, `docs/wiki/{Architecture,Contributing,Internationalization}.md`, `docs/functional/{README,09-configuration}.md`, `docs/brain/70-Wiki/`, `docs/brain/10-Projeto/Funcional/`, `docs/brain/14-NFR/NFR-006`, `docs/brain/15-Regras/BR-I18N-001`, `docs/brain/15-Regras/BR-COB-001`, `.opencode/agent/{i18n-reviewer,docs-auditor}.md` |
| Esforço estimado | 1,5–2,5 dias (inclui o sweep de docs/regras) |
| Complexidade | Média |
| Relaciona-se a | PRD-49 (i18n), PRD-91/93 (paridade/pipeline de localização), PRD-95 (build) |

## 1. Resumo

`src/i18nLocales.ts` tem **5206 linhas** — 24 catálogos (`ptBr`, `en`, …) num
único arquivo, quase **1/3 de todo o código de produção**. É um arquivo de dados
grande, com merges ruidosos e navegação difícil. Esta PRD **quebra por locale**
(um arquivo por catálogo, com um barrel) mantendo a API pública e a cobertura,
sem alterar a saída do i18n.

## 2. Contexto e problema

- Um arquivo de 5206 linhas mistura pt-BR (base) e 23 traduções; qualquer mudança
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
- Migrar catálogos para JSON/YAML ou carregá-los em runtime. Lazy-load de
  locale só entra se a medição de bundle justificar (PRD-149).
- Mudar chaves, traduções, fallback (`locale → pt-BR → chave`) ou o motor.
- Alterar `package.nls.*.json` (manifesto VSCode) — são outro artefato.

## 4. Requisitos

### RF1 — Um arquivo por locale

- Criar `src/i18n/locales/<locale>.ts` para cada catálogo, exportando o mesmo
  símbolo (`ptBr`, `en`, …, preservando a ordem e a tipagem `Record<string,string>`).
- Criar `src/i18n/locales/index.ts` (barrel) que reexporta todos e expõe
  `LOCALE_CODES` (ordem canônica). `ExtensionLocale` e o mapa `catalogs` de
  `i18n.ts` passam a derivar desse registry; o mapa de prefixos de
  `resolveLocale` continua explícito (codifica `zh-hk → zh-tw`, etc.).
- Remover `src/i18nLocales.ts` e apontar o import de `i18n.ts` para o barrel.

### RF2 — Paridade e testes

- Manter/estender o teste de paridade (toda chave do `pt-BR` presente nos demais,
  sem chaves órfãs).
- Teste que confirma que o barrel exporta exatamente os 24 catálogos esperados
  (guard contra locale esquecido no split).

### RF3 — Build e empacotamento

- Confirmar que o `esbuild` continua produzindo o bundle e que o `.vsix` não
  regride de tamanho de forma relevante (mesmo conteúdo, módulos a mais).

### RF4 — Locale resolvido na chamada

- Remover a captura de `getExtensionLocale()` no registro dos comandos
  (`commands/run.ts`, `connection.ts`, `profile.ts`, `script.ts`, `debug.ts`,
  `utility.ts`); resolver o locale no momento da mensagem para que
  `utplsql.language` valha sem reload.

### RF5 — Sweep de docs, regras e diagrama

- Atualizar as superfícies geradas e canônicas: `docs/brain/70-Wiki/`
  (`Architecture`, `Contributing`, `Internationalization`),
  `docs/brain/10-Projeto/Funcional/` (`README`, `09-configuration`),
  `docs/brain/14-NFR/NFR-006` e os agentes `.opencode/agent/{i18n-reviewer,docs-auditor}.md`.
- Regenerar `docs/wiki/` / `docs/functional/` via `brain:build` no mesmo PR.
- Atualizar as regras que citam o arquivo: `BR-I18N-001` (enunciado e
  `implementacao`) e `BR-COB-001` (`i18nLocales.ts:122` → novo arquivo/locale).
- No diagrama `70-Wiki/images/diagram-i18n.svg`, trocar o rótulo
  `src/i18nLocales.ts (catalogs)` por `src/i18n/locales (catalogs)` e passar a
  wiki a usar o **SVG** (o PNG não é regenerável no ambiente).

**Não-funcionais**
- RNF1 — Saída idêntica: as strings resolvidas não mudam (teste de snapshot das
  chaves base).
- RNF2 — Cobertura ≥ thresholds; nenhum catálogo ganha/perde chave.
- RNF3 — Tempo de build estável.
- RNF4 — Medir `dist/extension.mjs` antes/depois; o split por si só não reduz o
  bundle e não deve ser vendido como redução.

## 5. Solução proposta

- Extrair mecanicamente cada bloco `export const <locale>: Record<string,string> = {…}`
  para seu arquivo (script de uma vez), gerar o barrel + `LOCALE_CODES` e apontar
  o import.
- Rodar `npm run test:coverage` e um diff de chaves antes/depois para provar
  equivalência; `npm run docs:check` no fim cobre o sweep de arquivos citados.

## 6. Configuração

Nenhuma setting/comando. Sem impacto para o usuário.

## 7. Plano de testes

- **Unitários**: `i18n.test.ts` (resolução/fallback), paridade de chaves, teste do
  barrel (24 catálogos + `LOCALE_CODES`).
- **Docs/regras**: `npm run docs:check`, `npm run brain:check`,
  `npm run brain:rules:lines` verdes após o sweep.
- **Tooling**: `npm run compile`, `npm run bundle`, `npm run package` ok;
  cobertura verde.
- **Manual**: trocar o idioma (`utplsql.language`) e conferir uma tela.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Divergência de chaves na extração | Diff automatizado das chaves por locale antes/depois |
| Import quebrado em algum ponto | `npm run typecheck` cobre todos os usos; grep por `from './i18nLocales'` |
| Docs/regras citando o arquivo removido | RF5 + `docs:check`/`brain:check`/`brain:rules:lines` no mesmo PR |
| Bundle inchar | Verificar tamanho do `dist/extension.mjs`; é o mesmo conteúdo lógico |

## 9. Rollout

- **0.22.0** ("Localização completa"); refactor puro.

## 10. Critérios de aceite

- Nenhum arquivo de locale acima de ~250 linhas; barrel exporta os 24 catálogos
  e `LOCALE_CODES` bate com `package.nls.*.json`/README.
- Chaves/valores idênticos ao original (verificado por teste/diff).
- Suíte, cobertura e `bundle` verdes; `.vsix` funcional.
- `docs:check`, `brain:check` e `brain:rules:lines` verdes (RF5).

## 11. Decisões (2026-11-25)

- **Remover** `src/i18nLocales.ts`; não manter reexport de compatibilidade. O
  único import é `src/i18n.ts`, que passa a apontar para o barrel.
- Exportar **`LOCALE_CODES`** do barrel e derivar dele `ExtensionLocale` e o mapa
  `catalogs`, eliminando a lista duplicada; o mapa de prefixos de `resolveLocale`
  permanece explícito.
- O sweep de docs/regras/diagrama (RF5) faz parte do escopo, inclusive a troca do
  diagrama para SVG e a atualização de `BR-I18N-001`/`BR-COB-001`.
- Esforço revisto para **1,5–2,5 dias** por causa do sweep.

## 12. Impacto no cérebro

Criada a regra `BR-I18N-008` ("catálogos de locale são um arquivo por locale,
exportados por barrel") com `prds: ["PRD-115"]`, `implementacao:` e `testes:`;
`BR-I18N-001` e `BR-COB-001` foram atualizadas para o novo caminho. O campo
`regras:` é derivado pelo `brain:sync`.

## 13. Impacto nas docs

- `CHANGELOG` — bullet do split dos catálogos (PRD-115).
- As notas de wiki/functional são atualizadas no sweep (RF5) sem exigir marcador
  de PRD, por ser refactor interno; o `docs:` fica restrito ao `CHANGELOG`.
