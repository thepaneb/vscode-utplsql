---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, decisoes, adr]
---

# MOC - Decisões (ADRs)

Registre **por que** decidimos, não só o quê. Use o template `adr`.

## Como criar

Nova nota em `30-Decisoes/` com nome `ADR-NNN - <título curto>.md`.

## Todas as decisões

```dataview
TABLE status, modulo, file.mtime AS "Atualizado"
FROM "30-Decisoes"
WHERE tipo = "decisao"
SORT file.name ASC
```

## Em aberto / propostas

```dataview
LIST FROM "30-Decisoes"
WHERE tipo = "decisao" AND (status = "proposta" OR status = "em discussao")
SORT file.mtime DESC
```

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[ADR-001 - Execucao via Oracle direto]] — `ADR-001`
- [[ADR-002 - Vault como fonte da verdade]] — `ADR-002`
- [[ADR-003 - Descoberta DB-first e organizacao por schema]] — `ADR-003`
- [[ADR-004 - Bundling com esbuild e higiene do VSIX]] — `ADR-004`
- [[ADR-005 - Funcoes canonicas de resultado e matching por nome]] — `ADR-005`
- [[ADR-006 - Modulos puros vs dependentes de vscode]] — `ADR-006`
- [[ADR-007 - i18n via package.nls com 23 locales]] — `ADR-007`
- [[ADR-008 - Cobertura a partir do Cobertura XML e VSQL]] — `ADR-008`
- [[ADR-009 - Integracao nativa ao Test Explorer]] — `ADR-009`
- [[ADR-010 - Perfis de conexao com senha no SecretStorage]] — `ADR-010`
- [[ADR-011 - Thick mode opt-in e matriz de bancos]] — `ADR-011`
- [[ADR-012 - Debugger PLSQL via DBMS_DEBUG e DAP]] — `ADR-012`
<!-- brain:auto:end -->
