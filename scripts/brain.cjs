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

/** Notas em `_templates/` (não recebem blocos gerados). */
const isTemplate = (file) => file.split(path.sep).includes('_templates');

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

function genReadmeVariants() {
  const dir = path.join(VAULT, '60-README');
  if (!fs.existsSync(dir)) return '_60-README ausente._';
  const main = 'README (extensão).md';
  const files = fs
    .readdirSync(dir)
    .filter((n) => /^README.*\.md$/.test(n))
    .sort((a, b) => (a === main ? -1 : b === main ? 1 : a.localeCompare(b)));
  return files
    .map((f) => {
      const fm = parseFm(fs.readFileSync(path.join(dir, f), 'utf8'));
      return `- [[${f.replace(/\.md$/, '')}]] — \`${fm.locale ?? '?'}\` → \`${fm.publicar ?? ''}\``;
    })
    .join('\n');
}

function genWikiIndex() {
  const dir = path.join(VAULT, '70-Wiki');
  if (!fs.existsSync(dir)) return '_70-Wiki ausente._';
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.md') && n !== '_Sidebar.md')
    .sort((a, b) => a.localeCompare(b))
    .map((n) => `- [[${n.replace(/\.md$/, '')}]]`)
    .join('\n');
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
  const dir = path.join(VAULT, '10-Projeto', 'Funcional');
  const readme = path.join(dir, 'README.md');
  if (!fs.existsSync(readme)) return '_README funcional ausente._';
  const rows = [];
  for (const line of fs.readFileSync(readme, 'utf8').split('\n')) {
    const m = line.match(FUNC_ROW_RE);
    if (!m) continue;
    const [, num, title, link, desc] = m;
    rows.push(`| ${num} | [${title}](${rel(path.join(dir, link), note)}) | ${desc} |`);
  }
  if (!rows.length) return '_Nenhum documento funcional encontrado._';
  return ['| # | Documento | Descrição |', '|---|---|---|', ...rows].join('\n');
}

function countDir(name) {
  const d = path.join(REPO, 'docs', 'prd', name);
  return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.md')).length : 0;
}

// ── PRDs (fonte: frontmatter das notas do vault) ────────────────────────

function parseFm(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (!m) return fm;
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, '');
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z_][\w-]*):\s?(.*)$/);
    if (!mm) continue;
    const raw = mm[2].trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      const inner = raw.slice(1, -1).trim();
      fm[mm[1]] = inner ? inner.split(',').map(unquote) : [];
    } else {
      fm[mm[1]] = unquote(raw);
    }
  }
  return fm;
}

/** Notas PRD do vault, ordenadas por número (cacheado por execução). */
let PRD_NOTES = null;
function prdNotes() {
  if (PRD_NOTES) return PRD_NOTES;
  const dir = path.join(VAULT, '20-PRDs');
  if (!fs.existsSync(dir)) return [];
  PRD_NOTES = fs
    .readdirSync(dir)
    .filter((f) => /^prd-\d+.*\.md$/.test(f))
    .map((file) => {
      const fm = parseFm(fs.readFileSync(path.join(dir, file), 'utf8'));
      return { file, ...fm };
    })
    .sort((a, b) => Number(a.id?.replace(/\D/g, '')) - Number(b.id?.replace(/\D/g, '')));
  return PRD_NOTES;
}

const PRD_STATUS = [
  { key: 'completed', icon: '🟢', label: 'Concluídos', grouped: false, col: 'Versão' },
  { key: 'in-progress', icon: '🟡', label: 'Em desenvolvimento', grouped: true, col: 'Versão alvo' },
  { key: 'approved', icon: '🔵', label: 'Aprovados', grouped: true, col: 'Versão alvo' },
  { key: 'proposed', icon: '⚪', label: 'Propostos', grouped: true, col: 'Versão alvo' },
];

const prdNum = (id) => String(id ?? '').replace(/\D/g, '');
const prdVersao = (p) => (p.versao && !/investiga/i.test(p.versao) ? p.versao : '—');
const prdData = (p) => p.data || '—';

