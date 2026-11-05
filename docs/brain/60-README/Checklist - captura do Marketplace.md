---
tipo: nota
status: ativo
titulo: "Checklist — captura do Marketplace"
verificado: 2026-11-05
tags: [marketplace, screenshots, checklist]
---

# Checklist — captura do Marketplace (0.20.0)

Use este checklist **ao final** da implementação, antes do commit 9b e da PR
única. Os textos de alt/caption são em inglês porque a página do Marketplace é
English-only.

## 1. Ambiente

- [ ] VS Code estável **1.125+**.
- [ ] Abrir o **Extension Development Host** com `F5` a partir do repo.
- [ ] No host, abrir `src/test/fixtures/workspace-marketplace-screenshots/` (no Windows, não no WSL).
- [ ] Tema **`Default Dark Modern`**; zoom **100%**; janela **1600×900**.
- [ ] Minimapa desligado; barra de status visível; notificações/terminais irrelevantes fechados.
- [ ] Configurar um perfil de conexão de demonstração (schema `DEMO`), **sem commitar senha**.
- [ ] Executar `utPLSQL: Validate setup` e confirmar que não há diagnóstico.
- [ ] Rodar a suíte uma vez para popular resultados; abrir a aba **Testing** e deixar as suites expandidas.
- [ ] Confirmar que nenhum host real, usuário, senha, wallet ou nome de cliente aparece na tela.

## 2. Prints

| # | Arquivo | Cena | Alt text (EN) | Legenda (EN) |
|---|---|---|---|---|
| 1 | `marketplace-test-explorer.png` | Test Explorer com suites/testes verdes e vermelhos + editor `ut_orders.pks` com CodeLens Run/Coverage + status bar | `VS Code Test Explorer showing utPLSQL suites and tests, with Run and Coverage CodeLens in the editor` | `Native Test Explorer: run, debug and see results without leaving VS Code.` |
| 2 | `marketplace-coverage.png` | Editor com gutters de cobertura (verde/vermelho) + aba **Coverage** com percentuais | `PL/SQL editor with line coverage gutters and the Test Coverage panel` | `Line coverage for Oracle PL/SQL, mapped back to your source files.` |
| 3 | `marketplace-debugger.png` | Debugger parado em breakpoint em `orders.pkb`, painéis Variables/Call Stack/Watch | `PL/SQL debugger stopped at a breakpoint with variables and call stack` | `Debug utPLSQL tests with breakpoints, stepping and variables.` |
| 4 | `marketplace-failure-diff.png` | Teste falhando selecionado, diff **Expected vs Actual**, decoração vermelha e status bar | `Failing utPLSQL test showing expected versus actual values and inline failure decoration` | `See the assertion diff and jump straight to the failing line.` |
| 5 | `marketplace-connection-profiles.png` *(opcional)* | Status bar de perfil + QuickPick de perfis (nomes mascarados) | `Connection profile status bar and profile picker` | `Switch between connection profiles without editing settings.` |
| 6 | `marketplace-run.gif` *(opcional)* | 8–12 s: rodar uma suíte pelo CodeLens/Test Explorer, resultados verdes, abrir Coverage | `Short demo running utPLSQL tests and opening coverage` | `From test run to coverage in one click.` |

- [ ] 1 — Test Explorer + CodeLens capturado.
- [ ] 2 — Coverage com gutters + painel capturado.
- [ ] 3 — Debugger com breakpoint/variáveis capturado.
- [ ] 4 — Falha com diff expected/actual capturada.
- [ ] 5 — Perfis/status bar capturado (opcional).
- [ ] 6 — GIF 8–12 s, ≤5 MB (opcional).

## 3. Captura e privacidade

- [ ] Capturar **somente a janela do VS Code** (`Alt+PrintScreen` no Windows ou Snipping Tool em modo janela), não o desktop inteiro.
- [ ] Não usar mockups, telas fabricadas ou dados de cliente.
- [ ] Revisar com zoom: sem host, usuário, senha, wallet, caminho de cliente ou nome de cliente.
- [ ] Nomes de perfil/connection mascarados quando necessário.
- [ ] Manter os textos de UI em inglês (locale `en`); não capturar em PT-BR.
- [ ] Salvar em `docs/brain/60-README/images/` com os nomes **exatos** da tabela.

## 4. Pós-captura

- [ ] PNG **1600×900**, ≤300 KB cada; total dos assets ≤2 MB.
- [ ] GIF ≤5 MB, 8–12 s (se houver).
- [ ] Otimizar com `pngquant --quality=70-90 --ext .png --force <arquivo>` ou `oxipng -o 4 <arquivo>` (se disponível).
- [ ] `npm run brain:build` para espelhar `docs/brain/60-README/images/` → `images/`.
- [ ] Descomentar os blocos de imagem na nota canônica e adicionar `<!-- marketplace:images-ready -->`.
- [ ] `npm run marketplace:check` → todos os arquivos/dimensões/tamanhos OK.
- [ ] `npm run docs:check && npm run docs:fidelity` → links/imagens/claims OK.
- [ ] `npm run package` e conferir:
  - `unzip -p *.vsix extension/readme.md` contém hero + imagens;
  - `unzip -l *.vsix` não lista `README.*.md`;
  - imagens referenciadas existem no pacote.
- [ ] Abrir o `MARKETPLACE.md` renderizado e conferir a primeira dobra (hero + screenshot + início do quick start).
- [ ] Revisar alt text/legendas contra a tabela.
- [ ] Aprovar o commit 9b para a consolidação da 0.20.0.

## 5. Critério de “prints prontos”

- [ ] 4 screenshots obrigatórias presentes e válidas (a 5ª é opcional).
- [ ] Nenhum PII/segredo.
- [ ] `marketplace:check`, `docs:check`, `docs:fidelity` verdes.
- [ ] VSIX contém o README do Marketplace e as imagens.
