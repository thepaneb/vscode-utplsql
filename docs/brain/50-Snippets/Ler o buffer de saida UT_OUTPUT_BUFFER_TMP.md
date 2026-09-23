---
tipo: snippet
status: ativo
linguagem: sql
data: 2026-09-15
tags: [snippet, oracle, buffer]
---

# Ler o buffer de saída UT_OUTPUT_BUFFER_TMP

## Quando usar

Inspecionar manualmente a saída de uma execução `ut_runner.run`. A extensão faz poll desta
tabela a cada 200ms na `conn2` para atualizar o documento em tempo real.

## Código

```sql
-- limpar antes de cada run (feito pela extensão)
DELETE FROM UT3.UT_OUTPUT_BUFFER_TMP;
COMMIT;

-- ler mensagens em ordem (poll incremental pelo message_id)
SELECT message_id, text, is_finished
FROM UT3.UT_OUTPUT_BUFFER_TMP
WHERE message_id > :last
ORDER BY message_id;
```

## Notas

- Prefixo `UT3.` vem de [[Descobrir prefixo do schema utPLSQL]].
- `is_finished` indica o fim do stream (a extensão encerra o poll).
- Todos os reporters (doc, JUnit, coverage) escrevem na **mesma** tabela.
- `UT_OUTPUT_CLOB_BUFFER_TMP` **não** é usado.

## Relacionado

- [[MOC - Oracle]]
- [[ADR-001 - Execucao via Oracle direto]]
