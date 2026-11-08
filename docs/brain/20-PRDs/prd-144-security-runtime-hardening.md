---
tipo: prd
id: PRD-144
aliases: [PRD-144]
status: proposed
titulo: "Hardening de segurança do runtime: parsers de relatório, path traversal em views e redação de credenciais"
versao: "0.24.0"
data: "2026-11-05"
autor: "Gil Cleber Barboza"
versao_titulo: "0.24.0 — UX, segurança e distribuição"
verificado: "2026-11-05"
regras: ["BR-COB-009", "SEC-015"]
docs: ["CHANGELOG", "SECURITY.md"]
tags: [prd]
---

# PRD-144 — Hardening de segurança do runtime: parsers de relatório, path traversal em views e redação de credenciais

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-11-05 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.24.0 |
| Arquivos afetados | `src/junit.ts`, `src/cobertura.ts`, `src/viewCoverage.ts`, `src/commands/script.ts`, `src/coverage.ts`, `src/redact.ts`, `SECURITY.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |

## 1. Resumo

Fechar quatro achados de segurança identificados na auditoria do runtime da
extensão: (1) expansão de entidades XML nos parsers de JUnit/Cobertura;
(2) ausência de validação de contenção em walks de filesystem (views e scripts);
(3) HTML de cobertura gerado pelo banco aberto sem sanitização; (4) redação de
credenciais limitada à ocorrência exata da connection string. Os achados são de
severidade média/baixa e só se materializam em workspaces confiáveis ou bases
Oracle comprometidas, mas precisam ser fechados para manter o contrato de
segurança documentado em `SECURITY.md`.

## 2. Contexto e problema

A auditoria (`npm audit --omit=dev` está limpa) não cobre o código próprio.
Quatro pontos do runtime ficaram fora do hardening prévio (PRD-81/PRD-143):

- `src/junit.ts:28` e `src/cobertura.ts:19` instanciam `XMLParser` com o default
  de `processEntities`, que resolve entidades internas. O XML vem de
  `UT_OUTPUT_BUFFER_TMP` (Oracle). Um payload malicioso pode causar DoS por
  expansão.
- `src/viewCoverage.ts:60` (`discoverViewFiles`) e `src/commands/script.ts`
  (`listFilesRecursive`) fazem `readdirSync`/`readDirectory` sem checar
  contenção. `src/coverage.ts:35` já possui `isInside` para cobertura, mas não é
  reutilizado. Um `sourcePath` malicioso em workspace confiável pode sair das
  raízes.
- `src/coverage.ts:106` escreve o HTML do `ut_coverage_html_reporter` verbatim
  e abre via `file://`. Uma base comprometida pode injetar `<script>`.
- `src/redact.ts:31` (`redactConnection`) substitui apenas a ocorrência exata da
  connection conhecida; variantes com espaços/formato diferente podem vazar a
  senha em mensagens de erro.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Eliminar DoS por expansão de entidades nos parsers de relatório.
- Garantir que todo walk de filesystem fique contido nas raízes do workspace.
- Neutralizar injeção de script no HTML de cobertura (ou documentar como
  risco aceito de base confiável).
- Tornar a redação de credenciais robusta a variantes de formatação.

**Não-objetivos**
- Sandboxing de HTML (a extensão não renderiza em webview; apenas abre no
  navegador).
- Mudanças no contrato de `SecretStorage` ou em settings de conexão (já
  cobertos por PRD-81).
- Auditoria de dependências de desenvolvimento (fora do entregável; tratada
  separadamente).

## 4. Requisitos

### RF1 — Entidades XML com limites explícitos

Em `src/junit.ts` e `src/cobertura.ts`, manter `processEntities` **habilitado**
com limites explícitos de expansão (`maxTotalExpansions`, `maxExpandedLength`,
`maxEntityCount`) e documentar a escolha. **Não** usar
`processEntities: { enabled: false }`: nessa versão do `fast-xml-parser` isso
também deixa de decodificar entidades predefinidas (`&lt;`, `&amp;`), quebrando
mensagens e `parseExpectedActual`. Manter `ignoreAttributes: false` e
`attributeNamePrefix: '@_'`.

### RF2 — Contenção em walks de filesystem

Reutilizar o helper `src/pathContainment.ts` (`isInside`/`isReallyInside`/
`hasTraversalSegment`, criado na 0.20.0) e aplicá-lo em:
- `discoverViewFiles` (`src/viewCoverage.ts`), incluindo symlinks internos;
- `listFilesRecursive` (`src/commands/script.ts`);
- `discoverSchemasFromFolders` (`src/discovery.ts`);
- qualquer outro walk que resolva caminhos a partir de settings do workspace.

A mitigação de `../`/absoluto em views/schema já entrou na 0.20.0; o residual é
symlink e a centralização. Caminhos fora da raiz devem ser ignorados com
`logger.debug`/`logger.warn` sanitizado (sem ecoar o caminho cru se sensível).

### RF3 — HTML de cobertura: caminho e conteúdo

Em `src/coverage.ts`, validar `realpath`/`lstat` do diretório
`test-results/` antes de `mkdir`/`rm`/`write` (um symlink para fora não pode
apagar/gravar fora do workspace). Para o conteúdo, neutralizar `<script>` e
handlers `on*` **ou** registrar em `SECURITY.md` como risco aceito (base Oracle
confiável); preferir sanitizar quando o custo for baixo. A validação de caminho
pode ser antecipada na 0.20.x.

### RF4 — Redação robusta de credenciais

