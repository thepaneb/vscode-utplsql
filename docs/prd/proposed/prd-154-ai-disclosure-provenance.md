<!-- GENERATED FROM docs/brain/20-PRDs/prd-154-ai-disclosure-provenance.md — DO NOT EDIT -->

# PRD-154 - AI disclosure e proveniência no desenvolvimento

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-11-27 |
| Componente | Desenvolvimento, revisão e documentação do repositório |
| Versão alvo | 0.24.0 (onda de segurança e distribuição) |
| Arquivos afetados | `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `README.md` (nota do vault), `SECURITY.md`, `CHANGELOG.md`, `docs/brain/16-Seguranca/`, `docs/brain/15-Regras/` |
| Esforço estimado | 1-2 dias |
| Complexidade | Baixa-Média |
| Relaciona-se a | PRD-122 (privacidade), PRD-153 (segurança de IA), SEC-004, BR-PLAT-002, BR-PLAT-003 |

## 1. Resumo

Formalizar como o projeto declara o uso de IA no desenvolvimento e na revisão:
política em `CONTRIBUTING.md`, campo no template de PR, trailer `Assisted-by`,
rótulo explícito no relatório do Jev e declaração de postura no README/PRIVACY.
O runtime da extensão não usa IA; a mudança é de **processo e transparência**,
sem novas dependências ou comportamento para o usuário final.

## 2. Contexto e problema

O projeto já usa IA de forma relevante e pública:

- `OpenCode`/agentes locais para implementação, testes, docs e auditorias.
- `Jev` (`src/tools/jevReview.ts` + `.github/workflows/jev-review.yml`) para
  revisão advisory de PRs.
- Skills, MCPs e plugins versionados em `.opencode/` e `opencode.json`.

A divulgação existente é **técnica e indireta**: a skill do Jev descreve o
modelo, o workflow mostra o secret e o guia de ferramentas de agente no vault
lista MCPs. Mas:

- `CONTRIBUTING.md` não diz se IA é permitida, como declarar ou quem responde.
- O template de PR não pergunta sobre assistência de IA.
- Commits não têm trailer de proveniência (`Assisted-by`/equivalente).
- `SECURITY.md` não declara o fluxo de dados do Jev nem a postura de IA.
- `README.md` não afirma que a extensão não usa IA/telemetria.
- O relatório do Jev mostra o modelo, mas não diz explicitamente “gerado por IA”.

Isso cria ambiguidade para contribuidores, revisores e adotantes: não fica claro
o que foi assistido por IA, quem validou, o que sai da máquina e o que é sinal
probabilístico. A ausência de convenção também dificulta auditoria de
licenciamento e de qualidade.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Publicar uma política de uso de IA proporcional ao projeto, com
  responsabilidade humana explícita.
- Tornar a assistência de IA **declarável e pesquisável** em PRs e commits.
- Rotular o relatório do Jev como conteúdo gerado por IA e advisory.
- Declarar a postura de dados do produto (sem IA/telemetria no runtime) e o uso
  de IA no desenvolvimento.
- Manter o processo leve: autocomplete e ajustes triviais não viram burocracia.

**Não-objetivos**
- Adicionar IA ao runtime da extensão ou telemetria.
- Obrigar o uso de IA ou proibir ferramentas específicas.
- Criar gate de CI que bloqueie contribuições por falta de trailer em todos os
  commits (avaliar apenas se houver label `ai-assisted`).
- Reescrever a política de privacidade da PRD-122; esta PRD complementa.
- Implementar os controles de segurança do Jev/agentes (PRD-153).

## 4. Requisitos

### RF1 - Política de uso de IA no `CONTRIBUTING.md`

Uma seção “Uso de IA” com:

- Escopo: código, testes, docs, issues, revisão e mensagens de commit.
- Responsabilidade: o humano que assina o commit responde por correção,
  licença, segurança, testes e DCO; IA não assina `Signed-off-by`.
- Divulgação: obrigatória para assistência **substancial** (geração de funções,
  refatorações, testes, docs extensas); opcional para autocomplete, correção
  ortográfica e transformações mecânicas.
- Como declarar: trailer `Assisted-by` no commit e/ou campo do PR; ferramenta e
  modelo quando conhecidos.
- Proibições: não colar credenciais Oracle, tokens, `.env` ou código
  proprietário em ferramentas externas; não aceitar saída de IA sem revisão.
- Consequência: contribuição sem declaração pode ser recusada; declaração
  incorreta é tratada como problema de integridade.

### RF2 - Template de PR e label

- Seção “Assistência de IA” no `.github/PULL_REQUEST_TEMPLATE.md`:
  - `[ ] Nenhuma`
  - `[ ] Sim` — ferramenta/modelo, partes afetadas e confirmação de revisão/teste.
- Label `ai-assisted` (manual ou via template) para busca e auditoria.
- A seção não substitui os checklists existentes (testes, docs, brain, SQL).

### RF3 - Trailer de proveniência

- Convenção `Assisted-by: <ferramenta>/<modelo>` (ex.:
  `Assisted-by: OpenCode/DeepSeek V4.1 Flash`), em vez de `Co-authored-by`.
- Documentar em `CONTRIBUTING.md` e permitir verificação com
  `git interpret-trailers`.
- Opcional: check de CI que exige o trailer apenas quando o PR tem o label
  `ai-assisted`; nunca exigir em commits triviais.
- A IA nunca entra em `Co-authored-by` (não é pessoa e não detém autoria).

### RF4 - Rótulo explícito no Jev

- Título/footer do relatório: “Gerado por IA (Jev `<modelo>`) — advisory; não é
  aprovação humana”.
- Marcador oculto `<!-- ai-generated -->` no comentário/artifact para busca.
- Link para a política de IA (RF1) e para `SECURITY.md`.

### RF5 - Postura no README/PRIVACY

- Declarar, na nota canônica do README (vault) e na futura política de
  privacidade da PRD-122:
  - a extensão **não chama serviços de IA** e **não envia telemetria**;
  - o desenvolvimento/revisão usa IA, incluindo o Jev advisory;
  - o Jev recebe um diff filtrado e redigido, e nunca é aprovação humana.
- Manter paridade nas 25 variantes de README (`brain:build`).

**Não-funcionais**
- RNF1 - Nenhuma dependência nova de runtime; nenhuma mudança no bundle.
- RNF2 - `npm run docs:check`, `brain:ci`, `brain:rules` e `docs:features-check`
  verdes.
- RNF3 - Nenhum segredo/token em exemplos; política verificável no código e nos
  workflows.
- RNF4 - Texto curto e acionável; evitar burocracia desproporcional.

## 5. Solução proposta

1. Adicionar a seção no `CONTRIBUTING.md` e a convenção de trailer.
2. Adicionar o campo no PR template e documentar o label.
3. Ajustar o rótulo do Jev no código (`formatMarkdown`) e no comentário do
   workflow.
4. Editar a nota `60-README/README (extensão)` no vault com a declaração de
   postura e rodar `brain:build`.
5. Adicionar uma nota canônica em `16-Seguranca/` (“IA no desenvolvimento:
   disclosure e dados”) e linká-la no `SECURITY.md`/README.
6. Criar as regras previstas na conclusão: `BR-PLAT-006` (disclosure) e
   `SEC-016` (rótulo/saída de IA), com `prds: ["PRD-154"]`.
7. Opcional: script `scripts/check-ai-disclosure.cjs` para validar trailers em
   PRs com label `ai-assisted`.

## 6. Configuração

Nenhuma setting ou comando novo na extensão.

## 7. Plano de testes

- **Unitários**: nenhum runtime novo; se houver script de trailer, testar
  parser com casos com/sem `Assisted-by`, label e exceções triviais.
- **Documentação**: `npm run docs:check`, `npm run brain:ci`,
  `npm run docs:features-check -- 0.24.0` e `git diff --exit-code`.
- **Manual**: abrir um PR de teste e conferir o campo, o label e o comentário do
  Jev rotulado.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Burocracia excessiva e abandono da declaração | Limiar claro de “substancial”; autocomplete isento; template curto |
| Trailer usado como prova de qualidade | Política diz que é proveniência, não revisão; humano assina |
| `Co-authored-by` acidental | Documentar a diferença e validar no script/CI |
| Divergência entre README e código | Nota canônica no vault + `brain:build` + `docs:check` |
| Falta de fiscalização | Label + revisão humana; gate opcional só para `ai-assisted` |

## 9. Rollout

- Release alvo: 0.24.0.
- Entrada no `CHANGELOG.md` ao concluir.
- Sem migração para usuários; mudança de processo/comunicação.

## 10. Critérios de aceite

- `CONTRIBUTING.md` tem a seção e a convenção de trailer.
- O PR template tem o campo e o label está documentado.
- O relatório do Jev contém o rótulo explícito e o marcador.
- README/PRIVACY declaram a postura de IA/telemetria.
- `brain:ci`, `docs:check`, `brain:rules` e `docs:features-check` verdes.

## 11. Questões em aberto

- Qual o limiar exato de “assistência substancial” (linhas? escopo? tempo?).
- O trailer deve ser obrigatório em todo commit de um PR `ai-assisted` ou
  apenas no commit principal/merge?
- O label `ai-assisted` será aplicado manualmente ou por um check do template?
- A declaração de “sem IA/telemetria” deve entrar também no Marketplace?

## 12. Impacto no cérebro

Previstas para a conclusão: `BR-PLAT-006` (contribuições com IA são declaradas e
assinadas por humano) e `SEC-016` (relatório de IA é rotulado e não é aprovação),
com `prds: ["PRD-154"]`, `implementacao:` e `testes:`. Nenhuma regra criada
enquanto a PRD estiver `proposed`.

## Impacto nas docs

- `CONTRIBUTING.md`: nova seção “Uso de IA” e convenção de trailer.
- `.github/PULL_REQUEST_TEMPLATE.md`: campo de assistência e label.
- `README.md` (nota do vault `60-README/README (extensão)`): postura de IA e
  telemetria; regenerar as variantes.
- `SECURITY.md`: link para a nota de IA e para o threat model da PRD-153.
- `CHANGELOG.md`: entrada na conclusão.
- `docs/brain/16-Seguranca/`: nota canônica de disclosure/dados.
