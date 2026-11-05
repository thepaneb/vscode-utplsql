---
tipo: prd
id: PRD-147
aliases: [PRD-147]
status: proposed
titulo: "Marketplace: superfície dedicada, screenshots e metadata de conversão"
versao: "0.20.0"
data: "2026-11-05"
autor: "Gil Cleber Barboza"
verificado: "2026-11-05"
regras: []
docs: ["CHANGELOG", "MARKETPLACE.md"]
tags: [prd, marketplace, docs, distribution, ux]
---

# PRD-147 — Marketplace: superfície dedicada, screenshots e metadata de conversão

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-11-05 |
| Componente | Distribuição (Marketplace) + documentação gerada |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `docs/brain/60-README/` (nota nova), `MARKETPLACE.md` (gerado), `package.json`, `scripts/package-target.cjs`, `.vscodeignore`, `scripts/docs-check.cjs`, `scripts/docs-fidelity.cjs`, `src/test/unit/docsFidelity.test.ts`, `CHANGELOG.md`, `.opencode/skills/release/SKILL.md` |
| Esforço estimado | 2–3 dias (inclui captura/otimização das imagens) |
| Complexidade | Média |
| Relaciona-se a | PRD-91 (paridade dos READMEs), PRD-98 (anti-drift), PRD-122 (confiança/privacidade), PRD-83 (higiene do VSIX), PRD-141 (onboarding) |

## 1. Resumo

Criar uma **superfície dedicada do Marketplace** (`MARKETPLACE.md`) gerada a
partir do vault e empacotada no VSIX com `vsce --readme-path`, mantendo o
`README.md` do GitHub como referência completa e os 23 READMEs localizados como
estão. A página passa a ser de conversão — hero, screenshot/GIF, quick start,
“por que usar”, compatibilidade, troubleshooting e links — em vez de um manual de
5.873 palavras. A PRD também alinha metadata de busca, o histórico de versões
recente (hoje em PT-BR) e adiciona gates de CI para impedir drift entre a página
do Marketplace, o código e o restante da documentação.

## 2. Contexto e problema

### 2.1 Estado atual da listagem

Em 2026-11-05, a listagem `paneb.vscode-utplsql` (0.19.0) tinha **69 instalações**,
**1 avaliação (5,0)** e **1.840 downloads** no contador do Marketplace. Nas
consultas à API de busca, a extensão aparece em **1º** para `utplsql`, mas **não
aparece no top 30** para `plsql`, `oracle`, `coverage`, `oracle plsql` ou
`plsql test`. Parte disso é o baixo volume de instalações (ranking); parte é
metadata (nome, tags e categorias).

### 2.2 O README único serve dois trabalhos diferentes

O `README.md` é gerado de `docs/brain/60-README/README (extensão).md` e é usado
tanto no GitHub quanto na página do Marketplace. Hoje ele tem:

- **5.873 palavras**, 37 bullets de features e 60 settings;
- **duas tabelas de comandos** (a gerada com 37 IDs e a manual com 36);
- **11 badges** e **24 links de idioma** antes do primeiro parágrafo de valor;
- **nenhuma screenshot do produto** (só o ícone; as imagens de
  `docs/linkedin/` são cards de texto).

Isso é adequado para um README de referência no GitHub, mas não para a primeira
dobra de uma página de Marketplace. Os dois públicos querem coisas diferentes:

| Superfície | Trabalho principal |
|---|---|
| GitHub `README.md` | Referência completa, variantes de idioma, contribuição, detalhes |
| Marketplace | Decidir instalar em poucos segundos; ver o produto; quick start |

### 2.3 A separação é tecnicamente barata — com uma armadilha de nome

O `vsce` instalado suporta `--readme-path <path>` (confirmado no `vsce package
--help`), então o VSIX pode embarcar um README diferente do `README.md` do
repositório sem duplicar o pacote.

