import './setup.js';
import assert from 'node:assert';
import * as realFs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mock, test } from 'node:test';

// Cobre o `catch` de fonte ilegível em `applyCoverageFromXml` (results.ts):
// resolve o arquivo, mas a leitura do fonte falha → só StatementCoverage.
// Isolado porque mocka `node:fs` (delega o resto para o fs real).

mock.module('node:fs', {
  namedExports: {
    existsSync: realFs.existsSync,
    statSync: realFs.statSync,
    readFileSync: (p: unknown, enc: unknown) => {
      if (String(p).includes('app.sql')) throw new Error('EACCES read');
      return (realFs.readFileSync as (a: unknown, b: unknown) => string)(p, enc);
    },
  },
});

const COV_XML = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package name="pkg">
      <classes>
        <class name="app" filename="packages/app.sql">
          <lines>
            <line number="1" hits="1"/>
            <line number="2" hits="0"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;

test('applyCoverageFromXml: fonte ilegível não lança e mantém a cobertura por statement', async () => {
  const tmpDir = realFs.mkdtempSync(path.join(os.tmpdir(), 'cov-unread-'));
  const installDir = path.join(tmpDir, 'install', 'packages');
  realFs.mkdirSync(installDir, { recursive: true });
  realFs.writeFileSync(path.join(installDir, 'app.sql'), 'PACKAGE BODY app IS\nBEGIN NULL; END;');
  try {
    const { applyCoverageFromXml } = await import('../../results.js');
    let added = 0;
    const run = { appendOutput: () => {}, addCoverage: () => (added += 1) };
    const state = { setCoverage: () => {}, clearCoverage: () => {} };
    const folders = [{ uri: { fsPath: tmpDir }, name: 'tmp', index: 0 }];
    assert.doesNotThrow(() =>
      applyCoverageFromXml(
        COV_XML,
        'install',
        tmpDir,
        run as never,
        state as never,
        folders as never,
      ),
    );
    assert.strictEqual(added, 1);
  } finally {
    realFs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
