---
tipo: prd
id: PRD-113
aliases: [PRD-113]
status: proposed
titulo: "Ampliar o escopo do lint (Biome) para além de `src/`"
versao: "0.23.0"
data: "2026-10-10"
autor: "Gil Cleber Barboza"
versao_titulo: "0.23.0 — Qualidade interna"
verificado: 2026-10-10
regras: []
tags: [prd]
---

# PRD-113 — Ampliar o escopo do lint (Biome) para além de `src/`

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-10 |
| Componente | Extensão `paneb.vscode-utplsql` + ferramentas (`scripts/`, manifestos) |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `package.json`, `biome.json`, `scripts/*.cjs`, `*.mjs`, `.github/workflows/ci.yml` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-03 (CI/lint), PRD-20 (cleanup deps/config) |

## 1. Resumo

O lint roda apenas em `src/` (`"lint": "biome check src/"`), embora o
`biome.json` declare `files.includes: ["**", ...]`. Consequência: o **manifesto e
os scripts ficam fora do gate** — já há desalinhamento de indentação em
`package.json` (bloco `menus`, `package.json:680-689`). Esta PRD **amplia o
escopo** para manifestos, configs e `scripts/`, com exclusões explícitas para o
que é gerado/vendorizado, e normaliza o `package.json`.

## 2. Contexto e problema

- `npm run lint` = `biome check src/`: mudanças em `package.json`,
  `esbuild.config.mjs` e `scripts/*.cjs` não passam por nenhum gate de estilo/lint.
- O `biome.json` inclui `**` mas o CLI restringe a `src/`, então a configuração
  dá uma falsa sensação de cobertura.
- Já existe drift real: chaves de `menus` em `package.json` com indentação
  inconsistente (6 vs 8 espaços).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Passar o escopo efetivo do lint a cobrir manifestos, configs e `scripts/`.
- Excluir explicitamente artefatos gerados/vendorizados e diretórios de
  ferramentas de agente que não são código do produto.
- Normalizar o `package.json` (indentação dos menus) e deixar o CI cobrindo.

**Não-objetivos**
- Reformatar `src/` (já conforme) ou mudar regras de lint.
- Lintar a documentação Markdown ou o vault (`docs/`), o site (`site/`) ou as
  skills externas (`.agents/`).
- Lintar `package-lock.json` (gerado).

## 4. Requisitos

### RF1 — Escopo do lint

- Alterar o script `lint` para cobrir a raiz com exclusões explícitas em
  `biome.json` (`files.includes`/`ignore`) para: `node_modules`, `out`, `dist`,
  `coverage`, `.vscode-test`, `*.vsix`, `images`, `docs`, `site`, `.agents`,
  `.kilo`, `.opencode`, `package-lock.json`.
- `biome check .` deve rodar limpo (após normalização) tanto local quanto no CI.

### RF2 — Normalização

- Rodar `biome check --write` no `package.json` e corrigir a indentação do bloco
  `menus` e eventuais desvios de outros manifestos/configs.
- Garantir que a normalização **não altere semântica** (chaves/valores idênticos).

### RF3 — CI e contribuição

- `ci.yml` continua chamando `npm run lint` (agora com escopo ampliado).
- Documentar em `CONTRIBUTING`/nota do vault que o lint cobre manifestos e
  scripts, não só `src/`.

**Não-funcionais**
- RNF1 — Tempo de lint estável (segundos); sem nova dependência.
- RNF2 — Nenhuma regra desativada para "fazer passar"; ajustar o código, não a
  regra (o `overrides` de testes existente permanece).

## 5. Solução proposta

- Ajustar `biome.json` com a allowlist/denylist de diretórios e trocar o script
  para `biome check .`.
- Rodar `--write`, revisar o diff (deve ser só formatação de manifestos) e
  corrigir qualquer diagnóstico real em `scripts/`.
- Se algum `scripts/*.cjs` acusar regra indevida para CommonJS de ferramenta,
  tratar caso a caso (não silenciar em bloco).

## 6. Configuração

Nenhuma setting/comando de usuário. Muda o script `lint` e a config do Biome.

## 7. Plano de testes

- **Verificação tooling**: `npm run lint` limpo cobrindo os arquivos-alvo;
  `npm run lint` **passa** a falhar ao reintroduzir um desvio (prova do gate).
- **Regressão de manifest**: `node -e "JSON.parse(fs.readFileSync('package.json'))"`
  e `npm run package` continuam ok.
- **CI**: pipeline verde com o novo escopo.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Lint começar a cobrir gerados e quebrar | Exclusões explícitas antes de ampliar; rodar `--write` revisando o diff |
| Regras do Biome irem contra o estilo do `scripts/` | Ajustar o código do script; só overrides pontuais e justificados |
| `package-lock.json` acidentalmente no escopo | Excluir explicitamente |

## 9. Rollout

- **0.23.0** ("Qualidade interna").
- Registrar no `CHANGELOG.md`; sem impacto no runtime da extensão.

## 10. Critérios de aceite

- `npm run lint` cobre manifestos/configs/`scripts/` e passa limpo.
- `package.json` sem drift de indentação; diff da normalização é só formatação.
- Gerados (`docs/`, `site/`, lockfile) fora do escopo.
- CI verde.

## 11. Questões em aberto

- Vale um `lint:ci` separado do `lint` local (mesma cobertura)?
- Incluir `package.nls.*.json` no gate de formatação (são estáveis)?

## 12. Impacto no cérebro

Ao concluir, criar/ajustar a regra `BR-QUAL-002` (lint cobre todo o repositório,
não só `src/`) com `prds: ["PRD-113"]`, `implementacao:` e `testes:`. Enquanto
`proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-03-ci-lint|PRD-03]] · [[prd-20-cleanup-deps-config|PRD-20]]
- ⚙️ Pipelines: [[PIPE-ci - CI|PIPE-ci]]
- 🔗 Mesma versão (0.23.0): [[prd-111-decompose-oracle-runner|PRD-111]] · [[prd-112-error-handling-audit|PRD-112]] · [[prd-114-vscode-stub-modernization|PRD-114]] · [[prd-115-split-i18n-locales|PRD-115]] · [[prd-116-direct-module-tests|PRD-116]] · [[prd-117-split-script-property-tests|PRD-117]]
- 🚀 ⬅️ release anterior: [[prd-93-continuous-localization-pipeline|PRD-93 (0.22.0)]]
<!-- brain:auto:end -->
