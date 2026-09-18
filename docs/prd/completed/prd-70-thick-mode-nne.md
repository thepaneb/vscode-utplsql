# PRD-70 — Thick mode opcional (Instant Client) para bancos com NNE

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-17 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.1 |
| Arquivos afetados | `src/oracleClient.ts` (novo), `src/config.ts`, `src/oracleRunner.ts`, `src/quickfix.ts`, `src/test/unit/oracleClient.test.ts` (novo), `src/test/unit/oracleRunner.test.ts`, `src/test/unit/quickfix.test.ts`, `package.json`, `.vscodeignore`, `README.md` (+ 23 variantes), `docs/wiki/**` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |

## 1. Resumo

Permitir que o usuário **habilite explicitamente** o **thick mode** do
`node-oracledb` (nova setting de modo + caminho do **Oracle Instant Client**) e,
quando habilitado, a extensão chame `oracledb.initOracleClient` antes de qualquer
conexão/pool. Isso viabiliza conexão com bancos que exigem **NNE** (*Native
Network Encryption and Checksumming*), recurso não suportado pelo thin mode.
Como o NNE não está ativo universalmente, o thick é **opt-in**: o default é
`thin` e o comportamento atual permanece idêntico. Esta é a **Opção A** (embutir
as 4 plataformas da glue OCI no VSIX, ~2,5 MB); a migração para VSIXs por
plataforma (**Opção B**) fica como follow-up.

## 2. Contexto e problema

A extensão executa 100% via `node-oracledb` em thin mode (ADR-001, PRD-64). O
thin mode é JS puro, dispensa cliente nativo e teve os binários thick podados do
VSIX (PRD-45, `.vscodeignore:13`). O preço é a perda de funcionalidades que só
existem no thick mode — em particular **NNE**:

