# PRD-03 — Pipeline CI + Linter

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Análise automatizada |
| Data | 2026-07-02 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.4.0 |
| Arquivos afetados | `.github/workflows/publish.yml`, `.github/workflows/ci.yml` (novo), `biome.json` (novo), `package.json` |

## 1. Resumo

Adicionar **validação automática em todo push e PR** (compilação + testes +
lint) e configurar um **linter** (Biome) para garantir estilo consistente e
pegar erros comuns antes do review.

## 2. Contexto e problema

- O workflow atual (`publish.yml`) só roda **em release** — não há guardrail
  automático para commits do dia a dia.
- Não há **linter** configurado. O código mistura aspas simples/duplas, ponto-e-vírgula
  inconsistente, e não tem `no-unused-vars`/`no-case-declarations` para evitar
  bugs simples.
- `npm test` roda unitários mas sem `--strict` de linter ou formatação.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Workflow `ci.yml` que roda em **push** (qualquer branch) e **pull request**.
- Passos: `npm ci` → `npm run compile` → `npm run lint` (se houver) → `npm test`.
- Configurar **Biome** como linter + formatter (zero-config, rápido, sem
  dependência de runtime extra).
- Adicionar script `npm run lint` e `npm run format`.
- **Não bloquear** o PR em falha de formatação (só lint) — formatação pode ser
  corrigida depois.

**Não-objetivos**
- Remover o workflow `publish.yml` (continue só em release).
- Husky/lint-staged (pré-commit local) — fica para iteração futura.
- Auto-format em commit.

## 4. Requisitos

### RF1 — Workflow `ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run compile
      - run: npm run lint
      - run: npm test
```

### RF2 — Linter: Biome

- Dependência dev: `@biomejs/biome` ^1.9.
- Config `biome.json` na raiz:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": ["node_modules", "out", ".vscode-test", "*.vsix", "images"]
  }
}
```

### RF3 — Scripts npm

```json
"scripts": {
  "lint": "biome check src/",
  "lint:fix": "biome check --write src/",
  "format": "biome format --write src/",
  "pretest:unit": "npm run compile && npm run lint"
}
```

### RF4 — Publicar workflow atualizado

Manter `publish.yml` mas adicionar `npm run lint` antes do package.

## 5. Solução proposta

### 5.1 Biome vs. ESLint + Prettier

| Critério | Biome | ESLint + Prettier |
|---|---|---|
| Config | Um arquivo | `.eslintrc` + `.prettierrc` |
| Velocidade | 10-100x mais rápido | Lento em projetos grandes |
| Regras recomendadas | Incluídas | Precisa instalar `@typescript-eslint/*` |
| Formatação | Nativa | Prettier separado |
| Manutenção | Duas devDeps | Muitas deps |

**Decisão: Biome** — projeto pequeno, zero-config possível, mais simples.

### 5.2 Regras de lint ativadas

`recommended: true` cobre:
- `noUnusedVariables`
- `noUnusedImports`
- `useConst`
- `noVar`
- `noEmptyBlockStatements`
- `useSingleVarDeclarations`
- etc.

### 5.3 Ignorar warnings de formatação no CI

O CI roda `biome check src/` (lint + formatação). Se falhar só por formatação,
o desenvolvedor roda `npm run format` localmente. Opcional: `npm run lint` pode
ser só `biome lint src/` (sem formatação) para não bloquear.

## 6. Configuração

Nenhuma setting de extensão — é puramente ferramenta de desenvolvimento.

## 7. Plano de testes

- Rodar `npm run lint` no projeto atual — esperado: várias correções de estilo.
- Rodar `npm run format` para normalizar.
- Confirmar que `npm test` continua passando.
- CI deve falhar se:
  - Código não compila.
  - Testes unitários quebram.
  - Há variável não usada ou outro erro de lint.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Biome pode não ter regra equivalente a alguma do ESLint | Caso ocorra, adicionar plugin/biome plugin ou migrar para ESLint |
| Mudança de formatação em massa polui diff do PR | Executar `npm run format` em commit separado ANTES do PR |
| CI lento com matrix 3x Node | Manter só Node 20 se custo for alto; matrix é cortesia |

## 9. Rollout

1. `npm install --save-dev @biomejs/biome`
2. Criar `biome.json`
3. Adicionar scripts `lint`/`format`/`lint:fix`
4. Rodar `npm run format` + `npm run lint:fix` e commitar
5. Criar `.github/workflows/ci.yml`
6. Atualizar `publish.yml` com `npm run lint`
7. Incrementar versão no `package.json`, atualizar `CHANGELOG.md`, criar
   **release no GitHub** (o workflow publica automaticamente)

## 10. Critérios de aceite

- `npm run lint` passa sem erros.
- `npm run format` normaliza todo `src/`.
- CI dispara em push para `main` e em todo PR.
- CI falha se código não compila ou lint encontra erro.
- `publish.yml` também roda lint.
