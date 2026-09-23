# Contribuindo com o utPLSQL Test Runner

Obrigado por considerar contribuir com o **utPLSQL Test Runner**! Este documento explica como propor mudanças, reportar bugs e enviar pull requests.

Este projeto segue o [Código de Conduta](CODE_OF_CONDUCT.md). Ao participar, espera-se que você o respeite.

## Como posso contribuir?

### Reportando bugs

Antes de abrir uma issue, verifique se ela já não existe na lista de [issues](https://github.com/thepaneb/vscode-utplsql/issues). Ao reportar um bug, inclua:

- **Título claro e descritivo**
- **Passos para reproduzir** o problema
- **Comportamento esperado** vs. **comportamento observado**
- **Configuração relevante** (`utplsql.*` no `settings.json`)
- **Ambiente**: versão do VSCode, SO, versão do Oracle e do utPLSQL (UT3)
- **Logs** do terminal de testes, se possível

### Sugerindo melhorias

Abra uma issue descrevendo:

- O problema que a melhoria resolve
- Como ela funcionaria na prática (ex.: nova setting, novo comando de menu, novo reporter)
- Se afeta a descoberta de testes, execução ou cobertura

### Primeira contribuição de código

Bons pontos de partida:

- Issues marcadas `good first issue` ou `help wanted`
- Melhorias na documentação (README, wiki, exemplos)
- Cobertura de casos extras nas convenções de mapeamento (por diretório, prefixo, extensão)

## Configurando o ambiente de desenvolvimento

### Pré-requisitos

- **Node.js** e npm
- **VSCode 1.88+**
- Um banco **Oracle** com o framework **utPLSQL (UT3)** instalado, para testar a extensão de ponta a ponta
- **Docker** (opcional) para a matriz de versões (`npm run db:matrix`)

### Passos

```bash
# Clone seu fork
git clone https://github.com/seu-usuario/vscode-utplsql.git
cd vscode-utplsql

# Instale as dependências
npm install

# Compile o TypeScript
npm run compile
```

Para testar a extensão em modo desenvolvimento, abra o projeto no VSCode e pressione `F5` para iniciar uma janela de Extension Development Host.

### Rodando os testes

```bash
npm test              # unitários + lint (rápido, sem banco)
npm run test:coverage # unitários com thresholds de cobertura
```

Os unitários usam `node --test`; os de integração usam `@vscode/test-cli`
(`.vscode-test.mjs`).

### Testes de integração

Rodam contra um Oracle real e são habilitados pela env `UTPLSQL_CONN` (sem ela,
viram `describe.skip`):

```bash
export UTPLSQL_CONN='UT3/senha@//localhost:1521/freepdb1'
npm run test:integration        # suíte completa
npm run test:integration:smoke  # subconjunto rápido (capacidades + DBMS_DEBUG)
```

> No WSL, como o `node` é o binário do Windows, a variável precisa atravessar
> via `WSLENV`: `export WSLENV="UTPLSQL_CONN${WSLENV:+:$WSLENV}"`. O
> `npm run db:matrix` já faz isso.

### Matriz de bancos (local, várias versões)

Para validar contra várias versões do Oracle sem depender de um banco fixo:

```bash
npm run db:matrix:list                 # lista as versões da matriz
npm run db:matrix                      # roda a matriz inteira (uma versão por vez)
npm run db:matrix -- --only 21xe       # só uma versão
npm run db:matrix -- --smoke           # subconjunto rápido por versão
npm run db:matrix -- --thick           # thick mode (Instant Client) por versão
npm run db:matrix -- --skip-bootstrap  # volume já preparado: pula o utPLSQL/fixtures
npm run db:matrix -- --clean           # apaga o volume e recria o banco do zero
npm run db:matrix -- --keep-db --only 23free  # não derruba o container no fim
```

O orquestrador (`scripts/db-matrix/run.sh`) baixa a imagem, sobe o container,
espera o PDB abrir, instala o utPLSQL + grants + schemas/fixtures e roda os
testes; no fim derruba o container, **preservando o volume de dados**.

**Persistência:** cada versão tem seu volume nomeado
(`utplsql-dbmatrix-<label>`, montado em `/opt/oracle/oradata`). A **1ª** run cria
o banco (~15–25 min para 18c/19c); as seguintes sobem do volume em ~1–2 min. Use
`--skip-bootstrap` quando o volume já estiver preparado (pula o reinstall do
utPLSQL) e `--clean` para apagar o volume e recomeçar do zero. Requisitos:
Docker e, para as imagens `database/enterprise`,
`ORACLE_AUTH_USER`/`ORACLE_AUTH_TOKEN` em `.env.dbmatrix` (veja
`.env.dbmatrix.example`). O CI **não** roda a matriz — ela é local e manual.
A versão alvo e os detalhes estão na PRD-72.

### Thick mode (Instant Client)

Opcional e local. A inicialização do thick é **global e irreversível** no
processo do extension host, então roda em host isolado (workspace sem `.pks`,
para a extensão não auto-ativar e criar uma conexão thin antes — NJS-118):

```bash
# aponte para um Oracle Instant Client (Basic/Basic Light) da sua máquina
export ORACLE_CLIENT_LIB_DIR='C:\oracle\instantclient_23_0'
npm run test:integration:thick
```

Na matriz: `npm run db:matrix -- --thick` (ou `--only <versão> --thick`).
Sem `ORACLE_CLIENT_LIB_DIR`, o `thickMode.test.ts` fica `skip`.

## Estrutura do projeto

- `src/` — código-fonte TypeScript da extensão
- `scripts/` — scripts auxiliares
- `.vscode/` — configuração de debug/launch para desenvolvimento
- `docs/brain/` — **second brain** (vault Obsidian): fonte da verdade do texto humano
- `docs/functional/`, `docs/wiki/`, `docs/prd/`, `README*.md` — **gerados** do vault (`npm run brain:build`); não edite à mão
- `images/` — ícones e screenshots usados no README
- `package.json` — manifesto da extensão (comandos, settings, ativação)

## Documentação

O texto humano é editado no vault (`docs/brain/`) e os artefatos do repo são
gerados a partir dele:

```sh
npm run brain:sync    # fatos do código -> vault (stack, deps, contagens)
npm run brain:build   # vault -> repo (README*, docs/wiki, docs/functional, docs/prd)
npm run docs:check    # consistência + fidelidade código<->docs (roda no CI)
```

- README e variantes: nota `60-README/README (extensão)` no vault.
- Wiki: notas em `70-Wiki/` (publicadas pelo workflow `wiki.yml`).
- PRDs: notas em `20-PRDs/` (status no frontmatter) — ver a skill `prd-workflow`.

## Pull Requests

1. Faça um fork e crie sua branch a partir de `main`.
2. Se alterar comportamento configurável, atualize a nota `60-README/README (extensão)`
   no vault e rode `npm run brain:build` (a tabela de **Configuração** do `README.md` é gerada).
3. Se adicionar/alterar settings em `package.json`, mantenha as descrições em português, consistentes com o restante do projeto.
4. Rode `npm run compile` e `npm test` antes de abrir o PR. Rode `npm run brain:ci` se mexeu em documentação.
5. Escreva uma mensagem de commit clara e, se aplicável, referencie a issue relacionada (`Closes #42`).
6. Abra o PR descrevendo o que mudou e por quê. Screenshots são bem-vindos para mudanças de UI (gutters, Test Explorer, Coverage).

### Convenções de commit

- Use o imperativo: "Adiciona suporte a..." em vez de "Adicionado suporte a..."
- Primeira linha com até ~72 caracteres
- Referencie issues/PRs relacionados quando existirem

## Estilo de código

- TypeScript, seguindo o estilo já usado em `src/`
- Evite introduzir dependências novas sem discutir antes em uma issue
- A execução é **Oracle direto** (node-oracledb, thin por padrão; thick é opt-in)
  — mudanças em `oracleRunner.ts`/`discovery.ts` devem considerar as duas versões
  do driver e o shared install (`ALL_SYNONYMS`)

## Processo de revisão

1. Um mantenedor revisará seu PR e pode solicitar ajustes.
2. Após aprovação, o PR é mesclado e entra no próximo `CHANGELOG.md`.
3. Versionamento segue [SemVer](https://semver.org/).

## Dúvidas?

Abra uma issue com a tag `question` ou comente diretamente no PR relacionado.

Obrigado por ajudar a melhorar o utPLSQL Test Runner! 🧪
