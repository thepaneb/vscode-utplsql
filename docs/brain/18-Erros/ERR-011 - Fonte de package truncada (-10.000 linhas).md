---
id: ERR-011
tipo: erro
titulo: Fonte de package truncada (>10.000 linhas)
dominio: descoberta
codigo: discovery.sourceTruncated
status: ativo
severidade: baixa
verificado: 2026-09-23
implementacao: ["src/discovery.ts:199"]
testes: ["src/test/unit/discovery.test.ts"]
regras: ["BR-PARSE-007", "BR-PARSE-008"]
tags: ["erro", "descoberta"]
---
## Sintoma

Aviso de que o fonte do package é muito grande e pode estar truncado.

## Causa

Leitura de ALL_SOURCE acima de 10.000 linhas no fallback de descoberta.

## Correção

Preferir a descoberta DB-first (get_suites_info, utPLSQL >= 3.1.3) ou revisar o package; a extensão emite warning e ainda parseia.

