---
tipo: prd
id: PRD-153
aliases: [PRD-153]
status: in-progress
titulo: "Segurança de IA: injeção de prompt e vazamento de dados"
versao: "0.24.0"
versao_titulo: "0.24.0 - Segurança e distribuição"
data: "2026-11-27"
autor: "Gil Cleber Barboza"
verificado: "2026-11-27"
regras: []
docs: ["CHANGELOG", "SECURITY", "CONTRIBUTING", "README"]
tags: [prd]
---

# PRD-153 - Segurança de IA: injeção de prompt e vazamento de dados

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-11-27 |
| Componente | Ferramental de IA de desenvolvimento (Jev, agentes, MCPs) |
| Versão alvo | 0.24.0 (P0 antecipado) |
| Arquivos afetados | `src/tools/jevReview.ts`, `src/test/unit/jevReview.test.ts`, `.github/workflows/jev-review.yml`, `.github/CODEOWNERS`, `.opencode/agent/*.md`, `.opencode/plugins/log-sanitizer/index.ts`, `opencode.json`, `SECURITY.md`, `docs/brain/16-Seguranca/` |
| Esforço estimado | 2-3 dias (P0 ~1 dia) |
| Complexidade | Média |
| Relaciona-se a | PRD-154 (disclosure), PRD-122 (privacidade), PRD-144 (hardening), PRD-145 (entregável), SEC-004, SEC-008, BR-PLAT-002 |

## 1. Resumo

Tratar os riscos de IA do **processo de desenvolvimento**: injeção de prompt no
Jev (a revisão pode ser manipulada pelo diff), injeção via conteúdo não confiável
lido pelo agente local e vazamento de código/segredos para APIs externas. O
runtime da extensão não chama IA; o escopo é o ferramental de dev/CI e a
documentação de segurança.

O P0 desta PRD foi antecipado: validação/escape da saída do Jev, exclusão de
qualquer `*.env`, redação de connection strings Oracle, `persist-credentials:
false` no checkout do PR e permissões de shell nos agentes read-only. O restante
(MCP least privilege, sanitizer de tool outputs, política de retenção) fica para
a conclusão na 0.24.0.

## 2. Contexto e problema

O projeto usa IA em pontos com trust boundaries diferentes:

- **Jev**: recebe `git diff` de PRs do mesmo repositório (forks são pulados) e
  envia o diff para `https://opencode.ai/inference/systemone/v1/systemone`. O
  modelo não tem ferramentas; devolve respostas tipadas (`noul`/`score`/`choice`)
  e o relatório é publicado como comentário/artifact advisory.
- **Agente local (OpenCode)**: lê repositório, issues/PRs via MCP GitHub, vault
  via MCP Obsidian, docs via MCP Context7 e páginas via Playwright. Tem shell,
  edição de arquivos e rede.
- **Extensão**: não chama IA (o único `fetch` de modelo é `src/tools/jevReview.ts`,
  fora do bundle `src/extension.ts`).

Vetores e lacunas atuais:

1. **Prompt injection no diff do Jev**: um PR pode conter comentários/strings
   instruindo o modelo a aprovar. O review é advisory, mas um `choice` não
   validado pode virar Markdown arbitrário no comentário do PR.
2. **Markdown injection na saída**: `validateAnswer` aceita qualquer string em
   `choice`; `formatMarkdown` imprime `formatChoice` e `model` sem escape, e
   `formatFiles` não escapa `[`/`]`/backticks. Nomes de arquivo e a resposta do
   modelo são dados não confiáveis.
3. **Vazamento de segredos**: `isSensitivePath` exclui `.env`/`.env.*`, mas não
   `matrix.env`/`*.env`; `redactSecrets` não cobre uma connection string Oracle
   em código (`const conn = 'scott/tiger@host:1521/xe'`).
4. **Segredo no CI**: o workflow faz checkout com `persist-credentials` padrão e
   executa `scripts/jev-review.cjs` do PR com `OPENCODE_API_KEY`. Um PR do mesmo
   repositório pode alterar o script e exfiltrar a chave; forks são pulados.
5. **Agentes “read-only”**: `security-auditor`, `oracle-analyst`,
   `i18n-reviewer` e `docs-auditor` negam `edit`, mas o **shell continua
   permitido**; um conteúdo não confiável pode instruir comandos de escrita ou
   exfiltração.
6. **Sanitização limitada**: o plugin `log-sanitizer` usa apenas
   `session.hook("prompt")`, que roda na admissão do prompt do usuário; **tool
   outputs e arquivos lidos não passam por ele**. O shell não é coberto pela
   permissão de `.env` (documentado no OpenCode).
7. **MCPs com privilégio amplo**: o PAT do GitHub fica no env do serviço;
   `opencode service get` imprime o env em claro. Obsidian/Playwright ampliam a
   superfície de injeção e exfiltração.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Impedir que a saída do Jev vire Markdown/HTML não confiável no PR.
