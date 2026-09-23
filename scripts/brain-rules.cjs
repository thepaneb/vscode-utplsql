#!/usr/bin/env node
/**
 * Valida as regras de negócio atômicas do vault (`docs/brain/15-Regras/BR-*.md`).
 *
 *   npm run brain:rules
 *
 * Verifica, para cada regra:
 *   - frontmatter presente e campos obrigatórios (id, titulo, dominio, status,
 *     severidade, fonte)
 *   - formato do id (BR-<DOMINIO>-NNN) e unicidade
 *   - enums de status/severidade/fonte
 *   - `implementacao` não vazia e cada arquivo referenciado existe (linha opcional)
 *   - `testes` referenciam arquivos existentes
 *   - `prds` existem em docs/prd/
 *
 * PURO em relação a `vscode`; exportado para teste unitário.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VAULT = path.join(ROOT, 'docs', 'brain');
const RULES_DIR = path.join(ROOT, 'docs', 'brain', '15-Regras');
const PRD_DIR = path.join(ROOT, 'docs', 'prd');

const STATUS = new Set(['ativo', 'proposta', 'obsoleto', 'em_disputa']);
const SEVERIDADE = new Set(['critica', 'alta', 'media', 'baixa']);
const FONTE = new Set(['codigo', 'prd', 'stakeholder', 'convencao']);
const REQUIRED = ['id', 'titulo', 'dominio', 'status', 'severidade', 'fonte'];

/** Schema das camadas de conhecimento (tipo do frontmatter → id + campos). */
const LAYERS = {
  seguranca: { id: /^SEC-\d{3}$/, required: ['id', 'titulo', 'dominio', 'status', 'severidade'] },
  erro: { id: /^ERR-\d{3}$/, required: ['id', 'titulo', 'dominio', 'codigo', 'status', 'severidade'] },
  padrao: { id: /^PAT-\d{3}$/, required: ['id', 'titulo', 'dominio', 'status'] },
  nfr: { id: /^NFR-\d{3}$/, required: ['id', 'titulo', 'dominio', 'status'] },
  entidade: { id: /^ENT-\d{3}$/, required: ['id', 'titulo', 'dominio', 'status'] },
  glossario: { id: /^GLOSS-\d{3}$/, required: ['id', 'titulo', 'dominio', 'status'] },
  'componente-terceiro': { id: /^TPL-[\w-]+$/, required: ['id', 'titulo', 'status'] },
  locale: { id: /^LOC-[\w-]+$/, required: ['id', 'titulo', 'codigo'] },
  pipeline: { id: /^PIPE-[\w-]+$/, required: ['id', 'titulo', 'arquivo'] },
  dependencia: { id: /^DEP-[\w-]+$/, required: ['id', 'titulo'] },
};

const unquote = (s) => {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  return t;
};

function parseList(value) {
  const t = value.trim();
  if (!t.startsWith('[')) return t ? [unquote(t)] : [];
  const inner = t.slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((x) => unquote(x))
    .filter((x) => x !== '');
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z_][\w-]*):\s?(.*)$/);
    if (!mm) continue;
    const key = mm[1];
    const raw = mm[2].trim();
    fm[key] = raw.startsWith('[') ? parseList(raw) : unquote(raw);
  }
  return fm;
}

function listRuleFiles() {
  if (!fs.existsSync(RULES_DIR)) return [];
  return fs
    .readdirSync(RULES_DIR)
    .filter((n) => /^BR-.*\.md$/.test(n))
    .sort()
    .map((n) => ({ name: n, content: fs.readFileSync(path.join(RULES_DIR, n), 'utf8') }));
}

/** Todas as notas do vault (exceto .obsidian, _templates e .trash). */
function listAllNotes() {
  if (!fs.existsSync(VAULT)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.obsidian' || entry.name === '_templates' || entry.name === '.trash') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) out.push({ name: path.relative(VAULT, full), content: fs.readFileSync(full, 'utf8') });
    }
  };
  walk(VAULT);
  return out;
}

/**
 * Valida o schema das camadas de conhecimento (SEC/ERR/PAT/NFR/ENT/GLOSS/TPL/
 * LOC/PIPE/DEP) em todas as notas do vault: campos obrigatórios, formato do id e
 * unicidade global.
 */
function checkLayers(notes) {
  const problems = [];
  const seen = new Set();
  for (const note of notes) {
    const fm = parseFrontmatter(note.content);
    if (!fm || !fm.tipo) continue;
    const layer = LAYERS[fm.tipo];
    if (!layer) continue;
    for (const key of layer.required) {
      if (!fm[key]) problems.push(`${note.name}: campo obrigatório ausente: ${key}`);
    }
    const id = fm.id || '';
    if (id && !layer.id.test(id)) problems.push(`${note.name}: id inválido: ${id}`);
    if (id && seen.has(id)) problems.push(`${note.name}: id duplicado: ${id}`);
    if (id) seen.add(id);
    if (fm.status && !STATUS.has(fm.status)) problems.push(`${note.name}: status inválido: ${fm.status}`);
  }
  return problems;
}

/**
 * Valida referências de TODAS as notas do vault: `implementacao`/`testes`
 * (arquivos existem) e `regras` (apontam para BR-* existentes).
 */
