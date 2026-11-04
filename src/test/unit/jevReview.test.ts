import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  buildQuestions,
  buildState,
  CliError,
  callJev,
  choiceValue,
  type ExecFileLike,
  type FetchLike,
  type FetchResponse,
  filterDiff,
  formatJson,
  formatMarkdown,
  getGitDiff,
  isSensitivePath,
  JevApiError,
  type JevResponse,
  loadApiKey,
  type MainDeps,
  main,
  noulValue,
  parseArgs,
  parseEnvValue,
  redactSecrets,
  scoreValue,
  splitDiff,
  summarize,
} from '../../tools/jevReview';

type FetchInit = Parameters<FetchLike>[1];

function validResponse(overrides: Partial<JevResponse> = {}): JevResponse {
  return {
    model: 'jev-1.13-free',
    answers: {
      security: { type: 'noul', noul: 0.2 },
      correctness: { type: 'noul', noul: 0.1 },
      tests: { type: 'noul', noul: 0.1 },
      severity: { type: 'score', score: 1.1, confidence: 0.9 },
      recommendation: { type: 'choice', choice: 'approve', confidence: 0.9 },
    },
    usage: { input_tokens: 10, output_tokens: 2, cost: 0 },
    ...overrides,
  };
}

function fakeResponse(body: unknown, ok = true, status = 200): FetchResponse {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function fakeFetch(body: unknown, ok = true, status = 200): FetchLike {
  return async () => fakeResponse(body, ok, status);
}

function capturingFetch(body: unknown): {
  calls: Array<{ url: string; init: FetchInit }>;
  fetchImpl: FetchLike;
} {
  const calls: Array<{ url: string; init: FetchInit }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return fakeResponse(body);
  };
  return { calls, fetchImpl };
}

const SAMPLE_DIFF = `diff --git a/src/users.ts b/src/users.ts
index 1111111..2222222 100644
--- a/src/users.ts
+++ b/src/users.ts
@@ -1,2 +1,3 @@
 export function getUser(id: string) {
+  const rows = await db.query(\`SELECT * FROM users WHERE id = \${id}\`);
   return rows;
 }
`;

const ENV_DIFF = `diff --git a/.env b/.env
new file mode 100644
--- /dev/null
+++ b/.env
@@ -0,0 +1 @@
+OPENCODE_API_KEY=super-secret
`;

const LOCK_DIFF = `diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1 +1 @@
-old
+new
`;

const BINARY_DIFF = `diff --git a/image.png b/image.png
Binary files a/image.png and b/image.png differ
`;

async function runMain(
  argv: string[],
  deps: MainDeps = {},
): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await main(argv, {
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
    ...deps,
  });
  return { code, out: out.join(''), err: err.join('') };
}

async function withTempDirAsync<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-review-'));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeDiff(dir: string, contents: string): string {
  const file = path.join(dir, 'sample.diff');
  fs.writeFileSync(file, contents, 'utf8');
  return file;
}

test('parseEnvValue: lê valor simples, com quotes, export e CRLF', () => {
  assert.equal(parseEnvValue('OPENCODE_API_KEY=abc\n', 'OPENCODE_API_KEY'), 'abc');
  assert.equal(parseEnvValue('OPENCODE_API_KEY="abc"\r\n', 'OPENCODE_API_KEY'), 'abc');
  assert.equal(parseEnvValue("OPENCODE_API_KEY='abc'\n", 'OPENCODE_API_KEY'), 'abc');
  assert.equal(parseEnvValue('export OPENCODE_API_KEY=abc\n', 'OPENCODE_API_KEY'), 'abc');
  assert.equal(parseEnvValue('# OPENCODE_API_KEY=abc\n', 'OPENCODE_API_KEY'), undefined);
  assert.equal(parseEnvValue('OPENCODE_API_KEY=\n', 'OPENCODE_API_KEY'), undefined);
  assert.equal(parseEnvValue('OPENCODE_API_KEY=""\n', 'OPENCODE_API_KEY'), undefined);
  assert.equal(parseEnvValue('OTHER=abc\n', 'OPENCODE_API_KEY'), undefined);
});

