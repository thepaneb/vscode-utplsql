<!-- GENERATED FROM docs/brain/20-PRDs/prd-69-oracle-runner-typed-binds.md — DO NOT EDIT -->

# PRD-69 — Runner Oracle: binds tipados, `a_tags` e validação de reporters

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-15 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/config.ts`, `src/runner.ts`, `package.json`, `README.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Incorporar ao runner da extensão as melhorias observadas no CLI oficial
`utPLSQL/contrib/ts-runner` (`src/cli.ts`): binds tipados para as coleções
`UT_VARCHAR2_LIST` (em vez de concatenar literais PL/SQL), suporte a
`a_tags` no `ut_runner.run` e validação dos reporters adicionais contra o
banco. Mantém-se a arquitetura atual (procedure `ut_runner.run` + múltiplos
reporters + polling do buffer), sem migrar para a função pipelined.

## 2. Contexto e problema

O `ts-runner` (`D:\...\utPLSQL\contrib\ts-runner\src\cli.ts`) é um orquestrador
TypeScript que roda utPLSQL via node-oracledb. Comparado ao nosso
`executeRunOracle`, ele tem três práticas mais robustas:

1. **Binds tipados de coleções.** O CLI passa os paths como parâmetro bind do
   tipo de banco (`cli.ts:98`):
   ```typescript
   paths: { dir: oracledb.BIND_IN, type: 'UT_VARCHAR2_LIST', val: opts.paths }
   ```
   Já o nosso runner monta o SQL por concatenação com escape manual de aspas
   (`oracleRunner.ts:472-493`):
   ```typescript
   const pathsList = pathArgs.length
     ? pathArgs.map((p) => `'${p.replace(/'/g, "''")}'`).join(',')
     : '';
   // ... a_paths => ut_varchar2_list(${pathsList})
   ```
   Funciona, mas é frágil (qualquer valor com caractere inesperado depende do
   escape manual) e dificulta leitura/manutenção.

2. **`a_tags`.** O `ut_runner.run` expõe `a_tags varchar2 := null`
   (`source/api/ut_runner.pks:74`) e o `ts-runner` a usa (`--tags`), mas a
   extensão nunca passa esse parâmetro. O README registra "filtro por tag é
   roadmap" (linha 189).

3. **Validação de reporter.** O `ts-runner` valida o nome do reporter contra o
   mapa conhecido (`cli.ts:205-209`). Nós só validamos o formato do
   identificador (`oracleRunner.ts:456`) e depois emitimos `ut_foo_reporter()`,
   sem confirmar que o objeto existe no banco — um reporter inexistente falha
   no meio da execução.

**Por que não migrar para o pipelined `ut.run`:** a função recebe **um único**
`a_reporter ut_reporter_base` (`source/api/ut.pks:54-70`) e internamente faz
`ut_reporters(a_reporter)`. Não há overload com lista; obter documentação +
JUnit + cobertura exigiria executar os testes 3×. A procedure
`ut_runner.run(a_reporters => ut_reporters(...))` roda uma vez e coleta tudo —
requisito da UX do Test Explorer.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Substituir a interpolação de SQL por binds tipados para `a_paths`,
  `a_coverage_schemes` e os paths de mapeamento de cobertura.
- Expor `a_tags` via setting global.
- Validar reporters adicionais contra `ut_runner.get_reporters_list` antes de
  incluí-los no run.

**Não-objetivos**
- Migrar para a função pipelined `ut.run` / abandonar o buffer interno.
- Alterar o modelo de conexão (permanece a string única e os perfis atuais).
- UI de seleção por tag (PRD-51/PRD-55) — aqui só o **passthrough servidor** de
  `a_tags`.
- **Possibilidade documentada (Fase 4, adiada):** aceitar connection string apenas
  com `connectString`, sem credenciais embutidas (`user/pass@`), como o
  `parseConnectString` do `ts-runner` (`cli.ts:134-150`). Fica fora do escopo
  por ora (ver §11).

## 4. Requisitos

### RF1 — Binds tipados para coleções

Em `executeRunOracle`, montar o bloco PL/SQL usando binds em vez de literais:

```typescript
const binds: Record<string, unknown> = {
  paths: { dir: oracledb.BIND_IN, type: 'UT_VARCHAR2_LIST', val: pathArgs },
  tags: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: tags || null },
};
if (coverageEnabled) {
  binds.schemes = { dir: oracledb.BIND_IN, type: 'UT_VARCHAR2_LIST', val: [owner] };
  binds.owner = { dir: oracledb.BIND_IN, type: oracledb.STRING, val: owner };
  binds.filePaths = { dir: oracledb.BIND_IN, type: 'UT_VARCHAR2_LIST', val: [sourcePath] };
}

