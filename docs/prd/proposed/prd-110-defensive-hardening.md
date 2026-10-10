<!-- GENERATED FROM docs/brain/20-PRDs/prd-110-defensive-hardening.md — DO NOT EDIT -->

# PRD-110 — Hardening defensivo: identificador SQL, redaction de logs e scripts de desenvolvimento

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Extensão `paneb.vscode-utplsql` + ferramentas de desenvolvimento (`scripts/`) |
| Versão alvo | 0.18.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/connectionProfiles.ts`, `src/scriptRunner.ts`, `scripts/db-matrix/run.sh`, `scripts/create-pr.cjs`, `SECURITY.md`, `docs/brain/**` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-81 (hardening de conexão), PRD-104 (cadeia de suprimentos do CI) |

## 1. Resumo

Reforço de **defesa em profundidade** na extensão e **higiene** nos scripts de
desenvolvimento, fechando três lacunas apontadas na auditoria de segurança:
(i) o prefixo de schema (`utSchema`) concatenado no SQL não é validado como
identificador; (ii) erros do ciclo de conexão podem ecoar credenciais no log;
(iii) os scripts locais usam `eval`/`execSync` com entrada de linha de comando e
logam a connection com senha. Nenhum item é explorável remotamente hoje, mas
todos quebram invariantes já declarados em `SECURITY.md`.

## 2. Contexto e problema

- **Identificador concatenado.** `src/oracleRunner.ts` interpola `utSchema`
  (obtido de `discoverUtplsqlSchema` → `ALL_SYNONYMS.TABLE_OWNER`) em
  `DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_TMP`,
  `DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_INFO_TMP` e no `SELECT ... FROM
  ${utSchema}UT_OUTPUT_BUFFER_TMP`. Não é entrada de usuário, mas é um
  identificador **não validado** — contraria o invariante "nenhum valor
  concatenado no PL/SQL" do `SECURITY.md` e é um vetor teórico com um banco
  hostil (schema com nome atípico permitido pelo Oracle com aspas).
- **Credencial em log.** `ensurePool`/`withOracleConnection`/`acquireRunnerConnections`
  e outros helpers logam `String(e)`. Erros do `node-oracledb` normalmente não
  incluem a senha, mas uma connect string malformada pode ecoar `user/pass@host`.
  O projeto já tem o helper de mascaramento (`maskConnectionIn`,
  `src/scriptRunner.ts`), hoje restrito a uma mensagem de script.
- **Scripts de dev.** `scripts/db-matrix/run.sh` executa `eval "$TESTS_CMD"`
  (o comando vem do argumento `--tests`) e imprime `UTPLSQL_CONN` **com a senha**;
  `scripts/create-pr.cjs` interpola `origin/${base}` em `execSync`. São scripts
  de mantenedor (excluídos do `.vsix` pelo `.vscodeignore`), mas são execução de
  shell com entrada de CLI e log de segredo.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Validar `utSchema` como identificador Oracle antes de qualquer concatenação.
- Redigir credenciais em **todo** `error`/contexto logado no ciclo de conexão.
- Remover `eval` do `run.sh`, validar `--base`/`--head` no `create-pr.cjs` e
  mascarar `UTPLSQL_CONN` no log do `run.sh`.

**Não-objetivos**
- Refatorar mapeamento de resultados/cobertura ou o protocolo Oracle.
- Substituir `SecretStorage`/settings `machine`-scoped (já cobertos pela PRD-81).
- Cadeia de suprimentos do CI / actions por SHA / Dependabot / `npm audit`
  (escopo da PRD-104).
- Criptografia própria de credenciais.

## 4. Requisitos

### RF1 — Validação do identificador de schema

- Introduzir um helper puro `isValidSchemaPrefix(prefix)` /
  `sanitizeSchemaPrefix(prefix)` que aceita apenas `^[A-Z0-9_$#]+\.$` ou string
  vazia (modo sem prefixo). Valor fora do padrão → tratado como **sem prefixo**,
  com `logger.warn` sanitizado (sem ecoar o valor cru).
- Usar o helper em **todos** os pontos de `oracleRunner.ts` que hoje interpolam
  `utSchema`.
- Nenhum identificador dinâmico pode chegar ao `execute()` sem passar pela
  validação.

### RF2 — Redaction de credenciais nos logs de conexão

- Expor `redactConnection(msg, connection)` (extraído de `maskConnectionIn`) num
  módulo compartilhado (ex.: `connectionProfiles.ts`) e reusá-lo nos call sites
  de conexão.
- Aplicar em `ensurePool`, `withOracleConnection`, `acquireRunnerConnections`,
  `findInvalidUt3Objects`, `listReportersForConnection`, `viewCoverage` e afins,
  garantindo que nenhuma mensagem logada contenha `user/pass@host`.
- Manter o comportamento atual: só substitui a ocorrência exata da connection
  conhecida (sem heurística que corrompa a mensagem).

### RF3 — Scripts de desenvolvimento sem injeção/log de segredo

- `scripts/db-matrix/run.sh`: substituir `eval "$TESTS_CMD"` por execução segura
  (array/`bash -c "$TESTS_CMD"` com a variável já controlada, sem reavaliação de
  shell sobre input arbitrário) e mascarar a senha ao exibir `UTPLSQL_CONN`.
- `scripts/create-pr.cjs`: validar `--base` e `--head` (ex.:
  `/^[A-Za-z0-9._/-]+$/`) antes de interpolar; preferir
  `execFileSync('git', [...args])` a `execSync` com string.

**Não-funcionais**
- RNF1 — Nenhuma mudança de comportamento observável com connection/banco
  válidos.
- RNF2 — Novos helpers puros cobertos por teste unitário; thresholds do c8
  (97% lines/statements, 97% functions, 93% branches) mantidos.
- RNF3 — `SECURITY.md` atualizado para refletir os invariantes (identificador
  validado; credencial nunca em log).

## 5. Solução proposta

- Extrair `sanitizeSchemaPrefix` (puro) para um módulo pequeno e testável e
  consumi-lo em `oracleRunner.ts`.
- Promover `maskConnectionIn` de `scriptRunner.ts` para um utilitário
  compartilhado (`connectionProfiles.ts`) como `redactConnection`, mantendo um
  re-export para compatibilidade e os testes existentes.
- Ajustar os dois scripts e o texto do `SECURITY.md`.

## 6. Configuração

Nenhuma setting nova; sem comandos/menus novos.

## 7. Plano de testes

- **Unitários** (`node --test out/test/unit/**/*.test.js`):
  - `sanitizeSchemaPrefix`: aceita `UT3.`, `APP.`, `A$B.`; rejeita
    `x.`+`"`/`;`/espaço/`--`; vazio → sem prefixo.
  - `redactConnection`: mensagem com a connection exata → mascarada; mensagem
    sem credencial → intacta; connection sem senha → intacta.
  - Validação de `--base`/`--head` no `create-pr.cjs`.
