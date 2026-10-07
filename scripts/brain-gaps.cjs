#!/usr/bin/env node
/**
 * Reporta arquivos do repositório que NÃO têm referência no cérebro
 * (`docs/brain`): nenhum campo `arquivo:`/`implementacao:`/`testes:` de nota.
 *
 * Uso:
 *   node scripts/brain-gaps.cjs          # estrito: sai 1 se houver brecha
 *   node scripts/brain-gaps.cjs --warn   # aviso: imprime e sai 0 (usado no brain:ci)
 *
 * Escopo verificado:
 *   - src/**\/*.ts (fora de src/test/**)
 *   - src/test/**\/*.test.ts
 *   - scripts/**\/*.{cjs,sh,py}
 *   - .github/workflows/*
 *
 * A referência pode vir de qualquer nota do vault (não só COD/TST geradas).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VAULT = path.join(ROOT, 'docs', 'brain');
const SKIP_DIRS = new Set(['node_modules', 'out', 'dist', '.git', '.vscode-test', 'coverage']);

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, filter, out);
    else if (filter(full)) out.push(path.relative(ROOT, full).replace(/\\/g, '/'));
  }
  return out;
}

/** Campos do frontmatter que referenciam arquivos do repo. */
function referencedFiles() {
  const refs = new Set();
  const visit = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
      ['.obsidian', '_templates', '.trash', '.copilot', '.smart-env', 'copilot', '.opencode'].includes(
        e.name,
      )
    )
      continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        visit(full);
        continue;
      }
      if (!e.name.endsWith('.md')) continue;
      const fm = (fs.readFileSync(full, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
      if (!fm) continue;
      for (const m of fm.matchAll(/^(?:arquivo|implementacao|testes):\s*(.*)$/gm)) {
        const raw = m[1].trim();
        const items = raw.startsWith('[')
          ? raw
              .slice(1, -1)
              .split(',')
              .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          : [raw.replace(/^["']|["']$/g, '')];
        for (const it of items) if (it) refs.add(it.replace(/:\d+$/, ''));
      }
    }
  };
  if (fs.existsSync(VAULT)) visit(VAULT);
  return refs;
}

function main() {
  const warn = process.argv.includes('--warn');
  if (!fs.existsSync(VAULT)) {
    console.log('Sem vault (docs/brain ausente) — nada a conferir.');
    return 0;
  }
  const refs = referencedFiles();
  const groups = {
    'src (produção)': walk(
      path.join(ROOT, 'src'),
      (f) => f.endsWith('.ts') && !path.relative(ROOT, f).split(path.sep).includes('test'),
    ),
    'testes': walk(path.join(ROOT, 'src', 'test'), (f) => f.endsWith('.test.ts')),
    'scripts': walk(path.join(ROOT, 'scripts'), (f) => /\.(cjs|sh|py)$/.test(f)),
    'workflows': walk(path.join(ROOT, '.github', 'workflows'), () => true),
    'site (Pages)': walk(path.join(ROOT, 'site'), (f) => /\.(html|css|txt|xml)$/.test(f)),
  };

  const gaps = [];
  for (const [label, files] of Object.entries(groups)) {
    const missing = files.filter((f) => !refs.has(f));
    if (missing.length) {
      gaps.push({ label, missing });
      console.log(`\n[${label}] ${missing.length}/${files.length} sem referência no cérebro:`);
      for (const f of missing) console.log(`  - ${f}`);
    }
  }

  if (!gaps.length) {
    console.log('OK: todos os arquivos do repo têm referência no cérebro.');
    return 0;
  }
  const total = gaps.reduce((n, g) => n + g.missing.length, 0);
  console.log(
    `\n${total} arquivo(s) sem referência no cérebro.` +
      (warn ? ' (aviso: não falha)' : ' Adicione a um `implementacao:`/`testes:` de alguma nota.'),
  );
  return warn ? 0 : 1;
}

process.exit(main());