test('loadApiKey: env vence o arquivo', () => {
  const key = loadApiKey({
    env: { OPENCODE_API_KEY: 'from-env' },
    envFile: '/nope',
    readFile: () => 'OPENCODE_API_KEY=from-file',
  });
  assert.equal(key, 'from-env');
});

test('loadApiKey: fallback para o .env', () => {
  const key = loadApiKey({
    env: {},
    envFile: '/repo/.env',
    readFile: () => 'OPENCODE_API_KEY="from-file"\r\n',
  });
  assert.equal(key, 'from-file');
});

test('loadApiKey: sem chave quando o arquivo não existe', () => {
  const key = loadApiKey({
    env: {},
    envFile: '/nope',
    readFile: () => {
      throw new Error('ENOENT');
    },
  });
  assert.equal(key, undefined);
});

test('redactSecrets: cobre env, bearer, private key, aws e jwt', () => {
  const input = [
    'OPENCODE_API_KEY=super-secret',
    'UTPLSQL_CONN=scott/tiger@host:1521/xe',
    'Authorization: Bearer abc.def',
    'const password = "hunter2";',
    '-----BEGIN RSA PRIVATE KEY-----',
    'abc',
    '-----END RSA PRIVATE KEY-----',
    'AKIA1234567890ABCDEF',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop',
  ].join('\n');
  const redacted = redactSecrets(input);
  assert.match(redacted, /OPENCODE_API_KEY=\[REDACTED\]/);
  assert.match(redacted, /UTPLSQL_CONN=\[REDACTED\]/);
  assert.match(redacted, /Authorization: Bearer \[REDACTED\]/);
  assert.match(redacted, /const password = "\[REDACTED\]"/);
  assert.match(redacted, /\[REDACTED PRIVATE KEY\]/);
  assert.match(redacted, /\[REDACTED AWS KEY\]/);
  assert.match(redacted, /\[REDACTED JWT\]/);
  assert.doesNotMatch(redacted, /hunter2|super-secret|AKIA/);
});

test('redactSecrets: não altera código comum', () => {
  assert.equal(redactSecrets('const token = getToken();'), 'const token = getToken();');
});

test('isSensitivePath: identifica segredos, builds e lockfiles', () => {
  for (const file of [
    '.env',
    '.env.local',
    '.env.production',
    'node_modules/x.js',
    'out/x.js',
    'dist/x.js',
    'coverage/x',
    '.vscode-test/x',
    'package-lock.json',
    'npm-shrinkwrap.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'id_rsa',
    'id_ed25519',
    'credentials',
    'secrets',
    'cert.pem',
    'cert.key',
    'cert.p12',
    'foo.vsix',
    'docs/brain/.obsidian/plugins/foo/data.json',
  ]) {
    assert.equal(isSensitivePath(file), true, file);
  }
});

test('isSensitivePath: libera exemplos e código normal', () => {
  for (const file of [
    '.env.example',
    '.env.sample',
    '.env.template',
    'src/foo.ts',
    'docs/brain/foo/data.json',
    'README.md',
    'package.json',
  ]) {
    assert.equal(isSensitivePath(file), false, file);
  }
});

test('isSensitivePath: normaliza backslashes', () => {
  assert.equal(isSensitivePath('node_modules\\x.js'), true);
  assert.equal(isSensitivePath('src\\foo.ts'), false);
});

test('splitDiff: separa blocos e caminhos', () => {
  const blocks = splitDiff(`${SAMPLE_DIFF}${LOCK_DIFF}`);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].path, 'src/users.ts');
  assert.equal(blocks[1].path, 'package-lock.json');
});

test('splitDiff: caminho com espaços e quotes', () => {
  const blocks = splitDiff(
    'diff --git "a/src/foo bar.ts" "b/src/foo bar.ts"\n--- "a/src/foo bar.ts"\n+++ "b/src/foo bar.ts"\n',
  );
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].path, 'src/foo bar.ts');
});

test('splitDiff: diff sem header vira bloco sem caminho', () => {
  const blocks = splitDiff('--- a/x\n+++ b/x\n');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].path, undefined);
});

test('splitDiff: vazio', () => {
  assert.deepEqual(splitDiff(''), []);
});

