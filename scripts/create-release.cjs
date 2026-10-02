#!/usr/bin/env node
/**
 * Cria uma **GitHub release** (que dispara o `publish.yml`). Equivalente ao
 * `create-pr.cjs`: não depende do `gh` e lê o `GITHUB_TOKEN` do ambiente ou do
 * `.env` da raiz (WSL-safe).
 *
 * Uso:
 *   npm run release:create -- --tag v0.14.0
 *   npm run release:create -- --tag v0.14.0 --name "Release 0.14.0"
 *   npm run release:create -- --tag v0.14.0 --notes-file notas.md --target main
 *
 * Opções:
 *   --tag <vX.Y.Z>      Obrigatório. Deve casar com a `version` do package.json.
 *   --name <texto>      Título da release (default: a própria tag, ex.: "v0.14.0").
 *   --notes <texto>     Corpo inline (tem prioridade sobre --notes-file).
 *   --notes-file <path> Arquivo markdown (default: extrai a seção do CHANGELOG).
 *   --target <branch>   Commit/branch alvo da tag (default: main).
 *   --draft             Cria como rascunho (não dispara publish).
 *   --prerelease        Marca como pré-release.
 *   --force             Permite tag divergente do package.json.
 *   --dry-run           Mostra o payload e não chama a API.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'draft' || key === 'prerelease' || key === 'dry-run' || key === 'force') {
      args[key] = true;
    } else {
      args[key] = argv[++i];
    }
  }
  return args;
}

function readEnvToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const envPath = path.join(ROOT, '.env');
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

/** Corpo das notas: título + seção `## <version>` do CHANGELOG. */
function changelogNotes(version) {
  const p = path.join(ROOT, 'CHANGELOG.md');
  if (!fs.existsSync(p)) return '';
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${version.replace(/\./g, '\\.')}\\b`).test(l));
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
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
          'User-Agent': 'vscode-utplsql-create-release',
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tag = args.tag;
  if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) {
    console.error('--tag vX.Y.Z é obrigatório (ex.: --tag v0.14.0).');
    process.exit(1);
  }
  const version = tag.slice(1);
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.version !== version && !args.force) {
    console.error(
      `tag ${tag} ≠ package.json version ${pkg.version} (use --force para ignorar).`,
    );
    process.exit(1);
  }

  let body = args.notes;
  if (!body && args['notes-file']) {
    const p = path.resolve(args['notes-file']);
    if (!fs.existsSync(p)) {
      console.error(`--notes-file não existe: ${p}`);
      process.exit(1);
    }
    body = fs.readFileSync(p, 'utf8');
  }
  if (!body) body = changelogNotes(version);
  if (!body) {
    console.error('Sem notas: informe --notes/--notes-file ou tenha a seção do CHANGELOG.');
    process.exit(1);
  }

  const token = readEnvToken();
  if (!token) {
    console.error('GITHUB_TOKEN não definido (ambiente nem .env).');
    process.exit(1);
  }

  const dryRun = !!args['dry-run'];
  const existing = dryRun
    ? null
    : await github(token, 'GET', `/releases/tags/${tag}`, null, false).catch(() => null);
  if (existing && existing.html_url) {
    console.error(`Release ${tag} já existe: ${existing.html_url}`);
    process.exit(1);
  }

  const payload = {
    tag_name: tag,
    target_commitish: args.target || 'main',
    name: args.name || tag,
    body,
    draft: !!args.draft,
    prerelease: !!args.prerelease,
  };
  const rel = await github(token, 'POST', '/releases', payload, dryRun);
  console.log(
    `Release ${tag} criada: ${dryRun ? '(dry-run)' : rel.html_url}` +
      (dryRun ? '' : '\nO workflow publish.yml dispara no evento "published".'),
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
