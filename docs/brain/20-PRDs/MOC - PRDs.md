---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, prd]
---

# MOC - PRDs

Fonte da verdade: as notas `prd-*` desta pasta. O status é o campo `status:` do
frontmatter; os arquivos `docs/prd/**` e o `index.md` são **gerados**
(`npm run brain:build`). **Não duplique** o conteúdo aqui — linke.

- Índice gerado: [docs/prd/index.md](../../../docs/prd/index.md)
- Template: [[template-prd]]

## Fluxo de PRDs

1. Criar/editar a nota em `20-PRDs/` (status no frontmatter).
2. `npm run brain:sync` (roadmap/estrutura) + `npm run brain:build` (docs/prd/**).
3. Sincronizar com GitHub:

```sh
export GITHUB_TOKEN="$(sed -n 's/^GITHUB_TOKEN=//p' .env | tr -d '\r' | sed -e 's/^"//' -e 's/"$//')"
export WSLENV="GITHUB_TOKEN${WSLENV:+:$WSLENV}"
npm run sync-prds
```

## Status (gerado)

<!-- brain:auto:start:prd-summary -->
- 📝 Propostos: **17**
- 🔵 Aprovados: **1**
- 🟡 Em desenvolvimento: **0**
- 🟢 Concluídos: **69**

Detalhe completo (fonte da verdade): [docs/prd/index.md](../../prd/index.md)
<!-- brain:auto:end -->

> O status vem do frontmatter das notas desta pasta; `sync-prds.cjs` lê o mesmo
> campo para rotular a issue no GitHub.

## Documentação no repo

- [wiki/PRDs](../../../docs/wiki/PRDs.md)
- [functional/README](../../../docs/functional/README.md)

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[prd-01-java-mode]] — `PRD-01`
- [[prd-02-refactor-extension]] — `PRD-02`
- [[prd-03-ci-lint]] — `PRD-03`
- [[prd-04-expand-tests]] — `PRD-04`
- [[prd-05-progress-cancel]] — `PRD-05`
- [[prd-06-multiroot]] — `PRD-06`
- [[prd-07-upgrade-node-ts]] — `PRD-07`
- [[prd-08-cli-options]] — `PRD-08`
- [[prd-09-cli-info]] — `PRD-09`
- [[prd-10-dynamic-reporters]] — `PRD-10`
- [[prd-11-streaming-results]] — `PRD-11`
- [[prd-12-sql-coverage]] — `PRD-12`
- [[prd-13-oracle-infra]] — `PRD-13`
- [[prd-14-test-schema-packages]] — `PRD-14`
- [[prd-15-integration-tests-real-db]] — `PRD-15`
- [[prd-16-integration-test-invocation-modes]] — `PRD-16`
- [[prd-17-java-args-setting]] — `PRD-17`
- [[prd-18-engine-node-ci]] — `PRD-18`
- [[prd-19-normalize-prd-system]] — `PRD-19`
- [[prd-20-cleanup-deps-config]] — `PRD-20`
- [[prd-21-workflow-improvements]] — `PRD-21`
- [[prd-22-wiki-image-sync]] — `PRD-22`
- [[prd-23-auto-wiki-screenshots]] — `PRD-23`
- [[prd-24-codelens-integration]] — `PRD-24`
- [[prd-25-status-bar-indicator]] — `PRD-25`
- [[prd-26-inline-test-decorations]] — `PRD-26`
- [[prd-27-default-keybindings]] — `PRD-27`
- [[prd-28-plsql-compilation-diagnostics]] — `PRD-28`
- [[prd-29-jump-to-failing-assertion]] — `PRD-29`
- [[prd-30-schema-aware-organization]] — `PRD-30`
- [[prd-31-smart-rerun-patterns]] — `PRD-31`
- [[prd-32-quickfix-setup-diagnostics]] — `PRD-32`
- [[prd-33-plsql-debugger-integration]] — `PRD-33`
- [[prd-34-multi-connection-profiles]] — `PRD-34`
- [[prd-35-windows-coverage-fix]] — `PRD-35`
- [[prd-36-reporter-parse-fix]] — `PRD-36`
- [[prd-37-ts-coverage]] — `PRD-37`
- [[prd-38-connection-pooling]] — `PRD-38`
- [[prd-39-deduplicate-runners]] — `PRD-39`
- [[prd-40-options-object]] — `PRD-40`
- [[prd-41-utplsql-install-verification]] — `PRD-41`
- [[prd-42-suiteparser-annotations]] — `PRD-42`
- [[prd-43-schema-db-discovery]] — `PRD-43`
- [[prd-44-pure-matching]] — `PRD-44`
- [[prd-45-bundle-esbuild]] — `PRD-45`
- [[prd-46-dependency-majors]] — `PRD-46`
- [[prd-47-node-26-toolchain]] — `PRD-47`
- [[prd-48-function-coverage]] — `PRD-48`
- [[prd-49-internacionalizacao]] — `PRD-49`
- [[prd-50-auto-run-on-save]] — `PRD-50`
- [[prd-51-run-by-tag]] — `PRD-51`
- [[prd-52-inline-diff-expected-actual]] — `PRD-52`
- [[prd-53-debug-test-variants]] — `PRD-53`
- [[prd-54-coverage-toggle]] — `PRD-54`
- [[prd-55-tag-organization]] — `PRD-55`
- [[prd-56-duration-persistence]] — `PRD-56`
- [[prd-57-multiroot-root-resolution]] — `PRD-57`
- [[prd-58-run-related-tests]] — `PRD-58`
- [[prd-59-scaffold-suite]] — `PRD-59`
- [[prd-60-branch-coverage-investigation]] — `PRD-60`
- [[prd-61-cli-auto-provision]] — `PRD-61`
- [[prd-62-run-scripts-against-profiles]] — `PRD-62`
- [[prd-63-diagram-i18n]] — `PRD-63`
- [[prd-64-oracle-only-migration]] — `PRD-64`
- [[prd-65-schema-mode-security-fixes]] — `PRD-65`
- [[prd-66-connection-robustness-logging]] — `PRD-66`
- [[prd-67-code-quality-cleanup]] — `PRD-67`
- [[prd-68-restore-oracle-diagnostics-and-reporter]] — `PRD-68`
- [[prd-69-oracle-runner-typed-binds]] — `PRD-69`
- [[prd-70-thick-mode-nne]] — `PRD-70`
- [[prd-71-debugger-dbms-debug-fix]] — `PRD-71`
- [[prd-72-db-test-matrix]] — `PRD-72`
- [[prd-73-compile-for-debug]] — `PRD-73`
- [[prd-74-db-first-discovery]] — `PRD-74`
- [[prd-75-lazy-test-tree]] — `PRD-75`
- [[prd-76-reporter-export]] — `PRD-76`
- [[prd-77-rebuild-annotation-cache]] — `PRD-77`
- [[prd-78-random-test-order]] — `PRD-78`
- [[prd-79-coverage-scope]] — `PRD-79`
- [[prd-80-virtual-db-source]] — `PRD-80`
- [[prd-81-security-hardening]] — `PRD-81`
- [[prd-82-tns-wallet]] — `PRD-82`
- [[prd-83-vsix-package-hygiene]] — `PRD-83`
- [[prd-84-oracle-122-support]] — `PRD-84`
- [[prd-85-brain-source-of-truth]] — `PRD-85`
- [[prd-86-debugger-stop-on-exception]] — `PRD-86`
- [[prd-87-suitepath-results-jump]] — `PRD-87`
<!-- brain:auto:end -->
