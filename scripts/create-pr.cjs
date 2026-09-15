#!/usr/bin/env node
/**
 * Cria (ou atualiza) um pull request no GitHub.
 *
 * Uso:
 *   node scripts/create-pr.cjs --title "release: 0.12.0" --body-file /tmp/pr.md
 *   node scripts/create-pr.cjs --title "fix: ..." --body-file pr.md --base main --head fix/foo
 *
 * Opções:
 *   --title <texto>       Título do PR (obrigatório para criar).
 *   --body-file <path>    Arquivo markdown com o corpo (obrigatório).
 *   --base <branch>       Branch de destino (default: main).
 *   --head <branch>       Branch de origem (default: branch atual).
 *   --update <numero>     Atualiza um PR existente pelo número.
 *   --closes              Só imprime a linha "Closes #…" dos PRDs concluídos
 *                         no range `<base>...HEAD` (não cria PR).
 *   --draft               Cria como rascunho.
 *   --dry-run             Mostra o payload e não chama a API.
 *
 * Lê GITHUB_TOKEN do ambiente ou do arquivo .env da raiz (WSL-safe: o token
 * não precisa ser exportado para o node.exe). NUNCA imprime o token.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'draft' || key === 'dry-run' || key === 'closes') {
      args[key] = true;
    } else {
      args[key] = argv[++i];
    }
  }
  return args;
}

function readEnvToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return null;
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('GITHUB_TOKEN='));
  if (!line) return null;
  return line
    .slice('GITHUB_TOKEN='.length)
    .trim()
    .replace(/\r$/, '')
    .replace(/^"|"$/g, '');
}

function getRepo() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const m = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
    if (m) return m[1];
  } catch {
    /* fallback */
  }
  console.error('GITHUB_REPOSITORY não definido e não foi possível deduzir do git remote.');
  process.exit(1);
}

function currentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/** PRDs concluídos no range `origin/<base>...HEAD` → linha "Closes #…". */
function buildCloses(base) {
  const mapFile = path.resolve(__dirname, '..', 'docs', 'prd', '.prd-issues.json');
  if (!fs.existsSync(mapFile)) return '';
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const out = execSync(
    `git diff --name-only --diff-filter=AR origin/${base}...HEAD -- docs/prd/completed`,
    { encoding: 'utf8' },
  );
  const nums = [...new Set((out.match(/prd-(\d+)-/g) || []).map((s) => s.match(/\d+/)[0]))];
  const issues = nums.map((n) => map[n]).filter(Boolean);
  return issues.length ? `Closes ${issues.map((n) => `#${n}`).join(', ')}` : '';
}

function github(token, method, apiPath, body, dryRun) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    if (dryRun) {
      console.log(`[dry-run] ${method} ${apiPath}`);
      if (payload) console.log(payload);
      return resolve(null);
    }
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: `/repos/${getRepo()}${apiPath}`,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'vscode-utplsql-create-pr',
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            return resolve(data ? JSON.parse(data) : null);
          }
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = args.base || 'main';

  if (args.closes) {
    const line = buildCloses(base);
    if (!line) {
      console.error(`Nenhum PRD concluído em origin/${base}...HEAD.`);
      process.exit(1);
    }
    console.log(line);
    return;
  }

  const bodyFile = args['body-file'];
  if (!bodyFile || !fs.existsSync(bodyFile)) {
    console.error('--body-file <path> é obrigatório e o arquivo deve existir.');
    process.exit(1);
  }
  const body = fs.readFileSync(bodyFile, 'utf8');
  const head = args.head || currentBranch();
  if (!head) {
    console.error('Não foi possível determinar a branch atual; use --head.');
    process.exit(1);
  }
  if (head === base) {
    console.error(`head e base são iguais (${head}).`);
    process.exit(1);
  }

  const token = readEnvToken();
  if (!token) {
    console.error('GITHUB_TOKEN não definido (ambiente nem .env).');
    process.exit(1);
  }

  const owner = getRepo().split('/')[0];
  const dryRun = !!args['dry-run'];

  let number = args.update;
  if (!number) {
    const existing = await github(
      token,
      'GET',
      `/pulls?state=open&head=${owner}:${encodeURIComponent(head)}`,
      null,
      dryRun,
    );
    if (existing && existing.length) number = existing[0].number;
  }

  if (number) {
    const patch = {};
    if (args.title) patch.title = args.title;
    patch.body = body;
    const pr = await github(token, 'PATCH', `/pulls/${number}`, patch, dryRun);
    console.log(`PR #${number} atualizado: ${dryRun ? '(dry-run)' : pr.html_url}`);
    return;
  }

  if (!args.title) {
    console.error('--title <texto> é obrigatório para criar um PR.');
    process.exit(1);
  }
  const pr = await github(
    token,
    'POST',
    '/pulls',
    { title: args.title, head, base, body, draft: !!args.draft },
    dryRun,
  );
  console.log(`PR criado: ${dryRun ? '(dry-run)' : pr.html_url}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
