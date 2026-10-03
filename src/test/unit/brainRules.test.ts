import './setup.js';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

// Testa o script scripts/brain-rules.cjs (validador das regras do vault).
const {
  checkRules,
  checkLayers,
  checkRequisitos,
  checkReferences,
  checkMencoesPrd,
  checkSecRegras,
  checkPrdRules,
  checkPrdRnfVinculo,
  declaredRnfExceptions,
  checkLayerConnections,
  hasSemVinculo,
  semverGte,
  parseFrontmatter,
  LAYERS,
} = require('../../../scripts/brain-rules.cjs') as {
  checkRules: (o?: Record<string, unknown>) => string[];
  checkLayers: (notes: { name: string; content: string }[]) => string[];
  checkRequisitos: (notes: { name: string; content: string }[]) => string[];
  checkMencoesPrd: (notes: { name: string; content: string }[], prdIds: Set<string>) => string[];
  checkSecRegras: (
    notes: { name: string; content: string }[],
    regraStatus: Map<string, string>,
  ) => string[];
  checkPrdRules: (notes: { name: string; content: string }[]) => string[];
  checkPrdRnfVinculo: (notes: { name: string; content: string }[]) => string[];
  declaredRnfExceptions: (content: string) => Set<string>;
  checkLayerConnections: (notes: { name: string; content: string }[]) => string[];
  hasSemVinculo: (content: string) => boolean;
  semverGte: (a: string, b: string) => boolean;
  checkReferences: (
    notes: { name: string; content: string }[],
    exists: (ref: string) => boolean,
    brIds?: Set<string>,
    checkLines?: boolean,
    relCatalog?: { noteBases: Set<string>; noteIds: Set<string>; adrIds: Set<string> },
  ) => string[];
  parseFrontmatter: (t: string) => Record<string, unknown> | null;
  listRuleFiles: () => { name: string; content: string }[];
  LAYERS: Record<string, { id: RegExp; required: string[] }>;
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

function writeFixture(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

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

test('brain-rules: valida todos os campos obrigatórios', () => {
  for (const key of ['id', 'titulo', 'dominio', 'status', 'severidade', 'fonte']) {
    const content = rule()
      .split('\n')
      .filter((line) => !line.startsWith(`${key}:`))
      .join('\n');
    assert.ok(
      run(content).some((problem) => problem.includes(`campo obrigatório ausente: ${key}`)),
      `deveria reportar ${key}`,
    );
  }
});

test('brain-rules: valida os enums de status, severidade e fonte', () => {
  const invalid = [
    ['status', 'status: ativo', 'status inválido'],
    ['severidade', 'severidade: alta', 'severidade inválida'],
    ['fonte', 'fonte: codigo', 'fonte inválida'],
  ] as const;
  for (const [field, marker, message] of invalid) {
    const problems = run(rule().replace(marker, `${field}: não-validado`));
    assert.ok(
      problems.some((problem) => problem.includes(message)),
      `deveria reportar ${field}`,
    );
  }
});

test('brain-rules: aceita todos os valores dos enums', () => {
  const values = {
    status: ['ativo', 'proposta', 'obsoleto', 'em_disputa'],
    severidade: ['critica', 'alta', 'media', 'baixa'],
    fonte: ['codigo', 'prd', 'stakeholder', 'convencao'],
  } as const;
  for (const [field, fieldValues] of Object.entries(values)) {
    for (const value of fieldValues) {
      const marker = field === 'status' ? 'status: ativo' : `${field}: ${fieldValues[0]}`;
      const problems = run(rule().replace(marker, `${field}: ${value}`));
      assert.deepStrictEqual(
        problems.filter((problem) => problem.includes(`${field} inválido`)),
        [],
        `${field}=${value}`,
      );
    }
  }
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

test('brain-rules: checkLayers aplica a matriz de campos de cada camada', () => {
  const ids: Record<string, string> = {
    seguranca: 'SEC-001',
    erro: 'ERR-001',
    padrao: 'PAT-001',
    nfr: 'NFR-001',
    entidade: 'ENT-001',
    glossario: 'GLOSS-001',
    'componente-terceiro': 'TPL-ORACLEDB',
    codigo: 'COD-oracleRunner.ts',
    teste: 'TST-oracleRunner.test.ts',
    locale: 'LOC-pt-br',
    pipeline: 'PIPE-ci',
    dependencia: 'DEP-oracledb',
  };
  const values: Record<string, string> = {
    id: '',
    titulo: 'Exemplo',
    dominio: 'teste',
    status: 'ativo',
    severidade: 'alta',
    codigo: 'E-001',
    arquivo: 'src/example.ts',
  };

  for (const [type, schema] of Object.entries(LAYERS)) {
    values.id = ids[type];
    for (const required of schema.required) {
      const lines = [
        `tipo: ${type}`,
        ...schema.required
          .filter((field) => field !== required)
          .map((field) => `${field}: ${values[field]}`),
      ];
      const problems = checkLayers([note(lines)]);
      assert.ok(
        problems.some((problem) => problem.includes(`campo obrigatório ausente: ${required}`)),
        `${type}/${required}`,
      );
    }
  }
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

test('brain-rules: checkReferences valida implementação, testes e regras', () => {
  const content = [
    '---',
    'tipo: wiki',
    'implementacao: ["src/falta.ts", "src/existe.ts:12"]',
    'testes: ["src/test/falta.ts"]',
    'regras: ["BR-EXISTE", "BR-FALTA"]',
    '---',
    '',
  ].join('\n');
  const problems = checkReferences(
    [{ name: 'wiki.md', content }],
    (ref) => ref === 'src/existe.ts',
    new Set(['BR-EXISTE']),
  );

  assert.ok(problems.some((p) => p.includes('implementacao inexistente: src/falta.ts')));
  assert.ok(problems.some((p) => p.includes('teste inexistente: src/test/falta.ts')));
  assert.ok(problems.some((p) => p.includes('regra referenciada inexistente: BR-FALTA')));
});

test('brain-rules: checkReferences não valida referências de uma regra duas vezes', () => {
  const content = note([
    'id: BR-REF-001',
    'tipo: regra',
    'implementacao: ["src/falta.ts"]',
    'testes: ["src/test/falta.ts"]',
  ]);
  assert.deepStrictEqual(
    checkReferences([content], () => false),
    [],
  );
});

test('brain-rules: checkReferences aceita regra quando não recebe catálogo', () => {
  const content = note(['tipo: wiki', 'regras: ["BR-CAT-001"]']);
  assert.deepStrictEqual(
    checkReferences([content], () => true),
    [],
  );
});

// ── relacionado / decisoes (evolução do grafo) ─────────────────────────

/** Catálogo do vault: basenames, ids e ids de ADR (frontmatter `adr`). */
function relCatalog(entries: { id?: string; adr?: string; base?: string }[]) {
  const noteBases = new Set(entries.map((e, i) => e.base ?? `n${i + 1}`));
  const noteIds = new Set<string>();
  const adrIds = new Set<string>();
  for (const e of entries) {
    if (e.id) noteIds.add(e.id);
    if (e.adr) adrIds.add(e.adr);
  }
  return { noteBases, noteIds, adrIds };
}

test('brain-rules: relacionado aponta para nota por wikilink', () => {
  const content = note(['tipo: nfr', 'relacionado: ["[[n2]]"]']);
  const problems = checkReferences([content], () => true, undefined, false, relCatalog([{}, {}]));
  assert.deepStrictEqual(problems, []);
});

test('brain-rules: relacionado aceita nome exato da nota e id do vault', () => {
  const content = note(['tipo: nfr', 'relacionado: ["n2", "NFR-002"]']);
  const problems = checkReferences(
    [content],
    () => true,
    undefined,
    false,
    relCatalog([{}, { id: 'NFR-002' }]),
  );
  assert.deepStrictEqual(problems, []);
});

test('brain-rules: relacionado quebrado é reportado', () => {
  const content = note(['tipo: nfr', 'relacionado: ["NAO-EXISTE"]']);
  const problems = checkReferences([content], () => true, undefined, false, relCatalog([{}, {}]));
  assert.ok(problems.some((p) => p.includes('relacionado inexistente: NAO-EXISTE')));
});

test('brain-rules: relacionado aceita id de ADR (campo adr)', () => {
  const content = note(['tipo: nfr', 'relacionado: ["ADR-001"]']);
  const problems = checkReferences(
    [content],
    () => true,
    undefined,
    false,
    relCatalog([{}, {}, { adr: 'ADR-001' }]),
  );
  assert.deepStrictEqual(problems, []);
});

test('brain-rules: relacionados/secaoRelacionada são aliases de relacionado', () => {
  const content = note(['tipo: nfr', 'secaoRelacionada: ["[[n2]]"]', 'relacionados: ["n1"]']);
  const problems = checkReferences([content], () => true, undefined, false, relCatalog([{}, {}]));
  assert.deepStrictEqual(problems, []);
});

test('brain-rules: sem catálogo a validação de relacionado é pulada', () => {
  const content = note(['tipo: nfr', 'relacionado: ["NAO-EXISTE"]']);
  assert.deepStrictEqual(
    checkReferences([content], () => true),
    [],
  );
});

test('brain-rules: decisoes aponta para decisão por id ou wikilink', () => {
  const content = note(['tipo: regra', 'decisoes: ["[[n3]]", "DEC-002"]']);
  const problems = checkReferences(
    [content],
    () => true,
    undefined,
    false,
    relCatalog([{}, {}, { id: 'DEC-002' }]),
  );
  assert.deepStrictEqual(problems, []);
});

test('brain-rules: decisao quebrada é reportada', () => {
  const content = note(['tipo: regra', 'decisoes: ["DEC-999"]']);
  const problems = checkReferences([content], () => true, undefined, false, relCatalog([{}, {}]));
  assert.ok(problems.some((p) => p.includes('decisao referenciada inexistente: DEC-999')));
});

test('brain-rules: erros aponta para ERR-* existente (id ou wikilink)', () => {
  const content = note(['tipo: regra', 'erros: ["ERR-001", "[[ERR-002 - Conexão recusada]]"]']);
  const problems = checkReferences(
    [content],
    () => true,
    undefined,
    false,
    relCatalog([{}, { id: 'ERR-001' }, { id: 'ERR-002', base: 'ERR-002 - Conexão recusada' }]),
  );
  assert.deepStrictEqual(problems, []);
});

test('brain-rules: erro referenciado inexistente é reportado', () => {
  const content = note(['tipo: regra', 'erros: ["ERR-999"]']);
  const problems = checkReferences([content], () => true, undefined, false, relCatalog([{}, {}]));
  assert.ok(problems.some((p) => p.includes('erro referenciado inexistente: ERR-999')));
});

test('brain-rules: origem 1:N aponta para as notas canônicas (id ou wikilink)', () => {
  const content = note(['tipo: wiki', 'origem: ["[[n2]]", "BR-001"]']);
  const problems = checkReferences(
    [content],
    () => true,
    undefined,
    false,
    relCatalog([{}, {}, { id: 'BR-001' }]),
  );
  assert.deepStrictEqual(problems, []);
});

test('brain-rules: origem inexistente é reportada', () => {
  const content = note(['tipo: wiki', 'origem: ["NAO-EXISTE"]']);
  const problems = checkReferences([content], () => true, undefined, false, relCatalog([{}, {}]));
  assert.ok(problems.some((p) => p.includes('origem inexistente: NAO-EXISTE')));
});

test('brain-rules: menção PRD-NN no corpo aponta para PRD existente', () => {
  const prd = {
    name: '20-PRDs/prd-74-x.md',
    content: '---\ntipo: prd\nid: PRD-74\n---\n\nVer PRD-75 para detalhes.\n',
  };
  const outro = { name: '20-PRDs/prd-75-y.md', content: '---\ntipo: prd\nid: PRD-75\n---\n' };
  assert.deepStrictEqual(checkMencoesPrd([prd, outro], new Set(['PRD-74', 'PRD-75'])), []);
});

test('brain-rules: menção PRD-NN inexistente é reportada', () => {
  const prd = {
    name: '20-PRDs/prd-74-x.md',
    content: '---\ntipo: prd\nid: PRD-74\n---\n\nVer PRD-999.\n',
  };
  const problems = checkMencoesPrd([prd], new Set(['PRD-74']));
  assert.ok(problems.some((p) => p.includes('PRD-999') && p.includes('inexistente')));
});

test('brain-rules: menção ao próprio PRD e PRDs no code fence são ignoradas', () => {
  const prd = {
    name: '20-PRDs/prd-74-x.md',
    content:
      '---\ntipo: prd\nid: PRD-74\n---\n\nPRD-74 falando de si.\n\n```\nPRD-999 em fence\n```\n',
  };
  assert.deepStrictEqual(checkMencoesPrd([prd], new Set(['PRD-74'])), []);
});

// ── integridade SEC ↔ regras ───────────────────────────────────────────

test('brain-rules: SEC sem regras é reportada', () => {
  const sec = note([
    'id: SEC-001',
    'tipo: seguranca',
    'titulo: X',
    'dominio: d',
    'status: ativo',
    'severidade: alta',
    'regras: []',
  ]);
  const problems = checkSecRegras([sec], new Map());
  assert.ok(problems.some((p) => p.includes('n.md') && p.includes('sem regras')));
});

test('brain-rules: SEC apontando regra inexistente é reportada', () => {
  const sec = note(['id: SEC-001', 'tipo: seguranca', 'regras: ["BR-FALTA"]', 'status: ativo']);
  const problems = checkSecRegras([sec], new Map([['BR-OK', 'ativo']]));
  assert.ok(problems.some((p) => p.includes('BR-FALTA') && p.includes('inexistente')));
});

test('brain-rules: SEC apontando regra obsoleta é reportada', () => {
  const sec = note(['id: SEC-001', 'tipo: seguranca', 'regras: ["BR-VELHA"]', 'status: ativo']);
  const problems = checkSecRegras([sec], new Map([['BR-VELHA', 'obsoleto']]));
  assert.ok(problems.some((p) => p.includes('BR-VELHA') && p.includes('obsoleta')));
});

test('brain-rules: SEC válida com regra ativa passa', () => {
  const sec = note(['id: SEC-001', 'tipo: seguranca', 'regras: ["BR-OK"]', 'status: ativo']);
  assert.deepStrictEqual(checkSecRegras([sec], new Map([['BR-OK', 'ativo']])), []);
});

test('brain-rules: checkRules global valida relacionado do vault', () => {
  // Sem overrides, o global usa o vault real (catálogo construído das notas).
  assert.deepStrictEqual(checkRules(), []);
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
  const withoutRequirement = { name: 'r.md', content: '---\nrequisitos: ["PRD-74"]\n---\n' };
  assert.deepStrictEqual(checkRequisitos([prd, withoutRequirement]), []);
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

test('brain-rules: checkReferences cobre linhas e erro de leitura', () => {
  const content = note([
    'tipo: wiki',
    'implementacao: ["scripts:1"]',
    'testes: ["src/nao-existe.ts:1"]',
  ]);
  const problems = checkReferences([content], () => true, undefined, true);
  assert.ok(problems.some((p) => p.includes('implementacao inexistente: scripts:1')));
  assert.ok(problems.some((p) => p.includes('teste inexistente: src/nao-existe.ts:1')));
});

test('brain-rules: checkLines aceita referência sem número de linha', () => {
  const content = rule();
  assert.deepStrictEqual(run(content, { checkLines: true, exists: () => true }), []);
});

test('brain-rules.cjs: CLI valida as linhas em fixture isolado', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-brain-rules-'));
  const script = path.join(root, 'scripts', 'brain-rules.cjs');
  try {
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.copyFileSync(require.resolve('../../../scripts/brain-rules.cjs'), script);
    writeFixture(
      path.join(root, 'docs', 'brain', '15-Regras', 'BR-FIXTURE-001.md'),
      [
        '---',
        'id: BR-FIXTURE-001',
        'tipo: regra',
        'titulo: Fixture',
        'dominio: teste',
        'status: ativo',
        'severidade: alta',
        'fonte: codigo',
        'implementacao: ["src/a.ts:1"]',
        'testes: []',
        '---',
        '',
      ].join('\n'),
    );
    writeFixture(path.join(root, 'src', 'a.ts'), 'export const fixture = true;\n');

    const result = spawnSync(process.execPath, [script, '--check-lines'], { encoding: 'utf8' });
    assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.strictEqual(result.stderr, '');
    assert.match(result.stdout, /OK: 1 regras válidas \(linhas conferidas\)/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ── PRD ↔ regras (vínculo bidirecional) ────────────────────────────────

const prdNote = (lines: string[], body = '') => ({
  name: '20-PRDs/prd-81-x.md',
  content: ['---', ...lines, '---', '', body].join('\n'),
});

const ruleNote = (id: string, prds: string[], tipo = 'regra') => ({
  name: `${id}.md`,
  content: [
    '---',
    `id: ${id}`,
    `tipo: ${tipo}`,
    `prds: [${prds.map((p) => `"${p}"`).join(', ')}]`,
    '---',
    '',
  ].join('\n'),
});

test('brain-rules: semverGte compara versões', () => {
  assert.strictEqual(semverGte('0.14.0', '0.14.0'), true);
  assert.strictEqual(semverGte('0.14.1', '0.14.0'), true);
  assert.strictEqual(semverGte('0.15.0', '0.14.0'), true);
  assert.strictEqual(semverGte('1.0.0', '0.14.0'), true);
  assert.strictEqual(semverGte('0.13.0', '0.14.0'), false);
});

test('brain-rules: PRD concluída (>= baseline) sem o campo regras é reportada', () => {
  const prd = prdNote(['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"']);
  assert.ok(checkPrdRules([prd]).some((p) => p.includes("sem o campo 'regras'")));
});

test('brain-rules: PRD < baseline é ignorada', () => {
  const prd = prdNote(['tipo: prd', 'id: PRD-50', 'status: completed', 'versao: "0.13.0"']);
  assert.deepStrictEqual(checkPrdRules([prd]), []);
});

test('brain-rules: PRD não concluída não é cobrada', () => {
  const prd = prdNote(['tipo: prd', 'id: PRD-90', 'status: approved', 'versao: "0.15.0"']);
  assert.deepStrictEqual(checkPrdRules([prd]), []);
});

test('brain-rules: PRD concluída sem regras e sem a seção de impacto é reportada', () => {
  const prd = prdNote([
    'tipo: prd',
    'id: PRD-81',
    'status: completed',
    'versao: "0.14.0"',
    'regras: []',
  ]);
  assert.ok(checkPrdRules([prd]).some((p) => p.includes('sem a seção')));
});

test('brain-rules: PRD sem regras mas com a seção de impacto passa', () => {
  const prd = prdNote(
    ['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"', 'regras: []'],
    '## Impacto no cérebro\n\nnenhuma\n',
  );
  assert.deepStrictEqual(checkPrdRules([prd]), []);
});

test('brain-rules: seção de impacto sem a confirmação nenhuma é reportada', () => {
  const prd = prdNote(
    ['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"', 'regras: []'],
    '## Impacto no cérebro\n\n{preencher}\n',
  );
  assert.ok(checkPrdRules([prd]).some((p) => p.includes("confirmação 'nenhuma'")));
});

test('brain-rules: seção de impacto numerada (## 12. …) é aceita', () => {
  const prd = prdNote(
    ['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"', 'regras: []'],
    '## 12. Impacto no cérebro\n\nnenhuma\n',
  );
  assert.deepStrictEqual(checkPrdRules([prd]), []);
});

test('brain-rules: vínculo bidirecional válido passa', () => {
  const prd = prdNote([
    'tipo: prd',
    'id: PRD-81',
    'status: completed',
    'versao: "0.14.0"',
    'regras: ["BR-CONN-016"]',
  ]);
  assert.deepStrictEqual(checkPrdRules([prd, ruleNote('BR-CONN-016', ['PRD-81'])]), []);
});

test('brain-rules: SEC também participa do vínculo com a PRD', () => {
  const prd = prdNote([
    'tipo: prd',
    'id: PRD-81',
    'status: completed',
    'versao: "0.14.0"',
    'regras: ["SEC-011"]',
  ]);
  assert.deepStrictEqual(checkPrdRules([prd, ruleNote('SEC-011', ['PRD-81'], 'seguranca')]), []);
});

test('brain-rules: regra citada na PRD que não lista a PRD é reportada', () => {
  const prd = prdNote([
    'tipo: prd',
    'id: PRD-81',
    'status: completed',
    'versao: "0.14.0"',
    'regras: ["BR-CONN-016"]',
  ]);
  assert.ok(
    checkPrdRules([prd, ruleNote('BR-CONN-016', [])]).some((p) => p.includes('não lista a PRD')),
  );
});

test('brain-rules: regra inexistente em regras: é reportada', () => {
  const prd = prdNote([
    'tipo: prd',
    'id: PRD-81',
    'status: completed',
    'versao: "0.14.0"',
    'regras: ["BR-NAO-EXISTE"]',
  ]);
  assert.ok(checkPrdRules([prd]).some((p) => p.includes('em regras: inexistente')));
});

test('brain-rules: regra que lista a PRD fora de regras: é reportada', () => {
  const prd = prdNote(
    ['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"', 'regras: []'],
    '## Impacto no cérebro\n\nnenhuma\n',
  );
  assert.ok(
    checkPrdRules([prd, ruleNote('BR-CONN-016', ['PRD-81'])]).some((p) =>
      p.includes('não está em regras:'),
    ),
  );
});

// ── RNF ↔ regra (rastreabilidade) ──────────────────────────────────────

const ruleWithReq = (id: string, requisitos: string[], tipo = 'regra') => ({
  name: `${id}.md`,
  content: [
    '---',
    `id: ${id}`,
    `tipo: ${tipo}`,
    `requisitos: [${requisitos.map((r) => `"${r}"`).join(', ')}]`,
    '---',
    '',
  ].join('\n'),
});

test('brain-rules: declaredRnfExceptions lê a linha "RNFs sem regra"', () => {
  const content = '## Impacto no cérebro\n\nRNFs sem regra: RNF3, RNF5 (processo)\n';
  assert.deepStrictEqual([...declaredRnfExceptions(content)].sort(), ['3', '5']);
});

test('brain-rules: declaredRnfExceptions sem a seção devolve vazio', () => {
  assert.deepStrictEqual([...declaredRnfExceptions('## Outra\n\ntexto\n')], []);
});

test('brain-rules: RNF vinculado a regra passa', () => {
  const prd = prdNote(
    ['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"', 'regras: ["BR-X-001"]'],
    '### Não-funcionais\n- RNF1 — Requisito coberto.\n',
  );
  assert.deepStrictEqual(checkPrdRnfVinculo([prd, ruleWithReq('BR-X-001', ['PRD-81/RNF1'])]), []);
});

test('brain-rules: RNF sem vínculo é reportado', () => {
  const prd = prdNote(
    ['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"', 'regras: ["BR-X-001"]'],
    '### Não-funcionais\n- RNF1 — Órfão.\n',
  );
  assert.ok(
    checkPrdRnfVinculo([prd, ruleWithReq('BR-X-001', [])]).some((p) =>
      p.includes('RNF1 sem vínculo em regra'),
    ),
  );
});

test('brain-rules: RNF declarado como exceção passa', () => {
  const prd = prdNote(
    ['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"', 'regras: []'],
    '### Não-funcionais\n- RNF3 — Processo.\n\n## Impacto no cérebro\n\nRNFs sem regra: RNF3\n',
  );
  assert.deepStrictEqual(checkPrdRnfVinculo([prd]), []);
});

test('brain-rules: RNF vinculado por SEC também conta', () => {
  const prd = prdNote(
    ['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"', 'regras: ["SEC-X-001"]'],
    '### Não-funcionais\n- RNF2 — Segredo.\n',
  );
  assert.deepStrictEqual(
    checkPrdRnfVinculo([prd, ruleWithReq('SEC-X-001', ['PRD-81/RNF2'], 'seguranca')]),
    [],
  );
});

test('brain-rules: PRD < baseline ou não concluída é ignorada na checagem de RNF', () => {
  const old = prdNote(
    ['tipo: prd', 'id: PRD-10', 'status: completed', 'versao: "0.13.0"'],
    '- RNF1 — Órfão.\n',
  );
  const approved = prdNote(
    ['tipo: prd', 'id: PRD-90', 'status: approved', 'versao: "0.15.0"'],
    '- RNF1 — Órfão.\n',
  );
  assert.deepStrictEqual(checkPrdRnfVinculo([old, approved]), []);
});

test('brain-rules: PRD sem RNFs declarados passa', () => {
  const prd = prdNote(
    ['tipo: prd', 'id: PRD-81', 'status: completed', 'versao: "0.14.0"', 'regras: []'],
    '### Não-funcionais\n- Nada aqui.\n',
  );
  assert.deepStrictEqual(checkPrdRnfVinculo([prd]), []);
});

// ── vínculo concreto por camada (NFR/TPL/ADR) ──────────────────────────

test('brain-rules: hasSemVinculo reconhece o marcador', () => {
  assert.strictEqual(hasSemVinculo('# X\n\nSem vínculo: motivo\n'), true);
  assert.strictEqual(hasSemVinculo('# X\n\nSem vinculo: motivo\n'), true);
  assert.strictEqual(hasSemVinculo('# X\n\ntexto\n'), false);
});

test('brain-rules: NFR ativo sem regras/requisitos é reportado', () => {
  const nfr = note(['id: NFR-001', 'tipo: nfr', 'titulo: X', 'dominio: d', 'status: ativo']);
  assert.ok(
    checkLayerConnections([nfr]).some((p) => p.includes('nfr ativo sem regras ou requisitos')),
  );
});

test('brain-rules: NFR ativo com regras ou requisitos passa', () => {
  const withRules = note([
    'id: NFR-001',
    'tipo: nfr',
    'titulo: X',
    'dominio: d',
    'status: ativo',
    'regras: ["BR-X-001"]',
  ]);
  const withReq = note([
    'id: NFR-002',
    'tipo: nfr',
    'titulo: Y',
    'dominio: d',
    'status: ativo',
    'requisitos: ["PRD-1/RF1"]',
  ]);
  assert.deepStrictEqual(checkLayerConnections([withRules, withReq]), []);
});

test('brain-rules: NFR não-ativo é ignorado', () => {
  const nfr = note(['id: NFR-001', 'tipo: nfr', 'titulo: X', 'dominio: d', 'status: proposta']);
  assert.deepStrictEqual(checkLayerConnections([nfr]), []);
});

test('brain-rules: TPL ativo sem implementacao é reportado', () => {
  const tpl = note([
    'id: TPL-X',
    'tipo: componente-terceiro',
    'titulo: X',
    'status: ativo',
    'implementacao: []',
  ]);
  assert.ok(checkLayerConnections([tpl]).some((p) => p.includes('componente-terceiro ativo sem')));
});

test('brain-rules: TPL ativo com implementacao passa', () => {
  const tpl = note([
    'id: TPL-X',
    'tipo: componente-terceiro',
    'titulo: X',
    'status: ativo',
    'implementacao: ["biome.json"]',
  ]);
  assert.deepStrictEqual(checkLayerConnections([tpl]), []);
});

test('brain-rules: ADR aceita sem regras é reportada; proposta é ignorada', () => {
  const aceita = note(['id: ADR-001', 'tipo: decisao', 'status: aceita']);
  const proposta = note(['id: ADR-002', 'tipo: decisao', 'status: proposta']);
  const problems = checkLayerConnections([aceita, proposta]);
  assert.strictEqual(problems.length, 1);
  assert.ok(problems[0].includes('ADR-001') || problems[0].includes('n.md'));
});

test('brain-rules: ADR aceita com regras passa', () => {
  const adr = note(['id: ADR-001', 'tipo: decisao', 'status: aceita', 'regras: ["BR-X-001"]']);
  assert.deepStrictEqual(checkLayerConnections([adr]), []);
});

test('brain-rules: marcador Sem vínculo dispensa o vínculo', () => {
  const tpl = note([
    'id: TPL-X',
    'tipo: componente-terceiro',
    'titulo: X',
    'status: ativo',
    'implementacao: []',
  ]);
  const withMarker = {
    name: 'm.md',
    content: `${tpl.content}\nSem vínculo: decisão de empacotamento.\n`,
  };
  assert.deepStrictEqual(checkLayerConnections([withMarker]), []);
});
