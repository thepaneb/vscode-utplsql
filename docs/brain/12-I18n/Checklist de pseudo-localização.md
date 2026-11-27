---
tipo: nota
status: ativo
modulo: i18n
data: 2026-11-25
verificado: 2026-11-25
tags: [i18n, locale, checklist]
---

# Checklist de pseudo-localização

Use no **Extension Development Host** com `UTPLSQL_PSEUDO_LOC=1` (PRD-89). O
pseudo-locale acentua e expande as mensagens em ~30%; o objetivo é revelar
**strings hardcoded** (que ficam em inglês puro) e **overflow de layout** antes
de um locale longo (de/ru) ou RTL (ar/he).

## Como rodar

```sh
UTPLSQL_PSEUDO_LOC=1 code --extensionDevelopmentPath=. <pasta-do-projeto>
```

No host de desenvolvimento, abra o projeto PL/SQL de teste e execute uma suíte
com pass/fail/skip/erro e uma execução com cobertura.

## O que inspecionar

- [ ] **Status bar**: contador, duração, progresso e tooltip sem corte; ícones
      preservados.
- [ ] **Ações rápidas/notificações**: mensagens de sucesso/erro/cancelamento
      acentuadas e sem truncamento estranho.
- [ ] **Test Explorer**: labels de suite/teste, tags e sufixo de duração.
- [ ] **Decorações inline**: tooltip de falha e overview ruler.
- [ ] **Problems Panel**: diagnósticos de compilação e setup com textos longos.
- [ ] **QuickPick**: perfis, reporters, tags, charset e seleção de testes.
- [ ] **Jump to failure / diff inline**: *Expected*/*Actual* legíveis.
- [ ] **Cobertura**: painel, percentuais e tooltips.
- [ ] **Identificadores técnicos**: nomes de pacote/procedure, paths e códigos
      `ORA-` continuam íntegros (só o texto de UI é pseudo).

## RTL (`ar`/`he`)

- [ ] Status bar, tooltips, Test Explorer, decorações e Problems legíveis em RTL.
- [ ] Identificadores (`UT3.PKG`), paths e códigos `ORA-` aparecem **LTR** e na
      ordem correta (FSI/PDI).
- [ ] Números e durações usam o formato do locale (dígitos latinos).
- [ ] Texto que permanecer em inglês é marcado como pendência no
      [[Registro de locales]] (tradução draft/beta).

## Interpretação

- Texto **sem acento/padding** em uma tela = string hardcoded; externalize via
  `t()` e catálogo.
- Texto cortado/estourando = ajustar layout ou encurtar a tradução; registrar no
  [[Registro de locales]] se for específico de um locale.
- O scanner `node scripts/scrape-strings.cjs` cobre o caso estático; o checklist
  cobre o que só aparece em runtime.

## Conexões

- 🗺️ [[MOC - I18n]]
- 📄 [[prd-89-pseudo-localization-gate|PRD-89]]
- 📋 [[Registro de locales]]
