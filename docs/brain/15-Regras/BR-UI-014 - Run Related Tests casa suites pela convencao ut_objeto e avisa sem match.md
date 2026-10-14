---
id: BR-UI-014
aliases: [BR-UI-014]
tipo: regra
titulo: Run Related Tests casa suites pela convencao ut_objeto e avisa sem match
dominio: ui
status: ativo
severidade: baixa
fonte: codigo
verificado: 2026-10-14
implementacao: ["src/matching.ts", "src/commands/run.ts"]
testes: ["src/test/unit/matching.test.ts", "src/test/unit/runRelated.test.ts", "src/test/integration/v016-features.test.ts"]
prds: ["PRD-58"]
requisitos: ["PRD-58/RF1", "PRD-58/RF2", "PRD-58/RF3", "PRD-58/RNF1"]
tags: ["ui", "comandos"]
---

# BR-UI-014 — Run Related Tests casa suites pela convenção `ut_<objeto>` e avisa sem match

## Enunciado

O comando `utplsql.runRelated` (paleta, menu de contexto do editor/Explorer e
`Ctrl+Shift+U Shift+R`) executa as suites relacionadas ao **arquivo de produção
ativo**, pela convenção utPLSQL: candidatos `ut_<base>` e `<base>` (a extensão
`.pks`/`.pkb`/`.sql`/`.prc`/`.fnc`/`.trg` é ignorada), **case-insensitive**,
casando por igualdade ou por **sufixo** no nome do pacote — assim um prefixo de
projeto (`ut_sales_app_pkg`) ainda casa `app_pkg.pkb`. Sem correspondência — ou
sem editor ativo — o comando **avisa** e não executa nada. A cobertura segue o
modo global vigente (mesma regra dos demais comandos de execução).

## Pré-condições

Conexão resolvida e árvore de testes descoberta (`collectAllItems`).

## Exceções

Um nome de arquivo sem base (`/root/.pkb`) não casa nada. Metas que não são
suites (`kind !== 'suite'`) são ignoradas — um teste homônimo não executa a
suíte. O mapeamento por **cobertura** (qual teste cobre qual linha) é follow-up
declarado nos não-objetivos da PRD-58.

## Justificativa

Editar a produção e ter que localizar a suite correspondente é atrito diário; a
convenção `ut_<objeto>` é o padrão utPLSQL e cobre a maioria dos casos sem
análise semântica. Casamento por sufixo evita exigir que o projeto siga o prefixo
exato, e o aviso no caso zero evita a sensação de "nada aconteceu".

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-58-run-related-tests|PRD-58]]
- 🎯 Requisitos: [[prd-58-run-related-tests|PRD-58 RF1]] · [[prd-58-run-related-tests|PRD-58 RF2]] · [[prd-58-run-related-tests|PRD-58 RF3]] · [[prd-58-run-related-tests|PRD-58 RNF1]]
- 🧩 Código: [[COD - matching.ts]] · [[COD - run.ts]]
- 🧪 Testes: [[TST - matching.test.ts]] · [[TST - runRelated.test.ts]] · [[TST - v016-features.test.ts]]
- ↩️ Referenciada por: [[Editor-integration]] · [[prd-58-run-related-tests|PRD-58]]
<!-- brain:auto:end -->
