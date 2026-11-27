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

# Salvar markdown + JSON (usado pelo CI)
npm run jev:review -- --base origin/main --output jev-review.md --json-output jev-review.json

# Falhar (exit 1) quando houver achados — usar só em gate calibrado
npm run jev:review -- --base origin/main --fail-on-findings
```

O script usa `https://opencode.ai/inference/systemone/v1/systemone` com
`jev-1.13-free` por padrão. O modelo pago **`jev-1.14`** foi validado em
nov/2026: ~$0,042/M tokens de input (output grátis), ~US$ 0,0002 para um PR de
5 mil tokens e ~US$ 0,016 para o release de 379 mil tokens. `--model jev-1.13`
continua disponível como alternativa paga.

## Cobertura do diff (chunking)

O review **não corta mais o diff no primeiro limite**: ele ordena `src/**`
primeiro, omite docs (`docs/**`, `*.md`) e sensíveis/binários, e envia o
restante em blocos de até `--max-diff-chars` (default 30000 caracteres por
chamada). Um arquivo maior que o bloco é dividido por linhas em partes
numeradas; **todo o `src/**` entra no contexto**.

- Se a API responder `max_tokens_exceeded`, o bloco é dividido em dois e
  reenviado (até 4 níveis); se ainda falhar, o review sai com erro visível —
  nunca omite `src` silenciosamente.
- O relatório agrega os blocos de forma robusta: segurança/correção continuam
  sendo **máximos** (gates), a severidade usa o **p90** (um bloco isolado não
  domina o PR inteiro) e a recomendação é **derivada**: `block` exige
  segurança/correção acima do limiar ou p90 ≥ 3; um `block` bruto de bloco sem
  essa evidência vira `comment`. O veredito bruto por bloco fica no JSON
  (`chunks[]`) e na tabela de detalhes; a soma de tokens/custo é preservada.
- PRs muito grandes fazem várias chamadas (~1–2 s cada, modelo grátis); PRs
  normais continuam em uma única chamada.
- Docs só entram no review se estiverem dentro de um arquivo de código; o
  gatilho do CI já ignora PRs que só mudam docs.

## Como interpretar

O relatório traz cinco dimensões:

| Dimensão | Pergunta | Limiar de achado |
|---|---|---|
| `security` | vulnerabilidade explorável? | ≥ 0,70 |
| `correctness` | bug provável? | ≥ 0,70 |
| `tests` | mudou comportamento sem teste? | ≥ 0,60 |
| `severity` | severidade do problema | ≥ 3,0/4 |
| `recommendation` | aprovar/comentar/bloquear | `comment`/`block` |

A agregação de vários blocos é **robusta**: segurança e correção são gates
(máximo entre blocos), a severidade usa p90 e a recomendação é derivada dessa
evidência. O `block` por bloco é bruto; confira os blocos no JSON antes de
tratar o agregado como bloqueio.

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
- O contexto do Jev é ~64K tokens; cada bloco tem no máximo `--max-diff-chars`
  (default 30000 caracteres) e cada parte de arquivo no máximo `--max-file-chars`
  (default 20000). Em `max_tokens_exceeded`, o bloco é subdividido e reenviado
  (até 4 níveis); não há mais corte silencioso do diff.
- A chamada sai da máquina para o OpenCode Console; não use o modelo gratuito
  para dados sensíveis.

## CI

O workflow `.github/workflows/jev-review.yml` roda em PRs internos, em modo
**advisory** (não é required check), e publica o relatório em três lugares:

- **step summary** do run;
- **artifact** `jev-review-<PR>` com `jev-review.md` e `jev-review.json`
  (retenção de 90 dias, para medir uso/achados ao longo do tempo);
- **comentário fixo** no PR (marcador oculto `<!-- jev-review -->`, atualizado
  em cada push em vez de criar um novo).

Ele usa o secret `OPENCODE_API_KEY`; PRs de fork são pulados. Só torne gate
obrigatório depois de calibrar os limiares com alguns PRs reais.
