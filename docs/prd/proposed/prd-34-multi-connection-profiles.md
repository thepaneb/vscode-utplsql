# PRD-34 — Multi-Connection Profiles

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 1.0.0 |
| Arquivos afetados | `src/config.ts`, `src/connectionProfiles.ts` (novo), `src/extension.ts`, `src/runner.ts`, `src/state.ts`, `package.json` |

## 1. Resumo

Permitir que o usuário salve múltiplos perfis de conexão Oracle e alterne
entre eles rapidamente (ex.: DEV, TEST, PROD), sem precisar reconfigurar a
string de conexão a cada troca de ambiente. Tanto dbFlux (schema-based)
quanto Nexo SQL Studio (Connection Groups) oferecem variações de suporte
a múltiplas conexões — o vscode-utplsql atual suporta apenas uma conexão
por workspace.

## 2. Contexto e problema

O fluxo de trabalho típico de um desenvolvedor Oracle envolve pelo menos
dois ambientes:
1. **DEV**: desenvolvimento local, testes rápidos
2. **TEST/CI**: ambiente compartilhado, integração contínua

Atualmente, para trocar de ambiente, o usuário precisa:
1. Alterar a setting `utplsql.connection` (ou env var `UTPLSQL_CONN`)
2. Ou: limpar a conexão da sessão (`utplsql.clearConnection`) e reconfigurar
3. Recarregar a janela para aplicar mudanças de settings

dbFlux resolve isso associando schemas a pastas no projeto
(`db/<schema>/tests/`). Nexo SQL Studio tem "Connection Groups" que permitem
salvar e selecionar conexões de forma visual.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Salvar múltiplos perfis de conexão com nome amigável
- Alternar entre perfis via seletor na status bar, QuickPick ou command palette
- Associar perfis a schemas específicos (sourcePath, coverageOwner por perfil)
- Sincronizar com SQL Developer connections (import)
- Comando `utplsql.switchProfile` e `utplsql.manageProfiles`

**Não-objetivos**
- Sincronização de perfis entre máquinas (cloud sync)
- Perfis com diferentes modos de invocação (launcher vs java) — mas permitir
  customização por perfil
- Execução simultânea em múltiplos ambientes (uma execução por vez)
- Substituir `utplsql.connection` — perfis complementam, não substituem

## 4. Requisitos

### RF1 — Estrutura do perfil de conexão

```typescript
// src/types.ts
interface ConnectionProfile {
  id: string;                       // UUID
  name: string;                     // "DEV Local", "TEST CI", "PROD Readonly"
  connection: string;               // user/pass@host:port/service
  sourcePath?: string;              // sobrescreve utplsql.sourcePath
  coverageOwner?: string;           // sobrescreve utplsql.coverageOwner
  coverageSourceArgs?: string[];    // sobrescreve utplsql.coverageSourceArgs
  includePatterns?: string[];       // sobrescreve utplsql.includePatterns
  invocation?: 'launcher' | 'java'; // sobrescreve utplsql.invocation
  cliPath?: string;                 // sobrescreve utplsql.cliPath
  cliHome?: string;                 // sobrescreve utplsql.cliHome
  javaPath?: string;                // sobrescreve utplsql.javaPath
  extraRunArgs?: string[];          // sobrescreve utplsql.extraRunArgs
  isDefault?: boolean;              // perfil ativo ao carregar o workspace
  lastUsed?: string;                // ISO timestamp
}
```

### RF2 — Settings

```json
"utplsql.profiles": {
  "type": "array",
  "default": [],
  "description": "Saved connection profiles for quick switching between environments.",
  "items": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "connection": { "type": "string" },
      "sourcePath": { "type": "string" },
      "coverageOwner": { "type": "string" },
      "coverageSourceArgs": { "type": "array", "items": { "type": "string" } },
      "includePatterns": { "type": "array", "items": { "type": "string" } },
      "invocation": { "type": "string", "enum": ["launcher", "java"] },
      "cliPath": { "type": "string" },
      "cliHome": { "type": "string" },
      "javaPath": { "type": "string" },
      "extraRunArgs": { "type": "array", "items": { "type": "string" } },
      "isDefault": { "type": "boolean" }
    },
    "required": ["name", "connection"]
  }
},
"utplsql.activeProfile": {
  "type": "string",
  "default": "",
  "description": "ID of the active connection profile. Overrides utplsql.connection when set."
}
```

