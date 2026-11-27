import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  type AggregateReview,
  aggregateChunkResponses,
  buildQuestions,
  buildState,
  type ChunkReview,
  CliError,
  callJev,
  choiceValue,
  combineResponses,
  DEFAULT_MAX_DIFF_CHARS,
  type DiffPlan,
  type ExecFileLike,
  escapeTableCell,
  type FetchLike,
  type FetchResponse,
  formatJson,
  formatMarkdown,
  getGitDiff,
  isDocPath,
  isHttpsEndpoint,
  isMaxTokensError,
  isRetryableModelError,
  isSensitivePath,
  JevApiError,
  type JevResponse,
  loadApiKey,
  type MainDeps,
  main,
  noulValue,
  parseArgs,
  parseEnvValue,
  planDiffChunks,
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

function maxTokensResponse(): FetchResponse {
  return {
    ok: false,
    status: 400,
    json: async () => ({}),
    text: async () => '{"detail":{"error_type":"max_tokens_exceeded"}}',
  };
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

function planOf(overrides: Partial<DiffPlan> = {}): DiffPlan {
  const files = overrides.files ?? ['a'];
  return {
    chunks: [{ text: '', files }],
    files,
    omitted: 0,
    omittedDocs: 0,
    omittedSensitive: 0,
    splitFiles: 0,
    ...overrides,
  };
}

function aggregateOf(
  response: JevResponse,
  plan = planOf(),
  chunks?: ChunkReview[],
): AggregateReview {
  const summary = summarize(response);
  return {
    response,
    summary,
    plan,
    chunks: chunks ?? [{ index: 1, files: plan.files, response, summary }],
  };
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
    'const conn = "scott/tiger@host:1521/xe";',
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
  assert.match(redacted, /scott\/\[REDACTED\]@host:1521\/xe/);
  assert.match(redacted, /\[REDACTED PRIVATE KEY\]/);
  assert.match(redacted, /\[REDACTED AWS KEY\]/);
  assert.match(redacted, /\[REDACTED JWT\]/);
  assert.doesNotMatch(redacted, /hunter2|super-secret|AKIA|tiger/);
});

test('redactSecrets: não altera código comum', () => {
  assert.equal(redactSecrets('const token = getToken();'), 'const token = getToken();');
  assert.equal(
    redactSecrets('const url = "https://example.com/path";'),
    'const url = "https://example.com/path";',
  );
});

