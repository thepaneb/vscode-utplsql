<!-- GENERATED FROM docs/brain/20-PRDs/prd-108-coverage-html-report.md — DO NOT EDIT -->

# PRD-108 — Relatório HTML de cobertura aberto no navegador

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.17.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/coverage.ts`, `src/extension.ts`, `src/config.ts`, `package.json`, `docs/brain/**` |
| Esforço estimado | 1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-12/PRD-35 (cobertura), PRD-79 (escopo), ERR-005 |

## 1. Resumo

Oferecer, ao fim de uma execução com cobertura, o **relatório HTML** do utPLSQL
(`ut_coverage_html_reporter`) gravado em arquivo temporário e aberto **no
navegador** (ou "Salvar como…"), via notificação — sem renderizar em webview.
Hoje só temos o painel nativo + Cobertura.

## 2. Contexto e problema

- O painel nativo de cobertura do VS Code consome o reporter Sonar; não há uma
  visão HTML portátil para compartilhar.
- `utplsql.additionalReporters` já aceita `ut_coverage_html_reporter`, mas o
  arquivo resultante não é oferecido ao usuário.
- Renderizar HTML montado pelo banco em webview é risco de XSS; abrir no
  navegador (com o arquivo em disco) evita isso.
- Referência de porte: setting `utplsql.coverage.htmlReport` do
  `paddi35/utplsql-for-vscode` e a correção `fix/13-coverage-webview-csp`
  (não segurar o `TestRun` numa notificação).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Setting `utplsql.coverage.htmlReport` (default `false`).
- Ao ligar, rodar o reporter HTML e **não bloquear** o fim do run.
- Notificação com **Abrir no navegador** / **Salvar como…**.

**Não-objetivos**
- Substituir o painel nativo de cobertura.
- Renderizar o HTML dentro do VS Code.

## 4. Requisitos

### RF1 — Reporter HTML

- Com o setting ligado e cobertura habilitada, incluir
  `ut_coverage_html_reporter` no run e capturar o arquivo gerado.

### RF2 — Não bloquear o TestRun

- A notificação e o `openExternal`/save dialog são **fire-and-forget**; o
  `run.end()` acontece imediatamente (evita o spinner preso — ref. `fix/13`).

### RF3 — Ações da notificação

- "Abrir no navegador" (arquivo temp) e "Salvar como…" (destino escolhido).
- Cancelamento do run descarta o HTML parcial.

### RF4 — Segurança

- Nunca renderizar em webview; não logar conteúdo; limpar o temp.

**Não-funcionais**
- RNF1 — Sem novas dependências; sem regressão quando o setting está off.
- RNF2 — Compatível com `additionalReporters` existentes (sem duplicar reporter).

## 5. Solução proposta

- `src/oracleRunner.ts`: adicionar o reporter HTML ao conjunto quando o setting
  estiver ligado; devolver o caminho do arquivo.
- `src/coverage.ts`/`src/extension.ts`: oferecer o arquivo após o run
  (notificação) sem `await` no caminho do `run.end()`.

## 6. Configuração

- `utplsql.coverage.htmlReport` (boolean, default `false`).

## 7. Plano de testes

- **Unitários**: montagem da lista de reporters com/sem o HTML habilitado.
- **Integração**: com o setting ligado, o arquivo HTML existe e o run termina
  sem esperar a notificação.
- **Manual**: rodar cobertura → notificação → abrir no navegador / salvar como.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Spinner do Test Explorer preso | Fire-and-forget (ref. `fix/13`) |
| Duplicar reporter de cobertura | Dedup com `additionalReporters` |
| XSS no HTML do banco | Abrir no navegador, nunca webview |

## 9. Rollout

- **0.17.0** (UX de editor e cobertura).
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Com o setting on, HTML gerado e oferecido; run termina imediatamente.
- Com o setting off, nenhuma mudança de comportamento.
- Nenhum HTML renderizado em webview; `npm test`/`lint` verdes.

## 11. Questões em aberto

- Guardar o HTML em `test-results/`/workspace ou em pasta temp do SO?
- Oferecer "Salvar como…" sempre ou só quando o navegador não abrir?

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-COB-*` ("relatório HTML de cobertura abre no
navegador e não segura o TestRun"), com `prds: ["PRD-108"]`, `implementacao:` e
`testes:`. Enquanto `proposed`, `regras: []`.
