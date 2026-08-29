# Plano de execução — PRD-46 (dependências major + Node 26 no toolchain)

| Campo | Valor |
|---|---|
| Data | 2026-08-29 |
| Branch | `release/v0.12.0` (a criar a partir de `release/v0.11.0`) |
| PRD | [prd-46-dependency-majors](../../docs/prd/proposed/prd-46-dependency-majors.md) |
| Versão alvo | 0.12.0 |

## Estado de partida

- `engines.node` = `>= 22` (piso do host do VSCode — **não muda**)
- `@types/node` = `^22.20.1` (tipa pelo piso — já aplicado na 0.11.0)
- CI matrix = `[22, 24]`; `.nvmrc` = 24; oracledb thin-only no VSIX (PRD-45)
- Gates de qualidade atuais: compile, lint, 350 unit, coverage (65/80/70),
  26 integração com banco real, `npm run package`

## Ordem de execução (risco crescente — um commit por etapa)

| Ordem | Etapa | Versão | Esforço | Risco | Por quê |
|---|---|---|---|---|---|
| 1 | `iconv-lite` | `^0.7.3` | 15 min | Baixo | Minor pré-1.0; decode de output CLI no Windows; suite unit cobre |
| 2 | `fast-xml-parser` | `^5.11.1` | 0,5–1 dia | Médio | Major com reescrita; usado em `junit.ts`/`cobertura.ts`; precisa de unit + integração real |
| 3 | `oracledb` + `@types/oracledb` | `^7.0.1` / `^7.0.2` | 0,5–1 dia | Médio-Alto | Vai dentro do VSIX; integração com banco real é o gate; conferir poda do thick |
| 4 | `typescript` | `^7.0.2` | 0,5 dia | Médio | Compilador nativo (Go); validar emit/source maps (c8) + bundle esbuild + package |
| 5 | Node 26 no toolchain | `.nvmrc`/CI | 0,5 dia | Baixo | **Só após LTS do Node 26 (out/2026)**; antes disso é "current" e flaky |

## Comandos e gates por etapa

Cada etapa fecha com: `npm run compile && npm run lint && npm run test:unit`
verdes + o gate específico abaixo. Falha não resolvível em tempo curto ⇒
reverter o commit da etapa e seguir com as demais (anotar na PRD).

### 1. iconv-lite

```sh
npm install iconv-lite@^0.7.3
node --test out/test/unit/cliEncoding.test.js out/test/unit/cli.test.js
npm run test:unit
```

### 2. fast-xml-parser

```sh
npm install fast-xml-parser@^5.11.1
node --test out/test/unit/junit.test.js out/test/unit/cobertura.test.js
# ajustar junit.ts/cobertura.ts às opções da v5 se necessário (validadores
# removidos, atributos @_, entidades) — output de parse deve ser idêntico
npm run test:unit && npm run test:coverage
npm run test:integration        # parse de JUnit/Cobertura reais do banco
```

### 3. oracledb

```sh
npm install oracledb@^7.0.1
npm install -D @types/oracledb@^7.0.2
npm run test:integration        # describeDB: pool, streaming, cobertura, PRD-43
npm run package
# conferir: VSIX sem oracledb/build/** (thin-only), tamanho ~950 KB ±5%
```

### 4. typescript

```sh
npm install -D typescript@^7.0.2
npm run compile                 # corrigir erros; mínimo tsconfig.json possível
npm run lint && npm run test:unit
npm run test:coverage           # source maps intactos (c8)
npm run package                 # bundle esbuild + vsce funcionam
```

### 5. Node 26 no toolchain (pós-LTS — out/2026)

```sh
# .nvmrc → 26; ci.yml matrix → [22, 24, 26]
npm test                        # local no Node 26
```

## Rotina de conclusão da PRD

1. Mover `docs/prd/proposed/prd-46-dependency-majors.md` → `docs/prd/completed/`
   (header Status → Concluído; critérios de aceite marcados)
2. `docs/prd/index.md`: linha 46 p/ 🟢 Concluídos (Versão 0.12.0) + árvore Estrutura
3. `docs/wiki/PRDs.md`: mover para Concluídos
4. `CHANGELOG.md`: entry na 0.12.0
5. `sync-prds` (fecha a issue #63, label `prd:completed`)

## Observações

- **Não** subir `engines.node` nesta PRD (piso do host = Node 22; nenhum VSCode
  atual embarca Node 26).
- Reavaliar `engines.node`/`@types/node` quando o VSCode embarcar Node ≥ 24
  (acompanhar roadmap do Electron/VSCode).
- O passo 5 pode ser entregue separadamente (PRD própria de toolchain) se o
  release 0.12.0 sair antes do LTS do Node 26.
- Sem mudanças de settings/comandos — atualizar apenas `docs/functional/10`
  e `docs/wiki/Como-contribuir` se números de Node/cobertura mudarem.
