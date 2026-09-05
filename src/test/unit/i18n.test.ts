import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { de, en, es, fr, ja, missingCatalogKeys, ptBr, resolveLocale, t, zhCn } from '../../i18n';

test('resolveLocale: auto com editor pt -> pt-br', () => {
  assert.strictEqual(resolveLocale('auto', 'pt-BR'), 'pt-br');
  assert.strictEqual(resolveLocale('auto', 'pt-br'), 'pt-br');
  assert.strictEqual(resolveLocale('auto', 'pt'), 'pt-br');
});

test('resolveLocale: auto com editor en -> en', () => {
  assert.strictEqual(resolveLocale('auto', 'en'), 'en');
  assert.strictEqual(resolveLocale('auto', 'en-US'), 'en');
});

test('resolveLocale: auto detecta zh/es/ja/de/fr', () => {
  assert.strictEqual(resolveLocale('auto', 'zh-CN'), 'zh-cn');
  assert.strictEqual(resolveLocale('auto', 'zh-TW'), 'zh-cn');
  assert.strictEqual(resolveLocale('auto', 'es'), 'es');
  assert.strictEqual(resolveLocale('auto', 'es-419'), 'es');
  assert.strictEqual(resolveLocale('auto', 'ja'), 'ja');
  assert.strictEqual(resolveLocale('auto', 'de'), 'de');
  assert.strictEqual(resolveLocale('auto', 'fr'), 'fr');
});

test('resolveLocale: forçado ignora idioma do editor', () => {
  assert.strictEqual(resolveLocale('en', 'pt-BR'), 'en');
  assert.strictEqual(resolveLocale('pt-br', 'en'), 'pt-br');
  assert.strictEqual(resolveLocale('es', 'en'), 'es');
  assert.strictEqual(resolveLocale('zh-cn', 'en'), 'zh-cn');
  assert.strictEqual(resolveLocale('ja', 'en'), 'ja');
  assert.strictEqual(resolveLocale('de', 'en'), 'de');
  assert.strictEqual(resolveLocale('fr', 'en'), 'fr');
});

test('resolveLocale: valor invalido cai no auto', () => {
  assert.strictEqual(resolveLocale('xx', 'pt'), 'pt-br');
  assert.strictEqual(resolveLocale('xx', 'en'), 'en');
});

test('t: pt-br retorna a chave do catalogo pt', () => {
  assert.strictEqual(t('pt-br', 'ext.noConnection'), 'Conexão Oracle não informada.');
});

test('t: en retorna a traducao em ingles', () => {
  assert.strictEqual(t('en', 'ext.noConnection'), 'Oracle connection not set.');
});

test('t: novos idiomas retornam suas traduções', () => {
  assert.strictEqual(t('es', 'ext.noConnection'), 'Conexión Oracle no configurada.');
  assert.strictEqual(t('zh-cn', 'ext.noConnection'), '未配置 Oracle 连接。');
  assert.strictEqual(t('ja', 'ext.noConnection'), 'Oracle 接続が設定されていません。');
  assert.strictEqual(t('de', 'ext.noConnection'), 'Oracle-Verbindung nicht festgelegt.');
  assert.strictEqual(t('fr', 'ext.noConnection'), 'Connexion Oracle non définie.');
});

test('t: interpolacao parametrizada', () => {
  assert.strictEqual(t('pt-br', 'ext.profile.active', { name: 'DEV' }), 'Perfil ativo: DEV');
  assert.strictEqual(
    t('en', 'runner.oracleUnavailable', { error: 'ORA-1' }),
    'Oracle runner unavailable, falling back to CLI: ORA-1',
  );
  assert.strictEqual(
    t('zh-cn', 'runner.oracleUnavailable', { error: 'ORA-1' }),
    'Oracle 运行器不可用，回退到 CLI：ORA-1',
  );
});

test('t: chave ausente em en cai para pt-br', () => {
  const original = en['ext.noConnection'];
  try {
    delete (en as Record<string, string>)['ext.noConnection'];
    assert.strictEqual(t('en', 'ext.noConnection'), 'Conexão Oracle não informada.');
  } finally {
    (en as Record<string, string>)['ext.noConnection'] = original;
  }
});

test('t: chave inexistente retorna a propria chave (nunca lanca)', () => {
  assert.strictEqual(t('pt-br', 'nao.existe.xyz'), 'nao.existe.xyz');
  assert.strictEqual(t('en', 'nao.existe.xyz'), 'nao.existe.xyz');
  assert.strictEqual(t('ja', 'nao.existe.xyz'), 'nao.existe.xyz');
});

test('t: placeholder nao fornecido permanece literal', () => {
  assert.strictEqual(t('pt-br', 'ext.profile.active'), 'Perfil ativo: {name}');
});

test('paridade: todos os catálogos têm as mesmas chaves de pt-BR', () => {
  for (const [name, cat] of [
    ['en', en],
    ['es', es],
    ['zh-cn', zhCn],
    ['ja', ja],
    ['de', de],
    ['fr', fr],
  ] as const) {
    assert.deepStrictEqual(missingCatalogKeys(cat), [], `chaves ausentes em ${name}`);
  }
});

test('catalogos nao vazios', () => {
  for (const cat of [ptBr, en, es, zhCn, ja, de, fr]) {
    assert.ok(Object.keys(cat).length > 90);
  }
});
