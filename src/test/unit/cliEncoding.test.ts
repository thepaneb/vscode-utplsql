import assert from 'node:assert';
import { test } from 'node:test';
import { decodeCliBuffer, decodeWindows, isUtf8, parseRegCodePage } from '../../cliEncoding';

const CP850 = { acp: 1252, oemcp: 850 };

test('isUtf8: utf8 valido', () => {
  assert.ok(isUtf8(Buffer.from('não', 'utf8')));
  assert.ok(isUtf8(Buffer.from('ascii puro')));
});

test('isUtf8: cp850 e cp1252 nao sao utf8', () => {
  assert.ok(!isUtf8(Buffer.from([0x6e, 0xc6, 0x6f])));
  assert.ok(!isUtf8(Buffer.from([0x6e, 0xe3, 0x6f])));
});

test('decodeCliBuffer: utf8 passa direto', () => {
  assert.strictEqual(decodeCliBuffer(Buffer.from('não', 'utf8'), CP850), 'não');
});

test('decodeCliBuffer: ascii passa direto', () => {
  assert.strictEqual(decodeCliBuffer(Buffer.from('run ok'), CP850), 'run ok');
});

test('decodeCliBuffer: cp850 do cmd.exe decodifica corretamente', () => {
  // "'arquivo' n\xc6o \x82 reconhecido..." (mensagem real do cmd.exe pt-BR)
  const buf = Buffer.from([
    0x27, 0x61, 0x72, 0x71, 0x75, 0x69, 0x76, 0x6f, 0x27, 0x20, 0x6e, 0xc6, 0x6f, 0x20, 0x82, 0x20,
    0x72, 0x65, 0x63, 0x6f, 0x6e, 0x68, 0x65, 0x63, 0x69, 0x64, 0x6f,
  ]);
  assert.strictEqual(decodeCliBuffer(buf, CP850), "'arquivo' não é reconhecido");
});

test('decodeCliBuffer: cp1252 (Java antigo) decodifica corretamente', () => {
  assert.strictEqual(decodeCliBuffer(Buffer.from([0x6e, 0xe3, 0x6f]), CP850), 'não');
});

test('decodeCliBuffer: sem codepages usa windows-1252', () => {
  assert.strictEqual(decodeCliBuffer(Buffer.from([0x6e, 0xe3, 0x6f])), 'não');
});

test('decodeWindows: cp850 com acentos cai para oemcp', () => {
  // "não é" em cp850: c6=ã, 82=é → cp1252 daria "nÆo ‚" (caracteres suspeitos)
  const buf = Buffer.from([0x6e, 0xc6, 0x6f, 0x20, 0x82]);
  assert.strictEqual(decodeWindows(buf, CP850), 'não é');
});

test('decodeWindows: cp1252 sem caracteres suspeitos fica no acp', () => {
  const buf = Buffer.from([0x6e, 0xe3, 0x6f]);
  assert.strictEqual(decodeWindows(buf, CP850), 'não');
});

test('parseRegCodePage: extrai ACP e OEMCP da saida do reg.exe', () => {
  const output = [
    'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage',
    '    ACP    REG_SZ    1252',
    '    OEMCP    REG_SZ    850',
  ].join('\r\n');
  assert.strictEqual(parseRegCodePage(output, 'ACP'), 1252);
  assert.strictEqual(parseRegCodePage(output, 'OEMCP'), 850);
});

test('parseRegCodePage: retorna undefined quando ausente', () => {
  assert.strictEqual(parseRegCodePage('sem nada aqui', 'ACP'), undefined);
});