test('filterDiff: ignora .env, lockfile e binário e redige segredos', () => {
  const filtered = filterDiff(`${SAMPLE_DIFF}${ENV_DIFF}${LOCK_DIFF}${BINARY_DIFF}`);
  assert.deepEqual(filtered.files, ['src/users.ts']);
  assert.equal(filtered.omitted, 3);
  assert.equal(filtered.truncated, false);
  assert.match(filtered.text, /src\/users\.ts/);
  assert.doesNotMatch(filtered.text, /super-secret/);
});

test('filterDiff: redige segredo em arquivo normal', () => {
  const diff =
    'diff --git a/config.ts b/config.ts\n--- a/config.ts\n+++ b/config.ts\n@@ -1 +1 @@\n+const apiKey = "sk-live-123";\n';
  const filtered = filterDiff(diff);
  assert.match(filtered.text, /\[REDACTED\]/);
  assert.doesNotMatch(filtered.text, /sk-live-123/);
});

test('filterDiff: trunca por arquivo e por total', () => {
  const diff = `diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n+${'a'.repeat(200)}\n`;
  const perFile = filterDiff(diff, 1000, 20);
  assert.equal(perFile.truncated, true);
  assert.match(perFile.text, /\.\.\. \[truncado\]/);

  const total = filterDiff(`${diff}${diff.replace(/a\.ts/g, 'b.ts')}`, 120, 1000);
  assert.equal(total.truncated, true);
  assert.match(total.text, /\.\.\. \[diff truncado\]/);
  assert.equal(total.files.length, 1);
  assert.equal(total.omitted, 1);
});

test('filterDiff: limite total zero omite todos', () => {
  const filtered = filterDiff(SAMPLE_DIFF, 0, 1000);
  assert.deepEqual(filtered.files, []);
  assert.equal(filtered.omitted, 1);
});

test('buildQuestions: inclui as cinco dimensões', () => {
  const questions = buildQuestions();
  assert.deepEqual(Object.keys(questions), [
    'security',
    'correctness',
    'tests',
    'severity',
    'recommendation',
  ]);
  assert.equal(questions.security.type, 'noul');
  assert.equal(questions.severity.type, 'score');
  assert.deepEqual(questions.severity.criteria, ['nenhuma', 'baixa', 'média', 'alta', 'crítica']);
  assert.equal(questions.recommendation.type, 'choice');
});

test('buildState: cabeçalho e diff', () => {
  const state = buildState({ text: 'diff', files: ['a'], omitted: 2, truncated: true });
  assert.match(state, /Arquivos revisados: 1/);
  assert.match(state, /Arquivos omitidos: 2/);
  assert.match(state, /Diff truncado/);
  assert.match(state, /diff$/);
});

test('callJev: envia headers, modelo, state e perguntas', async () => {
  const { calls, fetchImpl } = capturingFetch({
    model: 'jev-1.13-free',
    answers: validResponse().answers,
    usage: { input_tokens: 3 },
  });
  const response = await callJev({
    endpoint: 'https://example.test/systemone',
    apiKey: 'test-key',
    model: 'jev-1.13-free',
    state: 'state',
    questions: buildQuestions(),
    fetchImpl,
  });
  assert.equal(response.model, 'jev-1.13-free');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.test/systemone');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-key');
  assert.equal(calls[0].init.signal instanceof AbortSignal, true);
  const body = JSON.parse(calls[0].init.body) as {
    model: string;
    state: string;
    questions: Record<string, { type: string }>;
  };
  assert.equal(body.model, 'jev-1.13-free');
  assert.equal(body.state, 'state');
  assert.equal(body.questions.security.type, 'noul');
});

test('callJev: erro HTTP com corpo redigido', async () => {
  const fetchImpl: FetchLike = async () => ({
    ok: false,
    status: 401,
    json: async () => ({}),
    text: async () => 'token=super-secret',
  });
  await assert.rejects(
    () =>
      callJev({
        endpoint: 'x',
        apiKey: 'k',
        model: 'm',
        state: 's',
        questions: {},
        fetchImpl,
      }),
    (error: unknown) => {
      assert.ok(error instanceof JevApiError);
      assert.equal(error.status, 401);
      assert.match(error.message, /HTTP 401/);
      assert.doesNotMatch(error.message, /super-secret/);
      assert.match(error.message, /\[REDACTED\]/);
      return true;
    },
  );
});