const plsql = `BEGIN ut_runner.run(
  a_paths => :paths,
  a_reporters => ut_reporters(${runners.join(',')}),
  a_coverage_schemes => ${coverageEnabled ? ':schemes' : 'null'},
  a_source_file_mappings => ${
    coverageEnabled
      ? `ut_file_mapper.build_file_mappings(
           a_object_owner => :owner,
           a_file_paths => :filePaths
         )`
      : 'null'
  },
  a_tags => :tags
); END;`;

await conn1.execute(plsql, binds, { autoCommit: true });
```

- O tipo é usado **sem prefixo** (`UT_VARCHAR2_LIST`), pois há synonym no schema
  do usuário (`source/create_synonyms.sql:83`). Em shared install o grant é via
  synonym, não no owner descoberto — não usar o prefixo de
  `discoverUtplsqlSchema` no nome do tipo.
- `a_reporters` permanece literal (a coleção `ut_reporters` são constructores de
  objeto, não bindáveis); os nomes já são validados por regex.

### RF2 — `a_tags`

- Nova setting `utplsql.tags` (string, default `""`); vazio ⇒ `null`.
- Propagar `tags` em `UtConfig` (`config.ts`), em `OracleRunOptions`
  (`oracleRunner.ts:340-375`) e no preenchimento em `runner.ts:107`.
- Bind `:tags` como `oracledb.STRING`.

### RF3 — Validação de reporters adicionais

- Ao processar `additionalReporters` + reporter volátil da sessão
  (`oracleRunner.ts:443-470`), consultar **uma vez** `listReportersOracle(conn1)`
  e montar um `Set` case-insensitive.
- Se a lista não vier vazia (query inacessível ⇒ não bloquear) e o reporter não
  existir, `logger.warn` e `continue` — **sem nova chave i18n**, pois
  `i18n.test.ts` exige paridade de chaves nos 24 catálogos.

**Não-funcionais**
- RNF1 — Cobertura de testes TypeScript mantida (thresholds atuais 90/85/90).
- RNF2 — Nenhum valor de usuário concatenado no PL/SQL a partir desta mudança.
- RNF3 — Comportamento idêntico quando `utplsql.tags` está vazio e os reporters
  são os padrão.

## 5. Solução proposta

### 5.1 `oracleRunner.ts`

- Reescrever a montagem de `plsql`/`binds` (RF1) mantendo as decisões atuais:
  `coverageEnabled` alterna o reporter de cobertura e o mapeamento de arquivos
  (`oracleRunner.ts:429-486`).
- Adicionar `tags` a `OracleRunOptions` e bindá-la.
- Chamar `listReportersOracle` uma vez e filtrar `extraReporters` (RF3).

### 5.2 `config.ts` / `runner.ts`

- `UtConfig.tags: string`; `readConfig` lê `c.get<string>('tags', '')`.
- `runner.ts` passa `tags: cfg.tags` ao `OracleRunOptions`.

### 5.3 `package.json` / `README.md`

- Setting `utplsql.tags` com descrição em pt-BR (settings não usam `%nls%`).
- README: nova linha na tabela de config e ajuste da nota "tag filtering is
  roadmap" (linha 189) para refletir que o filtro servidor existe; atualizar
  também as variantes de idioma e a wiki (skill `docs-fidelity`).

## 6. Configuração

- Nova setting: `utplsql.tags` (string, default `""`) — expressão de tags
  aceita pelo utPLSQL (ex.: `fast` ou `fast & !integration`).
- Nenhum comando/keybinding novo.

## 7. Plano de testes

- **Unitários** (`src/test/unit/oracleRunner.test.ts`):
  - Ajustar fakes para expor `BIND_IN`/`STRING` (como já fazem com `BIND_OUT`).
  - Assertar que o SQL contém `a_paths => :paths` e `a_tags => :tags`, e que os
    binds carregam `type: 'UT_VARCHAR2_LIST'` com o array esperado.
  - Cobertura desabilitada ⇒ `a_coverage_schemes => null` e sem binds de
    mapeamento; habilitada ⇒ `:schemes`/`:owner`/`:filePaths`.
  - Reporter desconhecido em `additionalReporters` é ignorado (com warn);
    `get_reporters_list` indisponível não bloqueia os reporters configurados.
  - `tags` vazio ⇒ bind `null`.
- **Integração** (banco real, `UTPLSQL_CONN`):
  - Suite com `%tags(fast)` + `utplsql.tags = 'fast'` executa só as suítes
    marcadas; sem a setting, executam todas.
  - Coverage com múltiplos paths e owner, validando o bind de
    `UT_VARCHAR2_LIST` (não coberto pelo fake).
- **Validação manual**: run sem cobertura, com cobertura, com reporter adicional
  válido e inválido, e com tags.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Bind de array vazio difere de `ut_varchar2_list()` vazio | Spike em banco real antes de finalizar; array vazio ↔ lista vazia (mesma semântica de "todos"). |
| Nome do tipo `UT_VARCHAR2_LIST` não resolve em algum install | Fallback para a montagem literal atual se o bind falhar (detectar `ORA-00904`/`ORA-06550` e repetir uma vez). |
| `get_reporters_list` inacessível bloquear reporter legítimo | Só filtrar quando a lista vier não vazia. |
| `a_tags` com expressão inválida abortar o run | Erro já é exibido no output pelo fluxo atual (`runner.oracleError`); documentar sintaxe no README. |
| Paridade de chaves i18n | Não adicionar chave de runtime (usar `logger.warn`). |

## 9. Rollout

- Release 0.13.0 (minor) — melhoria sem quebra de contrato.
- Sem feature flag: comportamento default inalterado (`tags` vazio).
- `CHANGELOG.md`: "Runner Oracle com binds tipados, filtro por tag e validação de
  reporters".

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- SQL do run não contém mais valores concatenados para paths/owner/paths de
  cobertura.
- `utplsql.tags` filtra a execução no servidor (`a_tags`).
- Reporter adicional inexistente não é enviado ao `ut_runner.run`.
- Documentação (README + variantes + wiki) e vault (`brain:sync`/`brain:check`)
  consistentes.

## 11. Questões em aberto

- **Fase 4 (adiada) — connection string só com `connectString`.** O
  `ts-runner` aceita `{ connectString }` sem `user/password`
  (`cli.ts:134-150`); nosso `parseConnString` lança se faltar `user`/`@`
  (`oracleRunner.ts:41`). Adotar isso propaga para `dbSourceProvider`,
  `debugger`, `discovery`, `quickfix`, `scriptRunner` e `viewCoverage`, e
  quebra o uso de `parseConnString(connection).user` como owner de cobertura
  (`oracleRunner.ts:475`, `viewCoverage.ts:121`). Reavaliar quando houver caso
  concreto (autenticação externa/wallet), com fallback de owner via
  `SELECT USER FROM dual`. **Fora do escopo desta PRD.**
- `utplsql.tags` deve ser um override por execução (QuickPick) em vez de setting
  global? Relacionado a PRD-51.
- Suportar `a_include_schema_expr`/`a_exclude_schema_expr` no mesmo passe?
