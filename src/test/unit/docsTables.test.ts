import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';

const brain = require('../../../scripts/brain.cjs') as {
  configure: (o?: { repo?: string; vault?: string }) => void;
  sync: () => number;
  genSettingsTable: () => string;
  genCommandsTable: () => string;
  jsonFromNote: (rel: string) => Record<string, unknown>;
  escapeCell: (v: unknown) => string;
  displayDefault: (v: unknown) => string;
  firstSentence: (v: unknown) => string;
};

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function fixture(): { root: string; vault: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-docs-tables-'));
  const vault = path.join(root, 'docs', 'brain');
  write(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      contributes: {
        configuration: {
          properties: {
            'demo.setting': {
              type: 'string',
              default: '',
              markdownDescription: 'Setting fallback. More text.',
            },
            'demo.mode': { type: 'string', default: 'off', markdownDescription: 'Mode fallback.' },
          },
        },
        commands: [
          { command: 'demo.run', title: '%nls.demoRun%' },
          { command: 'demo.other', title: '%nls.demoOther%' },
        ],
      },
    }),
  );
  write(
    path.join(root, 'package.nls.json'),
    JSON.stringify({ 'nls.demoRun': 'Run demo', 'nls.demoOther': 'Other demo' }),
  );
  write(
    path.join(vault, '10-Projeto', 'Referencia - descricoes de settings.md'),
    '---\ntipo: nota\n---\n\n```json\n' +
      JSON.stringify({
        'demo.setting': { default: '""', description: 'Short | desc' },
      }) +
      '\n```\n',
  );
  write(
    path.join(vault, '10-Projeto', 'Referencia - descricoes de comandos.md'),
    '---\ntipo: nota\n---\n\n```json\n' +
      JSON.stringify({
        'demo.run': { title: 'Run demo', description: 'Runs demo', shortcut: 'Ctrl+D' },
      }) +
      '\n```\n',
  );
  brain.configure({ repo: root, vault });
  return { root, vault };
}

function cleanup(root: string): void {
  brain.configure();
  fs.rmSync(root, { recursive: true, force: true });
}

test('docs-tables: settings usam sidecar, default do package e fallback de descrição', () => {
  const { root } = fixture();
  try {
    const table = brain.genSettingsTable();
    assert.match(table, /\| Setting \| Default \| Description \|/);
    assert.match(table, /\| `demo\.setting` \| `""` \| Short \\\| desc \|/);
    assert.match(table, /\| `demo\.mode` \| `off` \| Mode fallback\. \|/);
    assert.ok(table.indexOf('demo.mode') < table.indexOf('demo.setting'), 'ordem alfabética');
  } finally {
    cleanup(root);
  }
});

test('docs-tables: comandos incluem ID, título NLS, descrição e atalho', () => {
  const { root } = fixture();
  try {
    const table = brain.genCommandsTable();
    assert.match(table, /\| Command \| ID \| Description \| UI shortcut \|/);
    assert.match(table, /\| `Run demo` \| `demo\.run` \| Runs demo \| Ctrl\+D \|/);
    assert.match(table, /\| `Other demo` \| `demo\.other` \| — \| — \|/);
  } finally {
    cleanup(root);
  }
});

test('docs-tables: sem sidecar usa descrição/default do package e título cru', () => {
  const { root } = fixture();
  try {
    fs.rmSync(path.join(root, 'docs', 'brain', '10-Projeto'), { recursive: true, force: true });
    fs.writeFileSync(path.join(root, 'package.nls.json'), '{}', 'utf8');
    const settings = brain.genSettingsTable();
    assert.match(settings, /Setting fallback\./);
    assert.match(settings, /Mode fallback\./);
    const commands = brain.genCommandsTable();
    assert.match(commands, /\| `demo\.run` \| `demo\.run` \| — \| — \|/);
  } finally {
    cleanup(root);
  }
});

test('docs-tables: helpers de célula/default/frase', () => {
  assert.strictEqual(brain.displayDefault({ a: 1 }), '{"a":1}');
  assert.strictEqual(brain.displayDefault(true), 'true');
  assert.strictEqual(brain.firstSentence('A|B. C'), 'A|B.');
  assert.strictEqual(brain.escapeCell('a|b\nc'), 'a\\|b c');
  assert.strictEqual(brain.displayDefault(''), '""');
  assert.strictEqual(brain.displayDefault(['a']), '["a"]');
  assert.strictEqual(brain.displayDefault(undefined), '—');
  assert.strictEqual(brain.firstSentence('One. Two.'), 'One.');
  assert.strictEqual(brain.firstSentence('Sem ponto final'), 'Sem ponto final');
});

test('docs-tables: jsonFromNote ignora nota ausente/JSON inválido', () => {
  const { root } = fixture();
  try {
    assert.deepStrictEqual(brain.jsonFromNote('nao-existe.md'), {});
    write(path.join(root, 'docs', 'brain', 'x.md'), '```json\n{ invalido\n```\n');
    assert.deepStrictEqual(brain.jsonFromNote('x.md'), {});
  } finally {
    cleanup(root);
  }
});

test('docs-tables: sync injeta as tabelas entre marcadores e é idempotente', () => {
  const { root, vault } = fixture();
  try {
    const note = path.join(vault, '60-README', 'README (extensão).md');
    write(
      note,
      [
        '# README',
        '',
        '<!-- brain:auto:start:settings -->',
        '<!-- brain:auto:end -->',
        '',
        '<!-- brain:auto:start:commands -->',
        '<!-- brain:auto:end -->',
        '',
      ].join('\n'),
    );
    assert.strictEqual(brain.sync(), 0);
    const first = fs.readFileSync(note, 'utf8');
    assert.match(first, /`demo\.setting`/);
    assert.match(first, /`demo\.run`/);
    assert.strictEqual(brain.sync(), 0);
    assert.strictEqual(fs.readFileSync(note, 'utf8'), first);
  } finally {
    cleanup(root);
  }
});
