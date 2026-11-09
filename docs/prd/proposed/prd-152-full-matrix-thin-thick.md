<!-- GENERATED FROM docs/brain/20-PRDs/prd-152-full-matrix-thin-thick.md — DO NOT EDIT -->

# PRD-152 — Matriz completa local: thin full e thick full em todas as versões

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-11-09 |
| Componente | Matriz local de bancos (`scripts/db-matrix/`) |
| Versão alvo | 0.21.0 |
| Arquivos afetados | `scripts/db-matrix/run.sh`, `scripts/db-matrix/summary.cjs`, `scripts/db-matrix/matrix.env`, `.vscode-test.thick-full.mjs`, `src/test/integration/**`, docs |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-125 (matriz), PRD-150 (thick-full), PRD-123 (11g), PRD-84 (12.2), BR-TEST-001 |

## 1. Resumo

Fazer a matriz local executar **thin full + multiroot + thick full** em todas
as versões possíveis — 12.2, 18xe, 19ee, 21xe e 23free — e **thick full** no
11g (thin é impossível antes de 12.1). O CI permanece inalterado: a matriz
completa é um eixo **local**, com resumo por versão/eixo e skips legacy
determinísticos e documentados.

## 2. Contexto e problema

Hoje `scripts/db-matrix/run.sh` executa um único comando de teste por versão:

- `--full`: thin full + multiroot;
- `--thick`: thick smoke;
- `--thick-full`: full apenas no host thick;
- 19ee só roda smoke na matriz local.

O thick full foi estabilizado no 23free e no 11g (PRD-150), mas as demais
versões nunca foram exercitadas no eixo thick completo; e o 12.2, que usa
utPLSQL 3.1.14, só tem smoke. Isso deixa uma lacuna de confiança: um problema
específico de driver/cliente em 18c/19c/21c ou de utPLSQL 3.1 no 12.2 só
aparece quando alguém roda manualmente, sem resumo e sem critério de skip.

## 3. Objetivos / Não-objetivos

**Objetivos**

- Adicionar um modo local `--full-both` que roda thin full + multiroot + thick
  full por versão (11g: thick full apenas).
- Cobrir **12.2, 18xe, 19ee, 21xe e 23free** nos dois eixos e **11xe** no thick.
- Registrar o resultado por **versão/eixo** (thin e thick), não um status único.
- Tornar os skips de utPLSQL 3.1/11g/12.2 determinísticos (`UTPLSQL_LEGACY=1`),
  documentados e sem `continue-on-error`.
- Manter o CI e os modos atuais (`--full`, `--thick`, `--thick-full`) intactos.

**Não-objetivos**