**Armadilha:** não nomear o arquivo de `README.marketplace.md`. Os scripts
`docs-check.cjs` e `docs-fidelity.cjs` tratam qualquer `README.<sufixo>.md` como
**variante de locale** (`listReadmeVariants`, paridade de settings, badges
semânticos). O nome correto é **`MARKETPLACE.md`** na raiz, que não colide com
essas regras e deixa claro que é uma superfície, não um idioma.

### 2.4 Vazamentos de PT-BR e histórico de versões

A página é em inglês, mas há resíduos em português:

- `README.md:256` e `src/testTree.ts:125`: o grupo de suites sem tag aparece como
  `"(sem tag)"` **hardcoded**, mesmo com a UI em inglês. Isso contraria a
  promessa de “24 UI languages”.
- `README.md:450`: o log citado é `[info] Reporter adicional da sessão`; a
  mensagem em inglês é `[info] Additional session reporter: {name}`.
- `CHANGELOG.md`: as entradas 0.19.0 e 0.18.0 estão em PT-BR; 0.17.x está em
  inglês. O Marketplace usa o CHANGELOG como “Version History”.

### 2.5 Relação com PRDs existentes

- **PRD-91** parte da premissa de que “o `README.md` gerado é a fonte exibida pelo
  Marketplace”. Esta PRD **muda essa premissa**: o Marketplace passa a ter uma
  superfície própria. A PRD-91 continua responsável pela paridade entre
  `README.md` e as 23 variantes; a página do Marketplace fica **fora** do gate de
  paridade de locales.
- **PRD-98** criou o anti-drift de docs; esta PRD estende o mesmo princípio para
  a nova superfície (claims, links, imagens e versão).
- **PRD-122** cuida de privacidade e publisher verificado; a página apenas
  **consome** esses sinais (ex.: link para a política e “sem telemetria”), sem
  duplicar o escopo.
- **PRD-83** cuida da higiene do VSIX; esta PRD acrescenta a exclusão dos READMEs
  do GitHub do pacote e o teste de que o VSIX contém apenas o README do
  Marketplace.
- **PRD-141** cria o walkthrough de onboarding; o quick start da página pode
  apontar para ele.

## 3. Objetivos / Não-objetivos

**Objetivos**

- Criar `MARKETPLACE.md` como **superfície dedicada** do Marketplace, gerada do
  vault e empacotada via `vsce --readme-path`.
- Transformar a página em uma landing page de conversão: hero, screenshot/GIF,
  quick start em 3 passos, “por que usar”, compatibilidade, troubleshooting e
  links de docs/suporte; alvo de **1.200–2.000 palavras**.
- Adicionar **4–5 screenshots reais** (e, opcionalmente, um GIF de 8–12 s) com
  alt text, legendas e sem credenciais/PII.
- Alinhar **metadata de descoberta** (description, keywords, categories,
  `displayName` a testar, ícone 256, banner) e o histórico de versões recente
  em inglês.
- Adicionar **gates de CI** para a nova superfície: IDs de settings/comandos
  existentes, claims de versão/engine/Oracle, links e imagens válidos, ausência
  de termos obsoletos e de PT-BR no texto inglês.
- Garantir que o VSIX contenha **apenas** o README do Marketplace (sem os 23
  READMEs do GitHub) e que o GitHub continue com o README completo.
- Registrar a dependência de release: a página só muda no Marketplace após uma
  publicação; o processo de release passa a incluir a inspeção da listagem.

**Não-objetivos**

- Reescrever o `README.md` do GitHub ou traduzir/estruturar as 23 variantes de
  idioma. Elas continuam como estão (a PRD-91 segue dona da paridade).
- Adicionar features, settings ou comandos de runtime.
- Refazer a landing page (`site/`) ou os posts do LinkedIn.
- Resolver publisher verificado e política de privacidade (PRD-122); a página
  apenas linka o que existir.
- Inventar números, reviews, badges ou screenshots; a página deve ser verificável.
- Automatizar a captura de screenshots no CI (depende de Oracle + VS Code GUI).

