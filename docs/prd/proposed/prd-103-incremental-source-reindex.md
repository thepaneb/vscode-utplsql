<!-- GENERATED FROM docs/brain/20-PRDs/prd-103-incremental-source-reindex.md — DO NOT EDIT -->

# PRD-103 — Reindexação incremental de fontes (watcher por-URI)

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-09 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `src/extension.ts`, `src/discovery.ts`, `src/debounce.ts`, `src/config.ts`, `package.json`, `docs/brain/**` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-80 (fonte virtual), PRD-74 (db-first discovery), PRD-50 (auto-run) |

## 1. Resumo

Trocar o refresh **global** disparado pelo watcher (`**/*.{pks,pkb}`) por uma
**reindexação incremental por URI**, com debounce por arquivo. Em workspaces
grandes, criar/editar/apagar um arquivo não deve reindexar todo o workspace.

## 2. Contexto e problema

- `src/extension.ts:153-161`: o `FileSystemWatcher` **ignora o URI** e chama um
  refresh completo num único debounce (`utplsql.refreshDebounceMs`).
- O refresh completo é **correto** (por isso o bug de item "stale" do projeto de
  referência não se aplica), mas é **caro** em workspaces com muitos pacotes.
- Apagar um arquivo cai no full refresh; poderíamos ir direto ao fallback da
  **fonte virtual** (`virtualSource.ts`, PRD-80) para o "go to test".
- Referência de porte: `paddi35/fix/26-filesystem-watcher`
  (`src/workspace/perKeyDebouncer.ts`, `sourceIndex.ts`).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Debounce **por URI** (create/change/delete) além do debounce global.
- Reindexar só o arquivo alterado quando o índice permitir; full refresh como
  fallback seguro.
- Arquivo ausente → resolver pela fonte virtual, sem ponteiro morto.

**Não-objetivos**
- Reescrever a descoberta orientada a banco (PRD-74).
- Mudar a árvore de testes ou o modo schema (PRD-30).
- Prescindir do full refresh (ele permanece o caminho seguro).

## 4. Requisitos

### RF1 — Debounce por URI

- Mapa `uri -> timer`, coalescendo alterações do mesmo arquivo; o debounce
  global atual continua para rajadas de vários arquivos.

### RF2 — Incremental

- Em mudança de um único arquivo, reindexar apenas esse URI (atualizar
  declarações/posições) e invalidar só o que depende dele.
- Preservar resultados/estado dos itens não afetados (não descartar a árvore).

### RF3 — Delete → fonte virtual

- Ao detectar remoção, remover o URI do índice e resolver a localização pela
  fonte virtual (PRD-80) em vez de apontar para um caminho inexistente.

### RF4 — Configuração

- Manter `utplsql.refreshDebounceMs`; se necessário, um setting de modo
  (`incremental` × `full`) com default `incremental` e fallback automático.

**Não-funcionais**
- RNF1 — Sem regressão de corretude: qualquer caso incerto faz full refresh.
- RNF2 — `debounce.ts` permanece puro/testável.

## 5. Solução proposta

- `src/debounce.ts`: adicionar `createPerKeyDebouncer(ms)` (mapa por chave),
  reutilizado pelos 3 eventos do watcher.
- `src/discovery.ts`: expor `reindexUri(uri)` (atualiza só aquele arquivo) e
  `removeUri(uri)`; `refresh()` continua existindo como fallback.
- `src/extension.ts`: `watcher.onDidChange((uri) => perKey.schedule(uri))` etc.

## 6. Configuração

- `utplsql.refreshDebounceMs` (existente) e, se adotado, `utplsql.refresh.mode`.

## 7. Plano de testes

- **Unitários**: `perKeyDebouncer` coalesce por chave; `reindexUri` atualiza só o
  alvo (arquivo A + arquivo B na janela não deixam A defasado).
- **Integração**: editar/apagar/criar em disco sem editor aberto reflete no
  índice; delete cai na fonte virtual.
- **Manual**: workspace grande — editar um `.pkb` não reindexa o resto.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Índice incremental divergir do full | Full refresh como fallback + testes comparando os dois |
| Corrida entre eventos de vários arquivos | Debounce global para rajadas; por-URI para caso isolado |
| Complexidade nova no `discovery.ts` | `reindexUri`/`removeUri` pequenos e cobertos |

## 9. Rollout

- **0.19.0** ("Observabilidade e desempenho").
- Registrar no `CHANGELOG.md`; publicação via GitHub release.

## 10. Critérios de aceite

- Editar arquivo A e B na janela mantém ambos corretos.
- Apagar arquivo não deixa "go to test" para caminho morto.
- Ganho mensurável (full refresh evitado) em workspace com muitos pacotes.
- `npm test`/`lint` verdes; cobertura ≥ thresholds.

## 11. Questões em aberto

- Vale um setting de modo, ou basta o incremental com fallback automático?
- Reindexar também por mudança de `.sql`/`.prc`/`.trg` (hoje o watcher é só
  `pks/pkb`)? Relaciona-se à PRD-80.

## 12. Impacto no cérebro

Na conclusão, criar a regra `BR-PARSE-*` ("mudança de arquivo reindexa só o URI
alterado; caso incerto faz full refresh"), com `prds: ["PRD-103"]`,
`implementacao:` e `testes:`. Enquanto `proposed`, `regras: []`.
