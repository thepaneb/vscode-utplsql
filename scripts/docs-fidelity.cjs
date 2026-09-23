#!/usr/bin/env node
/**
 * Checagens de FIDELIDADE documental: cruza o CÓDIGO (fonte da verdade) com a
 * DOCUMENTAÇÃO versionada. Complementa o docs-check.cjs (que valida estrutura:
 * links, pastas, status).
 *
 *   node scripts/docs-fidelity.cjs
 *
 * Exportado para teste unitário (docsFidelity.test.ts). PURO em relação a
 * vscode; lê arquivos do repo.
 *
 * Verifica:
 *   1. settings (package.json contributes.configuration) ↔ README.md + variantes
 *   2. comandos contribuídos ↔ wiki/Commands.md + README (por título/ID)
 *   3. cada módulo `src/*.ts` citado em docs/wiki/Architecture.md
 *   4. versão de package.json ↔ exemplos de .vsix nos docs
 *   5. PRDs concluídos ↔ docs/wiki/PRDs.md (IDs)
 *   6. termos obsoletos proibidos ("type_mapping" como afirmação, "java -jar")
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');

function read(rel) {
  const p = path.join(REPO, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

/** Settings reais do package.json (exclui comandos). */
function realSettings() {
  const pkg = JSON.parse(read('package.json'));
  const props = pkg.contributes?.configuration?.properties ?? {};
  const cmds = new Set((pkg.contributes?.commands ?? []).map((c) => c.command));
  return Object.keys(props)
    .filter((k) => !cmds.has(k))
    .sort();
}

/** Comandos contribuídos. */
function realCommands() {
  const pkg = JSON.parse(read('package.json'));
  return (pkg.contributes?.commands ?? []).map((c) => c.command).sort();
}

function pkgVersion() {
  return JSON.parse(read('package.json')).version;
}

/** Módulos `src/*.ts` (basenames). */
function srcModules() {
  const dir = path.join(REPO, 'src');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .sort();
}

/**
 * Comandos: a wiki/Commands.md documenta por TÍTULO (ex.: "utPLSQL: Refresh
 * tests"). Mapeamos ID → fragmento de título via package.nls.json (ou
 * package.json title). Só cobramos comandos de PALETA (com title %nls%); os
 * internos/CodeLens (sem title amigável) são isentos.
 */
function commandTitleFragments() {
  const pkg = JSON.parse(read('package.json'));
  const nls = (() => {
    try {
      return JSON.parse(read('package.nls.json'));
    } catch {
      return {};
    }
  })();
  const cmds = pkg.contributes?.commands ?? [];
  return cmds
    .filter((c) => typeof c.title === 'string' && c.title.startsWith('%nls.'))
    .map((c) => {
      const key = c.title.replace(/^%|%$/g, '');
      return { id: c.command, title: nls[key] ?? '' };
    })
    .filter((c) => c.title);
}

/**
 * Compara um conjunto esperado com as menções num texto.
 * Retorna { missing, isSubset }.
 */
function mentions(text, items) {
  const missing = items.filter((i) => !text.includes(i));
  return { missing, all: missing.length === 0 };
}

/**
 * Verifica fidelidade e retorna array de problemas (strings). Vazio = OK.
 * `overrides` permite injetar conteúdo nos testes.
 */