## 4. Requisitos

### RF1 — Superfície dedicada e empacotamento

- Criar a nota canônica `docs/brain/60-README/Marketplace (README).md` com
  frontmatter `tipo: readme-marketplace`, `locale: en`,
  `publicar: MARKETPLACE.md`, `verificado: <data>`.
- `brain:build` gera `MARKETPLACE.md` na raiz; `readmeImagesSync` continua
  espelhando `docs/brain/60-README/images/` para `images/`.
- O VSIX passa a ser empacotado com
  `vsce package --readme-path MARKETPLACE.md --githubBranch main` (ou wrapper
  equivalente), tanto em `npm run package` quanto em
  `scripts/package-target.cjs`.
- O VSIX deve conter **um único** README: `extension/readme.md` com o conteúdo de
  `MARKETPLACE.md`. `README.md` e `README.*.md` não devem aparecer no pacote.
- O `README.md` do GitHub e as 23 variantes permanecem inalterados em conteúdo e
  links. A nota do GitHub recebe apenas o marcador `<!-- prd:PRD-147 -->` para
  rastreabilidade (sem mudança editorial).
- `MARKETPLACE.md` usa links Markdown normais (não wikilinks) ou o
  `brain:build` é estendido para converter wikilinks nesse alvo; imagens usam
  caminhos relativos `images/...` e precisam estar na `main` antes do publish.

### RF2 — Conteúdo orientado a conversão

A página deve seguir esta ordem (ajustável, mas mantendo a primeira dobra):

1. **Hero** com uma frase de valor, linha de metadados
   (`24 UI languages · VS Code 1.125+ · Oracle 12.1+ (thin) / 11.2+ (thick) · MIT`)
   e CTAs (instalar, quick start, docs, issues).
2. **Screenshot/GIF principal** logo após o hero.
3. **Quick start** em 3 passos (instalar; ter Oracle + utPLSQL; conectar e abrir
   um `.pks`).
4. **Por que usar** com 8 cards (Test Explorer, CodeLens, coverage, debugger,
   Oracle-direct, schema tree, perfis, 24 idiomas).
5. **Screenshots** de coverage, debugger e falha/diff, com legendas.
6. **Requisitos e compatibilidade** (VS Code, Oracle thin/thick, utPLSQL,
   grants de coverage/debug, plataformas).
7. **Troubleshooting/FAQ** com os 6 casos mais comuns e link para a wiki.
8. **Docs e suporte** (wiki, FAQ, issues, releases, contribuição, segurança,
   `SUPPORT.md`).
9. **Idiomas**: uma linha no fim apontando para as variantes no GitHub.
10. **Licença** e agradecimento/review opcional.

Regras de conteúdo:

- Não repetir a tabela de 60 settings nem as duas tabelas de comandos; linkar a
  wiki/GitHub para a referência completa.
- Não usar `(sem tag)`; usar “untagged”.
- Não citar mensagens de log em PT-BR; usar a mensagem em inglês ou descrever o
  canal de saída.
- Não usar badges de instalações/downloads no topo; no máximo versão, CI,
  coverage e licença, ou uma linha de metadados.
- Alvo: **1.200–2.000 palavras**; a primeira dobra deve conter valor + screenshot
  + início do quick start.

### RF3 — Assets visuais

- Capturar 4–5 screenshots reais do produto, em tema escuro, 1600×900:
  1. Test Explorer com resultados e CodeLens no editor;
  2. coverage com gutters e aba Coverage;
  3. debugger parado em breakpoint (variáveis/call stack);
  4. falha com diff esperado × atual + decoração/status bar;
  5. perfis de conexão/status bar (opcional).
- GIF opcional de 8–12 s de uma execução; limite de **5 MB**. Se não houver GIF,
  as screenshots estáticas bastam para a release.
- Otimizar PNGs (alvo ≤ 300 KB cada), usar alt text e legendas, e garantir que
  nenhuma imagem exponha host, usuário, senha, wallet ou dados de cliente.
