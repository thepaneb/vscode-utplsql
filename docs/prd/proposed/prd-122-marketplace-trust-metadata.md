<!-- GENERATED FROM docs/brain/20-PRDs/prd-122-marketplace-trust-metadata.md — DO NOT EDIT -->

# PRD-122 — Confiança na distribuição: publisher verificado e política de privacidade

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-13 |
| Componente | Distribuição (Marketplace) + documentação de confiança |
| Versão alvo | 0.23.0 |
| Arquivos afetados | `docs/brain/16-Seguranca/` (nota nova da política), `docs/brain/60-README/README (extensão).md` (+ variantes geradas), `docs/brain/70-Wiki/`, `docs/brain/10-Projeto`/site (canal de publicação), `PRIVACY.md` (opcional, raiz), `CHANGELOG.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Baixa-Média |
| Relaciona-se a | PRD-91 (paridade de docs/distribuição), PRD-96/97 (site), SEC-001/SEC-002/SEC-008/SEC-011 (dados e credenciais), PRD-119 (postura de segurança) |

## 1. Resumo

O módulo de metadados do **VSCan** classifica o pacote com dois fatores de risco de
**confiança**: `unverified-publisher` (medium — publisher sem domínio verificado) e
`missing-privacy-policy` (low — sem link de política de privacidade no
Marketplace). Numa extensão que **armazena credenciais de banco em
`SecretStorage`** e abre conexões Oracle, esses são justamente os sinais que um
adotante procura antes de instalar. Esta PRD publica uma **política de privacidade
canônica** no vault, declara a **postura de dados** no README/wiki e trata a
**verificação do publisher** — fechando o único bloco de risco do relatório que não
é código.

## 2. Contexto e problema

O relatório do VSCan (VSIX 0.15.0) traz em `metadata.riskFactors`:

```text
low-popularity        "Very low install/rating count suggests limited community scrutiny." (medium)
unverified-publisher  "Publisher domain is explicitly marked as not verified."            (medium)
missing-privacy-policy"No privacy policy link found in marketplace data."                 (low)
```

`low-popularity` é consequência de adoção (não se “conserta”). Os outros dois são
**decisões de publicação**:

- **Política de privacidade**: o VS Code/Marketplace permite (e espera, para
  extensões que lidam com credenciais/segredos) um link de política de privacidade
  no portal do publisher. Hoje o campo está vazio, e a extensão grava senha em
  `SecretStorage`, mantém string de conexão mascarada (`SEC-002`) e nunca registra
  credenciais em log (`SEC-008`). Ou seja: **já existe postura sólida**, mas ela
  não está declarada em lugar público e verificável.
- **Publisher verificado**: o Marketplace exibe “Verified publisher” quando o
  publisher está associado a um **domínio verificado** (TXT) ou a uma organização
  Azure DevOps verificada. O publisher `paneb` não tem domínio (`domain: null`).
  Sem um domínio, esse check **não é fechável** — daí o RF2 ser condicional.

Nenhuma PRD cobre isso hoje: a **PRD-91** cuida de **paridade** e **distribuição
localizada** dos READMEs; a **PRD-96/97** do **site**; mas a **política de
privacidade** e a **identidade do publisher** não têm dono.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Publicar uma **política de privacidade** concreta e verificável (não genérica),
  canônica no vault e linkada no Marketplace.
- Declarar a **postura de dados** no README/wiki: o que a extensão lê, guarda e
  para onde envia (apenas a conexão Oracle configurada pelo usuário; **sem
  telemetria**).
- Tratar a **verificação do publisher** — fechando-a, se houver domínio
  disponível; caso contrário, documentar formalmente a decisão e compensar com os
  demais sinais.

**Não-objetivos**
- Aumentar a popularidade (`low-popularity`) — é consequência de adoção.
- Introduzir telemetria/analytics (o oposto do objetivo).
- Reescrever a paridade de feature dos READMEs (PRD-91) ou a arquitetura do site
  (PRD-96/97) — esta PRD apenas **usa** esses canais.
- Expor política em `settings` ou alterar runtime.

## 4. Requisitos

### RF1 — Política de privacidade canônica

- Nova nota no vault (`16-Seguranca/Política de privacidade`) descrevendo, em
  linguagem verificável pelo código: **nenhum dado do usuário sai do host** além da
  conexão Oracle que o próprio usuário configura; credenciais em `SecretStorage`
  (`SEC-001`, `SEC-003`); string de conexão mascarada em qualquer saída (`SEC-002`);
  logs de debug opt-in sem credenciais (`SEC-008`); sem telemetria/crash reporting.
- A nota é a **fonte da verdade**; a publicação segue o fluxo do cérebro
  (`brain:build`) em **um** canal público: página do **site** (PRD-96/97), **wiki**,
  ou `PRIVACY.md` na raiz do repositório (URL estável no GitHub).

### RF2 — Verificação do publisher (condicional)

- **Se houver domínio:** verificar via registro TXT no portal do publisher e
  confirmar que o Marketplace reporta `isVerified: true`.
- **Se não houver:** registrar a decisão (ADR ou nota) explicando por que o check
  fica aberto e **compensar** com RF1 + RF3 (transparência). Este PRD é considerado
  concluído com a decisão documentada, não com a verificação.

### RF3 — Postura de dados observável

- Seção de confiança no README (nota do vault + variantes geradas): “o que a
  extensão faz com seus dados”, com link direto para a política.
- Página/entrada na wiki apontando para a política e para `SECURITY.md` (reporte
  de vulnerabilidades).

### RF4 — Link no Marketplace

- Preencher o campo **Privacy Policy** do portal (por extensão) apontando para a URL
  pública do RF1; se a política for empacotada (`PRIVACY.md`), decidir
  conscientemente se entra no VSIX (arquivo novo no pacote) ou fica só no repo.

### RF5 — Registro no cérebro

- Criar a `SEC-015` (ver §12) declarando a postura de dados publicamente; o
  `brain:sync` gera o “↩️ Referenciada por” a partir do doc funcional/wiki.

**Não-funcionais**
- RNF1 — A política vale para **todas** as 24 variantes de README (paridade gerada;
  não editar as variantes à mão).
- RNF2 — Afirmações da política devem ser **verificáveis no código** (rastreáveis a
  `SEC-*`); nada aspiracional.
- RNF3 — Sem novo arquivo no `contributes`; sem impacto em runtime.
- RNF4 — `npm run docs:check`/`brain:rules` verdes (a política não pode virar doc
  órfã: precisa de vínculo no cérebro).

## 5. Solução proposta

1. Nota canônica da política no vault + gatilho de publicação (site/wiki/`PRIVACY.md`).
2. Seção “Dados e privacidade” na nota do README (vault) → `brain:build` propaga as
   24 variantes.
3. Verificação do publisher no portal (ou registro da decisão de não verificar).
4. `SEC-015` no cérebro, referenciada pelo doc funcional/wiki.
5. Re-scan no VSCan para comprovar a queda dos fatores de risco.

## 6. Configuração

Nenhuma setting da extensão. Campos do **portal do Marketplace** (Privacy Policy) e
possivelmente um registro DNS TXT (RF2).

## 7. Plano de testes

- **Validação manual**: re-scan no VSCan → `missing-privacy-policy` ausente;
  `unverified-publisher` ausente **ou** decisão documentada.
- **API do Marketplace**: conferir `publisherInfo.domain`/`isVerified` e
  `privacyPolicyUrl` no payload de metadados do VSCan (ou no portal).
- **CI**: `docs:check` (paridade de README), `brain:rules` (vínculo
  PRD ↔ SEC ↔ doc) e `brain:check` verdes.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Política genérica (“copiada”) | RF1 + RNF2: cada afirmação rastreia uma `SEC-*` verificável no código |
| Não ter domínio para verificar o publisher | RF2 condicional: decidir e documentar; compensar com transparência |
| Divergência entre a política e o comportamento real | Revisar a política a cada mudança em conexão/segredos; `docs:check` no CI |
| Editar variantes de README à mão | RNF1: editar só a nota do vault e rodar `brain:build` |
| `PRIVACY.md` entrar no VSIX sem intenção | RF4: decisão explícita sobre empacotar ou não |

## 9. Rollout

- **0.23.0** — item de confiança/distribuição; barato e pode ser antecipado se
  houver auditoria externa planejada.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Política de privacidade canônica no vault e **publicada** em URL pública estável.
- Campo de privacidade preenchido no portal do Marketplace.
- Verificação do publisher **fechada** (se houver domínio) **ou** decisão
  documentada com justificativa.
- Seção de dados/privacidade no README (24 variantes) e wiki, com vínculo no cérebro
  (`SEC-015`).
- Re-scan do VSCan sem `missing-privacy-policy` (e sem `unverified-publisher`, se
  a verificação for possível).

## 11. Questões em aberto

- Há domínio disponível para verificar o publisher (`paneb`), ou a decisão será
  “unverified por design” (compensado por transparência)?
- Publicar a política como página do **site** (PRD-96/97) ou como `PRIVACY.md` no
  repositório? (O site precisa do suporte a páginas extras da PRD-97.)
- `PRIVACY.md` deve ir **dentro** do VSIX (fica no repo do usuário) ou só no repo/site?

## Reavaliação (2026-10-30)

O re-scan do **VSCan 0.18.0** confirmou `unverified-publisher` (medium),
`missing-privacy-policy` (low) e `low-popularity` (medium); o portal continua
sem `privacyPolicyUrl`.

- **SEC-014 já está em uso pela PRD-110** (identificador de schema). A regra
  desta PRD passa a ser **`SEC-015`**.
- **Publisher:** não há domínio próprio elegível (o projeto usa
  `thepaneb.github.io`); a verificação do Marketplace fica **“unverified by
  design”** até existir um domínio, com a decisão documentada (RF2). O fator
  `unverified-publisher` não fecha sem domínio.
- **Política:** a fase de repositório (RF1/RF3/RF5 + `PRIVACY.md` + link no
  README/wiki) pode ser antecipada para **0.19.0** como docs-only; o campo
  *Privacy Policy* do portal (RF4) é manual e só então o VSCan deixa de marcar
  `missing-privacy-policy`.
- **Nota:** mesmo com a política, a nota geral pode continuar **86** enquanto
  `low-popularity` e `unverified-publisher` forem medium; o objetivo é
  transparência, não “verde a qualquer custo”.
- **Decisão recomendada:** manter a PRD em 0.23.0 para a decisão de
  publisher/portal, mas executar a fase repo agora (0.19.0) e re-scan depois.

## 12. Impacto no cérebro

Na conclusão, criar **`SEC-015`** — “Política de privacidade pública: nenhum dado
sai do host além da conexão Oracle configurada; sem telemetria; credenciais só em
`SecretStorage`” — com `prds: ["PRD-122"]`, `implementacao:` (URL pública da
política + campos do portal) e `testes:` (re-scan do VSCan + conferência da API de
metadados; sem teste unitário, declarar a exceção). Referenciar a `SEC-015` no doc
funcional/wiki (regra de usuário ⇒ wiki). Enquanto `proposed`, `regras: []`.