- Reduzir a probabilidade de vazamento de segredos no diff enviado ao Jev.
- Reduzir a exposição do secret do CI a código de PR.
- Impedir que agentes declarados read-only executem shell arbitrário.
- Documentar o threat model e as limitações residuais (advisory, shell scanner
  best-effort, sanitizer de prompt vs. tool outputs).

**Não-objetivos**
- Garantir que o Jev seja imune a prompt injection (não é possível; ele continua
  advisory).
- Tornar o Jev um required check.
- Adicionar sandbox de processo para o agente local (avaliar em PRD futura).
- Reescrever o runtime da extensão; ela não usa IA.
- Implementar DLP genérico ou classificação de dados corporativa.

## 4. Requisitos

### RF1 - Validação e escape da saída do Jev

- `choice` só aceita `approve`/`comment`/`block`; `noul` finito em [0,1];
  `score` finito em [0,4]; `usage` numérico finito.
- `formatMarkdown` escapa `choice`, `model` e nomes de arquivo; não permite
  link/imagem Markdown injetada.
- `buildState` declara que o diff é dado não confiável e que instruções dentro
  dele devem ser ignoradas (mitigação, não garantia).
- Relatório continua advisory; achados continuam sendo mensagens fixas geradas
  pelo adapter.

### RF2 - Minimização e redação de dados

- Excluir do Jev qualquer arquivo cujo basename termine em `.env` (exceto
  `.env.example`, `.env.sample`, `.env.template`).
- Redigir connection strings Oracle (`user/password@host...`) em código, além
  dos padrões atuais (env, bearer, private key, AWS, JWT).
- Manter docs, lockfiles, binários e caminhos sensíveis fora do diff.
- Documentar que a redação é best-effort e que dados sensíveis não devem ser
  enviados.

### RF3 - Trust boundary do CI

- `actions/checkout` com `persist-credentials: false` no workflow do Jev.
- `CODEOWNERS` para `scripts/jev-review.cjs`, `src/tools/jevReview.ts`,
  `.opencode/` e `opencode.json`.
- Documentar que PRs do mesmo repositório executam código do PR com o secret;
  forks são pulados. Avaliar chave dedicada, quota/rotação e revisão obrigatória
  de mudanças no workflow/script.

### RF4 - Permissões dos agentes

- Agentes read-only (`security-auditor`, `oracle-analyst`, `i18n-reviewer`,
  `docs-auditor`) declaram `shell` com `ask`/`deny`; comandos intencionais
  (ex.: `npm audit`, `docker exec`, `npm run docs:check`) podem ser allowlist.
- Revisar `opencode.json` para least privilege de MCPs; PAT GitHub fine-grained
  com expiração e escopo mínimo; não usar `opencode service get` em shell.
- Avaliar `external_directory` ask/deny e a remoção de MCPs não usados por
  agentes read-only.

### RF5 - Sanitização de contexto

- O `log-sanitizer` deve cobrir o conteúdo enviado ao modelo (tool outputs),
  não apenas o prompt do usuário, ou ter a promessa limitada/renomeada.
- Testar redação de JWT/bcrypt/base64/strings longas e connection strings em
  mensagens montadas.
- Não logar payloads sensíveis; manter o plugin local e versionado.

### RF6 - Documentação e regras

- Seção “IA no desenvolvimento” no `SECURITY.md`: fluxos de dados, controles,
  limitações, como reportar problema.
- Nota canônica em `16-Seguranca/` com o threat model (Jev, agente, MCP).
- Criar `SEC-016` (Jev não recebe segredo nem publica Markdown não validado) e
  `SEC-017` (agente read-only não executa shell arbitrário) na conclusão; a
  PRD-154 cria `BR-PLAT-006` (disclosure).

**Não-funcionais**
- RNF1 - Nenhuma dependência nova de runtime/bundle.
- RNF2 - Testes unitários cobrem validação/escape/redação; cobertura global nos
  thresholds do `.c8rc`.
- RNF3 - `brain:ci`, `docs:check`, `brain:rules` e `workflowPolicy` verdes.
- RNF4 - Jev continua advisory e com custo zero no modelo gratuito.
- RNF5 - Mudanças de segurança não podem quebrar a revisão de PRs normais.

## 5. Solução proposta

### P0 (antecipado nesta branch)

- `validateAnswer` valida enums/ranges; `escapeTableCell` cobre `[`/`]`/backticks;
  `formatChoice`/`formatModel`/`formatFiles` escapados; `buildState` com aviso de
  dado não confiável.
- `isSensitivePath` exclui `*.env`; `redactSecrets` redige Oracle Easy Connect.
- `persist-credentials: false` no workflow; `CODEOWNERS` do ferramental.
- `shell` com `ask` + allowlist nos agentes read-only.

### Restante (0.24.0)

- Hook `context` no `log-sanitizer` para tool outputs.
- Permissões de MCP por ferramenta (GitHub/Obsidian/Playwright), PAT mínimo,
  revisão de `opencode service get`.
