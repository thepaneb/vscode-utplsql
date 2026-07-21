# Troubleshooting

Problemas comuns e suas soluções.

<!-- Capturas de tela de sintomas serão adicionadas conforme necessidade em cada seção -->

## Suites não aparecem

**Sintoma:** A view Testing está vazia, nenhuma suite listada.

**Causa provável:** `utplsql.includePatterns` não cobre seus arquivos de
teste.

**Solução:** Ajuste o padrão glob. Exemplos:

```jsonc
// Se seus testes estão em arquivos .sql (não .pks)
"utplsql.includePatterns": ["**/*.sql"]

// Se quer incluir também .pkb
"utplsql.includePatterns": ["**/*.pks", "**/*.pkb"]
```

Use `utPLSQL: Atualizar testes` (palette) para forçar rediscovery após
alterar a setting.

---

## Cobertura vazia (0%)

**Sintoma:** Testes passam, mas cobertura mostra 0% em todos os arquivos.
Ou output mostra "relatório não gerado".

**Causa 1:** Falta `GRANT EXECUTE ON DBMS_PROFILER`.

**Solução:** Execute como DBA:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema>;
```

**Causa 2:** Reporter `UT_COVERAGE_COBERTURA_REPORTER` não existe no banco
(utPLSQL desatualizado).

**Solução:** Atualize o utPLSQL no banco. Use `utPLSQL: Mostrar informações`
para verificar a versão.

**Causa 3:** Regex em `coverageSourceArgs` não casa com os nomes dos arquivos.

**Solução:** Ative `utplsql.dbmsOutput: true` e inspecione o output do CLI.
O utPLSQL loga quais objetos foram mapeados. Ajuste o regex.

---

## Timeout ao executar

**Sintoma:** Execução é interrompida antes de terminar, com mensagem de
timeout.

**Causa:** Testes demoram mais que `utplsql.timeoutMinutes` (default 60 min).

**Solução:** Aumente o timeout:

```jsonc
"utplsql.timeoutMinutes": 120
```

> A flag `-t` só é enviada se o valor for diferente de 60 — se você
> definir `60`, nenhuma flag é passada (usa o default do CLI).

---

## Erro de conexão

**Sintoma:** "Falha ao conectar", "ORA-12154", ou "Não foi possível
resolver o nome do serviço".

**Causa:** String de conexão malformada, banco inacessível, ou TNS
não configurado.

**Solução:**
1. Use `utPLSQL: Mostrar informações` para validar a conexão diretamente
2. Verifique o formato:
   - EZ Connect: `user/pass@//host:port/service` (note as **duas** barras)
   - TNS: `user/pass@tns_alias` (requer `TNS_ADMIN` e `tnsnames.ora`)
3. Teste a conectividade com `tnsping` ou `sqlplus`

---

## Regex de cobertura não funciona no Windows

**Sintoma:** Cobertura funciona no Linux mas não no Windows (0%), ou
mapeamento inconsistente.

**Causa:** No modo `launcher`, o `cmd` do Windows consome `^` e interpreta
`|` como pipe, corrompendo o regex.

**Solução:** Use `utplsql.invocation: "java"`:

```jsonc
"utplsql.invocation": "java"
```

Veja [Modo de invocação](Modo-de-invocação) para detalhes.

---

## `%suite` não é reconhecido

**Sintoma:** O package existe, mas não aparece como suite no Test Explorer.

**Causa:** Falta uma **linha em branco** entre o `%suite` e os `%test`/procedures.

O parser da extensão trata o `%suite` como uma annotation separada que precisa
de uma linha vazia antes do início do código PL/SQL.

**Errado:**
```sql
create or replace package test_foo as
  -- %suite(Foo)
  -- %test(bar)
  procedure bar;
end;
```

**Correto:**
```sql
create or replace package test_foo as
  -- %suite(Foo)

  -- %test(bar)
  procedure bar;
end;
```

---

## "relatório não gerado"

**Sintoma:** Output mostra "relatório não gerado — verifique GRANT EXECUTE
ON SYS.DBMS_PROFILER".

**Causa:** O CLI não conseguiu gerar o XML de saída (JUnit ou Cobertura).

**Solução:**
1. Verifique permissões de escrita no diretório temporário (`%TEMP%` no
   Windows, `/tmp` no Linux)
2. Verifique os grants do utPLSQL no banco (veja [Requisitos no banco](Requisitos-no-banco))
3. Rode o CLI manualmente para ver o erro completo:

```bash
utplsql run "DEV/senha@//localhost:1521/XEPDB1" \
  -p=test_hello \
  -f=ut_junit_reporter -o=/tmp/results.xml \
  -f=ut_documentation_reporter -c
```

---

## CLI não encontrado

**Sintoma:** "utplsql não é reconhecido como comando interno".

**Causa:** `utplsql.cliPath` aponta para um executável que não existe ou
não está no PATH.

**Solução:** Defina o caminho absoluto:

```jsonc
// Windows
"utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat"

// Linux/macOS
"utplsql.cliPath": "/home/user/utplsql-cli/bin/utplsql"
```

Verifique no terminal:
```bash
# Windows
C:\tools\utPLSQL-cli\bin\utplsql.bat --version

# Linux/macOS
/home/user/utplsql-cli/bin/utplsql --version
```
