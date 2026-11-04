import './setup.js';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const {
  compareAbout,
  main,
  parseArgs,
  parseFrontmatter,
  readAboutNote,
  readToken,
  repoFromGit,
  requestJson,
  stripQuotes,
} = require('../../../scripts/github-about.cjs') as {
  compareAbout: (
    expected: { description: string; homepage: string; topics: string[] },
    actual: { description?: string; homepage?: string; topics?: string[] },
  ) => string[];
  main: (argv?: string[], deps?: Record<string, unknown>) => Promise<number>;
  parseArgs: (argv: string[]) => {
    check: boolean;
    apply: boolean;
    strict: boolean;
    repo: string;
    note: string;
  };
  parseFrontmatter: (text: string) => Record<string, unknown>;
  readAboutNote: (
    file: string,
    readFile?: (target: string, encoding: string) => string,
  ) => { description: string; homepage: string; topics: string[] };
  readToken: (
    env: Record<string, string>,
    readFile: (target: string, encoding: string) => string,
  ) => string;
  repoFromGit: (execFile: (file: string, args: string[], options: object) => string) => string;
  requestJson: (
    method: string,
    url: string,
    token?: string,
    body?: unknown,
  ) => Promise<{ status: number; data: unknown }>;
  stripQuotes: (value: string) => string;
};

const NOTE = `---
tipo: guia
descricao: "Descrição canônica"
homepage: "https://example.test/"
topics: [alpha, beta]
---

# About
`;

const EXPECTED = {
  description: 'Descrição canônica',
  homepage: 'https://example.test/',
  topics: ['alpha', 'beta'],
};

