<!-- GENERATED FROM docs/brain/20-PRDs/prd-142-supply-chain-provenance-typecheck-gate.md — DO NOT EDIT -->

# PRD-142 — Proveniência (SLSA) no release e gate de typecheck no CI

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | CI/CD do repositório (`.github/`) |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `.github/workflows/publish.yml`, `.github/workflows/ci.yml`, `package.json` |
| Esforço estimado | 0,5–1 dia |
| Complexidade | Baixa |
| Relaciona-se a | PRD-104 (supply chain), PRD-119 (OSSF Scorecard) |

## 1. Resumo

Adicionar attestations SLSA ao release (proveniência do `.vsix`) e incluir
`npm run typecheck` como gate no CI, fechando lacunas não cobertas por PRD-104
(Dependabot/pin/audit) e PRD-119 (Scorecard).

## 2. Contexto e problema

- PRD-104 cobriu Dependabot, pin de actions e `npm audit`, mas não proveniência.
- PRD-119 publicou Scorecard, mas `typecheck` não roda no CI (só local).
- Adotantes não têm garantia de origem do artefato publicado.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Publicar SLSA provenance no workflow `publish.yml`.
- Adicionar `npm run typecheck` ao CI (job ou step).

**Não-objetivos**
- Mudar código de produção.
- Migrar CodeQL para advanced.

## 4. Requisitos

### RF1 — Proveniência

- Usar action de attestations (ex.: `actions/attest-build-provenance`) no
  `publish.yml` para o `.vsix`.

### RF2 — Gate de typecheck

- CI executa `npm run typecheck` e falha em erro.

**Não-funcionais**
- RNF1 — Sem impacto em tempo de release além do step.

## 5. Solução proposta

- Editar workflows; documentar no SECURITY.md.

## 6. Configuração

Nenhuma setting.

## 7. Plano de testes

- **CI**: verificar que o gate falha em PR com erro de tipo.
- **Release**: verificar attestation publicada.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Permissão insuficiente no workflow | `permissions: id-token: write` |

## 9. Rollout

- 0.20.0; registrar no CHANGELOG.

## 10. Critérios de aceite

- Proveniência publicada no release.
- `typecheck` gate ativo no CI.

## 11. Questões em aberto

- Nível SLSA (L2 vs L3)?

## 12. Impacto no cérebro

Ao concluir, atualizar wiki/Contributing. Enquanto `proposed`, `regras: []`.

## Impacto nas docs

Superfícies: CHANGELOG, wiki.
