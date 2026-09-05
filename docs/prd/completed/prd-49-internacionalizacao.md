# PRD-49 — Internacionalização (i18n) dos conteúdos textuais da extensão

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber |
| Data | 2026-08-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `src/i18n.ts` (novo), `package.json` + `package.nls*.json` (novos), `src/config.ts`, `src/extension.ts`, `src/runner.ts`, `src/oracleRunner.ts`, `src/quickfix.ts`, `src/compilationDiagnostics.ts`, `src/cli.ts`, `src/statusBar.ts`, `src/results.ts` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta (trabalho mecânico, porém amplo) |

## 1. Resumo

Permitir que o usuário escolha o idioma dos conteúdos textuais gerados pela
extensão (mensagens, output de execução, diagnósticos, quick-fixes, status bar,
prompts) via a setting `utplsql.language` (`auto` | `pt-br` | `en`). Títulos da
palette, descrições de settings e keybindings passam a usar o mecanismo
oficial `package.nls` (seguem o idioma do editor).

## 2. Contexto e problema

Hoje **todas** as strings da extensão estão hardcoded em português:

- **package.json**: 18 títulos de comandos + ~28 descrições de settings em PT
- **src/**: ~42 pontos de UI — `showErrorMessage`/`showInformationMessage`/
  `showWarningMessage`/`showInputBox`, `run.appendOutput` (mensagens `[info]`,
  `[aviso]`, `[erro]`, `[cobertura]`), mensagens de diagnóstico
  (`compilationDiagnostics`, `quickfix`), títulos de quick-fix, labels da
  status bar e prompts de conexão

Usuários de VSCode com idioma EN recebem toasts e output em PT. Não há como
escolher.

O VSCode oferece dois mecanismos oficiais:

- **`package.nls.json`** (+ `package.nls.<locale>.json`): títulos/descrições do
  manifest com placeholders `%key%` — resolvidos automaticamente pelo **idioma
  do editor**
- **`vscode.l10n.t()`**: mensagens de runtime com bundle `l10n/` — também
  segue o idioma do editor (sem escolha por extensão)

Para a **escolha explícita pelo usuário** (requisito desta PRD), as mensagens
de runtime usam um módulo i18n próprio guiado pela setting, com `auto`
delegando para `vscode.env.language`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Setting `utplsql.language`: `auto` (default) | `pt-br` | `en`
- Catálogo de mensagens de runtime em pt-BR (extraído do código atual) e en
- `package.nls` para títulos de comandos, settings e keybindings
- Migrar os ~42 pontos de UI para `t('key', params)`
- `auto` → `pt-br` quando o idioma do editor é `pt*`; caso contrário `en`

**Não-objetivos**
- Traduzir conteúdo vindo do **banco** (output do utPLSQL, erros Oracle)
- Traduzir nomes de testes/suites (vêm do usuário)
- Traduzir documentação (README/wiki/functional — podem ser PRD futura)
- Novos idiomas além de pt-BR/en na v1 (arquitetura permite)
- Mudança dinâmica de títulos de palette por setting (limitação do manifest —
  seguem o idioma do editor via package.nls)

## 4. Requisitos

### RF1 — Setting `utplsql.language`

```jsonc
"utplsql.language": {
  "type": "string",
  "enum": ["auto", "pt-br", "en"],
  "default": "auto",
  "description": "Idioma dos conteúdos textuais da extensão. 'auto' segue o idioma do VSCode (pt* → pt-br; senão en)."
}
```

### RF2 — Módulo i18n puro (`src/i18n.ts`)

```typescript
export type ExtensionLocale = 'pt-br' | 'en';

export function resolveLocale(setting: string, vscodeLanguage: string): ExtensionLocale;
export function t(locale: ExtensionLocale, key: string, params?: Record<string, string | number>): string;
```

- Catálogos como `const en: Record<string, string> = { ... }` e `ptBr`
  (TS puro — type-checking das chaves; sem I/O)
- Interpolação simples `{0}`/`{name}`
- **Fallback**: chave ausente no idioma → valor pt-BR → senão a própria chave
  (nunca lança)
- Estado: locale resolvido uma vez por sessão (a setting não muda em runtime
  sem reload — simplificação documentada; `auto` usa `vscode.env.language`
  na ativação)

### RF3 — `package.nls`

- `package.nls.json` (base) + `package.nls.pt-br.json`
- `package.json` passa a usar `%key%` nos títulos/descrições
- `vscode:prepublish`/`package` continuam funcionando sem passo extra (o vsce
  lê os arquivos nls automaticamente)

### RF4 — Migração das mensagens de runtime

Todos os pontos de UI passam a `t(locale, 'key', params)`:

| Área | Exemplos |
|---|---|
| `runner.ts` | `[info]`, `[aviso]`, `[erro]`, `[cobertura]`, mensagens de fallback |
| `extension.ts` | prompts de conexão, toasts de comandos, warnings |
| `quickfix.ts` | mensagens de diagnóstico (`UTPLSQL_NO_CLI`, `BAD_CONN`, `OLD_VERSION`, `INVALID_OBJECTS`, `NO_COVERAGE`), títulos de quick-fix |
| `compilationDiagnostics.ts` | source label mantido (`"utPLSQL Compilation"` é identificador, não traduz) |
| `oracleRunner.ts` | `[erro] Oracle runner`, aviso de cobertura |
| `cli.ts` | erro "CLI não encontrado" |
| `statusBar.ts` | labels da barra |
| `results.ts` | aviso "nenhum arquivo mapeado" |

**Não-funcionais**
- RNF1 — Zero mudança de comportamento observável no default (`auto` em
  editor pt → mensagens idênticas às atuais)
- RNF2 — Módulo i18n puro (testável com `node --test`)
- RNF3 — Auditoria: teste/script que garante que os dois catálogos têm as
  mesmas chaves
- RNF4 — Cobertura c8 acima dos thresholds

## 5. Solução proposta

### 5.1 Arquitetura

```
package.json ──%key%──► package.nls.json / package.nls.pt-br.json
                              (idioma do editor, automático)

src/i18n.ts  ── catalogs (ptBr, en) + resolveLocale + t()
src/config.ts ── cfg.language = get('language', 'auto')
src/*.ts ── t(locale, 'key', params) nas mensagens de runtime
              locale = resolveLocale(cfg.language, vscode.env.language)
```

### 5.2 Estratégia de migração (mecânica, por arquivo)

1. Criar `src/i18n.ts` com as chaves extraídas (uma por string) + testes
2. Um commit por módulo migrado (`config` → `cli` → `runner` → `extension` →
   `quickfix` → `oracleRunner` → `statusBar` → `results`)
3. `package.nls` no fim (commit próprio)
4. Gate por commit: `npm run compile && npm run lint && node --test`

## 6. Configuração

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.language` | `auto` | `auto` (segue o VSCode: `pt*` → pt-br, senão en), `pt-br`, `en` |

Atualizar: README (tabela de config), wiki `Configurações.md`.

## 7. Plano de testes

- **Unitários** (`i18n.test.ts`): `resolveLocale` (auto+pt, auto+en, forçado,
  valor inválido → fallback), `t` com/parametros, interpolação, chave ausente
  → fallback pt-BR → chave
- **Unitários**: teste de paridade de chaves entre catálogos (falha CI se
  divergirem)
- **Integração**: sem mudança (strings não afetam fluxos) — smoke via
  `describeDB` existente
- **Validação manual**: F5 com editor EN + setting `en`/`pt-br`/`auto`;
  verificar toasts, output, diagnósticos e quick-fixes

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Strings esquecidas na migração | Grep de auditoria (`show*Message`, `appendOutput`, `title:`); revisão por commit |
| Templates com pluralização/ordem diferente entre idiomas | Interpolação parametrizada `{0}`/`{nome}`; sem pluralização na v1 |
| Setting muda e exige reload | Documentado: aplica na próxima ativação (padrão VSCode para settings) |
| package.nls com chave faltando | vsce falha o package se `%key%` não resolvida (gate de CI) |

## 9. Rollout

- Versão alvo: 0.12.0 (minor)
- Default `auto` preserva o comportamento atual em editores pt
- CHANGELOG.md; README + wiki atualizados

## 10. Critérios de aceite

- [ ] `utplsql.language: en` mostra mensagens de runtime em inglês
- [ ] `auto` em editor pt-BR reproduz as mensagens atuais (sem mudança)
- [ ] Catálogos pt-BR/en com paridade de chaves garantida por teste
- [ ] `package.nls` aplicado a comandos, settings e keybindings
- [ ] `npm run compile && npm run lint && node --test` verdes
- [ ] `npm run package` gera VSIX sem warnings de nls
- [ ] Docs atualizados (README, wiki Configurações)

## 11. Questões em aberto

- Adicionar `es`/outros idiomas na v2? (arquitetura de catálogo já permite)
- Formato do catálogo: TS (type-check) vs JSON (mesmo formato do l10n oficial)?
- Interação com `vscode.l10n.t()` oficial no futuro: manter módulo próprio ou
  migrar para l10n + setting de override?
- Traduzir também a documentação (README/wiki) via este mecanismo? (sugestão:
  fora do escopo, PRD futura)
