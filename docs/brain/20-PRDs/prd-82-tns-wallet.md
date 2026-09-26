---
tipo: prd
id: PRD-82
aliases: [PRD-82]
status: proposed
titulo: "Resolução TNS no thin e senha de wallet no SecretStorage"
versao: "0.14.0"
data: "2026-09-19"
autor: "Gil Cleber Barboza"
versao_titulo: "0.14.0 — Árvore, relatórios, conectividade e segurança"
verificado: 2026-09-23
tags: [prd]
---

# PRD-82 — Resolução TNS no thin e senha de wallet no SecretStorage

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-19 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `src/tnsnames.ts` (novo), `src/oracleRunner.ts`, `src/config.ts`, `src/connectionProfiles.ts`, `src/types.ts`, `package.json`, `README.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Permitir usar aliases de `tnsnames.ora` no driver **thin** sem depender da
variável de ambiente `TNS_ADMIN` (setting própria + parse/resolução do alias) e
guardar a senha de wallet em `SecretStorage` em vez de embutida na connection
string. Referência de porte: `paddi35/utplsql-for-vscode`
(`src/db/tnsAdminDir.ts`, `src/db/tnsnames.ts`, `src/db/connections.ts`).

## 2. Contexto e problema

- `utplsql.oracleClientConfigDir` (`package.json:192`) só tem efeito no modo
  `thick`; no thin, um alias TNS só resolve via `TNS_ADMIN` do processo ou
  localidade default — o usuário não tem como apontar o diretório pela extensão.
- Wallet é suportada só via query param na connection string
  (`?wallet_location=...`, README:84), e a senha de wallet vai junto em texto
  plano se o usuário precisar dela. Não há prompt/SecretStorage para wallet.
- O concorrente tem setting de TNS admin com fallback para a extensão Oracle SQL
  Developer e senha de wallet no `SecretStorage`.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Setting `utplsql.connections.tnsAdminPath` que funciona no thin.
- Fluxo de resolução: setting própria → `sqldeveloper.connections.
  tnsConfiguration.path` (somente valor user/machine) → `TNS_ADMIN`.
- Parser puro de `tnsnames.ora` que resolve `alias` para o descriptor, passado
  ao `oracledb` (funciona no thin sem mexer em env).
- Campo `walletLocation` no perfil e comando `utPLSQL: Set Wallet Password for
  Connection` com senha no `SecretStorage`.

**Não-objetivos**
- Substituir a resolução nativa do `node-oracledb` quando o alias já resolve.
- Suportar wallets legados `orapki`/`mkstore` (só `ewallet.pem` do thin).
- TLS mútuo além do que o driver thin já aceita.

## 4. Requisitos

### RF1 — Setting e fallback

`utplsql.connections.tnsAdminPath` (string, default `""`, `scope: machine`).
Resolução:
1. valor da setting;
2. `sqldeveloper.connections.tnsConfiguration.path` **apenas** se definido em
   user/machine (nunca workspace);
3. `process.env.TNS_ADMIN`.

### RF2 — Parser de `tnsnames.ora`

Função pura `resolveTnsAlias(content, alias): string | undefined` (case-
insensitive), lidando com `DESCRIPTION` multilinha e comentários. Se o
connectString não parecer um alias, devolver o valor original (Easy Connect
segue funcionando).

### RF3 — Aplicação no pool

Em `ensurePool` (`src/oracleRunner.ts:63`), se o `connectionString` for um alias
TNS e houver diretório resolvido, passar o descriptor resolvido ao
`createPool`. Cachear o arquivo por diretório (recarrega em mudança de config).

### RF4 — Wallet

- `ConnectionProfile.walletLocation?: string` (`src/types.ts`).
- Comando `utPLSQL: Set Wallet Password for Connection` grava/limpa a senha em
  `SecretStorage` (`utplsql.wallet.<profileId>`).
- `ensurePool` passa `walletLocation` e a senha de wallet ao `createPool`
  quando presentes.

**Não-funcionais**
- RNF1 — Sem setting/alias, comportamento atual inalterado.
- RNF2 — Nunca logar a senha de wallet nem o descriptor completo.
- RNF3 — Paridade nos 24 catálogos i18n para as mensagens novas.

## 5. Solução proposta

### 5.1 `src/tnsnames.ts` (novo, puro)

- `parseTnsnames(content): Map<string, string>` e `resolveTnsAlias(...)`.
- `resolveTnsAdminPath(setting, sqlDevPath, env)` com a precedência do RF1.

### 5.2 `src/oracleRunner.ts`

- Resolver o alias antes de `createPool`; aceitar `walletLocation`/`walletPassword`
  no options e repassar.

### 5.3 `src/connectionProfiles.ts` / `src/config.ts`

- Campo de wallet no perfil, comando e persistência no `SecretStorage`.
- `UtConfig.tnsAdminPath`.

### 5.4 `package.json` / `README.md`

- Setting, comando, tabela de config e seção de conexão/wallet.

## 6. Configuração

- Setting `utplsql.connections.tnsAdminPath` (machine).
- Comando `utPLSQL: Set Wallet Password for Connection`.
- Campo opcional `walletLocation` em `utplsql.profiles`.

## 7. Plano de testes

- **Unitários**: `resolveTnsAlias` (multilinha, comentários, casing, alias
  inexistente); precedência do TNS admin (setting > SQL Dev user > env);
  connectString Easy Connect não é tratada como alias.
- **Integração**: alias de `tnsnames.ora` da fixture conecta no thin; wallet de
  teste (se disponível) sem senha embutida.
- **Manual**: apontar `tnsAdminPath` e rodar um teste; definir/limpar senha de
  wallet.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Parser TNS incorreto para arquivos complexos | Testar com `tnsnames.ora` reais (multilinha, `IFILE`); fallback para o valor original. |
| `walletLocation` só no thin | Documentar; thick continua usando `oracleClientConfigDir`. |
| Segurança do fallback SQL Developer | Ignorar valor vindo de workspace (só user/machine), alinhado à PRD-81. |
| Requer `ewallet.pem` | Mensagem de erro clara se o wallet não tiver o PEM. |

## 9. Rollout

- Release 0.14.0 (minor).
- `CHANGELOG.md`: "Resolução TNS no thin e senha de wallet no SecretStorage".

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- Alias TNS resolve no thin via setting, sem `TNS_ADMIN` global.
- Easy Connect continua funcionando.
- Senha de wallet não fica em `settings.json` nem em logs.
- README/wiki atualizados; `docs:check` verde.

## 11. Questões em aberto

- Detectar automaticamente `tnsnames.ora` ao lado do Instant Client quando
  `oracleClientConfigDir` estiver preenchido?
- Suportar `sqlnet.ora`/`IFILE` no parser ou apenas o `tnsnames.ora` principal?

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-81-security-hardening|PRD-81]]
- 🔗 Mesma versão (0.14.0): [[prd-47-node-26-toolchain|PRD-47]] · [[prd-75-lazy-test-tree|PRD-75]] · [[prd-76-reporter-export|PRD-76]] · [[prd-80-virtual-db-source|PRD-80]] · [[prd-81-security-hardening|PRD-81]]
- 🚀 ⬅️ release anterior: [[prd-87-suitepath-results-jump|PRD-87 (0.13.0)]] · ➡️ próxima release: [[prd-50-auto-run-on-save|PRD-50 (0.15.0)]]
<!-- brain:auto:end -->
