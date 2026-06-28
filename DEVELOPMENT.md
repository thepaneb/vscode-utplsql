# Desenvolvimento e manutenção

Notas internas (build, testes, publicação). **Não vai no `.vsix`** (está no `.vscodeignore`),
então não aparece na página pública do Marketplace.

## Build local

```powershell
npm install
npm run compile
# F5 no VSCode -> abre o Extension Development Host
```

## Empacotar o .vsix

O `@vscode/vsce` é devDependency:

```powershell
npm run package         # gera vscode-utplsql-<versão>.vsix
code --install-extension vscode-utplsql-<versão>.vsix
```

## Publicar no Marketplace

Metadados já prontos no `package.json` (`publisher: paneb`, ícone, repositório).

Pré-requisitos (uma vez): publisher `paneb` em `https://marketplace.visualstudio.com/manage`
e um **Personal Access Token (PAT)** do Azure DevOps com escopo *Marketplace → Manage*.

```powershell
npx vsce login paneb     # pede o PAT uma vez (oculto) e guarda a credencial
npm run publish          # publica a versão atual
npm run publish:patch    # correções seguintes: incrementa o patch e publica
```

Notas:
- Depois do `vsce login`, o `publish` **não pede mais** o PAT. Alternativa CI: variável `VSCE_PAT`.
- A versão publicada é **"queimada"** (não dá para republicar o mesmo número) — use `publish:patch`.
- Distribuição **interna** dispensa Marketplace/PAT: basta o `.vsix` (`code --install-extension`).

## Node.js

- **Usar a extensão pronta:** não precisa de Node (o VSCode embute o runtime).
- **Compilar/testar/empacotar:** precisa de Node 18+ (`tsc`, test runner, `vsce`).
  No Windows: `winget install OpenJS.NodeJS.LTS`.

## Testes

### Unitários (puros — só Node, sem download)

Validam os parsers (`suiteParser`, `junit`, `cobertura`):

```powershell
npm run test:unit        # compila e roda: node --test "out/test/unit/**/*.test.js"
```

### Integração (dentro do VSCode)

Sobem uma instância do VSCode e verificam ativação + comandos (baixa um build de teste):

```powershell
npm run test:integration # config em .vscode-test.mjs
```

Os testes não tocam o banco — a execução real contra o Oracle é validada manualmente
(F5 + um projeto com utPLSQL instalado).

## Ícone

Fonte em `images/icon.svg`; o PNG é gerado com:

```powershell
npm install -D @resvg/resvg-js   # se ainda não estiver instalado
npm run gen-icon                 # gera images/icon.png (128x128)
```
