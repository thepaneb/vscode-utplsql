---
name: release
description: Checklist to publish a new version of the extension consistently — bump package.json, CHANGELOG, conclude version PRDs, docs, GitHub release and LinkedIn post. Use when asked to "publicar versão", "fazer release", "bump version", "preparar release", "criar release" or when a version is about to ship.
compatibility: opencode
---

# Release

Publicação é **exclusivamente via GitHub release** (workflow `publish.yml`, que
roda compile/lint/test/package e publica no Marketplace). **Nunca** rode
`npm run publish`/`vsce publish` local — local só `npm run package` (gera `.vsix`).

## Aprovação obrigatória (mantenedor)

**Não** faça **merge na `main`**, **não crie tag** e **não crie/publique GitHub
release** sem **aprovação específica e explícita do mantenedor na conversa**.
“Sim” genérico, “continue” ou aprovação de etapa anterior não valem. Preparar a
branch de release, commitar, pushar, abrir/atualizar o PR e rodar os gates é
permitido; o merge, a tag e a release exigem aprovação. Se a aprovação for só
para o merge, pare depois dele e peça a aprovação da tag/release em separado.

## Pré-condições

- `npm run test:unit`, `npm run lint` e (com banco) `npm run test:integration` verdes.
- Sem pendências de documentação: `npm run docs:check`.
- Versão sincronizada: `npm run version:check` (package ↔ lock ↔ CHANGELOG ↔ site).

## Passos

1. **Versão** — `minor` para feature, `patch` para correção. Defina `X.Y.Z`.
2. **`package.json`** — atualize `"version"` e rode `npm run version:check`.
3. **`CHANGELOG.md`** — crie a seção `## X.Y.Z` no topo; se houver `## Unreleased`,
   mova os itens para ela (não deixe `Unreleased` órfã).
4. **PRDs da versão** — conclua os PRDs entregues (mover para `completed/`,
   preencher a coluna **Versão**) usando a skill **`prd-workflow`**; ao concluir,
   crie/altere as regras `BR-*`/`SEC-*` que a PRD materializa e rode
   `npm run brain:rules` (o vínculo PRD ↔ regra/SEC é bidirecional e cobrado no
   CI); preencha `docs:`/`## Impacto nas docs` e o registro de features; rode
   `npm run docs:features-check -- <versão>` e `npm run sync-prds` no fim.
5. **Docs** — se houve settings/comandos/features, aplique a skill
   **`docs-fidelity`** (README + 23 variantes, `docs/wiki` (en), functional).
6. **Commit + push** da branch de release. **Não faça merge na `main`** ainda:
   abra/atualize o PR final e aguarde a **aprovação específica** do mantenedor
   para o merge.
7. **Somente após a aprovação do merge**, faça o merge do PR
   `release/vX.Y.Z` → `main`. Depois, **aguarde a aprovação específica para a
   tag/release** e crie a GitHub release com a tag `vX.Y.Z` e as notas do
   `CHANGELOG` (`gh release create` ou pela UI). O `publish.yml` dispara no
   evento `published` e publica no Marketplace + anexa o `.vsix`.
8. **Post de LinkedIn** — após publicar, crie/atualize o post de release
   (skill **`linkedin-posts`**) com os números reais do repo.

## Números do CHANGELOG/post

```sh
grep -m1 '"version"' package.json
npm run test:unit 2>&1 | grep '^ℹ tests'          # contagem de testes unitários
grep "| X.Y.Z |" docs/prd/index.md | wc -l        # PRDs concluídos na versão
```

## Verificação (obrigatória)

- [ ] `package.json`, `package-lock.json`, topo do `CHANGELOG` e `softwareVersion` do site batem (`npm run version:check`)
- [ ] PRDs concluídos da versão com a coluna **Versão** preenchida
- [ ] PRDs concluídos (>= 0.14.0) com `regras:` derivado e vínculo bidirecional
      (`npm run brain:rules`)
- [ ] `npm run docs:check` e `npm run brain:check` OK
- [ ] `npm run docs:features-check -- <versão>` OK (README, wiki, posts/cards)
- [ ] Aprovação explícita do mantenedor para o **merge na `main`**
- [ ] Aprovação explícita do mantenedor para a **tag/GitHub release**
- [ ] CI verde no commit da release
- [ ] GitHub release publicada → workflow `Publish Extension` concluído
- [ ] post de release no LinkedIn criado (local/gitignored)

## Armadilhas

- **Não** usar `npm run publish` local (bloqueado por convenção; só o CI publica).
- Tag da release e `package.json` devem ter a mesma versão (`vX.Y.Z`).
- `docs/linkedin/` é local — não entra no commit da release.
- Token do GitHub: `GITHUB_TOKEN` no `.env` (+ `WSLENV` no WSL) para `sync-prds`
  e `gh` — ver `AGENTS.md`.
