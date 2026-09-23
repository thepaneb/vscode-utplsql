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

const WIKI_PREFIX = 'docs/wiki/';
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

const README_RE = /^README(\..+)?\.md$/;
const README_HOME = 'README (extensão)';

/** Obsidian `[[alvo|texto]]` -> link markdown de wiki `[texto](alvo)`. */
function wikiLinks(body) {
  return body.replace(WIKILINK_RE, (_full, target, display) => {
    const t = target.trim();
    return `[${(display || target).trim()}](${t})`;
  });
}

/** Obsidian `[[alvo|texto]]` -> link markdown `[texto](alvo.md)` (README). */
function readmeLinks(body) {
  return body.replace(WIKILINK_RE, (_full, target, display) => {
    const page = target.trim() === README_HOME ? 'README' : target.trim();
    return `[${(display || target).trim()}](${page}.md)`;
  });
}

/** Espelha um diretório de imagens do vault para o repo. */
function syncDir(src, dst, relLabel, check, mirror) {
  if (!fs.existsSync(src)) return { changed: 0, drifted: 0, total: 0 };
  const names = fs.readdirSync(src);
  const known = new Set(names);
  let changed = 0;
  let drifted = 0;
  for (const name of names) {
    const desired = fs.readFileSync(path.join(src, name));
    const target = path.join(dst, name);
    const current = fs.existsSync(target) ? fs.readFileSync(target) : null;
    if (current && current.equals(desired)) continue;
    if (check) {
      console.log(`[drift] ${relLabel}${name}`);
      drifted++;
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, desired);
    console.log(`[build] ${relLabel}${name}`);
    changed++;
  }
  if (mirror && fs.existsSync(dst)) {
    for (const name of fs.readdirSync(dst)) {
      if (known.has(name)) continue;
      if (check) {
        console.log(`[drift] ${relLabel}${name} (sobra)`);
        drifted++;
        continue;
      }
      fs.rmSync(path.join(dst, name));
      console.log(`[build] remove ${relLabel}${name}`);
      changed++;
    }
  }
  return { changed, drifted, total: names.length };
}

const imagesSync = (check) =>
  syncDir(
    path.join(VAULT, '70-Wiki', 'images'),
    path.join(REPO, 'docs', 'wiki', 'images'),
    'docs/wiki/images/',
    check,
    true,
  );

const readmeImagesSync = (check) =>
  syncDir(
    path.join(VAULT, '60-README', 'images'),
    path.join(REPO, 'images'),
    'images/',
    check,
    false,
  );

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

const PRD_STATUS_LABEL = {
  proposed: 'Proposto',
  approved: 'Aprovado',
  'in-progress': 'Em desenvolvimento',
  completed: 'Concluído',
};
const PRD_FOLDERS = Object.keys(PRD_STATUS_LABEL);

function published() {
  const items = [];
  for (const note of walk(VAULT)) {
    const text = fs.readFileSync(note, 'utf8');
    const { fm, body } = parseFrontmatter(text);
    const rel = path.relative(VAULT, note).split(path.sep).join('/');
    if (fm.tipo === 'prd') {
      const status = fm.status;
      if (!PRD_FOLDERS.includes(status)) continue;
      items.push({
        note,
        rel,
        target: `docs/prd/${status}/${path.basename(note)}`,
        body,
        prd: true,
        status,
      });
    } else if (fm.publicar) {
      items.push({
        note,
        rel,
        target: fm.publicar,
        body,
        prdIndex: fm.tipo === 'prd-index',
      });
    }
  }
  return items;
}

/** Reinjeta o status no corpo do PRD a partir do frontmatter. */
function withStatus(body, label) {
  if (/^\|\s*Status\s*\|/m.test(body)) {
    return body.replace(/^\|\s*Status\s*\|.*$/m, `| Status | ${label} |`);
  }
  if (/^\|\s*Campo\s*\|\s*Valor\s*\|/m.test(body)) {
    return body.replace(/^(\|\s*-+.*)$/m, `$1\n| Status | ${label} |`);
  }
  if (/^##\s+Status\s*$/m.test(body)) {
    return body.replace(/^##\s+Status\s*\n+[^\n]*/m, `## Status\n\n${label}`);
  }
  return body.replace(/^(#\s+.*)$/m, `$1\n\n## Status\n\n${label}`);
}

const CONEXOES_RE =
  /\n*## Conexões\s*\n+<!-- brain:auto:start:conexoes -->[\s\S]*?<!-- brain:auto:end -->\s*/g;

/** Remove a seção `## Conexões` (navegação do vault) do PRD publicado. */
function stripConexoes(body) {
  return body.replace(CONEXOES_RE, '\n');
}

function render(item) {
  let body = item.body;
  if (item.prd) body = withStatus(stripConexoes(body), PRD_STATUS_LABEL[item.status]);
  else if (item.prdIndex) body = body.replaceAll('../../../docs/prd/', '');
  else if (item.target.startsWith(WIKI_PREFIX)) body = wikiLinks(body);
  else if (README_RE.test(item.target)) body = readmeLinks(body);
  return `${BANNER(item.rel)}\n${body}`.replace(/\s+$/, '') + '\n';
}

/** Remove PRDs gerados em pastas que não correspondem mais ao status. */
function prdCleanup(items, check) {
  const wanted = new Set(items.filter((i) => i.prd).map((i) => i.target));
  let changed = 0;
  let drifted = 0;
  for (const folder of PRD_FOLDERS) {
    const dir = path.join(REPO, 'docs', 'prd', folder);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const rel = `docs/prd/${folder}/${f}`;
      if (wanted.has(rel)) continue;
      if (check) {
        console.log(`[drift] ${rel} (PRD sem status correspondente)`);
        drifted++;
        continue;
      }
      fs.rmSync(path.join(dir, f));
      console.log(`[build] remove ${rel}`);
      changed++;
    }
  }
  return { changed, drifted };
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
  const img = imagesSync(check);
  changed += img.changed;
  drifted += img.drifted;
  const rimg = readmeImagesSync(check);
  changed += rimg.changed;
  drifted += rimg.drifted;
  const prd = prdCleanup(items, check);
  changed += prd.changed;
  drifted += prd.drifted;
  if (check) {
    if (drifted) {
      console.log(`\n${drifted} arquivo(s) com drift. Rode: npm run brain:build`);
      return 1;
    }
    console.log(
      `OK: ${items.length} arquivo(s) publicados + ${img.total + rimg.total} imagem(ns) em sincronia.`,
    );
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

module.exports = {
  published,
  render,
  parseFrontmatter,
  wikiLinks,
  readmeLinks,
  withStatus,
  stripConexoes,
  syncDir,
};