- Colocar thick full de todas as versões no CI (custo/tempo).
- Rodar multi-root no thick (continua fora do eixo thick).
- Adicionar 26ai/12.1 à matriz.
- Resolver o debugger thick (#288) além dos skips já documentados.
- Mudar a matriz thin do CI ou o dispatch `thick-full` do 23free/11g.

## 4. Requisitos

### RF1 — Modo `--full-both`

- `run.sh --full-both` executa, por versão:
  - **11xe**: somente `npm run test:integration:thick-full`;
  - **demais**: `npm run test:integration`, depois
    `npm run test:integration:multiroot`, depois
    `npm run test:integration:thick-full`.
- A guarda fail-fast do 11g deve olhar o **eixo efetivo** da versão, não o
  comando global; `--full-both --only 11xe` é válido e roda só thick.
- `--full` continua thin-only; `--thick` e `--thick-full` continuam iguais.
- `--continue-on-error` segue permitindo percorrer as versões restantes.

### RF2 — Resumo por eixo

- O resumo JSONL/Markdown passa a registrar uma linha por fase:
  `23free/thin`, `23free/multiroot`, `23free/thick` (idem demais versões).
- Cada linha tem status, duração e log da fase; uma falha no thick não apaga o
  resultado thin já registrado.
- O log por versão continua em `docker/db-matrix/.cache/logs/<label>.log`.

### RF3 — Legacy determinístico (11g e 12.2)

- `UTPLSQL_LEGACY=1` é derivado da versão do utPLSQL (`3.1.x`), cobrindo
  **11xe e 12.2**, e propagado via `WSLENV` ao host de teste.
- Skips legacy já usados no thick: timeout/cancelamento, run por nó Schema,
  `randomOrder`/bind `BOOLEAN` e qualificação do stack frame.
- O thin full do 12.2 recebe o mesmo triage; falhas de produto são corrigidas,
  falhas de versão viram skip explícito com motivo.
- Nenhum skip usa `continue-on-error`; todos aparecem no resumo/documentação.

### RF4 — Cobertura da matriz

- Baseline e triage de **12.2, 18xe, 19ee, 21xe** nos dois eixos; 23free e 11g
  entram como regressão.
- Critério por versão:
  - thin full + multiroot verdes (exceto 11g);
  - thick full verde com 0 falhas fora dos skips documentados;
  - skips listados em `wiki/Tests.md`.

### RF5 — CI e compatibilidade

- CI inalterado: matriz thin do CI e dispatch `thick-full`/`thick-full-11g`.
- `--full-both` é explicitamente local (não entra em workflow).
- `BR-TEST-001` atualizada com o novo modo e com os skips por versão.

**Não-funcionais**

- RNF1 — Sem dependência nova.
- RNF2 — Uma versão por vez na porta 1531 (sem containers simultâneos).
- RNF3 — Skips determinísticos; nada de flaky skip.
- RNF4 — Tempo total local alvo ≤ ~90 min para as 6 versões com volumes já
  criados (thin full ~4 min + thick full ~2–3 min + boot ~1–2 min por versão).
- RNF5 — Thin full continua 119/19 no 23free; thick full 23free continua 80/13/0
  e 11g 72/17/0 com `UTPLSQL_LEGACY=1`.

## 5. Solução proposta

1. Em `run.sh`, adicionar `FULL_BOTH=1` (opção `--full-both`). No loop de
   versões, montar a lista de fases:
   - `client=thick`/11g: `["thick-full"]`;
   - demais: `["thin-full", "multiroot", "thick-full"]`.
2. Extrair a execução de uma fase para uma função (`run_phase`) que:
   - exporta `UTPLSQL_CONN`/`WSLENV`;
   - roda o comando, captura `PIPESTATUS` e duração;
   - chama `summary.cjs append --label "<label>/<phase>"`.
3. Derivar `UTPLSQL_LEGACY` do campo de versão do utPLSQL no loop (não do
   label), mantendo 11g e 12.2 no mesmo caminho.
4. No `.vscode-test.thick-full.mjs`, manter as exclusões de thin-only/UI/
   debugger e aplicar `LEGACY_EXCLUDED` (`runTimeoutE2E`) quando
   `UTPLSQL_LEGACY=1`; o 12.2 usa o mesmo marcador no thin.
5. No `summary.cjs`, aceitar labels compostos sem mudar o schema; validar no
   Markdown que as fases aparecem agrupadas por versão.
6. Rodar o baseline das versões restantes e transformar cada falha em correção
   ou skip documentado.

## 6. Configuração

Nenhuma setting da extensão. Apenas:
- novo flag local `--full-both`;
- env de teste `UTPLSQL_LEGACY` (já usado no 11g) estendido ao 12.2;
- resumo por fase.

## 7. Plano de testes

- **Unitários**: `matrixConfig.test.ts`/`scriptsCli.test.ts` para o novo flag,
  seleção de fases por `client` e `UTPLSQL_LEGACY` derivado da versão;
  `summary` com labels compostos.
- **Integração local**:
  - `--only 12.2 --full-both`;
  - `--only 18xe --full-both`;
  - `--only 19ee --full-both`;
  - `--only 21xe --full-both`;
  - `--only 23free --full-both` (regressão);
  - `--only 11xe --full-both` (só thick; thin explicitamente n/a).
- **Manual**: `--continue-on-error` com uma versão falhando de propósito;
  conferir resumo com fases separadas.
- **CI**: nenhum job novo; rodar `brain:ci`, `docs:check` e `version:check`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| 12.2/utPLSQL 3.1 exigir muitos skips no thin | Triage explícito; skips `UTPLSQL_LEGACY` documentados, sem mascarar |
| 19ee depender de credenciais EE | Imagens já cacheadas localmente; documentar pré-requisito |
| Tempo alto da matriz | Uma versão por vez; volumes persistidos; alvo ≤90 min |
| Thick full falhar em 18/19/21 por versão do client | Testar com Instant Client 23; skip/limitação documentada se necessário |
| Resumo confundir thin/thick | Labels compostos e uma linha por fase |
| Alguém rodar `--full-both` no CI | Documentar como local; não referenciar em workflow |

## 9. Rollout

- Versão alvo **0.21.0**; não entra na 0.20.1.
- `CHANGELOG`: novo modo local e cobertura thick-full das versões.
- Sem migração de settings/estado; CI inalterado.

## 10. Critérios de aceite

- `--full-both --only 23free` verde: thin 119/19 + multiroot 6 + thick 80/13/0.
- `--full-both --only 11xe` verde: thick 72/17/0; thin marcado como n/a.
- 12.2, 18xe, 19ee e 21xe: thin full + multiroot + thick full verdes, ou skips
  legacy documentados.
- Resumo local com uma linha por versão/eixo e logs preservados.
- `--full`, `--thick`, `--thick-full` e o CI sem regressão.
- `BR-TEST-001`, `wiki/Tests.md`, `wiki/Contributing.md`,
  `functional/10-development-tooling.md` e CHANGELOG atualizados.

## 11. Questões em aberto

- Nome final do modo: `--full-both` (proposta) ou outro alias?
- O 12.2 deve ser promovido a full local (com skips) ou continuar
  explicitamente limitado a smoke? A proposta é full com skips legacy.
- O resumo deve manter uma linha por fase (proposta) ou uma linha por versão
  com detalhe de fases no log?

## 12. Impacto no cérebro

Atualizar **`BR-TEST-001`** com `prds: ["PRD-125", "PRD-150", "PRD-152"]` e
`requisitos` dos RF1–RF5, incluindo o modo `--full-both` e os skips por versão.
Se o resumo por fase virar invariante de matriz, criar/ajustar uma regra
`BR-TEST-*` própria. RNFs sem regra: RNF1, RNF2, RNF3, RNF4, RNF5 (tempo,
sem dependência, determinismo, execução serial e regressão — verificadas pela
matriz/CI).

## Impacto nas docs

- `CHANGELOG`: matriz local completa na 0.21.0.
- `wiki/Tests.md`: como rodar `--full-both`, resultados e skips por versão.
- `wiki/Contributing.md`: pré-requisitos locais (Instant Client, volumes,
  credenciais EE) e política de CI inalterada.
- `functional/10-development-tooling.md`: comando e cobertura da matriz.
