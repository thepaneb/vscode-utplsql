---
id: TPL-FASTXML
tipo: componente-terceiro
titulo: "fast-xml-parser"
dominio: parsing
fornecedor: NaturalIntelligence
licenca: MIT
criticidade: alta
risco: baixo
versao: "^5.11.1"
url: https://github.com/NaturalIntelligence/fast-xml-parser
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["parsing"]
---
## Papel

Parse do XML JUnit e do XML Cobertura produzidos pelos reporters.

## Riscos

Conteúdo vem do banco (não confiável) — parsing defensivo; CDATA com DBMS_OUTPUT
embutido.

## Upgrade/saída

Substituível por outro parser XML se necessário.
