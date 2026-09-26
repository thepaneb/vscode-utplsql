---
id: TPL-FASTXML
aliases: [TPL-FASTXML]
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
relacionado: ["[[MOC - Stack]]", "[[03-results-and-reporting]]"]
tags: ["parsing"]
---
## Papel

Parse do XML JUnit e do XML Cobertura produzidos pelos reporters.

## Riscos

Conteúdo vem do banco (não confiável) — parsing defensivo; CDATA com DBMS_OUTPUT
embutido.

## Upgrade/saída

Substituível por outro parser XML se necessário.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Componentes]]
- 🔗 [[MOC - Stack]] · [[03-results-and-reporting]]
<!-- brain:auto:end -->
