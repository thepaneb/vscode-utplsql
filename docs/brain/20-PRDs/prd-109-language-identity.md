---
tipo: prd
id: PRD-109
aliases: [PRD-109]
status: completed
titulo: "Identidade de linguagem PL/SQL ampliada e languageIds configuráveis"
versao: "0.17.0"
data: "2026-10-09"
autor: "Gil Cleber Barboza"
versao_titulo: "0.17.0 — UX de editor e cobertura"
verificado: 2026-10-20
regras: ["BR-PARSE-019", "BR-UI-006"]
tags: [prd]
---

# PRD-109 — Identidade de linguagem PL/SQL ampliada e languageIds configuráveis

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.17.0 |
| Arquivos afetados | `package.json`, `src/config.ts`, `src/discovery.ts`, `src/codelens.ts`, `src/decorations.ts`, `docs/brain/**` |
| Esforço estimado | 1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-24 (CodeLens), PRD-74 (db-first discovery), PRD-43 |

## 1. Resumo

Ampliar a **identidade de linguagem** que a extensão reconhece (mais extensões
de arquivo) e expor `utplsql.discovery.languageIds`, para que arquivos `.pls`,
`.plb`, `.tps`, `.tpb`, `.vw` (e associações via `files.associations`) também
participem de descoberta, CodeLens e decorações.

## 2. Contexto e problema

- Hoje contribuímos a linguagem `plsql` com `.pks/.pkb/.prc/.fnc/.trg`.
- Muitos projetos usam `.pls`, `.plb`, `.tps`, `.tpb`, `.vw`; e `files.associations`
  pode mapear extensões próprias para `sql`/`oracle-sql`.
- O CodeLens é registrado por **glob** (`**/*.pks`) justamente porque `.pks` não
  tinha language ID (PRD-24); com uma identidade melhor, a cobertura fica mais
  consistente.
- Referência de porte: linguagem `oracle-sql` + `utplsql.discovery.languageIds`
  do `paddi35/utplsql-for-vscode`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Contribuir as extensões adicionais de PL/SQL.
- Setting `utplsql.discovery.languageIds` (default sensato).
- Discovery/CodeLens/decorações respeitam o setting e `files.associations`.

**Não-objetivos**
- Fornecer grammar/syntax highlighting completo (isso é de outra extensão).
- Mudar o parser de annotations (PRD-42).

## 4. Requisitos

### RF1 — Extensões

- Adicionar `.pls .plb .tps .tpb .vw` (e manter as atuais) à contribuição de
  linguagem.

### RF2 — `languageIds`

- `utplsql.discovery.languageIds` (array), default incluindo `plsql` e `sql`;
  discovery filtra candidatos por esse conjunto.

### RF3 — `files.associations`

- Respeitar associações do usuário para extensões não contribuídas, de modo que
  um `.foo` mapeado para `sql` seja descoberto.

### RF4 — Consistência de UI

- CodeLens/decorações continuam funcionando por glob **e** por language ID, sem
  duplicar.

**Não-funcionais**
- RNF1 — Sem novas dependências; sem regressão de performance na descoberta.
- RNF2 — Multi-root permanece correto (PRD-57).

## 5. Solução proposta

- `package.json`: `contributes.languages` (extensões + aliases) e o setting.
- `src/config.ts`: ler `discovery.languageIds`.
- `src/discovery.ts`: usar o conjunto efetivo (setting + `files.associations`).

## 6. Configuração

- `utplsql.discovery.languageIds` (string[]).

## 7. Plano de testes

- **Unitários**: seleção de candidatos por language ID e por associação.
- **Integração**: um `.pls`/`.tps` é descoberto e recebe CodeLens.
- **Manual**: arquivo com extensão custom associada a `sql` no
  `.vscode/settings.json` aparece na árvore.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Colisão com a linguagem de outra extensão | Aliases claros; setting para desligar |
| Duplicar CodeLens (glob + language) | Registrar por um critério único/curto-circuito |
| Extensões adicionais trazerem lixo | Limitar a lista curada |

## 9. Rollout

- **0.17.0** (UX de editor e cobertura).
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `.pls/.plb/.tps/.tpb/.vw` reconhecidos; `languageIds` respeitado.
- `files.associations` para `sql` funciona na descoberta.
- Sem CodeLens duplicado; `npm test`/`lint` verdes.

## 11. Decisões (2026-10-20)

- Mantido o id contribuído **`plsql`** (sem quebrar usuários/CodeLens existentes);
  `oracle-sql` é aceito como language ID de terceiros.
- Default de `utplsql.discovery.languageIds`: **`["plsql", "sql", "oracle-sql"]`**.
  As extensões de cada ID são resolvidas dinamicamente em `vscode.extensions.all`
  + `files.associations`; quem quiser evitar a varredura de `.sql` restringe para
  `["plsql"]`.

## 12. Impacto no cérebro

**Concluída em 2026-10-20 (0.17.0).**

- Criada **[[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]]** — descoberta/CodeLens respeitam
  `discovery.languageIds` + `files.associations`, com `.pks` canônico e sem
  CodeLens duplicado. Cobre os RF1–RF4 e as RNF1/RNF2.
- Atualizada **[[BR-UI-006 - CodeLens usa glob canonico e languageIds sem duplicar|BR-UI-006]]** — o CodeLens não é mais registrado apenas em
  `**/*.pks`; usa o seletor efetivo (glob + language IDs) e re-registra quando
  as settings mudam.
- Documentação: `01-test-discovery`, `05-ux-components`, `Editor-integration`,
  `Architecture`, `Configuration`, `FAQ` e `Configuration-examples`.
- Nenhuma RNF ficou sem regra.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]] · [[BR-UI-006 - CodeLens usa glob canonico e languageIds sem duplicar|BR-UI-006]]
- 🔗 PRDs relacionados: [[prd-24-codelens-integration|PRD-24]] · [[prd-42-suiteparser-annotations|PRD-42]] · [[prd-43-schema-db-discovery|PRD-43]] · [[prd-57-multiroot-root-resolution|PRD-57]] · [[prd-74-db-first-discovery|PRD-74]]
- 🔗 Mesma versão (0.17.0): [[prd-105-snippets|PRD-105]] · [[prd-108-coverage-html-report|PRD-108]]
- 🎯 RF1 — Extensões → [[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]]
- 🎯 RF2 — `languageIds` → [[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]]
- 🎯 RF3 — `files.associations` → [[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]]
- 🎯 RF4 — Consistência de UI → [[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]] · [[BR-UI-006 - CodeLens usa glob canonico e languageIds sem duplicar|BR-UI-006]]
- 🎯 RNF1 — Sem novas dependências; sem regressão de performance na descoberta. → [[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]]
- 🎯 RNF2 — Multi-root permanece correto (PRD-57). → [[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]]
- 🚀 ⬅️ release anterior: [[prd-100-generate-test-suite|PRD-100 (0.16.0)]] · ➡️ próxima release: [[prd-98-docs-anti-drift|PRD-98 (0.18.0)]]
<!-- brain:auto:end -->
