# PRD-78 — Ordem aleatória de execução com seed (`a_random_test_order`)

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-19 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `src/oracleRunner.ts`, `src/config.ts`, `src/runner.ts`, `package.json`, `README.md` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Depende de | PRD-69 (runner com binds tipados) |

## 1. Resumo

Expor a opção de rodar os testes em ordem aleatória (`a_random_test_order`) com
seed opcional e reproduzível (`a_random_test_order_seed`), para revelar
dependências de ordem entre testes. Referência de porte:
`paddi35/utplsql-for-vscode` (`utplsql.run.randomOrder` /
`utplsql.run.randomOrderSeed`).

## 2. Contexto e problema

O `ut_runner.run` expõe `a_random_test_order` e `a_random_test_order_seed`, mas
a extensão sempre executa na ordem de declaração. Dependências de ordem ocultas
são um dos bugs mais difíceis em suítes utPLSQL e a única forma de descobri-las
é variar a ordem. Hoje o usuário precisa rodar PL/SQL manualmente.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Settings `utplsql.run.randomOrder` (bool, default `false`) e
  `utplsql.run.randomOrderSeed` (inteiro >= 0, default `0`).
- Propagar os dois como binds no `ut_runner.run`.

**Não-objetivos**
- Ordem aleatória por suíte/teste individual (a API é global ao run).
- Interface gráfica para escolher seed (só setting, por ora).
- Uso de `a_tags` (PRD-69/PRD-51).

## 4. Requisitos

### RF1 — Settings

- `utplsql.run.randomOrder`: default `false`.
- `utplsql.run.randomOrderSeed`: default `0` (`0` = sem seed explícita; o banco
  sorteia e a ordem não é reproduzível).

### RF2 — Binds

No runner da PRD-69, adicionar:

```typescript
binds.randomOrder = { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: cfg.randomOrder ? 1 : 0 };
binds.randomSeed = { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: cfg.randomOrderSeed || null };
```

e no `ut_runner.run`:

```sql
a_random_test_order => :randomOrder,
a_random_test_order_seed => :randomSeed
```

O nome/tipo exato dos parâmetros deve ser confirmado no spike (§8).

### RF3 — Saída informativa

Quando `randomOrder` estiver ativo, anexar ao Output a seed usada (0/aleatória)
para permitir reprodução manual.

**Não-funcionais**
- RNF1 — Sem `randomOrder`, comportamento e SQL idênticos ao atual.
- RNF2 — Não alterar `pathArgs`/cobertura.

## 5. Solução proposta

### 5.1 `src/config.ts`

- `UtConfig.randomOrder: boolean`, `UtConfig.randomOrderSeed: number`.

### 5.2 `src/oracleRunner.ts`

- Novos campos em `OracleRunOptions`; montagem dos binds junto da PRD-69.

### 5.3 `src/runner.ts`

- Passar `cfg.randomOrder`/`cfg.randomOrderSeed` para as opções.

### 5.4 `package.json` / `README.md`

- Duas settings + tabela de config.

## 6. Configuração

- Settings `utplsql.run.randomOrder` e `utplsql.run.randomOrderSeed`.
- Nenhum comando/keybinding.

## 7. Plano de testes

- **Unitários**: `randomOrder=false` não adiciona binds nem cláusulas;
  `randomOrder=true` e seed `0` ⇒ bind da seed `null`; seed positiva ⇒ valor
  numérico.
- **Integração**: suíte com dependência de ordem falha de forma intermitente
  com `randomOrder=true`; com seed fixa, reproduz a mesma ordem.
- **Manual**: rodar com/sem random order e conferir a seed no Output.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Nome do parâmetro divergir entre versões | Spike em `ut_runner.pks`; detectar `ORA-06550` e avisar. |
| Interação com `a_tags` (PRD-69) | Ambos são binds independentes; testar juntos. |
| Seed não suportada em versão antiga | Só enviar a seed quando > 0; `randomOrder` sozinho é o caso base. |

## 9. Rollout

- Release 0.13.0 (minor), default desligado.
- `CHANGELOG.md`: "Ordem aleatória de execução com seed (`a_random_test_order`)".
- README: nova linha na tabela de config.

## 10. Critérios de aceite

- `npm run test:unit` e `npm run lint` passam.
- `randomOrder=true` altera a ordem; seed positiva a reproduz.
- Default não muda nada no SQL gerado (teste de regressão).

## 11. Questões em aberto

- Expor também no `Run with Coverage`? (sim, é a mesma opção de runner)
- Persistir a última seed usada para re-run (`utplsql.rerunLast`)?
