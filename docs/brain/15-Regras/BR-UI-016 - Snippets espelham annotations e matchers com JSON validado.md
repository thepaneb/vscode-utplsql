---
id: BR-UI-016
aliases: [BR-UI-016]
tipo: regra
titulo: Snippets espelham annotations e matchers com JSON validado
dominio: ui
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-20
implementacao: ["snippets/utplsql.code-snippets:1", "package.json:884"]
testes: ["src/test/unit/snippets.test.ts"]
prds: ["PRD-105"]
requisitos: ["PRD-105/RF1", "PRD-105/RF2", "PRD-105/RF3", "PRD-105/RNF1", "PRD-105/RNF2"]
tags: ["ui", "snippets"]
---
## Enunciado

A biblioteca `snippets/utplsql.code-snippets` espelha as annotations que o parser
interpreta (`%suite`, `%suitepath`, `%test`, `%context`, lifecycle, `%name`,
`%disabled`, `%tags`, `%rollback`, `%throws`, `%displayname`) e os principais
matchers de `ut.expect`, além de `ut.fail`. O JSON é registrado em
`contributes.snippets` para `sql` e `plsql` e é validado no CI por
`src/test/unit/snippets.test.ts` (prefixos obrigatórios, `body` não vazio,
prefixos únicos, matchers do RF2 e ordem do `ut-nls-cursor`). Não registrar para
`oracle-sql`: o VS Code emite warning para language IDs que nenhuma extensão
instalada contribui; a descoberta/CodeLens continuam aceitando esse ID.

## Pré-condições

Documento com language ID `sql` ou `plsql`; o usuário digita um prefixo `ut-`.

## Exceções

- As descrições dos snippets ficam em inglês (padrão do VS Code); não são
  traduzidas.
- `contributes.snippets` cobre só linguagens que a extensão ou o VS Code
  contribuem (`sql`, `plsql`); `oracle-sql` fica para a identidade de
  descoberta/CodeLens.
- Não há snippets de PL/SQL genérico fora do escopo utPLSQL.
- O snippet `ut-nls-cursor` exige `ut.set_nls` ativo até o `to_equal` e
  `ut.reset_nls` depois; inverter a ordem reintroduz `ORA-01861`.

## Justificativa

Escrever um spec utPLSQL à mão exige decorar annotations e matchers; a biblioteca
reduz erros e o teste unitário impede que um prefixo/matcher inexistente ou um
JSON inválido chegue ao Marketplace.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-105-snippets|PRD-105]]
- 🎯 Requisitos: [[prd-105-snippets|PRD-105 RF1]] · [[prd-105-snippets|PRD-105 RF2]] · [[prd-105-snippets|PRD-105 RF3]] · [[prd-105-snippets|PRD-105 RNF1]] · [[prd-105-snippets|PRD-105 RNF2]]
- 🧩 Código: [[COD - utplsql.code-snippets]] · [[COD - package.json]]
- 🧪 Testes: [[TST - snippets.test.ts]]
- ↩️ Referenciada por: [[05-ux-components]] · [[Editor-integration]] · [[prd-105-snippets|PRD-105]]
<!-- brain:auto:end -->
