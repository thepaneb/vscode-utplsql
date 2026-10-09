---
id: DEP-fast-xml-parser
aliases: [DEP-fast-xml-parser]
tipo: dependencia
status: ativo
titulo: "fast-xml-parser"
nome: fast-xml-parser
versao: "^5.11.1"
escopo: runtime
licenca: MIT
criticidade: media
risco: "CVE-2026-25896 (entity encoding) — corrigido em >=5.3.5; XML vem do reporter"
alternativas: []
tags: [dependencia, runtime, xml]
decisoes: [ADR-008]
regras: [BR-COB-005, BR-PARSE-011]
---

# DEP-fast-xml-parser — fast-xml-parser

## Papel no projeto

Faz o **parse do XML** dos reporters do utPLSQL: JUnit (`src/junit.ts`) e
Cobertura (`src/cobertura.ts`). Puro (sem `vscode`), testável por unidade.

## Riscos

- **CVE-2026-25896** (bypass de entity encoding / XSS via regex em DOCTYPE)
  afeta `>=5.0.0 <5.3.5`; estamos em **5.11.1** (corrigido). Manter atualizado.
- O XML vem do banco (reporter), não de input externo arbitrário — superfície
  reduzida; ainda assim, o output alimenta a UI de testes/cobertura.

## Alternativas

- Parser nativo/SAX (sem dependência) — não adotado.

## Referências

- `package.json` · `src/junit.ts` · `src/cobertura.ts`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 📐 Regras: [[BR-COB-005 - XML Cobertura e cobertura por declaracao sao parseados de forma pura|BR-COB-005]] · [[BR-PARSE-011 - Precedência de status JUnit failure - error - skipped - passed|BR-PARSE-011]]
- 🧭 Decisões: [[ADR-008 - Cobertura a partir do Cobertura XML e VSQL|ADR-008]]
<!-- brain:auto:end -->
