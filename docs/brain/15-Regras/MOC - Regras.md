---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, regras, br]
---

# MOC - Regras de Negócio

Uma nota por **regra atômica** (`BR-*`): uma afirmação verificável ("se X, então
Y"), com ID estável. A fonte primária é o **código** (`fonte: codigo`); PRDs
entram como contexto.

## Como criar

Nova nota em `15-Regras/` no formato `BR-<DOMINIO>-<NNN> - <título>.md`
(template `regra`). Domínios: `conexao`, `execucao`, `descoberta`, `parser`,
`resultados`, `ui`, `cobertura`, `diagnostico`, `schema`, `i18n`.

## Todas as regras

```dataview
TABLE dominio, severidade, status, fonte, file.mtime AS "Atualizado"
FROM "15-Regras"
WHERE tipo = "regra"
SORT id ASC
```

## Quantidade por domínio

```dataview
TABLE length(rows) AS "Qtd"
FROM "15-Regras"
WHERE tipo = "regra"
GROUP BY dominio
SORT dominio ASC
```

## Regras sem teste (lacuna)

```dataview
TABLE id, dominio, implementacao
FROM "15-Regras"
WHERE tipo = "regra" AND status = "ativo" AND (!testes OR length(testes) = 0)
SORT id ASC
```

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[BR-COB-001 - Cobertura Oracle exige GRANT EXECUTE ON SYS.DBMS_PROFILER]] — `BR-COB-001`
- [[BR-COB-002 - resolveSourceUri tenta variantes de extensão e bloqueia path traversal]] — `BR-COB-002`
- [[BR-COB-003 - Cobertura de views via V$SQL é opt-in e best-effort]] — `BR-COB-003`
- [[BR-CONN-001 - Precedência de resolução da conexão]] — `BR-CONN-001`
- [[BR-CONN-002 - Prompt só ocorre quando nada está configurado e não persiste]] — `BR-CONN-002`
- [[BR-CONN-003 - Limpar conexão de sessão reseta o context key]] — `BR-CONN-003`
- [[BR-CONN-004 - Perfil sobrescreve apenas sourcePath, coverageOwner e includePatterns]] — `BR-CONN-004`
- [[BR-CONN-005 - Senha do perfil vai para o SecretStorage ao salvar]] — `BR-CONN-005`
- [[BR-CONN-006 - Recomposição da conexão usa cache-secret e preserva perfil legado]] — `BR-CONN-006`
- [[BR-CONN-007 - Migração de perfis legados é idempotente]] — `BR-CONN-007`
- [[BR-CONN-008 - Mascaramento da senha tolera @ e barra na senha]] — `BR-CONN-008`
- [[BR-CONN-009 - QuickPick de perfil mascara conexão e destaca charset-default]] — `BR-CONN-009`
- [[BR-CONN-010 - Guia de perfis quando não há perfis salvos]] — `BR-CONN-010`
- [[BR-CONN-011 - Importação do SQL Developer é restrita e tolerante a falhas]] — `BR-CONN-011`
- [[BR-CONN-012 - Thick opt-in, fixado na primeira chamada e idempotente]] — `BR-CONN-012`
- [[BR-CONN-013 - Parsing da connection string tolera @ e barra na senha]] — `BR-CONN-013`
- [[BR-CONN-014 - Log de debug é opt-in por variável de ambiente]] — `BR-CONN-014`
- [[BR-CONN-015 - Idioma efetivo - setting válida vence o idioma do editor]] — `BR-CONN-015`
- [[BR-EXEC-001 - Execução usa duas conexões dedicadas (conn1 runner, conn2 poll)]] — `BR-EXEC-001`
- [[BR-EXEC-002 - Conexões do runner têm callTimeout zerado]] — `BR-EXEC-002`
- [[BR-EXEC-003 - Falha na segunda conexão libera a primeira (sem vazamento)]] — `BR-EXEC-003`
- [[BR-EXEC-004 - Prefixo de schema utPLSQL descoberto via ALL_SYNONYMS]] — `BR-EXEC-004`
- [[BR-EXEC-005 - Buffer de saída é limpo antes de cada run]] — `BR-EXEC-005`
- [[BR-EXEC-006 - Reporters gravam na mesma UT_OUTPUT_BUFFER_TMP; CLOB não é usada]] — `BR-EXEC-006`
- [[BR-EXEC-007 - Poll do buffer a cada 200ms por message_id incremental]] — `BR-EXEC-007`
- [[BR-EXEC-008 - Roteamento XML x output de documentação com detecção de CDATA]] — `BR-EXEC-008`
- [[BR-EXEC-009 - Separação do XML de cobertura do XML JUnit no mesmo buffer]] — `BR-EXEC-009`
- [[BR-EXEC-010 - Cancelamento dispara conn.break() nas duas conexões]] — `BR-EXEC-010`
- [[BR-EXEC-011 - Timeout opcional reusa o caminho de cancelamento]] — `BR-EXEC-011`
- [[BR-EXEC-012 - Binds tipados - nenhum valor de usuário concatenado no PL-SQL]] — `BR-EXEC-012`
- [[BR-EXEC-013 - Reporter de cobertura só entra se existir no banco]] — `BR-EXEC-013`
- [[BR-EXEC-014 - Reporters adicionais são validados e sanitizados antes do PL-SQL]] — `BR-EXEC-014`
- [[BR-I18N-001 - Resolução de locale e fallback de tradução]] — `BR-I18N-001`
- [[BR-PARSE-001 - Arquivo só é suite utPLSQL se tiver %suite E CREATE PACKAGE]] — `BR-PARSE-001`
- [[BR-PARSE-002 - RE_PACKAGE aceita schema qualificado, BODY e identificador entre aspas]] — `BR-PARSE-002`
- [[BR-PARSE-003 - %test só materializa teste quando seguido de PROCEDURE; órfão é sobrescrito]] — `BR-PARSE-003`
- [[BR-PARSE-004 - Annotations estendidas só valem após o primeiro %test]] — `BR-PARSE-004`
- [[BR-PARSE-005 - Normalização de %throws, %tags e %displayname]] — `BR-PARSE-005`
- [[BR-PARSE-006 - Descoberta por arquivo descarta suítes-testes disabled, vazios e ilegíveis]] — `BR-PARSE-006`
- [[BR-PARSE-007 - Fallback ALL_OBJECTS-ALL_SOURCE ignora UT_- e nunca lança]] — `BR-PARSE-007`
- [[BR-PARSE-008 - DB-first com gate de versão 3.1.3 e modos de fonte auto-database-file]] — `BR-PARSE-008`
- [[BR-PARSE-009 - Linhas de get_suites_info - 1-based para 0-based e filtros]] — `BR-PARSE-009`
- [[BR-PARSE-010 - Fusão arquivo+banco - arquivo prevalece em uri-linha, banco em descrição-tags]] — `BR-PARSE-010`
- [[BR-PARSE-011 - Precedência de status JUnit failure - error - skipped - passed]] — `BR-PARSE-011`
- [[BR-PARSE-012 - Stack trace - regex quoted-unquoted e filtro de frames do framework]] — `BR-PARSE-012`
- [[BR-PARSE-013 - Mapeamento resultado para teste por lastSegment+name-description com fallback]] — `BR-PARSE-013`
- [[BR-PARSE-014 - message.location só é definida para failed-error com frame de usuário resolvido]] — `BR-PARSE-014`
- [[BR-PARSE-015 - CodeLens gera dois lenses por annotation, na linha da annotation]] — `BR-PARSE-015`
- [[BR-SCHEMA-001 - organization bifurca file tree vs schema tree; suiteMap é o lookup canônico]] — `BR-SCHEMA-001`
- [[BR-SCHEMA-002 - extractSchemaFromPath - path.posix.relative e placeholder {schema}]] — `BR-SCHEMA-002`
- [[BR-SCHEMA-003 - collectAllItems usa cachedItems e, se vazio, percorre até 3 níveis]] — `BR-SCHEMA-003`
- [[BR-UI-001 - Context key utplsql-activated é setado na ativação]] — `BR-UI-001`
- [[BR-UI-002 - utplsql-running liga no início e desliga em todos os caminhos de saída]] — `BR-UI-002`
- [[BR-UI-003 - utplsql-connected reflete a resolução de conexão sem prompt]] — `BR-UI-003`
- [[BR-UI-004 - utplsql-hasFailures derivado de lastFailedItems (failed ou error)]] — `BR-UI-004`
- [[BR-UI-005 - Status bar - gating por setting, throttle de 200ms e ícone por falha-erro]] — `BR-UI-005`
- [[BR-UI-006 - CodeLens registrado apenas em scheme file e padrão .pks sem language id]] — `BR-UI-006`
- [[BR-UI-007 - Diagnósticos de setup e quick-fixes restritos ao source utPLSQL Setup]] — `BR-UI-007`
- [[BR-UI-008 - Diagnósticos de compilação mapeiam ALL_ERRORS e usam source utPLSQL Compilation]] — `BR-UI-008`
<!-- brain:auto:end -->
