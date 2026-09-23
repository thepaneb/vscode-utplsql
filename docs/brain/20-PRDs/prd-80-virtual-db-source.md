---
tipo: prd
id: PRD-80
status: proposed
titulo: "Documento virtual de fonte do banco para falhas e cobertura"
versao: "0.14.0"
data: "2026-09-19"
autor: "Gil Cleber Barboza"
versao_titulo: "0.14.0 — Árvore, relatórios, conectividade e segurança"
verificado: 2026-09-23
tags: [prd]
---

# PRD-80 — Documento virtual de fonte do banco para falhas e cobertura

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-19 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.14.0 |
| Arquivos afetados | `src/dbSourceProvider.ts`, `src/results.ts`, `src/coverage.ts`, `src/viewCoverage.ts`, `src/oracleRunner.ts`, `package.json`, `README.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Depende de | PRD-74 (descoberta DB-first) |

## 1. Resumo

Generalizar o provider `utplsql-db:` para servir a fonte de **qualquer** objeto
do banco (não só o spec do package) e usá-lo como fallback quando não há
arquivo local: abrir a linha exata da falha e a evidência de cobertura em modo
read-only. Sem isso, workspaces cujo código-fonte não está localmente tornam
jump-to-failure e cobertura inúteis. Referência de porte:
`paddi35/utplsql-for-vscode` (`src/workspace/virtualSource.ts`,
`virtualSourcePath.ts`, `sourceLocationIndex.ts`).

## 2. Contexto e problema

- `src/dbSourceProvider.ts` só consulta `type = 'PACKAGE'` (spec) e só é usado
  para suítes descobertas no modo `schema` (URI `utplsql-db:/SCHEMA/PKG.pks`),
  sem posição de linha.
- `resolveStackFrameToUri`/`parseStackFrames` (em `src/results.ts`, conforme
  AGENTS.md) resolvem a falha para um arquivo local; sem arquivo local, o "Go to
  Error" abre um documento virtual vazio/inexistente.
- A cobertura só é anexada quando `resolveSourceUri` (`src/coverage.ts:26`)
  encontra um arquivo físico; sem fontes locais, nada é exibido.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Provider read-only que resolve `<schema>.<objeto>:<linha>` a partir de
  `ALL_SOURCE` para qualquer tipo suportado (package/body, procedure, function,
  trigger, type/type body, view).
- Mapear a falha para a **linha** da exceção quando não houver arquivo local.
- Anexar cobertura a URIs virtuais quando o arquivo não existir.
- Usar a URI virtual também no schema-mode existente (substituindo o provider
  atual).

**Não-objetivos**
- CodeLens/decorações em documentos virtuais (a API do VSCode não os aplica de
  forma confiável; mantém-se ausente).
- Editar/gravar no banco.
- Cache persistente em disco.

## 4. Requisitos

### RF1 — Provider por tipo

`fetchDbSource` passa a aceitar o tipo do objeto ou resolvê-lo via `ALL_OBJECTS`
(`PACKAGE`, `PACKAGE BODY`, `PROCEDURE`, `FUNCTION`, `TRIGGER`, `TYPE`,
`TYPE BODY`, `VIEW`). URI:

```
utplsql-source:/<SCHEMA>/<OBJECT>.<ext>?line=<N>
```

O conteúdo é o texto de `ALL_SOURCE` concatenado (mesma numeração de linhas do
banco, 1-based).

### RF2 — Falha para URI virtual

Em `resolveStackFrameToUri` (`src/results.ts`), quando o frame for de
schema/objeto sem arquivo local, retornar
`{ uri, position: new vscode.Position(line - 1, 0) }` apontando para a URI
virtual. `message.location` (AGENTS.md) continua sendo populado no `report()`.

### RF3 — Cobertura virtual

`applyCoverageFromXml`/`resolveSourceUri` (`src/coverage.ts`): se o objeto não
tem arquivo local, registrar `FileCoverage` sobre a URI virtual e armazenar os
detalhes em `state.setCoverage`. `loadDetailedCoverage` (`src/extension.ts:74`)
já lê do `state`, então funciona sem alteração.

### RF4 — Símbolo e nome

Manter os nomes de pacote/schema em maiúsculas; expor o objeto no provider e um
`parseSourceUri` puro testável (análogo a `parseDbSourceUri`,
`src/dbSourceProvider.ts:19`).

**Não-funcionais**
- RNF1 — Fallback silencioso quando o usuário não tem `SELECT` em
  `ALL_SOURCE`/`DBA_SOURCE` (mensagem amigável no Output).
- RNF2 — Cache em memória por sessão, limpo em `clearDbSourceCache`.
- RNF3 — Nunca sair do workspace para gravação (read-only).

## 5. Solução proposta

### 5.1 `src/dbSourceProvider.ts`

- Renomear/estender para registrar o scheme `utplsql-source` (mantendo
  `utplsql-db` como alias de compatibilidade, se já publicado).
- `parseSourceUri` + `fetchDbObjectSource(uri, deps)` puros quanto a `vscode`
  quando possível.

### 5.2 `src/results.ts`

- Usar o novo provider no fallback de `resolveStackFrameToUri`.

### 5.3 `src/coverage.ts` / `src/viewCoverage.ts`

- Estender `resolveSourceUri` para devolver a URI virtual quando nada for
  encontrado no disco; views via `V$SQL` idem (hoje só anexa arquivos locais,
  `src/viewCoverage.ts:142`).

### 5.4 `package.json` / `README.md`

- Documentar o comportamento "sem fontes locais" e o read-only.

## 6. Configuração

- Nenhuma setting nova; comportamento automático.
- Opcional: `utplsql.discovery.virtualSource` (bool) para desligar, se
  necessário. (avaliar na implementação)

## 7. Plano de testes

- **Unitários**: `parseSourceUri` (tipos, extensões, line); mapeamento de frame
  para URI virtual; fallback quando `ALL_SOURCE` retorna vazio.
- **Integração**: suíte sem `.pks` local → falha abre `utplsql-source:` na
  linha; cobertura aparece nos arquivos virtuais no Test Coverage.
- **Manual**: com e sem `SELECT ANY DICTIONARY`/grants.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Numeração de linha divergir do arquivo local | Só usar URI virtual quando não há arquivo; nunca misturar. |
| `ALL_SOURCE` inacessível em shared install | Mensagem com os grants necessários (já documentados no README). |
| Source muito grande | Reusar o limite de 10k linhas da PRD-43/`discovery.ts`. |
| Conflito com o provider `utplsql-db` existente | Manter alias e deprecar na release seguinte. |

## 9. Rollout

- Release 0.14.0 (minor).
- `CHANGELOG.md`: "Fonte de objetos do banco em read-only para falhas e
  cobertura".

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- Sem arquivos locais, jump-to-failure abre a linha correta no provider.
- Cobertura aparece para objetos sem arquivo local.
- Workspace com arquivos locais mantém o comportamento atual.

## 11. Questões em aberto

- Unificar `utplsql-db:` e o novo scheme ou manter dois?
- Cachear o texto do provider entre runs para reduzir queries?
