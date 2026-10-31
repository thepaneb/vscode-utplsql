<!-- GENERATED FROM docs/brain/20-PRDs/prd-124-oracledb-26-upgrade.md — DO NOT EDIT -->

# PRD-124 — Upgrade para node-oracledb 26 com matriz e packaging validados

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-29 |
| Componente | Driver Oracle (`oracledb`) + packaging dos VSIX + matriz de bancos |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `package.json`, `package-lock.json`, `.github/dependabot.yml`, `scripts/package-target.cjs` (só se o naming mudar), `src/test/unit/packageTarget.test.ts`, `src/test/integration/thickLegacyE2E.test.ts`, `docs/brain/14-NFR/NFR-001*.md`, `docs/brain/15-Regras/BR-CONN-019*.md`, `BR-TEST-001*.md`, `BR-CONN-021*.md` (nova), `docs/brain/60-README/README (extensão).md` (+ 23 variantes geradas), `docs/brain/70-Wiki/{Database-requirements,Troubleshooting,Contributing}.md`, `docs/brain/10-Projeto/Registro de features.md`, `CHANGELOG.md` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |
| Relaciona-se a | PRD-123 (11g thick), PRD-70 (thick opt-in), PRD-72/84 (matriz), PRD-104 (supply chain), NFR-001, BR-CONN-019, BR-TEST-001, issues #242/#248 |

## 1. Resumo

