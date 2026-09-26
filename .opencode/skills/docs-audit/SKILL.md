---
name: docs-audit
description: Semantic audit of the versioned documentation against the current code — catches obsolete claims, missing/undocumented capabilities, contradictions and wrong behavior that structural checks (docs:check/docs:fidelity) cannot. Use when asked "a documentação reflete o código?", "auditar docs", "documentação desatualizada", or before a release.
compatibility: opencode
---

# Docs Audit (auditoria semântica)

Complementa o `docs-fidelity` (que só pega drift **estrutural**: settings,
comandos, módulos, versão, PRDs). Aqui o foco é drift **semântico**: textos que
afirmam/omitem/contradizem o comportamento real do código.

## Duas camadas de defesa

| Camada | Ferramenta | Pega |
|---|---|---|
| Estrutural (CI) | `npm run docs:check` / `docs:fidelity` | setting/comando/módulo/versão/PRD ausente, termo obsoleto |
| Semântica (sob demanda) | **este skill** → subagente `docs-auditor` | "é roadmap" quando já existe, capacidade não documentada, contradição, limite errado |

## Quando rodar

- Antes de publicar uma versão (skill `release`).
- Depois de concluir PRDs que mudam comportamento/settings/comandos.
- Quando a dúvida for "a doc reflete o código?".

## Workflow

1. **Fixar o escopo** — o diff desde um ponto (`git diff <ref>...HEAD`) ou o
   repo inteiro (auditoria completa).
2. **Rodar as checagens estruturais primeiro** (não repetir o que elas já pegam):
   ```sh
   npm run docs:check
   npm run docs:fidelity
   ```
3. **Lançar o subagente `docs-auditor`** (read-only) com o escopo e o diff:
   - usar a ferramenta de task/subagente apontando para `.opencode/agent/docs-auditor.md`;
   - o subagente lê o **código** (`src/`, `package.json`, `scripts/`) e a doc
     versionada, e reporta achados com `doc: file:line` + `code: file:line`.
4. **Triar os achados** — aplicar as correções (skill `docs-fidelity`) e, se
   algum padrão for recorrente, **adicionar uma checagem** ao
   `scripts/docs-fidelity.cjs` para os próximos ciclos.

## O que o auditor cobre

- **Obsoleto**: feature "roadmap"/"reserved"/"no effect" já implementada; coisa
  removida (CLI/Java, `type_mapping`) ainda documentada.
- **Ausente**: capacidade/setting/comando/limitação sem doc (ou sem espelho em
  README ↔ wiki ↔ functional).
- **Contradição**: docs entre si ou com o código; números divergentes (testes,
  PRDs, locales, versões).
- **Comportamento errado**: default, range, grant ou erro documentado ≠ código.
- **Versão**: exemplos apontando release antiga.
- **i18n**: bullets de features / tabela de config / comandos sem paridade nas
  variantes de idioma.

## Verificação (obrigatória ao concluir)

- [ ] achados aplicados (ou justificadamente descartados, com nota)
- [ ] `npm run docs:check` verde
- [ ] `npm run brain:sync && npm run brain:check` verdes (se a doc mudou)
- [ ] se um padrão for recorrente, nova checagem em `scripts/docs-fidelity.cjs`
      (+ teste em `src/test/unit/docsFidelity.test.ts`)

## Armadilhas

- O subagente é **read-only**: ele reporta, você corrige.
- Não duplique o `docs:fidelity` — reporte só o que ele não pega.
- `docs/brain/` e `docs/linkedin/` são locais (gitignored): fora da auditoria
  versionada (o LinkedIn tem o skill próprio).