- Guardar em `docs/brain/60-README/images/` (arquivos planos, prefixo
  `marketplace-`) para o `brain:build` espelhar em `images/`.
- Capturar em um workspace de demonstração com schema/utPLSQL instalado; não usar
  mockups ou telas fabricadas.

### RF4 — Metadata e histórico de versões

- **`description`**: liderar com “Run, debug and measure coverage of utPLSQL
  (Oracle PL/SQL) unit tests …”, mencionando “no Java/Instant Client” e
  “24 UI languages”.
- **`keywords`**: manter as 5 atuais e acrescentar, sem passar de 30:
  `pl/sql`, `oracle-database`, `unit-testing`, `tdd`, `test-explorer`,
  `test-runner`, `code-coverage`, `debugger`, `junit`, `cobertura`.
- **`categories`**: `["Testing", "Debuggers"]` (hoje só `Testing`).
- **`displayName`**: testar `utPLSQL Test Runner (Oracle PL/SQL)`; se houver
  receio de marca, manter o nome atual e compensar em description/keywords. A
  decisão fica registrada na PRD.
- **Ícone**: gerar 256×256 a partir de `images/icon.svg` (o requisito é ≥128;
  256 melhora high-DPI) e ajustar `scripts/gen-icon.cjs`.
- **`galleryBanner.color`**: usar `#21262d` (fundo do ícone) ou justificar a
  manutenção de `#1e1e1e`.
- **CHANGELOG/Version History**: traduzir as entradas 0.19.0 e 0.18.0 para inglês
  (ou adicionar um resumo em inglês no topo de cada uma) e adotar inglês como
  idioma das entradas voltadas ao Marketplace. Referências internas a PRDs podem
  ficar em uma seção “Internals”.

### RF5 — Gates de CI e docs

- `docs-check.cjs`: reconhecer `MARKETPLACE.md` como artefato gerado; não
  tratá-lo como variante de locale; validar que existe e que o `README.md` do
  GitHub continua linkando as 23 variantes.
- `docs-fidelity.cjs`: manter as checagens atuais no `README.md` (settings,
  comandos, paridade das variantes) e adicionar uma checagem específica para
  `MARKETPLACE.md`:
  - todo `utplsql.*` citado existe no `package.json`;
  - claims de VS Code/Node/Oracle/node-oracledb/versão conferem com o
    `package.json`;
  - links relativos e imagens existem;
  - não contém termos obsoletos (`coverageSourceArgs`, `type_mapping`,
    `VS Code 1.101`, `Node 22`, `node-oracledb 7`);
  - contém as seções/links mínimos (quick start, compatibilidade, wiki, issues);
  - não contém os vazamentos de PT-BR acordados (ex.: `(sem tag)`,
    `Reporter adicional da sessão`).
- `docs:features-check`: exigir que o README do Marketplace reflita a versão
  corrente (ex.: seção “What’s new” ou menção à feature principal do release) e
  que o CHANGELOG tenha a entrada em inglês.
- `scripts/package-target.cjs`: teste unitário de que os argumentos do `vsce`
  incluem `--readme-path MARKETPLACE.md` e `--githubBranch main`.
- Teste de empacotamento (CI ou script local): rodar `npm run package`, abrir o
  `.vsix` e afirmar que `extension/readme.md` contém o conteúdo de
  `MARKETPLACE.md` e que não há `README.*.md` no pacote.
- Atualizar `.opencode/skills/release/SKILL.md` com o passo “após publicar,
  inspecionar a página do Marketplace (hero, imagens, links, Version History)”.

### RF6 — Consistência de idioma (opcional, decidir na aprovação)

- Corrigir `NO_TAG_GROUP = '(sem tag)'` em `src/testTree.ts:125` para uma chave
  i18n (`ext.tag.untagged`) presente nos 24 locales; atualizar
  `src/test/unit/testTree.test.ts`.
