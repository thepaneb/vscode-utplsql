import './setup.js';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const {
  checkProfile,
  checkReleaseHistory,
  checkReleasePost,
  extractSection,
  floorLabel,
  formatNumber,
  main,
  parseArgs,
  settingsCount,
} = require('../../../scripts/linkedin-drift.cjs') as {
  checkProfile: (
    text: string,
    lang: string,
    metrics: { version: string; tests: number; prds: number },
    settings: number,
  ) => string[];
  checkReleaseHistory: (text: string, version: string) => string[];
  checkReleasePost: (releases: string[], version: string) => string[];
  extractSection: (text: string, heading: string) => string;
  floorLabel: (tests: number) => string;
  formatNumber: (value: number) => string;
  main: (argv?: string[], deps?: Record<string, unknown>) => Promise<number>;
  parseArgs: (argv: string[]) => { warn: boolean };
  settingsCount: (pkg: Record<string, unknown>) => number;
};

const METRICS = { version: '0.19.0', tests: 1579, coverageLines: 98.16, prds: 5 };

function packageWithSettings(count: number): Record<string, unknown> {
  const properties = Object.fromEntries(
    Array.from({ length: count }, (_, index) => [`demo.setting${index}`, {}]),
  );
  return { contributes: { configuration: { properties } } };
}

const PT_GOOD = `## 3. Sobre / About

Mantenho o projeto com [1.500+] testes, [~98%] de cobertura e 24 idiomas.

## 4. Experiência

[60] configurações; 0.19.0; [5] PRDs; Oracle 11g thick.

## 5. Competências
`;

const EN_GOOD = `## 3. About

I maintain the project with [1,500+] tests, [~98%] coverage and 24 languages.

## 4. Experience

[60] settings; 0.19.0; [5] PRDs; Oracle 11g thick.

## 5. Skills
`;

const PT_STALE = `## 3. Sobre / About

Mantenho o projeto com [1.200+] testes, [~98%] de cobertura e 24 idiomas.

## 4. Experiência

[53] configurações; 0.15.0; [7] PRDs; Oracle 12c R2.

## 5. Competências
`;

const README_GOOD = `## Notas por release

- **0.18.0** — antiga
- **0.19.0** — atual
`;

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

test('settingsCount: conta configuration como objeto e array', () => {
  assert.equal(settingsCount(packageWithSettings(60)), 60);
  assert.equal(
    settingsCount({
      contributes: {
        configuration: [{ properties: { a: {}, b: {} } }, { properties: { c: {} } }],
      },
    }),
    3,
  );
  assert.equal(settingsCount({}), 0);
});

test('formatNumber/floorLabel: usa separador de milhar pt-BR', () => {
  assert.equal(formatNumber(1579), '1.579');
  assert.equal(floorLabel(1579), '1.500+');
  assert.equal(floorLabel(2001), '2.000+');
});

test('extractSection: recorta até o próximo ##', () => {
  const text = '## 3. About\nconteudo\n## 4. Experience\nmais';
  assert.equal(extractSection(text, '## 3. About'), '\nconteudo');
  assert.equal(extractSection(text, '## 9. Nada'), '');
});

test('checkProfile: PT/EN atuais passam', () => {
  assert.deepEqual(checkProfile(PT_GOOD, 'pt', METRICS, 60), []);
  assert.deepEqual(checkProfile(EN_GOOD, 'en', METRICS, 60), []);
});

test('checkProfile: detecta números antigos e falta de 11g', () => {
  const problems = checkProfile(PT_STALE, 'pt', METRICS, 60);
  assert.ok(problems.some((problem) => problem.includes('1.200')));
  assert.ok(problems.some((problem) => problem.includes('53')));
  assert.ok(problems.some((problem) => problem.includes('0.15.0')));
  assert.ok(problems.some((problem) => problem.includes('11g')));
  assert.ok(problems.some((problem) => problem.includes('PRDs')));
});

test('checkProfile: seções ausentes e post antigo', () => {
  assert.ok(checkProfile('sem seções', 'pt', METRICS, 60).some((p) => p.includes('About')));
  const withOldPost = PT_GOOD.replace(
    '## 5. Competências',
    'Post do release 0.15.0\n## 5. Competências',
  );
  assert.ok(checkProfile(withOldPost, 'pt', METRICS, 60).some((p) => p.includes('0.15.0')));
  const aboutWithout24 = PT_GOOD.replace('24 idiomas', 'idiomas');
  assert.ok(checkProfile(aboutWithout24, 'pt', METRICS, 60).some((p) => p.includes('24')));
});