Em `src/redact.ts` (`redactConnection`), além da substituição exata, aplicar
fallback que mascare padrões `user/pass@host` (regex) quando a connection
conhecida não for encontrada literalmente. Manter `maskConnection` como está.
Revisar os call sites de UI (`commands/debug.ts`, `commands/utility.ts`,
`coverage.ts`, `commands/scaffold.ts`, `quickfix.ts`) que hoje usam `String(e)`
cru; usar `redactConnection`/mensagem genérica onde houver conexão.

### RF5 — Testes

- Unitários para parsers com XML contendo entidades (deve limitar/não travar e
  continuar decodificando `&lt;`/`&amp;`).
- Unitários para `discoverViewFiles`/`listFilesRecursive`/
  `discoverSchemasFromFolders` com `../`, absoluto e symlink (deve ignorar).
- Unitários para `redactConnection` com variantes de espaçamento e para o HTML
  com `test-results` symlinkado.

### RF6 — Defesa em profundidade de reporter

- Validar o nome do reporter dentro de `exportReporterCall` (allowlist
  `^[a-z0-9_]+$` + conhecidos), mesmo que o caller atual já valide.

**Não-funcionais**
- RNF1 — Nenhuma regressão nos testes existentes de cobertura/XML/redação.
- RNF2 — Sem impacto de performance perceptível no parse de relatórios.
- RNF3 — Manter compatibilidade com `fast-xml-parser` v5.

## 5. Solução proposta

- O helper `src/pathContainment.ts` (`isInside`/`isReallyInside`/
  `hasTraversalSegment`) já foi criado na 0.20.0; estendê-lo a
  `commands/script.ts` e aos walks restantes.
- Ajustar construtores de `XMLParser` com limites explícitos (não desabilitar).
- Estender `redactConnection` com regex fallback e revisar os call sites de UI.
- Validar `realpath`/`lstat` do HTML de cobertura.
- Avaliar sanitização de HTML; se custo alto, documentar em `SECURITY.md`.

## 6. Configuração

Nenhuma nova setting ou comando.

## 7. Plano de testes

- **Unitários**: entidades XML, contenção de path, redação robusta.
- **Integração**: não aplicável (sem banco).
- **Validação manual**: run com cobertura HTML em base confiável; verificar
  que arquivos fora da raiz não são lidos.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Desabilitar entidades quebrar parse de relatórios legítimos | **Não desabilitar**: `processEntities.enabled: false` também deixa `&lt;`/`&amp;` sem decodificar no fast-xml-parser 5.11. Usar limites explícitos (`maxTotalExpansions`, `maxExpandedLength`, `maxEntityCount`). |
| Sanitização de HTML remover conteúdo legítimo | Aplicar apenas a `<script>` e atributos `on*`, preservando o restante. |
| Regex de redação mascarar texto não-credencial | Ancorar no formato `user/pass@host` e no usuário conhecido. |

## 9. Rollout

- Release alvo: 0.24.0.
- Atualizar `CHANGELOG.md` e `SECURITY.md` (seção "Implemented protections").

## 10. Critérios de aceite

- `npm run test:unit` verde com novos testes.
- `npm run lint` e `npm run typecheck` verdes.
- `npm audit --omit=dev` continua 0.
- Nenhum caminho fora da raiz é lido nos cenários de teste.

## 11. Questões em aberto

- A sanitização de HTML deve ser implementada ou apenas documentada? (decidir
  na implementação conforme custo.)
- O fallback de redação por regex deve considerar também o formato `user@host`
  sem senha?

## 12. Impacto no cérebro

A PRD materializa hardening de runtime; regras `SEC-*`/`BR-*` serão criadas
durante a implementação (ex.: `SEC-015` para contenção de path em walks).
Se nenhuma regra for criada, registrar **nenhuma** aqui e no campo `regras:`.

## Impacto nas docs

- `CHANGELOG`: entrada da versão 0.24.0 listando os hardenings.
- `SECURITY.md`: atualizar "Implemented protections" com os novos pontos
  (parsers, contenção, redação) e, se aplicável, o risco aceito do HTML.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-COB-009 - Walks de workspace e HTML de cobertura são contidos na raiz|BR-COB-009]] · [[SEC-015 - Walks de filesystem e HTML de cobertura ficam contidos na raiz|SEC-015]]
- 🔗 PRDs relacionados: [[prd-81-security-hardening|PRD-81]] · [[prd-143-redos-regex-audit-input-validation|PRD-143]]
- 🔗 Mesma versão (0.24.0): [[prd-121-auditable-package-sourcemap|PRD-121]] · [[prd-122-marketplace-trust-metadata|PRD-122]] · [[prd-142-supply-chain-provenance-typecheck-gate|PRD-142]] · [[prd-143-redos-regex-audit-input-validation|PRD-143]] · [[prd-145-security-alerts-deliverable|PRD-145]]
- 🎯 RF2 — Contenção em walks de filesystem → [[BR-COB-009 - Walks de workspace e HTML de cobertura são contidos na raiz|BR-COB-009]] · [[SEC-015 - Walks de filesystem e HTML de cobertura ficam contidos na raiz|SEC-015]]
- 🎯 RF3 — HTML de cobertura: caminho e conteúdo → [[BR-COB-009 - Walks de workspace e HTML de cobertura são contidos na raiz|BR-COB-009]] · [[SEC-015 - Walks de filesystem e HTML de cobertura ficam contidos na raiz|SEC-015]]
- 🚀 ⬅️ release anterior: [[prd-149-performance-engineering-quality|PRD-149 (0.23.0)]] · ➡️ próxima release: [[prd-132-ux-execution-dryrun-jump|PRD-132 (0.25.0)]]
<!-- brain:auto:end -->
