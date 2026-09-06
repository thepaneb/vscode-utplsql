import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  bg,
  cs,
  de,
  el,
  en,
  enGb,
  es,
  fr,
  hu,
  id,
  it,
  ja,
  ko,
  missingCatalogKeys,
  pl,
  ptBr,
  resolveLocale,
  ro,
  ru,
  sr,
  t,
  th,
  tr,
  uk,
  vi,
  zhCn,
  zhTw,
} from '../../i18n';

const ALL_CATALOGS: [string, Record<string, string>][] = [
  ['en', en],
  ['en-gb', enGb],
  ['es', es],
  ['zh-cn', zhCn],
  ['zh-tw', zhTw],
  ['ja', ja],
  ['de', de],
  ['fr', fr],
  ['it', it],
  ['ko', ko],
  ['ru', ru],
  ['tr', tr],
  ['pl', pl],
  ['cs', cs],
  ['hu', hu],
  ['bg', bg],
  ['el', el],
  ['id', id],
  ['ro', ro],
  ['sr', sr],
  ['th', th],
  ['uk', uk],
  ['vi', vi],
];

test('resolveLocale: auto com editor pt -> pt-br', () => {
  assert.strictEqual(resolveLocale('auto', 'pt-BR'), 'pt-br');
  assert.strictEqual(resolveLocale('auto', 'pt-br'), 'pt-br');
  assert.strictEqual(resolveLocale('auto', 'pt'), 'pt-br');
});

test('resolveLocale: auto com editor en -> en', () => {
  assert.strictEqual(resolveLocale('auto', 'en'), 'en');
  assert.strictEqual(resolveLocale('auto', 'en-US'), 'en');
});

test('resolveLocale: auto detecta os idiomas suportados', () => {
  assert.strictEqual(resolveLocale('auto', 'zh-CN'), 'zh-cn');
  assert.strictEqual(resolveLocale('auto', 'zh-TW'), 'zh-tw');
  assert.strictEqual(resolveLocale('auto', 'zh-HK'), 'zh-tw');
  assert.strictEqual(resolveLocale('auto', 'es'), 'es');
  assert.strictEqual(resolveLocale('auto', 'ja'), 'ja');
  assert.strictEqual(resolveLocale('auto', 'de'), 'de');
  assert.strictEqual(resolveLocale('auto', 'fr'), 'fr');
  assert.strictEqual(resolveLocale('auto', 'it'), 'it');
  assert.strictEqual(resolveLocale('auto', 'ko'), 'ko');
  assert.strictEqual(resolveLocale('auto', 'ru'), 'ru');
  assert.strictEqual(resolveLocale('auto', 'tr'), 'tr');
  assert.strictEqual(resolveLocale('auto', 'pl'), 'pl');
  assert.strictEqual(resolveLocale('auto', 'cs'), 'cs');
  assert.strictEqual(resolveLocale('auto', 'hu'), 'hu');
  assert.strictEqual(resolveLocale('auto', 'bg'), 'bg');
  assert.strictEqual(resolveLocale('auto', 'el'), 'el');
  assert.strictEqual(resolveLocale('auto', 'id'), 'id');
  assert.strictEqual(resolveLocale('auto', 'ro'), 'ro');
  assert.strictEqual(resolveLocale('auto', 'sr'), 'sr');
  assert.strictEqual(resolveLocale('auto', 'th'), 'th');
  assert.strictEqual(resolveLocale('auto', 'uk'), 'uk');
  assert.strictEqual(resolveLocale('auto', 'vi'), 'vi');
  assert.strictEqual(resolveLocale('auto', 'en-GB'), 'en-gb');
});

test('resolveLocale: forçado ignora idioma do editor', () => {
  assert.strictEqual(resolveLocale('en', 'pt-BR'), 'en');
  assert.strictEqual(resolveLocale('pt-br', 'en'), 'pt-br');
  assert.strictEqual(resolveLocale('zh-tw', 'en'), 'zh-tw');
  assert.strictEqual(resolveLocale('it', 'en'), 'it');
  assert.strictEqual(resolveLocale('ko', 'en'), 'ko');
  assert.strictEqual(resolveLocale('ru', 'en'), 'ru');
  assert.strictEqual(resolveLocale('tr', 'en'), 'tr');
  assert.strictEqual(resolveLocale('pl', 'en'), 'pl');
  assert.strictEqual(resolveLocale('cs', 'en'), 'cs');
  assert.strictEqual(resolveLocale('hu', 'en'), 'hu');
  assert.strictEqual(resolveLocale('en-gb', 'en'), 'en-gb');
  assert.strictEqual(resolveLocale('bg', 'en'), 'bg');
  assert.strictEqual(resolveLocale('el', 'en'), 'el');
  assert.strictEqual(resolveLocale('id', 'en'), 'id');
  assert.strictEqual(resolveLocale('ro', 'en'), 'ro');
  assert.strictEqual(resolveLocale('sr', 'en'), 'sr');
  assert.strictEqual(resolveLocale('th', 'en'), 'th');
  assert.strictEqual(resolveLocale('uk', 'en'), 'uk');
  assert.strictEqual(resolveLocale('vi', 'en'), 'vi');
});