function cmpVersao(a, b) {
  const pa = prdVersao(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = prdVersao(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

function prdRow(p) {
  return `| ${prdNum(p.id)} | [${p.titulo}](../../../docs/prd/${p.status}/${p.file}) | ${prdVersao(p)} | ${prdData(p)} |`;
}

function genPrdRoadmap(notes = prdNotes()) {
  const out = [];
  for (const st of PRD_STATUS) {
    const group = notes.filter((p) => p.status === st.key);
    if (!group.length) continue;
    out.push(`### ${st.icon} ${st.label}`, '');
    if (!st.grouped) {
      out.push(`| # | PRD | ${st.col} | Data |`, '|---|---|---|---|');
      for (const p of group.sort((a, b) => cmpVersao(a, b) || prdNum(a) - prdNum(b))) {
        out.push(prdRow(p));
      }
      out.push('');
      continue;
    }
    const groups = new Map();
    for (const p of group) {
      const g = p.versao_titulo || prdVersao(p);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(p);
    }
    for (const g of [...groups.keys()].sort()) {
      out.push(`#### ${g}`, '');
      out.push(`| # | PRD | ${st.col} | Data |`, '|---|---|---|---|');
      for (const p of groups.get(g).sort((a, b) => prdNum(a) - prdNum(b))) out.push(prdRow(p));
      out.push('');
    }
  }
  return out.join('\n').replace(/\s+$/, '');
}

function genPrdEstrutura(notes = prdNotes()) {
  const lines = [
    '```',
    'docs/prd/',
    '├── index.md          ← este arquivo (catálogo + roadmap)',
    '├── template.md       ← molde para novos PRDs',
  ];
  const folders = [
    ['completed', 'já implementados'],
    ['approved', 'aprovados, aguardando implementação'],
    ['in-progress', 'sendo implementados agora'],
    ['proposed', 'em avaliação'],
  ].filter(([f]) => notes.some((p) => p.status === f));
  folders.forEach(([folder, desc], fi) => {
    const last = fi === folders.length - 1;
    lines.push(`${last ? '└──' : '├──'} ${folder}/        ← ${desc}`);
    const files = notes
      .filter((p) => p.status === folder)
      .map((p) => p.file)
      .sort((a, b) => a.localeCompare(b));
    files.forEach((f, i) => {
      const lastFile = i === files.length - 1;
      lines.push(`${last ? '    ' : '│   '}${lastFile ? '└──' : '├──'} ${f}`);
    });
  });
  lines.push('```');
  return lines.join('\n');
}

function genPrdSummary(note) {
  const notes = prdNotes();
  const count = (k) => notes.filter((p) => p.status === k).length;
  const index = path.join(REPO, 'docs', 'prd', 'index.md');
  const linhas = [
    `- 📝 Propostos: **${count('proposed')}**`,
    `- 🔵 Aprovados: **${count('approved')}**`,
    `- 🟡 Em desenvolvimento: **${count('in-progress')}**`,
    `- 🟢 Concluídos: **${count('completed')}**`,
  ];
  if (fs.existsSync(index)) {
    linhas.push('', `Detalhe completo (fonte da verdade): [docs/prd/index.md](${rel(index, note)})`);
  }
  return linhas.join('\n');
}


function genStack() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const rows = [];
  const add = (k, v) => {
    if (v) rows.push(`- **${k}:** ${v}`);
  };
  add('Node (engines)', pkg.engines?.node);
  add('VSCode (engines)', pkg.engines?.vscode);
  const nvm = path.join(REPO, '.nvmrc');
  if (fs.existsSync(nvm)) add('.nvmrc', fs.readFileSync(nvm, 'utf8').trim());
  try {
    const ts = fs.readFileSync(path.join(REPO, 'tsconfig.json'), 'utf8');
    const target = ts.match(/"target"\s*:\s*"([^"]+)"/);
    const module = ts.match(/"module"\s*:\s*"([^"]+)"/);
    if (target || module) add('TypeScript', [target?.[1], module?.[1]].filter(Boolean).join(' / '));
  } catch {}
  try {
    const b = fs.readFileSync(path.join(REPO, 'biome.json'), 'utf8');
    const lw = b.match(/"lineWidth"\s*:\s*(\d+)/);
    const q = b.match(/"quoteStyle"\s*:\s*"([^"]+)"/);
    if (lw || q) add('Biome', [lw && `lineWidth ${lw[1]}`, q?.[1]].filter(Boolean).join(', '));
  } catch {}
  add('Empacotamento', pkg.main);
  return rows.join('\n') || '_indisponível_';
}

