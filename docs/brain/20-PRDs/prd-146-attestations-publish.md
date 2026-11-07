---
tipo: prd
id: PRD-146
status: in-progress
titulo: "Attestations de proveniência na publicação"
versao: "0.20.0"
versao_titulo: "0.20.0 — Observabilidade e desempenho"
data: "2026-11-05"
autor: "security-auditor"
verificado: "2026-11-05"
regras: []
docs: ["CHANGELOG", "SECURITY.md"]
tags: [prd, security, supply-chain]
---

# PRD-146 — Attestations de proveniência na publicação

| Campo | Valor |
|---|---|
| Autor | security-auditor |
| Data | 2026-11-05 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.0 |
| Arquivos afetados | `.github/workflows/publish.yml`, `docs/brain/20-PRDs/prd-146-attestations-publish.md` |
| Esforço estimado | 0,5 dia |
| Complexidade | Média |

## 1. Resumo

Adicionar attestações de proveniência (GitHub Artifact Attestations / SLSA) ao publicar os `.vsix` gerados pelo workflow `publish.yml`, permitindo que consumidores verifiquem integridade e origem dos artefatos.

## 2. Contexto e problema

O workflow já adota boas práticas (ações pinadas por SHA, least privilege, gates `audit:prod`/`version:check`). Falta prova de proveniência dos artefatos publicados — não é possível verificar criptograficamente que um `.vsix` foi gerado por este repositório/workflow exato.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Gerar attestation para cada `.vsix` produzido no job `publish`
- Configurar permissões mínimas necessárias (`id-token: write`, `attestations: write`)
- Documentar verificação com `gh attestation verify`

**Não-objetivos**
- Alterar o fluxo de publicação para VS Code Marketplace
- Adicionar SBOM completo nesta iteração (pode vir depois)
- Mudar versão/empacotamento

## 4. Requisitos

### RF1 — Attestations no publish
Gerar atestado de proveniência para os artefatos `.vsix` usando `actions/attest-build-provenance` com SHA pinado, após empacotamento e antes/após upload para o GitHub Release.

**Não-funcionais**
- RNF1 — Usar ações pinadas por SHA
- RNF2 — Permissões least privilege no job
- RNF3 — Não expor segredos a forks (já coberto pelo gatilho `release: published`)

## 5. Solução proposta

1. Adicionar `id-token: write` e `attestations: write` ao `permissions` do job `publish` (manter `contents: write`)
2. Após "Upload VSIX to GitHub Release" (ou após package), adicionar step `Attest build provenance` com `uses: actions/attest-build-provenance@<sha>` e `subject-path: '*.vsix'`
3. Atualizar CHANGELOG com a melhoria de supply-chain
4. Opcionalmente documentar verificação em SECURITY.md/README

## 6. Configuração

Nenhuma nova setting/comando. Apenas workflow CI.

## 7. Plano de testes

- **Validação manual**: simular run em branch/teste ou revisar workflow; após release real, verificar com `gh attestation verify <arquivo.vsix> --repo thepaneb/vscode-utplsql`
- **CI**: workflow deve continuar passando (permissões corretas)

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Permissões insuficientes (id-token/attestations) | Adicionar explicitamente no job publish; testar em dry-run |
| Ação não pinada por SHA | Usar versão pinada por commit SHA |
| Matriz com múltiplos .vsix | `subject-path: '*.vsix'` cobre todos os artefatos gerados |

## 9. Rollout

- Alvo: **0.20.0** — primeira publicação com attestations verificáveis.
- Implementado no `main` em 2026-11-05 (commit `8750e28`), depois da tag
  `v0.19.0`; a verificação de que todos os `.vsix` recebem attestations acontece
  na publicação da 0.20.0.
- Atualizar CHANGELOG.md

## 10. Critérios de aceite

- [x] Job publish tem `id-token: write` e `attestations: write`
- [x] Step de attestation adicionado com ação pinada por SHA
- [ ] Attestations geradas para todos os .vsix da matriz (pendente da publicação 0.20.0)
- [x] CHANGELOG atualizado
- [ ] Documentação de verificação adicionada (se aplicável)

## 11. Questões em aberto

Nenhuma.

## 12. Impacto no cérebro

nenhuma

## Impacto nas docs

- CHANGELOG: adicionar entrada "Supply-chain: attestations de proveniência nos artefatos publicados"
- Opcional: SECURITY.md ou README (verificação de artefatos)

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- ⚙️ Pipelines: [[PIPE-publish - Publish Extension|PIPE-publish]]
- 🔗 Mesma versão (0.20.0): [[prd-147-marketplace-listing-page|PRD-147]]
- 🚀 ⬅️ release anterior: [[prd-127-vscode-floor-1-125|PRD-127 (0.19.0)]] · ➡️ próxima release: [[prd-148-execution-state-reliability|PRD-148 (0.20.1)]]
<!-- brain:auto:end -->
