---
tipo: prd
id: PRD-81
aliases: [PRD-81]
status: proposed
titulo: "Hardening de segurança das settings de conexão"
versao: "0.14.0"
data: "2026-09-19"
autor: "Gil Cleber Barboza"
versao_titulo: "0.14.0 — Árvore, relatórios, conectividade e segurança"
verificado: 2026-09-23
tags: [prd]
---

# PRD-81 — Hardening de segurança das settings de conexão

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-19 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `package.json`, `src/config.ts`, `src/connectionProfiles.ts`, `README.md`, `SECURITY.md` |
| Esforço estimado | 1 dia |
| Complexidade | Média |

## 1. Resumo

Blindar a extensão contra um workspace malicioso redirecionar a senha guardada
no `SecretStorage` para outro host: tornar `machine`-scoped as settings de
conexão/perfil, desabilitar a extensão em workspaces não confiáveis e amarrar a
senha ao par perfil+conexão. Referência de porte:
`paddi35/utplsql-for-vscode` (seção Security do README e `capabilities.
untrustedWorkspaces`).

## 2. Contexto e problema

- `utplsql.profiles`, `utplsql.activeProfile` e `utplsql.connection` são
  settings comuns: um `.vscode/settings.json` de terceiros pode sobrescrevê-las.
- A senha fica no `SecretStorage` com chave `utplsql.profile.<id>`
  (`src/connectionProfiles.ts:130`). `getProfileConnection` (`:173`) combina a
  senha do cache global com a `connection` vindas da setting — se o workspace
  apontar um perfil para outro host, a senha guardada é enviada ao host do
  workspace. É vetor de exfiltração de credencial.
- Não há `capabilities.untrustedWorkspaces`: a extensão conecta mesmo em
  workspace não confiável.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Settings sensíveis com `"scope": "machine"` (não contribuíveis/sobrescrevíveis
  por workspace).
- `capabilities.untrustedWorkspaces.supported: false`.
- Vincular a senha à conexão: invalidar/ignorar senha se a `connection` do
  perfil mudar de host.

**Não-objetivos**
- Criptografia própria (segue `SecretStorage`).
- Remover suporte a `UTPLSQL_CONN` (env é da máquina/usuário).
- Tela de gerenciamento de segredos.

## 4. Requisitos

### RF1 — Escopo machine

Marcar `"scope": "machine"` em:
- `utplsql.connection`
- `utplsql.profiles`
- `utplsql.activeProfile`
- `utplsql.oracleClientLibDir` / `utplsql.oracleClientConfigDir`
- (avaliar) `utplsql.debugger.*`

Settings de comportamento (timeout, organization, codeLens etc.) permanecem
workspace-scoped.

### RF2 — Untrusted workspaces

```jsonc
"capabilities": {
  "untrustedWorkspaces": {
    "supported": false,
    "description": "Perfis de conexão apontam para um banco com senha guardada; a extensão fica desabilitada até o workspace ser confiável."
  }
}
```

### RF3 — Senha amarrada à conexão

- Guardar no `SecretStorage` o par `{ connection, password }` (ou um hash da
  `connection`) e só usar a senha se a `connection` atual do perfil for igual.
- Se divergir, descartar a senha e pedir de novo
  (`utPLSQL: Set Password for Connection`), logando o motivo.

### RF4 — Não logar segredos

- Garantir que `logger`/Output nunca imprimam `connection` com senha
  (revisar `maskConnection`, `parseConnString` e mensagens de erro).

**Não-funcionais**
- RNF1 — Migração transparente de perfis existentes (re-salvar com o novo
  vínculo).
- RNF2 — Sem quebra para quem usa `UTPLSQL_CONN`/`utplsql.connection`.

## 5. Solução proposta

### 5.1 `package.json`

- `scope: machine` nas settings (RF1) + `capabilities` (RF2).

### 5.2 `src/connectionProfiles.ts`

- `persistPassword(id, connection, password)`/`hydrateProfilePasswords`
  comparam a conexão salva com a atual antes de usar a senha (RF3).

### 5.3 `README.md` / `SECURITY.md`

- Seção Security explicando o escopo machine e o untrusted workspace.

## 6. Configuração

- Scope das settings + `capabilities`. Nenhum comando novo.

## 7. Plano de testes

- **Unitários**: `getProfileConnection` usa a senha só quando a conexão bate;
  `hydrateProfilePasswords` ignora senha órfã; migração idempotente.
- **Manual**: `.vscode/settings.json` com `utplsql.profiles`/`activeProfile`
  não sobrescreve o global; workspace não confiável não conecta.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `scope: machine` impede configuração por projeto (intencional) | Documentar; perfis continuam globais. |
| Perfis existentes perdem a senha após a mudança | Migração no `hydrate`/`saveProfiles`; pedir senha só se não bater. |
| Usuário legítimo com workspace que define `utplsql.sourcePath` | Só as settings sensíveis mudam de escopo; o resto continua por projeto. |

## 9. Rollout

- Release 0.14.0 (minor), com nota de segurança no CHANGELOG.
- `CHANGELOG.md`: "Hardening de segurança das settings de conexão".

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- Settings sensíveis não são sobrescrevíveis por workspace.
- Workspace não confiável mantém a extensão desabilitada.
- Nenhuma senha aparece em logs/Output.

## 11. Questões em aberto

- `utplsql.sourcePath`/`coverageOwner` devem ir para machine também? (impacto em
  multi-root; provavelmente não)
- Mensagem i18n nova para o untrusted workspace?

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 Mesma versão (0.14.0): [[prd-47-node-26-toolchain|PRD-47]] · [[prd-75-lazy-test-tree|PRD-75]] · [[prd-76-reporter-export|PRD-76]] · [[prd-80-virtual-db-source|PRD-80]] · [[prd-82-tns-wallet|PRD-82]]
- 🚀 ⬅️ release anterior: [[prd-87-suitepath-results-jump|PRD-87 (0.13.0)]] · ➡️ próxima release: [[prd-50-auto-run-on-save|PRD-50 (0.15.0)]]
<!-- brain:auto:end -->