test('callJev: usa global fetch quando fetchImpl não é passado', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        model: 'jev-1.13-free',
        answers: { security: { type: 'noul', noul: 0.5 } },
      }),
      { status: 200 },
    )) as typeof globalThis.fetch;
  try {
    const response = await callJev({
      endpoint: 'x',
      apiKey: 'k',
      model: 'm',
      state: 's',
      questions: {},
    });
    assert.equal(response.model, 'jev-1.13-free');
  } finally {
    globalThis.fetch = original;
  }
});

test('callJev: erro HTTP com text() que falha', async () => {
  const fetchImpl: FetchLike = async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
    text: async () => {
      throw new Error('no body');
    },
  });
  await assert.rejects(
    () =>
      callJev({
        endpoint: 'x',
        apiKey: 'k',
        model: 'm',
        state: 's',
        questions: {},
        fetchImpl,
      }),
    /HTTP 500: /,
  );
});

test('callJev: JSON inválido', async () => {
  const fetchImpl: FetchLike = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new Error('bad');
    },
    text: async () => '',
  });
  await assert.rejects(
    () =>
      callJev({
        endpoint: 'x',
        apiKey: 'k',
        model: 'm',
        state: 's',
        questions: {},
        fetchImpl,
      }),
    /JSON inválido/,
  );
});

test('callJev: payload sem answers', async () => {
  await assert.rejects(
    () =>
      callJev({
        endpoint: 'x',
        apiKey: 'k',
        model: 'm',
        state: 's',
        questions: {},
        fetchImpl: fakeFetch({ model: 'm' }),
      }),
    /sem "answers"/,
  );
});

test('callJev: answer inválida', async () => {
  await assert.rejects(
    () =>
      callJev({
        endpoint: 'x',
        apiKey: 'k',
        model: 'm',
        state: 's',
        questions: {},
        fetchImpl: fakeFetch({ answers: { security: { type: 'noul', noul: 'no' } } }),
      }),
    /resposta inválida/,
  );
});

test('callJev: aceita score e choice com métricas opcionais', async () => {
  const response = await callJev({
    endpoint: 'x',
    apiKey: 'k',
    model: 'm',
    state: 's',
    questions: {},
    fetchImpl: fakeFetch({
      model: 'm',
      answers: {
        severity: {
          type: 'score',
          score: 2,
          confidence: 0.7,
          legend: { 0: 'none' },
          probabilities: { 0: 0.2 },
        },
        recommendation: {
          type: 'choice',
          choice: 'comment',
          confidence: 0.8,
          probabilities: { comment: 0.8 },
        },
      },
      usage: { input_tokens: 1 },
    }),
  });
  assert.equal(scoreValue(response, 'severity'), 2);
  assert.equal(choiceValue(response, 'recommendation'), 'comment');
  assert.equal(noulValue(response, 'security'), undefined);
});

test('callJev: falha de rede', async () => {
  const fetchImpl: FetchLike = async () => {
    throw new Error('sem rede');
  };
  await assert.rejects(
    () =>
      callJev({
        endpoint: 'x',
        apiKey: 'k',
        model: 'm',
        state: 's',
        questions: {},
        fetchImpl,
      }),
    /falha de rede: sem rede/,
  );
});

test('callJev: timeout', async () => {
  const fetchImpl: FetchLike = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')));
    });
  await assert.rejects(
    () =>
      callJev({
        endpoint: 'x',
        apiKey: 'k',
        model: 'm',
        state: 's',
        questions: {},
        fetchImpl,
        timeoutMs: 5,
      }),
    /timeout após 5ms/,
  );
});

