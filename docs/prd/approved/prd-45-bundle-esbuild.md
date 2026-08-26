# PRD-45 — Bundling com esbuild + poda do node-oracledb no VSIX

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber |
| Data | 2026-08-26 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.11.0 |
| Arquivos afetados | `esbuild.config.mjs` (novo), `package.json`, `.vscodeignore`, `.github/workflows/publish.yml` |

## 1. Resumo

Reduzir o tamanho e o número de arquivos do VSIX publicando a extensão
empacotada com **esbuild** (dependências puras inline, `oracledb` external) e
podando do pacote os **binários nativos do node-oracledb**, que são inúteis
para o projeto (somente thin mode é usado). Alvo: eliminar o warning de
performance do `vsce` no workflow de publicação e acelerar a ativação da
extensão.

## 2. Contexto e problema

O workflow `publish.yml` emite duas vezes o warning (nos passos `vsce package`
e `vsce publish`):

> This extension consists of 281 files, out of which 188 are JavaScript files.
> For performance reasons, you should bundle your extension.

Origem dos arquivos JS (medido com `npx vsce ls`):

| Origem | Arquivos |
|---|---|
| `out/*.js` (tsc, 1 arquivo por módulo) | 48 |
| `node_modules/oracledb` (thin driver JS) | 107 |
| `node_modules/oracledb/build/Release/*.node` (5 binários, ~3.1MB) | 5 |
| `node_modules/fast-xml-parser` + `iconv-lite` + `strnum` + `safer-buffer` | 90 |

Análise:

- O código próprio é compilado pelo `tsc` em 48 arquivos separados — cada
  `require` vira I/O de disco na ativação.
- `oracledb` é `optionalDependency` e está no pacote de propósito (modo
  `auto` funciona out-of-the-box). Mas o pacote npm traz **5 binários nativos
  de todas as plataformas** (win32/linux/darwin × x64/arm64), usados **apenas
  pelo thick mode** (Instant Client). O projeto nunca chama `initOracleClient`
  — usa exclusivamente o thin driver (JS puro).
- Não existe distribuição oficial "thin-only" do node-oracledb. A Oracle
  fornece `package/prunebinaries.js`, que remove binários de outras
  arquiteturas mas mantém 1 — inútil para VSIX cross-platform.
- Bundling do próprio `oracledb` é desencorajado (requires dinâmicos
  internos, sem suporte oficial). O ganho viável está em: (a) embutir as
  dependências puras, (b) excluir os binários nativos, (c) reduzir `out/` a
  um único arquivo.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Bundle com esbuild: `out/` (48 arquivos) → `dist/extension.js` (1 arquivo)
- Embutir `fast-xml-parser`, `iconv-lite`, `strnum`, `safer-buffer` no bundle
- Manter `oracledb` external (`await import('oracledb')` preservado)
- Excluir `node_modules/oracledb/build/**` (binários) do VSIX
- Reduzir o VSIX em ~3.1MB + ~137 arquivos
- Eliminar (ou minimizar) o warning de performance do `vsce`

**Não-objetivos**
- Não remover o `oracledb` do pacote (modo `auto` continua out-of-the-box)
- Não suportar thick mode / Instant Client
- Não bundlear o próprio oracledb
- Não alterar settings, comandos ou comportamento de execução
- Não alterar thresholds de cobertura do c8

## 4. Requisitos

### RF1 — Config de build esbuild

Arquivo `esbuild.config.mjs` na raiz:

```js
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['vscode', 'oracledb'],
  sourcemap: true,
});
```

### RF2 — Scripts npm

- `"compile"` continua `tsc -p ./` (gera `out/**` para **testes** e checagem de tipos)
- Novo `"bundle"`: `node esbuild.config.mjs`
- `"package"` passa a rodar `npm run compile && npm run bundle` antes do `vsce package`
- `"main"` em `package.json` aponta para `./dist/extension.js`

### RF3 — .vscodeignore

- Excluir `out/**` do VSIX (substituído por `dist/`)
- Excluir `node_modules/oracledb/build/**` (5 binários nativos, ~3.1MB)
- Excluir `node_modules/oracledb/examples/**` e `node_modules/oracledb/package/**`
- Manter `node_modules/oracledb/lib/**` (thin driver JS)

### RF4 — Workflow de publicação

`publish.yml` roda `npm run bundle` antes do passo `vsce package`.

**Não-funcionais**
- RNF1 — Ativação funciona **sem** oracledb instalado (fallback CLI) — o
  `await import` dinâmico não pode quebrar com o bundle
