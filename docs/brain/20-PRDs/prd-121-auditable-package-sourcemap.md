---
tipo: prd
id: PRD-121
aliases: [PRD-121]
status: proposed
titulo: "Pacote auditável: source map do bundle no VSIX"
versao: "0.23.0"
data: "2026-10-13"
autor: "Gil Cleber Barboza"
versao_titulo: "0.23.0 — Runtime, docs e qualidade residual"
verificado: 2026-10-13
regras: []
tags: [prd]
---

# PRD-121 — Pacote auditável: source map do bundle no VSIX

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-13 |
| Componente | Empacotamento (`esbuild` + VSIX) |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `.vscodeignore`, `esbuild.config.mjs`, `src/test/unit/vsixIgnore.test.ts`, `docs/brain/30-Decisoes/ADR-004 - Bundling com esbuild e higiene do pacote VSIX.md`, `docs/brain/15-Regras/BR-PKG-001 - …md`, `CHANGELOG.md` |
| Esforço estimado | 0,5 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-45 (bundling esbuild), PRD-83 (higiene do VSIX), ADR-004, BR-PKG-001, TPL-ESBUILD |

## 1. Resumo

O `esbuild.config.mjs` gera `dist/extension.js` **com `sourcemap: true`**, mas o
`.vscodeignore` contém `**/*.map` — o mapa é produzido e **jogado fora**. O
resultado é um pacote **opaco para auditoria**: a única coisa com lógica que vai no
VSIX é um bundle de ~820 KB, e o módulo de AST do **VSCan** nem consegue analisá-lo
(`FILE-TOO-LARGE` / `filesErrored: 1`). Esta PRD passa a **publicar
`dist/extension.js.map`** junto do bundle (mantendo fora todos os outros `.map`),
torna o pacote autoexplicativo e revisa o ADR-004.

## 2. Contexto e problema

No relatório do VSCan (VSIX 0.15.0), o módulo `consolidatedAst` terminou em
`completed_with_errors` com uma única constatação:

```text
FILE-TOO-LARGE — File exceeds 0.1MB limit — extension/dist/extension.js
```

Ou seja: a análise estática do pacote **não cobriu nada**. O que existe no VSIX é
o bundle; sem o mapa, nem um auditor humano nem uma ferramenta conseguem ligar um
stack trace de produção (`dist/extension.js:1234`) ao arquivo `.ts` de origem.

Hoje: `esbuild` gera `dist/extension.js.map` (1,35 MB, commitável/ignorado no
git), mas `.vscodeignore` tem `**/*.map`, então o `.vsix` sai **sem** o mapa. A
exclusão nasceu para barrar `.map` de `out/`, de `node_modules` e de testes — não
para o mapa do próprio bundle.

Contexto decisivo: o código-fonte **já é público** (MIT, repositório no GitHub) —
o famoso argumento “não divulgar o source” **não se aplica** aqui. Manter o mapa
fora só esconde a origem de quem audita, sem proteger nada.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Publicar `dist/extension.js.map` no VSIX, de forma que o bundle publicado seja
  **resolvível** (stack traces, depuração e revisão externa).
- Continuar barrando todo outro `.map` (`out/**`, testes, `node_modules`).
- Travar isso em teste (essencial × proibido) para não reverter por acidente.
- Registrar a decisão no ADR-004 e revisar `BR-PKG-001`.

**Não-objetivos**
- Desminificar o bundle ou publicar o `src/**` (a PRD-83 o mantém fora).
- Alterar alvo/plataforma do esbuild.
- “Melhorar a nota” de um scanner específico: a meta é **auditabilidade**, não um
  número (o parser do VSCan continua limitado por tamanho, independentemente do mapa).
- Distribuir `out/**` (compilado intermediário).

## 4. Requisitos

### RF1 — O mapa do bundle acompanha o pacote

- `.vscodeignore` deixa de excluir `dist/extension.js.map` (ex.: trocar `**/*.map`
  por exceção explícita ou por regras que não alcancem `dist/`).
- `dist/extension.js` mantém o comentário `//# sourceMappingURL=extension.js.map`.

### RF2 — Todo outro `.map` segue fora

- `out/**/*.map` e demais `.map` continuam excluídos e **verificados** por teste.

### RF3 — Trava de higiene ampliada

- `src/test/unit/vsixIgnore.test.ts`:
  - `dist/extension.js.map` entra na lista de **essenciais** (não pode ser ignorado);
  - um `.map` qualquer fora de `dist/` entra na lista de **proibidos** (ex.:
    `out/extension.js.map`).

### RF4 — Decisão registrada

- `ADR-004` ganha a consequência explícita (“o bundle publicado acompanha o source
  map; os demais `.map` ficam fora”), coerente com a higiene da PRD-83.