- **Integração** (Oracle 23ai Free): run normal sem regressão; cobertura
  inalterada.
- **Validação manual**: `scripts/db-matrix/run.sh --tests "echo ok"` continua
  funcionando; a saída não exibe a senha de `UTPLSQL_CONN`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Allowlist rejeitar um nome de schema legítimo (edge) | Regex cobre `A-Z0-9_$#`; fallback é "sem prefixo" (comportamento atual de shared install), nunca falha dura |
| Redaction quebrar mensagens (heurística sobre `/`) | Substituição apenas da connection exata conhecida (já validada em testes da PRD-66) |
| Alterar `run.sh` quebrar a matriz local | Teste manual do `--tests` e dos flags existentes; script é dev-only |

## 9. Rollout

- **0.18.0** (infra/segurança; sem mudança de runtime perceptível).
- Registrar em `CHANGELOG.md` e atualizar `SECURITY.md` (seção "Implemented
  protections").

## 10. Critérios de aceite

- Nenhum identificador dinâmico concatenado no SQL sem validação (`grep` +
  teste).
- Nenhum log do ciclo de conexão contém a senha (`redactConnection` aplicado).
- `run.sh` sem `eval` e `create-pr.cjs` com `base`/`head` validados.
- `npm run test:coverage` verde e thresholds mantidos.
- `SECURITY.md` reflete os dois invariantes.

## 11. Questões em aberto

- Centralizar a redaction no próprio `logger` (varrer todo `ctx`) em vez de só nos
  call sites de conexão? Preferência inicial: call sites agora; `logger` como
  follow-up, para não mascarar mensagens legítimas.

## 12. Impacto no cérebro

Ao concluir, criar as regras que materializam a PRD, por exemplo:
`SEC-012` ("identificador de schema validado antes de concatenar no SQL") e
`BR-CONN-0xx` ("credencial redigida em todo log do ciclo de conexão"), cada uma
com `prds: ["PRD-110"]`, `implementacao:` (arquivo/linha) e `testes:`. Enquanto
`proposed`, `regras: []`.
