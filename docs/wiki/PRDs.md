# PRDs e roadmap

A extensão usa **Product Requirements Documents** (PRDs) para planejar e
rastrear funcionalidades.

## O que são PRDs

Documentos Markdown em `docs/prd/` que descrevem uma mudança proposta:
contexto, requisitos, solução, plano de testes e rollout. Cada PRD passa
por um ciclo de vida de 4 estágios.

## Ciclo de vida

```
⚪ Proposto  →  🔵 Aprovado  →  🟡 Em desenvolvimento  →  🟢 Concluído
proposed/       approved/       in-progress/              completed/
```

A **pasta** onde o arquivo está é a fonte da verdade do status. O arquivo
é movido entre pastas conforme avança.

## Roadmap atual

### 🟢 Concluídos

| # | PRD | Versão |
|---|---|---|
| 01 | Modo de invocação `java` | 0.3.0 |
| 02 | Refatoração de `extension.ts` | 0.4.0 |
| 03 | Pipeline CI + Linter | 0.4.0 |
| 04 | Expansão da cobertura de testes | 0.4.0 |
| 05 | Feedback de progresso e cancelamento | 0.5.0 |
| 06 | Suporte a múltiplos workspace folders | 0.5.0 |
| 07 | Upgrade Node 24 + TypeScript 6.0 | 0.4.0 |
| 08 | Opções CLI avançadas como settings | 0.5.0 |
| 09 | Diagnóstico com `utplsql info` | 0.5.0 |
| 10 | Reporters dinâmicos | 0.7.0 |
| 13 | Infraestrutura de testes com Oracle real | 0.6.0 |
| 14 | Schema e objetos de teste utPLSQL | 0.6.0 |
| 15 | Testes de integração com banco real | 0.6.0 |
| 16 | Testes de integração ambos modos de invocação | 0.6.0 |

### 🔵 Aprovados / 🟡 Em desenvolvimento

*(vazio)*

### ⚪ Propostos

| # | PRD | Versão alvo |
|---|---|---|
| 11 | Streaming de resultados em tempo real | 0.8.0 |
| 12 | Cobertura SQL (views) | 0.8.0 |
| 17 | Flags JVM customizáveis para modo `java` | 0.8.0 |
| 18 | Alinhamento `engines.node` com CI | 0.7.1 |
| 19 | Normalização do sistema de PRDs | 0.7.1 |
| 20 | Limpeza de dependências e configurações | 0.7.1 |
| 21 | Melhorias nos workflows CI/CD | 0.8.0 |

## Como propor um PRD

1. Copie `docs/prd/template.md` para `docs/prd/proposed/prd-NN-slug.md`
2. Preencha todos os campos
3. Atualize `docs/prd/index.md` (tabela + árvore)
4. Rode `sync-prds` para criar a issue no GitHub

O catálogo completo está em `docs/prd/index.md`. Issues correspondentes
em [GitHub Issues](https://github.com/thepaneb/vscode-utplsql/issues)
com labels `prd:*`.