test('isSensitivePath: identifica segredos, builds e lockfiles', () => {
  for (const file of [
    '.env',
    '.env.local',
    '.env.production',
    'matrix.env',
    'config.env',
    'foo.env',
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
    'environment.ts',
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

function diffFor(file: string, body: string): string {
  return `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -1 +1 @@\n+${body}\n`;
}

test('isDocPath: cobre docs, markdown e arquivos raiz', () => {
  for (const file of [
    'docs/guide.md',
    'docs/brain/note.md',
    'README.md',
    'README.pt-BR.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'LICENSE',
    '.opencode/skills/jev-review/SKILL.md',
  ]) {
    assert.equal(isDocPath(file), true, file);
  }
  for (const file of ['src/foo.ts', 'scripts/tool.cjs', 'site/index.html', 'config.ts']) {
    assert.equal(isDocPath(file), false, file);
  }
});

test('planDiffChunks: prioriza src e omite docs', () => {
  const plan = planDiffChunks(
    `${diffFor('docs/guide.md', 'doc')}${diffFor('README.md', 'readme')}${SAMPLE_DIFF}${diffFor('scripts/tool.cjs', 'script')}`,
    10_000,
    10_000,
  );
  assert.deepEqual(plan.files, ['src/users.ts', 'scripts/tool.cjs']);
  assert.equal(plan.omittedDocs, 2);
  assert.equal(plan.omittedSensitive, 0);
  assert.equal(plan.omitted, 2);
  assert.equal(plan.chunks.length, 1);
  assert.deepEqual(plan.chunks[0].files, ['src/users.ts', 'scripts/tool.cjs']);
  assert.ok(
    plan.chunks[0].text.indexOf('src/users.ts') < plan.chunks[0].text.indexOf('scripts/tool.cjs'),
  );
});

test('planDiffChunks: cobre todo o src em vários blocos', () => {
  const names = ['a', 'b', 'c', 'd', 'e'];
  const diff = names.map((name) => diffFor(`src/${name}.ts`, 'x'.repeat(120))).join('');
  const plan = planDiffChunks(diff, 300, 1000);
  assert.equal(plan.chunks.length, 5);
  assert.equal(plan.splitFiles, 0);
  assert.deepEqual(
    plan.files,
    names.map((name) => `src/${name}.ts`),
  );
  for (const chunk of plan.chunks) {
    assert.ok(chunk.text.length <= 300, `${chunk.text.length} > 300`);
  }
  const all = plan.chunks.map((chunk) => chunk.text).join('\n');
  for (const name of names) {
    assert.match(all, new RegExp(`src/${name}\\.ts`));
  }
});

test('planDiffChunks: divide arquivo grande em partes sem perder conteúdo', () => {
  const lines = Array.from({ length: 40 }, (_, index) => `+linha-${index}-${'x'.repeat(20)}`).join(
    '\n',
  );
  const diff = `diff --git a/src/big.ts b/src/big.ts\n--- a/src/big.ts\n+++ b/src/big.ts\n@@ -1,40 +1,40 @@\n${lines}\n`;
  const plan = planDiffChunks(diff, 300, 220);
  assert.ok(plan.chunks.length > 1);
  assert.equal(plan.splitFiles, 1);
  assert.deepEqual(plan.files, ['src/big.ts']);
  const all = plan.chunks.map((chunk) => chunk.text).join('\n');
  for (let index = 0; index < 40; index++) {
    assert.match(all, new RegExp(`linha-${index}-`));
  }
  assert.match(all, /parte 1\/\d+ de src\/big\.ts/);
});

test('planDiffChunks: omite sensíveis e binários e redige segredos', () => {
  const plan = planDiffChunks(
    `${SAMPLE_DIFF}${ENV_DIFF}${LOCK_DIFF}${BINARY_DIFF}${diffFor('config.ts', 'const apiKey = "sk-live-123";')}`,
    10_000,
    10_000,
  );
  assert.deepEqual(plan.files, ['src/users.ts', 'config.ts']);
  assert.equal(plan.omittedSensitive, 3);
  assert.equal(plan.omittedDocs, 0);
  const all = plan.chunks.map((chunk) => chunk.text).join('\n');
  assert.match(all, /\[REDACTED\]/);
  assert.doesNotMatch(all, /sk-live-123|super-secret/);
});

test('planDiffChunks: não omite markdown dentro de src', () => {
  const plan = planDiffChunks(diffFor('src/notes.md', 'nota'), 10_000, 10_000);
  assert.deepEqual(plan.files, ['src/notes.md']);
  assert.equal(plan.omittedDocs, 0);
});

test('planDiffChunks: linha única maior que a parte é dividida', () => {
  const diff = `diff --git a/src/long.ts b/src/long.ts\n--- a/src/long.ts\n+++ b/src/long.ts\n@@ -1 +1 @@\n+${'x'.repeat(500)}\n`;
  const plan = planDiffChunks(diff, 300, 120);
  assert.ok(plan.chunks.length > 1);
  assert.equal(plan.splitFiles, 1);
  assert.deepEqual(plan.files, ['src/long.ts']);
  const all = plan.chunks.map((chunk) => chunk.text).join('\n');
  assert.equal((all.match(/x/g) ?? []).length, 500);
});

test('planDiffChunks: diff vazio', () => {
  const plan = planDiffChunks('', 10_000, 10_000);
  assert.deepEqual(plan.chunks, []);
  assert.deepEqual(plan.files, []);
  assert.equal(plan.omitted, 0);
  assert.equal(plan.splitFiles, 0);
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

test('buildState: cabeçalho, aviso de diff não confiável e diff', () => {
  const state = buildState({ text: 'diff', files: ['a'], omitted: 2, truncated: true });
  assert.match(state, /Arquivos revisados: 1/);
  assert.match(state, /Arquivos omitidos: 2/);
  assert.match(state, /Diff truncado/);
  assert.match(state, /diff não confiável/i);
  assert.match(state, /ignore quaisquer instruções/i);
  assert.match(state, /--- FIM DO DIFF NÃO CONFIÁVEL ---/);
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

test('callJev: rejeita choice fora do enum', async () => {
  await assert.rejects(
    () =>
      callJev({
        endpoint: 'x',
        apiKey: 'k',
        model: 'm',
        state: 's',
        questions: {},
        fetchImpl: fakeFetch({
          answers: { recommendation: { type: 'choice', choice: '[x](https://evil)' } },
        }),
      }),
    /resposta inválida/,
  );
});

test('callJev: rejeita noul e score fora da faixa ou não finitos', async () => {
  const bodies = [
    { answers: { security: { type: 'noul', noul: 1.1 } } },
    { answers: { security: { type: 'noul', noul: -0.1 } } },
    { answers: { security: { type: 'noul', noul: Number.NaN } } },
    { answers: { severity: { type: 'score', score: 4.1 } } },
    { answers: { severity: { type: 'score', score: -0.1 } } },
    { answers: { severity: { type: 'score', score: Number.POSITIVE_INFINITY } } },
  ];
  for (const body of bodies) {
    await assert.rejects(
      () =>
        callJev({
          endpoint: 'x',
          apiKey: 'k',
          model: 'm',
          state: 's',
          questions: {},
          fetchImpl: fakeFetch({ model: 'm', ...body }),
        }),
      /resposta inválida/,
    );
  }
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

test('isMaxTokensError: só 400 com max_tokens_exceeded', () => {
  assert.equal(isMaxTokensError(new JevApiError('HTTP 400: max_tokens_exceeded', 400)), true);
  assert.equal(isMaxTokensError(new JevApiError('HTTP 400: outro erro', 400)), false);
  assert.equal(isMaxTokensError(new JevApiError('HTTP 401: max_tokens_exceeded', 401)), false);
  assert.equal(isMaxTokensError(new Error('max_tokens_exceeded')), false);
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

test('combineResponses: usa o pior veredito, maior severidade e soma uso', () => {
  const first = validResponse({
    answers: {
      security: { type: 'noul', noul: 0.2 },
      correctness: { type: 'noul', noul: 0.1 },
      tests: { type: 'noul', noul: 0.1 },
      severity: { type: 'score', score: 1.1 },
      recommendation: { type: 'choice', choice: 'approve' },
    },
    usage: { input_tokens: 10, output_tokens: 2, cost: 0.001 },
  });
  const second = validResponse({
    answers: {
      security: { type: 'noul', noul: 0.8 },
      correctness: { type: 'noul', noul: 0.9 },
      tests: { type: 'noul', noul: 0.7 },
      severity: { type: 'score', score: 3.2 },
      recommendation: { type: 'choice', choice: 'block' },
    },
    usage: { input_tokens: 20, output_tokens: 4, cost: 0.002 },
  });
  const combined = combineResponses([first, second]);
  assert.equal(combined.model, 'jev-1.13-free');
  assert.equal(noulValue(combined, 'security'), 0.8);
  assert.equal(noulValue(combined, 'correctness'), 0.9);
  assert.equal(noulValue(combined, 'tests'), 0.7);
  assert.equal(scoreValue(combined, 'severity'), 3.2);
  assert.equal(choiceValue(combined, 'recommendation'), 'block');
  assert.deepEqual(combined.usage, { input_tokens: 30, output_tokens: 6, cost: 0.003 });
});

test('combineResponses: lida com respostas ausentes e modelos diferentes', () => {
  const combined = combineResponses([
    { model: 'a', answers: {} },
    { model: 'b', answers: { severity: { type: 'score', score: 2 } } },
  ]);
  assert.equal(combined.model, 'misto');
  assert.equal(noulValue(combined, 'security'), undefined);
  assert.equal(scoreValue(combined, 'severity'), 2);
  assert.equal(choiceValue(combined, 'recommendation'), undefined);
  assert.equal(combined.usage, undefined);
});

test('combineResponses: uso vazio vira undefined', () => {
  const combined = combineResponses([{ model: 'm', answers: {}, usage: {} }]);
  assert.equal(combined.usage, undefined);
});

test('combineResponses: veredito desconhecido perde para comment', () => {
  const combined = combineResponses([
    { model: 'm', answers: { recommendation: { type: 'choice', choice: 'weird' } } },
    { model: 'm', answers: { recommendation: { type: 'choice', choice: 'comment' } } },
  ]);
  assert.equal(choiceValue(combined, 'recommendation'), 'comment');
});

test('combineResponses: sem respostas', () => {
  const combined = combineResponses([]);
  assert.equal(combined.model, 'desconhecido');
  assert.deepEqual(combined.answers, {});
  assert.equal(combined.usage, undefined);
});

test('aggregateChunkResponses: p90 evita block de um outlier', () => {
  const responses = Array.from({ length: 10 }, (_, index) =>
    index === 0
      ? validResponse({
          answers: {
            security: { type: 'noul', noul: 0.1 },
            correctness: { type: 'noul', noul: 0.1 },
            tests: { type: 'noul', noul: 0.91 },
            severity: { type: 'score', score: 3.06 },
            recommendation: { type: 'choice', choice: 'block' },
          },
        })
      : validResponse(),
  );
  const aggregate = aggregateChunkResponses(responses);
  assert.equal(scoreValue(aggregate, 'severity'), 1.1);
  assert.equal(choiceValue(aggregate, 'recommendation'), 'comment');
  assert.equal(summarize(aggregate).verdict, 'comment');
});

test('aggregateChunkResponses: segurança mantém block mesmo com severidade baixa', () => {
  const responses = [
    validResponse({
      answers: {
        security: { type: 'noul', noul: 0.98 },
        correctness: { type: 'noul', noul: 0.1 },
        tests: { type: 'noul', noul: 0.1 },
        severity: { type: 'score', score: 1.2 },
        recommendation: { type: 'choice', choice: 'block' },
      },
    }),
    ...Array.from({ length: 9 }, () => validResponse()),
  ];
  const aggregate = aggregateChunkResponses(responses);
  assert.equal(choiceValue(aggregate, 'recommendation'), 'block');
  assert.equal(summarize(aggregate).verdict, 'block');
});

test('aggregateChunkResponses: correção mantém block', () => {
  const responses = [
    validResponse({
      answers: {
        security: { type: 'noul', noul: 0.1 },
        correctness: { type: 'noul', noul: 0.8 },
        tests: { type: 'noul', noul: 0.1 },
        severity: { type: 'score', score: 1.2 },
        recommendation: { type: 'choice', choice: 'block' },
      },
    }),
    ...Array.from({ length: 9 }, () => validResponse()),
  ];
  assert.equal(summarize(aggregateChunkResponses(responses)).verdict, 'block');
});

test('aggregateChunkResponses: p90 de severidade alta mantém block', () => {
  const high = validResponse({
    answers: {
      security: { type: 'noul', noul: 0.1 },
      correctness: { type: 'noul', noul: 0.1 },
      tests: { type: 'noul', noul: 0.1 },
      severity: { type: 'score', score: 3.2 },
      recommendation: { type: 'choice', choice: 'block' },
    },
  });
  const responses = [
    ...Array.from({ length: 2 }, () => high),
    ...Array.from({ length: 8 }, () => validResponse()),
  ];
  const aggregate = aggregateChunkResponses(responses);
  assert.equal(scoreValue(aggregate, 'severity'), 3.2);
  assert.equal(summarize(aggregate).verdict, 'block');
});

test('aggregateChunkResponses: block bruto sem evidência vira comment', () => {
  const responses = [
    validResponse({
      answers: {
        security: { type: 'noul', noul: 0.1 },
        correctness: { type: 'noul', noul: 0.1 },
        tests: { type: 'noul', noul: 0.1 },
        severity: { type: 'score', score: 1.2 },
        recommendation: { type: 'choice', choice: 'block' },
      },
    }),
    ...Array.from({ length: 9 }, () => validResponse()),
  ];
  const aggregate = aggregateChunkResponses(responses);
  assert.equal(choiceValue(aggregate, 'recommendation'), 'comment');
  assert.equal(summarize(aggregate).verdict, 'comment');
});

test('aggregateChunkResponses: aprovado e sem respostas', () => {
  const approved = aggregateChunkResponses([validResponse(), validResponse()]);
  assert.equal(summarize(approved).verdict, 'approve');
  assert.equal(choiceValue(approved, 'recommendation'), 'approve');
  const empty = aggregateChunkResponses([]);
  assert.equal(empty.model, 'desconhecido');
  assert.deepEqual(empty.answers, {});
});

test('aggregateChunkResponses: sem severidade remove o campo', () => {
  const aggregate = aggregateChunkResponses([
    {
      model: 'm',
      answers: {
        security: { type: 'noul', noul: 0.1 },
        tests: { type: 'noul', noul: 0.1 },
        recommendation: { type: 'choice', choice: 'approve' },
      },
    },
  ]);
  assert.equal(scoreValue(aggregate, 'severity'), undefined);
  assert.equal(choiceValue(aggregate, 'recommendation'), 'approve');
});

test('aggregateChunkResponses: soma uso e modelo misto', () => {
  const aggregate = aggregateChunkResponses([
    validResponse({ model: 'a', usage: { input_tokens: 10, output_tokens: 2 } }),
    validResponse({ model: 'b', usage: { input_tokens: 20, output_tokens: 4 } }),
  ]);
  assert.equal(aggregate.model, 'misto');
  assert.deepEqual(aggregate.usage, { input_tokens: 30, output_tokens: 6 });
});

test('escapeTableCell: escapa backslash, pipe, colchetes, backticks e newline', () => {
  assert.equal(escapeTableCell('a\\b|c\nd'), 'a\\\\b\\|c<br>d');
  assert.equal(escapeTableCell('[x](https://evil)'), '\\[x\\](https://evil)');
  assert.equal(escapeTableCell('`x`'), '\\`x\\`');
});

test('formatMarkdown: inclui veredito, tabela, achados e estatísticas do plano', () => {
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
  const markdown = formatMarkdown(
    aggregateOf(
      response,
      planOf({
        files: ['src/a.ts'],
        omitted: 2,
        omittedDocs: 1,
        omittedSensitive: 1,
        splitFiles: 1,
      }),
    ),
  );
  assert.match(markdown, /Jev review/);
  assert.match(markdown, /block/);
  assert.match(markdown, /98%/);
  assert.match(markdown, /3\.97\/4/);
  assert.match(markdown, /Blocos:\*\* 1/);
  assert.match(markdown, /Arquivos revisados:\*\* 1/);
  assert.match(markdown, /Omitidos:\*\* 2 \(docs 1, sensíveis 1\)/);
  assert.match(markdown, /Arquivos divididos:\*\* 1/);
  assert.match(markdown, /custo 0/);
});

test('formatMarkdown: aprovado sem achados', () => {
  const response = validResponse();
  const markdown = formatMarkdown(aggregateOf(response));
  assert.match(markdown, /Nenhum risco relevante/);
});

test('formatMarkdown: respostas ausentes usam —', () => {
  const response: JevResponse = { model: 'm', answers: {} };
  const markdown = formatMarkdown(aggregateOf(response));
  assert.match(markdown, /—/);
  assert.match(markdown, /desconhecida/);
});

test('formatMarkdown: lista os blocos quando há mais de um', () => {
  const first = validResponse();
  const second = validResponse({
    answers: {
      security: { type: 'noul', noul: 0.1 },
      correctness: { type: 'noul', noul: 0.1 },
      tests: { type: 'noul', noul: 0.1 },
      severity: { type: 'score', score: 1 },
      recommendation: { type: 'choice', choice: 'comment' },
    },
  });
  const plan = planOf({
    chunks: [
      { text: '', files: ['src/a.ts'] },
      { text: '', files: ['src/b.ts'] },
    ],
    files: ['src/a.ts', 'src/b.ts'],
  });
  const chunks: ChunkReview[] = [
    { index: 1, files: ['src/a.ts'], response: first, summary: summarize(first) },
    { index: 2, files: ['src/b.ts'], response: second, summary: summarize(second) },
  ];
  const markdown = formatMarkdown(aggregateOf(combineResponses([first, second]), plan, chunks));
  assert.match(markdown, /Blocos revisados \(2\)/);
  assert.match(markdown, /src\/a\.ts/);
  assert.match(markdown, /src\/b\.ts/);
  assert.match(markdown, /comment/);
});

test('formatMarkdown: resume listas longas de arquivos', () => {
  const files = ['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts', 'src/e.ts'];
  const first = validResponse();
  const second = validResponse({
    answers: {
      security: { type: 'noul', noul: 0.1 },
      correctness: { type: 'noul', noul: 0.1 },
      tests: { type: 'noul', noul: 0.1 },
      severity: { type: 'score', score: 1 },
      recommendation: { type: 'choice', choice: 'approve' },
    },
  });
  const plan = planOf({
    chunks: [
      { text: '', files },
      { text: '', files: ['src/z.ts'] },
    ],
    files: [...files, 'src/z.ts'],
  });
  const chunks: ChunkReview[] = [
    { index: 1, files, response: first, summary: summarize(first) },
    { index: 2, files: ['src/z.ts'], response: second, summary: summarize(second) },
  ];
  const markdown = formatMarkdown(aggregateOf(combineResponses([first, second]), plan, chunks));
  assert.match(markdown, /src\/a\.ts, src\/b\.ts, src\/c\.ts, src\/d\.ts, \(\+1\)/);
});

test('formatMarkdown: escapa choice, modelo e nomes de arquivo não confiáveis', () => {
  const response = validResponse({
    model: 'm`](https://evil)',
    answers: {
      security: { type: 'noul', noul: 0.1 },
      correctness: { type: 'noul', noul: 0.1 },
      tests: { type: 'noul', noul: 0.1 },
      severity: { type: 'score', score: 1 },
      recommendation: { type: 'choice', choice: '[x](https://evil)' },
    },
  });
  const files = ['src/x](https://evil).ts', 'src/b.ts', 'src/c.ts'];
  const plan = planOf({
    chunks: [
      { text: '', files },
      { text: '', files: ['src/z.ts'] },
    ],
    files: [...files, 'src/z.ts'],
  });
  const second = validResponse();
  const chunks: ChunkReview[] = [
    { index: 1, files, response, summary: summarize(response) },
    { index: 2, files: ['src/z.ts'], response: second, summary: summarize(second) },
  ];
  const markdown = formatMarkdown(aggregateOf(response, plan, chunks));
  assert.match(markdown, /\\\[x\\\]\(https:\/\/evil\)/);
  assert.doesNotMatch(markdown, /(^|[^\\])\[x\]\(https:\/\/evil\)/);
  assert.doesNotMatch(markdown, /m`?\]\(https:\/\/evil\)/);
  assert.match(markdown, /src\/x\\\]\(https:\/\/evil\)\.ts/);
});

test('formatMarkdown e formatJson: expõem fallback de modelo', () => {
  const response = validResponse();
  const aggregate = aggregateOf(response);
  aggregate.meta = {
    primary: 'jev-1.13-free',
    attempted: ['jev-1.13-free', 'jev-1.14'],
    fallbackUsed: true,
  };
  const markdown = formatMarkdown(aggregate);
  assert.match(markdown, /Fallback de modelo.*jev-1\.13-free.*jev-1\.14/);
  const json = JSON.parse(formatJson(aggregate)) as {
    models: { primary: string; attempted: string[]; fallbackUsed: boolean };
  };
  assert.equal(json.models.primary, 'jev-1.13-free');
  assert.equal(json.models.fallbackUsed, true);
});

test('formatJson: inclui chunks e resumo do diff, sem o state', () => {
  const response = validResponse();
  const json = JSON.parse(
    formatJson(
      aggregateOf(
        response,
        planOf({
          chunks: [{ text: 'SEGREDO', files: ['a'] }],
          files: ['a'],
          omitted: 1,
          omittedSensitive: 1,
        }),
      ),
    ),
  ) as {
    model: string;
    verdict: string;
    chunks: Array<{ index: number; files: string[] }>;
    diff: {
      files: string[];
      omitted: number;
      omittedDocs: number;
      omittedSensitive: number;
      chunks: number;
    };
  };
  assert.equal(json.model, 'jev-1.13-free');
  assert.equal(json.verdict, 'approve');
  assert.deepEqual(json.diff.files, ['a']);
  assert.equal(json.diff.omitted, 1);
  assert.equal(json.diff.omittedSensitive, 1);
  assert.equal(json.diff.chunks, 1);
  assert.deepEqual(json.chunks[0].files, ['a']);
  assert.equal(JSON.stringify(json).includes('SEGREDO'), false);
});

test('parseArgs: defaults', () => {
  const options = parseArgs([]);
  assert.equal(options.base, 'origin/main');
  assert.equal(options.head, 'HEAD');
  assert.equal(options.repo, '.');
  assert.equal(options.model, 'jev-1.13-free');
  assert.equal(options.maxDiffChars, DEFAULT_MAX_DIFF_CHARS);
  assert.equal(options.jsonOutput, undefined);
  assert.equal(options.format, 'markdown');
  assert.equal(options.workingTree, false);
  assert.equal(options.failOnFindings, false);
  assert.equal(options.failOn, 'none');
  assert.deepEqual(options.fallbackModels, ['jev-1.14', 'jev-1.13']);
  assert.equal(options.noFallback, false);
  assert.equal(options.allowInsecureEndpoint, false);
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
    '--json-output',
    'out.json',
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
  assert.equal(options.jsonOutput, 'out.json');
  assert.equal(options.workingTree, true);
  assert.equal(options.failOnFindings, true);
  assert.equal(options.requireKey, true);
  assert.equal(options.dryRun, true);
});

test('parseArgs: fallback, fail-on e endpoint inseguro', () => {
  const options = parseArgs([
    '--fallback-model',
    'jev-1.14',
    '--fallback-model=jev-1.13',
    '--fail-on',
    'block',
    '--allow-insecure-endpoint',
  ]);
  assert.deepEqual(options.fallbackModels, ['jev-1.14', 'jev-1.13']);
  assert.equal(options.failOn, 'block');
  assert.equal(options.allowInsecureEndpoint, true);

  const noFallback = parseArgs(['--no-fallback']);
  assert.equal(noFallback.noFallback, true);
  assert.deepEqual(noFallback.fallbackModels, []);

  assert.throws(() => parseArgs(['--fail-on', 'maybe']), /--fail-on/);
  assert.throws(() => parseArgs(['--no-fallback=1']), /n\u00e3o aceita valor/);
});

test('parseArgs: --fallback-model substitui o default', () => {
  const options = parseArgs(['--fallback-model', 'custom-model']);
  assert.deepEqual(options.fallbackModels, ['custom-model']);
});

test('isHttpsEndpoint: s\u00f3 aceita https v\u00e1lido', () => {
  assert.equal(isHttpsEndpoint('https://example.test/v1'), true);
  assert.equal(isHttpsEndpoint('http://localhost:8080'), false);
  assert.equal(isHttpsEndpoint('not a url'), false);
});

test('isRetryableModelError: classifica falhas de modelo', () => {
  assert.equal(isRetryableModelError(new JevApiError('HTTP 429: rate limit', 429)), true);
  assert.equal(isRetryableModelError(new JevApiError('HTTP 503: down', 503)), true);
  assert.equal(isRetryableModelError(new JevApiError('HTTP 400: unknown model', 400)), true);
  assert.equal(isRetryableModelError(new JevApiError('HTTP 400: max_tokens_exceeded', 400)), false);
  assert.equal(isRetryableModelError(new JevApiError('HTTP 401: nope', 401)), false);
  assert.equal(isRetryableModelError(new JevApiError('timeout após 60000ms')), true);
  assert.equal(isRetryableModelError(new Error('falha de rede')), false);
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
      diff: { files: string[]; chunks: number };
      chunks: Array<{ files: string[]; state: string; chars: number }>;
      questions: Record<string, unknown>;
    };
    assert.equal(payload.model, 'jev-1.13-free');
    assert.deepEqual(payload.diff.files, ['src/users.ts']);
    assert.equal(payload.diff.chunks, 1);
    assert.deepEqual(payload.chunks[0].files, ['src/users.ts']);
    assert.match(payload.chunks[0].state, /Arquivos revisados: 1/);
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

test('main: fallback de modelo em erro retryable', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const models: string[] = [];
    let calls = 0;
    const fetchImpl: FetchLike = async (_url, init) => {
      const payload = JSON.parse(init.body) as { model: string };
      models.push(payload.model);
      calls++;
      if (calls === 1) return fakeResponse({ error: 'rate limit' }, false, 429);
      return fakeResponse(validResponse({ model: payload.model }));
    };
    const result = await runMain(['--diff-file', file, '--json-output', 'out.json'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl,
    });
    assert.equal(result.code, 0);
    assert.deepEqual(models, ['jev-1.13-free', 'jev-1.14']);
    assert.match(result.err, /tentando jev-1\.14/);
    const json = JSON.parse(fs.readFileSync(path.join(dir, 'out.json'), 'utf8')) as {
      models: { primary: string; attempted: string[]; fallbackUsed: boolean };
    };
    assert.equal(json.models.primary, 'jev-1.13-free');
    assert.deepEqual(json.models.attempted, ['jev-1.13-free', 'jev-1.14']);
    assert.equal(json.models.fallbackUsed, true);
  });
});

test('main: fallback é sticky entre blocos', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(
      dir,
      ['a', 'b'].map((name) => diffFor(`src/${name}.ts`, 'x'.repeat(120))).join(''),
    );
    const models: string[] = [];
    let calls = 0;
    const fetchImpl: FetchLike = async (_url, init) => {
      const payload = JSON.parse(init.body) as { model: string };
      models.push(payload.model);
      calls++;
      if (calls === 1) return fakeResponse({ error: 'rate limit' }, false, 429);
      return fakeResponse(validResponse({ model: payload.model }));
    };
    const result = await runMain(['--diff-file', file, '--max-diff-chars', '300'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl,
    });
    assert.equal(result.code, 0);
    assert.deepEqual(models, ['jev-1.13-free', 'jev-1.14', 'jev-1.14']);
  });
});

test('main: --no-fallback não troca de modelo', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    let calls = 0;
    const result = await runMain(['--diff-file', file, '--no-fallback'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: async () => {
        calls++;
        return fakeResponse({}, false, 429);
      },
    });
    assert.equal(result.code, 1);
    assert.equal(calls, 1);
    assert.match(result.err, /HTTP 429/);
  });
});

test('main: --fail-on block só falha em block', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const blocking = validResponse({
      answers: {
        security: { type: 'noul', noul: 0.9 },
        correctness: { type: 'noul', noul: 0.1 },
        tests: { type: 'noul', noul: 0.1 },
        severity: { type: 'score', score: 2 },
        recommendation: { type: 'choice', choice: 'block' },
      },
    });
    const blockingRun = await runMain(['--diff-file', file, '--fail-on', 'block'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(blocking),
    });
    assert.equal(blockingRun.code, 1);

    const passingRun = await runMain(['--diff-file', file, '--fail-on', 'block'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(validResponse()),
    });
    assert.equal(passingRun.code, 0);
  });
});

test('main: --fail-on comment falha em comment e block', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const commenting = validResponse({
      answers: {
        security: { type: 'noul', noul: 0.1 },
        correctness: { type: 'noul', noul: 0.1 },
        tests: { type: 'noul', noul: 0.8 },
        severity: { type: 'score', score: 1.5 },
        recommendation: { type: 'choice', choice: 'comment' },
      },
    });
    const result = await runMain(['--diff-file', file, '--fail-on', 'comment'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(commenting),
    });
    assert.equal(result.code, 1);

    const approve = await runMain(['--diff-file', file, '--fail-on', 'comment'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(validResponse()),
    });
    assert.equal(approve.code, 0);
  });
});

test('main: endpoint http é recusado sem opt-in', async () => {
  const rejected = await runMain(['--endpoint', 'http://localhost:8080', '--diff-file', 'x'], {
    env: { OPENCODE_API_KEY: 'k' },
    readFile: () => SAMPLE_DIFF,
  });
  assert.equal(rejected.code, 2);
  assert.match(rejected.err, /HTTPS/);
});

test('main: --allow-insecure-endpoint libera proxy local', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const result = await runMain(
      [
        '--endpoint',
        'http://localhost:8080',
        '--allow-insecure-endpoint',
        '--diff-file',
        file,
        '--dry-run',
      ],
      {
        env: { OPENCODE_API_KEY: 'k' },
        cwd: dir,
      },
    );
    assert.equal(result.code, 0);
  });
});

test('main: revisa todos os blocos e agrega', async () => {
  await withTempDirAsync(async (dir) => {
    const names = ['a', 'b', 'c'];
    const file = writeDiff(
      dir,
      names.map((name) => diffFor(`src/${name}.ts`, 'x'.repeat(120))).join(''),
    );
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls++;
      return fakeResponse(
        calls === 1
          ? validResponse()
          : validResponse({
              answers: {
                security: { type: 'noul', noul: 0.1 },
                correctness: { type: 'noul', noul: 0.1 },
                tests: { type: 'noul', noul: 0.1 },
                severity: { type: 'score', score: 2.5 },
                recommendation: { type: 'choice', choice: 'comment' },
              },
              usage: { input_tokens: 5, output_tokens: 1, cost: 0 },
            }),
      );
    };
    const result = await runMain(['--diff-file', file, '--max-diff-chars', '300'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl,
    });
    assert.equal(result.code, 0);
    assert.equal(calls, 3);
    assert.match(result.out, /Blocos:\*\* 3/);
    assert.match(result.out, /comment/);
    assert.match(result.out, /20 input \/ 4 output/);
    assert.match(result.err, /bloco 1\/3/);
  });
});

test('main: em max_tokens divide o bloco e reenvia', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    let calls = 0;
    const fetchImpl: FetchLike = async () => {
      calls++;
      return calls === 1 ? maxTokensResponse() : fakeResponse(validResponse());
    };
    const result = await runMain(['--diff-file', file], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl,
    });
    assert.equal(result.code, 0);
    assert.equal(calls, 3);
    assert.match(result.err, /dividindo em 2/);
    assert.match(result.out, /Jev review/);
  });
});

test('main: falha quando o bloco continua excedendo o limite', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const fetchImpl: FetchLike = async () => maxTokensResponse();
    const result = await runMain(['--diff-file', file], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl,
    });
    assert.equal(result.code, 1);
    assert.match(result.err, /max_tokens_exceeded/);
  });
});

test('main: --json-output escreve markdown e json', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const written: Array<{ file: string; data: string }> = [];
    const result = await runMain(
      ['--diff-file', file, '--output', 'report.md', '--json-output', 'report.json'],
      {
        env: { OPENCODE_API_KEY: 'k' },
        cwd: dir,
        fetchImpl: fakeFetch(validResponse()),
        writeFile: (target, data) => written.push({ file: target, data }),
      },
    );
    assert.equal(result.code, 0);
    assert.equal(result.out, '');
    assert.equal(written.length, 2);
    assert.equal(written[0].file, path.join(dir, 'report.md'));
    assert.match(written[0].data, /Jev review/);
    assert.equal(written[1].file, path.join(dir, 'report.json'));
    const json = JSON.parse(written[1].data) as { chunks: unknown[]; diff: { chunks: number } };
    assert.equal(json.chunks.length, 1);
    assert.equal(json.diff.chunks, 1);
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

test('main: erro da API não sobrescreve a causa quando json-output falha', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const result = await runMain(['--diff-file', file, '--json-output', 'report.json'], {
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

test('main: erro ao escrever json-output', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const result = await runMain(['--diff-file', file, '--json-output', 'report.json'], {
      env: { OPENCODE_API_KEY: 'k' },
      cwd: dir,
      fetchImpl: fakeFetch(validResponse()),
      writeFile: () => {
        throw new Error('disco cheio');
      },
    });
    assert.equal(result.code, 2);
    assert.match(result.err, /não foi possível escrever report\.json/);
  });
});

test('main: erro da API escreve json de erro', async () => {
  await withTempDirAsync(async (dir) => {
    const file = writeDiff(dir, SAMPLE_DIFF);
    const written: string[] = [];
    const result = await runMain(
      ['--diff-file', file, '--output', 'report.md', '--json-output', 'report.json'],
      {
        env: { OPENCODE_API_KEY: 'k' },
        cwd: dir,
        fetchImpl: fakeFetch({ error: 'unauthorized' }, false, 401),
        writeFile: (_target, data) => written.push(data),
      },
    );
    assert.equal(result.code, 1);
    assert.equal(written.length, 2);
    const json = JSON.parse(written[1]) as { error: string };
    assert.match(json.error, /HTTP 401/);
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
