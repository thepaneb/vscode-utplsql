---
tipo: nota
status: ativo
modulo: i18n
data: 2026-11-25
verificado: 2026-11-25
tags: [i18n, locale, glossario]
---

# Glossário de localização

Termos estáveis para orientar tradução e revisão (PRD-93). O glossário é
**normativo** para os termos técnicos e uma referência para a prosa; cada revisor
in-country registra variações no [[Registro de locales]].

## Termos técnicos (não traduzir)

- `utPLSQL`, `PL/SQL`, `V$SQL`, `DBMS_DEBUG`, `DBMS_PROFILER`,
  `DBMS_PLSQL_CODE_COVERAGE`, `thin`/`thick`, `wallet`, `Test Explorer`,
  `CodeLens`, `JUnit`, `Cobertura`, `ORA-`, `DPI-`.
- Identificadores (`SCHEMA.OBJETO`, nomes de pacote/procedure) e paths nunca são
  traduzidos; em RTL recebem isolamento bidi (PRD-92).

## Preferências por termo

| Termo | Orientação | pt-BR | en | es |
|---|---|---|---|---|
| test | entidade do utPLSQL | teste | test | test |
| suite | agrupamento `%suite` | suíte | suite | suite |
| run | execução | execução | run | ejecución |
| coverage | cobertura de código | cobertura | coverage | cobertura |
| breakpoint | termo do debugger | breakpoint | breakpoint | breakpoint |
| wallet | credencial Oracle Cloud | wallet | wallet | wallet |
| connection profile | perfil salvo | perfil de conexão | connection profile | perfil de conexión |

## Regras de consistência

1. Preferir o termo do glossário a sinônimos na mesma tela.
2. Manter placeholders (`{count}`, `{name}`, `{path}`) intactos.
3. Não traduzir conteúdo de código, XML, SQL ou mensagens do Oracle.
4. Plurais e gênero seguem o CLDR/catálogo (PRD-90); o glossário só fixa o
   vocabulário.
5. Termos novos entram aqui no PR que introduz a string; o `i18n:check` exige os
   termos técnicos acima.

## Conexões

- 🗺️ [[MOC - I18n]]
- 📄 [[prd-93-continuous-localization-pipeline|PRD-93]]
- 🗂️ [[Registro de locales]]
- 📋 [[Política de locales]]
