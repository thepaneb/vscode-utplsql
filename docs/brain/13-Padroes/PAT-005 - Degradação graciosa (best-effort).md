---
id: PAT-005
tipo: padrao
titulo: "Degradação graciosa (best-effort)"
dominio: erro
categoria: erro
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["erro"]
---
## Intenção

Falhas em recursos auxiliares não podem derrubar nem travar a execução de testes.

## Como se aplica

Diagnósticos de compilação, validação de setup, cobertura de views, leitura de
`ALL_SOURCE` e limpeza de buffer engolem erros (log debug) e seguem. Ex.: sem
grant de `DBMS_PROFILER`, o run continua "sem cobertura".

## Consequências

- **Positivas:** robustez em bancos com grants parciais e falhas transitórias.
- **Negativas:** falhas podem passar silenciosas; dependem de aviso no output.
