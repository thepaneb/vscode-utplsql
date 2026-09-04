# PRD-48 — Function Coverage derivada (DeclarationCoverage no Test Coverage)

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber |
| Data | 2026-08-29 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.12.0 |
| Arquivos afetados | `src/plsqlDeclarations.ts` (novo), `src/results.ts`, `src/cobertura.ts`, `src/coverage.ts` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Replicar o indicador de **funções** que o `node --test --coverage` (c8) mostra,
agregando a cobertura linha-a-linha do utPLSQL em cobertura por declaração
(`PROCEDURE`/`FUNCTION`) via `vscode.DeclarationCoverage`. O VSCode passa a
exibir "% de declarações" por arquivo/pasta na view **Test Coverage**, além dos
gutters por linha já existentes.

## 2. Contexto e problema

O Node/c8 reporta 4 indicadores: statements, branches, functions e lines. A
view de cobertura do VSCode suporta nativamente os três tipos
(`FileCoverage.fromDetails` com `FileCoverageDetail =
StatementCoverage | DeclarationCoverage`, e contadores `statementCoverage`/
`branchCoverage`/`declarationCoverage` por arquivo).

A extensão hoje usa apenas `StatementCoverage` (linha-a-linha), porque o
utPLSQL só produz cobertura por linha (`DBMS_PLSQL_CODE_COVERAGE` → Cobertura
XML `<line number hits>`):

- **Branches**: não replicável — o profiler PL/SQL não expõe ramos
  (IF/ELSE/CASE). Fora de escopo permanente (limitação do Oracle).
- **Functions/declarations**: replicável por **agregação derivada** — o
  mesmo que o c8 faz em linguagens sem cobertura por função: parsear as
  declarações do fonte e marcar "executada" quando as linhas do corpo têm
  hits. O API do VSCode aceita `boolean` como `executed`, então o dado
  qualitativo (executada ou não) é honesto — sem inventar contagens.

Pipeline atual (a extensão já tem quase tudo):

```
parseCobertura(xml) → FileLines[] → resolveSourceUri(file, ...) → arquivo .sql
    → StatementCoverage por linha → FileCoverage.fromDetails(uri, statements)
```

## 3. Objetivos / Não-objetivos

**Objetivos**
- Parsear declarações `PROCEDURE`/`FUNCTION` de arquivos-fonte cobertos
- Calcular `executed` por declaração a partir dos hits de linha
- Emitir `DeclarationCoverage` junto com `StatementCoverage`
- VSCode mostra % de declarações na view Test Coverage (sem nova UI da extensão)

**Não-objetivos**
- Branch coverage (sem dado no profiler PL/SQL)
- Instrumentação própria de código PL/SQL
- Cobertura por teste (`includesTests`/`loadDetailedCoverageForTest`)
- Contagem exata de execuções por função (o dado não existe; só boolean)
- Parser PL/SQL completo (declarações apenas)

## 4. Requisitos

### RF1 — Parser de declarações (`src/plsqlDeclarations.ts`, puro)

Novo módulo puro (sem `vscode`), testável com `node --test`:

```typescript
export interface PlsqlDeclaration {
  name: string;      // ex.: 'CALCULATE'
  line: number;      // 0-based, linha da declaração
}

export function parsePlsqlDeclarations(text: string): PlsqlDeclaration[]
```

Regras:
- Casa `PROCEDURE name` e `FUNCTION name` (case-insensitive, `"name"` com
  aspas opcional) fora de comentários `--`/`/* */`
- Ignora declarações dentro de strings literais `'...'`
- Ignora `PROCEDURE`/`FUNCTION` em packages de teste do próprio arquivo
  (cada arquivo-fonte mapeado é produção — nada a filtrar)
- Sem match → `[]` (nunca lança)

### RF2 — Agregação de hits por declaração

Para cada arquivo coberto (hits > 0 em alguma linha):

1. Lê o fonte via `fs.readFileSync` (arquivos são pequenos; só os cobertos)
2. `parsePlsqlDeclarations(text)` → declarações
3. Escopo de cada declaração: da linha da declaração até a linha da **próxima**
   declaração ou até o fim do arquivo (heurística conservadora — package spec
   simples funciona; corpos complexos podem ter "sobreposição", aceitável)
4. `executed = true` se **qualquer** linha do escopo tem `hits > 0`
5. `executed = false` caso contrário (aparece como não coberta)

### RF3 — Emissão no pipeline de cobertura

Em `applyCoverageFromXml` (`results.ts`), para cada arquivo com statements:

