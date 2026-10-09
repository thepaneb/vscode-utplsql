---
tipo: prd
id: PRD-105
aliases: [PRD-105]
status: proposed
titulo: "Snippets utPLSQL: biblioteca de annotations e matchers"
versao: "0.18.0"
data: "2026-10-09"
autor: "Gil Cleber Barboza"
versao_titulo: "0.18.0 — UX de editor e cobertura"
verificado: 2026-10-09
regras: []
tags: [prd]
---

# PRD-105 — Snippets utPLSQL: biblioteca de annotations e matchers

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.18.0 |
| Arquivos afetados | `snippets/utplsql.code-snippets` (novo), `package.json`, `docs/brain/**` |
| Esforço estimado | 1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-42 (`suiteParser`/annotations), PRD-100 (geração) |

## 1. Resumo

Adicionar uma **biblioteca de snippets** utPLSQL para `.pks`/`.pkb`/`.sql`:
annotations (`--%suite`, `--%suitepath`, `--%test`, `--%context`, `%beforeall`
… `%aftertest`, `%tags`, `%throws`, `%rollback`, `%displayname`, `%name`) e os
matchers de `ut.expect`. Hoje **não temos snippets** (pasta `snippets/`
inexistente).

## 2. Contexto e problema

- Escrever um spec utPLSQL à mão exige decorar annotations e matchers.
- O `suiteParser` já conhece todas as annotations (PRD-42/PRD-55), então a
  definição dos snippets pode espelhar o que a extensão interpreta.
- Referência de porte: `paddi35/snippets/utplsql.code-snippets` (36 snippets,
  verificados contra instância real; inclui `ut.set_nls` para datas).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Snippets para todas as annotations documentadas e os principais matchers.
- Registrados para as linguagens `sql` e `plsql`.
- Um snippet verificado de `ut.set_nls`/`ut.reset_nls` para comparação de `DATE`.

**Não-objetivos**
- Snippets para PL/SQL genérico (fora do escopo utPLSQL).
- Traduzir o texto dos snippets (prefixos/descrições em inglês, como no VS Code).

## 4. Requisitos

### RF1 — Cobertura de annotations

- `%suite` (com bloco `%suitepath`), `%suitepath`, `%test` (com `%throws`/
  `%tags`/`%displayname`), `%context`/`%endcontext`, `%beforeall`/`%afterall`,
  `%beforeeach`/`%aftereach`, `%beforetest`/`%aftertest`, `%disabled`,
  `%rollback`, `%name`.

### RF2 — Matchers

- `ut.expect` com `to_be_not_null`, `to_be_true`/`to_be_false`, `to_be_between`,
  família `to_be_greater/less_than[_or_equal]`, `to_match`, `to_be_like`,
  `to_contain`, `to_have_count`, cursor `to_equal` (include/exclude/unordered),
  JSON `to_equal`, `ut.fail`.

### RF3 — NLS verificado

- Snippet `ut-nls-cursor` com a sequência correta (`ut.set_nls` ativo até o
  `to_equal`; `ut.reset_nls` depois) — evita `ORA-01861` (ver ERR-012).

**Não-funcionais**
- RNF1 — Snippet inválido não deve existir: validar o JSON no CI.
- RNF2 — Sem dependências novas.

## 5. Solução proposta

- `snippets/utplsql.code-snippets` (JSON padrão do VS Code).
- `package.json` → `contributes.snippets` para `sql` e `plsql`.
- Teste unitário que lê o JSON e confere prefixos/placeholders obrigatórios.

## 6. Configuração

`contributes.snippets` (nenhuma setting do usuário).

## 7. Plano de testes

- **Unitários**: `snippets.test.ts` valida o JSON (schema, prefixos, `body` não
  vazio) e que todo matcher listado no RF2 existe.
- **Integração** (opcional): compilar os corpos gerados em um banco de fixture.
- **Manual**: digitar `ut-suite`/`ut-test`/`ut-expect` no editor.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Snippet com nome de matcher inexistente | Teste unitário + revisão contra `ut_expectation` |
| Duplicar o que a PRD-100 gera | Snippets são manuais; PRD-100 gera arquivos |
| Colisão de prefixo com outros snippets | Prefixos `ut-` explícitos |

## 9. Rollout

- **0.18.0** (UX de editor e cobertura).
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Todos os snippets do RF1/RF2 presentes e válidos no CI.
- Snippets aparecem em `.pks`/`.pkb`/`.sql` (linguagens `plsql`/`sql`).
- `npm test`/`lint` verdes.

## 11. Questões em aberto

- Registrar também para `oracle-sql` (ver PRD-109)?
- Incluir um snippet de pacote inteiro (`%suite` + `%test`)?

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-UI-*` ("snippets espelham as annotations que o
parser interpreta; o JSON é validado no CI"), com `prds: ["PRD-105"]`,
`implementacao:` e `testes:`. Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-42-suiteparser-annotations|PRD-42]] · [[prd-55-tag-organization|PRD-55]] · [[prd-100-generate-test-suite|PRD-100]] · [[prd-109-language-identity|PRD-109]]
- 🔗 Mesma versão (0.18.0): [[prd-108-coverage-html-report|PRD-108]] · [[prd-109-language-identity|PRD-109]]
- 🚀 ⬅️ release anterior: [[prd-100-generate-test-suite|PRD-100 (0.17.0)]] · ➡️ próxima release: [[prd-101-connection-pool-lifecycle|PRD-101 (0.19.0)]]
<!-- brain:auto:end -->
