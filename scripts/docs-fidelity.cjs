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
 *   7. títulos de comando no README (por tokens significativos)
 *   8. claims de "não implementado" em código já implementado (heurística)
 *   9. variantes de README listam as mesmas settings do README.md
 *  10. piso de VS Code × runtime Node do host
 *  11. todo `*.ts|*.mjs|*.cjs` citado nas docs existe no repositório
 *  12. símbolo declarado em release anterior e ausente hoje não é citado nas docs
 */
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

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

/** Settings com `enum` (id + valores). */
function settingsWithEnums() {
  const pkg = JSON.parse(read('package.json'));
  const props = pkg.contributes?.configuration?.properties ?? {};
  return Object.entries(props)
    .filter(([, v]) => Array.isArray(v?.enum))
    .map(([id, v]) => ({ id, values: v.enum.map(String) }));
}

/** IDs `utplsql.*` presentes numa tabela markdown (primeira coluna em crase). */
function tableSettingIds(text) {
  return [...String(text).matchAll(/^\|\s*`(utplsql\.[^`]+)`\s*\|/gm)].map((m) => m[1]);
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
    wikiConfiguration: overrides.wikiConfiguration ?? read('docs/wiki/Configuration.md'),
    wikiArchitecture: overrides.wikiArchitecture ?? read('docs/wiki/Architecture.md'),
    wikiPrds: overrides.wikiPrds ?? read('docs/wiki/PRDs.md'),
    faq: overrides.faq ?? read('docs/wiki/FAQ.md'),
    install: overrides.install ?? read('docs/wiki/Installation-and-requirements.md'),
  };
  const completedPrds = overrides.completedPrds ?? listCompletedPrds();

  // 1. settings ↔ README **e** wiki/Configuration.md (todos os ids).
  for (const m of mentions(files.readme, settings).missing) {
    problems.push(`setting ${m} sem menção no README.md`);
  }
  for (const m of mentions(files.wikiConfiguration, settings).missing) {
    problems.push(`setting ${m} sem menção em docs/wiki/Configuration.md`);
  }
  // Bidirecional: ids nas tabelas geradas precisam existir no package.json.
  const knownSettings = new Set(settings);
  for (const [name, text] of [
    ['README.md', files.readme],
    ['docs/wiki/Configuration.md', files.wikiConfiguration],
  ]) {
    for (const id of new Set(tableSettingIds(text))) {
      if (!knownSettings.has(id))
        problems.push(`${name}: setting "${id}" não existe no package.json`);
    }
  }
  // Valores de enum relevantes aparecem no README e na wiki.
  const enums = overrides.settingEnums ?? settingsWithEnums();
  for (const { id, values } of enums) {
    for (const value of values) {
      if (!files.readme.includes(value)) {
        problems.push(`setting ${id}: valor de enum "${value}" ausente no README.md`);
      }
      if (!files.wikiConfiguration.includes(value)) {
        problems.push(`setting ${id}: valor de enum "${value}" ausente em Configuration.md`);
      }
    }
  }

  // 2. comandos ↔ wiki/Commands.md e README por ID exato (a tabela gerada
  //    inclui a coluna ID; títulos podem variar entre locales/prosa).
  const commands = overrides.commands ?? realCommands();
  for (const id of commands) {
    if (!files.wikiCommands.includes(id)) {
      problems.push(`comando ${id} sem menção em docs/wiki/Commands.md`);
    }
    if (!files.readme.includes(id)) {
      problems.push(`comando ${id} sem menção no README.md`);
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

  // 5. PRDs concluídos ↔ wiki/PRDs.md (por ID) — e DEVEM estar na seção Completed.
  const completedSection = files.wikiPrds.split(/\n###\s+[^\n]*Approved/)[0];
  for (const id of completedPrds) {
    const marker = new RegExp(`\\|\\s*0*${Number(id)}\\s*\\|`);
    if (!marker.test(files.wikiPrds)) {
      problems.push(`PRD ${id} (completed/) ausente em docs/wiki/PRDs.md`);
    } else if (!marker.test(completedSection)) {
      problems.push(`PRD ${id} (completed/) listado fora da seção Completed em docs/wiki/PRDs.md`);
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

  // 7. títulos de comando no README (comparação por tokens significativos).
  //    O README é a doc do usuário e pode reformular/ordenar o título (ex.:
  //    "Import connections from SQL Developer" vs nls "Import SQL Developer
  //    Connections"), então cobramos os tokens-chave, não a frase exata.
  //    `utplsql.runLens` é interno (CodeLens, sem entrada de paleta) → isento.
  const readmeNorm = normalize(files.readme);
  const INTERNAL_CMDS = new Set(['utplsql.runLens']);
  const README_STOP = new Set(['utplsql', 'the', 'a', 'an', 'of', 'in', 'on', 'to', 'and', 'from']);
  for (const c of commandTitles) {
    if (INTERNAL_CMDS.has(c.id)) continue;
    const tokens = normalize(c.title)
      .split(' ')
      .filter((w) => w.length > 2 && !README_STOP.has(w));
    const missing = tokens.find((w) => !readmeNorm.includes(w));
    if (missing) {
      problems.push(
        `comando "${c.title}" (${c.id}) sem correspondência no README.md (token "${missing}")`,
      );
    }
  }

  // 8. claims de "não implementado" em código já implementado (heurística)
  //    pares (frase no doc → símbolo no código que prova o contrário).
  const falseNegatives = [
    { phrase: 'is never called', symbol: 'consumeExtraReporter', docs: ['Reporters.md'] },
    { phrase: 'has no effect', symbol: 'compilationDiagnostics', docs: ['Configuration.md'] },
    { phrase: 'not wired', symbol: 'compilationDiagnostics', docs: ['FAQ.md'] },
    {
      phrase: 'is never emitted',
      symbol: 'UTPLSQL_BAD_CONN',
      docs: ['Diagnostics-and-quick-fix.md'],
    },
  ];
  for (const { phrase, symbol, docs } of falseNegatives) {
    for (const rel of docs) {
      const inline =
        overrides[rel] ??
        overrides[rel.replace(/\.md$/, '')] ??
        overrides[rel.replace(/\.md$/, '').toLowerCase()];
      const text = inline ?? read(`docs/wiki/${rel}`);
      if (text.includes(phrase) && read(`src/${srcFileFor(symbol)}`).includes(symbol)) {
        problems.push(
          `claim obsoleto "${phrase}" em docs/wiki/${rel} (${symbol} existe no código)`,
        );
      }
    }
  }

  // 9. variantes de README devem listar as mesmas settings do README.md.
  //    O docs:check só valida os LINKS entre variantes (não o conteúdo), então
  //    sem isto uma variante pode ficar sem settings por várias versões.
  const variants = overrides.readmeVariants ?? listReadmeVariants();
  const obsoleteReadmeTerms = ['coverageSourceArgs', 'type_mapping'];
  for (const { name, text } of variants) {
    const missing = settings.filter((k) => !text.includes(k));
    if (missing.length) {
      problems.push(`README.${name}: settings ausentes: ${missing.join(', ')}`);
    }
    if (!text.includes('utplsql-source')) {
      problems.push(`README.${name}: sem menção a utplsql-source`);
    }
    for (const term of obsoleteReadmeTerms) {
      if (text.includes(term)) problems.push(`README.${name}: termo obsoleto "${term}"`);
    }
  }
  for (const term of obsoleteReadmeTerms) {
    if (files.readme.includes(term)) problems.push(`README.md: termo obsoleto "${term}"`);
  }

  // 10. Piso de VS Code e coerência do runtime Node:
  //     (a) @types/vscode deve ser exatamente o piso de engines.vscode;
  //     (b) engines.node, @types/node e o target do esbuild devem casar com o
  //         Node embutido no host daquela versão do VS Code (Execução roda no
  //         Node do VS Code, não no Node do dev/CI — ver TPL-VSCODE-API).
  //     Fixtures sem `engines.vscode` são ignoradas.
  let pkg = overrides.pkg;
  if (!pkg) {
    try {
      pkg = JSON.parse(read('package.json'));
    } catch {
      pkg = null;
    }
  }
  const engineFloor = String(pkg?.engines?.vscode ?? '')
    .replace(/^[\^~>=<\s]+/, '')
    .trim();
  if (engineFloor) {
    const typesVersion = String(pkg?.devDependencies?.['@types/vscode'] ?? '').trim();
    if (typesVersion !== engineFloor) {
      problems.push(
        `@types/vscode deve ser exatamente "${engineFloor}" (piso de engines.vscode); está "${typesVersion || 'ausente'}"`,
      );
    }

    // Node embutido no host por versão do VS Code (fonte: .nvmrc do vscode por tag).
    const VSCODE_HOST_NODE = {
      1.88: 18,
      '1.90': 20,
      '1.100': 20,
      1.101: 22,
      1.102: 22,
      1.125: 24,
    };
    const majorOf = (v) => {
      const m = String(v ?? '').match(/(\d+)/);
      return m ? Number(m[1]) : undefined;
    };
    const mm = engineFloor.split('.').slice(0, 2).join('.');
    const hostNode = VSCODE_HOST_NODE[mm];
    if (hostNode) {
      const nodeEngine = pkg?.engines?.node;
      const typesNode = pkg?.devDependencies?.['@types/node'];
      const esbuild = overrides.esbuild ?? read('esbuild.config.mjs');
      const esbuildTarget = (esbuild.match(/target:\s*['"]node(\d+)['"]/) || [])[1];
      if (majorOf(nodeEngine) !== hostNode) {
        problems.push(
          `engines.node ("${nodeEngine}") ≠ Node ${hostNode} do host do VS Code ${mm} (runtime do Extension Host)`,
        );
      }
      if (majorOf(typesNode) !== hostNode) {
        problems.push(`@types/node ("${typesNode}") ≠ Node ${hostNode} do host do VS Code ${mm}`);
      }
      if (esbuildTarget && Number(esbuildTarget) !== hostNode) {
        problems.push(
          `esbuild target node${esbuildTarget} ≠ Node ${hostNode} do host do VS Code ${mm}`,
        );
      }
    }
  }

  // 11/12. módulos e símbolos descontinuados citados na documentação
  problems.push(...checkStaleReferences(overrides));

  return problems;
}

/** Normaliza texto para comparação de títulos: minúsculas, sem pontuação. */
function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Heurística: mapeia símbolo → arquivo src que o contém. */
function srcFileFor(symbol) {
  const dir = path.join(REPO, 'src');
  const hits = fs.readdirSync(dir).filter((f) => {
    if (!f.endsWith('.ts')) return false;
    return fs.readFileSync(path.join(dir, f), 'utf8').includes(symbol);
  });
  return hits[0] ?? '';
}

/** Variantes geradas na raiz do repo: { name, text } de README.<locale>.md. */
function listReadmeVariants() {
  return fs
    .readdirSync(REPO)
    .filter((f) => /^README\.[a-zA-Z-]+\.md$/.test(f))
    .sort()
    .map((f) => ({ name: f.slice('README.'.length, -3), text: read(f) }));
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

// ── Símbolos descontinuados (checagem 11/12) ─────────────────────────────
//
// Motivação: um diagrama/texto pode continuar documentando algo que foi
// REMOVIDO (ex.: o modo CLI, eliminado na 0.12 pela PRD-64) — o `docs:check`
// não olhava o conteúdo. Aqui:
//   11. todo `*.ts|*.mjs|*.cjs` citado nas docs tem de existir no repo;
//   12. identificador declarado em `src/` em qualquer tag de release e ausente
//       hoje (símbolo descontinuado) não pode ser citado nas docs.

/** Arquivos .ts de `src/` (recursivo, inclui `src/commands/`). */
function srcTsFiles(dir = path.join(REPO, 'src'), acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) srcTsFiles(full, acc);
    else if (e.name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

/** Identificadores declarados num texto TS (`function`/`class`/`const`/…). */
function declaredSymbols(text) {
  const out = new Set();
  const re =
    /(?:export\s+)?(?:declare\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of text.matchAll(re)) out.add(m[1]);
  return out;
}

/** Executa git e devolve as linhas (ou null se git/ref indisponível). */
function gitLines(args) {
  if (gitLines.cache.has(args.join(' '))) return gitLines.cache.get(args.join(' '));
  let result = null;
  try {
    const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    result =
      r.status === 0
        ? String(r.stdout ?? '')
            .split('\n')
            .filter(Boolean)
        : null;
  } catch {
    result = null;
  }
  gitLines.cache.set(args.join(' '), result);
  return result;
}
gitLines.cache = new Map();

/** Nomes "vivos": declarações, nomes de módulo e qualquer token presente no src/. */
function aliveNames() {
  const out = new Set();
  for (const file of srcTsFiles()) {
    // O nome do módulo conta como vivo (ex.: `compilationDiagnostics` aparece nas
    // docs como módulo E como sub-chave de setting).
    out.add(path.basename(file, '.ts'));
    const text = fs.readFileSync(file, 'utf8');
    for (const s of declaredSymbols(text)) out.add(s);
    // Campos, parâmetros e menções em comentário também contam (ex.: `cachedItems`).
    for (const m of text.matchAll(/[A-Za-z_$][\w$]*/g)) out.add(m[0]);
  }
  return out;
}

/**
 * Nomes removidos **antes** desta checagem existir (era CLI, ≤ 0.12 — PRD-64),
 * consolidados a partir do histórico completo de tags. Ficam aqui porque o
 * baseline automático é a última release e a era CLI é anterior a ela.
 */
const LEGACY_REMOVED = {
  modules: [
    'cli.ts',
    'cliEncoding.ts',
    'cliInfo.ts',
    'cliReporters.ts',
    'invocation.ts',
    'cli.test.ts',
    'cliEncoding.test.ts',
    'cliInfo.test.ts',
    'cliReporters.test.ts',
    'invocation.test.ts',
  ],
  symbols: ['parseFromOutput', 'applyResults', 'safeArgs', 'resolveStackLocation', 'oracleCli'],
};

/**
 * Símbolos que existiram em **alguma** tag de release e não existem hoje.
 * `null` quando não há git/tags (clone raso) — a checagem então é pulada.
 *
 * Baseline: a **última tag de release** (comparar a release anterior com a
 * árvore atual é o que "a doc descreve o que saiu" significa; e cada tag custa
 * ~0,5 s de `git grep` aqui). O histórico anterior à checagem (era CLI, ≤ 0.12)
 * entra pela lista consolidada `LEGACY_REMOVED`.
 */
function staleSymbols() {
  if (staleSymbols.cache !== undefined) return staleSymbols.cache;
  const tag = latestTag();
  if (!tag) {
    staleSymbols.cache = null;
    return null;
  }
  const historical = new Set(LEGACY_REMOVED.symbols);
  const lines = gitLines([
    'grep',
    '-h',
    '-o',
    '-E',
    '(export )?(declare )?(async )?(function|class|const|let|var|interface|type|enum) [A-Za-z_$][A-Za-z0-9_$]*',
    tag,
    '--',
    'src',
  ]);
  if (lines) {
    for (const line of lines) for (const s of declaredSymbols(line)) historical.add(s);
  }
  const today = aliveNames();
  const result = new Set([...historical].filter((s) => !today.has(s)));
  staleSymbols.cache = result;
  return result;
}
staleSymbols.cache = undefined;

/** Última tag de release (vX.Y.Z) alcançável, ou null em clone raso. */
function latestTag() {
  if (latestTag.cache !== undefined) return latestTag.cache;
  const tags = gitLines(['tag', '--list', 'v*']);
  if (!tags || tags.length === 0) {
    latestTag.cache = null;
    return null;
  }
  const cmp = (a, b) =>
    String(a)
      .slice(1)
      .split('.')
      .map(Number)
      .reduce((acc, n, _i) => acc * 1000 + (n || 0), 0) -
    String(b)
      .slice(1)
      .split('.')
      .map(Number)
      .reduce((acc, n, _i) => acc * 1000 + (n || 0), 0);
  const result = [...tags].sort(cmp).pop() ?? null;
  latestTag.cache = result;
  return result;
}
latestTag.cache = undefined;

/** Módulos de `src/` que existiram em alguma release e não existem hoje. */
function removedModules() {
  if (removedModules.cache !== undefined) return removedModules.cache;
  const tag = latestTag();
  if (!tag) {
    removedModules.cache = null;
    return null;
  }
  const historical = new Set(LEGACY_REMOVED.modules);
  const files = gitLines(['ls-tree', '-r', '--name-only', tag, '--', 'src']);
  if (files) for (const f of files) if (f.endsWith('.ts')) historical.add(path.posix.basename(f));
  const today = new Set(srcTsFiles().map((f) => path.basename(f)));
  const result = new Set([...historical].filter((f) => !today.has(f)));
  removedModules.cache = result;
  return result;
}
removedModules.cache = undefined;

/**
 * Menções **deliberadas** a símbolos removidos: o próprio texto explica que não
 * existem mais. Sem justificativa aqui, a menção é tratada como drift.
 */
const ALLOW_STALE = new Map([
  ['resolveStackLocation', 'functional/03 afirma que não existe mais (só resolveStackFrameToUri)'],
  ['applyCoverage', 'functional/07 documenta o wrapper CLI removido e o diagnostic morto'],
]);

/** Superfícies de documentação versionada (usuário) — sem PRDs/CHANGELOG. */
function docsScanTargets() {
  const targets = [];
  const push = (rel) => {
    const abs = path.join(REPO, rel);
    if (fs.existsSync(abs)) targets.push({ path: rel, text: fs.readFileSync(abs, 'utf8') });
  };
  push('README.md');
  for (const f of fs.readdirSync(REPO).filter((f) => /^README\..+\.md$/.test(f))) push(f);
  push('site/index.html');
  for (const dir of ['docs/wiki', 'docs/functional']) {
    const abs = path.join(REPO, dir);
    if (!fs.existsSync(abs)) continue;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(md|svg)$/.test(e.name)) {
          targets.push({
            path: path.relative(REPO, full).split(path.sep).join('/'),
            text: fs.readFileSync(full, 'utf8'),
          });
        }
      }
    };
    walk(abs);
  }
  return targets;
}

/** Identificadores compostos (camelCase) citados como código num texto. */
function citedCodeIdentifiers(text, kind) {
  const out = new Set();
  const compound = /^[a-z][A-Za-z0-9_$]*[A-Z][A-Za-z0-9_$]*$/;
  const add = (raw) => {
    const id = String(raw).replace(/[()\s]/g, '');
    if (compound.test(id)) out.add(id);
  };
  let scan = text;
  if (kind === 'svg') {
    scan = [...text.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join('\n');
  } else {
    // Em markdown só o que está entre crases ou seguido de `(` é "código".
    // Blocos cercados (```) são exemplos/copiar-e-colar — fora.
    const prose = text.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '');
    scan = [
      ...[...prose.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]),
      ...[...prose.matchAll(/([A-Za-z_$][\w$]*)\(/g)].map((m) => m[1]),
    ].join(' ');
  }
  for (const m of scan.matchAll(/[A-Za-z_$][\w$]*/g)) add(m[0]);
  return out;
}