test('resolveLocale: valor invalido cai no auto', () => {
  assert.strictEqual(resolveLocale('xx', 'pt'), 'pt-br');
  assert.strictEqual(resolveLocale('xx', 'en'), 'en');
});

test('t: pt-br retorna a chave do catalogo pt', () => {
  assert.strictEqual(t('pt-br', 'ext.noConnection'), 'Conexão Oracle não informada.');
});

test('t: novos idiomas retornam suas traduções', () => {
  assert.strictEqual(t('es', 'ext.noConnection'), 'Conexión Oracle no configurada.');
  assert.strictEqual(t('zh-cn', 'ext.noConnection'), '未配置 Oracle 连接。');
  assert.strictEqual(t('zh-tw', 'ext.noConnection'), '尚未設定 Oracle 連線。');
  assert.strictEqual(t('ja', 'ext.noConnection'), 'Oracle 接続が設定されていません。');
  assert.strictEqual(t('de', 'ext.noConnection'), 'Oracle-Verbindung nicht festgelegt.');
  assert.strictEqual(t('fr', 'ext.noConnection'), 'Connexion Oracle non définie.');
  assert.strictEqual(t('it', 'ext.noConnection'), 'Connessione Oracle non impostata.');
  assert.strictEqual(t('ko', 'ext.noConnection'), 'Oracle 연결이 설정되지 않았습니다.');
  assert.strictEqual(t('ru', 'ext.noConnection'), 'Подключение Oracle не задано.');
  assert.strictEqual(t('tr', 'ext.noConnection'), 'Oracle bağlantısı ayarlanmamış.');
  assert.strictEqual(t('pl', 'ext.noConnection'), 'Połączenie Oracle nie ustawione.');
  assert.strictEqual(t('cs', 'ext.noConnection'), 'Připojení Oracle není nastaveno.');
  assert.strictEqual(t('hu', 'ext.noConnection'), 'Oracle-kapcsolat nincs beállítva.');
  assert.strictEqual(t('en-gb', 'ext.noConnection'), 'Oracle connection not set.');
  assert.strictEqual(t('bg', 'ext.noConnection'), 'Oracle връзката не е зададена.');
  assert.strictEqual(t('el', 'ext.noConnection'), 'Η σύνδεση Oracle δεν έχει οριστεί.');
  assert.strictEqual(t('id', 'ext.noConnection'), 'Koneksi Oracle belum diatur.');
  assert.strictEqual(t('ro', 'ext.noConnection'), 'Conexiunea Oracle nu este setată.');
  assert.strictEqual(t('sr', 'ext.noConnection'), 'Oracle веза није подешена.');
  assert.strictEqual(t('th', 'ext.noConnection'), 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Oracle');
  assert.strictEqual(t('uk', 'ext.noConnection'), "З'єднання Oracle не вказано.");
  assert.strictEqual(t('vi', 'ext.noConnection'), 'Chưa đặt kết nối Oracle.');
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
  assert.strictEqual(t('ja', 'nao.existe.xyz'), 'nao.existe.xyz');
  assert.strictEqual(t('ru', 'nao.existe.xyz'), 'nao.existe.xyz');
});

test('t: placeholder nao fornecido permanece literal', () => {
  assert.strictEqual(t('pt-br', 'ext.profile.active'), 'Perfil ativo: {name}');
});

test('paridade: todos os catálogos têm as mesmas chaves de pt-BR', () => {
  for (const [name, cat] of ALL_CATALOGS) {
    assert.deepStrictEqual(missingCatalogKeys(cat), [], `chaves ausentes em ${name}`);
  }
});

test('catalogos nao vazios', () => {
  for (const cat of [ptBr, ...ALL_CATALOGS.map(([, c]) => c)]) {
    assert.ok(Object.keys(cat).length > 90);
  }
});
