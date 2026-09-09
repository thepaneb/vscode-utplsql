# PRD: Remoção de imagens dos READMEs + Wiki bilíngue (pt-BR/en)

## Status

Proposto

## Resumo

Remover todas as imagens e diagramas dos 24 READMEs traduzidos e reestruturar a wiki para suportar duas versões de idioma: pt-BR (original) e en (inglês).

## Motivação

1. **READMEs limpos**: Os diagramas geram manutenção alta (24 × 3 diagramas = 72 imagens). Com a migração Oracle-only (PRD-64), os diagramas de CLI ficaram obsoletos e os restantes podem ser descritos textualmente.
2. **Wiki acessível**: A wiki está apenas em pt-BR. Contribuidores e usuários internacionais precisam de versão em inglês.
3. **Simplificação**: Remover a necessidade de scripts de geração de diagramas i18n (PRD-63 original cancelado).

## Escopo

- **24 READMEs**: remover `<img>` e referências a diagramas
- **~18 wiki pages**: criar versão `docs/wiki/en/` com tradução completa
- **PRD-63 original**: cancelado (não vamos criar variantes traduzidas de diagramas)

## Passos de implementação

### 1. Reescrever PRD-63

Substituir o conteúdo atual por este PRD simplificado.

### 2. Remover imagens dos READMEs

Para cada `README*.md`:
- Remover blocos `<p align="center"><img ...></p>`
- Remover referências a `docs/wiki/images/diagram-*.png`
- Manter `images/icon.png` e `images/image1.png`/`images/image2.png` (screenshots do VSCode)
- Manter a estrutura e texto, apenas remover imagens

### 3. Criar `docs/wiki/en/`

Copiar a estrutura da wiki pt-BR e traduzir cada página:

| Página pt-BR | Página en |
|---|---|
| `Home.md` | `en/Home.md` |
| `Instalacao-e-requisitos.md` | `en/Installation-and-requirements.md` |
| `Configuracoes.md` | `en/Configuration.md` |
| `Execucao-Oracle-direta.md` | `en/Oracle-direct-execution.md` |
| `Cobertura.md` | `en/Coverage.md` |
| `Reporters.md` | `en/Reporters.md` |
| `Conexao.md` | `en/Connection.md` |
| `Troubleshooting.md` | `en/Troubleshooting.md` |
| `FAQ.md` | `en/FAQ.md` |
| `Arquitetura.md` | `en/Architecture.md` |
| `Diagnosticos-e-quick-fix.md` | `en/Diagnostics-and-quick-fix.md` |
| `Comandos.md` | `en/Commands.md` |
| `Guia-rapido.md` | `en/Quick-start.md` |
| `Como-contribuir.md` | `en/Contributing.md` |
| `Requisitos-no-banco.md` | `en/Database-requirements.md` |
| `Testes.md` | `en/Tests.md` |
| `PRDs.md` | `en/PRDs.md` |
| `_Sidebar.md` | `en/_Sidebar.md` |
| `Modo-de-invocacao.md` | `en/Invocation-mode.md` (redirect) |

### 4. Atualizar `docs/wiki/Home.md`

Adicionar link para versão em inglês.

### 5. Atualizar `docs/wiki/en/Home.md`

Adicionar link para versão em português.

### 6. Limpar imagens não utilizadas

Remover de `docs/wiki/images/`:
- `diagram-cli.*` (CLI removido no PRD-64)
- `diagram-arquitetura.*` (não referenciado nos READMEs)
- `diagram-streaming.*` (não referenciado nos READMEs)
- `diagram-diagnosticos.*` (manter se referenciado na wiki)
- `diagram-conexao.*` (manter se referenciado na wiki)
- `diagram-schemas.*` (manter se referenciado na wiki)
- `diagram-i18n.*` (manter se referenciado na wiki)
- `diagram-debugger.*` (manter se referenciado na wiki)

### 7. Atualizar AGENTS.md

Documentar a estrutura wiki bilíngue.

## Notas

- Screenshots do VSCode (`images/image1.png`, `images/image2.png`) são mantidos — são genéricos e não precisam de tradução
- `images/icon.png` é o ícone da extensão — mantido
- Diagramas da wiki podem ser mantidos para documentação interna, mas não são mais referenciados nos READMEs
- O script `scripts/gen-diagrams.cjs` pode ser mantido para gerar diagramas da wiki, mas não para READMEs
