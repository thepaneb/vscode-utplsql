---
tipo: decisao
id: ADR-004
aliases: [ADR-004]
status: aceita
modulo: build
data: 2026-09-23
tags: [adr, build, vsix, esbuild]
---

# ADR-004 - Bundling com esbuild e higiene do pacote VSIX

## Contexto

O VSIX publicável precisa ser pequeno e não vazar arquivos de desenvolvimento.
O `node-oracledb` traz binários nativos por plataforma (thick mode), e o
`tsc` puro emitia `out/**` com todos os módulos, inflando o pacote.

## Decisão

1. **Bundling com esbuild** (`scripts`/`esbuild.config.mjs`) gerando
   `dist/extension.js` (`main`).
2. **`oracledb` como `dependencies`** (driver thin, sem Instant Client) e poda dos
   binários nativos não usados no VSIX.
3. **Higiene do pacote** (PRD-83): bloquear o vazamento de arquivos de
   desenvolvimento (testes, `out/`, fixtures) via `.vscodeignore`.
4. **Publicação só via GitHub release** (`publish.yml`); `npm run publish` local é
   bloqueado.

## Alternativas consideradas

- **Só `tsc`:** simples, porém VSIX grande e dependências não empacotadas.
- **webpack:** maduro, mais configuração/lentidão que esbuild para este caso.
- **Empacotar o `oracledb` thick completo:** inviabiliza o tamanho; thick é opt-in
  ([[ADR-011 - Thick mode opt-in e matriz de bancos]]).

## Consequências

- **Positivas:** VSIX enxuto; startup mais rápido; instalação sem build nativo.
- **Negativas / trade-offs:** pipeline com dois estágios (`compile` + `bundle`);
  `.vscodeignore` precisa ser mantido; `oracledb` thin não cobre NNE (thick é
  opt-in).

## Referências

- PRDs: [[prd-45-bundle-esbuild|PRD-45]] ·
  [[prd-83-vsix-package-hygiene|PRD-83]]
- Código: `esbuild.config.mjs`, `package.json` (`main`, `scripts`)
- [[MOC - Stack]]
