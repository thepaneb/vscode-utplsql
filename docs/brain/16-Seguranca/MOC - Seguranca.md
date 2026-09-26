---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, seguranca, sec]
---

# MOC - Segurança

Invariantes de segurança e tratamento de segredos (`SEC-*`). Cada nota deriva de
regras `BR-*` e aponta o controle no código. Foco: o que **não pode** acontecer
(vazar senha, injetar SQL, sair do workspace, escalar privilégio).

## Todas

```dataview
TABLE dominio, severidade, status
FROM "16-Seguranca"
WHERE tipo = "seguranca"
SORT id ASC
```

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[SEC-001 - Senha Oracle nunca é gravada em settings]] — `SEC-001`
- [[SEC-002 - Connection string é sempre mascarada em qualquer saída]] — `SEC-002`
- [[SEC-003 - Senha digitada em sessão só vive em memória]] — `SEC-003`
- [[SEC-004 - Segredos locais ficam fora do controle de versão]] — `SEC-004`
- [[SEC-005 - Nenhum valor de usuário é concatenado no PL-SQL]] — `SEC-005`
- [[SEC-006 - Nome de reporter é sanitizado antes de ir ao PL-SQL]] — `SEC-006`
- [[SEC-007 - Cobertura não aceita caminho fora das raízes do workspace]] — `SEC-007`
- [[SEC-008 - Log de debug é opt-in e não registra credenciais]] — `SEC-008`
- [[SEC-009 - Grants são copiados para o clipboard, nunca executados automaticamente]] — `SEC-009`
- [[SEC-010 - Fluxos não interativos nunca abrem prompt de conexão]] — `SEC-010`
<!-- brain:auto:end -->