- Atualizar o texto correspondente no README inglês (`README.md:256`) para
  “untagged”.
- Se ficar fora desta PRD, registrar uma PRD de bug separada; a página do
  Marketplace já usa “untagged” e não depende da correção.

**Não-funcionais**

- RNF1 — **Sem duplicação manual**: `MARKETPLACE.md` é uma nota canônica do
  vault; nenhum texto é mantido em dois lugares sem verificação.
- RNF2 — **Sem segredos/PII**: screenshots e exemplos não podem conter
  credenciais, hosts reais ou dados de cliente; usar schema de demonstração.
- RNF3 — **Acessibilidade**: alt text em todas as imagens, hierarquia de
  headings, contraste e nenhuma informação apenas em imagem.
- RNF4 — **Performance**: PNGs otimizados (≤300 KB cada), GIF ≤5 MB, total de
  assets da página ≤2 MB.
- RNF5 — **Determinismo**: as checagens de CI não dependem de rede para links
  relativos/imagens; links externos podem ser warn, não fail.
- RNF6 — **Manutenibilidade**: uma única fonte por superfície; o GitHub não
  perde a referência completa; o Marketplace não vira uma cópia reduzida
  desatualizada.
- RNF7 — **Compatibilidade**: `vsce` atual; `MARKETPLACE.md` funciona no
  GitHub Pages/Marketplace e no painel de detalhes do VS Code.
- RNF8 — **Rastreabilidade**: `MARKETPLACE.md` e o CHANGELOG citam
  `<!-- prd:PRD-147 -->`; a PRD registra a decisão sobre o nome e o
  empacotamento.

## 5. Solução proposta

### 5.1 Arquitetura de publicação

```text
docs/brain/60-README/README (extensão).md ──brain:build──► README.md (GitHub, completo)
docs/brain/60-README/README.<locale>.md  ──brain:build──► README.<locale>.md (23 variantes)
docs/brain/60-README/Marketplace (README).md ──brain:build──► MARKETPLACE.md (novo)
                                                              │
                                         vsce --readme-path MARKETPLACE.md
                                                              ▼
                                                   VSIX → Marketplace
```

O GitHub continua exibindo `README.md`; o Marketplace e o painel de detalhes do
VS Code exibem `MARKETPLACE.md` (empacotado como `readme.md`).

### 5.2 Nota canônica e geração

1. Criar `docs/brain/60-README/Marketplace (README).md` com
   `publicar: MARKETPLACE.md`, `tipo: readme-marketplace`, `locale: en`.
2. Preferir links Markdown normais na nota (o alvo `MARKETPLACE.md` não entra no
   `README_RE` do `brain-build`); se forem usados `[[wikilinks]]`, estender o
   `README_RE`/`readmeLinks` para incluir `MARKETPLACE.md` e testar.
3. Rodar `npm run brain:build`; conferir `MARKETPLACE.md` e as imagens em
   `images/`.
4. Adicionar o marcador `<!-- prd:PRD-147 -->` no fim de `MARKETPLACE.md` e no
   `CHANGELOG.md` (entrada da release).

### 5.3 Empacotamento

- `package.json`:
  - `"package": "npm run compile && npm run bundle && vsce package --readme-path MARKETPLACE.md --githubBranch main"`
  - `package:target` continua chamando `scripts/package-target.cjs`.
- `scripts/package-target.cjs`: acrescentar `--readme-path MARKETPLACE.md` e
  `--githubBranch main` ao array do `spawnSync`.
- `.vscodeignore`: excluir `README.md` e `README.*.md` do VSIX; confirmar que o
  `--readme-path` ainda lê `MARKETPLACE.md` antes do ignore e que o pacote contém
  `extension/readme.md`.
- Se o `vsce` reclamar de README ausente ao ignorar `README.md`, manter um
  fallback: gerar o pacote em um diretório temporário com `MARKETPLACE.md`
  copiado para `README.md`, ou usar um wrapper `scripts/package.cjs` que faz a
  troca e restaura no `finally`.