function checkFidelity(overrides = {}) {
  const problems = [];
  const settings = overrides.settings ?? realSettings();
  const commandTitles = overrides.commandTitles ?? commandTitleFragments();
  const modules = overrides.modules ?? srcModules();
  const version = overrides.version ?? pkgVersion();
  const files = {
    readme: overrides.readme ?? read('README.md'),
    wikiCommands: overrides.wikiCommands ?? read('docs/wiki/Commands.md'),
    wikiArchitecture: overrides.wikiArchitecture ?? read('docs/wiki/Architecture.md'),
    wikiPrds: overrides.wikiPrds ?? read('docs/wiki/PRDs.md'),
    faq: overrides.faq ?? read('docs/wiki/FAQ.md'),
    install: overrides.install ?? read('docs/wiki/Installation-and-requirements.md'),
  };
  const completedPrds = overrides.completedPrds ?? listCompletedPrds();

  // 1. settings ↔ README
  const s = mentions(files.readme, settings);
  for (const m of s.missing) problems.push(`setting ${m} sem menção no README.md`);

  // 2. comandos de paleta ↔ wiki/Commands.md
  //    A wiki pode reformular o título (ex.: "Import connections from SQL
  //    Developer" vs nls "Import SQL Developer Connections"), então cobramos
  //    por PRESENÇA de tokens significativos do título, não pela frase exata.
  const wikiLower = files.wikiCommands.toLowerCase();
  const STOP = new Set(['utplsql', 'the', 'a', 'an', 'of', 'in', 'on', 'to', 'and', 'from']);
  for (const c of commandTitles) {
    const tokens = c.title
      .replace(/^utPLSQL:\s*/i, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP.has(w));
    const missingToken = tokens.find((t) => !wikiLower.includes(t));
    if (missingToken && !wikiLower.includes(c.id.toLowerCase())) {
      problems.push(
        `comando de paleta "${c.title}" (${c.id}) sem menção em Commands.md (token "${missingToken}")`,
      );
    }
  }

  // 3. cada módulo de produção src/*.ts citado em Architecture.md
  //    (ignora módulos de teste/suporte que não são de produção)
  const SKIP_MODULES = new Set(['setup.ts', 'vscode-stub.ts']);
  const archLower = files.wikiArchitecture.toLowerCase();
  for (const mod of modules) {
    if (SKIP_MODULES.has(mod)) continue;
    const base = mod.replace(/\.ts$/, '');
    // aceita "statusBar.ts" ou "statusBar" (uso entre crases)
    if (!archLower.includes(mod.toLowerCase()) && !archLower.includes(`\`${base.toLowerCase()}`)) {
      problems.push(`módulo src/${mod} não citado em docs/wiki/Architecture.md`);
    }
  }

  // 4. versão ↔ exemplos de .vsix
  const vsixRe = /vscode-utplsql-(\d+\.\d+\.\d+)(?:\.[a-z0-9-]+)*\.vsix/gi;
  for (const [name, text] of [
    ['FAQ.md', files.faq],
    ['Installation-and-requirements.md', files.install],
  ]) {
    for (const m of text.matchAll(vsixRe)) {
      if (m[1] !== version) {
        problems.push(`${name}: exemplo de .vsix na versão ${m[1]} ≠ ${version}`);
      }
    }
  }

  // 5. PRDs concluídos ↔ wiki/PRDs.md (por ID)
  for (const id of completedPrds) {
    if (!new RegExp(`\\|\\s*0*${Number(id)}\\s*\\|`).test(files.wikiPrds)) {
      problems.push(`PRD ${id} (completed/) ausente em docs/wiki/PRDs.md`);
    }
  }

  // 6. termos obsoletos proibidos como afirmação
  const obsolete = [
    { term: 'type_mapping', files: ['FAQ.md', 'Architecture.md'] },
    { term: 'java -jar', files: ['FAQ.md', 'Architecture.md', 'Installation-and-requirements.md'] },
  ];
  for (const { term, files: docs } of obsolete) {
    for (const rel of docs) {
      // overrides podem injetar o conteúdo por chave curta (faq/install) ou pelo
      // nome do arquivo (FAQ.md) — os testes usam a forma curta.
      const inline =
        overrides[rel] ??
        overrides[rel.replace(/\.md$/, '')] ??
        overrides[rel.replace(/\.md$/, '').toLowerCase()];
      const text = inline ?? read(`docs/wiki/${rel}`);
      if (text.includes(term)) problems.push(`termo obsoleto "${term}" em docs/wiki/${rel}`);
    }
  }

  return problems;
}

function listCompletedPrds() {
  const dir = path.join(REPO, 'docs', 'prd', 'completed');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^prd-\d+.*\.md$/.test(f))
    .map((f) => f.match(/^prd-(\d+)/)[1].replace(/^0+(?=\d)/, ''))
    .sort((a, b) => Number(a) - Number(b));
}

module.exports = {
  checkFidelity,
  realSettings,
  realCommands,
  commandTitleFragments,
  srcModules,
  pkgVersion,
  listCompletedPrds,
  read,
};

if (require.main === module) {
  const problems = checkFidelity();
  if (problems.length) {
    console.log('FIDELIDADE documental — problemas:');
    for (const p of problems) console.log(`  ✗ ${p}`);
    console.log(`\n${problems.length} problema(s).`);
    process.exit(1);
  }
  console.log('OK: documentação fiel ao código.');
}
