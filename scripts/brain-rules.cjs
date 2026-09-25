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
  codigo: { id: /^COD-[\w.-]+$/, required: ['id', 'titulo', 'arquivo'] },
  teste: { id: /^TST-[\w.-]+$/, required: ['id', 'titulo', 'arquivo'] },
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
 * Valida `requisitos:` (PRD-NN/RFn ou PRD-NN/RNFn): a PRD existe no vault e o
 * RF/RNF consta no corpo dela.
 */
function checkRequisitos(notes) {
  const problems = [];
  const prdBodies = new Map();
  for (const note of notes) {
    const fm = parseFrontmatter(note.content);
    if (fm?.tipo === 'prd' && fm.id) prdBodies.set(fm.id, note.content);
  }
  for (const note of notes) {
    const fm = parseFrontmatter(note.content);
    for (const r of Array.isArray(fm?.requisitos) ? fm.requisitos : []) {
      const [pid, rid] = String(r).split('/');
      const body = prdBodies.get(pid);
      if (!body) {
        problems.push(`${note.name}: requisito aponta PRD inexistente: ${r}`);
        continue;
      }
      if (rid && !new RegExp(`\\b${rid}\\b`).test(body)) {
        problems.push(`${note.name}: requisito inexistente no PRD: ${r}`);
      }
    }
  }
  return problems;
}

/**
 * Referências de grafo (`relacionado`/`relacionados`/`secaoRelacionada` e
 * `decisoes`): o alvo pode ser wikilink, nome exato da nota, id do vault
 * (`fm.id`) ou id de ADR (campo `adr`). `catalog` ausente → validação pulada.
 */
function relValue(raw) {
  const s = String(raw).trim();
  const wl = s.match(/^\[\[([^\]|#]+)/);
  return (wl ? wl[1] : s).replace(/\.md$/, '').trim();
}

function relTargets(fm) {
  const relatedKeys = ['relacionado', 'relacionados', 'secaoRelacionada'];
  const out = [];
  for (const key of relatedKeys) {
    for (const r of Array.isArray(fm?.[key]) ? fm[key] : []) {
      out.push({ key, value: r, label: 'relacionado' });
    }
  }
  for (const r of Array.isArray(fm?.decisoes) ? fm.decisoes : []) {
    out.push({ key: 'decisoes', value: r, label: 'decisao referenciada' });
  }
  for (const r of Array.isArray(fm?.erros) ? fm.erros : []) {
    out.push({ key: 'erros', value: r, label: 'erro referenciado' });
  }
  for (const r of Array.isArray(fm?.origem) ? fm.origem : []) {
    out.push({ key: 'origem', value: r, label: 'origem' });
  }
  return out;
}

function checkRelacionado(fm, catalog) {
  if (!catalog) return [];
  const problems = [];
  for (const { value, label } of relTargets(fm)) {
    const v = relValue(value);
    const ok =
      catalog.noteBases?.has(v) || catalog.noteIds?.has(v) || catalog.adrIds?.has(v);
    if (!ok) problems.push(`${label} inexistente: ${value}`);
  }
  return problems;
}

/**
 * Valida referências de TODAS as notas do vault: `implementacao`/`testes`
 * (arquivos existem), `regras` (apontam para BR-* existentes) e as arestas de
 * grafo (`relacionado*`/`decisoes`) contra o catálogo de notas/ids/ADRs.
 */
function checkReferences(notes, exists, brIds, checkLines, relCatalog) {
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
    for (const p of checkRelacionado(fm, relCatalog)) problems.push(`${note.name}: ${p}`);
  }
  return problems;
}

/** Catálogo do vault para validar arestas de grafo (ids, basenames e ADRs). */
function buildRelCatalog(notes) {
  const noteBases = new Set();
  const noteIds = new Set();
  const adrIds = new Set();
  for (const note of notes) {
    noteBases.add(path.basename(note.name, '.md'));
    const fm = parseFrontmatter(note.content);
    if (fm?.id) noteIds.add(String(fm.id));
    if (fm?.adr) adrIds.add(String(fm.adr));
  }
  return { noteBases, noteIds, adrIds };
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
    const relCatalog = overrides.relCatalog ?? buildRelCatalog(notes);
    problems.push(...checkLayers(notes));
    problems.push(...checkReferences(notes, exists, brIds, checkLines, relCatalog));
    problems.push(...checkRequisitos(notes));
  }

  return problems;
}

module.exports = {
  checkRules,
  checkReferences,
  checkRelacionado,
  checkLayers,
  checkRequisitos,
  parseFrontmatter,
  listRuleFiles,
  listAllNotes,
  realPrdIds,
  buildRelCatalog,
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
