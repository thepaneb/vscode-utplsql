# PRD-23 — Screenshots da wiki: checklist manual + diagramas (reconciliada)

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 (reconciliada 2026-08-15) |
| Componente | `docs/wiki/images/`, `scripts/gen-diagrams.cjs`, `README.md` |
| Versão alvo | 0.10.0 |
| Arquivos afetados | `docs/wiki/images/`, `scripts/gen-diagrams.cjs`, `package.json`, `README.md`, páginas da wiki |

## 1. Resumo (reconciliado)

A automação de screenshots da wiki foi **descartada** após implementação e
avaliação de qualidade (commit `1830612`, 08/08). O escopo entregue passou a ser:

1. **Checklist manual de captura** (23 itens) com instruções passo a passo em
   `docs/wiki/images/README.md`.
2. **Diagramas vetoriais (SVG)** gerados por script, renderizados a PNG via
   `@resvg/resvg-js` (cross-platform, sem dependências de sistema):
   - `diagram-schemas` — arquitetura de schemas (owner UT3 + schemas de aplicação)
   - `diagram-arquitetura` — os dois modos de execução (CLI e Oracle direto)
   - `diagram-conexao` — ordem de resolução da conexão
   - `diagram-streaming` — fluxo de streaming do Oracle runner
   - `diagram-diagnosticos` — ciclo de vida dos diagnósticos
3. **Fixtures** `.pks` preservadas como referência para capturas manuais.

## 2. Contexto e histórico

O objetivo original era automatizar 16 dos 21 screenshots via Playwright +
`@vscode/test-electron`, eliminando o custo de ~2-3h por rodada de captura
manual.

**Trajetória da implementação:**

| Fase | Abordagem | Resultado |
|---|---|---|
| 07/21 | Playwright + `@vscode/test-electron` | Falhou — porta CDP do Electron não confiável |
| 07/23–08/08 | Docker + xvfb + scrot + xdotool, container com Oracle real | 22 PNGs gerados automaticamente |
| 08/08 | Avaliação de qualidade | **Descartado** — PNGs com qualidade insatisfatória para publicação (artefatos de renderização, inconsistência de fonte/tema) |
| 08/15 | Reconcilição | Checklist manual + diagramas SVG renderizados via script |

O commit `1830612` removeu os scripts de automação (`gen-screenshots*.cjs/.sh`,
Dockerfile, `screenshots-test.cjs`) e a devDependency `playwright`, preservando
o checklist, as fixtures e o diagrama de schemas.

## 3. Escopo final entregue

### RF1 — Checklist manual de captura

`docs/wiki/images/README.md` com:
- Especificações gerais (largura ≤ 1200px, PNG, light theme)
- Pré-requisitos (workspace fixture + settings de conexão)
- Checklist de 23 itens numerados: 15 UI pura, 7 com banco Oracle, 1 diagrama
- Nomes de arquivo exatos referenciados pela wiki
- Dicas de captura (gutters, tooltips, palette, Problems Panel)

### RF2 — Fixtures de referência

`src/test/fixtures/workspace-gen-screenshots/` preservadas:
`tst_hello_world.pks`, `tst_coverage_sample.pks`, `tst_multi_suite.pks`,
`tst_broken.pks`, `db/APP/` e `db/INVENTORY/` (modo schema).

### RF3 — Diagrama de schemas

`docs/wiki/images/diagram-schemas.svg` + PNG, referenciado em
`Requisitos-no-banco.md` (install compartilhado vs por schema).

### RF4 — Diagramas adicionais (reconciliação 08/15)

Avaliação do README e da wiki identificou quatro fluxogramas de alto valor,
criados como SVG e referenciados nas páginas:

| Diagrama | Página(s) | Conteúdo |
|---|---|---|
| `diagram-arquitetura.svg` | README.md, Arquitetura.md | Dois modos de execução: Oracle direto (conn1/conn2) vs CLI (JUnit/Cobertura/doc) |
| `diagram-conexao.svg` | Conexão.md | Ordem de resolução: setting → env → cache → prompt |
| `diagram-streaming.svg` | Execução-Oracle-direta.md | Streaming: `ut_runner.run` + poll 200ms do buffer → Output/Test Explorer |
| `diagram-diagnosticos.svg` | Diagnósticos-e-quick-fix.md | Ciclo de vida: ativação → execução → pós-execução com quick-fix |

### RF5 — Script de renderização

`scripts/gen-diagrams.cjs` (substitui o `gen-diagram.sh` baseado em
`rsvg-convert`): renderiza **todos** os `.svg` de `docs/wiki/images/` para PNG
de 1200px de largura via `@resvg/resvg-js` — funciona em Windows/Linux sem
dependências de sistema.

```json
"gen-diagram": "node scripts/gen-diagrams.cjs"
```

## 4. Não-objetivos / Descartado

- **Automação de captura de tela** (Playwright, xdotool, scrot, Docker) —
  descartada por qualidade insatisfatória dos PNGs gerados.
- Screenshots que exigem banco Oracle real continuam manuais (output de
  terminal, resultados reais).
- Vídeos/GIFs, múltiplas versões do VSCode.

## 5. Lições aprendidas

- **Captura de UI do VSCode via Electron/container é instável**: seletors,
  fontes e temas variam entre builds; o ganho de automação não compensa a
  perda de qualidade para material publicado.
- **SVG + resvg é o caminho certo para diagramas**: vetorial (crisp em
  qualquer DPI), versionável, renderização determinística e cross-platform
  sem `librsvg`/ImageMagick.
- Checklist manual bem documentado custa uma vez e paga em todas as releases
  com mudanças de UI pontuais.

## 6. Critérios de aceite (reconciliados)

- [x] Checklist manual completo (23 itens) em `docs/wiki/images/README.md` com instruções por item
- [x] `diagram-schemas.svg` + PNG referenciado em `Requisitos-no-banco.md`
- [x] 4 diagramas adicionais criados e referenciados no README/wiki
- [x] `npm run gen-diagram` renderiza todos os SVGs para PNG ≤ 1200px (cross-platform via resvg)
- [x] Scripts de automação de captura removidos (sem dead code)
- [x] `playwright` removido das devDependencies
- [x] Fixtures `.pks` preservadas como referência

## 7. Questões resolvidas (herdadas da versão original)

- **Mock vs manual (5 screenshots de terminal)** → manual (output real é mais autêntico; automação descartada por completo)
- **Workflow CI separado ou integrado** → nenhum (sem automação)
- **Frequência de regeneração** → sob demanda, com checklist por release
- **VSCode estável vs insiders** → irrelevante (captura manual na máquina do dev)
- **Porta CDP do Electron** → irrelevante (abordagem descartada)

## 8. Pendências

- **Captura manual dos 22 screenshots** listados no checklist
  (`docs/wiki/images/README.md`) — as páginas da wiki referenciam esses PNGs,
  que foram removidos com a automação. Executar antes do release 0.10.0.
- **Sincronização da wiki** (PRD-22): o workflow copia `docs/wiki/images/`
  para o repositório wiki no push/merge da branch — automático, sem ação manual.