### RF3 — Seletor de perfil na status bar

Estender PRD-25 (Status Bar) para mostrar o perfil ativo:

```typescript
// statusBar.ts
showProfile(profileName: string) {
  // Exibe: "$(database) DEV Local" na status bar
  // Clique → QuickPick para selecionar perfil
  // Se não houver perfil ativo: "$(database) Connection"
}
```

### RF4 — QuickPick de perfis

```typescript
// src/connectionProfiles.ts (novo)
async function selectProfile(profiles: ConnectionProfile[]): Promise<ConnectionProfile | undefined> {
  const items = profiles.map(p => ({
    label: p.name,
    description: maskConnection(p.connection),  // user@host:port/service (sem senha)
    detail: p.isDefault ? 'Default' : undefined,
    profile: p,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a connection profile',
    matchOnDescription: true,
  });

  return selected?.profile;
}
```

### RF5 — Resolução de conexão com perfil ativo

```typescript
// src/config.ts — resolveConnection()
function resolveConnection(config: vscode.WorkspaceConfiguration, state: TestStateManager): string {
  const activeProfileId = config.get<string>('activeProfile');
  if (activeProfileId) {
    const profiles = config.get<ConnectionProfile[]>('profiles') || [];
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    if (activeProfile) {
      return activeProfile.connection;
    }
  }

  // Fallback: comportamento atual
  const setting = config.get<string>('connection');
  if (setting) return setting;
  // ... env var, prompt ...
}
```

### RF6 — Import de SQL Developer connections

```typescript
async function importFromSqlDeveloper(): Promise<ConnectionProfile[]> {
  // SQL Developer connections são XML em:
  // ~/.sqldeveloper/system<version>/o.jdeveloper.db.connection/connections.xml
  // ou
  // %APPDATA%\SQL Developer\system<version>\...

  const connectionsPath = findSqlDevConnectionsPath();
  if (!connectionsPath) return [];

  const xml = await fs.readFile(connectionsPath, 'utf-8');
  const connections = parseSqlDevConnections(xml);

  return connections.map(c => ({
    id: generateId(),
    name: c.name,
    connection: `${c.user}/${c.password}@${c.host}:${c.port}/${c.service}`,
  }));
}
```

### RF7 — Comandos

| Comando | Descrição |
|---|---|
| `utplsql.switchProfile` | QuickPick para selecionar perfil |
| `utplsql.manageProfiles` | Abre settings.json na seção `utplsql.profiles` |
| `utplsql.importSqlDevConnections` | Importa conexões do SQL Developer |
| `utplsql.newProfile` | Wizard para criar novo perfil |

**Não-funcionais**
- RNF1 — Senhas em perfis são armazenadas em settings.json (VSCode não oferece
  secret storage para extensions ainda). Recomendar env var para produção.
- RNF2 — Troca de perfil não requer reload da extensão (ao contrário de trocar
  `utplsql.connection` diretamente).
- RNF3 — Máscara de conexão no QuickPick esconde a senha.

## 5. Solução proposta

### 5.1 `src/connectionProfiles.ts`

Novo módulo vscode-dependente contendo:
- `selectProfile()` — QuickPick UI
- `getActiveProfile()` — retorna o perfil ativo ou undefined
- `importFromSqlDeveloper()` — import de conexões SQL Developer
- `resolveConfig()` — merge de perfil ativo com settings globais

### 5.2 Merge de configuração

Configurações definidas no perfil **sobrescrevem** as globais. Se não definidas,
herdam da configuração global:

```typescript
function resolveConfig(profile?: ConnectionProfile): UtplsqlConfig {
  const global = getGlobalConfig();
  if (!profile) return global;

  return {
    connection: profile.connection || global.connection,
    sourcePath: profile.sourcePath || global.sourcePath,
    coverageOwner: profile.coverageOwner || global.coverageOwner,
    // ... demais settings
  };
}
```

### 5.3 Status bar + PRD-25

O status bar (PRD-25) mostra:
```
$(database) DEV Local: $(testing-passed) 12/15 2.3s
```

