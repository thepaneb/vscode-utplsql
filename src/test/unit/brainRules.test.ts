import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';

// Testa o script scripts/brain-rules.cjs (validador das regras do vault).
const { checkRules, parseFrontmatter } = require('../../../scripts/brain-rules.cjs') as {
  checkRules: (o?: Record<string, unknown>) => string[];
  parseFrontmatter: (t: string) => Record<string, unknown> | null;
  listRuleFiles: () => { name: string; content: string }[];
};

const rule = () =>
  [
    '---',
    'id: BR-TEST-001',
    'tipo: regra',
    'titulo: Exemplo',
    'dominio: teste',
    'status: ativo',
    'severidade: alta',
    'fonte: codigo',
    'implementacao: ["src/a.ts"]',
    'testes: []',
    'tags: ["teste"]',
    '---',
    '',
    '# x',
    '',
  ].join('\n');

const run = (content: string, extra: Record<string, unknown> = {}) =>
  checkRules({
    files: [{ name: 'r.md', content }],
    exists: () => true,
    prdIds: new Set(),
    ...extra,
  });

test('brain-rules: as regras atuais do vault são válidas', () => {
  assert.deepStrictEqual(checkRules(), []);
});

test('brain-rules: detecta implementacao inexistente', () => {
  const problems = run(rule(), { exists: () => false });
  assert.ok(problems.some((p) => p.includes('implementacao inexistente')));
});

test('brain-rules: detecta id duplicado', () => {
  const problems = checkRules({
    files: [
      { name: 'a.md', content: rule() },
      { name: 'b.md', content: rule() },
    ],
    exists: () => true,
    prdIds: new Set(),
  });
  assert.ok(problems.some((p) => p.includes('id duplicado')));
});

test('brain-rules: detecta id inválido', () => {
  const problems = run(rule().replace('BR-TEST-001', 'BR-test'));
  assert.ok(problems.some((p) => p.includes('id inválido')));
});

test('brain-rules: regra ativa sem implementacao', () => {
  const problems = run(rule().replace('implementacao: ["src/a.ts"]', 'implementacao: []'));
  assert.ok(problems.some((p) => p.includes('sem implementacao')));
});

test('brain-rules: detecta PRD inexistente', () => {
  const content = rule().replace('testes: []', 'testes: []\nprds: ["PRD-999"]');
  const problems = run(content, { prdIds: new Set(['1']) });
  assert.ok(problems.some((p) => p.includes('PRD inexistente')));
});

test('brain-rules: frontmatter ausente', () => {
  const problems = run('# sem frontmatter');
  assert.ok(problems.some((p) => p.includes('frontmatter ausente')));
});

test('brain-rules: parseFrontmatter lê listas e escalares', () => {
  const fm = parseFrontmatter(rule());
  assert.strictEqual(fm?.id, 'BR-TEST-001');
  assert.deepStrictEqual(fm?.implementacao, ['src/a.ts']);
  assert.deepStrictEqual(fm?.testes, []);
});
