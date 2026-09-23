#!/usr/bin/env node
/**
 * Valida a consistência da documentação VERSIONADA (roda no CI).
 *
 *   npm run docs:check
 *
 * Verifica:
 *   - README.md ↔ variantes de idioma (README.<locale>.md) em ambas as direções
 *   - docs/prd/ ↔ docs/prd/index.md (tabela + Estrutura) e status ↔ pasta (saída gerada)
 *   - frontmatter das notas PRD do vault (docs/brain/20-PRDs): id/status/titulo
 *   - existência de páginas em docs/wiki/
 *
 * Exit 1 se houver qualquer inconsistência.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const PRD_DIR = path.join(REPO, 'docs', 'prd');
const VAULT_PRD_DIR = path.join(REPO, 'docs', 'brain', '20-PRDs');
const WIKI_DIR = path.join(REPO, 'docs', 'wiki');

// pasta → valor esperado no cabeçalho
const PRD_FOLDERS = {
  proposed: 'Proposto',
  approved: 'Aprovado',
  'in-progress': 'Em desenvolvimento',
  completed: 'Concluído',
};

const PRD_STATUS = new Set(Object.keys(PRD_FOLDERS));

let errors = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  console.log(`  ✗ ${msg}`);
  errors++;
};

function readdirSafe(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
}

function mdFiles(dir) {
  return readdirSafe(dir).filter((f) => f.endsWith('.md'));
}

// ── README + variantes ─────────────────────────────────────────────────

function checkReadme() {
  console.log('README / variantes de idioma');
  const readme = path.join(REPO, 'README.md');
  if (!fs.existsSync(readme)) return fail('README.md ausente');
  const text = fs.readFileSync(readme, 'utf8');
  const linked = new Set(
    [...text.matchAll(/\]\((README\.[^)]+\.md)\)/g)].map((m) => m[1]),
  );
  const exists = new Set(readdirSafe(REPO).filter((n) => /^README\..+\.md$/.test(n)));

  for (const l of linked) {
    if (!exists.has(l)) fail(`README.md aponta para ${l}, que não existe`);
  }
  for (const e of exists) {
    if (!linked.has(e)) fail(`${e} existe mas não está linkado no README.md`);
  }
  if ([...linked].every((l) => exists.has(l)) && [...exists].every((e) => linked.has(e))) {
    ok(`${exists.size} variantes consistentes com README.md`);
  }
}

// ── PRDs ───────────────────────────────────────────────────────────────

function extractStatus(content) {
  let m = content.match(/^\|\s*Status\s*\|\s*(.+?)\s*\|/m);
  if (m) return m[1].trim();
  m = content.match(/^##\s+Status\s*\n+([^\n#]+)/m);
  return m ? m[1].trim() : null;
}

function checkPrd() {
  console.log('PRDs (pasta ↔ index.md ↔ status)');
  const indexFile = path.join(PRD_DIR, 'index.md');
  if (!fs.existsSync(indexFile)) return fail('docs/prd/index.md ausente');
  const index = fs.readFileSync(indexFile, 'utf8');

  const linkedInIndex = new Set(
    [...index.matchAll(/\]\(((?:proposed|approved|in-progress|completed)\/[^)]+\.md)\)/g)].map(
      (m) => m[1],
    ),
  );

  const actual = new Set();
  for (const folder of Object.keys(PRD_FOLDERS)) {
    for (const f of mdFiles(path.join(PRD_DIR, folder))) {
      if (f === 'template.md') continue;
      actual.add(`${folder}/${f}`);
    }
  }

  for (const a of actual) {
    if (!linkedInIndex.has(a)) fail(`${a} não está linkado no index.md`);
    const occurrences = [...index.matchAll(new RegExp(`\\]\\(${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'))].length;
    if (occurrences > 1) console.log(`  ⚠ ${a} aparece ${occurrences}× no index.md (deveria ser 1)`);
  }
  for (const l of linkedInIndex) {
    if (!actual.has(l)) fail(`index.md linka ${l}, que não existe`);
  }

  for (const [folder, expected] of Object.entries(PRD_FOLDERS)) {
    for (const f of mdFiles(path.join(PRD_DIR, folder))) {
      if (f === 'template.md') continue;
      const status = extractStatus(fs.readFileSync(path.join(PRD_DIR, folder, f), 'utf8'));
      if (status !== expected) {
        fail(`${folder}/${f}: status "${status ?? '?'}" ≠ pasta "${expected}"`);
      }
    }
  }

  if ([...actual].every((a) => linkedInIndex.has(a)) && [...linkedInIndex].every((l) => actual.has(l))) {
    ok(`${actual.size} PRDs consistentes (pasta ↔ index ↔ status)`);
  }
}

// ── PRDs (vault — frontmatter é a fonte do status) ─────────────────────

function parseFm(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z_][\w-]*):\s?(.*)$/);
    if (mm) fm[mm[1]] = mm[2].replace(/^["']|["']$/g, '');
  }
  return fm;
}

function checkPrdVault() {
  console.log('PRDs (vault — frontmatter)');
  if (!fs.existsSync(VAULT_PRD_DIR)) return fail('docs/brain/20-PRDs ausente');
  const notes = readdirSafe(VAULT_PRD_DIR).filter((f) => /^prd-\d+.*\.md$/.test(f));
  if (!notes.length) return fail('docs/brain/20-PRDs sem notas prd-*.md');
  const ids = new Map();
  for (const f of notes) {
    const fm = parseFm(fs.readFileSync(path.join(VAULT_PRD_DIR, f), 'utf8'));
    if (!fm.id) fail(`${f}: frontmatter sem id`);
    if (!PRD_STATUS.has(fm.status)) fail(`${f}: status inválido "${fm.status ?? '?'}"`);
    if (!fm.titulo) fail(`${f}: frontmatter sem titulo`);
    if (fm.id) {
      if (ids.has(fm.id)) fail(`id duplicado ${fm.id} (${ids.get(fm.id)} e ${f})`);
      else ids.set(fm.id, f);
    }
  }
  ok(`${notes.length} PRDs com frontmatter válido`);
}

// ── Wiki (en) ──────────────────────────────────────────────────────────

function checkWiki() {
  console.log('Wiki (en)');
  const en = mdFiles(WIKI_DIR).filter((f) => f !== '_Sidebar.md');
  if (en.length === 0) {
    fail('docs/wiki/ não tem páginas');
    return;
  }
  ok(`${en.length} páginas`);
}

// ── main ───────────────────────────────────────────────────────────────

checkReadme();
checkPrd();
checkPrdVault();
checkWiki();

// Fidelidade código↔docs (settings, comandos, módulos, versão, PRDs, obsoletos).
console.log('Fidelidade código ↔ documentação');
try {
  const { checkFidelity } = require('./docs-fidelity.cjs');
  const problems = checkFidelity();
  if (problems.length) {
    for (const p of problems) fail(p);
  } else {
    ok('documentação fiel ao código (settings/comandos/módulos/versão/PRDs)');
  }
} catch (e) {
  fail(`docs-fidelity.cjs falhou: ${e.message}`);
}

if (errors) {
  console.log(`\n${errors} inconsistência(s) de documentação.`);
  process.exit(1);
}
console.log('\nOK: documentação consistente.');
