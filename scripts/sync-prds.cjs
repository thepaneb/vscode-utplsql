#!/usr/bin/env node
/**
 * Sincroniza PRDs (docs/prd/) como issues no GitHub.
 *
 * Uso:
 *   GITHUB_TOKEN=ghp_xxx node scripts/sync-prds.cjs
 *   GITHUB_TOKEN=ghp_xxx GITHUB_REPOSITORY=user/repo node scripts/sync-prds.cjs
 *
 * Variáveis de ambiente:
 *   GITHUB_TOKEN      Obrigatório. Token com escopo "issues:write".
 *   GITHUB_REPOSITORY Opcional. Deduzido do git remote se omitido.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PRD_DIR = path.resolve(__dirname, '..', 'docs', 'prd');
const MAPPING_FILE = path.join(PRD_DIR, '.prd-issues.json');

const DIR_STATUS = {
  completed: 'completed',
  approved: 'approved',
  proposed: 'proposed',
};

const STATUS_LABEL = {
  completed: 'prd:completed',
  approved: 'prd:approved',
  proposed: 'prd:proposed',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getRepo() {
  const env = process.env.GITHUB_REPOSITORY;
  if (env) return env;
  try {
    const remotes = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const m = remotes.match(/github\.com[:/](.+?)\.git$/);
    if (m) return m[1];
  } catch { /* fallback */ }
  console.error('GITHUB_REPOSITORY não definido e não foi possível deduzir do git remote.');
  process.exit(1);
}

function prdNumber(name) {
  const m = name.match(/prd-(\d+)-/);
  return m ? m[1] : null;
}

function github(path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('GITHUB_TOKEN não definido.');
      process.exit(1);
    }
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${getRepo()}${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'sync-prds-script',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          console.error(`GitHub API error ${res.statusCode}: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        } else {
          resolve(data ? JSON.parse(data) : null);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function ensureLabels() {
  return Promise.all(
    Object.values(STATUS_LABEL).map((name) =>
      github('/labels', 'POST', { name, color: 'bfd4f2', description: 'Product Requirement Document' })
        .catch(() => {/* label already exists */})
    )
  );
}

// ---------------------------------------------------------------------------
// Scan local PRDs
// ---------------------------------------------------------------------------
function scanPRDs() {
  const prds = [];
  for (const [dir, status] of Object.entries(DIR_STATUS)) {
    const dirPath = path.join(PRD_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.md') || file === 'template.md') continue;
      const filepath = path.join(dirPath, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const title = content.split('\n')[0].replace(/^#\s+PRD\s*[—–-]\s*/, '').trim();
      const number = prdNumber(file);
      prds.push({ number, title, status, file, content });
    }
  }
  return prds.sort((a, b) => Number(a.number) - Number(b.number));
}

// ---------------------------------------------------------------------------
// Mapping (cache local)
// ---------------------------------------------------------------------------
function loadMapping() {
  try { return JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8')); } catch { return {}; }
}

function saveMapping(map) {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(map, null, 2) + '\n');
  console.log(`  → Mapeamento salvo em ${MAPPING_FILE}`);
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------
async function sync() {
  console.log('🔍 Escaneando PRDs locais...');
  const prds = scanPRDs();
  if (!prds.length) { console.log('  Nenhum PRD encontrado.'); return; }
  for (const p of prds) console.log(`  PRD-${p.number}: [${p.status}] ${p.title}`);

  console.log('\n🏷️  Garantindo labels...');
  await ensureLabels();
  console.log('  OK');

  console.log('\n📥 Carregando issues existentes...');
  const existing = await github('/issues?state=all&per_page=100');
  const existingByPRD = {};
  for (const issue of existing) {
    const m = issue.title.match(/^PRD-(\d+):/);
    if (m) existingByPRD[m[1]] = issue;
  }

  const mapping = loadMapping();

  for (const prd of prds) {
    const issue = existingByPRD[prd.number];
    const label = STATUS_LABEL[prd.status];

    if (issue) {
      const hasLabel = issue.labels.some((l) => l.name === label);
      if (!hasLabel) {
        console.log(`  📝 PRD-${prd.number}: atualizando label → ${label}`);
        await github(`/issues/${issue.number}/labels`, 'PUT', { labels: [label] });
      } else {
        console.log(`  ✅ PRD-${prd.number}: já sincronizado (issue #${issue.number})`);
      }
      mapping[prd.number] = issue.number;
    } else {
      // Extrair primeira seção como body resumido (limite de caracteres)
      const body = `_Sincronizado automaticamente de \`docs/prd/${prd.file}\`_\n\n`
        + prd.content.split('## ').slice(0, 2).join('\n## ').slice(0, 8000);
      console.log(`  🆕 PRD-${prd.number}: criando issue...`);
      const created = await github('/issues', 'POST', {
        title: `PRD-${prd.number}: ${prd.title}`,
        body,
        labels: [label, 'prd'],
      });
      console.log(`    → #${created.number} ${created.html_url}`);
      mapping[prd.number] = created.number;
    }
  }

  // -----------------------------------------------------------------------
  // Fechar issues de PRDs concluídos
  // -----------------------------------------------------------------------
  const completedPRDs = prds.filter(p => p.status === 'completed');
  if (completedPRDs.length) {
    console.log('\n🔒 Verificando issues de PRDs concluídos...');
    for (const prd of completedPRDs) {
      const issueNumber = mapping[prd.number];
      if (!issueNumber) continue;
      try {
        const issue = await github(`/issues/${issueNumber}`);
        if (issue.state === 'open') {
          console.log(`  🔒 PRD-${prd.number}: fechando issue #${issueNumber}...`);
          await github(`/issues/${issueNumber}`, 'PATCH', {
            state: 'closed',
            state_reason: 'completed',
          });
          console.log(`    → #${issueNumber} fechada`);
        } else {
          console.log(`  ✅ PRD-${prd.number}: issue #${issueNumber} já fechada`);
        }
      } catch (err) {
        console.error(`  ⚠️  PRD-${prd.number}: erro ao buscar/fechar issue #${issueNumber}: ${err.message}`);
      }
    }
  }

  saveMapping(mapping);
  console.log('\n✅ Sincronização concluída.');
}

sync().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
