# PRD-46 — Atualização de dependências major (oracledb 7, fast-xml-parser 5, iconv-lite 0.7, TypeScript 7)

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber |
| Data | 2026-08-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `package.json`, `package-lock.json`, `src/junit.ts`, `src/cobertura.ts`, `src/cliEncoding.ts`, `tsconfig.json`, `docs/functional/10-development-tooling.md`, `docs/wiki/*`, `CHANGELOG.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Atualizar as dependências com versões major disponíveis que foram adiadas na
rodada de atualização da 0.11.0 (`b79fd06`): `oracledb` 7, `fast-xml-parser` 5,
`iconv-lite` 0.7 e `typescript` 7. `@types/node` 26 fica **explicitamente fora**
do escopo até a adoção de Node 26 como runtime.

## 2. Contexto e problema

Na análise de dependências (29/08/2026) foram aplicados os updates dentro do
range semver e os majors `@vscode/test-cli`/`@vscode/test-electron` (Node 20 EOL
liberou o caminho). Ficaram adiados por risco:

| Pacote | Atual | Mais recente | Por que foi adiado |
|---|---|---|---|
| `oracledb` | 6.10.0 | 7.0.1 | Major do driver que vai **dentro do VSIX** — exige validação com banco real |
| `@types/oracledb` | 6.10.4 | 7.0.2 | Casa com `oracledb` 7 |
| `fast-xml-parser` | 4.5.7 | 5.11.1 | Major com reescrita interna (v5) — usado no parse de JUnit/Cobertura |
| `iconv-lite` | 0.6.3 | 0.7.3 | Minor pré-1.0 — usado no decode de output do CLI no Windows |
| `typescript` | 6.0.3 | 7.0.2 | Major — TS 7 é o compilador nativo (Go); muda o pipeline de build |
| `@types/node` | 24.13.3 | 26.4.0 | Descreve APIs de Node 26 que não existem no runtime do projeto (Node 24) |

Usos atuais no código (superfície de impacto):

- `oracledb`: import dinâmico (`oracleRunner.ts`, `discovery.ts`, `quickfix.ts`),
  `createPool`/`getConnection`/`execute`/`close`/`break`, `OUT_FORMAT_OBJECT`,
  `callTimeout`, thin driver (binários thick podados no VSIX — PRD-45).
- `fast-xml-parser`: `new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })`
  em `junit.ts` e `cobertura.ts` (parse de XML real do utPLSQL).
- `iconv-lite`: `decodeCliBuffer` em `cliEncoding.ts` (fallback de codepage
  ANSI/OEM no Windows).
- `typescript`: `tsc -p ./` (module `node16`, target ES2021, source maps) +
  esbuild para o bundle final (PRD-45).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Subir `oracledb` + `@types/oracledb` para 7.x com validação de integração real
- Subir `fast-xml-parser` para 5.x sem regressão de parse (fixtures JUnit/Cobertura)
- Subir `iconv-lite` para 0.7.x (baixo risco)
- Subir `typescript` para 7.x validando compile, lint, bundle e package
- Manter o VSIX enxuto (thin-only, sem binários nativos)

**Não-objetivos**
- `@types/node` 26 (até o runtime passar a ser Node 26 — `.nvmrc`/CI)
- Adoção de `oracledb` thick (o projeto usa thin desde a 6.x)
- Migração do esbuild para outro bundler (escopo do PRD-45 permanece)
- Reescrita de parsing (mantém-se `fast-xml-parser`)

## 4. Requisitos

### RF1 — Atualização do `oracledb` para 7.x

Revisar o changelog/migration guide da v7; ajustar chamadas se houver breaking
changes; manter o contrato atual de uso (pool, OUT_FORMAT_OBJECT, callTimeout,
break/close). `@types/oracledb` sobe junto.

### RF2 — Atualização do `fast-xml-parser` para 5.x

Ajustar `junit.ts`/`cobertura.ts` às opções da v5 (ex.: validadores removidos,
mudanças em `attributeNamePrefix`/entidades). O output de parse deve ser
idêntico ao atual para os fixtures existentes.

### RF3 — Atualização do `iconv-lite` para 0.7.x

Sem mudança de código esperada. Validar decode de codepages Windows
(`cliEncoding.test.ts`) e o fallback de bytes inválidos (`cli.test.ts`).

### RF4 — Atualização do `typescript` para 7.x

Validar que `tsc -p ./` continua produzindo `out/` com os mesmos artefatos
(source maps incluídos — c8 depende deles), sem mudar `tsconfig.json` além do
necessário. O bundle esbuild e o `vsce package` continuam funcionando.

**Não-funcionais**
- RNF1 — Tamanho do VSIX não deve crescer além de ~5% (hoje ~950 KB)
- RNF2 — Cobertura c8 continua funcionando (source maps) e acima dos thresholds
- RNF3 — Nenhuma mudança de comportamento observável para o usuário final

## 5. Solução proposta

### 5.1 Ordem de execução (risco crescente)

1. **iconv-lite 0.7.x** — `npm install iconv-lite@^0.7.3` + suite unit (15 min)
2. **fast-xml-parser 5.x** — instalar, rodar `junit.test.js`/`cobertura.test.js`
   primeiro; depois suite completa + integração (parse de JUnit/Cobertura reais)
3. **oracledb 7.x** — instalar `oracledb@^7.0.1` + `@types/oracledb@^7.0.2`;
   rodar `npm run test:integration` com banco real (describeDB) + `npm run package`
   (verificar poda dos binários thick no `.vscodeignore`)
4. **typescript 7.x** — instalar `typescript@^7.0.2`; `npm run compile` →
   corrigir erros; `npm run lint`; `npm run test:unit`; `npm run bundle` +
   `npm run package`; validar coverage

### 5.2 Gerenciamento de risco por pacote

Cada etapa é **isolada em commit próprio** (um pacote por commit), permitindo
revert individual. Se qualquer etapa apresentar regressão não resolvível em
tempo curto, ela vira PRD própria e as demais seguem.

## 6. Configuração

Nenhuma setting/comando novo. Atualizar referências de versão em
`docs/functional/10-development-tooling.md` e `docs/wiki/Como-contribuir.md`
se aplicável.

## 7. Plano de testes

- **Unitários**: 350 testes atuais verdes após cada etapa; atenção especial a
  `junit.test.ts`, `cobertura.test.ts` (fast-xml-parser) e
  `cliEncoding.test.ts`/`cli.test.ts` (iconv-lite)
- **Integração**: 26 testes com banco real (describeDB) após oracledb 7 e
  fast-xml-parser 5 — validação de pool, streaming, cobertura e descoberta via DB
- **Validação manual**: `npm run package` → VSIX sem `.node`/`build/` do oracledb
  (thin-only) e tamanho estável; F5 para smoke test
- **Coverage**: `npm run test:coverage` acima dos thresholds (65/80/70)

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `oracledb` 7 remove/renomeia APIs usadas (pool, OUT_FORMAT_OBJECT) | Integração com banco real valida; compilação com `@types/oracledb` 7 acusa quebras |
| `fast-xml-parser` 5 muda shape do objeto parseado (atributos `@_`, entidades) | Fixtures unitários cobrem JUnit/Cobertura; diff dos resultados antes/depois |
| TS 7 nativo não suporta alguma flag do `tsconfig.json` atual | Compile gate; ajuste mínimo de tsconfig documentado |
| VSIX cresce com majors | RNF1 (limite ~5%); `vsce ls` para conferir |
| Regressão silenciosa em clientes (parse de resultados) | Integração real + CHANGELOG claro; um pacote por commit para revert limpo |

## 9. Rollout

- Versão alvo: 0.12.0 (minor) — mudanças de dependência com risco moderado
- Um commit por pacote (ordem: iconv-lite → fast-xml-parser → oracledb → typescript)
- Entry no CHANGELOG.md ao concluir
- Publicação exclusivamente via GitHub release (workflow)

## 10. Critérios de aceite

- [ ] `npm outdated` não lista mais os majors do escopo (exceto `@types/node` 26)
- [ ] `npm run compile && npm run lint` verdes em cada etapa
- [ ] 350 testes unitários verdes; coverage acima dos thresholds
- [ ] 26 testes de integração com banco real verdes (oracledb 7 + fast-xml-parser 5)
- [ ] `npm run package` gera VSIX thin-only (~950 KB ±5%)
- [ ] CHANGELOG + docs atualizados

## 11. Questões em aberto

- `@types/node` 26: adiar até quando? (atrelado à adoção de Node 26 no
  `.nvmrc`/CI — fora do escopo desta PRD)
- `oracledb` 7: o projeto ainda precisa considerar usuários em thick? (hoje o
  VSIX é thin-only — se a v7 encarecer o thin, reavaliar)
- `typescript` 7: há diferenças de emit/source maps que afetem o c8? (validar
  no passo 4 antes de consolidar)
- Agrupar os 4 pacotes numa PRD só ou separar por pacote? (sugestão atual:
  uma PRD, commits isolados)
