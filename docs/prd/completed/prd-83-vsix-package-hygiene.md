<!-- GENERATED FROM docs/brain/20-PRDs/prd-83-vsix-package-hygiene.md — DO NOT EDIT -->

# PRD-83 — Higiene do pacote VSIX: bloquear vazamento de arquivos de desenvolvimento

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-22 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `.vscodeignore`, `package.json`, `docs/prd/index.md`, `CHANGELOG.md` |
| Esforço estimado | 0,5 dia |
| Complexidade | Baixa |

## 1. Resumo

O `.vscodeignore` cobria apenas parte dos artefatos de desenvolvimento, então o
VSIX publicado embarcava skills de IA (`.agents/`, `.kilo/`), workflows do
GitHub, configs de build/lint e o cache local da matriz de bancos
(`docker/`, ~5 MB). Esta PRD bloqueia esses vazamentos, documenta o que
**precisa** permanecer no pacote e adiciona uma verificação para que o problema
não regresse.

## 2. Contexto e problema

Ao inspecionar `vscode-utplsql-0.12.1.vsix` (588 arquivos, ~5 MB) foram
encontrados arquivos que não têm função em runtime:

- `.agents/**` (skills de IA), `.kilo/**` (planos de tooling);
- `.github/**` (workflows `ci.yml`/`publish.yml`/`wiki.yml` + templates);
- `.c8rc`, `.nvmrc`, `biome.json`, `skills-lock.json`, `SECURITY.md`;
- `docker/db-matrix/**` — **5,4 MB**, incluindo `.cache/utplsql-v.3.2.3.zip` e a
  árvore extraída do utPLSQL.

Causa: o `.vscodeignore` só listava `.opencode/**`, `docs/**`, `src/**`,
`out/**`, `scripts/**`, `install/**`, `coverage/**`, etc. Itens novos de
tooling (`.agents`, `.kilo`, `docker`) nunca foram adicionados.

Impactos:

- **Peso e ruído** no Marketplace/VSIX (instalação mais lenta).
- **Exposição indevida** de conteúdo interno de desenvolvimento (workflows,
  planos, credenciais de exemplo).
- Ambiguidade sobre o que é, de fato, necessário no pacote.

> Correção já aplicada na branch `release/v0.13.0` (`.vscodeignore` + bump):
> o VSIX caiu para **167 arquivos / 1,63 MB**. Esta PRD formaliza a mudança e
> evita a regressão.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Garantir que nenhum artefato de desenvolvimento entre no VSIX.
- Documentar explicitamente o que **deve** permanecer no pacote.
- Adicionar uma checagem de sanidade que detecte regressões no CI.

**Não-objetivos**
- Reduzir o `node_modules/oracledb` (funcionalidade thick mode do PRD-70).
- Reescrever o pipeline de publicação (`publish.yml`).
- Migrar para `files` do `package.json` em vez de `.vscodeignore`.

## 4. Requisitos

### RF1 — `.vscodeignore` cobre os artefatos de desenvolvimento

Adicionar ao `.vscodeignore`:

```
.agents/**
.kilo/**
.github/**
docker/**
.env.*
.vscode-test.smoke.mjs
.vscode-test.thick.mjs
.c8rc
.nvmrc
biome.json
skills-lock.json
SECURITY.md
```

### RF2 — Preservar o conteúdo essencial

O VSIX deve continuar contendo, no topo do pacote:

- `package.json`, `readme.md`, `LICENSE.txt`, `changelog.md`, `images/icon.png`;
- `dist/extension.js` (bundle esbuild);
- `package.nls*.json` (i18n da UI por locale);
- `README.<lang>.md` (localização do Marketplace);
- `node_modules/oracledb/**` (driver em `external` no esbuild, inclui as glues
  nativas por plataforma).

### RF3 — Verificação automatizada de vazamento

Adicionar um teste/script que falhe se qualquer caminho proibido aparecer no
pacote gerado. Exemplos de caminhos proibidos: `.agents/`, `.kilo/`, `.github/`,
`docker/`, `src/`, `coverage/`, `.env`.

```text
scripts/check-vsix.cjs  →  npx vsce ls --tree | grep <proibidos>  →  exit 1 se achar
```

### RF4 — Documentação

Registrar a mudança no `CHANGELOG.md` (seção `0.13.0`) e manter o `.vscodeignore`
como fonte de verdade comentada (o que cada grupo ignora e por quê).

**Não-funcionais**
- RNF1 — VSIX universal (`npm run package`) abaixo de 2 MB.
- RNF2 — Nenhum arquivo de desenvolvimento no pacote (`npx vsce ls` sem matches).
- RNF3 — Os pacotes por plataforma (`npm run package:target`) herdam o mesmo
  `.vscodeignore`.

## 5. Solução proposta

### 5.1 `.vscodeignore` reorganizado

Agrupar as regras por finalidade (build, testes, tooling de IA, infra local,
segredos) para que futuras pastas de dev sejam adicionadas no grupo certo.

### 5.2 Guarda no CI

Estender o workflow `.github/workflows/ci.yml` (ou o `publish.yml`) com
`scripts/check-vsix.cjs`, rodando `npx vsce ls` e comparando com uma allowlist de
prefixos. Falha o job se houver caminho fora da allowlist.

### 5.3 `package-target.cjs`

Confirmar que o empacotamento por plataforma usa o mesmo `.vscodeignore`
(`vsce package --target …`) e que o cache `docker/` não é requerido em runtime
(apenas pelos fixtures de integração em `src/test`).

## 6. Configuração

Nenhuma setting/comando novo. Sem `contributes` alterado.

## 7. Plano de testes

- **Unitários**: teste puro para `scripts/check-vsix.cjs` (dado um `vsce ls`,
  detecta/ignora caminhos corretamente).
- **Integração**: gerar `npm run package` e validar a presença dos essenciais
  (RF2) e a ausência dos proibidos (RF3).
- **Validação manual**: abrir o `.vsix` (`unzip -l`) e conferir tamanho/entradas;
  instalar localmente e rodar um teste para confirmar que `oracledb` carrega.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Ignorar algo necessário em runtime | RF2 fixa a allowlist; teste de fumaça instala o VSIX e conecta no Oracle |
| Quebrar pacotes por plataforma | Rodar `npm run package:linux-x64`/`win32-x64` e conferir as glues |
| Nova pasta de dev reintroduz o problema | `check-vsix.cjs` no CI falha o build |

## 9. Rollout

- Release **minor 0.13.0** junto com os demais itens da versão.
- Atualizar `CHANGELOG.md`.
- Sem migration para o usuário (apenas redução do pacote).

## 10. Critérios de aceite

- `.vscodeignore` contém todos os padrões do RF1.
- `npm run package` gera VSIX < 2 MB e `npx vsce ls` não lista `.agents`,
  `.kilo`, `.github`, `docker`, `src`, `coverage` nem `.env`.
- Os essenciais do RF2 estão no pacote.
- `scripts/check-vsix.cjs` roda no CI e falha em caso de regressão.
- `CHANGELOG.md` e `docs/prd/index.md` atualizados.

## 11. Questões em aberto

- A guarda do CI deve viver no `ci.yml` (todo push) ou no `publish.yml`
  (somente release)?
- Vale migrar de `.vscodeignore` para o campo `files` do `package.json` numa
  PRD futura (allowlist positiva em vez de denylist)?