Subir o **`node-oracledb` de 7.0.1 para 26.0.x** (e `@types/oracledb` para 26),
com um **go/no-go explícito** para o Oracle 11g em thick mode, execução da
**matriz de bancos** e validação do **packaging dos 9 VSIX**. O bump é
mecanicamente pequeno (duas linhas), mas o driver está no caminho de toda
execução, cobertura, debugger e pooling — e o v26 eleva o piso do Oracle Client
para **19c** no thick. A PRD existe para que o upgrade não entre como *drive-by*
do Dependabot (issue #242; acompanhamento na #248).

## 2. Contexto e problema

### 2.1 O PR #242 não é um bump rotineiro

O Dependabot abriu o PR #242 subindo `oracledb` **7.0.1 → 26.0.0** e
`@types/oracledb` **7.0.3 → 26.0.0**. É a primeira mudança de major desde o
v7 e o número salta para 26 porque o driver passou a usar o **ano** no major
(v26 = 2026). O PR foi mantido aberto e o major foi adicionado ao `ignore` do
`dependabot.yml` (PR #246) justamente porque a validação necessária não cabe em
um bump automático.

### 2.2 O que muda no node-oracledb 26

> **Correção (2026-10-31):** o **v7.0.0 (jun/2026) já removeu** o suporte a
> Oracle Client < 19c. O piso 19c **não é novidade da 0.19.0** — a documentação
> e a `BR-CONN-019` já o registram desde a 0.18.0. O que muda de fato no v26 é o
> nome padrão da biblioteca e a remoção do pré-compilado macOS Intel.

- **Thick:** o piso **19c+** continua (já era do v7); o Instant Client 23.0 usado
  na matriz é válido.
- **Thick (Linux/macOS):** o driver carrega **`libclntsh.so`/`libclntsh.dylib`**
  pelo nome padrão; nomes versionados (`libclntsh.so.19.1`) **não** são mais
  carregados diretamente (mudança do ODPI-C no v26).
- **Binários pré-compilados:** continuam os mesmos quatro alvos do v7 —
  `win32-x64`, `linux-x64`, `linux-arm64`, `darwin-arm64` — com o mesmo padrão
  `oracledb-<versão>-<target>.node`. `darwin-x64` segue sem glue (o VSIX desse
  alvo já é thin-only).
- **Thin:** mudanças aditivas (CQN/AQ, OpenTelemetry, `rowsPerDataEvent`,
  correções de LOB/resultset). O piso de banco do thin continua **12.1+**.
- **Comum:** prioridade de transação do 26ai, provedores de configuração e
  correções de OSON/timestamp — nada que a extensão use diretamente.
- **macOS Intel:** o v26 **removeu** o pré-compilado `darwin-x64`; esse alvo já é
  thin-only no VSIX, então não há mudança de packaging além de manter o alvo sem
  `.node`.

### 2.3 Raio de impacto na extensão

O `oracledb` é dependência de runtime e vai no VSIX. Ele é usado em:

- execução (`executeRunOracle`): conexões, `ut_runner.run`, streaming do buffer;
- pooling (`oracleRunner`/PRD-38) e cancelamento (`conn.break()`);
- cobertura (`DBMS_PROFILER`) e debugger (`DBMS_DEBUG`);
- descoberta DB-first (`ALL_OBJECTS`/`ALL_SOURCE`) e virtual source.

Qualquer regressão em LOB, resultset, timestamp ou cancelamento aparece como
falha intermitente — por isso a matriz completa, e não só os testes unitários.

### 2.4 O 11g thick é o principal risco

A PRD-123 declarou o **Oracle 11.2 em thick mode** (utPLSQL 3.1.x,
`DBMS_PROFILER`). O v7 já exige Client 19c+ e o cliente 19c+ continua podendo
conectar no 11g (interoperabilidade client/server); o que precisa ser **provado**
é que o **v26 + Instant Client 23.0** continua conectando no XE 11.2.0.2 e que
cobertura/streaming/descoberta não regridem. Se o v26 não conectar no 11g — ou
degradar algum eixo — o upgrade vira **NO-GO** até que o suporte ao 11g saia do
escopo.

### 2.5 Packaging

São **9 VSIX** (`publish.yml`): 4 com glue nativa (`win32-x64`, `linux-x64`,
`linux-arm64`, `darwin-arm64`) e 5 thin-only. O `package-target.cjs` remove as
glues que não pertencem ao alvo usando `oracledb-<versão>-<target>.node`; o
naming do v26 é o mesmo, mas o fluxo precisa ser exercitado com a versão nova
(26.0.0) e o tamanho dos VSIX precisa ser medido.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Decidir **GO/NO-GO** com evidência de banco real antes de mexer na `main`.
- Subir `oracledb` para **26.0.x** e `@types/oracledb` para a mesma major.
- Validar thin (23ai), thick (Instant Client 23.0) e o legado **11g thick**.
- Validar o packaging dos **9 alvos** e o conteúdo de glue de cada VSIX.
- Atualizar docs, NFR e regras para o novo piso de Client no thick.

**Não-objetivos**
- Adotar recursos novos do v26 (CQN, AQ, transaction priority, OpenTelemetry).
- Subir `@types/node`/`@types/vscode` (seguem os pisos; ver PR #246).
- Remover o suporte ao 11g ou ao 12.2 — decisão fora desta PRD.
- Incluir 12.1 na matriz (fora do escopo desde a PRD-123).
- Mudar settings, comandos ou comportamento visível ao usuário.

## 4. Requisitos

### RF0 — Spike GO/NO-GO (bloqueante)

Em uma branch descartável (`spike/oracledb-26`), subir apenas as duas
dependências (sem mudanças de código) e rodar:

1. `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:coverage`.
2. `bash scripts/db-matrix/run.sh --only 23free --full` (thin, suíte completa).
3. `bash scripts/db-matrix/run.sh --only 11xe --thick` (11g thick + cobertura).
4. `bash scripts/db-matrix/run.sh --only 12.2 --smoke` (thin legado).
5. `bash scripts/db-matrix/run.sh --only 21xe --smoke` (thin).

**GO** se os cinco eixos passarem sem regressão. **NO-GO** se o 11g thick falhar
sem correção viável: manter 7.0.1, registrar a evidência nesta PRD/issue e
reavaliar quando o 11g sair do escopo. O spike não é mergeado.

### RF1 — Atualizar o driver e os tipos

`oracledb` para `^26.0.0` e `@types/oracledb` para `^26.0.1` (o `26.0.0` não é
publicado para os tipos); regenerar o lockfile; corrigir eventuais quebras de
tipo sem afrouxar o `tsconfig`. Manter o `ignore` de major do Dependabot (o
próximo major também será deliberado).

### RF2 — Validar e documentar o thick

Validar o thick com **Instant Client 23.0** (já usado no e2e do 11g) e, se
disponível, 19c. Documentar o piso **19c**, o requisito de
`libclntsh.so`/`libclntsh.dylib` e a mensagem de erro amigável para client
antigo. Não é necessário suportar client < 19c.

### RF3 — Packaging dos 9 alvos

Rodar o empacotamento dos 9 alvos e verificar:

- os 4 alvos com glue contêm **apenas** `oracledb-26.0.0-<target>.node`;
- os 5 thin-only não contêm `.node`;
- o VSIX instala e ativa (smoke manual em `win32-x64` e `linux-x64`);
- o tamanho de cada VSIX é registrado (variação aceitável ≤ 10% vs 0.18.0).

> **Armadilha (2026-10-31):** `package-target.cjs` **remove** as glues dos outros
> alvos de `node_modules/oracledb/build/Release`; rodar os 9 alvos em sequência
> exige `npm ci` (ou backup/restore do diretório) antes de cada alvo com glue.
> Além disso, `npm run package:target` **não** compila/bundleia — use
> `npm run package:<target>` ou rode `compile` + `bundle` antes.

Atualizar os fixtures de `packageTarget.test.ts` para a versão 26.0.0.

### RF4 — Matriz completa

Além do RF0, rodar a suíte completa no **23free** (thin + multiroot) e o e2e
**11g thick** com cobertura. Se houver tempo/credenciais, um smoke no **19ee**
ou **18xe**. A matriz continua local (não vai ao CI).

### RF5 — Docs, NFR e CHANGELOG

- README EN (nota do vault) + 23 variantes: piso de Client 19c no thick.
- `wiki/Database-requirements.md`: requisito de Client/Instant Client.
- `wiki/Troubleshooting.md`: `libclntsh.so` e erros de client antigo.
- `wiki/Contributing.md`/`Tests.md`: matriz e eixo thick.
- `NFR-001`: versão do driver e piso de Client.
- `Registro de features`: entrada `interno: true` (enabler).
- `CHANGELOG.md`: seção 0.19.0 com a mudança do driver e o requisito de
  `libclntsh.so`/`.dylib` com o nome padrão. **Não** anunciar uma nova quebra de
  Client < 19c (já vigente desde o v7/0.18.0).

### RF6 — Regras

Criar `BR-CONN-021` — “major do driver Oracle só entra com matriz e packaging
validados” — com `prds: ["PRD-124"]`, `implementacao:` e `testes:`. Atualizar
`BR-CONN-019` (piso do Client no thick) e `BR-TEST-001` (eixo do driver).

**Não-funcionais**
- RNF1 — Nenhuma mudança de comportamento observável para o usuário (mesmos
  comandos/settings/API); o upgrade é transparente.
- RNF2 — Cobertura mantém os thresholds do `.c8rc` (97/93/97).
- RNF3 — VSIX de cada alvo varia no máximo 10% vs 0.18.0.
- RNF4 — Rollback em um commit (reverter `package.json`/lock) sem migração.
- RNF5 — Funciona em Node 24 e 26 (matriz do CI após a PRD-47).
- RNF6 — Nenhuma dependência de runtime nova.

## 5. Solução proposta

1. **Spike** (RF0) em branch descartável, sem merge; registrar os resultados na
   issue/PRD.
2. Se **GO**, branch `feat/prd-124-oracledb-26` com o bump, os ajustes de tipo e
   os fixtures de packaging.
3. Rodar a matriz (RF4) e o packaging (RF3) na mesma árvore do PR.
4. Atualizar docs/NFR/regras (RF5/RF6) e o `CHANGELOG`.
5. PR único para a `main`, com a evidência do RF0 e da matriz no corpo.

Decisão de design: **não** adicionar shim para client < 19c. O v26 já falha com
erro do driver; a extensão documenta o requisito e mantém a mensagem amigável
existente. O `ignore` de major do Dependabot permanece para que o próximo major
também passe por PRD.

## 6. Configuração

Nenhuma setting/comando novo. `utplsql.oracleClientMode: thick` continua igual;
muda apenas o requisito documentado de Oracle Client (19c+).

## 7. Plano de testes

- **Unitários**: typecheck com `@types/oracledb` 26; `packageTarget.test.ts`
  com fixtures 26.0.0; `matrixConfig.test.ts` inalterado; cobertura ≥ thresholds.
- **Integração**: 23free full (thin + multiroot); 11g thick (execução,
  cobertura e descoberta); 12.2 smoke; 21xe smoke.
- **Packaging**: os 9 alvos; inspeção do conteúdo (`.node` correto/ausente);
  instalação manual em `win32-x64` e `linux-x64`.
- **Manual**: conectar thin e thick; rodar suíte com cobertura; abrir coverage
  HTML; debugger em um teste; cancelar um run longo.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| v26 não conecta no 11g thick | RF0 bloqueante; NO-GO mantém 7.0.1 e registra a evidência |
| Usuários thick com Client < 19c | Já quebrados desde o v7/0.18.0; manter a mensagem do driver e documentar o piso 19c |
| `libclntsh.so` versionado não é carregado | Documentar o nome padrão no Troubleshooting; testar com Instant Client 23.0 e symlink `libclntsh.so` |
| Regressão silenciosa em LOB/resultset/streaming | Matriz completa + e2e de cobertura/debug |
| Quebra de tipos (`@types/oracledb` 26) | `typecheck` no PR; corrigir sem `any` novo |
| VSIX maior / glue errada no alvo | RF3 + inspeção do conteúdo + medição de tamanho |
| Rollback difícil | Bump isolado em um commit; reverter package/lock restaura 7.0.1 |

## 9. Rollout

- **Release alvo:** 0.19.0.
- **GO:** merge do PR com o bump + docs; entrada no `CHANGELOG` destacando o
  driver 26 e o nome padrão da biblioteca Client (o piso 19c já era do v7).
- **NO-GO:** PRD permanece `proposed` com a decisão registrada e a issue é
  fechada; o upgrade volta ao roadmap quando o 11g sair do escopo.
- O `CHANGELOG.md` só é atualizado no GO.

## 10. Critérios de aceite

- `oracledb` e `@types/oracledb` em 26.0.x; `typecheck`, `lint`, `test:unit` e
  `test:coverage` verdes.
- RF0 registrado com os cinco eixos; 11g thick verde (ou NO-GO documentado).
- 23free full + multiroot, 12.2 smoke e 21xe smoke verdes.
- 9 VSIX gerados; 4 com a glue 26.0.0 correta e 5 sem `.node`.
- README ×24, wiki, NFR-001, regras e CHANGELOG atualizados; `brain:ci`,
  `docs:check`, `docs:features-check` e `version:check` verdes.
- Nenhuma mudança de comportamento observável nos e2e de run/cobertura/debug.

## 11. Questões em aberto

- O v26 ainda conecta no 11.2 thick com o Instant Client 23.0? (RF0 responde.)
- Vale manter o **12.2** na matriz depois deste upgrade, ou ele sai junto com o
  11g em uma PRD futura?
- Temos Instant Client **19c** disponível para testar o piso, ou validamos só com
  23.0 e documentamos 19c como mínimo teórico?
- O `ensureOracleClient` deve detectar `libclntsh.so` ausente e dar uma mensagem
  própria, ou a mensagem do driver basta?
- O orçamento de +10% de VSIX (RNF3) é suficiente para as glues do v26?

## 12. Impacto no cérebro

Na conclusão (GO): criar **`BR-CONN-021`** (major do driver Oracle exige matriz +
packaging) com `prds: ["PRD-124"]` e `requisitos` de RF1–RF3; atualizar
**`BR-CONN-019`** (o piso 19c **já** está correto; acrescentar o requisito de
`libclntsh.so`/`.dylib` com o nome padrão) e **`BR-TEST-001`** (eixo do driver na
matriz); atualizar **`NFR-001`** (versão do driver).

RNFs sem regra (a declarar na conclusão): RNF1 (coberto pelos e2e), RNF3
(medição de VSIX), RNF4 (rollback), RNF5 (matriz do CI), RNF6 (sem dependência
nova).

## Impacto nas docs

`CHANGELOG` (0.19.0; driver 26 e `libclntsh.so` — **não** uma nova quebra de
Client < 19c), `wiki/Database-requirements.md` (confirmar 19c+ e o nome padrão),
`wiki/Troubleshooting.md` (`libclntsh.so` versionado) e `wiki/Contributing.md`
(matriz). README ×24 é gerado da nota do vault e recebe o requisito de Client
19c+/nome padrão; o `Registro de features` ganha uma entrada `interno: true`. Na
conclusão, cada superfície cita `PRD-124` ou `<!-- prd:PRD-124 -->`.