test('summarize: achados críticos', () => {
  const response = validResponse({
    answers: {
      security: { type: 'noul', noul: 0.98 },
      correctness: { type: 'noul', noul: 0.75 },
      tests: { type: 'noul', noul: 0.65 },
      severity: { type: 'score', score: 3.97 },
      recommendation: { type: 'choice', choice: 'block' },
    },
  });
  const summary = summarize(response);
  assert.equal(summary.verdict, 'block');
  assert.equal(summary.severityLabel, 'crítica');
  assert.equal(summary.critical, true);
  assert.equal(summary.hasFindings, true);
  assert.deepEqual(
    summary.findings.map((finding) => finding.dimension),
    ['security', 'correctness', 'tests', 'severity', 'recommendation'],
  );
});

test('summarize: aprovado', () => {
  const summary = summarize(validResponse());
  assert.equal(summary.verdict, 'approve');
  assert.equal(summary.hasFindings, false);
  assert.equal(summary.critical, false);
});

test('summarize: comentário', () => {
  const response = validResponse({
    answers: {
      security: { type: 'noul', noul: 0.1 },
      correctness: { type: 'noul', noul: 0.1 },
      tests: { type: 'noul', noul: 0.1 },
      severity: { type: 'score', score: 1 },
      recommendation: { type: 'choice', choice: 'comment' },
    },
  });
  const summary = summarize(response);
  assert.equal(summary.verdict, 'comment');
  assert.deepEqual(
    summary.findings.map((finding) => finding.dimension),
    ['recommendation'],
  );
});

test('summarize: severidade alta sem recommendation bloqueia', () => {
  const response = validResponse({
    answers: {
      security: { type: 'noul', noul: 0.1 },
      correctness: { type: 'noul', noul: 0.1 },
      tests: { type: 'noul', noul: 0.1 },
      severity: { type: 'score', score: 3.2 },
      recommendation: { type: 'choice', choice: 'approve' },
    },
  });
  const summary = summarize(response);
  assert.equal(summary.verdict, 'block');
  assert.equal(summary.hasFindings, true);
});

test('summarize: respostas ausentes', () => {
  const summary = summarize({ model: 'm', answers: {} });
  assert.equal(summary.verdict, 'approve');
  assert.equal(summary.severityLabel, 'desconhecida');
  assert.equal(summary.hasFindings, false);
});

test('formatMarkdown: inclui veredito, tabela e achados', () => {
  const response = validResponse({
    answers: {
      security: { type: 'noul', noul: 0.98 },
      correctness: { type: 'noul', noul: 0.2 },
      tests: { type: 'noul', noul: 0.1 },
      severity: { type: 'score', score: 3.97 },
      recommendation: { type: 'choice', choice: 'block' },
    },
    usage: { input_tokens: 10, output_tokens: 2, cost: 0 },
  });
  const summary = summarize(response);
  const markdown = formatMarkdown(response, summary, {
    text: '',
    files: ['src/a.ts'],
    omitted: 2,
    truncated: true,
  });
  assert.match(markdown, /Jev review/);
  assert.match(markdown, /block/);
  assert.match(markdown, /98%/);
  assert.match(markdown, /3\.97\/4/);
  assert.match(markdown, /Arquivos revisados:\*\* 1/);
  assert.match(markdown, /Omitidos:\*\* 2/);
  assert.match(markdown, /Truncado:\*\* sim/);
  assert.match(markdown, /custo 0/);
});

test('formatMarkdown: aprovado sem achados', () => {
  const response = validResponse();
  const markdown = formatMarkdown(response, summarize(response), {
    text: '',
    files: ['a'],
    omitted: 0,
    truncated: false,
  });
  assert.match(markdown, /Nenhum risco relevante/);
});

test('formatMarkdown: respostas ausentes usam —', () => {
  const response: JevResponse = { model: 'm', answers: {} };
  const markdown = formatMarkdown(response, summarize(response), {
    text: '',
    files: ['a'],
    omitted: 0,
    truncated: false,
  });
  assert.match(markdown, /—/);
  assert.match(markdown, /desconhecida/);
});

