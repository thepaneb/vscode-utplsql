# Reporters customizados

A extensão registra reporters por execução. Dois estão sempre presentes; a
cobertura só é adicionada ao rodar **com cobertura**:

| Reporter | Saída | Função |
|---|---|---|
| `ut_documentation_reporter` | `UT_OUTPUT_BUFFER_TMP` (no banco, streamado) | Saída de teste no log da execução |
| `ut_junit_reporter` | `UT_OUTPUT_BUFFER_TMP` (no banco, streamado) | Resultados → Test Explorer |
| `ut_coverage_cobertura_reporter` | `UT_OUTPUT_BUFFER_TMP` (no banco, streamado) | Cobertura → gutters + aba Coverage (só com cobertura) |

Todos os reporters escrevem na mesma tabela de buffer no banco
(`UT_OUTPUT_BUFFER_TMP`); não existem arquivos `results.xml`/`coverage.xml`. A
extensão faz polling do buffer e transmite a saída em tempo real.

## Validação dinâmica de cobertura

Antes de rodar com cobertura, a extensão consulta o banco via
`TABLE(ut_runner.get_reporters_list())` — no prefixo do schema utPLSQL
descoberto. Se `UT_COVERAGE_COBERTURA_REPORTER` não existir (ex.: utPLSQL
desatualizado), a cobertura é **pulada com aviso** no output. A execução dos
testes nunca é bloqueada.

## Reporters adicionais fixos

Setting `utplsql.additionalReporters` — incluídos em toda execução:

```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```

Os reporters padrão são deduplicados automaticamente — não precisa
removê-los da lista.

## Reporter volátil por sessão

Comando da palette **utPLSQL: Selecionar reporter adicional...**:

1. Abre um QuickPick com a lista dinâmica de reporters disponíveis no banco
2. O reporter escolhido é guardado no estado de sessão
3. **A seleção não é aplicada** na versão Oracle-only atual
   (`consumeExtraReporter()` nunca é chamado)

Para realmente incluir um reporter extra, use a setting fixa
`utplsql.additionalReporters`.

![QuickPick com lista de reporters disponíveis](../images/quickpick-reporters.png)

O QuickPick lista os reporters reportados pelo banco; a versão atual não aplica
a seleção.

## Criando um custom reporter

Exemplo mínimo de reporter PL/SQL que loga em uma tabela:

```sql
create table test_report_log (
  test_name varchar2(200),
  status varchar2(20),
  duration interval day to second,
  run_ts timestamp default systimestamp
);

create or replace package custom_reporter as
  -- %suite(Custom Reporter)

  procedure before_calling_run;
  procedure after_calling_run;

  procedure before_calling_suite(a_suite ut_suite_item);
  procedure after_calling_suite(a_suite ut_suite_item);

  procedure before_calling_test(a_test ut_test);
  procedure after_calling_test(a_test ut_test);
end;
/

create or replace package body custom_reporter as

  procedure before_calling_run is begin null; end;

  procedure after_calling_run is begin null; end;

  procedure before_calling_suite(a_suite ut_suite_item) is begin null; end;

  procedure after_calling_suite(a_suite ut_suite_item) is begin null; end;

  procedure before_calling_test(a_test ut_test) is begin null; end;

  procedure after_calling_test(a_test ut_test) is
    v_status varchar2(20);
  begin
    select status into v_status
      from ut_test_result where test_id = a_test.id;

    insert into test_report_log (test_name, status, duration)
    values (a_test.name, v_status, a_test.execution_time);
  end;

end;
/
```

Para usar, adicione ao `additionalReporters`:

```jsonc
"utplsql.additionalReporters": ["CUSTOM_REPORTER"]
```

> Reporters customizados recebem chamadas de callback do framework utPLSQL
> durante a execução. Para detalhes da API, veja a
> [documentação do utPLSQL](https://github.com/utPLSQL/utPLSQL).
