---
tipo: prd
id: PRD-130
aliases: [PRD-130]
status: proposed
titulo: "Validação de configuração e classes de erro tipadas"
versao: "0.20.0"
data: "2026-10-30"
autor: "Gil Cleber Barboza"
versao_titulo: "0.20.0 — Observabilidade e desempenho"
verificado: "2026-10-30"
regras: []
docs: ["CHANGELOG", "wiki/Architecture.md"]
tags: [prd]
---

# PRD-130 — Validação de configuração e classes de erro tipadas

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `src/config.ts`, `src/oracleRunner.ts`, `src/runner.ts`, `src/commands/*`, `src/test/unit/config*.test.ts` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-112 (tratamento de erros) |

## 1. Resumo

Introduzir **validação de configuração** em `readConfig()` e **classes de erro
customizadas** (`OracleConnectionError`, `UtplsqlVersionError`, `ReporterNotFoundError`,
`ConfigurationError`) para tratamento preciso e mensagens melhores ao usuário.

## 2. Contexto e problema

- `readConfig()` lê settings sem validar ranges/formatos; valores inválidos chegam ao
  runtime e causam falhas obscuras.
- Erros são propagados como `Error` genérico; `runner.ts` faz redaction mas não
  distingue tipo → mensagens genéricas.
- PRD-112 cobre `catch` silenciosos, mas não tipagem de erros.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Validar todas as settings numéricas/enums/regex na inicialização (com aviso +
  fallback para default em inválidos).
- Criar hierarquia de erros com `code` e `userMessageKey` localizável.
- Mapear erros Oracle comuns para classes tipadas, preservando a causa original
  (`cause`).

**Não-objetivos**
- Mudar defaults; bloquear ativação por config inválida (apenas avisar).
- Substituir o logger.
- Trocar arquitetura radicalmente.

## 4. Requisitos

### RF1 — Validação de configuração
- `readConfig()` valida via schema (validador manual sem dep nova, ou Zod se
  necessário) e registra `logger.warn` para valores inválidos com fallback ao
  default.

### RF2 — Classes de erro
- Hierarquia em `src/errors.ts`: `UtplsqlError` (base) → `OracleConnectionError`,
  `UtplsqlVersionError`, `ReporterNotFoundError`, `ConfigurationError`, `TimeoutError`;
  cada uma com `code: string` e `userMessageKey: string`.

### RF3 — Mapeamento Oracle
- `oracleRunner.ts` mapeia erros do `node-oracledb` (ORA-12541, ORA-01017,
  ORA-28000, timeout) para as classes tipadas, preservando a causa original
  (`cause`).

### RF4 — Tratamento no runner
- `runner.ts` usa o `userMessageKey` para exibir mensagem localizada; erros
  desconhecidos caem no caminho atual.

### RF5 — Testes
- Testes de config inválida e de mapeamento de erros Oracle.

**Não-funcionais**
- RNF1 — Sem nova dependência se possível (validador manual).
- RNF2 — Cobertura ≥ thresholds.

## 5. Solução proposta

- Criar `src/errors.ts` e `src/configValidation.ts`.
- Integrar em `readConfig()` e nos pontos de throw em `oracleRunner.ts`/`runner.ts`.
- Atualizar `commands/*` para tratar `instanceof UtplsqlError`.

## 6. Configuração

Nenhuma setting nova (validação interna de settings existentes).

## 7. Plano de testes

- **Unitários**: config inválida → fallback + warn; mapeamento ORA → classe;
  `userMessageKey` resolvido em `t()`.
- **Integração**: run com config inválida não quebra; mensagem clara.
- **Manual**: alterar setting para valor inválido e verificar aviso.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Zod aumenta bundle | Preferir validador manual; medir bundle antes/depois |
| Mapeamento ORA incompleto | Fallback para `OracleConnectionError` genérico; logar código ORA |
| Regressão de mensagens | Testes de snapshot de mensagens atuais |

## 9. Rollout

- **0.20.0** ("Observabilidade e desempenho"); sem mudança visível.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Config inválida → fallback + warn.
- Erros tipados mapeados com `cause`.
- Mensagens localizadas para erros tipados.
- Cobertura ≥ thresholds; suíte verde.

## 11. Questões em aberto

- Adotar Zod (dep) ou validador manual? (impacto no bundle)
- Incluir validação de regex de cobertura (`includeSchemaExpr` etc.)?

## 12. Impacto no cérebro

Criar regra `BR-ERR-*` ("erros de domínio são tipados e carregam chave de mensagem")
com `prds: ["PRD-130"]`, `implementacao:` e `testes:`. Enquanto `proposed`,
`regras: []`.

## Impacto nas docs

`CHANGELOG` e `wiki/Architecture.md` descrevem classes de erro e validação.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-112-error-handling-audit|PRD-112]]
- 🔗 Mesma versão (0.20.0): [[prd-101-connection-pool-lifecycle|PRD-101]] · [[prd-102-trace-and-perf-instrumentation|PRD-102]] · [[prd-103-incremental-source-reindex|PRD-103]] · [[prd-106-perf-harness|PRD-106]] · [[prd-107-unprivileged-fixture|PRD-107]] · [[prd-120-lean-activation-lazy-setup|PRD-120]] · [[prd-128-event-bus-internal|PRD-128]] · [[prd-129-orchestration-strategy|PRD-129]] · [[prd-131-discovery-resilience-cache|PRD-131]]
- 🚀 ⬅️ release anterior: [[prd-127-vscode-floor-1-125|PRD-127 (0.19.0)]] · ➡️ próxima release: [[prd-88-locale-aware-formatting|PRD-88 (0.21.0)]]
<!-- brain:auto:end -->
