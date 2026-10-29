#!/usr/bin/env node
/**
 * Gate de features/documentação da versão (PRD-98 RF5).
 *
 * Para cada PRD concluída na versão:
 *  - exige uma entrada no registro `docs/brain/10-Projeto/Registro de features.md`;
 *  - exige o ID da PRD na seção da versão do CHANGELOG;
 *  - para features de usuário (`interno: false`), exige bullet no README,
 *    âncora nas 23 variantes, menção na wiki e (se `docs/linkedin` existir)
 *    posts pt/en + cards.
 *
 * Uso:
 *   node scripts/docs-features-check.cjs [versão]
 *
 * Exportado para teste unitário (docsFeaturesCheck.test.ts). PURO em relação a
 * vscode; lê arquivos do repositório.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const REGISTRY_REL = path.join('docs', 'brain', '10-Projeto', 'Registro de features.md');

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function parseFrontmatter(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s?(.*)$/);
    if (!kv) continue;
    fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

/** Lê o array JSON do registro de features (bloco ```json). */
function loadRegistry(root = DEFAULT_ROOT) {
  const text = read(path.join(root, REGISTRY_REL));
  const m = text.match(/```json\n([\s\S]*?)\n```/);
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[1]);
    return Array.isArray(parsed) ? parsed : (parsed.features ?? []);
  } catch {
    return [];
  }
}

/** PRDs concluídas na versão, lidas das notas canônicas do vault. */
function completedPrds(root, version) {
  const dir = path.join(root, 'docs', 'brain', '20-PRDs');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((n) => /^prd-\d+.*\.md$/.test(n))) {
    const fm = parseFrontmatter(read(path.join(dir, f)));
    if (fm.status !== 'completed' || fm.versao !== version || !fm.id) continue;
    out.push({ id: fm.id, title: fm.titulo ?? fm.id, file: f });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function changelogSection(root, version) {
  const lines = read(path.join(root, 'CHANGELOG.md')).split(/\r?\n/);
  const start = lines.findIndex((l) =>
    new RegExp(`^##\\s+${version.replace(/\./g, '\\.')}\\b`).test(l),
  );
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function readmeVariants(root) {
  return fs
    .readdirSync(root)
    .filter((n) => /^README\..+\.md$/.test(n))
    .map((n) => ({ name: n, text: read(path.join(root, n)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function wikiPath(root, wiki) {
  const rel = String(wiki)
    .replace(/^wiki\//, '')
    .replace(/\.md$/, '');
  return path.join(root, 'docs', 'wiki', `${rel}.md`);
}

/**
 * Valida a versão. Retorna array de problemas (vazio = OK).
 * `options.root` permite fixtures; `options.registry` injeta o registro.
 */
function checkFeatures(options = {}) {
  const root = options.root ?? DEFAULT_ROOT;
  const version =
    options.version ?? JSON.parse(read(path.join(root, 'package.json')) || '{}').version;
  const problems = [];
  if (!version) return ['versão ausente (package.json)'];
  const registry = options.registry ?? loadRegistry(root);
  if (!Array.isArray(registry) || registry.length === 0) {
    problems.push(
      'registro de features vazio/ausente (docs/brain/10-Projeto/Registro de features.md)',
    );
  }
  const prds = completedPrds(root, version);
  const changelog = changelogSection(root, version);
  if (prds.length && !changelog) problems.push(`CHANGELOG.md sem seção ${version}`);

  const readme = read(path.join(root, 'README.md'));
  const variants = readmeVariants(root);
  const hasLinkedin = fs.existsSync(path.join(root, 'docs', 'linkedin'));

  for (const prd of prds) {
    const entry = registry.find((f) => f && f.prd === prd.id);
    if (!entry) {
      problems.push(`${prd.id}: sem entrada no registro de features`);
      continue;
    }
    if (!new RegExp(`\\bPRD-0*${Number(String(prd.id).replace(/\D/g, ''))}\\b`).test(changelog)) {
      problems.push(`${prd.id}: CHANGELOG ${version} não menciona a PRD`);
    }
    if (entry.interno === true) continue;

    if (!entry.readme_bullet) {
      problems.push(`${prd.id}: readme_bullet ausente`);
    } else if (!readme.includes(entry.readme_bullet)) {
      problems.push(`${prd.id}: readme_bullet não encontrado no README.md`);
    }
    if (!entry.readme_anchor) {
      problems.push(`${prd.id}: readme_anchor ausente`);
    } else {
      for (const v of variants) {
        if (!v.text.includes(entry.readme_anchor)) {
          problems.push(`${prd.id}: âncora "${entry.readme_anchor}" ausente em ${v.name}`);
        }
      }
    }
    if (!entry.wiki) {
      problems.push(`${prd.id}: wiki ausente`);
    } else {
      const text = read(wikiPath(root, entry.wiki));
      if (!text) problems.push(`${prd.id}: página wiki "${entry.wiki}" não existe`);
      else if (!text.includes(prd.id) && !text.includes(entry.id)) {
        problems.push(`${prd.id}: wiki "${entry.wiki}" não menciona a feature/PRD`);
      }
    }
    if (Array.isArray(entry.linkedin) && entry.linkedin.length > 0) {
      for (const rel of entry.linkedin) {
        if (!fs.existsSync(path.join(root, rel))) {
          problems.push(`${prd.id}: post LinkedIn ausente: ${rel}`);
        }
      }
    } else if (hasLinkedin) {
      problems.push(`${prd.id}: posts LinkedIn (pt/en) ausentes no registro`);
    }
    if (Array.isArray(entry.card) && entry.card.length > 0) {
      for (const rel of entry.card) {
        if (!fs.existsSync(path.join(root, rel))) {
          problems.push(`${prd.id}: card ausente: ${rel}`);
        }
      }
    } else if (hasLinkedin) {
      problems.push(`${prd.id}: cards (pt/en) ausentes no registro`);
    }
  }

  return problems;
}

function main(argv = process.argv.slice(2), root = DEFAULT_ROOT) {
  const rootIdx = argv.indexOf('--root');
  const effectiveRoot = rootIdx >= 0 ? path.resolve(argv[rootIdx + 1]) : root;
  const version = argv.find((a, i) => !a.startsWith('-') && i !== rootIdx + 1);
  const problems = checkFeatures({ root: effectiveRoot, ...(version ? { version } : {}) });
  if (problems.length) {
    console.log('FEATURES/DOCS — problemas:');
    for (const p of problems) console.log(`  ✗ ${p}`);
    console.log(`\n${problems.length} problema(s).`);
    return 1;
  }
  console.log(`OK: features/documentação da versão ${version ?? 'atual'} consistentes.`);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  main,
  checkFeatures,
  loadRegistry,
  completedPrds,
  changelogSection,
  readmeVariants,
  wikiPath,
  parseFrontmatter,
};