```typescript
const declarations = deriveDeclarations(uri, fileLines);
const details: FileCoverageDetail[] = [
  ...statements,
  ...declarations.map(d => new vscode.DeclarationCoverage(d.name, d.executed, new vscode.Position(d.line, 0))),
];
const fc = vscode.FileCoverage.fromDetails(uri, details);
```

- `state.setCoverage(uri.toString(), details)` continua para
  `loadDetailedCoverage`
- Arquivo ilegível → só `StatementCoverage` (fallback silencioso, sem erro)
- Funciona nos dois modos (CLI e Oracle) — o ponto único é
  `applyCoverageFromXml`

**Não-funcionais**
- RNF1 — Sem regressão nos gutters/% por linha atuais
- RNF2 — Parsing apenas dos arquivos com cobertura (não varre o workspace)
- RNF3 — Falha de leitura/parse nunca quebra a execução de testes
- RNF4 — Cobertura c8 da própria extensão acima dos thresholds

## 5. Solução proposta

### 5.1 Novo módulo puro + integração mínima

- `src/plsqlDeclarations.ts` — parser (RF1) + `deriveDeclarationCoverage`
  (RF2), ambos puros: entrada `(text, fileLines)` → `PlsqlDeclaration[]` com
  `executed`
- `results.ts` — `applyCoverageFromXml` passa a montar `details` com
  `StatementCoverage` + `DeclarationCoverage` (RF3)

Sem settings novas, sem comandos, sem mudança de UX — o VSCode renderiza o
percentual de declarações automaticamente quando os `DeclarationCoverage`
estão presentes.

### 5.2 Limitações assumidas (documentar)

- Package **body** longo com `BEGIN ... EXCEPTION ... END` aninhados: escopo
  "até a próxima declaração" pode vazar para o fim do arquivo — a marcação de
  executada permanece qualitativa e conservadora
- Declarações em `TYPE ... (MEMBER PROCEDURE ...)` de tipos aninhados são
  ignoradas na v1

## 6. Configuração

Nenhuma. Comportamento sempre ativo; para desligar, reverter o PRD.

## 7. Plano de testes

- **Unitários** (`plsqlDeclarations.test.ts`): parser com procedures/functions,
  nomes quotados, comments, strings, case-insensitive; agregação com hits
  presentes/ausentes; arquivo sem declarações; escopo até próxima declaração
- **Unitários** (`results.test.ts`/`cobertura.test.ts`): pipeline emite
  `DeclarationCoverage`; fallback quando fonte ilegível não quebra
- **Integração**: `describeDB` — cobertura de `test_calculator.sql` com banco
  real gera declarações na view (verificar `state.getCoverage` com
  `DeclarationCoverage`)
- **Coverage**: `npm run test:coverage` acima dos thresholds

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Parser PL/SQL incompleto (aninhamentos, tipos) | Escopo conservador; nunca lança; v1 documentada com limitações |
| Marcação errada de "executada" (escopo vazado) | Boolean qualitativo; revisão visual no gutters de declaração |
| Performance (leitura de muitos fontes) | Só arquivos com cobertura > 0; `readFileSync` único por arquivo |
| Mudança de comportamento na view Coverage | Feature é aditiva; rollback = remover os `DeclarationCoverage` |

## 9. Rollout

- Versão alvo: 0.12.0 (minor)
- Sem feature flag (sempre ativo)
- CHANGELOG.md + nota na página Cobertura da wiki/README

## 10. Critérios de aceite

- [ ] `parsePlsqlDeclarations` cobre procedures/functions em specs reais
- [ ] View Test Coverage mostra % de declarações por arquivo
- [ ] Sem regressão nos gutters/percentuais de linha existentes
- [ ] Arquivo-fonte ilegível não quebra a cobertura
- [ ] `npm run compile && npm run lint && node --test` verdes
- [ ] Integração com banco real valida declarações no `state.getCoverage`
- [ ] Docs atualizados (wiki Cobertura, functional 04)

## 11. Questões em aberto

- Escopo do corpo: usar heurística "até a próxima declaração" ou parsear
  `END;`/`IS`/`BEGIN` balanceados (parser maior)?
- Marcar a declaração de package (`PACKAGE name`) também?
- Mostrar contagem agregada de declarações na status bar? (fora da v1)
- `executed` como `boolean` vs soma de hits do escopo (o VSCode aceita
  `number | boolean` — soma é enganosa porque o profiler conta execuções de
  bloco, não de função)?