async function runMain(
  argv: string[],
  deps: Record<string, unknown>,
): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args: unknown[]) => out.push(args.join(' '));
  console.error = (...args: unknown[]) => err.push(args.join(' '));
  try {
    const code = await main(argv, deps);
    return { code, out: out.join('\n'), err: err.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test('stripQuotes: remove aspas simples/duplas e preserva texto', () => {
  assert.equal(stripQuotes('"abc"'), 'abc');
  assert.equal(stripQuotes("'abc'"), 'abc');
  assert.equal(stripQuotes('abc'), 'abc');
});

test('requestJson: GET com JSON, POST com body, corpo inválido e erro', async () => {
  const https = require('node:https') as {
    request: (url: string, options: Record<string, unknown>, cb: (res: unknown) => void) => unknown;
  };
  const original = https.request;
  let optionsSeen: Record<string, unknown> = {};
  let responseBody = '{"ok":true}';
  https.request = (_url, options, cb) => {
    optionsSeen = options;
    const res = new EventEmitter() as EventEmitter & {
      statusCode: number;
      setEncoding: () => void;
    };
    res.statusCode = 200;
    res.setEncoding = () => {};
    const req = new EventEmitter() as EventEmitter & {
      write: () => void;
      end: () => void;
      destroy: (error: Error) => void;
    };
    req.write = () => {};
    req.end = () => {
      cb(res);
      res.emit('data', responseBody);
      res.emit('end');
    };
    req.destroy = (error: Error) => req.emit('error', error);
    return req;
  };
  try {
    const result = await requestJson('POST', 'https://x', 'token', { a: 1 });
    assert.deepEqual(result, { status: 200, data: { ok: true } });
    assert.equal((optionsSeen.headers as Record<string, string>).Authorization, 'Bearer token');
    assert.equal(
      (optionsSeen.headers as Record<string, string>)['Content-Type'],
      'application/json',
    );

    responseBody = 'texto puro';
    const invalid = await requestJson('GET', 'https://x');
    assert.deepEqual(invalid, { status: 200, data: { message: 'texto puro' } });

    https.request = (_url, _options, cb) => {
      const res = new EventEmitter() as EventEmitter & {
        statusCode: number;
        setEncoding: () => void;
      };
      res.statusCode = 204;
      res.setEncoding = () => {};
      const req = new EventEmitter() as EventEmitter & {
        write: () => void;
        end: () => void;
        destroy: (error: Error) => void;
      };
      req.write = () => {};
      req.end = () => {
        cb(res);
        res.emit('end');
      };
      req.destroy = (error: Error) => req.emit('error', error);
      return req;
    };
    assert.deepEqual(await requestJson('GET', 'https://x'), { status: 204, data: null });

    https.request = () => {
      const req = new EventEmitter() as EventEmitter & {
        write: () => void;
        end: () => void;
        destroy: (error: Error) => void;
      };
      req.write = () => {};
      req.end = () => req.emit('timeout');
      req.destroy = (error: Error) => req.emit('error', error);
      return req;
    };
    await assert.rejects(() => requestJson('GET', 'https://x'), /timeout/);
  } finally {
    https.request = original;
  }
});

test('readAboutNote: usa readFile padrão', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'github-about-'));
  const file = path.join(dir, 'about.md');
  try {
    fs.writeFileSync(file, NOTE, 'utf8');
    assert.deepEqual(readAboutNote(file), EXPECTED);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('parseFrontmatter: lê descricao, homepage e topics', () => {
  const fields = parseFrontmatter(NOTE);
  assert.equal(fields.descricao, 'Descrição canônica');
  assert.equal(fields.homepage, 'https://example.test/');
  assert.deepEqual(fields.topics, ['alpha', 'beta']);
});

test('parseFrontmatter: sem frontmatter retorna objeto vazio', () => {
  assert.deepEqual(parseFrontmatter('# nada'), {});
});

test('readAboutNote: valida campos obrigatórios', () => {
  const note = readAboutNote('/note', () => NOTE);
  assert.deepEqual(note, EXPECTED);
  assert.throws(() => readAboutNote('/note', () => '---\ntipo: guia\n---\n'), /descricao/);
  assert.throws(() => readAboutNote('/note', () => '---\ndescricao: x\n---\n'), /homepage/);
  assert.throws(
    () => readAboutNote('/note', () => '---\ndescricao: x\nhomepage: y\n---\n'),
    /topics/,
  );
});

test('compareAbout: campos ausentes no GitHub viram problemas', () => {
  const problems = compareAbout(EXPECTED, {});
  assert.equal(problems.length, 3);
});

test('parseFrontmatter: topics vazio e valor sem aspas', () => {
  const fields = parseFrontmatter('---\ndescricao: x\nhomepage: y\ntopics: []\n---\n');
  assert.deepEqual(fields.topics, []);
  assert.equal(fields.descricao, 'x');
});

test('parseArgs: --check explícito', () => {
  assert.equal(parseArgs(['--check']).check, true);
  assert.equal(parseArgs(['--check']).apply, false);
});

test('compareAbout: alinhado não gera problemas', () => {
  assert.deepEqual(compareAbout(EXPECTED, EXPECTED), []);
});

test('compareAbout: detecta description, homepage e topics', () => {
  const problems = compareAbout(EXPECTED, {
    description: 'antiga',
    homepage: 'https://old.test/',
    topics: ['alpha', 'gamma'],
  });
  assert.equal(problems.length, 3);
  assert.ok(problems.some((problem) => problem.includes('description')));
  assert.ok(problems.some((problem) => problem.includes('homepage')));
  assert.ok(problems.some((problem) => problem.includes('topics')));
  assert.ok(problems.some((problem) => problem.includes('beta')));
  assert.ok(problems.some((problem) => problem.includes('gamma')));
});

test('readToken: env vence .env e strip de CR/quotes', () => {
  assert.equal(
    readToken({ GITHUB_TOKEN: 'env-token' }, () => 'GITHUB_TOKEN=file'),
    'env-token',
  );
  assert.equal(
    readToken({}, () => 'GITHUB_TOKEN="file-token"\r\n'),
    'file-token',
  );
  assert.equal(
    readToken({}, () => 'OUTRA=1\n'),
    '',
  );
  assert.equal(
    readToken({}, () => {
      throw new Error('ENOENT');
    }),
    '',
  );
});

test('repoFromGit: extrai owner/repo do remote', () => {
  assert.equal(
    repoFromGit(() => 'https://github.com/thepaneb/vscode-utplsql.git'),
    'thepaneb/vscode-utplsql',
  );
  assert.equal(
    repoFromGit(() => 'git@github.com:thepaneb/vscode-utplsql.git'),
    'thepaneb/vscode-utplsql',
  );
  assert.equal(
    repoFromGit(() => 'https://gitlab.com/x/y.git'),
    '',
  );
  assert.equal(
    repoFromGit(() => {
      throw new Error('sem remote');
    }),
    '',
  );
});

test('parseArgs: check/apply/strict/repo/note', () => {
  assert.deepEqual(parseArgs([]), { check: true, apply: false, strict: false, repo: '', note: '' });
  assert.deepEqual(parseArgs(['--apply', '--strict', '--repo', 'a/b', '--note', 'n']), {
    check: false,
    apply: true,
    strict: true,
    repo: 'a/b',
    note: 'n',
  });
  assert.throws(() => parseArgs(['--nope']), /opção desconhecida/);
});

test('main: alinhado retorna 0', async () => {
  const result = await runMain([], {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile: (target: string) => (target.endsWith('.env') ? 'GITHUB_TOKEN=t\n' : NOTE),
    request: async () => ({ status: 200, data: EXPECTED }),
  });
  assert.equal(result.code, 0);
  assert.match(result.out, /OK/);
});

test('main: drift retorna 1 e pede apply', async () => {
  const result = await runMain(['--check'], {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile: (target: string) => (target.endsWith('.env') ? 'GITHUB_TOKEN=t\n' : NOTE),
    request: async () => ({
      status: 200,
      data: { description: 'antiga', homepage: 'https://old/', topics: [] },
    }),
  });
  assert.equal(result.code, 1);
  assert.match(result.err, /DRIFT/);
  assert.match(result.err, /about:apply/);
});

test('main: --apply atualiza description/homepage e topics', async () => {
  const calls: Array<{ method: string; url: string; body?: unknown }> = [];
  const result = await runMain(['--apply'], {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile: (target: string) => (target.endsWith('.env') ? 'GITHUB_TOKEN=t\n' : NOTE),
    request: async (method: string, url: string, _token: string, body?: unknown) => {
      calls.push({ method, url, body });
      if (method === 'GET') {
        return {
          status: 200,
          data: { description: 'antiga', homepage: 'https://old/', topics: [] },
        };
      }
      return { status: 200, data: {} };
    },
  });
  assert.equal(result.code, 0);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[1].method, 'PATCH');
  assert.equal(calls[2].method, 'PUT');
  assert.deepEqual((calls[1].body as { description: string }).description, EXPECTED.description);
  assert.deepEqual((calls[2].body as { names: string[] }).names, EXPECTED.topics);
});

test('main: --apply sem token retorna 2', async () => {
  const result = await runMain(['--apply'], {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile: (target: string) => (target.endsWith('.env') ? '' : NOTE),
    request: async () => ({
      status: 200,
      data: { description: 'antiga', homepage: 'https://old/', topics: [] },
    }),
  });
  assert.equal(result.code, 2);
  assert.match(result.err, /GITHUB_TOKEN/);
});

test('main: falha de API é aviso (0) ou erro em --strict', async () => {
  const base = {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile: (target: string) => (target.endsWith('.env') ? 'GITHUB_TOKEN=t\n' : NOTE),
    request: async () => {
      throw new Error('sem rede');
    },
  };
  assert.equal((await runMain([], base)).code, 0);
  assert.equal((await runMain(['--strict'], base)).code, 1);
});

test('main: nota inválida e repositório ausente retornam 2', async () => {
  const invalid = await runMain([], {
    env: {},
    readFile: () => 'sem frontmatter',
    request: async () => ({ status: 200, data: EXPECTED }),
  });
  assert.equal(invalid.code, 2);

  const missingRepo = await runMain([], {
    env: {},
    readFile: (target: string) => (target.endsWith('.env') ? 'GITHUB_TOKEN=t\n' : NOTE),
    execFile: () => {
      throw new Error('sem remote');
    },
    request: async () => ({ status: 200, data: EXPECTED }),
  });
  assert.equal(missingRepo.code, 2);
});

test('main: API 500 é aviso/erro strict', async () => {
  const base = {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile: (target: string) => (target.endsWith('.env') ? 'GITHUB_TOKEN=t\n' : NOTE),
    request: async () => ({ status: 500, data: {} }),
  };
  assert.equal((await runMain([], base)).code, 0);
  assert.equal((await runMain(['--strict'], base)).code, 1);
});

test('main: --apply falha no PATCH e nos topics', async () => {
  const readFile = (target: string) => (target.endsWith('.env') ? 'GITHUB_TOKEN=t\n' : NOTE);
  const patchFail = await runMain(['--apply'], {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile,
    request: async (method: string) => {
      if (method === 'GET') {
        return {
          status: 200,
          data: { description: 'antiga', homepage: 'https://old/', topics: [] },
        };
      }
      return { status: 500, data: {} };
    },
  });
  assert.equal(patchFail.code, 1);

  const topicsFail = await runMain(['--apply'], {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile,
    request: async (method: string) => {
      if (method === 'GET') {
        return {
          status: 200,
          data: { description: 'antiga', homepage: 'https://old/', topics: [] },
        };
      }
      return { status: method === 'PUT' ? 500 : 200, data: {} };
    },
  });
  assert.equal(topicsFail.code, 1);
});

test('main: resposta 200 sem data vira drift', async () => {
  const result = await runMain([], {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile: (target: string) => (target.endsWith('.env') ? 'GITHUB_TOKEN=t\n' : NOTE),
    request: async () => ({ status: 200, data: null }),
  });
  assert.equal(result.code, 1);
});

test('main: opção inválida retorna 2', async () => {
  const result = await runMain(['--nope'], {
    env: { GITHUB_REPOSITORY: 'a/b' },
    readFile: () => NOTE,
    request: async () => ({ status: 200, data: EXPECTED }),
  });
  assert.equal(result.code, 2);
  assert.match(result.err, /opção desconhecida/);
});