Sem perfil ativo, mostra a conexão atual (comportamento legacy):
```
$(database) user@host: $(testing-passed) 12/15 2.3s
```

### 5.4 Import SQL Developer

Parse do XML de conexões do SQL Developer:
```xml
<Reference name="DEV" className="oracle.jdeveloper.db.adapter.DatabaseProvider"
           userName="scott" password="tiger">
  <StringRefAddr addrType="hostname">localhost</StringRefAddr>
  <StringRefAddr addrType="port">1521</StringRefAddr>
  <StringRefAddr addrType="serviceName">XEPDB1</StringRefAddr>
</Reference>
```

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.profiles` | array | `[]` | Perfis de conexão salvos |
| `utplsql.activeProfile` | string | `""` | ID do perfil ativo |

### Commands

| Comando | Título |
|---|---|
| `utplsql.switchProfile` | utPLSQL: Switch Connection Profile... |
| `utplsql.manageProfiles` | utPLSQL: Manage Connection Profiles |
| `utplsql.importSqlDevConnections` | utPLSQL: Import SQL Developer Connections |
| `utplsql.newProfile` | utPLSQL: New Connection Profile... |

## 7. Plano de testes

- **Unitários** (`src/test/unit/connectionProfiles.test.ts`):
  - `resolveConfig` com perfil: sobrescreve connection, mantém resto do global
  - `resolveConfig` sem perfil: retorna config global
  - `maskConnection`: `"scott/tiger@localhost:1521/XE"` → `"scott@localhost:1521/XE"`
  - `parseSqlDevConnections`: XML válido → array de perfis
  - `parseSqlDevConnections`: XML inválido → array vazio
- **Integração**:
  - Criar dois perfis → alternar via QuickPick → conexão correta usada
  - Status bar mostra nome do perfil ativo
  - Executar testes com perfil A → usa connection de A
  - Trocar para perfil B → execução usa connection de B
- **Manual**:
  - Importar do SQL Developer → perfis listados
  - Perfil sem `sourcePath` → usa setting global
  - Senha mascarada no QuickPick

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Senhas em settings.json são texto plano | Documentar recomendação de usar env var referenciada (`${env:UTPLSQL_CONN}`) ou VSCode secret storage quando disponível |
| Migração de usuários com `utplsql.connection` configurado | `activeProfile` vazio → usa `utplsql.connection` (fallback); sem quebra |
| XML do SQL Developer muda formato entre versões | Parser flexível; fallback para array vazio em caso de erro |
| Perfis com conexões inválidas quebram a execução silenciosamente | PRD-32 valida conexão ao selecionar perfil |
| Múltiplos perfis no mesmo workspace podem confundir cobertura | `coverageOwner` por perfil resolve; isolar cobertura por ambiente |

## 9. Rollout

- Release 1.0.0 (major) — nova funcionalidade estrutural
- Sem quebra: `activeProfile` vazio mantém comportamento atual
- CHANGELOG: "Connection profiles: salve e alterne entre múltiplas conexões
  Oracle com configurações por perfil"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- Perfis salvos em `utplsql.profiles` são carregados ao iniciar
- QuickPick mostra perfis com nome e conexão mascarada
- Alternar perfil → próxima execução usa a conexão do perfil
- Status bar mostra perfil ativo
- Perfil sobrescreve configurações globais corretamente
- Sem perfil ativo → usa `utplsql.connection` (comportamento atual)
- Import SQL Developer → perfis criados

## 11. Questões em aberto

- VSCode Secret Storage API (`vscode.SecretStorage`) para senhas?
  — Disponibilizada recentemente no VSCode; investigar viabilidade.
  Idealmente senhas ficariam no Secret Storage, não em settings.json.
- Sincronização de perfis via Settings Sync?
  — VSCode já sincroniza settings.json; usuário decide se quer sincronizar
  (pode expor senhas).
- Perfis por workspace folder (multi-root)?
  — Cada folder pode ter seu próprio perfil ativo; complexidade adicional.
  Recomendação: perfil único por workspace, suficiente para MVP.
- Suporte a TNS aliases?
  — `connection` aceita qualquer formato que `oracledb` ou CLI aceitem,
  incluindo TNS.
