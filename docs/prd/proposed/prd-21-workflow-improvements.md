# PRD-21 — Melhorias nos workflows CI/CD

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-18 |
| Componente | CI/CD `.github/workflows/` |
| Versão alvo | 1.0.0 |
| Arquivos afetados | `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `package.json` |

## 1. Resumo

Unificar a versão das GitHub Actions (`checkout`/`setup-node`) entre `ci.yml` e `publish.yml`, eliminar passos duplicados de compile/lint no CI, e padronizar a invocação do `vsce` entre workflow e scripts npm.

## 2. Contexto e problema

### 2.1 Versões divergentes das actions

| Workflow | `checkout` | `setup-node` |
|---|---|---|
| `ci.yml` | `@v4` | `@v4` |
| `publish.yml` | `@v6` | `@v6` |

Ambos os workflows deveriam usar a mesma versão. O latest disponível é `@v7` (actions/checkout v7.0.0 de 18 Jun 2026; actions/setup-node v7.0.0 de 14 Jul 2026).

### 2.2 Compile/lint duplicados no CI

`ci.yml` executa:
1. `npm run compile` (step explícito)
2. `npm run lint` (step explícito)
3. `npm test` → dispara `pretest:unit` → `npm run compile && npm run lint`

Compilação e lint rodam **duas vezes**. Basta o `pretest:unit` — os steps explícitos são redundantes.

### 2.3 Invocação inconsistente do `vsce`

- `publish.yml`: `npx @vscode/vsce package` / `npx @vscode/vsce publish`
- `package.json`: `"package": "vsce package"` / `"publish": "vsce publish"`

Ambos funcionam (o binário `vsce` é fornecido pelo pacote `@vscode/vsce`), mas `npx` adiciona latência desnecessária no CI.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Unificar `checkout` e `setup-node` em `@v7` nos dois workflows.
- Remover steps redundantes de compile/lint do `ci.yml`.
- Padronizar invocação do `vsce` nos workflows (usar binário direto, não `npx`).

**Não-objetivos**
- Adicionar novos jobs ou triggers ao CI.
- Alterar a lógica de publish (continua exclusivamente via release).
- Migrar para outro CI provider.

## 4. Requisitos

### RF1 — Unificar actions em `@v7`

```yaml
# ci.yml e publish.yml
- uses: actions/checkout@v7
- uses: actions/setup-node@v7
```

### RF2 — Remover compile/lint redundantes do `ci.yml`

Remover os steps:
```yaml
- run: npm run compile
- run: npm run lint
```

O `npm test` já dispara `pretest:unit` que faz ambos.

### RF3 — Padronizar `vsce` nos workflows

```diff
- run: npx @vscode/vsce package
+ run: npm run package

- run: npx @vscode/vsce publish
+ run: npm run publish
```

Usar scripts npm (que já usam `vsce` diretamente) em vez de `npx`.

**Não-funcionais**
- RNF1 — CI deve continuar passando com os mesmos critérios de sucesso.
- RNF2 — Publish workflow deve continuar funcional (testar com `npm run package` local).

## 5. Solução proposta

### 5.1 `ci.yml`

```yaml
steps:
  - uses: actions/checkout@v7
  - uses: actions/setup-node@v7
    with:
      node-version: ${{ matrix.node-version }}
  - run: npm ci
  - run: npm test
```

### 5.2 `publish.yml`

```yaml
steps:
  - uses: actions/checkout@v7
  - uses: actions/setup-node@v7
    with:
      node-version: 24
      cache: 'npm'
  - run: npm ci
  - run: npm run compile
  - run: npm run lint
  - run: npm run test:unit
  - run: npm run package
  - run: npm run publish
    env:
      VSCE_PAT: ${{ secrets.VSCE_PAT }}
  - run: gh release upload ${{ github.event.release.tag_name }} *.vsix
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 6. Configuração

Nenhuma nova setting.

## 7. Plano de testes

- **CI**: push no branch deve disparar `ci.yml` e passar.
- **Publish**: criar release de teste (pré-release) para validar o workflow.
- **Local**: `npm run package` gera `.vsix` corretamente.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `@v7` das actions ter breaking changes | `checkout@v7` migrou para ESM — mas o uso é declarativo (YAML), sem impacto para consumidores. `setup-node@v7` também é transparente. |
| `npm run publish` ser bloqueado localmente | O script `publish` do `package.json` tem `"prepublish": "echo 'Use GitHub release workflow'"` e `echo` no corpo — ajustar para o CI conseguir chamar vsce diretamente |

## 9. Rollout

- Release 0.8.0 (minor — mudanças em CI/CD).
- Atualizar `CHANGELOG.md`.

## 10. Critérios de aceite

- `ci.yml` usa `actions/checkout@v7` e `actions/setup-node@v7`.
- `publish.yml` usa as mesmas versões.
- CI não tem steps compile/lint duplicados.
- `publish.yml` usa `npm run package` e `npm run publish`, não `npx`.

## 11. Questões em aberto

- O script `"publish"` no `package.json` atualmente bloqueia publicação local. Para o CI usá-lo, precisamos de uma flag de ambiente (ex.: `CI=true`) que bypassa o bloqueio, ou criar um script separado `"publish:ci"`.
