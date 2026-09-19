#!/usr/bin/env node
/**
 * Ferramentas de manutenção do "second brain" (docs/brain — gitignored).
 *
 * Uso:
 *   npm run brain:sync    # regenera blocos automáticos a partir do repo
 *   npm run brain:check   # valida wikilinks + links markdown do vault
 *
 * Sem `docs/brain` o script é um no-op (o vault é local de cada dev).
 * O repo é a fonte da verdade: este script só lê o repo e escreve no vault.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const VAULT = path.join(REPO, 'docs', 'brain');

const startMarker = (name) => `<!-- brain:auto:start:${name} -->`;
const END_MARKER = '<!-- brain:auto:end -->';
const MARKER_RE = /<!-- brain:auto:start:([\w-]+) -->[\s\S]*?<!-- brain:auto:end -->/g;
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const MDLINK_RE = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
const CODE_FENCE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`]*`/g;
const FUNC_ROW_RE = /^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.*?)\s*\|\s*$/;

// ── helpers ────────────────────────────────────────────────────────────

function vaultNotes() {
  if (!fs.existsSync(VAULT)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === '.obsidian' || entry.name === '_tools') continue;
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith('.md')) {
        out.push(path.join(dir, entry.name));
      }
    }
  };
  walk(VAULT);
  return out.sort();
}

function rel(target, note) {
  return path.relative(path.dirname(note), target).split(path.sep).join('/');
}

function gitDate(relpath) {
  try {
    return execFileSync('git', ['-C', REPO, 'log', '-1', '--format=%cs', '--', relpath], {
      encoding: 'utf8',
    }).trim() || null;
  } catch {
    return null;
  }
}

function listMd(dir, note, skip = new Set()) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.md') && !skip.has(n))
    .sort((a, b) => a.localeCompare(b))
    .map((n) => `- [${path.basename(n, '.md')}](${rel(path.join(dir, n), note)})`);
}

// ── generators ─────────────────────────────────────────────────────────

function genRootDocs(note) {
  const nomes = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md'];
  const linhas = [];
  for (const nome of nomes) {
    const p = path.join(REPO, nome);
    if (!fs.existsSync(p)) continue;
    const d = gitDate(nome);
    linhas.push(`- [${nome}](${rel(p, note)})${d ? ` — _${d}_` : ''}`);
  }
  return linhas.join('\n') || '_nenhum_';
}

function genReadmeVariants(note) {
  const base = path.join(REPO, 'README.md');
  if (!fs.existsSync(base)) return '_README.md ausente._';
  const baseDate = gitDate('README.md');
  const linhas = [`| Principal | [README.md](${rel(base, note)}) | ${baseDate || '—'} |`];
  const variants = fs
    .readdirSync(REPO)
    .filter((n) => /^README\..+\.md$/.test(n))
    .sort((a, b) => a.localeCompare(b));
  for (const name of variants) {
    const code = name.slice('README.'.length, -'.md'.length);
    const d = gitDate(name);
    const flag = baseDate && d && d < baseDate ? ' ⚠️' : '';
    linhas.push(`| \`${code}\` | [${name}](${rel(path.join(REPO, name), note)}) | ${d || '—'}${flag} |`);
  }
  return ['| Idioma | Arquivo | Última alteração |', '|---|---|---|', ...linhas].join('\n');
}

function genWikiIndex(note) {
  const wiki = path.join(REPO, 'docs', 'wiki');
  const skip = new Set(['_Sidebar.md']);
  const en = listMd(wiki, note, skip);
  return en.length ? en.join('\n') : '_ausente_';
}

function genLinkedinIndex(note) {
  const base = path.join(REPO, 'docs', 'linkedin');
  if (!fs.existsSync(base)) return '_docs/linkedin ausente (pasta local, não versionada)._';
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
        const label = path.relative(base, full).slice(0, -'.md'.length).split(path.sep).join('/');
        out.push(`- [${label}](${rel(full, note)})`);
      }
    }
  };
  walk(base);
  return out.sort().join('\n') || '_vazio_';
}

function genFuncionalIndex(note) {
  const readme = path.join(REPO, 'docs', 'functional', 'README.md');
  if (!fs.existsSync(readme)) return '_docs/functional ausente._';
  const rows = [];
  for (const line of fs.readFileSync(readme, 'utf8').split('\n')) {
    const m = line.match(FUNC_ROW_RE);
    if (!m) continue;
    const [, num, title, link, desc] = m;
    rows.push(`| ${num} | [${title}](${rel(path.join(path.dirname(readme), link), note)}) | ${desc} |`);
  }
  if (!rows.length) return '_Nenhum documento funcional encontrado._';
  return ['| # | Documento | Descrição |', '|---|---|---|', ...rows].join('\n');
}

function countDir(name) {
  const d = path.join(REPO, 'docs', 'prd', name);
  return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.md')).length : 0;
}

function genPrdSummary(note) {
  const index = path.join(REPO, 'docs', 'prd', 'index.md');
  const linhas = [
    `- 📝 Propostos: **${countDir('proposed')}**`,
    `- 🔵 Aprovados: **${countDir('approved')}**`,
    `- 🟡 Em desenvolvimento: **${countDir('in-progress')}**`,
    `- 🟢 Concluídos: **${countDir('completed')}**`,
  ];
  if (fs.existsSync(index)) {
    linhas.push('', `Detalhe completo (fonte da verdade): [docs/prd/index.md](${rel(index, note)})`);
  }
  return linhas.join('\n');
}

const GENERATORS = {
  'root-docs': genRootDocs,
  'readme-variants': genReadmeVariants,
  'wiki-index': genWikiIndex,
  'linkedin-index': genLinkedinIndex,
  'funcional-index': genFuncionalIndex,
  'prd-summary': genPrdSummary,
};

// ── commands ───────────────────────────────────────────────────────────

function sync() {
  let changed = 0;
  for (const file of vaultNotes()) {
    const original = fs.readFileSync(file, 'utf8');
    const updated = original.replace(MARKER_RE, (full, name) => {
      const gen = GENERATORS[name];
      if (!gen) {
        console.warn(`[warn] gerador desconhecido '${name}' em ${path.basename(file)}`);
        return full;
      }
      return `${startMarker(name)}\n${gen(file)}\n${END_MARKER}`;
    });
    if (updated !== original) {
      fs.writeFileSync(file, updated);
      console.log(`[sync] ${path.relative(VAULT, file)}`);
      changed++;
    }
  }
  console.log(`OK: ${changed} arquivo(s) atualizado(s).`);
  return 0;
}

function check() {
  const files = vaultNotes();
  const names = new Set(files.map((f) => path.basename(f, '.md')));
  let bad = 0;
  const stripCode = (t) => t.replace(CODE_FENCE_RE, '').replace(INLINE_CODE_RE, '');
  for (const file of files) {
    const text = stripCode(fs.readFileSync(file, 'utf8'));
    for (const m of text.matchAll(WIKILINK_RE)) {
      const link = m[1].trim();
      if (link.startsWith('.')) {
        console.log(`[warn] wikilink relativo (use markdown): ${path.basename(file)} -> ${link}`);
        bad++;
      } else if (!names.has(link)) {
        console.log(`[erro] wikilink quebrado: ${path.basename(file)} -> ${link}`);
        bad++;
      }
    }
    for (const m of text.matchAll(MDLINK_RE)) {
      const link = m[1].trim();
      if (/^(https?:|#|mailto:)/.test(link)) continue;
      const target = path.resolve(path.dirname(file), link.split('#')[0]);
      if (!fs.existsSync(target)) {
        console.log(`[erro] link externo quebrado: ${path.basename(file)} -> ${link}`);
        bad++;
      }
    }
  }
  if (bad) {
    console.log(`\n${bad} problema(s) encontrado(s).`);
    return 1;
  }
  console.log(`OK: ${files.length} notas, todos os links resolvem.`);
  return 0;
}

module.exports = { sync, check };

if (require.main === module) {
  if (!fs.existsSync(VAULT)) {
    console.log('Vault docs/brain ausente — nada a fazer.');
    process.exit(0);
  }
  const cmd = process.argv[2] || 'check';
  if (cmd === 'sync') process.exit(sync());
  if (cmd === 'check') process.exit(check());
  console.log('Uso: node scripts/brain.cjs [check|sync]');
  process.exit(2);
}
