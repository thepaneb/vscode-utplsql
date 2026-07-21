# Como contribuir

Guia para configurar o ambiente de desenvolvimento e enviar contribuições.

## Pré-requisitos

- **Node.js 20+** (`.nvmrc` aponta para 24; CI testa 20/22/24)
- **npm** (vem com o Node)
- **Git**
- (Opcional) **Oracle Database** + **utPLSQL** para testes de integração

## Setup do ambiente

```bash
# Clone o repositório
git clone https://github.com/thepaneb/vscode-utplsql.git
cd vscode-utplsql

# Instale as dependências
npm install

# Compile o TypeScript
npm run compile
```

## Estrutura do projeto

```
vscode-utplsql/
├── src/
│   ├── extension.ts         ← orquestrador (entry point)
│   ├── runner.ts            ← executeRun + applyResults
│   ├── config.ts            ← leitura de settings + env vars
│   ├── discovery.ts         ← findFiles + parse annotations
│   ├── invocation.ts        ← buildInvocation (launcher/java)
│   ├── cli.ts               ← executa processo CLI
│   ├── suiteParser.ts       ← regex %suite/%test (puro)
│   ├── junit.ts             ← parse XML JUnit (puro)
│   ├── cobertura.ts         ← parse XML Cobertura (puro)
│   ├── cliInfo.ts           ← parse utplsql info (puro)
│   ├── cliReporters.ts      ← parse utplsql reporters (puro)
│   ├── matching.ts          ← filtro URI/pasta (puro)
│   ├── state.ts             ← cache de sessão (puro)
│   ├── types.ts             ← interfaces (type-only)
│   └── test/
│       ├── unit/            ← testes com node --test
│       └── integration/     ← testes com @vscode/test-cli
├── docs/
│   ├── prd/                 ← Product Requirements Documents
│   └── wiki/                ← conteúdo do wiki
├── .github/workflows/       ← CI/CD
├── package.json
├── tsconfig.json
├── biome.json               ← linter + formatter
└── README.md
```

## Comandos

```sh
npm install              # dependências
npm run compile          # tsc → out/
npm run watch            # compilação incremental
npm run lint             # biome check src/
npm run lint:fix         # biome check --write src/
npm run format           # biome format --write src/
npm run test:unit        # compila + lint + node --test out/test/unit/**/*.test.js
npm run test:integration # compila + vscode-test
npm test                 # = test:unit
npm run package          # vsce package → .vsix
```

Rodar um único teste unitário:

```bash
node --test out/test/unit/junit.test.js
node --test --test-name-pattern "duração" out/test/unit/**/*.test.js
```

## Depurando

Pressione **F5** no VSCode (`.vscode/launch.json` configurado) para abrir
uma instância do **Extension Development Host** com a extensão carregada.
Você pode abrir um projeto PL/SQL nessa janela e testar a extensão
interativamente.

![Extension Development Host com view Testing](images/dev-host-testing.png)

## Testes de integração com banco real

Crie um arquivo `.env` na raiz (gitignorado):

```bash
UTPLSQL_CONN=seu_user/senha@//host:1521/service
UTPLSQL_CLI_PATH=/caminho/para/utplsql
UTPLSQL_CLI_HOME=/caminho/para/utplsql-cli
```

Rode:

```bash
npm run test:integration
```

Sem as env vars, os testes com banco (`describeDB`) são automaticamente
pulados.

## Convenções de código

Estilo definido no `biome.json` e aplicado via `npm run lint` + `npm run format`:

- Indent: **2 espaços**
- Line width: **100 caracteres**
- Quotes: **single** (`'`)
- Semicolons: **sempre** (`;`)
- Trailing commas: **sempre** (`,`)
- Linter: preset **recommended**

## Fluxo de contribuição

1. **Fork** o repositório
2. Crie uma **branch**: `git checkout -b feature/minha-mudanca`
3. Faça as alterações seguindo as convenções
4. Rode `npm run lint` e `npm test` — devem passar
5. Commit com mensagem clara
6. Push e abra um **Pull Request** para `main`

### Mensagem de commit

Formato: `<tipo>: <descrição> [(PRD-NN)]`

```
feat: adiciona suporte a reporters dinâmicos (PRD-10)
fix: corrige mapeamento de cobertura para Windows
docs: atualiza seção de troubleshooting
```

Se a mudança conclui um PRD, referencie `Closes #N` no corpo do commit/PR.

## Mantendo o README e wiki

- **Novas settings** → adicione à tabela de configuração do README e à
  página [Configurações](Configurações) do wiki
- **Novos comandos** → adicione à seção Comandos do README e à página
  [Comandos](Comandos) do wiki
- **Novos comportamentos** → se relevante para troubleshooting, adicione à
  página [Troubleshooting](Troubleshooting) do wiki
- **Mudanças de arquitetura** → atualize a página [Arquitetura](Arquitetura)

O wiki é sincronizado automaticamente via workflow ao fazer push na branch
`main` (arquivos em `docs/wiki/`).
