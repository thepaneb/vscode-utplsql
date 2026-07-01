# Contribuindo com o utPLSQL Test Runner

Obrigado por considerar contribuir com o **utPLSQL Test Runner**! Este documento explica como propor mudanças, reportar bugs e enviar pull requests.

Este projeto segue o [Código de Conduta](CODE_OF_CONDUCT.md). Ao participar, espera-se que você o respeite.

## Como posso contribuir?

### Reportando bugs

Antes de abrir uma issue, verifique se ela já não existe na lista de [issues](https://github.com/thepaneb/vscode-utplsql/issues). Ao reportar um bug, inclua:

- **Título claro e descritivo**
- **Passos para reproduzir** o problema
- **Comportamento esperado** vs. **comportamento observado**
- **Configuração relevante** (`utplsql.*` no `settings.json`, modo de invocação `launcher`/`java`)
- **Ambiente**: versão do VSCode, versão do utPLSQL-cli, SO, versão do Oracle/utPLSQL (UT3)
- **Logs** do terminal de testes ou saída do CLI, se possível

### Sugerindo melhorias

Abra uma issue descrevendo:

- O problema que a melhoria resolve
- Como ela funcionaria na prática (ex.: nova setting, novo comando de menu, novo reporter)
- Se afeta a descoberta de testes, execução ou cobertura

### Primeira contribuição de código

Bons pontos de partida:

- Issues marcadas `good first issue` ou `help wanted`
- Melhorias na documentação (README, exemplos de `coverageSourceArgs`)
- Cobertura de casos extras nas convenções de mapeamento (por diretório, prefixo, extensão)

## Configurando o ambiente de desenvolvimento

### Pré-requisitos

- **Node.js** e npm
- **VSCode 1.88+**
- Um banco **Oracle** com o framework **utPLSQL (UT3)** instalado, para testar a extensão de ponta a ponta
- **utPLSQL-cli** + **Java** instalados localmente

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
npm test
```

Os testes usam `@vscode/test-cli` (configurado em `.vscode-test.mjs`).

## Estrutura do projeto

- `src/` — código-fonte TypeScript da extensão
- `scripts/` — scripts auxiliares
- `.vscode/` — configuração de debug/launch para desenvolvimento
- `images/` — ícones e screenshots usados no README
- `package.json` — manifesto da extensão (comandos, settings, ativação)

## Pull Requests

1. Faça um fork e crie sua branch a partir de `main`.
2. Se alterar comportamento configurável, atualize a tabela de **Configuração** no `README.md`.
3. Se adicionar/alterar settings em `package.json`, mantenha as descrições em português, consistentes com o restante do projeto.
4. Rode `npm run compile` e `npm test` antes de abrir o PR.
5. Escreva uma mensagem de commit clara e, se aplicável, referencie a issue relacionada (`Closes #42`).
6. Abra o PR descrevendo o que mudou e por quê. Screenshots são bem-vindos para mudanças de UI (gutters, Test Explorer, Coverage).

### Convenções de commit

- Use o imperativo: "Adiciona suporte a..." em vez de "Adicionado suporte a..."
- Primeira linha com até ~72 caracteres
- Referencie issues/PRs relacionados quando existirem

## Estilo de código

- TypeScript, seguindo o estilo já usado em `src/`
- Evite introduzir dependências novas sem discutir antes em uma issue
- Ao lidar com o modo `launcher` (via `cmd` no Windows) vs. modo `java` (chamada direta à JVM), tenha atenção especial ao escaping de regex e argumentos — é uma fonte comum de bugs sutis

## Processo de revisão

1. Um mantenedor revisará seu PR e pode solicitar ajustes.
2. Após aprovação, o PR é mesclado e entra no próximo `CHANGELOG.md`.
3. Versionamento segue [SemVer](https://semver.org/).

## Dúvidas?

Abra uma issue com a tag `question` ou comente diretamente no PR relacionado.

Obrigado por ajudar a melhorar o utPLSQL Test Runner! 🧪