/** Checagens 11 e 12 — devolve lista de problemas. */
function checkStaleReferences(overrides = {}) {
  const problems = [];
  const targets = overrides.docsScanTargets ?? docsScanTargets();
  /** Em markdown, blocos cercados são exemplos (placeholders) — fora do scan. */
  const stripFences = (rel, text) =>
    rel.endsWith('.md') ? text.replace(/^(?:```|~~~)[\s\S]*?^(?:```|~~~)[^\n]*$/gm, '') : text;

  // 11. módulo removido do src/ não pode ser citado (nomes de exemplo/inexistentes
  //     de propósito não são cobrados: o alvo é conteúdo descontinuado).
  const removed = overrides.removedModules ?? removedModules();
  if (removed && removed.size > 0) {
    for (const { path: rel, text } of targets) {
      const prose = stripFences(rel, text);
      for (const m of prose.matchAll(/\.?[A-Za-z0-9_.-]+\.(?:ts|mjs|cjs)\b/g)) {
        const full = m[0];
        const base = path.posix.basename(full);
        if (!removed.has(base) && !removed.has(full)) continue;
        problems.push(`${rel}: cita o módulo "${full}", removido do código`);
      }
    }
  }

  // 12. símbolo descontinuado não pode ser citado (salvo justificativa documentada)
  const stale = overrides.staleSymbols ?? staleSymbols();
  if (stale && stale.size > 0) {
    for (const { path: rel, text } of targets) {
      const kind = rel.endsWith('.svg') ? 'svg' : 'md';
      for (const id of citedCodeIdentifiers(text, kind)) {
        if (!stale.has(id) || ALLOW_STALE.has(id)) continue;
        problems.push(
          `${rel}: cita "${id}", removido do código (existe só em releases anteriores)`,
        );
      }
    }
  }
  return problems;
}

module.exports = {
  checkFidelity,
  checkStaleReferences,
  citedCodeIdentifiers,
  declaredSymbols,
  docsScanTargets,
  removedModules,
  realSettings,
  realCommands,
  settingsWithEnums,
  tableSettingIds,
  srcTsFiles,
  staleSymbols,
  ALLOW_STALE,
  commandTitleFragments,
  srcModules,
  pkgVersion,
  listCompletedPrds,
  listReadmeVariants,
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