- Validar links/imagens relativos: `vsce` reescreve links relativos usando o
  repositório; `--githubBranch main` fixa a branch. Imagens precisam estar na
  `main` antes do publish.

### 5.4 Conteúdo

Seguir a estrutura do RF2. A página do Marketplace não precisa da barra de 24
idiomas, dos 11 badges, das 60 settings nem das duas tabelas de comandos; esses
conteúdos continuam no GitHub/wiki. O README do Marketplace deve ter uma linha
“Other languages: see the GitHub README” no fim, apontando para
`README.<locale>.md`.

### 5.5 Assets

Capturar as telas com o Extension Development Host (F5) e um schema de
demonstração; usar uma janela limpa, tema escuro e dados fictícios. Salvar em
`docs/brain/60-README/images/marketplace-*.png`; rodar `brain:build`; validar
tamanho e alt text. O GIF é opcional e não bloqueia a release.

### 5.6 Metadata e Version History

Aplicar RF4. A decisão sobre `displayName` deve ser registrada: se o nome mudar,
atualizar `README.md`, `MARKETPLACE.md`, `site/index.html` e as menções de
“utPLSQL Test Runner” nos textos de release; se não mudar, registrar o motivo.
As entradas 0.19.0/0.18.0 do CHANGELOG ganham uma versão em inglês (ou um resumo
no topo) para o Version History.

### 5.7 Gates de CI

Estender `docs-check`/`docs-fidelity`/`docs:features-check` conforme RF5 e
adicionar o teste de empacotamento. O `MARKETPLACE.md` é uma **superfície
separada**, não uma variante de locale; a PRD-91 continua cobrando a paridade
apenas de `README.md` + `README.<locale>.md`.

## 6. Configuração

Nenhuma setting/comando de runtime. Mudanças de distribuição:

- `package.json`: `description`, `keywords`, `categories`, `displayName`
  (decisão), `galleryBanner.color`, `icon` (256), scripts de package.
- `scripts/package-target.cjs` e, se necessário, um wrapper de package.
- `.vscodeignore`.
- `scripts/docs-check.cjs`, `scripts/docs-fidelity.cjs`,
  `src/test/unit/docsFidelity.test.ts`, `docs:features-check`.
- `.opencode/skills/release/SKILL.md` (checklist pós-publish).
- `CHANGELOG.md`.

## 7. Plano de testes

- **Unitários**:
  - `docsFidelity.test.ts`: `MARKETPLACE.md` com setting inexistente falha;
    claim de VS Code/Oracle/Node divergente falha; link/imagem ausente falha;
    termo obsoleto falha; `(sem tag)` falha.
  - `package-target.test.ts` (ou equivalente): args do `vsce` incluem
    `--readme-path MARKETPLACE.md` e `--githubBranch main`.
  - `testTree.test.ts` (se RF6 entrar): grupo sem tag usa a chave i18n.
- **Integração/empacotamento**:
  - `npm run package`; `unzip -p *.vsix extension/readme.md` contém o hero e o
    screenshot; `unzip -l *.vsix` não lista `README.*.md`.
  - Instalar o `.vsix` localmente e abrir a página de detalhes da extensão;
    conferir imagens, links e texto.
  - `npm run docs:check`, `npm run brain:ci`, `npm run brain:rules`,
    `npm run docs:features-check -- 0.20.0`.
- **Manual (pré-release)**:
  - Revisar a página em viewport de desktop e mobile; primeira dobra com hero +
    screenshot; links externos e âncoras; alt text; legibilidade no tema escuro.
  - Revisar as screenshots contra segredos/PII; confirmar que não há host,
    usuário, senha, wallet ou nome de cliente.
  - Conferir o Version History com as entradas em inglês.