function genDeps() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const fmt = (obj, escopo) =>
    Object.entries(obj || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([n, v]) => `- \`${n}\` \`${v}\` — ${escopo}`);
  const runtime = fmt(pkg.dependencies, 'runtime');
  const dev = fmt(pkg.devDependencies, 'dev');
  return [
    `**Runtime (${runtime.length})**`,
    '',
    ...(runtime.length ? runtime : ['_nenhuma_']),
    '',
    `**Desenvolvimento (${dev.length})**`,
    '',
    ...(dev.length ? dev : ['_nenhuma_']),
  ].join('\n');
}

// ── conexões (grafo do Obsidian) ───────────────────────────────────────

let ID_MAP = null;
let BASE_ID = null;
/** Mapas `id` → basename e basename → `id` (para gerar wikilinks). */
function idMaps() {
  if (ID_MAP) return { ids: ID_MAP, bases: BASE_ID };
  ID_MAP = new Map();
  BASE_ID = new Map();
  for (const file of vaultNotes()) {
    if (isTemplate(file)) continue;
    const fm = parseFm(fs.readFileSync(file, 'utf8'));
    const base = path.basename(file, '.md');
    if (fm.id) {
      ID_MAP.set(fm.id, base);
      BASE_ID.set(base, fm.id);
    }
  }
  return { ids: ID_MAP, bases: BASE_ID };
}

let REVERSE = null;
/** Índice reverso: `id` referenciado → basenames das notas que o referenciam. */
function reverseIndex() {
  if (REVERSE) return REVERSE;
  const rev = new Map();
  for (const file of vaultNotes()) {
    if (isTemplate(file)) continue;
    const fm = parseFm(fs.readFileSync(file, 'utf8'));
    const base = path.basename(file, '.md');
    const refs = [
      ...(Array.isArray(fm.prds) ? fm.prds : []),
      ...(Array.isArray(fm.regras) ? fm.regras : []),
      ...(Array.isArray(fm.depende) ? fm.depende : []),
    ];
    for (const r of refs) {
      const id = String(r).trim();
      if (!rev.has(id)) rev.set(id, new Set());
      rev.get(id).add(base);
    }
  }
  REVERSE = rev;
  return rev;
}

let REQ = null;
/** Índice reverso: `PRD-NN/RFn` ou `PRD-NN/RNFn` → basenames que o implementam. */
function requisitosIndex() {
  if (REQ) return REQ;
  const idx = new Map();
  for (const file of vaultNotes()) {
    if (isTemplate(file)) continue;
    const fm = parseFm(fs.readFileSync(file, 'utf8'));
    const base = path.basename(file, '.md');
    for (const r of Array.isArray(fm.requisitos) ? fm.requisitos : []) {
      const key = String(r).trim();
      if (!idx.has(key)) idx.set(key, new Set());
      idx.get(key).add(base);
    }
  }
  REQ = idx;
  return idx;
}

function mocOf(notePath) {
  const dir = path.dirname(notePath);
  const moc = fs.readdirSync(dir).find((n) => /^MOC - .*\.md$/.test(n));
  return moc ? moc.replace(/\.md$/, '') : null;
}

function wl(target, label) {
  return label && label !== target ? `[[${target}|${label}]]` : `[[${target}]]`;
}

