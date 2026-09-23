import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';

// Testa o script scripts/brain-rules.cjs (validador das regras do vault).
const { checkRules, checkLayers, checkRequisitos, parseFrontmatter } =
  require('../../../scripts/brain-rules.cjs') as {
    checkRules: (o?: Record<string, unknown>) => string[];
    checkLayers: (notes: { name: string; content: string }[]) => string[];
    checkRequisitos: (notes: { name: string; content: string }[]) => string[];
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

// ── camadas (SEC/ERR/PAT/...) ──────────────────────────────────────────

const note = (lines: string[]) => ({
  name: 'n.md',
  content: ['---', ...lines, '---', ''].join('\n'),
});

test('brain-rules: checkLayers aceita nota válida', () => {
  const notes = [note(['id: PAT-001', 'tipo: padrao', 'titulo: X', 'dominio: d', 'status: ativo'])];
  assert.deepStrictEqual(checkLayers(notes), []);
});

test('brain-rules: checkLayers detecta campo obrigatório ausente', () => {
  const notes = [
    note(['id: SEC-001', 'tipo: seguranca', 'titulo: X', 'dominio: d', 'status: ativo']),
  ];
  assert.ok(checkLayers(notes).some((p) => p.includes('severidade')));
});

test('brain-rules: checkLayers detecta id inválido e duplicado', () => {
  const bad = note([
    'id: SEC-1',
    'tipo: seguranca',
    'titulo: X',
    'dominio: d',
    'status: ativo',
    'severidade: alta',
  ]);
  assert.ok(checkLayers([bad]).some((p) => p.includes('id inválido')));
  const ok = note([
    'id: SEC-001',
    'tipo: seguranca',
    'titulo: X',
    'dominio: d',
    'status: ativo',
    'severidade: alta',
  ]);
  assert.ok(
    checkLayers([ok, { name: 'm.md', content: ok.content }]).some((p) =>
      p.includes('id duplicado'),
    ),
  );
});

// ── requisitos (RF/RNF) ────────────────────────────────────────────────

test('brain-rules: checkRequisitos valida PRD e RF/RNF', () => {
  const prd = {
    name: '20-PRDs/prd-74-x.md',
    content: '---\ntipo: prd\nid: PRD-74\n---\n\n### RF1 — Wrapper\n',
  };
  const ok = { name: 'r.md', content: '---\nrequisitos: ["PRD-74/RF1"]\n---\n' };
  assert.deepStrictEqual(checkRequisitos([prd, ok]), []);
  const badPrd = { name: 'r.md', content: '---\nrequisitos: ["PRD-99/RF1"]\n---\n' };
  assert.ok(checkRequisitos([prd, badPrd]).some((p) => p.includes('PRD inexistente')));
  const badRf = { name: 'r.md', content: '---\nrequisitos: ["PRD-74/RF9"]\n---\n' };
  assert.ok(checkRequisitos([prd, badRf]).some((p) => p.includes('requisito inexistente')));
});

// ── --check-lines ──────────────────────────────────────────────────────

test('brain-rules: checkLines detecta linha fora do arquivo', () => {
  const content = rule().replace(
    'implementacao: ["src/a.ts"]',
    'implementacao: ["package.json:999999"]',
  );
  assert.ok(
    run(content, { checkLines: true }).some((p) => p.includes('implementacao inexistente')),
  );
});

test('brain-rules: checkLines aceita linha válida', () => {
  const content = rule().replace(
    'implementacao: ["src/a.ts"]',
    'implementacao: ["package.json:1"]',
  );
  assert.deepStrictEqual(run(content, { checkLines: true }), []);
});
