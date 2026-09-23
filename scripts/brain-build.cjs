#!/usr/bin/env node
/**
 * Gera artefatos do repositório a partir do vault (`docs/brain`).
 *
 *   npm run brain:build          # escreve os arquivos publicados
 *   node scripts/brain-build.cjs check   # falha (exit 1) se houver drift
 *
 * Uma nota publica para o repo quando tem `publicar: <caminho relativo ao repo>`
 * no frontmatter. O arquivo gerado = banner "GENERATED" + corpo da nota (sem
 * frontmatter). Arquivos gerados NÃO devem ser editados à mão.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const VAULT = path.join(REPO, 'docs', 'brain');
const BANNER = (rel) => `<!-- GENERATED FROM docs/brain/${rel} — DO NOT EDIT -->`;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.obsidian' || entry.name === '_templates' || entry.name === '.trash') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: {}, body: text, hasFm: false };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z_][\w-]*):\s?(.*)$/);
    if (mm) fm[mm[1]] = mm[2].replace(/^["']|["']$/g, '');
  }
  return { fm, body: text.slice(m[0].length), hasFm: true };
}

function published() {
  const items = [];
  for (const note of walk(VAULT)) {
    const text = fs.readFileSync(note, 'utf8');
    const { fm, body } = parseFrontmatter(text);
    if (!fm.publicar) continue;
    items.push({ note, rel: path.relative(VAULT, note).split(path.sep).join('/'), target: fm.publicar, body });
  }
  return items;
}

function render(item) {
  return `${BANNER(item.rel)}\n${item.body}`.replace(/\s+$/, '') + '\n';
}

function run(check) {
  const items = published();
  let changed = 0;
  let drifted = 0;
  for (const item of items) {
    const target = path.join(REPO, item.target);
    const desired = render(item);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (current === desired) continue;
    if (check) {
      console.log(`[drift] ${item.target} (gerado de ${item.rel})`);
      drifted++;
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, desired, 'utf8');
    console.log(`[build] ${item.target} <- ${item.rel}`);
    changed++;
  }
  if (check) {
    if (drifted) {
      console.log(`\n${drifted} arquivo(s) com drift. Rode: npm run brain:build`);
      return 1;
    }
    console.log(`OK: ${items.length} arquivo(s) publicados em sincronia.`);
    return 0;
  }
  console.log(`OK: ${changed} arquivo(s) atualizado(s) de ${items.length} publicados.`);
  return 0;
}

if (require.main === module) {
  const check = process.argv[2] === 'check';
  if (!fs.existsSync(VAULT)) {
    console.log('Vault docs/brain ausente — nada a gerar.');
    process.exit(0);
  }
  process.exit(run(check));
}

module.exports = { published, render, parseFrontmatter };