/** Bloco `## Conexões`: liga a nota à MOC, às referências e às notas que a citam. */
function genConexoes(notePath) {
  const fm = parseFm(fs.readFileSync(notePath, 'utf8'));
  const { ids, bases } = idMaps();
  const lines = [];
  const moc = mocOf(notePath);
  if (moc) lines.push(`- 🗺️ ${wl(moc)}`);
  const link = (ref, map) => {
    const id = String(ref).trim();
    const target = map.get(id);
    return target ? wl(target, id) : `\`${id}\``;
  };
  if (Array.isArray(fm.prds) && fm.prds.length) {
    lines.push(`- 📄 PRDs: ${fm.prds.map((p) => link(p, ids)).join(' · ')}`);
  }
  if (Array.isArray(fm.regras) && fm.regras.length) {
    lines.push(`- 📐 Regras: ${fm.regras.map((r) => link(r, ids)).join(' · ')}`);
  }
  if (Array.isArray(fm.depende) && fm.depende.length) {
    lines.push(`- 📦 Depende de: ${fm.depende.map((d) => link(d, ids)).join(' · ')}`);
  }
  // Requisitos (RF/RNF da PRD) que esta nota implementa.
  if (Array.isArray(fm.requisitos) && fm.requisitos.length) {
    const links = fm.requisitos
      .map((r) => {
        const [pid, rid] = String(r).trim().split('/');
        const target = ids.get(pid);
        return target ? `[[${target}|${pid} ${rid || ''}]]`.trim() : `\`${r}\``;
      })
      .join(' · ');
    lines.push(`- 🎯 Requisitos: ${links}`);
  }
  if (Array.isArray(fm.relacionado) && fm.relacionado.length) {
    lines.push(`- 🔗 ${fm.relacionado.map((r) => String(r).trim()).join(' · ')}`);
  }
  // PRDs: relações derivadas do corpo (menções, pipelines) e da versão alvo.
  if (fm.tipo === 'prd') {
    const body = fs
      .readFileSync(notePath, 'utf8')
      .replace(/^---[\s\S]*?\n---/, '')
      .replace(/<!-- brain:auto:start:conexoes -->[\s\S]*?<!-- brain:auto:end -->/, '');
    const mentioned = new Set();
    for (const m of body.matchAll(/\bPRD-(\d+)\b/g)) {
      const id = `PRD-${m[1]}`;
      if (id !== fm.id && ids.has(id)) mentioned.add(id);
    }
    if (mentioned.size) {
      const links = [...mentioned]
        .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')))
        .map((id) => wl(ids.get(id), id))
        .join(' · ');
      lines.push(`- 🔗 PRDs relacionados: ${links}`);
    }
    const pipes = new Set();
    for (const m of body.matchAll(/\.github\/workflows\/([a-z0-9_-]+)\.ya?ml/gi)) {
      const id = `PIPE-${m[1]}`;
      if (ids.has(id)) pipes.add(id);
    }
    if (pipes.size) {
      lines.push(`- ⚙️ Pipelines: ${[...pipes].sort().map((id) => wl(ids.get(id), id)).join(' · ')}`);
    }
    if (fm.versao_titulo) {
      const siblings = prdNotes().filter(
        (p) => p.id !== fm.id && p.versao_titulo === fm.versao_titulo && p.status !== 'completed',
      );
      if (siblings.length) {
        const links = siblings.map((p) => wl(p.file.replace(/\.md$/, ''), p.id)).join(' · ');
        lines.push(`- 🔗 Mesma versão (${fm.versao_titulo.split(' — ')[0]}): ${links}`);
      }
    }
    // Requisitos (RF/RNF) → notas que os implementam.
    const reqIdx = requisitosIndex();
    const reqItems = [];
    for (const m of body.matchAll(/^#{3,4}\s+(RF\d+)\s*[—–-]\s*(.+)$/gm)) {
      reqItems.push([m[1], m[2].trim()]);
    }
    for (const m of body.matchAll(/^[-*]\s+(RNF\d+)\s*[—–-]\s*(.+)$/gm)) {
      reqItems.push([m[1], m[2].trim()]);
    }
    for (const [rid, title] of reqItems) {
      const refs = reqIdx.get(`${fm.id}/${rid}`);
      if (!refs || !refs.size) continue;
      const links = [...refs]
        .sort()
        .map((b) => wl(b, bases.get(b) || b))
        .join(' · ');
      lines.push(`- 🎯 ${rid} — ${title.slice(0, 70)} → ${links}`);
    }
  }
  // Relação reversa explícita: notas que referenciam esta.
  if (fm.id) {
    const refs = reverseIndex().get(fm.id);
    if (refs && refs.size) {
      const links = [...refs]
        .sort()
        .map((b) => wl(b, bases.get(b) || b))
        .join(' · ');
      const label = fm.tipo === 'prd' ? '📐 Regras' : '↩️ Referenciada por';
      lines.push(`- ${label}: ${links}`);
    }
  }
  return lines.join('\n') || '- 🗺️ _sem conexões_';
}

/** Índice de uma MOC: notas da própria pasta como wikilinks (hub do grafo). */
function genMocIndex(notePath) {
  const dir = path.dirname(notePath);
  const self = path.basename(notePath, '.md');
  const { bases } = idMaps();
  const files = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith('.md') && n !== `${self}.md` && !/^MOC - /.test(n) && n !== 'index.md')
    .sort((a, b) => a.localeCompare(b));
  return (
    files
      .map((n) => {
        const b = n.replace(/\.md$/, '');
        const id = bases.get(b);
        return `- [[${b}]]${id ? ` — \`${id}\`` : ''}`;
      })
      .join('\n') || '_vazio_'
  );
}

const GENERATORS = {
  'root-docs': genRootDocs,
  'readme-variants': genReadmeVariants,
  'wiki-index': genWikiIndex,
  'linkedin-index': genLinkedinIndex,
  'funcional-index': genFuncionalIndex,
  'prd-summary': genPrdSummary,
  'prd-roadmap': () => genPrdRoadmap(),
  'prd-estrutura': () => genPrdEstrutura(),
  conexoes: genConexoes,
  'moc-index': genMocIndex,
  stack: genStack,
  deps: genDeps,
};

// ── notas geradas (PIPE-*, LOC-*) ──────────────────────────────────────

const LANG_NAMES = {
  en: 'English',
  'en-gb': 'English (UK)',
  bg: 'Български',
  cs: 'Čeština',
  de: 'Deutsch',
  el: 'Ελληνικά',
  es: 'Español',
  fr: 'Français',
  hu: 'Magyar',
  id: 'Bahasa Indonesia',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  pl: 'Polski',
  'pt-br': 'Português (Brasil)',
  ro: 'Română',
  ru: 'Русский',
  sr: 'Српски',
  th: 'ไทย',
  tr: 'Türkçe',
  uk: 'Українська',
  vi: 'Tiếng Việt',
  'zh-cn': '中文(简体)',
  'zh-tw': '中文(繁體)',
};

/** Linhas de um bloco de primeiro nível YAML (`key:` até o próximo `^\S`). */
function yamlBlock(text, key) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inBlock = false;
  for (const line of lines) {
    if (new RegExp(`^${key}:`).test(line)) {
      const inline = line.slice(key.length + 1).trim();
      if (inline) out.push(`__inline__:${inline}`);
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (/^\S/.test(line)) break;
    out.push(line);
  }
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  return out;
}

function pipelineNotes() {
  const dir = path.join(REPO, '.github', 'workflows');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => /\.ya?ml$/.test(n))
    .sort()
    .map((f) => {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const name = (text.match(/^name:\s*(.+)$/m) || [])[1]?.trim() || f;
      const slug = f.replace(/\.ya?ml$/, '');
      const onBlock = yamlBlock(text, 'on');
      const triggers = [];
      for (const line of onBlock) {
        const inline = line.match(/^__inline__:(.+)$/);
        if (inline) triggers.push(inline[1]);
        else {
          const m = line.match(/^  ([a-z_]+):/);
          if (m) triggers.push(m[1]);
        }
      }
      const jobs = yamlBlock(text, 'jobs')
        .map((line) => line.match(/^  ([a-z0-9_-]+):/))
        .filter(Boolean)
        .map((m) => m[1]);
      const steps = [...text.matchAll(/^\s*- (run|uses):\s*(.+)$/gm)].map(
        (m) => `- \`${m[1]}: ${m[2].trim()}\``,
      );
      const fm = [
        '---',
        `id: PIPE-${slug}`,
        `aliases: [PIPE-${slug}]`,
        'tipo: pipeline',
        `titulo: ${JSON.stringify(name)}`,
        `arquivo: ".github/workflows/${f}"`,
        `gatilhos: [${triggers.join(', ')}]`,
        `jobs: [${jobs.join(', ')}]`,
        'gerado: true',
        `tags: [pipeline, ci]`,
        '---',
      ];
      const body = [
        `# PIPE-${slug} — ${name}`,
        '',
        `Workflow [\`${f}\`](../../../.github/workflows/${f}) — **gerado** por \`npm run brain:sync\`.`,
        '',
        '## Gatilhos',
        '',
        ...(triggers.length ? triggers.map((t) => `- \`${t}\``) : ['_nenhum_']),
        '',
        '## Jobs',
        '',
        ...(jobs.length ? jobs.map((j) => `- \`${j}\``) : ['_nenhum_']),
        '',
        '## Passos',
        '',
        ...(steps.length ? steps : ['_nenhum_']),
        '',
        '## Conexões',
        '',
        '- 🗺️ [[MOC - Stack]]',
      ].join('\n');
      return { dir: '11-Stack', file: `PIPE-${slug} - ${name}.md`, content: `${fm.join('\n')}\n\n${body}\n` };
    });
}

