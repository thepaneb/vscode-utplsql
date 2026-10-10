---
tipo: prd
id: PRD-112
aliases: [PRD-112]
status: proposed
titulo: "Auditoria de tratamento de erros: `catch` silenciosos e robustez"
versao: "0.23.0"
data: "2026-10-10"
autor: "Gil Cleber Barboza"
versao_titulo: "0.23.0 — Qualidade interna"
verificado: 2026-10-10
regras: []
tags: [prd]
---

# PRD-112 — Auditoria de tratamento de erros: `catch` silenciosos e robustez

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-10 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `src/connectionProfiles.ts`, `src/viewCoverage.ts`, `src/dbSourceProvider.ts`, `src/debugger.ts`, `src/scriptRunner.ts`, `src/quickfix.ts`, `src/commands/*`, `src/logger.ts` |
| Esforço estimado | 1–2 dias |
| Complexidade | Baixa-Média |
| Relaciona-se a | PRD-66 (logging), PRD-102 (observabilidade) |

## 1. Resumo

O projeto tem **~100 blocos `catch`**, dos quais **49 usam `catch {}` sem binding**
("best-effort" que não expõem o erro). A maioria é intencional e correta, mas
parte suprime a causa de forma que dificulta o diagnóstico em campo. Esta PRD
**inventaria, classifica e padroniza** esses tratamentos: todo `catch` que não
propaga deve, no mínimo, registrar `logger.debug`/`warn` (ou ter comentário
explícito justificando a supressão).

## 2. Contexto e problema

- Menos de metade dos `catch {}` registram a causa; alguns apenas engolem o erro
  sem deixar rastro — p.ex. `src/connectionProfiles.ts:93,101,176`,
  `src/viewCoverage.ts` (vários), `src/dbSourceProvider.ts:53,96,122,147`.
- Não há um **critério escrito** de quando um `catch` pode ser silencioso; a
  decisão fica implícita e inconsistente entre módulos.
- Em operações auxiliares (cache, watcher, mapeamentos), uma falha silenciosa
  pode se manifestar como comportamento "estranho" sem nenhuma pista no
  `LogOutputChannel`, alongando o tempo de suporte.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Inventariar todos os `catch {}` sem binding e classificá-los:
  (a) best-effort justificável, (b) erro que deveria ser visível, (c) bug.
- Garantir que cada caso (a) registre ao menos `logger.debug` com contexto
  (arquivo/operação) e, quando relevante, `logger.warn`.
- Documentar o critério ("o que pode ser silencioso") no vault.

**Não-objetivos**
- Alterar o comportamento de falha do fluxo principal (run/descoberta), que já
  propaga corretamente.
- Introduzir tratamento de erro global / retry.
- Trocar `logger` por outra solução (escopo da PRD-102).

## 4. Requisitos

### RF1 — Inventário e classificação

- Gerar a lista dos `catch {}` (sem binding) e dos `catch (e)` que descartam `e`
  sem uso, com arquivo:linha e a operação envolvida.
- Marcar cada item como best-effort / visível / bug, com a decisão registrada.

### RF2 — Padronização

- Casos best-effort passam a registrar `logger.debug(<operação>, { error })`.
- Casos que indicam degradação percebível (ex.: falha de cache que força nova
  consulta, cobertura não aplicada) passam a `logger.warn`.
- Casos (c) viram correção pontual (com teste de regressão).

### RF3 — Critério documentado

- Documentar em nota do vault + seção do log a regra: *"`catch` silencioso só
  quando a falha é irrelevante para o usuário e o custo de logar é maior que o
  benefício; caso contrário, logar a causa em nível apropriado"*.

**Não-funcionais**
- RNF1 — Nenhuma mensagem de log expõe connection/credencial (SEC-002).
- RNF2 — Sem regressão de comportamento; cobertura ≥ thresholds.
- RNF3 — Nenhum `catch {}` sem comentário ou log passa em revisão (verificável
  por um teste/regex de convenção).

## 5. Solução proposta

- Fazer a varredura e classificar caso a caso (a lista entra como anexo da PRD
  durante a implementação).
- Aplicar `logger.debug`/`warn` onde falta, reusando a convenção
  `<função>: <o que falhou>` já adotada em `oracleRunner.ts`.
- Avaliar um teste de convenção (regex sobre `src/**`) que falhe se surgir um
  `catch {}` sem comentário imediatamente justificando.

## 6. Configuração

Nenhuma setting nova. O log segue gateado por `UTPLSQL_DEBUG=1` (PRD-66/102).

## 7. Plano de testes

- **Unitários**: para cada caso convertido em `warn`/correção, teste que simula a
  falha e verifica a chamada ao sink de log (injetável via `setLogSink`).
- **Convenção** (se adotada): teste que varre `src/**` e falha em `catch {}` sem
  justificativa.
- **Manual**: forçar falha de cache/cobertura e conferir a mensagem no canal
  `utPLSQL`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Logar demais polui o canal | Nível `debug` por padrão (só com `UTPLSQL_DEBUG=1`); `warn` só quando há degradação |
| Convenção por regex dar falso positivo | Permitir comentário/`biome-ignore` explícito na linha anterior |
| "Bug" encontrado virar scope creep | Corrigir o mínimo + teste; mudanças maiores viram PRD separada |

## 9. Rollout

- **0.23.0** ("Qualidade interna"); sem mudança de comportamento pretendida.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Inventário completo dos `catch {}` com decisão por item.
- Todo `catch` best-effort registra `debug`/`warn` **ou** tem justificativa.
- Nenhuma credencial em log (revisão + SEC-002).
- Suíte e cobertura verdes.

## 11. Questões em aberto

- Adotar o teste de convenção ou apenas a revisão humana?
- Centralizar o log de erro no wrapper de conexão (relaciona-se à PRD-110)?

## 12. Impacto no cérebro

Ao concluir, criar a regra `BR-LOG-*` ("`catch` best-effort registra a causa ou
justifica a supressão") com `prds: ["PRD-112"]`, `implementacao:` e `testes:`.
Enquanto `proposed`, `regras: []`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-66-connection-robustness-logging|PRD-66]] · [[prd-102-trace-and-perf-instrumentation|PRD-102]] · [[prd-110-defensive-hardening|PRD-110]]
- 🔗 Mesma versão (0.23.0): [[prd-111-decompose-oracle-runner|PRD-111]] · [[prd-113-lint-scope|PRD-113]] · [[prd-114-vscode-stub-modernization|PRD-114]] · [[prd-115-split-i18n-locales|PRD-115]] · [[prd-116-direct-module-tests|PRD-116]] · [[prd-117-split-script-property-tests|PRD-117]]
- 🚀 ⬅️ release anterior: [[prd-93-continuous-localization-pipeline|PRD-93 (0.22.0)]]
<!-- brain:auto:end -->
