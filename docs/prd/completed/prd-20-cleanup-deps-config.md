# PRD-20 — Limpeza de dependências e configurações

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-18 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.7.1 |
| Arquivos afetados | `package.json`, `biome.json`, `tsconfig.json` |

## 1. Resumo

Remover a devDependency `c8` (não utilizada), corrigir padrões de exclusão do Biome para cobrir diretórios inteiros, e isolar tipos `mocha` do `tsconfig.json` para escopo de integração apenas.

## 2. Contexto e problema

### 2.1 `c8` não utilizado

`package.json` declara `"c8": "^11.0.0"` como devDependency. Nenhum script npm, workflow CI ou arquivo fonte referencia `c8`. O `@vscode/test-cli` já empacota seu próprio `c8@^9.1.0` internamente. A dependência é peso morto.

### 2.2 Padrões de exclusão do Biome

`biome.json` usa:
```json
"!**/out",
"!**/.vscode-test",
"!**/images"
```

Esses padrões só excluem um **arquivo** literalmente chamado `out`, `.vscode-test` ou `images` — não o conteúdo dos diretórios. Para excluir diretórios, o correto é `!**/out/**`, `!**/.vscode-test/**`, `!**/images/**`.

Na prática, o diretório `out/` contém apenas `.js` compilados e o Biome não os alcança porque `includes` só cobre `src/`. Mas `images/` poderia conter `.json` e ser varrido — o padrão atual não protege.

### 2.3 Tipos `mocha` no `tsconfig.json`

```json
"types": ["node", "mocha"]
```

O projeto usa `node --test` para testes unitários (módulos puros) e `mocha` apenas nos testes de integração (`@vscode/test-cli`). O campo `types` no `tsconfig.json` aplica os tipos globalmente, poluindo o intellisense de módulos puros com definições do Mocha. Deveriam ser escopados.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Remover `c8` do `package.json`.
- Corrigir padrões de exclusão do Biome para `!**/out/**` etc.
- Isolar tipos `mocha` dos fontes puros.

**Não-objetivos**
- Substituir `c8` por outra ferramenta.
- Migrar testes unitários para Mocha.
- Alterar a configuração de compilação além do campo `types`.

## 4. Requisitos

### RF1 — Remover `c8`

```bash
npm uninstall c8
```

### RF2 — Corrigir exclusões do Biome

```diff
- "!**/out",
- "!**/.vscode-test",
- "!**/images"
+ "!**/out/**",
+ "!**/.vscode-test/**",
+ "!**/images/**"
```

### RF3 — Isolar tipos `mocha`

Opções:
- **A)** Criar `tsconfig.integration.json` com `types: ["node", "mocha"]` e referenciar no `.vscode-test.mjs`.
- **B)** Remover `"mocha"` do `types` global e adicionar `/// <reference types="mocha" />` no topo dos arquivos de teste de integração.

**Recomendação: Opção B** — mais simples, sem criar arquivo de config extra.

**Não-funcionais**
- RNF1 — `npm run lint` continua passando.
- RNF2 — `npm run compile` continua sem erros.

## 5. Solução proposta

Três mudanças independentes e de baixo risco, agrupadas por economia de escopo (todas são limpeza de config).

## 6. Configuração

Nenhuma nova setting.

## 7. Plano de testes

- **Unitários**: `npm test` passa.
- **Lint**: `npm run lint` sem novos warnings.
- **Compilação**: `npm run compile` sem erros.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `c8` ser referenciado indiretamente por algum script | `rg c8` em todo o repo confirma que não há uso |
| Biome começar a varrer `out/` após correção | `!**/out/**` garante exclusão; `includes` também limita a `src/` |
| Tipos `mocha` remotos quebrarem compilação de testes de integração | Testar `tsc --noEmit` após a mudança |

## 9. Rollout

- Release 0.7.1 (patch).
- Atualizar `CHANGELOG.md`.

## 10. Critérios de aceite

- `c8` não está mais em `package.json` nem `package-lock.json`.
- Biome não reporta erros em `out/`, `.vscode-test/` ou `images/`.
- `tsc --noEmit` passa sem erros.
- `npm test` passa.

## 11. Questões em aberto

- Nenhuma.
