---
id: ERR-012
aliases: [ERR-012]
tipo: erro
titulo: ORA-01861 — comparação de DATE em sys_refcursor com NLS resetado cedo
dominio: testes
codigo: ORA-01861
status: ativo
severidade: media
verificado: 2026-10-09
implementacao: []
testes: []
regras: []
tags: [erros, testes, nls]
---
# ERR-012 — ORA-01861 — comparação de DATE em sys_refcursor com NLS resetado cedo

> Verificado contra **utPLSQL v3.2.3.4508-develop** (banco Oracle real, container
> `oracle-data`) em 2026-10-09.

## Sintoma

Ao comparar dois `sys_refcursor` que carregam colunas `DATE`, o teste **erra**
com `ORA-01861: literal does not match format string`, apontando para
`UT3.UT_DATA_VALUE_REFCURSOR` → `UT_EQUAL` → `UT_EXPECTATION`.

## Causa

`ut.set_nls` define o formato de data da sessão; a comparação de refcursors
**re-deriva o formato do DATE a partir do NLS vigente no momento da comparação**
(não do que estava ativo no `OPEN`). Se `ut.reset_nls` for chamado **entre** os
`OPEN` e o `to_equal`, o formato muda no meio e a conversão falha.

Ponto sutil: sem `set_nls` nenhum, a comparação passa — a armadilha é
`set_nls` **seguido de** `reset_nls` cedo.

## Reprodução

```sql
create table glt_dates(d date);
insert into glt_dates values (date '2020-01-15');
commit;

create or replace package ut_nls_demo is
  --%suite(nls demo)

  --%test(reset too early)
  procedure t_bad;
end;
/
create or replace package body ut_nls_demo is
  procedure t_bad is
    l_a sys_refcursor;
    l_e sys_refcursor;
  begin
    ut.set_nls;
    open l_a for 'select d from glt_dates order by d';
    open l_e for 'select d from glt_dates order by d';
    ut.reset_nls;                     -- cedo demais (antes do to_equal)
    ut.expect(l_a).to_equal(l_e);     -- -> ORA-01861
  end;
end;
/
begin ut.run('ut_nls_demo'); end;
/
```

Resultado: `1 errored` com `ORA-01861` em `UT_DATA_VALUE_REFCURSOR`.

## Correção

Manter `ut.set_nls` ativo **até o `to_equal`/`to_contain`**; só então chamar
`ut.reset_nls`:

```sql
    ut.set_nls;
    open l_a for 'select d from glt_dates order by d';
    open l_e for 'select d from glt_dates order by d';
    ut.expect(l_a).to_equal(l_e);     -- ainda sob set_nls
    ut.reset_nls;                     -- depois
```

O snippet `ut-nls-cursor` (PRD-105) encapsula essa sequência correta.

Sem vínculo: comportamento do utPLSQL (teste do usuário), não materializado no
código da extensão; documentado na wiki ([[Troubleshooting]]).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
<!-- brain:auto:end -->
