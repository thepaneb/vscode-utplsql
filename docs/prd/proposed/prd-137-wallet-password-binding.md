<!-- GENERATED FROM docs/brain/20-PRDs/prd-137-wallet-password-binding.md — DO NOT EDIT -->

# PRD-137 — Vincular senha da wallet ao connection do perfil

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `src/connectionProfiles.ts`, `src/config.ts`, `src/test/unit/connectionProfiles.test.ts` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-65 (SecretStorage), PRD-81 RF3 (vínculo senha↔conexão), PRD-82 (wallet) |

## 1. Resumo

A senha da wallet Oracle Cloud (`utplsql.wallet.<id>`) é armazenada no SecretStorage
e em cache por `profile.id`, sem vínculo com a `connection` do perfil. Esta PRD
aplica o mesmo padrão de `StoredPassword` (connection-bound) da PRD-81 RF3 à
wallet, descartando a senha quando a conexão do perfil mudar.

## 2. Contexto e problema

- `getWalletPassword`/`setWalletPassword`/`clearWalletPassword` operam apenas por
  `profile.id` (`src/connectionProfiles.ts`).
- Um perfil recriado/importado com o mesmo id, mas apontando para outro host,
  reutilizaria a senha da wallet do perfil anterior — risco de exfiltração
  cruzada (análogo ao que a PRD-81 RF3 resolveu para a senha de conexão).
- `hydrateProfilePasswords` já descarta senhas de conexão quando o vínculo não
  bate; a wallet não passa por essa verificação.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Armazenar a senha da wallet como `{ connection, password }` no SecretStorage.
- Descartar a senha quando `stored.connection !== profile.connection`.
- Migrar formatos legados (string crua) para o novo formato.

**Não-objetivos**
- Alterar a UX de definição de senha da wallet.
- Mudar o local de armazenamento (continua SecretStorage).

## 4. Requisitos

### RF1 — Estrutura vinculada

- Criar `StoredWalletPassword { connection: string; password: string }` análogo a
  `StoredPassword`.
- `setWalletPassword` grava `JSON.stringify({ connection: profile.connection, password })`.
- `getWalletPassword(profileId, connection)` só devolve a senha quando o vínculo
  bate; caso contrário retorna `undefined` e limpa o cache.

### RF2 — Hidratação

- `hydrateProfilePasswords` também hidrata a wallet com a mesma regra de vínculo:
  bate → cache; legado (sem connection) → adota e regrava; não bate → descarta
  com `logger.warn`.

### RF3 — Compatibilidade

- Formato legado (string crua) é tratado como legado e migrado na primeira
  leitura, sem perda de funcionalidade.

**Não-funcionais**
- RNF1 — Nenhuma senha é logada (redact).
- RNF2 — Cobertura ≥ thresholds.

## 5. Solução proposta

- Refatorar `walletCache` para `Map<string, StoredWalletPassword>`.
- Ajustar `mergeProfileConfig` para passar `profile.connection` ao resolver a
  senha da wallet.
- Atualizar testes de `connectionProfiles` para o novo vínculo.

## 6. Configuração

Nenhuma setting nova. Assinatura de `getWalletPassword` muda (passa a receber a
connection) — atualizar call sites em `config.ts`.

## 7. Plano de testes

- **Unitários**: wallet bound bate → retorna; wallet bound não bate → undefined +
  cache limpo; legado → migra e regrava; hidratação descarta quando mudou.
- **Manual**: trocar a connection do perfil e confirmar que a senha da wallet não
  é reaproveitada.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Quebrar call sites de `getWalletPassword` | Busca por todos os usos + `tsc --noEmit` |
| Perda de senha legada em upgrades | Migração automática na hidratação |

## 9. Rollout

- 0.20.0; registrar no CHANGELOG.

## 10. Critérios de aceite

- Wallet password descartada quando a connection do perfil muda.
- Formato legado migrado automaticamente.
- Suíte verde e cobertura ≥ thresholds.

## 11. Questões em aberto

- Expor um comando "Clear wallet password" já existe? Verificar `clearWalletPassword`.

## 12. Impacto no cérebro

Ao concluir, criar/alterar a regra `SEC-011` (ou equivalente) com
`prds: ["PRD-137"]`, `implementacao:` e `testes:`. Enquanto `proposed`,
`regras: []`.

## Impacto nas docs

Superfície listada: CHANGELOG. Atualizar CHANGELOG ao concluir.
