# PRD-13 — Infraestrutura de testes com Oracle real

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-11 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.6.0 |
| Arquivos afetados | Infraestrutura (nenhum arquivo de código fonte) |

## 1. Resumo

Preparar o ambiente de desenvolvimento para testes de integração com um banco Oracle real rodando em container Docker (Oracle 23ai Free). Instalar Java 17+, utPLSQL-cli v3.2.0 no WSL e utPLSQL v3.2.3 no banco, permitindo que a extensão execute suites de teste reais.

## 2. Contexto e problema

Atualmente os testes da extensão são puramente unitários (com dados inline) ou de integração "rasos" — validam apenas se a extensão ativa e comandos registram, sem jamais conectar a um banco Oracle real. Isso deixa lacunas críticas:

- O mapeamento de resultados (JUnit → TestItem) nunca é testado com saída real do utPLSQL.
- A geração de coverage nunca é testada de ponta a ponta.
- A descoberta de suites depende de arquivos `.pks` reais no workspace.
- Problemas de conexão, formatação de reporters e encoding só aparecem em produção.

Há 4 containers Oracle rodando na estação:
| Container | Porta | Banco |
|---|---|---|
| `oracle-data` | 1521 | Oracle 23ai Free (PDB `FREEPDB1`) |
| `oracle-apex` | 1523 | Oracle 23ai Free (PDB `FREEPDB1`) |

O banco está acessível via `localhost:1521/freepdb1` do WSL.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Instalar Java 17+ no WSL (requisito do utPLSQL-cli v3.2.0).
- Baixar e configurar utPLSQL-cli v3.2.0 em `~/utplsql-cli/`.
- Instalar utPLSQL v3.2.3 no PDB `FREEPDB1` do container `oracle-data`.
- Conceder `EXECUTE ON SYS.DBMS_PROFILER` para suporte a cobertura.
- Verificar a instalação com `utplsql info <connection>`.

**Não-objetivos**
- Configurar a extensão do VSCode (escopo do PRD-15).
- Criar schemas/packages de teste (escopo do PRD-14).
- Modificar o código-fonte da extensão.

## 4. Requisitos

### RF1 — Java 17+ no WSL

Instalar OpenJDK 17 ou superior no WSL (Ubuntu).

```bash
sudo apt update && sudo apt install -y openjdk-17-jdk
java -version
# Saída esperada: openjdk version "17.x.x"
```

### RF2 — utPLSQL-cli v3.2.0

Baixar o zip da release e extrair em `~/utplsql-cli/`.

```bash
curl -LO https://github.com/utPLSQL/utPLSQL-cli/releases/download/v3.2.0/utplsql-cli-3.2.0.zip
unzip utplsql-cli-3.2.0.zip -d ~/utplsql-cli
```

Estrutura esperada:
```
~/utplsql-cli/
  bin/utplsql          (script shell Linux)
  lib/*.jar
  etc/
```

### RF3 — utPLSQL v3.2.3 no banco

Baixar o source zip da release v3.2.3, copiar os scripts SQL para o container e executar `ut_i_install.sql` no PDB.

```bash
curl -LO https://github.com/utPLSQL/utPLSQL/archive/refs/tags/v.3.2.3.zip
unzip v.3.2.3.zip
docker cp utPLSQL-3.2.3/source oracle-data:/tmp/utplsql-source
docker exec oracle-data bash -c \
  'sqlplus sys/Oracle#2026@//localhost:1521/freepdb1 as sysdba @/tmp/utplsql-source/ut_i_install.sql'
```

### RF4 — DBMS_PROFILER

Conceder acesso ao pacote de profiler para cobertura.

```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO UT3;
```

### RF5 — Verificação

```bash
~/utplsql-cli/bin/utplsql info SYS/Oracle#2026@//localhost:1521/freepdb1
```

Saída esperada:
```
cli 3.2.0
utPLSQL-java-api 3.2.3
utPLSQL 3.2.3
```

## 5. Solução proposta

N/A — solução puramente de infraestrutura, sem alteração de código.

## 6. Configuração

Nenhuma. O PRD-15 cuidará das settings da extensão.

## 7. Plano de testes

- **Verificação manual**: executar `utplsql info` e confirmar as 3 versões.
- **Unitários**: N/A (sem código novo).
- **Integração**: as validações do PRD-15 dependem desta infraestrutura.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Java 17+ não disponível nos repositórios do WSL | Usar SDKMAN ou download manual do Adoptium |
| utPLSQL v3.2.3 incompatível com Oracle 23ai | Release notes indicam suporte explícito a Oracle 23.26 |
| Porta 1521 conflitante com outro serviço | Verificar com `ss -tlnp \| grep 1521` |
| Senha do SYS expirada ou alterada | Verificar no `docker inspect oracle-data \| grep ORACLE_PWD` |

## 9. Rollout

- Execução imediata — não depende de release.
- A infraestrutura é local (não afeta CI nem publicação).

## 10. Critérios de aceite

- `java -version` retorna 17+.
- `~/utplsql-cli/bin/utplsql info` sem connection mostra CLI + API.
- `~/utplsql-cli/bin/utplsql info <conn>` mostra as 3 versões (CLI, API, DB).
- `SELECT * FROM ut3.ut_version()` retorna resultados.

## 11. Questões em aberto

- Nenhuma.