- **Pós-publish (manual)**:
  - Abrir a página do Marketplace; conferir hero, imagens, links, descrição,
    keywords/categorias, versão, Version History e instalação.
  - Registrar baseline e resultado (instalações, rating, posição nas buscas
    `utplsql`, `plsql`, `oracle`) para a próxima revisão.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Drift entre `README.md` e `MARKETPLACE.md` | `MARKETPLACE.md` é uma nota canônica separada; claims verificados pelo `docs-fidelity`; sem texto duplicado sem check |
| `vsce --readme-path` + `.vscodeignore` não se comportarem como esperado | Teste de empacotamento no CI; fallback de cópia temporária para `README.md` em um wrapper |
| Imagens/links relativos quebrarem no Marketplace | Caminhos `images/...` na raiz, `--githubBranch main`, merge das imagens na `main` antes do publish; revisão pós-publish |
| Screenshots exporem credenciais/PII | Schema de demonstração, dados fictícios, revisão em par; checklist de privacidade |
| A página só atualizar na próxima release | Incluir no rollout da 0.20.0; checklist do `release` skill; comunicar que o README do GitHub muda antes |
| Conflito com a PRD-91 (paridade) | Delimitar: PRD-91 cobre `README.md` + variantes; `MARKETPLACE.md` é superfície separada com checks próprios |
| Custo de manter uma segunda página | Página curta (1.200–2.000 palavras), sem tabelas completas; fonte única no vault; CI de claims |
| `displayName` novo afetar marca/busca | Testar em uma release; manter fallback documentado; não bloquear a PRD no nome |
| Metadata não melhorar a busca sozinha | Tratar como higiene; medir antes/depois; complementar com divulgação externa |
| GIF grande ou pesado | Limite de 5 MB; GIF opcional; screenshots estáticas bastam |
| Traduções/24 variantes ficarem defasadas | Fora de escopo; a página do Marketplace é English-only e linka o GitHub; PRD-91 segue para paridade |
| `MARKETPLACE.md` ser confundido com variante de locale | Nome sem `README.`; documentar a armadilha na PRD e nos scripts |

## 9. Rollout

- **Versão alvo:** 0.20.0 (próxima minor). Se a 0.20.0 já estiver fechada,
  mover para a próxima release e registrar a decisão.
- **Ordem de implementação:**
  1. Nota canônica + `MARKETPLACE.md` + `brain:build`.
  2. Empacotamento (`--readme-path`, `.vscodeignore`, teste do VSIX).
  3. Conteúdo + screenshots/GIF.
  4. Metadata + CHANGELOG em inglês.
  5. Gates de CI + `release` skill.
  6. Validação local do `.vsix` e `docs:check`/`brain:ci`.
  7. Publicação (aprovação explícita do mantenedor, conforme `AGENTS.md`).
  8. Inspeção pós-publish da página e registro de métricas.
- **CHANGELOG:** entrada da versão com a nova página, metadata e correções de
  consistência.
- **Comunicação:** o README do GitHub continua sendo a referência; a página do
  Marketplace é a vitrine. Evitar anunciar a mudança antes de a release estar
  publicada.

## 10. Critérios de aceite

- [ ] `docs/brain/60-README/Marketplace (README).md` existe e `brain:build` gera
      `MARKETPLACE.md` sem drift.
- [ ] `npm run package` e `package-target` usam `--readme-path MARKETPLACE.md`.
- [ ] O VSIX contém `extension/readme.md` com o conteúdo do Marketplace e **não**
      contém `README.*.md`.
- [ ] A página tem hero + screenshot/GIF + quick start + “por que usar” +
      compatibilidade + troubleshooting + links de docs/suporte, com
      1.200–2.000 palavras.
- [ ] 4–5 screenshots reais (e GIF opcional) com alt text, sem credenciais/PII,
      otimizadas dentro do orçamento.
- [ ] Metadata atualizada (description/keywords/categories/ícone/banner) e decisão
      sobre `displayName` registrada.