/** code → nome da nota README no vault. */
function readmeNoteByLocale() {
  const dir = path.join(VAULT, '60-README');
  const map = {};
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir).filter((n) => /^README.*\.md$/.test(n))) {
    const fm = parseFm(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (fm.locale) map[fm.locale.toLowerCase()] = f.replace(/\.md$/, '');
  }
  return map;
}

function localeNotes() {
  const files = fs
    .readdirSync(REPO)
    .filter((n) => /^package\.nls(\..+)?\.json$/.test(n))
    .sort();
  const readmeNote = readmeNoteByLocale();
  return files.map((f) => {
    const code = f === 'package.nls.json' ? 'en' : f.slice('package.nls.'.length, -'.json'.length);
    const strings = Object.keys(JSON.parse(fs.readFileSync(path.join(REPO, f), 'utf8'))).length;
    const lang = LANG_NAMES[code] || code;
    const fm = [
      '---',
      `id: LOC-${code}`,
      `aliases: [LOC-${code}]`,
      'tipo: locale',
      `titulo: ${JSON.stringify(lang)}`,
      `codigo: ${code}`,
      `nls: ${f}`,
      `strings: ${strings}`,
      'gerado: true',
      `tags: [i18n, locale]`,
      '---',
    ];
    const lines = [
      `# LOC-${code} — ${lang}`,
      '',
      `Locale \`${code}\` da extensão. Strings de UI em [\`${f}\`](../../../${f}) (${strings} chaves).`,
    ];
    const note = readmeNote[code];
    if (note) lines.push('', `README: [[${note}]]`);
    lines.push('', '## Conexões', '', '- 🗺️ [[MOC - I18n]]');
    return { dir: '12-I18n', file: `LOC-${code} - ${lang}.md`, content: `${fm.join('\n')}\n\n${lines.join('\n')}\n` };
  });
}

