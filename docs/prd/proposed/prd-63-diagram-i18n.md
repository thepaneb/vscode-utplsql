# PRD: Diagramas i18n para READMEs

## Status

Proposto

## Resumo

Criar variantes traduzidas dos 3 diagramas usados nos READMEs para cada um dos 24 idiomas suportados, e atualizar as referências nos READMEs e wiki pages.

## Motivação

Os diagramas de arquitetura, streaming e CLI estão traduzidos para inglês mas todos os 24 READMEs apontam para o mesmo PNG. Cada README deveria mostrar um diagrama no idioma do leitor.

## Escopo

- **3 diagramas**: `diagram-arquitetura`, `diagram-streaming`, `diagram-cli`
- **24 idiomas**: en, pt-BR, es, fr, de, it, ja, ko, zh-CN, zh-TW, ru, uk, pl, cs, hu, bg, el, id, ro, sr, th, vi, en-GB
- **Resultado**: 69 SVGs + 69 PNGs + 24 READMEs + 2 wiki pages atualizados

## Textos traduzíveis por diagrama

### diagram-arquitetura (~16 strings)

| Chave | EN (base) |
|---|---|
| `title` | Execution architecture — two modes |
| `subtitle` | Test Explorer · CodeLens · Context menu · Shortcuts |
| `cliFallback` | cli (or fallback) |
| `oracleModeTitle` | Direct Oracle mode — streaming |
| `blocking` | ut_runner.run(...) — blocking |
| `pollBuffer` | poll 200ms from buffer |
| `coverage` | + coverage |
| `realTimeResults` | Real-time results |
| `cliModeTitle` | CLI mode — batch |
| `standardReporters` | 3 standard reporters |
| `tempFile` | temp file |
| `testView` | test view |
| `realTime` | real-time |
| `testTerminal` | test terminal |
| `resultsAfterBatch` | results after batch |
| `footerNote` | Results appear in the test view only after the batch finishes — temporary files in %TEMP%. |

### diagram-streaming (~15 strings)

| Chave | EN (base) |
|---|---|
| `title` | Direct Oracle — real-time streaming |
| `pollEvery` | poll every 200ms |
| `readLoop` | read loop |
| `untilRunnerFinishes` | until runner finishes |
| `cancel` | cancel |
| `executesTests` | ut_runner.run executes tests |
| `reportersWriteTo` | reporters write to |
| `rowsDescription` | rows: text (doc) + XML (JUnit/coverage) |
| `isFinishedMarksEnd` | is_finished marks end |
| `realTimeOutput` | Real-time output |
| `eachTestAppearsIn` | each test appears in |
| `testExplorerWhenFinished` | Test Explorer when finished |
| `finalConsolidation` | Final consolidation |
| `accumulatedXml` | accumulated XML → parseJUnit |
| `coverageTab` | + Coverage tab |
| `footerNote` | No temporary files — results arrive as each test finishes. |

### diagram-cli (~9 strings)

| Chave | EN (base) |
|---|---|
| `title` | CLI mode — batch (runnerMode: cli) |
| `contextMenu` | context menu |
| `standardReporters` | 3 standard reporters |
| `tempFile` | temp file |
| `testView` | test view |
| `guttersCoverage` | gutters + % Coverage |
| `realTime` | real-time |
| `testTerminal` | test terminal |
| `footerNote` | Results appear in the test view only after the batch finishes — temporary files in %TEMP%. |

## Estrutura de arquivos

```
docs/wiki/images/
├── diagram-arquitetura.en.svg          (base renomeada)
├── diagram-arquitetura.en.png
├── diagram-arquitetura.pt-BR.svg       (novo)
├── diagram-arquitetura.pt-BR.png
├── ... (24 variantes por diagrama)
├── diagram-streaming.en.svg
├── diagram-streaming.en.png
├── diagram-streaming.pt-BR.svg
├── diagram-streaming.pt-BR.png
├── ...
├── diagram-cli.en.svg
├── diagram-cli.en.png
├── diagram-cli.pt-BR.svg
├── diagram-cli.pt-BR.png
├── ...
├── i18n/
│   ├── diagram-arquitetura.json
│   ├── diagram-streaming.json
│   └── diagram-cli.json
```

## Passos de implementação

### 1. Criar JSONs de tradução

Arquivos `docs/wiki/images/i18n/diagram-{name}.json` com estrutura:

```json
{
  "en": { "title": "Execution architecture — two modes", ... },
  "pt-BR": { "title": "Arquitetura de execução — dois modos", ... },
  "de": { "title": "Ausführungsarchitektur — zwei Modi", ... },
  ...
}
```

### 2. Criar script `scripts/gen-diagram-i18n.cjs`

- Lê o SVG base (em inglês)
- Para cada idioma no JSON, substitui cada string traduzida no SVG
- Salva como `diagram-{name}.{locale}.svg`
- Renderiza para PNG via `@resvg/resvg-js`
- Loga strings faltantes em qualquer idioma

### 3. Renomear SVGs/PNGs existentes para `.en.` (base)

- `diagram-arquitetura.svg` → `diagram-arquitetura.en.svg`
- `diagram-arquitetura.png` → `diagram-arquitetura.en.png`
- Idem para streaming e cli

### 4. Integrar no build

- `scripts/gen-diagrams.cjs`: adicionar chamada ao `gen-diagram-i18n.cjs`
- `package.json`: adicionar script `gen-diagram:i18n`

### 5. Gerar variantes

Rodar `npm run gen-diagram:i18n` → 69 SVGs + 69 PNGs

### 6. Atualizar 24 READMEs

Cada `README.{locale}.md` aponta para `diagram-{name}.{locale}.png`:

| README | Locale | Diagramas |
|---|---|---|
| `README.md` | en | `diagram-arquitetura.en.png`, `diagram-streaming.en.png`, `diagram-cli.en.png` |
| `README.pt-BR.md` | pt-BR | `diagram-arquitetura.pt-BR.png`, `diagram-streaming.pt-BR.png`, `diagram-cli.pt-BR.png` |
| `README.de.md` | de | `diagram-arquitetura.de.png`, `diagram-streaming.de.png`, `diagram-cli.de.png` |
| ... | ... | ... |

### 7. Atualizar 2 wiki pages

- `docs/wiki/Arquitetura.md`: refs → `diagram-arquitetura.pt-BR.png` e `diagram-cli.pt-BR.png`
- `docs/wiki/Execução-Oracle-direta.md`: ref → `diagram-streaming.pt-BR.png`

### 8. Atualizar catálogo

`docs/wiki/images/README.md`: adicionar variantes na tabela de diagramas

### 9. Atualizar AGENTS.md

Documentar o sistema de diagramas i18n

### 10. Verificar

`npm run gen-diagram` confirma geração OK

## Notas

- Strings técnicas Oracle (`UT_OUTPUT_BUFFER_TMP`, `parseJUnit`, `conn1 (pool)`, etc.) **não são traduzidas**
- Strings duplicadas no mesmo SVG (`tempFile` ×3 em arquitetura) usam a mesma chave de tradução
- Wiki pages que referenciam diagramas fora do escopo (conexao, diagnosticos, schemas, i18n, debugger) permanecem inalteradas
- O script deve logar warnings quando uma tradução estiver faltando em qualquer idioma
