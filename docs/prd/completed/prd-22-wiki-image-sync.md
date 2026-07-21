# PRD-22 — Sincronizar imagens no workflow da wiki

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | CI/CD `.github/workflows/wiki.yml` |
| Versão alvo | 0.7.1 |
| Arquivos afetados | `.github/workflows/wiki.yml` |

## 1. Resumo

O workflow `wiki.yml` publica as páginas `.md` da wiki mas ignora o diretório
`docs/wiki/images/`. Com isso as imagens referenciadas nas páginas nunca chegam
ao repositório wiki do GitHub, forçando upload manual e criando inconsistência
entre o conteúdo versionado no repositório e o conteúdo visível na wiki.

## 2. Contexto e problema

O step **Copy wiki pages** (linha 26) copia apenas arquivos `.md`:

```yaml
- name: Copy wiki pages
  run: |
    cp docs/wiki/*.md /tmp/wiki/
```

O glob `*.md` não inclui subdiretórios. As imagens em `docs/wiki/images/` são
ignoradas.

O spec de screenshots (`docs/wiki/images/README.md`) define 21 screenshots
referenciados pelas páginas da wiki (`Home.md`, `Guia-rápido.md`, `Comandos.md`).
Atualmente 6 existem e 15 estão pendentes (PRD-23). Sem a sincronização, todo
screenshot novo ou atualizado precisa de upload manual na interface web da wiki
do GitHub — um passo propenso a esquecimento e inconsistência.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Copiar o diretório `docs/wiki/images/` recursivamente para o clone wiki durante
  o job `publish`
- Garantir que o job não falha quando `images/` não existir (compatível com
  branches que não tenham screenshots)

**Não-objetivos**
- Gerar, redimensionar ou modificar imagens
- Reorganizar a estrutura de diretórios da wiki
- Alterar o trigger do workflow (continua `push` para `docs/wiki/**` em `main`)

## 4. Requisitos

### RF1 — Cópia recursiva do diretório de imagens

O step **Copy wiki pages** deve copiar `docs/wiki/images/` e todo o seu conteúdo
para `/tmp/wiki/images/`.

### RF2 — Tolerância a diretório ausente

Se `docs/wiki/images/` não existir, o job deve continuar sem erro. Isso garante
que o workflow funcione em branches que não tenham screenshots (ex.: branches de
PR que alteram apenas arquivos `.md`).

**Não-funcionais**
- Nenhuma dependência nova (usa apenas comandos bash padrão)
- Nenhuma alteração no `permissions` ou `runs-on`

## 5. Solução proposta

### 5.1 Step Copy wiki pages

Substituir o comando atual por duas linhas — a primeira copia `.md`, a segunda
copia `images/` condicionalmente:

```yaml
- name: Copy wiki pages
  run: |
    cp docs/wiki/*.md /tmp/wiki/
    [ -d docs/wiki/images ] && cp -r docs/wiki/images /tmp/wiki/
```

`[ -d ... ] &&` testa se o diretório existe antes de tentar copiá-lo. Sem o
teste, `cp -r` falharia (exit code != 0) em branches sem o diretório, abortando
o job.

## 6. Configuração

Nenhuma.

## 7. Plano de testes

- **Unitários**: não aplicável (workflow CI/CD).
- **Integração**: push para branch com `docs/wiki/images/` contendo arquivos →
  verificar que `/tmp/wiki/images/` contém os mesmos arquivos após o job.
- **Validação manual**: após merge em `main`, acessar a wiki do GitHub e
  confirmar que as imagens referenciadas nas páginas renderizam corretamente.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Imagens grandes inflam o repositório wiki | O spec (`README.md`) já define limite de 1200px de largura e PNG otimizado |
| Imagens existentes na wiki são sobrescritas acidentalmente | `cp -r` sobrescreve se o nome for idêntico — comportamento desejado (a fonte da verdade é `docs/wiki/images/`) |
| Diretório `images/` contém arquivos não-imagem | Não é um problema real — o spec define apenas PNGs; se alguém commitar lixo, o workflow copia mesmo assim (consistente com `*.md`) |

## 9. Rollout

- Release `0.7.2` (patch)
- Merge em `main` dispara o workflow automaticamente
- CHANGELOG: `Fixed: wiki workflow now syncs images directory`

## 10. Critérios de aceite

- Push com novas imagens em `docs/wiki/images/` → imagens aparecem na wiki
- Push sem `docs/wiki/images/` → workflow não falha (passa com sucesso)
- Imagens previamente enviadas manualmente à wiki são sobrescritas pelas
  imagens versionadas no repositório (consistência)

## 11. Questões em aberto

Nenhuma.
