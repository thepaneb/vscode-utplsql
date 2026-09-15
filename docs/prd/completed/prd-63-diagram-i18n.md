# PRD: Wiki bilíngue (pt-BR/en) + correção de links + limpeza de READMEs

## Status

Concluído

## Resumo

Corrigir links de navegação entre idiomas (READMEs e wiki), criar wiki en/, e remover imagens não utilizadas dos READMEs.

## Motivação

1. **Links de idiomas quebrados**: Os links `[text](url)` dentro de `<p align="center">` não são processados pelo GitHub Markdown — ficam como texto literal.
2. **Wiki sem versão em inglês**: Contribuidores e usuários internacionais precisam de wiki em inglês.
3. **READMEs com imagens desnecessárias**: `image1.png` e `image2.png` não são mais utilizados após remoção de diagramas.

## Escopo

- **24 READMEs**: corrigir `<p align="center">` → `<div align="center">` para links de idiomas funcionarem; remover `image1.png`/`image2.png`
- **Wiki en/**: corrigir links para páginas pt-BR (adicionar `../`) e links internos (nomes de arquivo corretos)
- **Wiki pt-BR/_Sidebar.md**: adicionar link para versão em inglês
- **Imagens**: deletar `image1.png`, `image2.png`, `diagram-cli.*` (não utilizados)

## Passos de implementação

### 1. Corrigir links de idiomas nos READMEs (24 arquivos)

Trocar `<p align="center">` por `<div align="center">` no bloco de links de idiomas:

```html
<!-- ANTES (não funciona no GitHub) -->
<p align="center">
  [English](README.md) · [Português](README.pt-BR.md)
</p>

<!-- DEPOIS (funciona) -->
<div align="center">

[English](README.md) · [Português](README.pt-BR.md)

</div>
```

### 2. Remover `image1.png` e `image2.png` dos READMEs

Remover os blocos `<p align="center"><img src="images/image1.png"...></p>` e `<p align="center"><img src="images/image2.png"...></p>` de todos os 24 READMEs.

### 3. Corrigir links na wiki en/

#### en/Home.md
- Adicionar `../` em links para páginas pt-BR (10 links)
- Corrigir caminho de imagem: `images/` → `../images/`

#### en/_Sidebar.md
- Corrigir links para nomes de arquivo en/ corretos:
  - `Instalação-e-requisitos` → `Installation-and-requirements`
  - `Conexão` → `Connection`
  - `Guia-rápido` → `Quick-start`
  - `Cobertura` → `Coverage`
  - `Execução-Oracle-direta` → `Oracle-direct-execution`
  - `Diagnósticos-e-quick-fix` → `Diagnostics-and-quick-fix`
  - `Organização-da-árvore` → `Tree-organization`
  - `Configurações` → `Configuration`
  - `Comandos` → `Commands`
  - `Requisitos-no-banco` → `Database-requirements`
  - `Arquitetura` → `Architecture`
  - `Como-contribuir` → `Contributing`
  - `Testes` → `Tests`

#### en/Configuration.md
- `Direct-Oracle-Execution` → `Oracle-direct-execution`
- `Tree-Organization` → `Tree-organization`

#### en/Troubleshooting.md
- `Direct-Oracle-Execution` → `Oracle-direct-execution`

#### en/FAQ.md
- `Database-Requirements` → `Database-requirements`
- `Tree-Organization` → `Tree-organization`

### 4. Adicionar link inglês em pt-BR/_Sidebar.md

Adicionar `[English](en/_Sidebar.md)` no topo.

### 5. Deletar arquivos não utilizados

- `images/image1.png`
- `images/image2.png`
- `docs/wiki/images/diagram-cli.png`
- `docs/wiki/images/diagram-cli.svg`

### 6. Manter na wiki

Todos os diagramas e screenshots da wiki são mantidos:
- `diagram-arquitetura.*`, `diagram-conexao.*`, `diagram-debugger.*`
- `diagram-diagnosticos.*`, `diagram-i18n.*`, `diagram-schemas.*`, `diagram-streaming.*`
- Todos os screenshots (`annotations-display.png`, `sqlcl-compile.png`, etc.)

## Notas

- `images/icon.png` é mantido nos READMEs (ícone da extensão)
- Diagramas da wiki são mantidos para documentação interna
- PRD-63 original (criar 24 variantes traduzidas de diagramas) permanece cancelado