> "Node-oracledb Thin mode does not support connections using Oracle Database
> native network encryption or checksumming. [...] If native network encryption
> or checksumming are required, then use node-oracledb in Thick mode."
> — [Appendix A: Thin and Thick Modes](https://node-oracledb.readthedocs.io/en/stable/user_guide/appendix_a.html)

Bancos com NNE habilitado (comum em ambientes corporativos) **não conectam** hoje
em thin mode; o usuário recebe falha de conexão (`NJS-500`/`NJS-532` ou
`ORA-12660`/"encryption or crypto-checksumming parameters"). A única alternativa
documentada é TLS ou thick mode. TLS depende de reconfiguração do servidor/listener
e de wallets — fora do controle do usuário da extensão. Thick mode é a única
saída local.

O thick mode exige:

1. `oracledb.initOracleClient()` chamado **uma vez, antes de qualquer conexão
   ou pool** (hoje a extensão nunca chama).
2. As bibliotecas OCI (**Instant Client**), que não estão no VSIX e precisam ser
   fornecidas pelo usuário.
3. A *glue* do node-oracledb (`node_modules/oracledb/build/Release/oracledb-*.node`),
   hoje **podada** do VSIX.

Verificado no `node_modules/oracledb@7.0.1`: as 4 glues somam 2,5 MB
(`darwin-arm64` 0,53; `linux-arm64` 0,65; `linux-x64` 0,61; `win32-x64` 0,61 MB),
o que torna a Opção A barata.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Nova setting `utplsql.oracleClientMode` (`thin` \| `thick`, default `thin`)
  para **opt-in explícito** ao thick mode — já que o NNE não é universal.
- Nova setting `utplsql.oracleClientLibDir` (string) com o diretório do
  Instant Client; obrigatória quando o modo é `thick`.
- Nova setting opcional `utplsql.oracleClientConfigDir` (string) para
  `TNS_ADMIN`/`configDir` (necessária para o thick ler `sqlnet.ora` com as
  políticas de NNE/checksumming e `tnsnames.ora`).
- Inicialização **idempotente**, segura para chamada concorrente e tolerante a
  thick já inicializado; erros amigáveis (DPI-1047 etc.).
- **Opção A** (validada na 0.12.1): embutir as 4 glues thick no VSIX universal.
- **Opção B**: empacotar **VSIXs por plataforma** (`vsce package --target`),
  embarcando apenas a glue do alvo, publicados por uma matriz no `publish.yml`.
- **Fallback thin-only** para os alvos sem glue (win32-arm64, darwin-x64,
  linux-armhf, alpine-x64/arm64): VSIX sem binário nativo, funcional em thin.
- Diagnósticos de setup e quick-fix apontando o problema/deixando configurar.

**Não-objetivos**
- Thick/NNE nos alvos thin-only (`win32-arm64`, `darwin-x64`, `linux-armhf`,
  `alpine-x64/arm64`) — sem glue pré-compilada e, em vários, sem Instant Client.
  O fallback cobre apenas thin mode. `web` fica fora (node APIs + driver nativo).
- Baixar o Instant Client ou a glue em runtime (rede, integridade, proxy).
- Embutir o Instant Client no VSIX (licenciamento, ~50–180 MB, por plataforma).
- Misturar thin/thick por perfil de conexão — thick é global no processo.
- Modo `auto` (ligar thick só por ter `libDir` preenchido) — descartado em favor
  do opt-in explícito; ver §11.
- Suportar wallets/TLS como alternativa ao NNE.

## 4. Requisitos

### RF1 — Settings de cliente Oracle

```jsonc
"utplsql.oracleClientMode": {
  "type": "string",
  "enum": ["thin", "thick"],
  "enumDescriptions": [
    "Driver thin (padrão): puro JavaScript, sem cliente nativo.",
    "Driver thick: usa o Oracle Instant Client. Necessário para bancos com NNE (Native Network Encryption). Exige oracleClientLibDir e Reload Window."
  ],
  "default": "thin",
  "description": "Modo do driver node-oracledb. Thick é opt-in, pois o NNE não está ativo em todos os bancos."
},
"utplsql.oracleClientLibDir": {
  "type": "string",
  "default": "",
  "description": "Diretório do Oracle Instant Client. Obrigatório quando oracleClientMode = thick. Ex.: C:\\oracle\\instantclient_23_5."
},
"utplsql.oracleClientConfigDir": {
  "type": "string",
  "default": "",
  "description": "Diretório de configuração Oracle (TNS_ADMIN) com sqlnet.ora/tnsnames.ora. Opcional; só tem efeito no thick mode."
}
```

- As três entram em `UtConfig` (`config.ts:8`) e no `readConfig` (`config.ts:69`).
- `oracleClientConfigDir` sem efeito em `thin` (o thin não lê `sqlnet.ora`).

### RF2 — Inicialização idempotente do cliente

Novo módulo `src/oracleClient.ts`:

```typescript
export interface OracleClientResult {
  thick: boolean;
  error?: string;
}

let initState: 'unknown' | 'thin' | 'thick' | 'failed' = 'unknown';

export function resetOracleClientStateForTests(): void;
export function ensureOracleClient(
  oracledb: typeof import('oracledb'),
  mode: 'thin' | 'thick',
  libDir: string,
  configDir: string,
): OracleClientResult;
export function getOracleClientMode(): 'thin' | 'thick' | 'unknown';
```

Regras:
- `mode === 'thin'` ⇒ no-op, mantém thin (comportamento atual/default).
  `libDir`/`configDir` são ignorados.
- `mode === 'thick'` e `libDir` vazio ⇒ **não** inicializa; devolve
  `{ thick: false, error }` e o diagnóstico orienta a preencher a setting
  (ou voltar para `thin`).
- `mode === 'thick'` com `libDir`:
  `oracledb.initOracleClient({ libDir, configDir })`.
- Chamadas seguintes retornam o estado cacheado (nunca re-chamar); a primeira
  chamada "fixa" o modo do processo.
- `DPI-1080` (já inicializado) ⇒ tratar como sucesso thick.
- Falha (ex.: `DPI-1047`) ⇒ cachear `failed` e devolver `{ thick: false, error }`;
  **não** derrubar a extensão — a conexão falhará depois com aviso claro.
- Função síncrona (API do node-oracledb é síncrona) e sem dependência de
  `vscode`, para testabilidade pura.
- Após qualquer conexão criada, não é possível alternar; trocar
  `oracleClientMode` exige reload da janela (documentar).

### RF3 — Chamar a inicialização antes de toda conexão

A extensão cria conexões em vários módulos, cada um com seu `loadOracledb`
(`oracleRunner.ts:387`, `discovery.ts:207`, `debugger.ts:21`, `viewCoverage.ts:69`,
`compilationDiagnostics.ts:36`, `dbSourceProvider.ts:34`, `quickfix.ts:40/142`,
`scriptRunner.ts:542`, `commands/connection.ts:24/65`). Centralizar em
`oracleClient.ts`:

```typescript
export async function loadOracleClient(
  loadMod: () => Promise<typeof import('oracledb') | undefined>,
  cfg: Pick<UtConfig, 'oracleClientMode' | 'oracleClientLibDir' | 'oracleClientConfigDir'>,
): Promise<{ oracledb: typeof import('oracledb'); thick: boolean; error?: string } | undefined>;
```

- Todos os pontos passam a usar esse wrapper (ou chamam `ensureOracleClient`
  logo após o `import('oracledb')`), garantindo que nenhuma conexão nasça antes
  da inicialização.
- No `oracleRunner`, cobrir também `ensurePool` (`oracleRunner.ts:49`) e
  `acquireRunnerConnections` (`oracleRunner.ts:114`), que são os caminhos de pool.

### RF4 — Diagnósticos e feedback

- `setupValidator` (`quickfix.ts`): quando `oracleClientMode = thick` e a init
  falhar (path vazio ou inválido/DPI-1047/arquitetura errada), publicar
  diagnóstico com a mensagem do erro.
- Code action: abrir as settings
  (`workbench.action.openSettings@utplsql.oracleClientMode`).
- `logger.info` no modo efetivo (`thin`/`thick`) na primeira inicialização.
- Mensagens i18n apenas se necessário; se possível usar `logger` para evitar
  quebra de paridade dos 24 catálogos (`i18n.test.ts`).

### RF5 — Empacotamento (Opção A — já implementada na 0.12.1)

- Trocar `.vscodeignore:13` (`node_modules/oracledb/build/**`) por
  `node_modules/oracledb/build/**/*.txt`: inclui as 4 glues thick no VSIX
  (+2,5 MB) e mantém fora os buildinfo `.txt`.
- Confirmar que `esbuild.config.mjs:10` mantém `external: ['oracledb']` (a glue
  é carregada de `node_modules`, não do bundle).
- Validado em banco real com NNE (VSIX universal 0.12.1).

### RF6 — Empacotamento por plataforma (Opção B)

- Novo script `scripts/package-target.cjs <target>` que:
  1. valida o target contra a lista suportada (ver 5.6);
  2. remove de `node_modules/oracledb/build/Release/` as glues que **não**
     correspondem ao alvo (mantém `oracledb-<ver>-<target>.node`; para
     thin-only, remove **todas**);
  3. executa `vsce package --target <target> --out <nome>`, com `prepublish`
     (`compile` + `bundle`) já aplicado.
- `scripts/package-target.cjs` expõe as funções puras `staleGlueFiles`,
  `isGlueTarget` e `isPackageTarget` (seleção das glues a remover) para teste
  unitário sem tocar no disco.
- **Fallback thin-only**: alvos sem glue (`win32-arm64`, `darwin-x64`,
  `linux-armhf`, `alpine-x64/arm64`) geram VSIX sem nenhum `.node` — instalam e
  rodam em thin mode (sem NNE/thick). `web` fica fora.
- `package.json`: scripts `package:win32-x64`/`linux-x64`/`linux-arm64`/
  `darwin-arm64` e o genérico `package:target -- <target>` — além do `package`
  universal atual.
- `.github/workflows/publish.yml`: job `verify` (compile/lint/testes, 1×) +
  job `publish` em **matriz** sobre os 9 targets (4 com glue + 5 thin-only);
  cada job roda `npm run package:target -- <target>` e publica o **artefato
  gerado** com `vsce publish --packagePath` (sem re-empacotar), garantindo que o
  VSIX anexado à release é exatamente o publicado. O VSIX universal deixa de ser
  publicado no Marketplace (`npm run package` continua local).
- `vsce` exige `--target` e `TargetPlatform` no manifesto; a extensão segue
  sendo a mesma versão publicada para múltiplos targets.

**Não-funcionais**
- RNF1 — Com `oracleClientMode = thin` (default), comportamento binário idêntico
  ao atual (thin), inclusive testes.
- RNF2 — Nenhum segredo/log de credenciais; caminhos locais não são logados em
  nível `info` sem necessidade.
- RNF3 — Cobertura TypeScript mantida (thresholds 90/85/90); `oracleClient.ts`
  puro e 100% testável com fake do módulo.
- RNF4 — Opção A: VSIX universal cresce até ~2,5 MB. Opção B: cada VSIX de
  plataforma embarca **apenas** uma glue (~0,6 MB), no máximo 1/4 do overhead.
- RNF5 — Não regredir o carregamento do bundle quando `oracledb` ausente
  (`oracledb-*-absent` tests).

## 5. Solução proposta

### 5.1 Novo `src/oracleClient.ts`

Módulo puro (sem `vscode`), com estado de módulo e reset para testes. Exporta
`ensureOracleClient`, `loadOracleClient` e `getOracleClientMode`. Recebe o módulo
`oracledb` por injeção para permitir fake nos unitários.

### 5.2 Inicialização no ponto de estrangulamento

Na implementação, em vez de refatorar os ~9 `loadOracledb` duplicados, a
inicialização foi centralizada em `ensurePool` (`oracleRunner.ts`), que é o
**único caminho** por onde passam todas as conexões/pools de produção (os
`getConnection` avulsos dos demais módulos são apenas fallback para quando o
pool falha). `ensurePool` chama `ensureOracleClient` de forma síncrona **antes**
de `createPool`, garantindo a invariante "init antes de qualquer conexão" com
mínimo de churn. `ensurePool` já recebe `cfg`, então as três chaves chegam sem
`readConfig()` extra. Os loaders continuam existindo, mas não precisam conhecer
o modo.

### 5.3 `config.ts`

Adicionar `oracleClientMode`, `oracleClientLibDir` e `oracleClientConfigDir` a
`UtConfig` e ao `readConfig` (`c.get<'thin' | 'thick'>('oracleClientMode', 'thin')`
e `c.get<string>(... , '')`).

### 5.4 `package.json` / `.vscodeignore`

Settings em pt-BR (não usam `%nls%`), conforme padrão da tabela em
`package.json:150+`. Em vez de remover a linha de poda do `build/**`, ela passa
a `node_modules/oracledb/build/**/*.txt` (inclui as glues `.node`, exclui os
buildinfo).

### 5.5 Comportamento NNE

Com thick ativo, librar Oracle lê `sqlnet.ora`/`tnsnames.ora` a partir de
`configDir` (ou `TNS_ADMIN`/diretório do cliente). Se o servidor **exige** NNE
(`SQLNET.ENCRYPTION_SERVER=required`), o thick negocia automaticamente; se as
políticas exigirem parâmetros de cliente, `configDir` os fornece. O usuário pode
continuar usando Easy Connect/TNS alias normalmente
(`thickModeDSNPassthrough` default `true` no oracledb 7).

### 5.6 Empacotamento por plataforma (Opção B)

`scripts/package-target.cjs`:

```js
const GLUE_TARGETS = ['win32-x64', 'linux-x64', 'linux-arm64', 'darwin-arm64'];
const THIN_ONLY_TARGETS = ['win32-arm64', 'darwin-x64', 'linux-armhf', 'alpine-x64', 'alpine-arm64'];

// núcleo puro (testável): dado o target e os nomes em build/Release,
// devolve as glues que NÃO pertencem ao alvo (as que devem ser removidas).
// Em alvos thin-only, remove todas as `.node`.
function staleGlueFiles(target, files, version) {
  const nodes = files.filter((f) => f.endsWith('.node'));
  if (!isGlueTarget(target)) return nodes;
  return nodes.filter((f) => f !== `oracledb-${version}-${target}.node`);
}
```

Fluxo do script (impuro): valida o target, lista `build/Release`, remove as
glues de `staleGlueFiles()`, e `vsce package --target <target> --out
vscode-utplsql-<versao>@<target>.vsix` (o `vscode:prepublish` faz compile +
bundle). `node_modules` é descartável e o CI roda cada target em **job isolado**
(com `npm ci` próprio), então não há restauração local.

Alvos com glue (thick+thin, node-oracledb 7.0.1): `win32-x64`, `linux-x64`,
`linux-arm64`, `darwin-arm64`. Alvos **thin-only** (fallback sem binário):
`win32-arm64`, `darwin-x64`, `linux-armhf`, `alpine-x64`, `alpine-arm64`.
`web` fica de fora. O `package` universal continua existindo para teste local.

## 6. Configuração

- `utplsql.oracleClientMode` (`thin` \| `thick`, default `thin`) — opt-in ao
  thick mode.
- `utplsql.oracleClientLibDir` (string, default `""`) — Instant Client;
  obrigatório no modo `thick`.
- `utplsql.oracleClientConfigDir` (string, default `""`) — `TNS_ADMIN` opcional
  (só no thick).
- Nenhum comando/keybinding novo; a mudança de `oracleClientMode` exige
  **Reload Window** (documentar no README/Troubleshooting).
- Novos scripts npm (Opção B): `package:win32-x64`, `package:linux-x64`,
  `package:linux-arm64`, `package:darwin-arm64`. O `package` universal permanece
  para validação local. A publicação passa a ser por matriz no `publish.yml`.

## 7. Plano de testes

- **Unitários** (`src/test/unit/oracleClient.test.ts`):
  - `mode = thin` (com ou sem `libDir`) ⇒ não chama `initOracleClient`.
  - `mode = thick` + `libDir` ⇒ chama uma vez com `{ libDir, configDir }`.
  - `mode = thick` + `libDir` vazio ⇒ `{ thick: false, error }`, sem chamar
    `initOracleClient`.
  - Segunda chamada não re-inicializa (idempotência/concorrência); modo "fixado"
    na primeira chamada.
  - `DPI-1080` ⇒ tratado como thick.
  - `DPI-1047`/outro ⇒ `{ thick: false, error }`, sem lançar.
  - `loadOracleClient` com `import('oracledb')` ausente continua retornando
    `undefined` (não regride o fallback).
  - Opção B: `staleGlueFiles('linux-x64', files)` remove as glues de outras
    plataformas e mantém só `oracledb-<ver>-linux-x64.node`; arquivos `.txt`
    são ignorados; target inválido ⇒ lista vazia de "keep" com erro claro.
- **Integração** (banco real, `UTPLSQL_CONN`, sem NNE no CI):
  - `mode = thick` com Instant Client disponível conecta e executa o runner
    (validar pool + `discoverUtplsqlSchema`).
  - `mode = thin` (default) continua thin.
- **Validação manual** (obrigatória, caso motivador):
  - Contra banco corporativo com NNE `required`: thin falha; thick com
    Instant Client + `configDir` conecta e roda testes/cobertura.
  - Caminho inválido de Instant Client ⇒ diagnóstico amigável (DPI-1047).
  - `npm run package` ⇒ 4 glues presentes no VSIX universal (`vsce ls`).
  - `npm run package:linux-x64` (ou outro alvo) ⇒ **apenas**
    `oracledb-<ver>-linux-x64.node` no VSIX, com `TargetPlatform` no manifesto.
  - `publish.buildVsceArgs(['--packagePath','x.vsix'])` ⇒
    `['publish','--packagePath','x.vsix']` (sem `--target`); `--target` mantido
    como legado.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `libDir` é desaconselhado no Linux (dependentes não resolvidos) | Documentar que no Linux pode ser necessário `ldconfig`/`LD_LIBRARY_PATH` antes do processo; manter `libDir` funcional no Windows/macOS e melhor esforço no Linux. |
| Arquitetura do Instant Client ≠ Extension Host (x64/arm64) ⇒ DPI-1047 | Mensagem clara com a arquitetura esperada; diagnóstico no setup. |
| Thick é global: não dá para alternar em runtime | Documentar Reload Window; `initOracleClient` idempotente; aviso no log ao mudar setting. |
| Usuário preenche `libDir` mas esquece de mudar o modo para `thick` | Diagnóstico informativo quando `libDir` está preenchido e o modo é `thin` ("preencha e mude oracleClientMode"); descrição das settings deixa o requisito explícito. |
| Opção A: VSIX +2,5 MB com glues de plataformas não usadas | Aceito como etapa de validação (0.12.1); Opção B embarca só a glue do alvo (RF6). |
| Opção B: `vsce package --target` exige job isolado por alvo | Matriz no `publish.yml` com `npm ci` por job; prune só afeta `node_modules` descartável. |
| Opção B: usuário em target sem glue (`win32-arm64`, `darwin-x64`, `alpine-*`) | Fallback **thin-only**: VSIX publicado sem `.node`, instala e roda em thin mode (sem NNE). `web` segue fora. |
| Glue thick exigir ABI específica do Node do Extension Host | node-oracledb usa N-API (ABI estável); validar no F5/`package`. |
| Init rodar antes de `oracledb` existir | `loadOracleClient` só inicializa depois do import bem-sucedido; ausência mantém comportamento atual. |
| Regressão no thin (default) | Cenário default sem setting testado em unitários e integração. |

## 9. Rollout

- **Opção A + B** — entregues na **0.12.1** (patch): Opção A (VSIX universal com
  as 4 glues) validada antes contra banco real com NNE; Opção B (publicação por
  matriz de plataformas) + fallback thin-only para os alvos sem glue.
- Sem feature flag: default (`oracleClientMode = thin`) inalterado.
- Atualizar README (tabela de config + Troubleshooting NNE), variantes de idioma
  e wiki (skill `docs-fidelity`); registrar `CHANGELOG.md`.
- Sem migração de dados/settings.

## 10. Critérios de aceite

- `npm run compile`, `npm run lint`, `npm run test:unit` e `npm run test:coverage`
  passam (thresholds mantidos).
- `oracleClientMode = thin` (default) ⇒ execução Oracle continua funcionando em
  thin, mesmo com `oracleClientLibDir` preenchido (unitários + integração
  existentes verdes).
- `oracleClientMode = thick` + `libDir` válido ⇒ `getOracleClientMode() ===
  'thick'` e a conexão usa thick.
- `oracleClientMode = thick` sem `libDir` ⇒ erro amigável, sem quebrar a
  extensão.
- `initOracleClient` é chamado no máximo **uma vez** por processo, sempre antes
  de qualquer pool/conexão.
- `npm run package` universal inclui as 4 glues `oracledb-7.0.1-*.node`.
- `npm run package:target -- <target>` gera VSIX com `TargetPlatform` correto:
  alvos com glue contêm **apenas** a glue do alvo; thin-only contêm **nenhum**
  `.node`. `publish.yml` publica um VSIX por alvo.
- Cenário NNE `required` validado manualmente contra banco real (Opção A, 0.12.1).
- `npm run docs:check` e `npm run brain:sync && npm run brain:check` verdes.

## 11. Questões em aberto

- **Thick nos alvos thin-only** — exigiria compilar a glue do node-oracledb para
  a ABI/arquitetura e ter Instant Client compatível (hoje inexistentes). Fora de
  escopo; o fallback garante ao menos thin.
- **Modo `auto` (`thin` \| `thick` \| `auto`)** — descartado por ora para manter
  o opt-in explícito. Se houver demanda, `auto` ligaria thick quando
  `oracleClientLibDir` estivesse preenchido.
- Auto-detectar Instant Client (paths comuns / `ORACLE_HOME`) no modo `thick`
  quando `libDir` estiver vazio, ou exigir configuração explícita? (Inclinação
  atual: explícito.)
- No Linux, aceitar `libDir` mesmo com o aviso da doc, ou documentar apenas
  `ldconfig`/`LD_LIBRARY_PATH`? Depende de teste real em host Linux.
- Expor um comando "Testar conexão (thick)" na paleta para validar
  Instant Client/NNE sem precisar rodar uma suíte.
