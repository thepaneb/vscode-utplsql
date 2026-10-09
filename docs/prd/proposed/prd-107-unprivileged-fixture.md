<!-- GENERATED FROM docs/brain/20-PRDs/prd-107-unprivileged-fixture.md — DO NOT EDIT -->

# PRD-107 — Fixture de integração endurecido: usuário sem privilégios e fallbacks

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Testes de integração (banco real) |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `src/test/integration/fixtures/setup.sh`, `src/test/integration/support/**`, `src/test/integration/*.test.ts`, `docs/brain/**` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-101 (ciclo de sessão), ERR-008, ERR-009, ERR-005 |

## 1. Resumo

Endurecer a fixture de integração para incluir um **usuário sem privilégios**
(só `CREATE SESSION`, com grants mínimos e controlados) e usar esse usuário para
testar os **caminhos degradados** por falta de privilégio e a **observação de
sessões** de fora. Hoje o schema de teste tem privilégios amplos.

## 2. Contexto e problema

- Testes de ciclo de sessão (PRD-101) e de permissão precisam de um observador
  que **veja sessões de fora** (`v$session`) e de um ator **sem** privilégios
  para exercitar os fallbacks.
- O `setup.sh` cria `utplsql_test` com privilégios amplos; não há um segundo
  usuário restrito.
- Nosso `discovery` usa `ALL_OBJECTS`/`ALL_SOURCE` com **fallback silencioso**
  (ERR-008) e a cobertura de views trata `V$SQL` negado (ERR-009) — esses
  caminhos não são exercitados hoje.
- Referência de porte: fixture com usuário `CREATE SESSION`-only +
  grants em `v$session`/`dba_*` do `paddi35/utplsql-for-vscode`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Provisionar um 2º usuário restrito, configurável por env.
- Testar observação externa de sessões (apoio à PRD-101).
- Exercitar os fallbacks por privilégio ausente.
- Pular (skip) os testes que dependem dele quando não existir.

**Não-objetivos**
- Substituir o(s) schema(s) de teste atuais.
- Testar privilégios de DDL do próprio utPLSQL.

## 4. Requisitos

### RF1 — Usuário restrito

- `setup.sh` cria `UTPLSQL_IT_UNPRIV_USER` (default `utplsql_unpriv`) com
  `CREATE SESSION` e nada mais; overrides por env.

### RF2 — Observação de sessões

- Grants que permitam ao usuário de teste **ler `v$session`** (via um
  observador), para asserções de que uma sessão não sobrevive ao run.

### RF3 — Fallbacks de privilégio

- Casos de integração que: (a) rodam discovery quando `ALL_SOURCE` é inacessível
  (ERR-008); (b) cobrem views quando `V$SQL` é negado (ERR-009); (c) cobertura
  sem grants (ERR-005) degrada sem abortar.

### RF4 — Skip limpo

- Testes que exigem o usuário restrito fazem `skip` autoexplicativo quando ele
  não está provisionado (não falham).

**Não-funcionais**
- RNF1 — Compatível com a matriz Oracle (PRD-72) e com `.env`/`UTPLSQL_CONN`.
- RNF2 — Sem novas dependências.

## 5. Solução proposta

- Estender `fixtures/setup.sh` e `support/` com o 2º usuário e helpers
  (`withUnprivUser`), reusando o padrão de `describeDB`.

## 6. Configuração

Env de teste (não são settings da extensão): `UTPLSQL_IT_UNPRIV_USER`,
`UTPLSQL_IT_UNPRIV_PASSWORD`.

## 7. Plano de testes

- **Integração**: sessão some após o run; discovery sobrevive sem `ALL_SOURCE`;
  cobertura degrada sem grants; `V$SQL` negado não quebra.
- **Manual**: rodar `setup.sh` e a suíte em um banco limpo.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Grants amplos demais por engano | Conceder o mínimo; documentar cada grant |
| Teste frágil entre versões Oracle | Gated por capability/`skip` |
| Poluir o banco de teste | Usuário dedicado e recriável |

## 9. Rollout

- **0.19.0** (Observabilidade e desempenho); habilita os testes da PRD-101.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- `setup.sh` provisiona o usuário restrito; suíte faz skip sem ele.
- Os 3 fallbacks de privilégio têm caso de integração.
- Asserção de sessão pós-run da PRD-101 passa usando o observador.

## 11. Questões em aberto

- Um observador dedicado ou o grant em `v$session` no schema de teste?
- Cobrir também `dba_objects` vs `all_objects` (nosso discovery hoje é só `ALL_`)?

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-TEST-*` ("testes de privilégio/sessão usam
usuário restrito e fazem skip quando ausente"), com `prds: ["PRD-107"]`,
`implementacao:` e `testes:`. Enquanto `proposed`, `regras: []`.