- `BR-PKG-001` (ou regra nova) menciona o mapa como parte do pacote.

### RF5 — Verificação de que o mapa resolve

- Instalar o `.vsix` gerado e confirmar que um *throw* no runtime mostra a posição
  no `.ts` (source map aplicado), ou validar programaticamente que
  `dist/extension.js.map` resolve o bundle (ex.: `trace-mapping`/`source-map`).

**Não-funcionais**
- RNF1 — VSIX continua abaixo de **3 MB** (o mapa soma ~1,35 MB ao pacote).
- RNF2 — Nenhum `.map` de teste/`out` empacotado (`npm run package` + `vsce ls`).
- RNF3 — Sem impacto em tempo de ativação/publicação.

## 5. Solução proposta

Sugestão de `.vscodeignore` (substituindo a linha `**/*.map`):

```gitignore
**/*.map
!dist/extension.js.map
```

ou, mais explícito (evita depender de precedência de `!`):

```gitignore
out/**/*.map
node_modules/**/*.map
src/**/*.map
```

O `esbuild` já emite `//# sourceMappingURL=extension.js.map`; nada muda no build.
O trabalho real é a **trava** (RF3) e o **registro** (RF4) — foi exatamente uma
regra de exclusão “cega” que criou o problema.

## 6. Configuração

Nenhuma setting da extensão.

## 7. Plano de testes

- **Unitários**: `vsixIgnore.test.ts` — `dist/extension.js.map` essencial e
  `out/*.js.map` proibido (o teste já cobre a família `.vscode-test*` desde a
  correção de higiene de 13/10).
- **Empacotamento**: `npm run package` → `unzip -l` mostra `dist/extension.js.map`;
  `npm exec -- vsce ls` não lista nenhum outro `.map`.
- **Validação manual**: instalar o VSIX; provocar erro e checar o mapeamento
  (DevTools/stack trace com o `.ts`).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Divulgar código interno | Código é público (MIT); o mapa não revela nada que o GitHub já não tenha |
| VSIX maior | +~1,35 MB; RNF1 mantém < 3 MB e o ganho de auditabilidade justifica |
| Vazar `.map` de testes por engano | RF2/RF3: teste trava os proibidos |
| Reverter por “higiene cega” | RF4 registra a intenção no ADR — o comentário explica o “porquê” |
| Supor que o VSCan passará a analisar o bundle | Não é objetivo; a meta é auditoria humana/tooling de stack trace |

## 9. Rollout

- **0.23.0** — item residual de empacotamento, sem valor direto ao usuário; pode ser
  antecipado para qualquer versão se houver auditoria externa planejada.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `dist/extension.js.map` presente no `.vsix`; nenhum outro `.map`.
- `vsixIgnore.test.ts` cobre essencial + proibido (verde no CI).
- ADR-004 e `BR-PKG-001` atualizados.
- VSIX < 3 MB e o mapa resolve o bundle (verificação documentada).

## 11. Questões em aberto

- Exceção com `!` (`!dist/extension.js.map`) ou regras por diretório (mais verboso,
  porém sem depender da precedência do `!`)? Confirmar comportamento no `vsce`.
- Publicar também `dist/extension.js` **não minificado**? (Hoje o esbuild não
  minifica; se um dia minificar, o mapa passa a ser ainda mais importante.)
- Vale anexar o mapa como *asset* do release em vez de dentro do VSIX?

## 12. Impacto no cérebro

Na conclusão, ajustar **`BR-PKG-001`** (ou criar `BR-PKG-002`) para dizer que o
pacote publicado é **autoexplicativo**: o bundle vai com o seu source map e nenhum
outro `.map` entra no VSIX. Atualizar `implementacao:` (`.vscodeignore`,
`esbuild.config.mjs`) e `testes:` (`src/test/unit/vsixIgnore.test.ts`); citar no
corpo do `ADR-004` a consequência de auditoria. Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-45-bundle-esbuild|PRD-45]] · [[prd-83-vsix-package-hygiene|PRD-83]]
- 🔗 Mesma versão (0.23.0): [[prd-95-esm-es2023-node22|PRD-95]] · [[prd-97-doc-no-site|PRD-97]] · [[prd-99-brain-reuse|PRD-99]] · [[prd-112-error-handling-audit|PRD-112]] · [[prd-116-direct-module-tests|PRD-116]] · [[prd-117-split-script-property-tests|PRD-117]] · [[prd-122-marketplace-trust-metadata|PRD-122]]
- 🚀 ⬅️ release anterior: [[prd-93-continuous-localization-pipeline|PRD-93 (0.22.0)]]
<!-- brain:auto:end -->
