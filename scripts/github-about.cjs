#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_NOTE = path.join(
  ROOT,
  'docs',
  'brain',
  '80-Site',
  'About do repositório (GitHub).md',
);
const API = 'https://api.github.com';
const USER_AGENT = 'utplsql-github-about/1.0';

function stripQuotes(value) {
  const text = String(value).trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function parseFrontmatter(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    if (key === 'topics') {
      fields.topics = raw.startsWith('[')
        ? raw
            .slice(1, -1)
            .split(',')
            .map((item) => stripQuotes(item))
            .filter(Boolean)
        : [];
    } else {
      fields[key] = stripQuotes(raw);
    }
  }
  return fields;
}

function readAboutNote(file, readFile = (target, encoding) => fs.readFileSync(target, encoding)) {
  const fields = parseFrontmatter(readFile(file, 'utf8'));
  if (!fields.descricao) throw new Error(`nota sem "descricao": ${file}`);
  if (!fields.homepage) throw new Error(`nota sem "homepage": ${file}`);
  if (!Array.isArray(fields.topics) || fields.topics.length === 0) {
    throw new Error(`nota sem "topics": ${file}`);
  }
  return {
    description: fields.descricao,
    homepage: fields.homepage,
    topics: fields.topics,
  };
}

function compareAbout(expected, actual) {
  const problems = [];
  if ((actual.description || '') !== expected.description) {
    problems.push(`description difere (GitHub: ${JSON.stringify(actual.description || '')})`);
  }
  if ((actual.homepage || '') !== expected.homepage) {
    problems.push(`homepage difere (GitHub: ${JSON.stringify(actual.homepage || '')})`);
  }
  const actualTopics = new Set(actual.topics || []);
  const expectedTopics = new Set(expected.topics || []);
  const missing = [...expectedTopics].filter((topic) => !actualTopics.has(topic));
  const extra = [...actualTopics].filter((topic) => !expectedTopics.has(topic));
  if (missing.length || extra.length) {
    problems.push(
      `topics diferem (faltando: ${missing.join(', ') || '—'}; sobrando: ${extra.join(', ') || '—'})`,
    );
  }
  return problems;
}

function requestJson(method, url, token, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': USER_AGENT,
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request(url, { method, headers, timeout: 10000 }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = { message: raw.slice(0, 300) };
        }
        resolve({ status: res.statusCode || 0, data });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function readToken(env, readFile) {
  if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN.trim();
  try {
    const text = readFile(path.join(ROOT, '.env'), 'utf8');
    const line = text.split(/\r?\n/).find((item) => item.startsWith('GITHUB_TOKEN='));
    if (!line) return '';
    return line.slice('GITHUB_TOKEN='.length).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  } catch {
    return '';
  }
}

function repoFromGit(execFile) {
  try {
    const remote = execFile('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
    const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function parseArgs(argv) {
  const args = { check: true, apply: false, strict: false, repo: '', note: '' };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--check') {
      args.check = true;
      args.apply = false;
    } else if (arg === '--apply') {
      args.apply = true;
      args.check = false;
    } else if (arg === '--strict') {
      args.strict = true;
    } else if (arg === '--repo') {
      args.repo = argv[++index] || '';
    } else if (arg === '--note') {
      args.note = argv[++index] || '';
    } else {
      throw new Error(`opção desconhecida: ${arg}`);
    }
  }
  return args;
}

async function main(argv = [], deps = {}) {
  const env = deps.env || process.env;
  const readFile = deps.readFile || ((target, encoding) => fs.readFileSync(target, encoding));
  const request = deps.request || requestJson;
  const execFile =
    deps.execFile || ((file, args, options) => execFileSync(file, args, options).toString());

  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    return 2;
  }

  const note = args.note || DEFAULT_NOTE;
  let expected;
  try {
    expected = readAboutNote(note, readFile);
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    return 2;
  }

  const repo = args.repo || env.GITHUB_REPOSITORY || repoFromGit(execFile);
  if (!repo) {
    console.error('ERRO: repositório não definido (use --repo ou GITHUB_REPOSITORY).');
    return 2;
  }

  const token = readToken(env, readFile);
  let current;
  try {
    current = await request('GET', `${API}/repos/${repo}`, token);
  } catch (error) {
    console.error(`AVISO: não foi possível consultar o GitHub (${error.message}).`);
    return args.strict ? 1 : 0;
  }
  if (current?.status !== 200) {
    console.error(`AVISO: GitHub API respondeu ${current ? current.status : 'sem status'}.`);
    return args.strict ? 1 : 0;
  }

  const problems = compareAbout(expected, current.data || {});
  if (problems.length === 0) {
    console.log('OK: About do GitHub alinhado à nota.');
    return 0;
  }

  if (!args.apply) {
    console.error('DRIFT no About do GitHub:');
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    console.error('  → rode `npm run about:apply` para sincronizar.');
    return 1;
  }

  if (!token) {
    console.error('ERRO: --apply exige GITHUB_TOKEN.');
    return 2;
  }

  const patch = await request('PATCH', `${API}/repos/${repo}`, token, {
    description: expected.description,
    homepage: expected.homepage,
  });
  if (!patch || patch.status >= 300) {
    console.error(
      `ERRO: falha ao atualizar description/homepage (HTTP ${patch ? patch.status : '?'}).`,
    );
    return 1;
  }

  if (problems.some((problem) => problem.startsWith('topics'))) {
    const topics = await request('PUT', `${API}/repos/${repo}/topics`, token, {
      names: expected.topics,
    });
    if (!topics || topics.status >= 300) {
      console.error(`ERRO: falha ao atualizar topics (HTTP ${topics ? topics.status : '?'}).`);
      return 1;
    }
  }

  console.log('OK: About do GitHub atualizado.');
  return 0;
}

module.exports = {
  compareAbout,
  main,
  parseArgs,
  parseFrontmatter,
  readAboutNote,
  readToken,
  repoFromGit,
  requestJson,
  stripQuotes,
};

/* c8 ignore start */
if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
/* c8 ignore stop */