test('formatJson: não inclui o diff/state', () => {
  const response = validResponse();
  const json = JSON.parse(
    formatJson(response, summarize(response), {
      text: 'SEGREDO',
      files: ['a'],
      omitted: 1,
      truncated: false,
    }),
  ) as {
    model: string;
    verdict: string;
    diff: { files: string[]; omitted: number; truncated: boolean };
  };
  assert.equal(json.model, 'jev-1.13-free');
  assert.equal(json.verdict, 'approve');
  assert.deepEqual(json.diff.files, ['a']);
  assert.equal(json.diff.omitted, 1);
  assert.equal(JSON.stringify(json).includes('SEGREDO'), false);
});

test('parseArgs: defaults', () => {
  const options = parseArgs([]);
  assert.equal(options.base, 'origin/main');
  assert.equal(options.head, 'HEAD');
  assert.equal(options.repo, '.');
  assert.equal(options.model, 'jev-1.13-free');
  assert.equal(options.format, 'markdown');
  assert.equal(options.workingTree, false);
  assert.equal(options.failOnFindings, false);
  assert.equal(options.help, false);
});

test('parseArgs: flags com valor inline e separado', () => {
  const options = parseArgs([
    '--base=main',
    '--head',
    'HEAD~1',
    '--repo=/tmp/x',
    '--diff-file',
    'x.diff',
    '--model',
    'jev-1.13',
    '--endpoint=https://example.test',
    '--format=json',
    '--max-diff-chars',
    '10',
    '--max-file-chars=20',
    '--timeout-ms',
    '30',
    '--output',
    'out.md',
    '--working-tree',
    '--fail-on-findings',
    '--require-key',
    '--dry-run',
  ]);
  assert.equal(options.base, 'main');
  assert.equal(options.head, 'HEAD~1');
  assert.equal(options.repo, '/tmp/x');
  assert.equal(options.diffFile, 'x.diff');
  assert.equal(options.model, 'jev-1.13');
  assert.equal(options.endpoint, 'https://example.test');
  assert.equal(options.format, 'json');
  assert.equal(options.maxDiffChars, 10);
  assert.equal(options.maxFileChars, 20);
  assert.equal(options.timeoutMs, 30);
  assert.equal(options.output, 'out.md');
  assert.equal(options.workingTree, true);
  assert.equal(options.failOnFindings, true);
  assert.equal(options.requireKey, true);
  assert.equal(options.dryRun, true);
});

test('parseArgs: -h', () => {
  assert.equal(parseArgs(['-h']).help, true);
});

test('parseArgs: erros', () => {
  assert.throws(() => parseArgs(['--nope']), CliError);
  assert.throws(() => parseArgs(['--base']), /faltou valor/);
  assert.throws(() => parseArgs(['--base', '--head']), /faltou valor/);
  assert.throws(() => parseArgs(['--format', 'xml']), /--format/);
  assert.throws(() => parseArgs(['--max-diff-chars', '0']), /inteiro positivo/);
  assert.throws(() => parseArgs(['--max-file-chars', 'abc']), /inteiro positivo/);
  assert.throws(() => parseArgs(['--timeout-ms', '-1']), /inteiro positivo/);
  assert.throws(() => parseArgs(['--dry-run=1']), /não aceita valor/);
  assert.throws(() => parseArgs(['posicional']), /argumento inesperado/);
});

test('getGitDiff: monta o comando e devolve stdout', () => {
  let capturedFile = '';
  let capturedArgs: string[] = [];
  let capturedEncoding = '';
  const execFile: ExecFileLike = (file, args, options) => {
    capturedFile = file;
    capturedArgs = args;
    capturedEncoding = options.encoding;
    return SAMPLE_DIFF;
  };
  const diff = getGitDiff({ repo: '/tmp/repo', base: 'origin/main', head: 'HEAD' }, execFile);
  assert.equal(diff, SAMPLE_DIFF);
  assert.equal(capturedFile, 'git');
  assert.deepEqual(capturedArgs, [
    '-C',
    '/tmp/repo',
    'diff',
    '--no-ext-diff',
    '--unified=3',
    'origin/main...HEAD',
  ]);
  assert.equal(capturedEncoding, 'utf8');
});

