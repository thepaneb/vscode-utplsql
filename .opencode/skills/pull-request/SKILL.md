---
name: pull-request
description: Cria ou atualiza pull requests no GitHub deste repo seguindo o .github/PULL_REQUEST_TEMPLATE.md, com título na convenção do projeto e Closes derivado de docs/prd/.prd-issues.json. Use when asked to "gere um pull request", "criar PR", "abrir PR", "abrir pull request", "atualizar o PR" or when a branch is ready to merge into main.
compatibility: opencode
---

# Pull Request

Fluxo para abrir/atualizar o PR de uma branch contra `main`. O PR **deve** seguir
`.github/PULL_REQUEST_TEMPLATE.md` — o body é o próprio template preenchido, não
um resumo livre.

## Pré-condições

- Branch de origem commitada e pushada (`git push -u origin <branch>`).
- Base é `main` (default do repo). Branches `release/vX.Y.Z` também vão para `main`.
- Sem pendências: `npm run docs:check`, `npm run lint` e `npm run test:unit` verdes.

## Passos

1. **Inspecionar o estado**

   ```sh
   git status && git branch --show-current
   git log --oneline origin/main..HEAD
   git diff --stat origin/main...HEAD
   ```

2. **Ler o template** `.github/PULL_REQUEST_TEMPLATE.md` e preencher todas as
   seções: Descrição, Tipo de mudança, Como foi testado?, Checklist, Screenshots,
   Notas adicionais.

3. **Título** — use a convenção do repo:
   - Release: `release: X.Y.Z` (ex.: `release: 0.12.0`).
   - Demais: Conventional Commits (`feat: …`, `fix: …`, `docs: …`, `refactor: …`),
     opcionalmente citando os PRDs/issues (ex.: `fix: … (PRD-35, PRD-36)`).

4. **`Closes`** — liste as issues dos PRDs concluídos na branch, não invente
   números. O mapa vive em `docs/prd/.prd-issues.json` (cache do `sync-prds`;
   **nunca editar à mão**). O script calcula o join para o range `origin/main...HEAD`:

   ```sh
   npm run pr:create -- --closes
   # → Closes #19, #44, #45, #65, #66, #80, #82, #83, #84, #85, #86, #87
   ```

   Preencha `Closes #…` no template com o resultado. Se não houver issue, deixe
   o campo com o comentário do template.

5. **Como foi testado? / Checklist — só marque com evidência.** Rode o que der
   localmente e confirme o CI do commit da branch:

   ```sh
   npm run test:unit
   # check-runs do HEAD (compile/lint/test unitários via ci.yml)
   TOKEN="$(sed -n 's/^GITHUB_TOKEN=//p' .env | tr -d '\r' | sed -e 's/^"//' -e 's/"$//')"
   curl -s -H "Authorization: Bearer $TOKEN" \
     "https://api.github.com/repos/thepaneb/vscode-utplsql/commits/$(git rev-parse HEAD)/check-runs" \
     | grep -E '"name"|"status"|"conclusion"'
   ```

   Desmarque (ou deixe `[ ]`) o que não foi verificado de fato — ex.: `F5`,
   integração com banco e args de CLI legados. **Nunca** marque teste que não rodou.

6. **Criar/atualizar o PR** com `scripts/create-pr.cjs` (não depende do `gh`, que
   não está instalado; lê o `GITHUB_TOKEN` do `.env` em processo, sem problema de WSL):

   ```sh
   # salve o body preenchido DENTRO do repo (path relativo!) e rode:
   npm run pr:create -- --title "release: 0.12.0" --body-file .pr-body.tmp.md
   rm -f .pr-body.tmp.md
   ```

   O script é idempotente: se já existir PR aberto para a branch, ele **atualiza**
   o body; caso contrário cria. Opções: `--base` (default `main`), `--head`,
   `--update <n>`, `--closes`, `--draft`, `--dry-run`.

   Alternativa `gh` (se instalado): `gh pr create --base main --title "…" --body-file …`.

7. **Reportar a URL** do PR ao usuário.

## Verificação (obrigatória)

- [ ] Body preenchido no formato do `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Título na convenção (`release: X.Y.Z` ou Conventional Commits)
- [ ] `Closes` com issues reais de `docs/prd/.prd-issues.json` (se houver PRD concluído)
- [ ] Checkboxes do Checklist condizentes com o que foi realmente executado
- [ ] URL do PR retornada ao usuário
- [ ] (`release`) skill `release` seguida para tag/GitHub release após o merge

## Armadilhas

- `gh` **não** está instalado neste ambiente — use `scripts/create-pr.cjs` / API.
- No WSL o `node` é o `node.exe` do Windows: ele **não enxerga** caminhos como
  `/tmp/...`. Salve o `--body-file` em path **relativo dentro do repo** (e apague
  depois), senão o script aborta com "arquivo deve existir".
- No WSL o token não chega ao `node.exe` via env; o script lê o `.env` direto,
  então **não** precisa exportar `GITHUB_TOKEN`/`WSLENV` para ele.
- Token no `.env` costuma vir com `\r` — sempre `tr -d '\r'` ao exportar à mão.
- `head` igual a `base` → o GitHub recusa; confira a branch atual.
- Não invente números de issue nem marque testes como executados sem evidência.
- Branch `release/*`: o PR é só o começo; publicar é via GitHub release
  (`publish.yml`), **nunca** `npm run publish` local.

## Referências

- `.github/PULL_REQUEST_TEMPLATE.md` — molde do body
- `scripts/create-pr.cjs` — criação/atualização via API
- `docs/prd/.prd-issues.json` — mapa PRD → issue (cache, não editar)
- `.opencode/skills/prd-workflow` — ciclo de vida dos PRDs/issues
- `.opencode/skills/release` — publicação após o merge
