---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [home, moc]
---

# 🧠 Second Brain — vscode-utplsql

Hub central do vault. A partir daqui você navega por área.

## Mapas de conteúdo

- [[MOC - vscode-utplsql]]
- [[MOC - Documentacao]]
- [[MOC - Funcional]]
- [[MOC - Arquitetura]]
- [[MOC - Dominio]]
- [[MOC - Regras]]
- [[MOC - NFR]]
- [[MOC - Stack]]
- [[MOC - I18n]]
- [[MOC - Padroes]]
- [[MOC - Componentes]]
- [[MOC - Seguranca]]
- [[MOC - Erros]]
- [[MOC - Glossario]]
- [[MOC - Oracle]]
- [[MOC - Testes]]
- [[MOC - PRDs]]
- [[MOC - Decisoes]]
- [[MOC - Bugs]]
- [[MOC - Snippets]]

## Captura rápida

- [[Inbox]] — despeje tudo aqui, processe depois
- Daily: crie em `90-Daily/` com o template `daily`

## Pendências abertas

```dataview
TABLE status, tipo, file.mtime AS "Atualizado"
FROM "30-Decisoes" OR "40-Bugs" OR "20-PRDs"
WHERE status != "concluido" AND status != "resolvido"
SORT file.mtime DESC
```

## 🔁 Revisar (potencialmente desatualizadas)

> Notas de conhecimento sem `verificado` recente (> 120 dias). Ao revisar, adicione
> `verificado: YYYY-MM-DD` no frontmatter.

```dataview
TABLE file.mtime AS "Modificado", verificado
FROM "10-Projeto" OR "30-Decisoes" OR "40-Bugs" OR "50-Snippets"
WHERE !contains(file.name, "MOC -")
  AND (
    (!verificado AND date(today) - file.mtime > dur(120 days))
    OR (verificado AND date(today) - date(verificado) > dur(120 days))
  )
SORT file.mtime ASC
```

## Últimas notas

```dataview
LIST
FROM ""
WHERE file.name != "Home" AND file.name != this.file.name
SORT file.mtime DESC
LIMIT 15
```
