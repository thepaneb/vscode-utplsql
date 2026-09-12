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

Use `utPLSQL: Atualizar testes` (palette) para forçar rediscovery.
Para diagnóstico automático, rode `utPLSQL: Validar configuração`.

---

## Erros de compilação não aparecem no editor

**Sintoma:** Testes falham com erro de compilação, mas o editor não mostra
sublinhados.

**Solução:** Verifique se `utplsql.compilationDiagnostics.enabled` está `true`
(default). Se estiver desabilitado, reabilite:

```jsonc
"utplsql.compilationDiagnostics.enabled": true
```

---

## Cobertura vazia (0%)

**Sintoma:** Testes passam, mas cobertura mostra 0% em todos os arquivos.

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

**Solução:** Verifique os nomes dos arquivos mapeados no Log Output da
extensão (canal `utPLSQL`). Ajuste o regex em `coverageSourceArgs`.

---

## Timeout ao executar

**Sintoma:** Execução é interrompida antes de terminar, com mensagem de
timeout.

**Causa:** Testes demoram mais que `utplsql.timeoutMinutes` (default 60 min).

**Solução:** Aumente o timeout:

```jsonc
"utplsql.timeoutMinutes": 120
```

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

## Caracteres corrompidos ao executar script (`ç`, `ã`, `€`)

**Sintoma:** acentos ou símbolos aparecem trocados no banco após
`utPLSQL: Executar arquivo de script` / `utPLSQL: Executar pasta de scripts`.

**Causa:** o arquivo foi decodificado no encoding errado. O driver Oracle em
modo thin sempre usa AL32UTF8 na conexão — o `charset` do perfil só controla
como o **arquivo** é lido antes do envio.

**Solução:**
1. Confira o encoding real do arquivo e ajuste o `charset` do perfil
   (`utf8` | `latin1` | `win1252`, default `utf8`)
2. O OutputChannel "utPLSQL Script" registra o charset usado no cabeçalho
   (ex.: `seed.sql (win1252)`) — use-o para diagnosticar
3. Não há auto-detecção de encoding (não confiável): marque o charset
   correto no perfil
4. Nota: `latin1` (ISO-8859-1 real) ≠ `win1252` nos bytes `0x80`–`0x9F`
   (ex.: `€` só existe em `win1252`)

---

## `%suite` não é reconhecido

**Sintoma:** O package existe, mas não aparece como suite no Test Explorer.

**Causas prováveis:** o arquivo não tem `%suite` **e** a declaração
`create [or replace] package` (ambos são exigidos pelo parser); ou nenhum
`%test` associado a uma procedure.

O parser é dirigido por tokens — **não** há requisito de linha em branco:

```sql
create or replace package test_foo as
  -- %suite(Foo)
  -- %test(bar)
  procedure bar;
end;
```

Verifique também que o arquivo está coberto por `utplsql.includePatterns` e
rode `utPLSQL: Atualizar testes`.

---

## CodeLens não aparece

**Sintoma:** Botões Run/Run with Coverage não aparecem sobre `%suite` e
`%test` nos arquivos `.pks`.

**Causa 1:** `utplsql.codeLens.enabled` desabilitado.

**Solução:** Verifique no `settings.json`:
```jsonc
"utplsql.codeLens.enabled": true  // default é true
```

**Causa 2:** `editor.codeLens` desabilitado no VSCode.

**Solução:** Habilite:
```jsonc
"editor.codeLens": true
```

---

## Atalhos de teclado não funcionam

**Sintoma:** Os atalhos com prefixo `Ctrl+Shift+U` não executam a ação
esperada, ou executam comando de outra extensão.

**Causa:** Conflito com outra extensão ou atalho do VSCode.

**Solução:** Vá em File → Preferences → Keyboard Shortcuts, busque `utplsql`
e redefina as teclas conforme necessário.

---

## Oracle direto não conecta

**Sintoma:** `runnerMode: oracle` falha com "oracledb não disponível" ou
erro de conexão.

**Causa 1:** `node-oracledb` não está disponível (só ocorre em desenvolvimento
— o VSIX já inclui o driver thin).

**Solução:** Instale a dependência opcional no ambiente de dev:
```bash
npm install oracledb
```

**Causa 2:** Grants ausentes nas tabelas de buffer (shared install).

**Solução:** Execute como DBA:
```sql
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP TO PUBLIC;
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_INFO_TMP TO PUBLIC;
```
Veja [Execução Oracle direta](Execução-Oracle-direta).

---

## Schema sempre "UNKNOWN"

**Sintoma:** No modo `schema`, todos os testes aparecem sob "UNKNOWN".

**Causa:** O `schemaPattern` não corresponde à estrutura de diretórios.

**Solução:** Ajuste o padrão. Exemplos:
```jsonc
// Estrutura: src/HR/tests/ut_hr.pks
"utplsql.organization.schemaPattern": "src/{schema}/tests/**"

// Estrutura: db/APP/packages/ut_foo.pks
"utplsql.organization.schemaPattern": "db/{schema}/**"
```

O placeholder `{schema}` captura exatamente um nível de diretório.
Use `**` para qualquer profundidade de subdiretórios após o schema.

> **Descoberta via banco (0.11.0):** no modo `schema`, quando o Oracle está
> disponível (`runnerMode` `auto`/`oracle` e conexão configurada), a extensão
> também descobre suites direto do banco (`ALL_OBJECTS`/`ALL_SOURCE`) para
> schemas cujos arquivos `.pks` não estão no workspace. Os schemas consultados
> são os diretórios abaixo da base do `schemaPattern` (ex.: `db/*`) e os schemas
> das suites locais. Suites vindas do banco aparecem com URI virtual
> `utplsql-db:/` e **não têm** CodeLens, decorações inline nem jump to failure
> — apenas execução pela árvore. Packages `UT_*` (framework utPLSQL) são ignorados.
