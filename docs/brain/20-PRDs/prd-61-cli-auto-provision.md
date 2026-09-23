---
tipo: prd
id: PRD-61
status: proposed
titulo: "Auto-provisionamento do utPLSQL-cli"
versao: "Suspenso — a reavaliar (PRD-64 removeu o CLI)"
data: "2026-09-06"
autor: "Gil Cleber Barboza"
versao_titulo: "Fora de release (investigação / a reavaliar)"
verificado: 2026-09-23
tags: [prd]
---

# PRD-61 — Auto-provisionamento do utPLSQL-cli

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-06 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | Suspenso — a reavaliar (PRD-64 removeu o CLI) |
| Arquivos afetados | `src/cli.ts`, `src/config.ts`, `src/quickfix.ts`, `package.json` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

> **Suspensa (2026-09-19).** A PRD-64 migrou a extensão para Oracle-only e
> removeu o `utPLSQL-cli`/Java. Esta PRD pressupõe `src/cli.ts`,
> `utplsql.cliPath`/`cliHome` e o modo de invocação `java`, que não existem
> mais. Mantida apenas como registro histórico — reavaliar somente se o CLI
> voltar a ser pré-requisito.

Oferecer download/verificação automática do `utPLSQL-cli` (analogia ao Python
Extension que instala `pytest`), com quick-fix no diagnóstico de setup. Hoje o
`setupValidator` apenas detecta a ausência do CLI e pede configuração manual.
Fica **fora** instalar o utPLSQL no banco (o framework vive no DB).

## 2. Contexto e problema

A falha mais comum de onboarding é "CLI não encontrado" (`utplsql.cliPath`).
A extensão detecta, mas não resolve. Baixar o `utPLSQL-cli` de um release do
GitHub e configurar `cliPath`/`cliHome` eliminaria esse atrito — mantendo o
usuário no controle.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Comando `utplsql.installCli` que baixa um release oficial do utPLSQL-cli
  (URL/versão configuráveis) para um diretório e configura `utplsql.cliPath`.
- Quick-fix no diagnostic "utPLSQL Setup" para instalar.
- Verificação de checksum (quando publicado) e versão.

**Não-objetivos**
- Instalar/atualizar o utPLSQL **no banco** (fora de escopo; requer DBA).
- Gerenciamento de Java (pré-requisito do CLI; apenas verificar e avisar).

## 4. Requisitos

### RF1 — Download com origem configurável

Settings:
- `utplsql.installCli.sourceUrl` (default: URL do release oficial no GitHub).
- `utplsql.installCli.version` (default: latest).

```typescript
// cli.ts — novo helper
async function downloadCli(url: string, destDir: string, onProgress): Promise<void>;
```

### RF2 — Configuração automática

Após download, gravar `utplsql.cliPath`/`utplsql.cliHome` nas settings do
workspace e rodar `utplsql.validateSetup` para confirmar.

### RF3 — Quick-fix

`UtplsqlCodeActionProvider` ganha uma ação "Instalar utPLSQL-cli" no
diagnóstico de CLI ausente (quando `invocation` é `launcher`/`java`).

**Não-funcionais**
- RNF1 — Nunca baixar sem consentimento explícito (exibir origem/versão).
- RNF2 — Não armazenar credenciais; download é de binário público.
- RNF3 — Falha de rede → mensagem clara, sem estado quebrado.

## 5. Solução proposta

Novo helper em `cli.ts` (usando `fetch`/`https`) + comando e quick-fix em
`extension.ts`/`quickfix.ts`. Reutilizar `setupValidator` para a validação
pós-instalação.

## 6. Configuração

- Comando `utPLSQL: Instalar utPLSQL-cli...`.
- Settings `utplsql.installCli.sourceUrl` e `utplsql.installCli.version`.
- Quick-fix no diagnóstico de setup.

## 7. Plano de testes

- **Unitários**: construção de URL; parse de checksum/versão; gravação de
  settings (com fake de workspace).
- **Integração**: (opcional, rede) download em diretório temporário.
- **Manual**: quick-fix instala e valida; falha de rede é tratada.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Download de binário de terceiro | Origem oficial + checksum + consentimento explícito. |
| Java ausente após instalar o CLI | Validar e avisar (o CLI precisa de Java). |
| Permissões de escrita na pasta destino | Diretório dentro do workspace ou `~/.utplsql`; tratar erro. |

## 9. Rollout

- Sem release: suspensa até reavaliação (a arquitetura Oracle-only atual não usa
  o CLI).

## 10. Critérios de aceite

- `npm test` passa.
- Comando baixa o CLI e configura `cliPath`/`cliHome`.
- Quick-fix aparece quando o CLI está ausente.
- Sem rede → erro tratado sem estado quebrado.

## 11. Questões em aberto

- Esta PRD ainda faz sentido depois da PRD-64 (Oracle-only, sem CLI)? — Provavelmente
  não; reescrever como "verificar versão do utPLSQL no banco" ou encerrar.
- Baixar o `oracledb` binary específico por plataforma? — Já é optionalDependency.
- Auto-update do CLI quando a versão do banco subir? — Follow-up.
