---
tipo: inbox
status: ativo
tags: [inbox]
---

# 📥 Inbox

Despeje ideias, links e tarefas soltas aqui sem organizar. Processe em `90-Daily/` depois
e mova para a pasta certa.

## Não processado

```dataview
LIST FROM "00-Inbox"
WHERE file.name != "Inbox"
SORT file.ctime ASC
```