test('getGitDiff: working tree usa git diff <base>', () => {
  let capturedArgs: string[] = [];
  const execFile: ExecFileLike = (_file, args) => {
    capturedArgs = args;
    return SAMPLE_DIFF;
  };
  getGitDiff({ repo: '/tmp/repo', base: 'origin/main', head: 'HEAD', workingTree: true }, execFile);
  assert.deepEqual(capturedArgs, [
    '-C',
    '/tmp/repo',
    'diff',
    '--no-ext-diff',
    '--unified=3',
    'origin/main',
  ]);
});

test('getGitDiff: erro vira CliError', () => {
  assert.throws(
    () =>
      getGitDiff({ repo: '/tmp', base: 'a', head: 'b' }, () => {
        throw new Error('bad ref');
      }),
    /git diff falhou/,
  );
});

test('main: --help', async () => {
  const result = await runMain(['--help']);
  assert.equal(result.code, 0);
  assert.match(result.out, /Uso:/);
});

test('main: argumento inválido', async () => {
  const result = await runMain(['--nope']);
  assert.equal(result.code, 2);
  assert.match(result.err, /ERRO: opção desconhecida/);
});

test('main: sem chave faz skip', async () => {
  const result = await runMain(['--diff-file', 'x'], {
    env: {},
    readFile: () => {
      throw new Error('ENOENT');
    },
  });
  assert.equal(result.code, 0);
  assert.match(result.err, /SKIP/);
});

test('main: --require-key sem chave sai 2', async () => {
  const result = await runMain(['--require-key'], {
    env: {},
    readFile: () => {
      throw new Error('ENOENT');
    },
  });
  assert.equal(result.code, 2);
});

test('main: diff vazio', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, '');
    const result = await runMain(['--diff-file', file], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
    });
    assert.equal(result.code, 0);
    assert.match(result.out, /Nada para revisar/);
  });
});

test('main: nenhum arquivo relevante', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, ENV_DIFF);
    const result = await runMain(['--diff-file', file], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
    });
    assert.equal(result.code, 0);
    assert.match(result.out, /Nenhum arquivo relevante/);
  });
});

test('main: dry-run não chama fetch', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    let called = false;
    const result = await runMain(['--diff-file', file, '--dry-run'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: async () => {
        called = true;
        return fakeResponse({});
      },
    });
    assert.equal(result.code, 0);
    assert.equal(called, false);
    const payload = JSON.parse(result.out) as {
      model: string;
      diff: { files: string[] };
      state: string;
      questions: Record<string, unknown>;
    };
    assert.equal(payload.model, 'jev-1.13-free');
    assert.deepEqual(payload.diff.files, ['src/users.ts']);
    assert.match(payload.state, /Arquivos revisados: 1/);
    assert.equal(typeof payload.questions.security, 'object');
  });
});

test('main: run completo em markdown', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const result = await runMain(['--diff-file', file], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(validResponse()),
    });
    assert.equal(result.code, 0);
    assert.match(result.out, /Jev review/);
    assert.match(result.out, /approve/);
  });
});

test('main: formato json', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const result = await runMain(['--diff-file', file, '--format', 'json'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(validResponse()),
    });
    assert.equal(result.code, 0);
    const json = JSON.parse(result.out) as { verdict: string; model: string };
    assert.equal(json.verdict, 'approve');
    assert.equal(json.model, 'jev-1.13-free');
  });
});

test('main: --output escreve arquivo', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const written: Array<{ file: string; data: string }> = [];
    const result = await runMain(['--diff-file', file, '--output', 'report.md'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(validResponse()),
      writeFile: (target, data) => written.push({ file: target, data }),
    });
    assert.equal(result.code, 0);
    assert.equal(result.out, '');
    assert.equal(written.length, 1);
    assert.equal(written[0].file, path.join(dir, 'report.md'));
    assert.match(written[0].data, /Jev review/);
  });
});

test('main: --output usa writeFile padrão', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const result = await runMain(['--diff-file', file, '--output', 'report.md'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(validResponse()),
    });
    assert.equal(result.code, 0);
    const report = fs.readFileSync(path.join(dir, 'report.md'), 'utf8');
    assert.match(report, /Jev review/);
  });
});