test('checkReleaseHistory: sem seção usa o texto inteiro', () => {
  assert.deepEqual(checkReleaseHistory('0.19.0', '0.19.0'), []);
  assert.deepEqual(checkReleaseHistory('nada', '0.19.0'), [
    'README: histórico de releases sem 0.19.0',
  ]);
});

test('checkReleaseHistory: exige a versão atual', () => {
  assert.deepEqual(checkReleaseHistory(README_GOOD, '0.19.0'), []);
  assert.deepEqual(checkReleaseHistory('## Notas por release\n- 0.18.0', '0.19.0'), [
    'README: histórico de releases sem 0.19.0',
  ]);
});

test('checkReleasePost: aceita release existente e avisa quando pendente', () => {
  assert.deepEqual(checkReleasePost(['11-release-v0.19.0.md'], '0.19.0'), []);
  assert.deepEqual(checkReleasePost(['10-release-v0.18.0.md'], '0.19.0'), [
    'releases/: post da 0.19.0 ainda não existe (pendente)',
  ]);
});

test('parseArgs: --check/--warn e erro', () => {
  assert.deepEqual(parseArgs([]), { warn: false });
  assert.deepEqual(parseArgs(['--warn']), { warn: true });
  assert.deepEqual(parseArgs(['--check']), { warn: false });
  assert.throws(() => parseArgs(['--nope']), /opção desconhecida/);
});

test('main: perfil atual passa', async () => {
  const result = await runMain([], {
    files: {
      metrics: JSON.stringify(METRICS),
      package: JSON.stringify(packageWithSettings(60)),
      pt: PT_GOOD,
      en: EN_GOOD,
      readme: README_GOOD,
    },
    releases: ['11-release-v0.19.0.md'],
  });
  assert.equal(result.code, 0);
  assert.match(result.out, /OK/);
});

test('main: drift falha e --warn não falha', async () => {
  const base = {
    files: {
      metrics: JSON.stringify(METRICS),
      package: JSON.stringify(packageWithSettings(60)),
      pt: PT_STALE,
      en: EN_GOOD,
      readme: README_GOOD,
    },
    releases: ['10-release-v0.18.0.md'],
  };
  assert.equal((await runMain([], base)).code, 1);
  assert.equal((await runMain(['--warn'], base)).code, 0);
});

test('main: sem docs/linkedin faz SKIP', async () => {
  const result = await runMain([], {
    linkedinDir: '/nope',
    exists: () => false,
  });
  assert.equal(result.code, 0);
  assert.match(result.out, /SKIP/);
});

test('main: opção inválida retorna 2', async () => {
  const result = await runMain(['--nope'], {
    files: {
      metrics: JSON.stringify(METRICS),
      package: JSON.stringify(packageWithSettings(60)),
      pt: PT_GOOD,
      en: EN_GOOD,
      readme: README_GOOD,
    },
    releases: ['11-release-v0.19.0.md'],
  });
  assert.equal(result.code, 2);
  assert.match(result.err, /opção desconhecida/);
});

test('main: lê arquivos reais do diretório local', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkedin-drift-'));
  try {
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify(METRICS));
    fs.writeFileSync(path.join(dir, 'perfil-ideal-pt.md'), PT_GOOD);
    fs.writeFileSync(path.join(dir, 'perfil-ideal-en.md'), EN_GOOD);
    fs.writeFileSync(path.join(dir, 'README.md'), README_GOOD);
    const result = await runMain([], {
      linkedinDir: dir,
      exists: () => true,
      releases: ['11-release-v0.19.0.md'],
    });
    assert.equal(result.code, 0);
    assert.match(result.out, /OK/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('main: métricas inválidas retornam 2', async () => {
  const result = await runMain([], {
    files: {
      metrics: '{',
      package: '{}',
      pt: '',
      en: '',
      readme: '',
    },
    releases: [],
  });
  assert.equal(result.code, 2);
  assert.match(result.err, /ERRO/);
});