- [ ] Version History recente em inglês (0.19.0/0.18.0 traduzidas ou resumidas).
- [ ] `MARKETPLACE.md` não contém `(sem tag)` nem mensagens de log em PT-BR.
- [ ] `docs:check`, `docs:fidelity`, `brain:ci`, `brain:rules` e
      `docs:features-check` verdes.
- [ ] O `README.md` do GitHub e as 23 variantes continuam funcionando; a PRD-91
      não é quebrada.
- [ ] Após o publish, a página do Marketplace exibe imagens/links corretos e o
      Version History em inglês; baseline de métricas registrado.

## 11. Questões em aberto

- **Versão alvo:** 0.20.0 (proposta) ou antecipar/adiar para 0.24.0? A página só
  muda no publish.
- **`displayName`:** aprovar “utPLSQL Test Runner (Oracle PL/SQL)” ou manter o
  nome atual? A mudança pode ajudar a busca, mas mexe na marca.
- **Screenshots:** quem captura (mantenedor) e qual schema/workspace de
  demonstração? GIF entra na primeira release ou fica para depois?
- **RF6 (i18n do “sem tag”):** incluir nesta PRD ou abrir uma PRD de bug separada?
- **Privacidade:** a política da PRD-122 já tem URL pública para linkar? Se não,
  a página entra sem o link e ele é adicionado depois.
- **“What’s new”:** a página terá uma seção por release? Se sim, o
  `docs:features-check` passa a exigir a entrada da versão.
- **Links de idioma:** manter uma linha no fim apontando para as 23 variantes do
  GitHub ou omitir no Marketplace? Recomendação: uma linha discreta.
- **Site:** reutilizar as mesmas screenshots na landing page em uma PRD futura?

## 12. Impacto no cérebro

A implementação deve criar/alterar regras para materializar a nova superfície.
Candidatas:

- `BR-DOC-003` — “O Marketplace usa `MARKETPLACE.md` gerado do vault; o
  `README.md` do GitHub continua sendo a referência completa; a paridade da
  PRD-91 não se aplica à página do Marketplace.”
- `BR-PKG-002` — “O VSIX publica apenas o README do Marketplace; READMEs do
  GitHub (incluindo variantes) não entram no pacote.”
- Se o RF6 entrar: `BR-I18N-*` para o grupo “untagged” localizado.

O campo `regras:` do frontmatter é derivado por `npm run brain:sync` a partir do
`prds:` dessas regras. Enquanto a PRD estiver `proposed`, `regras: []` é
esperado; ao concluir, criar as regras e atualizar a seção.

## Impacto nas docs

- **`MARKETPLACE.md`** (novo, gerado): página de conversão do Marketplace, com o
  marcador `<!-- prd:PRD-147 -->`.
- **`CHANGELOG.md`**: entrada da release com a nova página, metadata e correções
  de consistência; menção `<!-- prd:PRD-147 -->` na entrada.
- **`README.md` / variantes do GitHub**: **sem mudança editorial**; continuam
  como referência completa e paridade da PRD-91. O marcador
  `<!-- prd:PRD-147 -->` pode ser adicionado ao fim da nota canônica para
  rastreabilidade.
- **Wiki**: a página do Marketplace linka a wiki; nenhuma página da wiki precisa
  ser reescrita nesta PRD.
- **Site**: fora de escopo; reuso das screenshots pode virar PRD futura.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-83-vsix-package-hygiene|PRD-83]] · [[prd-91-doc-parity-localized-distribution|PRD-91]] · [[prd-98-docs-anti-drift|PRD-98]] · [[prd-122-marketplace-trust-metadata|PRD-122]] · [[prd-141-onboarding-walkthrough-accessibility|PRD-141]]
- 🚀 ⬅️ release anterior: [[prd-127-vscode-floor-1-125|PRD-127 (0.19.0)]] · ➡️ próxima release: [[prd-128-event-bus-internal|PRD-128 (0.21.0)]]
<!-- brain:auto:end -->
