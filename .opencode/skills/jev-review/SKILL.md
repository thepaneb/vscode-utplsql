---
name: jev-review
description: Revisão advisory de diff com o Jev (TypeSafe System One) via OpenCode Console. Use ao concluir uma fatia de implementação, antes de handoff/PR, ou quando o usuário pedir "jev review"/"revisar com jev".
compatibility: opencode
---

# Jev review

O Jev é um modelo **System One** (decisões tipadas com probabilidade), não um
modelo de código. Ele aponta risco no diff; **não prova** bug e não substitui
testes, lint ou revisão humana.

## Quando rodar

- Ao concluir uma fatia coerente de implementação (antes de pedir review/PR).
- Antes de handoff, quando o diff ainda não foi revisado.
- Quando o usuário pedir explicitamente "jev review".

Não rode em todo salvamento; o custo é baixo, mas o sinal é por diff.

## Comando

Com o `.env` contendo `OPENCODE_API_KEY` (Console) ou a variável exportada:

```sh
npm run jev:review -- --base origin/main
```

Para revisar a árvore de trabalho (não commitada):

```sh
npm run jev:review -- --working-tree
```

O padrão `--base origin/main --head HEAD` revisa o diff já commitado entre as
refs. Use `--working-tree` para incluir mudanças não commitadas — como ele usa
`git diff`, arquivos novos ainda não rastreados não aparecem; rode
`git add -N <arquivo>` antes se quiser incluí-los.

Opções úteis:

```sh
# JSON para inspeção
npm run jev:review -- --base origin/main --format json

# Salvar relatório e ver o payload sem chamar a API
npm run jev:review -- --base origin/main --output jev-review.md
npm run jev:review -- --base origin/main --dry-run

# Falhar (exit 1) quando houver achados — usar só em gate calibrado
npm run jev:review -- --base origin/main --fail-on-findings
```

O script usa `https://opencode.ai/inference/systemone/v1/systemone` com
`jev-1.13-free` por padrão. Se o modelo gratuito sair do ar, use
`--model jev-1.13` (pago; ~$0,042/M tokens de input, output grátis).

## Como interpretar

O relatório traz cinco dimensões:

| Dimensão | Pergunta | Limiar de achado |
|---|---|---|
| `security` | vulnerabilidade explorável? | ≥ 0,70 |
| `correctness` | bug provável? | ≥ 0,70 |
| `tests` | mudou comportamento sem teste? | ≥ 0,60 |
| `severity` | severidade do problema | ≥ 3,0/4 |
| `recommendation` | aprovar/comentar/bloquear | `comment`/`block` |

Regras de uso:

1. Leia o diff e **verifique** cada achado antes de mudar código.
2. Um score alto não justifica refatoração especulativa, abstração nova ou
   mudança de escopo; corrija só o que for real.
3. Rode `npm run test:unit` e `npm run lint` depois de qualquer correção.
4. Se o achado for falso positivo, registre o motivo no resumo; não "otimize"
   o código só para subir o score.
5. O veredito é uma sugestão: `block` pede atenção, mas a decisão é humana.

## Privacidade e limites

- O script redige segredos (`.env`, tokens, bearer, chaves privadas, JWT, AWS) e
  **ignora** `.env*`, lockfiles, `node_modules/`, `out/`, `dist/`, `coverage/`,
  `.vscode-patched`, certificados e `docs/brain/.obsidian/plugins/*/data.json`.
- Mesmo assim, não inclua credenciais Oracle, strings de conexão ou conteúdo
  proprietário que não seja necessário para revisar o diff.
- O contexto do Jev é ~64K tokens; o script trunca o diff
  (`--max-diff-chars`, default 40000 caracteres) e por arquivo
  (`--max-file-chars`, default 20000). Se a API responder
  `max_tokens_exceeded`, ele reduz o diff e tenta de novo (até 3 tentativas).
- A chamada sai da máquina para o OpenCode Console; não use o modelo gratuito
  para dados sensíveis.

## CI

O workflow `.github/workflows/jev-review.yml` roda em PRs internos, em modo
**advisory** (não é required check), e publica o relatório no summary. Ele usa o
secret `OPENCODE_API_KEY`; PRs de fork são pulados. Só torne gate obrigatório
depois de calibrar os limiares com alguns PRs reais.
