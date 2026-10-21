import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  associationToGlob,
  buildLanguageGlobs,
  buildLanguageSelector,
  buildWatcherGlob,
  currentLanguageContributions,
  isPlsqlDocument,
  type LanguageContribution,
  matchesLanguageIdentity,
  workspaceAssociations,
} from '../../languageIdentity';
import {
  __resetConfigValues,
  __resetExtensions,
  __setConfigValue,
  __setExtensions,
} from '../vscode-stub';

const CONTRIB: LanguageContribution[] = [
  { id: 'plsql', extensions: ['.pks', '.pkb', '.tps', '.pls'] },
  { id: 'sql', extensions: ['.sql'] },
  { id: 'oracle-sql', extensions: ['.sql', '.vw'] },
  { id: 'plaintext', extensions: ['.txt'] },
];

test('associationToGlob: normaliza chaves de files.associations', () => {
  assert.strictEqual(associationToGlob('*.foo'), '**/*.foo');
  assert.strictEqual(associationToGlob('**/*.bar'), '**/*.bar');
  assert.strictEqual(associationToGlob('db/**/*.sql'), 'db/**/*.sql');
  assert.strictEqual(associationToGlob('   '), undefined);
});

test('buildLanguageGlobs: une contribuições, associações e o .pks canônico', () => {
  const globs = buildLanguageGlobs(['plsql', 'sql', 'oracle-sql'], CONTRIB, {
    '*.foo': 'sql',
    '*.txt': 'plaintext',
    'my-file.sql': 'sql',
  });
  assert.ok(globs.includes('**/*.pks'));
  assert.ok(globs.includes('**/*.tps'));
  assert.ok(globs.includes('**/*.sql'));
  assert.ok(globs.includes('**/*.vw'));
  assert.ok(globs.includes('**/*.foo'));
  assert.ok(globs.includes('**/my-file.sql'));
  assert.ok(!globs.includes('**/*.txt'), 'language ID não configurado não deve entrar');
  assert.deepStrictEqual([...globs], [...new Set(globs)].sort(), 'sem duplicatas e ordenado');
});

test('buildLanguageGlobs: setting restrito não deriva .sql', () => {
  const globs = buildLanguageGlobs(['plsql'], CONTRIB, { '*.foo': 'sql' });
  assert.ok(globs.includes('**/*.pks'));
  assert.ok(!globs.includes('**/*.sql'));
  assert.ok(!globs.includes('**/*.foo'));
});

test('matchesLanguageIdentity: languageId configurado vence', () => {
  assert.strictEqual(
    matchesLanguageIdentity('/x/a.sql', 'sql', ['plsql', 'sql'], CONTRIB, {}),
    true,
  );
  assert.strictEqual(
    matchesLanguageIdentity('/x/a.txt', 'plaintext', ['plsql', 'sql'], CONTRIB, {}),
    false,
  );
});

test('matchesLanguageIdentity: extensão contribuída e .pks sempre aceito', () => {
  assert.strictEqual(matchesLanguageIdentity('/x/a.tps', undefined, ['plsql'], CONTRIB, {}), true);
  assert.strictEqual(
    matchesLanguageIdentity('/x/a.pks', 'plaintext', ['plsql'], CONTRIB, {}),
    true,
    '.pks continua funcionando mesmo com languageId de outra extensão',
  );
  assert.strictEqual(
    matchesLanguageIdentity('C:\\x\\A.TPS', undefined, ['plsql'], CONTRIB, {}),
    true,
  );
});

test('matchesLanguageIdentity: associação de files.associations', () => {
  assert.strictEqual(
    matchesLanguageIdentity('/x/a.foo', undefined, ['sql'], CONTRIB, { '*.foo': 'sql' }),
    true,
  );
  assert.strictEqual(
    matchesLanguageIdentity('/x/a.foo', undefined, ['plsql'], CONTRIB, { '*.foo': 'sql' }),
    false,
  );
});

test('buildLanguageSelector: glob + language IDs sem duplicar', () => {
  const selector = buildLanguageSelector(['plsql', 'sql', 'oracle-sql'], CONTRIB, {
    '*.foo': 'sql',
  }) as Array<Record<string, string>>;
  assert.ok(selector.some((s) => s.scheme === 'file' && s.pattern === '**/*.pks'));
  assert.ok(selector.some((s) => s.language === 'plsql'));
  assert.ok(selector.some((s) => s.language === 'sql'));
  assert.ok(selector.some((s) => s.language === 'oracle-sql'));
  assert.ok(selector.some((s) => s.scheme === 'file' && s.pattern === '**/*.foo'));
  const keys = selector.map((s) => JSON.stringify(s));
  assert.deepStrictEqual(keys, [...new Set(keys)], 'seletor não deve ter filtros duplicados');
});

test('buildWatcherGlob: cobre as extensões efetivas', () => {
  const glob = buildWatcherGlob(['plsql', 'sql'], CONTRIB, { '*.foo': 'sql' });
  assert.match(glob, /^\*\*\/\*\.\{.+\}$/);
  for (const ext of ['pks', 'pkb', 'tps', 'sql', 'foo']) {
    assert.match(glob, new RegExp(`(?:[{,])${ext}(?:[,}])`), `${ext} deveria estar no watcher`);
  }
});

test('currentLanguageContributions: lê vscode.extensions.all', () => {
  __setExtensions([{ packageJSON: { contributes: { languages: CONTRIB } } }]);
  try {
    assert.deepStrictEqual(currentLanguageContributions(), CONTRIB);
  } finally {
    __resetExtensions();
  }
});

test('isPlsqlDocument: aceita languageId, .pks e associação', () => {
  assert.strictEqual(
    isPlsqlDocument({ fileName: '/x/a.pks', languageId: 'plaintext' }, ['plsql']),
    true,
  );
  assert.strictEqual(
    isPlsqlDocument({ fileName: '/x/a.tps', languageId: 'plsql' }, ['plsql']),
    true,
  );
  __setConfigValue('associations', { '*.foo': 'plsql' });
  try {
    assert.strictEqual(
      isPlsqlDocument({ fileName: '/x/a.foo', languageId: 'plaintext' }, ['plsql']),
      true,
    );
  } finally {
    __resetConfigValues();
  }
  assert.strictEqual(
    isPlsqlDocument({ fileName: '/x/a.foo', languageId: 'plaintext' }, ['plsql']),
    false,
  );
});

test('workspaceAssociations: lê files.associations', () => {
  __setConfigValue('associations', { '*.foo': 'sql' });
  try {
    assert.deepStrictEqual(workspaceAssociations(), { '*.foo': 'sql' });
  } finally {
    __resetConfigValues();
  }
});
