import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

const ROOT = path.resolve(__dirname, '../../..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');

function workflowFiles(): string[] {
  return fs
    .readdirSync(WORKFLOWS)
    .filter((f) => f.endsWith('.yml'))
    .sort();
}

function readWorkflow(file: string): string {
  return fs.readFileSync(path.join(WORKFLOWS, file), 'utf8');
}

test('workflows: toda action é pinada por SHA de 40 hex com comentário de versão', () => {
  for (const file of workflowFiles()) {
    const text = readWorkflow(file);
    const uses = [...text.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)].map((m) => m[1]);
    for (const ref of uses) {
      assert.match(ref, /^[^@\s]+@[0-9a-f]{40}$/, `${file}: action não pinada por SHA: ${ref}`);
      const line = text.split(/\r?\n/).find((l) => l.includes(`uses: ${ref}`));
      assert.match(line ?? '', /@[0-9a-f]{40}\s+#\s+v\d/, `${file}: falta comentário de versão`);
    }
  }
});

test('workflows: permissions no topo de todos os arquivos', () => {
  for (const file of workflowFiles()) {
    const text = readWorkflow(file);
    const beforeJobs = text.split(/^jobs:/m)[0];
    assert.match(beforeJobs, /^permissions:/m, `${file}: sem permissions no topo`);
    assert.ok(
      /contents:\s*read/.test(beforeJobs) || /permissions:\s*read-all/.test(beforeJobs),
      `${file}: sem contents: read/read-all no topo`,
    );
  }
});

test('publish: contents: write só no job publish; verify fica read', () => {
  const text = readWorkflow('publish.yml');
  const top = text.split(/^jobs:/m)[0];
  assert.match(top, /^permissions:/m);
  assert.match(top, /contents:\s*read/);

  const verify = text.split(/^ {2}verify:/m)[1]?.split(/^ {2}publish:/m)[0] ?? '';
  assert.doesNotMatch(verify, /contents:\s*write/, 'verify não pode ter contents: write');

  const publish = text.split(/^ {2}publish:/m)[1] ?? '';
  assert.match(publish, /permissions:/);
  assert.match(publish, /contents:\s*write/);
});

test('wiki: token nunca na URL; usa http.extraheader efêmero', () => {
  const text = readWorkflow('wiki.yml');
  assert.doesNotMatch(text, /https:\/\/x-access-token:[^@\s]+@/);
  assert.match(text, /GITHUB_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/);
  assert.match(text, /http\.extraheader/);
  assert.match(text, /git -C \/tmp\/wiki config http\.extraheader/);
});

test('ci: roda em push e PR da branch de integração release/**', () => {
  const text = readWorkflow('ci.yml');
  assert.match(text, /push:\s*\n\s*branches:\s*\[main, 'release\/\*\*'\]/);
  assert.match(text, /pull_request:\s*\n\s*branches:\s*\[main, 'release\/\*\*'\]/);
});

test('dependabot: npm + github-actions semanal, com grupos minor/patch', () => {
  const file = path.join(ROOT, '.github', 'dependabot.yml');
  assert.ok(fs.existsSync(file), 'dependabot.yml ausente');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /version:\s*2/);
  assert.match(text, /package-ecosystem:\s*npm/);
  assert.match(text, /package-ecosystem:\s*github-actions/);
  assert.match(text, /interval:\s*weekly/);
  assert.match(text, /groups:/);
  assert.match(text, /update-types:/);
  assert.match(text, /- minor/);
  assert.match(text, /- patch/);
});

test('audit: gate de produção no package.json, CI e publish', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  assert.match(pkg.scripts['audit:prod'], /--omit=dev/);
  assert.match(pkg.scripts['audit:prod'], /--audit-level=high/);
  assert.match(readWorkflow('ci.yml'), /npm run audit:prod/);
  assert.match(readWorkflow('publish.yml'), /npm run audit:prod/);
});

test('Scorecard: publica resultado, upload SARIF e permissões mínimas', () => {
  const text = readWorkflow('scorecard.yml');
  assert.match(text, /publish_results:\s*true/);
  assert.match(text, /persist-credentials:\s*false/);
  assert.match(text, /security-events:\s*write/);
  assert.match(text, /id-token:\s*write/);
  assert.match(text, /workflow_dispatch/);
  assert.match(text, /branch_protection_rule/);
  assert.match(text, /upload-sarif/);
  assert.match(text, /^permissions:\s*read-all/m);
});

test('CodeQL: decisão de manter o default setup (sem workflow commitado)', () => {
  assert.ok(
    !fs.existsSync(path.join(WORKFLOWS, 'codeql.yml')),
    'não criar codeql.yml enquanto o default setup estiver ativo',
  );
});