/** Escreve/atualiza e remove notas geradas (frontmatter `gerado: true`). */
function generateNotes() {
  const specs = [...pipelineNotes(), ...localeNotes()];
  let changed = 0;
  const byDir = new Map();
  for (const s of specs) {
    if (!byDir.has(s.dir)) byDir.set(s.dir, new Set());
    byDir.get(s.dir).add(s.file);
    const p = path.join(VAULT, s.dir, s.file);
    if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === s.content) continue;
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, s.content);
    console.log(`[sync] ${s.dir}/${s.file} (gerado)`);
    changed++;
  }
  for (const [dir, files] of byDir) {
    const full = path.join(VAULT, dir);
    for (const n of fs.readdirSync(full)) {
      if (!n.endsWith('.md') || files.has(n)) continue;
      const text = fs.readFileSync(path.join(full, n), 'utf8');
      if (!/^gerado:\s*true\s*$/m.test(text)) continue;
      fs.rmSync(path.join(full, n));
      console.log(`[sync] remove ${dir}/${n} (gerado obsoleto)`);
      changed++;
    }
  }
  return changed;
}


// ── commands ───────────────────────────────────────────────────────────

function sync() {
  let changed = 0;
  for (const file of vaultNotes()) {
    if (isTemplate(file)) continue;
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
  changed += generateNotes();
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

module.exports = {
  sync,
  check,
  parseFm,
  yamlBlock,
  prdNotes,
  genPrdRoadmap,
  genPrdEstrutura,
  genConexoes,
  genMocIndex,
  pipelineNotes,
  localeNotes,
};

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