function checkReferences(notes, exists, brIds, checkLines) {
  const problems = [];
  for (const note of notes) {
    const fm = parseFrontmatter(note.content);
    if (!fm) continue;
    const isRule = fm.tipo === 'regra';
    if (!isRule) {
      for (const ref of Array.isArray(fm.implementacao) ? fm.implementacao : []) {
        if (!refExists(ref, exists, checkLines)) problems.push(`${note.name}: implementacao inexistente: ${ref}`);
      }
      for (const ref of Array.isArray(fm.testes) ? fm.testes : []) {
        if (!refExists(ref, exists, checkLines)) problems.push(`${note.name}: teste inexistente: ${ref}`);
      }
    }
    for (const ref of Array.isArray(fm.regras) ? fm.regras : []) {
      if (brIds && !brIds.has(String(ref).trim())) problems.push(`${note.name}: regra referenciada inexistente: ${ref}`);
    }
  }
  return problems;
}

function realPrdIds() {
  const ids = new Set();
  for (const folder of ['proposed', 'approved', 'in-progress', 'completed']) {
    const dir = path.join(PRD_DIR, folder);
    if (!fs.existsSync(dir)) continue;
    for (const n of fs.readdirSync(dir)) {
      const m = n.match(/^prd-(\d+)/);
      if (m) ids.add(String(Number(m[1])));
    }
  }
  return ids;
}

const stripLine = (ref) => String(ref).replace(/:\d+$/, '');

/**
 * O arquivo referenciado existe? Com `checkLines`, se a referência tem `:linha`,
 * confere que o arquivo tem ao menos essa linha.
 */
function refExists(ref, exists, checkLines) {
  if (!exists(stripLine(ref))) return false;
  if (!checkLines) return true;
  const m = String(ref).match(/^(.*):(\d+)$/);
  if (!m) return true;
  try {
    const lines = fs.readFileSync(path.join(ROOT, m[1]), 'utf8').split(/\r?\n/).length;
    return Number(m[2]) <= lines;
  } catch {
    return false;
  }
}

/**
 * Valida as regras e retorna a lista de problemas (vazia = OK).
 * `overrides` permite injetar conteúdo/ambiente nos testes.
 */
function checkRules(overrides = {}) {
  const files = overrides.files ?? listRuleFiles();
  const exists = overrides.exists ?? ((rel) => fs.existsSync(path.join(ROOT, rel)));
  const prdIds = overrides.prdIds ?? realPrdIds();
  const checkLines = overrides.checkLines ?? false;
  const problems = [];
  const seen = new Set();

  for (const file of files) {
    const fm = parseFrontmatter(file.content);
    const at = (msg) => problems.push(`${file.name}: ${msg}`);
    if (!fm) {
      at('frontmatter ausente');
      continue;
    }
    for (const key of REQUIRED) {
      if (!fm[key]) at(`campo obrigatório ausente: ${key}`);
    }
    const id = fm.id || '';
    if (id && !/^BR-[A-Z0-9]+-\d{3}$/.test(id)) at(`id inválido: ${id}`);
    if (id && seen.has(id)) at(`id duplicado: ${id}`);
    if (id) seen.add(id);
    if (fm.status && !STATUS.has(fm.status)) at(`status inválido: ${fm.status}`);
    if (fm.severidade && !SEVERIDADE.has(fm.severidade)) at(`severidade inválida: ${fm.severidade}`);
    if (fm.fonte && !FONTE.has(fm.fonte)) at(`fonte inválida: ${fm.fonte}`);

    const impl = Array.isArray(fm.implementacao) ? fm.implementacao : [];
    if (fm.status === 'ativo' && impl.length === 0) at('regra ativa sem implementacao');
    for (const ref of impl) {
      if (!refExists(ref, exists, checkLines)) at(`implementacao inexistente: ${ref}`);
    }
    for (const ref of Array.isArray(fm.testes) ? fm.testes : []) {
      if (!refExists(ref, exists, checkLines)) at(`teste inexistente: ${ref}`);
    }
    for (const pr of Array.isArray(fm.prds) ? fm.prds : []) {
      const num = String(pr).replace(/\D/g, '');
      if (num && !prdIds.has(String(Number(num)))) at(`PRD inexistente: ${pr}`);
    }
  }

  // Passada global (vault inteiro): referências e schema das camadas.
  if (!overrides.files) {
    const brIds = new Set(files.map((f) => parseFrontmatter(f.content)?.id).filter(Boolean));
    const notes = listAllNotes();
    problems.push(...checkLayers(notes));
    problems.push(...checkReferences(notes, exists, brIds, checkLines));
  }

  return problems;
}

module.exports = {
  checkRules,
  checkReferences,
  checkLayers,
  parseFrontmatter,
  listRuleFiles,
  listAllNotes,
  realPrdIds,
  LAYERS,
};

if (require.main === module) {
  if (!fs.existsSync(RULES_DIR)) {
    console.log('Sem regras (docs/brain ausente) — nada a validar.');
    process.exit(0);
  }
  const checkLines = process.argv.includes('--check-lines');
  const problems = checkRules({ checkLines });
  if (problems.length) {
    for (const p of problems) console.log(`[erro] ${p}`);
    console.log(`\n${problems.length} problema(s) encontrado(s).`);
    process.exit(1);
  }
  console.log(`OK: ${listRuleFiles().length} regras válidas${checkLines ? ' (linhas conferidas)' : ''}.`);
}