- Trust boundary mais forte do CI (script confiável/checkout separado, chave
  dedicada, revisão obrigatória de workflow).
- Seção `SECURITY.md`/nota canônica e regras `SEC-016`/`SEC-017`.

## 6. Configuração

Nenhuma setting de usuário. Mudanças em `opencode.json`, agentes e workflow são
de desenvolvimento/CI.

## 7. Plano de testes

- **Unitários**: `callJev` rejeita `choice` inválida e valores fora de faixa;
  `formatMarkdown` escapa choice/model/arquivo; `buildState` contém o aviso;
  `isSensitivePath` cobre `matrix.env`; `redactSecrets` cobre `scott/tiger@...`;
  workflowPolicy cobre `persist-credentials: false`.
- **Integração**: rodar o Jev em um diff com texto de injeção e conferir que a
  saída continua restrita e escapada; rodar em PR de docs e em PR de código.
- **Manual**: inspecionar o comentário/artifact do PR; confirmar que agentes
  read-only pedem aprovação para shell fora da allowlist.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Prompt injection continuar influenciando scores | Advisory + humano + testes/CodeQL; validação de saída; nunca required sem calibração |
| Escape quebrar a legibilidade do relatório | Testes de markdown; mensagens fixas; escape só em células |
| `*.env` excluir arquivo legítimo | Exceções explícitas para `.env.example`/sample/template |
| Redação Oracle gerar falso positivo | Regex restrita a `user/pass@host`; testes; best-effort documentado |
| `persist-credentials: false` quebrar o workflow | O step de comentário usa `GH_TOKEN`; testar em PR |
| Permissões de shell atrapalharem agentes | Allowlist dos comandos intencionais; ask para o resto |
| Sanitizer de tool outputs aumentar latência | Limite de tamanho e redação só de padrões; avaliar no P1 |

## 9. Rollout

- P0 antecipado na release corrente; restante na 0.24.0.
- `CHANGELOG.md` na conclusão da PRD.
- Sem migração de usuários.

## 10. Critérios de aceite

- Saída do Jev valida enum/faixa e não permite Markdown injetado.
- Nenhum `*.env` ou connection string Oracle vai ao Jev; testes cobrem.
- Workflow não persiste credenciais; CODEOWNERS protege o ferramental.
- Agentes read-only não executam shell fora da allowlist.
- `SECURITY.md`/nota canônica publicam o threat model e as limitações.
- `SEC-016`/`SEC-017` criadas na conclusão; `brain:rules` verde.
- `npm run test:unit`, `test:coverage`, `lint`, `brain:ci`, `docs:check` verdes.

## 11. Questões em aberto

- O Jev deve rodar a partir de um checkout confiável (base) para não executar
  script do PR com o secret? Qual o custo de implementação?
- O PAT do GitHub MCP pode ser fine-grained sem quebrar issues/PRs/releases?
- Qual o escopo mínimo de MCPs para os agentes read-only?
- O sanitizer de tool outputs deve ser opt-in por agente ou global?
- Quem revisa mudanças em `.opencode/` e `opencode.json` (CODEOWNERS)?

## 12. Impacto no cérebro

Previstas para a conclusão: `SEC-016` (dados de IA minimizados/validados) e
`SEC-017` (agentes read-only sem shell arbitrário), com
`prds: ["PRD-153"]`, `implementacao:` e `testes:`. O P0 desta PRD já altera
`src/tools/jevReview.ts`, o workflow e os agentes; as regras serão criadas no
fechamento para não deixar vínculo parcial.

## Impacto nas docs

- `SECURITY.md`: seção “IA no desenvolvimento” com fluxo de dados e limites.
- `CONTRIBUTING.md`: referência à política de segurança de IA (em conjunto com
  a PRD-154).
- `README.md`: postura de dados/IA (via nota do vault; PRD-154).
- `CHANGELOG.md`: entrada na conclusão.
- `docs/brain/16-Seguranca/`: nota canônica do threat model.
- `docs/brain/15-Regras/`: `SEC-016`/`SEC-017` na conclusão.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-122-marketplace-trust-metadata|PRD-122]] · [[prd-144-security-runtime-hardening|PRD-144]] · [[prd-145-security-alerts-deliverable|PRD-145]] · [[prd-154-ai-disclosure-provenance|PRD-154]]
- ⚙️ Pipelines: [[PIPE-jev-review - Jev Review|PIPE-jev-review]]
- 🔗 Mesma versão (0.24.0 - Segurança e distribuição): [[prd-154-ai-disclosure-provenance|PRD-154]]
- 🚀 ⬅️ release anterior: [[prd-149-performance-engineering-quality|PRD-149 (0.23.0)]] · ➡️ próxima release: [[prd-132-ux-execution-dryrun-jump|PRD-132 (0.25.0)]]
<!-- brain:auto:end -->