test('main: --fail-on-findings', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const blocking = validResponse({
      answers: {
        security: { type: 'noul', noul: 0.95 },
        correctness: { type: 'noul', noul: 0.1 },
        tests: { type: 'noul', noul: 0.1 },
        severity: { type: 'score', score: 3.9 },
        recommendation: { type: 'choice', choice: 'block' },
      },
    });
    const result = await runMain(['--diff-file', file, '--fail-on-findings'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(blocking),
    });
    assert.equal(result.code, 1);
  });
});

test('main: erro da API escreve relatório de erro', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const written: string[] = [];
    const result = await runMain(['--diff-file', file, '--output', 'report.md'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch({ error: 'unauthorized' }, false, 401),
      writeFile: (_target, data) => written.push(data),
    });
    assert.equal(result.code, 1);
    assert.match(result.err, /HTTP 401/);
    assert.equal(written.length, 1);
    assert.match(written[0], /Jev review — erro/);
  });
});

test('main: erro da API não sobrescreve a causa quando output falha', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const result = await runMain(['--diff-file', file, '--output', 'report.md'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch({ error: 'falha' }, false, 500),
      writeFile: () => {
        throw new Error('disco cheio');
      },
    });
    assert.equal(result.code, 1);
    assert.match(result.err, /HTTP 500/);
  });
});

test('main: erro ao escrever output', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const result = await runMain(['--diff-file', file, '--output', 'report.md'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(validResponse()),
      writeFile: () => {
        throw new Error('disco cheio');
      },
    });
    assert.equal(result.code, 2);
    assert.match(result.err, /não foi possível escrever/);
  });
});

test('main: usa git via execFile', async () => {
  await withTempDirAsync(async (dir) => {
    let capturedArgs: string[] = [];
    const execFile: ExecFileLike = (_file, args) => {
      capturedArgs = args;
      return SAMPLE_DIFF;
    };
    const result = await runMain(['--base', 'origin/main', '--head', 'HEAD'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      execFile,
      fetchImpl: fakeFetch(validResponse()),
    });
    assert.equal(result.code, 0);
    assert.deepEqual(capturedArgs, [
      '-C',
      dir,
      'diff',
      '--no-ext-diff',
      '--unified=3',
      'origin/main...HEAD',
    ]);
  });
});

test('main: --working-tree usa git diff <base>', async () => {
  await withTempDirAsync(async (dir) => {
    let capturedArgs: string[] = [];
    const execFile: ExecFileLike = (_file, args) => {
      capturedArgs = args;
      return SAMPLE_DIFF;
    };
    const result = await runMain(['--working-tree', '--base', 'origin/main'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      execFile,
      fetchImpl: fakeFetch(validResponse()),
    });
    assert.equal(result.code, 0);
    assert.deepEqual(capturedArgs, [
      '-C',
      dir,
      'diff',
      '--no-ext-diff',
      '--unified=3',
      'origin/main',
    ]);
  });
});

test('main: erro de git diff', async () => {
  const result = await runMain(['--base', 'nope', '--head', 'HEAD'], {
    env: { OPENCODE_API_KEY: 'k' },
    cwd: '/tmp',
    execFile: () => {
      throw new Error('bad ref');
    },
  });
  assert.equal(result.code, 2);
  assert.match(result.err, /git diff falhou/);
});

test('main: erro de leitura do diff-file', async () => {
  const result = await runMain(['--diff-file', 'missing.diff'], {
    env: { OPENCODE_API_KEY: 'k' },
    cwd: '/tmp',
    readFile: () => {
      throw new Error('ENOENT');
    },
  });
  assert.equal(result.code, 2);
  assert.match(result.err, /não foi possível ler/);
});

test('main: carrega a chave do .env', async () => {
  await withTempDirAsync(async (dir) => {
    fs.writeFileSync(path.join(dir, '.env'), 'OPENCODE_API_KEY=file-key\n', 'utf8');
    const file = writeDiff(dir, SAMPLE_DIFF);
    let authorization = '';
    const result = await runMain(['--diff-file', file], {
      env: {},
      cwd: dir,
      fetchImpl: async (_url, init) => {
        authorization = init.headers.Authorization;
        return fakeResponse(validResponse());
      },
    });
    assert.equal(result.code, 0);
    assert.equal(authorization, 'Bearer file-key');
  });
});