- RNF2 — Sourcemaps preservados (c8 mapeia `dist/*.js` → `src/*.ts`)
- RNF3 — Testes unitários continuam rodando de `out/test/**` (tsc), sem
  depender do bundle
- RNF4 — VSIX cross-platform (Win/Linux/macOS) sem binário nativo embarcado

## 5. Solução proposta

### 5.1 Build em dois estágios

```
tsc            → out/**        (testes + typecheck, como hoje)
esbuild bundle → dist/extension.js  (produção, 1 arquivo + sourcemap)
```

`esbuild` entra como `devDependency`. `external: ['vscode', 'oracledb']`
garante que o import dinâmico de `oracledb` continue resolvendo de
`node_modules` no runtime (que segue no VSIX, sem os binários).

### 5.2 Poda do oracledb

O thin mode é JS puro (`lib/thin/`). Os binários em `build/Release/*.node`
são carregados apenas por `initOracleClient()` (thick). Como o projeto não
usa thick mode, a exclusão é segura. Teste de sanidade: `npm run package` +
F5 + execução Oracle real.

### 5.3 Resultado esperado

| Item | Antes | Depois |
|---|---|---|
| Arquivos no VSIX | 281 | ~130 |
| Arquivos JS | 188 | ~108 (107 do oracledb + 1 bundle) |
| Tamanho | ~4.4MB de oracledb | ~1.3MB de oracledb |

> Se o warning do vsce persistir (threshold de 100 JS files), plano B:
> excluir também os módulos JS do thick mode que o thin não importa
> (`lib/soda*`, `lib/aq*`, `lib/dbObject.js`, `lib/impl/*`) — avaliar com
> teste real durante a execução.

## 6. Configuração

Nenhuma nova setting de usuário. Mudanças em `package.json` (main, scripts,
devDependency `esbuild`), `.vscodeignore` e `publish.yml`.

## 7. Plano de testes

- **Unitários**: `npm test` — sem mudanças (rodam de `out/test/**`)
- **Empacotamento**: `npm run package` e inspecionar o VSIX (`vsce ls`) para
  confirmar a contagem de arquivos e a ausência de `build/Release/*.node`
- **Validação manual**: F5 — ativação, Test Explorer, execução CLI; execução
  Oracle direta contra banco real (thin mode sem binários)
- **Regressão**: ativação com `oracledb` removido de node_modules (fallback
  CLI deve funcionar)
- **CI**: workflow `ci.yml` (compile + lint + test) e `publish.yml` (bundle +
  package) verdes

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| esbuild quebrar `await import('oracledb')` | `external: ['oracledb']` + teste de ativação sem/com oracledb |
| Exclusão dos binários quebrar algum caminho do thin driver | Thin mode é JS puro; validar com execução Oracle real (integração) |
| Warning do vsce persistir (107 JS do oracledb) | Plano B: podar módulos thick não usados; aceitar warning residual documentado |
| Sourcemap do bundle não mapear para c8 | `sourcemap: true` no esbuild; conferir relatório de cobertura |
| `main` → `dist/` quebrar testes de integração (@vscode/test-cli) | Testes de integração carregam a extensão via `main`; rodar `npm run test:integration` |
| Esquecer de rodar `bundle` antes do package | `"package"` passa a encadear `compile && bundle` |

## 9. Rollout

- Versão alvo: `0.11.0` (minor — melhoria de build/pacote, sem mudança de
  comportamento)
- Publicação pelo workflow existente (`publish.yml`, via GitHub release)
- `CHANGELOG.md`: entrada 0.11.0 mencionando bundling + VSIX menor

## 10. Critérios de aceite

- [ ] `esbuild.config.mjs` gera `dist/extension.js` (bundle único) com sourcemap
- [ ] `package.json` `main` → `./dist/extension.js`; `"package"` roda `compile && bundle`
- [ ] `.vscodeignore` exclui `out/**` e `node_modules/oracledb/build/**`
- [ ] `npx vsce ls` mostra VSIX sem binários nativos e sem `out/`
- [ ] `npm run compile && npm run lint && npm test` passam
- [ ] F5 valida ativação + execução CLI; integração valida execução Oracle real
- [ ] `npm run package` gera o VSIX sem erros
- [ ] Workflow `publish.yml` atualizado com passo de bundle

## 11. Questões em aberto

- Confirmar se o warning do vsce desaparece com ~108 JS files (threshold exato
  não documentado) — se persistir, aplicar plano B (seção 5.3)
- Decidir se `dist/` substitui `out/` também em `.vscodeignore` de uma vez ou
  se `out/` permanece por segurança na transição
